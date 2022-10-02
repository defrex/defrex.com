import { range } from 'lodash'
import { Inset } from '../../components/Inset'
import { PageContainer } from '../../components/PageContainer'
import styles from './styles.module.scss'

export default function Tile() {
  return (
    <>
      <PageContainer />
      <Inset>
        {range(500).map((index) => (
          <img key={index} src='/img/tile.svg' className={styles.tile} />
        ))}
      </Inset>
    </>
  )
}
