import { PageContainer } from '../../../components/PageContainer'
import { Stack } from '../../../components/Stack'
import { Text } from '../../../components/Text'
import { colors } from '../../../lib/colors'
import { spacing } from '../../../lib/spacing'

interface NormativityProps {}

/**
 * notes
 * - agent model
 * - hypergraph connections
 * - edge weights
 * - normalize against neighbors
 * - mutate graph edges
 * - selection pressure
 * - back-propagation
 */
export default function Normativity(_props: NormativityProps) {
  return (
    <PageContainer title='Normativity'>
      <Stack spacing={spacing.small}>
        <Text value='Normativity' size={20} />
        <Text
          value='Agent model demonstrating the emergence of normativity.'
          color={colors.black40}
        />
      </Stack>
    </PageContainer>
  )
}
