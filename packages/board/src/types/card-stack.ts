/**
 * Card Stack Types
 * Smart grouping of related cards within columns
 * @module types/card-stack
 */

export type StackingStrategy = 'manual' | 'ai-similarity' | 'labels' | 'assignee' | 'priority' | 'epic'

export interface CardStack {
  /** Unique stack identifier */
  id: string
  /** Display title for the stack */
  title: string
  /** Cards contained in this stack */
  cardIds: string[]
  /** Column this stack belongs to */
  columnId: string
  /** How this stack was created */
  strategy: StackingStrategy
  /** Visual color for the stack */
  color?: string
  /** Whether stack is expanded or collapsed */
  isExpanded: boolean
  /** Position within the column */
  position: number
  /** Timestamp when stack was created */
  createdAt: Date
  /** AI confidence score (0-1) for auto-stacked groups */
  confidence?: number
}

export interface StackingConfig {
  /** Enable automatic AI-powered stacking */
  enableAutoStacking: boolean
  /** Minimum confidence threshold for auto-stacking (0-1) */
  autoStackConfidenceThreshold: number
  /** Minimum cards required to form a stack */
  minCardsPerStack: number
  /** Enable manual drag-to-stack */
  enableManualStacking: boolean
  /** Show stack summaries (card count, assignees, etc.) */
  showStackSummaries: boolean
  /** Animation duration in ms */
  animationDuration: number
}

export interface StackSuggestion {
  /** Suggested stack configuration */
  stack: Omit<CardStack, 'id' | 'createdAt' | 'isExpanded' | 'position'>
  /** Reason for suggestion */
  reason: string
  /** Confidence score (0-1) */
  confidence: number
}

export const DEFAULT_STACKING_CONFIG: StackingConfig = {
  enableAutoStacking: true,
  autoStackConfidenceThreshold: 0.7,
  minCardsPerStack: 2,
  enableManualStacking: true,
  showStackSummaries: true,
  animationDuration: 200,
}
