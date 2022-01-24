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
  const oldValuePortion = value * (1 - learningRate)
  const newValuePortion = value * random(-2, 2) * learningRate
  return oldValuePortion + newValuePortion
}

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
    this.learningRate = options.learningRate || 0.25

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
      'addConnection' as const,
      'removeConnection' as const,
      'mutateConnectionWeight' as const,
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
      ...nextNodes.slice(0, -this.outputSize),
      newNode,
      ...nextNodes.slice(-this.outputSize),
    ]

    const newNodeIndex = nextNodes.indexOf(newNode)
    const intermediatedConnectionIndex = random(0, this.edges.length - 1)
    const intermediatedConnection = cloneDeep(
      this.edges[intermediatedConnectionIndex],
    )
    const oldToIndex = intermediatedConnection.toNodeIndex
    intermediatedConnection.toNodeIndex = newNodeIndex
    const newConnection: GeneEdge = {
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
      ...adjustedEdges.slice(0, intermediatedConnectionIndex),
      intermediatedConnection,
      newConnection,
      ...adjustedEdges.slice(intermediatedConnectionIndex + 1),
    ]

    return new Genome({
      ...this.getArgs(),
      nodes: nextNodes,
      edges: nextEdges,
    })
  }

  private addConnection(): Genome {
    const newConnection = {
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
      edges: cloneDeep([...this.edges, newConnection]),
    })
    console.log('newConnection', {
      fromType: this.nodes[newConnection.fromNodeIndex].type,
      toType: this.nodes[newConnection.toNodeIndex].type,
      nextGenome,
    })

    return nextGenome
  }

  private removeConnection(): Genome | null {
    const removableConnection = shuffle(this.edges).find((edge) => {
      const fromEdges = this.edges.filter(
        (edge) => edge.fromNodeIndex === edge.fromNodeIndex,
      ).length
      const toEdges = this.edges.filter(
        (edge) => edge.toNodeIndex === edge.toNodeIndex,
      ).length
      return fromEdges > 1 && toEdges > 1
    })
    if (!removableConnection) {
      return null
    } else {
      const nextGenome = new Genome({
        ...this.getArgs(),
        nodes: cloneDeep(this.nodes),
        edges: cloneDeep(without(this.edges, removableConnection)),
      })
      console.log('removeConnection', {
        fromType: this.nodes[removableConnection.fromNodeIndex].type,
        toType: this.nodes[removableConnection.toNodeIndex].type,
        nextGenome,
      })
      return nextGenome
    }
  }

  private mutateConnectionWeight(): Genome {
    const nextEdges = cloneDeep(this.edges)
    const nextConnection = { ...sample(nextEdges)! }
    nextConnection.weight = mutateScalar(
      nextConnection.weight,
      this.learningRate,
    )
    return new Genome({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: nextEdges.map((edge) => {
        if (
          edge.fromNodeIndex === nextConnection.fromNodeIndex &&
          edge.toNodeIndex === nextConnection.toNodeIndex
        ) {
          return nextConnection
        } else {
          return edge
        }
      }),
    })
  }

  private mutateNodeBias(): Genome {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = { ...sample(nextNodes)! }
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
