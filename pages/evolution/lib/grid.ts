import { clone, isArray, sortBy } from 'lodash'

export type Direction = 'up' | 'right' | 'down' | 'left'
export type Position = [number, number]
export type Edge = [Position, Position]

export class EdgeSet {
  private gridHeight: number
  private gridWidth: number
  private edgeStates: { [key: string]: boolean } = {}

  constructor(
    gridHeight: number,
    gridWidth: number,
    edgeStates?: { [key: string]: boolean },
  ) {
    this.gridHeight = gridHeight
    this.gridWidth = gridWidth
    if (edgeStates) {
      this.edgeStates = edgeStates
    } else {
      for (let gridX = 0; gridX < gridWidth; gridX++) {
        for (let gridY = 0; gridY < gridHeight; gridY++) {
          for (const edge of [
            [
              [gridX, gridY],
              [gridX + 1, gridY],
            ],
            [
              [gridX, gridY],
              [gridX, gridY + 1],
            ],
          ] as Edge[]) {
            this.validateEdge(edge)
            this.edgeStates[edgeKey(edge)] = true
          }
        }
      }
    }
  }

  setEdgeEnabled(edge: Edge, enabled?: boolean): EdgeSet {
    this.validateEdge(edge)
    enabled = enabled !== undefined ? enabled : !this.getEdgeEnabled(edge)
    const edgeStates = clone(this.edgeStates)
    edgeStates[edgeKey(edge)] = enabled
    return new EdgeSet(this.gridHeight, this.gridWidth, edgeStates)
  }

  getEdgeEnabled(edge: Edge): boolean {
    this.validateEdge(edge)
    return this.edgeStates[edgeKey(edge)]
  }

  getEdgeStates(): [Edge, boolean][] {
    return Object.entries(this.edgeStates).map(([key, enabled]) => [
      keyEdge(key),
      enabled,
    ])
  }

  edgeMapForNode(node: Position): Record<Direction, boolean> {
    const edgeMap: Record<Direction, boolean> = {
      up: false,
      right: false,
      down: false,
      left: false,
    }
    for (const [[fromPosition, toPosition], enabled] of this.getEdgeStates()) {
      if (
        (fromPosition[0] === node[0] && fromPosition[1] === node[1]) ||
        (toPosition[0] === node[0] && toPosition[1] === node[1])
      ) {
        edgeMap[edgeDirection([fromPosition, toPosition])] = enabled
      }
    }
    return edgeMap
  }

  validateEdge(edge: Edge): void {
    if (
      !(
        isArray(edge) &&
        edge.length === 2 &&
        isArray(edge[0]) &&
        edge[0].length === 2 &&
        edge[0][0] >= 0 &&
        edge[0][0] <= this.gridWidth &&
        edge[0][1] >= 0 &&
        edge[0][1] <= this.gridHeight &&
        isArray(edge[1]) &&
        edge[1].length === 2 &&
        edge[1][0] >= 0 &&
        edge[1][0] <= this.gridWidth &&
        edge[1][1] >= 0 &&
        edge[1][1] <= this.gridHeight
      )
    ) {
      throw new Error(
        `Invalid edge ${JSON.stringify(edge)} for grid size ${this.gridWidth}x${
          this.gridHeight
        }`,
      )
    }
  }
}

export function edgeDirection(edge: Edge): Direction {
  const [fromPosition, toPosition] = edge
  const delta = [
    toPosition[0] - fromPosition[0],
    toPosition[1] - fromPosition[1],
  ]
  const direction: Direction | null =
    delta[0] === 1
      ? 'right'
      : delta[0] === -1
      ? 'left'
      : delta[1] === 1
      ? 'down'
      : delta[1] === -1
      ? 'up'
      : null
  if (direction === null) {
    throw new Error('invalid edge')
  }
  return direction
}

export function isValidDestination(
  gridHeight: number,
  gridWidth: number,
  toPosition: Position,
  outlawPositionKeys: string[] = [],
): boolean {
  return (
    toPosition[0] >= 0 &&
    toPosition[0] < gridWidth &&
    toPosition[1] >= 0 &&
    toPosition[1] < gridHeight &&
    outlawPositionKeys.indexOf(positionKey(toPosition)) === -1
  )
}

export function move(from: Position, direction: Direction): Position {
  const [gridX, gridY] = from
  if (direction === 'right') {
    return [gridX + 1, gridY]
  } else if (direction === 'down') {
    return [gridX, gridY + 1]
  } else if (direction === 'left') {
    return [gridX - 1, gridY]
  } else if (direction === 'up') {
    return [gridX, gridY - 1]
  }
  throw new Error('invalid direction')
}

export function positionKey(position: Position): string {
  return position.join(',')
}

export function keyPosition(key: string): Position {
  return key.split(',').map((value) => parseInt(value, 10)) as Position
}

export function edgeKey(edge: Edge): string {
  const sortedEdge = sortBy(edge, [0, 1])
  return [positionKey(sortedEdge[0]), positionKey(sortedEdge[1])].join('-')
}

export function keyEdge(key: string): Edge {
  return key.split('-').map(keyPosition) as Edge
}
