import { clone, groupBy, max, random, range, some } from 'lodash'
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

const agentCount = 10
const cellSize = 16
const canvasWidth = 768
const canvasHeight = 512
const gridWidth = canvasWidth / cellSize
const gridHeight = canvasHeight / cellSize

function movesColor(moves: number): string {
  const maxRunColors = 10
  const runs = Math.floor(moves / gridWidth)
  const capRuns = Math.min(runs, maxRunColors)
  const normalizedRuns = capRuns / maxRunColors
  const color = `hsl(${Math.round(45 + normalizedRuns * 235)}, 100%, 60%)`

  return color
}

type State = {
  agents: Agent[]
  boardState: BoardState
  lifeSpans: Record<number, number>
  running: boolean
  speed: number
  moves: number
  topAgent?: Agent
  killersPerMove: number
  history: {
    move: number
    agentMoves: number[]
  }[]
}

function initState(): State {
  return {
    boardState: new BoardState({ gridWidth, gridHeight, cellSize }),
    agents: new Array(agentCount)
      .fill(0)
      .map((_, i) => new Agent(gridWidth, gridHeight)),
    lifeSpans: {},
    running: false,
    speed: 0,
    moves: 0,
    killersPerMove: 1,
    history: [],
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
  const [showTopGenome, setShowTopGenome] = useState(false)
  const [sampleAgent, setSampleAgent] = useState<Agent | null>(null)
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

  const handleSetDifficulty = useCallback(
    (killersPerMove: number) => () => {
      setState({
        ...state,
        killersPerMove,
      })
    },
    [setState, state],
  )

  const handleToggleTopGenome = useCallback(() => {
    if (!showTopGenome) {
      console.log('👑', state.topAgent?.moves, state.topAgent?.genome)
    }
    setShowTopGenome(!showTopGenome)
  }, [setShowTopGenome, showTopGenome])

  const handleSampleAgent = useCallback(() => {
    const nextSampleAgent = bestAgent(state.agents)
    console.log('Sample', nextSampleAgent.moves, nextSampleAgent.genome)
    setSampleAgent(nextSampleAgent)
  }, [setSampleAgent, state])

  const handleClearSampleAgent = useCallback(() => {
    setSampleAgent(null)
  }, [setSampleAgent, state])

  const handleSpawnTopAgent = useCallback(() => {
    if (!state.topAgent) return

    setState({
      ...state,
      agents: [...state.agents, state.topAgent.resetHistory()],
    })
  }, [state, setState])

  const renderFrame = () => {
    setState((currentState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const {
        boardState,
        agents,
        lifeSpans,
        running,
        speed,
        moves,
        topAgent,
        killersPerMove,
        history,
      } = currentState

      const currentTopAgent = bestAgent(agents)
      const nextTopAgent =
        topAgent && topAgent.moves > currentTopAgent.moves
          ? topAgent
          : currentTopAgent

      const killPositions = boardState.getPositions('kill')
      const nextKillPositions: Position[] = killPositions
        .map(([x, y]) => [x - 1, y] as Position)
        .filter(([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight)

      for (let i = 0; i < killersPerMove; i++) {
        nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      }
      if (killersPerMove % 1 > random(0, 1, true)) {
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

      nextAgents
        .filter((agent) => agent.position[0] >= gridWidth - 1)
        .forEach((agent) => {
          if (nextAgents.length < 100) {
            nextAgents.push(agent.mutate())
          }
        })

      while (nextAgents.length < agentCount) {
        nextAgents.push(new Agent(gridWidth, gridHeight))
      }

      nextBoardState = nextBoardState.appendPositions(
        nextAgents.map(({ position, moves }) => ({
          color: movesColor(moves),
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
          move: moves,
          agentMoves: nextAgents.map(({ moves }) => moves),
        },
      ]

      return {
        boardState: nextBoardState,
        agents: nextAgents,
        lifeSpans: nextLifespans,
        running,
        speed,
        moves: moves + 1,
        topAgent: nextTopAgent,
        killersPerMove,
        history: nextHistory,
      }
    })
  }

  useEffect(() => {
    frameRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(frameRef.current!)
  }, [])

  return (
    <PageContainer>
      <Stack spacing={spacing.large}>
        <Board
          boardState={state.boardState}
          width={canvasWidth}
          height={canvasHeight}
        />

        <Stack spacing={spacing.xlarge}>
          <Stack>
            <Text value='Evolve' size={20} />
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
            </Inline>
          </Stack>

          <Stack spacing={spacing.small}>
            <Text value='Speed' color={colors.black40} />
            <Inline spacing={spacing.xsmall}>
              <Button
                onClick={handleSetSpeed(0)}
                text='Fast'
                disabled={state.speed === 0}
              />
              <Button
                onClick={handleSetSpeed(1000 / 10)}
                disabled={state.speed === 1000 / 10}
                text='Medium'
              />
              <Button
                onClick={handleSetSpeed(1000 / 2)}
                disabled={state.speed === 1000 / 2}
                text='Slow'
              />
            </Inline>
          </Stack>

          <Stack spacing={spacing.small}>
            <Text value='Difficulty' color={colors.black40} />
            <Inline spacing={spacing.xsmall}>
              {range(0.5, 5, 0.5).map((killersPerMove) => (
                <Button
                  key={killersPerMove}
                  onClick={handleSetDifficulty(killersPerMove)}
                  text={killersPerMove.toString()}
                  disabled={state.killersPerMove === killersPerMove}
                />
              ))}
            </Inline>
          </Stack>

          {/* <pre>
            {JSON.stringify(
              state.agents.map((agent) => agent.position),
              null,
              2,
            )}
          </pre> */}

          <Stack spacing={spacing.small}>
            <Text value='Moves' color={colors.black40} />
            <Text value={state.moves} />
          </Stack>

          {state.topAgent ? (
            <Stack>
              <Inline expand={0}>
                <Stack spacing={spacing.small}>
                  <Text value='Top Agent 👑' color={colors.black40} />
                  <Inline spacing={spacing.small}>
                    <div
                      style={{
                        backgroundColor: movesColor(state.topAgent.moves),
                        height: 8,
                        width: 8,
                      }}
                    />
                    <Text value={`${state.topAgent.moves} moves`} />
                  </Inline>
                </Stack>
                <Button onClick={handleSpawnTopAgent} text='Spawn' />
                <Button
                  onClick={handleToggleTopGenome}
                  text={showTopGenome ? 'Hide Genome' : 'Show Genome'}
                />
              </Inline>
              {showTopGenome ? (
                <GenomeView genome={state.topAgent.genome} />
              ) : null}
            </Stack>
          ) : null}

          <Stack>
            <Inline expand={0}>
              <Stack spacing={spacing.small}>
                <Text value='Sample Agent' color={colors.black40} />
                {sampleAgent ? (
                  <Inline spacing={spacing.small}>
                    <div
                      style={{
                        backgroundColor: movesColor(sampleAgent.moves),
                        height: 8,
                        width: 8,
                      }}
                    />
                    <Text value={`${sampleAgent.moves} moves`} />
                  </Inline>
                ) : null}
              </Stack>
              <Button onClick={handleSampleAgent} text='Sample' />
              <Button onClick={handleClearSampleAgent} text='Clear' />
            </Inline>
            {sampleAgent ? <GenomeView genome={sampleAgent.genome} /> : null}
          </Stack>

          {state.history.length > 0 ? (
            <Stack spacing={spacing.small}>
              <Text value='Agents Alive' color={colors.black40} />
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
              <Text value='Top Agent Age' color={colors.black40} />
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryAxis label='Move' />
                <VictoryAxis dependentAxis />
                <VictoryLine
                  data={state.history.map(({ move, agentMoves }) => ({
                    move,
                    max: max(agentMoves),
                  }))}
                  x='move'
                  y='max'
                />
              </VictoryChart>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
