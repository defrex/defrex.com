import { ReactNode } from 'react'
import {
  classNameForScreenConditions,
  ScreenConditions,
} from '../../lib/screens'
import styles from './styles.module.scss'

interface HideIfScreenProps {
  children: ReactNode
  screen: ScreenConditions
}

export function HideIf({ children, screen }: HideIfScreenProps) {
  return (
    <div className={styles[classNameForScreenConditions('hide', screen)]}>
      {children}
    </div>
  )
}
