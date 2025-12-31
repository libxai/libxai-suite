/**
 * CalendarBoard Component
 * Professional calendar view for task management
 * Based on SaaS ProjectCalendar component styles
 * @version 0.17.243
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCircle2,
  Circle,
  PlayCircle,
  X,
  Flag,
  User,
  CalendarDays,
  Clock,
  Tag,
  Link2,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Plus,
  ListChecks,
  Upload,
  Maximize2,
  Trash2,
  File,
  Image,
  FileText as FileTextIcon,
  Palette,
  Diamond,
  Send,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type { Attachment } from '../../types';
import type { CalendarBoardProps, CalendarDay } from './types';
import { mergeCalendarTranslations } from './i18n';
import { cn } from '../../utils';
import { TagPicker } from '../Gantt/TagPicker';
import { TASK_COLORS } from '../Gantt/ColorPicker';

/**
 * Flatten hierarchical tasks to flat list
 */
function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];

  function traverse(taskList: Task[]) {
    for (const task of taskList) {
      result.push(task);
      if (task.subtasks?.length) {
        traverse(task.subtasks);
      }
    }
  }

  traverse(tasks);
  return result;
}

/**
 * Check if a date falls within a task's date range
 */
function isDateInTaskRange(date: Date, task: Task): boolean {
  if (!task.startDate || !task.endDate) return false;

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly = new Date(task.startDate.getFullYear(), task.startDate.getMonth(), task.startDate.getDate());
  const endOnly = new Date(task.endDate.getFullYear(), task.endDate.getMonth(), task.endDate.getDate());

  return dateOnly >= startOnly && dateOnly <= endOnly;
}

/**
 * Status Icon component
 */
function StatusIcon({ task }: { task: Task }) {
  if (task.progress === 100 || task.status === 'completed') {
    return <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />;
  }
  if ((task.progress && task.progress > 0) || task.status === 'in-progress') {
    return <PlayCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />;
  }
  return <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />;
}

/**
 * Main CalendarBoard Component
 */
export function CalendarBoard({
  tasks,
  config = {},
  callbacks = {},
  initialDate,
  isLoading = false,
  error,
  className,
  style,
  availableTags = [],
  onCreateTag,
  attachmentsByTask,
  comments,
  onAddComment,
  currentUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mentionableUsers: _mentionableUsers, // TODO: Implement MentionInput in CalendarBoard
  onTaskOpen,
}: CalendarBoardProps) {
  const {
    theme: themeName = 'dark',
    locale = 'en',
    customTranslations,
  } = config;

  const t = mergeCalendarTranslations(locale, customTranslations);
  const isDark = themeName === 'dark';

  // Theme object for TagPicker
  const tagPickerTheme = {
    textTertiary: isDark ? '#6B7280' : '#9CA3AF',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    borderLight: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    bgPrimary: isDark ? '#1A1D25' : '#FFFFFF',
    bgSecondary: isDark ? '#0F1117' : '#F9FAFB',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  // State
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null); // v0.17.83: For "+X more" popover
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null); // v0.17.84: ClickUp style date picker
  const [datePickerMonth, setDatePickerMonth] = useState(new Date()); // Current month in date picker
  // v0.17.91: Track expanded cells - key is day index, value is number of visible tasks
  const [expandedCells, setExpandedCells] = useState<Record<number, number>>({});
  const DEFAULT_VISIBLE_TASKS = 4; // Show 4 tasks by default
  const TASKS_INCREMENT = 3; // Show 3 more tasks each time user clicks "more"

  // v0.17.92: Modal dropdown states for interactive editing
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);

  // v0.17.99: Quick create task popover state (per cell)
  const [quickCreateCell, setQuickCreateCell] = useState<number | null>(null); // Which cell index has the popover open
  const [quickCreateName, setQuickCreateName] = useState('');
  // v0.17.104: Quick create functional dropdowns
  const [quickCreatePriority, setQuickCreatePriority] = useState<Task['priority']>(undefined);
  const [quickCreateAssignee, setQuickCreateAssignee] = useState<string | null>(null);
  const [showQuickPriorityDropdown, setShowQuickPriorityDropdown] = useState(false);
  const [showQuickAssigneeDropdown, setShowQuickAssigneeDropdown] = useState(false);
  // v0.17.105: Quick create date picker
  const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);
  const [showQuickDatePicker, setShowQuickDatePicker] = useState(false);
  const [quickDatePickerMonth, setQuickDatePickerMonth] = useState(new Date());

  // v0.17.241: Attachment states for modal
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // v0.17.243: Dependencies states for modal
  const [showDependenciesDropdown, setShowDependenciesDropdown] = useState(false);
  const [dependencySearch, setDependencySearch] = useState('');

  // v0.17.244: Color picker state for modal
  const [showColorPicker, setShowColorPicker] = useState(false);

  // v0.17.255: Comment input state (to match TaskDetailModal UI)
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const flatTaskList = flattenTasks(tasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthDays = startDay;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: flatTaskList.filter(t => isDateInTaskRange(date, t)).map(task => ({
          id: task.id,
          title: task.name,
          start: task.startDate!,
          end: task.endDate!,
          task,
        })),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.getTime() === today.getTime();
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: flatTaskList.filter(t => isDateInTaskRange(date, t)).map(task => ({
          id: task.id,
          title: task.name,
          start: task.startDate!,
          end: task.endDate!,
          task,
        })),
      });
    }

    // Next month days (fill to complete 6 rows)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events: flatTaskList.filter(t => isDateInTaskRange(date, t)).map(task => ({
          id: task.id,
          title: task.name,
          start: task.startDate!,
          end: task.endDate!,
          task,
        })),
      });
    }

    return days;
  }, [currentDate, tasks]);

  // Day names
  const dayNames = locale === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month name
  const monthName = currentDate.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  // v0.17.92: Update task field helper
  const updateTaskField = useCallback((field: keyof Task, value: any) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, [field]: value };
    setSelectedTask(updatedTask);
    callbacks.onTaskUpdate?.(updatedTask);
  }, [selectedTask, callbacks]);

  // v0.17.92: Update task status with progress sync
  const updateTaskStatus = useCallback((status: string) => {
    if (!selectedTask) return;
    let progress = selectedTask.progress || 0;
    if (status === 'completed') progress = 100;
    else if (status === 'todo') progress = 0;
    const updatedTask = { ...selectedTask, status, progress };
    setSelectedTask(updatedTask);
    callbacks.onTaskUpdate?.(updatedTask);
    setShowStatusDropdown(false);
  }, [selectedTask, callbacks]);

  // v0.17.92: Update task dates
  const updateTaskDates = useCallback((startDate: Date | undefined, endDate: Date | undefined) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, startDate, endDate };
    setSelectedTask(updatedTask);
    callbacks.onTaskUpdate?.(updatedTask);
  }, [selectedTask, callbacks]);

  // v0.17.92: Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowStatusDropdown(false);
    setShowPriorityDropdown(false);
    setShowAssigneesDropdown(false);
    setShowDatePicker(null);
    setShowDependenciesDropdown(false);
    setDependencySearch('');
    setShowColorPicker(false);
  }, []);

  // v0.17.241: Handle file drop for attachments
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (!selectedTask || !callbacks.onUploadAttachments) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      await callbacks.onUploadAttachments(selectedTask.id, files);
    } finally {
      setIsUploadingFiles(false);
    }
  }, [selectedTask, callbacks]);

  // v0.17.241: Handle file input change
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask || !callbacks.onUploadAttachments || !e.target.files) return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      await callbacks.onUploadAttachments(selectedTask.id, files);
    } finally {
      setIsUploadingFiles(false);
    }
    e.target.value = '';
  }, [selectedTask, callbacks]);

  // v0.17.241: Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  // v0.17.241: Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // v0.17.241: Get file icon based on type
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileTextIcon;
    return File;
  }, []);

  // v0.17.241: Get current task attachments
  const currentTaskAttachments: Attachment[] = useMemo(() => {
    if (!selectedTask || !attachmentsByTask) return [];
    return attachmentsByTask.get(selectedTask.id) || [];
  }, [selectedTask, attachmentsByTask]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-[#3B82F6]" />
          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {t.labels.noEvents}...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
              Error
            </h3>
            <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
              {typeof error === 'string' ? error : error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-[#3B82F6]" />
          </div>
          <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
            {t.labels.noEvents}
          </h3>
          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {t.labels.newTask}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col w-full h-full overflow-auto", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
      {/* Calendar Header */}
      <div className={cn("flex-shrink-0 px-6 py-4 border-b", isDark ? "border-white/10" : "border-gray-200")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className={cn("text-xl font-semibold capitalize", isDark ? "text-white" : "text-gray-900")}>
              {monthName}
            </h2>
            <button
              onClick={goToToday}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                isDark
                  ? "bg-white/5 text-white hover:bg-white/10"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {t.navigation.today}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
            >
              <ChevronLeft className={cn("w-5 h-5", isDark ? "text-[#9CA3AF]" : "text-gray-600")} />
            </button>
            <button
              onClick={goToNextMonth}
              className={cn("p-2 rounded-lg transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
            >
              <ChevronRight className={cn("w-5 h-5", isDark ? "text-[#9CA3AF]" : "text-gray-600")} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 min-h-0">
        <div className="flex flex-col">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className={cn("py-2 text-center text-xs font-medium uppercase", isDark ? "text-[#9CA3AF]" : "text-gray-500")}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days - v0.17.90: Auto-expanding rows to show all tasks like ClickUp */}
          {/* v0.17.136: Improved grid border visibility - bg-white/10 for clearer borders */}
          <div className={cn("grid grid-cols-7 auto-rows-min gap-px rounded-lg", isDark ? "bg-[#2D2D2D]" : "bg-gray-300")}>
            {calendarDays.map((day, index) => {
              // v0.17.87: Weekend detection (Saturday=6, Sunday=0)
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

              return (
              <div
                key={index}
                className={cn(
                  "min-h-[120px] p-2 transition-colors flex flex-col relative group",
                  // v0.17.136: ClickUp-style weekends - slightly lighter than weekdays
                  isDark
                    ? (isWeekend
                        ? "bg-[#1C1F26]"  // ALL weekends: subtle lighter gray
                        : (day.isCurrentMonth ? "bg-[#13161B]" : "bg-[#0D0F13]"))  // Weekdays: darker
                    : (isWeekend
                        ? "bg-gray-100"  // ALL weekends: same light gray
                        : (day.isCurrentMonth ? "bg-white" : "bg-gray-50")),  // Weekdays vary
                  day.isToday && "ring-2 ring-[#3B82F6] ring-inset"
                )}
              >
                {/* v0.17.91: Show tasks with expandable "more" button like ClickUp */}
                {(() => {
                  const visibleCount = expandedCells[index] || DEFAULT_VISIBLE_TASKS;
                  const visibleEvents = day.events.slice(0, visibleCount);
                  const remainingCount = day.events.length - visibleCount;

                  return (
                    <div className="space-y-1 flex-1">
                      {visibleEvents.map((event) => (
                        <div key={event.id} className="relative group">
                          <motion.button
                            onClick={() => {
                              setSelectedTask(event.task);
                              callbacks.onEventClick?.(event);
                              onTaskOpen?.(event.task.id);
                            }}
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                              "w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate",
                              event.task.progress === 100
                                ? (isDark ? "bg-green-500/20 text-green-400" : "bg-green-500/10 text-green-600")
                                : (isDark ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "bg-[#3B82F6]/10 text-[#3B82F6]")
                            )}
                          >
                            <StatusIcon task={event.task} />
                            <span className="truncate">{event.title}</span>
                          </motion.button>
                        </div>
                      ))}
                      {/* v0.17.91: "+X MÁS" / "+X MORE" button to expand cell */}
                      {remainingCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCells(prev => ({
                              ...prev,
                              [index]: visibleCount + TASKS_INCREMENT
                            }));
                          }}
                          className={cn(
                            "text-xs px-1.5 py-0.5 hover:underline cursor-pointer font-medium",
                            isDark ? "text-[#6B7280] hover:text-[#9CA3AF]" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          +{remainingCount} {locale === 'es' ? 'MÁS' : 'MORE'}
                        </button>
                      )}
                      {/* v0.17.91: "MENOS" / "LESS" button to collapse cell */}
                      {visibleCount > DEFAULT_VISIBLE_TASKS && day.events.length > DEFAULT_VISIBLE_TASKS && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCells(prev => ({
                              ...prev,
                              [index]: DEFAULT_VISIBLE_TASKS
                            }));
                          }}
                          className={cn(
                            "text-xs px-1.5 py-0.5 hover:underline cursor-pointer font-medium",
                            isDark ? "text-[#6B7280] hover:text-[#9CA3AF]" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {locale === 'es' ? 'MENOS' : 'LESS'}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* v0.17.103: Day Number + Quick create button - bottom right like ClickUp */}
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {/* v0.17.103: Quick create button with smart positioning */}
                  {(() => {
                    // Detect position: last 2 rows (index >= 28) open upward, last 2 columns (index % 7 >= 5) open left
                    const isNearBottom = index >= 28;
                    const isNearRight = index % 7 >= 5;

                    return (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quickCreateCell === index) {
                              setQuickCreateCell(null);
                            } else {
                              setQuickCreateCell(index);
                              setQuickCreateName('');
                              setQuickCreatePriority(undefined);
                              setQuickCreateAssignee(null);
                              setQuickCreateDate(null); // v0.17.105: Reset date (will use cell date by default)
                              setShowQuickPriorityDropdown(false);
                              setShowQuickAssigneeDropdown(false);
                              setShowQuickDatePicker(false);
                              setQuickDatePickerMonth(day.date); // Start with cell's month
                            }
                          }}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-all",
                            quickCreateCell === index
                              ? "opacity-100 bg-[#7C3AED] text-white"
                              : "opacity-0 group-hover:opacity-100",
                            isDark
                              ? "hover:bg-[#7C3AED] text-[#6B7280] hover:text-white"
                              : "hover:bg-[#7C3AED] text-gray-400 hover:text-white"
                          )}
                        >
                          <Plus className={cn("w-3.5 h-3.5 transition-transform", quickCreateCell === index && "rotate-45")} />
                        </button>

                        {/* Quick create popover - smart positioning */}
                        <AnimatePresence>
                          {quickCreateCell === index && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => {
                                  setQuickCreateCell(null);
                                  setQuickCreateName('');
                                  setQuickCreatePriority(undefined);
                                  setQuickCreateAssignee(null);
                                  setQuickCreateDate(null);
                                  setShowQuickPriorityDropdown(false);
                                  setShowQuickAssigneeDropdown(false);
                                  setShowQuickDatePicker(false);
                                }}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: isNearBottom ? -5 : 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: isNearBottom ? -5 : 5, scale: 0.95 }}
                                transition={{ duration: 0.12 }}
                                className={cn(
                                  "absolute w-[320px] rounded-lg shadow-2xl z-50",
                                  // Vertical position: bottom or top
                                  isNearBottom ? "bottom-full mb-1" : "top-full mt-1",
                                  // Horizontal position: left or right
                                  isNearRight ? "right-0" : "left-0",
                                  isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // v0.17.107: Close any open dropdown when clicking inside the main popover
                                  setShowQuickPriorityDropdown(false);
                                  setShowQuickAssigneeDropdown(false);
                                  setShowQuickDatePicker(false);
                                }}
                              >
                                <div className="p-2.5">
                                  <input
                                    type="text"
                                    value={quickCreateName}
                                    onChange={(e) => setQuickCreateName(e.target.value)}
                                    placeholder={locale === 'es' ? 'Escribe el nombre de la tarea o "/" para los comandos' : 'Type task name or "/" for commands'}
                                    className={cn(
                                      "w-full bg-transparent text-sm outline-none placeholder:opacity-40",
                                      isDark ? "text-white" : "text-gray-900"
                                    )}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && quickCreateName.trim()) {
                                        // v0.17.105: Include priority, assignee, and selected date in task creation
                                        const selectedUser = config.availableUsers?.find(u => u.id === quickCreateAssignee);
                                        const taskDate = quickCreateDate || day.date;
                                        callbacks.onTaskCreate?.({
                                          name: quickCreateName.trim(),
                                          startDate: taskDate,
                                          endDate: taskDate,
                                          priority: quickCreatePriority,
                                          assignees: selectedUser ? [selectedUser] : undefined,
                                        });
                                        setQuickCreateName('');
                                        setQuickCreatePriority(undefined);
                                        setQuickCreateAssignee(null);
                                        setQuickCreateDate(null);
                                        setQuickCreateCell(null);
                                      }
                                      if (e.key === 'Escape') {
                                        setQuickCreateCell(null);
                                        setQuickCreateName('');
                                        setQuickCreatePriority(undefined);
                                        setQuickCreateAssignee(null);
                                        setQuickCreateDate(null);
                                      }
                                    }}
                                  />
                                </div>
                                <div className={cn("px-2.5 py-2 flex items-center justify-between border-t", isDark ? "border-white/10" : "border-gray-100")}>
                                  <div className="flex items-center gap-1">
                                    {/* v0.17.104: Priority dropdown - functional */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowQuickPriorityDropdown(!showQuickPriorityDropdown);
                                          setShowQuickAssigneeDropdown(false);
                                        }}
                                        className={cn(
                                          "p-1 rounded transition-colors",
                                          quickCreatePriority
                                            ? quickCreatePriority === 'urgent' || quickCreatePriority === 'high'
                                              ? "text-red-400 bg-red-500/20"
                                              : quickCreatePriority === 'medium'
                                                ? "text-yellow-400 bg-yellow-500/20"
                                                : "text-green-400 bg-green-500/20"
                                            : isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400"
                                        )}
                                      >
                                        <Flag className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Priority Dropdown */}
                                      <AnimatePresence>
                                        {showQuickPriorityDropdown && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className={cn(
                                              "absolute left-0 bottom-full mb-1 z-[60] rounded-lg shadow-xl overflow-hidden min-w-[120px]",
                                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {[
                                              { id: 'urgent', label: locale === 'es' ? 'Urgente' : 'Urgent', color: 'bg-red-500' },
                                              { id: 'high', label: locale === 'es' ? 'Alta' : 'High', color: 'bg-orange-500' },
                                              { id: 'medium', label: locale === 'es' ? 'Media' : 'Medium', color: 'bg-yellow-500' },
                                              { id: 'low', label: locale === 'es' ? 'Baja' : 'Low', color: 'bg-green-500' },
                                              { id: undefined, label: locale === 'es' ? 'Sin prioridad' : 'No priority', color: 'bg-gray-400' },
                                            ].map((priority) => (
                                              <button
                                                key={priority.id || 'none'}
                                                onClick={() => {
                                                  setQuickCreatePriority(priority.id as Task['priority']);
                                                  setShowQuickPriorityDropdown(false);
                                                }}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                                  quickCreatePriority === priority.id && (isDark ? "bg-white/5" : "bg-gray-50")
                                                )}
                                              >
                                                <span className={cn("w-2 h-2 rounded-full", priority.color)} />
                                                <span className={isDark ? "text-white" : "text-gray-900"}>{priority.label}</span>
                                              </button>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {/* v0.17.105: Date picker dropdown - ClickUp style */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowQuickDatePicker(!showQuickDatePicker);
                                          setShowQuickPriorityDropdown(false);
                                          setShowQuickAssigneeDropdown(false);
                                          setQuickDatePickerMonth(quickCreateDate || day.date);
                                        }}
                                        className={cn(
                                          "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors",
                                          quickCreateDate
                                            ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                                            : isDark ? "bg-white/5 text-[#9CA3AF] hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        )}
                                      >
                                        <CalendarDays className="w-3 h-3" />
                                        {(quickCreateDate || day.date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
                                      </button>
                                      {/* Date Picker Dropdown */}
                                      <AnimatePresence>
                                        {showQuickDatePicker && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className={cn(
                                              "absolute left-0 bottom-full mb-1 z-[60] rounded-xl shadow-2xl overflow-hidden flex",
                                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {/* Quick Options - Left Side */}
                                            <div className={cn("w-40 py-2 border-r", isDark ? "border-white/10" : "border-gray-200")}>
                                              {(() => {
                                                const today = new Date();
                                                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                                                const nextSaturday = new Date(today); nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
                                                const nextMonday = new Date(today); nextMonday.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
                                                const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);
                                                const fourWeeks = new Date(today); fourWeeks.setDate(today.getDate() + 28);

                                                const quickOptions = [
                                                  { label: locale === 'es' ? 'Hoy' : 'Today', date: today, display: today.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                                  { label: locale === 'es' ? 'Mañana' : 'Tomorrow', date: tomorrow, display: tomorrow.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                                  { label: locale === 'es' ? 'Este fin de semana' : 'This weekend', date: nextSaturday, display: locale === 'es' ? 'sáb.' : 'sat.' },
                                                  { label: locale === 'es' ? 'Próxima semana' : 'Next week', date: nextMonday, display: locale === 'es' ? 'lun.' : 'mon.' },
                                                  { label: locale === 'es' ? '2 semanas' : '2 weeks', date: twoWeeks, display: twoWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                                  { label: locale === 'es' ? '4 semanas' : '4 weeks', date: fourWeeks, display: fourWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                                ];

                                                return quickOptions.map((option, i) => (
                                                  <button
                                                    key={i}
                                                    className={cn(
                                                      "w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors",
                                                      isDark ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                                                    )}
                                                    onClick={() => {
                                                      setQuickCreateDate(option.date);
                                                      setShowQuickDatePicker(false);
                                                    }}
                                                  >
                                                    <span>{option.label}</span>
                                                    <span className={cn("text-[10px]", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                                      {option.display}
                                                    </span>
                                                  </button>
                                                ));
                                              })()}
                                            </div>

                                            {/* Calendar - Right Side */}
                                            <div className="p-3">
                                              {/* Month Header */}
                                              <div className="flex items-center justify-between mb-3">
                                                <span className={cn("text-xs font-medium", isDark ? "text-white" : "text-gray-900")}>
                                                  {quickDatePickerMonth.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <div className="flex items-center gap-0.5">
                                                  <button
                                                    onClick={() => setQuickDatePickerMonth(new Date())}
                                                    className={cn(
                                                      "px-1.5 py-0.5 rounded text-[10px] transition-colors",
                                                      isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500"
                                                    )}
                                                  >
                                                    {locale === 'es' ? 'Hoy' : 'Today'}
                                                  </button>
                                                  <button
                                                    onClick={() => setQuickDatePickerMonth(new Date(quickDatePickerMonth.getFullYear(), quickDatePickerMonth.getMonth() - 1))}
                                                    className={cn("p-0.5 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                                  >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => setQuickDatePickerMonth(new Date(quickDatePickerMonth.getFullYear(), quickDatePickerMonth.getMonth() + 1))}
                                                    className={cn("p-0.5 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                                  >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Weekday Headers */}
                                              <div className="grid grid-cols-7 gap-0.5 mb-1">
                                                {(locale === 'es'
                                                  ? ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
                                                  : ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
                                                ).map((d) => (
                                                  <div key={d} className={cn("w-6 h-6 flex items-center justify-center text-[10px]", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                                    {d}
                                                  </div>
                                                ))}
                                              </div>

                                              {/* Calendar Days */}
                                              <div className="grid grid-cols-7 gap-0.5">
                                                {(() => {
                                                  const year = quickDatePickerMonth.getFullYear();
                                                  const month = quickDatePickerMonth.getMonth();
                                                  const firstDay = new Date(year, month, 1).getDay();
                                                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                  const daysInPrevMonth = new Date(year, month, 0).getDate();
                                                  const todayDate = new Date();
                                                  const calDays = [];

                                                  // Previous month days
                                                  for (let i = firstDay - 1; i >= 0; i--) {
                                                    calDays.push({ dayNum: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
                                                  }
                                                  // Current month days
                                                  for (let i = 1; i <= daysInMonth; i++) {
                                                    calDays.push({ dayNum: i, isCurrentMonth: true, date: new Date(year, month, i) });
                                                  }
                                                  // Next month days
                                                  const remaining = 42 - calDays.length;
                                                  for (let i = 1; i <= remaining; i++) {
                                                    calDays.push({ dayNum: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
                                                  }

                                                  return calDays.map((d, i) => {
                                                    const isToday = d.date.toDateString() === todayDate.toDateString();
                                                    const isSelected = (quickCreateDate || day.date).toDateString() === d.date.toDateString();

                                                    return (
                                                      <button
                                                        key={i}
                                                        className={cn(
                                                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors",
                                                          !d.isCurrentMonth && (isDark ? "text-[#4B5563]" : "text-gray-300"),
                                                          d.isCurrentMonth && (isDark ? "text-white" : "text-gray-900"),
                                                          isToday && "ring-1 ring-[#3B82F6]",
                                                          isSelected && "bg-[#7C3AED] text-white",
                                                          !isSelected && (isDark ? "hover:bg-white/10" : "hover:bg-gray-100")
                                                        )}
                                                        onClick={() => {
                                                          setQuickCreateDate(d.date);
                                                          setShowQuickDatePicker(false);
                                                        }}
                                                      >
                                                        {d.dayNum}
                                                      </button>
                                                    );
                                                  });
                                                })()}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {/* v0.17.104: Assignee dropdown - functional */}
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowQuickAssigneeDropdown(!showQuickAssigneeDropdown);
                                          setShowQuickPriorityDropdown(false);
                                        }}
                                        className={cn(
                                          "p-1 rounded transition-colors",
                                          quickCreateAssignee
                                            ? "text-[#7C3AED] bg-[#7C3AED]/20"
                                            : isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400"
                                        )}
                                      >
                                        {quickCreateAssignee ? (
                                          <div
                                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                                            style={{ backgroundColor: config.availableUsers?.find(u => u.id === quickCreateAssignee)?.color || '#7C3AED' }}
                                          >
                                            {config.availableUsers?.find(u => u.id === quickCreateAssignee)?.initials ||
                                             config.availableUsers?.find(u => u.id === quickCreateAssignee)?.name?.slice(0, 2).toUpperCase()}
                                          </div>
                                        ) : (
                                          <User className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      {/* Assignee Dropdown */}
                                      <AnimatePresence>
                                        {showQuickAssigneeDropdown && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className={cn(
                                              "absolute left-0 bottom-full mb-1 z-[60] rounded-lg shadow-xl overflow-hidden min-w-[160px] max-h-[200px] overflow-y-auto",
                                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {/* Unassigned option */}
                                            <button
                                              onClick={() => {
                                                setQuickCreateAssignee(null);
                                                setShowQuickAssigneeDropdown(false);
                                              }}
                                              className={cn(
                                                "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                                                isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                                !quickCreateAssignee && (isDark ? "bg-white/5" : "bg-gray-50")
                                              )}
                                            >
                                              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-gray-200")}>
                                                <User className="w-3 h-3 text-gray-400" />
                                              </div>
                                              <span className={isDark ? "text-[#9CA3AF]" : "text-gray-500"}>
                                                {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
                                              </span>
                                            </button>
                                            {/* Available users */}
                                            {config.availableUsers?.map((user) => (
                                              <button
                                                key={user.id}
                                                onClick={() => {
                                                  setQuickCreateAssignee(user.id);
                                                  setShowQuickAssigneeDropdown(false);
                                                }}
                                                className={cn(
                                                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                                  quickCreateAssignee === user.id && (isDark ? "bg-white/5" : "bg-gray-50")
                                                )}
                                              >
                                                <div
                                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium"
                                                  style={{ backgroundColor: user.color || '#7C3AED' }}
                                                >
                                                  {user.initials || user.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className={isDark ? "text-white" : "text-gray-900"}>{user.name}</span>
                                              </button>
                                            ))}
                                            {(!config.availableUsers || config.availableUsers.length === 0) && (
                                              <div className={cn("px-3 py-2 text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                                {locale === 'es' ? 'No hay usuarios disponibles' : 'No users available'}
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (quickCreateName.trim()) {
                                        // v0.17.105: Include priority, assignee, and selected date in task creation
                                        const selectedUser = config.availableUsers?.find(u => u.id === quickCreateAssignee);
                                        const taskDate = quickCreateDate || day.date;
                                        callbacks.onTaskCreate?.({
                                          name: quickCreateName.trim(),
                                          startDate: taskDate,
                                          endDate: taskDate,
                                          priority: quickCreatePriority,
                                          assignees: selectedUser ? [selectedUser] : undefined,
                                        });
                                        setQuickCreateName('');
                                        setQuickCreatePriority(undefined);
                                        setQuickCreateAssignee(null);
                                        setQuickCreateDate(null);
                                        setQuickCreateCell(null);
                                      }
                                    }}
                                    disabled={!quickCreateName.trim()}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                                      quickCreateName.trim()
                                        ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                                        : isDark ? "bg-white/5 text-[#4B5563]" : "bg-gray-100 text-gray-400"
                                    )}
                                  >
                                    {locale === 'es' ? 'Guardar' : 'Save'}
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {/* Day number */}
                  <span className={cn(
                    "text-sm font-medium",
                    day.isToday
                      ? "text-[#3B82F6]"
                      : day.isCurrentMonth
                        ? (isDark ? "text-white" : "text-gray-900")
                        : (isDark ? "text-[#6B7280]" : "text-gray-400")
                  )}>
                    {day.date.getDate()}
                  </span>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {/* v0.17.83: Task Modal - ClickUp Style */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedTask(null); setCommentText(''); }}
              className="fixed inset-0 bg-black/50 z-40"
            />
            {/* Modal - v0.17.86: Full screen modal like ClickUp (90% of viewport) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={cn(
                "fixed inset-4 md:inset-8 lg:inset-12 rounded-xl shadow-2xl z-50 flex overflow-hidden",
                isDark ? "bg-[#1A1D25]" : "bg-white"
              )}
            >
              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* v0.17.96: Header - ClickUp style with breadcrumb */}
                <div className={cn("px-6 py-3 border-b flex items-center gap-3", isDark ? "border-white/10" : "border-gray-200")}>
                  <div className="flex items-center gap-2">
                    <Circle className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                    <span className={cn("text-xs px-2 py-0.5 rounded", isDark ? "bg-white/10 text-[#9CA3AF]" : "bg-gray-100 text-gray-600")}>
                      {locale === 'es' ? 'Tarea' : 'Task'} ∨
                    </span>
                    <span className={cn("text-xs font-mono", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                      {selectedTask.id.slice(0, 8)}
                    </span>
                    <button className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                      isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    )}>
                      <Sparkles className="w-3 h-3" />
                      Ask AI
                    </button>
                  </div>
                  <div className="flex-1" />
                  <button
                    className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setSelectedTask(null); setCommentText(''); }}
                    className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* v0.17.96: Task Title - ClickUp style with checkbox */}
                <div className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        const newProgress = selectedTask.progress === 100 ? 0 : 100;
                        const newStatus = newProgress === 100 ? 'completed' : 'todo';
                        const updatedTask = { ...selectedTask, progress: newProgress, status: newStatus };
                        setSelectedTask(updatedTask);
                        callbacks.onTaskUpdate?.(updatedTask);
                      }}
                      className={cn(
                        "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        selectedTask.progress === 100
                          ? "bg-green-500 border-green-500"
                          : isDark ? "border-white/30 hover:border-white/50" : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {selectedTask.progress === 100 && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <h2 className={cn(
                      "text-xl font-semibold flex-1",
                      selectedTask.progress === 100 ? "line-through text-[#6B7280]" : (isDark ? "text-white" : "text-gray-900")
                    )}>
                      {selectedTask.name}
                    </h2>
                  </div>
                </div>

                {/* Fields Grid - v0.17.85: overflow-visible for date picker popover */}
                <div className="px-6 pb-6 flex-1 overflow-y-auto overflow-x-visible">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                    {/* Status - v0.17.92: Interactive dropdown */}
                    <div className="flex items-center gap-3 relative">
                      <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Estado' : 'Status'}
                      </span>
                      <button
                        onClick={() => {
                          closeAllDropdowns();
                          setShowStatusDropdown(!showStatusDropdown);
                        }}
                        className={cn(
                          "text-xs px-2 py-1 rounded font-medium cursor-pointer transition-all hover:ring-2 hover:ring-white/20",
                          selectedTask.progress === 100 || selectedTask.status === 'completed'
                            ? "bg-green-500/20 text-green-400"
                            : (selectedTask.progress && selectedTask.progress > 0) || selectedTask.status === 'in-progress'
                              ? "bg-blue-500/20 text-blue-400"
                              : isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {selectedTask.progress === 100 || selectedTask.status === 'completed'
                          ? (locale === 'es' ? 'COMPLETADO' : 'DONE')
                          : (selectedTask.progress && selectedTask.progress > 0) || selectedTask.status === 'in-progress'
                            ? (locale === 'es' ? 'EN PROGRESO' : 'IN PROGRESS')
                            : (locale === 'es' ? 'POR HACER' : 'TO DO')}
                      </button>
                      {/* Status Dropdown */}
                      <AnimatePresence>
                        {showStatusDropdown && (
                          <>
                            {/* v0.17.95: Overlay to close status dropdown on click outside */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowStatusDropdown(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[140px]",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                            >
                              {[
                                { id: 'todo', label: locale === 'es' ? 'Por hacer' : 'To Do', color: 'bg-white/10 text-white' },
                                { id: 'in-progress', label: locale === 'es' ? 'En progreso' : 'In Progress', color: 'bg-blue-500/20 text-blue-400' },
                                { id: 'completed', label: locale === 'es' ? 'Completado' : 'Done', color: 'bg-green-500/20 text-green-400' },
                              ].map((status) => (
                                <button
                                key={status.id}
                                onClick={() => updateTaskStatus(status.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                  (selectedTask.status === status.id ||
                                   (status.id === 'completed' && selectedTask.progress === 100) ||
                                   (status.id === 'in-progress' && selectedTask.progress && selectedTask.progress > 0 && selectedTask.progress < 100) ||
                                   (status.id === 'todo' && (!selectedTask.progress || selectedTask.progress === 0) && selectedTask.status !== 'in-progress' && selectedTask.status !== 'completed'))
                                    && (isDark ? "bg-white/5" : "bg-gray-50")
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full",
                                  status.id === 'completed' ? "bg-green-500" :
                                  status.id === 'in-progress' ? "bg-blue-500" :
                                  "bg-gray-400"
                                )} />
                                <span className={isDark ? "text-white" : "text-gray-900"}>{status.label}</span>
                              </button>
                            ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Assignees - v0.17.238: Interactive picker */}
                    <div className="flex items-center gap-3 relative">
                      <User className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Asignados' : 'Assignees'}
                      </span>
                      <button
                        onClick={() => {
                          setShowStatusDropdown(false);
                          setShowPriorityDropdown(false);
                          setShowDatePicker(null);
                          setShowAssigneesDropdown(!showAssigneesDropdown);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {selectedTask.assignees.slice(0, 3).map((assignee, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                style={{ backgroundColor: assignee.color || '#8B5CF6' }}
                                title={assignee.name}
                              >
                                {assignee.initials || assignee.name.slice(0, 2).toUpperCase()}
                              </div>
                            ))}
                            {selectedTask.assignees.length > 3 && (
                              <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                +{selectedTask.assignees.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn("text-sm", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                            {locale === 'es' ? 'Agregar' : 'Add'}
                          </span>
                        )}
                        <ChevronDown className={cn("w-3 h-3", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      </button>

                      {/* Assignees Dropdown */}
                      <AnimatePresence>
                        {showAssigneesDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowAssigneesDropdown(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[200px] max-h-[280px] overflow-y-auto",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                            >
                              {config.availableUsers && config.availableUsers.length > 0 ? (
                                config.availableUsers.map((user) => {
                                  const isSelected = selectedTask.assignees?.some(a => a.name === user.name);
                                  return (
                                    <button
                                      key={user.id || user.name}
                                      onClick={() => {
                                        const currentAssignees = selectedTask.assignees || [];
                                        let newAssignees: Task['assignees'];
                                        if (isSelected) {
                                          newAssignees = currentAssignees.filter(a => a.name !== user.name);
                                        } else {
                                          newAssignees = [...currentAssignees, {
                                            name: user.name,
                                            avatar: user.avatar,
                                            initials: user.initials || user.name.slice(0, 2).toUpperCase(),
                                            color: user.color || '#8B5CF6',
                                          }];
                                        }
                                        updateTaskField('assignees', newAssignees);
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                                        isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                        isSelected && (isDark ? "bg-white/5" : "bg-gray-50")
                                      )}
                                    >
                                      {user.avatar ? (
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                          style={{ backgroundColor: user.color || '#8B5CF6' }}
                                        >
                                          {user.initials || user.name.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span className={cn("flex-1 text-left", isDark ? "text-white" : "text-gray-900")}>
                                        {user.name}
                                      </span>
                                      {isSelected && <Check className="w-4 h-4 text-green-500" />}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className={cn("px-3 py-4 text-sm text-center", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                  {locale === 'es' ? 'No hay usuarios disponibles' : 'No users available'}
                                </div>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Dates - v0.17.84: ClickUp style date picker */}
                    <div className="flex items-center gap-3 relative">
                      <CalendarDays className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Fechas' : 'Dates'}
                      </span>
                      <button
                        onClick={() => {
                          setShowDatePicker(showDatePicker ? null : 'start');
                          setDatePickerMonth(selectedTask.startDate || new Date());
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        )}
                      >
                        {selectedTask.startDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' }) || (locale === 'es' ? 'Inicio' : 'Start')}
                        <span className={cn("mx-1", isDark ? "text-[#6B7280]" : "text-gray-400")}>→</span>
                        {selectedTask.endDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' }) || (locale === 'es' ? 'Fin' : 'End')}
                        {(selectedTask.startDate || selectedTask.endDate) && (
                          <X
                            className="w-3.5 h-3.5 ml-1 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Clear dates would go here
                            }}
                          />
                        )}
                      </button>

                      {/* ClickUp Style Date Picker Popover */}
                      <AnimatePresence>
                        {showDatePicker && (
                          <>
                            {/* v0.17.93: Overlay to close date picker on click outside */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowDatePicker(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className={cn(
                                "absolute left-0 top-full mt-2 z-50 rounded-xl shadow-2xl overflow-hidden flex",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                            {/* Quick Options - Left Side - v0.17.92: Functional quick dates */}
                            <div className={cn("w-44 py-2 border-r", isDark ? "border-white/10" : "border-gray-200")}>
                              {(() => {
                                const today = new Date();
                                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                                const nextSaturday = new Date(today); nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
                                const nextMonday = new Date(today); nextMonday.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
                                const nextWeekend = new Date(today); nextWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7) + 7);
                                const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);
                                const fourWeeks = new Date(today); fourWeeks.setDate(today.getDate() + 28);

                                const quickOptions = [
                                  { label: locale === 'es' ? 'Hoy' : 'Today', date: today, display: today.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                  { label: locale === 'es' ? 'Mañana' : 'Tomorrow', date: tomorrow, display: tomorrow.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                  { label: locale === 'es' ? 'Este fin de semana' : 'This weekend', date: nextSaturday, display: locale === 'es' ? 'sáb.' : 'sat.' },
                                  { label: locale === 'es' ? 'Próxima semana' : 'Next week', date: nextMonday, display: locale === 'es' ? 'lun.' : 'mon.' },
                                  { label: locale === 'es' ? 'Próximo fin de semana' : 'Next weekend', date: nextWeekend, display: nextWeekend.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                  { label: locale === 'es' ? '2 semanas' : '2 weeks', date: twoWeeks, display: twoWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                  { label: locale === 'es' ? '4 semanas' : '4 weeks', date: fourWeeks, display: fourWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                ];

                                return quickOptions.map((option, i) => (
                                  <button
                                    key={i}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                      isDark ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                                    )}
                                    onClick={() => {
                                      // v0.17.92: Apply quick date selection
                                      if (showDatePicker === 'start') {
                                        const newEndDate = selectedTask.endDate && option.date > selectedTask.endDate
                                          ? option.date
                                          : selectedTask.endDate;
                                        updateTaskDates(option.date, newEndDate);
                                        setShowDatePicker('end');
                                      } else {
                                        const newStartDate = selectedTask.startDate && option.date < selectedTask.startDate
                                          ? option.date
                                          : selectedTask.startDate;
                                        updateTaskDates(newStartDate, option.date);
                                        setShowDatePicker(null);
                                      }
                                    }}
                                  >
                                    <span>{option.label}</span>
                                    <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                      {option.display}
                                    </span>
                                  </button>
                                ));
                              })()}
                              {/* Clear dates button */}
                              <div className={cn("border-t mt-2 pt-2", isDark ? "border-white/10" : "border-gray-200")}>
                                <button
                                  onClick={() => {
                                    updateTaskDates(undefined, undefined);
                                    setShowDatePicker(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                    isDark ? "hover:bg-white/5 text-red-400" : "hover:bg-gray-50 text-red-500"
                                  )}
                                >
                                  <span>{locale === 'es' ? 'Quitar fechas' : 'Clear dates'}</span>
                                  <X className="w-4 h-4 opacity-50" />
                                </button>
                              </div>
                            </div>

                            {/* Calendar - Right Side */}
                            <div className="p-4">
                              {/* v0.17.92: Selection indicator */}
                              <div className={cn("text-xs mb-3 px-2 py-1 rounded", isDark ? "bg-white/5 text-[#9CA3AF]" : "bg-gray-100 text-gray-600")}>
                                {showDatePicker === 'start'
                                  ? (locale === 'es' ? '📅 Selecciona fecha de inicio' : '📅 Select start date')
                                  : (locale === 'es' ? '📅 Selecciona fecha de fin' : '📅 Select end date')}
                              </div>
                              {/* Month Header */}
                              <div className="flex items-center justify-between mb-4">
                                <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                  {datePickerMonth.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setDatePickerMonth(new Date())}
                                    className={cn(
                                      "p-1 rounded text-sm transition-colors",
                                      isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
                                    )}
                                  >
                                    {locale === 'es' ? 'Hoy' : 'Today'}
                                  </button>
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Weekday Headers */}
                              <div className="grid grid-cols-7 gap-1 mb-2">
                                {(locale === 'es'
                                  ? ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
                                  : ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
                                ).map((day) => (
                                  <div key={day} className={cn("w-8 h-8 flex items-center justify-center text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Calendar Days */}
                              <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                  const year = datePickerMonth.getFullYear();
                                  const month = datePickerMonth.getMonth();
                                  const firstDay = new Date(year, month, 1).getDay();
                                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                                  const daysInPrevMonth = new Date(year, month, 0).getDate();
                                  const today = new Date();
                                  const days = [];

                                  // Previous month days
                                  for (let i = firstDay - 1; i >= 0; i--) {
                                    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
                                  }
                                  // Current month days
                                  for (let i = 1; i <= daysInMonth; i++) {
                                    days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
                                  }
                                  // Next month days
                                  const remaining = 42 - days.length;
                                  for (let i = 1; i <= remaining; i++) {
                                    days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
                                  }

                                  return days.map((d, i) => {
                                    const isToday = d.date.toDateString() === today.toDateString();
                                    const isStartDate = selectedTask.startDate?.toDateString() === d.date.toDateString();
                                    const isEndDate = selectedTask.endDate?.toDateString() === d.date.toDateString();
                                    const isSelected = isStartDate || isEndDate;
                                    const isInRange = selectedTask.startDate && selectedTask.endDate &&
                                                      d.date >= selectedTask.startDate && d.date <= selectedTask.endDate;

                                    return (
                                      <button
                                        key={i}
                                        className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors",
                                          !d.isCurrentMonth && (isDark ? "text-[#4B5563]" : "text-gray-300"),
                                          d.isCurrentMonth && (isDark ? "text-white" : "text-gray-900"),
                                          isToday && "ring-2 ring-[#3B82F6]",
                                          isStartDate && "bg-[#3B82F6] text-white",
                                          isEndDate && !isStartDate && "bg-[#7C3AED] text-white",
                                          isInRange && !isSelected && (isDark ? "bg-[#7C3AED]/20" : "bg-purple-100"),
                                          !isSelected && (isDark ? "hover:bg-white/10" : "hover:bg-gray-100")
                                        )}
                                        onClick={() => {
                                          // v0.17.92: Handle date selection - update start or end date
                                          const clickedDate = new Date(d.date);
                                          if (showDatePicker === 'start') {
                                            // Setting start date
                                            const newEndDate = selectedTask.endDate && clickedDate > selectedTask.endDate
                                              ? clickedDate
                                              : selectedTask.endDate;
                                            updateTaskDates(clickedDate, newEndDate);
                                            setShowDatePicker('end'); // Move to select end date
                                          } else {
                                            // Setting end date
                                            const newStartDate = selectedTask.startDate && clickedDate < selectedTask.startDate
                                              ? clickedDate
                                              : selectedTask.startDate;
                                            updateTaskDates(newStartDate, clickedDate);
                                            setShowDatePicker(null);
                                          }
                                        }}
                                      >
                                        {d.day}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Priority - v0.17.92: Interactive dropdown */}
                    <div className="flex items-center gap-3 relative">
                      <Flag className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Prioridad' : 'Priority'}
                      </span>
                      <button
                        onClick={() => {
                          closeAllDropdowns();
                          setShowPriorityDropdown(!showPriorityDropdown);
                        }}
                        className={cn(
                          "text-xs px-2 py-1 rounded font-medium cursor-pointer transition-all hover:ring-2 hover:ring-white/20",
                          selectedTask.priority === 'high' || selectedTask.priority === 'urgent'
                            ? "bg-red-500/20 text-red-400"
                            : selectedTask.priority === 'medium'
                              ? "bg-yellow-500/20 text-yellow-400"
                              : selectedTask.priority === 'low'
                                ? "bg-green-500/20 text-green-400"
                                : isDark ? "bg-white/10 text-[#9CA3AF]" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {selectedTask.priority
                          ? (selectedTask.priority === 'high' || selectedTask.priority === 'urgent'
                              ? (locale === 'es' ? 'Urgente' : 'Urgent')
                              : selectedTask.priority === 'medium'
                                ? (locale === 'es' ? 'Media' : 'Medium')
                                : (locale === 'es' ? 'Baja' : 'Low'))
                          : (locale === 'es' ? 'Sin prioridad' : 'No priority')}
                      </button>
                      {/* Priority Dropdown */}
                      <AnimatePresence>
                        {showPriorityDropdown && (
                          <>
                            {/* v0.17.95: Overlay to close priority dropdown on click outside */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowPriorityDropdown(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[140px]",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                            >
                              {[
                              { id: 'urgent', label: locale === 'es' ? 'Urgente' : 'Urgent', color: 'bg-red-500' },
                              { id: 'high', label: locale === 'es' ? 'Alta' : 'High', color: 'bg-orange-500' },
                              { id: 'medium', label: locale === 'es' ? 'Media' : 'Medium', color: 'bg-yellow-500' },
                              { id: 'low', label: locale === 'es' ? 'Baja' : 'Low', color: 'bg-green-500' },
                              { id: undefined, label: locale === 'es' ? 'Sin prioridad' : 'No priority', color: 'bg-gray-400' },
                            ].map((priority) => (
                              <button
                                key={priority.id || 'none'}
                                onClick={() => {
                                  updateTaskField('priority', priority.id as Task['priority']);
                                  setShowPriorityDropdown(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                  selectedTask.priority === priority.id && (isDark ? "bg-white/5" : "bg-gray-50")
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full", priority.color)} />
                                <span className={isDark ? "text-white" : "text-gray-900"}>{priority.label}</span>
                              </button>
                            ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-3">
                      <Clock className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Duración' : 'Duration'}
                      </span>
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                        {selectedTask.startDate && selectedTask.endDate
                          ? `${Math.ceil((selectedTask.endDate.getTime() - selectedTask.startDate.getTime()) / (1000 * 60 * 60 * 24))} ${locale === 'es' ? 'días' : 'days'}`
                          : (locale === 'es' ? 'Sin definir' : 'Not set')}
                      </span>
                    </div>

                    {/* Progress - v0.17.92: Interactive slider */}
                    <div className="flex items-center gap-3">
                      <div className={cn("w-4 h-4 rounded-full border-2", isDark ? "border-[#6B7280]" : "border-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Progreso' : 'Progress'}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        {editingProgress ? (
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={selectedTask.progress || 0}
                            onChange={(e) => {
                              const newProgress = parseInt(e.target.value);
                              let newStatus = selectedTask.status;
                              if (newProgress === 100) newStatus = 'completed';
                              else if (newProgress > 0) newStatus = 'in-progress';
                              else newStatus = 'todo';
                              const updatedTask = { ...selectedTask, progress: newProgress, status: newStatus };
                              setSelectedTask(updatedTask);
                              callbacks.onTaskUpdate?.(updatedTask);
                            }}
                            onBlur={() => setEditingProgress(false)}
                            className={cn(
                              "flex-1 max-w-[120px] h-2 rounded-full appearance-none cursor-pointer",
                              isDark ? "bg-white/10" : "bg-gray-200",
                              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3B82F6] [&::-webkit-slider-thumb]:cursor-pointer"
                            )}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => setEditingProgress(true)}
                            className={cn(
                              "flex-1 h-2 rounded-full overflow-hidden max-w-[120px] cursor-pointer hover:ring-2 hover:ring-white/20 transition-all",
                              isDark ? "bg-white/10" : "bg-gray-200"
                            )}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                selectedTask.progress === 100 ? "bg-green-500" : "bg-[#3B82F6]"
                              )}
                              style={{ width: `${selectedTask.progress || 0}%` }}
                            />
                          </button>
                        )}
                        <span className={cn("text-sm font-medium min-w-[40px]", isDark ? "text-white" : "text-gray-900")}>
                          {selectedTask.progress || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-3">
                      <Tag className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Etiquetas' : 'Tags'}
                      </span>
                      <TagPicker
                        selectedTags={selectedTask.tags || []}
                        availableTags={availableTags}
                        onChange={(newTags) => {
                          updateTaskField('tags', newTags);
                        }}
                        onCreateTag={onCreateTag}
                        theme={tagPickerTheme}
                      />
                    </div>

                    {/* Dependencies */}
                    <div className="flex items-start gap-3 relative">
                      <Link2 className={cn("w-4 h-4 mt-1.5", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24 mt-1", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Relaciones' : 'Relations'}
                      </span>
                      <div className="flex-1">
                        {/* Selected dependencies as chips */}
                        {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {selectedTask.dependencies.map((depId) => {
                              const depTask = tasks.find(t => t.id === depId);
                              return (
                                <span
                                  key={depId}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                    isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"
                                  )}
                                >
                                  {depTask?.name || depId.slice(0, 8)}
                                  <button
                                    onClick={() => {
                                      const newDeps = (selectedTask.dependencies || []).filter(id => id !== depId);
                                      updateTaskField('dependencies', newDeps);
                                    }}
                                    className={cn(
                                      "ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                    )}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Add dependency button */}
                        <button
                          onClick={() => {
                            closeAllDropdowns();
                            setShowDependenciesDropdown(!showDependenciesDropdown);
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                            isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                            {locale === 'es' ? 'Agregar dependencia' : 'Add dependency'}
                          </span>
                        </button>

                        {/* Dependencies Dropdown */}
                        <AnimatePresence>
                          {showDependenciesDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => {
                                setShowDependenciesDropdown(false);
                                setDependencySearch('');
                              }} />
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className={cn(
                                  "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[280px] max-h-[320px]",
                                  isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                                )}
                              >
                                {/* Search input */}
                                <div className={cn("p-2 border-b", isDark ? "border-white/10" : "border-gray-200")}>
                                  <input
                                    type="text"
                                    value={dependencySearch}
                                    onChange={(e) => setDependencySearch(e.target.value)}
                                    placeholder={locale === 'es' ? 'Buscar tarea...' : 'Search task...'}
                                    className={cn(
                                      "w-full px-3 py-2 rounded-md text-sm outline-none",
                                      isDark
                                        ? "bg-white/5 text-white placeholder:text-[#6B7280] focus:bg-white/10"
                                        : "bg-gray-100 text-gray-900 placeholder:text-gray-400"
                                    )}
                                    autoFocus
                                  />
                                </div>

                                {/* Task list */}
                                <div className="max-h-[240px] overflow-y-auto">
                                  {tasks.length > 0 ? (
                                    tasks
                                      .filter(t => t.id !== selectedTask.id)
                                      .filter(t =>
                                        dependencySearch === '' ||
                                        t.name.toLowerCase().includes(dependencySearch.toLowerCase())
                                      )
                                      .map((depTask) => {
                                        const isSelected = selectedTask.dependencies?.includes(depTask.id);
                                        return (
                                          <button
                                            key={depTask.id}
                                            onClick={() => {
                                              const currentDeps = selectedTask.dependencies || [];
                                              let newDeps: string[];
                                              if (isSelected) {
                                                newDeps = currentDeps.filter(id => id !== depTask.id);
                                              } else {
                                                newDeps = [...currentDeps, depTask.id];
                                              }
                                              updateTaskField('dependencies', newDeps);
                                            }}
                                            className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                                              isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                              isSelected && (isDark ? "bg-white/5" : "bg-gray-50")
                                            )}
                                          >
                                            <div
                                              className={cn(
                                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                                                isSelected
                                                  ? "bg-blue-500 border-blue-500"
                                                  : isDark ? "border-white/30" : "border-gray-300"
                                              )}
                                            >
                                              {isSelected && (
                                                <Check className="w-3 h-3 text-white" />
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <span className={cn("block truncate", isDark ? "text-white" : "text-gray-900")}>
                                                {depTask.name}
                                              </span>
                                              <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                                {depTask.id.slice(0, 8)}
                                              </span>
                                            </div>
                                          </button>
                                        );
                                      })
                                  ) : (
                                    <div className={cn("px-3 py-4 text-sm text-center", isDark ? "text-[#6B7280]" : "text-gray-500")}>
                                      {locale === 'es' ? 'No hay tareas disponibles' : 'No tasks available'}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Color */}
                    <div className="flex items-center gap-3 relative">
                      <Palette className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Color' : 'Color'}
                      </span>
                      <button
                        onClick={() => {
                          closeAllDropdowns();
                          setShowColorPicker(!showColorPicker);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: selectedTask.color || '#6366F1' }}
                        />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                          {TASK_COLORS.find(c => c.value === selectedTask.color)?.name || (locale === 'es' ? 'Azul' : 'Blue')}
                        </span>
                        <ChevronDown className={cn("w-3 h-3", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      </button>

                      {/* Color Picker Dropdown */}
                      <AnimatePresence>
                        {showColorPicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden p-3",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                            >
                              <div className="grid grid-cols-6 gap-1.5">
                                {TASK_COLORS.map((color) => {
                                  const isSelected = selectedTask.color === color.value;
                                  return (
                                    <button
                                      key={color.value}
                                      onClick={() => {
                                        updateTaskField('color', color.value);
                                        setShowColorPicker(false);
                                      }}
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                        isSelected && "ring-2 ring-offset-2",
                                        isDark ? "ring-offset-[#1A1D25]" : "ring-offset-white"
                                      )}
                                      style={{
                                        backgroundColor: color.value,
                                        outlineColor: isSelected ? color.value : undefined,
                                      }}
                                      title={color.name}
                                    >
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Milestone */}
                    <div className="flex items-center gap-3">
                      <Diamond className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Hito' : 'Milestone'}
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTask.isMilestone || false}
                          onChange={(e) => updateTaskField('isMilestone' as any, e.target.checked)}
                          className={cn(
                            "w-4 h-4 rounded border-2 cursor-pointer appearance-none transition-colors",
                            selectedTask.isMilestone
                              ? "bg-purple-500 border-purple-500"
                              : isDark ? "border-white/30 bg-transparent" : "border-gray-300 bg-transparent",
                            "checked:bg-purple-500 checked:border-purple-500"
                          )}
                        />
                        <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                          {locale === 'es' ? 'Marcar como hito' : 'Mark as milestone'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* v0.17.239: Description section - functional textarea */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                        {locale === 'es' ? 'Descripción' : 'Description'}
                      </h3>
                    </div>
                    <textarea
                      value={(selectedTask as any).description || ''}
                      onChange={(e) => updateTaskField('description' as any, e.target.value)}
                      placeholder={locale === 'es' ? 'Agregar descripción...' : 'Add description...'}
                      className={cn(
                        "w-full min-h-[100px] px-3 py-2 rounded-lg text-sm resize-none outline-none transition-colors",
                        isDark
                          ? "bg-white/5 text-white placeholder:text-[#6B7280] focus:bg-white/10"
                          : "bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:bg-gray-200"
                      )}
                    />
                    <button className={cn(
                      "flex items-center gap-2 text-sm mt-2 transition-colors",
                      isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
                    )}>
                      <Sparkles className="w-4 h-4" />
                      {locale === 'es' ? 'Escribe con IA' : 'Write with AI'}
                    </button>
                  </div>

                  {/* v0.17.96: Custom Fields section - ClickUp style */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Campos personalizados' : 'Custom fields'}
                    </h3>
                    <button className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    )}>
                      <Plus className="w-4 h-4" />
                      {locale === 'es' ? 'Crea un campo en esta lista' : 'Create a field in this list'}
                    </button>
                  </div>

                  {/* v0.17.96: Subtasks section - ClickUp style */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Agregar subtarea' : 'Add subtask'}
                    </h3>
                    {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {selectedTask.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center cursor-pointer",
                              subtask.progress === 100
                                ? "bg-green-500 border-green-500"
                                : isDark ? "border-white/20 hover:border-white/40" : "border-gray-300 hover:border-gray-400"
                            )}>
                              {subtask.progress === 100 && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className={cn(
                              "text-sm",
                              subtask.progress === 100
                                ? "line-through text-[#6B7280]"
                                : isDark ? "text-white" : "text-gray-900"
                            )}>
                              {subtask.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    )}>
                      <Plus className="w-4 h-4" />
                      {locale === 'es' ? 'Add Tarea' : 'Add Task'}
                    </button>
                  </div>

                  {/* v0.17.96: Checklists section - ClickUp style */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                        {locale === 'es' ? 'Listas de control' : 'Checklists'}
                      </h3>
                      <button className={cn(
                        "p-1 rounded transition-colors",
                        isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400"
                      )}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    )}>
                      <ListChecks className="w-4 h-4" />
                      {locale === 'es' ? 'Crear lista de control' : 'Create checklist'}
                    </button>
                  </div>

                  {/* v0.17.241: Attachments section - Functional */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Adjuntos' : 'Attachments'}
                      {currentTaskAttachments.length > 0 && (
                        <span className={cn("ml-2 text-xs font-normal", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                          ({currentTaskAttachments.length})
                        </span>
                      )}
                    </h3>

                    {/* Existing attachments */}
                    {currentTaskAttachments.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {currentTaskAttachments.map((attachment) => {
                          const FileIcon = getFileIcon(attachment.type);
                          const isImage = attachment.type.startsWith('image/');

                          return (
                            <div
                              key={attachment.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg group transition-colors",
                                isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                              )}
                            >
                              {/* Thumbnail or icon */}
                              {isImage && attachment.thumbnailUrl ? (
                                <img
                                  src={attachment.thumbnailUrl}
                                  alt={attachment.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <div className={cn(
                                  "w-10 h-10 rounded flex items-center justify-center",
                                  isDark ? "bg-white/10" : "bg-gray-200"
                                )}>
                                  <FileIcon className={cn("w-5 h-5", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                                </div>
                              )}

                              {/* File info */}
                              <div className="flex-1 min-w-0">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "text-sm font-medium truncate block hover:underline",
                                    isDark ? "text-white" : "text-gray-900"
                                  )}
                                >
                                  {attachment.name}
                                </a>
                                <p className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>

                              {/* Delete button */}
                              {callbacks.onDeleteAttachment && (
                                <button
                                  onClick={() => callbacks.onDeleteAttachment?.(attachment.id)}
                                  className={cn(
                                    "p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all",
                                    isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-500"
                                  )}
                                  title={locale === 'es' ? 'Eliminar' : 'Delete'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Drop zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleFileDrop}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer relative",
                        isDraggingFile
                          ? (isDark ? "border-blue-500 bg-blue-500/10" : "border-blue-400 bg-blue-50")
                          : (isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300"),
                        isUploadingFiles && "pointer-events-none opacity-50"
                      )}
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={!callbacks.onUploadAttachments || isUploadingFiles}
                      />
                      {isUploadingFiles ? (
                        <>
                          <div className="w-6 h-6 mx-auto mb-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                            {locale === 'es' ? 'Subiendo...' : 'Uploading...'}
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className={cn(
                            "w-6 h-6 mx-auto mb-2",
                            isDraggingFile ? "text-blue-500" : (isDark ? "text-[#6B7280]" : "text-gray-400")
                          )} />
                          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                            {isDraggingFile
                              ? (locale === 'es' ? 'Suelta los archivos aquí' : 'Drop files here')
                              : (locale === 'es'
                                  ? <>Suelta tus archivos aquí o <span className="underline">haz clic para subir</span></>
                                  : <>Drop your files here or <span className="underline">click to upload</span></>
                                )
                            }
                          </p>
                          {!callbacks.onUploadAttachments && (
                            <p className={cn("text-xs mt-1", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                              {locale === 'es' ? 'Upload no disponible' : 'Upload not available'}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Panel - Right Sidebar - v0.17.256: Matching TaskDetailModal UI */}
              <div className={cn(
                "w-80 border-l flex flex-col",
                isDark ? "border-white/10 bg-[#0F1117]" : "border-gray-200 bg-gray-50"
              )}>
                {/* Activity Header */}
                <div className={cn(
                  "px-4 py-3 border-b",
                  isDark ? "border-white/10" : "border-gray-200"
                )}>
                  <h3 className={cn(
                    "text-sm font-semibold",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {locale === 'es' ? 'Actividad' : 'Activity'}
                    {comments && comments.length > 0 && (
                      <span className={cn("ml-2 text-xs font-normal", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                        ({comments.length})
                      </span>
                    )}
                  </h3>
                </div>

                {/* Activity Content - Comments List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {comments && comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => {
                        const timeAgo = (() => {
                          const now = new Date();
                          const commentDate = new Date(comment.createdAt);
                          const diffMs = now.getTime() - commentDate.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          if (diffMins < 1) return locale === 'es' ? 'ahora' : 'now';
                          if (diffMins < 60) return locale === 'es' ? `hace ${diffMins}m` : `${diffMins}m ago`;
                          if (diffHours < 24) return locale === 'es' ? `hace ${diffHours}h` : `${diffHours}h ago`;
                          return locale === 'es' ? `hace ${diffDays}d` : `${diffDays}d ago`;
                        })();
                        return (
                          <div key={comment.id} className="flex gap-3">
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                              style={{ backgroundColor: '#8B5CF6' }}
                            >
                              {comment.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            {/* Comment Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                  {comment.user?.name || (locale === 'es' ? 'Usuario' : 'User')}
                                </span>
                                <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                  {timeAgo}
                                </span>
                              </div>
                              <p className={cn("text-sm break-words", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className={cn(
                        "w-10 h-10 mb-3",
                        isDark ? "text-[#3B4252]" : "text-gray-300"
                      )} />
                      <p className={cn(
                        "text-sm",
                        isDark ? "text-[#6B7280]" : "text-gray-500"
                      )}>
                        {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Comment Input - v0.17.256: Matching TaskDetailModal exactly */}
                <div className={cn(
                  "p-4 border-t",
                  isDark ? "border-white/10" : "border-gray-200"
                )}>
                  <div className="flex items-start gap-2">
                    {/* Current User Avatar */}
                    {currentUser && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: currentUser.color || '#8B5CF6' }}
                      >
                        {currentUser.name?.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg",
                      isDark ? "bg-white/5" : "bg-white border border-gray-200"
                    )}>
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && !e.shiftKey && selectedTask && commentText.trim() && onAddComment) {
                            e.preventDefault();
                            setIsSubmittingComment(true);
                            try {
                              await onAddComment(selectedTask.id, commentText.trim());
                              setCommentText('');
                            } finally {
                              setIsSubmittingComment(false);
                            }
                          }
                        }}
                        placeholder={locale === 'es' ? 'Escribe un comentario...' : 'Write a comment...'}
                        disabled={isSubmittingComment || !onAddComment}
                        className={cn(
                          "flex-1 bg-transparent text-sm outline-none",
                          isDark ? "text-white placeholder:text-[#6B7280]" : "text-gray-900 placeholder:text-gray-400",
                          (isSubmittingComment || !onAddComment) && "opacity-50"
                        )}
                      />
                      <button
                        onClick={async () => {
                          if (selectedTask && commentText.trim() && onAddComment) {
                            setIsSubmittingComment(true);
                            try {
                              await onAddComment(selectedTask.id, commentText.trim());
                              setCommentText('');
                            } finally {
                              setIsSubmittingComment(false);
                            }
                          }
                        }}
                        disabled={isSubmittingComment || !commentText.trim() || !onAddComment}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          commentText.trim() && onAddComment
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : (isDark ? "text-[#6B7280]" : "text-gray-400"),
                          isSubmittingComment && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isSubmittingComment ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* v0.17.83: Day Tasks Popover - Shows all tasks for a day */}
      <AnimatePresence>
        {selectedDay && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 bg-black/30 z-40"
            />
            {/* Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-h-[400px] rounded-xl shadow-2xl z-50 overflow-hidden",
                isDark ? "bg-[#1A1D25]" : "bg-white"
              )}
            >
              <div className={cn("px-4 py-3 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-gray-200")}>
                <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                  {selectedDay.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 max-h-[320px] overflow-y-auto space-y-2">
                {selectedDay.events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedDay(null);
                      setSelectedTask(event.task);
                      onTaskOpen?.(event.task.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                      isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                    )}
                  >
                    <StatusIcon task={event.task} />
                    <span className={cn("text-sm truncate flex-1", isDark ? "text-white" : "text-gray-900")}>
                      {event.title}
                    </span>
                    {event.task.priority === 'high' || event.task.priority === 'urgent' ? (
                      <Flag className="w-3.5 h-3.5 text-red-400" />
                    ) : null}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

export default CalendarBoard;
