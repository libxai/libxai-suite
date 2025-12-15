/**
 * Column Component
 * Vertical column containing cards
 * @module components/Column
 */

import { memo, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Column as ColumnType, Card as CardType } from '../../types'
import type { User } from '../Card/UserAssignmentSelector'
import { Card } from '../Card'
import { ColumnMenu } from './ColumnMenu'
import { cn, shouldVirtualize } from '../../utils'

export interface ColumnProps {
  /** Column data */
  column: ColumnType
  /** Cards in this column */
  cards: CardType[]
  /** Custom column renderer */
  renderColumn?: (column: ColumnType, cards: CardType[]) => React.ReactNode
  /** Custom card renderer */
  renderCard?: (card: CardType) => React.ReactNode
  /** Custom header renderer */
  renderHeader?: (column: ColumnType, cardCount: number) => React.ReactNode
  /** Custom empty state */
  renderEmptyState?: (column: ColumnType) => React.ReactNode
  /** Card click handler */
  onCardClick?: (card: CardType) => void
  /** Card update handler */
  onCardUpdate?: (cardId: string, updates: Partial<CardType>) => void
  /** Available users for assignment */
  availableUsers?: User[]
  /** All cards (for dependencies) */
  allCards?: CardType[]
  /** Enable virtualization */
  enableVirtualization?: boolean
  /** Estimated card height for virtualization */
  cardHeight?: number
  /** Is column collapsed */
  isCollapsed?: boolean
  /** Toggle collapse */
  onToggleCollapse?: () => void
  /** Column rename handler */
  onColumnRename?: (columnId: string, newTitle: string) => void
  /** v0.17.55: Column delete handler */
  onColumnDelete?: (columnId: string) => void
  /** v0.17.55: Whether column can be deleted (false for default columns) */
  isDeletable?: boolean
  /** Custom className */
  className?: string
}

/**
 * Column Component
 * Uses virtualization for large lists automatically
 */
export const Column = memo<ColumnProps>(
  ({
    column,
    cards,
    renderColumn,
    renderCard,
    renderHeader,
    renderEmptyState,
    onCardClick,
    onCardUpdate,
    availableUsers,
    allCards,
    enableVirtualization,
    cardHeight = 120,
    isCollapsed,
    onToggleCollapse,
    onColumnRename,
    onColumnDelete,
    isDeletable = false,
    className,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: column.id,
      data: {
        type: 'column',
        column,
      },
    })

    const parentRef = useRef<HTMLDivElement>(null)

    // Auto-enable virtualization for large lists
    const useVirtualization =
      enableVirtualization ?? shouldVirtualize(cards.length)

    // Setup virtualizer
    const virtualizer = useVirtualizer({
      count: cards.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => cardHeight,
      enabled: useVirtualization,
    })

    // Custom column renderer
    if (renderColumn) {
      return (
        <div ref={setNodeRef} className={className}>
          {renderColumn(column, cards)}
        </div>
      )
    }

    // Calculate WIP limit status
    const getWipLimitStatus = () => {
      if (!column.wipLimit) return { state: 'none', percentage: 0 }

      const percentage = (cards.length / column.wipLimit) * 100

      if (cards.length > column.wipLimit) {
        return { state: 'exceeded', percentage }
      } else if (percentage >= 80) {
        return { state: 'warning', percentage }
      } else if (percentage >= 60) {
        return { state: 'approaching', percentage }
      } else {
        return { state: 'ok', percentage }
      }
    }

    const wipStatus = getWipLimitStatus()
    const isOverWipLimit = wipStatus.state === 'exceeded'

    // WIP limit badge styling - simplified without color backgrounds
    const getWipBadgeClasses = () => {
      // All WIP limits use the same base class for consistent, subtle display
      return 'asakaa-column-count'
    }

    return (
      <div
        ref={setNodeRef}
        className={cn(
          'asakaa-column',
          isOver && 'ring-2 ring-asakaa-accent-blue',
          isOverWipLimit && 'ring-2 ring-asakaa-accent-red',
          className
        )}
      >
        {/* Header */}
        {renderHeader ? (
          renderHeader(column, cards.length)
        ) : (
          <div className="asakaa-column-header group">
            <h2 className="asakaa-column-title">{column.title}</h2>
            <div className="flex items-center gap-2">
              <span className={cn(getWipBadgeClasses())}>
                {cards.length}
                {column.wipLimit && ` / ${column.wipLimit}`}
              </span>
              {/* WIP limit status indicator */}
              {column.wipLimit && wipStatus.state !== 'none' && (
                <span
                  className="text-xs font-medium flex items-center"
                  title={`${wipStatus.percentage.toFixed(0)}% capacity${
                    column.wipLimitType === 'hard'
                      ? ' (Hard limit - blocks new cards)'
                      : ' (Soft limit - shows warning)'
                  }`}
                >
                  {wipStatus.state === 'exceeded' && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="#EF4444" opacity="0.9" />
                      <path d="M5 5L11 11M11 5L5 11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {wipStatus.state === 'warning' && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L15 14H1L8 1Z" fill="#F59E0B" opacity="0.9" />
                      <path d="M8 6V9M8 11V11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                  {wipStatus.state === 'approaching' && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L10 7H14L10 10L12 16L8 12L4 16L6 10L2 7H6L8 1Z" fill="#FB923C" opacity="0.9" />
                    </svg>
                  )}
                  {wipStatus.state === 'ok' && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="#10B981" opacity="0.9" />
                      <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              )}
              {(onColumnRename || onColumnDelete) && (
                <ColumnMenu
                  columnTitle={column.title}
                  onRename={(newTitle) => onColumnRename?.(column.id, newTitle)}
                  onDelete={onColumnDelete ? () => onColumnDelete(column.id) : undefined}
                  isDeletable={isDeletable}
                />
              )}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="text-asakaa-text-tertiary hover:text-asakaa-text-primary"
                  aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cards */}
        {!isCollapsed && (
          <div
            ref={parentRef}
            className="asakaa-column-cards"
            style={{
              maxHeight: useVirtualization ? '600px' : undefined,
            }}
          >
            <SortableContext
              items={cards.map((card) => card.id)}
              strategy={verticalListSortingStrategy}
            >
              {cards.length === 0 ? (
                // Empty state
                renderEmptyState ? (
                  renderEmptyState(column)
                ) : (
                  <div className="asakaa-drop-zone asakaa-empty">
                    <p>Drop cards here</p>
                  </div>
                )
              ) : useVirtualization ? (
                // Virtualized list
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const card = cards[virtualItem.index]
                    if (!card) return null

                    return (
                      <div
                        key={card.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <Card
                          card={card}
                          render={renderCard}
                          onClick={onCardClick}
                          onUpdate={onCardUpdate}
                          availableUsers={availableUsers}
                          allCards={allCards}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Regular list
                cards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    render={renderCard}
                    onClick={onCardClick}
                    onUpdate={onCardUpdate}
                    availableUsers={availableUsers}
                    allCards={allCards}
                  />
                ))
              )}
            </SortableContext>
          </div>
        )}
      </div>
    )
  }
  // Memoization removed to allow card property updates to trigger re-renders
  // The individual Card components are still memoized for performance
)

Column.displayName = 'Column'
