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

export class Genome {
  public inputSize = 3
  public outputSize = 4
  public nodes: GeneNode[]
  public edges: GeneEdge[]
  public phenome: Phenome

  constructor(geneData?: { nodes: GeneNode[]; edges: GeneEdge[] }) {
    if (geneData) {
      this.nodes = cloneDeep(geneData.nodes)
      this.edges = cloneDeep(geneData.edges)
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
            toNodeIndex: outputIndex,
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

    return new Genome({ nodes: nextNodes, edges: nextEdges })
  }

  private addConnection(): Genome {
    return new Genome({
      nodes: cloneDeep(this.nodes),
      edges: cloneDeep([
        ...this.edges,
        {
          fromNodeIndex: this.nodes.indexOf(
            sample(this.nodes.slice(0, -this.outputSize))!,
          ),
          toNodeIndex: this.nodes.indexOf(
            sample(this.nodes.slice(this.inputSize))!,
          ),
          weight: 1,
        },
      ]),
    })
  }

  private removeConnection(): Genome | null {
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
      return new Genome({
        nodes: cloneDeep(this.nodes),
        edges: cloneDeep(without(this.edges, removableEdge)),
      })
    }
  }

  private mutateConnectionWeight(): Genome {
    const nextEdges = cloneDeep(this.edges)
    const nextConnection = { ...sample(nextEdges)! }
    nextConnection.weight *= random(0, 2)
    return new Genome({
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
    nextNode.bias *= random(0, 2)
    return new Genome({
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

  // crossover(lover: Agent): Agent {
  //   const [parent1, parent2] = [this, lover]
  //   if (!parent1.fitness || !parent2.fitness) {
  //     throw new Error('Cannot breed agents without fitness')
  //   }

  //   const parent1Size = parent1.genome.nodes.length
  //   const parent2Size = parent2.genome.nodes.length
  //   const childSize =
  //     parent1.fitness > parent2.fitness
  //       ? parent1Size
  //       : parent1.fitness < parent2.fitness
  //       ? parent2Size
  //       : sample([parent1Size, parent2Size])!

  //   const childNodes = new Array(childSize).fill(undefined).map((_, index) => {
  //     if (index < childSize - this.outputSize) {
  //       // Input or Hidden
  //       if (index > parent1Size - this.outputSize) {
  //         // Parent 1 is out of Hidden nodes, take Parent 2
  //         return parent2.genome.nodes[index]
  //       } else if (index > parent2Size - this.outputSize) {
  //         // Parent 2 is out of Hidden nodes, take Parent 1
  //         return parent1.genome.nodes[index]
  //       } else {
  //         return sample([
  //           parent1.genome.nodes[index],
  //           parent2.genome.nodes[index],
  //         ])!
  //       }
  //     } else {
  //       // Output
  //       return sample([
  //         parent1.genome.nodes[index],
  //         parent2.genome.nodes[index],
  //       ])!
  //     }
  //   })

  //   const childConnectionSize =
  //     parent1.fitness > parent2.fitness
  //       ? parent1.genome.connections.length
  //       : parent1.fitness < parent2.fitness
  //       ? parent2.genome.connections.length
  //       : sample([
  //           parent1.genome.connections.length,
  //           parent2.genome.connections.length,
  //         ])!

  //   const childConnections = new Array(childConnectionSize)
  //     .fill(undefined)
  //     .map((_, index) => {
  //       const parent = sample([parent1, parent2])!
  //       const connection = { ...parent.genome.connections[index] }

  //       if (parent.genome.nodes.length !== childSize) {
  //         const difference = childSize - parent.genome.nodes.length
  //         if (
  //           connection.fromNodeIndex >=
  //           parent.genome.nodes.length - this.outputSize
  //         ) {
  //           connection.fromNodeIndex = sum([
  //             connection.fromNodeIndex,
  //             difference,
  //           ])
  //         }
  //         if (
  //           connection.toNodeIndex >=
  //           parent.genome.nodes.length - this.outputSize
  //         ) {
  //           connection.toNodeIndex = sum([connection.toNodeIndex, difference])
  //         }
  //       }

  //       return connection
  //     })

  //   return new Agent({
  //     nodes: childNodes,
  //     connections: childConnections,
  //   })
  // }
}
