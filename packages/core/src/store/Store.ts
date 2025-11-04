/**
 * Event-based Store - Framework-agnostic state management
 * @module store/Store
 */

import type { EventListener, StoreEvent } from '../types'

/**
 * Generic event-based store using pub/sub pattern
 *
 * @example
 * ```typescript
 * interface AppState {
 *   count: number
 * }
 *
 * const store = new Store<AppState>({ count: 0 })
 *
 * // Subscribe to events
 * store.subscribe('count:changed', (event) => {
 *   console.log('Count:', event.data)
 * })
 *
 * // Emit events
 * store.emit('count:changed', { count: 1 })
 *
 * // Update state
 * store.setState(state => ({ count: state.count + 1 }))
 * ```
 */
export class Store<TState = unknown> {
  private state: TState
  private subscribers: Map<string, Set<EventListener>>
  private globalSubscribers: Set<EventListener>

  constructor(initialState: TState) {
    this.state = initialState
    this.subscribers = new Map()
    this.globalSubscribers = new Set()
  }

  /**
   * Get current state (readonly)
   *
   * @returns Current state
   */
  getState(): Readonly<TState> {
    return this.state
  }

  /**
   * Update state
   *
   * @param updater - Function that receives current state and returns new state
   * @returns New state
   */
  setState(updater: (state: TState) => TState): TState {
    const prevState = this.state
    this.state = updater(this.state)

    // Emit state:changed event
    this.emit('state:changed', {
      prevState,
      nextState: this.state,
    })

    return this.state
  }

  /**
   * Subscribe to a specific event
   *
   * @param eventType - Event type to listen to
   * @param listener - Listener function
   * @returns Unsubscribe function
   */
  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }

    const listeners = this.subscribers.get(eventType)!
    listeners.add(listener)

    // Return unsubscribe function
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.subscribers.delete(eventType)
      }
    }
  }

  /**
   * Subscribe to all events
   *
   * @param listener - Listener function
   * @returns Unsubscribe function
   */
  subscribeAll(listener: EventListener): () => void {
    this.globalSubscribers.add(listener)

    return () => {
      this.globalSubscribers.delete(listener)
    }
  }

  /**
   * Emit an event
   *
   * @param eventType - Event type
   * @param data - Event data
   * @param metadata - Optional metadata
   */
  emit<T = unknown>(eventType: string, data: T, metadata?: Record<string, unknown>): void {
    const event: StoreEvent<T> = {
      type: eventType,
      data,
      timestamp: new Date(),
      metadata,
    }

    // Notify specific event subscribers
    const listeners = this.subscribers.get(eventType)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error)
        }
      })
    }

    // Notify global subscribers
    this.globalSubscribers.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error(`Error in global event listener:`, error)
      }
    })
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear()
    this.globalSubscribers.clear()
  }

  /**
   * Get subscriber count for an event
   *
   * @param eventType - Event type (omit for total count)
   * @returns Number of subscribers
   */
  getSubscriberCount(eventType?: string): number {
    if (eventType) {
      return this.subscribers.get(eventType)?.size ?? 0
    }

    let total = this.globalSubscribers.size
    this.subscribers.forEach(listeners => {
      total += listeners.size
    })
    return total
  }

  /**
   * Check if there are any subscribers for an event
   *
   * @param eventType - Event type
   * @returns true if there are subscribers
   */
  hasSubscribers(eventType: string): boolean {
    return this.getSubscriberCount(eventType) > 0
  }
}
