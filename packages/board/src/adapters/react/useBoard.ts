/**
 * useBoard - Main hook for board operations
 * @module adapters/react
 */

import { useState, useEffect, useCallback } from 'react'
import { useBoardStore } from './BoardProvider'
import type { Board, Column, Card, CardData, ColumnData } from '@libxai/core'

/**
 * Return type for useBoard hook
 */
export interface UseBoardReturn {
  // State
  board: Board | null
  columns: Column[]
  cards: Card[]

  // Board operations
  updateBoard: (changes: Partial<Omit<import('@libxai/core').BoardData, 'id' | 'createdAt'>>) => void

  // Column operations
  addColumn: (columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>) => void
  updateColumn: (columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>) => void
  deleteColumn: (columnId: string) => void
  getColumn: (columnId: string) => Column | undefined

  // Card operations
  addCard: (cardData: Omit<CardData, 'createdAt' | 'updatedAt'>) => void
  updateCard: (cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>) => void
  deleteCard: (cardId: string) => void
  moveCard: (cardId: string, toColumnId: string, newPosition: number) => void
  getCard: (cardId: string) => Card | undefined
  getCardsByColumn: (columnId: string) => Card[]
}

/**
 * Main hook for board operations
 *
 * Provides reactive state and methods for managing board, columns, and cards
 *
 * @example
 * ```tsx
 * function MyBoard() {
 *   const { board, columns, cards, addCard, moveCard } = useBoard()
 *
 *   return (
 *     <div>
 *       {columns.map(column => (
 *         <div key={column.id}>
 *           <h2>{column.title}</h2>
 *           {cards
 *             .filter(card => card.columnId === column.id)
 *             .map(card => (
 *               <div key={card.id}>{card.title}</div>
 *             ))}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useBoard(): UseBoardReturn {
  const store = useBoardStore()

  // Reactive state
  const [board, setBoard] = useState<Board | null>(store.getBoard())
  const [columns, setColumns] = useState<Column[]>(store.getAllColumns())
  const [cards, setCards] = useState<Card[]>(store.getAllCards())

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribeAll(() => {
      setBoard(store.getBoard())
      setColumns(store.getAllColumns())
      setCards(store.getAllCards())
    })

    return unsubscribe
  }, [store])

  // Board operations
  const updateBoard = useCallback(
    (changes: Partial<Omit<import('@libxai/core').BoardData, 'id' | 'createdAt'>>) => {
      store.updateBoard(changes)
    },
    [store]
  )

  // Column operations
  const addColumn = useCallback(
    (columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>) => {
      store.addColumn(columnData)
    },
    [store]
  )

  const updateColumn = useCallback(
    (columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>) => {
      store.updateColumn(columnId, changes)
    },
    [store]
  )

  const deleteColumn = useCallback(
    (columnId: string) => {
      store.deleteColumn(columnId)
    },
    [store]
  )

  const getColumn = useCallback(
    (columnId: string) => {
      return store.getColumn(columnId)
    },
    [store]
  )

  // Card operations
  const addCard = useCallback(
    (cardData: Omit<CardData, 'createdAt' | 'updatedAt'>) => {
      store.addCard(cardData)
    },
    [store]
  )

  const updateCard = useCallback(
    (cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>) => {
      store.updateCard(cardId, changes)
    },
    [store]
  )

  const deleteCard = useCallback(
    (cardId: string) => {
      store.deleteCard(cardId)
    },
    [store]
  )

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, newPosition: number) => {
      store.moveCard(cardId, toColumnId, newPosition)
    },
    [store]
  )

  const getCard = useCallback(
    (cardId: string) => {
      return store.getCard(cardId)
    },
    [store]
  )

  const getCardsByColumn = useCallback(
    (columnId: string) => {
      return store.getCardsByColumn(columnId)
    },
    [store]
  )

  return {
    // State
    board,
    columns,
    cards,

    // Board operations
    updateBoard,

    // Column operations
    addColumn,
    updateColumn,
    deleteColumn,
    getColumn,

    // Card operations
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    getCard,
    getCardsByColumn,
  }
}
