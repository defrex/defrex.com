import { cloneDeep, random, sample, uniqueId } from 'lodash'
import { Neuron } from 'synaptic'
import {
  Direction,
  distance,
  EdgeSet,
  gridHeight,
  gridWidth,
  move,
  Position,
} from './EdgeSet'

type GeneNodeId = string

interface GeneNode {
  type: 'input' | 'output' | 'hidden'
  id: GeneNodeId
  bias: number
  squash?: Neuron.SquashingFunction
}

interface InputGeneNode extends GeneNode {
  type: 'input'
  squash: typeof Neuron.squash.IDENTITY
}

interface HiddenGeneNode extends GeneNode {
  type: 'hidden'
}

interface OutputGeneNode extends GeneNode {
  type: 'output'
}

interface GeneEdge {
  fromNodeId: GeneNodeId
  toNodeId: GeneNodeId
  weight: number
  // gate?: GeneNodeId
}

type Genome = {
  inputs: InputGeneNode[]
  nodes: HiddenGeneNode[]
  edges: GeneEdge[]
  outputs: OutputGeneNode[]
}

interface Phenome {
  inputNeurons: Neuron[]
  hiddenNeurons: Neuron[]
  outputNeurons: Neuron[]
}

function randSquash(): Neuron.SquashingFunction | undefined {
  return sample([
    Neuron.squash.HLIM,
    Neuron.squash.LOGISTIC,
    Neuron.squash.ReLU,
    Neuron.squash.TANH,
  ])
}

function randInputNodeGene(): InputGeneNode {
  return {
    type: 'input',
    id: uniqueId(),
    bias: random(0, 10),
    squash: Neuron.squash.IDENTITY,
  }
}

function randHiddenNodeGene(): HiddenGeneNode {
  return {
    type: 'hidden',
    id: uniqueId(),
    bias: random(0, 10),
    squash: randSquash(),
  }
}

function randOutputNodeGene(): OutputGeneNode {
  return {
    type: 'output',
    id: uniqueId(),
    bias: random(0, 10),
    squash: randSquash(),
  }
}

function neuronFromGeneNode(geneNode: GeneNode): Neuron {
  const neuron = new Neuron()
  if (geneNode.squash) {
    neuron.squash = geneNode.squash
  }
  neuron.bias = geneNode.bias
  return neuron
}

export class Agent {
  private genome: Genome
  private phenome: Phenome

  public id = uniqueId()
  public path?: Position[]
  public fitness?: number

  constructor(genome?: Genome) {
    if (genome) {
      this.genome = genome
    } else {
      const inputs = [randInputNodeGene(), randInputNodeGene()]
      const outputs = [
        randOutputNodeGene(),
        randOutputNodeGene(),
        randOutputNodeGene(),
        randOutputNodeGene(),
      ]
      let edges: GeneEdge[] = []
      for (let i = 0; i < inputs.length; i++) {
        for (let j = 0; j < outputs.length; j++) {
          edges.push({
            fromNodeId: inputs[i].id,
            toNodeId: outputs[j].id,
            weight: random(-10, 10),
          })
        }
      }
      this.genome = {
        inputs,
        nodes: [],
        edges,
        outputs,
      }
    }
    this.genomeToPhenome()
  }

  private genomeToPhenome(): void {
    const neuronsById: Record<GeneNodeId, Neuron> = {}
    const phenome: Phenome = {
      inputNeurons: [],
      hiddenNeurons: [],
      outputNeurons: [],
    }
    for (const node of this.genome.inputs) {
      const neuron = neuronFromGeneNode(node)
      neuronsById[node.id] = neuron
      phenome.inputNeurons.push(neuron)
    }
    for (const node of this.genome.nodes) {
      const neuron = neuronFromGeneNode(node)
      neuronsById[node.id] = neuron
      phenome.hiddenNeurons.push(neuron)
    }
    for (const node of this.genome.outputs) {
      const neuron = neuronFromGeneNode(node)
      neuronsById[node.id] = neuron
      phenome.outputNeurons.push(neuron)
    }

    for (const edgeGene of this.genome.edges) {
      neuronsById[edgeGene.fromNodeId].project(
        neuronsById[edgeGene.toNodeId],
        edgeGene.weight,
      )
    }
    this.phenome = phenome
  }

  private activatePhoenome(inputs: number[]): number[] {
    for (const i in this.phenome.inputNeurons) {
      this.phenome.inputNeurons[i].activate(inputs[i])
    }
    for (const i in this.phenome.hiddenNeurons) {
      this.phenome.hiddenNeurons[i].activate()
    }
    return this.phenome.outputNeurons.map((neuron) => neuron.activate())
  }

  breed(lover: Agent): Agent {
    // TODO: implement crossover

    return new Agent()
  }

  private move(currentPosition: Position, edges: EdgeSet): Position {
    const edgeMap = edges.edgeMapForNode(currentPosition)
    const inputs = [
      currentPosition[0],
      currentPosition[1],
      edgeMap.up ? 1 : 0,
      edgeMap.down ? 1 : 0,
      edgeMap.left ? 1 : 0,
      edgeMap.right ? 1 : 0,
    ]

    const outputs = this.activatePhoenome(inputs)

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
  ): void {
    const path: Position[] = [startPosition]

    let steps = maxSteps
    while (true) {
      steps--
      if (steps <= 0) {
        break
      }
      const nextPosition = this.move(path[path.length - 1], edges)
      path.push(nextPosition)

      if (distance(nextPosition, endPosition) === 0) {
        break
      }
    }

    this.path = path
    this.fitness = distance(path[path.length - 1], endPosition)
  }
}
