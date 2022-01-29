import { round, sum } from 'lodash'
import {
  ReactNode,
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
import { Board } from '../Board'
import { BoardState } from '../Board/lib/BoardState'

export interface DefaultFrameState {
  boardState: BoardState
  running?: boolean
  speed?: number
  runFor?: number | null
  fps?: number
  fpss?: number[]
  time?: number
  framesPerFrame?: number
  pendingFrames?: number
}

const turboFramesPerFrame = 16
const defaultFramesPerFrame = 1
const slowFps = 12
const slowSpeed = 1000 / slowFps
const defaultSpeed = 0

function framesPerSecond(
  currentFrameTime: number,
  previousFrameTime: number,
): number {
  return 1000 / (currentFrameTime - previousFrameTime)
}

interface FrameBoardProps<FrameState extends DefaultFrameState> {
  initFrameState: () => FrameState
  getNextFrameState: (state: FrameState) => FrameState
  height: number
  width: number
  renderControl?: (state: FrameState) => ReactNode
  renderChildren?: (state: FrameState) => ReactNode
  reset?: boolean
  turbo?: boolean
}

export function FrameBoard<FrameState extends DefaultFrameState>({
  initFrameState,
  getNextFrameState,
  height,
  width,
  renderControl,
  renderChildren,
  reset = true,
  turbo = true,
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

      let extraFrames = (prevState.framesPerFrame || 1) - 1
      while (extraFrames--) {
        nextState = getNextFrameState(nextState)
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

  const handleSetFramesPerFrame = useCallback(
    (framesPerFrame: number) => () => {
      setState({
        ...state,
        running: true,
        speed: defaultSpeed,
        framesPerFrame,
      })
    },
    [setState, state],
  )

  const control = useMemo(
    () => (renderControl ? renderControl(state) : null),
    [state, renderControl],
  )
  const children = useMemo(
    () => (renderChildren ? renderChildren(state) : null),
    [state, renderChildren],
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
                state.running &&
                state.framesPerFrame !== turboFramesPerFrame &&
                state.speed !== slowSpeed
              }
            />
          </Inline>
          <Inline spacing={spacing.xsmall}>
            {turbo ? (
              <Button
                onClick={handleSetFramesPerFrame(turboFramesPerFrame)}
                disabled={
                  state.running && state.framesPerFrame === turboFramesPerFrame
                }
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
