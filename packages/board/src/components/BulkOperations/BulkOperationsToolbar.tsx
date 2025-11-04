/**
 * Bulk Operations Toolbar
 * Floating toolbar for performing bulk actions on selected cards
 * @module components/BulkOperations
 */

import { memo, useState } from 'react'
import type { Card, Priority, BulkOperationsCallbacks } from '../../types'
import type { User } from '../Card/UserAssignmentSelector'
import { cn } from '../../utils'

export interface BulkOperationsToolbarProps {
  /** Selected cards */
  selectedCards: Card[]
  /** Available users for assignment */
  availableUsers?: User[]
  /** Callback when selection is cleared */
  onClearSelection: () => void
  /** Bulk operations callbacks */
  callbacks: BulkOperationsCallbacks
  /** Available columns for move operation */
  columns?: Array<{ id: string; title: string }>
  /** Available labels */
  availableLabels?: string[]
}

/**
 * Bulk Operations Toolbar Component
 */
export const BulkOperationsToolbar = memo<BulkOperationsToolbarProps>(
  ({
    selectedCards,
    availableUsers = [],
    onClearSelection,
    callbacks,
    columns = [],
    availableLabels = [],
  }) => {
    const [showPriorityMenu, setShowPriorityMenu] = useState(false)
    const [showMoveMenu, setShowMoveMenu] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showLabelMenu, setShowLabelMenu] = useState(false)

    if (selectedCards.length === 0) return null

    const cardIds = selectedCards.map((card) => card.id)

    const handleUpdatePriority = (priority: Priority) => {
      callbacks.onBulkUpdate?.(cardIds, { priority })
      setShowPriorityMenu(false)
    }

    const handleMove = (columnId: string) => {
      callbacks.onBulkMove?.(cardIds, columnId)
      setShowMoveMenu(false)
      onClearSelection()
    }

    const handleAssignUsers = (userIds: string[]) => {
      callbacks.onBulkUpdate?.(cardIds, { assignedUserIds: userIds })
      setShowUserMenu(false)
    }

    const handleAddLabels = (labels: string[]) => {
      // Get existing labels from all selected cards
      const existingLabels = new Set<string>()
      selectedCards.forEach((card) => {
        card.labels?.forEach((label) => existingLabels.add(label))
      })

      // Merge with new labels
      const allLabels = Array.from(new Set([...existingLabels, ...labels]))

      callbacks.onBulkUpdate?.(cardIds, { labels: allLabels })
      setShowLabelMenu(false)
    }

    const handleDelete = () => {
      if (confirm(`Delete ${selectedCards.length} card(s)? This cannot be undone.`)) {
        callbacks.onBulkDelete?.(cardIds)
        onClearSelection()
      }
    }

    return (
      <div className="asakaa-bulk-toolbar">
        <div className="asakaa-bulk-toolbar-content">
          {/* Selection count */}
          <div className="asakaa-bulk-toolbar-count">
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </div>

          {/* Actions */}
          <div className="asakaa-bulk-toolbar-actions">
            {/* Priority */}
            <div className="relative">
              <button
                className="asakaa-bulk-toolbar-button"
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                title="Update priority"
              >
                <span className="text-sm">Priority</span>
              </button>
              {showPriorityMenu && (
                <div className="asakaa-bulk-menu">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((priority) => (
                    <button
                      key={priority}
                      className="asakaa-bulk-menu-item"
                      onClick={() => handleUpdatePriority(priority)}
                    >
                      <span
                        className={cn(
                          'asakaa-priority-dot',
                          priority === 'LOW' && 'bg-asakaa-priority-low',
                          priority === 'MEDIUM' && 'bg-asakaa-priority-medium',
                          priority === 'HIGH' && 'bg-asakaa-priority-high',
                          priority === 'URGENT' && 'bg-asakaa-priority-urgent'
                        )}
                      />
                      {priority}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Move to column */}
            {columns.length > 0 && (
              <div className="relative">
                <button
                  className="asakaa-bulk-toolbar-button"
                  onClick={() => setShowMoveMenu(!showMoveMenu)}
                  title="Move to column"
                >
                  <span className="text-sm">Move</span>
                </button>
                {showMoveMenu && (
                  <div className="asakaa-bulk-menu">
                    {columns.map((column) => (
                      <button
                        key={column.id}
                        className="asakaa-bulk-menu-item"
                        onClick={() => handleMove(column.id)}
                      >
                        {column.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assign users */}
            {availableUsers.length > 0 && (
              <div className="relative">
                <button
                  className="asakaa-bulk-toolbar-button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title="Assign users"
                >
                  <span className="text-sm">Assign</span>
                </button>
                {showUserMenu && (
                  <div className="asakaa-bulk-menu">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        className="asakaa-bulk-menu-item"
                        onClick={() => handleAssignUsers([user.id])}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.initials}
                        </div>
                        {user.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add labels */}
            {availableLabels.length > 0 && (
              <div className="relative">
                <button
                  className="asakaa-bulk-toolbar-button"
                  onClick={() => setShowLabelMenu(!showLabelMenu)}
                  title="Add labels"
                >
                  <span className="text-sm">Labels</span>
                </button>
                {showLabelMenu && (
                  <div className="asakaa-bulk-menu">
                    {availableLabels.map((label) => (
                      <button
                        key={label}
                        className="asakaa-bulk-menu-item"
                        onClick={() => handleAddLabels([label])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delete */}
            <button
              className="asakaa-bulk-toolbar-button asakaa-bulk-toolbar-button-danger"
              onClick={handleDelete}
              title="Delete selected cards"
            >
              <span className="text-sm">Delete</span>
            </button>

            {/* Clear selection */}
            <button
              className="asakaa-bulk-toolbar-button"
              onClick={onClearSelection}
              title="Clear selection"
            >
              <span className="text-sm">✕</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
)

BulkOperationsToolbar.displayName = 'BulkOperationsToolbar'
