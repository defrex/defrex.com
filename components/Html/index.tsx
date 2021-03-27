import styles from './styles.module.scss'

interface HtmlProps {
  html: string
}

export function Html({ html }: HtmlProps) {
  return (
    <div className={styles.html} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
