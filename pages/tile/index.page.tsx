import { range } from 'lodash'
import { Post } from '../../@types/content'
import { Inset } from '../../components/Inset'
import { PageContainer } from '../../components/PageContainer'
import styles from './styles.module.scss'

interface IndexProps {
  posts: Post[]
}

export default function Tile({ posts }: IndexProps) {
  return (
    <>
      <PageContainer />
      <Inset>
        {range(500).map((index) => (
          <img src='/img/tile.svg' className={styles.tile} />
        ))}
      </Inset>
    </>
  )
}
