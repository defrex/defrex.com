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
  // const initSampleFrameState = useCallback(
  //   (state?: SampleFrameState): SampleFrameState => {
  //     const agent = props.agent.setPosition([0, 2])
  //     return {
  //       agent,
  //       agents: [agent],
  //       move: 0,
  //       running: state ? false : true,
  //       result: state && state.result !== null ? state.result : null,
  //       boardState: new BoardState({
  //         gridWidth,
  //         gridHeight,
  //         cellSize,
  //       }).setPositions([
  //         ...agentPositionColors([agent], gridWidth),
  //         ...props.redPositions.map((position) => ({
  //           type: 'kill',
  //           color: colorValues.red60,
  //           position,
  //         })),
  //       ]),
  //     }
  //   },
  //   [props],
  // )

  // const getNextSampleFrameState = useCallback(
  //   (state: SampleFrameState): SampleFrameState => {
  //     let boardState = state.boardState
  //     const agent = state.agent.move(boardState)

  //     if (agent.position[0] >= gridWidth - 1) {
  //       return initSampleFrameState({ ...state, result: 'life' })
  //     }

  //     const redPositions: Position[] = advanceKillPositions(boardState)

  //     if (redPositions.length === 0) {
  //       return initSampleFrameState({ ...state, result: 'life' })
  //     }

  //     if (
  //       some(
  //         redPositions,
  //         ([killerX, killerY]) =>
  //           agent.position[0] === killerX && agent.position[1] === killerY,
  //       )
  //     ) {
  //       return initSampleFrameState({ ...state, result: 'death' })
  //     }

  //     return {
  //       ...state,
  //       agent,
  //       boardState: boardState.setPositions([
  //         ...killPositionColors(redPositions),
  //         ...agentPositionColors([agent], gridWidth),
  //       ]),
  //       result: null,
  //     }
  //   },
  //   [],
  // )

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
