import { Task } from './types';

/**
 * Re-index position properties for all tasks at each level
 * so that array order matches position values.
 */
function reindexPositions(tasks: Task[]): Task[] {
  return tasks.map((t, idx) => ({
    ...t,
    position: idx,
    subtasks: t.subtasks?.length ? reindexPositions(t.subtasks) : t.subtasks,
  }));
}

/**
 * Flatten tasks into a single array with level information
 */
export function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const traverse = (tasks: Task[], parentId?: string, level = 0) => {
    // Sort tasks by position to maintain creation order
    const sortedTasks = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (let i = 0; i < sortedTasks.length; i++) {
      const task = { ...sortedTasks[i], parentId, level, position: sortedTasks[i].position ?? i };
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
  const indented = addAsChildren(filtered, targetParent.id, removed);
  // Re-index positions at each level to reflect new order
  return reindexPositions(indented);
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

  // Re-index positions at each level to reflect new order
  return reindexPositions(result);
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
    // Update position properties after swap
    tasks[index] = { ...tasks[index], position: index };
    tasks[newIndex] = { ...tasks[newIndex], position: newIndex };
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
 * v1.4.14: Returns both updated tasks array and array of duplicated tasks (with subtasks)
 */
export function duplicateTasks(tasks: Task[], taskIds: string[]): { tasks: Task[]; duplicatedTasks: Task[] } {
  const result = [...tasks];
  const duplicatedTasks: Task[] = [];

  for (const taskId of taskIds) {
    const duplicateSubtasks = (subtasks: Task[], parentId: string): Task[] => {
      return subtasks.map((task, idx) => ({
        ...task,
        id: `${task.id}-copy-${Date.now()}-${idx}`,
        parentId,
        subtasks: task.subtasks ? duplicateSubtasks(task.subtasks, `${task.id}-copy-${Date.now()}-${idx}`) : undefined,
      }));
    };

    const duplicateTask = (tasks: Task[]): Task | null => {
      const index = tasks.findIndex((t) => t.id === taskId);
      if (index === -1) {
        // Try in subtasks
        for (const task of tasks) {
          if (task.subtasks) {
            const found = duplicateTask(task.subtasks);
            if (found) return found;
          }
        }
        return null;
      }

      const original = tasks[index];
      const newId = `${original.id}-copy-${Date.now()}`;
      const copy: Task = {
        ...original,
        id: newId,
        name: `${original.name} (Copy)`,
        subtasks: original.subtasks ? duplicateSubtasks(original.subtasks, newId) : undefined,
      };

      tasks.splice(index + 1, 0, copy);
      return copy;
    };

    const duplicated = duplicateTask(result);
    if (duplicated) {
      duplicatedTasks.push(duplicated);
    }
  }

  return { tasks: result, duplicatedTasks };
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

  // Find parent to get subtask count for position
  const getSubtaskCount = (tasks: Task[]): number => {
    for (const task of tasks) {
      if (task.id === parentTaskId) return (task.subtasks || []).length;
      if (task.subtasks) {
        const count = getSubtaskCount(task.subtasks);
        if (count >= 0) return count;
      }
    }
    return 0;
  };

  const subtaskCount = getSubtaskCount(tasks);

  const newTask: Task = {
    id: `task-${Date.now()}`,
    name: 'New Subtask',
    progress: 0,
    status: 'todo',
    startDate: new Date(startDate), // Clone to avoid reference issues
    endDate: new Date(endDate),     // Clone to avoid reference issues
    color: parentTask?.color || '#2E94FF', // v0.16.7: Inherit parent color (default: electric blue)
    position: subtaskCount, // Ensure position is at the end
    parentId: parentTaskId, // Link to parent for proper hierarchy
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

/**
 * v0.17.68: Reparent a task - move it to become a child of another task
 * This allows dragging subtasks between different parent tasks
 *
 * @param tasks - The task tree
 * @param taskId - The ID of the task to move
 * @param newParentId - The ID of the new parent task (null to move to root level)
 * @param position - Optional position index within the new parent's subtasks
 * @returns Updated task tree
 */
export function reparentTask(
  tasks: Task[],
  taskId: string,
  newParentId: string | null,
  position?: number
): Task[] {
  // Prevent moving a task to itself
  if (taskId === newParentId) return tasks;

  // Find the task to move
  const taskToMove = findTask(tasks, taskId);
  if (!taskToMove) return tasks;

  // Prevent moving a parent to its own descendant (would create circular reference)
  if (newParentId) {
    const isDescendant = (parentTask: Task, childId: string): boolean => {
      if (!parentTask.subtasks) return false;
      for (const subtask of parentTask.subtasks) {
        if (subtask.id === childId) return true;
        if (isDescendant(subtask, childId)) return true;
      }
      return false;
    };
    if (isDescendant(taskToMove, newParentId)) return tasks;
  }

  // Step 1: Remove the task from its current location and re-index siblings
  const removeTask = (taskList: Task[]): Task[] => {
    const filtered = taskList.filter((t) => t.id !== taskId);
    const hadRemoval = filtered.length < taskList.length;
    return filtered.map((t, idx) => {
      const updated = hadRemoval ? { ...t, position: idx } : t;
      if (updated.subtasks && updated.subtasks.length > 0) {
        return { ...updated, subtasks: removeTask(updated.subtasks) };
      }
      return updated;
    });
  };

  let result = removeTask(tasks);

  // Step 2: Add the task to its new location
  if (newParentId === null) {
    // Move to root level
    const insertPos = position !== undefined ? position : result.length;
    result.splice(insertPos, 0, { ...taskToMove, parentId: undefined });
    // Update position property for all root-level siblings
    result = result.map((t, idx) => ({ ...t, position: idx }));
  } else {
    // Move to be a child of newParentId
    const addToParent = (taskList: Task[]): Task[] => {
      return taskList.map((t) => {
        if (t.id === newParentId) {
          const subtasks = t.subtasks || [];
          const insertPos = position !== undefined ? position : subtasks.length;
          const newSubtasks = [...subtasks];
          newSubtasks.splice(insertPos, 0, { ...taskToMove, parentId: newParentId });
          // Update position property for all siblings in the new parent
          const reindexed = newSubtasks.map((s, idx) => ({ ...s, position: idx }));
          return {
            ...t,
            subtasks: reindexed,
            isExpanded: true, // Auto-expand to show the moved task
          };
        }
        if (t.subtasks && t.subtasks.length > 0) {
          return { ...t, subtasks: addToParent(t.subtasks) };
        }
        return t;
      });
    };
    result = addToParent(result);
  }

  return result;
}

/**
 * v0.17.68: Check if a task can be reparented to a new parent
 * Returns false if the move would create a circular reference
 */
export function canReparent(
  tasks: Task[],
  taskId: string,
  newParentId: string | null
): boolean {
  // Can always move to root
  if (newParentId === null) return true;

  // Can't be parent of itself
  if (taskId === newParentId) return false;

  // Find the task
  const task = findTask(tasks, taskId);
  if (!task) return false;

  // Check if newParentId is a descendant of taskId (would create circular ref)
  const isDescendant = (parentTask: Task, childId: string): boolean => {
    if (!parentTask.subtasks) return false;
    for (const subtask of parentTask.subtasks) {
      if (subtask.id === childId) return true;
      if (isDescendant(subtask, childId)) return true;
    }
    return false;
  };

  return !isDescendant(task, newParentId);
}

/**
 * Roll-up parent dates and progress from children (Leaf Node Rule).
 * Parent tasks with subtasks become read-only containers:
 * - startDate = min(children startDates)
 * - endDate = max(children endDates)
 * - progress = average(children progress)
 * Recurses bottom-up so grandparents also roll up correctly.
 */
export function rollUpParentDates(tasks: Task[]): Task[] {
  return tasks.map(task => {
    if (!task.subtasks || task.subtasks.length === 0) return task;

    // First, recurse into children so nested parents roll up first
    const updatedSubtasks = rollUpParentDates(task.subtasks);

    // Collect dates and progress from all children
    const childDates = updatedSubtasks.reduce<{ starts: number[]; ends: number[]; progresses: number[] }>(
      (acc, child) => {
        if (child.startDate) acc.starts.push(new Date(child.startDate).getTime());
        if (child.endDate) acc.ends.push(new Date(child.endDate).getTime());
        acc.progresses.push(child.progress ?? 0);
        return acc;
      },
      { starts: [], ends: [], progresses: [] }
    );

    const rolledStart = childDates.starts.length > 0
      ? new Date(Math.min(...childDates.starts))
      : task.startDate;
    const rolledEnd = childDates.ends.length > 0
      ? new Date(Math.max(...childDates.ends))
      : task.endDate;
    const rolledProgress = childDates.progresses.length > 0
      ? Math.round(childDates.progresses.reduce((a, b) => a + b, 0) / childDates.progresses.length)
      : task.progress;

    return {
      ...task,
      subtasks: updatedSubtasks,
      startDate: rolledStart,
      endDate: rolledEnd,
      progress: rolledProgress,
    };
  });
}
