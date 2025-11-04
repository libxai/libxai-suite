/**
 * Framework-agnostic store creator
 * Works with any framework - React, Vue, Svelte, or Vanilla JS
 */

import type { HookStore, Subscriber } from '../types'

/**
 * Creates a framework-agnostic store
 *
 * @example
 * ```typescript
 * const store = createStore({ count: 0 })
 *
 * // Subscribe to changes
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('State changed:', state)
 * })
 *
 * // Update state
 * store.setState((state) => ({ count: state.count + 1 }))
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
export function createStore<T>(initialState: T): HookStore<T> {
  let state = initialState
  const subscribers = new Set<Subscriber<T>>()

  return {
    getState: () => state,

    setState: (updater) => {
      const newState = updater(state)
      if (newState !== state) {
        state = newState
        subscribers.forEach(subscriber => subscriber(state))
      }
    },

    subscribe: (subscriber) => {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    }
  }
}
