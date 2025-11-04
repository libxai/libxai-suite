/**
 * Framework-agnostic multi-select hook
 * Handles card selection logic without UI dependencies
 */

import { SelectionStore } from '@libxai/core'
import type { SelectionState } from '../types'

export interface UseMultiSelectConfig {
  onSelectionChange?: (selectedIds: string[]) => void
  onCardSelect?: (cardId: string) => void
  onCardDeselect?: (cardId: string) => void
}

export interface UseMultiSelectReturn {
  // State getters
  getSelectionState: () => SelectionState
  getSelectedCardIds: () => string[]
  getLastSelectedCardId: () => string | null
  getCount: () => number
  isSelected: (cardId: string) => boolean
  hasSelection: () => boolean

  // Selection operations
  select: (cardId: string) => void
  add: (cardId: string) => void
  remove: (cardId: string) => void
  toggle: (cardId: string) => void
  selectMultiple: (cardIds: string[]) => void
  addMultiple: (cardIds: string[]) => void
  clear: () => void

  // Subscriptions
  subscribe: (callback: (state: SelectionState) => void) => () => void
}

/**
 * Creates a framework-agnostic multi-select manager
 *
 * @example
 * ```typescript
 * const selection = useMultiSelect({
 *   onSelectionChange: (ids) => console.log('Selected:', ids)
 * })
 *
 * // Select a card
 * selection.select('card-1')
 *
 * // Toggle selection
 * selection.toggle('card-2')
 *
 * // Select multiple
 * selection.selectMultiple(['card-1', 'card-2', 'card-3'])
 *
 * // Clear all
 * selection.clear()
 * ```
 */
export function useMultiSelect(config: UseMultiSelectConfig = {}): UseMultiSelectReturn {
  const selectionStore = new SelectionStore()

  return {
    // State getters
    getSelectionState: () => {
      return selectionStore.getState()
    },

    getSelectedCardIds: () => {
      return selectionStore.getSelectedCardIds()
    },

    getLastSelectedCardId: () => {
      return selectionStore.getLastSelectedCardId()
    },

    getCount: () => {
      return selectionStore.getCount()
    },

    isSelected: (cardId) => {
      return selectionStore.isSelected(cardId)
    },

    hasSelection: () => {
      return selectionStore.hasSelection()
    },

    // Selection operations
    select: (cardId) => {
      selectionStore.select(cardId)
      config.onCardSelect?.(cardId)
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    add: (cardId) => {
      selectionStore.add(cardId)
      config.onCardSelect?.(cardId)
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    remove: (cardId) => {
      selectionStore.remove(cardId)
      config.onCardDeselect?.(cardId)
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    toggle: (cardId) => {
      const wasSelected = selectionStore.isSelected(cardId)
      selectionStore.toggle(cardId)
      if (wasSelected) {
        config.onCardDeselect?.(cardId)
      } else {
        config.onCardSelect?.(cardId)
      }
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    selectMultiple: (cardIds) => {
      selectionStore.selectMultiple(cardIds)
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    addMultiple: (cardIds) => {
      selectionStore.addMultiple(cardIds)
      config.onSelectionChange?.(selectionStore.getSelectedCardIds())
    },

    clear: () => {
      selectionStore.clear()
      config.onSelectionChange?.([])
    },

    // Subscriptions
    subscribe: (callback) => {
      return selectionStore.subscribe(callback)
    }
  }
}
