import { flatten, random, uniqueId } from 'lodash'
import { Neuron } from 'synaptic'
import { Edge, Node } from './perceptron'

interface GetNeuronTopologyArgs {
  inputSize: number
  outputSize: number
  hiddenLayerSizes: number[]
  squash?: Neuron.SquashingFunction
}

export function getNeuronTopology({
  inputSize,
  outputSize,
  hiddenLayerSizes,
  squash,
}: GetNeuronTopologyArgs): { nodes: Node[]; edges: Edge[] } {
  const edges: Edge[] = []

  const inputNodes = new Array(inputSize).fill(undefined).map(() => {
    const node: Node = {
      type: 'input',
      id: uniqueId(),
      bias: 0,
      squash,
    }
    return node
  })

  const outputNodes = new Array(outputSize).fill(undefined).map(() => {
    const node: Node = {
      type: 'output',
      id: uniqueId(),
      bias: random(-1, 1, true),
      squash,
    }
    return node
  })

  const hiddenNodes = hiddenLayerSizes.map((hiddenLayerSize) =>
    new Array(hiddenLayerSize).fill(undefined).map(() => {
      const node: Node = {
        type: 'hidden',
        id: uniqueId(),
        bias: random(-1, 1, true),
        squash,
      }
      return node
    }),
  )

  const layers = [inputNodes, ...hiddenNodes, outputNodes]
  const nodes = flatten(layers)

  for (const [layerIndex, layer] of layers.slice(1).entries()) {
    for (const node of layer) {
      for (const prevNode of layers[layerIndex]) {
        edges.push({
          id: uniqueId(),
          fromNodeIndex: nodes.indexOf(prevNode),
          toNodeIndex: nodes.indexOf(node),
          weight: random(-1, 1, true),
        })
      }
    }
  }

  return { nodes, edges }
}
