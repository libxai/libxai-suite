/**
 * Framework-agnostic types for headless hooks
 * @module types
 */

import type { Card, Column, BoardData } from '@libxai/core'

/**
 * Subscriber function type for state changes
 */
export type Subscriber<T> = (state: T) => void

/**
 * Cleanup function returned by subscriptions
 */
export type Unsubscribe = () => void

/**
 * Board state for headless hooks
 */
export interface BoardState {
  board: BoardData | null
  columns: Map<string, Column>
  cards: Map<string, Card>
}

/**
 * Drag state
 */
export interface DragState {
  isDragging: boolean
  draggedCardId: string | null
  sourceColumnId: string | null
  targetColumnId: string | null
  position: { x: number; y: number } | null
}

/**
 * Selection state
 */
export interface SelectionState {
  selectedCardIds: string[]
  lastSelectedCardId: string | null
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  searchQuery?: string
  priorities?: string[]
  statuses?: string[]
  assignees?: string[]
  labels?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: 'priority' | 'createdAt' | 'updatedAt' | 'title' | 'position'
  direction: 'asc' | 'desc'
}

/**
 * Keyboard shortcut handler
 */
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: (event: KeyboardEvent) => void
  description: string
}

/**
 * Hook store - framework-agnostic state container
 */
export interface HookStore<T> {
  getState: () => T
  setState: (updater: (state: T) => T) => void
  subscribe: (subscriber: Subscriber<T>) => Unsubscribe
}
