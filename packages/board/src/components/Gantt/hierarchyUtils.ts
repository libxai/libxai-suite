import { Task } from './types';

/**
 * Flatten tasks into a single array with level information
 */
export function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const traverse = (tasks: Task[], parentId?: string, level = 0) => {
    for (let i = 0; i < tasks.length; i++) {
      const task = { ...tasks[i], parentId, level, position: i };
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0 && task.isExpanded) {
        traverse(task.subtasks, task.id, level + 1);
      }
    }
  };
  traverse(tasks);
  return result;
}

/**
 * Find task by ID recursively
 */
export function findTask(tasks: Task[], taskId: string): Task | null {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.subtasks) {
      const found = findTask(task.subtasks, taskId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find parent task by child ID
 */
export function findParentTask(tasks: Task[], childId: string): Task | null {
  for (const task of tasks) {
    if (task.subtasks) {
      if (task.subtasks.some((t) => t.id === childId)) {
        return task;
      }
      const found = findParentTask(task.subtasks, childId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Indent tasks (make them children of the previous sibling)
 */
export function indentTasks(tasks: Task[], taskIds: string[]): Task[] {
  if (taskIds.length === 0) return tasks;

  // Get flat list to find positions
  const flatTasks = flattenTasks(tasks);
  const firstTaskId = taskIds[0];
  const taskIndex = flatTasks.findIndex((t) => t.id === firstTaskId);

  if (taskIndex <= 0) return tasks; // Can't indent first task

  const targetParent = flatTasks[taskIndex - 1]; // Previous sibling becomes parent

  // Helper to remove tasks from array
  const removeTasks = (tasks: Task[], ids: Set<string>): { tasks: Task[]; removed: Task[] } => {
    const removed: Task[] = [];
    const filtered = tasks.filter((task) => {
      if (ids.has(task.id)) {
        removed.push(task);
        return false;
      }
      if (task.subtasks) {
        const result = removeTasks(task.subtasks, ids);
        task.subtasks = result.tasks;
        removed.push(...result.removed);
      }
      return true;
    });
    return { tasks: filtered, removed };
  };

  // Helper to add tasks as children
  const addAsChildren = (tasks: Task[], parentId: string, children: Task[]): Task[] => {
    return tasks.map((task) => {
      if (task.id === parentId) {
        return {
          ...task,
          subtasks: [...(task.subtasks || []), ...children],
          isExpanded: true, // Auto-expand when adding children
        };
      }
      if (task.subtasks) {
        return { ...task, subtasks: addAsChildren(task.subtasks, parentId, children) };
      }
      return task;
    });
  };

  const idsSet = new Set(taskIds);
  const { tasks: filtered, removed } = removeTasks(tasks, idsSet);
  return addAsChildren(filtered, targetParent.id, removed);
}

/**
 * Outdent tasks (move them up one level in hierarchy)
 */
export function outdentTasks(tasks: Task[], taskIds: string[]): Task[] {
  if (taskIds.length === 0) return tasks;

  const result = [...tasks];

  for (const taskId of taskIds) {
    const parent = findParentTask(result, taskId);
    if (!parent) continue; // Already root level

    const grandparent = findParentTask(result, parent.id);

    // Helper to remove task from parent
    const removeFromParent = (tasks: Task[], parentId: string, taskId: string): Task | null => {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (task.id === parentId && task.subtasks) {
          const taskIndex = task.subtasks.findIndex((t) => t.id === taskId);
          if (taskIndex !== -1) {
            const [removed] = task.subtasks.splice(taskIndex, 1);
            return removed;
          }
        }
        if (task.subtasks) {
          const removed = removeFromParent(task.subtasks, parentId, taskId);
          if (removed) return removed;
        }
      }
      return null;
    };

    // Helper to insert task after parent
    const insertAfterTask = (tasks: Task[], afterId: string, task: Task): Task[] => {
      const index = tasks.findIndex((t) => t.id === afterId);
      if (index !== -1) {
        tasks.splice(index + 1, 0, task);
        return tasks;
      }
      for (const t of tasks) {
        if (t.subtasks) {
          insertAfterTask(t.subtasks, afterId, task);
        }
      }
      return tasks;
    };

    const removed = removeFromParent(result, parent.id, taskId);
    if (removed) {
      if (grandparent && grandparent.subtasks) {
        // Move to grandparent's children after parent
        insertAfterTask(grandparent.subtasks, parent.id, removed);
      } else {
        // Move to root level after parent
        insertAfterTask(result, parent.id, removed);
      }
    }
  }

  return result;
}

/**
 * Move tasks up or down within their level
 */
export function moveTasks(tasks: Task[], taskIds: string[], direction: 'up' | 'down'): Task[] {
  if (taskIds.length === 0) return tasks;

  const result = [...tasks];
  const firstTaskId = taskIds[0];

  // Helper to move task within array
  const moveInArray = (tasks: Task[], taskId: string, direction: 'up' | 'down'): boolean => {
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      // Try in subtasks
      for (const task of tasks) {
        if (task.subtasks && moveInArray(task.subtasks, taskId, direction)) {
          return true;
        }
      }
      return false;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return false;

    // Swap tasks
    [tasks[index], tasks[newIndex]] = [tasks[newIndex], tasks[index]];
    return true;
  };

  moveInArray(result, firstTaskId, direction);
  return result;
}

/**
 * Delete tasks by IDs
 */
export function deleteTasks(tasks: Task[], taskIds: string[]): Task[] {
  const idsSet = new Set(taskIds);

  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks
      .filter((task) => !idsSet.has(task.id))
      .map((task) => {
        if (task.subtasks) {
          return { ...task, subtasks: filterTasks(task.subtasks) };
        }
        return task;
      });
  };

  return filterTasks(tasks);
}

/**
 * Duplicate tasks
 */
export function duplicateTasks(tasks: Task[], taskIds: string[]): Task[] {
  const result = [...tasks];

  for (const taskId of taskIds) {
    const duplicateTask = (tasks: Task[]): boolean => {
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index === -1) {
        // Try in subtasks
        for (const task of tasks) {
          if (task.subtasks && duplicateTask(task.subtasks)) {
            return true;
          }
        }
        return false;
      }

      const original = tasks[index];
      const copy = {
        ...original,
        id: `${original.id}-copy-${Date.now()}`,
        name: `${original.name} (Copy)`,
        subtasks: original.subtasks ? duplicateSubtasks(original.subtasks) : undefined,
      };

      tasks.splice(index + 1, 0, copy);
      return true;
    };

    const duplicateSubtasks = (subtasks: Task[]): Task[] => {
      return subtasks.map((task) => ({
        ...task,
        id: `${task.id}-copy-${Date.now()}`,
        subtasks: task.subtasks ? duplicateSubtasks(task.subtasks) : undefined,
      }));
    };

    duplicateTask(result);
  }

  return result;
}

/**
 * Create a new task
 * v0.11.0: New tasks start with default blue color
 */
export function createTask(
  tasks: Task[],
  afterTaskId: string,
  direction: 'above' | 'below'
): { tasks: Task[]; newTask: Task } {
  const result = [...tasks];
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const newTask: Task = {
    id: `task-${Date.now()}`,
    name: 'New Task',
    progress: 0,
    status: 'todo',
    startDate: today,
    endDate: weekFromNow,
    color: '#6366F1', // v0.11.0: Default blue pastel color
  };

  const insertTask = (tasks: Task[]): boolean => {
    const index = tasks.findIndex((t) => t.id === afterTaskId);
    if (index === -1) {
      // Try in subtasks
      for (const task of tasks) {
        if (task.subtasks && insertTask(task.subtasks)) {
          return true;
        }
      }
      return false;
    }

    const insertIndex = direction === 'above' ? index : index + 1;
    tasks.splice(insertIndex, 0, newTask);
    return true;
  };

  insertTask(result);
  return { tasks: result, newTask };
}

/**
 * Rename a task
 */
export function renameTask(tasks: Task[], taskId: string, newName: string): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, name: newName };
    }
    if (task.subtasks) {
      return { ...task, subtasks: renameTask(task.subtasks, taskId, newName) };
    }
    return task;
  });
}

/**
 * Toggle task expansion
 */
export function toggleTaskExpansion(tasks: Task[], taskId: string): Task[] {
  return tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, isExpanded: !task.isExpanded };
    }
    if (task.subtasks) {
      return { ...task, subtasks: toggleTaskExpansion(task.subtasks, taskId) };
    }
    return task;
  });
}

/**
 * Create a subtask for a parent task
 * v0.11.0: Subtasks inherit parent color
 */
export function createSubtask(
  tasks: Task[],
  parentTaskId: string
): { tasks: Task[]; newTask: Task } {
  // Find parent task to inherit properties
  const findParent = (tasks: Task[]): Task | null => {
    for (const task of tasks) {
      if (task.id === parentTaskId) return task;
      if (task.subtasks) {
        const found = findParent(task.subtasks);
        if (found) return found;
      }
    }
    return null;
  };

  const parentTask = findParent(tasks);

  // v0.16.7: Inherit dates from parent task (subtask should fit within parent)
  // If parent has dates, use them. Otherwise fall back to today + 7 days
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const startDate = parentTask?.startDate || today;
  const endDate = parentTask?.endDate || weekFromNow;

  const newTask: Task = {
    id: `task-${Date.now()}`,
    name: 'New Subtask',
    progress: 0,
    status: 'todo',
    startDate: new Date(startDate), // Clone to avoid reference issues
    endDate: new Date(endDate),     // Clone to avoid reference issues
    color: parentTask?.color || '#3B82F6', // v0.16.7: Inherit parent color (default: electric blue)
  };

  const addSubtask = (tasks: Task[]): Task[] => {
    return tasks.map((task) => {
      if (task.id === parentTaskId) {
        // Add subtask to the end of existing subtasks
        const subtasks = task.subtasks || [];
        return {
          ...task,
          subtasks: [...subtasks, newTask],
          isExpanded: true, // Auto-expand parent to show new subtask
        };
      }
      if (task.subtasks) {
        return { ...task, subtasks: addSubtask(task.subtasks) };
      }
      return task;
    });
  };

  return { tasks: addSubtask(tasks), newTask };
}
