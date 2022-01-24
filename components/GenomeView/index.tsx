import { useEffect, useMemo, useState } from 'react'
import { EdgeData, NodeData } from 'reaflow'
import { colorValues } from '../../lib/colors'
import { Agent } from '../../pages/evolution/lib/Agent'
import { Genome } from '../../pages/evolution/lib/Genome'

interface GenomeViewProps {
  genome: Genome
}

export function GenomeView({ genome }: GenomeViewProps) {
  const [realflow, setRealflow] = useState<typeof import('reaflow') | null>(
    null,
  )

  useEffect(() => {
    if (realflow) return
    import('reaflow').then((realflowImport) => {
      setRealflow(realflowImport)
    })
  }, [realflow, setRealflow])

  const nodes: NodeData[] = useMemo(() => {
    return genome.nodes.map((node, index) => ({
      id: index.toString(),
      text: `${
        index < Agent.inputLabels.length
          ? Agent.inputLabels[index]
          : genome.nodes.length - index <= Agent.outputLabels.length
          ? Agent.outputLabels[genome.nodes.length - index - 1]
          : ''
      } ${node.type} ${node.bias}`,
    }))
  }, [genome])

  const edges: EdgeData[] = useMemo(() => {
    return genome.edges.map((edge, index) => ({
      id: index.toString(),
      from: edge.fromNodeIndex.toString(),
      to: edge.toNodeIndex.toString(),
      text: edge.weight.toString(),
    }))
  }, [genome])

  if (!realflow) {
    return null
  } else {
    return (
      <realflow.Canvas
        fit={true}
        maxWidth={768}
        maxHeight={512}
        nodes={nodes}
        edges={edges}
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
    )
  }
}
