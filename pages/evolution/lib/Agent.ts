import { uniqueId } from 'lodash'
import { Layer, Network } from 'synaptic'
import {
  Direction,
  distance,
  EdgeSet,
  gridHeight,
  gridWidth,
  move,
  Position,
} from './EdgeSet'

// type GeneNodeId = string

// interface GeneNode {
//   type: 'input' | 'output' | 'hidden'
//   id: GeneNodeId
//   bias: number
//   squash:
//     | typeof Neuron.squash.HLIM
//     | typeof Neuron.squash.LOGISTIC
//     | typeof Neuron.squash.IDENTITY
//     | typeof Neuron.squash.ReLU
//     | typeof Neuron.squash.TANH
// }

// interface InputGeneNode extends GeneNode {
//   type: 'input'
//   squash: typeof Neuron.squash.IDENTITY
// }

// interface HiddenGeneNode extends GeneNode {
//   type: 'hidden'
// }

// interface OutputGeneNode extends GeneNode {
//   type: 'output'
// }

// interface GeneEdge {
//   fromNodeId: GeneNodeId
//   toNodeId: GeneNodeId
//   weight: number
//   gate?: GeneNodeId
// }

// type Genome = {
//   inputs: InputGeneNode[]
//   nodes: HiddenGeneNode[]
//   edges: GeneEdge[]
//   outputs: OutputGeneNode[]
// }

// function randInputGene(): InputGeneNode {
//   return {
//     type: 'input',
//     id: uniqueId(),
//     bias: random(0, 10),
//     squash: Neuron.squash.IDENTITY,
//   }
// }

export class Agent {
  public id = uniqueId()
  private network: Network
  private inputLayer: Layer
  private outputLayer: Layer
  private hiddenLayers: Layer[]

  constructor() {
    this.inputLayer = new Layer(6)
    this.hiddenLayers = []
    this.outputLayer = new Layer(4)

    let prevLayer = this.inputLayer
    for (const hiddenLayer of this.hiddenLayers) {
      prevLayer.project(hiddenLayer)
      prevLayer = hiddenLayer
    }

    prevLayer.project(this.outputLayer)

    this.network = new Network({
      input: this.inputLayer,
      hidden: this.hiddenLayers,
      output: this.outputLayer,
    })
  }

  move(currentPosition: Position, edges: EdgeSet): Position {
    const edgeMap = edges.edgeMapForNode(currentPosition)
    const inputs = [
      currentPosition[0],
      currentPosition[1],
      edgeMap.up ? 1 : 0,
      edgeMap.down ? 1 : 0,
      edgeMap.left ? 1 : 0,
      edgeMap.right ? 1 : 0,
    ]

    const outputs = this.network.activate(inputs)

    const maxIndex = outputs.indexOf(Math.max(...outputs))
    const direction: Direction | null =
      maxIndex === 0
        ? 'up'
        : maxIndex === 1
        ? 'down'
        : maxIndex === 2
        ? 'right'
        : maxIndex === 3
        ? 'left'
        : null

    if (!direction) {
      return currentPosition
    }

    const newPosition = move(currentPosition, direction)
    if (edges.isValidMove([currentPosition, newPosition])) {
      return newPosition
    } else {
      return currentPosition
    }
  }

  findPath(
    startPosition: Position,
    endPosition: Position,
    edges: EdgeSet,
    maxSteps: number = gridWidth * gridHeight * 2,
  ): Position[] {
    const path: Position[] = [startPosition]

    let steps = maxSteps
    while (true) {
      steps--
      if (steps <= 0) {
        break
      }
      const position = path[path.length - 1]
      const nextPosition = this.move(position, edges)
      path.push(nextPosition)

      if (distance(nextPosition, endPosition) === 0) {
        break
      }
    }

    return path
  }

  fitness(path: Position[], endPosition: Position): number {
    return distance(path[path.length - 1], endPosition)
  }
}
