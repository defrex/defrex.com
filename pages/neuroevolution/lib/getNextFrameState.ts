import {
  entries,
  max,
  maxBy,
  min,
  random,
  range,
  some,
  sum,
  values,
} from 'lodash'
import { colorValues } from '../../../lib/colors'
import {
  BoardState,
  ColorPosition,
  Position,
} from '../components/Board/lib/BoardState'
import { Agent } from './Agent'

export type RunMode = 'killer' | 'competition'

type Metrics =
  | 'difficulty'
  | 'population'
  | 'killers'
  | 'lineageMax'
  | 'lineageMin'

export type FrameState = {
  agents: Agent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: Record<Metrics | 'move', number>[]
  metrics: Record<Metrics, { move: number; value: number }[]>
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
const difficultySmoothing = 1

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

function getMetricGranularity(move: number): Record<Metrics, number> {
  return {
    difficulty: move < 1000 ? 100 : move < 10000 ? 1000 : 5000,
    population: 8,
    killers: 8,
    lineageMax: 8,
    lineageMin: 8,
  }
}

function getMetricHistory(move: number): Record<Metrics, number> {
  return {
    difficulty: 0,
    population: 1000,
    killers: 1000,
    lineageMax: 1000,
    lineageMin: 1000,
  }
}

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
      difficulty: [],
      population: [],
      killers: [],
      lineageMax: [],
      lineageMin: [],
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

  const move = state.move + 1

  const metricGranularity = getMetricGranularity(move)
  const metricHistory = getMetricHistory(move)

  const history: Record<Metrics | 'move', number>[] = [
    ...state.history.slice(-max([500, ...values(metricGranularity)])!),
    {
      move,
      difficulty: difficultyFromSurvivors(agents.length),
      population: agents.length,
      killers: boardState.getPositions('kill').length,
      lineageMax: max(agents.map(({ lineage }) => lineage))!,
      lineageMin: min(agents.map(({ lineage }) => lineage))!,
    },
  ]

  const prevDifficulty = state.history
    .slice(-difficultySmoothing)
    .map((entry) => entry.difficulty)
  const killersPerMove = max([sum(prevDifficulty) / prevDifficulty.length, 1])!

  const metrics = { ...state.metrics }

  for (const [metric, granularity] of entries(metricGranularity) as [
    Metrics,
    number,
  ][]) {
    if (move % granularity === 0) {
      const lookBack = min([granularity, history.length])!
      const value =
        sum(history.slice(-lookBack).map((history) => history[metric])) /
        lookBack
      metrics[metric] = [
        ...metrics[metric].slice(-metricHistory[metric] / granularity),
        { move, value },
      ]
    }
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
