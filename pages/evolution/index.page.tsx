import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colorValues } from '../../lib/colors'
import { usePrevious } from '../../lib/usePrevious'
import { clearEdge, clearNode, paintEdge, paintNode } from './lib/canvasGrid'
import { generateMaze } from './lib/generateMaze'
import { Direction, EdgeSet, move, Position } from './lib/grid'
import styles from './styles.module.scss'

// function getXorFitness(net: Net) {
//   return [
//     getNetworkOutput(net, [0, 0])
//       .map((result) => Math.abs(1 - result))
//       .reduce(multiply, 1),
//     getNetworkOutput(net, [1, 1]).reduce(multiply, 1),
//     getNetworkOutput(net, [0, 1]).map(Math.abs).reduce(multiply, 1),
//     getNetworkOutput(net, [1, 0]).map(Math.abs).reduce(multiply, 1),
//   ].reduce(multiply, 1)
// }

interface EvolutionProps {}

const nodeSize = 64
const gridWidth = 768 / nodeSize
const gridHeight = 512 / nodeSize

export default function Evolution(_props: EvolutionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cursorPosition, setCursorPosition] = useState<Position>([0, 0])
  const prevCursorPosition = usePrevious(cursorPosition)
  const [exitPosition, setExitPosition] = useState<Position>([1, 1])
  const [edges, setEdges] = useState<EdgeSet>()
  const [generating, setGenerating] = useState(false)

  // Paint Grid
  useEffect(() => {
    if (!gridHeight || !gridWidth) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    if (!edges && gridHeight && gridWidth) {
      setEdges(new EdgeSet(gridHeight, gridWidth))
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
  }, [prevCursorPosition, cursorPosition, edges, setEdges, exitPosition])

  const handleReset = useCallback(() => {
    setEdges(new EdgeSet(gridHeight, gridWidth))
    setCursorPosition([0, 0])
  }, [setEdges, setCursorPosition])

  useEffect(() => {
    if (!generating || !edges) return

    const { exit: exitPosition, edges: nextEdges } = generateMaze(
      edges,
      gridHeight,
      gridWidth,
    )

    setEdges(new EdgeSet(gridHeight, gridWidth))
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

  return (
    <PageContainer>
      <Stack>
        <Inline>
          {/* <Button onClick={handleStart} text='Start Evolution' /> */}
          <Button onClick={handleReset} text='Reset Board' />
          {!generating ? (
            <Button onClick={handleGenerate} text='Generate Map' />
          ) : (
            <Text value='Generating..' />
          )}
        </Inline>
        <canvas
          className={styles.canvas}
          ref={canvasRef}
          width={gridWidth * nodeSize}
          height={gridHeight * nodeSize}
        />
      </Stack>
    </PageContainer>
  )
}
