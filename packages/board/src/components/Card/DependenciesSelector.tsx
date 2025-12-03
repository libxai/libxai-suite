/**
 * Dependencies Selector Component
 * Select task dependencies with link icon
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'
import type { Card } from '../../types'

/**
 * Validate if adding a dependency would create a circular reference
 * Uses Depth-First Search (DFS) algorithm
 * @param allCards - All cards in the board
 * @param fromCardId - The card that would become a dependency (the task being depended on)
 * @param toCardId - The card that would depend on fromCardId
 * @returns True if adding this dependency would create a circular reference
 */
export function wouldCreateCircularDependency(
  allCards: Card[],
  fromCardId: string,
  toCardId: string
): boolean {
  // Build dependency map from all cards
  const dependencyMap = new Map<string, string[]>()
  allCards.forEach((card) => {
    if (card.dependencies && Array.isArray(card.dependencies)) {
      // Handle both string[] and Dependency[] formats
      // Dependency from @libxai/core has 'taskId', not 'targetId'
      const deps = card.dependencies.map((d) => {
        if (typeof d === 'string') return d
        // Handle both possible formats
        const depObj = d as { taskId?: string; targetId?: string }
        return depObj.taskId || depObj.targetId || ''
      }).filter(Boolean)
      dependencyMap.set(card.id, deps)
    }
  })

  // Simulate adding the new dependency (toCardId depends on fromCardId)
  const existingDeps = dependencyMap.get(toCardId) || []
  dependencyMap.set(toCardId, [...existingDeps, fromCardId])

  // DFS to detect cycle
  const visited = new Set<string>()
  const recStack = new Set<string>()

  const hasCycle = (cardId: string): boolean => {
    if (!visited.has(cardId)) {
      visited.add(cardId)
      recStack.add(cardId)

      const deps = dependencyMap.get(cardId) || []
      for (const depId of deps) {
        if (!visited.has(depId) && hasCycle(depId)) {
          return true
        } else if (recStack.has(depId)) {
          return true
        }
      }
    }
    recStack.delete(cardId)
    return false
  }

  return hasCycle(toCardId)
}

export interface DependenciesSelectorProps {
  /** Current card (to exclude from dependencies) */
  currentCardId: string
  /** Currently selected dependencies */
  dependencies?: string[]
  /** All available tasks */
  availableTasks: Card[]
  /** Change handler */
  onChange: (dependencies: string[]) => void
  /** Custom className */
  className?: string
  /** Enable circular dependency validation (default: true) */
  validateCircular?: boolean
  /** Callback when circular dependency is detected */
  onCircularDependencyError?: (targetCardId: string, targetCardTitle: string) => void
}

export function DependenciesSelector({
  currentCardId,
  dependencies = [],
  availableTasks,
  onChange,
  className,
  validateCircular = true,
  onCircularDependencyError,
}: DependenciesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasDependencies, setHasDependencies] = useState(dependencies.length > 0)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [circularError, setCircularError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen])

  const handleToggleDependency = (taskId: string) => {
    const isDependency = dependencies.includes(taskId)
    const targetTask = availableTasks.find((t) => t.id === taskId)

    // Clear any previous error
    setCircularError(null)

    if (isDependency) {
      // Removing dependency - always allowed
      const newDeps = dependencies.filter((id) => id !== taskId)
      onChange(newDeps)
      if (newDeps.length === 0) {
        setHasDependencies(false)
      }
    } else {
      // Adding dependency - validate for circular references
      if (validateCircular) {
        const wouldBeCircular = wouldCreateCircularDependency(
          availableTasks,
          taskId,
          currentCardId
        )

        if (wouldBeCircular) {
          const errorMsg = `Cannot add "${targetTask?.title || taskId}" as dependency - would create circular reference`
          setCircularError(errorMsg)
          onCircularDependencyError?.(taskId, targetTask?.title || taskId)
          // Auto-clear error after 3 seconds
          setTimeout(() => setCircularError(null), 3000)
          return // Don't add the dependency
        }
      }

      onChange([...dependencies, taskId])
      setHasDependencies(true)
    }
  }

  const handleToggleHasDependencies = () => {
    const newValue = !hasDependencies
    setHasDependencies(newValue)

    if (!newValue) {
      // Clear all dependencies
      onChange([])
    }
  }

  // Filter out current card and apply search
  const filteredTasks = availableTasks
    .filter((task) => task.id !== currentCardId)
    .filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const linkColor = dependencies.length > 0 ? '#3B82F6' : '#BDC3C7'

  return (
    <div className={`relative ${className || ''}`}>
      {/* Link icon button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded transition-all hover:bg-white/5"
        title={
          dependencies.length > 0
            ? `${dependencies.length} dependencies`
            : 'Add dependencies'
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 9L9 7M11.5 3.5L10 2C8.89543 0.89543 7.10457 0.89543 6 2C4.89543 3.10457 4.89543 4.89543 6 6L7.5 7.5M4.5 12.5L6 14C7.10457 15.1046 8.89543 15.1046 10 14C11.1046 12.8954 11.1046 11.1046 10 10L8.5 8.5"
            stroke={linkColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {dependencies.length > 0 && (
          <span className="text-xs font-medium" style={{ color: linkColor }}>
            {dependencies.length}
          </span>
        )}
      </button>

      {/* Dependencies menu - Using Portal to escape stacking context */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="dependencies-selector-menu absolute rounded-xl shadow-2xl border min-w-[300px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              background: 'var(--modal-v2-bg, #1f1f1f)',
              border: '1px solid var(--modal-v2-border, rgba(255, 255, 255, 0.15))',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              zIndex: 99999,
            }}
          >
          {/* Circular dependency error */}
          {circularError && (
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 5V8M8 11H8.01M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                {circularError}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.05))' }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--modal-v2-text-secondary, rgba(255, 255, 255, 0.7))' }}>
              Task Dependencies
            </span>
          </div>

          {/* Has dependencies checkbox */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.05))' }}>
            <label
              className="flex items-center gap-2 cursor-pointer group"
              onClick={handleToggleHasDependencies}
            >
              <div
                className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                style={{
                  background: hasDependencies ? '#3b82f6' : 'transparent',
                  borderColor: hasDependencies ? '#3b82f6' : 'var(--modal-v2-border, rgba(255, 255, 255, 0.3))',
                }}
              >
                {hasDependencies && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--modal-v2-text-primary, rgba(255, 255, 255, 0.8))' }}>
                Has dependencies
              </span>
            </label>
          </div>

          {/* Task selection (only if hasDependencies is true) */}
          {hasDependencies && (
            <>
              {/* Search input */}
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.05))' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full px-3 py-2 rounded-md text-xs border outline-none transition-all"
                  style={{
                    background: 'var(--modal-v2-bg-secondary, rgba(255, 255, 255, 0.05))',
                    borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.1))',
                    color: 'var(--modal-v2-text-primary, #ffffff)',
                  }}
                  autoFocus
                />
              </div>

              {/* Task list */}
              <div className="py-2 max-h-[280px] overflow-y-auto">
                {filteredTasks.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--modal-v2-text-tertiary, rgba(255, 255, 255, 0.5))' }}>
                    No tasks found
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isDependency = dependencies.includes(task.id)

                    return (
                      <button
                        key={task.id}
                        onClick={() => handleToggleDependency(task.id)}
                        className="w-full px-4 py-2 flex items-start gap-3 text-sm transition-colors"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--modal-v2-bg-secondary, rgba(255, 255, 255, 0.05))'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                          style={{
                            background: isDependency ? '#3b82f6' : 'transparent',
                            borderColor: isDependency ? '#3b82f6' : 'var(--modal-v2-border, rgba(255, 255, 255, 0.3))',
                          }}
                        >
                          {isDependency && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M2 6L5 9L10 3"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Task info */}
                        <div className="flex-1 text-left">
                          <div className="font-medium" style={{ color: 'var(--modal-v2-text-primary, rgba(255, 255, 255, 0.9))' }}>
                            {task.title}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--modal-v2-text-tertiary, rgba(255, 255, 255, 0.5))' }}>
                            {task.id}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}

          {/* Clear button */}
          {dependencies.length > 0 && (
            <div className="px-3 py-2 border-t border-white/5">
              <button
                onClick={() => {
                  onChange([])
                  setHasDependencies(false)
                  setIsOpen(false)
                }}
                className="w-full px-3 py-2 rounded-md text-xs font-medium transition-all hover:bg-red-600/20 border border-red-500/30"
                style={{ color: '#E74C3C' }}
              >
                Clear All Dependencies
              </button>
            </div>
          )}
          </div>
        </Portal>
      )}
    </div>
  )
}
