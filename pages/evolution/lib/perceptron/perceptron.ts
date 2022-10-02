import {
  cloneDeep,
  random,
  range,
  sample,
  shuffle,
  uniq,
  uniqueId,
  without,
} from 'lodash'
import { Neuron } from 'synaptic'

export type Id = string

export interface Node {
  type: 'input' | 'output' | 'hidden'
  id: Id
  bias: number
  squash?: Neuron.SquashingFunction
}

export interface Edge {
  id: Id
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

function randSquash(): Neuron.SquashingFunction | undefined {
  return sample([
    // Neuron.squash.HLIM,
    Neuron.squash.LOGISTIC,
    Neuron.squash.ReLU,
    Neuron.squash.TANH,
    Neuron.squash.IDENTITY,
  ])
}

function mutateScalar(value: number, learningRate: number): number {
  const oldValuePortion = value * (1 - learningRate)
  const newValue = (value === 0 ? 1 : value) * random(-2, 2, true)
  const newValuePortion = newValue * learningRate
  const nextValue = oldValuePortion + newValuePortion
  return nextValue
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
    this.inputSize = args.inputSize ?? 2
    this.outputSize = args.outputSize ?? 4
    this.learningRate = args.learningRate ?? defaultLearningRate

    if (args.nodes && args.edges) {
      this.nodes = args.nodes
      this.edges = args.edges
    } else {
      const inputs = new Array(this.inputSize).fill(undefined).map(() => {
        const node: Node = {
          type: 'input',
          id: uniqueId(),
          bias: 0,
          squash: Neuron.squash.IDENTITY,
        }
        return node
      })
      const outputs = new Array(this.outputSize).fill(undefined).map(() => {
        const node: Node = {
          type: 'output',
          id: uniqueId(),
          bias: 0,
          squash: Neuron.squash.IDENTITY,
        }
        return node
      })

      if (args.initOutputBias) {
        outputs[args.initOutputBias].bias = 1
      }

      const edges: Edge[] = []
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

    this.network = this.nodes.map((node: Node): Neuron => {
      const neuron = new Neuron()
      if (node.squash) {
        neuron.squash = node.squash
      }
      neuron.bias = node.bias
      return neuron
    })

    for (const edge of this.edges) {
      this.network[edge.fromNodeIndex].project(
        this.network[edge.toNodeIndex],
        edge.weight,
      )
    }
  }

  getArgs(): Partial<PerceptronArgs> {
    return {
      inputSize: this.inputSize,
      outputSize: this.outputSize,
      nodes: this.nodes,
      edges: this.edges,
      learningRate: this.learningRate,
    }
  }

  inputNodes(): Node[] {
    return this.nodes.slice(0, this.inputSize)
  }

  hiddenNodes(): Node[] {
    return this.nodes.slice(this.inputSize, -this.outputSize)
  }

  outputNodes(): Node[] {
    return this.nodes.slice(-this.outputSize)
  }

  cloneWith(args: Partial<PerceptronArgs>): typeof this {
    const PerceptronClass = this.constructor as unknown as typeof Perceptron
    return new PerceptronClass({
      ...this.getArgs(),
      ...args,
    }) as typeof this
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
    const outputs = this.network.reduce<number[]>(
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
      [],
    )
    return outputs
  }

  backprop(
    inputs: number[],
    outputs: number[],
    learningRate?: number,
  ): Perceptron {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`)
    }
    if (outputs.length !== this.outputSize) {
      throw new Error(
        `Expected ${this.outputSize} outputs, got ${outputs.length}`,
      )
    }

    const newPerceptron = this.cloneWith({})
    newPerceptron.compute(inputs)
    const outputNeurons = newPerceptron.network.slice(-newPerceptron.outputSize)

    for (const output of outputs) {
      const outputNeuron = outputNeurons.shift()
      if (!outputNeuron) {
        throw new Error('expected output size does not match output size')
      }
      outputNeuron.propagate(learningRate ?? newPerceptron.learningRate, output)
    }

    return newPerceptron
  }

  // Mutations:
  mutate(): Perceptron {
    const mutation = sample([
      ...range(1).map(() => 'addNode' as const),
      ...range(1).map(() => 'addEdge' as const),
      ...range(2).map(() => 'removeNode' as const),
      ...range(2).map(() => 'removeEdge' as const),
      ...range(10).map(() => 'mutateEdgeWeight' as const),
      ...range(10).map(() => 'mutateNodeBias' as const),
      ...range(4).map(() => 'mutateNodeSquash' as const),
    ])!

    try {
      const nextGenome = this[mutation]()

      if (!nextGenome) {
        return this.mutate()
      } else {
        if (!nextGenome.validate()) {
          console.log(mutation, 'failed validation', {
            prevGenome: this,
            nextGenome,
          })
        }
        return nextGenome
      }
    } catch (error) {
      console.log({ mutation, genome: this })
      console.error(error)
      return this.mutate()
    }
  }

  private addNode(): Perceptron {
    const newNode = {
      type: 'hidden' as const,
      id: uniqueId(),
      bias: 1,
      squash: randSquash(),
    }
    const nextNodes = [
      ...this.inputNodes().map(cloneDeep),
      ...this.hiddenNodes().map(cloneDeep),
      newNode,
      ...this.outputNodes().map(cloneDeep),
    ]
    const newNodeIndex = nextNodes.indexOf(newNode)

    const nextEdges = cloneDeep(this.edges).map((edge) => {
      const newEdge = cloneDeep(edge)
      if (edge.fromNodeIndex >= newNodeIndex) {
        newEdge.fromNodeIndex += 1
      }
      if (edge.toNodeIndex >= newNodeIndex) {
        newEdge.toNodeIndex += 1
      }
      return newEdge
    })

    const intermediatedEdgeIndex = random(0, nextEdges.length - 1)
    const intermediatedEdge = nextEdges[intermediatedEdgeIndex]
    const oldToIndex = intermediatedEdge.toNodeIndex
    intermediatedEdge.toNodeIndex = newNodeIndex
    nextEdges[intermediatedEdgeIndex] = intermediatedEdge

    const newEdge: Edge = {
      id: uniqueId(),
      fromNodeIndex: newNodeIndex,
      toNodeIndex: oldToIndex,
      weight: 1,
    }
    nextEdges.push(newEdge)

    try {
      return new Perceptron({
        ...this.getArgs(),
        nodes: nextNodes,
        edges: nextEdges,
      })
    } catch (error) {
      console.log({
        this: this,
        nodes: nextNodes,
        edges: nextEdges,
      })
      throw error
    }
  }

  private addEdge(): Perceptron {
    const newEdge: Edge = {
      id: uniqueId(),
      fromNodeIndex: this.nodes.indexOf(
        sample([...this.inputNodes(), ...this.hiddenNodes()])!,
      ),
      toNodeIndex: this.nodes.indexOf(
        sample([...this.hiddenNodes(), ...this.outputNodes()])!,
      ),
      weight: 1,
    }
    const nextGenome = new Perceptron({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: cloneDeep([...this.edges, newEdge]),
    })
    return nextGenome
  }

  private removeNode(): Perceptron | null {
    const removableNode = sample(this.hiddenNodes())
    if (!removableNode) {
      return null
    }

    const removableNodeIndex = this.nodes.indexOf(removableNode)
    const toEdges = this.edges.filter(
      (edge) => edge.toNodeIndex === removableNodeIndex,
    )
    const fromEdges = this.edges.filter(
      (edge) => edge.fromNodeIndex === removableNodeIndex,
    )

    let nextEdges = cloneDeep(without(this.edges, ...toEdges, ...fromEdges))

    const fromNodeIndexes = uniq(toEdges.map((edge) => edge.fromNodeIndex))
    const toNodeIndexes = uniq(fromEdges.map((edge) => edge.toNodeIndex))
    for (const toIndex of toNodeIndexes) {
      for (const fromIndex of fromNodeIndexes) {
        nextEdges.push({
          id: uniqueId(),
          fromNodeIndex: fromIndex,
          toNodeIndex: toIndex,
          weight: 1,
        })
      }
    }

    // Adjust indexes after removed node
    nextEdges = nextEdges.map((edge) => {
      if (edge.fromNodeIndex > removableNodeIndex) {
        edge.fromNodeIndex -= 1
      }
      if (edge.toNodeIndex > removableNodeIndex) {
        edge.toNodeIndex -= 1
      }
      return edge
    })

    const nextNodes = this.nodes.reduce<Node[]>((nodes, node) => {
      if (node.id !== removableNode.id) {
        nodes.push(cloneDeep(node))
      }
      return nodes
    }, [])

    try {
      return this.cloneWith({
        nodes: nextNodes,
        edges: nextEdges,
      })
    } catch (error) {
      console.log({
        removableNode,
        nodes: nextNodes,
        edges: nextEdges,
      })
      throw error
    }
  }

  private removeEdge(): Perceptron | null {
    const removableEdge = shuffle(this.edges).find((candidateEdge) => {
      const fromEdges = this.edges.filter(
        (edge) =>
          edge.fromNodeIndex === candidateEdge.fromNodeIndex &&
          edge.toNodeIndex !== candidateEdge.toNodeIndex,
      ).length
      const toEdges = this.edges.filter(
        (edge) =>
          edge.toNodeIndex === candidateEdge.toNodeIndex &&
          edge.fromNodeIndex !== candidateEdge.fromNodeIndex,
      ).length
      return fromEdges > 1 && toEdges > 1
    })
    if (!removableEdge) {
      return null
    } else {
      const nextGenome = new Perceptron({
        ...this.getArgs(),
        nodes: cloneDeep(this.nodes),
        edges: cloneDeep(without(this.edges, removableEdge)),
      })
      return nextGenome
    }
  }

  private mutateEdgeWeight(): Perceptron {
    const nextEdges = cloneDeep(this.edges)
    const nextEdge = { ...sample(nextEdges)! }
    nextEdge.weight = mutateScalar(nextEdge.weight, this.learningRate)
    return new Perceptron({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: nextEdges.map((edge) => {
        if (edge.id === nextEdge.id) {
          return nextEdge
        } else {
          return edge
        }
      }),
    })
  }

  private mutateNodeBias(): Perceptron {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
    nextNode.bias = mutateScalar(nextNode.bias, this.learningRate)
    return new Perceptron({
      ...this.getArgs(),
      nodes: nextNodes.map((node) => {
        if (node.id === nextNode.id) {
          return nextNode
        } else {
          return node
        }
      }),
      edges: cloneDeep(this.edges),
    })
  }

  private mutateNodeSquash(): Perceptron {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
    nextNode.squash = randSquash()
    return new Perceptron({
      ...this.getArgs(),
      nodes: nextNodes.map((node) => {
        if (node.id === nextNode.id) {
          return nextNode
        } else {
          return node
        }
      }),
      edges: cloneDeep(this.edges),
    })
  }
}
