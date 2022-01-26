import {
  cloneDeep,
  random,
  sample,
  shuffle,
  uniq,
  uniqueId,
  without,
} from 'lodash'
import { Neuron } from 'synaptic'

type GeneId = string

interface GeneNode {
  type: 'input' | 'output' | 'hidden'
  id: GeneId
  bias: number
  squash?: Neuron.SquashingFunction
}

interface GeneEdge {
  id: GeneId
  fromNodeIndex: number
  toNodeIndex: number
  weight: number
}

type Phenome = Neuron[]

function randSquash(): Neuron.SquashingFunction | undefined {
  return sample([
    // Neuron.squash.HLIM,
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
  initOutputBias?: number
}

export class Genome {
  public inputSize: number
  public outputSize: number
  public learningRate: number
  public nodes: GeneNode[]
  public edges: GeneEdge[]
  public phenome: Phenome

  constructor(args: GenomeArgs = {}) {
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
            bias: 1,
            squash: Neuron.squash.IDENTITY,
          } as GeneNode),
      )
      const outputs = new Array(this.outputSize).fill(undefined).map(
        () =>
          ({
            type: 'output',
            id: uniqueId(),
            bias: 0,
            squash: Neuron.squash.LOGISTIC,
          } as GeneNode),
      )

      if (args.initOutputBias) {
        outputs[args.initOutputBias].bias = 1
      }

      let edges: GeneEdge[] = []
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

  private validate(): boolean {
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
      'removeNode' as const,
      'removeEdge' as const,
      'removeEdge' as const,
      'mutateEdgeWeight' as const,
      'mutateEdgeWeight' as const,
      'mutateEdgeWeight' as const,
      'mutateNodeBias' as const,
      'mutateNodeBias' as const,
      'mutateNodeBias' as const,
      'mutateNodeSquash' as const,
      'mutateNodeSquash' as const,
      'mutateNodeSquash' as const,
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

  private addNode(): Genome {
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

    let nextEdges = cloneDeep(this.edges).map((edge) => {
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

    const newEdge: GeneEdge = {
      id: uniqueId(),
      fromNodeIndex: newNodeIndex,
      toNodeIndex: oldToIndex,
      weight: 1,
    }
    nextEdges.push(newEdge)

    try {
      const nextGenome = new Genome({
        ...this.getArgs(),
        nodes: nextNodes,
        edges: nextEdges,
      })

      // if (!nextGenome.validate()) {
      //   console.log('addNode failed validation')
      //   console.log({
      //     this: this,
      //     nodes: nextNodes,
      //     edges: nextEdges,
      //     newNode,
      //     intermediatedEdge,
      //     newEdge,
      //   })
      // }

      return nextGenome
    } catch (error) {
      console.log({
        this: this,
        nodes: nextNodes,
        edges: nextEdges,
      })
      throw error
    }
  }

  private addEdge(): Genome {
    const newEdge: GeneEdge = {
      id: uniqueId(),
      fromNodeIndex: this.nodes.indexOf(
        sample([...this.inputNodes(), ...this.hiddenNodes()])!,
      ),
      toNodeIndex: this.nodes.indexOf(
        sample([...this.hiddenNodes(), ...this.outputNodes()])!,
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

  private removeNode(): Genome | null {
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

    const nextNodes = this.nodes.reduce((nodes, node) => {
      if (node.id !== removableNode.id) {
        nodes.push(cloneDeep(node))
      }
      return nodes
    }, [] as GeneNode[])

    try {
      const nextGenome = new Genome({
        ...this.getArgs(),
        nodes: nextNodes,
        edges: nextEdges,
      })

      // if (!nextGenome.validate()) {
      //   console.log('removeNode failed validation')
      //   console.log({
      //     prevNodes: this.nodes,
      //     prevEdges: this.edges,
      //     nodes: nextNodes,
      //     edges: nextEdges,
      //     removableNode,
      //     removableNodeIndex,
      //     toEdges,
      //     fromEdges,
      //     toNodeIndexes,
      //     fromNodeIndexes,
      //   })
      // }

      return nextGenome
    } catch (error) {
      console.log({
        removableNode,
        nodes: nextNodes,
        edges: nextEdges,
      })
      throw error
    }
  }

  private removeEdge(): Genome | null {
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
        if (edge.id === nextEdge.id) {
          return nextEdge
        } else {
          return edge
        }
      }),
    })
  }

  private mutateNodeBias(): Genome {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
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
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
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
