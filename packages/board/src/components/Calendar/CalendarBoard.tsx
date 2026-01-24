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
  CheckCircle2,
  Circle,
  PlayCircle,
  X,
  Flag,
  Plus,
  CalendarDays,
  User,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type { CalendarBoardProps, CalendarDay } from './types';
import { mergeCalendarTranslations } from './i18n';
import { cn } from '../../utils';
import { TaskDetailModal } from '../TaskDetailModal';

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
  mentionableUsers,
  onUploadCommentAttachments,
  onTaskOpen,
  // v1.1.0: Time tracking props
  enableTimeTracking,
  timeTrackingSummary,
  timeEntries,
  timerState,
  onLogTime,
  onUpdateEstimate,
  onUpdateSoldEffort,
  onStartTimer,
  onStopTimer,
  onDiscardTimer,
  // v1.4.11: Governance v2.0 - Financial blur
  blurFinancials = false,
}: CalendarBoardProps) {
  const {
    theme: themeName = 'dark',
    locale = 'en',
    customTranslations,
  } = config;

  const t = mergeCalendarTranslations(locale, customTranslations);
  const isDark = themeName === 'dark';

  // State
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null); // v0.17.83: For "+X more" popover
  // v0.17.91: Track expanded cells - key is day index, value is number of visible tasks
  const [expandedCells, setExpandedCells] = useState<Record<number, number>>({});
  const DEFAULT_VISIBLE_TASKS = 4; // Show 4 tasks by default
  const TASKS_INCREMENT = 3; // Show 3 more tasks each time user clicks "more"

  // v0.17.425: Modal dropdown states moved to TaskDetailModal component

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

  // v0.17.425: Attachment, dependencies, and color states moved to TaskDetailModal

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

  // v0.17.425: Task editing functions moved to TaskDetailModal

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

      {/* v0.17.425: Use shared TaskDetailModal instead of inline modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdate={(updatedTask) => {
          callbacks.onTaskUpdate?.(updatedTask);
          setSelectedTask(updatedTask);
        }}
        theme={themeName === 'dark' ? 'dark' : 'light'}
        locale={locale as 'en' | 'es'}
        availableUsers={config.availableUsers?.map(u => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          initials: u.name?.slice(0, 2).toUpperCase() || 'U',
          color: '#8B5CF6',
        })) || []}
        availableTags={availableTags}
        onCreateTag={onCreateTag}
        attachments={selectedTask ? attachmentsByTask?.get(selectedTask.id) || [] : []}
        onUploadAttachments={callbacks.onUploadAttachments}
        onDeleteAttachment={callbacks.onDeleteAttachment}
        availableTasks={flattenTasks(tasks).filter(t => t.id !== selectedTask?.id)}
        comments={comments?.filter(c => c.taskId === selectedTask?.id).map(c => ({
          ...c,
          createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
          updatedAt: c.updatedAt instanceof Date ? c.updatedAt : c.updatedAt ? new Date(c.updatedAt) : undefined,
        }))}
        onAddComment={onAddComment}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onUploadCommentAttachments={onUploadCommentAttachments}
        // v1.1.0: Time tracking props
        enableTimeTracking={enableTimeTracking}
        timeTrackingSummary={timeTrackingSummary}
        timeEntries={timeEntries}
        isTimerRunning={timerState?.isRunning}
        timerElapsedSeconds={timerState?.elapsedSeconds}
        onTimeLog={onLogTime}
        onEstimateUpdate={onUpdateEstimate}
        onSoldEffortUpdate={onUpdateSoldEffort}
        onTimerStart={onStartTimer}
        onTimerStop={onStopTimer}
        onTimerDiscard={onDiscardTimer}
        // v1.4.11: Governance v2.0 - Financial blur
        blurFinancials={blurFinancials}
      />

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
