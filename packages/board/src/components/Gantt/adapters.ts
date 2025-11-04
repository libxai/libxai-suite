/**
 * Type adapters for converting between ASAKAA Card types and Gantt Task types
 * @module Gantt/adapters
 */

import type { Card } from '../../types'
import type { Task, Assignee } from './types'

/**
 * Maps ASAKAA CardStatus to Gantt task status
 */
function mapCardStatusToTaskStatus(
  status?: string
): 'todo' | 'in-progress' | 'completed' | undefined {
  if (!status) return undefined

  switch (status.toUpperCase()) {
    case 'TODO':
    case 'BLOCKED':
      return 'todo'
    case 'IN_PROGRESS':
    case 'REVIEW':
      return 'in-progress'
    case 'DONE':
      return 'completed'
    default:
      return 'todo'
  }
}

/**
 * Maps Gantt task status to ASAKAA CardStatus
 */
function mapTaskStatusToCardStatus(
  status?: 'todo' | 'in-progress' | 'completed'
): 'TODO' | 'IN_PROGRESS' | 'DONE' {
  switch (status) {
    case 'todo':
      return 'TODO'
    case 'in-progress':
      return 'IN_PROGRESS'
    case 'completed':
      return 'DONE'
    default:
      return 'TODO'
  }
}

/**
 * Converts an ASAKAA Card to a Gantt Task
 *
 * @param card - ASAKAA Card object
 * @param allCards - All cards in the board (for resolving subtasks)
 * @param users - Available users for assignee mapping
 * @returns Gantt Task object
 */
export function cardToGanttTask(
  card: Card,
  allCards: Card[] = [],
  users: Array<{ id: string; name: string; initials: string; color: string }> = []
): Task {
  // Map assignees
  const assignees: Assignee[] | undefined = card.assignedUserIds
    ?.map((userId) => {
      const user = users.find((u) => u.id === userId)
      if (!user) return null
      return {
        name: user.name,
        initials: user.initials,
        color: user.color,
      }
    })
    .filter((a): a is Assignee => a !== null)

  // Find subtasks (cards that reference this card as parent)
  const subtasks: Task[] | undefined = allCards
    .filter((c) => c.metadata?.parentCardId === card.id)
    .map((c) => cardToGanttTask(c, allCards, users))

  // Extract dependency IDs
  let dependencies: string[] | undefined
  if (card.dependencies) {
    if (typeof card.dependencies[0] === 'string') {
      // Legacy format: string[]
      dependencies = card.dependencies as string[]
    } else {
      // New format: Dependency[] - only use finish-to-start
      dependencies = (card.dependencies as any[])
        .filter((dep) => dep.type === 'finish-to-start')
        .map((dep) => dep.taskId)
    }
  }

  // Parse dates (handle both Date and string) - allow undefined for tasks without dates
  const parseDate = (date: Date | string | undefined): Date | undefined => {
    if (!date) return undefined
    return typeof date === 'string' ? new Date(date) : date
  }

  const startDate = parseDate(card.startDate)
  const endDate = parseDate(card.endDate)

  // Determine if this is a milestone (0 or 1 day duration, or explicitly marked)
  const isMilestone = card.metadata?.isMilestone === true ||
    (startDate && endDate && Math.abs(endDate.getTime() - startDate.getTime()) <= 86400000)

  return {
    id: card.id,
    name: card.title,
    startDate,
    endDate,
    progress: card.progress || 0,
    status: mapCardStatusToTaskStatus(card.metadata?.status as string),
    assignees: assignees?.length ? assignees : undefined,
    dependencies: dependencies?.length ? dependencies : undefined,
    subtasks: subtasks?.length ? subtasks : undefined,
    isExpanded: card.metadata?.isExpanded === true,
    isMilestone,
    isCriticalPath: card.metadata?.isCriticalPath === true,
  }
}

/**
 * Converts a Gantt Task back to an ASAKAA Card (partial update)
 * Note: This only returns the fields that Gantt can modify
 *
 * @param task - Gantt Task object
 * @param users - Available users for reverse mapping assignees to userIds
 * @returns Partial Card update object
 */
export function ganttTaskToCardUpdate(
  task: Task,
  users: Array<{ id: string; name: string; initials: string; color: string }> = []
): Partial<Card> {
  // Convert assignees back to userIds
  let assignedUserIds: string[] | undefined
  if (task.assignees && task.assignees.length > 0) {
    assignedUserIds = task.assignees
      .map((assignee) => {
        // Find user by name or initials
        const user = users.find(
          (u) => u.name === assignee.name || u.initials === assignee.initials
        )
        return user?.id
      })
      .filter((id): id is string => id !== undefined)
  }

  return {
    id: task.id,
    title: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
    progress: task.progress,
    assignedUserIds: assignedUserIds?.length ? assignedUserIds : undefined,
    metadata: {
      status: mapTaskStatusToCardStatus(task.status),
      isExpanded: task.isExpanded,
      isMilestone: task.isMilestone,
      isCriticalPath: task.isCriticalPath,
    },
  }
}

/**
 * Converts an array of Cards to an array of Gantt Tasks
 *
 * @param cards - Array of ASAKAA Card objects
 * @param users - Available users for assignee mapping
 * @returns Array of Gantt Task objects
 */
export function cardsToGanttTasks(
  cards: Card[],
  users: Array<{ id: string; name: string; initials: string; color: string }> = []
): Task[] {
  // Filter out cards that are subtasks (have parentCardId)
  const topLevelCards = cards.filter((c) => !c.metadata?.parentCardId)

  return topLevelCards.map((card) => cardToGanttTask(card, cards, users))
}
