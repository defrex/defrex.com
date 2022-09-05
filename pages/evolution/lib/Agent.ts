import { assign, uniqueId } from 'lodash'
import { BoardState, Position } from '../components/Board/lib/BoardState'
import { Perceptron } from './perceptron/perceptron'

interface AgentArgs<TPerceptron extends Perceptron> {
  perceptron?: TPerceptron
  gridHeight: number
  gridWidth: number
  id?: string
  moves?: number
  position?: Position
}

class NotImplimentedError extends Error {
  constructor() {
    super('Not implemented')
  }
}

export class Agent<
  TPerceptron extends Perceptron,
  TAgentArgs extends AgentArgs<TPerceptron>,
> {
  public id: string
  public perceptron: TPerceptron
  public position: Position
  public moves: number = 0

  gridWidth: number
  gridHeight: number

  constructor(args: TAgentArgs) {
    assign(this, args)

    this.perceptron ||= this.initPerceptron()
    this.position ||= this.initPosition()
    this.id ||= uniqueId()
  }

  initPerceptron(): TPerceptron {
    throw new NotImplimentedError()
  }

  initPosition(): Position {
    throw new NotImplimentedError()
  }

  getArgs(): TAgentArgs {
    throw new NotImplimentedError()
  }

  move(boardState: BoardState): typeof this {
    throw new NotImplimentedError()
  }

  cloneWith(args: Partial<TAgentArgs>): typeof this {
    const AgentClass = this.constructor as unknown as typeof Agent<
      TPerceptron,
      TAgentArgs
    >
    return new AgentClass({
      ...this.getArgs(),
      ...args,
    }) as typeof this
  }

  setPosition(position: Position): typeof this {
    return this.cloneWith({ position } as Partial<TAgentArgs>)
  }

  resetHistory(): typeof this {
    return this.cloneWith({
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      perceptron: this.perceptron,
    } as Partial<TAgentArgs>)
  }
}
