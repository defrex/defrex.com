import { Perceptron } from './perceptron'

export class BackpropablePerceptron extends Perceptron {
  backprop(
    inputs: number[],
    outputs: number[],
    learningRate?: number,
  ): BackpropablePerceptron {
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
}
