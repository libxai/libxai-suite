/**
 * SelectionStore - Manages card selection state
 * @module store/SelectionStore
 *
 * Replacement for Jotai selectionStateAtom with zero dependencies
 */

/**
 * Selection state interface
 */
export interface SelectionState {
  selectedCardIds: string[]
  lastSelectedCardId: string | null
}

/**
 * Selection event types
 */
export type SelectionEvent =
  | 'selection:changed'
  | 'selection:cleared'
  | 'selection:card-added'
  | 'selection:card-removed'

/**
 * Selection event data
 */
export interface SelectionEventData {
  'selection:changed': { selectedCardIds: string[]; lastSelectedCardId: string | null }
  'selection:cleared': { previousCount: number }
  'selection:card-added': { cardId: string }
  'selection:card-removed': { cardId: string }
}

/**
 * Selection event callback
 */
export type SelectionEventCallback<K extends SelectionEvent> = (
  data: SelectionEventData[K]
) => void

/**
 * SelectionStore - Simple observable store for selection state
 *
 * @example
 * ```typescript
 * const selectionStore = new SelectionStore()
 *
 * // Subscribe to changes
 * const unsubscribe = selectionStore.subscribe((state) => {
 *   console.log('Selection changed:', state.selectedCardIds)
 * })
 *
 * // Select cards
 * selectionStore.select('card-1')
 * selectionStore.selectMultiple(['card-1', 'card-2', 'card-3'])
 *
 * // Check selection
 * if (selectionStore.isSelected('card-1')) {
 *   console.log('Card 1 is selected')
 * }
 *
 * // Clear selection
 * selectionStore.clear()
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
export class SelectionStore {
  private state: SelectionState = {
    selectedCardIds: [],
    lastSelectedCardId: null,
  }

  private listeners = new Set<(state: SelectionState) => void>()
  private eventListeners = new Map<SelectionEvent, Set<SelectionEventCallback<any>>>()

  // ========================================================================
  // GETTERS
  // ========================================================================

  /**
   * Get current selection state
   */
  getState(): SelectionState {
    return {
      selectedCardIds: [...this.state.selectedCardIds],
      lastSelectedCardId: this.state.lastSelectedCardId,
    }
  }

  /**
   * Get selected card IDs
   */
  getSelectedCardIds(): string[] {
    return [...this.state.selectedCardIds]
  }

  /**
   * Get last selected card ID
   */
  getLastSelectedCardId(): string | null {
    return this.state.lastSelectedCardId
  }

  /**
   * Get selection count
   */
  getCount(): number {
    return this.state.selectedCardIds.length
  }

  /**
   * Check if a card is selected
   *
   * @param cardId - Card ID to check
   */
  isSelected(cardId: string): boolean {
    return this.state.selectedCardIds.includes(cardId)
  }

  /**
   * Check if any cards are selected
   */
  hasSelection(): boolean {
    return this.state.selectedCardIds.length > 0
  }

  // ========================================================================
  // SETTERS
  // ========================================================================

  /**
   * Select a single card (replaces current selection)
   *
   * @param cardId - Card to select
   */
  select(cardId: string): void {
    this.state = {
      selectedCardIds: [cardId],
      lastSelectedCardId: cardId,
    }

    this.emit('selection:changed', {
      selectedCardIds: [cardId],
      lastSelectedCardId: cardId,
    })
    this.notify()
  }

  /**
   * Add a card to selection
   *
   * @param cardId - Card to add
   */
  add(cardId: string): void {
    if (this.state.selectedCardIds.includes(cardId)) {
      return // Already selected
    }

    this.state = {
      selectedCardIds: [...this.state.selectedCardIds, cardId],
      lastSelectedCardId: cardId,
    }

    this.emit('selection:card-added', { cardId })
    this.emit('selection:changed', {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: cardId,
    })
    this.notify()
  }

  /**
   * Remove a card from selection
   *
   * @param cardId - Card to remove
   */
  remove(cardId: string): void {
    if (!this.state.selectedCardIds.includes(cardId)) {
      return // Not selected
    }

    this.state = {
      selectedCardIds: this.state.selectedCardIds.filter((id) => id !== cardId),
      lastSelectedCardId: this.state.lastSelectedCardId,
    }

    this.emit('selection:card-removed', { cardId })
    this.emit('selection:changed', {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: this.state.lastSelectedCardId,
    })
    this.notify()
  }

  /**
   * Toggle card selection
   *
   * @param cardId - Card to toggle
   */
  toggle(cardId: string): void {
    if (this.state.selectedCardIds.includes(cardId)) {
      this.remove(cardId)
    } else {
      this.add(cardId)
    }
  }

  /**
   * Select multiple cards (replaces current selection)
   *
   * @param cardIds - Cards to select
   */
  selectMultiple(cardIds: string[]): void {
    const lastCardId = cardIds[cardIds.length - 1] || null

    this.state = {
      selectedCardIds: [...cardIds],
      lastSelectedCardId: lastCardId,
    }

    this.emit('selection:changed', {
      selectedCardIds: cardIds,
      lastSelectedCardId: lastCardId,
    })
    this.notify()
  }

  /**
   * Add multiple cards to selection
   *
   * @param cardIds - Cards to add
   */
  addMultiple(cardIds: string[]): void {
    const newCardIds = cardIds.filter((id) => !this.state.selectedCardIds.includes(id))

    if (newCardIds.length === 0) {
      return // All already selected
    }

    const lastCardId = cardIds[cardIds.length - 1] || this.state.lastSelectedCardId

    this.state = {
      selectedCardIds: [...this.state.selectedCardIds, ...newCardIds],
      lastSelectedCardId: lastCardId,
    }

    newCardIds.forEach((cardId) => {
      this.emit('selection:card-added', { cardId })
    })

    this.emit('selection:changed', {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: lastCardId,
    })
    this.notify()
  }

  /**
   * Clear all selections
   */
  clear(): void {
    const previousCount = this.state.selectedCardIds.length

    if (previousCount === 0) {
      return // Already empty
    }

    this.state = {
      selectedCardIds: [],
      lastSelectedCardId: null,
    }

    this.emit('selection:cleared', { previousCount })
    this.emit('selection:changed', {
      selectedCardIds: [],
      lastSelectedCardId: null,
    })
    this.notify()
  }

  /**
   * Set entire selection state at once
   * (For compatibility with existing code)
   *
   * @param state - New selection state
   */
  setState(state: SelectionState): void {
    this.state = {
      selectedCardIds: [...state.selectedCardIds],
      lastSelectedCardId: state.lastSelectedCardId,
    }

    this.emit('selection:changed', {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: this.state.lastSelectedCardId,
    })
    this.notify()
  }

  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================

  /**
   * Subscribe to state changes
   *
   * @param callback - Called when state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (state: SelectionState) => void): () => void {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Subscribe to selection events
   *
   * @param event - Event type
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  on<K extends SelectionEvent>(
    event: K,
    callback: SelectionEventCallback<K>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }

    this.eventListeners.get(event)!.add(callback)

    return () => {
      this.eventListeners.get(event)?.delete(callback)
    }
  }

  /**
   * Emit selection event
   */
  private emit<K extends SelectionEvent>(
    event: K,
    data: SelectionEventData[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  /**
   * Notify all subscribers
   */
  private notify(): void {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state))
  }

  /**
   * Clear all listeners (cleanup)
   */
  destroy(): void {
    this.listeners.clear()
    this.eventListeners.clear()
    this.clear()
  }
}

// ========================================================================
// SINGLETON INSTANCE (for compatibility with Jotai usage)
// ========================================================================

/**
 * Global selection store instance
 * Used to replace Jotai atom while maintaining same API
 */
export const selectionStore = new SelectionStore()
