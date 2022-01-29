import Image from 'next/image'
import { Stack } from '../../../../components/Stack'
import { Text } from '../../../../components/Text'
import { colors } from '../../../../lib/colors'
import { spacing } from '../../../../lib/spacing'
import { defaultLearningRate } from '../../lib/Genome'
import initialNeuralNetworkImage from './initialNeuralNet.png'
interface HowItWorksProps {}

export default function HowItWorks(_props: HowItWorksProps) {
  return (
    <Stack spacing={spacing.large}>
      <Text value='How It Works' size={16} />

      <Text
        size={14}
        element='p'
        color={colors.black30}
        value={`
          Each colored square (🟦) is a Neural Network, and each red square (🟥) is
          a killer! If a 🟦 touches a 🟥, it dies.
        `}
      />

      <Text
        size={14}
        element='p'
        color={colors.black30}
        value={`
          When a 🟦 reaches the right edge, it circles back to the left edge
          and spawns a new child 🟦, which is the same as it's parent, but for
          a single mutation. The 🟥 spawn rate is directly proportional to the
          population size, so the more the 🟦 win, the harder it gets.
        `}
      />

      <Text
        size={14}
        element='p'
        color={colors.black30}
        value={`
          The 🟦 neural networks start very simply. They have 3 inputs, and 3
          outputs.
        `}
      />
      <Stack spacing={spacing.small}>
        <Text value='Inputs' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value='↱🟥 - Distance to 🟥 on the row above'
        />
        <Text
          size={14}
          color={colors.black30}
          value='→🟥 - Distance to 🟥 on the current row'
        />
        <Text
          size={14}
          color={colors.black30}
          value='↳🟥 - Distance to 🟥 on the row below'
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Outputs' size={14} />
        <Text size={14} color={colors.black30} value='🟦↑ - Move up' />
        <Text size={14} color={colors.black30} value='🟦→ - Move forward' />
        <Text size={14} color={colors.black30} value='🟦↓ - Move down' />
      </Stack>

      <Text
        size={14}
        element='p'
        color={colors.black30}
        value={`
          The initial state of the network has the inputs mapped to the
          outputs with no hidden nodes, and edge weights randomly set to 1 or -1.
        `}
      />
      <div style={{ width: 256, height: 256 }}>
        <Image
          src={initialNeuralNetworkImage}
          alt='Neural Network initial state'
        />
      </div>
      <Text
        size={14}
        element='p'
        color={colors.black30}
        value={`
          From that initial state, these are the possible mutations that
          occur when a 🟦 hits the right wall.
        `}
      />

      <Stack spacing={spacing.small}>
        <Text value='Add Node' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value={`
            Pick an edge at random and intermediate it with a node of bias
            1, a random squash function, and edge of weight 1.
          `}
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Add Edge' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value='Select two random nodes and add an edge with weight 1.'
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Remove Node' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value={`Find and remove a hidden node, connecting all its inbound edges to all its outbound edges.`}
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Remove Edge' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value='Find and remove an edge, making sure not to orphan any input or output nodes.'
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Mutate Edge Weight' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value={`
            Adjust the weight proportional with some "learning rate"
            constant, currently ${defaultLearningRate}.
          `}
        />
        <pre>
          let newValue = (value * random(-2, 2) * learningRate) + (value * (1 -
          learningRate))
        </pre>
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Mutate Node Bias' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value={`
            Adjust the bias proportional with some "learning rate"
            constant, currently ${defaultLearningRate}.
          `}
        />
      </Stack>

      <Stack spacing={spacing.small}>
        <Text value='Mutate Node Squash' size={14} />
        <Text
          size={14}
          color={colors.black30}
          value='Select a random squash (or activation) function.'
        />
      </Stack>
    </Stack>
  )
}
