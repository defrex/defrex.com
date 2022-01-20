import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colorValues } from '../../lib/colors'
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
  positionKey,
} from './lib/EdgeSet'
import { generateMaze } from './lib/generateMaze'
import styles from './styles.module.scss'

interface EvolutionProps {}

type AgentResult = {
  agent: Agent
  path?: Position[]
  fitness?: number
}

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
  const [agentResults, setAgentResults] = useState<AgentResult[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentResult>()

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
    setAgentResults([])
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

  const handleEvolve = useCallback(() => {
    if (!edges) return

    const agentCount = 2
    const results: AgentResult[] = []
    for (let i = 0; i < agentCount; i++) {
      const result: AgentResult = {
        agent: new Agent(),
      }
      result.path = result.agent.findPath([0, 0], exitPosition, edges)
      result.fitness = result.agent.fitness(result.path, exitPosition)
      results.push(result)
    }

    setAgentResults(results)
  }, [edges, setAgentResults])

  const handleSelectAgent = useCallback(
    (agentId: string) => () => {
      const result = agentResults.find((result) => result.agent.id === agentId)
      console.log('selecting agent', result)
      setSelectedAgent(result)
    },
    [setSelectedAgent, agentResults],
  )

  return (
    <PageContainer>
      <Stack spacing={spacing.large}>
        <Inline>
          <Button onClick={handleReset} text='Reset' />
          {!generating ? (
            <Button onClick={handleGenerate} text='Generate Map' />
          ) : (
            <Text value='Generating..' />
          )}
          <Button onClick={handleEvolve} text='Start Evolution' />
        </Inline>
        <canvas
          className={styles.canvas}
          ref={canvasRef}
          width={gridWidth * nodeSize}
          height={gridHeight * nodeSize}
        />
        <Stack>
          {agentResults.map(({ agent, path, fitness }) => (
            <Stack key={agent.id} spacing={spacing.small}>
              <Inline expand={1}>
                <Text value={`Agent ${agent.id}`} size={16} />
                <Text value={fitness} />
                <Button
                  onClick={handleSelectAgent(agent.id)}
                  text='View on board'
                />
              </Inline>
              <Text value={path?.map(positionKey).join(' > ')} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </PageContainer>
  )
}
