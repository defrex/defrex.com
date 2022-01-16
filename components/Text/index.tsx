import classnames from 'classnames'
import { createElement, ReactNode } from 'react'
import { Color } from '../../lib/colors'
import styles from './styles.module.scss'

type TextWeights = 400 | 700
type TextSizes = 12 | 13 | 14 | 16 | 20 | 24 | 32

interface TextProps {
  className?: string | string[]
  color?: Color | 'inherit'
  element?: string
  size?: TextSizes
  uppercase?: boolean
  value: string | ReactNode
  weight?: TextWeights
}

export function Text({
  className,
  color = 'inherit',
  element = 'span',
  size = 14,
  uppercase = false,
  value,
  weight = 400,
}: TextProps) {
  return createElement(
    element,
    {
      className: classnames(
        styles[`text-${size}px-${weight}-${color}`],
        uppercase ? styles.uppercase : null,
        className,
      ),
    },
    value,
  )
}
