/**
 * useFilteredCards - Hook for filtering cards with memoization
 * @module adapters/react
 */

import { useMemo } from 'react'
import { useBoard } from './useBoard'
import type { Card, Priority, CardStatus } from '@libxai/core'

/**
 * Filter options for cards
 */
export interface CardFilters {
  searchQuery?: string
  priorities?: Priority[]
  statuses?: CardStatus[]
  assignedUserIds?: string[]
  labels?: string[]
  columnIds?: string[]
  isOverdue?: boolean
}

/**
 * Hook for filtered and sorted cards
 *
 * Automatically memoizes results for performance
 *
 * @param filters - Filter criteria
 * @returns Filtered cards array
 *
 * @example
 * ```tsx
 * function CardList() {
 *   const filteredCards = useFilteredCards({
 *     priorities: ['HIGH', 'URGENT'],
 *     isOverdue: true
 *   })
 *
 *   return <div>{filteredCards.length} urgent overdue tasks</div>
 * }
 * ```
 */
export function useFilteredCards(filters?: CardFilters): Card[] {
  const { cards } = useBoard()

  return useMemo(() => {
    if (!filters) return cards

    return cards.filter(card => {
      // Search query (title + description)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesTitle = card.title.toLowerCase().includes(query)
        const matchesDesc = card.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDesc) return false
      }

      // Priority filter
      if (filters.priorities && filters.priorities.length > 0) {
        if (!card.priority || !filters.priorities.includes(card.priority)) {
          return false
        }
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!card.status || !filters.statuses.includes(card.status)) {
          return false
        }
      }

      // Assigned users filter
      if (filters.assignedUserIds && filters.assignedUserIds.length > 0) {
        const hasAssignedUser = filters.assignedUserIds.some(userId =>
          card.isAssignedTo(userId)
        )
        if (!hasAssignedUser) return false
      }

      // Labels filter
      if (filters.labels && filters.labels.length > 0) {
        const hasLabel = filters.labels.some(label => card.hasLabel(label))
        if (!hasLabel) return false
      }

      // Column filter
      if (filters.columnIds && filters.columnIds.length > 0) {
        if (!filters.columnIds.includes(card.columnId)) {
          return false
        }
      }

      // Overdue filter
      if (filters.isOverdue !== undefined) {
        if (filters.isOverdue !== card.isOverdue()) {
          return false
        }
      }

      return true
    })
  }, [cards, filters])
}

/**
 * Hook for sorted cards
 *
 * @param sortBy - Sort field
 * @param sortOrder - Sort order ('asc' | 'desc')
 * @returns Sorted cards array
 */
export function useSortedCards(
  sortBy: 'title' | 'priority' | 'createdAt' | 'updatedAt' | 'position' = 'position',
  sortOrder: 'asc' | 'desc' = 'asc'
): Card[] {
  const { cards } = useBoard()

  return useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'priority': {
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
          const aPriority = a.priority ? priorityOrder[a.priority] : 0
          const bPriority = b.priority ? priorityOrder[b.priority] : 0
          comparison = aPriority - bPriority
          break
        }
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'position':
          comparison = a.position - b.position
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [cards, sortBy, sortOrder])
}
