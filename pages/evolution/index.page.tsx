import {
  clone,
  groupBy,
  random,
  sample,
  size,
  some,
  sortBy,
  uniq,
} from 'lodash'
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

export default function Evolution(_props: EvolutionProps) {
  const frameRef = useRef<number>()
  const [
    { boardState, agents, lifeSpans, running, speed, moves },
    setBoardStateAgents,
  ] = useState<{
    agents: Agent[]
    boardState: BoardState
    lifeSpans: Record<number, number>
    running: boolean
    speed: number
    moves: number
  }>({
    boardState: new BoardState(gridWidth, gridHeight, cellSize),
    agents: [],
    lifeSpans: {},
    running: false,
    speed: 0,
    moves: 0,
  })

  const handleReset = useCallback(() => {
    setBoardStateAgents({
      boardState: boardState.reset(),
      agents: [],
      lifeSpans: {},
      running: false,
      speed,
      moves: 0,
    })
  }, [setBoardStateAgents, boardState])

  const handleStart = useCallback(() => {
    setBoardStateAgents({
      boardState,
      agents,
      lifeSpans,
      speed,
      running: true,
      moves,
    })
  }, [setBoardStateAgents, boardState, agents, lifeSpans, moves])

  const handlePause = useCallback(() => {
    setBoardStateAgents({
      boardState,
      agents,
      lifeSpans,
      speed,
      running: false,
      moves,
    })
  }, [setBoardStateAgents, boardState, agents, lifeSpans, moves])

  const handleSetSpeed = useCallback(
    (speed: number) => () => {
      setBoardStateAgents({
        boardState,
        agents,
        lifeSpans,
        speed,
        running,
        moves,
      })
    },
    [setBoardStateAgents, boardState, agents, lifeSpans, moves],
  )

  const renderFrame = () => {
    setBoardStateAgents(
      ({ boardState, agents, lifeSpans, running, speed, moves }) => {
        if (moves % 10 === 0) {
          console.log(
            `moves ${moves} 👑`,
            sortBy(agents, ['moves'], ['desc'])[0],
          )
        }

        const nextKillPositions: Position[] = (boardState.killPositions || [])
          .map(([x, y]) => [x - 1, y] as Position)
          .filter(
            ([x, y]) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight,
          )

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
          const parent = sortBy(
            [...agents, ...nextAgents],
            ['moves'],
            ['desc'],
          )[0]
          nextAgents.push(parent.mutate())
        }

        if (uniq(nextAgents.map((agent) => agent.id)).length !== agentCount) {
          throw new Error(
            `duplicate agent ids ${nextAgents.map((agent) => agent.id)}`,
          )
        }

        nextBoardState = nextBoardState.setAgentPositions(
          nextAgents.map(({ position }) => position),
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

        return {
          boardState: nextBoardState,
          agents: nextAgents,
          lifeSpans: nextLifespans,
          running,
          speed,
          moves: moves + 1,
        }
      },
    )
  }

  useEffect(() => {
    if (running) {
      frameRef.current = requestAnimationFrame(renderFrame)
    }
    return () => cancelAnimationFrame(frameRef.current!)
  }, [running])

  return (
    <PageContainer>
      <Stack spacing={spacing.large}>
        <Board
          boardState={boardState}
          width={canvasWidth}
          height={canvasHeight}
        />

        <Stack spacing={spacing.xlarge}>
          <Stack>
            <Text value='Evolve' size={20} />
            <Inline>
              <Button onClick={handleReset} text='Reset' />
              {running ? (
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
            <Text value={moves} />
          </Stack>

          <Stack spacing={spacing.xsmall}>
            <Text value='Current Generation' color={colors.black40} />
            {size(agents) > 0 ? (
              <VictoryChart domainPadding={{ x: 20 }} theme={victoryChartTheme}>
                <VictoryAxis label='Agent Index' />
                <VictoryAxis label='Life Span' dependentAxis />
                <VictoryBar
                  data={agents
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
            {size(lifeSpans) > 0 ? (
              <VictoryChart domainPadding={{ x: 20 }} theme={victoryChartTheme}>
                <VictoryAxis label='Life Span' tickCount={10} />
                <VictoryAxis label='Agent Count' dependentAxis />
                <VictoryBar
                  data={sortBy(
                    Object.entries(lifeSpans),
                    ([index, span]) => span,
                  ).map(([lifeSpan, agentCount]) => ({
                    lifeSpan,
                    agentCount,
                  }))}
                  x='lifeSpan'
                  y='agentCount'
                />
              </VictoryChart>
            ) : null}
          </Stack>

          {/*
          <pre>
            {JSON.stringify(
              {
                moves,
                currentGenerationLifeSpans: agents.map((agent) => agent.moves),
                historicLifeSpanDistribution: lifeSpans,
              },
              null,
              2,
            )}
          </pre> */}

          {/* {sortBy(agents, ['moves'], ['desc']).map((agent) => (
            <AgentInfo agent={agent} key={agent.id} />
          ))} */}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
