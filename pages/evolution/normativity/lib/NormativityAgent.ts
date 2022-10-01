import { max, min, random, uniq } from 'lodash'
import { Neuron } from 'synaptic'
import {
  BoardState,
  Direction,
  Position,
} from '../../components/Board/lib/BoardState'
import { Agent } from '../../lib/Agent'
import { getNeuronTopology } from '../../lib/perceptron/get-neuron-topology'
import { Perceptron } from '../../lib/perceptron/perceptron'
import { prizePositionType } from './normativityFrames'

interface NormativityAgentArgs {
  perceptron?: Perceptron
  gridHeight: number
  gridWidth: number
  id?: string
  moves?: number
  position?: Position
  points?: number
}

const defaultTopology = getNeuronTopology({
  inputSize: 3,
  outputSize: 3,
  hiddenLayerSizes: [5, 5, 5],
  squash: Neuron.squash.LOGISTIC,
})

export class NormativityAgent extends Agent<Perceptron, NormativityAgentArgs> {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦↑', '🟦↓', '🟦→']

  public id: string
  public perceptron: Perceptron
  public position: Position
  public moves: number = 0
  public points: number

  gridWidth: number
  gridHeight: number

  constructor(args: NormativityAgentArgs) {
    super(args)
    this.points = args.points ?? 0
  }

  initPerceptron(): Perceptron {
    console.log('new perceptron')
    return new Perceptron({
      inputSize: NormativityAgent.inputLabels.length,
      outputSize: NormativityAgent.outputLabels.length,
      ...defaultTopology,
    })
  }

  initPosition(): Position {
    return [0, random(0, this.gridHeight - 1)]
  }

  getArgs(): NormativityAgentArgs {
    return {
      perceptron: this.perceptron,
      gridHeight: this.gridHeight,
      gridWidth: this.gridWidth,
      id: this.id,
      moves: this.moves,
      position: this.position,
      points: this.points,
    }
  }

  reward(): typeof this {
    return this.cloneWith({
      points: this.points + 1,
      position: this.initPosition(),
    })
  }

  move(boardState: BoardState, agents: NormativityAgent[]): NormativityAgent[] {
    const inputs = [
      this.prizeDistance(boardState, -1),
      this.prizeDistance(boardState, 0),
      this.prizeDistance(boardState, 1),
    ]

    if (inputs.length !== NormativityAgent.inputLabels.length) {
      throw new Error('Unexpected input length')
    }

    const outputs = this.perceptron.compute(inputs)

    if (outputs.length !== NormativityAgent.outputLabels.length) {
      throw new Error('Unexpected output length')
    }

    const outputDirections: Direction[] = ['up', 'down', 'right']
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
      direction || 'right',
    )

    let nextMoves = this.moves
    if (direction === 'right') {
      nextMoves++
    }

    return this.normalize(
      inputs,
      outputs,
      agents.map((agent) =>
        agent.id === this.id
          ? this.cloneWith({
              ...this.getArgs(),
              position: nextPosition,
              moves: nextMoves,
              id: this.id,
            })
          : agent,
      ),
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

  normalize(
    inputs: number[],
    outputs: number[],
    agents: NormativityAgent[],
  ): NormativityAgent[] {
    const maxPoints = max(uniq([...agents, this]).map((agent) => agent.points))!
    const percent = this.points / maxPoints
    const learningRate = 0.75 * percent

    return agents.map((agent) =>
      agent.points < this.points
        ? agent.learn(inputs, outputs, learningRate)
        : agent,
    )
  }

  private prizeDistance(boardState: BoardState, offset: number): number {
    let [currentX, currentY] = this.position
    currentY += offset

    if (currentY < 0) {
      currentY = this.gridHeight + currentY
    } else if (currentY >= this.gridHeight) {
      currentY = currentY % this.gridHeight
    }
    let prizeDistances = boardState
      .getPositions(prizePositionType)
      .filter(([x, y]) => y === currentY) // on the current row
      .map(([x, y]) => x - currentX) // distance from current position (- == left, + == right)

    prizeDistances = prizeDistances.map((distance) =>
      distance < 0 ? this.gridWidth + distance : distance,
    )

    return min(prizeDistances)!
  }
}
