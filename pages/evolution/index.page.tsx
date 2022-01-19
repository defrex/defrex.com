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

export default function Evolution(_props: EvolutionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPosition, setCurrentPosition] = useState<Position>([0, 0])
  const previousPosition = usePrevious(currentPosition)
  const [nodeSize] = useState(128)
  const [gridWidth, setGridWidth] = useState<number>()
  const [gridHeight, setGridHeight] = useState<number>()
  const [edges, setEdges] = useState<EdgeSet>()

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    setGridWidth(canvasRef.current!.width / nodeSize)
    setGridHeight(canvasRef.current!.height / nodeSize)
  }, [setGridWidth, setGridHeight])

  useEffect(() => {
    if (!edges && gridHeight && gridWidth) {
      setEdges(new EdgeSet(gridHeight, gridWidth))
    }
  }, [gridHeight, gridWidth, edges, setEdges])

  useEffect(() => {
    if (!gridHeight || !gridWidth) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    if (previousPosition) {
      clearNode(context, nodeSize, previousPosition)
    }

    paintNode(context, nodeSize, currentPosition)

    if (edges) {
      for (const [edge, enabled] of edges.getEdgeStates()) {
        if (enabled) {
          paintEdge(context, nodeSize, edge)
        } else {
          clearEdge(context, nodeSize, edge)
        }
      }
    }
  }, [
    previousPosition,
    currentPosition,
    nodeSize,
    edges,
    gridHeight,
    gridWidth,
  ])

  const handleReset = useCallback(() => {
    if (!gridHeight || !gridWidth) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    setEdges(new EdgeSet(gridHeight, gridWidth))
    setCurrentPosition([0, 0])
  }, [gridHeight, gridWidth, canvasRef])

  const handleGenerate = useCallback(() => {
    if (!gridHeight || !gridWidth || !edges) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    const maxSteps = gridWidth * gridHeight * 10
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
          console.log(prevPositionString, edgeMap, openEdges)
          if (openEdges <= 3) {
            position = prevPosition
            continue stepper
          }
        }

        exitPosition = position
        break stepper
      }

      const nextPosition = move(position, direction)

      paintNode(context, nodeSize, position, colorValues.blue60)
      // console.log(`moving ${direction}`, [position, nextPosition], false)
      nextEdges = nextEdges.setEdgeEnabled([position, nextPosition], false)

      if (positionHistory.indexOf(positionKey(position)) === -1) {
        console.log('adding history', positionKey(position))
        positionHistory.push(positionKey(position))
      }

      position = nextPosition
    }

    if (exitPosition) {
      console.log('Exit Position', positionKey(exitPosition))
      paintNode(context, nodeSize, exitPosition, colorValues.green60)
    } else {
      console.warn('No exit position found')
    }

    setEdges(nextEdges)
  }, [canvasRef, gridHeight, gridWidth, nodeSize, setEdges, edges, handleReset])

  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent) => {
      if (!gridHeight || !gridWidth) return

      const nextPosition: Position | null =
        key === 'ArrowUp' && currentPosition[1] - 1 >= 0
          ? [currentPosition[0], currentPosition[1] - 1]
          : key === 'ArrowDown' && currentPosition[1] + 1 < gridHeight
          ? [currentPosition[0], currentPosition[1] + 1]
          : key === 'ArrowLeft' && currentPosition[0] - 1 >= 0
          ? [currentPosition[0] - 1, currentPosition[1]]
          : key === 'ArrowRight' && currentPosition[0] + 1 < gridWidth
          ? [currentPosition[0] + 1, currentPosition[1]]
          : null
      if (nextPosition !== null) {
        setCurrentPosition(nextPosition)
      }

      if (edges) {
        const clearEdgeTo: Position | null =
          key === 'w'
            ? move(currentPosition, 'up')
            : key === 's'
            ? move(currentPosition, 'down')
            : key === 'a'
            ? move(currentPosition, 'left')
            : key === 'd'
            ? move(currentPosition, 'right')
            : null
        if (clearEdgeTo) {
          setEdges(edges.setEdgeEnabled([currentPosition, clearEdgeTo]))
        }
      }
    },
    [
      currentPosition,
      setCurrentPosition,
      gridHeight,
      gridWidth,
      edges,
      setEdges,
    ],
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
          <Button onClick={handleGenerate} text='Generate Map' />
          <Button onClick={handleReset} text='Reset Board' />
        </Inline>
        <canvas
          className={styles.canvas}
          ref={canvasRef}
          width='768'
          height='512'
        />
      </Stack>
    </PageContainer>
  )
}
