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
                  <Stack>
                    <Text value='Aron Jones' size={32} color={colors.black10} />
                    <Text
                      value='Founder, Philosopher, Friend'
                      size={16}
                      color={colors.black30}
                    />
                  </Stack>
                </a>
              </Link>
              <HideIf screen={{ lte: 'small' }}>
                <Inline spacing={spacing.large}>
                  <a href='https://github.com/defrex'>
                    <Text value='GitHub' color={colors.black10} />
                  </a>
                  <a href='https://twitter.com/defrex'>
                    <Text value='Twitter' color={colors.black10} />
                  </a>
                  <a href='https://www.linkedin.com/in/aronjones/'>
                    <Text value='LinkedIn' color={colors.black10} />
                  </a>
                </Inline>
              </HideIf>
            </Inline>
          </Inset>
          {children}
        </Stack>
      </div>

      <div className={styles.footer} />
    </div>
  )
}
