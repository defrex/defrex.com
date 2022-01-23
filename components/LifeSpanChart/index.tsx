import { useMemo } from 'react'
import { AxisOptions, Chart, UserSerie } from 'react-charts'

interface LifeSpanChartProps {
  lifeSpans: Record<number, number>
}

type Datum = {
  agents: number
  moves: number
}

/**
 * NOT IN USE
 */
export default function LifeSpanChart({ lifeSpans }: LifeSpanChartProps) {
  const primaryAxis = useMemo(
    (): AxisOptions<Datum> => ({
      getValue: (datum) => datum.agents,
    }),
    [],
  )

  const secondaryAxes = useMemo(
    (): AxisOptions<Datum>[] => [
      {
        getValue: (datum) => datum.moves,
      },
    ],
    [],
  )

  const data: UserSerie<Datum>[] = useMemo(
    () => [
      {
        label: 'Life spans',
        data: Object.entries(lifeSpans).map(([moves, count]) => ({
          agents: count,
          moves: parseInt(moves, 10),
        })),
      },
    ],
    [lifeSpans],
  )
  console.log('rendering chart')
  return (
    <Chart
      options={{
        primaryAxis,
        secondaryAxes,
        data,
      }}
    />
  )
}
