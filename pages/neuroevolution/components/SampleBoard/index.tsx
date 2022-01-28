import { some } from 'lodash'
import { ReactNode, useCallback } from 'react'
import { Inline } from '../../../../components/Inline'
import { Text } from '../../../../components/Text'
import { colorValues } from '../../../../lib/colors'
import { Agent } from '../../lib/Agent'
import {
  advanceKillPositions,
  agentPositionColors,
  defaultCanvasWidth,
  defaultCellSize,
  killPositionColors,
} from '../../lib/getNextFrameState'
import { BoardState, Position } from '../Board/lib/BoardState'
import { DefaultFrameState, FrameBoard } from '../FrameBoard'

interface SampleBoardProps {
  agent: Agent
  killPositions: Position[]
  children?: ReactNode
}

interface SampleFrameState extends DefaultFrameState {
  agent: Agent
  boardState: BoardState
  timeout: number
  result: 'death' | 'life' | 'timeout' | null
}

const cellSize = defaultCellSize
const canvasHeight = defaultCellSize * 5
const canvasWidth = defaultCanvasWidth
const gridWidth = canvasWidth / cellSize
const gridHeight = canvasHeight / cellSize
const defaultTimeout = gridWidth * 5

export function SampleBoard(props: SampleBoardProps) {
  const initSampleFrameState = useCallback(
    (state?: SampleFrameState): SampleFrameState => {
      const agent = props.agent.setPosition([0, 2])
      return {
        agent,
        running: state ? false : true,
        timeout: defaultTimeout,
        result: state && state.result !== null ? state.result : null,
        boardState: new BoardState({
          gridWidth,
          gridHeight,
          cellSize,
        }).setPositions([
          ...agentPositionColors([agent], gridWidth),
          ...props.killPositions.map((position) => ({
            type: 'kill',
            color: colorValues.red60,
            position,
          })),
        ]),
      }
    },
    [props],
  )

  const getNextSampleFrameState = useCallback(
    (state: SampleFrameState): SampleFrameState => {
      let boardState = state.boardState
      const agent = state.agent.move(boardState)

      if (agent.position[0] >= gridWidth - 1) {
        return initSampleFrameState({ ...state, result: 'life' })
      }

      const killPositions: Position[] = advanceKillPositions(boardState)

      if (state.timeout === 0) {
        return initSampleFrameState({ ...state, result: 'timeout' })
      }

      if (
        some(
          killPositions,
          ([killerX, killerY]) =>
            agent.position[0] === killerX && agent.position[1] === killerY,
        )
      ) {
        return initSampleFrameState({ ...state, result: 'death' })
      }

      return {
        ...state,
        agent,
        boardState: boardState.setPositions([
          ...killPositionColors(killPositions),
          ...agentPositionColors([agent], gridWidth),
        ]),
        timeout: state.timeout - 1,
        result: null,
      }
    },
    [],
  )

  return (
    <FrameBoard
      initFrameState={initSampleFrameState}
      getNextFrameState={getNextSampleFrameState}
      width={canvasWidth}
      height={canvasHeight}
      renderControl={(state: SampleFrameState) => (
        <Inline align='right'>
          <Text
            value={
              state.result === 'life'
                ? '👑'
                : state.result === 'death'
                ? '☠️'
                : state.result === 'timeout'
                ? '⌛'
                : ''
            }
          />
        </Inline>
      )}
    />
  )
}
