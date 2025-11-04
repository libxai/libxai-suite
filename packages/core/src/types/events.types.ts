/**
 * Event types for ASAKAA Core Store
 * @module types/events
 */

import type { CardData, ColumnData, BoardData } from './base.types'

/**
 * Event listener function type
 */
export type EventListener<T = unknown> = (event: StoreEvent<T>) => void

/**
 * Store event structure
 */
export interface StoreEvent<T = unknown> {
  /** Event type/name */
  type: string
  /** Event payload */
  data: T
  /** Event timestamp */
  timestamp: Date
  /** Event metadata */
  metadata?: Record<string, unknown>
}

/**
 * Card events
 */
export type CardEvent =
  | { type: 'card:created'; data: CardData }
  | { type: 'card:updated'; data: { id: string; changes: Partial<CardData> } }
  | { type: 'card:deleted'; data: { id: string } }
  | { type: 'card:moved'; data: { id: string; fromColumnId: string; toColumnId: string; newPosition: number } }

/**
 * Column events
 */
export type ColumnEvent =
  | { type: 'column:created'; data: ColumnData }
  | { type: 'column:updated'; data: { id: string; changes: Partial<ColumnData> } }
  | { type: 'column:deleted'; data: { id: string } }
  | { type: 'column:reordered'; data: { columnIds: string[] } }

/**
 * Board events
 */
export type BoardEvent =
  | { type: 'board:created'; data: BoardData }
  | { type: 'board:updated'; data: { id: string; changes: Partial<BoardData> } }
  | { type: 'board:deleted'; data: { id: string } }

/**
 * All possible events
 */
export type AnyEvent = CardEvent | ColumnEvent | BoardEvent

/**
 * Event type names
 */
export type EventType = AnyEvent['type']
