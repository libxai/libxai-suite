/**
 * useKeyboardShortcuts Hook
 * Global keyboard shortcuts system for board navigation and actions
 * @module hooks/keyboard
 */

import { useEffect, useCallback, useRef } from 'react'
import type { KeyboardShortcut, KeyboardAction } from '../../types'

export interface UseKeyboardShortcutsOptions {
  /** Shortcuts configuration */
  shortcuts?: KeyboardShortcut[]
  /** Enable/disable shortcuts */
  enabled?: boolean
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

export interface UseKeyboardShortcutsReturn {
  /** Register a keyboard shortcut dynamically */
  registerShortcut: (shortcut: KeyboardShortcut) => void
  /** Unregister a keyboard shortcut */
  unregisterShortcut: (action: KeyboardAction) => void
  /** Check if shortcuts are enabled */
  isEnabled: boolean
}

/**
 * Default keyboard shortcuts for Kanban board
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    keys: 'ArrowUp',
    action: 'navigate_up',
    description: 'Navigate to card above',
  },
  {
    keys: 'ArrowDown',
    action: 'navigate_down',
    description: 'Navigate to card below',
  },
  {
    keys: 'ArrowLeft',
    action: 'navigate_left',
    description: 'Navigate to previous column',
  },
  {
    keys: 'ArrowRight',
    action: 'navigate_right',
    description: 'Navigate to next column',
  },
  {
    keys: 'Enter',
    action: 'open_card',
    description: 'Open selected card',
  },
  {
    keys: 'Escape',
    action: 'close_modal',
    description: 'Close modal or dialog',
  },
  {
    keys: 'Delete',
    action: 'delete_card',
    description: 'Delete selected card',
    modifiers: { shift: true },
  },
  {
    keys: 'n',
    action: 'new_card',
    description: 'Create new card',
    modifiers: { ctrl: true },
  },
  {
    keys: 'k',
    action: 'search',
    description: 'Open search/command palette',
    modifiers: { ctrl: true },
  },
  {
    keys: 's',
    action: 'save',
    description: 'Save changes',
    modifiers: { ctrl: true },
  },
  {
    keys: 'z',
    action: 'undo',
    description: 'Undo last action',
    modifiers: { ctrl: true },
  },
  {
    keys: 'y',
    action: 'redo',
    description: 'Redo last undone action',
    modifiers: { ctrl: true },
  },
  {
    keys: 'a',
    action: 'select_all',
    description: 'Select all cards',
    modifiers: { ctrl: true },
  },
  {
    keys: 'Escape',
    action: 'deselect_all',
    description: 'Deselect all cards',
  },
  {
    keys: '?',
    action: 'show_shortcuts',
    description: 'Show keyboard shortcuts help',
    modifiers: { shift: true },
  },
]

/**
 * Check if keyboard event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keys = Array.isArray(shortcut.keys) ? shortcut.keys : [shortcut.keys]
  const keyMatches = keys.some((key) => event.key === key || event.code === key)

  if (!keyMatches) return false

  const modifiers = shortcut.modifiers || {}
  const ctrlMatch = modifiers.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey
  const shiftMatch = modifiers.shift ? event.shiftKey : !event.shiftKey
  const altMatch = modifiers.alt ? event.altKey : !event.altKey
  const metaMatch = modifiers.meta ? event.metaKey : true // Don't enforce meta unless specified

  return ctrlMatch && shiftMatch && altMatch && metaMatch
}

/**
 * useKeyboardShortcuts Hook
 *
 * @example
 * ```tsx
 * const { registerShortcut } = useKeyboardShortcuts({
 *   shortcuts: DEFAULT_SHORTCUTS,
 *   enabled: true,
 *   preventDefault: true,
 * })
 *
 * // Listen for keyboard actions
 * useEffect(() => {
 *   const handleKeyboardAction = (event: CustomEvent<KeyboardAction>) => {
 *     console.log('Action triggered:', event.detail)
 *   }
 *
 *   window.addEventListener('keyboard-action', handleKeyboardAction)
 *   return () => window.removeEventListener('keyboard-action', handleKeyboardAction)
 * }, [])
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const {
    shortcuts = DEFAULT_SHORTCUTS,
    enabled = true,
    preventDefault = true,
  } = options

  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts)
  const enabledRef = useRef(enabled)

  // Update refs when options change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    enabledRef.current = enabled
  }, [shortcuts, enabled])

  // Register a new shortcut dynamically
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current = [...shortcutsRef.current, shortcut]
  }, [])

  // Unregister a shortcut
  const unregisterShortcut = useCallback((action: KeyboardAction) => {
    shortcutsRef.current = shortcutsRef.current.filter((s) => s.action !== action)
  }, [])

  // Handle keyboard events
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!enabledRef.current) return

      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape and Ctrl+shortcuts even in inputs
        if (event.key !== 'Escape' && !event.ctrlKey && !event.metaKey) {
          return
        }
      }

      // Check each shortcut
      for (const shortcut of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut)) {
          if (preventDefault) {
            event.preventDefault()
          }

          // Dispatch custom event with action
          const customEvent = new CustomEvent('keyboard-action', {
            detail: shortcut.action,
            bubbles: true,
            cancelable: true,
          })
          window.dispatchEvent(customEvent)

          break // Only trigger first matching shortcut
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [preventDefault])

  return {
    registerShortcut,
    unregisterShortcut,
    isEnabled: enabled,
  }
}
