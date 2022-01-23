import { clone, groupBy, random, sample, size, some, uniq } from 'lodash'
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

  const renderFrame = () => {
    setState((currentState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const { boardState, agents, lifeSpans, running, speed, moves, topAgent } =
        currentState

      const currentTopAgent = bestAgent(agents)
      const nextTopAgent =
        topAgent && topAgent.moves >= currentTopAgent.moves
          ? topAgent
          : currentTopAgent

      if (nextTopAgent.id === currentTopAgent.id) {
        console.log('👑', nextTopAgent.moves, nextTopAgent.genome)
      }

      const nextKillPositions: Position[] = (boardState.killPositions || [])
        .map(([x, y]) => [x - 1, y] as Position)
        .filter(([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight)

      if (sample([true, false])!) {
        nextKillPositions.push([gridWidth - 1, random(0, gridHeight - 1)])
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

      if (uniq(nextAgents.map((agent) => agent.id)).length !== agentCount) {
        throw new Error(
          `duplicate agent ids ${nextAgents.map((agent) => agent.id)}`,
        )
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
              {state.running ? (
                <Button onClick={handlePause} text='Pause' />
              ) : (
                <Button onClick={handleStart} text='Play' />
              )}

              <Inline spacing={spacing.xsmall}>
                <Button onClick={handleSetSpeed(0)} text='Fast' />
                <Button onClick={handleSetSpeed(1000 / 10)} text='Medium' />
                <Button onClick={handleSetSpeed(1000 / 2)} text='Slow' />
              </Inline>
            </Inline>
          </Stack>

          <Stack spacing={spacing.xsmall}>
            <Text value='Moves' color={colors.black40} />
            <Text value={state.moves} />
          </Stack>

          <Stack spacing={spacing.xsmall}>
            <Text value='Current Generation' color={colors.black40} />
            {size(state.agents) > 0 ? (
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
            ) : null}
          </Stack>

          <Stack spacing={spacing.xsmall}>
            <Text value='Historic Life-spans' color={colors.black40} />
            {size(state.lifeSpans) > 0 ? (
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
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </PageContainer>
  )
}
