import { useMemo } from 'react'
import { useKanbanState } from './useKanbanState'
import type { Board, BoardCallbacks, User, KanbanBoardProps } from '../types'

export interface UseBoardOptions {
  initialData: Board
  availableUsers?: User[]
  onSave?: (board: Board) => void | Promise<void>
  saveDelay?: number
}

export interface UseBoardReturn {
  props: Pick<KanbanBoardProps, 'board' | 'callbacks' | 'availableUsers'>
  board: Board
  callbacks: BoardCallbacks
  utils: {
    addCard: (columnId: string, title: string, data?: Partial<any>) => void
    addColumn: (title: string, position?: number) => void
    reset: () => void
  }
}

/**
 * Simplified hook for Kanban board state management
 *
 * @example
 * ```tsx
 * import { KanbanBoard, useBoard } from '@libxai/board'
 *
 * function App() {
 *   const board = useBoard({
 *     initialData: myData,
 *     onSave: (board) => localStorage.setItem('board', JSON.stringify(board))
 *   })
 *
 *   return <KanbanBoard {...board.props} />
 * }
 * ```
 */
export function useBoard({
  initialData,
  availableUsers = [],
  onSave,
}: UseBoardOptions): UseBoardReturn {
  const { board, callbacks, helpers } = useKanbanState({
    initialBoard: initialData,
    onPersist: onSave,
  })

  const utils = useMemo(
    () => ({
      addCard: (columnId: string, title: string, data: Partial<any> = {}) => {
        helpers.addCard({
          title,
          columnId,
          position: board.cards.filter((c) => c.columnId === columnId).length,
          ...data,
        })
      },
      addColumn: (title: string, position?: number) => {
        // Calculate next position based on highest existing position + 1000
        const maxPosition = board.columns.length > 0
          ? Math.max(...board.columns.map(col => col.position))
          : 0

        helpers.addColumn({
          title,
          position: position ?? (maxPosition + 1000),
        })
      },
      reset: helpers.clearBoard,
    }),
    [board.cards, board.columns, helpers]
  )

  const props = useMemo(
    () => ({
      board,
      callbacks,
      availableUsers,
    }),
    [board, callbacks, availableUsers]
  )

  return {
    props,
    board,
    callbacks,
    utils,
  }
}
