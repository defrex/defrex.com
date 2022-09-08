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

export interface SampleFrameState extends DefaultFrameState {
  agent: Agent<any, any>
  boardState: BoardState
  result: 'death' | 'life' | null
}

const canvasHeight = cellSize * 5
export const sampleGridWidth = canvasWidth / cellSize
export const sampleGridHeight = canvasHeight / cellSize

interface SampleBoardProps {
  initSampleFrameState: (state?: SampleFrameState) => SampleFrameState
  getNextSampleFrameState: (state: SampleFrameState) => SampleFrameState
}

export function SampleBoard({
  initSampleFrameState,
  getNextSampleFrameState,
}: SampleBoardProps) {
  return (
    <FrameBoard
      initFrameState={initSampleFrameState}
      getNextFrameState={getNextSampleFrameState}
      width={canvasWidth}
      height={canvasHeight}
      turbo={false}
      reset={false}
      renderControl={(state: SampleFrameState) => (
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
