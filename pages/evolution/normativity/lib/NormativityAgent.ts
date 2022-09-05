import { max, min, random } from 'lodash'
import {
  BoardState,
  Direction,
  Position,
} from '../../components/Board/lib/BoardState'
import { Agent } from '../../lib/Agent'
import { BackpropablePerceptron } from '../../lib/perceptron/backpropable-genome'
import { prizePositionType } from './normativityFrames'

interface NormativityAgentArgs {
  perceptron?: BackpropablePerceptron
  gridHeight: number
  gridWidth: number
  id?: string
  moves?: number
  position?: Position
  points?: number
}

export class NormativityAgent extends Agent<
  BackpropablePerceptron,
  NormativityAgentArgs
> {
  static inputLabels = ['↱🟥', '→🟥', '↳🟥']
  static outputLabels = ['🟦↑', '🟦↓', '🟦→']

  public id: string
  public perceptron: BackpropablePerceptron
  public position: Position
  public moves: number = 0
  public points: number

  gridWidth: number
  gridHeight: number

  constructor(args: NormativityAgentArgs) {
    super(args)
    this.points = args.points ?? 0
  }

  initPerceptron(): BackpropablePerceptron {
    return new BackpropablePerceptron({
      inputSize: NormativityAgent.inputLabels.length,
      outputSize: NormativityAgent.outputLabels.length,
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

  move(boardState: BoardState): typeof this {
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

    return this.cloneWith({
      ...this.getArgs(),
      position: nextPosition,
      moves: nextMoves,
      id: this.id,
    })
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

  reward(): typeof this {
    return this.cloneWith({
      points: this.points + 1,
      position: this.initPosition(),
    })
  }
}
