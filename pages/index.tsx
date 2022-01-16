import fs from 'fs'
import Link from 'next/link'
import path from 'path'
import { Post } from '../@types/content'
import { PageContainer } from '../components/PageContainer'
import { Stack } from '../components/Stack'
import { Text } from '../components/Text'

interface IndexProps {
  posts: Post[]
}

export default function Index({ posts }: IndexProps) {
  return (
    <PageContainer>
      <Stack>
        <Text value='Articles' size={24} />
        {posts.map((post, index) => (
          <Link href={`/posts/${post.slug}`} key={index}>
            <a>
              <Text value={post.attributes.title} />
            </a>
          </Link>
        ))}
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
