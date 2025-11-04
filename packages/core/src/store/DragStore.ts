/**
 * DragStore - Manages drag and drop state
 * @module store/DragStore
 *
 * Replacement for Jotai dragStateAtom with zero dependencies
 */

/**
 * Drag state interface
 */
export interface DragState {
  isDragging: boolean
  draggedCardId: string | null
  sourceColumnId: string | null
  targetColumnId: string | null
}

/**
 * Drag event types
 */
export type DragEvent = 'drag:start' | 'drag:over' | 'drag:end' | 'drag:cancel'

/**
 * Drag event data
 */
export interface DragEventData {
  'drag:start': { cardId: string; sourceColumnId: string }
  'drag:over': { cardId: string; targetColumnId: string }
  'drag:end': { cardId: string; sourceColumnId: string; targetColumnId: string }
  'drag:cancel': { cardId: string }
}

/**
 * Drag event callback
 */
export type DragEventCallback<K extends DragEvent> = (data: DragEventData[K]) => void

/**
 * DragStore - Simple observable store for drag state
 *
 * @example
 * ```typescript
 * const dragStore = new DragStore()
 *
 * // Subscribe to changes
 * const unsubscribe = dragStore.subscribe((state) => {
 *   console.log('Drag state changed:', state)
 * })
 *
 * // Start dragging
 * dragStore.startDrag('card-1', 'col-1')
 *
 * // Update target
 * dragStore.updateTarget('col-2')
 *
 * // End drag
 * dragStore.endDrag()
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
export class DragStore {
  private state: DragState = {
    isDragging: false,
    draggedCardId: null,
    sourceColumnId: null,
    targetColumnId: null,
  }

  private listeners = new Set<(state: DragState) => void>()
  private eventListeners = new Map<DragEvent, Set<DragEventCallback<any>>>()

  // ========================================================================
  // GETTERS
  // ========================================================================

  /**
   * Get current drag state
   */
  getState(): DragState {
    return { ...this.state }
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.state.isDragging
  }

  /**
   * Get dragged card ID
   */
  getDraggedCardId(): string | null {
    return this.state.draggedCardId
  }

  /**
   * Get source column ID
   */
  getSourceColumnId(): string | null {
    return this.state.sourceColumnId
  }

  /**
   * Get target column ID
   */
  getTargetColumnId(): string | null {
    return this.state.targetColumnId
  }

  // ========================================================================
  // SETTERS
  // ========================================================================

  /**
   * Start dragging a card
   *
   * @param cardId - Card being dragged
   * @param sourceColumnId - Source column
   */
  startDrag(cardId: string, sourceColumnId: string): void {
    this.state = {
      isDragging: true,
      draggedCardId: cardId,
      sourceColumnId,
      targetColumnId: sourceColumnId,
    }

    this.emit('drag:start', { cardId, sourceColumnId })
    this.notify()
  }

  /**
   * Update drag target column
   *
   * @param targetColumnId - Target column
   */
  updateTarget(targetColumnId: string): void {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return
    }

    const cardId = this.state.draggedCardId // Type narrowing

    this.state = {
      ...this.state,
      targetColumnId,
    }

    this.emit('drag:over', {
      cardId,
      targetColumnId,
    })
    this.notify()
  }

  /**
   * End drag operation
   */
  endDrag(): void {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return
    }

    const { draggedCardId, sourceColumnId, targetColumnId } = this.state

    this.emit('drag:end', {
      cardId: draggedCardId,
      sourceColumnId: sourceColumnId!,
      targetColumnId: targetColumnId!,
    })

    this.reset()
  }

  /**
   * Cancel drag operation
   */
  cancelDrag(): void {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return
    }

    this.emit('drag:cancel', { cardId: this.state.draggedCardId })
    this.reset()
  }

  /**
   * Reset drag state
   */
  reset(): void {
    this.state = {
      isDragging: false,
      draggedCardId: null,
      sourceColumnId: null,
      targetColumnId: null,
    }
    this.notify()
  }

  /**
   * Set entire drag state at once
   * (For compatibility with existing code)
   *
   * @param state - New drag state
   */
  setState(state: DragState): void {
    this.state = { ...state }
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
  subscribe(callback: (state: DragState) => void): () => void {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Subscribe to drag events
   *
   * @param event - Event type
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  on<K extends DragEvent>(event: K, callback: DragEventCallback<K>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }

    this.eventListeners.get(event)!.add(callback)

    return () => {
      this.eventListeners.get(event)?.delete(callback)
    }
  }

  /**
   * Emit drag event
   */
  private emit<K extends DragEvent>(event: K, data: DragEventData[K]): void {
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
    this.reset()
  }
}

// ========================================================================
// SINGLETON INSTANCE (for compatibility with Jotai usage)
// ========================================================================

/**
 * Global drag store instance
 * Used to replace Jotai atom while maintaining same API
 */
export const dragStore = new DragStore()
