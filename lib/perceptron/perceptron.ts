import { random, uniq, uniqueId } from 'lodash'
import { Neuron } from 'synaptic'

export type GeneId = string

export interface Node {
  type: 'input' | 'output' | 'hidden'
  id: GeneId
  bias: number
  squash?: Neuron.SquashingFunction
}

export interface Edge {
  id: GeneId
  fromNodeIndex: number
  toNodeIndex: number
  weight: number
}

export function getSquashName(squash?: Neuron.SquashingFunction): string {
  if (squash === Neuron.squash.LOGISTIC) {
    return 'Sigmoid'
  } else if (squash === Neuron.squash.ReLU) {
    return 'ReLU'
  } else if (squash === Neuron.squash.TANH) {
    return 'TANH'
  } else if (squash === Neuron.squash.HLIM) {
    return 'HLIM'
  } else if (squash === Neuron.squash.IDENTITY) {
    return 'Identity'
  } else {
    return 'Unknown'
  }
}

export const defaultLearningRate = 0.5

export interface PerceptronArgs {
  nodes?: Node[]
  edges?: Edge[]
  inputSize?: number
  outputSize?: number
  learningRate?: number
  initOutputBias?: number
}

export class Perceptron {
  public inputSize: number
  public outputSize: number
  public learningRate: number
  public nodes: Node[]
  public edges: Edge[]
  public network: Neuron[]

  constructor(args: PerceptronArgs = {}) {
    this.inputSize = args.inputSize || 2
    this.outputSize = args.outputSize || 4
    this.learningRate = args.learningRate || defaultLearningRate

    if (args.nodes && args.edges) {
      this.nodes = args.nodes
      this.edges = args.edges
    } else {
      const inputs = new Array(this.inputSize).fill(undefined).map(
        () =>
          ({
            type: 'input',
            id: uniqueId(),
            bias: 0,
            squash: Neuron.squash.IDENTITY,
          } as Node),
      )
      const outputs = new Array(this.outputSize).fill(undefined).map(
        () =>
          ({
            type: 'output',
            id: uniqueId(),
            bias: 0,
            squash: Neuron.squash.IDENTITY,
          } as Node),
      )

      if (args.initOutputBias) {
        outputs[args.initOutputBias].bias = 1
      }

      let edges: Edge[] = []
      for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
        for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
          edges.push({
            id: uniqueId(),
            fromNodeIndex: inputIndex,
            toNodeIndex: inputs.length + outputIndex,
            // weight: 1,
            weight: random(-1, 1),
          })
        }
      }

      this.nodes = [...inputs, ...outputs]
      this.edges = edges
    }

    this.network = this.nodes.map((geneNode: Node): Neuron => {
      const neuron = new Neuron()
      if (geneNode.squash) {
        neuron.squash = geneNode.squash
      }
      neuron.bias = geneNode.bias
      return neuron
    })
    this.edges.forEach((geneEdge: Edge) => {
      this.network[geneEdge.fromNodeIndex].project(
        this.network[geneEdge.toNodeIndex],
        geneEdge.weight,
      )
    })
  }

  validate(): boolean {
    const edgeIds = this.edges.map((edge) => edge.id)
    if (edgeIds.length !== uniq(edgeIds).length) {
      console.error(`Duplicate edge ids found [${edgeIds.join(', ')}]`, this)
      return false
    }

    for (const edge of this.edges) {
      if (
        edge.fromNodeIndex > this.nodes.length - this.outputSize ||
        edge.fromNodeIndex < 0
      ) {
        console.error(
          `Edge fromNodeIndex ${edge.fromNodeIndex} is out of bounds`,
          this,
        )
        return false
      }
      if (
        edge.toNodeIndex < this.inputSize ||
        edge.toNodeIndex > this.nodes.length - 1
      ) {
        console.error(
          `Edge toNodeIndex ${edge.toNodeIndex} is out of bounds`,
          this,
        )
        return false
      }
    }

    for (let inputIndex = 0; inputIndex < this.inputSize; inputIndex++) {
      const edges = this.edges.filter(
        (edge) => edge.fromNodeIndex === inputIndex,
      )
      if (edges.length === 0) {
        console.error(
          `Input node ${inputIndex} has no edges connected to it`,
          this,
        )
        return false
      }
    }

    for (let outputNumber = 0; outputNumber < this.outputSize; outputNumber++) {
      const outputIndex = this.nodes.length - 1 - outputNumber
      const edges = this.edges.filter(
        (edge) => edge.toNodeIndex === outputIndex,
      )
      if (edges.length === 0) {
        console.error(
          `Output node ${outputIndex} has no edges connected to it`,
          this,
        )
        return false
      }
    }

    return true
  }

  compute(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`)
    }
    const outputs = this.network.reduce(
      (outputs: number[], neuron: Neuron, index: number) => {
        if (index < this.inputSize) {
          neuron.activate(inputs[index])
        } else if (index >= this.network.length - this.outputSize) {
          outputs.push(neuron.activate())
        } else {
          neuron.activate()
        }
        return outputs
      },
      [] as number[],
    )
    return outputs
  }
}
