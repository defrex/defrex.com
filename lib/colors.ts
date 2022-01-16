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

export type Color = typeof colors[keyof typeof colors]
