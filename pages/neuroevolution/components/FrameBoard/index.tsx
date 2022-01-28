import { round } from 'lodash'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../../../components/Button'
import { Inline } from '../../../../components/Inline'
import { Stack } from '../../../../components/Stack'
import { Text } from '../../../../components/Text'
import { colors } from '../../../../lib/colors'
import { sleep } from '../../../../lib/sleep'
import { spacing } from '../../../../lib/spacing'
import { Board } from '../Board'
import { BoardState } from '../Board/lib/BoardState'

export interface DefaultFrameState {
  boardState: BoardState
  running?: boolean
  speed?: number
  runFor?: number | null
  lastFrameTime?: number
  fps?: number
}

interface FrameBoardProps<FrameState extends DefaultFrameState> {
  initFrameState: () => FrameState
  getNextFrameState: (state: FrameState) => FrameState
  height: number
  width: number

  renderControl?: (state: FrameState) => ReactNode
  renderChildren?: (state: FrameState) => ReactNode
}

const slowFps = 12

export function FrameBoard<FrameState extends DefaultFrameState>({
  initFrameState,
  getNextFrameState,
  height,
  width,
  renderControl,
  renderChildren,
}: FrameBoardProps<FrameState>) {
  const frameRef = useRef<number>()
  const [state, setState] = useState<FrameState>(initFrameState)

  const renderFrame = () => {
    setState((currentState: FrameState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const frameState = getNextFrameState(currentState)

      frameState.lastFrameTime = Date.now()
      frameState.fps = round(
        1 /
          ((frameState.lastFrameTime -
            (currentState.lastFrameTime || Date.now())) /
            1000),
      )

      frameState.runFor = currentState.runFor ? currentState.runFor - 1 : null
      frameState.running =
        frameState.runFor === null ? frameState.running : frameState.runFor > 0

      if (frameState.speed && frameState.speed > 0) {
        sleep(frameState.speed).then(() => {
          frameRef.current = requestAnimationFrame(renderFrame)
        })
      } else {
        frameRef.current = requestAnimationFrame(renderFrame)
      }

      return frameState
    })
  }

  useEffect(() => {
    frameRef.current = requestAnimationFrame(renderFrame)
    return () => {
      cancelAnimationFrame(frameRef.current!)
    }
  }, [])

  const handleReset = useCallback(() => {
    setState(initFrameState())
  }, [setState, initFrameState])

  const handlePlay = useCallback(() => {
    setState({
      ...state,
      running: true,
      runFor: null,
      speed: 0,
    })
  }, [setState, state])

  const handlePause = useCallback(() => {
    setState({
      ...state,
      running: false,
    })
  }, [setState, state])

  const handleRunOne = useCallback(() => {
    setState({
      ...state,
      running: true,
      runFor: 1,
    })
  }, [setState, state])

  const handleSetSpeed = useCallback(
    (speed: number) => () => {
      setState({
        ...state,

        running: true,
        speed,
      })
    },
    [setState, state],
  )

  return (
    <Stack spacing={spacing.large}>
      <Stack spacing={spacing.xsmall}>
        <Board boardState={state.boardState} width={width} height={height} />

        <Inline expand={-1} verticalIf={{ eq: 'small' }}>
          <Button onClick={handleReset} text='Reset' />
          <Inline spacing={spacing.xsmall}>
            <Button
              onClick={handlePause}
              text='Pause'
              disabled={!state.running}
            />
            <Button
              onClick={handlePlay}
              text='Play'
              disabled={state.running && state.speed === 0}
            />
            <Button
              onClick={handleSetSpeed(1000 / slowFps)}
              disabled={state.running && state.speed === 1000 / slowFps}
              text='Slow'
            />
            <Button onClick={handleRunOne} text='Step' />
          </Inline>

          {state.fps ? (
            <Text value={`${state.fps || 0}fps`} color={colors.black40} />
          ) : null}

          {renderControl ? renderControl(state) : null}
        </Inline>
      </Stack>
      {renderChildren ? renderChildren(state) : null}
    </Stack>
  )
}
