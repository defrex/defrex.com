import { last } from 'lodash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors, colorValues } from '../../lib/colors'
import { sleep } from '../../lib/sleep'
import { spacing } from '../../lib/spacing'
import { victoryChartTheme } from '../../lib/victoryChartTheme'
import { Board } from './components/Board'
import { GenomeView } from './components/GenomeView'
import HowItWorks from './components/HowItWorks'
import { Agent } from './lib/Agent'
import {
  canvasHeight,
  canvasWidth,
  FrameState,
  getNextFrameState,
  initFrameState,
  metricsWith,
  movesColor,
  setCellSize,
} from './lib/getNextFrameState'
import styles from './styles.module.scss'

interface EvolutionProps {}

function bestAgent(agents: Agent[]): Agent {
  return agents.reduce((best, agent) => {
    if (agent.moves > best.moves) {
      return agent
    }
    return best
  }, agents[0])
}

const slowFps = 12

export default function Evolution(_props: EvolutionProps) {
  const frameRef = useRef<number>()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [metricsVisible, setMetricsVisible] = useState({
    population: false,
    lineage: false,
    difficulty: true,
  })
  const [state, setState] = useState<FrameState>(initFrameState())

  const handleReset = useCallback(() => {
    setState(setCellSize(state.cellSize, initFrameState()))
  }, [setState, state])

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

  const handleToggleMetric = useCallback(
    (metric: 'population' | 'lineage' | 'difficulty') => () => {
      setMetricsVisible({
        ...metricsVisible,
        [metric]: !metricsVisible[metric],
      })
    },
    [metricsVisible, setMetricsVisible],
  )

  const handleSampleAgent = useCallback(() => {
    const nextSampleAgent = bestAgent(state.agents)
    console.log('Sample', nextSampleAgent.moves, nextSampleAgent.genome)
    setState({
      ...state,
      sampleAgents: [
        ...state.sampleAgents,
        { move: state.move, agent: nextSampleAgent },
      ],
    })
  }, [setState, state])

  const handleSelectAgent = useCallback(
    (agent: Agent) => () => {
      setSelectedAgent(agent)
    },
    [setSelectedAgent],
  )

  const handleClearSelectedAgent = useCallback(() => {
    setSelectedAgent(null)
  }, [setSelectedAgent])

  const handleToggleHowItWorks = useCallback(() => {
    setShowHowItWorks(!showHowItWorks)
  }, [setShowHowItWorks, showHowItWorks])

  const renderFrame = () => {
    setState((currentState: FrameState) => {
      if (!currentState.running) {
        frameRef.current = requestAnimationFrame(renderFrame)
        return currentState
      }

      const frameState = getNextFrameState(currentState)

      if (frameState.speed > 0) {
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
    return () => cancelAnimationFrame(frameRef.current!)
  }, [])

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

        <Board
          boardState={state.boardState}
          width={canvasWidth}
          height={canvasHeight}
        />

        <Stack spacing={spacing.xlarge}>
          <Stack>
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

              {state.history.length > 2 ? (
                <Inline align='right'>
                  <Text
                    value={`${
                      last(metricsWith(state.metrics, 'fps'))?.fps || 0
                    }fps`}
                    color={colors.black40}
                  />
                </Inline>
              ) : null}

              <Inline align='right'>
                <Button onClick={handleSampleAgent} text='Sample Agent' />
              </Inline>
            </Inline>
          </Stack>

          <Stack>
            <table className={styles.sampleAgents}>
              <thead>
                {state.sampleAgents.length > 0 ? (
                  <tr>
                    <th>
                      <Text value='Sampled At' color={colors.black40} />
                    </th>
                    <th></th>
                    <th>
                      <Text value='Moves' color={colors.black40} />
                    </th>
                    <th>
                      <Text value='Lineage' color={colors.black40} />
                    </th>
                    <th>
                      <Text value='Nodes' color={colors.black40} />
                    </th>
                    <th>
                      <Text value='Edges' color={colors.black40} />
                    </th>
                  </tr>
                ) : null}
              </thead>
              <tbody>
                {state.sampleAgents.map(({ move, agent }) => (
                  <tr key={`${move}-${agent.id}`}>
                    <td>
                      <Text value={`${move}`} />
                    </td>
                    <td>
                      <div
                        style={{
                          backgroundColor: movesColor(
                            agent.moves,
                            state.gridWidth,
                          ),
                          height: state.cellSize * 0.5,
                          width: state.cellSize * 0.5,
                        }}
                      />
                    </td>
                    <td>
                      <Text value={`${agent.moves}`} />
                    </td>
                    <td>
                      <Text value={`${agent.lineage}`} />
                    </td>
                    <td>
                      <Text value={`${agent.genome.nodes.length}`} />
                    </td>
                    <td>
                      <Text value={`${agent.genome.edges.length}`} />
                    </td>
                    <td>
                      <Button
                        onClick={handleSelectAgent(agent)}
                        text='View Brain'
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Stack>

          {selectedAgent ? (
            <Stack>
              <Inline align='right'>
                <Button onClick={handleClearSelectedAgent} text='Close' />
              </Inline>
              <GenomeView genome={selectedAgent.genome} />
            </Stack>
          ) : null}

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text value={`Fitness`} color={colors.black40} />
              <Button
                onClick={handleToggleMetric('difficulty')}
                text={metricsVisible.difficulty ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.difficulty && state.metrics.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryLine
                  data={metricsWith(state.metrics, 'fitness')}
                  x='move'
                  y='fitness'
                />
              </VictoryChart>
            ) : null}
          </Stack>

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text value={`Population`} color={colors.black40} />
              <Button
                onClick={handleToggleMetric('population')}
                text={metricsVisible.population ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.population && state.metrics.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryLine
                  style={{
                    data: { stroke: colorValues.blue60, strokeWidth: 1 },
                  }}
                  data={metricsWith(state.metrics, 'population', 1000)}
                  x='move'
                  y='population'
                />
                <VictoryLine
                  style={{
                    data: { stroke: colorValues.red60, strokeWidth: 1 },
                  }}
                  data={metricsWith(state.metrics, 'killers', 1000)}
                  x='move'
                  y='killers'
                />
              </VictoryChart>
            ) : null}
          </Stack>

          <Stack spacing={spacing.small}>
            <Inline expand={0}>
              <Text value={`Lineage`} color={colors.black40} />
              <Button
                onClick={handleToggleMetric('lineage')}
                text={metricsVisible.lineage ? 'Hide' : 'Show'}
              />
            </Inline>
            {metricsVisible.lineage && state.history.length > 0 ? (
              <VictoryChart theme={victoryChartTheme} height={200}>
                <VictoryLine
                  data={metricsWith(state.metrics, 'lineageMax', 1000)}
                  x='move'
                  y='lineageMax'
                />
                <VictoryLine
                  data={metricsWith(state.metrics, 'lineageMin', 1000)}
                  x='move'
                  y='lineageMin'
                />
              </VictoryChart>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </PageContainer>
  )
}
