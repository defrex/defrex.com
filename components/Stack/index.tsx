import { Children, ReactNode, useMemo } from 'react'
import { Spacing, spacing as spacingValues } from '../../lib/spacing'
import styles from './styles.module.scss'

interface StackProps {
  children: ReactNode
  spacing?: Spacing
  className?: string
  debug?: boolean
}

export function Stack({
  children,
  spacing = spacingValues.medium,
  className,
  debug,
}: StackProps) {
  const realChildren = useMemo(
    () => Children.toArray(children).filter((child) => !!child),
    [children],
  )
  return (
    <div className={className}>
      {realChildren.map((child, index) => (
        <div
          key={index}
          className={
            realChildren.length - 1 === index
              ? undefined
              : styles[`stack-${spacing}${debug ? '-debug' : ''}`]
          }
        >
          {child}
        </div>
      ))}
    </div>
  )
}
