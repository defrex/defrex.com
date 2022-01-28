import { last } from 'lodash'
import { useCallback, useState } from 'react'
import { VictoryChart, VictoryLine } from 'victory'
import { Button } from '../../components/Button'
import { Inline } from '../../components/Inline'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors, colorValues } from '../../lib/colors'
import { spacing } from '../../lib/spacing'
import { victoryChartTheme } from '../../lib/victoryChartTheme'
import { AgentBehavior } from './components/AgentBehavior'
import { FrameBoard } from './components/FrameBoard'
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
  metricsWith,
  movesColor,
} from './lib/getNextFrameState'
import styles from './styles.module.scss'

interface EvolutionProps {}

type AgentSample = { move: number; fitness: number; agent: Agent }

function bestAgent(agents: Agent[]): Agent {
  return agents.reduce((best, agent) => {
    if (agent.moves > best.moves) {
      return agent
    }
    return best
  }, agents[0])
}

export default function Evolution(_props: EvolutionProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [sampleAgents, setSampleAgents] = useState<AgentSample[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAgentNetwork, setShowAgentNetwork] = useState<Agent | null>(null)
  const [metricsVisible, setMetricsVisible] = useState({
    population: false,
    lineage: false,
    difficulty: true,
  })

  const handleToggleMetric = useCallback(
    (metric: 'population' | 'lineage' | 'difficulty') => () => {
      setMetricsVisible({
        ...metricsVisible,
        [metric]: !metricsVisible[metric],
      })
    },
    [metricsVisible, setMetricsVisible],
  )

  const handleSampleAgent = useCallback(
    (state: FrameState) => () => {
      setSampleAgents((sampleAgents) => {
        const nextSampleAgent = bestAgent(state.agents)
        console.log('Sample Agent', nextSampleAgent)

        return [
          ...sampleAgents,
          {
            move: state.move,
            fitness: last(metricsWith(state.metrics, 'fitness'))?.fitness || 0,
            // fitness: fitnessFromDifficulty(
            //   last(state.history)?.difficulty || 0,
            // ),
            agent: nextSampleAgent,
          },
        ]
      })
    },
    [setSampleAgents],
  )

  const handleSelectAgent = useCallback(
    (selection: Agent | null) => () => {
      setSelectedAgent(null)
      requestAnimationFrame(() => setSelectedAgent(selection))
    },
    [setSelectedAgent],
  )

  const handleSelectAgentNetwork = useCallback(
    (selection: Agent | null) => () => {
      setShowAgentNetwork(selection)
    },
    [setShowAgentNetwork],
  )

  const handleToggleHowItWorks = useCallback(() => {
    setShowHowItWorks(!showHowItWorks)
  }, [setShowHowItWorks, showHowItWorks])

  return (
    <Stack spacing={spacing.xlarge}>
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
          width={defaultCanvasWidth}
          height={defaultCanvasHeight}
          renderControl={(state) => (
            <Inline align='right'>
              <Button onClick={handleSampleAgent(state)} text='Take Sample' />
            </Inline>
          )}
          renderChildren={(state: FrameState) => (
            <Stack spacing={spacing.large}>
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
          )}
        />

        {sampleAgents.length > 0 ? (
          <Stack>
            <table className={styles.sampleAgents}>
              <thead>
                <tr>
                  <th>
                    <Text value='At Move' color={colors.black40} />
                  </th>
                  <th>
                    <Text value='At Fitness' color={colors.black40} />
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
              </thead>
              <tbody>
                {sampleAgents.map(({ move, fitness, agent }) => (
                  <tr
                    key={`${move}-${agent.id}`}
                    className={
                      selectedAgent === agent ? styles.selectedAgent : undefined
                    }
                  >
                    <td>
                      <Text value={`${move}`} />
                    </td>
                    <td>
                      <Text value={`${fitness}`} />
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
                      <Text value={`${agent.lineage}`} />
                    </td>
                    <td>
                      <Text value={`${agent.genome.nodes.length}`} />
                    </td>
                    <td>
                      <Text value={`${agent.genome.edges.length}`} />
                    </td>
                    <td>
                      <Inline align='right'>
                        <Button
                          onClick={handleSelectAgentNetwork(agent)}
                          text='Network'
                        />
                        <Button
                          onClick={handleSelectAgent(agent)}
                          text='Behavior'
                        />
                      </Inline>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedAgent ? <AgentBehavior agent={selectedAgent} /> : null}

            {showAgentNetwork ? (
              <GenomeView
                genome={showAgentNetwork.genome}
                onClick={handleSelectAgentNetwork(null)}
              />
            ) : null}
          </Stack>
        ) : null}
      </Inline>
    </Stack>
  )
}
