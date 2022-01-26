import { clone, groupBy, round, some, sum } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors } from '../../lib/colors'
import { sleep } from '../../lib/sleep'
import { spacing } from '../../lib/spacing'
import { victoryChartTheme } from '../../lib/victoryChartTheme'
import { Board } from './components/Board'
import { BoardState } from './components/Board/lib/BoardState'
import { GenomeView } from './components/GenomeView'
import HowItWorks from './components/HowItWorks'
import { Agent } from './lib/Agent'
import styles from './styles.module.scss'

interface EvolutionProps {}

const minAgents = 10
const maxAgents = 300
const defaultDifficulty = 5
const defaultCellSize = 16
const historyRollupGranularity = 500
const autoSampleEvery = 1000

const canvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
const canvasHeight = 512

function movesColor(moves: number, gridWidth: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

// function difficulty(survivors: number, maxDifficulty: number): number {
//   const proportion = (survivors - minAgents) / (maxAgents - minAgents)
//   return maxDifficulty * proportion
// }

type State = {
  agents: Agent[]
  autoSample: boolean
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: {
    move: number
    difficulty: number
    leftAgents: number
    rightAgents: number
    agentMoves: number[]
    agentLineage: number[]
    time: number
  }[]
  historyRollup: { move: number; difficulty: number }[]
  running: 'killer' | 'competition' | null
  runOne: boolean
  killersPerMove: number
  killersPerMoveMax: number
  lifeSpans: Record<number, number>
  move: number
  sampleAgents: { move: number; agent: Agent }[]
  speed: number
}

function setAgentPositions(
  agents: Agent[],
  boardState: BoardState,
): BoardState {
  return boardState.setPositions(
    agents.map(({ direction, position, moves }) => ({
      type: direction,
      color: movesColor(moves, boardState.gridWidth),
      position,
    })),
  )
}

function initState(): State {
  const cellSize = defaultCellSize
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  const agents = new Array(minAgents)
    .fill(0)
    .map((_, i) => new Agent({ gridWidth, gridHeight }))
  return {
    agents,
    autoSample: false,
    boardState: setAgentPositions(
      agents,
      new BoardState({ gridWidth, gridHeight, cellSize }),
    ),
    cellSize,
    gridHeight,
    gridWidth,
    history: [],
    historyRollup: [],
    running: null,
    runOne: false,
    killersPerMove: 1,
    killersPerMoveMax: defaultDifficulty,
    lifeSpans: {},
    move: 0,
    sampleAgents: [],
    speed: 0,
  }
}

function bestAgent(agents: Agent[]): Agent {
  return agents.reduce((best, agent) => {
    if (agent.moves > best.moves) {
      return agent
    }
    return best
  }, agents[0])
}

export default function Evolution(_props: EvolutionProps) {
  const frameRef = useRef<number>()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [metricsVisible, setMetricsVisible] = useState({
    population: false,
    lineage: false,
    difficulty: false,
  })
  const [state, setState] = useState<State>(initState())

  const handleReset = useCallback(() => {
    setState(initState())
  }, [setState])

  const handleStart = useCallback(() => {
    setState({
      ...state,
      running: 'competition',
      runOne: false,
    })
  }, [setState, state])

  const handlePause = useCallback(() => {
    setState({
      ...state,
      running: null,
    })
  }, [setState, state])

  const handleRunOne = useCallback(() => {
    setState({
      ...state,
      running: 'competition',
      runOne: true,
    })
  }, [setState, state])

  const handleSetSpeed = useCallback(
    (speed: number) => () => {
      setState({
        ...state,
        speed,
      })
    },
    [setState, state],
  )

  const handleToggleMetric = useCallback(
    (metric: 'population' | 'lineage' | 'difficulty') => () => {
      setMetricsVisible({
        ...metricsVisible,
        [metric]: !metricsVisible[metric],
      })
    },
    [metricsVisible, setMetricsVisible],
  )

  const handleCellSize = useCallback(
    (cellSize: number) => () => {
      const gridWidth = canvasWidth / cellSize
      const gridHeight = canvasHeight / cellSize
      setState({
        ...state,
        cellSize,
        gridWidth,
        gridHeight,
        boardState: state.boardState.setGrid(gridWidth, gridHeight, cellSize),
        killersPerMoveMax:
          defaultDifficulty * (1 / (cellSize / defaultCellSize)),
      })
    },
    [setState, state],
  )

  const handleSampleAgent = useCallback(() => {
    const nextSampleAgent = bestAgent(state.agents)
    console.log('Sample', nextSampleAgent.moves, nextSampleAgent.genome)
    setState({
      ...state,
      sampleAgents: [
        ...state.sampleAgents,
        { move: state.move, agent: nextSampleAgent },
        // { move: 0, agent: new Agent(state.gridWidth, state.gridHeight) },
      ],
    })
  }, [setState, state])

  const handleSelectAgent = useCallback(
    (agent: Agent) => () => {
      setSelectedAgent(agent)
    },
    [setSelectedAgent],
  )

  const handleClearSelectedAgent = useCallback(() => {
    setSelectedAgent(null)
  }, [setSelectedAgent])

  const handleToggleAutoSample = useCallback(() => {
    setState({ ...state, autoSample: !state.autoSample })
  }, [setState, state])

  const handleToggleHowItWorks = useCallback(() => {
    setShowHowItWorks(!showHowItWorks)
  }, [setShowHowItWorks, showHowItWorks])

  const renderFrame = () => {
    setState((currentState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const {
        agents,
        autoSample,
        boardState,
        gridHeight,
        gridWidth,
        history,
        historyRollup,
        running,
        runOne,
        lifeSpans,
        move,
        sampleAgents,
        speed,
      } = currentState

      const nextSampleAgents =
        move > 0 && move % autoSampleEvery === 0 && autoSample
          ? [...sampleAgents, { move, agent: bestAgent(agents) }]
          : sampleAgents

      // const killPositions = boardState.getPositions('kill')
      // const nextKillPositions: Position[] = killPositions
      //   .map(([x, y]) => [x - 1, y] as Position)
      //   .filter(
      //     ([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight,
      //   )

      // const partialKillersPerMove = killersPerMove % 1
      // for (let i = 0; i < killersPerMove - partialKillersPerMove; i++) {
      //   nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      // }
      // if (partialKillersPerMove > random(0, 1, true)) {
      //   nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      // }

      // let nextBoardState = boardState.setPositions(
      //   nextKillPositions.map((position) => ({
      //     type: 'kill',
      //     color: colorValues.red60,
      //     position,
      //   })),
      // )

      let nextBoardState = boardState
      let nextAgents = agents.map((agent) => agent.move(nextBoardState))

      nextBoardState = setAgentPositions(nextAgents, nextBoardState)

      const leftKillPositions = boardState.getPositions('left')
      const rightKillPositions = boardState.getPositions('right')

      const { deadAgents, survivingAgents } = groupBy(nextAgents, (agent) =>
        some(
          agent.direction === 'left' ? rightKillPositions : leftKillPositions,
          ([x, y]) => agent.position[0] === x && agent.position[1] === y,
        )
          ? 'deadAgents'
          : 'survivingAgents',
      )
      nextAgents = survivingAgents || []

      // if (move % 100 === 0) {
      // console.log({
      //   leftKillPositions,
      //   rightKillPositions,
      //   deadAgents,
      //   survivingAgents,
      // })
      // }

      const nextLifespans = clone(lifeSpans)
      if (deadAgents?.length) {
        for (const killedAgent of deadAgents) {
          nextLifespans[killedAgent.moves] =
            (nextLifespans[killedAgent.moves] || 0) + 1
        }
      }

      // let nextKillersPerMove = difficulty(
      //   survivingAgents.length,
      //   killersPerMoveMax,
      // )

      // if (nextAgents.length === maxAgents) {
      //   // Max agents, kill the weak
      //   nextAgents = sortBy(nextAgents, 'moves').slice(-80)
      // }

      for (const agent of nextAgents) {
        if (
          (nextAgents.length < maxAgents &&
            agent.direction === 'right' &&
            agent.position[0] === gridWidth - 1) ||
          (agent.direction === 'left' && agent.position[0] === 0)
        ) {
          nextAgents.push(agent.mutate())
        }
      }
      // nextAgents
      //   .filter((agent) =>
      //     agent.direction === 'right'
      //       ? agent.position[0] === gridWidth - 1
      //       : agent.position[0] === 0,
      //   )
      //   .forEach((agent) => {
      //     if (nextAgents.length < maxAgents) {
      //       nextAgents.push(agent.mutate())
      //     }
      //   })

      while (nextAgents.length < minAgents) {
        nextAgents.push(
          new Agent({
            gridWidth,
            gridHeight,
          }),
        )
      }

      nextBoardState = setAgentPositions(nextAgents, nextBoardState)

      if (running) {
        if (speed > 0) {
          sleep(speed).then(() => {
            frameRef.current = requestAnimationFrame(renderFrame)
          })
        } else {
          frameRef.current = requestAnimationFrame(renderFrame)
        }
      }

      const nextHistory = [
        ...history.slice(-500),
        {
          move,
          difficulty: 0,
          agentMoves: nextAgents.map(({ moves }) => moves),
          agentLineage: nextAgents.map(({ lineage }) => lineage),
          leftAgents: nextAgents.filter((agent) => agent.direction === 'left')
            .length,
          rightAgents: nextAgents.filter((agent) => agent.direction === 'right')
            .length,
          time: Date.now(),
        },
      ]

      let nextHistoryRollup = historyRollup
      if (move % historyRollupGranularity === 0) {
        nextHistoryRollup = [
          ...nextHistoryRollup,
          {
            move,
            difficulty:
              sum(
                history
                  .slice(-historyRollupGranularity)
                  .map(({ difficulty }) => difficulty),
              ) / historyRollupGranularity,
          },
        ]
      }

      return {
        ...currentState,
        boardState: nextBoardState,
        agents: nextAgents,
        lifeSpans: nextLifespans,
        running: runOne ? null : running,
        runOne: false,
        speed,
        move: move + 1,
        sampleAgents: nextSampleAgents,
        history: nextHistory,
        historyRollup: nextHistoryRollup,
        autoSample,
      }
    })
  }

  useEffect(() => {
    frameRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(frameRef.current!)
  }, [])

  return (
    <PageContainer title='Neutoevolution'>
      <Stack spacing={spacing.large}>
        <Inline expand={0}>
          <Stack spacing={spacing.small}>
            <Text value='Neuroevolution' size={20} />
            <Text
              value='Neural Networks trained via Evolutionary Algorithm'
              color={colors.black40}
            />
          </Stack>
          <Button
            onClick={handleToggleHowItWorks}
            text={showHowItWorks ? 'Hide' : 'How It Works'}
          />
        </Inline>

        {showHowItWorks ? <HowItWorks /> : null}

        <Board
          boardState={state.boardState}
          width={canvasWidth}
          height={canvasHeight}
        />

        <Stack spacing={spacing.xlarge}>
          <Stack>
            <Inline expand={-1}>
              <Button onClick={handleReset} text='Reset' />
              <Inline spacing={spacing.xsmall}>
                <Button
                  onClick={handlePause}
                  text='Pause'
                  disabled={state.running === null}
                />
                <Button
                  onClick={handleStart}
                  text='Play'
                  disabled={state.running !== null}
                />
                <Button
                  onClick={handleRunOne}
                  text='Play 1'
                  disabled={state.runOne}
                />
              </Inline>
              <Inline spacing={spacing.xsmall}>
                <Button
                  onClick={handleSetSpeed(0)}
                  text='Fast'
                  disabled={state.speed === 0}
                />
                <Button
                  onClick={handleSetSpeed(1000 / 4)}
                  disabled={state.speed === 1000 / 4}
                  text='Slow'
                />
              </Inline>
              <Inline spacing={spacing.xsmall}>
                {[
                  ['small', defaultCellSize * 2],
                  ['medium', defaultCellSize],
                  ['large', defaultCellSize / 2],
                ].map(([sizeName, cellSize]) => (
                  <Button
                    key={sizeName}
                    onClick={handleCellSize(cellSize as number)}
                    text={sizeName as string}
                    disabled={state.cellSize === cellSize}
                  />
                ))}
              </Inline>

              {state.history.length > 2 ? (
                <Inline align='right'>
                  <Text
                    value={`${round(
                      1 /
                        ((state.history[state.history.length - 1].time -
                          state.history[state.history.length - 2].time) /
                          1000),
                    )}fps`}
                    color={colors.black40}
                  />
                </Inline>
              ) : null}
            </Inline>
          </Stack>

          {/* <pre>
            {JSON.stringify(
              sortBy(state.agents, (agent) => agent.lineage, 'desc').map(
                (agent, index) => ({
                  index,
                  lineage: agent.lineage,
                }),
              ),
              null,
              2,
            )}
          </pre> */}

          <Stack>
            <Inline expand={0}>
              <Text value='Sample Agents' color={colors.black40} />
              <Button
                onClick={handleToggleAutoSample}
                text={`${state.autoSample ? '☑' : '☐'} Auto Sample`}
              />
              <Button onClick={handleSampleAgent} text='Sample' />
            </Inline>
            <table className={styles.sampleAgents}>
              <thead>
                <tr>
                  <th>
                    <Text value='Sampled At' color={colors.black40} />
                  </th>
                  <th></th>
                  <th>
                    <Text value='Moves' color={colors.black40} />
                  </th>
                  <th>
                    <Text value='Parents' color={colors.black40} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.sampleAgents.map(({ move, agent }) => (
                  <tr key={agent.id}>
                    <td>
                      <Text value={`${move}`} />
                    </td>
                    <td>
                      <div
                        style={{
                          backgroundColor: movesColor(
                            agent.moves,
                            state.gridWidth,
                          ),
                          height: state.cellSize * 0.5,
                          width: state.cellSize * 0.5,
                        }}
                      />
                    </td>
                    <td>
                      <Text value={`${agent.moves}`} />
                    </td>
                    <td>
                      <Text value={`${agent.lineage}`} />
                    </td>
                    <td>
                      <Button onClick={handleSelectAgent(agent)} text='View' />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Stack>

          {selectedAgent ? (
            <Stack>
              <Inline expand={0}>
                <Stack spacing={spacing.small}>
                  <Text value='Selected Agent' color={colors.black40} />
                  <Inline spacing={spacing.medium}>
                    <div
                      style={{
                        backgroundColor: movesColor(
                          selectedAgent.moves,
                          state.gridWidth,
                        ),
                        height: 8,
                        width: 8,
                      }}
                    />
                    <Text value={`${selectedAgent.moves} moves`} />
                    <Text value={`${selectedAgent.lineage} parents`} />
                  </Inline>
                </Stack>
                <Button onClick={handleClearSelectedAgent} text='Clear' />
              </Inline>
              <GenomeView genome={selectedAgent.genome} />
            </Stack>
          ) : null}

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text
                value={`Population (Max ${maxAgents})`}
                color={colors.black40}
              />
              <Button
                onClick={handleToggleMetric('population')}
                text={metricsVisible.population ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.population && state.history.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                {/* <VictoryLine data={state.history} x='move' y='leftAgents' />
                <VictoryLine data={state.history} x='move' y='rightAgents' /> */}
                <VictoryLine
                  data={state.history.map(({ move, agentMoves }) => ({
                    move,
                    size: agentMoves.length,
                  }))}
                  x='move'
                  y='size'
                />
              </VictoryChart>
            ) : null}
          </Stack>

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text value={`Lineage (Avg Length)`} color={colors.black40} />
              <Button
                onClick={handleToggleMetric('lineage')}
                text={metricsVisible.lineage ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.lineage && state.history.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryLine
                  data={state.history.map(({ move, agentLineage }) => ({
                    move,
                    lineage: round(sum(agentLineage) / agentLineage.length),
                  }))}
                  x='move'
                  y='lineage'
                />
              </VictoryChart>
            ) : null}
          </Stack>

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text
                value={`Difficulty (Max ${state.killersPerMoveMax})`}
                color={colors.black40}
              />
              <Button
                onClick={handleToggleMetric('difficulty')}
                text={metricsVisible.difficulty ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.difficulty && state.historyRollup.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryLine
                  data={state.historyRollup}
                  x='move'
                  y='difficulty'
                />
              </VictoryChart>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </PageContainer>
  )
}
