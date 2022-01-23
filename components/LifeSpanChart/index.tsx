import { max, size } from 'lodash'
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
 * react-charts not installed
 */
export default function LifeSpanChart({ lifeSpans }: LifeSpanChartProps) {
  const primaryAxis = useMemo(
    (): AxisOptions<Datum> => ({
      scaleType: 'linear',
      getValue: (datum) => datum.agents,
      min: 0,
      max: max(Object.values(lifeSpans)),
    }),
    [lifeSpans],
  )

  const secondaryAxes = useMemo(
    (): AxisOptions<Datum> => ({
      scaleType: 'linear',
      getValue: (datum) => datum.moves,
      min: 0,
      max: max(Object.keys(lifeSpans).map(parseInt)),
    }),
    [lifeSpans],
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

  return size(lifeSpans) > 0 ? (
    <Chart
      style={{ height: 256 }}
      options={{
        primaryAxis,
        secondaryAxes: [secondaryAxes],
        data,
        initialHeight: 256,
      }}
    />
  ) : null
}
