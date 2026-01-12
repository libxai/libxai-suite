import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
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
import type { KanbanBoardProps, Card as CardType } from '../../types'
import type { Task } from '../Gantt/types'
import { Column } from '../Column'
import { Card } from '../Card'
import { TaskDetailModal } from '../TaskDetailModal'
import { cn, calculateDropPosition } from '../../utils'
import { useDragState } from '../../hooks/useDragState'
import { KanbanThemeProvider } from './KanbanThemeContext'

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
  availableTags = [],
  onCreateTag,
  attachmentsByCard,
  onUploadAttachments,
  onDeleteAttachment,
  // v0.17.254: Comments support
  comments,
  onAddComment,
  currentUser,
  mentionableUsers,
  onTaskOpen,
}: KanbanBoardProps & { children?: React.ReactNode }) {
  const [dragState, setDragState] = useDragState()

  // Debug: log if onUploadAttachments is received
  console.log('[KanbanBoard] onUploadAttachments received:', !!onUploadAttachments);

  // State for task detail modal
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)

  // v0.17.443: Pan/drag state for grabbing and dragging the board (like Gantt)
  const [isPanning, setIsPanning] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  // Determine theme class - default to 'dark'
  const themeName = config?.theme || 'dark'
  const isDark = themeName === 'dark' || themeName === 'neutral'
  const themeClass = isDark ? 'dark' : ''

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

  // v0.17.55: Handler for column delete
  const handleColumnDelete = useCallback(
    (columnId: string) => {
      callbacks.onColumnDelete?.(columnId)
    },
    [callbacks]
  )

  // v0.17.55: Default column IDs that cannot be deleted
  const DEFAULT_COLUMN_IDS = ['todo', 'in-progress', 'completed']

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

  // v0.17.443: Pan/drag handlers for grabbing and dragging the board
  useEffect(() => {
    const boardElement = boardRef.current
    if (!boardElement) return

    const handleMouseDown = (e: MouseEvent) => {
      // Only start panning on middle mouse button OR when clicking on empty space
      const target = e.target as HTMLElement

      // Middle mouse button (button === 1) always enables panning
      // Left click only enables panning on empty board space
      const isMiddleButton = e.button === 1
      const isEmptySpace = target === boardElement ||
                          (target.classList.contains('asakaa-column') && !target.closest('.asakaa-card'))

      if (isMiddleButton || (e.button === 0 && isEmptySpace && !dragState.isDragging)) {
        e.preventDefault()
        setIsPanning(true)
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: boardElement.scrollLeft,
          scrollTop: boardElement.scrollTop,
        }
        boardElement.style.cursor = 'grabbing'
        boardElement.style.userSelect = 'none'
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return

      const deltaX = e.clientX - panStartRef.current.x
      const deltaY = e.clientY - panStartRef.current.y

      boardElement.scrollLeft = panStartRef.current.scrollLeft - deltaX
      boardElement.scrollTop = panStartRef.current.scrollTop - deltaY
    }

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false)
        boardElement.style.cursor = ''
        boardElement.style.userSelect = ''
      }
    }

    const handleMouseLeave = () => {
      if (isPanning) {
        setIsPanning(false)
        boardElement.style.cursor = ''
        boardElement.style.userSelect = ''
      }
    }

    boardElement.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    boardElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      boardElement.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      boardElement.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isPanning, dragState.isDragging])

  // v0.17.243: Convert cards to Task format for dependencies in TaskDetailModal
  const availableTasksForDependencies = useMemo((): Task[] => {
    return board.cards.map(card => ({
      id: card.id,
      name: card.title,
      startDate: card.startDate ? new Date(card.startDate) : undefined,
      endDate: card.endDate ? new Date(card.endDate) : undefined,
      progress: card.progress || 0,
      status: card.columnId as any,
      priority: card.priority?.toLowerCase() as any,
      dependencies: Array.isArray(card.dependencies)
        ? card.dependencies.map(d => typeof d === 'string' ? d : d.taskId)
        : [],
    }))
  }, [board.cards])

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

  // Handle card click - open modal and notify consumer
  // v0.17.254: Also call onTaskOpen to load comments
  const handleCardClick = useCallback(
    (card: typeof board.cards[0]) => {
      setSelectedCard(card)
      onCardClick?.(card)
      onTaskOpen?.(card.id)
    },
    [onCardClick, onTaskOpen]
  )

  // Handle card update from modal
  const handleModalCardUpdate = useCallback(
    (updatedCard: CardType) => {
      callbacks.onCardUpdate?.(updatedCard.id, updatedCard)
      setSelectedCard(updatedCard)
    },
    [callbacks]
  )

  if (isLoading) {
    return (
      <div className={cn('asakaa-board', themeClass, className)} style={style}>
        <LoadingSkeleton columnCount={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('asakaa-board', themeClass, className)} style={style}>
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
    <KanbanThemeProvider themeName={themeName}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={boardRef}
          className={cn('asakaa-board', themeClass, className)}
          style={{ ...style, cursor: isPanning ? 'grabbing' : undefined }}
          data-theme={themeName}
        >
          {board.columns
            .sort((a, b) => a.position - b.position)
            .map((column) => {
              const cards = cardsByColumn.get(column.id) || []

              // v0.17.55: Check if column is deletable (not a default column)
              const isDeletable = !DEFAULT_COLUMN_IDS.includes(column.id)

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
                  onColumnDelete={handleColumnDelete}
                  isDeletable={isDeletable}
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

      {/* Task Detail Modal - same as Calendar */}
      {/* v0.17.254: Added comments support */}
      <TaskDetailModal
        task={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onCardUpdate={handleModalCardUpdate}
        theme={isDark ? 'dark' : 'light'}
        locale={config?.locale === 'es' ? 'es' : 'en'}
        availableUsers={availableUsers}
        availableTags={availableTags}
        onCreateTag={onCreateTag}
        attachments={selectedCard ? attachmentsByCard?.get(selectedCard.id) || [] : []}
        onUploadAttachments={onUploadAttachments}
        onDeleteAttachment={onDeleteAttachment}
        availableTasks={availableTasksForDependencies}
        comments={comments}
        onAddComment={onAddComment}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
      />
    </KanbanThemeProvider>
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
