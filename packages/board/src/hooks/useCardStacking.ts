/**
 * useCardStacking Hook
 * Manages card stack state and AI-powered grouping suggestions
 * @module hooks/useCardStacking
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Card } from '../types'
import type { CardStack, StackingConfig, StackSuggestion, StackingStrategy } from '../types/card-stack'
import { DEFAULT_STACKING_CONFIG } from '../types/card-stack'

export interface UseCardStackingOptions {
  /** Board cards */
  cards: Card[]
  /** Configuration */
  config?: Partial<StackingConfig>
  /** AI service for similarity detection (optional) */
  aiService?: {
    findSimilar: (card: Card, candidates: Card[]) => Promise<{ card: Card; similarity: number }[]>
  }
}

export interface UseCardStackingResult {
  /** All card stacks */
  stacks: CardStack[]
  /** Create a new stack */
  createStack: (
    title: string,
    cardIds: string[],
    columnId: string,
    strategy: StackingStrategy,
    color?: string
  ) => void
  /** Delete a stack */
  deleteStack: (stackId: string) => void
  /** Toggle stack expand/collapse */
  toggleStack: (stackId: string) => void
  /** Add card to stack */
  addToStack: (stackId: string, cardId: string) => void
  /** Remove card from stack */
  removeFromStack: (stackId: string, cardId: string) => void
  /** Get stacks for a specific column */
  getStacksForColumn: (columnId: string) => CardStack[]
  /** Get AI-powered stack suggestions */
  getSuggestions: (columnId: string) => Promise<StackSuggestion[]>
  /** Apply a suggestion */
  applySuggestion: (suggestion: StackSuggestion) => void
  /** Configuration */
  config: StackingConfig
}

/**
 * Hook for managing card stacking
 */
export function useCardStacking(options: UseCardStackingOptions): UseCardStackingResult {
  const { cards, config: userConfig, aiService } = options

  // Merge config with defaults
  const config = useMemo<StackingConfig>(
    () => ({
      ...DEFAULT_STACKING_CONFIG,
      ...userConfig,
    }),
    [userConfig]
  )

  // Stack state
  const [stacks, setStacks] = useState<CardStack[]>([])

  // Create stack
  const createStack = useCallback(
    (title: string, cardIds: string[], columnId: string, strategy: StackingStrategy, color?: string) => {
      if (cardIds.length < config.minCardsPerStack) {
        console.warn(`Cannot create stack: minimum ${config.minCardsPerStack} cards required`)
        return
      }

      const newStack: CardStack = {
        id: `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        cardIds,
        columnId,
        strategy,
        color,
        isExpanded: true,
        position: stacks.filter((s) => s.columnId === columnId).length,
        createdAt: new Date(),
      }

      setStacks((prev) => [...prev, newStack])
    },
    [config.minCardsPerStack, stacks]
  )

  // Delete stack
  const deleteStack = useCallback((stackId: string) => {
    setStacks((prev) => prev.filter((s) => s.id !== stackId))
  }, [])

  // Toggle expand/collapse
  const toggleStack = useCallback((stackId: string) => {
    setStacks((prev) =>
      prev.map((s) => (s.id === stackId ? { ...s, isExpanded: !s.isExpanded } : s))
    )
  }, [])

  // Add card to stack
  const addToStack = useCallback((stackId: string, cardId: string) => {
    setStacks((prev) =>
      prev.map((s) => {
        if (s.id === stackId && !s.cardIds.includes(cardId)) {
          return { ...s, cardIds: [...s.cardIds, cardId] }
        }
        return s
      })
    )
  }, [])

  // Remove card from stack
  const removeFromStack = useCallback(
    (stackId: string, cardId: string) => {
      setStacks((prev) =>
        prev
          .map((s) => {
            if (s.id === stackId) {
              const newCardIds = s.cardIds.filter((id) => id !== cardId)
              // If stack has too few cards, delete it
              if (newCardIds.length < config.minCardsPerStack) {
                return null
              }
              return { ...s, cardIds: newCardIds }
            }
            return s
          })
          .filter((s): s is CardStack => s !== null)
      )
    },
    [config.minCardsPerStack]
  )

  // Get stacks for column
  const getStacksForColumn = useCallback(
    (columnId: string) => {
      return stacks.filter((s) => s.columnId === columnId).sort((a, b) => a.position - b.position)
    },
    [stacks]
  )

  // Generate AI suggestions
  const getSuggestions = useCallback(
    async (columnId: string): Promise<StackSuggestion[]> => {
      const columnCards = cards.filter((c) => c.columnId === columnId)

      if (columnCards.length < config.minCardsPerStack * 2) {
        return []
      }

      const suggestions: StackSuggestion[] = []

      // 1. Group by labels
      const byLabels = new Map<string, Card[]>()
      columnCards.forEach((card) => {
        if (card.labels && card.labels.length > 0) {
          card.labels.forEach((label) => {
            if (!byLabels.has(label)) {
              byLabels.set(label, [])
            }
            byLabels.get(label)!.push(card)
          })
        }
      })

      byLabels.forEach((cards, label) => {
        if (cards.length >= config.minCardsPerStack) {
          suggestions.push({
            stack: {
              title: `📌 ${label}`,
              cardIds: cards.map((c) => c.id),
              columnId,
              strategy: 'labels',
              color: '#3b82f6',
            },
            reason: `${cards.length} cards with label "${label}"`,
            confidence: 0.85,
          })
        }
      })

      // 2. Group by assignee
      const byAssignee = new Map<string, Card[]>()
      columnCards.forEach((card) => {
        if (card.assignedUserIds && card.assignedUserIds.length > 0) {
          card.assignedUserIds.forEach((userId) => {
            if (!byAssignee.has(userId)) {
              byAssignee.set(userId, [])
            }
            byAssignee.get(userId)!.push(card)
          })
        }
      })

      byAssignee.forEach((cards, userId) => {
        if (cards.length >= config.minCardsPerStack) {
          suggestions.push({
            stack: {
              title: `👤 Assigned to user-${userId.slice(-4)}`,
              cardIds: cards.map((c) => c.id),
              columnId,
              strategy: 'assignee',
              color: '#8b5cf6',
            },
            reason: `${cards.length} cards assigned to the same user`,
            confidence: 0.8,
          })
        }
      })

      // 3. Group by priority
      const byPriority = new Map<string, Card[]>()
      columnCards.forEach((card) => {
        if (card.priority) {
          if (!byPriority.has(card.priority)) {
            byPriority.set(card.priority, [])
          }
          byPriority.get(card.priority)!.push(card)
        }
      })

      byPriority.forEach((cards, priority) => {
        if (cards.length >= config.minCardsPerStack) {
          const priorityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🔴',
            urgent: '🚨',
          }[priority.toLowerCase()] || '⚪'

          suggestions.push({
            stack: {
              title: `${priorityEmoji} ${priority} Priority`,
              cardIds: cards.map((c) => c.id),
              columnId,
              strategy: 'priority',
              color: priority === 'high' || priority === 'urgent' ? '#ef4444' : '#10b981',
            },
            reason: `${cards.length} cards with ${priority} priority`,
            confidence: 0.75,
          })
        }
      })

      // 4. AI-powered similarity (if available)
      if (aiService && config.enableAutoStacking) {
        // Find similar cards using AI
        for (const card of columnCards) {
          const similar = await aiService.findSimilar(card, columnCards)
          const highSimilarity = similar.filter(
            (s) => s.similarity >= config.autoStackConfidenceThreshold
          )

          if (highSimilarity.length >= config.minCardsPerStack - 1) {
            const cardIds = [card.id, ...highSimilarity.map((s) => s.card.id)]
            const avgConfidence =
              highSimilarity.reduce((sum, s) => sum + s.similarity, 0) / highSimilarity.length

            suggestions.push({
              stack: {
                title: `✨ Similar to "${card.title.substring(0, 30)}${card.title.length > 30 ? '...' : ''}"`,
                cardIds,
                columnId,
                strategy: 'ai-similarity',
                color: '#f59e0b',
              },
              reason: `AI detected ${highSimilarity.length + 1} similar tasks`,
              confidence: avgConfidence,
            })
          }
        }
      }

      // Filter by confidence threshold and remove duplicates
      return suggestions
        .filter((s) => s.confidence >= config.autoStackConfidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5) // Top 5 suggestions
    },
    [cards, config, aiService]
  )

  // Apply suggestion
  const applySuggestion = useCallback(
    (suggestion: StackSuggestion) => {
      createStack(
        suggestion.stack.title,
        suggestion.stack.cardIds,
        suggestion.stack.columnId,
        suggestion.stack.strategy,
        suggestion.stack.color
      )
    },
    [createStack]
  )

  // Auto-stack on mount if enabled
  useEffect(() => {
    if (config.enableAutoStacking && stacks.length === 0) {
      // Auto-stack each column
      const columnIds = new Set(cards.map((c) => c.columnId))
      columnIds.forEach(async (columnId) => {
        const suggestions = await getSuggestions(columnId)
        // Auto-apply highest confidence suggestion
        const topSuggestion = suggestions[0]
        if (suggestions.length > 0 && topSuggestion && topSuggestion.confidence >= 0.9) {
          applySuggestion(topSuggestion)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  return {
    stacks,
    createStack,
    deleteStack,
    toggleStack,
    addToStack,
    removeFromStack,
    getStacksForColumn,
    getSuggestions,
    applySuggestion,
    config,
  }
}
