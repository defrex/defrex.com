import { assign, random, sample, uniqueId } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../components/Board/lib/BoardState'
import { Genome } from './Genome'

interface AgentArgs {
  direction?: Direction
  genome?: Genome
  gridHeight: number
  gridWidth: number
  id?: string
  lineage?: number
  moves?: number
  position?: Position
  threatType?: string
}

export class Agent {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦→', '🟦↓', '🟦↑']

  public id: string
  public genome: Genome
  public position: Position
  public moves: number = 0
  public lineage: number = 0
  public direction: Direction = 'right'
  public threatType: string = 'kill'

  private gridWidth: number
  private gridHeight: number

  constructor({ genome, position, id, direction, ...args }: AgentArgs) {
    assign(this, args)

    if (genome) {
      this.genome = genome
    } else {
      this.genome = new Genome({
        inputSize: Agent.inputLabels.length,
        outputSize: Agent.outputLabels.length,
        initOutputOn: 2, // ensure they move forward
      })
    }

    if (direction) {
      this.direction = direction
    } else {
      // this.direction = 'left'
      this.direction = sample(['left', 'right'])!
    }

    if (position) {
      this.position = position
    } else {
      this.position = [
        this.direction === 'left' ? 0 : this.gridWidth - 1,
        random(0, this.gridHeight - 1),
      ]
    }

    if (id) {
      this.id = id
    } else {
      this.id = uniqueId()
    }
  }

  private getArgs(): AgentArgs {
    return {
      direction: this.direction,
      genome: this.genome,
      gridHeight: this.gridHeight,
      gridWidth: this.gridWidth,
      id: this.id,
      lineage: this.lineage,
      moves: this.moves,
      position: this.position,
      threatType: this.threatType,
    }
  }

  resetHistory(): Agent {
    return new Agent({
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      genome: this.genome,
    })
  }

  mutate(keepPosition = false): Agent {
    return new Agent({
      ...this.getArgs(),
      genome: this.genome.mutate(),
      position: keepPosition ? this.position : undefined,
      moves: 0,
      lineage: this.lineage + 1,
    })
  }

  move(boardState: BoardState): Agent {
    const inputs = [
      this.threatDistance(boardState, -1),
      this.threatDistance(boardState, 0),
      this.threatDistance(boardState, 1),
    ]

    if (inputs.length !== Agent.inputLabels.length) {
      throw new Error('Unexpected input length')
    }

    const outputs = this.genome.compute(inputs)

    if (outputs.length !== Agent.outputLabels.length) {
      throw new Error('Unexpected output length')
    }

    const outputDirections: Direction[] = ['up', 'down', this.direction]
    const direction = outputDirections[outputs.indexOf(Math.max(...outputs))]

    const nextPosition = boardState.calculateMove(this.position, direction)

    let nextMoves = this.moves
    if (direction === this.direction) {
      nextMoves++
    }

    return new Agent({
      ...this.getArgs(),
      position: nextPosition,
      moves: nextMoves,
    })
  }

  private threatDistance(boardState: BoardState, offset: number): number {
    let [currentX, currentY] = this.position
    currentY += offset

    if (currentY < 0) {
      currentY = this.gridHeight + currentY
    } else if (currentY >= this.gridHeight) {
      currentY = currentY % this.gridHeight
    }

    const threatDistance = boardState
      .getPositions(this.threatType)
      .filter(([x, y]) => y === currentY)
      .reduce(
        (distance, [x, y]) =>
          Math.min(
            distance,
            x > currentX ? x - currentX : x + this.gridWidth - currentX,
          ),
        this.gridWidth,
      )

    if (this.direction === 'right') {
      return threatDistance
    } else if (this.direction === 'left') {
      return this.gridWidth - threatDistance
    } else {
      throw new Error(`Unexpected direction ${this.direction}`)
    }
  }
}
