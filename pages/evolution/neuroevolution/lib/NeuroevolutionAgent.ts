import { max, min, random, sample, uniq } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../../components/Board/lib/BoardState'
import { Agent } from '../../lib/Agent'
import { Perceptron } from '../../lib/perceptron/perceptron'

interface AgentArgs {
  direction?: Direction
  perceptron?: Perceptron
  gridHeight: number
  gridWidth: number
  id?: string
  lineage?: number
  moves?: number
  position?: Position
  threatType?: string
}

export class NeuroevolutionAgent extends Agent<Perceptron, AgentArgs> {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦↑', '🟦↓', '🟦→']

  public id: string
  public perceptron: Perceptron
  public position: Position
  public moves: number
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

  initPerceptron(): Perceptron {
    return new Perceptron({
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
      ...(args ?? {}),
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

  move(
    boardState: BoardState,
    normalizeAgents: NeuroevolutionAgent[],
  ): { agent: NeuroevolutionAgent; normalizeAgents: NeuroevolutionAgent[] }
  move(boardState: BoardState): { agent: NeuroevolutionAgent }
  move(
    boardState: BoardState,
    normalizeAgents?: NeuroevolutionAgent[],
  ): { agent: NeuroevolutionAgent; normalizeAgents?: NeuroevolutionAgent[] } {
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

    return {
      agent: this.cloneWith({
        position: nextPosition,
        moves: this.moves + 1,
      }),
      normalizeAgents: normalizeAgents
        ? this.normalize(inputs, outputs, normalizeAgents)
        : undefined,
    }
  }

  normalize(
    inputs: number[],
    outputs: number[],
    agents: NeuroevolutionAgent[],
  ): NeuroevolutionAgent[] {
    const maxPoints = max(uniq([...agents, this]).map((agent) => agent.moves))!
    const percent = this.moves / maxPoints
    const learningRate = 0.75 * percent

    return agents.map((agent) =>
      agent.moves < this.moves
        ? agent.learn(inputs, outputs, learningRate)
        : agent,
    )
  }

  learn(
    inputs: number[],
    outputs: number[],
    learningRate: number,
  ): typeof this {
    return this.cloneWith({
      perceptron: this.perceptron.backprop(inputs, outputs, learningRate),
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
      .filter(([_x, y]) => y === currentY) // on the current row
      .map(([x, _y]) => x - currentX) // distance from current position (- == left, + == right)

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
