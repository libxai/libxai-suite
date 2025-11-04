/**
 * Framework-agnostic board state hook
 * Provides complete board state management without UI dependencies
 */

import { BoardStore } from '@libxai/core'
import type { BoardState } from '../types'
import type { BoardData, ColumnData, CardData, Card, Column, Dependency } from '@libxai/core'

export interface UseBoardStateConfig {
  initialBoard?: BoardData
  onChange?: (state: BoardState) => void
}

export interface UseBoardStateReturn {
  // Board operations
  setBoard: (boardData: BoardData) => void
  updateBoard: (changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>) => void
  getBoard: () => BoardData | null

  // Column operations
  addColumn: (columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>) => Column
  updateColumn: (columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>) => void
  deleteColumn: (columnId: string) => void
  getColumn: (columnId: string) => Column | undefined
  getAllColumns: () => Column[]

  // Card operations
  addCard: (cardData: Omit<CardData, 'createdAt' | 'updatedAt'>) => Card
  updateCard: (cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>) => void
  deleteCard: (cardId: string) => void
  moveCard: (cardId: string, toColumnId: string, newPosition: number) => void
  getCard: (cardId: string) => Card | undefined
  getAllCards: () => Card[]
  getCardsByColumn: (columnId: string) => Card[]

  // Dependency operations
  addDependency: (cardId: string, dependency: Dependency) => void
  removeDependency: (cardId: string, dependencyTaskId: string) => void
  getDependencies: (cardId: string) => Card[]
  getDependentCards: (cardId: string) => Card[]

  // Advanced operations
  validateDependencies: () => void
  getCardsInDependencyOrder: () => Card[]
  getCriticalPath: () => string[]
  isOnCriticalPath: (cardId: string) => boolean
  autoSchedule: () => void

  // Subscriptions - placeholder until BoardStore gets event system
  subscribe: (callback: (state: BoardState) => void) => () => void

  // Store access
  store: BoardStore
}

/**
 * Creates a framework-agnostic board state manager
 *
 * @example
 * ```typescript
 * const board = useBoardState({
 *   initialBoard: myBoardData,
 *   onChange: (state) => console.log('Board changed:', state)
 * })
 *
 * // Add a column
 * board.addColumn({
 *   id: 'col-1',
 *   title: 'To Do',
 *   position: 0
 * })
 *
 * // Add a card
 * board.addCard({
 *   id: 'card-1',
 *   title: 'My Task',
 *   columnId: 'col-1',
 *   position: 0
 * })
 *
 * // Move card
 * board.moveCard('card-1', 'col-2', 0)
 * ```
 */
export function useBoardState(config: UseBoardStateConfig = {}): UseBoardStateReturn {
  const store = new BoardStore()

  if (config.initialBoard) {
    store.setBoard(config.initialBoard)
  }

  return {
    // Board operations
    setBoard: (boardData) => {
      store.setBoard(boardData)
      if (config.onChange) {
        const state = store.getState()
        config.onChange({
          board: state.board?.toData() || null,
          columns: state.columns,
          cards: state.cards
        })
      }
    },

    updateBoard: (changes) => {
      store.updateBoard(changes)
    },

    getBoard: () => {
      const board = store.getBoard()
      return board ? board.toData() : null
    },

    // Column operations
    addColumn: (columnData) => {
      return store.addColumn(columnData)
    },

    updateColumn: (columnId, changes) => {
      store.updateColumn(columnId, changes)
    },

    deleteColumn: (columnId) => {
      store.deleteColumn(columnId)
    },

    getColumn: (columnId) => {
      return store.getColumn(columnId)
    },

    getAllColumns: () => {
      return store.getAllColumns()
    },

    // Card operations
    addCard: (cardData) => {
      return store.addCard(cardData)
    },

    updateCard: (cardId, changes) => {
      store.updateCard(cardId, changes)
    },

    deleteCard: (cardId) => {
      store.deleteCard(cardId)
    },

    moveCard: (cardId, toColumnId, newPosition) => {
      store.moveCard(cardId, toColumnId, newPosition)
    },

    getCard: (cardId) => {
      return store.getCard(cardId)
    },

    getAllCards: () => {
      return store.getAllCards()
    },

    getCardsByColumn: (columnId) => {
      return store.getCardsByColumn(columnId)
    },

    // Dependency operations
    addDependency: (cardId, dependency) => {
      store.addDependency(cardId, dependency)
    },

    removeDependency: (cardId, dependencyTaskId) => {
      store.removeDependency(cardId, dependencyTaskId)
    },

    getDependencies: (cardId) => {
      return store.getDependencies(cardId)
    },

    getDependentCards: (cardId) => {
      return store.getDependentCards(cardId)
    },

    // Advanced operations
    validateDependencies: () => {
      store.validateDependencies()
    },

    getCardsInDependencyOrder: () => {
      return store.getCardsInDependencyOrder()
    },

    getCriticalPath: () => {
      return store.getCriticalPath()
    },

    isOnCriticalPath: (cardId) => {
      return store.isOnCriticalPath(cardId)
    },

    autoSchedule: () => {
      store.autoSchedule()
    },

    // Subscriptions - BoardStore doesn't have built-in subscriptions yet
    // For now, return a no-op unsubscribe
    subscribe: (_callback) => {
      // TODO: Implement when BoardStore gains event system
      return () => {}
    },

    // Store access
    store
  }
}
