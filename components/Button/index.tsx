import classnames from 'classnames'
import React, {
  createElement,
  forwardRef,
  MouseEvent,
  ReactNode,
  Ref,
} from 'react'
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
  type?: 'primary' | 'secondary' | 'plain'
}

export const Button = forwardRef(function Button(
  { text, icon, type = 'primary', element = 'a', href, onClick }: ButtonProps,
  ref: Ref<HTMLAnchorElement>,
) {
  return createElement(
    element,
    {
      className: classnames(styles.button, styles[type]),
      ref,
      href,
      onClick,
    },
    <Inset>
      <Inline align='center'>
        {icon}
        {text ? (
          <Text
            value={text}
            className={classnames(styles.buttonText, styles[`${type}Text`])}
          />
        ) : null}
      </Inline>
    </Inset>,
  )
})
