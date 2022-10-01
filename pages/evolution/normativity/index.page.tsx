import { useCallback, useState } from 'react'
import { VictoryArea, VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { Inline } from '../../../components/Inline'
import { PageContainer } from '../../../components/PageContainer'
import { Stack } from '../../../components/Stack'
import { Text } from '../../../components/Text'
import { colors } from '../../../lib/colors'
import { spacing } from '../../../lib/spacing'
import { victoryChartTheme } from '../../../lib/victoryChartTheme'
import { FrameBoard } from '../components/FrameBoard'
import { SampleSet, useSampleSetState } from '../components/SampleSet'
import {
  defaultCanvasHeight,
  defaultCanvasWidth,
} from '../neuroevolution/lib/getNextFrameState'
import { NormativityAgent } from './lib/NormativityAgent'
import {
  normativityFrames,
  NormativityFrameState,
} from './lib/normativityFrames'
import styles from './styles.module.scss'

export default function Normativity() {
  const sampleSetState = useSampleSetState<
    NormativityAgent,
    NormativityFrameState
  >()
  const [metricsSpeed, setMetricsSpeed] = useState<
    Record<string, 'fast' | 'slow'>
  >({
    points: 'slow',
    ppt: 'slow',
  })

  const handleToggleMetric = useCallback(
    (metric: 'points' | 'ppt') => () => {
      setMetricsSpeed({
        ...metricsSpeed,
        [metric]: metricsSpeed[metric] === 'fast' ? 'slow' : 'fast',
      })
    },
    [metricsSpeed, setMetricsSpeed],
  )

  return (
    <PageContainer title='Normativity'>
      <Stack spacing={spacing.large}>
        <Stack spacing={spacing.small}>
          <Text value='Normativity' size={20} />
          <Text
            value='Agent model demonstrating the normativity.'
            color={colors.black40}
          />
        </Stack>

        <Inline
          verticalAlign='top'
          align='center'
          className={styles.colContainer}
          expand={1}
        >
          <FrameBoard
            initFrameState={normativityFrames.initFrameState}
            getNextFrameState={normativityFrames.getNextFrameState}
            width={defaultCanvasWidth}
            height={defaultCanvasHeight}
            onFrame={sampleSetState.onFrame}
            renderChildren={(state: NormativityFrameState) => (
              <Stack spacing={spacing.large}>
                <Stack spacing={spacing.small}>
                  <Inline expand={0}>
                    <Text value={`PPT/Fitness`} color={colors.black40} />
                    <Checkbox
                      onClick={handleToggleMetric('ppt')}
                      left='Realtime'
                      checked={metricsSpeed.ppt === 'fast'}
                    />
                  </Inline>
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryLine
                      data={state.metrics[metricsSpeed.ppt].ppt ?? []}
                      x='move'
                      y='value'
                    />
                  </VictoryChart>
                </Stack>
                <Stack spacing={spacing.small}>
                  <Inline expand={0}>
                    <Text value={`Points`} color={colors.black40} />
                    <Checkbox
                      onClick={handleToggleMetric('points')}
                      left='Realtime'
                      checked={metricsSpeed.points === 'fast'}
                    />
                  </Inline>
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryArea
                      data={state.metrics[metricsSpeed.points].points ?? []}
                      x='move'
                      y0='min'
                      y='max'
                    />
                  </VictoryChart>
                </Stack>
              </Stack>
            )}
            renderControl={(state, setState) => (
              <Inline align='right' spacing={spacing.small}>
                <Checkbox
                  onClick={sampleSetState.toggleAutoSample(setState)}
                  left='Auto'
                  checked={!!state.autoSample}
                />
                <Button
                  onClick={sampleSetState.takeSampleAgent(state)}
                  text='Take Sample'
                />
              </Inline>
            )}
          />
          <SampleSet<NormativityAgent, NormativityFrameState>
            state={sampleSetState}
            initSampleFrameState={normativityFrames.initSampleFrameState}
            getNextSampleFrameState={normativityFrames.getNextSampleFrameState}
          />
        </Inline>
      </Stack>
    </PageContainer>
  )
}
