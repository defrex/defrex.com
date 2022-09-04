import { Perceptron } from './perceptron'

/**
 * take the square of the difference between the actual and expected output
 * values, this is the "cost" of the output.
 *
 * Take the avg code over all examples, this is measure of badness of the network
 *
 * compute the slope of the cost function and step down the slope to minimize the cost
 */
export class BackpropablePerceptron extends Perceptron {}
