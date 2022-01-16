import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'

interface EvolutionProps {}

export default function Evolution(_props: EvolutionProps) {
  return (
    <PageContainer>
      <Stack>
        <Text value='Evolution' size={24} />
      </Stack>
    </PageContainer>
  )
}
