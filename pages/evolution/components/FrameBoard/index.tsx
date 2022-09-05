import { round, sum } from 'lodash'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '../../../../components/Button'
import { Inline } from '../../../../components/Inline'
import { Stack } from '../../../../components/Stack'
import { Text } from '../../../../components/Text'
import { colors } from '../../../../lib/colors'
import { sleep } from '../../../../lib/sleep'
import { spacing } from '../../../../lib/spacing'
import { Agent } from '../../lib/Agent'
import { Board } from '../Board'
import { BoardState } from '../Board/lib/BoardState'

export interface DefaultFrameState {
  agents: Agent<any, any>[]
  boardState: BoardState
  fps?: number
  fpss?: number[]
  framesPerFrame?: number
  move: number
  pendingFrames?: number
  runFor?: number | null
  running?: boolean
  speed?: number
  time?: number
  turbo?: boolean
}

const turboFramesPerFrame = 16
const defaultFramesPerFrame = 1
const slowFps = 12
const slowSpeed = 1000 / slowFps
const defaultSpeed = 0

export const cellSize = 16
export const canvasWidth =
  typeof window === 'undefined'
    ? 768
    : window.innerWidth > 768
    ? 768
    : window.innerWidth > 512
    ? 512
    : 256
export const canvasHeight = 512

function framesPerSecond(
  currentFrameTime: number,
  previousFrameTime: number,
): number {
  return 1000 / (currentFrameTime - previousFrameTime)
}

export type SetState<TFrameState> = Dispatch<SetStateAction<TFrameState>>

interface FrameBoardProps<FrameState extends DefaultFrameState> {
  getNextFrameState: (state: FrameState) => FrameState
  onFrame?: (state: FrameState) => void
  initFrameState: () => FrameState
  renderChildren?: (
    state: FrameState,
    setState: SetState<FrameState>,
  ) => ReactNode
  renderControl?: (
    state: FrameState,
    setState: SetState<FrameState>,
  ) => ReactNode
  reset?: boolean
  turbo?: boolean
  height: number
  width: number
}

export function FrameBoard<FrameState extends DefaultFrameState>({
  getNextFrameState,
  onFrame,
  initFrameState,
  renderChildren,
  renderControl,
  reset = true,
  turbo = true,
  height = canvasHeight,
  width = canvasWidth,
}: FrameBoardProps<FrameState>) {
  const frameRef = useRef<number>()
  const [state, setState] = useState<FrameState>(initFrameState)

  const renderFrame = (time: number) => {
    setState((prevState: FrameState) => {
      if (!prevState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return prevState
      }

      let nextState = getNextFrameState(prevState)
      if (onFrame) onFrame(nextState)

      let extraFrames = (prevState.framesPerFrame || 1) - 1
      while (extraFrames--) {
        nextState = getNextFrameState(nextState)
        if (onFrame) onFrame(nextState)
      }

      nextState.time = time

      nextState.fpss = [
        ...(nextState.fpss?.slice(-5) || []),
        framesPerSecond(nextState.time, prevState.time || time),
      ]
      nextState.fps = round(sum(nextState.fpss) / nextState.fpss.length)
      if (nextState.fps === Infinity) {
        nextState.fps = undefined
      }

      if (nextState.turbo && nextState.fps && nextState.fps > 40) {
        nextState.framesPerFrame = (nextState.framesPerFrame || 0) + 1
      } else if (nextState.turbo && nextState.fps && nextState.fps < 20) {
        nextState.framesPerFrame = (nextState.framesPerFrame || 0) - 1
      }

      nextState.runFor = prevState.runFor ? prevState.runFor - 1 : null
      nextState.running =
        nextState.runFor === null ? nextState.running : nextState.runFor > 0

      if (nextState.speed && nextState.speed > 0) {
        sleep(nextState.speed).then(() => {
          frameRef.current = requestAnimationFrame(renderFrame)
        })
      } else {
        frameRef.current = requestAnimationFrame(renderFrame)
      }

      return nextState
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
      speed: defaultSpeed,
      framesPerFrame: defaultFramesPerFrame,
      turbo: false,
    })
  }, [setState, state])

  const handlePause = useCallback(() => {
    setState({
      ...state,
      running: false,
      runFor: null,
      speed: defaultSpeed,
      framesPerFrame: defaultFramesPerFrame,
    })
  }, [setState, state])

  const handleRunOne = useCallback(() => {
    setState({
      ...state,
      running: true,
      runFor: 1,
      speed: defaultSpeed,
      framesPerFrame: defaultFramesPerFrame,
    })
  }, [setState, state])

  const handleSetSpeed = useCallback(
    (speed: number) => () => {
      setState({
        ...state,
        running: true,
        speed,
        framesPerFrame: defaultFramesPerFrame,
      })
    },
    [setState, state],
  )

  const handleTurbo = useCallback(() => {
    setState({
      ...state,
      running: true,
      speed: defaultSpeed,
      turbo: true,
      framesPerFrame: turboFramesPerFrame,
    })
  }, [setState, state])

  const control = useMemo(
    () => (renderControl ? renderControl(state, setState) : null),
    [state, renderControl, setState],
  )
  const children = useMemo(
    () => (renderChildren ? renderChildren(state, setState) : null),
    [state, renderChildren, setState],
  )

  return (
    <Stack spacing={spacing.large}>
      <Stack spacing={spacing.xsmall}>
        <Board boardState={state.boardState} width={width} height={height} />

        <Inline expand={-1} verticalIf={{ eq: 'small' }}>
          {reset ? <Button onClick={handleReset} text='Reset' /> : null}
          <Inline spacing={spacing.xsmall}>
            <Button
              onClick={handlePause}
              text='Pause'
              disabled={!state.running}
            />
            <Button
              onClick={handlePlay}
              text='Play'
              disabled={
                state.running && !state.turbo && state.speed !== slowSpeed
              }
            />
          </Inline>
          <Inline spacing={spacing.xsmall}>
            {turbo ? (
              <Button
                onClick={handleTurbo}
                disabled={state.running && state.turbo}
                text='Turbo'
              />
            ) : null}
            <Button
              onClick={handleSetSpeed(slowSpeed)}
              disabled={state.running && state.speed === slowSpeed}
              text='Slow'
            />
            <Button onClick={handleRunOne} text='Step' />
          </Inline>

          {state.fps ? (
            <Text value={`${state.fps || 0}fps`} color={colors.black40} />
          ) : null}

          {control}
        </Inline>
      </Stack>
      {children}
    </Stack>
  )
}
