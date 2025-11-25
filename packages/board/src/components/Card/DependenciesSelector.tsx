/**
 * Dependencies Selector V2
 * Select task dependencies with link icon
 * Uses world-class Dropdown system for perfect positioning
 */

import { useState } from 'react'
import { Dropdown } from '../Dropdown'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [hasDependencies, setHasDependencies] = useState(dependencies.length > 0)

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
    <Dropdown
      trigger={({ isOpen }) => (
        <button
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all hover:bg-white/5 ${className || ''}`}
          style={{
            transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          }}
          title={
            dependencies.length > 0
              ? `${dependencies.length} dependencies`
              : 'Add dependencies'
          }
          aria-label="Select dependencies"
          aria-expanded={isOpen}
          aria-haspopup="menu"
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
      )}
      placement="bottom-start"
      minWidth={300}
      maxHeight={350}
      itemCount={hasDependencies ? filteredTasks.length : 0}
      onSelectItem={(index) => {
        const task = filteredTasks[index]
        if (task) {
          handleToggleDependency(task.id)
        }
      }}
      onClose={() => setSearchQuery('')}
      onOpen={() => setHasDependencies(dependencies.length > 0)}
    >
      {({ activeIndex, close }) => (
        <div className="dependencies-dropdown">
          {/* Header */}
          <div className="dropdown-section-header">Task Dependencies</div>

          {/* Has dependencies checkbox */}
          <div className="dropdown-button-wrapper" style={{ borderBottom: '1px solid var(--asakaa-color-border-subtle)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
              onClick={handleToggleHasDependencies}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  border: hasDependencies
                    ? '2px solid var(--asakaa-color-interactive-primary)'
                    : '2px solid var(--asakaa-color-border-default)',
                  background: hasDependencies
                    ? 'var(--asakaa-color-interactive-primary)'
                    : 'transparent',
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
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--asakaa-color-text-primary)'
              }}>
                Has dependencies
              </span>
            </label>
          </div>

          {/* Task selection (only if hasDependencies is true) */}
          {hasDependencies && (
            <>
              {/* Search input */}
              <div className="dropdown-search-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="dropdown-search-input"
                  autoFocus
                />
              </div>

              {/* Task list */}
              <div className="dropdown-list">
                {filteredTasks.length === 0 ? (
                  <div className="dropdown-empty">
                    No tasks found
                  </div>
                ) : (
                  filteredTasks.map((task, index) => {
                    const isDependency = dependencies.includes(task.id)

                    return (
                      <button
                        key={task.id}
                        onClick={() => handleToggleDependency(task.id)}
                        className="dropdown-item"
                        data-active={activeIndex === index}
                        data-index={index}
                        role="option"
                        aria-selected={isDependency}
                      >
                        {/* Checkbox */}
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                            transition: 'all 0.15s',
                            border: isDependency
                              ? '2px solid var(--asakaa-color-interactive-primary)'
                              : '2px solid var(--asakaa-color-border-default)',
                            background: isDependency
                              ? 'var(--asakaa-color-interactive-primary)'
                              : 'transparent',
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
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{
                            fontWeight: 600,
                            color: 'var(--asakaa-color-text-primary)'
                          }}>
                            {task.title}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            marginTop: '2px',
                            color: 'var(--asakaa-color-text-secondary)'
                          }}>
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
            <div className="dropdown-button-wrapper">
              <button
                onClick={() => {
                  onChange([])
                  setHasDependencies(false)
                  close()
                }}
                className="dropdown-danger-button"
              >
                Clear All Dependencies
              </button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}
