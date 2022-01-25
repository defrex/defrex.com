import { assign } from 'lodash'
import { colorValues } from './colors'

const fgMainColor = colorValues.black40
const grey = colorValues.black60
const colorScale = [
  colorValues.black10,
  colorValues.black20,
  colorValues.black30,
  colorValues.black40,
  colorValues.black50,
  colorValues.black60,
  colorValues.black70,
  colorValues.black80,
  colorValues.black90,
]
// *
// * Typography
// *
const sansSerif =
  "'Open Sans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
const letterSpacing = 'normal'
const fontSize = 10
// *
// * Layout
// *
const baseProps = {
  width: 450,
  height: 300,
  padding: 50,
  colorScale,
}
// *
// * Labels
// *
const baseLabelStyles = {
  fontFamily: sansSerif,
  fontSize,
  letterSpacing,
  padding: 10,
  fill: fgMainColor,
  stroke: 'transparent',
}

const centeredLabelStyles = assign({ textAnchor: 'middle' }, baseLabelStyles)
// *
// * Strokes
// *
const strokeLinecap = 'round'
const strokeLinejoin = 'round'

export const victoryChartTheme = {
  area: assign(
    {
      style: {
        data: {
          fill: fgMainColor,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  axis: assign(
    {
      style: {
        axis: {
          fill: 'transparent',
          stroke: fgMainColor,
          strokeWidth: 1,
          strokeLinecap,
          strokeLinejoin,
        },
        axisLabel: assign({}, centeredLabelStyles, {
          padding: 25,
        }),
        grid: {
          fill: 'none',
          stroke: 'none',
          pointerEvents: 'painted',
        },
        ticks: {
          fill: 'transparent',
          size: 1,
          stroke: 'transparent',
        },
        tickLabels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  bar: assign(
    {
      style: {
        data: {
          fill: fgMainColor,
          padding: 8,
          strokeWidth: 0,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  boxplot: assign(
    {
      style: {
        max: { padding: 8, stroke: fgMainColor, strokeWidth: 1 },
        maxLabels: assign({}, baseLabelStyles, { padding: 3 }),
        median: { padding: 8, stroke: fgMainColor, strokeWidth: 1 },
        medianLabels: assign({}, baseLabelStyles, { padding: 3 }),
        min: { padding: 8, stroke: fgMainColor, strokeWidth: 1 },
        minLabels: assign({}, baseLabelStyles, { padding: 3 }),
        q1: { padding: 8, fill: grey },
        q1Labels: assign({}, baseLabelStyles, { padding: 3 }),
        q3: { padding: 8, fill: grey },
        q3Labels: assign({}, baseLabelStyles, { padding: 3 }),
      },
      boxWidth: 20,
    },
    baseProps,
  ),
  candlestick: assign(
    {
      style: {
        data: {
          stroke: fgMainColor,
          strokeWidth: 1,
        },
        labels: assign({}, baseLabelStyles, { padding: 5 }),
      },
      candleColors: {
        positive: '#ffffff',
        negative: fgMainColor,
      },
    },
    baseProps,
  ),
  chart: baseProps,
  errorbar: assign(
    {
      borderWidth: 8,
      style: {
        data: {
          fill: 'transparent',
          stroke: fgMainColor,
          strokeWidth: 2,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  group: assign(
    {
      colorScale,
    },
    baseProps,
  ),
  histogram: assign(
    {
      style: {
        data: {
          fill: grey,
          stroke: fgMainColor,
          strokeWidth: 2,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  legend: {
    colorScale,
    gutter: 10,
    orientation: 'vertical',
    titleOrientation: 'top',
    style: {
      data: {
        type: 'circle',
      },
      labels: baseLabelStyles,
      title: assign({}, baseLabelStyles, { padding: 5 }),
    },
  },
  line: assign(
    {
      style: {
        data: {
          fill: 'transparent',
          stroke: fgMainColor,
          strokeWidth: 2,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  pie: {
    style: {
      data: {
        padding: 10,
        stroke: 'transparent',
        strokeWidth: 1,
      },
      labels: assign({}, baseLabelStyles, { padding: 20 }),
    },
    colorScale,
    width: 400,
    height: 400,
    padding: 50,
  },
  scatter: assign(
    {
      style: {
        data: {
          fill: fgMainColor,
          stroke: 'transparent',
          strokeWidth: 0,
        },
        labels: baseLabelStyles,
      },
    },
    baseProps,
  ),
  stack: assign(
    {
      colorScale,
    },
    baseProps,
  ),
  tooltip: {
    style: assign({}, baseLabelStyles, { padding: 0, pointerEvents: 'none' }),
    flyoutStyle: {
      stroke: fgMainColor,
      strokeWidth: 1,
      fill: '#f0f0f0',
      pointerEvents: 'none',
    },
    flyoutPadding: 5,
    cornerRadius: 5,
    pointerLength: 10,
  },
  voronoi: assign(
    {
      style: {
        data: {
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
        },
        labels: assign({}, baseLabelStyles, {
          padding: 5,
          pointerEvents: 'none',
        }),
        flyout: {
          stroke: fgMainColor,
          strokeWidth: 1,
          fill: '#f0f0f0',
          pointerEvents: 'none',
        },
      },
    },
    baseProps,
  ),
}
