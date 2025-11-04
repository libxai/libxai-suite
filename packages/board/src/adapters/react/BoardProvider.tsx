/**
 * BoardProvider - React Context Provider for BoardStore
 * @module adapters/react
 */

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { BoardStore, type BoardState, type CardData, type ColumnData, type BoardData } from '@libxai/core'

/**
 * Board Context
 */
interface BoardContextValue {
  store: BoardStore
}

const BoardContext = createContext<BoardContextValue | null>(null)

/**
 * Board Provider Props
 */
export interface BoardProviderProps {
  children: React.ReactNode
  initialData?: {
    board?: BoardData
    columns?: ColumnData[]
    cards?: CardData[]
  }
  onStateChange?: (state: BoardState) => void
}

/**
 * BoardProvider component
 *
 * Wraps your app with BoardStore context
 *
 * @example
 * ```tsx
 * <BoardProvider initialData={{ columns: [], cards: [] }}>
 *   <Board />
 * </BoardProvider>
 * ```
 */
export function BoardProvider({ children, initialData, onStateChange }: BoardProviderProps) {
  // Create store only once
  const storeRef = useRef<BoardStore>()

  if (!storeRef.current) {
    // Initialize store
    const columnsMap = new Map()
    const cardsMap = new Map()

    // Load initial columns
    initialData?.columns?.forEach(colData => {
      const { Column } = require('@libxai/core')
      columnsMap.set(colData.id, new Column(colData))
    })

    // Load initial cards
    initialData?.cards?.forEach(cardData => {
      const { Card } = require('@libxai/core')
      cardsMap.set(cardData.id, new Card(cardData))
    })

    // Load initial board
    let board = null
    if (initialData?.board) {
      const { Board } = require('@libxai/core')
      board = new Board(initialData.board)
    }

    storeRef.current = new BoardStore({
      board,
      columns: columnsMap,
      cards: cardsMap,
    })
  }

  const store = storeRef.current

  // Subscribe to state changes
  useEffect(() => {
    if (!onStateChange) return

    return store.subscribeAll((_event) => {
      onStateChange(store.getState())
    })
  }, [store, onStateChange])

  return (
    <BoardContext.Provider value={{ store }}>
      {children}
    </BoardContext.Provider>
  )
}

/**
 * Hook to access BoardStore from context
 *
 * @throws Error if used outside BoardProvider
 */
export function useBoardStore(): BoardStore {
  const context = useContext(BoardContext)

  if (!context) {
    throw new Error('useBoardStore must be used within BoardProvider')
  }

  return context.store
}
