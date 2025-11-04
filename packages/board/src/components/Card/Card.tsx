/**
 * Card Component
 * Individual task card in the Kanban board
 * @module components/Card
 */

import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card as CardType } from '../../types'
import type { User } from './UserAssignmentSelector'
import { cn } from '../../utils'
import { PrioritySelector } from './PrioritySelector'
import { DateRangePicker } from './DateRangePicker'
import { UserAssignmentSelector } from './UserAssignmentSelector'
import { DependenciesSelector } from './DependenciesSelector'

export interface CardProps {
  /** Card data */
  card: CardType
  /** Custom render function */
  render?: (card: CardType) => React.ReactNode
  /** Click handler */
  onClick?: (card: CardType) => void
  /** Is card selected */
  isSelected?: boolean
  /** Disable drag */
  disableDrag?: boolean
  /** Custom className */
  className?: string
  /** Card update handler */
  onUpdate?: (cardId: string, updates: Partial<CardType>) => void
  /** Available users for assignment */
  availableUsers?: User[]
  /** All cards (for dependencies) */
  allCards?: CardType[]
}

/**
 * Default Card Component
 * Optimized with memo to prevent unnecessary re-renders
 */
export const Card = memo<CardProps>(
  ({
    card,
    render,
    onClick,
    isSelected,
    disableDrag,
    className,
    onUpdate,
    availableUsers = [],
    allCards = [],
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: card.id,
      disabled: disableDrag,
      data: {
        type: 'card',
        card,
      },
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    // If custom render provided, use it
    if (render) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => onClick?.(card)}
        >
          {render(card)}
        </div>
      )
    }

    // Get assigned users from IDs
    const assignedUsers = availableUsers.filter((user) =>
      card.assignedUserIds?.includes(user.id)
    )

    // Default card rendering
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'asakaa-card',
          isDragging && 'asakaa-card-dragging',
          isSelected && 'ring-2 ring-asakaa-accent-blue',
          className
        )}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // Prevent card click when interacting with configurables
          if (
            (e.target as HTMLElement).closest(
              '.priority-selector, .date-picker, .user-selector, .dependencies-selector'
            )
          ) {
            return
          }
          onClick?.(card)
        }}
      >
        {/* Cover Image */}
        {card.coverImage && (
          <div className="asakaa-card-cover mb-3">
            <img
              src={card.coverImage}
              alt={`Cover for ${card.title}`}
              className="w-full h-32 object-cover rounded-md"
              loading="lazy"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Title */}
        <h3 className="asakaa-card-title mb-2">{card.title}</h3>

        {/* Description */}
        {card.description && (
          <p className="asakaa-card-description mb-3">{card.description}</p>
        )}

        {/* Configurable properties row */}
        <div className="flex items-center gap-3 mb-3 pt-1">
          {/* Priority selector */}
          <div onClick={(e) => e.stopPropagation()} className="priority-selector">
            <PrioritySelector
              priority={card.priority}
              onChange={(priority) => onUpdate?.(card.id, { priority })}
            />
          </div>

          {/* Date range picker */}
          <div onClick={(e) => e.stopPropagation()} className="date-picker">
            <DateRangePicker
              startDate={
                card.startDate
                  ? typeof card.startDate === 'string'
                    ? card.startDate
                    : card.startDate.toISOString().split('T')[0]
                  : undefined
              }
              endDate={
                card.endDate
                  ? typeof card.endDate === 'string'
                    ? card.endDate
                    : card.endDate.toISOString().split('T')[0]
                  : undefined
              }
              onChange={(startDate, endDate) =>
                onUpdate?.(card.id, { startDate, endDate })
              }
            />
          </div>

          {/* User assignment */}
          {availableUsers.length > 0 && (
            <div onClick={(e) => e.stopPropagation()} className="user-selector">
              <UserAssignmentSelector
                assignedUsers={assignedUsers}
                availableUsers={availableUsers}
                onChange={(users) =>
                  onUpdate?.(card.id, {
                    assignedUserIds: users.map((u) => u.id),
                  })
                }
              />
            </div>
          )}

          {/* Dependencies */}
          <div onClick={(e) => e.stopPropagation()} className="dependencies-selector">
            <DependenciesSelector
              currentCardId={card.id}
              dependencies={
                Array.isArray(card.dependencies)
                  ? card.dependencies.map((d) => (typeof d === 'string' ? d : d.taskId))
                  : []
              }
              availableTasks={allCards}
              onChange={(dependencies) => onUpdate?.(card.id, { dependencies })}
            />
          </div>
        </div>

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 3).map((label) => (
              <span key={label} className="asakaa-label">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  },
  // Custom comparison function for optimal performance
  (prevProps, nextProps) => {
    return (
      prevProps.card.id === nextProps.card.id &&
      prevProps.card.title === nextProps.card.title &&
      prevProps.card.description === nextProps.card.description &&
      prevProps.card.position === nextProps.card.position &&
      prevProps.card.columnId === nextProps.card.columnId &&
      prevProps.card.priority === nextProps.card.priority &&
      prevProps.card.startDate === nextProps.card.startDate &&
      prevProps.card.endDate === nextProps.card.endDate &&
      prevProps.isSelected === nextProps.isSelected &&
      JSON.stringify(prevProps.card.labels) ===
        JSON.stringify(nextProps.card.labels) &&
      JSON.stringify(prevProps.card.assignedUserIds) ===
        JSON.stringify(nextProps.card.assignedUserIds) &&
      JSON.stringify(prevProps.card.dependencies) ===
        JSON.stringify(nextProps.card.dependencies)
    )
  }
)

Card.displayName = 'Card'
