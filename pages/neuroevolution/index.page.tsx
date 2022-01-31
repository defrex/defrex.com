import { last, round, some } from 'lodash'
import { useCallback, useState } from 'react'
import { VictoryArea, VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors } from '../../lib/colors'
import { spacing } from '../../lib/spacing'
import { victoryChartTheme } from '../../lib/victoryChartTheme'
import { AgentBehavior } from './components/AgentBehavior'
import { FrameBoard, SetState } from './components/FrameBoard'
import { GenomeView } from './components/GenomeView'
import HowItWorks from './components/HowItWorks'
import { Agent } from './lib/Agent'
import {
  defaultCanvasHeight,
  defaultCanvasWidth,
  defaultCellSize,
  FrameState,
  getNextFrameState,
  initFrameState,
  movesColor,
} from './lib/getNextFrameState'
import styles from './styles.module.scss'

interface EvolutionProps {}

type AgentSample = {
  move: number
  difficulty: number
  fitness?: number
  agent: Agent
}

function equivalentSamples(agent: Agent, otherAgent: Agent): boolean {
  return otherAgent.id === agent.id && otherAgent.move === agent.move
}

export default function Evolution(_props: EvolutionProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [sampleAgents, setSampleAgents] = useState<AgentSample[]>([])
  const [showAgentBehavior, setShowAgentBehavior] = useState<Agent | null>(null)
  const [showAgentNetwork, setShowAgentNetwork] = useState<Agent | null>(null)
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

  const handleToggleAutoSample = useCallback(
    (setState: SetState<FrameState>) => () => {
      setState((state) => ({ ...state, autoSample: !state.autoSample }))
    },
    [],
  )

  const handleSampleAgent = useCallback(
    (state: FrameState) => () => {
      setSampleAgents((sampleAgents) => {
        // const nextSampleAgent = bestAgent(state.agents)
        const nextSampleAgent = state.agents.reduce(
          (best: Agent | undefined, agent) => {
            if (
              !some(sampleAgents, (sampleAgent) =>
                equivalentSamples(agent, sampleAgent.agent),
              ) &&
              (best === undefined || agent.moves > best.moves)
            ) {
              return agent
            }
            return best
          },
          undefined,
        )

        if (!nextSampleAgent) {
          console.log('No Samples Left!')
          return sampleAgents
        }

        console.log('Sample Agent', nextSampleAgent)

        return [
          ...sampleAgents,
          {
            move: state.move,
            difficulty: last(state.metrics.fast.difficulty)?.value || 0,
            agent: nextSampleAgent,
          },
        ]
      })
    },
    [setSampleAgents],
  )

  const handleFrame = useCallback(
    (state: FrameState): void => {
      const sampleRate = state.move < 100000 ? 10000 : 100000
      if (state.autoSample && state.move % sampleRate === 0) {
        requestAnimationFrame(handleSampleAgent(state))
      }
    },
    [handleSampleAgent],
  )

  const handleClearSampleAgent = useCallback(
    (agent: Agent) => () => {
      setSampleAgents((sampleAgents) => {
        return sampleAgents.filter(
          (sample) => !equivalentSamples(sample.agent, agent),
        )
      })
    },
    [setSampleAgents],
  )

  const handleToggleAgentBehavior = useCallback(
    (selection: Agent | null) => () => {
      setShowAgentBehavior(null)
      if (
        selection &&
        (!showAgentBehavior || !equivalentSamples(selection, showAgentBehavior))
      ) {
        requestAnimationFrame(() => setShowAgentBehavior(selection))
      }
    },
    [setShowAgentBehavior, showAgentBehavior],
  )

  const handleShowAgentNetwork = useCallback(
    (selection: Agent | null) => () => {
      setShowAgentNetwork(selection)
    },
    [setShowAgentNetwork],
  )

  const handleToggleHowItWorks = useCallback(() => {
    setShowHowItWorks(!showHowItWorks)
  }, [setShowHowItWorks, showHowItWorks])

  return (
    <Stack>
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
        </Stack>
      </PageContainer>
      <Inline
        verticalAlign='top'
        align='center'
        className={styles.colContainer}
        expand={1}
      >
        <FrameBoard
          initFrameState={initFrameState}
          getNextFrameState={getNextFrameState}
          onFrame={handleFrame}
          width={defaultCanvasWidth}
          height={defaultCanvasHeight}
          renderControl={(state, setState) => (
            <Inline align='right' spacing={spacing.small}>
              <Checkbox
                onClick={handleToggleAutoSample(setState)}
                left='Auto'
                checked={!!state.autoSample}
              />
              <Button onClick={handleSampleAgent(state)} text='Take Sample' />
            </Inline>
          )}
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
                    data={state.metrics[metricsSpeed.complexity].complexityMax}
                    x='move'
                    y='value'
                  />
                  <VictoryLine
                    data={state.metrics[metricsSpeed.complexity].complexityMin}
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
        />

        {sampleAgents.length > 0 ? (
          <Stack>
            <table className={styles.sampleAgents}>
              <thead>
                <tr>
                  <th>
                    <Text value='At Frame' color={colors.black40} />
                  </th>
                  <th>
                    <Text value='At Difficulty' color={colors.black40} />
                  </th>
                  <th></th>
                  <th>
                    <Text value='Moves' color={colors.black40} />
                  </th>
                  <th>
                    <Text value='Lineage' color={colors.black40} />
                  </th>
                  <th>
                    <Text value='Complexity' color={colors.black40} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleAgents.map(({ move, fitness, difficulty, agent }) => (
                  <tr key={`${move}-${agent.id}`}>
                    <td>
                      <Text value={`${move.toLocaleString()}`} />
                    </td>
                    <td>
                      <Text value={`${round(difficulty || fitness || 0, 2)}`} />
                    </td>
                    <td>
                      <div
                        style={{
                          backgroundColor: movesColor(
                            agent.moves,
                            defaultCanvasWidth / defaultCellSize,
                          ),
                          height: defaultCellSize * 0.5,
                          width: defaultCellSize * 0.5,
                        }}
                      />
                    </td>
                    <td>
                      <Text value={`${agent.moves}`} />
                    </td>
                    <td>
                      <Text value={`${agent.lineage.toLocaleString()}`} />
                    </td>
                    <td>
                      <Text
                        value={`${
                          agent.genome.nodes.length + agent.genome.edges.length
                        }`}
                      />
                    </td>
                    <td>
                      <Inline align='right'>
                        <Inline spacing={spacing.xsmall}>
                          <Button
                            onClick={handleShowAgentNetwork(agent)}
                            text='Network'
                          />
                          <Button
                            onClick={handleToggleAgentBehavior(agent)}
                            text='Behavior'
                            disabled={
                              !!(
                                showAgentBehavior &&
                                equivalentSamples(showAgentBehavior, agent)
                              )
                            }
                          />
                        </Inline>
                        <Button
                          onClick={handleClearSampleAgent(agent)}
                          text='Trash'
                        />
                      </Inline>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {showAgentBehavior ? (
              <AgentBehavior agent={showAgentBehavior} />
            ) : null}

            {showAgentNetwork ? (
              <GenomeView
                genome={showAgentNetwork.genome}
                onClick={handleShowAgentNetwork(null)}
              />
            ) : null}
          </Stack>
        ) : null}
      </Inline>
    </Stack>
  )
}
