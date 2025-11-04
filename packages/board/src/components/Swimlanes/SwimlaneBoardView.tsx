/**
 * SwimlaneBoardView Component
 * Displays board grouped by swimlanes (horizontal rows)
 * @module components/Swimlanes
 */

import { useMemo, useState, useCallback } from 'react'
import type {
  Board,
  Card,
  Column,
  GroupByOption,
  Swimlane,
  SwimlaneConfig,
} from '../../types'
import type { User } from '../Card/UserAssignmentSelector'
import { KanbanBoard } from '../Board'
import { cn } from '../../utils'

export interface SwimlaneBoardViewProps {
  /** Board data */
  board: Board
  /** Swimlane configuration */
  swimlaneConfig: SwimlaneConfig
  /** All available users */
  availableUsers?: User[]
  /** Board callbacks */
  callbacks: {
    onCardMove?: (cardId: string, targetColumnId: string, position: number) => void
    onCardUpdate?: (cardId: string, updates: Partial<Card>) => void
    onColumnUpdate?: (columnId: string, updates: Partial<Column>) => void
    onWipLimitExceeded?: (column: Column, card: Card) => void
  }
  /** Custom className */
  className?: string
}

/**
 * Generate swimlanes based on groupBy option
 */
function generateSwimlanes(
  cards: Card[],
  groupBy: GroupByOption,
  availableUsers?: User[]
): Swimlane[] {
  if (groupBy === 'none') {
    return []
  }

  const laneMap = new Map<string, Swimlane>()

  // Group cards by the selected criteria
  cards.forEach((card) => {
    let groupValue: any
    let laneId: string
    let laneTitle: string
    let laneColor: string | undefined
    let laneIcon: string | undefined

    switch (groupBy) {
      case 'assignee':
        // Use assignedUserIds or fallback to assigneeId
        const assignedUserIds = card.assignedUserIds || (card.assigneeId ? [card.assigneeId] : [])

        if (assignedUserIds.length > 0) {
          assignedUserIds.forEach((userId: string) => {
            const user = availableUsers?.find((u) => u.id === userId)
            laneId = `assignee-${userId}`
            laneTitle = user?.name || `User ${userId}`
            laneColor = user?.color
            laneIcon = user?.avatar

            if (!laneMap.has(laneId)) {
              laneMap.set(laneId, {
                id: laneId,
                title: laneTitle,
                groupValue: userId,
                cardIds: [],
                color: laneColor,
                icon: laneIcon,
              })
            }
            laneMap.get(laneId)!.cardIds.push(card.id)
          })
        } else {
          // Unassigned lane
          laneId = 'assignee-unassigned'
          laneTitle = 'Unassigned'
          laneColor = '#6b7280'
          laneIcon = '👤'

          if (!laneMap.has(laneId)) {
            laneMap.set(laneId, {
              id: laneId,
              title: laneTitle,
              groupValue: null,
              cardIds: [],
              color: laneColor,
              icon: laneIcon,
            })
          }
          laneMap.get(laneId)!.cardIds.push(card.id)
        }
        break

      case 'priority':
        groupValue = card.priority || 'NONE'
        laneId = `priority-${groupValue}`

        // Priority styling
        const priorityConfig = {
          URGENT: { title: '🔴 Urgent', color: '#ef4444' },
          HIGH: { title: '🟠 High', color: '#f97316' },
          MEDIUM: { title: '🟡 Medium', color: '#eab308' },
          LOW: { title: '🟢 Low', color: '#22c55e' },
          NONE: { title: '⚪ No Priority', color: '#6b7280' },
        }

        const config = priorityConfig[groupValue as keyof typeof priorityConfig]
        laneTitle = config.title
        laneColor = config.color

        if (!laneMap.has(laneId)) {
          laneMap.set(laneId, {
            id: laneId,
            title: laneTitle,
            groupValue,
            cardIds: [],
            color: laneColor,
          })
        }
        laneMap.get(laneId)!.cardIds.push(card.id)
        break

      case 'label':
        if (card.labels && card.labels.length > 0) {
          card.labels.forEach((label: string) => {
            laneId = `label-${label}`
            laneTitle = label
            laneColor = '#6b7280' // Default gray color for string labels

            if (!laneMap.has(laneId)) {
              laneMap.set(laneId, {
                id: laneId,
                title: laneTitle,
                groupValue: label,
                cardIds: [],
                color: laneColor,
              })
            }
            laneMap.get(laneId)!.cardIds.push(card.id)
          })
        } else {
          // No labels lane
          laneId = 'label-none'
          laneTitle = 'No Labels'
          laneColor = '#6b7280'

          if (!laneMap.has(laneId)) {
            laneMap.set(laneId, {
              id: laneId,
              title: laneTitle,
              groupValue: null,
              cardIds: [],
              color: laneColor,
            })
          }
          laneMap.get(laneId)!.cardIds.push(card.id)
        }
        break
    }
  })

  return Array.from(laneMap.values()).sort((a, b) => {
    // Sort by title
    return a.title.localeCompare(b.title)
  })
}

/**
 * SwimlaneBoardView Component
 */
export function SwimlaneBoardView({
  board,
  swimlaneConfig,
  availableUsers,
  callbacks,
  className,
}: SwimlaneBoardViewProps) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())

  // Generate swimlanes
  const swimlanes = useMemo(() => {
    return generateSwimlanes(
      board.cards,
      swimlaneConfig.groupBy,
      availableUsers
    )
  }, [board.cards, swimlaneConfig.groupBy, availableUsers])

  // Toggle lane collapse
  const toggleLaneCollapse = useCallback((laneId: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(laneId)) {
        next.delete(laneId)
      } else {
        next.add(laneId)
      }
      return next
    })
  }, [])

  // If no grouping, render standard board
  if (swimlaneConfig.groupBy === 'none' || swimlanes.length === 0) {
    return (
      <KanbanBoard
        board={board}
        callbacks={callbacks}
        availableUsers={availableUsers}
        className={className}
      />
    )
  }

  return (
    <div className={cn('asakaa-swimlane-view', className)}>
      {swimlanes.map((lane) => {
        const isCollapsed = collapsedLanes.has(lane.id)

        // Filter cards for this lane
        const laneCards = board.cards.filter((card) =>
          lane.cardIds.includes(card.id)
        )

        // Create filtered board for this lane
        const laneBoard: Board = {
          ...board,
          cards: laneCards,
        }

        return (
          <div
            key={lane.id}
            className="asakaa-swimlane mb-6 rounded-lg border border-white/10 overflow-hidden"
          >
            {/* Swimlane Header */}
            <div
              className="asakaa-swimlane-header px-4 py-3 bg-white/5 backdrop-blur-sm flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => swimlaneConfig.collapsible && toggleLaneCollapse(lane.id)}
              style={{
                borderLeft: lane.color ? `4px solid ${lane.color}` : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                {lane.icon && (
                  <span className="text-2xl leading-none">{lane.icon}</span>
                )}
                <h3
                  className="text-lg font-semibold"
                  style={{ color: lane.color }}
                >
                  {lane.title}
                </h3>
                <span className="text-sm text-white/50 font-medium">
                  ({lane.cardIds.length} {lane.cardIds.length === 1 ? 'card' : 'cards'})
                </span>
              </div>

              {swimlaneConfig.collapsible && (
                <button
                  className="text-white/50 hover:text-white transition-colors"
                  aria-label={isCollapsed ? 'Expand lane' : 'Collapse lane'}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>
              )}
            </div>

            {/* Swimlane Content */}
            {!isCollapsed && (
              <div className="asakaa-swimlane-content p-4">
                <KanbanBoard
                  board={laneBoard}
                  callbacks={callbacks}
                  availableUsers={availableUsers}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {swimlanes.length === 0 && (
        <div className="text-center py-12 text-white/50">
          <p className="text-lg">No cards to display</p>
          <p className="text-sm mt-2">
            Cards will appear here when they match the grouping criteria
          </p>
        </div>
      )}
    </div>
  )
}
