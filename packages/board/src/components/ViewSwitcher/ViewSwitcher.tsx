/**
 * ViewSwitcher - Toggle between board view modes
 *
 * Allows switching between Kanban, Table, and List views
 * Inspired by Linear, Notion, and ClickUp
 */

import { useCallback } from 'react'
import { cn } from '../../utils'
import './view-switcher.css'

export type ViewMode = 'kanban' | 'table' | 'list'

export interface ViewSwitcherProps {
  /** Current active view */
  currentView: ViewMode

  /** Available view modes */
  enabledViews?: ViewMode[]

  /** Change callback */
  onChange: (view: ViewMode) => void

  /** Custom class name */
  className?: string

  /** Show labels alongside icons */
  showLabels?: boolean

  /** Size variant */
  size?: 'small' | 'medium' | 'large'
}

interface ViewOption {
  id: ViewMode
  label: string
  icon: React.ReactNode
  description: string
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'kanban',
    label: 'Board',
    description: 'Kanban columns with drag & drop',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="10" rx="1" />
      </svg>
    ),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Spreadsheet with sorting',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    description: 'Compact list view',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
]

export function ViewSwitcher({
  currentView,
  enabledViews = ['kanban', 'table', 'list'],
  onChange,
  className,
  showLabels = true,
  size = 'medium',
}: ViewSwitcherProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, view: ViewMode) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onChange(view)
      }
    },
    [onChange]
  )

  const filteredOptions = VIEW_OPTIONS.filter((option) =>
    enabledViews.includes(option.id)
  )

  if (filteredOptions.length === 0) {
    return null
  }

  return (
    <div
      className={cn('view-switcher', `view-switcher-${size}`, className)}
      role="tablist"
      aria-label="View mode selector"
    >
      {filteredOptions.map((option) => {
        const isActive = currentView === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={option.label}
            title={option.description}
            className={cn('view-switcher-button', {
              'view-switcher-button-active': isActive,
            })}
            onClick={() => onChange(option.id)}
            onKeyDown={(e) => handleKeyDown(e, option.id)}
          >
            <span className="view-switcher-icon">{option.icon}</span>
            {showLabels && (
              <span className="view-switcher-label">{option.label}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Compact version - icons only
 */
export function ViewSwitcherCompact(props: Omit<ViewSwitcherProps, 'showLabels' | 'size'>) {
  return <ViewSwitcher {...props} showLabels={false} size="small" />
}
