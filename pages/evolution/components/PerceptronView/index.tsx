import { round } from 'lodash'
import { MouseEvent, useEffect, useMemo, useState } from 'react'
import { EdgeData, NodeData } from 'reaflow'
import { colorValues } from '../../../../lib/colors'
import { NeuroevolutionAgent } from '../../neuroevolution/lib/NeuroevolutionAgent'
import { Perceptron, getSquashName } from '../../lib/perceptron/perceptron'
import styles from './styles.module.scss'

interface PerceptronViewProps {
  perceptron: Perceptron
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
}

export function PerceptronView({ perceptron, onClick }: PerceptronViewProps) {
  const [realflow, setRealflow] = useState<typeof import('reaflow') | null>(
    null,
  )

  useEffect(() => {
    if (realflow) return
    void import('reaflow').then((realflowImport) => {
      setRealflow(realflowImport)
    })
  }, [realflow, setRealflow])

  useEffect(() => {
    const prevScrollY = window.scrollY
    window.scroll(0, 0)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.scroll(0, prevScrollY)
      document.documentElement.style.overflow = 'initial'
    }
  }, [])

  const nodes: NodeData[] = useMemo(() => {
    return perceptron.nodes.map((node, index) => ({
      id: index.toString(),
      text: `${
        index < NeuroevolutionAgent.inputLabels.length
          ? `${NeuroevolutionAgent.inputLabels[index]}`
          : index >=
            perceptron.nodes.length - NeuroevolutionAgent.outputLabels.length
          ? `${
              NeuroevolutionAgent.outputLabels[
                index -
                  (perceptron.nodes.length -
                    NeuroevolutionAgent.outputLabels.length)
              ]
            }`
          : node.type === 'hidden'
          ? ''
          : node.type
      } ${getSquashName(node.squash)}(${round(node.bias, 2)})`,
    }))
  }, [perceptron])

  const edges: EdgeData[] = useMemo(() => {
    return perceptron.edges.map((edge, index) => ({
      id: index.toString(),
      from: edge.fromNodeIndex.toString(),
      to: edge.toNodeIndex.toString(),
      text: round(edge.weight, 2).toString(),
    }))
  }, [perceptron])

  if (!realflow) {
    return null
  } else {
    return (
      <div className={styles.genomeView} onClick={onClick}>
        <realflow.Canvas
          fit={true}
          nodes={nodes}
          edges={edges}
          disabled={true}
          animated={false}
          node={
            <realflow.Node
              style={{
                fill: colorValues.black70,
                strokeWidth: 0,
              }}
              label={<realflow.Label style={{ fill: colorValues.black10 }} />}
            />
          }
          edge={
            <realflow.Edge
              style={{
                stroke: colorValues.black60,
              }}
            />
          }
          arrow={<realflow.MarkerArrow style={{ fill: colorValues.black60 }} />}
        />
      </div>
    )
  }
}
