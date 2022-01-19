import { Net } from 'swirlnet'

export function getNetworkOutput(
  net: Net,
  inputs: number[],
  steps: number = 5,
) {
  // sets all node states to 0
  net.flush()
  // sets states of input nodes
  net.setInputs(inputs)

  // step network forward by propagating signals to downstream nodes
  net.step(steps)

  return net.getOutputs()
}
