import fs from 'fs'
import path from 'path'
import { Post } from '../../@types/content'
import { Html } from '../../components/Html'
import { PageContainer } from '../../components/PageContainer'
import { Stack } from '../../components/Stack'
import { Text } from '../../components/Text'
import { colors } from '../../lib/colors'
import { humanizeDate } from '../../lib/humanizeDate'

interface PostDetailsProps {
  post: Post
}

export default function PostDetails({ post }: PostDetailsProps) {
  return (
    <PageContainer>
      <Stack>
        <Text value={post.attributes.title} size={32} element='h1' />
        <Text
          value={humanizeDate(new Date(post.attributes.date))}
          size={16}
          color={colors.black30}
        />
      </Stack>

      <Html html={post.html} />
    </PageContainer>
  )
}

export async function getStaticPaths() {
  const paths = fs
    .readdirSync(path.join(process.cwd(), 'content/posts'))
    .map((postName) => {
      const trimmedName = postName.substring(0, postName.length - 3)
      return {
        params: { slug: trimmedName },
      }
    })

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }: any) {
  const { slug } = params

  const post = await import(`../../content/posts/${slug}.md`)

  return {
    props: {
      post: post.default,
    },
  }
}
