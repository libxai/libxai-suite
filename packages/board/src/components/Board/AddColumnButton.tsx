/**
 * AddColumnButton Component
 * Button to add new columns to the Kanban board
 * @module components/Board/AddColumnButton
 */

import { useState, useCallback } from 'react'
import { cn } from '../../utils'

export interface AddColumnButtonProps {
  /** Callback when a new column should be created */
  onAddColumn: (title: string) => void
  /** Custom class name */
  className?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Button label */
  buttonLabel?: string
  /** Whether the button is disabled */
  disabled?: boolean
}

/**
 * AddColumnButton - A button that allows users to add new columns to the Kanban board
 *
 * Can be used in two modes:
 * 1. Simple mode: Just a button that calls onAddColumn with a default name
 * 2. Input mode: Shows an input field for the user to type the column name
 *
 * @example
 * ```tsx
 * // Simple usage - inside KanbanBoard as children
 * <KanbanBoard board={board} callbacks={callbacks}>
 *   <AddColumnButton onAddColumn={(title) => callbacks.onColumnCreate?.({ title, position: 1000 })} />
 * </KanbanBoard>
 *
 * // With useKanbanState hook
 * const { helpers } = useKanbanState({ initialBoard })
 * <AddColumnButton onAddColumn={(title) => helpers.addColumn({ title, position: Date.now() })} />
 * ```
 */
export function AddColumnButton({
  onAddColumn,
  className,
  placeholder = 'Nombre de la columna...',
  buttonLabel = 'Agregar Columna',
  disabled = false,
}: AddColumnButtonProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim()
    if (trimmedTitle) {
      onAddColumn(trimmedTitle)
      setTitle('')
      setIsEditing(false)
    }
  }, [title, onAddColumn])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        setTitle('')
        setIsEditing(false)
      }
    },
    [handleSubmit]
  )

  const handleBlur = useCallback(() => {
    // Small delay to allow submit button click to register
    setTimeout(() => {
      if (!title.trim()) {
        setIsEditing(false)
      }
    }, 150)
  }, [title])

  if (isEditing) {
    return (
      <div
        className={cn(
          'asakaa-add-column asakaa-add-column--editing',
          className
        )}
      >
        <div className="asakaa-add-column__input-wrapper">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoFocus
            className="asakaa-add-column__input"
          />
          <div className="asakaa-add-column__actions">
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="asakaa-add-column__submit"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              onClick={() => {
                setTitle('')
                setIsEditing(false)
              }}
              className="asakaa-add-column__cancel"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('asakaa-add-column', className)}>
      <button
        onClick={() => setIsEditing(true)}
        disabled={disabled}
        className="asakaa-add-column__button"
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {buttonLabel}
      </button>
    </div>
  )
}
