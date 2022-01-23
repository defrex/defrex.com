import { clone, groupBy, random, sample, size, some } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VictoryAxis, VictoryBar, VictoryChart } from 'victory'
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
import { BoardState, Position } from './components/Board/lib/BoardState'
import { Agent } from './lib/Agent'

interface EvolutionProps {}

const agentCount = 10
const cellSize = 16
const canvasWidth = 768
const canvasHeight = 512
const gridWidth = canvasWidth / cellSize
const gridHeight = canvasHeight / cellSize

type State = {
  agents: Agent[]
  boardState: BoardState
  lifeSpans: Record<number, number>
  running: boolean
  speed: number
  moves: number
  topAgent?: Agent
  killersPerMove: number
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
    killersPerMove: 2,
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

  const handleLogTopAgent = useCallback(() => {
    console.log('👑', state.topAgent?.moves, state.topAgent?.genome)
  }, [state])

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
      } = currentState

      const currentTopAgent = bestAgent(agents)
      const nextTopAgent =
        topAgent && topAgent.moves >= currentTopAgent.moves
          ? topAgent
          : currentTopAgent

      const nextKillPositions: Position[] = (boardState.killPositions || [])
        .map(([x, y]) => [x - 1, y] as Position)
        .filter(([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight)

      if (killersPerMove === 0.5 && sample([true, false])!) {
        nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
      } else if (killersPerMove >= 1) {
        for (let i = 0; i < killersPerMove; i++) {
          nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
        }
      }

      let nextBoardState = boardState.setKillPositions(nextKillPositions)
      let nextAgents = agents || []
      nextAgents = nextAgents.map((agent) => agent.move(nextBoardState))

      const { deadAgents, survivingAgents } = groupBy(nextAgents, (agent) =>
        some(
          nextBoardState.killPositions,
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

      if (nextAgents.length === 0) {
        nextAgents.push(new Agent(gridWidth, gridHeight))
      }

      while (nextAgents.length < agentCount) {
        const parent = sample([topAgent, currentTopAgent]) || nextAgents[0]
        nextAgents.push(parent.mutate())
      }

      nextBoardState = nextBoardState
        .setAgentPositions(nextAgents.map(({ position }) => position))
        .setTopAgentPosition(nextTopAgent?.position)

      if (running) {
        if (speed > 0) {
          sleep(speed).then(() => {
            frameRef.current = requestAnimationFrame(renderFrame)
          })
        } else {
          frameRef.current = requestAnimationFrame(renderFrame)
        }
      }

      return {
        boardState: nextBoardState,
        agents: nextAgents,
        lifeSpans: nextLifespans,
        running,
        speed,
        moves: moves + 1,
        topAgent: nextTopAgent,
        killersPerMove,
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
              <Button
                onClick={handleSetDifficulty(0.5)}
                text='Easy'
                disabled={state.killersPerMove === 0.5}
              />
              <Button
                onClick={handleSetDifficulty(1)}
                disabled={state.killersPerMove === 1}
                text='Medium'
              />
              <Button
                onClick={handleSetDifficulty(2)}
                disabled={state.killersPerMove === 2}
                text='Hard'
              />
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
            <Inline expand={0}>
              <Stack spacing={spacing.small}>
                <Text value='Top Agent 👑' color={colors.black40} />
                <Text value={`${state.topAgent.moves} moves`} />
              </Stack>
              <Button onClick={handleLogTopAgent} text='Log Genome' />
            </Inline>
          ) : null}

          {size(state.agents) > 0 ? (
            <Stack spacing={spacing.small}>
              <Text value='Current Generation' color={colors.black40} />
              <VictoryChart domainPadding={{ x: 20 }} theme={victoryChartTheme}>
                <VictoryAxis label='Agent Index' />
                <VictoryAxis label='Life Span' dependentAxis />
                <VictoryBar
                  data={state.agents
                    .map((agent) => agent.moves)
                    .map((moves, index) => ({
                      index,
                      moves,
                    }))}
                  x='index'
                  y='moves'
                />
              </VictoryChart>
            </Stack>
          ) : null}

          {size(state.lifeSpans) > 0 ? (
            <Stack spacing={spacing.small}>
              <Text value='Historic Life-spans' color={colors.black40} />
              <VictoryChart domainPadding={{ x: 20 }} theme={victoryChartTheme}>
                <VictoryAxis label='Life Span' tickCount={10} />
                <VictoryAxis label='Agent Count' dependentAxis />
                <VictoryBar
                  data={Object.entries(state.lifeSpans).map(
                    ([moves, agents]) => ({
                      moves: parseInt(moves.toString(), 10),
                      agents: parseInt(agents.toString(), 10),
                    }),
                  )}
                  x='moves'
                  y='agents'
                  sortKey='moves'
                />
              </VictoryChart>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
