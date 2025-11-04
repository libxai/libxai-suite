/**
 * Base types for ASAKAA Core
 * @module types/base
 */

/**
 * Priority levels for cards
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/**
 * Card status types
 */
export type CardStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'

/**
 * Dependency types for Gantt chart
 * - finish-to-start: Task B can't start until Task A finishes (most common)
 * - start-to-start: Task B can't start until Task A starts
 * - finish-to-finish: Task B can't finish until Task A finishes
 * - start-to-finish: Task B can't finish until Task A starts (rare)
 */
export type DependencyType = 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish'

/**
 * Dependency configuration for Gantt scheduling
 */
export interface Dependency {
  /** ID of the task this task depends on */
  taskId: string
  /** Type of dependency relationship */
  type: DependencyType
  /** Lag time in days (positive = delay, negative = lead time) */
  lag?: number
}

/**
 * Base entity with common properties
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Card data interface
 */
export interface CardData extends BaseEntity {
  /** Card title (required) */
  title: string
  /** Card description (optional) */
  description?: string
  /** Lexicographic position within column (for ordering) */
  position: number
  /** Parent column ID */
  columnId: string

  // Optional metadata
  /** Priority level */
  priority?: Priority
  /** Status */
  status?: CardStatus
  /** Assigned user IDs (multiple users) */
  assignedUserIds?: string[]
  /** Tags/labels */
  labels?: string[]
  /** Date range - start date */
  startDate?: Date
  /** Date range - end date */
  endDate?: Date
  /** Task dependencies with relationship types */
  dependencies?: Dependency[]
  /** Estimated time (in hours) */
  estimatedTime?: number
  /** Actual time spent (in hours) */
  actualTime?: number
  /** Manual progress override (0-100%) - takes precedence over calculated progress */
  progress?: number
}

/**
 * Column data interface
 */
export interface ColumnData extends BaseEntity {
  /** Column title */
  title: string
  /** Lexicographic position (for ordering columns) */
  position: number
  /** Array of card IDs in this column */
  cardIds: string[]

  // Optional configuration
  /** Work-in-progress limit */
  wipLimit?: number
  /** WIP limit enforcement type: 'soft' = warning, 'hard' = block */
  wipLimitType?: 'soft' | 'hard'
  /** Color for visual distinction */
  color?: string
}

/**
 * Board data interface
 */
export interface BoardData extends BaseEntity {
  /** Board title */
  title: string
  /** Board description */
  description?: string
  /** Array of column IDs */
  columnIds: string[]
  /** Board settings */
  settings?: BoardSettings
}

/**
 * Board settings
 */
export interface BoardSettings {
  /** Default theme */
  theme?: 'dark' | 'light' | 'neutral'
  /** Enable/disable features */
  features?: {
    enableTimeTracking?: boolean
    enableDependencies?: boolean
    enableLabels?: boolean
    enableDueDates?: boolean
  }
}

/**
 * User data interface
 */
export interface UserData extends BaseEntity {
  /** User name */
  name: string
  /** User email */
  email: string
  /** User initials (for avatar) */
  initials?: string
  /** Avatar color */
  color?: string
  /** User role */
  role?: 'admin' | 'member' | 'viewer'
}
