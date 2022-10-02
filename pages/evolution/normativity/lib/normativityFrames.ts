import { max, min, random, range, some, sum } from 'lodash'
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
import {
  defaultCanvasHeight,
  defaultCanvasWidth,
} from '../../neuroevolution/lib/getNextFrameState'
import { NormativityAgent } from './NormativityAgent'

interface MetricValue {
  move: number
  value?: number
  min?: number
  max?: number
}

export interface NormativityFrameState {
  agents: NormativityAgent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: Array<Record<NormativityMetrics | 'move', number>>
  metrics: {
    fast: Record<NormativityMetrics, MetricValue[]>
    slow: Record<NormativityMetrics, MetricValue[]>
  }
  running: boolean
  runFor: number | null
  move: number
  autoSample: boolean
  speed: number
  respawnAgent?: NormativityAgent
}

const agentCount = 15
const prizeCount = 5
const prizeJiggle = {
  x: 0.5,
  y: 0,
}
export const prizePositionType = 'prize'

export type NormativityMetrics = 'points' | 'ppt'
const areaMetricNames: NormativityMetrics[] = [] // ['points']
const lineMetricNames: NormativityMetrics[] = []
const changeMetricNames: NormativityMetrics[] = ['ppt']
const metricNames: NormativityMetrics[] = [
  ...areaMetricNames,
  ...lineMetricNames,
  ...changeMetricNames,
]

function initFrameState(): NormativityFrameState {
  const gridWidth = defaultCanvasWidth / cellSize
  const gridHeight = defaultCanvasHeight / cellSize
  const agents = range(0, agentCount).map(
    () =>
      new NormativityAgent({
        gridWidth,
        gridHeight,
      }),
  )
  const prizes = range(0, prizeCount).map(
    () => [gridWidth - 1, random(0, gridHeight - 1)] as Position,
  )

  return {
    agents,
    boardState: new BoardState({
      gridWidth,
      gridHeight,
      cellSize,
    }).setPositions([
      ...prizePositionColors(prizes),
      ...agentPositionColors(agents, gridWidth),
    ]),
    cellSize,
    gridHeight,
    gridWidth,
    history: [],
    metrics: {
      fast: Object.fromEntries(
        metricNames.map((name) => [
          name,
          [
            {
              move: 0,
              value: 0,
              min: 0,
              max: 0,
            },
          ] as MetricValue[],
        ]),
      ) as Record<NormativityMetrics, MetricValue[]>,
      slow: Object.fromEntries(
        metricNames.map((name) => [
          name,
          [
            {
              move: 0,
              value: 0,
              min: 0,
              max: 0,
            },
          ] as MetricValue[],
        ]),
      ) as Record<NormativityMetrics, MetricValue[]>,
    },
    running: false,
    runFor: null,
    move: 0,
    speed: 0,
    autoSample: false,
  }
}

function getNextFrameState(
  state: NormativityFrameState,
): NormativityFrameState {
  const prizePositions: Position[] = advancePrizePositions(state.boardState)

  let agents = state.agents
  for (const agent of state.agents) {
    agents = agent.move(state.boardState, agents)
  }

  agents = agents.map((agent) =>
    inPositions(prizePositions, agent.position) ? agent.reward() : agent,
  )

  const boardState = state.boardState.setPositions([
    ...prizePositionColors(prizePositions),
    ...agentPositionColors(agents, state.gridWidth),
  ])

  const move = state.move + 1

  const slowSampleRate = move < 1000 ? 500 : move < 10000 ? 1000 : 5000
  const slowSampleDuration = 0
  const fastSampleRate = 16
  const fastSampleDuration = 1000

  const history: Array<Record<string | 'move', number>> = [
    ...state.history.slice(-max([fastSampleDuration, slowSampleRate])!),
    {
      move,
      pointsMax: max(agents.map((agent) => agent.points))!,
      pointsMin: min(agents.map((agent) => agent.points))!,
      pptMax: max(agents.map((agent) => agent.points))!,
      pptMin: min(agents.map((agent) => agent.points))!,
    },
  ]

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

        let metricValue: MetricValue | undefined
        if (lineMetricNames.includes(metricName)) {
          metricValue = {
            move,
            value:
              sum(
                history.slice(-lookBack).map((history) => history[metricName]),
              ) / lookBack,
          }
        } else if (changeMetricNames.includes(metricName)) {
          metricValue = {
            move,
          }

          for (const suffix of ['Max', 'Min']) {
            const prePeriodValues = history
              .slice(lookBack * -2, -lookBack)
              .map((history) => history[`${metricName}${suffix}`])
            const prePeriodAverage =
              prePeriodValues.length > 0
                ? sum(prePeriodValues) / prePeriodValues.length
                : 0
            const periodValues = history
              .slice(-lookBack)
              .map((history) => history[`${metricName}${suffix}`])
            const periodAverage = sum(periodValues) / periodValues.length
            const change = (periodAverage - prePeriodAverage) / lookBack

            metricValue[suffix.toLowerCase() as 'max' | 'min'] = change
          }
        } else if (areaMetricNames.includes(metricName)) {
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

        if (metricValue) {
          metrics[metricSpeed][metricName] = [
            ...metrics[metricSpeed][metricName].slice(
              -(sampleDuration / sampleRate),
            ),
            metricValue,
          ]
        }
      }
    }
  }

  const runFor = state.runFor !== null ? state.runFor - 1 : null

  return {
    ...state,
    agents,
    boardState,
    history,
    metrics,
    move,
    runFor,
  }
}

function agentPositionColors(
  agents: NormativityAgent[],
  gridWidth: number,
): ColorPosition[] {
  return agents.map((agent) => ({
    type: 'agent',
    color: agentColor(agent.points, gridWidth),
    position: agent.position,
  }))
}

function prizePositionColors(prizePositions: Position[]): ColorPosition[] {
  return prizePositions.map((position) => ({
    type: prizePositionType,
    color: colorValues.red60,
    position,
  }))
}

function advancePrizePositions(boardState: BoardState): Position[] {
  return boardState
    .getPositions(prizePositionType)
    .map(([x, y]) => {
      const x1 = Math.random() < prizeJiggle.x ? x - 1 : x
      const ySeed = Math.random()
      const y1 =
        ySeed < prizeJiggle.y ? y - 1 : ySeed < prizeJiggle.y * 2 ? y + 1 : y
      return [x1, y1] as Position
    })
    .map(
      ([x, y]) =>
        [
          x < 0 ? boardState.gridWidth - 1 : x,
          x < 0 ? random(0, boardState.gridHeight - 1) : y,
        ] as Position,
    )
}

function inPositions(positions: Position[], [px, py]: Position): boolean {
  return some(positions, ([x, y]) => px === x && py === y)
}

function initSampleFrameState(
  agent: NormativityAgent,
  redPositions: Position[],
  state?: SampleFrameState<NormativityAgent>,
): SampleFrameState<NormativityAgent> {
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
        [agent as unknown as NormativityAgent],
        sampleGridWidth,
      ),
      ...redPositions.map((position) => ({
        type: 'prize',
        color: colorValues.red60,
        position,
      })),
    ]),
  }
}

function getNextSampleFrameState(
  state: SampleFrameState<NormativityAgent>,
): SampleFrameState<NormativityAgent> {
  const boardState = state.boardState
  const [agent] = state.agent.move(boardState, state.agents)
  const prizePositions: Position[] = advancePrizePositions(boardState)

  if (agent.position[0] >= state.boardState.gridWidth - 1) {
    return initSampleFrameState(agent, prizePositions, {
      ...state,
      result: 'life',
    })
  }

  if (prizePositions.length === 0) {
    return initSampleFrameState(agent, prizePositions, {
      ...state,
      result: 'life',
    })
  }

  if (
    some(
      prizePositions,
      ([killerX, killerY]) =>
        agent.position[0] === killerX && agent.position[1] === killerY,
    )
  ) {
    return initSampleFrameState(agent, prizePositions, {
      ...state,
      result: 'death',
    })
  }

  return {
    ...state,
    agent,
    boardState: boardState.setPositions([
      ...prizePositionColors(prizePositions),
      ...agentPositionColors(state.agents, state.boardState.gridWidth),
    ]),
    result: null,
  }
}

export const normativityFrames = {
  initFrameState,
  getNextFrameState,
  initSampleFrameState,
  getNextSampleFrameState,
}
