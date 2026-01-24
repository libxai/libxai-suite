/**
 * CalendarBoard Component Types
 * @version 0.17.241
 */

import type { Task, TaskTag } from '../Gantt/types';
import type { User, Attachment, TimeEntry, TimeTrackingSummary, TimerState, TimeLogInput } from '../../types';

/**
 * Calendar view modes
 */
export type CalendarViewMode = 'month' | 'week' | 'day';

/**
 * Day of the week (0 = Sunday, 6 = Saturday)
 */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Calendar event (task displayed on calendar)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  status?: 'todo' | 'in-progress' | 'completed';
  progress?: number;
  assignees?: Task['assignees'];
  task: Task;
}

/**
 * Calendar day info
 */
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

/**
 * Theme configuration for calendar
 */
export interface CalendarTheme {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgHover: string;
  bgToday: string;
  bgWeekend: string;
  bgOtherMonth: string;

  // Borders
  border: string;
  borderLight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textToday: string;

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
}

/**
 * Permissions for calendar operations
 */
export interface CalendarPermissions {
  canCreateTask?: boolean;
  /** v1.4.10: When true, user can only create subtasks (not root-level tasks) */
  canCreateSubtaskOnly?: boolean;
  canUpdateTask?: boolean;
  canDeleteTask?: boolean;
  canDragDrop?: boolean;
  canResize?: boolean;
}

/**
 * CalendarBoard configuration
 */
export interface CalendarConfig {
  /** Theme: 'dark' | 'light' | 'neutral' */
  theme?: 'dark' | 'light' | 'neutral';
  /** Locale for i18n */
  locale?: 'en' | 'es' | string;
  /** Custom translations */
  customTranslations?: Partial<CalendarTranslations>;
  /** Default view mode */
  defaultView?: CalendarViewMode;
  /** First day of week (0 = Sunday, 1 = Monday, etc.) */
  firstDayOfWeek?: WeekDay;
  /** Show week numbers */
  showWeekNumbers?: boolean;
  /** Show mini calendar in sidebar */
  showMiniCalendar?: boolean;
  /** Max events to show per day before "+N more" */
  maxEventsPerDay?: number;
  /** Available users for filtering */
  availableUsers?: User[];
  /** Permissions */
  permissions?: CalendarPermissions;
  /** Enable drag and drop */
  enableDragDrop?: boolean;
  /** Show task details on hover */
  showTooltip?: boolean;
}

/**
 * CalendarBoard translations
 */
export interface CalendarTranslations {
  // Navigation
  navigation: {
    today: string;
    previous: string;
    next: string;
    month: string;
    week: string;
    day: string;
  };

  // Weekdays (short)
  weekdays: {
    sun: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
  };

  // Weekdays (full)
  weekdaysFull: {
    sunday: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
  };

  // Months
  months: {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
  };

  // Status labels
  status: {
    todo: string;
    inProgress: string;
    completed: string;
  };

  // Labels
  labels: {
    allDay: string;
    moreEvents: string;
    noEvents: string;
    newTask: string;
    viewAll: string;
    week: string;
  };

  // Tooltips
  tooltips: {
    progress: string;
    status: string;
    assignees: string;
    duration: string;
    days: string;
  };
}

/**
 * Callback functions for CalendarBoard
 */
export interface CalendarCallbacks {
  /** Event click handler */
  onEventClick?: (event: CalendarEvent) => void;
  /** Event double-click handler */
  onEventDoubleClick?: (event: CalendarEvent) => void;
  /** Date click handler (create new task) */
  onDateClick?: (date: Date) => void;
  /** Task update after drag/drop */
  onTaskUpdate?: (task: Task) => void;
  /** Task delete handler */
  onTaskDelete?: (taskId: string) => void;
  /** View change handler */
  onViewChange?: (view: CalendarViewMode) => void;
  /** Date range change handler */
  onDateRangeChange?: (start: Date, end: Date) => void;
  /** v0.17.99: Quick create task handler */
  onTaskCreate?: (taskData: Partial<Task>) => void;
  /** v0.17.241: Upload attachments handler */
  onUploadAttachments?: (taskId: string, files: File[]) => Promise<void>;
  /** v0.17.241: Delete attachment handler */
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
}

/**
 * Main CalendarBoard props
 */
export interface CalendarBoardProps {
  /** Tasks to display */
  tasks: Task[];
  /** Configuration */
  config?: CalendarConfig;
  /** Callbacks */
  callbacks?: CalendarCallbacks;
  /** Initial date to display */
  initialDate?: Date;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | string;
  /** Custom CSS class */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Available tags in workspace for selection */
  availableTags?: TaskTag[];
  /** Callback to create a new tag */
  onCreateTag?: (name: string, color: string) => Promise<TaskTag | null>;
  /** v0.17.241: Attachments map by task ID */
  attachmentsByTask?: Map<string, Attachment[]>;

  /** v0.17.254: Comments for TaskDetailModal */
  comments?: Array<{
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    user?: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;

  /** v0.17.254: Callback to add a comment (with optional attachments) */
  onAddComment?: (taskId: string, content: string, mentionedUserIds?: string[], attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>) => Promise<void>;

  /** v0.17.425: Upload comment attachments callback */
  onUploadCommentAttachments?: (files: File[]) => Promise<Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>>;

  /** v0.17.254: Current user info for comment input */
  currentUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
  };

  /** v0.17.254: Callback when task is opened in modal (to load comments) */
  /** v0.17.401: Users available for @mentions in comments */
  mentionableUsers?: Array<{
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    color?: string;
  }>;

  onTaskOpen?: (taskId: string) => void;

  // ========================================================================
  // v1.1.0: Time Tracking props
  // ========================================================================

  /** Enable time tracking features in TaskDetailModal */
  enableTimeTracking?: boolean;

  /** Time tracking summary for the currently open task */
  timeTrackingSummary?: TimeTrackingSummary;

  /** Time entries for the currently open task */
  timeEntries?: TimeEntry[];

  /** Current timer state */
  timerState?: TimerState;

  /** Callback to log time manually */
  onLogTime?: (taskId: string, input: TimeLogInput) => Promise<void>;

  /** Callback to update task estimate */
  onUpdateEstimate?: (taskId: string, minutes: number | null) => Promise<void>;

  /** Callback to update sold effort (quoted time) */
  onUpdateSoldEffort?: (taskId: string, minutes: number | null) => Promise<void>;

  /** Callback to start timer */
  onStartTimer?: (taskId: string) => void;

  /** Callback to stop timer and save time */
  onStopTimer?: (taskId: string) => void;

  /** Callback to discard timer without saving */
  onDiscardTimer?: (taskId: string) => void;

  // ========================================================================
  // v1.4.11: Governance v2.0 - Financial blur
  // ========================================================================

  /** Blur financial data (tiempo ofertado) for unauthorized users */
  blurFinancials?: boolean;
}
