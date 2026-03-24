/**
 * ListView Component Types
 * @version 0.18.0
 *
 * v0.18.0: Added dynamic columns, custom fields, context menu support
 */

import type { ReactNode } from 'react';
import type { Task } from '../Gantt/types';
import type { User } from '../../types';

/**
 * Sort direction for list columns
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Column types supported in ListView
 * - Standard: name, status, priority, assignees, startDate, endDate, progress, tags, estimatedTime, quotedTime, elapsedTime
 * - v1.2.0: effortMinutes, timeLoggedMinutes, soldEffortMinutes
 * - Custom: text, number, date, dropdown, checkbox
 */
export type ColumnType =
  | 'name'           // Task name (always visible, first column)
  | 'status'         // Todo/In Progress/Completed
  | 'priority'       // Urgent/High/Medium/Low
  | 'assignees'      // Assigned users
  | 'startDate'      // Start date
  | 'endDate'        // End date / Due date
  | 'progress'       // Progress percentage
  | 'tags'           // Task tags/labels
  | 'estimatedTime'  // Estimated time in minutes (v0.18.3)
  | 'quotedTime'     // Quoted time in minutes (v1.1.0)
  | 'elapsedTime'    // Elapsed/spent time in minutes (v0.18.3)
  // v1.2.0: Three-tier time tracking
  | 'effortMinutes'      // Effort estimate in minutes (technical goal)
  | 'timeLoggedMinutes'  // Time logged in minutes (auto-calculated)
  | 'soldEffortMinutes'  // Sold/quoted effort in minutes (client facing)
  // v2.0.0: Chronos Interactive Time Manager columns
  | 'scheduleVariance'    // Schedule dates + variance badge
  | 'hoursBar'            // Visual hours bar (spent/allocated) + Log button
  | 'teamLoad'            // Avatar + team name + load badge
  | 'blockers'            // Blocker badges (RFI, Pending, etc.)
  // v2.1.0: Weight column for weighted progress
  | 'weight'              // Task weight percentage (for weighted project progress)
  // Custom field types
  | 'text'           // Custom text field
  | 'number'         // Custom number field
  | 'date'           // Custom date field
  | 'dropdown'       // Custom dropdown/select
  | 'checkbox';      // Custom checkbox/boolean

/**
 * Table column configuration for dynamic columns
 */
export interface TableColumn {
  /** Unique column identifier */
  id: string;
  /** Column type */
  type: ColumnType;
  /** Display label */
  label: string;
  /** Column width in pixels */
  width: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Is column visible */
  visible: boolean;
  /** Can be sorted */
  sortable?: boolean;
  /** Can be resized */
  resizable?: boolean;
  /** For custom fields - reference to field definition */
  customFieldId?: string;
  /** For dropdown type - available options */
  options?: string[];
}

/**
 * Custom field definition for user-created fields
 */
export interface CustomFieldDefinition {
  /** Unique field ID */
  id: string;
  /** Field display name */
  name: string;
  /** Field type */
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  /** Options for dropdown type */
  options?: string[];
  /** Default value */
  defaultValue?: string | number | boolean | Date;
  /** Is field required */
  required?: boolean;
  /** Project this field belongs to */
  projectId?: string;
}

/**
 * Custom field value stored on task
 */
export interface CustomFieldValue {
  fieldId: string;
  value: string | number | boolean | Date | null;
}

/**
 * Context menu action types
 */
export type ContextMenuAction =
  | 'edit'
  | 'changeStatus'
  | 'changePriority'
  | 'assignUser'
  | 'duplicate'
  | 'delete'
  | 'sortAsc'
  | 'sortDesc'
  | 'hideColumn'
  | 'moveLeft'
  | 'moveRight';

/**
 * Context menu state
 */
export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'task' | 'header';
  task?: Task;
  columnId?: string;
}

/**
 * Sortable columns in the list view
 * @deprecated Use ColumnType instead
 */
export type ListSortColumn =
  | 'name'
  | 'startDate'
  | 'endDate'
  | 'progress'
  | 'status'
  | 'assignees'
  | 'priority';

/**
 * Sort configuration
 */
export interface ListSort {
  column: ListSortColumn;
  direction: SortDirection;
}

/**
 * Filter configuration for list view
 */
export interface ListFilter {
  search?: string;
  status?: Array<'todo' | 'in-progress' | 'completed'>;
  assignees?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  showCompleted?: boolean;
}

/**
 * Column configuration for list view
 */
export interface ListColumn {
  id: ListSortColumn | 'actions';
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  visible: boolean;
  sortable: boolean;
  resizable?: boolean;
}

/**
 * Theme configuration for list view
 */
export interface ListViewTheme {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgHover: string;
  bgSelected: string;
  bgAlternate: string;

  // Borders
  border: string;
  borderLight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent colors
  accent: string;
  accentHover: string;
  accentLight: string;

  // Status colors
  statusTodo: string;
  statusInProgress: string;
  statusCompleted: string;

  // Interactive
  focusRing: string;
  checkboxBg: string;
  checkboxChecked: string;

  // Chronos V2.0 extended tokens
  bgGroupHeader: string;
  headerBg: string;
  neonRed: string;
  neonGreen: string;
  neonAmber: string;
  neonBlue: string;
}

/**
 * Permissions for list view operations
 */
export interface ListViewPermissions {
  canCreateTask?: boolean;
  /** v1.4.10: When true, user can only create subtasks (not root-level tasks) */
  canCreateSubtaskOnly?: boolean;
  canUpdateTask?: boolean;
  canDeleteTask?: boolean;
  canBulkSelect?: boolean;
  canExport?: boolean;
  canSort?: boolean;
  canFilter?: boolean;
  canReorder?: boolean;
}

/**
 * v2.0.0: Project Health data for sidebar panel
 */
export interface ProjectHealthData {
  openRFIs?: number;
  submittalsApprovalPercent?: number;
  scheduleVarianceDays?: number;
  scheduleVarianceLabel?: string;
  teams?: Array<{ name: string; color: string; utilizationPercent: number }>;
  /** Total hours for the whole project (spent / allocated in minutes) */
  totalHoursSpentMinutes?: number;
  totalHoursAllocatedMinutes?: number;
}

/**
 * ListView configuration
 */
export interface ListViewConfig {
  /** Theme: 'dark' | 'light' | 'neutral' */
  theme?: 'dark' | 'light' | 'neutral';
  /** Locale for i18n */
  locale?: 'en' | 'es' | string;
  /** Custom translations */
  customTranslations?: Partial<ListViewTranslations>;
  /** Enable row selection */
  enableSelection?: boolean;
  /** Enable multi-select with checkboxes */
  enableMultiSelect?: boolean;
  /** Show search bar */
  showSearch?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Show hierarchy indentation */
  showHierarchy?: boolean;
  /** Columns to display (legacy) */
  columns?: ListColumn[];
  /** Row height in pixels */
  rowHeight?: number;
  /** Available users for filtering */
  availableUsers?: User[];
  /** Permissions */
  permissions?: ListViewPermissions;
  /** Enable virtual scrolling for large lists */
  enableVirtualization?: boolean;
  /** Items per page (0 = no pagination) */
  pageSize?: number;

  // v0.18.0: New column customization options
  /** Dynamic table columns configuration */
  tableColumns?: TableColumn[];
  /** Allow user to add/remove/reorder columns via "+" button */
  allowColumnCustomization?: boolean;
  /** Allow user to resize columns by dragging */
  allowColumnResize?: boolean;
  /** Enable context menu on right-click */
  enableContextMenu?: boolean;

  // v0.18.0: Create task button (same as Gantt and Calendar)
  /** Show create task button in toolbar */
  showCreateTaskButton?: boolean;
  /** Callback when create task button is clicked */
  onCreateTask?: () => void;

  // v0.18.3: Persist filter state in localStorage
  /** LocalStorage key for persisting filter state, or false to disable */
  persistFilter?: string | false;

  // v2.0.0: Chronos project health sidebar
  /** Configuration for project health sidebar panel */
  healthSidebar?: { enabled: boolean; data: ProjectHealthData };
  /** Aggregate child hours into parent row hoursBar cell (default: false) */
  aggregateParentHours?: boolean;

  // v1.4.9: Governance v2.0 - Financial data blur
  /**
   * Configuration for blurring financial data based on user permissions
   * When enabled, financial columns (soldEffortMinutes, quotedTime) will be blurred
   */
  financialBlur?: {
    /** Whether to blur financial time columns */
    enabled: boolean;
    /** Specific columns to blur (defaults to ['soldEffortMinutes', 'quotedTime'] if not specified) */
    columns?: Array<'soldEffortMinutes' | 'quotedTime' | 'quotedTimeMinutes'>;
  };

  // v2.2.1: Show "Ofertado: Xh" line in HoursBarCell for users who can view but not edit financials
  /** When true, shows the sold effort line in HoursBarCell even without onSoldEffortUpdate callback */
  showSoldEffort?: boolean;

  // v2.3.0: Financial lens — show dollar values instead of hours
  /** Display mode: 'hours' shows time values, 'financial' converts to dollars (hours × hourlyRate) */
  lens?: 'hours' | 'financial';
  /** Hourly rate for converting hours → dollars when lens='financial' */
  hourlyRate?: number;

  // v2.4.0: Project totals sticky footer row
  /** Show a sticky "TOTAL PROJECT" row at the bottom of the list */
  showProjectTotals?: boolean;
}

/**
 * ListView translations
 */
export interface ListViewTranslations {
  // Column headers
  columns: {
    name: string;
    startDate: string;
    endDate: string;
    progress: string;
    status: string;
    assignees: string;
    priority: string;
    actions: string;
    // v0.18.3: Time tracking columns
    estimatedTime?: string;
    // v1.1.0: Quoted time column
    quotedTime?: string;
    elapsedTime?: string;
    tags?: string;
    // v2.0.0: Chronos columns
    scheduleVariance?: string;
    hoursBar?: string;
    teamLoad?: string;
    blockers?: string;
    weight?: string;
  };

  // Toolbar
  toolbar: {
    search: string;
    searchPlaceholder: string;
    filter: string;
    clearFilters: string;
    export: string;
    columns: string;
    newTask: string;
  };

  // Filters
  filters: {
    status: string;
    assignees: string;
    dateRange: string;
    showCompleted: string;
    all: string;
    none: string;
  };

  // Status labels
  status: {
    todo: string;
    inProgress: string;
    completed: string;
  };

  // Actions
  actions: {
    edit: string;
    delete: string;
    duplicate: string;
    viewDetails: string;
  };

  // Empty states
  empty: {
    noTasks: string;
    noResults: string;
    addFirstTask: string;
  };

  // Pagination
  pagination: {
    showing: string;
    of: string;
    tasks: string;
    previous: string;
    next: string;
  };

  // Bulk actions
  bulk: {
    selected: string;
    delete: string;
    move: string;
    assignTo: string;
  };
}

/**
 * Callback functions for ListView
 */
export interface ListViewCallbacks {
  /** Task click handler */
  onTaskClick?: (task: Task) => void;
  /** Task double-click handler */
  onTaskDoubleClick?: (task: Task) => void;
  /** Task update handler */
  onTaskUpdate?: (task: Task) => void;
  /** Task delete handler */
  onTaskDelete?: (taskId: string) => void;
  /** Task create handler */
  onTaskCreate?: (parentId?: string) => void;
  /** Bulk delete handler */
  onBulkDelete?: (taskIds: string[]) => void;
  /** Sort change handler */
  onSortChange?: (sort: ListSort) => void;
  /** Filter change handler */
  onFilterChange?: (filter: ListFilter) => void;
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Row expand/collapse handler */
  onTaskToggleExpand?: (taskId: string) => void;
  /** Export handler */
  onExport?: (format: 'csv' | 'json' | 'excel') => void;

  // v0.18.0: New callbacks for column customization and context menu
  /** Columns configuration changed (visibility, order, width) */
  onColumnsChange?: (columns: TableColumn[]) => void;
  /** Task edit requested (from context menu) */
  onTaskEdit?: (task: Task) => void;
  /** Task duplicate requested (from context menu) */
  onTaskDuplicate?: (task: Task) => void;
  /** Create custom field */
  onCreateCustomField?: (field: CustomFieldDefinition) => Promise<void>;

  // v1.3.0: Time logging callback for timeLoggedMinutes column (inline edit)
  /** Handler for inline time logging - receives task, minutes, and optional note */
  onLogTime?: (task: Task, minutes: number | null, note?: string) => void;

  // v2.0.0: Chronos Time Manager callback
  /** Handler for opening time log modal from HoursBar cell */
  onOpenTimeLog?: (task: Task) => void;

  // v2.2.0: Inline estimate & quoted effort editing from HoursBar 3-option menu
  /** Handler for updating task effort estimate (minutes) */
  onEstimateUpdate?: (task: Task, minutes: number | null) => void;
  /** Handler for updating task sold/quoted effort (minutes) */
  onSoldEffortUpdate?: (task: Task, minutes: number | null) => void;

  // v2.1.0: RBAC context menu actions
  /** Handler for reporting a blocker on a task */
  onReportBlocker?: (task: Task) => void;
  /** Handler for copying task link to clipboard */
  onCopyTaskLink?: (task: Task) => void;
}

/**
 * Available user for assignment
 */
export interface AvailableUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color?: string;
  /** v1.4.0: Workload indicator for Smart Dropdown */
  workload?: UserWorkload;
}

/**
 * v1.4.0: User workload indicator for Smart Dropdown
 * Shows user capacity in the assignment dropdown
 */
export interface UserWorkload {
  /** Total hours assigned this week */
  assignedHoursThisWeek: number;
  /** Total hours capacity per week (typically 40) */
  weeklyCapacity: number;
  /** Number of active tasks assigned */
  activeTasks: number;
  /** Workload level for visual indicator */
  level: 'light' | 'moderate' | 'heavy' | 'overloaded';
}

/**
 * Main ListView props
 */
export interface ListViewProps {
  /** Tasks to display */
  tasks: Task[];
  /** Configuration */
  config?: ListViewConfig;
  /** Callbacks */
  callbacks?: ListViewCallbacks;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | string;
  /** Custom CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;

  // v0.18.0: New props for column customization
  /** Available users for assignment in context menu */
  availableUsers?: AvailableUser[];
  /** Custom fields defined for this project */
  customFields?: CustomFieldDefinition[];

  // v2.1.0: Toolbar customization
  /** Render custom content on the right side of toolbar (before create button) */
  toolbarRightContent?: ReactNode;
}

/**
 * Flattened task with hierarchy info
 */
export interface FlattenedTask extends Task {
  level: number;
  hasChildren: boolean;
  parentPath: string[];
}

/**
 * Default columns configuration
 * Used when no tableColumns are provided
 */
export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'name', type: 'name', label: 'Name', width: 300, visible: true, sortable: true, resizable: true },
  { id: 'status', type: 'status', label: 'Status', width: 140, visible: true, sortable: true, resizable: true },
  { id: 'priority', type: 'priority', label: 'Priority', width: 100, visible: false, sortable: true, resizable: true },
  { id: 'assignees', type: 'assignees', label: 'Assignees', width: 150, visible: false, sortable: false, resizable: true },
  { id: 'startDate', type: 'startDate', label: 'Start Date', width: 120, visible: true, sortable: true, resizable: true },
  { id: 'endDate', type: 'endDate', label: 'End Date', width: 120, visible: true, sortable: true, resizable: true },
  { id: 'progress', type: 'progress', label: 'Progress', width: 100, visible: true, sortable: true, resizable: true },
  { id: 'tags', type: 'tags', label: 'Tags', width: 150, visible: false, sortable: false, resizable: true },
  // v1.2.0: Three-tier time tracking columns — order: Quoted → Estimated → Executed
  { id: 'soldEffortMinutes', type: 'soldEffortMinutes', label: 'Quoted', width: 100, visible: false, sortable: true, resizable: true },
  { id: 'effortMinutes', type: 'effortMinutes', label: 'Estimated', width: 100, visible: false, sortable: true, resizable: true },
  { id: 'timeLoggedMinutes', type: 'timeLoggedMinutes', label: 'Executed', width: 100, visible: false, sortable: true, resizable: true },
  // v2.0.0: Chronos Interactive Time Manager columns
  { id: 'scheduleVariance', type: 'scheduleVariance', label: 'Sched / Var', width: 180, visible: false, sortable: true, resizable: true },
  { id: 'hoursBar', type: 'hoursBar', label: 'Hours', width: 200, visible: false, sortable: true, resizable: true },
  { id: 'teamLoad', type: 'teamLoad', label: 'Team Load', width: 160, visible: false, sortable: true, resizable: true },
  { id: 'blockers', type: 'blockers', label: 'Blockers', width: 150, visible: false, sortable: false, resizable: true },
  // v2.1.0: Weight column
  { id: 'weight', type: 'weight', label: 'Weight', width: 80, visible: false, sortable: true, resizable: true },
];

/**
 * Standard field definitions (non-custom)
 * Used in column selector to show available fields
 */
export const STANDARD_FIELDS: Array<{ type: ColumnType; labelKey: string; icon: string }> = [
  { type: 'name', labelKey: 'columns.name', icon: 'Type' },
  { type: 'status', labelKey: 'columns.status', icon: 'CircleDot' },
  { type: 'priority', labelKey: 'columns.priority', icon: 'Flag' },
  { type: 'assignees', labelKey: 'columns.assignees', icon: 'Users' },
  { type: 'startDate', labelKey: 'columns.startDate', icon: 'Calendar' },
  { type: 'endDate', labelKey: 'columns.endDate', icon: 'CalendarCheck' },
  { type: 'progress', labelKey: 'columns.progress', icon: 'BarChart' },
  { type: 'tags', labelKey: 'columns.tags', icon: 'Tag' },
  // v1.2.0: Three-tier time tracking fields (replaces old estimatedTime/quotedTime/elapsedTime)
  { type: 'effortMinutes', labelKey: 'columns.effortMinutes', icon: 'Clock' },
  { type: 'timeLoggedMinutes', labelKey: 'columns.timeLoggedMinutes', icon: 'Timer' },
  { type: 'soldEffortMinutes', labelKey: 'columns.soldEffortMinutes', icon: 'FileText' },
  // v2.0.0: Chronos Interactive Time Manager fields
  { type: 'scheduleVariance', labelKey: 'columns.scheduleVariance', icon: 'CalendarClock' },
  { type: 'hoursBar', labelKey: 'columns.hoursBar', icon: 'BarChart3' },
  { type: 'teamLoad', labelKey: 'columns.teamLoad', icon: 'Users' },
  { type: 'blockers', labelKey: 'columns.blockers', icon: 'AlertTriangle' },
  // v2.1.0: Weight
  { type: 'weight', labelKey: 'columns.weight', icon: 'Scale' },
];

/**
 * Custom field type definitions
 * Used in "Create Field" modal
 */
export const CUSTOM_FIELD_TYPES: Array<{ type: CustomFieldDefinition['type']; labelKey: string; icon: string }> = [
  { type: 'text', labelKey: 'customFields.text', icon: 'Type' },
  { type: 'number', labelKey: 'customFields.number', icon: 'Hash' },
  { type: 'date', labelKey: 'customFields.date', icon: 'Calendar' },
  { type: 'dropdown', labelKey: 'customFields.dropdown', icon: 'ChevronDown' },
  { type: 'checkbox', labelKey: 'customFields.checkbox', icon: 'CheckSquare' },
];
