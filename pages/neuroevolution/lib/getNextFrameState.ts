import { max, maxBy, min, random, range, some, sum } from 'lodash'
import { colorValues } from '../../../lib/colors'
import { round } from '../../../lib/round'
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
  }[]
  metrics: {
    difficulty: { move: number; value: number }[]
    population: { move: number; value: number }[]
    killers: { move: number; value: number }[]
    fitness: { move: number; value: number }[]
    lineageMax: { move: number; value: number }[]
    lineageMin: { move: number; value: number }[]
  }
  running: boolean
  runFor: number | null
  killersPerMove: number
  move: number
  sampleAgents: { move: number; agent: Agent }[]
  speed: number
  respawnAgent?: Agent
}

const minAgents = 10
const maxAgents = 600
const maxDifficulty = 30
const metricLength = 1000
const metricSampleRate = 5
export const defaultCellSize = 16

export const defaultCanvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
export const defaultCanvasHeight = 512

export function movesColor(moves: number, gridWidth: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

function initAgent(gridWidth: number, gridHeight: number): Agent {
  return new Agent({
    gridWidth,
    gridHeight,
    direction: 'right',
    threatType: 'kill',
  })
}

export function agentPositionColors(
  agents: Agent[],
  gridWidth: number,
): ColorPosition[] {
  return agents.map(({ direction, position, moves }) => ({
    type: direction,
    color: movesColor(moves, gridWidth),
    position,
  }))
}

export function killPositionColors(killPositions: Position[]): ColorPosition[] {
  return killPositions.map((position) => ({
    type: 'kill',
    color: colorValues.red60,
    position,
  }))
}

function difficultyFromSurvivors(survivors: number): number {
  const proportion = (survivors - minAgents) / (maxAgents - minAgents)
  return maxDifficulty * proportion
}

export function fitnessFromDifficulty(difficulty: number): number {
  return round((difficulty / maxDifficulty) * 100)
}

export function setCellSize(
  cellSize: number,
  frameState: FrameState,
  canvasWidth = defaultCanvasWidth,
  canvasHeight = defaultCanvasHeight,
): FrameState {
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  return {
    ...frameState,
    cellSize,
    gridWidth,
    gridHeight,
    boardState: frameState.boardState.setGrid(gridWidth, gridHeight, cellSize),
  }
}

export function advanceKillPositions(boardState: BoardState): Position[] {
  return boardState
    .getPositions('kill')
    .map(([x, y]) => [x - 1, y] as Position)
    .filter(
      ([x, y]) =>
        x >= 0 &&
        y >= 0 &&
        x < boardState.gridWidth &&
        y < boardState.gridHeight,
    )
}

export function initFrameState(
  cellSize = defaultCellSize,
  canvasWidth = defaultCanvasWidth,
  canvasHeight = defaultCanvasHeight,
): FrameState {
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
    metrics: {
      difficulty: [{ move: 0, value: 0 }],
      population: [{ move: 0, value: 0 }],
      killers: [{ move: 0, value: 0 }],
      fitness: [{ move: 0, value: 0 }],
      lineageMax: [{ move: 0, value: 0 }],
      lineageMin: [{ move: 0, value: 0 }],
    },
    running: false,
    runFor: null,
    killersPerMove: 1,
    move: 0,
    sampleAgents: [],
    speed: 0,
  }
}

export function getNextFrameState(state: FrameState): FrameState {
  const killPositions: Position[] = advanceKillPositions(state.boardState)

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

  const respawnAgent = maxBy(
    [...agents, state.respawnAgent],
    (agent) => agent?.lineage,
  )

  while (agents.length < minAgents) {
    agents.push(respawnAgent || initAgent(state.gridWidth, state.gridHeight))
  }

  const boardState = state.boardState.setPositions([
    ...killPositionColors(killPositions),
    ...agentPositionColors(agents, state.gridWidth),
  ])

  const prevDifficulty = state.history
    .slice(-5)
    .map((entry) => entry.difficulty)
  const killersPerMove = max([sum(prevDifficulty) / prevDifficulty.length, 1])!

  const move = state.move + 1

  const fitnessGranularity = move < 1000 ? 100 : move < 10000 ? 1000 : 5000

  const history = [
    ...state.history.slice(-max([500, fitnessGranularity])!),
    {
      move,
      difficulty: difficultyFromSurvivors(agents.length),
    },
  ]

  const metrics = { ...state.metrics }

  if (move % fitnessGranularity === 0) {
    const lookBack = min([fitnessGranularity, history.length])!
    const difficulty =
      sum(history.slice(-lookBack).map(({ difficulty }) => difficulty)) /
      lookBack
    metrics.difficulty = [...metrics.difficulty, { move, value: difficulty }]
    metrics.fitness = [
      ...metrics.fitness,
      { move, value: fitnessFromDifficulty(difficulty) },
    ]
  }

  if (move % metricSampleRate === 0) {
    metrics.population = [
      ...metrics.population.slice(-(metricLength / metricSampleRate)),
      { move, value: agents.length },
    ]
    metrics.killers = [
      ...metrics.killers.slice(-(metricLength / metricSampleRate)),
      {
        move,
        value: boardState.getPositions('kill').length,
      },
    ]

    metrics.lineageMax = [
      ...metrics.lineageMax.slice(-(metricLength / metricSampleRate)),
      {
        move,
        value: max(agents.map(({ lineage }) => lineage))!,
      },
    ]
    metrics.lineageMin = [
      ...metrics.lineageMin.slice(-(metricLength / metricSampleRate)),
      {
        move,
        value: min(agents.map(({ lineage }) => lineage))!,
      },
    ]
  }

  const runFor = state.runFor ? state.runFor - 1 : null

  return {
    ...state,
    agents,
    boardState,
    history,
    metrics,
    killersPerMove,
    move,
    runFor,
    respawnAgent,
  }
}
