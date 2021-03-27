import classnames from 'classnames'
import { createElement, ReactNode } from 'react'
import { Color, colors } from '../../lib/colors'
import styles from './styles.module.scss'

export type TextStyleNumber =
  | 20
  | 21
  | 22
  | 30
  | 31
  | 32
  | 40
  | 41
  | 42
  | 50
  | 51
  | 52
  | 60
  | 61
  | 62
  | 70
  | 71
  | 72
  | 80
  | 81
  | 82
  | 90
  | 91
  | 92

interface TextProps {
  className?: string | string[]
  color?: Color
  element?: string
  styleNumber?: TextStyleNumber
  value: string | ReactNode
}

export function Text({
  className,
  color = colors.black80,
  element = 'span',
  styleNumber = 42,
  value,
}: TextProps) {
  return createElement(
    element,
    {
      className: classnames(styles[`text-${styleNumber}-${color}`], className),
    },
    value,
  )
}
