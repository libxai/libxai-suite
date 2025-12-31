/**
 * KeyboardShortcutsHelp Component
 * Modal displaying available keyboard shortcuts
 * @module components/KeyboardShortcuts
 */

import { useEffect, useState } from 'react'
import type { KeyboardShortcut } from '../../types'
import { DEFAULT_SHORTCUTS } from '../../hooks/keyboard/useKeyboardShortcuts'
import { cn } from '../../utils'

export interface KeyboardShortcutsHelpProps {
  /** Custom shortcuts to display */
  shortcuts?: KeyboardShortcut[]
  /** Is modal open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Custom className */
  className?: string
}

/**
 * Format keyboard key for display
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: '↵',
    Escape: 'Esc',
    Delete: 'Del',
    ' ': 'Space',
  }
  return keyMap[key] || key.toUpperCase()
}

/**
 * Format modifiers for display
 */
function formatModifiers(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

  if (shortcut.modifiers?.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.modifiers?.shift) {
    parts.push('Shift')
  }
  if (shortcut.modifiers?.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (shortcut.modifiers?.meta) {
    parts.push('⌘')
  }

  return parts.join(' + ')
}

/**
 * Get full shortcut display
 */
function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const keys = Array.isArray(shortcut.keys) ? shortcut.keys[0] : shortcut.keys
  const modifiers = formatModifiers(shortcut)
  const key = keys ? formatKey(keys) : ''

  return modifiers ? `${modifiers} + ${key}` : key
}

/**
 * Group shortcuts by category
 */
function groupShortcuts(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
  const groups: Record<string, KeyboardShortcut[]> = {
    Navigation: [],
    Actions: [],
    Editing: [],
    Selection: [],
  }

  shortcuts.forEach((shortcut) => {
    if (shortcut.action.includes('navigate')) {
      groups.Navigation?.push(shortcut)
    } else if (shortcut.action.includes('select')) {
      groups.Selection?.push(shortcut)
    } else if (['undo', 'redo', 'save'].includes(shortcut.action)) {
      groups.Editing?.push(shortcut)
    } else {
      groups.Actions?.push(shortcut)
    }
  })

  return groups
}

/**
 * KeyboardShortcutsHelp Component
 */
export function KeyboardShortcutsHelp({
  shortcuts = DEFAULT_SHORTCUTS,
  isOpen,
  onClose,
  className,
}: KeyboardShortcutsHelpProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isMounted || !isOpen) return null

  const groups = groupShortcuts(shortcuts)

  return (
    <div className={cn('fixed inset-0 z-[9999] flex items-center justify-center', className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative backdrop-blur-xl rounded-2xl border shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden bg-white dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 border-gray-200 dark:border-white/20">
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between border-gray-200 dark:border-white/10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
              <span className="text-3xl">⌨️</span>
              Keyboard Shortcuts
            </h2>
            <p className="text-sm mt-1 text-gray-500 dark:text-white/60">
              Speed up your workflow with these shortcuts
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors text-2xl leading-none p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(groups).map(([category, categoryShortcuts]) => {
              if (categoryShortcuts.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white/90">
                    <span className="w-1 h-5 bg-blue-500 rounded-full" />
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryShortcuts.map((shortcut) => (
                      <div
                        key={shortcut.action}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <span className="text-sm text-gray-700 dark:text-white/80">
                          {shortcut.description}
                        </span>
                        <kbd className="px-3 py-1.5 border rounded-md text-xs font-mono shadow-sm whitespace-nowrap bg-white border-gray-300 text-gray-800 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 dark:border-white/20 dark:text-white/90">
                          {getShortcutDisplay(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs text-center text-gray-500 dark:text-white/50">
            Press <kbd className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/70">?</kbd> to toggle this help panel
          </p>
        </div>
      </div>
    </div>
  )
}
