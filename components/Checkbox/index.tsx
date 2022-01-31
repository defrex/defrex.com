import classnames from 'classnames'
import { isString } from 'lodash'
import { ReactNode } from 'react'
import { colors } from '../../lib/colors'
import { spacing } from '../../lib/spacing'
import { Inline } from '../Inline'
import { Text } from '../Text'
import styles from './styles.module.scss'

interface CheckboxProps {
  onClick: () => void
  checked: boolean
  className?: string
  left?: ReactNode
  right?: ReactNode
}

export function Checkbox({
  onClick,
  checked,
  className,
  left,
  right,
}: CheckboxProps) {
  return (
    <div
      onClick={onClick}
      className={classnames(className, styles.checkboxContainer)}
    >
      <Inline spacing={spacing.xsmall}>
        {isString(left) ? (
          <Text value={left} size={12} color={colors.black40} />
        ) : (
          left
        )}
        <div
          className={classnames(
            styles.checkbox,
            checked ? styles.checkboxChecked : null,
          )}
        />
        {isString(right) ? (
          <Text value={right} size={12} color={colors.black40} />
        ) : (
          right
        )}
      </Inline>
    </div>
  )
}
