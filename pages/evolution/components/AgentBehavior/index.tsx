import { Stack } from '../../../../components/Stack'
import { spacing } from '../../../../lib/spacing'
import { Agent } from '../../lib/Agent'
import { Position } from '../Board/lib/BoardState'
import { SampleBoard, SampleFrameState } from '../SampleBoard'

const testRedPositions: Position[][] = [
  [[-1, 2]],
  [
    [-1, 1],
    [-1, 2],
    [-1, 3],
  ],
  [
    [-1, 2],
    [-2, 2],
  ],
  [
    [-1, 1],
    [-1, 2],
    [-2, 2],
    [-1, 3],
  ],
  [
    [-1, 0],
    [-2, 1],
    [-3, 2],
    [-2, 3],
    [-1, 4],
  ],
  [
    [-1, 0],
    [-2, 1],
    [-3, 2],
    [-2, 2],
    [-2, 3],
    [-1, 4],
  ],
]
interface AgentBehaviorProps {
  agent: Agent<any, any>
  initSampleFrameState: (
    agent: Agent<any, any>,
    redPositions: Position[],
  ) => SampleFrameState
  getNextSampleFrameState: (state: SampleFrameState) => SampleFrameState
}

export function AgentBehavior({
  agent,
  getNextSampleFrameState,
  initSampleFrameState,
}: AgentBehaviorProps) {
  return (
    <Stack spacing={spacing.large}>
      {testRedPositions.map((redPositions, index) => (
        <SampleBoard
          key={index}
          initSampleFrameState={() => initSampleFrameState(agent, redPositions)}
          getNextSampleFrameState={getNextSampleFrameState}
        />
      ))}
    </Stack>
  )
}
