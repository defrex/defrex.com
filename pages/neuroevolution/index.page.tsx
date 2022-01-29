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
  const [showAgentBehavior, setShowAgentBehavior] = useState<Agent | null>(null)
  const [showAgentNetwork, setShowAgentNetwork] = useState<Agent | null>(null)
  const [metricsVisible, setMetricsVisible] = useState({
    population: false,
    lineage: false,
    difficulty: false,
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
            fitness: last(state.metrics.fitness)?.value || 0,
            agent: nextSampleAgent,
          },
        ]
      })
    },
    [setSampleAgents],
  )

  const handleShowAgentBehavior = useCallback(
    (selection: Agent | null) => () => {
      setShowAgentBehavior(null)
      requestAnimationFrame(() => setShowAgentBehavior(selection))
    },
    [setShowAgentBehavior],
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
                {metricsVisible.difficulty ? (
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryLine
                      data={state.metrics.difficulty}
                      x='move'
                      y='value'
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
                {metricsVisible.population ? (
                  <VictoryChart theme={victoryChartTheme} height={200}>
                    <VictoryLine
                      style={{
                        data: { stroke: colorValues.blue60, strokeWidth: 1 },
                      }}
                      data={state.metrics.population}
                      x='move'
                      y='value'
                    />
                    <VictoryLine
                      style={{
                        data: { stroke: colorValues.red60, strokeWidth: 1 },
                      }}
                      data={state.metrics.killers}
                      x='move'
                      y='value'
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
                      data={state.metrics.lineageMax}
                      x='move'
                      y='value'
                    />
                    <VictoryLine
                      data={state.metrics.lineageMin}
                      x='move'
                      y='value'
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
                      showAgentBehavior?.id === agent.id &&
                      showAgentBehavior?.move === agent.move
                        ? styles.selectedAgent
                        : undefined
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
                          onClick={handleShowAgentNetwork(agent)}
                          text='Network'
                        />
                        <Button
                          onClick={handleShowAgentBehavior(agent)}
                          text='Behavior'
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
