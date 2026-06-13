/**
 * SwimlaneBoardView Component
 * Displays board grouped by swimlanes (horizontal rows)
 * @module components/Swimlanes
 */

import { useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type {
  Board,
  Card,
  Column,
  GroupByOption,
  KanbanBoardProps,
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

  // ── Extensiones para jerarquía WBS (consumidor-driven) ──
  /**
   * Swimlanes PRE-CONSTRUIDOS por el consumidor. Si se proveen, se usan tal
   * cual y se ignora `swimlaneConfig.groupBy` / generateSwimlanes. Permite
   * agrupar por cualquier criterio externo (p.ej. jerarquía WBS padre→hojas)
   * que la librería no modela internamente.
   */
  swimlanes?: Swimlane[]
  /**
   * Render custom de la cabecera de cada lane. Si se omite, se usa el header
   * por defecto (icono + título + conteo). Recibe la lane y si está colapsada;
   * el click de colapso lo gestiona el contenedor — envolver el contenido en
   * el área clickeable es responsabilidad del header default, así que cuando
   * se provee este render, el toggle se expone vía `onToggleCollapse`.
   */
  renderSwimlaneHeader?: (args: {
    lane: Swimlane
    isCollapsed: boolean
    cardCount: number
    onToggleCollapse: () => void
  }) => ReactNode
  /**
   * renderProps/config/onCardClick que se reenvían al KanbanBoard de CADA
   * lane (antes se perdían: las tarjetas dentro de swimlanes no podían usar
   * renderers custom). Opcionales y retrocompatibles.
   */
  renderProps?: KanbanBoardProps['renderProps']
  config?: KanbanBoardProps['config']
  onCardClick?: KanbanBoardProps['onCardClick']
  suppressDetailModal?: boolean
  availableTags?: KanbanBoardProps['availableTags']
  attachmentsByCard?: KanbanBoardProps['attachmentsByCard']
  renderColumnMetrics?: KanbanBoardProps['renderColumnMetrics']
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
  swimlanes: providedSwimlanes,
  renderSwimlaneHeader,
  renderProps,
  config,
  onCardClick,
  suppressDetailModal,
  availableTags,
  attachmentsByCard,
  renderColumnMetrics,
}: SwimlaneBoardViewProps) {
  // Lanes completadas pueden nacer colapsadas (R15): el consumidor lo indica
  // con isCollapsed en las lanes pre-construidas.
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(() => {
    const init = new Set<string>()
    if (providedSwimlanes) {
      for (const l of providedSwimlanes) if (l.isCollapsed) init.add(l.id)
    }
    return init
  })

  // Swimlanes: pre-construidos por el consumidor (WBS) o generados por groupBy
  const swimlanes = useMemo(() => {
    if (providedSwimlanes) return providedSwimlanes
    return generateSwimlanes(
      board.cards,
      swimlaneConfig.groupBy,
      availableUsers
    )
  }, [providedSwimlanes, board.cards, swimlaneConfig.groupBy, availableUsers])

  // Props comunes que se reenvían al KanbanBoard de cada lane
  const innerBoardProps = {
    callbacks,
    availableUsers,
    renderProps,
    config,
    onCardClick,
    suppressDetailModal,
    availableTags,
    attachmentsByCard,
    renderColumnMetrics,
  }

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

  // Sin agrupación (y sin lanes pre-construidos): board plano (R19)
  if (!providedSwimlanes && (swimlaneConfig.groupBy === 'none' || swimlanes.length === 0)) {
    return (
      <KanbanBoard
        board={board}
        className={className}
        {...innerBoardProps}
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
            {/* Swimlane Header — custom (R9 WBS) o default */}
            {renderSwimlaneHeader ? (
              renderSwimlaneHeader({
                lane,
                isCollapsed,
                cardCount: lane.cardIds.length,
                onToggleCollapse: () => toggleLaneCollapse(lane.id),
              })
            ) : (
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
            )}

            {/* Swimlane Content */}
            {!isCollapsed && (
              <div className="asakaa-swimlane-content p-4">
                <KanbanBoard
                  board={laneBoard}
                  {...innerBoardProps}
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
