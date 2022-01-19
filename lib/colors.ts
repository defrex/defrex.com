export const colors = {
  brand: 'brand' as const,
  transparent: 'transparent' as const,
  white: 'white' as const,
  overlay: 'overlay' as const,
  black10: 'black10' as const,
  black20: 'black20' as const,
  black30: 'black30' as const,
  black40: 'black40' as const,
  black50: 'black50' as const,
  black60: 'black60' as const,
  black70: 'black70' as const,
  black80: 'black80' as const,
  black90: 'black90' as const,
}

export const colorValues = {
  brand: '#da87ed',
  green60: '#119956',
  blue60: '#03aacb',
  red60: '#bf2934',
  black10: '#fbfcfc',
  black20: '#efefef',
  black30: '#d3d3d3',
  black40: '#999999',
  black50: '#7a7a7a',
  black60: '#616161',
  black70: '#494949',
  black80: '#313131',
  black90: '#292929',
  transparent: 'rgba(0,0,0,1)',
}

export type Color = typeof colors[keyof typeof colors]
