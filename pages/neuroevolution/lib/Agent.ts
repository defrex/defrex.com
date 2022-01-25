import { random, uniqueId } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../components/Board/lib/BoardState'
import { Genome } from './Genome'

interface AgentArgs {
  genome?: Genome
  gridHeight: number
  gridWidth: number
  id?: string
  lineage?: number
  moves?: number
  position?: Position
}

export class Agent {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦→', '🟦↓', '🟦↑']

  public id: string
  public genome: Genome
  public position: Position
  public moves: number = 0
  public lineage: number = 0
  private gridWidth: number
  private gridHeight: number

  constructor(args: AgentArgs) {
    this.gridWidth = args.gridWidth
    this.gridHeight = args.gridHeight

    if (args.genome) {
      this.genome = args.genome
    } else {
      this.genome = new Genome({
        inputSize: Agent.inputLabels.length,
        outputSize: Agent.outputLabels.length,
      })
    }

    if (args.position) {
      this.position = args.position
    } else {
      this.position = [0, random(0, this.gridHeight - 1)]
    }

    if (args.id) {
      this.id = args.id
    } else {
      this.id = uniqueId()
    }

    if (args.moves) {
      this.moves = args.moves
    }

    if (args.lineage) {
      this.lineage = args.lineage
    }
  }

  private getArgs(): AgentArgs {
    return {
      genome: this.genome,
      gridHeight: this.gridHeight,
      gridWidth: this.gridWidth,
      id: this.id,
      lineage: this.lineage,
      moves: this.moves,
      position: this.position,
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

    const outputDirections: Direction[] = ['up', 'down', 'right']
    const direction = outputDirections[outputs.indexOf(Math.max(...outputs))]

    const nextPosition = boardState.calculateMove(this.position, direction)

    let nextMoves = this.moves
    if (direction === 'right') {
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
      .getPositions('kill')
      .filter(([x, y]) => y === currentY)
      .reduce(
        (distance, [x, y]) =>
          Math.min(
            distance,
            x > currentX ? x - currentX : x + this.gridWidth - currentX,
          ),
        this.gridWidth,
      )

    return threatDistance
  }
}
