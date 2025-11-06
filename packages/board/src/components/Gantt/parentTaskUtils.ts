import { Task } from './types';
import { ganttUtils } from './ganttUtils';

/**
 * Utility functions for parent task calculations (summary bars)
 * Similar to Bryntum/DHTMLX parent task behavior
 */
export const parentTaskUtils = {
  /**
   * Calculate automatic start/end dates for parent tasks based on their children
   * Parent dates span from earliest child start to latest child end
   * @param task - Parent task to calculate dates for
   * @returns Object with calculated startDate and endDate, or null if no valid children
   */
  calculateParentDates: (task: Task): { startDate: Date; endDate: Date } | null => {
    if (!task.subtasks || task.subtasks.length === 0) return null;

    // Get all child dates recursively (including nested subtasks)
    const getAllChildDates = (tasks: Task[]): Date[] => {
      const dates: Date[] = [];
      tasks.forEach(t => {
        if (t.startDate) dates.push(t.startDate);
        if (t.endDate) dates.push(t.endDate);
        if (t.subtasks && t.subtasks.length > 0) {
          dates.push(...getAllChildDates(t.subtasks));
        }
      });
      return dates;
    };

    const childDates = getAllChildDates(task.subtasks);
    if (childDates.length === 0) return null;

    const startDate = new Date(Math.min(...childDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...childDates.map(d => d.getTime())));

    return { startDate, endDate };
  },

  /**
   * Check if a task is a parent (has subtasks)
   * @param task - Task to check
   * @returns True if task has subtasks
   */
  isParentTask: (task: Task): boolean => {
    return !!(task.subtasks && task.subtasks.length > 0);
  },

  /**
   * Calculate average progress for parent tasks based on children
   * @param task - Parent task
   * @returns Average progress percentage (0-100)
   */
  calculateParentProgress: (task: Task): number => {
    if (!task.subtasks || task.subtasks.length === 0) return task.progress;

    const flatChildren = ganttUtils.flattenTasks(task.subtasks);
    if (flatChildren.length === 0) return task.progress;

    const totalProgress = flatChildren.reduce((sum, child) => sum + child.progress, 0);
    return Math.round(totalProgress / flatChildren.length);
  },
};
