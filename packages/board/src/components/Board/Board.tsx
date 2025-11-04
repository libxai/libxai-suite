import { useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { KanbanBoardProps } from '../../types'
import { Column } from '../Column'
import { Card } from '../Card'
import { cn, calculateDropPosition } from '../../utils'
import { useDragState } from '../../hooks/useDragState'

export function KanbanBoard({
  board,
  callbacks,
  onCardClick,
  renderProps,
  config,
  availableUsers = [],
  className,
  style,
  isLoading,
  error,
  children,
}: KanbanBoardProps & { children?: React.ReactNode }) {
  const [dragState, setDragState] = useDragState()

  const handleCardUpdate = useCallback(
    (cardId: string, updates: Partial<typeof board.cards[0]>) => {
      callbacks.onCardUpdate?.(cardId, updates)
    },
    [callbacks]
  )

  const handleColumnRename = useCallback(
    (columnId: string, newTitle: string) => {
      callbacks.onColumnUpdate?.(columnId, { title: newTitle })
    },
    [callbacks]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, typeof board.cards>()

    board.columns.forEach((column) => {
      const columnCards = column.cardIds
        .map((cardId) => board.cards.find((card) => card.id === cardId))
        .filter((card): card is NonNullable<typeof card> => card !== undefined)
        .sort((a, b) => a.position - b.position)

      map.set(column.id, columnCards)
    })

    return map
  }, [board.cards, board.columns])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const card = board.cards.find((c) => c.id === active.id)

      if (card) {
        setDragState({
          isDragging: true,
          draggedCardId: card.id,
          sourceColumnId: card.columnId,
          targetColumnId: card.columnId,
        })
      }
    },
    [board.cards, setDragState]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeCard = board.cards.find((c) => c.id === active.id)
      if (!activeCard) return

      let targetColumnId: string | null = null

      if (over.data.current?.type === 'column') {
        targetColumnId = over.id as string
      } else if (over.data.current?.type === 'card') {
        const overCard = board.cards.find((c) => c.id === over.id)
        targetColumnId = overCard?.columnId || null
      }

      if (targetColumnId && targetColumnId !== dragState.targetColumnId) {
        setDragState({
          ...dragState,
          targetColumnId,
        })
      }
    },
    [board.cards, dragState, setDragState]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      setDragState({
        isDragging: false,
        draggedCardId: null,
        sourceColumnId: null,
        targetColumnId: null,
      })

      if (!over) return

      const activeCard = board.cards.find((c) => c.id === active.id)
      if (!activeCard) return

      let targetColumnId: string
      let targetPosition: number

      if (over.data.current?.type === 'column') {
        targetColumnId = over.id as string
        const targetColumnCards = cardsByColumn.get(targetColumnId) || []
        targetPosition = calculateDropPosition(targetColumnCards, 0)
      } else {
        const overCard = board.cards.find((c) => c.id === over.id)
        if (!overCard) return

        targetColumnId = overCard.columnId
        const targetColumnCards = cardsByColumn.get(targetColumnId) || []
        const overIndex = targetColumnCards.findIndex((c) => c.id === over.id)

        targetPosition = calculateDropPosition(targetColumnCards, overIndex)
      }

      const targetColumn = board.columns.find((col) => col.id === targetColumnId)
      if (targetColumn && targetColumn.wipLimit && targetColumn.wipLimitType === 'hard') {
        const targetColumnCards = cardsByColumn.get(targetColumnId) || []

        if (activeCard.columnId !== targetColumnId) {
          if (targetColumnCards.length >= targetColumn.wipLimit) {
            callbacks.onWipLimitExceeded?.(targetColumn, activeCard)
            return
          }
        }
      }

      if (
        activeCard.columnId !== targetColumnId ||
        activeCard.position !== targetPosition
      ) {
        await callbacks.onCardMove?.(activeCard.id, targetColumnId, targetPosition)
      }
    },
    [board.cards, board.columns, cardsByColumn, callbacks, setDragState]
  )

  const handleCardClick = useCallback(
    (card: typeof board.cards[0]) => {
      onCardClick?.(card)
    },
    [onCardClick]
  )

  if (isLoading) {
    return (
      <div className={cn('asakaa-board', className)} style={style}>
        <LoadingSkeleton columnCount={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('asakaa-board', className)} style={style}>
        <div className="flex items-center justify-center w-full h-64">
          <div className="text-center">
            <p className="text-asakaa-accent-red text-lg font-semibold mb-2">
              Error loading board
            </p>
            <p className="text-asakaa-text-secondary text-sm">
              {typeof error === 'string' ? error : error.message}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('asakaa-board', className)} style={style}>
        {board.columns
          .sort((a, b) => a.position - b.position)
          .map((column) => {
            const cards = cardsByColumn.get(column.id) || []

            return (
              <Column
                key={column.id}
                column={column}
                cards={cards}
                renderCard={renderProps?.renderCard}
                renderColumn={renderProps?.renderColumn}
                renderHeader={renderProps?.renderColumnHeader}
                renderEmptyState={renderProps?.renderEmptyState}
                onCardClick={handleCardClick}
                onCardUpdate={handleCardUpdate}
                onColumnRename={handleColumnRename}
                availableUsers={availableUsers}
                allCards={board.cards}
                enableVirtualization={config?.enableVirtualization}
                cardHeight={config?.cardHeight}
              />
            )
          })}
        {children}
      </div>

      <DragOverlay>
        {dragState.draggedCardId ? (
          <Card
            card={
              board.cards.find((c) => c.id === dragState.draggedCardId)!
            }
            render={renderProps?.renderCardOverlay || renderProps?.renderCard}
            disableDrag
            className="opacity-90 rotate-3 shadow-2xl"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function LoadingSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: columnCount }).map((_, i) => (
        <div key={i} className="asakaa-column">
          <div className="asakaa-skeleton h-8 mb-3" />
          <div className="flex flex-col gap-2">
            <div className="asakaa-skeleton h-24" />
            <div className="asakaa-skeleton h-32" />
            <div className="asakaa-skeleton h-28" />
          </div>
        </div>
      ))}
    </>
  )
}
