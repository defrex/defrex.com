import { assign, min, random, sample, uniqueId } from 'lodash'
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
  static outputLabels = ['🟦↑', '🟦↓', '🟦→']

  public id: string
  public genome: Genome
  public position: Position
  public moves: number = 0
  public lineage: number = 0
  public direction: Direction = 'right'
  public threatType: string

  private gridWidth: number
  private gridHeight: number

  constructor({ ...args }: AgentArgs) {
    assign(this, args)

    this.genome ||= new Genome({
      inputSize: Agent.inputLabels.length,
      outputSize: Agent.outputLabels.length,
      initOutputBias: 2, // ensure they move forward
    })

    this.direction ||= sample(['left', 'right'])!

    this.threatType ||= this.direction === 'right' ? 'left' : 'right'

    this.position ||= [
      this.direction === 'left' ? this.gridWidth - 1 : 0,
      random(0, this.gridHeight - 1),
    ]

    this.id ||= uniqueId()
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

  mutate(args?: AgentArgs): Agent {
    return new Agent({
      ...this.getArgs(),
      ...(args || {}),
      genome: this.genome.mutate(),
      moves: 0,
      lineage: this.lineage + 1,
      direction: this.direction,
      position: undefined,
    })
  }

  fight(otherAgent: Agent): boolean {
    const isConflict =
      this.position[0] === otherAgent.position[0] &&
      this.position[1] === otherAgent.position[1]

    return isConflict
    // if (!isConflict) {
    //   return false
    // } else {
    //   return this.moves > otherAgent.moves
    // }
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
    // console.log(
    //   this.direction,
    //   'moves',
    //   direction,
    //   inputs,
    //   outputs,
    //   // this.genome.outputNodes().map((n) => n.bias),
    //   this.genome,
    // )

    const nextPosition = boardState.calculateMove(this.position, direction)

    let nextMoves = this.moves
    if (direction === this.direction) {
      nextMoves++
    }

    return new Agent({
      ...this.getArgs(),
      position: nextPosition,
      moves: nextMoves,
      id: this.id,
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
    let threatDistances = boardState
      .getPositions(this.threatType) // kill positions
      .filter(([x, y]) => y === currentY) // on the current row
      .map(([x, y]) => x - currentX) // distance from current position (- == left, + == right)

    if (this.direction === 'left') {
      threatDistances = threatDistances.map((d) => -d)
    }

    threatDistances = threatDistances.map((distance) =>
      distance < 0 ? this.gridWidth + distance : distance,
    )

    const threatDistance = min(threatDistances)!

    return threatDistance
  }
}
