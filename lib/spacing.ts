export const spacing = {
  none: 'none' as const,
  xxsmall: 'xxsmall' as const,
  xsmall: 'xsmall' as const,
  small: 'small' as const,
  medium: 'medium' as const,
  large: 'large' as const,
  xlarge: 'xlarge' as const,
  xxlarge: 'xxlarge' as const,
  xxxlarge: 'xxxlarge' as const,
}

export type Spacing = typeof spacing[keyof typeof spacing]
