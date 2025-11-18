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

/**
 * Permissions interface for controlling Gantt operations
 * Useful for integrating with authorization libraries like CASL
 * @example
 * 
 * // With CASL integration
 * const ability = useAbility();
 *
 * <GanttBoard
 *   tasks={tasks}
 *   config={{
 *     permissions: {
 *       canCreateTask: ability.can('create', 'Task'),
 *       canUpdateTask: ability.can('update', 'Task'),
 *       canDeleteTask: ability.can('delete', 'Task'),
 *       canCreateDependency: ability.can('create', 'Dependency'),
 *       canUpdateProgress: ability.can('update', 'TaskProgress'),
 *     }
 *   }}
 * />
 *  
 */
export interface GanttPermissions {
  canCreateTask?: boolean;
  canUpdateTask?: boolean;
  canDeleteTask?: boolean;
  canCreateDependency?: boolean;
  canDeleteDependency?: boolean;
  canUpdateProgress?: boolean;
  canAssignUsers?: boolean;
  canModifyHierarchy?: boolean;
  canDuplicateTask?: boolean;
  canReorderTasks?: boolean;
  canExport?: boolean;
  canToggleExpansion?: boolean;
  canPerformAction?: (task: Task, action: 'create' | 'update' | 'delete' | 'assign' | 'progress') => boolean;
}

/**
 * Scroll behavior configuration for timeline interactions
 * Controls how the Gantt chart viewport behaves during user interactions
 *
 * @example
 * // Disable all automatic scrolling during drag operations
 * <GanttBoard
 *   config={{
 *     scrollBehavior: {
 *       preventAutoScroll: true,
 *       axis: 'horizontal'
 *     }
 *   }}
 * />
 *
 * @example
 * // Allow vertical auto-scroll but prevent horizontal
 * <GanttBoard
 *   config={{
 *     scrollBehavior: {
 *       preventAutoScroll: true,
 *       axis: 'horizontal',
 *       onScrollPrevented: (axis, scrollDelta) => {
 *         console.log(`Prevented ${axis} scroll by ${scrollDelta}px`);
 *       }
 *     }
 *   }}
 * />
 */
export interface GanttScrollBehavior {
  /**
   * Prevent automatic viewport scrolling during drag operations
   * When true, the viewport will not automatically center on dragged tasks
   * Users can still manually scroll using scrollbars or mouse wheel
   * @default false
   */
  preventAutoScroll?: boolean;

  /**
   * Which axis to prevent auto-scroll on
   * - 'horizontal': Only prevent horizontal auto-scroll (recommended for Gantt charts)
   * - 'vertical': Only prevent vertical auto-scroll
   * - 'both': Prevent both horizontal and vertical auto-scroll
   * @default 'horizontal'
   */
  axis?: 'horizontal' | 'vertical' | 'both';

  /**
   * Callback fired when auto-scroll is prevented
   * Useful for debugging or showing user feedback
   * @param axis - Which axis was prevented ('x' or 'y')
   * @param scrollDelta - How many pixels of scroll were prevented
   */
  onScrollPrevented?: (axis: 'x' | 'y', scrollDelta: number) => void;

  /**
   * Allow auto-scroll if task would go out of viewport bounds
   * When true, auto-scroll is only prevented if task remains visible
   * @default false
   */
  allowScrollWhenOutOfBounds?: boolean;
}

export interface GanttConfig {
  theme?: Theme;
  timeScale?: TimeScale;
  rowDensity?: RowDensity; // Row height density (default: 'comfortable')
  showThemeSelector?: boolean; // Show theme selector in toolbar (default: true)
  availableUsers?: Array<{ id: string; name: string; initials: string; color: string }>; // Available users for assignment

  // v0.8.0: Customizable templates (similar to DHTMLX gantt.templates.*)
  templates?: GanttTemplates;

  // v0.8.2: Permissions system for authorization integration (CASL, etc.)
  permissions?: GanttPermissions;

  // v0.9.1: Disable automatic scroll synchronization during drag operations
  disableScrollSync?: boolean; // When true, prevents automatic viewport centering during task drag (default: false)

  /**
   * v0.9.2: Advanced scroll behavior configuration
   * Controls how the timeline viewport behaves during drag operations
   * Provides fine-grained control over auto-scroll prevention with events
   * @see GanttScrollBehavior
   */
  scrollBehavior?: GanttScrollBehavior;

  // ==================== UI Events ====================
  onThemeChange?: (theme: Theme) => void; // v0.9.0: Theme change event

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
  onMultiTaskDelete?: (taskIds: string[]) => void; // Batch delete multiple tasks
  onTaskDuplicate?: (taskId: string) => void;
  onTaskMove?: (taskId: string, direction: 'up' | 'down') => void;
  onTaskIndent?: (taskId: string) => void;
  onTaskOutdent?: (taskId: string) => void;
  onTaskRename?: (taskId: string, newName: string) => void;
  onTaskToggleExpand?: (taskId: string) => void;
}
