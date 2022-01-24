import { random, uniqueId } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../components/Board/lib/BoardState'
import { Genome } from './Genome'

export class Agent {
  public id: string
  public genome: Genome
  public position: Position
  public moves: number = 0
  private gridWidth: number
  private gridHeight: number

  constructor(
    gridWidth: number,
    gridHeight: number,
    genome?: Genome,
    position?: Position,
    moves?: number,
    id?: string,
  ) {
    this.gridWidth = gridWidth
    this.gridHeight = gridHeight

    if (genome) {
      this.genome = genome
    } else {
      this.genome = new Genome({
        inputSize: 5,
        outputSize: 3,
      })
    }

    if (position) {
      this.position = position
    } else {
      this.position = [0, random(0, this.gridHeight - 1)]
    }

    if (id) {
      this.id = id
    } else {
      this.id = uniqueId()
    }

    if (moves) {
      this.moves = moves
    }
  }

  resetHistory(): Agent {
    return new Agent(this.gridWidth, this.gridHeight, this.genome)
  }

  mutate(keepPosition = false): Agent {
    return new Agent(
      this.gridWidth,
      this.gridHeight,
      this.genome.mutate(),
      keepPosition ? this.position : undefined,
    )
  }

  move(boardState: BoardState): Agent {
    const inputs = [
      this.position[0],
      this.position[1],
      this.threatDistance(boardState, -1),
      this.threatDistance(boardState, 0),
      this.threatDistance(boardState, 1),
    ]

    const outputs = this.genome.compute(inputs)

    const outputDirections: Direction[] = ['up', 'down', 'right']
    const direction = outputDirections[outputs.indexOf(Math.max(...outputs))]

    const nextPosition = boardState.calculateMove(this.position, direction)

    let nextMoves = this.moves
    if (direction === 'right') {
      nextMoves++
    }

    return new Agent(
      this.gridWidth,
      this.gridHeight,
      this.genome,
      nextPosition,
      nextMoves,
      this.id,
    )
  }

  private threatDistance(boardState: BoardState, offset: number): number {
    let [currentX, currentY] = this.position
    currentY += offset

    if (currentY < 0) {
      currentY = this.gridHeight + currentY
    } else if (currentY >= this.gridHeight) {
      currentY = currentY % this.gridHeight
    }

    const threatDistance = (boardState.killPositions || [])
      .filter(([x, y]) => x > currentX && y === currentY)
      .reduce((distance, [x, y]) => Math.min(distance, x - currentX), Infinity)

    return threatDistance === Infinity ? -1 : this.gridWidth - threatDistance
  }
}
