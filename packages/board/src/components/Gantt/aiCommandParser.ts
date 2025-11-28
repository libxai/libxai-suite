/**
 * AI Command Parser for Gantt Chart
 * Parses natural language commands and converts them to task operations
 *
 * This module provides utilities for parsing AI responses and generating
 * prompts for natural language task editing.
 *
 * @version 0.14.0
 */

import { Task, AICommandResult } from './types';

/**
 * System prompt for the AI model to understand Gantt task commands
 */
export const GANTT_AI_SYSTEM_PROMPT = `You are a Gantt chart AI assistant. You help users edit project tasks using natural language commands.

AVAILABLE COMMANDS:
1. move_task - Move a task to a different date
2. resize_task - Change task duration (extend/shorten)
3. rename_task - Rename a task
4. delete_task - Delete a task
5. create_task - Create a new task
6. link_tasks - Create dependency between tasks
7. unlink_tasks - Remove dependency
8. assign_task - Assign users to task
9. set_progress - Update task progress (0-100%)
10. set_status - Change task status (todo, in-progress, completed)

RESPONSE FORMAT (JSON):
{
  "type": "command_type",
  "taskId": "id of the task to modify (if found)",
  "taskName": "name of the task mentioned",
  "updates": { /* partial task updates */ },
  "newTask": { /* for create_task only */ },
  "dependencyFrom": "source task id (for link/unlink)",
  "dependencyTo": "target task id (for link/unlink)",
  "message": "Human-readable response explaining what was done",
  "success": true/false,
  "error": "error message if failed"
}

EXAMPLES:
- "Move Design to next Monday" -> move_task with startDate update
- "Extend Testing by 3 days" -> resize_task with endDate update
- "Rename 'Old Task' to 'New Task'" -> rename_task with name update
- "Set Development progress to 50%" -> set_progress with progress: 50
- "Link Design to Development" -> link_tasks
- "Create a new task called 'Review'" -> create_task

TASK DATA FORMAT:
Tasks have: id, name, startDate, endDate, progress, status, dependencies[], assignees[]

Always try to match task names case-insensitively and handle partial matches.
If you can't find a task by name, search through the provided task list.
If ambiguous, ask for clarification in the message field.`;

/**
 * Generate the user prompt with current tasks context
 */
export function generateTasksContext(tasks: Task[]): string {
  const flatTasks = flattenTasks(tasks);
  const taskList = flatTasks
    .map((t) => {
      const start = t.startDate ? t.startDate.toISOString().split('T')[0] : 'no date';
      const end = t.endDate ? t.endDate.toISOString().split('T')[0] : 'no date';
      const deps = t.dependencies?.length ? `deps: [${t.dependencies.join(', ')}]` : '';
      return `- ${t.id}: "${t.name}" (${start} to ${end}, ${t.progress}%, ${t.status || 'todo'}) ${deps}`;
    })
    .join('\n');

  return `CURRENT TASKS:\n${taskList}\n\nToday's date: ${new Date().toISOString().split('T')[0]}`;
}

/**
 * Flatten nested tasks into a single array
 */
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const flatten = (taskList: Task[]) => {
    for (const task of taskList) {
      result.push(task);
      if (task.subtasks?.length) {
        flatten(task.subtasks);
      }
    }
  };
  flatten(tasks);
  return result;
}

/**
 * Find a task by name (case-insensitive, partial match)
 */
export function findTaskByName(tasks: Task[], name: string): Task | undefined {
  const flatTasks = flattenTasks(tasks);
  const normalizedName = name.toLowerCase().trim();

  // Exact match first
  const exact = flatTasks.find((t) => t.name.toLowerCase() === normalizedName);
  if (exact) return exact;

  // Partial match
  const partial = flatTasks.find((t) => t.name.toLowerCase().includes(normalizedName));
  if (partial) return partial;

  // Fuzzy match (contains all words)
  const words = normalizedName.split(/\s+/);
  return flatTasks.find((t) => {
    const taskName = t.name.toLowerCase();
    return words.every((word) => taskName.includes(word));
  });
}

/**
 * Parse date from natural language
 */
export function parseNaturalDate(text: string, referenceDate = new Date()): Date | null {
  const normalized = text.toLowerCase().trim();
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Today
  if (normalized === 'today' || normalized === 'hoy') {
    return today;
  }

  // Tomorrow
  if (normalized === 'tomorrow' || normalized === 'mañana') {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }

  // Yesterday
  if (normalized === 'yesterday' || normalized === 'ayer') {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return date;
  }

  // Next week
  if (normalized === 'next week' || normalized === 'la próxima semana') {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return date;
  }

  // Day of week (next Monday, next Tuesday, etc.)
  const dayMatch = normalized.match(/(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i);
  if (dayMatch) {
    const dayNames: Record<string, number> = {
      sunday: 0, domingo: 0,
      monday: 1, lunes: 1,
      tuesday: 2, martes: 2,
      wednesday: 3, miércoles: 3, miercoles: 3,
      thursday: 4, jueves: 4,
      friday: 5, viernes: 5,
      saturday: 6, sábado: 6, sabado: 6,
    };
    const targetDay = dayNames[dayMatch[1]!.toLowerCase()];
    if (targetDay !== undefined) {
      const date = new Date(today);
      const currentDay = date.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7; // Always next occurrence
      date.setDate(date.getDate() + daysToAdd);
      return date;
    }
  }

  // In X days/weeks/months
  const inMatch = normalized.match(/in\s+(\d+)\s+(day|week|month|día|dias|semana|semanas|mes|meses)s?/i);
  if (inMatch && inMatch[1] && inMatch[2]) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();
    const date = new Date(today);

    if (unit === 'day' || unit === 'día' || unit === 'dias') {
      date.setDate(date.getDate() + amount);
    } else if (unit === 'week' || unit === 'semana' || unit === 'semanas') {
      date.setDate(date.getDate() + amount * 7);
    } else if (unit === 'month' || unit === 'mes' || unit === 'meses') {
      date.setMonth(date.getMonth() + amount);
    }
    return date;
  }

  // ISO date (YYYY-MM-DD)
  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(normalized);
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const dateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
    // Assume DD/MM/YYYY for non-US locales
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = parseInt(dateMatch[3], 10);
    return new Date(year, month, day);
  }

  return null;
}

/**
 * Parse duration from natural language
 */
export function parseNaturalDuration(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  // X days/weeks/months
  const match = normalized.match(/(\d+)\s*(day|week|month|día|dias|semana|semanas|mes|meses)s?/i);
  if (match && match[1] && match[2]) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit === 'day' || unit === 'día' || unit === 'dias') {
      return amount;
    } else if (unit === 'week' || unit === 'semana' || unit === 'semanas') {
      return amount * 7;
    } else if (unit === 'month' || unit === 'mes' || unit === 'meses') {
      return amount * 30;
    }
  }

  return null;
}

/**
 * Parse progress percentage from natural language
 */
export function parseProgress(text: string): number | null {
  const match = text.match(/(\d+)(?:\s*%)?/);
  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    return Math.max(0, Math.min(100, value));
  }
  return null;
}

/**
 * Parse task status from natural language
 */
export function parseStatus(text: string): 'todo' | 'in-progress' | 'completed' | null {
  const normalized = text.toLowerCase().trim();

  if (normalized.includes('todo') || normalized.includes('pendiente') || normalized.includes('por hacer')) {
    return 'todo';
  }
  if (normalized.includes('in progress') || normalized.includes('in-progress') || normalized.includes('en progreso') || normalized.includes('working') || normalized.includes('trabajando')) {
    return 'in-progress';
  }
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('finished') || normalized.includes('completado') || normalized.includes('terminado') || normalized.includes('hecho')) {
    return 'completed';
  }

  return null;
}

/**
 * Local command parser (for offline/simple commands without AI)
 * This can handle basic commands without needing an AI API call
 */
export function parseLocalCommand(command: string, tasks: Task[]): AICommandResult | null {
  const normalized = command.toLowerCase().trim();

  // Move task pattern: "move X to Y"
  const moveMatch = normalized.match(/(?:move|mover|mueve)\s+["""]?(.+?)["""]?\s+(?:to|a|para)\s+(.+)/i);
  if (moveMatch && moveMatch[1] && moveMatch[2]) {
    const taskName = moveMatch[1].trim();
    const dateText = moveMatch[2].trim();
    const task = findTaskByName(tasks, taskName);
    const newDate = parseNaturalDate(dateText);

    if (!task) {
      return {
        type: 'move_task',
        taskName,
        message: `Could not find a task named "${taskName}". Please check the task name and try again.`,
        success: false,
        error: 'Task not found',
      };
    }

    if (!newDate) {
      return {
        type: 'move_task',
        taskId: task.id,
        taskName: task.name,
        message: `Could not parse the date "${dateText}". Try using formats like "next Monday", "in 3 days", or "2024-01-15".`,
        success: false,
        error: 'Invalid date',
      };
    }

    // Calculate new end date maintaining duration
    const duration = task.startDate && task.endDate
      ? Math.round((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    const newEndDate = new Date(newDate);
    newEndDate.setDate(newEndDate.getDate() + duration);

    return {
      type: 'move_task',
      taskId: task.id,
      taskName: task.name,
      updates: {
        startDate: newDate,
        endDate: newEndDate,
      },
      message: `Moved "${task.name}" to ${newDate.toLocaleDateString()}.`,
      success: true,
    };
  }

  // Extend task pattern: "extend X by Y days"
  const extendMatch = normalized.match(/(?:extend|extender|extiende|alargar)\s+["""]?(.+?)["""]?\s+(?:by|por)\s+(.+)/i);
  if (extendMatch && extendMatch[1] && extendMatch[2]) {
    const taskName = extendMatch[1].trim();
    const durationText = extendMatch[2].trim();
    const task = findTaskByName(tasks, taskName);
    const days = parseNaturalDuration(durationText);

    if (!task) {
      return {
        type: 'resize_task',
        taskName,
        message: `Could not find a task named "${taskName}".`,
        success: false,
        error: 'Task not found',
      };
    }

    if (!days || !task.endDate) {
      return {
        type: 'resize_task',
        taskId: task.id,
        taskName: task.name,
        message: `Could not parse the duration "${durationText}".`,
        success: false,
        error: 'Invalid duration',
      };
    }

    const newEndDate = new Date(task.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    return {
      type: 'resize_task',
      taskId: task.id,
      taskName: task.name,
      updates: { endDate: newEndDate },
      message: `Extended "${task.name}" by ${days} days. New end date: ${newEndDate.toLocaleDateString()}.`,
      success: true,
    };
  }

  // Set progress pattern: "set X progress to Y%"
  const progressMatch = normalized.match(/(?:set|establecer|poner)\s+["""]?(.+?)["""]?\s+(?:progress|progreso)\s+(?:to|a|en)\s+(.+)/i);
  if (progressMatch && progressMatch[1] && progressMatch[2]) {
    const taskName = progressMatch[1].trim();
    const progressText = progressMatch[2].trim();
    const task = findTaskByName(tasks, taskName);
    const progress = parseProgress(progressText);

    if (!task) {
      return {
        type: 'set_progress',
        taskName,
        message: `Could not find a task named "${taskName}".`,
        success: false,
        error: 'Task not found',
      };
    }

    if (progress === null) {
      return {
        type: 'set_progress',
        taskId: task.id,
        taskName: task.name,
        message: `Could not parse the progress value "${progressText}".`,
        success: false,
        error: 'Invalid progress',
      };
    }

    return {
      type: 'set_progress',
      taskId: task.id,
      taskName: task.name,
      updates: { progress },
      message: `Set "${task.name}" progress to ${progress}%.`,
      success: true,
    };
  }

  // Rename pattern: "rename X to Y"
  const renameMatch = normalized.match(/(?:rename|renombrar|cambiar nombre de)\s+["""]?(.+?)["""]?\s+(?:to|a|por)\s+["""]?(.+?)["""]?$/i);
  if (renameMatch && renameMatch[1] && renameMatch[2]) {
    const oldName = renameMatch[1].trim();
    const newName = renameMatch[2].trim();
    const task = findTaskByName(tasks, oldName);

    if (!task) {
      return {
        type: 'rename_task',
        taskName: oldName,
        message: `Could not find a task named "${oldName}".`,
        success: false,
        error: 'Task not found',
      };
    }

    return {
      type: 'rename_task',
      taskId: task.id,
      taskName: task.name,
      updates: { name: newName },
      message: `Renamed "${task.name}" to "${newName}".`,
      success: true,
    };
  }

  // Link tasks pattern: "link X to Y"
  const linkMatch = normalized.match(/(?:link|vincular|conectar)\s+["""]?(.+?)["""]?\s+(?:to|a|con)\s+["""]?(.+?)["""]?$/i);
  if (linkMatch && linkMatch[1] && linkMatch[2]) {
    const fromName = linkMatch[1].trim();
    const toName = linkMatch[2].trim();
    const fromTask = findTaskByName(tasks, fromName);
    const toTask = findTaskByName(tasks, toName);

    if (!fromTask) {
      return {
        type: 'link_tasks',
        taskName: fromName,
        message: `Could not find a task named "${fromName}".`,
        success: false,
        error: 'Source task not found',
      };
    }

    if (!toTask) {
      return {
        type: 'link_tasks',
        taskName: toName,
        message: `Could not find a task named "${toName}".`,
        success: false,
        error: 'Target task not found',
      };
    }

    return {
      type: 'link_tasks',
      taskId: toTask.id,
      taskName: toTask.name,
      dependencyFrom: fromTask.id,
      dependencyTo: toTask.id,
      message: `Linked "${fromTask.name}" → "${toTask.name}".`,
      success: true,
    };
  }

  // Delete pattern: "delete X"
  const deleteMatch = normalized.match(/(?:delete|eliminar|borrar|remove|quitar)\s+["""]?(.+?)["""]?$/i);
  if (deleteMatch && deleteMatch[1]) {
    const taskName = deleteMatch[1].trim();
    const task = findTaskByName(tasks, taskName);

    if (!task) {
      return {
        type: 'delete_task',
        taskName,
        message: `Could not find a task named "${taskName}".`,
        success: false,
        error: 'Task not found',
      };
    }

    return {
      type: 'delete_task',
      taskId: task.id,
      taskName: task.name,
      message: `Deleted "${task.name}".`,
      success: true,
    };
  }

  // No local pattern matched - return null to indicate AI should handle it
  return null;
}

/**
 * Validate and sanitize AI response
 */
export function validateAIResponse(response: unknown): AICommandResult {
  if (!response || typeof response !== 'object') {
    return {
      type: 'unknown',
      message: 'Invalid response from AI',
      success: false,
      error: 'Invalid response format',
    };
  }

  const r = response as Record<string, unknown>;

  return {
    type: (r.type as AICommandResult['type']) || 'unknown',
    taskId: typeof r.taskId === 'string' ? r.taskId : undefined,
    taskName: typeof r.taskName === 'string' ? r.taskName : undefined,
    updates: r.updates as Partial<Task> | undefined,
    newTask: r.newTask as Task | undefined,
    dependencyFrom: typeof r.dependencyFrom === 'string' ? r.dependencyFrom : undefined,
    dependencyTo: typeof r.dependencyTo === 'string' ? r.dependencyTo : undefined,
    message: typeof r.message === 'string' ? r.message : 'Command processed',
    success: typeof r.success === 'boolean' ? r.success : false,
    error: typeof r.error === 'string' ? r.error : undefined,
  };
}
