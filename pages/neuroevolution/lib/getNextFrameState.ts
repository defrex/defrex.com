import { max, min, nth, random, range, some, sum } from 'lodash'
import { colorValues } from '../../../lib/colors'
import { round } from '../../../lib/round'
import {
  BoardState,
  ColorPosition,
  Position,
} from '../components/Board/lib/BoardState'
import { Agent } from './Agent'

export type RunMode = 'killer' | 'competition'

type Metrics = {
  move: number
  difficulty?: number
  population?: number
  killers?: number
  fitness?: number
  lineageMax?: number
  lineageMin?: number
  fps?: number
}

export type FrameState = {
  agents: Agent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: {
    move: number
    difficulty: number
    time: number
  }[]
  metrics: Metrics[]
  running: boolean
  runFor: number | null
  killersPerMove: number
  killersPerMoveMax: number
  move: number
  sampleAgents: { move: number; agent: Agent }[]
  speed: number
}

const minAgents = 10
const maxAgents = 150
const defaultMaxDifficulty = 5
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

export function metricsWith(
  metrics: Metrics[],
  key: keyof Metrics,
  take?: number,
): Metrics[] {
  return metrics
    .slice(-(take || 0))
    .filter((metric) => metric[key] !== undefined)
}

export function movesColor(moves: number, gridWidth: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

function initAgent(
  gridWidth: number,
  gridHeight: number,
  mode: RunMode = defaultGame,
): Agent {
  return new Agent({
    gridWidth,
    gridHeight,
    direction: 'right',
    threatType: 'kill',
  })
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

function fitnessFromDifficulty(
  difficulty: number,
  maxDifficulty: number,
): number {
  return round((difficulty / maxDifficulty) * 100)
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

export function initFrameState(): FrameState {
  const cellSize = defaultCellSize
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  const agents = range(0, minAgents).map(() => initAgent(gridWidth, gridHeight))
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
    metrics: [],
    running: false,
    runFor: null,
    killersPerMove: 1,
    killersPerMoveMax: defaultMaxDifficulty,
    move: 0,
    sampleAgents: [],
    speed: 0,
  }
}

export function getNextFrameState(state: FrameState): FrameState {
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

  const agents = state.agents
    .map((agent) => agent.move(state.boardState))
    .filter(
      (agent) =>
        !some(
          killPositions,
          ([x, y]) => agent.position[0] === x && agent.position[1] === y,
        ),
    )

  if (agents.length < maxAgents) {
    for (const agent of [...agents]) {
      if (agent.position[0] >= state.gridWidth - 1) {
        agents.push(
          agent.mutate({
            gridWidth: state.gridWidth,
            gridHeight: state.gridHeight,
          }),
        )
      }
    }
  }

  if (state.move < state.gridWidth * 2) {
    while (agents.length < minAgents) {
      agents.push(initAgent(state.gridWidth, state.gridHeight))
    }
  }

  const boardState = state.boardState.setPositions([
    ...killPositions.map((position) => ({
      type: 'kill',
      color: colorValues.red60,
      position,
    })),
    ...agentPositionColors(agents, state.gridWidth),
  ])

  const move = state.move + 1
  const history = [
    ...state.history.slice(-500),
    {
      move,
      difficulty: difficultyFromSurvivors(
        agents.length,
        state.killersPerMoveMax,
      ),
      time: Date.now(),
    },
  ]

  const prevDifficulty = state.history
    .slice(-5)
    .map((entry) => entry.difficulty)
  const killersPerMove = sum(prevDifficulty) / prevDifficulty.length

  const metrics: Metrics = { move }

  if (
    (move < 1000 && move % 100 === 0) ||
    (move < 10000 && move % 1000 === 0) ||
    move % 10000 === 0
  ) {
    metrics.difficulty =
      sum(
        state.history
          .slice(-historyRollupGranularity)
          .map(({ difficulty }) => difficulty),
      ) / historyRollupGranularity
    metrics.fitness = fitnessFromDifficulty(
      metrics.difficulty,
      state.killersPerMoveMax,
    )
  }

  if (move % 5 === 0) {
    metrics.population = agents.length
    metrics.killers = boardState.getPositions('kill').length
    metrics.lineageMax = max(agents.map(({ lineage }) => lineage))
    metrics.lineageMin = min(agents.map(({ lineage }) => lineage))

    const fpsSmoothMoves = 10
    if (move > fpsSmoothMoves) {
      metrics.fps = round(
        fpsSmoothMoves /
          ((nth(state.history, -1)!.time -
            nth(state.history, -1 - fpsSmoothMoves)!.time) /
            1000),
      )
    }
  }

  const runFor = state.runFor ? state.runFor - 1 : null

  return {
    ...state,
    agents,
    boardState,
    history,
    metrics: [...state.metrics, metrics],
    killersPerMove,
    move,
    runFor,
    running: runFor === null ? state.running : runFor > 0,
  }
}
