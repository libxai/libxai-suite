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
export { GanttAIAssistant } from './GanttAIAssistant'; // v0.14.0: AI Assistant

// AI Command Parser utilities (v0.14.0)
export {
  GANTT_AI_SYSTEM_PROMPT,
  generateTasksContext,
  findTaskByName,
  parseNaturalDate,
  parseNaturalDuration,
  parseProgress,
  parseStatus,
  parseLocalCommand,
  validateAIResponse,
} from './aiCommandParser';

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
  GanttAIAssistantConfig, // v0.14.0: AI Assistant config
  AICommandResult, // v0.14.0: AI command result
  AIMessage, // v0.17.42: AI chat message type
  PersistHistoryConfig, // v0.17.42: AI history persistence config
} from './types';

// Task Form Types (v0.9.0, v0.17.28: added TaskPriority)
export type { TaskFormModalProps, TaskFormData, TaskPriority } from './TaskFormModal';

// Imperative API (v0.8.0)
export type { GanttBoardRef } from './GanttBoardRef';

// Utilities (v0.8.0)
export { ganttUtils } from './ganttUtils';

// Themes
export { themes } from './themes';

// Adapters
export { cardToGanttTask, ganttTaskToCardUpdate, cardsToGanttTasks } from './adapters';
