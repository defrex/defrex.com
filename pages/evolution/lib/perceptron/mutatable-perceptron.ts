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
import { Edge, Node, Perceptron, PerceptronArgs } from './perceptron'

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

export class MutatablePerceptron extends Perceptron {
  mutate(): MutatablePerceptron {
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

  private addNode(): MutatablePerceptron {
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

    const newEdge: Edge = {
      id: uniqueId(),
      fromNodeIndex: newNodeIndex,
      toNodeIndex: oldToIndex,
      weight: 1,
    }
    nextEdges.push(newEdge)

    try {
      return new MutatablePerceptron({
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

  private addEdge(): MutatablePerceptron {
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
    const nextGenome = new MutatablePerceptron({
      ...this.getArgs(),
      nodes: cloneDeep(this.nodes),
      edges: cloneDeep([...this.edges, newEdge]),
    })
    return nextGenome
  }

  private removeNode(): MutatablePerceptron | null {
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
    }, [] as Node[])

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

  private removeEdge(): MutatablePerceptron | null {
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
      const nextGenome = new MutatablePerceptron({
        ...this.getArgs(),
        nodes: cloneDeep(this.nodes),
        edges: cloneDeep(without(this.edges, removableEdge)),
      })
      return nextGenome
    }
  }

  private mutateEdgeWeight(): MutatablePerceptron {
    const nextEdges = cloneDeep(this.edges)
    const nextEdge = { ...sample(nextEdges)! }
    nextEdge.weight = mutateScalar(nextEdge.weight, this.learningRate)
    return new MutatablePerceptron({
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

  private mutateNodeBias(): MutatablePerceptron {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
    nextNode.bias = mutateScalar(nextNode.bias, this.learningRate)
    return new MutatablePerceptron({
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

  private mutateNodeSquash(): MutatablePerceptron {
    const nextNodes = cloneDeep(this.nodes)
    const nextNode = {
      ...sample([...this.hiddenNodes(), ...this.outputNodes()])!,
    }
    nextNode.squash = randSquash()
    return new MutatablePerceptron({
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
