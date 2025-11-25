// Main components
export { GanttBoard } from './GanttBoard';
export { GanttToolbar } from './GanttToolbar';

// Theme Context (internal use - for Portal theming)
export { GanttThemeContext, useGanttTheme } from './GanttThemeContext';
export type { GanttThemeContextValue } from './GanttThemeContext';
export { TaskGrid } from './TaskGrid';
export { Timeline } from './Timeline';
export { TaskBar } from './TaskBar';
export { DependencyLine } from './DependencyLine';
export { Milestone } from './Milestone';
export { ColumnManager } from './ColumnManager';
export { ContextMenu, MenuIcons } from './ContextMenu';
export { TaskFormModal } from './TaskFormModal'; // v0.9.0: Task CRUD modal

// Types
export type {
  Task,
  TaskSegment, // v0.8.1: Split task support
  TimeScale,
  Theme,
  GanttConfig,
  GanttPermissions, // v0.8.2: Permissions for authorization
  GanttColumn,
  ColumnType,
  Assignee,
  GanttTheme,
  GanttTemplates, // v0.8.0
} from './types';

// Task Form Types (v0.9.0)
export type { TaskFormModalProps, TaskFormData } from './TaskFormModal';

// Imperative API (v0.8.0)
export type { GanttBoardRef } from './GanttBoardRef';

// Utilities (v0.8.0)
export { ganttUtils } from './ganttUtils';

// Themes
export { themes } from './themes';

// Adapters
export { cardToGanttTask, ganttTaskToCardUpdate, cardsToGanttTasks } from './adapters';
