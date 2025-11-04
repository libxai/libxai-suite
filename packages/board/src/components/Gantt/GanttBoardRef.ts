import { Task } from './types';

/**
 * GanttBoardRef - Imperative API for GanttBoard component
 * Similar to DHTMLX gantt.* methods for programmatic control
 */
export interface GanttBoardRef {
  // ==================== CRUD Methods ====================

  /**
   * Get a task by ID
   * Similar to: gantt.getTask(id)
   */
  getTask: (id: string) => Task | undefined;

  /**
   * Add a new task
   * Similar to: gantt.addTask(task)
   */
  addTask: (task: Task, parentId?: string) => void;

  /**
   * Update a task by ID
   * Similar to: gantt.updateTask(id, updates)
   */
  updateTask: (id: string, updates: Partial<Task>) => void;

  /**
   * Delete a task by ID
   * Similar to: gantt.deleteTask(id)
   */
  deleteTask: (id: string) => void;

  /**
   * Delete multiple tasks by IDs
   */
  deleteTasks: (ids: string[]) => void;

  /**
   * Duplicate a task
   */
  duplicateTask: (id: string) => void;

  /**
   * Split a task (create GAP in the middle, like Bryntum/DHTMLX) (v0.8.1)
   * Same task, but work is paused for some days then continues
   * Example: Jan 1-10 → Split at Jan 5 with 3 day gap → Jan 1-4 [GAP] Jan 8-13
   * @param id - Task ID to split
   * @param splitDate - Date where gap starts
   * @param gapDays - Number of days to pause (default: 3)
   */
  splitTask: (id: string, splitDate: Date, gapDays?: number) => void;

  // ==================== Utility Methods ====================

  /**
   * Calculate end date based on start date and duration
   * Similar to: gantt.calculateEndDate(start, duration)
   */
  calculateEndDate: (start: Date, durationDays: number) => Date;

  /**
   * Calculate duration in days between two dates
   * Similar to: gantt.calculateDuration(start, end)
   */
  calculateDuration: (start: Date, end: Date) => number;

  /**
   * Validate if creating a dependency would create a circular reference
   */
  validateDependency: (fromTaskId: string, toTaskId: string) => boolean;

  // ==================== Data Methods ====================

  /**
   * Get all tasks (including subtasks) as a flat array
   * Similar to: gantt.getTaskByTime()
   */
  getAllTasks: () => Task[];

  /**
   * Get tasks filtered by status
   */
  getTasksByStatus: (status: 'todo' | 'in-progress' | 'completed') => Task[];

  /**
   * Get tasks by parent ID
   */
  getTasksByParent: (parentId?: string) => Task[];

  /**
   * Get the critical path tasks
   */
  getCriticalPath: () => Task[];

  // ==================== Hierarchy Methods ====================

  /**
   * Indent task(s) - make them children of previous sibling
   */
  indentTask: (taskId: string) => void;

  /**
   * Outdent task(s) - move them to parent's level
   */
  outdentTask: (taskId: string) => void;

  /**
   * Move task up or down in the list
   */
  moveTask: (taskId: string, direction: 'up' | 'down') => void;

  /**
   * Create a subtask under a parent task
   */
  createSubtask: (parentId: string) => void;

  // ==================== UI Methods ====================

  /**
   * Scroll to a specific task
   */
  scrollToTask: (id: string) => void;

  /**
   * Highlight a task temporarily
   */
  highlightTask: (id: string, duration?: number) => void;

  /**
   * Expand a task to show its subtasks
   */
  expandTask: (id: string) => void;

  /**
   * Collapse a task to hide its subtasks
   */
  collapseTask: (id: string) => void;

  /**
   * Expand all tasks
   */
  expandAll: () => void;

  /**
   * Collapse all tasks
   */
  collapseAll: () => void;

  // ==================== Undo/Redo ====================

  /**
   * Undo last change
   * Similar to: gantt.undo()
   */
  undo: () => void;

  /**
   * Redo last undone change
   * Similar to: gantt.redo()
   */
  redo: () => void;

  /**
   * Check if undo is available
   */
  canUndo: () => boolean;

  /**
   * Check if redo is available
   */
  canRedo: () => boolean;

  /**
   * Clear undo/redo history
   */
  clearHistory: () => void;

  // ==================== Export/Import ====================

  /**
   * Export Gantt chart to PNG image
   * Similar to: gantt.exportToPNG()
   */
  exportToPNG: () => Promise<Blob>;

  /**
   * Export tasks to PDF format
   * Similar to: gantt.exportToPDF()
   */
  exportToPDF: (filename?: string) => Promise<void>;

  /**
   * Export tasks to Excel format
   * Similar to: gantt.exportToExcel()
   */
  exportToExcel: (filename?: string) => Promise<void>;

  /**
   * Export tasks to JSON string
   * Similar to: gantt.serialize()
   */
  exportToJSON: () => string;

  /**
   * Export tasks to CSV format
   */
  exportToCSV: () => string;

  /**
   * Import tasks from JSON string
   * Similar to: gantt.parse(data)
   */
  importFromJSON: (json: string) => void;

  // ==================== State Methods ====================

  /**
   * Get current tasks state
   */
  getTasks: () => Task[];

  /**
   * Refresh/re-render the Gantt chart
   * Similar to: gantt.render()
   */
  refresh: () => void;

  /**
   * Clear all tasks
   * Similar to: gantt.clearAll()
   */
  clearAll: () => void;
}
