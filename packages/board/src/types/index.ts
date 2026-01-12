/**
 * Core types for ASAKAA Kanban Board
 * @module types
 */

import type { Dependency } from '@libxai/core'
import type { TaskTag } from '../components/Gantt/types'

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/**
 * Priority levels for cards
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

/**
 * Subtask entity
 * Represents a checklist item within a card
 */
export interface Subtask {
  /** Unique identifier */
  id: string
  /** Subtask title */
  title: string
  /** Completion status */
  completed: boolean
  /** Position within the subtask list */
  position?: number
  /** Assigned user ID (optional) */
  assigneeId?: string
  /** Due date (optional) */
  dueDate?: Date | string
  /** Created timestamp */
  createdAt?: Date | string
  /** Updated timestamp */
  updatedAt?: Date | string
}

/**
 * Card status types
 */
export type CardStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'

/**
 * File attachment on a card
 * v0.17.182: Moved before Card interface to allow usage in Card.attachments
 */
export interface Attachment {
  /** Unique identifier */
  id: string
  /** Card ID */
  cardId: string
  /** File name */
  name: string
  /** File size in bytes */
  size: number
  /** MIME type */
  type: string
  /** File URL or data URI */
  url: string
  /** Upload timestamp */
  uploadedAt: Date | string
  /** User who uploaded */
  uploadedBy: string
  /** Thumbnail URL (for images) */
  thumbnailUrl?: string
}

/**
 * Card entity
 * Represents a single task/item in the Kanban board
 */
export interface Card {
  /** Unique identifier */
  id: string
  /** Card title (required) */
  title: string
  /** Card description (optional) */
  description?: string
  /** Lexicographic position within column (for ordering) */
  position: number
  /** Parent column ID */
  columnId: string

  // Optional metadata (user can extend)
  /** Priority level */
  priority?: Priority
  /** Assigned user ID (legacy - use assignedUserIds) */
  assigneeId?: string
  /** Assigned user IDs (multiple users) */
  assignedUserIds?: string[]
  /** Tags/labels */
  labels?: string[]
  /** Due date (legacy - use startDate/endDate) */
  dueDate?: Date | string
  /** Date range - start date */
  startDate?: Date | string
  /** Date range - end date */
  endDate?: Date | string
  /** Task dependencies - supports both legacy format (string[]) and new format (Dependency[]) */
  dependencies?: string[] | Dependency[]
  /** Estimated time (in hours) - legacy field */
  estimatedTime?: number
  /** v1.1.0: Estimated effort in minutes (for time tracking) */
  effortMinutes?: number | null
  /** v1.1.0: Total logged time in minutes (aggregated) */
  timeLoggedMinutes?: number
  /** Manual progress override (0-100%) */
  progress?: number
  /** Cover image URL */
  coverImage?: string
  /** Subtasks/checklist items */
  subtasks?: Subtask[]
  /** v0.17.29: Custom color for visual identification (hex color) */
  color?: string
  /** v0.17.158: Tags with colors (ClickUp-style) */
  tags?: TaskTag[]
  /** v0.17.182: Attachments for displaying thumbnails in card */
  attachments?: Attachment[]
  /** Custom metadata */
  metadata?: Record<string, unknown>

  // Timestamps
  createdAt?: Date | string
  updatedAt?: Date | string
}

/**
 * Column entity
 * Represents a stage/status in the workflow
 */
export interface Column {
  /** Unique identifier */
  id: string
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
  /** Custom metadata */
  metadata?: Record<string, unknown>

  // Timestamps
  createdAt?: Date | string
  updatedAt?: Date | string
}

/**
 * Board entity
 * Top-level container for the Kanban board
 */
export interface Board {
  /** Unique identifier */
  id: string
  /** Board title */
  title?: string
  /** Array of columns */
  columns: Column[]
  /** Array of all cards */
  cards: Card[]

  // Optional metadata
  metadata?: Record<string, any>
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * Callbacks for board operations
 * These allow the library consumer to persist changes
 */
export interface BoardCallbacks {
  /** Called when a card is moved to a different position/column */
  onCardMove?: (
    cardId: string,
    targetColumnId: string,
    position: number
  ) => void | Promise<void>

  /** Called when card properties are updated */
  onCardUpdate?: (
    cardId: string,
    updates: Partial<Card>
  ) => void | Promise<void>

  /** Called when a new card is created */
  onCardCreate?: (
    card: Omit<Card, 'id'>
  ) => void | Promise<void>

  /** Called when a card is deleted */
  onCardDelete?: (cardId: string) => void | Promise<void>

  /** Called when a new column is created */
  onColumnCreate?: (
    column: Omit<Column, 'id' | 'cardIds'>
  ) => void | Promise<void>

  /** Called when column properties are updated */
  onColumnUpdate?: (
    columnId: string,
    updates: Partial<Column>
  ) => void | Promise<void>

  /** Called when a column is deleted */
  onColumnDelete?: (columnId: string) => void | Promise<void>

  /** Called when columns are reordered */
  onColumnReorder?: (
    columnId: string,
    newPosition: number
  ) => void | Promise<void>

  /** Called when WIP limit is exceeded (hard limit only) */
  onWipLimitExceeded?: (
    column: Column,
    card: Card
  ) => void
}

// ============================================================================
// AI TYPES (Optional features)
// ============================================================================

/**
 * Insight types generated by AI
 */
export type InsightType =
  | 'RISK_DELAY'          // Risk of project delay
  | 'RISK_OVERLOAD'       // Team member overload
  | 'RISK_BLOCKER'        // Blocking dependency
  | 'OPPORTUNITY'         // Optimization opportunity
  | 'SUGGESTION'          // General suggestion

/**
 * Severity levels for insights
 */
export type InsightSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * AI-generated insight about the board state
 */
export interface Insight {
  /** Unique identifier */
  id?: string
  /** Type of insight */
  type: InsightType
  /** Severity level */
  severity: InsightSeverity
  /** Human-readable title */
  title: string
  /** Detailed description */
  description: string
  /** AI confidence score (0-1) */
  confidence: number
  /** Suggested action to take */
  suggestedAction?: string
  /** Related card IDs */
  relatedCardIds?: string[]
  /** Related column IDs */
  relatedColumnIds?: string[]
  /** Timestamp */
  timestamp?: Date | string
}

/**
 * Result of AI assignee suggestion
 */
export interface AssigneeSuggestion {
  /** Suggested user ID */
  userId: string
  /** Confidence score (0-1) */
  confidence: number
  /** Reasoning for suggestion */
  reasoning: string
}

/**
 * Result of AI plan generation
 */
export interface GeneratedPlan {
  /** Generated columns */
  columns: Omit<Column, 'id'>[]
  /** Generated cards */
  cards: Omit<Card, 'id'>[]
  /** Explanation of the plan */
  explanation?: string
}

/**
 * AI callbacks (optional)
 * Consumer provides these if they want AI features
 */
export interface AICallbacks {
  /** Generate a complete board plan from a text prompt */
  onGeneratePlan?: (prompt: string) => Promise<GeneratedPlan>

  /** Suggest best assignee for a card */
  onSuggestAssignee?: (card: Card) => Promise<AssigneeSuggestion>

  /** Predict risks and opportunities based on board state */
  onPredictRisks?: (boardState: Board) => Promise<Insight[]>

  /** Generate subtasks for a card */
  onGenerateSubtasks?: (card: Card) => Promise<Omit<Card, 'id'>[]>

  /** Estimate effort for a card */
  onEstimateEffort?: (card: Card) => Promise<{ hours: number, confidence: number }>
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Configuration options for the Kanban board
 */
export interface BoardConfig {
  /** Theme: 'dark' | 'light' | 'neutral' */
  theme?: 'dark' | 'light' | 'neutral'
  /** Locale for i18n */
  locale?: 'en' | 'es' | string
  /** Enable virtualization (auto-enabled if >100 cards) */
  enableVirtualization?: boolean
  /** Enable AI features */
  enableAI?: boolean
  /** Animation duration in milliseconds */
  animationDuration?: number
  /** Fixed column width in pixels */
  columnWidth?: number
  /** Estimated card height for virtualization */
  cardHeight?: number
  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean
  /** Show card count in column headers */
  showCardCount?: boolean
  /** Show WIP limits */
  showWipLimits?: boolean
  /** Enable column collapsing */
  enableCollapsible?: boolean
  /** Maximum cards to display per column before showing "show more" */
  maxCardsPerColumn?: number
}

/**
 * Render props for customization
 */
export interface RenderProps {
  /** Custom card renderer */
  renderCard?: (card: Card) => React.ReactNode
  /** Custom column renderer */
  renderColumn?: (column: Column, cards: Card[]) => React.ReactNode
  /** Custom card overlay during drag */
  renderCardOverlay?: (card: Card) => React.ReactNode
  /** Custom column header */
  renderColumnHeader?: (column: Column, cardCount: number) => React.ReactNode
  /** Custom empty state */
  renderEmptyState?: (column: Column) => React.ReactNode
}

/**
 * User entity for assignment
 */
export interface User {
  id: string
  name: string
  initials: string
  color: string
  avatar?: string
}

/**
 * Main KanbanBoard component props
 */
export interface KanbanBoardProps {
  /** Board data (controlled) */
  board: Board

  /** Callbacks for mutations */
  callbacks: BoardCallbacks

  /** AI callbacks (optional) */
  aiCallbacks?: AICallbacks

  /** Card click handler */
  onCardClick?: (card: Card) => void

  /** Render customization */
  renderProps?: RenderProps

  /** Configuration */
  config?: BoardConfig

  /** Available users for assignment */
  availableUsers?: User[]

  /** Custom CSS class */
  className?: string

  /** Custom inline styles */
  style?: React.CSSProperties

  /** Loading state */
  isLoading?: boolean

  /** Error state */
  error?: Error | string

  /** Available tags in workspace for selection */
  availableTags?: TaskTag[]

  /** Callback to create a new tag */
  onCreateTag?: (name: string, color: string) => Promise<TaskTag | null>

  /** v0.17.241: Attachments map by card ID (for modal display) */
  attachmentsByCard?: Map<string, Attachment[]>

  /** v0.17.241: Callback when files are dropped/selected for upload */
  onUploadAttachments?: (cardId: string, files: File[]) => Promise<void>

  /** v0.17.241: Callback to delete an attachment */
  onDeleteAttachment?: (attachmentId: string) => Promise<void>

  /** v0.17.254: Comments for TaskDetailModal */
  comments?: Array<{
    id: string
    taskId: string
    userId: string
    content: string
    createdAt: Date
    updatedAt?: Date
    user?: {
      id: string
      name: string
      email: string
      avatarUrl?: string
    }
  }>

  /** v0.17.254: Callback to add a comment */
  onAddComment?: (taskId: string, content: string, mentionedUserIds?: string[]) => Promise<void>

  /** v0.17.254: Current user info for comment input */
  currentUser?: {
    id: string
    name: string
    avatarUrl?: string
    color?: string
  }

  /** v0.17.254: Callback when task is opened in modal (to load comments) */
  /** v0.17.401: Users available for @mentions in comments */
  mentionableUsers?: Array<{
    id: string
    name: string
    email?: string
    avatar?: string
    color?: string
  }>

  onTaskOpen?: (taskId: string) => void

  /** v0.18.13: Callback to upload attachments to comments (enables attachment icon in comment input) */
  onUploadCommentAttachments?: (files: File[]) => Promise<Array<{ id: string; url: string; name: string; type: string; size: number }>>

  // ========================================================================
  // v1.1.0: Time Tracking props
  // ========================================================================

  /** Enable time tracking features in TaskDetailModal */
  enableTimeTracking?: boolean

  /** Time tracking summary for the currently open task */
  timeTrackingSummary?: TimeTrackingSummary

  /** Time entries for the currently open task */
  timeEntries?: TimeEntry[]

  /** Current timer state */
  timerState?: TimerState

  /** Callback to log time manually */
  onLogTime?: (taskId: string, input: TimeLogInput) => Promise<void>

  /** Callback to update task estimate */
  onUpdateEstimate?: (taskId: string, minutes: number | null) => Promise<void>

  /** Callback to start timer */
  onStartTimer?: (taskId: string) => void

  /** Callback to stop timer and save time */
  onStopTimer?: (taskId: string) => void

  /** Callback to discard timer without saving */
  onDiscardTimer?: (taskId: string) => void
}

// ============================================================================
// DRAG & DROP TYPES
// ============================================================================

/**
 * Drag event data
 */
export interface DragData {
  /** Card being dragged */
  card: Card
  /** Source column ID */
  sourceColumnId: string
  /** Source position */
  sourcePosition: number
}

/**
 * Drop event data
 */
export interface DropData {
  /** Card being dropped */
  card: Card
  /** Target column ID */
  targetColumnId: string
  /** Target position */
  targetPosition: number
  /** Source column ID */
  sourceColumnId: string
}

// ============================================================================
// FILTER & SORT TYPES
// ============================================================================

/**
 * Filter criteria for cards
 */
export interface CardFilter {
  /** Filter by assignee */
  assigneeIds?: string[]
  /** Filter by priority */
  priorities?: Priority[]
  /** Filter by labels */
  labels?: string[]
  /** Search in title/description */
  search?: string
  /** Filter by date range */
  dateRange?: {
    start: Date | string
    end: Date | string
  }
}

/**
 * Sort options for cards
 */
export type CardSortKey =
  | 'position'
  | 'priority'
  | 'dueDate'
  | 'createdAt'
  | 'title'

export interface CardSort {
  key: CardSortKey
  direction: 'asc' | 'desc'
}

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Internal state for drag operations
 */
export interface DragState {
  isDragging: boolean
  draggedCardId: string | null
  sourceColumnId: string | null
  targetColumnId: string | null
}

/**
 * Selection state for multi-select
 */
export interface SelectionState {
  selectedCardIds: string[]
  lastSelectedCardId: string | null
}

// ============================================================================
// COMMENTS & ACTIVITY TYPES
// ============================================================================

/**
 * Comment on a card
 */
export interface Comment {
  /** Unique identifier */
  id: string
  /** Card ID */
  cardId: string
  /** Author user ID */
  authorId: string
  /** Comment content */
  content: string
  /** Timestamp */
  createdAt: Date | string
  /** Last update timestamp */
  updatedAt?: Date | string
  /** Mentions (user IDs) */
  mentions?: string[]
}

/**
 * Activity log entry types
 */
export type ActivityType =
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_MOVED'
  | 'CARD_DELETED'
  | 'COMMENT_ADDED'
  | 'USER_ASSIGNED'
  | 'USER_UNASSIGNED'
  | 'PRIORITY_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  // v1.1.0: Time tracking activities
  | 'TIME_LOGGED'
  | 'TIME_UPDATED'
  | 'TIME_DELETED'
  | 'ESTIMATE_SET'
  | 'ESTIMATE_UPDATED'

/**
 * Activity log entry
 */
export interface Activity {
  /** Unique identifier */
  id: string
  /** Activity type */
  type: ActivityType
  /** Card ID */
  cardId: string
  /** User who performed the action */
  userId: string
  /** Timestamp */
  timestamp: Date | string
  /** Previous value (for updates) */
  previousValue?: any
  /** New value (for updates) */
  newValue?: any
  /** Additional metadata */
  metadata?: Record<string, any>
}

// ============================================================================
// CUSTOM FIELDS TYPES
// ============================================================================

/**
 * Custom field types
 */
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'dropdown'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'

/**
 * Custom field definition
 */
export interface CustomField {
  /** Unique identifier */
  id: string
  /** Field name */
  name: string
  /** Field type */
  type: CustomFieldType
  /** Options for dropdown type */
  options?: string[]
  /** Whether field is required */
  required?: boolean
  /** Default value */
  defaultValue?: any
  /** Validation rules */
  validation?: {
    min?: number
    max?: number
    regex?: string
    message?: string
  }
  /** Show in card preview */
  showInPreview?: boolean
  /** Icon for the field */
  icon?: string
}

/**
 * Custom field value
 */
export interface CustomFieldValue {
  /** Custom field ID */
  fieldId: string
  /** Value */
  value: any
}

// ============================================================================
// BULK OPERATIONS TYPES
// ============================================================================

/**
 * Bulk operation types
 */
export type BulkOperationType =
  | 'update_priority'
  | 'assign_users'
  | 'add_labels'
  | 'remove_labels'
  | 'move_column'
  | 'delete'
  | 'update_dates'
  | 'update_custom_field'

/**
 * Bulk operation payload
 */
export interface BulkOperation {
  /** Type of operation */
  type: BulkOperationType
  /** Card IDs to operate on */
  cardIds: string[]
  /** Operation-specific payload */
  payload: any
}

/**
 * Bulk operations callbacks
 */
export interface BulkOperationsCallbacks {
  /** Called when bulk update is performed */
  onBulkUpdate?: (cardIds: string[], updates: Partial<Card>) => void | Promise<void>
  /** Called when bulk delete is performed */
  onBulkDelete?: (cardIds: string[]) => void | Promise<void>
  /** Called when bulk move is performed */
  onBulkMove?: (cardIds: string[], targetColumnId: string) => void | Promise<void>
}

// ============================================================================
// AUTOMATION RULES TYPES
// ============================================================================

/**
 * Automation trigger types
 */
export type AutomationTriggerType =
  | 'card_moved'
  | 'card_created'
  | 'card_updated'
  | 'date_reached'
  | 'field_changed'
  | 'priority_changed'
  | 'user_assigned'
  | 'label_added'

/**
 * Automation condition operators
 */
export type AutomationConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'

/**
 * Automation action types
 */
export type AutomationActionType =
  | 'change_priority'
  | 'assign_user'
  | 'unassign_user'
  | 'add_label'
  | 'remove_label'
  | 'move_card'
  | 'set_custom_field'
  | 'add_comment'
  | 'send_notification'
  | 'set_due_date'

/**
 * Automation trigger configuration
 */
export interface AutomationTrigger {
  /** Trigger type */
  type: AutomationTriggerType
  /** Trigger-specific configuration */
  config?: {
    columnId?: string
    fieldName?: string
    oldValue?: any
    newValue?: any
    daysOffset?: number
  }
}

/**
 * Automation condition
 */
export interface AutomationCondition {
  /** Field to check */
  field: string
  /** Comparison operator */
  operator: AutomationConditionOperator
  /** Value to compare against */
  value?: any
}

/**
 * Automation action
 */
export interface AutomationAction {
  /** Action type */
  type: AutomationActionType
  /** Action-specific configuration */
  config: {
    priority?: Priority
    userId?: string
    label?: string
    columnId?: string
    customFieldId?: string
    customFieldValue?: any
    comment?: string
    notificationMessage?: string
    dueDate?: Date | string
  }
}

/**
 * Automation rule
 */
export interface AutomationRule {
  /** Unique identifier */
  id: string
  /** Rule name */
  name: string
  /** Rule description */
  description?: string
  /** Whether rule is enabled */
  enabled: boolean
  /** Trigger that starts the automation */
  trigger: AutomationTrigger
  /** Conditions that must be met (all must pass) */
  conditions?: AutomationCondition[]
  /** Actions to execute when conditions are met */
  actions: AutomationAction[]
  /** Created timestamp */
  createdAt?: Date | string
  /** Last updated timestamp */
  updatedAt?: Date | string
  /** Last executed timestamp */
  lastExecutedAt?: Date | string
  /** Execution count */
  executionCount?: number
}

/**
 * Automation engine callbacks
 */
export interface AutomationCallbacks {
  /** Called when automation rule is triggered */
  onAutomationExecute?: (rule: AutomationRule, card: Card) => void | Promise<void>
  /** Called when automation rule execution fails */
  onAutomationError?: (rule: AutomationRule, error: Error) => void
}

// ============================================================================
// SWIMLANES / GROUPING TYPES
// ============================================================================

/**
 * Grouping options for swimlanes
 */
export type GroupByOption =
  | 'none'           // No grouping (default Kanban view)
  | 'assignee'       // Group by assigned user
  | 'priority'       // Group by priority level
  | 'label'          // Group by label/tag
  | 'custom'         // Group by custom field

/**
 * Swimlane configuration
 */
export interface SwimlaneConfig {
  /** Grouping option */
  groupBy: GroupByOption
  /** Custom field ID (when groupBy is 'custom') */
  customFieldId?: string
  /** Show empty swimlanes */
  showEmptyLanes?: boolean
  /** Collapsible swimlanes */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

/**
 * Swimlane (horizontal row grouping cards)
 */
export interface Swimlane {
  /** Unique identifier */
  id: string
  /** Swimlane title */
  title: string
  /** Group value (user ID, priority, label, etc.) */
  groupValue: any
  /** Card IDs in this swimlane */
  cardIds: string[]
  /** Is collapsed */
  isCollapsed?: boolean
  /** Color for visual distinction */
  color?: string
  /** Icon */
  icon?: string
}

// ============================================================================
// KEYBOARD SHORTCUTS TYPES
// ============================================================================

/**
 * Keyboard shortcut action types
 * v0.5.0: Added single-key shortcuts for speed
 */
export type KeyboardAction =
  // Navigation
  | 'navigate_up'
  | 'navigate_down'
  | 'navigate_left'
  | 'navigate_right'
  | 'open_card'
  | 'close_modal'
  // Selection
  | 'select_all'
  | 'deselect_all'
  // v0.5.0: Quick Actions (Single Keys)
  | 'new_card'              // n - Quick create card
  | 'edit_card'             // e - Edit selected card
  | 'delete_card'           // d - Delete selected card
  | 'focus_search'          // / - Focus search input
  | 'show_shortcuts'        // ? - Show shortcuts help
  // Ctrl/Cmd Shortcuts
  | 'new_card_modal'        // Ctrl+N - Create with modal
  | 'search'                // Ctrl+K - Command palette
  | 'open_filters'          // Ctrl+F - Open filter bar
  | 'save'                  // Ctrl+S - Save changes
  | 'undo'                  // Ctrl+Z - Undo
  | 'redo'                  // Ctrl+Y - Redo
  | 'quick_add'             // Ctrl+Enter - Quick add card
  // Shift Shortcuts
  | 'delete_card_confirm'   // Shift+Delete - Delete with confirmation

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Shortcut key(s) */
  keys: string | string[]
  /** Action to perform */
  action: KeyboardAction
  /** Description */
  description: string
  /** Modifier keys required */
  modifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }
}

// ============================================================================
// CARD TEMPLATES TYPES
// ============================================================================

/**
 * Card template for quick creation
 */
export interface CardTemplate {
  /** Unique identifier */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description?: string
  /** Icon or emoji */
  icon?: string
  /** Pre-filled card data */
  template: Partial<Omit<Card, 'id' | 'position' | 'columnId'>>
  /** Category for organization */
  category?: string
}

// ============================================================================
// EXPORT/IMPORT TYPES
// ============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'pdf'

/**
 * Export options
 */
export interface ExportOptions {
  /** Format to export */
  format: ExportFormat
  /** Include card details */
  includeCardDetails?: boolean
  /** Include comments */
  includeComments?: boolean
  /** Include activity log */
  includeActivity?: boolean
  /** Include attachments */
  includeAttachments?: boolean
  /** Date range filter */
  dateRange?: {
    start: Date | string
    end: Date | string
  }
}

/**
 * Import result
 */
export interface ImportResult {
  /** Was import successful */
  success: boolean
  /** Number of cards imported */
  cardsImported?: number
  /** Number of columns imported */
  columnsImported?: number
  /** Errors encountered */
  errors?: string[]
  /** Warnings */
  warnings?: string[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Deep partial - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Omit multiple keys at once
 */
export type OmitMultiple<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/**
 * Extract callback function type
 */
export type CallbackFn<T extends (...args: any[]) => any> = T extends (
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : never

// ============================================================================
// TIME TRACKING TYPES (v1.1.0)
// ============================================================================

/**
 * Source of time entry - how the time was logged
 */
export type TimeLogSource = 'manual' | 'timer' | 'import'

/**
 * Time entry for a task
 * Represents a single time log (e.g., "2 hours worked on Jan 10")
 */
export interface TimeEntry {
  /** Unique identifier */
  id: string
  /** Task/Card ID */
  taskId: string
  /** User who logged the time */
  userId: string
  /** Duration in minutes */
  durationMinutes: number
  /** When the work was done (date of the work, not when it was logged) */
  loggedAt: Date | string
  /** Optional note/description */
  note?: string
  /** Source of the entry */
  source: TimeLogSource
  /** Created timestamp */
  createdAt: Date | string
  /** Updated timestamp */
  updatedAt?: Date | string
}

/**
 * Input for creating a new time log
 * Used by UI components to send data to callbacks
 */
export interface TimeLogInput {
  /** Duration in minutes */
  durationMinutes: number
  /** When the work was done */
  loggedAt?: Date | string
  /** Optional note */
  note?: string
  /** Source (defaults to 'manual') */
  source?: TimeLogSource
}

/**
 * Time tracking summary for a task
 * Aggregated view of time data
 */
export interface TimeTrackingSummary {
  /** Estimated effort in minutes (null if not set) */
  estimateMinutes: number | null
  /** Total logged time in minutes */
  loggedMinutes: number
  /** Remaining time in minutes (estimate - logged, can be negative) */
  remainingMinutes: number | null
  /** Progress percentage (0-100+, can exceed 100 if over estimate) */
  progressPercent: number | null
  /** Health status based on progress */
  health: 'on-track' | 'at-risk' | 'over-budget' | 'no-estimate'
}

/**
 * Timer state for real-time tracking
 */
export interface TimerState {
  /** Is timer currently running */
  isRunning: boolean
  /** Task ID being tracked (null if no timer active) */
  taskId: string | null
  /** When timer was started */
  startedAt: Date | string | null
  /** Elapsed seconds since start */
  elapsedSeconds: number
}

/**
 * Callbacks for time tracking operations
 * These allow the library consumer to persist time data
 */
export interface TimeTrackingCallbacks {
  /** Called when user logs time manually */
  onTimeLog?: (taskId: string, input: TimeLogInput) => Promise<void>

  /** Called when user updates a time entry */
  onTimeUpdate?: (entryId: string, updates: Partial<TimeLogInput>) => Promise<void>

  /** Called when user deletes a time entry */
  onTimeDelete?: (entryId: string) => Promise<void>

  /** Called when user sets/updates time estimate */
  onEstimateUpdate?: (taskId: string, estimateMinutes: number | null) => Promise<void>

  /** Called when timer is started */
  onTimerStart?: (taskId: string) => void

  /** Called when timer is stopped (returns logged entry) */
  onTimerStop?: (taskId: string, durationMinutes: number) => Promise<void>

  /** Called when timer is discarded without saving */
  onTimerDiscard?: (taskId: string) => void
}

/**
 * Props extension for time tracking in Card
 * Add these to Card interface for time-enabled cards
 */
export interface CardTimeProps {
  /** Estimated effort in minutes */
  effortMinutes?: number | null
  /** Total logged time in minutes (aggregated from entries) */
  timeLoggedMinutes?: number
  /** Time entries for this card */
  timeEntries?: TimeEntry[]
}

/**
 * Props extension for KanbanBoard with time tracking
 */
export interface TimeTrackingBoardProps {
  /** Enable time tracking features */
  enableTimeTracking?: boolean

  /** Time tracking callbacks */
  timeTrackingCallbacks?: TimeTrackingCallbacks

  /** Current timer state (for global timer indicator) */
  timerState?: TimerState

  /** Time entries by task ID (for modal display) */
  timeEntriesByTask?: Map<string, TimeEntry[]>
}

// ============================================================================
// CARD STACKING TYPES (v0.6.0)
// ============================================================================

export type { CardStack, StackingStrategy, StackingConfig, StackSuggestion } from './card-stack'
