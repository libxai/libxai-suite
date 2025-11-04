/**
 * Card Model - Immutable card entity
 * @module models/Card
 */

import type { CardData, Priority, CardStatus, Dependency } from '../types'

/**
 * Immutable Card entity
 *
 * @example
 * ```typescript
 * const card = new Card({
 *   id: 'card-1',
 *   title: 'Implement login',
 *   columnId: 'todo',
 *   position: 0
 * })
 *
 * // Update creates a new instance
 * const updated = card.update({ title: 'Implement authentication' })
 * ```
 */
export class Card {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly position: number
  readonly columnId: string
  readonly priority?: Priority
  readonly status?: CardStatus
  readonly assignedUserIds?: readonly string[]
  readonly labels?: readonly string[]
  readonly startDate?: Date
  readonly endDate?: Date
  readonly dependencies?: readonly Dependency[]
  readonly estimatedTime?: number
  readonly actualTime?: number
  readonly progress?: number
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(data: Omit<CardData, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }) {
    this.id = data.id
    this.title = data.title
    this.description = data.description
    this.position = data.position
    this.columnId = data.columnId
    this.priority = data.priority
    this.status = data.status
    this.assignedUserIds = data.assignedUserIds ? Object.freeze([...data.assignedUserIds]) : undefined
    this.labels = data.labels ? Object.freeze([...data.labels]) : undefined
    this.startDate = data.startDate
    this.endDate = data.endDate
    this.dependencies = data.dependencies
      ? Object.freeze(data.dependencies.map((dep) => Object.freeze({ ...dep })))
      : undefined
    this.estimatedTime = data.estimatedTime
    this.actualTime = data.actualTime
    this.progress = data.progress
    this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : undefined
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()

    // Freeze the instance to make it immutable
    Object.freeze(this)
  }

  /**
   * Create a new Card instance with updated properties
   *
   * @param changes - Partial card data to update
   * @returns New Card instance with applied changes
   */
  update(changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): Card {
    return new Card({
      ...this.toData(),
      ...changes,
      updatedAt: new Date(),
    })
  }

  /**
   * Convert Card instance to plain data object
   *
   * @returns CardData object
   */
  toData(): CardData {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      position: this.position,
      columnId: this.columnId,
      priority: this.priority,
      status: this.status,
      assignedUserIds: this.assignedUserIds ? [...this.assignedUserIds] : undefined,
      labels: this.labels ? [...this.labels] : undefined,
      startDate: this.startDate,
      endDate: this.endDate,
      dependencies: this.dependencies ? this.dependencies.map((dep) => ({ ...dep })) : undefined,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      progress: this.progress,
      metadata: this.metadata ? { ...this.metadata } : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a Card from plain data object
   *
   * @param data - CardData object
   * @returns Card instance
   */
  static fromData(data: CardData): Card {
    return new Card(data)
  }

  /**
   * Check if card is overdue
   *
   * @returns true if card has end date and it's in the past
   */
  isOverdue(): boolean {
    if (!this.endDate) return false
    return new Date(this.endDate) < new Date()
  }

  /**
   * Get number of days until due date
   *
   * @returns Number of days until due (positive = future, negative = past), or undefined if no end date
   */
  getDaysUntilDue(): number | undefined {
    if (!this.endDate) return undefined

    const now = new Date()
    const due = new Date(this.endDate)

    // Calculate difference in milliseconds
    const diffMs = due.getTime() - now.getTime()

    // Convert to days (rounded)
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if card is assigned to a specific user
   *
   * @param userId - User ID to check
   * @returns true if user is assigned to this card
   */
  isAssignedTo(userId: string): boolean {
    return this.assignedUserIds?.includes(userId) ?? false
  }

  /**
   * Check if card has a specific label
   *
   * @param label - Label to check
   * @returns true if card has the label
   */
  hasLabel(label: string): boolean {
    return this.labels?.includes(label) ?? false
  }

  /**
   * Calculate progress based on manual override or actual time vs estimated time
   *
   * @returns Progress percentage (0-100) or undefined if no estimate
   */
  getProgress(): number | undefined {
    // Manual progress takes precedence
    if (this.progress !== undefined) {
      return Math.max(0, Math.min(100, this.progress))
    }

    // Calculate from time tracking
    if (!this.estimatedTime || this.estimatedTime === 0) return undefined
    if (!this.actualTime) return 0

    const progress = (this.actualTime / this.estimatedTime) * 100
    return Math.min(progress, 100) // Cap at 100%
  }

  /**
   * Get duration in days between start and end date
   *
   * @returns Duration in days, or undefined if dates not set
   */
  getDuration(): number | undefined {
    if (!this.startDate || !this.endDate) return undefined

    const start = new Date(this.startDate)
    const end = new Date(this.endDate)

    const diffMs = end.getTime() - start.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) // Round up to full days
  }

  /**
   * Check if this card has any dependencies
   *
   * @returns true if card has dependencies
   */
  hasDependencies(): boolean {
    return (this.dependencies?.length ?? 0) > 0
  }

  /**
   * Get list of task IDs this card depends on
   *
   * @returns Array of dependent task IDs
   */
  getDependentTaskIds(): string[] {
    if (!this.dependencies) return []
    return this.dependencies.map((dep) => dep.taskId)
  }

  /**
   * Check if this card depends on a specific task
   *
   * @param taskId - Task ID to check
   * @returns true if this card depends on the specified task
   */
  dependsOn(taskId: string): boolean {
    return this.getDependentTaskIds().includes(taskId)
  }

  /**
   * Get dependency relationship with a specific task
   *
   * @param taskId - Task ID to check
   * @returns Dependency object if exists, undefined otherwise
   */
  getDependency(taskId: string): Dependency | undefined {
    return this.dependencies?.find((dep) => dep.taskId === taskId)
  }

  /**
   * Add a dependency to this card
   *
   * @param dependency - Dependency to add
   * @returns New Card instance with added dependency
   */
  addDependency(dependency: Dependency): Card {
    const existingDeps = this.dependencies ? [...this.dependencies.map((d) => ({ ...d }))] : []

    // Don't add if already exists
    if (existingDeps.some((d) => d.taskId === dependency.taskId)) {
      return this
    }

    return this.update({
      dependencies: [...existingDeps, dependency],
    })
  }

  /**
   * Remove a dependency from this card
   *
   * @param taskId - ID of task to remove dependency for
   * @returns New Card instance with removed dependency
   */
  removeDependency(taskId: string): Card {
    if (!this.dependencies) return this

    const filtered = this.dependencies.filter((dep) => dep.taskId !== taskId).map((d) => ({ ...d }))

    // If no change, return same instance
    if (filtered.length === this.dependencies.length) {
      return this
    }

    return this.update({
      dependencies: filtered.length > 0 ? filtered : undefined,
    })
  }

  /**
   * Check if dates are valid (start before end)
   *
   * @returns true if dates are valid or not set
   */
  hasValidDates(): boolean {
    if (!this.startDate || !this.endDate) return true

    return new Date(this.startDate) <= new Date(this.endDate)
  }

  /**
   * Check if card is currently in progress (between start and end dates)
   *
   * @returns true if current date is between start and end dates
   */
  isInProgress(): boolean {
    if (!this.startDate || !this.endDate) return false

    const now = new Date()
    const start = new Date(this.startDate)
    const end = new Date(this.endDate)

    return now >= start && now <= end
  }

  /**
   * Check if card hasn't started yet
   *
   * @returns true if start date is in the future
   */
  isNotStarted(): boolean {
    if (!this.startDate) return false

    return new Date(this.startDate) > new Date()
  }

  /**
   * Check if card is completed (past end date or 100% progress)
   *
   * @returns true if card is considered completed
   */
  isCompleted(): boolean {
    // Check progress first
    const progress = this.getProgress()
    if (progress !== undefined && progress >= 100) return true

    // Check status
    if (this.status === 'DONE') return true

    // Check if past end date
    return this.isOverdue()
  }
}
