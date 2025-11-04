/**
 * useKanbanState Hook
 * Optional hook for managing board state locally
 * Consumers can use this or manage state themselves
 * @module hooks/useKanbanState
 */

import { useState, useCallback } from 'react'
import { retryWithBackoff } from '../utils/retry'
import type { Board, BoardCallbacks, Card, Column } from '../types'

export interface UseKanbanStateOptions {
  /** Initial board state */
  initialBoard: Board
  /** Persist changes (e.g., to localStorage, API) */
  onPersist?: (board: Board) => void | Promise<void>
  /** Enable optimistic updates (default: true) */
  optimistic?: boolean
}

export interface UseKanbanStateReturn {
  /** Current board state */
  board: Board
  /** Callbacks for the KanbanBoard component */
  callbacks: BoardCallbacks
  /** Direct state setters (advanced usage) */
  setBoard: React.Dispatch<React.SetStateAction<Board>>
  /** Helper functions */
  helpers: {
    addCard: (card: Omit<Card, 'id'>) => string
    addColumn: (column: Omit<Column, 'id' | 'cardIds'>) => string
    deleteCard: (cardId: string) => void
    deleteColumn: (columnId: string) => void
    clearBoard: () => void
  }
}

/**
 * Hook for managing Kanban board state
 *
 * @example
 * ```tsx
 * const { board, callbacks } = useKanbanState({
 *   initialBoard: myBoard,
 *   onPersist: async (board) => {
 *     await api.updateBoard(board)
 *   }
 * })
 *
 * return <KanbanBoard board={board} callbacks={callbacks} />
 * ```
 */
export function useKanbanState({
  initialBoard,
  onPersist,
}: UseKanbanStateOptions): UseKanbanStateReturn {
  const [board, setBoard] = useState<Board>(initialBoard)

  // Persist helper with retry logic
  const persistBoard = useCallback(
    (updatedBoard: Board) => {
      if (onPersist) {
        // Use retry logic for resilient persistence
        retryWithBackoff(
          () => Promise.resolve(onPersist(updatedBoard)),
          {
            maxAttempts: 3,
            initialDelay: 1000,
            onRetry: (error, attempt, delay) => {
              console.warn(
                `Retry attempt ${attempt} after ${delay}ms: ${error.message}`
              )
            },
          }
        ).then((result) => {
          if (!result.success) {
            console.error(
              `Failed to persist board after ${result.attempts} attempts:`,
              result.error
            )
            // TODO: Implement rollback or user notification
          }
        })
      }
    },
    [onPersist]
  )

  // Move card to new position/column
  const handleCardMove = useCallback(
    async (cardId: string, targetColumnId: string, position: number) => {
      setBoard((prev) => {
        const card = prev.cards.find((c) => c.id === cardId)
        if (!card) return prev

        const sourceColumnId = card.columnId

        // Update card
        const updatedCard = {
          ...card,
          columnId: targetColumnId,
          position,
        }

        // Update cards array
        const updatedCards = prev.cards.map((c) =>
          c.id === cardId ? updatedCard : c
        )

        // Update columns' cardIds
        const updatedColumns = prev.columns.map((col) => {
          if (col.id === sourceColumnId) {
            // Remove from source column
            return {
              ...col,
              cardIds: col.cardIds.filter((id) => id !== cardId),
            }
          } else if (col.id === targetColumnId) {
            // Add to target column (maintain sort order)
            const targetCards = updatedCards
              .filter((c) => c.columnId === targetColumnId)
              .sort((a, b) => a.position - b.position)
            return {
              ...col,
              cardIds: targetCards.map((c) => c.id),
            }
          }
          return col
        })

        const updatedBoard = {
          ...prev,
          cards: updatedCards,
          columns: updatedColumns,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Update card properties
  const handleCardUpdate = useCallback(
    async (cardId: string, updates: Partial<Card>) => {
      setBoard((prev) => {
        const updatedCards = prev.cards.map((card) =>
          card.id === cardId ? { ...card, ...updates } : card
        )

        const updatedBoard = {
          ...prev,
          cards: updatedCards,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Create new card
  const handleCardCreate = useCallback(
    async (card: Omit<Card, 'id'>) => {
      const newCardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      setBoard((prev) => {
        const newCard: Card = {
          ...card,
          id: newCardId,
        }

        // Add to column's cardIds
        const updatedColumns = prev.columns.map((col) =>
          col.id === card.columnId
            ? { ...col, cardIds: [...col.cardIds, newCardId] }
            : col
        )

        const updatedBoard = {
          ...prev,
          cards: [...prev.cards, newCard],
          columns: updatedColumns,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Delete card
  const handleCardDelete = useCallback(
    async (cardId: string) => {
      setBoard((prev) => {
        const card = prev.cards.find((c) => c.id === cardId)
        if (!card) return prev

        // Remove from cards
        const updatedCards = prev.cards.filter((c) => c.id !== cardId)

        // Remove from column's cardIds
        const updatedColumns = prev.columns.map((col) =>
          col.id === card.columnId
            ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
            : col
        )

        const updatedBoard = {
          ...prev,
          cards: updatedCards,
          columns: updatedColumns,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Create new column
  const handleColumnCreate = useCallback(
    async (column: Omit<Column, 'id' | 'cardIds'>) => {
      const newColumnId = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      setBoard((prev) => {
        const newColumn: Column = {
          ...column,
          id: newColumnId,
          cardIds: [],
        }

        const updatedBoard = {
          ...prev,
          columns: [...prev.columns, newColumn],
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Update column
  const handleColumnUpdate = useCallback(
    async (columnId: string, updates: Partial<Column>) => {
      setBoard((prev) => {
        const updatedColumns = prev.columns.map((col) =>
          col.id === columnId ? { ...col, ...updates } : col
        )

        const updatedBoard = {
          ...prev,
          columns: updatedColumns,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Delete column
  const handleColumnDelete = useCallback(
    async (columnId: string) => {
      setBoard((prev) => {
        // Remove all cards in this column
        const updatedCards = prev.cards.filter((c) => c.columnId !== columnId)
        const updatedColumns = prev.columns.filter((col) => col.id !== columnId)

        const updatedBoard = {
          ...prev,
          cards: updatedCards,
          columns: updatedColumns,
        }

        persistBoard(updatedBoard)
        return updatedBoard
      })
    },
    [persistBoard]
  )

  // Helper function to add card (convenience)
  const addCard = useCallback(
    (card: Omit<Card, 'id'>): string => {
      const newCardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      handleCardCreate(card)
      return newCardId
    },
    [handleCardCreate]
  )

  // Helper function to add column (convenience)
  const addColumn = useCallback(
    (column: Omit<Column, 'id' | 'cardIds'>): string => {
      const newColumnId = `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      handleColumnCreate(column)
      return newColumnId
    },
    [handleColumnCreate]
  )

  // Helper function to clear board (for AI-generated plans)
  const clearBoard = useCallback(() => {
    setBoard((prev) => {
      const updatedBoard = {
        ...prev,
        cards: [],
        columns: [],
      }

      persistBoard(updatedBoard)
      return updatedBoard
    })
  }, [persistBoard])

  const callbacks: BoardCallbacks = {
    onCardMove: handleCardMove,
    onCardUpdate: handleCardUpdate,
    onCardCreate: handleCardCreate,
    onCardDelete: handleCardDelete,
    onColumnCreate: handleColumnCreate,
    onColumnUpdate: handleColumnUpdate,
    onColumnDelete: handleColumnDelete,
  }

  return {
    board,
    callbacks,
    setBoard,
    helpers: {
      addCard,
      addColumn,
      deleteCard: handleCardDelete,
      deleteColumn: handleColumnDelete,
      clearBoard,
    },
  }
}
