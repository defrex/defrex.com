import { max, min, random, sample } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../../components/Board/lib/BoardState'
import { Agent } from '../../lib/Agent'
import { MutatablePerceptron } from '../../lib/perceptron/mutatable-perceptron'

interface AgentArgs {
  direction?: Direction
  perceptron?: MutatablePerceptron
  gridHeight: number
  gridWidth: number
  id?: string
  lineage?: number
  moves?: number
  position?: Position
  threatType?: string
}

export class NeuroevolutionAgent extends Agent<MutatablePerceptron, AgentArgs> {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦↑', '🟦↓', '🟦→']

  public id: string
  public perceptron: MutatablePerceptron
  public position: Position
  public moves: number = 0
  public lineage: number = 0
  public direction: Direction = 'right'
  public threatType: string

  gridWidth: number
  gridHeight: number

  constructor(args: AgentArgs) {
    super(args)
    this.direction ||= sample(['left', 'right'])!
    this.threatType ||= this.direction === 'right' ? 'left' : 'right'
  }

  initPerceptron(): MutatablePerceptron {
    return new MutatablePerceptron({
      inputSize: NeuroevolutionAgent.inputLabels.length,
      outputSize: NeuroevolutionAgent.outputLabels.length,
      initOutputBias: 2, // ensure they move forward
    })
  }

  initPosition(): Position {
    return [
      this.direction === 'left' ? this.gridWidth - 1 : 0,
      random(0, this.gridHeight - 1),
    ]
  }

  getArgs(): AgentArgs {
    return {
      direction: this.direction,
      perceptron: this.perceptron,
      gridHeight: this.gridHeight,
      gridWidth: this.gridWidth,
      id: this.id,
      lineage: this.lineage,
      moves: this.moves,
      position: this.position,
      threatType: this.threatType,
    }
  }

  mutate(args?: AgentArgs): NeuroevolutionAgent {
    return new NeuroevolutionAgent({
      ...this.getArgs(),
      ...(args || {}),
      perceptron: this.perceptron.mutate(),
      moves: 0,
      lineage: this.lineage + 1,
      direction: this.direction,
      position: undefined,
      id: undefined,
    })
  }

  fight(otherAgent: NeuroevolutionAgent): boolean {
    const isConflict =
      this.position[0] === otherAgent.position[0] &&
      this.position[1] === otherAgent.position[1]

    return isConflict
  }

  move(boardState: BoardState): typeof this {
    const inputs = [
      this.threatDistance(boardState, -1),
      this.threatDistance(boardState, 0),
      this.threatDistance(boardState, 1),
    ]

    if (inputs.length !== NeuroevolutionAgent.inputLabels.length) {
      throw new Error('Unexpected input length')
    }

    const outputs = this.perceptron.compute(inputs)

    if (outputs.length !== NeuroevolutionAgent.outputLabels.length) {
      throw new Error('Unexpected output length')
    }

    const outputDirections: Direction[] = ['up', 'down', this.direction]
    const direction = outputDirections[outputs.indexOf(max(outputs)!)]

    if (direction === undefined) {
      console.warn('agent direction undefined', {
        agent: this,
        inputs,
        outputs,
        outputDirections,
        maxOutput: max(outputs),
        maxOutputIndex: outputs.indexOf(max(outputs)!),
      })
    }

    const nextPosition = boardState.calculateMove(
      this.position,
      direction || this.direction,
    )

    let nextMoves = this.moves
    if (direction === this.direction) {
      nextMoves++
    }

    return this.cloneWith({
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
