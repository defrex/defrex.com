import classnames from 'classnames'
import React, {
  createElement,
  forwardRef,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { spacing } from '../../lib/spacing'
import { Inline } from '../Inline'
import { Inset } from '../Inset'
import { Text } from '../Text'
import styles from './styles.module.scss'

interface ButtonProps {
  element?: 'button' | 'submit' | 'a'
  href?: string
  icon?: ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  text?: string
  disabled?: boolean
}

export const Button = forwardRef(function Button(
  { text, icon, element = 'a', href, onClick, disabled = false }: ButtonProps,
  ref: Ref<HTMLAnchorElement>,
) {
  return createElement(
    element,
    {
      className: classnames(styles.button, disabled ? styles.disabled : null),
      ref,
      href,
      onClick,
    },
    <Inset spacing={spacing.small}>
      <Inline align='center'>
        {icon}
        {text ? (
          <Text value={text} className={classnames(styles.buttonText)} />
        ) : null}
      </Inline>
    </Inset>,
  )
})
