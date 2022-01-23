import { clone, isArray, orderBy, reverse, shuffle, sortBy } from 'lodash'

export type Direction = 'up' | 'right' | 'down' | 'left'
export type Position = [number, number]
export type Edge = [Position, Position]

export class BoardState {
  public gridWidth: number
  public gridHeight: number
  public cellSize: number
  public cursorPosition?: Position
  public exitPosition?: Position
  public selectedPath?: Position[]
  public killPositions?: Position[]
  public agentPositions?: Position[]
  private edgeStates: { [key: string]: boolean } = {}

  constructor(
    gridWidth: number,
    gridHeight: number,
    cellSize: number,
    edgeStates?: { [key: string]: boolean },
    cursorPosition?: Position,
    exitPosition?: Position,
    selectedPath?: Position[],
    killPositions?: Position[],
    agentPositions?: Position[],
  ) {
    this.gridWidth = gridWidth
    this.gridHeight = gridHeight
    this.cellSize = cellSize
    this.cursorPosition = cursorPosition
    this.exitPosition = exitPosition
    this.selectedPath = selectedPath
    this.killPositions = killPositions
    this.agentPositions = agentPositions

    if (edgeStates) {
      this.edgeStates = edgeStates
    } else {
      this.edgeStates = this.getEmptyGridState()
    }
  }

  private getEmptyGridState() {
    const edgeStates: { [key: string]: boolean } = {}
    for (let gridX = 0; gridX < this.gridWidth; gridX++) {
      for (let gridY = 0; gridY < this.gridHeight; gridY++) {
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
          edgeStates[edgeKey(edge)] = false
        }
      }
    }
    return edgeStates
  }

  reset(): BoardState {
    return new BoardState(this.gridWidth, this.gridHeight, this.cellSize)
  }

  generateMaze(): BoardState {
    const maxSteps = this.gridWidth * this.gridHeight * 10
    let currentStep = 0
    let position: Position = [0, 0]
    let endPosition: Position | null = null
    let nextBoardState = new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.getEmptyGridState(),
      this.cursorPosition,
      this.exitPosition,
      this.selectedPath,
    )

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
      ] as Direction[]).find((direction: Direction) => {
        const destination = move(position, direction)
        return (
          this.isOnBoard(destination) &&
          positionHistory.indexOf(positionKey(destination)) === -1
        )
      })

      if (!direction) {
        // Search for a position with few open edges
        for (const prevPositionKey of reverse(positionHistory)) {
          const prevPosition = keyPosition(prevPositionKey)
          const edgesEnabled = nextBoardState.getEdgesEnabled(prevPosition)
          const openEdges = Object.values(edgesEnabled).filter(
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
      nextBoardState = nextBoardState.setEdgeEnabled(
        [position, nextPosition],
        false,
      )

      if (positionHistory.indexOf(positionKey(position)) === -1) {
        positionHistory.push(positionKey(position))
      }

      position = nextPosition
    }

    nextBoardState = nextBoardState.setExitPosition(
      endPosition ||
        keyPosition(positionHistory[positionHistory.length - 1]) ||
        orderBy(
          positionHistory.map(keyPosition),
          (position) => position[0] * position[1],
          'desc',
        )[0],
    )

    return nextBoardState
  }

  setExitPosition(exitPosition: Position): BoardState {
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.edgeStates,
      this.cursorPosition,
      exitPosition,
      this.selectedPath,
      this.killPositions,
      this.agentPositions,
    )
  }

  setCursorPosition(cursorPosition: Position): BoardState {
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.edgeStates,
      cursorPosition,
      this.exitPosition,
      this.selectedPath,
      this.killPositions,
      this.agentPositions,
    )
  }

  setSelectedPath(selectedPath: Position[]): BoardState {
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.edgeStates,
      this.cursorPosition,
      this.exitPosition,
      selectedPath,
      this.killPositions,
      this.agentPositions,
    )
  }

  setKillPositions(killPositions: Position[]): BoardState {
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.edgeStates,
      this.cursorPosition,
      this.exitPosition,
      this.selectedPath,
      killPositions,
      this.agentPositions,
    )
  }

  setAgentPositions(agentPositions: Position[]): BoardState {
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      this.edgeStates,
      this.cursorPosition,
      this.exitPosition,
      this.selectedPath,
      this.killPositions,
      agentPositions,
    )
  }

  setEdgeEnabled(edge: Edge, enabled?: boolean): BoardState {
    this.validateEdge(edge)
    enabled = enabled !== undefined ? enabled : !this.getEdgeEnabled(edge)
    const edgeStates = clone(this.edgeStates)
    edgeStates[edgeKey(edge)] = enabled
    return new BoardState(
      this.gridWidth,
      this.gridHeight,
      this.cellSize,
      edgeStates,
      this.cursorPosition,
      this.exitPosition,
      this.selectedPath,
    )
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

  getEdgesEnabled(node: Position): Record<Direction, boolean> {
    const edgesEnabled: Record<Direction, boolean> = {
      up: node[1] === 0 ? true : false,
      left: node[0] === 0 ? true : false,
      down: node[1] === this.gridHeight ? true : false,
      right: node[0] === this.gridWidth ? true : false,
    }
    for (const [[fromPosition, toPosition], enabled] of this.getEdgeStates()) {
      if (fromPosition[0] === node[0] && fromPosition[1] === node[1]) {
        edgesEnabled[edgeDirection([fromPosition, toPosition])] = enabled
      }
      if (toPosition[0] === node[0] && toPosition[1] === node[1]) {
        edgesEnabled[edgeDirection([toPosition, fromPosition])] = enabled
      }
    }
    return edgesEnabled
  }

  isValidMove(edge: Edge): boolean {
    const edgesEnabled = this.getEdgesEnabled(edge[0])
    const direction = edgeDirection(edge)
    const toIsOnBoard = this.isOnBoard(edge[1])
    return !edgesEnabled[direction] && toIsOnBoard
  }

  isOnBoard(position: Position): boolean {
    return (
      position[0] >= 0 &&
      position[0] <= this.gridWidth - 1 &&
      position[1] >= 0 &&
      position[1] <= this.gridHeight - 1
    )
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

export function distance(
  currentPosition: Position,
  exitPosition: Position,
): number {
  const [x, y] = currentPosition
  const [gx, gy] = exitPosition
  return Math.sqrt((x - gx) ** 2 + (y - gy) ** 2)
}

export function edgeDirection([fromPosition, toPosition]: Edge): Direction {
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
