/**
 * Dependency Engine for Gantt Chart
 * Handles task dependencies, critical path analysis, topological sorting, and cycle detection
 * @module gantt/DependencyEngine
 */

import type { CardData } from '../types/base.types'
import type {
  CriticalPath,
  ScheduledTask,
  DependencyValidation,
  AutoScheduleOptions,
} from '../types/gantt.types'

/**
 * Enhanced Dependency Engine
 *
 * Features:
 * - Topological sort for task ordering
 * - Cycle detection to prevent circular dependencies
 * - Critical path method (CPM) calculation
 * - Forward and backward pass scheduling
 * - Slack/float calculation
 * - Auto-scheduling with constraints
 */
export class DependencyEngine {
  private cards: Map<string, CardData> = new Map()
  private adjacencyList: Map<string, Set<string>> = new Map()
  private reverseAdjacencyList: Map<string, Set<string>> = new Map()

  /**
   * Initialize engine with card data
   */
  constructor(cards?: CardData[]) {
    if (cards) {
      this.setCards(cards)
    }
  }

  /**
   * Update cards in the engine
   */
  setCards(cards: CardData[]): void {
    this.cards.clear()
    this.adjacencyList.clear()
    this.reverseAdjacencyList.clear()

    cards.forEach(card => {
      this.cards.set(card.id, card)
      this.adjacencyList.set(card.id, new Set())
      this.reverseAdjacencyList.set(card.id, new Set())
    })

    // Build adjacency lists
    cards.forEach(card => {
      if (card.dependencies) {
        card.dependencies.forEach(dep => {
          // Forward: dep.taskId -> card.id
          this.adjacencyList.get(dep.taskId)?.add(card.id)
          // Reverse: card.id -> dep.taskId
          this.reverseAdjacencyList.get(card.id)?.add(dep.taskId)
        })
      }
    })
  }

  /**
   * Validate dependencies
   * Checks for:
   * - Circular dependencies (cycles)
   * - Invalid task IDs
   * - Self-dependencies
   */
  validateDependencies(): DependencyValidation {
    const errors: string[] = []
    const circularDependencies: string[][] = []
    const invalidTaskIds: string[] = []

    // Check for invalid task IDs
    this.cards.forEach((card, cardId) => {
      if (card.dependencies) {
        card.dependencies.forEach(dep => {
          if (!this.cards.has(dep.taskId)) {
            invalidTaskIds.push(dep.taskId)
            errors.push(`Card ${cardId} depends on non-existent task ${dep.taskId}`)
          }
          if (dep.taskId === cardId) {
            errors.push(`Card ${cardId} has self-dependency`)
          }
        })
      }
    })

    // Detect cycles using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const detectCycle = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const neighbors = this.adjacencyList.get(nodeId) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor)
          const cycle = path.slice(cycleStart)
          circularDependencies.push([...cycle, neighbor])
          errors.push(`Circular dependency detected: ${cycle.join(' -> ')} -> ${neighbor}`)
          return true
        }
      }

      recursionStack.delete(nodeId)
      path.pop()
      return false
    }

    for (const cardId of this.cards.keys()) {
      if (!visited.has(cardId)) {
        detectCycle(cardId)
      }
    }

    return {
      isValid: errors.length === 0,
      circularDependencies,
      invalidTaskIds: Array.from(new Set(invalidTaskIds)),
      errors,
    }
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns tasks in dependency order (tasks with no dependencies first)
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>()
    const queue: string[] = []
    const result: string[] = []

    // Initialize in-degrees
    this.cards.forEach((_, cardId) => {
      const deps = this.reverseAdjacencyList.get(cardId) || new Set()
      inDegree.set(cardId, deps.size)
      if (deps.size === 0) {
        queue.push(cardId)
      }
    })

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      const dependents = this.adjacencyList.get(current) || new Set()
      dependents.forEach(dependent => {
        const degree = inDegree.get(dependent)!
        inDegree.set(dependent, degree - 1)
        if (degree - 1 === 0) {
          queue.push(dependent)
        }
      })
    }

    return result
  }

  /**
   * Calculate scheduled tasks using Critical Path Method (CPM)
   * Performs forward and backward pass to calculate early/late dates and floats
   */
  calculateSchedule(options?: AutoScheduleOptions): Map<string, ScheduledTask> {
    const validation = this.validateDependencies()
    if (!validation.isValid) {
      throw new Error(`Invalid dependencies: ${validation.errors.join(', ')}`)
    }

    const scheduled = new Map<string, ScheduledTask>()
    const sorted = this.topologicalSort()

    const projectStartDate = options?.projectStartDate || new Date()
    const workingHoursPerDay = options?.workingHoursPerDay || 8

    // Forward pass: calculate early start and early finish
    sorted.forEach(cardId => {
      const card = this.cards.get(cardId)!
      const predecessors = Array.from(this.reverseAdjacencyList.get(cardId) || new Set<string>())

      let earlyStart = new Date(projectStartDate)

      // Find latest early finish of all predecessors
      if (predecessors.length > 0) {
        const latestPredecessorFinish = Math.max(
          ...predecessors.map(predId => {
            const pred = scheduled.get(predId)
            if (!pred) return projectStartDate.getTime()

            const dep = card.dependencies?.find(d => d.taskId === predId)
            const lag = (dep?.lag || 0) * 24 * 60 * 60 * 1000 // Convert days to ms

            return pred.earlyFinish.getTime() + lag
          })
        )
        earlyStart = new Date(latestPredecessorFinish)
      }

      // Calculate duration
      const duration = this.getTaskDuration(card, workingHoursPerDay)
      const earlyFinish = new Date(earlyStart.getTime() + duration * 24 * 60 * 60 * 1000)

      scheduled.set(cardId, {
        cardId,
        earlyStart,
        earlyFinish,
        lateStart: earlyStart, // Will be updated in backward pass
        lateFinish: earlyFinish, // Will be updated in backward pass
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
        predecessors,
        successors: Array.from(this.adjacencyList.get(cardId) || new Set<string>()),
      })
    })

    // Find project end date (latest early finish)
    const projectEndDate = new Date(
      Math.max(...Array.from(scheduled.values()).map(s => s.earlyFinish.getTime()))
    )

    // Backward pass: calculate late start and late finish
    const reversedSorted = [...sorted].reverse()
    reversedSorted.forEach(cardId => {
      const task = scheduled.get(cardId)!
      const successors = this.adjacencyList.get(cardId) || new Set()

      let lateFinish = new Date(projectEndDate)

      // Find earliest late start of all successors
      if (successors.size > 0) {
        const earliestSuccessorStart = Math.min(
          ...Array.from(successors).map(succId => {
            const succ = scheduled.get(succId)
            if (!succ) return projectEndDate.getTime()

            const succCard = this.cards.get(succId)!
            const dep = succCard.dependencies?.find(d => d.taskId === cardId)
            const lag = (dep?.lag || 0) * 24 * 60 * 60 * 1000

            return succ.lateStart.getTime() - lag
          })
        )
        lateFinish = new Date(earliestSuccessorStart)
      }

      const duration = task.earlyFinish.getTime() - task.earlyStart.getTime()
      const lateStart = new Date(lateFinish.getTime() - duration)

      // Calculate floats
      const totalFloat = (lateStart.getTime() - task.earlyStart.getTime()) / (24 * 60 * 60 * 1000)

      // Free float: time between this task's early finish and earliest successor's early start
      let freeFloat = 0
      if (successors.size > 0) {
        const earliestSuccStart = Math.min(
          ...Array.from(successors).map(succId => scheduled.get(succId)!.earlyStart.getTime())
        )
        freeFloat = (earliestSuccStart - task.earlyFinish.getTime()) / (24 * 60 * 60 * 1000)
      }

      scheduled.set(cardId, {
        ...task,
        lateStart,
        lateFinish,
        totalFloat: Math.max(0, Math.round(totalFloat * 10) / 10),
        freeFloat: Math.max(0, Math.round(freeFloat * 10) / 10),
        isCritical: totalFloat <= 0.1, // Critical if float is near zero
      })
    })

    return scheduled
  }

  /**
   * Find critical path through the project
   */
  findCriticalPath(): CriticalPath {
    const scheduled = this.calculateSchedule()
    const criticalTasks = Array.from(scheduled.values())
      .filter(task => task.isCritical)
      .sort((a, b) => a.earlyStart.getTime() - b.earlyStart.getTime())

    const cardIds = criticalTasks.map(task => task.cardId)
    const duration = criticalTasks.reduce((sum, task) => {
      const durationMs = task.earlyFinish.getTime() - task.earlyStart.getTime()
      return sum + durationMs / (24 * 60 * 60 * 1000)
    }, 0)

    const hasDelays = criticalTasks.some(task => {
      const card = this.cards.get(task.cardId)
      return card?.endDate && new Date(card.endDate) < task.earlyFinish
    })

    return {
      cardIds,
      duration: Math.round(duration * 10) / 10,
      hasDelays,
      totalSlack: 0, // Critical path has zero slack
    }
  }

  /**
   * Get task duration in days
   */
  private getTaskDuration(card: CardData, workingHoursPerDay: number): number {
    // If card has start and end dates, use those
    if (card.startDate && card.endDate) {
      const start = new Date(card.startDate)
      const end = new Date(card.endDate)
      const diffMs = end.getTime() - start.getTime()
      return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
    }

    // If card has estimated time, convert to days
    if (card.estimatedTime) {
      return Math.ceil(card.estimatedTime / workingHoursPerDay)
    }

    // Default to 1 day
    return 1
  }

  /**
   * Check if a task can start given its dependencies
   */
  canTaskStart(cardId: string, currentDate: Date = new Date()): boolean {
    const card = this.cards.get(cardId)
    if (!card || !card.dependencies || card.dependencies.length === 0) {
      return true
    }

    // Check all dependencies
    return card.dependencies.every(dep => {
      const depCard = this.cards.get(dep.taskId)
      if (!depCard) return false

      // Check based on dependency type
      switch (dep.type) {
        case 'finish-to-start':
          // Predecessor must be finished
          return depCard.progress === 100 || (depCard.endDate && new Date(depCard.endDate) <= currentDate)

        case 'start-to-start':
          // Predecessor must be started
          return depCard.progress !== undefined && depCard.progress > 0

        case 'finish-to-finish':
        case 'start-to-finish':
          // These don't block start
          return true

        default:
          return false
      }
    })
  }

  /**
   * Get all predecessors of a task (tasks it depends on)
   */
  getPredecessors(cardId: string): string[] {
    return Array.from(this.reverseAdjacencyList.get(cardId) || new Set<string>())
  }

  /**
   * Get all successors of a task (tasks that depend on it)
   */
  getSuccessors(cardId: string): string[] {
    return Array.from(this.adjacencyList.get(cardId) || new Set<string>())
  }

  /**
   * Add a dependency between two tasks
   * @param fromCardId - Task that others depend on
   * @param toCardId - Task that depends on fromCard
   */
  addDependency(fromCardId: string, toCardId: string): boolean {
    if (!this.cards.has(fromCardId) || !this.cards.has(toCardId)) {
      return false
    }

    // Check if this would create a cycle
    const tempAdjList = new Map(this.adjacencyList)
    const tempSet = new Set(tempAdjList.get(fromCardId) || [])
    tempSet.add(toCardId)
    tempAdjList.set(fromCardId, tempSet)

    // Simple cycle check: can we reach fromCardId from toCardId?
    if (this.hasPath(toCardId, fromCardId, tempAdjList)) {
      return false // Would create a cycle
    }

    // Add the dependency
    this.adjacencyList.get(fromCardId)?.add(toCardId)
    this.reverseAdjacencyList.get(toCardId)?.add(fromCardId)

    return true
  }

  /**
   * Remove a dependency between two tasks
   */
  removeDependency(fromCardId: string, toCardId: string): boolean {
    const removed1 = this.adjacencyList.get(fromCardId)?.delete(toCardId) || false
    const removed2 = this.reverseAdjacencyList.get(toCardId)?.delete(fromCardId) || false
    return removed1 && removed2
  }

  /**
   * Check if there's a path from source to target
   */
  private hasPath(source: string, target: string, adjacencyList: Map<string, Set<string>>): boolean {
    if (source === target) return true

    const visited = new Set<string>()
    const queue = [source]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === target) return true

      visited.add(current)
      const neighbors = adjacencyList.get(current) || new Set<string>()

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor)
        }
      }
    }

    return false
  }
}
