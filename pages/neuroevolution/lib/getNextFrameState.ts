import { groupBy, random, range, shuffle, some, sum } from 'lodash'
import { colorValues } from '../../../lib/colors'
import {
  BoardState,
  ColorPosition,
  Position,
} from '../components/Board/lib/BoardState'
import { Agent } from './Agent'

export type RunMode = 'killer' | 'competition'

export type FrameState = {
  agents: Agent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: {
    move: number
    difficulty: number
    agentMoves: number[]
    agentLineage: number[]
    positionTypes: Record<string, ColorPosition[]>
    time: number
  }[]
  historyRollup: { move: number; difficulty: number }[]
  running: boolean
  runFor: number | null
  runMode: RunMode
  killersPerMove: number
  killersPerMoveMax: number
  move: number
  sampleAgents: { move: number; agent: Agent }[]
  speed: number
}

const minAgents = 10
const maxAgents = 150
const defaultMaxDifficulty = 7
export const defaultCellSize = 16
const defaultGame = 'killer'
const historyRollupGranularity = 1000

export const canvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
export const canvasHeight = 512

function initAgent(
  gridWidth: number,
  gridHeight: number,
  mode: RunMode = defaultGame,
): Agent {
  return new Agent({
    gridWidth,
    gridHeight,
    direction: mode === 'killer' ? 'right' : undefined,
    threatType: mode === 'killer' ? 'kill' : undefined,
  })
}

export function movesColor(moves: number, gridWidth: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

function agentPositionColors(
  agents: Agent[],
  gridWidth: number,
): ColorPosition[] {
  return agents.map(({ direction, position, moves }) => ({
    type: direction,
    color: movesColor(moves, gridWidth),
    position,
  }))
}

function difficultyFromSurvivors(
  survivors: number,
  maxDifficulty: number,
): number {
  const proportion = (survivors - minAgents) / (maxAgents - minAgents)
  return maxDifficulty * proportion
}

export function initFrameState(mode: RunMode = defaultGame): FrameState {
  const cellSize = defaultCellSize
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  const agents = range(0, minAgents).map(() =>
    initAgent(gridWidth, gridHeight, mode),
  )
  return {
    agents,
    boardState: new BoardState({
      gridWidth,
      gridHeight,
      cellSize,
    }).setPositions(agentPositionColors(agents, gridWidth)),
    cellSize,
    gridHeight,
    gridWidth,
    history: [],
    historyRollup: [],
    running: false,
    runFor: null,
    runMode: mode,
    killersPerMove: 1,
    killersPerMoveMax: defaultMaxDifficulty,
    move: 0,
    sampleAgents: [],
    speed: 0,
  }
}

export function getNextFrameState(state: FrameState): FrameState {
  let survivingAgents: Agent[] = []
  let agents = state.agents.map((agent) => agent.move(state.boardState))
  let positions: ColorPosition[] = []

  if (state.runMode === 'killer') {
    const killPositions: Position[] = state.boardState
      .getPositions('kill')
      .map(([x, y]) => [x - 1, y] as Position)
      .filter(
        ([x, y]) =>
          x >= 0 && y >= 0 && x < state.gridWidth && y < state.gridHeight,
      )

    const partialKillersPerMove = state.killersPerMove % 1
    for (let i = 0; i < state.killersPerMove - partialKillersPerMove; i++) {
      killPositions.push([state.gridWidth - 1, random(0, state.gridHeight - 1)])
    }
    if (partialKillersPerMove > random(0, 1, true)) {
      killPositions.push([state.gridWidth - 1, random(0, state.gridHeight - 1)])
    }

    positions = [
      ...positions,
      ...killPositions.map((position) => ({
        type: 'kill',
        color: colorValues.red60,
        position,
      })),
    ]
    ;({ survivingAgents } = groupBy(agents, (agent) =>
      some(
        killPositions,
        ([x, y]) => agent.position[0] === x && agent.position[1] === y,
      )
        ? 'deadAgents'
        : 'survivingAgents',
    ))
  } else {
    const leftKillers = agents.filter((agent) => agent.direction === 'left')
    const rightKillers = agents.filter((agent) => agent.direction === 'right')

    const deadAgents: Agent[] = []

    for (const agent of agents) {
      const killerAgents =
        agent.direction === 'left' ? rightKillers : leftKillers
      let dead = false
      for (const killerAgent of killerAgents) {
        dead = agent.fight(killerAgent)
        if (dead) {
          // survivingAgents.push(killerAgent.mutate())
          break
        }
      }
      if (!dead) {
        survivingAgents.push(agent)
      } else {
        deadAgents.push(agent)
      }
    }

    // if (deadAgents.length === 0) {
    //   survivingAgents.push(initAgent(state.gridWidth, state.gridHeight, state.runMode))
    // }
  }

  agents = survivingAgents || []

  positions = [...positions, ...agentPositionColors(agents, state.gridWidth)]

  const killersPerMove = difficultyFromSurvivors(
    survivingAgents.length,
    state.killersPerMoveMax,
  )

  for (const agent of agents) {
    if (
      agents.length < maxAgents &&
      ((agent.direction === 'right' &&
        agent.position[0] === state.gridWidth - 1) ||
        (agent.direction === 'left' && agent.position[0] === 0))
    ) {
      agents.push(agent.mutate())
    }
  }

  if (agents.length >= maxAgents) {
    agents = shuffle(agents).slice(-(maxAgents * 0.9))
  }

  while (agents.length < minAgents) {
    agents.push(initAgent(state.gridWidth, state.gridHeight, state.runMode))
  }

  const boardState = state.boardState.setPositions(positions)

  const move = state.move + 1
  const history = [
    ...state.history.slice(-500),
    {
      move,
      difficulty: killersPerMove,
      agentMoves: agents.map(({ moves }) => moves),
      agentLineage: agents.map(({ lineage }) => lineage),
      positionTypes: groupBy(boardState.positions, (position) => position.type),
      time: Date.now(),
    },
  ]

  let historyRollup = state.historyRollup
  if (
    (move < 1000 && move % 100 === 0) ||
    move % historyRollupGranularity === 0
  ) {
    historyRollup = [
      ...historyRollup,
      {
        move,
        difficulty:
          sum(
            state.history
              .slice(-historyRollupGranularity)
              .map(({ difficulty }) => difficulty),
          ) / historyRollupGranularity,
      },
    ]
  }

  return {
    ...state,
    agents,
    boardState,
    history,
    historyRollup,
    killersPerMove,
    move,
    runFor: state.runFor ? state.runFor - 1 : null,
    running: state.runFor === null ? state.running : state.runFor - 1 > 0,
  }
}

export function setCellSize(
  cellSize: number,
  frameState: FrameState,
): FrameState {
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  return {
    ...frameState,
    cellSize,
    gridWidth,
    gridHeight,
    boardState: frameState.boardState.setGrid(gridWidth, gridHeight, cellSize),
    killersPerMoveMax:
      defaultMaxDifficulty * (1 / (cellSize / defaultCellSize)),
  }
}
