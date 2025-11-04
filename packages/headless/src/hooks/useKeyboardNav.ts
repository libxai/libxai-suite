/**
 * Framework-agnostic keyboard navigation hook
 * Handles keyboard shortcuts without UI dependencies
 */

import type { KeyboardShortcut } from '../types'

export interface UseKeyboardNavConfig {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export interface UseKeyboardNavReturn {
  // Register/unregister
  addShortcut: (shortcut: KeyboardShortcut) => void
  removeShortcut: (key: string) => void
  clearShortcuts: () => void

  // State
  getShortcuts: () => KeyboardShortcut[]
  isEnabled: () => boolean
  setEnabled: (enabled: boolean) => void

  // Manual trigger
  handleKeyDown: (event: KeyboardEvent) => void

  // Lifecycle
  init: () => () => void
  destroy: () => void
}

/**
 * Creates a framework-agnostic keyboard navigation manager
 *
 * @example
 * ```typescript
 * const keyboard = useKeyboardNav({
 *   shortcuts: [
 *     {
 *       key: 'n',
 *       handler: () => createNewCard(),
 *       description: 'Create new card'
 *     },
 *     {
 *       key: 'k',
 *       ctrlKey: true,
 *       handler: () => openCommandPalette(),
 *       description: 'Open command palette'
 *     }
 *   ]
 * })
 *
 * // Initialize (attach event listeners)
 * const cleanup = keyboard.init()
 *
 * // Cleanup when done
 * cleanup()
 * ```
 */
export function useKeyboardNav(config: UseKeyboardNavConfig): UseKeyboardNavReturn {
  let shortcuts = [...config.shortcuts]
  let enabled = config.enabled !== false
  let eventListener: ((e: KeyboardEvent) => void) | null = null

  const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
    const ctrlMatches = (shortcut.ctrlKey ?? false) === (event.ctrlKey || event.metaKey)
    const shiftMatches = (shortcut.shiftKey ?? false) === event.shiftKey
    const altMatches = (shortcut.altKey ?? false) === event.altKey

    return keyMatches && ctrlMatches && shiftMatches && altMatches
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Ctrl+key shortcuts even in inputs
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
    }

    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        shortcut.handler(event)
        break
      }
    }
  }

  return {
    // Register/unregister
    addShortcut: (shortcut) => {
      shortcuts.push(shortcut)
    },

    removeShortcut: (key) => {
      shortcuts = shortcuts.filter(s => s.key !== key)
    },

    clearShortcuts: () => {
      shortcuts = []
    },

    // State
    getShortcuts: () => [...shortcuts],

    isEnabled: () => enabled,

    setEnabled: (value) => {
      enabled = value
    },

    // Manual trigger
    handleKeyDown,

    // Lifecycle
    init: () => {
      if (typeof window === 'undefined') {
        return () => {}
      }

      eventListener = handleKeyDown
      window.addEventListener('keydown', eventListener)

      return () => {
        if (eventListener) {
          window.removeEventListener('keydown', eventListener)
          eventListener = null
        }
      }
    },

    destroy: () => {
      if (eventListener) {
        window.removeEventListener('keydown', eventListener)
        eventListener = null
      }
    }
  }
}
