import classnames from 'classnames'
import { ReactNode } from 'react'
import { Spacing, spacing as spacingValues } from '../../lib/spacing'
import styles from './styles.module.scss'

interface InsetProps {
  children: ReactNode
  spacing?: Spacing
  squeeze?: boolean
  squish?: boolean
  debug?: boolean
  className?: string
}

export function Inset({
  children,
  spacing = spacingValues.medium,
  squeeze = false,
  squish = false,
  debug = false,
  className,
}: InsetProps) {
  return (
    <div
      className={classnames(
        className,
        styles[
          `inset-${spacing}${squish ? '-squish' : ''}${
            squeeze ? '-squeeze' : ''
          }${debug ? '-debug' : ''}`
        ],
      )}
    >
      {children}
    </div>
  )
}
