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

  // Handle task toggle
  const handleTaskToggle = useCallback((task: Task) => {
    const newProgress = task.progress === 100 ? 0 : 100;
    const newStatus: 'todo' | 'completed' = newProgress === 100 ? 'completed' : 'todo';
    callbacks.onTaskUpdate?.({ ...task, status: newStatus, progress: newProgress });
  }, [callbacks]);

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

          {/* Calendar Days */}
          <div className={cn("flex-1 grid grid-cols-7 grid-rows-6 gap-px rounded-lg overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-2 transition-colors",
                  isDark ? "bg-[#0F1117]" : "bg-white",
                  !day.isCurrentMonth && (isDark ? "bg-[#0F1117]/50" : "bg-gray-50"),
                  day.isToday && "ring-2 ring-[#3B82F6] ring-inset"
                )}
              >
                {/* Day Number */}
                <div className={cn(
                  "text-sm font-medium mb-1",
                  day.isToday
                    ? "text-[#3B82F6]"
                    : day.isCurrentMonth
                      ? (isDark ? "text-white" : "text-gray-900")
                      : (isDark ? "text-[#6B7280]" : "text-gray-400")
                )}>
                  {day.date.getDate()}
                </div>

                {/* Tasks for this day */}
                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {day.events.slice(0, 3).map((event) => (
                    <motion.button
                      key={event.id}
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
                  ))}
                  {day.events.length > 3 && (
                    <div className={cn("text-xs px-1.5", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                      +{day.events.length - 3} {locale === 'es' ? 'más' : 'more'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={cn(
              "fixed right-0 top-0 h-full w-80 border-l shadow-xl z-50",
              isDark ? "bg-[#1A1D25] border-white/10" : "bg-white border-gray-200"
            )}
          >
            <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-gray-200")}>
              <h3 className={cn("font-semibold", isDark ? "text-white" : "text-gray-900")}>
                {locale === 'es' ? 'Detalle de tarea' : 'Task Detail'}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={cn("text-xs uppercase", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                  {locale === 'es' ? 'Nombre' : 'Name'}
                </label>
                <p className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{selectedTask.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("text-xs uppercase", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                    {locale === 'es' ? 'Inicio' : 'Start'}
                  </label>
                  <p className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                    {selectedTask.startDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') || '-'}
                  </p>
                </div>
                <div>
                  <label className={cn("text-xs uppercase", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                    {locale === 'es' ? 'Fin' : 'End'}
                  </label>
                  <p className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                    {selectedTask.endDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') || '-'}
                  </p>
                </div>
              </div>

              <div>
                <label className={cn("text-xs uppercase mb-2 block", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                  {locale === 'es' ? 'Progreso' : 'Progress'}
                </label>
                <div className="flex items-center gap-3">
                  <div className={cn("flex-1 h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        selectedTask.progress === 100 ? "bg-green-500" : "bg-[#3B82F6]"
                      )}
                      style={{ width: `${selectedTask.progress || 0}%` }}
                    />
                  </div>
                  <span className={cn("text-sm font-medium w-10", isDark ? "text-white" : "text-gray-900")}>
                    {selectedTask.progress || 0}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  handleTaskToggle(selectedTask);
                  setSelectedTask(null);
                }}
                className={cn(
                  "w-full py-2 rounded-lg font-medium transition-colors",
                  selectedTask.progress === 100
                    ? "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                    : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                )}
              >
                {selectedTask.progress === 100
                  ? (locale === 'es' ? 'Marcar como pendiente' : 'Mark as pending')
                  : (locale === 'es' ? 'Marcar como completada' : 'Mark as complete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for task detail panel */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTask(null)}
            className="fixed inset-0 bg-black/20 z-40"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CalendarBoard;
