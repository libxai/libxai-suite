/**
 * Advanced Filtering and Search System
 * @module utils/filters
 */

import type { Card, Priority } from '../types'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex'

export interface FilterCondition {
  field: keyof Card | string
  operator: FilterOperator
  value?: any
}

export interface FilterGroup {
  operator: 'AND' | 'OR'
  conditions: (FilterCondition | FilterGroup)[]
}

export type Filter = FilterCondition | FilterGroup

export interface SearchOptions {
  /** Fields to search in */
  fields?: Array<keyof Card>
  /** Case sensitive search */
  caseSensitive?: boolean
  /** Exact match */
  exact?: boolean
  /** Use regex */
  regex?: boolean
}

/**
 * Advanced Filter Engine
 *
 * @example
 * ```ts
 * const filter: FilterGroup = {
 *   operator: 'AND',
 *   conditions: [
 *     { field: 'priority', operator: 'in', value: ['HIGH', 'URGENT'] },
 *     { field: 'title', operator: 'contains', value: 'bug' }
 *   ]
 * }
 *
 * const filteredCards = filterCards(cards, filter)
 * ```
 */
export class FilterEngine {
  /**
   * Filter cards based on filter definition
   */
  static filterCards(cards: Card[], filter: Filter): Card[] {
    return cards.filter((card) => this.evaluateFilter(card, filter))
  }

  /**
   * Evaluate filter for a card
   */
  private static evaluateFilter(card: Card, filter: Filter): boolean {
    if (this.isFilterGroup(filter)) {
      return this.evaluateFilterGroup(card, filter)
    }

    return this.evaluateCondition(card, filter)
  }

  /**
   * Check if filter is a filter group
   */
  private static isFilterGroup(filter: Filter): filter is FilterGroup {
    return 'operator' in filter && 'conditions' in filter
  }

  /**
   * Evaluate filter group
   */
  private static evaluateFilterGroup(card: Card, group: FilterGroup): boolean {
    if (group.operator === 'AND') {
      return group.conditions.every((condition) => this.evaluateFilter(card, condition))
    }

    // OR
    return group.conditions.some((condition) => this.evaluateFilter(card, condition))
  }

  /**
   * Evaluate single condition
   */
  private static evaluateCondition(card: Card, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(card, condition.field)
    const { operator, value } = condition

    switch (operator) {
      case 'equals':
        return fieldValue === value

      case 'not_equals':
        return fieldValue !== value

      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(value).toLowerCase())

      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(String(value).toLowerCase())

      case 'starts_with':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().startsWith(String(value).toLowerCase())

      case 'ends_with':
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().endsWith(String(value).toLowerCase())

      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > value

      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < value

      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)

      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue)

      case 'is_empty':
        return fieldValue == null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)

      case 'is_not_empty':
        return fieldValue != null && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0)

      case 'matches_regex':
        try {
          const regex = new RegExp(value)
          return regex.test(String(fieldValue))
        } catch {
          return false
        }

      default:
        return false
    }
  }

  /**
   * Get field value from card (supports nested fields)
   */
  private static getFieldValue(card: Card, field: string): any {
    const parts = field.split('.')
    let value: any = card

    for (const part of parts) {
      if (value == null) {
        return undefined
      }
      value = value[part]
    }

    return value
  }

  /**
   * Search cards
   */
  static search(cards: Card[], query: string, options: SearchOptions = {}): Card[] {
    const { fields = ['title', 'description'], caseSensitive = false, exact = false, regex = false } = options

    if (!query) {
      return cards
    }

    const searchTerm = caseSensitive ? query : query.toLowerCase()

    return cards.filter((card) => {
      for (const field of fields) {
        const value = card[field]

        if (value == null) {
          continue
        }

        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase()

        if (regex) {
          try {
            const pattern = new RegExp(searchTerm, caseSensitive ? '' : 'i')
            if (pattern.test(stringValue)) {
              return true
            }
          } catch {
            // Invalid regex, fall back to contains
            if (stringValue.includes(searchTerm)) {
              return true
            }
          }
        } else if (exact) {
          if (stringValue === searchTerm) {
            return true
          }
        } else {
          if (stringValue.includes(searchTerm)) {
            return true
          }
        }
      }

      return false
    })
  }

  /**
   * Fuzzy search with scoring
   */
  static fuzzySearch(cards: Card[], query: string, options: SearchOptions = {}): Array<Card & { score: number }> {
    const { fields = ['title', 'description'] } = options

    if (!query) {
      return cards.map((card) => ({ ...card, score: 1 }))
    }

    const results = cards
      .map((card) => {
        let maxScore = 0

        for (const field of fields) {
          const value = card[field]

          if (value == null) {
            continue
          }

          const score = this.calculateFuzzyScore(String(value), query)
          maxScore = Math.max(maxScore, score)
        }

        return { ...card, score: maxScore }
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)

    return results
  }

  /**
   * Calculate fuzzy matching score (0-1)
   */
  private static calculateFuzzyScore(text: string, query: string): number {
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()

    // Exact match
    if (textLower === queryLower) {
      return 1
    }

    // Starts with
    if (textLower.startsWith(queryLower)) {
      return 0.9
    }

    // Contains
    if (textLower.includes(queryLower)) {
      return 0.7
    }

    // Fuzzy match (all query characters present in order)
    let queryIndex = 0
    let matches = 0

    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        matches++
        queryIndex++
      }
    }

    if (queryIndex === queryLower.length) {
      return 0.5 * (matches / textLower.length)
    }

    return 0
  }
}

/**
 * Predefined filter builders
 */
export const Filters = {
  /** Filter by priority */
  byPriority: (priorities: Priority[]): FilterCondition => ({
    field: 'priority',
    operator: 'in',
    value: priorities,
  }),

  /** Filter by column */
  byColumn: (columnId: string): FilterCondition => ({
    field: 'columnId',
    operator: 'equals',
    value: columnId,
  }),

  /** Filter by label */
  byLabel: (label: string): FilterCondition => ({
    field: 'labels',
    operator: 'contains',
    value: label,
  }),

  /** Filter by assigned user */
  byAssignedUser: (userId: string): FilterCondition => ({
    field: 'assignedUserIds',
    operator: 'contains',
    value: userId,
  }),

  /** Filter by date range */
  byDateRange: (startDate: Date, endDate: Date): FilterGroup => ({
    operator: 'AND',
    conditions: [
      { field: 'startDate', operator: 'greater_than', value: startDate.toISOString() },
      { field: 'endDate', operator: 'less_than', value: endDate.toISOString() },
    ],
  }),

  /** Filter by has dependencies */
  hasDependencies: (): FilterCondition => ({
    field: 'dependencies',
    operator: 'is_not_empty',
  }),

  /** Combine filters with AND */
  and: (...conditions: (FilterCondition | FilterGroup)[]): FilterGroup => ({
    operator: 'AND',
    conditions,
  }),

  /** Combine filters with OR */
  or: (...conditions: (FilterCondition | FilterGroup)[]): FilterGroup => ({
    operator: 'OR',
    conditions,
  }),
}

/**
 * Export convenience function
 */
export function filterCards(cards: Card[], filter: Filter): Card[] {
  return FilterEngine.filterCards(cards, filter)
}

export function searchCards(cards: Card[], query: string, options?: SearchOptions): Card[] {
  return FilterEngine.search(cards, query, options)
}

export function fuzzySearchCards(cards: Card[], query: string, options?: SearchOptions): Array<Card & { score: number }> {
  return FilterEngine.fuzzySearch(cards, query, options)
}
