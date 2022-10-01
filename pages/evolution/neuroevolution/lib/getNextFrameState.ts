import {
  map,
  max,
  maxBy,
  min,
  random,
  range,
  some,
  sum,
  zipObject,
} from 'lodash'
import { colorValues } from '../../../../lib/colors'
import {
  BoardState,
  ColorPosition,
  Position,
} from '../../components/Board/lib/BoardState'
import { cellSize } from '../../components/FrameBoard'
import {
  SampleFrameState,
  sampleGridHeight,
  sampleGridWidth,
} from '../../components/SampleBoard'
import { agentColor } from '../../lib/agentColor'
import { NeuroevolutionAgent } from './NeuroevolutionAgent'

export type RunMode = 'killer' | 'competition'

interface MetricValue {
  move: number
  value?: number
  min?: number
  max?: number
}

export interface FrameState {
  agents: NeuroevolutionAgent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: Array<Record<string | 'move', number>>
  metrics: {
    fast: Record<string, MetricValue[]>
    slow: Record<string, MetricValue[]>
  }
  running: boolean
  runFor: number | null
  killersPerMove: number
  move: number
  autoSample: boolean
  speed: number
  respawnAgent?: NeuroevolutionAgent
}

const minAgents = 10
const maxAgents = 600
const maxDifficulty = 30
const difficultySmoothing = 1

const defaultCellSize = cellSize
export const defaultCanvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
export const defaultCanvasHeight = 512

const areaMetricNames = ['lineage', 'complexity']
const lineMetricNames = [
  'difficulty',
  'population',
  'killers',
  'lineageMax',
  'lineageMin',
  'complexityMin',
  'complexityMax',
]
const metricNames = [...areaMetricNames, ...lineMetricNames]

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
    autoSample: false,
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
      fast: zipObject(
        metricNames,
        range(metricNames.length).map(() => []),
      ),
      slow: zipObject(
        metricNames,
        range(metricNames.length).map(() => []),
      ),
    },
    running: false,
    runFor: null,
    killersPerMove: 1,
    move: 0,
    speed: 0,
  }
}

export function getNextFrameState(state: FrameState): FrameState {
  let killPositions: Position[] = advanceKillPositions(state.boardState)

  const partialKillersPerMove = state.killersPerMove % 1
  for (let i = 0; i < state.killersPerMove - partialKillersPerMove; i++) {
    killPositions.push([state.gridWidth - 1, random(0, state.gridHeight - 1)])
  }
  if (partialKillersPerMove > random(0, 1, true)) {
    killPositions.push([state.gridWidth - 1, random(0, state.gridHeight - 1)])
  }

  const movedAgents = state.agents.map((agent) => agent.move(state.boardState))
  const agents = movedAgents.filter((agent) =>
    isNotInPositions(killPositions, agent.position),
  )

  killPositions = killPositions.filter(
    isNotInPositions.bind(null, map(movedAgents, 'position')),
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
    agents.push(
      respawnAgent?.mutate() ?? initAgent(state.gridWidth, state.gridHeight),
    )
  }

  const boardState = state.boardState.setPositions([
    ...killPositionColors(killPositions),
    ...agentPositionColors(agents, state.gridWidth),
  ])

  const move = state.move + 1

  const slowSampleRate = move < 1000 ? 100 : move < 10000 ? 1000 : 5000
  const slowSampleDuration = 0
  const fastSampleRate = 16
  const fastSampleDuration = 1000

  const history: Array<Record<string | 'move', number>> = [
    ...state.history.slice(-max([fastSampleDuration, slowSampleRate])!),
    {
      move,
      difficulty: difficultyFromSurvivors(agents.length),
      population: agents.length,
      killers: boardState.getPositions('kill').length,
      lineageMax: max(agents.map(({ lineage }) => lineage))!,
      lineageMin: min(agents.map(({ lineage }) => lineage))!,
      complexityMin: max(
        agents.map(
          ({ perceptron }) => perceptron.nodes.length + perceptron.edges.length,
        ),
      )!,
      complexityMax: min(
        agents.map(
          ({ perceptron }) => perceptron.nodes.length + perceptron.edges.length,
        ),
      )!,
    },
  ]

  const prevDifficulty = state.history
    .slice(-difficultySmoothing)
    .map((entry) => entry.difficulty)
  const killersPerMove = max([sum(prevDifficulty) / prevDifficulty.length, 1])!

  const metrics = {
    fast: { ...state.metrics.fast },
    slow: { ...state.metrics.slow },
  }

  for (const metricSpeed of ['fast', 'slow'] as ['fast', 'slow']) {
    const sampleRate = metricSpeed === 'fast' ? fastSampleRate : slowSampleRate
    const sampleDuration =
      metricSpeed === 'fast' ? fastSampleDuration : slowSampleDuration

    if (move % sampleRate === 0) {
      for (const metricName of metricNames) {
        const lookBack = min([sampleRate, history.length])!
        let metricValue: MetricValue

        if (lineMetricNames.includes(metricName)) {
          metricValue = {
            move,
            value:
              sum(
                history.slice(-lookBack).map((history) => history[metricName]),
              ) / lookBack,
          }
        } else {
          metricValue = {
            move,
            min:
              sum(
                history
                  .slice(-lookBack)
                  .map((history) => history[`${metricName}Min`]),
              ) / lookBack,
            max:
              sum(
                history
                  .slice(-lookBack)
                  .map((history) => history[`${metricName}Max`]),
              ) / lookBack,
          }
        }

        metrics[metricSpeed][metricName] = [
          ...metrics[metricSpeed][metricName].slice(
            -(sampleDuration / sampleRate),
          ),
          metricValue,
        ]
      }
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

function isNotInPositions(positions: Position[], [px, py]: Position): boolean {
  return !some(positions, ([x, y]) => px === x && py === y)
}

function initAgent(gridWidth: number, gridHeight: number): NeuroevolutionAgent {
  return new NeuroevolutionAgent({
    gridWidth,
    gridHeight,
    direction: 'right',
    threatType: 'kill',
  })
}

export function agentPositionColors(
  agents: NeuroevolutionAgent[],
  gridWidth: number,
): ColorPosition[] {
  return agents.map(({ direction, position, moves }) => ({
    type: direction,
    color: agentColor(moves, gridWidth),
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

function initSampleFrameState(
  agent: NeuroevolutionAgent,
  redPositions: Position[],
  state?: SampleFrameState<NeuroevolutionAgent>,
): SampleFrameState<NeuroevolutionAgent> {
  agent = agent.setPosition([0, 2])
  return {
    agent,
    agents: [agent],
    move: 0,
    running: Boolean(state),
    result: state?.result ?? null,
    boardState: new BoardState({
      gridWidth: sampleGridWidth,
      gridHeight: sampleGridHeight,
      cellSize,
    }).setPositions([
      ...agentPositionColors(
        [agent as unknown as NeuroevolutionAgent],
        sampleGridWidth,
      ),
      ...redPositions.map((position) => ({
        type: 'kill',
        color: colorValues.red60,
        position,
      })),
    ]),
  }
}

function getNextSampleFrameState(
  state: SampleFrameState<NeuroevolutionAgent>,
): SampleFrameState<NeuroevolutionAgent> {
  const boardState = state.boardState
  const agent = state.agent.move(boardState)
  const redPositions: Position[] = advanceKillPositions(boardState)

  if (agent.position[0] >= sampleGridWidth - 1) {
    return initSampleFrameState(agent, redPositions, {
      ...state,
      result: 'life',
    })
  }

  if (redPositions.length === 0) {
    return initSampleFrameState(agent, redPositions, {
      ...state,
      result: 'life',
    })
  }

  if (
    some(
      redPositions,
      ([killerX, killerY]) =>
        agent.position[0] === killerX && agent.position[1] === killerY,
    )
  ) {
    return initSampleFrameState(agent, redPositions, {
      ...state,
      result: 'death',
    })
  }

  return {
    ...state,
    agent,
    boardState: boardState.setPositions([
      ...killPositionColors(redPositions),
      ...agentPositionColors(state.agents, state.boardState.gridWidth),
    ]),
    result: null,
  }
}

export const neuroevolutionFrames = {
  initSampleFrameState,
  getNextSampleFrameState,
}
