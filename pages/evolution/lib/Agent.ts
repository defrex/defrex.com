import { random, uniqueId } from 'lodash'
import {
  BoardState,
  Direction,
  move,
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
      this.genome = new Genome()
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

  mutate(keepPosition = false): Agent {
    return new Agent(
      this.gridWidth,
      this.gridHeight,
      this.genome.mutate(),
      keepPosition ? this.position : undefined,
    )
  }

  move(boardState: BoardState): Agent {
    const threatDistance = (boardState.killPositions || [])
      .filter(([x, y]) => x > this.position[0] && y === this.position[1])
      .reduce(
        (distance, [x, y]) => Math.min(distance, x - this.position[0]),
        Infinity,
      )

    const inputs = [
      this.position[1],
      threatDistance === Infinity ? -1 : this.gridWidth - threatDistance,
    ]

    const outputs = this.genome.compute(inputs)

    const outputDirections: Direction[] = ['up', 'right', 'down', 'left']
    const direction = outputDirections[outputs.indexOf(Math.max(...outputs))]

    const newPosition = move(this.position, direction)
    const nextPosition = boardState.isValidMove([this.position, newPosition])
      ? newPosition
      : this.position

    return new Agent(
      this.gridWidth,
      this.gridHeight,
      this.genome,
      nextPosition,
      this.moves + 1,
      this.id,
    )
  }
}
