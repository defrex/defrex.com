import fs from 'fs'
import { orderBy } from 'lodash'
import Link from 'next/link'
import path from 'path'
import { Post } from '../@types/content'
import { PageContainer } from '../components/PageContainer'
import { Stack } from '../components/Stack'
import { Text } from '../components/Text'
import { spacing } from '../lib/spacing'

interface IndexProps {
  posts: Post[]
}

export default function Index({ posts }: IndexProps) {
  return (
    <PageContainer>
      <Stack spacing={spacing.xlarge}>
        <Stack>
          <Text value='Experiments' size={20} />
          <Link href='/evolution/normativity'>
            <a>
              <Text value='Normativity' />
            </a>
          </Link>
          <Link href='/evolution/neuroevolution'>
            <a>
              <Text value='Neuroevolution' />
            </a>
          </Link>
        </Stack>

        <Stack>
          <Text value='Articles' size={20} />
          {orderBy(posts, ['attributes.date'], ['desc']).map((post, index) => (
            <Link href={`/posts/${post.slug}`} key={index}>
              <a>
                <Text value={post.attributes.title} />
              </a>
            </Link>
          ))}
        </Stack>
      </Stack>
    </PageContainer>
  )
}

export async function getStaticProps(): Promise<{ props: { posts: Post[] } }> {
  const markdownFiles = fs.readdirSync(
    path.join(process.cwd(), 'content/posts'),
  )

  const posts: Post[] = await Promise.all(
    markdownFiles.map(async (path: string) => {
      const markdown = await import(`../content/posts/${path}`)
      return { ...markdown, slug: path.substring(0, path.length - 3) }
    }),
  )

  return {
    props: { posts },
  }
}
