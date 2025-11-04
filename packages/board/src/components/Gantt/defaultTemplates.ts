import { Task, GanttTemplates } from './types';
import { ganttUtils } from './ganttUtils';

/**
 * Default templates for Gantt rendering
 * Users can override these with custom templates
 */
export const defaultTemplates: Required<GanttTemplates> = {
  taskTooltip: (task: Task) => {
    const lines: string[] = [
      `<strong>${task.name}</strong>`,
    ];

    if (task.startDate && task.endDate) {
      lines.push(
        `${ganttUtils.formatDate(task.startDate)} - ${ganttUtils.formatDate(task.endDate)}`
      );
      const duration = ganttUtils.calculateDuration(task.startDate, task.endDate);
      lines.push(`Duration: ${duration} days`);
    }

    if (task.progress !== undefined) {
      lines.push(`Progress: ${task.progress}%`);
    }

    if (task.status) {
      lines.push(`Status: ${task.status}`);
    }

    if (task.assignees && task.assignees.length > 0) {
      const assigneeNames = task.assignees.map(a => a.name).join(', ');
      lines.push(`Assigned: ${assigneeNames}`);
    }

    if (task.dependencies && task.dependencies.length > 0) {
      lines.push(`Dependencies: ${task.dependencies.length}`);
    }

    return lines.join('<br/>');
  },

  taskLabel: (task: Task) => {
    return task.name;
  },

  gridCell: (task: Task, column, value) => {
    // Return default value as-is
    return value;
  },

  taskClass: (task: Task) => {
    const classes: string[] = [];

    if (task.isCriticalPath) {
      classes.push('critical-path');
    }

    if (task.status === 'completed') {
      classes.push('completed');
    } else if (task.status === 'in-progress') {
      classes.push('in-progress');
    } else if (task.status === 'todo') {
      classes.push('todo');
    }

    if (task.isMilestone) {
      classes.push('milestone');
    }

    return classes.join(' ');
  },

  milestoneContent: (task: Task) => {
    return `◆ ${task.name}`;
  },

  dateFormat: (date: Date) => {
    return ganttUtils.formatDate(date);
  },

  durationFormat: (days: number) => {
    if (days === 1) return '1 day';
    return `${days} days`;
  },

  progressFormat: (progress: number) => {
    return `${progress}%`;
  },
};

/**
 * Merge user templates with defaults
 */
export function mergeTemplates(
  userTemplates?: Partial<GanttTemplates>
): Required<GanttTemplates> {
  return {
    ...defaultTemplates,
    ...userTemplates,
  };
}
