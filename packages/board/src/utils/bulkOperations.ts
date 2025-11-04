/**
 * Bulk Operations for Cards
 * Efficient batch operations on multiple cards
 * @module utils/bulkOperations
 */

import type { Board, Card } from '../types'
import { logger } from './logger'
import { undoRedoManager, createBoardCommand } from './undoRedo'

export interface BulkOperationResult {
  success: boolean
  processedCount: number
  failedCount: number
  errors?: Array<{ cardId: string; error: Error }>
}

export interface BulkUpdateOptions {
  /** Fields to update */
  updates: Partial<Card>
  /** Card IDs to update (if not provided, uses filter) */
  cardIds?: string[]
  /** Filter function to select cards */
  filter?: (card: Card) => boolean
  /** Enable undo/redo */
  undoable?: boolean
}

export interface BulkMoveOptions {
  /** Target column ID */
  targetColumnId: string
  /** Card IDs to move (if not provided, uses filter) */
  cardIds?: string[]
  /** Filter function to select cards */
  filter?: (card: Card) => boolean
  /** Preserve order */
  preserveOrder?: boolean
  /** Enable undo/redo */
  undoable?: boolean
}

export interface BulkDeleteOptions {
  /** Card IDs to delete (if not provided, uses filter) */
  cardIds?: string[]
  /** Filter function to select cards */
  filter?: (card: Card) => boolean
  /** Enable undo/redo */
  undoable?: boolean
  /** Confirmation required */
  confirmDelete?: boolean
}

/**
 * Bulk Operations Manager
 *
 * @example
 * ```ts
 * const bulkOps = new BulkOperationsManager(board, setBoard)
 *
 * // Update multiple cards
 * await bulkOps.updateCards({
 *   cardIds: ['card-1', 'card-2', 'card-3'],
 *   updates: { priority: 'HIGH' }
 * })
 *
 * // Move cards to different column
 * await bulkOps.moveCards({
 *   targetColumnId: 'done',
 *   filter: (card) => card.priority === 'LOW'
 * })
 *
 * // Delete cards
 * await bulkOps.deleteCards({
 *   cardIds: ['card-4', 'card-5']
 * })
 * ```
 */
export class BulkOperationsManager {
  private bulkLogger = logger.child('BulkOperations')

  constructor(
    private board: Board,
    private setBoard: (board: Board) => void
  ) {}

  /**
   * Update multiple cards
   */
  async updateCards(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    const { updates, cardIds, filter, undoable = true } = options

    const cardsToUpdate = this.getCardsToProcess(cardIds, filter)

    if (cardsToUpdate.length === 0) {
      this.bulkLogger.warn('No cards to update')
      return { success: true, processedCount: 0, failedCount: 0 }
    }

    const prevBoard = this.board
    const updatedCards = this.board.cards.map((card) => {
      if (cardsToUpdate.includes(card.id)) {
        return { ...card, ...updates }
      }
      return card
    })

    const nextBoard: Board = {
      ...this.board,
      cards: updatedCards,
    }

    // Update board
    this.setBoard(nextBoard)

    // Add to undo/redo if enabled
    if (undoable) {
      const command = createBoardCommand('BULK_UPDATE_CARDS', prevBoard, nextBoard, this.setBoard)
      await undoRedoManager.execute(command)
    }

    this.bulkLogger.info(`Bulk update completed: ${cardsToUpdate.length} cards updated`, {
      cardIds: cardsToUpdate,
      updates,
    })

    return {
      success: true,
      processedCount: cardsToUpdate.length,
      failedCount: 0,
    }
  }

  /**
   * Move multiple cards to a different column
   */
  async moveCards(options: BulkMoveOptions): Promise<BulkOperationResult> {
    const { targetColumnId, cardIds, filter, preserveOrder = true, undoable = true } = options

    const cardsToMove = this.getCardsToProcess(cardIds, filter)

    if (cardsToMove.length === 0) {
      this.bulkLogger.warn('No cards to move')
      return { success: true, processedCount: 0, failedCount: 0 }
    }

    // Check if target column exists
    const targetColumn = this.board.columns.find((col) => col.id === targetColumnId)
    if (!targetColumn) {
      throw new Error(`Target column ${targetColumnId} not found`)
    }

    const prevBoard = this.board

    // Update cards
    const updatedCards = this.board.cards.map((card) => {
      if (cardsToMove.includes(card.id)) {
        return { ...card, columnId: targetColumnId }
      }
      return card
    })

    // Update columns
    const updatedColumns = this.board.columns.map((column) => {
      if (column.id === targetColumnId) {
        // Add cards to target column
        const existingCardIds = column.cardIds || []
        const newCardIds = preserveOrder ? [...existingCardIds, ...cardsToMove] : [...cardsToMove, ...existingCardIds]

        return { ...column, cardIds: newCardIds }
      } else {
        // Remove cards from other columns
        const filteredCardIds = (column.cardIds || []).filter((id) => !cardsToMove.includes(id))
        return { ...column, cardIds: filteredCardIds }
      }
    })

    const nextBoard: Board = {
      ...this.board,
      cards: updatedCards,
      columns: updatedColumns,
    }

    // Update board
    this.setBoard(nextBoard)

    // Add to undo/redo if enabled
    if (undoable) {
      const command = createBoardCommand('BULK_MOVE_CARDS', prevBoard, nextBoard, this.setBoard)
      await undoRedoManager.execute(command)
    }

    this.bulkLogger.info(`Bulk move completed: ${cardsToMove.length} cards moved to ${targetColumnId}`, {
      cardIds: cardsToMove,
      targetColumnId,
    })

    return {
      success: true,
      processedCount: cardsToMove.length,
      failedCount: 0,
    }
  }

  /**
   * Delete multiple cards
   */
  async deleteCards(options: BulkDeleteOptions): Promise<BulkOperationResult> {
    const { cardIds, filter, undoable = true, confirmDelete = false } = options

    const cardsToDelete = this.getCardsToProcess(cardIds, filter)

    if (cardsToDelete.length === 0) {
      this.bulkLogger.warn('No cards to delete')
      return { success: true, processedCount: 0, failedCount: 0 }
    }

    // Confirmation (in browser environment)
    if (confirmDelete && typeof window !== 'undefined') {
      const confirmed = window.confirm(`Are you sure you want to delete ${cardsToDelete.length} cards?`)
      if (!confirmed) {
        this.bulkLogger.info('Bulk delete cancelled by user')
        return { success: false, processedCount: 0, failedCount: 0 }
      }
    }

    const prevBoard = this.board

    // Filter out deleted cards
    const remainingCards = this.board.cards.filter((card) => !cardsToDelete.includes(card.id))

    // Update columns to remove deleted cards
    const updatedColumns = this.board.columns.map((column) => ({
      ...column,
      cardIds: (column.cardIds || []).filter((id) => !cardsToDelete.includes(id)),
    }))

    const nextBoard: Board = {
      ...this.board,
      cards: remainingCards,
      columns: updatedColumns,
    }

    // Update board
    this.setBoard(nextBoard)

    // Add to undo/redo if enabled
    if (undoable) {
      const command = createBoardCommand('BULK_DELETE_CARDS', prevBoard, nextBoard, this.setBoard)
      await undoRedoManager.execute(command)
    }

    this.bulkLogger.info(`Bulk delete completed: ${cardsToDelete.length} cards deleted`, {
      cardIds: cardsToDelete,
    })

    return {
      success: true,
      processedCount: cardsToDelete.length,
      failedCount: 0,
    }
  }

  /**
   * Archive multiple cards (soft delete)
   */
  async archiveCards(options: BulkUpdateOptions): Promise<BulkOperationResult> {
    return this.updateCards({
      ...options,
      updates: {
        ...options.updates,
        // Note: Add archived status to your Card type if needed
      },
    })
  }

  /**
   * Clone multiple cards
   */
  async cloneCards(cardIds: string[], targetColumnId?: string): Promise<BulkOperationResult> {
    const cardsToClone = this.board.cards.filter((card) => cardIds.includes(card.id))

    if (cardsToClone.length === 0) {
      this.bulkLogger.warn('No cards to clone')
      return { success: true, processedCount: 0, failedCount: 0 }
    }

    const prevBoard = this.board

    // Create cloned cards
    const clonedCards = cardsToClone.map((card) => ({
      ...card,
      id: `${card.id}-clone-${Date.now()}`,
      title: `${card.title} (Copy)`,
      columnId: targetColumnId || card.columnId,
      position: card.position + 0.5, // Place after original
    }))

    const nextBoard: Board = {
      ...this.board,
      cards: [...this.board.cards, ...clonedCards],
    }

    // Update board
    this.setBoard(nextBoard)

    // Add to undo/redo
    const command = createBoardCommand('BULK_CLONE_CARDS', prevBoard, nextBoard, this.setBoard)
    await undoRedoManager.execute(command)

    this.bulkLogger.info(`Bulk clone completed: ${clonedCards.length} cards cloned`, {
      cardIds,
      targetColumnId,
    })

    return {
      success: true,
      processedCount: clonedCards.length,
      failedCount: 0,
    }
  }

  /**
   * Get cards to process based on IDs or filter
   */
  private getCardsToProcess(cardIds?: string[], filter?: (card: Card) => boolean): string[] {
    if (cardIds && cardIds.length > 0) {
      return cardIds
    }

    if (filter) {
      return this.board.cards.filter(filter).map((card) => card.id)
    }

    return []
  }

  /**
   * Update board reference (call after board changes)
   */
  updateBoardReference(board: Board): void {
    this.board = board
  }
}
