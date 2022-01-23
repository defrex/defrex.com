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

    if (boardState.cursorPosition) {
      paintNode(context, boardState.cellSize, boardState.cursorPosition)
    }

    if (boardState.exitPosition) {
      paintNode(
        context,
        boardState.cellSize,
        boardState.exitPosition,
        colorValues.green60,
      )
    }

    if (
      boardState.exitPosition &&
      boardState.cursorPosition &&
      boardState.exitPosition[0] === boardState.cursorPosition[0] &&
      boardState.exitPosition[1] === boardState.cursorPosition[1]
    ) {
      paintNode(
        context,
        boardState.cellSize,
        boardState.cursorPosition,
        colorValues.blue60,
      )
    }

    if (boardState.selectedPath) {
      for (const position of boardState.selectedPath) {
        paintNode(context, boardState.cellSize, position, colorValues.blue60)
      }
    }

    if (boardState.killPositions) {
      for (const position of boardState.killPositions) {
        paintNode(context, boardState.cellSize, position, colorValues.red60)
      }
    }

    if (boardState.agentPositions) {
      for (const position of boardState.agentPositions) {
        paintNode(context, boardState.cellSize, position, colorValues.blue60)
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