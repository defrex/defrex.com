import classnames from 'classnames'
import { Children, ReactNode, useCallback, useMemo } from 'react'
import {
  classNameForScreenConditions,
  ScreenConditions,
} from '../../lib/screens'
import { Spacing, spacing as spacingValues } from '../../lib/spacing'
import styles from './styles.module.scss'

export type HorizontalAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'bottom' | 'center' | 'top'

interface InlineProps {
  align?: HorizontalAlignment
  children: ReactNode
  className?: string
  debug?: boolean
  expand?: number | 'all'
  fill?: boolean
  shrink?: number
  spacing?: Spacing
  verticalAlign?: VerticalAlignment
  verticalIf?: ScreenConditions & { reverse?: boolean }
}

export function Inline({
  align = 'left',
  children,
  className,
  debug,
  expand,
  fill = false,
  shrink,
  spacing = spacingValues.medium,
  verticalAlign = 'center',
  verticalIf,
}: InlineProps) {
  const realChildren = useMemo(
    () => Children.toArray(children).filter((child) => child !== null),
    [children],
  )

  const childClassName = useCallback(
    (index: number) => {
      return classnames(
        index + 1 < realChildren.length
          ? styles[`inline-item-${spacing}${debug ? '-debug' : ''}`]
          : null,
        expand === 'all' ||
          expand === index ||
          (expand && expand < 0 && realChildren.length + expand === index)
          ? styles['expanded-item']
          : null,
        shrink === index ? styles['shrunk-item'] : null,
        styles[classNameForScreenConditions('vertical-item', verticalIf)],
      )
    },
    [realChildren, spacing, debug, expand, shrink, verticalIf],
  )

  return (
    <div
      className={classnames(
        styles['inline-container'],
        fill ? styles.fill : null,
        align === 'center' ? styles.center : null,
        align === 'right' ? styles.right : null,
        verticalAlign === 'top' ? styles.top : null,
        verticalAlign === 'bottom' ? styles.bottom : null,
        styles[
          classNameForScreenConditions(
            verticalIf?.reverse ? 'vertical-reverse' : 'vertical',
            verticalIf,
          )
        ],
        className,
      )}
    >
      {realChildren.map((child, index) => (
        <div key={index} className={childClassName(index)}>
          {child}
        </div>
      ))}
    </div>
  )
}
