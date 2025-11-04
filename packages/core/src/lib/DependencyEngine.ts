/**
 * Dependency Engine - Manage task dependencies for Gantt scheduling
 * @module lib/DependencyEngine
 */

import type { Card } from '../models/Card'
// Dependency type is used indirectly through Card model, not directly in this file
// import type { Dependency } from '../types'

/**
 * Result of dependency resolution
 */
export interface DependencyResolutionResult {
  /** Tasks in topological order (dependencies first) */
  orderedTasks: Card[]
  /** Critical path task IDs */
  criticalPath: string[]
  /** Tasks that have circular dependencies */
  circularDependencies: string[][]
  /** Earliest start dates for each task */
  earliestStarts: Map<string, Date>
}

/**
 * Dependency validation error
 */
export class DependencyError extends Error {
  constructor(
    message: string,
    public readonly type: 'circular' | 'missing' | 'invalid',
    public readonly taskIds: string[]
  ) {
    super(message)
    this.name = 'DependencyError'
  }
}

/**
 * DependencyEngine - Core engine for managing task dependencies
 *
 * Features:
 * - Topological sorting of tasks
 * - Circular dependency detection
 * - Critical path calculation
 * - Earliest start date calculation
 * - Support for all dependency types (FS, SS, FF, SF)
 *
 * @example
 * ```typescript
 * const engine = new DependencyEngine()
 * const result = engine.resolveDependencies(tasks)
 *
 * if (result.circularDependencies.length > 0) {
 *   console.error('Circular dependencies detected!')
 * }
 *
 * console.log('Critical path:', result.criticalPath)
 * ```
 */
export class DependencyEngine {
  /**
   * Resolve all dependencies and calculate scheduling information
   *
   * @param tasks - Array of tasks to analyze
   * @returns Dependency resolution result
   */
  resolveDependencies(tasks: Card[]): DependencyResolutionResult {
    // Build dependency graph
    const graph = this.buildDependencyGraph(tasks)

    // Detect circular dependencies
    const circularDependencies = this.detectCycles(graph, tasks)

    // Topological sort
    const orderedTasks = this.topologicalSort(tasks, graph)

    // Calculate earliest start dates
    const earliestStarts = this.calculateEarliestStarts(orderedTasks, tasks)

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(orderedTasks, earliestStarts)

    return {
      orderedTasks,
      criticalPath,
      circularDependencies,
      earliestStarts,
    }
  }

  /**
   * Build dependency graph (adjacency list)
   *
   * @param tasks - Array of tasks
   * @returns Map of task ID to dependent task IDs
   */
  private buildDependencyGraph(tasks: Card[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()

    // Initialize graph with all task IDs
    tasks.forEach((task) => {
      if (!graph.has(task.id)) {
        graph.set(task.id, new Set())
      }
    })

    // Add edges (dependencies)
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          if (!graph.has(dep.taskId)) {
            graph.set(dep.taskId, new Set())
          }
          // Edge from dependency to task (dependency -> task)
          graph.get(dep.taskId)!.add(task.id)
        })
      }
    })

    return graph
  }

  /**
   * Detect circular dependencies using DFS
   *
   * @param graph - Dependency graph
   * @param tasks - Array of tasks
   * @returns Array of circular dependency chains
   */
  private detectCycles(graph: Map<string, Set<string>>, tasks: Card[]): string[][] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const neighbors = graph.get(nodeId) || new Set()

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path])
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = path.indexOf(neighbor)
          const cycle = path.slice(cycleStart)
          cycles.push([...cycle, neighbor])
        }
      }

      recursionStack.delete(nodeId)
    }

    tasks.forEach((task) => {
      if (!visited.has(task.id)) {
        dfs(task.id, [])
      }
    })

    return cycles
  }

  /**
   * Topological sort using Kahn's algorithm
   *
   * @param tasks - Array of tasks
   * @param graph - Dependency graph
   * @returns Tasks in dependency order
   */
  private topologicalSort(tasks: Card[], graph: Map<string, Set<string>>): Card[] {
    const taskMap = new Map(tasks.map((task) => [task.id, task]))
    const inDegree = new Map<string, number>()

    // Initialize in-degree for all tasks
    tasks.forEach((task) => {
      inDegree.set(task.id, 0)
    })

    // Calculate in-degree
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach(() => {
          const current = inDegree.get(task.id) || 0
          inDegree.set(task.id, current + 1)
        })
      }
    })

    // Queue of tasks with no dependencies
    const queue: string[] = []
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId)
      }
    })

    const sorted: Card[] = []

    while (queue.length > 0) {
      const taskId = queue.shift()!
      const task = taskMap.get(taskId)

      if (task) {
        sorted.push(task)
      }

      // Reduce in-degree for dependent tasks
      const dependents = graph.get(taskId) || new Set()
      dependents.forEach((depId) => {
        const degree = inDegree.get(depId) || 0
        inDegree.set(depId, degree - 1)

        if (degree - 1 === 0) {
          queue.push(depId)
        }
      })
    }

    // If sorted length doesn't match tasks length, there's a cycle
    if (sorted.length !== tasks.length) {
      // Return original order if cycle detected
      return tasks
    }

    return sorted
  }

  /**
   * Calculate earliest start date for each task based on dependencies
   *
   * @param orderedTasks - Tasks in topological order
   * @param allTasks - All tasks (for lookup)
   * @returns Map of task ID to earliest start date
   */
  private calculateEarliestStarts(orderedTasks: Card[], allTasks: Card[]): Map<string, Date> {
    const earliestStarts = new Map<string, Date>()
    const taskMap = new Map(allTasks.map((task) => [task.id, task]))

    orderedTasks.forEach((task) => {
      let earliestStart = task.startDate ? new Date(task.startDate) : new Date()

      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach((dep) => {
          const depTask = taskMap.get(dep.taskId)
          if (!depTask) return

          const depEarliestStart = earliestStarts.get(dep.taskId) || new Date()
          const depDuration = depTask.getDuration() || 0
          const lag = dep.lag || 0

          let calculatedStart: Date

          if (dep.type === 'finish-to-start') {
            // Task can't start until dependency finishes
            calculatedStart = new Date(depEarliestStart)
            calculatedStart.setDate(calculatedStart.getDate() + depDuration + lag)
          } else if (dep.type === 'start-to-start') {
            // Task can't start until dependency starts
            calculatedStart = new Date(depEarliestStart)
            calculatedStart.setDate(calculatedStart.getDate() + lag)
          } else if (dep.type === 'finish-to-finish') {
            // Task can't finish until dependency finishes
            // Work backwards from dependency finish to calculate start
            const taskDuration = task.getDuration() || 0
            calculatedStart = new Date(depEarliestStart)
            calculatedStart.setDate(calculatedStart.getDate() + depDuration + lag - taskDuration)
          } else if (dep.type === 'start-to-finish') {
            // Task can't finish until dependency starts (rare)
            // Work backwards from dependency start to calculate task start
            const duration = task.getDuration() || 0
            calculatedStart = new Date(depEarliestStart)
            calculatedStart.setDate(calculatedStart.getDate() + lag - duration)
          } else {
            calculatedStart = depEarliestStart
          }

          // Use the latest calculated start date
          if (calculatedStart > earliestStart) {
            earliestStart = calculatedStart
          }
        })
      }

      earliestStarts.set(task.id, earliestStart)
    })

    return earliestStarts
  }

  /**
   * Calculate critical path (longest path through the project)
   *
   * @param orderedTasks - Tasks in topological order
   * @param earliestStarts - Earliest start dates
   * @returns Array of task IDs on critical path
   */
  private calculateCriticalPath(orderedTasks: Card[], earliestStarts: Map<string, Date>): string[] {
    if (orderedTasks.length === 0) return []

    // Calculate latest start dates (working backwards)
    const latestStarts = new Map<string, Date>()

    // Find project end date (latest finish)
    let projectEnd = new Date(0)
    orderedTasks.forEach((task) => {
      const start = earliestStarts.get(task.id) || new Date()
      const duration = task.getDuration() || 0
      const finish = new Date(start)
      finish.setDate(finish.getDate() + duration)

      if (finish > projectEnd) {
        projectEnd = finish
      }
    })

    // Calculate latest starts (backwards pass)
    for (let i = orderedTasks.length - 1; i >= 0; i--) {
      const currentTask = orderedTasks[i]
      const duration = currentTask.getDuration() || 0

      // Start with latest finish = project end
      let latestFinish = new Date(projectEnd)

      // Find minimum latest start of all successors
      orderedTasks.forEach((otherTask) => {
        if (otherTask.dependsOn(currentTask.id)) {
          const otherLatestStart = latestStarts.get(otherTask.id)
          if (otherLatestStart && otherLatestStart < latestFinish) {
            latestFinish = otherLatestStart
          }
        }
      })

      const latestStart = new Date(latestFinish)
      latestStart.setDate(latestStart.getDate() - duration)
      latestStarts.set(currentTask.id, latestStart)
    }

    // Critical path = tasks where earliest start = latest start (zero slack)
    const criticalPath: string[] = []
    orderedTasks.forEach((task) => {
      const earliest = earliestStarts.get(task.id)
      const latest = latestStarts.get(task.id)

      if (earliest && latest) {
        const slack = latest.getTime() - earliest.getTime()
        if (slack === 0) {
          criticalPath.push(task.id)
        }
      }
    })

    return criticalPath
  }

  /**
   * Validate dependencies for a set of tasks
   *
   * @param tasks - Tasks to validate
   * @throws DependencyError if validation fails
   */
  validateDependencies(tasks: Card[]): void {
    const taskIds = new Set(tasks.map((task) => task.id))

    // Check for missing task references
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          if (!taskIds.has(dep.taskId)) {
            throw new DependencyError(
              `Task ${task.id} depends on non-existent task ${dep.taskId}`,
              'missing',
              [task.id, dep.taskId]
            )
          }
        })
      }
    })

    // Check for circular dependencies
    const graph = this.buildDependencyGraph(tasks)
    const cycles = this.detectCycles(graph, tasks)

    if (cycles.length > 0) {
      throw new DependencyError(
        `Circular dependencies detected: ${cycles.map((c) => c.join(' -> ')).join(', ')}`,
        'circular',
        cycles.flat()
      )
    }
  }

  /**
   * Check if adding a dependency would create a cycle
   *
   * @param tasks - Current tasks
   * @param fromTaskId - Task that will depend on toTaskId
   * @param toTaskId - Task that fromTaskId will depend on
   * @returns true if adding dependency would create a cycle
   */
  wouldCreateCycle(tasks: Card[], fromTaskId: string, toTaskId: string): boolean {
    // Create temporary task with the new dependency
    const fromTask = tasks.find((t) => t.id === fromTaskId)

    if (!fromTask) return false

    const tempTask = fromTask.addDependency({
      taskId: toTaskId,
      type: 'finish-to-start',
    })

    const tempTasks = tasks.map((task) => (task.id === fromTaskId ? tempTask : task))

    const graph = this.buildDependencyGraph(tempTasks)
    const cycles = this.detectCycles(graph, tempTasks)

    return cycles.length > 0
  }

  /**
   * Get all tasks that depend on a given task (successors)
   *
   * @param tasks - All tasks
   * @param taskId - Task ID to find successors for
   * @returns Array of successor tasks
   */
  getSuccessors(tasks: Card[], taskId: string): Card[] {
    return tasks.filter((task) => task.dependsOn(taskId))
  }

  /**
   * Get all tasks that a given task depends on (predecessors)
   *
   * @param tasks - All tasks
   * @param taskId - Task ID to find predecessors for
   * @returns Array of predecessor tasks
   */
  getPredecessors(tasks: Card[], taskId: string): Card[] {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !task.dependencies) return []

    const predecessorIds = task.getDependentTaskIds()
    return tasks.filter((t) => predecessorIds.includes(t.id))
  }

  /**
   * Calculate total slack (float) for a task
   *
   * @param _task - Task to calculate slack for (unused, kept for API consistency)
   * @param earliestStart - Earliest possible start date
   * @param latestStart - Latest allowable start date
   * @returns Slack in days
   */
  calculateSlack(_task: Card, earliestStart: Date, latestStart: Date): number {
    const diffMs = latestStart.getTime() - earliestStart.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }
}
