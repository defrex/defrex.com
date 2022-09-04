import { round } from 'lodash'
import { MouseEvent, useEffect, useMemo, useState } from 'react'
import { EdgeData, NodeData } from 'reaflow'
import { colorValues } from '../../../../lib/colors'
import { Agent } from '../../lib/Agent'
import {
  Perceptron,
  getSquashName,
} from '../../../../lib/perceptron/perceptron'
import styles from './styles.module.scss'

interface GenomeViewProps {
  genome: Perceptron
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
}

export function GenomeView({ genome, onClick }: GenomeViewProps) {
  const [realflow, setRealflow] = useState<typeof import('reaflow') | null>(
    null,
  )

  useEffect(() => {
    if (realflow) return
    import('reaflow').then((realflowImport) => {
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
    return genome.nodes.map((node, index) => ({
      id: index.toString(),
      text: `${
        index < Agent.inputLabels.length
          ? `${Agent.inputLabels[index]}`
          : index >= genome.nodes.length - Agent.outputLabels.length
          ? `${
              Agent.outputLabels[
                index - (genome.nodes.length - Agent.outputLabels.length)
              ]
            }`
          : node.type === 'hidden'
          ? ''
          : node.type
      } ${getSquashName(node.squash)}(${round(node.bias, 2)})`,
    }))
  }, [genome])

  const edges: EdgeData[] = useMemo(() => {
    return genome.edges.map((edge, index) => ({
      id: index.toString(),
      from: edge.fromNodeIndex.toString(),
      to: edge.toNodeIndex.toString(),
      text: round(edge.weight, 2).toString(),
    }))
  }, [genome])

  if (!realflow) {
    return null
  } else {
    return (
      <div className={styles.genomeView} onClick={onClick}>
        <realflow.Canvas
          fit={true}
          // maxWidth={768}
          // maxHeight={768}
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
