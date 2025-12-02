/**
 * ListView Component Types
 * @version 0.17.0
 */

import type { Task } from '../Gantt/types';
import type { User } from '../../types';

/**
 * Sort direction for list columns
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sortable columns in the list view
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
}

/**
 * Permissions for list view operations
 */
export interface ListViewPermissions {
  canCreateTask?: boolean;
  canUpdateTask?: boolean;
  canDeleteTask?: boolean;
  canBulkSelect?: boolean;
  canExport?: boolean;
  canSort?: boolean;
  canFilter?: boolean;
  canReorder?: boolean;
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
  /** Columns to display */
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
}

/**
 * Flattened task with hierarchy info
 */
export interface FlattenedTask extends Task {
  level: number;
  hasChildren: boolean;
  parentPath: string[];
}
