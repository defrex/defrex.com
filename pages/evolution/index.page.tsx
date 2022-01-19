import { reverse, shuffle } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colorValues } from '../../lib/colors'
import { usePrevious } from '../../lib/usePrevious'
import { clearEdge, clearNode, paintEdge, paintNode } from './lib/canvasGrid'
import {
  Direction,
  EdgeSet,
  isValidDestination,
  keyPosition,
  move,
  Position,
  positionKey,
} from './lib/grid'
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
  }, [
    prevCursorPosition,
    cursorPosition,
    nodeSize,
    edges,
    gridHeight,
    gridWidth,
  ])

  // Reset Grid State
  const handleReset = useCallback(() => {
    if (!gridHeight || !gridWidth) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    setEdges(new EdgeSet(gridHeight, gridWidth))
    setCursorPosition([0, 0])
  }, [gridHeight, gridWidth, canvasRef])

  // Generate Maze
  useEffect(() => {
    if (!generating) return
    if (!gridHeight || !gridWidth || !edges) return
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    const maxSteps = gridWidth * gridHeight * 50
    let currentStep = 0
    let position: Position = [0, 0]
    let exitPosition: Position | null = null
    let nextEdges = new EdgeSet(gridHeight, gridWidth)
    const positionHistory: string[] = []

    stepper: while (true) {
      currentStep++
      if (currentStep > maxSteps) {
        exitPosition = position
        console.log(`Hit maxSteps ${maxSteps}`, {
          position,
          currentStep,
        })
        break stepper
      }

      const direction = shuffle([
        'right',
        'down',
        'left',
        'up',
      ] as Direction[]).find((direction: Direction) =>
        isValidDestination(
          gridHeight,
          gridWidth,
          move(position, direction),
          positionHistory,
        ),
      )
      if (!direction) {
        // Search for a position with few open edges
        for (const prevPositionString of reverse(positionHistory)) {
          const prevPosition = keyPosition(prevPositionString)
          const edgeMap = edges.edgeMapForNode(prevPosition)
          const openEdges = Object.values(edgeMap).filter(
            (enabled) => enabled,
          ).length
          if (openEdges <= 3) {
            position = prevPosition
            continue stepper
          }
        }

        exitPosition = position
        break stepper
      }

      const nextPosition = move(position, direction)

      // paintNode(context, nodeSize, position, colorValues.blue60)
      nextEdges = nextEdges.setEdgeEnabled([position, nextPosition], false)

      if (positionHistory.indexOf(positionKey(position)) === -1) {
        positionHistory.push(positionKey(position))
      }

      position = nextPosition
    }

    if (exitPosition) {
      console.log('Exit position', positionKey(exitPosition))
      setExitPosition(exitPosition)
    } else {
      console.warn('No exit position found')
    }

    setEdges(nextEdges)
    setGenerating(false)
  }, [
    canvasRef,
    gridHeight,
    gridWidth,
    nodeSize,
    setEdges,
    edges,
    handleReset,
    generating,
    setGenerating,
  ])

  const handleGenerate = useCallback(() => {
    setGenerating(true)
  }, [setGenerating])

  // Move Cursor
  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent) => {
      if (!gridHeight || !gridWidth || !edges) return

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
    [cursorPosition, setCursorPosition, gridHeight, gridWidth, edges, setEdges],
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
        <Text value='Evolution' size={24} />
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
