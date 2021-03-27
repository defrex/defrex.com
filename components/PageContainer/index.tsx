import Head from 'next/head'
import Link from 'next/link'
import { ReactNode, useMemo } from 'react'
import { spacing } from '../../lib/spacing'
import { Inline } from '../Inline'
import { Inset } from '../Inset'
import { Stack } from '../Stack'
import { Text } from '../Text'
import styles from './styles.module.scss'

interface PageContainerProps {
  children: ReactNode
  title?: string
}

export function PageContainer({ children, title }: PageContainerProps) {
  const realTitle = useMemo(
    () => (title ? `${title} - Aron Jones` : 'Aron Jones'),
    [title],
  )

  return (
    <div>
      <Head>
        <title>{realTitle}</title>
      </Head>

      <div className={styles.container}>
        <Stack>
          <Inset>
            <Inline expand={0} spacing={spacing.xlarge}>
              <Link href='/'>
                <a>
                  <Stack>
                    <Text value='Aron Jones' styleNumber={90} />
                    <Text
                      value='Founder, Philosopher, Friend'
                      styleNumber={62}
                    />
                  </Stack>
                </a>
              </Link>
              <Inline spacing={spacing.large}>
                <a href='https://www.treasurecard.com?utm_source=defrex.com&utm_medium=referer&utm_campaign=top-nav'>
                  <Text value='💎 Treasure' styleNumber={51} />
                </a>
                <a href='https://github.com/defrex'>
                  <Text value='GitHub' styleNumber={51} />
                </a>
                <a href='https://twitter.com/defrex'>
                  <Text value='Twitter' styleNumber={51} />
                </a>
                <a href='https://www.linkedin.com/in/aronjones/'>
                  <Text value='LinkedIn' styleNumber={51} />
                </a>
              </Inline>
            </Inline>
          </Inset>
          <Inset>{children}</Inset>
        </Stack>
      </div>

      <div className={styles.footer} />
    </div>
  )
}
