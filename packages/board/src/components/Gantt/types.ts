export interface TaskSegment {
  startDate: Date;
  endDate: Date;
}

export interface Task {
  id: string;
  name: string;
  startDate?: Date; // Optional - tasks without dates can be created by clicking on timeline
  endDate?: Date;   // Optional - tasks without dates can be created by clicking on timeline
  progress: number;
  assignees?: Array<{ name: string; avatar?: string; initials: string; color: string }>;
  status?: 'todo' | 'in-progress' | 'completed';
  dependencies?: string[];
  subtasks?: Task[];
  isExpanded?: boolean;
  isMilestone?: boolean;
  isCriticalPath?: boolean;

  // v0.8.1: Split task support - multiple time segments with gaps
  segments?: TaskSegment[]; // When task is split, contains multiple date ranges

  // Hierarchy properties
  parentId?: string;  // ID of parent task (undefined for root-level tasks)
  level?: number;     // Indentation level (0 for root, 1 for first level children, etc.)
  position?: number;  // Position within its level/parent
}

export type TimeScale = 'day' | 'week' | 'month';
export type Theme = 'dark' | 'light' | 'neutral';
export type RowDensity = 'compact' | 'comfortable' | 'spacious';

export type ColumnType = 'name' | 'startDate' | 'endDate' | 'duration' | 'assignees' | 'status' | 'progress';

export interface GanttColumn {
  id: ColumnType;
  label: string;
  width: number;
  visible: boolean;
  sortable?: boolean;
}

export interface Assignee {
  name: string;
  initials: string;
  color: string;
}

export interface GanttTheme {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgGrid: string;
  bgWeekend: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // Accent & Interactive
  accent: string;
  accentHover: string;
  accentLight: string;
  
  // Task Elements
  taskBarPrimary: string;
  taskBarProgress: string;
  taskBarHandle: string;
  
  // Dependencies & Critical Path
  dependency: string;
  dependencyHover: string;
  criticalPath: string;
  criticalPathLight: string;
  
  // Special Elements
  today: string;
  todayLight: string;
  milestone: string;
  milestoneLight: string;
  
  // Status Colors
  statusTodo: string;
  statusInProgress: string;
  statusCompleted: string;
  
  // Hover & Focus States
  hoverBg: string;
  focusRing: string;
}

/**
 * Templates for customizing Gantt rendering
 * Similar to DHTMLX gantt.templates.*
 */
export interface GanttTemplates {
  /**
   * Customize task tooltip content
   * @param task - The task to render tooltip for
   * @returns Tooltip content (string or JSX)
   */
  taskTooltip?: (task: Task) => string | React.ReactNode;

  /**
   * Customize task label in timeline
   * @param task - The task to render label for
   * @returns Label content (string or JSX)
   */
  taskLabel?: (task: Task) => string | React.ReactNode;

  /**
   * Customize grid cell content
   * @param task - The task for this row
   * @param column - The column type
   * @param value - Default cell value
   * @returns Cell content (string or JSX)
   */
  gridCell?: (task: Task, column: ColumnType, value: any) => string | React.ReactNode;

  /**
   * Add custom CSS classes to task bar
   * @param task - The task to style
   * @returns Space-separated CSS class names
   */
  taskClass?: (task: Task) => string;

  /**
   * Customize milestone rendering
   * @param task - The milestone task
   * @returns Milestone content (string or JSX)
   */
  milestoneContent?: (task: Task) => string | React.ReactNode;

  /**
   * Format date display
   * @param date - Date to format
   * @returns Formatted date string
   */
  dateFormat?: (date: Date) => string;

  /**
   * Format duration display
   * @param days - Duration in days
   * @returns Formatted duration string
   */
  durationFormat?: (days: number) => string;

  /**
   * Format progress display
   * @param progress - Progress percentage (0-100)
   * @returns Formatted progress string
   */
  progressFormat?: (progress: number) => string;
}

export interface GanttConfig {
  theme?: Theme;
  timeScale?: TimeScale;
  rowDensity?: RowDensity; // Row height density (default: 'comfortable')
  showThemeSelector?: boolean; // Show theme selector in toolbar (default: true)
  availableUsers?: Array<{ id: string; name: string; initials: string; color: string }>; // Available users for assignment

  // v0.8.0: Customizable templates (similar to DHTMLX gantt.templates.*)
  templates?: GanttTemplates;

  // ==================== Basic Events ====================
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void; // v0.8.0: Double-click event
  onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0: Right-click event
  onTaskUpdate?: (task: Task) => void;
  onTaskDateChange?: (task: Task, startDate: Date, endDate: Date) => void;
  onProgressChange?: (taskId: string, oldProgress: number, newProgress: number) => void; // v0.8.0: Progress change event

  // ==================== Dependency Events ====================
  onDependencyCreate?: (fromTaskId: string, toTaskId: string) => void;
  onDependencyDelete?: (taskId: string, dependencyId: string) => void;

  // ==================== Lifecycle Events (Before/After) ====================
  // v0.8.0: Cancelable "before" events return false to cancel the operation
  onBeforeTaskAdd?: (task: Task) => boolean | void; // Return false to cancel
  onAfterTaskAdd?: (task: Task) => void;
  onBeforeTaskUpdate?: (taskId: string, newData: Partial<Task>) => boolean | void; // Return false to cancel
  onAfterTaskUpdate?: (task: Task) => void;
  onBeforeTaskDelete?: (taskId: string) => boolean | void; // Return false to cancel
  onAfterTaskDelete?: (taskId: string) => void;

  // ==================== Hierarchy Callbacks ====================
  onTaskCreate?: (parentId: string | undefined, position: number) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskDuplicate?: (taskId: string) => void;
  onTaskMove?: (taskId: string, direction: 'up' | 'down') => void;
  onTaskIndent?: (taskId: string) => void;
  onTaskOutdent?: (taskId: string) => void;
  onTaskRename?: (taskId: string, newName: string) => void;
  onTaskToggleExpand?: (taskId: string) => void;
}