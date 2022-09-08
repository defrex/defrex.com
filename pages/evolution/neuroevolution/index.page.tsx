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
import HowItWorks from './components/HowItWorks'
import {
  defaultCanvasHeight,
  defaultCanvasWidth,
  FrameState,
  getNextFrameState,
  initFrameState,
  neuroevolutionFrames,
} from './lib/getNextFrameState'
import styles from './styles.module.scss'

interface EvolutionProps {}

export default function Neuroevolution(_props: EvolutionProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const sampleSetState = useSampleSetState<FrameState>()
  const [metricsSpeed, setMetricsSpeed] = useState<
    Record<string, 'fast' | 'slow'>
  >({
    population: 'slow',
    lineage: 'slow',
    difficulty: 'slow',
    complexity: 'slow',
  })

  const handleToggleMetric = useCallback(
    (metric: 'population' | 'lineage' | 'difficulty' | 'complexity') => () => {
      setMetricsSpeed({
        ...metricsSpeed,
        [metric]: metricsSpeed[metric] === 'fast' ? 'slow' : 'fast',
      })
    },
    [metricsSpeed, setMetricsSpeed],
  )

  const handleToggleHowItWorks = useCallback(() => {
    setShowHowItWorks(!showHowItWorks)
  }, [setShowHowItWorks, showHowItWorks])

  return (
    <PageContainer title='Neuroevolution'>
      <Stack spacing={spacing.large}>
        <Inline expand={0}>
          <Stack spacing={spacing.small}>
            <Text value='Neuroevolution' size={20} />
            <Text
              value='Neural Networks trained via Evolutionary Algorithm'
              color={colors.black40}
            />
          </Stack>
          <Button
            onClick={handleToggleHowItWorks}
            text={showHowItWorks ? 'Hide' : 'How It Works'}
          />
        </Inline>

        {showHowItWorks ? <HowItWorks /> : null}
        <Inline
          verticalAlign='top'
          align='center'
          className={styles.colContainer}
          expand={1}
        >
          <FrameBoard
            initFrameState={initFrameState}
            getNextFrameState={getNextFrameState}
            onFrame={sampleSetState.onFrame}
            width={defaultCanvasWidth}
            height={defaultCanvasHeight}
            renderChildren={(state: FrameState) => (
              <Stack spacing={spacing.large}>
                <Stack spacing={spacing.small}>
                  <Inline expand={0}>
                    <Text
                      value={`Difficulty (spawns/frame)`}
                      color={colors.black40}
                    />
                    <Checkbox
                      onClick={handleToggleMetric('difficulty')}
                      left='Realtime'
                      checked={metricsSpeed.difficulty === 'fast'}
                    />
                  </Inline>
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryLine
                      data={state.metrics[metricsSpeed.difficulty].difficulty}
                      x='move'
                      y='value'
                    />
                  </VictoryChart>
                </Stack>

                <Stack spacing={spacing.small}>
                  <Inline expand={0}>
                    <Text value={`Network Complexity`} color={colors.black40} />
                    <Checkbox
                      onClick={handleToggleMetric('complexity')}
                      left='Realtime'
                      checked={metricsSpeed.complexity === 'fast'}
                    />
                  </Inline>
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryArea
                      data={state.metrics[metricsSpeed.complexity].complexity}
                      x='move'
                      y0='min'
                      y='max'
                    />
                    <VictoryLine
                      data={
                        state.metrics[metricsSpeed.complexity].complexityMax
                      }
                      x='move'
                      y='value'
                    />
                    <VictoryLine
                      data={
                        state.metrics[metricsSpeed.complexity].complexityMin
                      }
                      x='move'
                      y='value'
                    />
                  </VictoryChart>
                </Stack>

                <Stack spacing={spacing.small}>
                  <Inline expand={0}>
                    <Text value={`Lineage`} color={colors.black40} />
                    <Checkbox
                      onClick={handleToggleMetric('lineage')}
                      left='Realtime'
                      checked={metricsSpeed.lineage === 'fast'}
                    />
                  </Inline>
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    {/* {console.log(state.metrics)} */}
                    <VictoryArea
                      data={state.metrics[metricsSpeed.lineage].lineage}
                      x='move'
                      y0='min'
                      y='max'
                    />
                    <VictoryLine
                      data={state.metrics[metricsSpeed.lineage].lineageMax}
                      x='move'
                      y='value'
                    />
                    <VictoryLine
                      data={state.metrics[metricsSpeed.lineage].lineageMin}
                      x='move'
                      y='value'
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
          <SampleSet
            state={sampleSetState}
            initSampleFrameState={neuroevolutionFrames.initSampleFrameState}
            getNextSampleFrameState={
              neuroevolutionFrames.getNextSampleFrameState
            }
          />
        </Inline>
      </Stack>
    </PageContainer>
  )
}
