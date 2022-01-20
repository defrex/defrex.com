import { orderBy, reverse, shuffle } from 'lodash'
import {
  Direction,
  EdgeSet,
  isValidDestination,
  keyPosition,
  move,
  Position,
  positionKey,
} from './EdgeSet'

export function generateMaze(
  edges: EdgeSet,
  gridHeight: number,
  gridWidth: number,
): {
  edges: EdgeSet
  exit: Position
} {
  const maxSteps = gridWidth * gridHeight * 20
  let currentStep = 0
  let position: Position = [0, 0]
  let endPosition: Position | null = null
  let nextEdges = new EdgeSet()
  const positionHistory: string[] = []

  stepper: while (true) {
    currentStep++
    if (currentStep > maxSteps) {
      // endPosition = position
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
      isValidDestination(move(position, direction), positionHistory),
    )
    if (!direction) {
      // Search for a position with few open edges
      for (const prevPositionKey of reverse(positionHistory)) {
        const prevPosition = keyPosition(prevPositionKey)
        const edgeMap = edges.edgeMapForNode(prevPosition)
        const openEdges = Object.values(edgeMap).filter(
          (enabled) => enabled,
        ).length
        if (openEdges <= 3) {
          position = prevPosition
          continue stepper
        }
      }

      endPosition = position
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

  return {
    exit:
      endPosition ||
      keyPosition(positionHistory[positionHistory.length - 1]) ||
      orderBy(
        positionHistory.map(keyPosition),
        (position) => position[0] * position[1],
        'desc',
      )[0],
    edges: nextEdges,
  }
}
