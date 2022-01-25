import { clone, groupBy, random, some, sortBy, sum } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VictoryAxis, VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../components/Button'
import { GenomeView } from '../../components/GenomeView'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors, colorValues } from '../../lib/colors'
import { sleep } from '../../lib/sleep'
import { spacing } from '../../lib/spacing'
import { victoryChartTheme } from '../../lib/victoryChartTheme'
import { Board } from './components/Board'
import { BoardState, Position } from './components/Board/lib/BoardState'
import { Agent } from './lib/Agent'

interface EvolutionProps {}

const minAgents = 10
const maxAgents = 100
const maxDifficulty = 5
const defaultCellSize = 16
const canvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
const canvasHeight = 512
const historyRollupGranularity = 200

function movesColor(moves: number, gridWidth: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

function difficulty(survivors: number): number {
  const proportion = (survivors - minAgents) / (maxAgents - minAgents)
  return maxDifficulty * proportion
}

type State = {
  agents: Agent[]
  boardState: BoardState
  cellSize: number
  gridHeight: number
  gridWidth: number
  history: { move: number; difficulty: number; agentMoves: number[] }[]
  historyRollup: { move: number; difficulty: number }[]
  killersPerMove: number
  lifeSpans: Record<number, number>
  move: number
  running: boolean
  speed: number
  sampleAgents: { move: number; agent: Agent }[]
  autoSample: boolean
}

function initState(): State {
  const cellSize = defaultCellSize
  const gridWidth = canvasWidth / cellSize
  const gridHeight = canvasHeight / cellSize
  return {
    agents: new Array(minAgents)
      .fill(0)
      .map((_, i) => new Agent(gridWidth, gridHeight)),
    boardState: new BoardState({ gridWidth, gridHeight, cellSize }),
    cellSize,
    gridHeight,
    gridWidth,
    history: [],
    historyRollup: [],
    killersPerMove: 1,
    lifeSpans: {},
    move: 0,
    running: false,
    speed: 0,
    sampleAgents: [],
    autoSample: false,
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
  const [state, setState] = useState<State>(initState())

  const handleReset = useCallback(() => {
    setState(initState())
  }, [setState])

  const handleStart = useCallback(() => {
    setState({
      ...state,
      running: true,
    })
  }, [setState, state])

  const handlePause = useCallback(() => {
    setState({
      ...state,
      running: false,
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

  const renderFrame = () => {
    setState((currentState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const {
        agents,
        boardState,
        gridHeight,
        gridWidth,
        history,
        historyRollup,
        killersPerMove,
        lifeSpans,
        move,
        running,
        speed,
        sampleAgents,
        autoSample,
      } = currentState

      const nextSampleAgents =
        move > 0 && move % 500 === 0 && autoSample
          ? [...sampleAgents, { move, agent: bestAgent(agents) }]
          : sampleAgents

      const killPositions = boardState.getPositions('kill')
      const nextKillPositions: Position[] = killPositions
        .map(([x, y]) => [x - 1, y] as Position)
        .filter(([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight)

      const partialKillersPerMove = killersPerMove % 1
      for (let i = 0; i < killersPerMove - partialKillersPerMove; i++) {
        nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      }
      if (partialKillersPerMove > random(0, 1, true)) {
        nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      }

      let nextBoardState = boardState.setPositions(
        nextKillPositions.map((position) => ({
          type: 'kill',
          color: colorValues.red60,
          position,
        })),
      )
      let nextAgents = agents || []
      nextAgents = nextAgents.map((agent) => agent.move(nextBoardState))

      const { deadAgents, survivingAgents } = groupBy(nextAgents, (agent) =>
        some(
          killPositions,
          ([x, y]) => agent.position[0] === x && agent.position[1] === y,
        )
          ? 'deadAgents'
          : 'survivingAgents',
      )
      nextAgents = survivingAgents || []

      const nextLifespans = clone(lifeSpans)
      if (deadAgents?.length) {
        for (const killedAgent of deadAgents) {
          nextLifespans[killedAgent.moves] =
            (nextLifespans[killedAgent.moves] || 0) + 1
        }
      }

      let nextKillersPerMove = difficulty(survivingAgents.length)

      if (nextAgents.length === maxAgents) {
        // Max agents, kill the weak
        nextAgents = sortBy(nextAgents, 'moves').slice(-95)
      }

      nextAgents
        .filter((agent) => agent.position[0] >= gridWidth - 1)
        .forEach((agent) => {
          if (nextAgents.length < 100) {
            nextAgents.push(agent.mutate())
          }
        })

      while (nextAgents.length < minAgents) {
        nextAgents.push(new Agent(gridWidth, gridHeight))
      }

      nextBoardState = nextBoardState.appendPositions(
        nextAgents.map(({ position, moves }) => ({
          color: movesColor(moves, gridWidth),
          position,
        })),
      )

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
          difficulty: nextKillersPerMove,
          agentMoves: nextAgents.map(({ moves }) => moves),
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
        running,
        speed,
        move: move + 1,
        sampleAgents: nextSampleAgents,
        killersPerMove: nextKillersPerMove,
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
        <Stack spacing={spacing.small}>
          <Text value='Neuroevolution' size={20} />
          <Text
            value='Neural Networks trained via Evolutionary Algorithm'
            color={colors.black40}
          />
        </Stack>

        <Board
          boardState={state.boardState}
          width={canvasWidth}
          height={canvasHeight}
        />

        <Stack spacing={spacing.xlarge}>
          <Stack>
            <Inline>
              <Button onClick={handleReset} text='Reset' />
              <Inline spacing={spacing.xsmall}>
                <Button
                  onClick={handlePause}
                  text='Pause'
                  disabled={!state.running}
                />
                <Button
                  onClick={handleStart}
                  text='Play'
                  disabled={state.running}
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
            </Inline>
          </Stack>

          {/* <pre>
            {JSON.stringify(
              state.agents.map((agent) => agent.position),
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
            {state.sampleAgents.map(({ move, agent }) => (
              <Stack key={agent.id}>
                <Inline expand={0}>
                  <Stack spacing={spacing.small}>
                    <Inline spacing={spacing.small}>
                      <Text value={`${move}`} />
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
                    </Inline>
                  </Stack>
                  <Button onClick={handleSelectAgent(agent)} text='Select' />
                </Inline>
              </Stack>
            ))}
          </Stack>

          {selectedAgent ? (
            <Stack>
              <Inline expand={0}>
                <Stack spacing={spacing.small}>
                  <Text value='Selected Agent' color={colors.black40} />
                  <Inline spacing={spacing.small}>
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
                  </Inline>
                </Stack>
                <Button onClick={handleClearSelectedAgent} text='Clear' />
              </Inline>
              <GenomeView genome={selectedAgent.genome} />
            </Stack>
          ) : null}

          {state.history.length > 0 ? (
            <Stack spacing={spacing.small}>
              <Text
                value={`Population (Max ${maxAgents})`}
                color={colors.black40}
              />
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryAxis label='Move' />
                <VictoryAxis dependentAxis />
                <VictoryLine
                  data={state.history.map(({ move, agentMoves }) => ({
                    move,
                    size: agentMoves.length,
                  }))}
                  x='move'
                  y='size'
                />
              </VictoryChart>
            </Stack>
          ) : null}

          {state.historyRollup.length > 0 ? (
            <Stack spacing={spacing.small}>
              <Text
                value={`Difficulty (Max ${maxDifficulty})`}
                color={colors.black40}
              />
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryAxis label='Move' />
                <VictoryAxis dependentAxis />
                <VictoryLine
                  data={state.historyRollup}
                  x='move'
                  y='difficulty'
                />
              </VictoryChart>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
