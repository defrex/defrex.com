import { MouseEvent } from 'react'
import { Button } from '../../../../../components/Button'
import { Inline } from '../../../../../components/Inline'
import { Stack } from '../../../../../components/Stack'
import { Text } from '../../../../../components/Text'
import { colors } from '../../../../../lib/colors'
import { spacing } from '../../../../../lib/spacing'
import { Agent } from '../../lib/Agent'

interface AgentInfoProps {
  agent: Agent
  onSelect?: (agent: Agent) => (event: MouseEvent) => void
}

export function AgentInfo({ agent, onSelect }: AgentInfoProps) {
  return (
    <Inline expand={0} key={agent.id}>
      <Stack spacing={spacing.small}>
        <Text value={`Agent ${agent.id}`} size={16} />
        {agent.moves !== undefined ? (
          <Stack spacing={spacing.xsmall}>
            <Text value='Moves' color={colors.black40} />
            <Text value={agent.moves} />
          </Stack>
        ) : null}
        {agent.position !== undefined ? (
          <Stack spacing={spacing.xsmall}>
            <Text value='Current Position' color={colors.black40} />
            <Text value={`[${agent.position.join(' , ')}]`} />
          </Stack>
        ) : null}
      </Stack>

      {onSelect ? <Button onClick={onSelect(agent)} text='Select' /> : null}
    </Inline>
  )
}
