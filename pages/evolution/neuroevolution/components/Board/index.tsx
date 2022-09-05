import { useEffect, useRef } from 'react'
import { colorValues } from '../../../../../lib/colors'
import { BoardState, Edge } from './lib/BoardState'
import { paintEdge, paintNode } from './lib/paintBoard'

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
      for (let gridX = 0; gridX < boardState.gridWidth; gridX++) {
        for (const edge of [
          [
            [gridX, -1],
            [gridX + 1, -1],
          ],
          [
            [gridX, -1],
            [gridX, -1 + 1],
          ],
        ] as Edge[]) {
          paintEdge(context, boardState.cellSize, edge, colorValues.black70)
        }
      }

      for (let gridY = 0; gridY < boardState.gridHeight; gridY++) {
        for (const edge of [
          [
            [-1, gridY],
            [-1 + 1, gridY],
          ],
          [
            [-1, gridY],
            [-1, gridY + 1],
          ],
        ] as Edge[]) {
          paintEdge(context, boardState.cellSize, edge, colorValues.black70)
        }
      }

      for (let gridX = 0; gridX < boardState.gridWidth; gridX++) {
        for (let gridY = 0; gridY < boardState.gridHeight; gridY++) {
          for (const edge of [
            [
              [gridX, gridY],
              [gridX + 1, gridY],
            ],
            [
              [gridX, gridY],
              [gridX, gridY + 1],
            ],
          ] as Edge[]) {
            paintEdge(context, boardState.cellSize, edge, colorValues.black70)
          }
        }
      }
    }

    if (boardState.positions) {
      for (const { position, color } of boardState.positions) {
        paintNode(context, boardState.cellSize, position, color)
      }
    }
  }, [boardState])

  return <canvas ref={canvasRef} width={width} height={height} />
}
