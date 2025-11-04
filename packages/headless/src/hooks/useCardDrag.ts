/**
 * Framework-agnostic card drag hook
 * Handles drag & drop logic without UI dependencies
 */

import { DragStore } from '@libxai/core'
import type { DragState } from '../types'

export interface UseCardDragConfig {
  onDragStart?: (cardId: string, sourceColumn: string) => void
  onDragEnd?: (cardId: string, targetColumn?: string) => void
  onDrop?: (cardId: string, targetColumn: string, position: number) => void
}

export interface UseCardDragReturn {
  // State getters
  getDragState: () => DragState
  isDragging: () => boolean
  getDraggedCardId: () => string | null

  // Drag operations
  startDrag: (cardId: string, sourceColumn: string) => void
  updateDrag: (position: { x: number; y: number }) => void
  updateTarget: (targetColumn: string) => void
  endDrag: (targetColumn?: string, position?: number) => void
  cancelDrag: () => void

  // Subscriptions
  subscribe: (callback: (state: DragState) => void) => () => void
}

/**
 * Creates a framework-agnostic card drag manager
 *
 * @example
 * ```typescript
 * const drag = useCardDrag({
 *   onDragStart: (cardId, column) => console.log('Drag started:', cardId),
 *   onDrop: (cardId, targetColumn, position) => {
 *     // Update board state
 *     board.moveCard(cardId, targetColumn, position)
 *   }
 * })
 *
 * // Start dragging
 * drag.startDrag('card-1', 'column-1')
 *
 * // Update position (local state only)
 * drag.updateDrag({ x: 100, y: 200 })
 *
 * // Update target column
 * drag.updateTarget('column-2')
 *
 * // End drag
 * drag.endDrag('column-2', 0)
 * ```
 */
export function useCardDrag(config: UseCardDragConfig = {}): UseCardDragReturn {
  const dragStore = new DragStore()

  // Local position state (not stored in DragStore which is framework-agnostic)
  let currentPosition: { x: number; y: number } | null = null

  return {
    // State getters
    getDragState: () => {
      const state = dragStore.getState()
      return {
        isDragging: state.isDragging,
        draggedCardId: state.draggedCardId,
        sourceColumnId: state.sourceColumnId,
        targetColumnId: state.targetColumnId,
        position: currentPosition
      }
    },

    isDragging: () => {
      return dragStore.getState().isDragging
    },

    getDraggedCardId: () => {
      return dragStore.getState().draggedCardId
    },

    // Drag operations
    startDrag: (cardId, sourceColumn) => {
      dragStore.startDrag(cardId, sourceColumn)
      currentPosition = null
      config.onDragStart?.(cardId, sourceColumn)
    },

    updateDrag: (position) => {
      currentPosition = position
    },

    updateTarget: (targetColumn) => {
      dragStore.updateTarget(targetColumn)
    },

    endDrag: (targetColumn, position) => {
      const state = dragStore.getState()
      const cardId = state.draggedCardId

      if (cardId && targetColumn && position !== undefined) {
        config.onDrop?.(cardId, targetColumn, position)
      }

      dragStore.endDrag()
      currentPosition = null

      if (cardId) {
        config.onDragEnd?.(cardId, targetColumn)
      }
    },

    cancelDrag: () => {
      dragStore.cancelDrag()
      currentPosition = null
    },

    // Subscriptions
    subscribe: (callback) => {
      return dragStore.subscribe((state) => {
        callback({
          isDragging: state.isDragging,
          draggedCardId: state.draggedCardId,
          sourceColumnId: state.sourceColumnId,
          targetColumnId: state.targetColumnId,
          position: currentPosition
        })
      })
    }
  }
}
