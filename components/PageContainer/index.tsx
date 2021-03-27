import Head from 'next/head'
import Link from 'next/link'
import { ReactNode, useMemo } from 'react'
import { colors } from '../../lib/colors'
import { spacing } from '../../lib/spacing'
import { HideIf } from '../HideIf'
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
        <Stack spacing={spacing.large}>
          <Inset>
            <Inline expand={0} spacing={spacing.xlarge}>
              <Link href='/'>
                <a>
                  <Stack spacing={spacing.small}>
                    <Text value='Aron Jones' styleNumber={90} />
                    <Text
                      value='Founder, Philosopher, Friend'
                      styleNumber={52}
                      color={colors.black60}
                    />
                  </Stack>
                </a>
              </Link>
              <HideIf screen={{ lte: 'small' }}>
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
              </HideIf>
            </Inline>
          </Inset>
          <Inset>{children}</Inset>
        </Stack>
      </div>

      <div className={styles.footer} />
    </div>
  )
}
