import { orderBy, range, sample, sortBy, take, without } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors, colorValues } from '../../lib/colors'
import { spacing } from '../../lib/spacing'
import { usePrevious } from '../../lib/usePrevious'
import { Agent } from './lib/Agent'
import { clearEdge, clearNode, paintEdge, paintNode } from './lib/canvasGrid'
import {
  Direction,
  EdgeSet,
  gridHeight,
  gridWidth,
  move,
  nodeSize,
  Position,
} from './lib/EdgeSet'
import { generateMaze } from './lib/generateMaze'
import styles from './styles.module.scss'

interface EvolutionProps {}

const agentCount = 10

export default function Evolution(_props: EvolutionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cursorPosition, setCursorPosition] = useState<Position>([0, 0])
  const prevCursorPosition = usePrevious(cursorPosition)
  const [exitPosition, setExitPosition] = useState<Position>([
    gridWidth - 1,
    gridHeight - 1,
  ])
  const [edges, setEdges] = useState<EdgeSet>()
  const [generating, setGenerating] = useState(false)
  const [agents, setAgent] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent>()

  // Paint Grid
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    if (!edges && gridHeight && gridWidth) {
      setEdges(new EdgeSet())
    }

    if (prevCursorPosition) {
      clearNode(context, nodeSize, prevCursorPosition)
    }

    if (edges) {
      for (const [edge, enabled] of edges.getEdgeStates()) {
        if (enabled) {
          paintEdge(context, nodeSize, edge)
        } else {
          clearEdge(context, nodeSize, edge)
        }
      }
    }

    if (
      exitPosition[0] === cursorPosition[0] &&
      exitPosition[1] === cursorPosition[1]
    ) {
      paintNode(context, nodeSize, cursorPosition, colorValues.blue60)
    } else {
      paintNode(context, nodeSize, cursorPosition)
      paintNode(context, nodeSize, exitPosition, colorValues.green60)
    }

    if (selectedAgent) {
      console.log('painting agent', selectedAgent)
      const path = selectedAgent.path || []
      for (const position of path) {
        paintNode(context, nodeSize, position, colorValues.blue60)
      }
    }
  }, [
    prevCursorPosition,
    cursorPosition,
    edges,
    setEdges,
    exitPosition,
    selectedAgent,
  ])

  const handleReset = useCallback(() => {
    setEdges(new EdgeSet())
    setCursorPosition([0, 0])
    setExitPosition([gridWidth - 1, gridHeight - 1])
    setAgent([])
  }, [setEdges, setCursorPosition])

  useEffect(() => {
    if (!generating || !edges) return

    const { exit: exitPosition, edges: nextEdges } = generateMaze(
      edges,
      gridHeight,
      gridWidth,
    )

    setEdges(new EdgeSet())
    setCursorPosition([0, 0])
    setExitPosition(exitPosition)
    setEdges(nextEdges)
    setGenerating(false)
  }, [setEdges, edges, handleReset, generating, setGenerating])

  const handleGenerate = useCallback(() => {
    setGenerating(true)
  }, [setGenerating])

  // Move Cursor
  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent) => {
      if (!edges) return

      const direction: Direction | null =
        key === 'ArrowUp'
          ? 'up'
          : key === 'ArrowDown'
          ? 'down'
          : key === 'ArrowLeft'
          ? 'left'
          : key === 'ArrowRight'
          ? 'right'
          : null
      if (direction !== null) {
        const blockedEdges = edges.edgeMapForNode(cursorPosition)
        if (!blockedEdges[direction]) {
          setCursorPosition(move(cursorPosition, direction))
        }
      }

      if (edges) {
        const clearEdgeTo: Position | null =
          key === 'w'
            ? move(cursorPosition, 'up')
            : key === 's'
            ? move(cursorPosition, 'down')
            : key === 'a'
            ? move(cursorPosition, 'left')
            : key === 'd'
            ? move(cursorPosition, 'right')
            : null
        if (clearEdgeTo) {
          setEdges(edges.setEdgeEnabled([cursorPosition, clearEdgeTo]))
        }
      }
    },
    [cursorPosition, setCursorPosition, edges, setEdges],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  const handleInitEvolution = useCallback(() => {
    if (!edges) return

    const nextAgents: Agent[] = []
    for (let i = 0; i < agentCount; i++) {
      const agent = new Agent()
      agent.findPath([0, 0], exitPosition, edges)
      nextAgents.push(agent)
    }

    setAgent(nextAgents)
  }, [edges, setAgent])

  const handleNextGeneration = useCallback(() => {
    if (!edges) return

    const nextAgents: Agent[] = []
    const keeperAgents = take(
      sortBy(agents, ['fitness'], ['asc']),
      agentCount / 2,
    )

    keeperAgents.forEach((agent, index) => {
      const lover =
        keeperAgents[sample(without(range(0, keeperAgents.length), index))!]
      const child = lover.breed(agent)
      child.findPath([0, 0], exitPosition, edges)

      nextAgents.push(keeperAgents[index])
      nextAgents.push(child)
    })

    setAgent(nextAgents)
  }, [edges, setAgent, agents])

  const handleSelectAgent = useCallback(
    (agentId: string) => () => {
      setSelectedAgent(agents.find((agent) => agent.id === agentId))
    },
    [setSelectedAgent, agents],
  )

  return (
    <PageContainer>
      <Stack spacing={spacing.large}>
        <Stack>
          <Text value='Map' size={20} />
          <Inline>
            <Button onClick={handleReset} text='Reset' />
            {!generating ? (
              <Button onClick={handleGenerate} text='Generate' />
            ) : (
              <Text value='Generating..' />
            )}
          </Inline>
        </Stack>
        <canvas
          className={styles.canvas}
          ref={canvasRef}
          width={gridWidth * nodeSize}
          height={gridHeight * nodeSize}
        />
        <Stack spacing={spacing.xxlarge}>
          <Stack>
            <Text value='Evolve' size={20} />
            <Inline>
              <Button onClick={handleInitEvolution} text='Reset' />
              <Button onClick={handleNextGeneration} text='Next Generation' />
            </Inline>
          </Stack>
          {sortBy(agents, ['fitness'], ['asc']).map((agent) => (
            <Inline expand={0} key={agent.id}>
              <Stack>
                <Text value={`Agent ${agent.id}`} size={16} />
                {agent.fitness !== undefined ? (
                  <Stack spacing={spacing.small}>
                    <Text value='Fitness' color={colors.black40} />
                    <Text value={agent.fitness} />
                  </Stack>
                ) : null}
                {agent.path !== undefined ? (
                  <Stack spacing={spacing.small}>
                    <Text value='Path Length' color={colors.black40} />
                    <Text value={agent.path.length} />
                  </Stack>
                ) : null}
                {agent.path !== undefined ? (
                  <Stack spacing={spacing.small}>
                    <Text value='End Position' color={colors.black40} />
                    <Text
                      value={`[${agent.path[agent.path.length - 1].join(
                        ' , ',
                      )}]`}
                    />
                  </Stack>
                ) : null}
              </Stack>
              <Button
                onClick={handleSelectAgent(agent.id)}
                text='View on board'
              />
            </Inline>
          ))}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
