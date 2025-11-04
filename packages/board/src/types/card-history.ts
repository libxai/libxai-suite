/**
 * Card History & Time Travel Types
 * Tracks all changes to cards with full reproducibility
 * @module types/card-history
 */

import type { Card } from './index'

/**
 * Types of events that can occur in a card's history
 */
export type CardHistoryEventType =
  | 'created'
  | 'status_changed'
  | 'assignee_changed'
  | 'priority_changed'
  | 'moved'
  | 'title_updated'
  | 'description_updated'
  | 'dates_changed'
  | 'labels_changed'
  | 'dependency_added'
  | 'dependency_removed'
  | 'comment_added'
  | 'archived'
  | 'restored'

/**
 * Represents a single change in a card's history
 */
export interface CardHistoryEvent {
  /** Unique event ID */
  id: string
  /** Card this event belongs to */
  cardId: string
  /** When the event occurred */
  timestamp: Date
  /** Type of change */
  type: CardHistoryEventType
  /** User who made the change */
  userId: string
  /** User display name (for UI) */
  userName?: string
  /** User avatar URL (for UI) */
  userAvatar?: string
  /** Detailed changes (before/after) */
  changes: Record<string, { from: any; to: any }>
  /** Additional context */
  metadata?: {
    /** Column names for moves */
    fromColumn?: string
    toColumn?: string
    /** Comment text for comment events */
    commentText?: string
    /** Reason for change */
    reason?: string
    /** Related card IDs */
    relatedCards?: string[]
  }
}

/**
 * Filter configuration for history events
 */
export interface HistoryFilter {
  /** Filter by event types */
  types?: CardHistoryEventType[]
  /** Filter by users */
  users?: string[]
  /** Filter by date range */
  dateRange?: {
    start: Date
    end: Date
  }
  /** Search in change descriptions */
  searchTerm?: string
}

/**
 * State for the replay/time-travel feature
 */
export interface ReplayState {
  /** Current position in history (0 = oldest, length-1 = newest) */
  currentIndex: number
  /** Is replay actively playing */
  isPlaying: boolean
  /** Playback speed (1 = normal, 2 = 2x, etc.) */
  speed: number
  /** Card state at current index */
  cardState: Card
  /** Total number of events */
  totalEvents: number
  /** Can go back */
  canGoBack: boolean
  /** Can go forward */
  canGoForward: boolean
}

/**
 * Configuration for history tracking
 */
export interface HistoryConfig {
  /** Enable automatic history tracking */
  enabled: boolean
  /** Maximum events to store per card */
  maxEventsPerCard: number
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number
  /** Store history in localStorage */
  persistToStorage: boolean
  /** Storage key prefix */
  storagePrefix: string
}

/**
 * Timeline visualization configuration
 */
export interface TimelineConfig {
  /** Show event icons */
  showIcons: boolean
  /** Show user avatars */
  showAvatars: boolean
  /** Group events by day */
  groupByDay: boolean
  /** Show relative times (e.g. "2 hours ago") */
  useRelativeTime: boolean
  /** Compact mode (less spacing) */
  compact: boolean
}

/**
 * Snapshot of a card at a specific point in time
 */
export interface CardSnapshot {
  /** When this snapshot was taken */
  timestamp: Date
  /** Complete card state */
  cardState: Card
  /** Event that triggered this snapshot */
  eventId: string
  /** Index in history */
  index: number
}

/**
 * Statistics about a card's history
 */
export interface HistoryStats {
  /** Total events */
  totalEvents: number
  /** Events by type */
  eventsByType: Record<CardHistoryEventType, number>
  /** Events by user */
  eventsByUser: Record<string, number>
  /** First event timestamp */
  firstEvent?: Date
  /** Last event timestamp */
  lastEvent?: Date
  /** Most active day */
  mostActiveDay?: Date
  /** Average events per day */
  avgEventsPerDay: number
  /** Time in each column (in milliseconds) */
  timeInColumns: Record<string, number>
}

/**
 * Default history configuration
 */
export const DEFAULT_HISTORY_CONFIG: HistoryConfig = {
  enabled: true,
  maxEventsPerCard: 1000,
  autoSaveInterval: 5000,
  persistToStorage: true,
  storagePrefix: 'asakaa-history',
}

/**
 * Default timeline configuration
 */
export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  showIcons: true,
  showAvatars: true,
  groupByDay: true,
  useRelativeTime: true,
  compact: false,
}

/**
 * Helper to create a history event
 */
export function createHistoryEvent(
  cardId: string,
  type: CardHistoryEventType,
  userId: string,
  changes: Record<string, { from: any; to: any }>,
  metadata?: CardHistoryEvent['metadata']
): CardHistoryEvent {
  return {
    id: `${cardId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cardId,
    timestamp: new Date(),
    type,
    userId,
    changes,
    metadata,
  }
}

/**
 * Helper to format event description for UI
 */
export function formatEventDescription(event: CardHistoryEvent): string {
  switch (event.type) {
    case 'created':
      return `Created card`
    case 'status_changed':
      return `Changed status from "${event.changes.status?.from}" to "${event.changes.status?.to}"`
    case 'assignee_changed':
      return `Changed assignee`
    case 'priority_changed':
      return `Changed priority from ${event.changes.priority?.from} to ${event.changes.priority?.to}`
    case 'moved':
      return `Moved from ${event.metadata?.fromColumn || 'unknown'} to ${event.metadata?.toColumn || 'unknown'}`
    case 'title_updated':
      return `Updated title`
    case 'description_updated':
      return `Updated description`
    case 'dates_changed':
      return `Changed dates`
    case 'labels_changed':
      return `Updated labels`
    case 'dependency_added':
      return `Added dependency`
    case 'dependency_removed':
      return `Removed dependency`
    case 'comment_added':
      return `Added comment`
    case 'archived':
      return `Archived card`
    case 'restored':
      return `Restored card`
    default:
      return `Updated card`
  }
}

/**
 * Helper to get icon for event type
 */
export function getEventIcon(type: CardHistoryEventType): string {
  const icons: Record<CardHistoryEventType, string> = {
    created: '✨',
    status_changed: '🔄',
    assignee_changed: '👤',
    priority_changed: '🎯',
    moved: '➡️',
    title_updated: '✏️',
    description_updated: '📝',
    dates_changed: '📅',
    labels_changed: '🏷️',
    dependency_added: '🔗',
    dependency_removed: '⛓️‍💥',
    comment_added: '💬',
    archived: '📦',
    restored: '♻️',
  }
  return icons[type] || '📌'
}

/**
 * Helper to get color for event type
 */
export function getEventColor(type: CardHistoryEventType): string {
  const colors: Record<CardHistoryEventType, string> = {
    created: '#10b981',
    status_changed: '#3b82f6',
    assignee_changed: '#8b5cf6',
    priority_changed: '#f59e0b',
    moved: '#06b6d4',
    title_updated: '#6366f1',
    description_updated: '#6366f1',
    dates_changed: '#ec4899',
    labels_changed: '#14b8a6',
    dependency_added: '#a855f7',
    dependency_removed: '#ef4444',
    comment_added: '#84cc16',
    archived: '#6b7280',
    restored: '#10b981',
  }
  return colors[type] || '#6b7280'
}
