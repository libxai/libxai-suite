/**
 * Gantt-specific types for ASAKAA Core
 * @module types/gantt
 */

import type { CardData, Dependency } from './base.types'

/**
 * Milestone marker in a project timeline
 */
export interface Milestone {
  /** Unique identifier */
  id: string
  /** Milestone name/title */
  name: string
  /** Target date for the milestone */
  date: Date
  /** Whether milestone has been achieved */
  achieved: boolean
  /** Associated card IDs that must be completed for this milestone */
  cardIds?: string[]
  /** Optional description */
  description?: string
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Baseline snapshot for project comparison
 * Used to compare planned vs actual progress
 */
export interface Baseline {
  /** Unique identifier */
  id: string
  /** Baseline name (e.g., "Initial Plan", "Q2 Revision") */
  name: string
  /** When this baseline was created */
  createdAt: Date
  /** Snapshot of card data at baseline time */
  cards: Map<string, BaselineCardSnapshot>
  /** Optional description */
  description?: string
}

/**
 * Snapshot of a card at baseline time
 */
export interface BaselineCardSnapshot {
  /** Card ID */
  id: string
  /** Planned start date at baseline */
  startDate?: Date
  /** Planned end date at baseline */
  endDate?: Date
  /** Planned duration in days */
  duration?: number
  /** Planned progress percentage */
  progress?: number
  /** Dependencies at baseline time */
  dependencies?: Dependency[]
}

/**
 * Critical path result from dependency analysis
 */
export interface CriticalPath {
  /** Array of card IDs in critical path order */
  cardIds: string[]
  /** Total duration in days */
  duration: number
  /** Whether any task in critical path is delayed */
  hasDelays: boolean
  /** Total slack/float in the project (0 for critical path tasks) */
  totalSlack: number
}

/**
 * Task scheduling result
 */
export interface ScheduledTask {
  /** Card ID */
  cardId: string
  /** Calculated earliest start date */
  earlyStart: Date
  /** Calculated earliest finish date */
  earlyFinish: Date
  /** Calculated latest start date */
  lateStart: Date
  /** Calculated latest finish date */
  lateFinish: Date
  /** Total float/slack in days */
  totalFloat: number
  /** Free float in days */
  freeFloat: number
  /** Whether this task is on critical path */
  isCritical: boolean
  /** Dependencies affecting this task */
  predecessors: string[]
  /** Tasks dependent on this task */
  successors: string[]
}

/**
 * Resource allocation for a task
 */
export interface ResourceAllocation {
  /** Resource/user ID */
  resourceId: string
  /** Card ID */
  cardId: string
  /** Allocation percentage (0-100) */
  allocation: number
  /** Start date of allocation */
  startDate: Date
  /** End date of allocation */
  endDate: Date
}

/**
 * Resource utilization summary
 */
export interface ResourceUtilization {
  /** Resource/user ID */
  resourceId: string
  /** Total allocated hours */
  allocatedHours: number
  /** Available hours in period */
  availableHours: number
  /** Utilization percentage */
  utilization: number
  /** Whether resource is over-allocated */
  isOverAllocated: boolean
  /** Array of card IDs assigned to this resource */
  assignedCardIds: string[]
}

/**
 * Gantt view configuration
 */
export interface GanttConfig {
  /** Time scale unit */
  timeScale: 'day' | 'week' | 'month' | 'quarter'
  /** Show/hide weekends */
  showWeekends: boolean
  /** Show/hide today marker */
  showTodayMarker: boolean
  /** Show/hide critical path */
  highlightCriticalPath: boolean
  /** Show/hide dependencies */
  showDependencies: boolean
  /** Show/hide milestones */
  showMilestones: boolean
  /** Show/hide baselines */
  showBaseline?: boolean
  /** Active baseline ID for comparison */
  activeBaselineId?: string
  /** Row height in pixels */
  rowHeight: number
  /** Enable auto-scheduling */
  autoSchedule: boolean
  /** Working hours per day */
  workingHoursPerDay: number
  /** Working days per week (typically 5) */
  workingDaysPerWeek: number
}

/**
 * Gantt chart state
 */
export interface GanttState {
  /** All cards in the project */
  cards: Map<string, CardData>
  /** Milestones */
  milestones: Map<string, Milestone>
  /** Baselines */
  baselines: Map<string, Baseline>
  /** Scheduled tasks (calculated) */
  scheduledTasks: Map<string, ScheduledTask>
  /** Critical path (calculated) */
  criticalPath?: CriticalPath
  /** Configuration */
  config: GanttConfig
  /** Current view date range */
  viewRange: {
    start: Date
    end: Date
  }
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  /** Whether dependencies are valid */
  isValid: boolean
  /** Array of circular dependency chains detected */
  circularDependencies: string[][]
  /** Array of invalid task IDs (tasks that don't exist) */
  invalidTaskIds: string[]
  /** Error messages */
  errors: string[]
}

/**
 * Auto-schedule options
 */
export interface AutoScheduleOptions {
  /** Start date for scheduling */
  projectStartDate: Date
  /** Working hours per day */
  workingHoursPerDay?: number
  /** Working days */
  workingDays?: number[]
  /** Respect manual constraints */
  respectConstraints?: boolean
  /** Level resources */
  levelResources?: boolean
}

/**
 * Task constraint types
 */
export type TaskConstraintType =
  | 'ASAP' // As Soon As Possible (default)
  | 'ALAP' // As Late As Possible
  | 'SNET' // Start No Earlier Than
  | 'SNLT' // Start No Later Than
  | 'FNET' // Finish No Earlier Than
  | 'FNLT' // Finish No Later Than
  | 'MSO' // Must Start On
  | 'MFO' // Must Finish On

/**
 * Task constraint
 */
export interface TaskConstraint {
  /** Card ID */
  cardId: string
  /** Constraint type */
  type: TaskConstraintType
  /** Constraint date (if applicable) */
  date?: Date
}
