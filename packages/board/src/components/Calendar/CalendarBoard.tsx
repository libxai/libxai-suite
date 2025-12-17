/**
 * CalendarBoard Component
 * Professional calendar view for task management
 * Based on SaaS ProjectCalendar component styles
 * @version 0.17.0
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
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type { CalendarBoardProps, CalendarDay } from './types';
import { mergeCalendarTranslations } from './i18n';
import { cn } from '../../utils';

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
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null); // v0.17.84: ClickUp style date picker
  const [datePickerMonth, setDatePickerMonth] = useState(new Date()); // Current month in date picker
  // v0.17.91: Track expanded cells - key is day index, value is number of visible tasks
  const [expandedCells, setExpandedCells] = useState<Record<number, number>>({});
  const DEFAULT_VISIBLE_TASKS = 4; // Show 4 tasks by default
  const TASKS_INCREMENT = 3; // Show 3 more tasks each time user clicks "more"

  // v0.17.92: Modal dropdown states for interactive editing
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);

  // v0.17.99: Quick create task popover state (per cell)
  const [quickCreateCell, setQuickCreateCell] = useState<number | null>(null); // Which cell index has the popover open
  const [quickCreateName, setQuickCreateName] = useState('');

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
    setShowDatePicker(null);
  }, []);

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
    <div className={cn("flex-1 flex flex-col w-full h-full overflow-hidden", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
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
      <div className="flex-1 p-6 overflow-auto">
        <div className="h-full flex flex-col">
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
          <div className={cn("grid grid-cols-7 auto-rows-min gap-px rounded-lg overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
            {calendarDays.map((day, index) => {
              // v0.17.87: Weekend detection (Saturday=6, Sunday=0)
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

              return (
              <div
                key={index}
                className={cn(
                  "min-h-[120px] p-2 transition-colors flex flex-col relative group",
                  // v0.17.89: Weekends have SAME color regardless of month (like ClickUp)
                  // Only weekdays vary based on current month
                  isDark
                    ? (isWeekend
                        ? "bg-[#1A1D21]"  // ALL weekends: same lighter gray
                        : (day.isCurrentMonth ? "bg-[#0F1117]" : "bg-[#0A0C10]"))  // Weekdays vary
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
                          {/* v0.17.82: Tooltip on hover */}
                          <div className={cn(
                            "absolute left-0 bottom-full mb-1 px-2 py-1 rounded text-xs whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg",
                            isDark ? "bg-[#1A1D25] text-white border border-white/10" : "bg-gray-900 text-white"
                          )}>
                            {event.title}
                          </div>
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

                {/* v0.17.100: Day Number + Quick create button - bottom right like ClickUp */}
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  {/* v0.17.100: Quick create button - shows on hover, positioned left of day number */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickCreateCell(quickCreateCell === index ? null : index);
                        setQuickCreateName('');
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

                    {/* Quick create popover */}
                    <AnimatePresence>
                      {quickCreateCell === index && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => {
                              setQuickCreateCell(null);
                              setQuickCreateName('');
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className={cn(
                              "absolute left-0 top-full mt-1 w-[320px] rounded-lg shadow-2xl z-50 overflow-hidden",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={(e) => e.stopPropagation()}
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
                                    callbacks.onTaskCreate?.({
                                      name: quickCreateName.trim(),
                                      startDate: day.date,
                                      endDate: day.date,
                                    });
                                    setQuickCreateName('');
                                    setQuickCreateCell(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setQuickCreateCell(null);
                                    setQuickCreateName('');
                                  }
                                }}
                              />
                            </div>
                            <div className={cn("px-2.5 py-2 flex items-center justify-between border-t", isDark ? "border-white/10" : "border-gray-100")}>
                              <div className="flex items-center gap-1">
                                <button className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400")}>
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                                <span className={cn("text-xs px-1.5 py-0.5 rounded", isDark ? "bg-white/5 text-[#9CA3AF]" : "bg-gray-100 text-gray-500")}>
                                  {day.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </span>
                                <button className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400")}>
                                  <User className="w-3.5 h-3.5" />
                                </button>
                                <button className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-[#6B7280]" : "hover:bg-gray-100 text-gray-400")}>
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  if (quickCreateName.trim()) {
                                    callbacks.onTaskCreate?.({
                                      name: quickCreateName.trim(),
                                      startDate: day.date,
                                      endDate: day.date,
                                    });
                                    setQuickCreateName('');
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
              onClick={() => setSelectedTask(null)}
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
                    onClick={() => setSelectedTask(null)}
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

                    {/* Assignees */}
                    <div className="flex items-center gap-3">
                      <User className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Asignados' : 'Assignees'}
                      </span>
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
                          {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
                        </span>
                      )}
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
                      <span className={cn("text-sm", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                        {locale === 'es' ? 'Vacío' : 'Empty'}
                      </span>
                    </div>

                    {/* Dependencies */}
                    <div className="flex items-center gap-3">
                      <Link2 className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Relaciones' : 'Relations'}
                      </span>
                      <span className={cn("text-sm", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                        {selectedTask.dependencies && selectedTask.dependencies.length > 0
                          ? `${selectedTask.dependencies.length} ${locale === 'es' ? 'dependencias' : 'dependencies'}`
                          : (locale === 'es' ? 'Vacío' : 'Empty')}
                      </span>
                    </div>
                  </div>

                  {/* v0.17.96: Description section - ClickUp style */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <button className={cn(
                      "flex items-center gap-2 text-sm transition-colors",
                      isDark ? "text-[#9CA3AF] hover:text-white" : "text-gray-500 hover:text-gray-900"
                    )}>
                      <FileText className="w-4 h-4" />
                      {locale === 'es' ? 'Agregar descripción' : 'Add description'}
                    </button>
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

                  {/* v0.17.96: Attachments section - ClickUp style */}
                  <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                    <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Adjuntos' : 'Attachments'}
                    </h3>
                    <div className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                      isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300"
                    )}>
                      <Upload className={cn("w-6 h-6 mx-auto mb-2", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                      <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                        {locale === 'es' ? 'Suelta tus archivos aquí para ' : 'Drop your files here to '}
                        <span className={cn("underline", isDark ? "text-white" : "text-gray-700")}>
                          {locale === 'es' ? 'subir' : 'upload'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Panel - Right Side */}
              <div className={cn(
                "w-[280px] border-l flex flex-col",
                isDark ? "border-white/10 bg-[#141619]" : "border-gray-200 bg-gray-50"
              )}>
                <div className={cn("px-4 py-3 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-gray-200")}>
                  <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                    {locale === 'es' ? 'Actividad' : 'Activity'}
                  </span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className={cn("text-sm text-center py-8", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
                  </div>
                </div>
                {/* Comment input */}
                <div className={cn("p-3 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg",
                    isDark ? "bg-white/5" : "bg-white border border-gray-200"
                  )}>
                    <input
                      type="text"
                      placeholder={locale === 'es' ? 'Escribe un comentario...' : 'Write a comment...'}
                      className={cn(
                        "flex-1 bg-transparent text-sm outline-none",
                        isDark ? "text-white placeholder-[#6B7280]" : "text-gray-900 placeholder-gray-400"
                      )}
                    />
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
