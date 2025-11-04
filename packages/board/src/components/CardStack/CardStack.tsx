/**
 * CardStack Component
 * Visual grouping of related cards with expand/collapse
 * @module components/CardStack
 */

import { useState, useMemo } from 'react'
import type { Card } from '../../types'
import type { CardStack as CardStackType } from '../../types/card-stack'
import { cn } from '../../utils'
import './card-stack.css'

export interface CardStackProps {
  /** Stack configuration */
  stack: CardStackType
  /** All cards in the board */
  cards: Card[]
  /** Card render function */
  renderCard?: (card: Card) => React.ReactNode
  /** Click handler for individual cards */
  onCardClick?: (card: Card) => void
  /** Expand/collapse handler */
  onToggleExpand?: (stackId: string) => void
  /** Unstack handler (remove card from stack) */
  onUnstack?: (stackId: string, cardId: string) => void
  /** Delete entire stack handler */
  onDeleteStack?: (stackId: string) => void
  /** Custom className */
  className?: string
}

/**
 * CardStack - Collapsible group of related cards
 */
export function CardStack({
  stack,
  cards,
  renderCard,
  onCardClick,
  onToggleExpand,
  onUnstack,
  onDeleteStack,
  className,
}: CardStackProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get cards in this stack
  const stackCards = useMemo(() => {
    return cards.filter((card) => stack.cardIds.includes(card.id))
  }, [cards, stack.cardIds])

  // Calculate stack statistics
  const stats = useMemo(() => {
    const totalCards = stackCards.length
    const uniqueAssignees = new Set(
      stackCards.flatMap((c) => c.assignedUserIds || [])
    ).size
    const priorities = stackCards.map((c) => c.priority).filter(Boolean)
    const labels = new Set(stackCards.flatMap((c) => c.labels || [])).size

    return {
      totalCards,
      uniqueAssignees,
      priorities,
      labels,
    }
  }, [stackCards])

  const handleToggle = () => {
    onToggleExpand?.(stack.id)
  }

  return (
    <div
      className={cn('card-stack', !stack.isExpanded && 'card-stack-collapsed', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--stack-color': stack.color || 'var(--color-accent-primary)',
      } as React.CSSProperties}
    >
      {/* Stack Header */}
      <div className="card-stack-header" onClick={handleToggle}>
        <div className="card-stack-header-left">
          {/* Expand/Collapse Icon */}
          <button className="card-stack-toggle" aria-label={stack.isExpanded ? 'Collapse' : 'Expand'}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn('card-stack-chevron', stack.isExpanded && 'expanded')}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Stack Title */}
          <h3 className="card-stack-title">{stack.title}</h3>

          {/* Stack Badge */}
          <div className="card-stack-badge">{stats.totalCards}</div>

          {/* Strategy Badge */}
          <div className="card-stack-strategy">
            {stack.strategy === 'ai-similarity' && '✨ AI'}
            {stack.strategy === 'manual' && '👤 Manual'}
            {stack.strategy === 'labels' && '🏷️ Labels'}
            {stack.strategy === 'assignee' && '👥 Assignee'}
            {stack.strategy === 'priority' && '🎯 Priority'}
            {stack.strategy === 'epic' && '📚 Epic'}
          </div>
        </div>

        {/* Stack Actions */}
        {isHovered && (
          <div className="card-stack-actions">
            <button
              className="card-stack-action"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteStack?.(stack.id)
              }}
              aria-label="Delete stack"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Stack Summary (when collapsed) */}
      {!stack.isExpanded && (
        <div className="card-stack-summary">
          <div className="card-stack-summary-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{stats.uniqueAssignees} assignees</span>
          </div>
          {stats.labels > 0 && (
            <div className="card-stack-summary-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>{stats.labels} labels</span>
            </div>
          )}
          {stack.confidence && (
            <div className="card-stack-summary-item">
              <span className="card-stack-confidence">{Math.round(stack.confidence * 100)}% match</span>
            </div>
          )}
        </div>
      )}

      {/* Stack Content (when expanded) */}
      {stack.isExpanded && (
        <div className="card-stack-content">
          {stackCards.length === 0 ? (
            <div className="card-stack-empty">
              <p>No cards in this stack</p>
              <span>Drag cards here or delete this stack</span>
            </div>
          ) : (
            <div className="card-stack-cards">
              {stackCards.map((card) => (
                <div key={card.id} className="card-stack-card-wrapper">
                  {renderCard ? (
                    <div onClick={() => onCardClick?.(card)}>{renderCard(card)}</div>
                  ) : (
                    <div className="card-stack-default-card" onClick={() => onCardClick?.(card)}>
                      <h4>{card.title}</h4>
                      {card.description && <p>{card.description.substring(0, 100)}...</p>}
                    </div>
                  )}
                  {/* Unstack button */}
                  <button
                    className="card-stack-unstack-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUnstack?.(stack.id, card.id)
                    }}
                    aria-label="Remove from stack"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
