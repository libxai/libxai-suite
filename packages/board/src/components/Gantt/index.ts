// Main components
export { GanttBoard } from './GanttBoard';
export { GanttToolbar } from './GanttToolbar';
export { TaskGrid } from './TaskGrid';
export { Timeline } from './Timeline';
export { TaskBar } from './TaskBar';
export { DependencyLine } from './DependencyLine';
export { Milestone } from './Milestone';
export { ColumnManager } from './ColumnManager';
export { ContextMenu, MenuIcons } from './ContextMenu';

// Types
export type {
  Task,
  TaskSegment, // v0.8.1: Split task support
  TimeScale,
  Theme,
  GanttConfig,
  GanttColumn,
  ColumnType,
  Assignee,
  GanttTheme,
  GanttTemplates, // v0.8.0
} from './types';

// Imperative API (v0.8.0)
export type { GanttBoardRef } from './GanttBoardRef';

// Utilities (v0.8.0)
export { ganttUtils } from './ganttUtils';

// Themes
export { themes } from './themes';

// Adapters
export { cardToGanttTask, ganttTaskToCardUpdate, cardsToGanttTasks } from './adapters';
