import { useEffect, useMemo, useState } from 'react'
import { EdgeData, NodeData } from 'reaflow'
import { colorValues } from '../../lib/colors'
import { Genome } from '../../pages/evolution/lib/Genome'

interface GenomeViewProps {
  genome: Genome
}

export function GenomeView({ genome }: GenomeViewProps) {
  const [realflow, setRealflow] = useState<
    | typeof import('/Users/defrex/Code/defrex.com/node_modules/reaflow/dist/index')
    | null
  >(null)

  useEffect(() => {
    if (realflow) return
    import('reaflow').then((realflowImport) => {
      setRealflow(realflowImport)
    })
  }, [realflow, setRealflow])

  const nodes: NodeData[] = useMemo(() => {
    return genome.nodes.map((node, index) => ({
      id: index.toString(),
      text: `${node.type}\n${node.bias}`,
    }))
  }, [genome])

  const edges: EdgeData[] = useMemo(() => {
    return genome.edges.map((edge, index) => ({
      id: index.toString(),
      from: edge.fromNodeIndex.toString(),
      to: edge.toNodeIndex.toString(),
      text: edge.weight,
    }))
  }, [genome])

  if (!realflow) {
    return null
  } else {
    return (
      <realflow.Canvas
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
