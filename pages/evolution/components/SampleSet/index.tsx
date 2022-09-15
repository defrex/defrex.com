import { some } from 'lodash'
import { useCallback, useState } from 'react'
import { Button } from '../../../../components/Button'
import { Inline } from '../../../../components/Inline'
import { Stack } from '../../../../components/Stack'
import { Text } from '../../../../components/Text'
import { colors } from '../../../../lib/colors'
import { spacing } from '../../../../lib/spacing'
import { Agent } from '../../lib/Agent'
import { agentColor } from '../../lib/agentColor'
import { AgentBehavior } from '../AgentBehavior'
import { Position } from '../Board/lib/BoardState'
import {
  canvasWidth,
  cellSize,
  DefaultFrameState,
  SetState,
} from '../FrameBoard'
import { PerceptronView } from '../PerceptronView'
import { SampleFrameState } from '../SampleBoard'
import styles from './styles.module.scss'

type AgentSample<TAgent extends Agent<any, any>> = {
  move: number
  fitness?: number
  agent: TAgent
}

interface SampleableFrameState extends DefaultFrameState {
  autoSample: boolean
}

interface SampleSetState<
  TAgent extends Agent<any, any>,
  TFrameState extends SampleableFrameState,
> {
  clearSampleAgent: (agent: TAgent) => () => void
  onFrame: (state: TFrameState) => void
  sampleAgents: AgentSample<TAgent>[]
  setShowAgentNetwork: (agent: TAgent | null) => () => void
  showAgentBehavior: TAgent | null
  showAgentNetwork: TAgent | null
  takeSampleAgent: (state: TFrameState) => () => void
  toggleAgentBehavior: (agent: TAgent | null) => () => void
  toggleAutoSample: (setState: SetState<TFrameState>) => () => void
}

export function useSampleSetState<
  TAgent extends Agent<any, any>,
  TFrameState extends SampleableFrameState,
>(): SampleSetState<TAgent, TFrameState> {
  const [sampleAgents, setSampleAgents] = useState<AgentSample<TAgent>[]>([])
  const [showAgentBehavior, setShowAgentBehavior] = useState<TAgent | null>(
    null,
  )
  const [showAgentNetwork, setShowAgentNetwork] = useState<TAgent | null>(null)

  const toggleAutoSample = useCallback(
    (setState: SetState<TFrameState>) => () => {
      setState((state) => ({ ...state, autoSample: !state.autoSample }))
    },
    [],
  )

  const takeSampleAgent = useCallback(
    (state: TFrameState) => () => {
      setSampleAgents((sampleAgents) => {
        const nextSampleAgent = state.agents.reduce((best: any, agent) => {
          if (
            !some(sampleAgents, (sampleAgent) =>
              equivalentSamples(agent, sampleAgent.agent),
            ) &&
            (best === undefined || agent.moves > best.moves)
          ) {
            return agent
          }
          return best
        }, undefined)

        if (!nextSampleAgent) {
          console.log('No Samples Left!')
          return sampleAgents
        }

        console.log('Sample Agent', nextSampleAgent)

        return [
          ...sampleAgents,
          {
            move: state.move,
            agent: nextSampleAgent,
          },
        ]
      })
    },
    [setSampleAgents],
  )

  const onFrame = useCallback((state: TFrameState): void => {
    const sampleRate = state.move < 100000 ? 10000 : 100000
    if (state.autoSample && state.move % sampleRate === 0) {
      requestAnimationFrame(takeSampleAgent(state))
    }
  }, [])

  const clearSampleAgent = useCallback(
    (agent: TAgent) => () => {
      setSampleAgents((sampleAgents) => {
        return sampleAgents.filter(
          (sample) => !equivalentSamples(sample.agent, agent),
        )
      })
    },
    [setSampleAgents],
  )

  const toggleAgentBehavior = useCallback(
    (selection: TAgent | null) => () => {
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

  const currySetShowAgentNetwork = useCallback(
    (agent: TAgent | null) => () => {
      setShowAgentNetwork(agent)
    },
    [setShowAgentNetwork],
  )

  return {
    clearSampleAgent,
    onFrame,
    sampleAgents,
    setShowAgentNetwork: currySetShowAgentNetwork,
    showAgentBehavior,
    showAgentNetwork,
    takeSampleAgent,
    toggleAgentBehavior,
    toggleAutoSample,
  }
}

interface SampleSetProps<
  TAgent extends Agent<any, any>,
  TFrameState extends SampleableFrameState,
> {
  state: SampleSetState<TAgent, TFrameState>
  initSampleFrameState: (
    agent: TAgent,
    redPositions: Position[],
    state?: SampleFrameState<TAgent>,
  ) => SampleFrameState<TAgent>
  getNextSampleFrameState: (
    state: SampleFrameState<TAgent>,
  ) => SampleFrameState<TAgent>
}

export function SampleSet<
  TAgent extends Agent<any, any>,
  TFrameState extends SampleableFrameState,
>({
  state,
  initSampleFrameState,
  getNextSampleFrameState,
}: SampleSetProps<TAgent, TFrameState>) {
  return state.sampleAgents.length > 0 ? (
    <Stack>
      <table className={styles.sampleAgents}>
        <thead>
          <tr>
            <th>
              <Text value='At Frame' color={colors.black40} />
            </th>
            <th></th>
            <th>
              <Text value='Moves' color={colors.black40} />
            </th>
            <th>
              <Text value='Complexity' color={colors.black40} />
            </th>
          </tr>
        </thead>
        <tbody>
          {state.sampleAgents.map(({ move, fitness, agent }) => (
            <tr key={`${move}-${agent.id}`}>
              <td>
                <Text value={`${move.toLocaleString()}`} />
              </td>
              <td>
                <div
                  style={{
                    backgroundColor: agentColor(
                      agent.moves,
                      canvasWidth / cellSize,
                    ),
                    height: cellSize * 0.5,
                    width: cellSize * 0.5,
                  }}
                />
              </td>
              <td>
                <Text value={`${agent.moves}`} />
              </td>
              <td>
                <Text
                  value={`${
                    agent.perceptron.nodes.length +
                    agent.perceptron.edges.length
                  }`}
                />
              </td>
              <td>
                <Inline align='right'>
                  <Inline spacing={spacing.xsmall}>
                    <Button
                      onClick={state.setShowAgentNetwork(agent)}
                      text='Network'
                    />
                    <Button
                      onClick={state.toggleAgentBehavior(agent)}
                      text='Behavior'
                      disabled={
                        !!(
                          state.showAgentBehavior &&
                          equivalentSamples(state.showAgentBehavior, agent)
                        )
                      }
                    />
                  </Inline>
                  <Button
                    onClick={state.clearSampleAgent(agent)}
                    text='Trash'
                  />
                </Inline>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {state.showAgentBehavior ? (
        <AgentBehavior<TAgent>
          agent={state.showAgentBehavior}
          initSampleFrameState={initSampleFrameState}
          getNextSampleFrameState={getNextSampleFrameState}
        />
      ) : null}

      {state.showAgentNetwork ? (
        <PerceptronView
          perceptron={state.showAgentNetwork.perceptron}
          onClick={state.setShowAgentNetwork(null)}
        />
      ) : null}
    </Stack>
  ) : null
}

function equivalentSamples(
  agent: Agent<any, any>,
  otherAgent: Agent<any, any>,
): boolean {
  return otherAgent.id === agent.id && otherAgent.moves === agent.moves
}
