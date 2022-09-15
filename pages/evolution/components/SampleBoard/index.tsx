import { Inline } from '../../../../components/Inline'
import { Text } from '../../../../components/Text'
import { Agent } from '../../lib/Agent'
import { BoardState } from '../Board/lib/BoardState'
import {
  canvasWidth,
  cellSize,
  DefaultFrameState,
  FrameBoard,
} from '../FrameBoard'

export interface SampleFrameState<TAgent extends Agent<any, any>>
  extends DefaultFrameState {
  agent: TAgent
  agents: TAgent[]
  boardState: BoardState
  result: 'death' | 'life' | null
}

const canvasHeight = cellSize * 5
export const sampleGridWidth = canvasWidth / cellSize
export const sampleGridHeight = canvasHeight / cellSize

interface SampleBoardProps<TAgent extends Agent<any, any>> {
  initSampleFrameState: (
    state?: SampleFrameState<TAgent>,
  ) => SampleFrameState<TAgent>
  getNextSampleFrameState: (
    state: SampleFrameState<TAgent>,
  ) => SampleFrameState<TAgent>
}

export function SampleBoard<TAgent extends Agent<any, any>>({
  initSampleFrameState,
  getNextSampleFrameState,
}: SampleBoardProps<TAgent>) {
  return (
    <FrameBoard
      initFrameState={initSampleFrameState}
      getNextFrameState={getNextSampleFrameState}
      width={canvasWidth}
      height={canvasHeight}
      turbo={false}
      reset={false}
      renderControl={(state: SampleFrameState<TAgent>) => (
        <Inline align='right'>
          <Text
            value={
              state.result === 'life'
                ? '👑'
                : state.result === 'death'
                ? '☠️'
                : ''
            }
          />
        </Inline>
      )}
    />
  )
}
