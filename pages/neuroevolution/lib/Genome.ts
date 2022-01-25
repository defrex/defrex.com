import { cloneDeep, random, sample, shuffle, uniqueId, without } from 'lodash'
import { Neuron } from 'synaptic'

type GeneNodeId = string

interface GeneNode {
  type: 'input' | 'output' | 'hidden'
  id: GeneNodeId
  bias: number
  squash?: Neuron.SquashingFunction
}

interface GeneEdge {
  fromNodeIndex: number
  toNodeIndex: number
  weight: number
}

type Phenome = Neuron[]

function randSquash(): Neuron.SquashingFunction | undefined {
  return sample([
    Neuron.squash.HLIM,
    Neuron.squash.LOGISTIC,
    Neuron.squash.ReLU,
    Neuron.squash.TANH,
  ])
}

function mutateScalar(value: number, learningRate: number): number {
  const adjuster = random(-2, 2, true)
  const oldValuePortion = value * (1 - learningRate)
  const newValue = value * adjuster
  const newValuePortion = newValue * learningRate
  const nextValue = oldValuePortion + newValuePortion
  return nextValue
}

export const defaultLearningRate = 0.5

interface GenomeArgs {
  nodes?: GeneNode[]
  edges?: GeneEdge[]
  inputSize?: number
  outputSize?: number
  learningRate?: number
}

export class Genome {
  public inputSize: number
  public outputSize: number
  public learningRate: number
  public nodes: GeneNode[]
  public edges: GeneEdge[]
  public phenome: Phenome

  constructor(options: GenomeArgs = {}) {
    this.inputSize = options.inputSize || 2
    this.outputSize = options.outputSize || 4
    this.learningRate = options.learningRate || defaultLearningRate

    if (options.nodes && options.edges) {
      this.nodes = cloneDeep(options.nodes)
      this.edges = cloneDeep(options.edges)
    } else {
      const inputs = new Array(this.inputSize).fill(undefined).map(
        () =>
          ({
            type: 'input',
            id: uniqueId(),
            bias: random(-1, 1),
            squash: Neuron.squash.IDENTITY,
          } as GeneNode),
      )
      const outputs = new Array(this.outputSize).fill(undefined).map(
        () =>
          ({
            type: 'output',
            id: uniqueId(),
            bias: random(-1, 1),
            squash: randSquash(),
          } as GeneNode),
      )

      let edges: GeneEdge[] = []
      for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
        for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
          edges.push({
            fromNodeIndex: inputIndex,
            toNodeIndex: inputs.length + outputIndex,
            weight: random(-1, 1),
          })
        }
      }

      this.nodes = [...inputs, ...outputs]
      this.edges = edges
    }

    this.phenome = this.nodes.map((geneNode: GeneNode): Neuron => {
      const neuron = new Neuron()
      if (geneNode.squash) {
        neuron.squash = geneNode.squash
      }
      neuron.bias = geneNode.bias
      return neuron
    })
    this.edges.forEach((geneEdge: GeneEdge) => {
      this.phenome[geneEdge.fromNodeIndex].project(
        this.phenome[geneEdge.toNodeIndex],
        geneEdge.weight,
      )
    })
  }

  private getArgs(): GenomeArgs {
    return {
      inputSize: this.inputSize,
      outputSize: this.outputSize,
      nodes: this.nodes,
      edges: this.edges,
    }
  }

  private inputNodes(): GeneNode[] {
    return this.nodes.slice(0, this.inputSize)
  }

  private hiddenNodes(): GeneNode[] {
    return this.nodes.slice(this.inputSize, -this.outputSize)
  }

  private outputNodes(): GeneNode[] {
    return this.nodes.slice(-this.outputSize)
  }

  compute(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`)
    }
    const outputs = this.phenome.reduce(
      (outputs: number[], neuron: Neuron, index: number) => {
        if (index < this.inputSize) {
          neuron.activate(inputs[index])
        } else if (index >= this.phenome.length - this.outputSize) {
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

  mutate(): Genome {
    const mutation = sample([
      'addNode' as const,
      'addEdge' as const,
      'removeNode' as const,
      'removeEdge' as const,
      'mutateEdgeWeight' as const,
      'mutateNodeBias' as const,
      'mutateNodeSquash' as const,
    ])!

    const nextGenome = this[mutation]()
    if (!nextGenome) {
      return this.mutate()
    } else {
      return nextGenome
    }
  }

  private addNode(): Genome {
    const newNode = {
      type: 'hidden' as const,
      id: uniqueId(),
      bias: 1,
      squash: randSquash(),
    }
    let nextNodes: GeneNode[] = cloneDeep(this.nodes)
    nextNodes = [
      ...this.inputNodes(),
      ...this.hiddenNodes(),
      newNode,
      ...this.outputNodes(),
    ]

    const newNodeIndex = nextNodes.indexOf(newNode)
    const intermediatedEdgeIndex = random(0, this.edges.length - 1)
    const intermediatedEdge = cloneDeep(this.edges[intermediatedEdgeIndex])
    const oldToIndex = intermediatedEdge.toNodeIndex
    intermediatedEdge.toNodeIndex = newNodeIndex
    const newEdge: GeneEdge = {
      fromNodeIndex: newNodeIndex,
      toNodeIndex: oldToIndex,
      weight: 1,
    }
    const adjustedEdges = this.edges.map((edge) => {
      const newEdge = cloneDeep(edge)
      if (edge.fromNodeIndex >= newNodeIndex) {
        newEdge.fromNodeIndex += 1
      }
      if (edge.toNodeIndex >= newNodeIndex) {
        newEdge.toNodeIndex += 1
      }
      return newEdge
    })
    const nextEdges: GeneEdge[] = [
      ...adjustedEdges.slice(0, intermediatedEdgeIndex),
      intermediatedEdge,
      newEdge,
      ...adjustedEdges.slice(intermediatedEdgeIndex + 1),
    ]

    return new Genome({
      ...this.getArgs(),
      nodes: nextNodes,
      edges: nextEdges,
    })
  }

  private removeNode(): Genome | null {
    const removableNode = sample(this.hiddenNodes())!
    const removableNodeIndex = this.nodes.indexOf(removableNode)
    const toEdges = this.edges.filter(
      (edge) => edge.toNodeIndex === removableNodeIndex,
    )
    const fromEdges = this.edges.filter(
      (edge) => edge.fromNodeIndex === removableNodeIndex,
    )

    const fromNodeIndexes = toEdges.map((edge) => edge.fromNodeIndex)
    const toNodeIndexes = fromEdges.map((edge) => edge.toNodeIndex)

    const nextEdges = this.edges
      .filter(
        (edge) =>
          toEdges.indexOf(edge) === -1 && fromEdges.indexOf(edge) === -1,
      )
      .map(cloneDeep)
      .map((edge) => {
        if (edge.fromNodeIndex >= removableNodeIndex) {
          edge.fromNodeIndex -= 1
        }
        if (edge.toNodeIndex >= removableNodeIndex) {
          edge.toNodeIndex -= 1
        }
        return edge
      })

    for (const toIndex of toNodeIndexes) {
      for (const fromIndex of fromNodeIndexes) {
        nextEdges.push({
          fromNodeIndex: fromIndex,
          toNodeIndex: toIndex,
          weight: 1,
        })
      }
    }

    if (!removableNode) {
      return null
    } else {
      const nextGenome = new Genome({
        ...this.getArgs(),
        nodes: cloneDeep(without(this.nodes, removableNode)),
        edges: nextEdges,
      })
      return nextGenome
    }
  }

  private addEdge(): Genome {
    const newEdge = {
      fromNodeIndex: this.nodes.indexOf(
        sample(this.nodes.slice(0, -this.outputSize))!,
      ),
      toNodeIndex: this.nodes.indexOf(
        sample(this.nodes.slice(this.inputSize))!,
      ),
      weight: 1,
    }
    const nextGenome = new Genome({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: cloneDeep([...this.edges, newEdge]),
    })
    return nextGenome
  }

  private removeEdge(): Genome | null {
    const removableEdge = shuffle(this.edges).find((edge) => {
      const fromEdges = this.edges.filter(
        (edge) => edge.fromNodeIndex === edge.fromNodeIndex,
      ).length
      const toEdges = this.edges.filter(
        (edge) => edge.toNodeIndex === edge.toNodeIndex,
      ).length
      return fromEdges > 1 && toEdges > 1
    })
    if (!removableEdge) {
      return null
    } else {
      const nextGenome = new Genome({
        ...this.getArgs(),
        nodes: cloneDeep(this.nodes),
        edges: cloneDeep(without(this.edges, removableEdge)),
      })
      return nextGenome
    }
  }

  private mutateEdgeWeight(): Genome {
    const nextEdges = cloneDeep(this.edges)
    const nextEdge = { ...sample(nextEdges)! }
    nextEdge.weight = mutateScalar(nextEdge.weight, this.learningRate)
    return new Genome({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: nextEdges.map((edge) => {
        if (
          edge.fromNodeIndex === nextEdge.fromNodeIndex &&
          edge.toNodeIndex === nextEdge.toNodeIndex
        ) {
          return nextEdge
        } else {
          return edge
        }
      }),
    })
  }

  private mutateNodeBias(): Genome {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = { ...sample(nextNodes.slice(this.inputSize))! }
    nextNode.bias = mutateScalar(nextNode.bias, this.learningRate)
    return new Genome({
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

  private mutateNodeSquash(): Genome {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = { ...sample(nextNodes)! }
    nextNode.squash = randSquash()
    return new Genome({
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
