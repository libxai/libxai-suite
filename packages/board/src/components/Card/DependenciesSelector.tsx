/**
 * Dependencies Selector Component
 * Select task dependencies with link icon
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'
import type { Card } from '../../types'

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
}

export function DependenciesSelector({
  currentCardId,
  dependencies = [],
  availableTasks,
  onChange,
  className,
}: DependenciesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasDependencies, setHasDependencies] = useState(dependencies.length > 0)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
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

    if (isDependency) {
      const newDeps = dependencies.filter((id) => id !== taskId)
      onChange(newDeps)
      if (newDeps.length === 0) {
        setHasDependencies(false)
      }
    } else {
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
