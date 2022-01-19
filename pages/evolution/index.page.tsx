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

export default function Evolution(_props: EvolutionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPosition, setCurrentPosition] = useState<Position>([0, 0])
  const previousPosition = usePrevious(currentPosition)
  const [nodeSize] = useState(32)
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

    // Exit Node
    paintNode(
      context,
      nodeSize,
      [gridWidth - 1, gridHeight - 1],
      colorValues.green60,
    )

    if (previousPosition) {
      clearNode(context, nodeSize, previousPosition)
    }

    paintNode(context, nodeSize, currentPosition)

    if (edges) {
      for (const [
        [fromPosition, toPosition],
        enabled,
      ] of edges.getEdgeStates()) {
        if (enabled) {
          paintEdge(context, nodeSize, fromPosition, toPosition)
        } else {
          clearEdge(context, nodeSize, fromPosition, toPosition)
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

    const stepsNeeded: Record<'right' | 'down', number> = {
      right: gridWidth - 1,
      down: gridHeight - 1,
    }
    const maxSteps = gridWidth * gridHeight * 10
    let currentStep = 0
    let position: Position = [0, 0]
    let nextEdges = new EdgeSet(gridHeight, gridWidth)
    let positionsVisited = new Set<Position>()
    const positionHistory: Position[] = []

    while (stepsNeeded.right > 0 || stepsNeeded.down > 0) {
      positionsVisited.add(position)
      let nextPosition: Position | null = null
      const direction = shuffle([
        'right',
        'down',
        // 'left',
        // 'up',
      ] as Direction[]).find((direction: Direction) => {
        const maybeNextPosition = move(position, direction)
        return (
          maybeNextPosition[0] >= 0 &&
          maybeNextPosition[0] <= gridWidth &&
          maybeNextPosition[1] >= 0 &&
          maybeNextPosition[1] <= gridHeight &&
          positionsVisited.has(maybeNextPosition) === false
        )
      })
      if (!direction) {
        // Use the last position by default
        position = positionHistory[positionHistory.length - 1]

        // Search for a position with few open edges
        for (const prevPosition of reverse(positionHistory)) {
          const edgeMap = edges.edgeMapForNode(prevPosition)
          if (Object.values(edgeMap).filter((enabled) => enabled).length <= 2) {
            position = prevPosition
            break
          }
        }

        continue
      }

      const [step, stepChange] =
        direction === 'right'
          ? ['right' as const, -1]
          : direction === 'left'
          ? ['right' as const, 1]
          : direction === 'down'
          ? ['down' as const, -1]
          : direction === 'up'
          ? ['down' as const, 1]
          : ['right' as const, -1]
      if (
        direction &&
        stepsNeeded[step] + stepChange >= 0 &&
        stepsNeeded[step] + stepChange < gridWidth &&
        positionsVisited.has(move(position, direction)) === false
      ) {
        nextPosition = move(position, direction)
        stepsNeeded[step] += stepChange
      }

      paintNode(context, nodeSize, position, colorValues.blue60)
      if (nextPosition) {
        console.log(`moving ${direction}`, [position, nextPosition], false)
        nextEdges = nextEdges.setEdgeEnabled([position, nextPosition], false)
        positionHistory.push(position)
        position = nextPosition
      } else if (
        position[0] === gridWidth - 1 &&
        position[1] === gridHeight - 1
      ) {
        console.log('exited!', { position, currentStep })
      }

      currentStep++
      if (currentStep > maxSteps) {
        console.warn(`failed to exit by ${maxSteps} steps`, {
          position,
          currentStep,
        })
        break
      }
    }

    console.log('new edges', nextEdges)
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
