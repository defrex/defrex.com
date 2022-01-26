import { isArray, sortBy } from 'lodash'

export type Direction = 'up' | 'right' | 'down' | 'left'
export type Position = [number, number]
export type Edge = [Position, Position]

interface BoardStateArgs {
  gridWidth: number
  gridHeight: number
  cellSize: number
  positions?: ColorPosition[]
}

interface ColorPosition {
  color: string
  position: Position
  type?: string
}

export class BoardState {
  public gridWidth: number
  public gridHeight: number
  public cellSize: number
  public positions: ColorPosition[]

  constructor(args: BoardStateArgs) {
    this.gridWidth = args.gridWidth
    this.gridHeight = args.gridHeight
    this.cellSize = args.cellSize
    this.positions = args.positions || []
  }

  private getArgs(): BoardStateArgs {
    return {
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellSize: this.cellSize,
    }
  }

  reset(): BoardState {
    return new BoardState({
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      cellSize: this.cellSize,
    })
  }

  setGrid(gridWidth: number, gridHeight: number, cellSize: number): BoardState {
    return new BoardState({
      ...this.getArgs(),
      gridWidth: gridWidth,
      gridHeight: gridHeight,
      cellSize: cellSize,
    })
  }

  setPositions(positions: ColorPosition[]): BoardState {
    return new BoardState({
      ...this.getArgs(),
      positions,
    })
  }

  appendPositions(positions: ColorPosition[]): BoardState {
    return new BoardState({
      ...this.getArgs(),
      positions: [...this.positions, ...positions],
    })
  }

  getPositions(positionType: string): Position[] {
    return (
      this.positions
        .filter(({ type }) => type === positionType)
        .map(({ position }) => position) || []
    )
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

  calculateMove(fromPosition: Position, direction: Direction): Position {
    const [fromX, fromY] = fromPosition
    const toPosition: Position | null =
      direction === 'right'
        ? [fromX + 1, fromY]
        : direction === 'down'
        ? [fromX, fromY + 1]
        : direction === 'left'
        ? [fromX - 1, fromY]
        : direction === 'up'
        ? [fromX, fromY - 1]
        : null

    if (!toPosition) {
      throw new Error('invalid direction')
    }

    let [toX, toY] = toPosition
    ;[toX, toY] = [toX % this.gridWidth, toY % this.gridHeight]
    ;[toX, toY] = [
      toX < 0 ? this.gridWidth + toX : toX,
      toY < 0 ? this.gridHeight + toY : toY,
    ]
    return [toX, toY]
  }
}

export function positionsEqual(
  position1: Position,
  position2: Position,
): boolean {
  return position1[0] === position2[0] && position1[1] === position2[1]
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
