import { useEffect, useRef } from 'react'
import { colorValues } from '../../../../lib/colors'
import { BoardState } from './lib/BoardState'
import { paintEdge, paintNode } from './lib/paintBoard'
import styles from './styles.module.scss'

interface BoardProps {
  boardState: BoardState
  height: number
  width: number
}

export function Board({ boardState, height, width }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Paint Grid
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    if (boardState) {
      for (const [edge, enabled] of boardState.getEdgeStates()) {
        if (enabled) {
          paintEdge(context, boardState.cellSize, edge, colorValues.black40)
        } else {
          paintEdge(context, boardState.cellSize, edge, colorValues.black70)
        }
      }
    }

    if (boardState.positions) {
      for (const { position, color } of boardState.positions) {
        paintNode(context, boardState.cellSize, position, color)
      }
    }
  }, [boardState])

  return (
    <canvas
      className={styles.canvas}
      ref={canvasRef}
      width={width}
      height={height}
    />
  )
}
