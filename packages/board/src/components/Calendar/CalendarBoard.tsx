/**
 * CalendarBoard Component
 * Professional calendar view for task management
 * @version 0.17.0
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Clock,
  Check,
  Circle,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type {
  CalendarBoardProps,
  CalendarEvent,
  CalendarDay,
  CalendarViewMode,
} from './types';
import { getCalendarTheme } from './themes';
import { getCalendarTranslations, mergeCalendarTranslations, getMonthNames, getWeekdayNames } from './i18n';
import { cn } from '../../utils';

/**
 * Get all days for the calendar grid (including padding days from other months)
 */
function getCalendarDays(
  year: number,
  month: number,
  firstDayOfWeek: number = 0
): Date[] {
  const days: Date[] = [];
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Get the day of week for the first day of the month
  let startDay = firstOfMonth.getDay() - firstDayOfWeek;
  if (startDay < 0) startDay += 7;

  // Add padding days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  // Add all days of current month
  for (let i = 1; i <= lastOfMonth.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add padding days from next month to complete the grid (always 6 rows)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

/**
 * Check if a task spans the given date
 */
function isDateInTaskRange(date: Date, task: Task): boolean {
  if (!task.startDate || !task.endDate) return false;

  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);

  // Normalize to date only (no time)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
  const endOnly = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());

  return dateOnly >= startOnly && dateOnly <= endOnly;
}

/**
 * Convert tasks to calendar events
 */
function tasksToEvents(tasks: Task[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const processTasks = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.startDate && task.endDate) {
        events.push({
          id: task.id,
          title: task.name,
          start: new Date(task.startDate),
          end: new Date(task.endDate),
          color: task.color,
          status: task.status,
          progress: task.progress,
          assignees: task.assignees,
          task,
        });
      }

      // Process subtasks
      if (task.subtasks?.length) {
        processTasks(task.subtasks);
      }
    }
  };

  processTasks(tasks);
  return events;
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is today
 */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if date is weekend
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Status indicator component
 */
function StatusDot({
  status,
  theme,
}: {
  status?: 'todo' | 'in-progress' | 'completed';
  theme: ReturnType<typeof getCalendarTheme>;
}) {
  const color = {
    todo: theme.statusTodo,
    'in-progress': theme.statusInProgress,
    completed: theme.statusCompleted,
  }[status || 'todo'];

  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Event item component
 */
function EventItem({
  event,
  date,
  theme,
  onClick,
  onDoubleClick,
  compact = false,
}: {
  event: CalendarEvent;
  date: Date;
  theme: ReturnType<typeof getCalendarTheme>;
  onClick?: () => void;
  onDoubleClick?: () => void;
  compact?: boolean;
}) {
  const isStart = isSameDay(date, event.start);
  const isEnd = isSameDay(date, event.end);
  const eventColor = event.color || theme.accent;

  if (compact) {
    return (
      <button
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className="w-full flex items-center gap-1 px-1.5 py-0.5 text-xs rounded truncate transition-colors hover:opacity-80"
        style={{
          backgroundColor: `${eventColor}30`,
          color: eventColor,
          borderLeft: isStart ? `3px solid ${eventColor}` : 'none',
          borderRadius: isStart && isEnd ? '4px' : isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0',
        }}
        title={event.title}
      >
        <StatusDot status={event.status} theme={theme} />
        <span className="truncate">{event.title}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors hover:opacity-80"
      style={{
        backgroundColor: `${eventColor}20`,
        color: theme.textPrimary,
        borderLeft: `3px solid ${eventColor}`,
      }}
    >
      <StatusDot status={event.status} theme={theme} />
      <span className="truncate flex-1 text-left">{event.title}</span>
      {event.progress !== undefined && event.progress > 0 && (
        <span className="text-xs" style={{ color: theme.textSecondary }}>
          {event.progress}%
        </span>
      )}
    </button>
  );
}

/**
 * Calendar day cell component
 */
function DayCell({
  day,
  events,
  theme,
  translations,
  maxEvents,
  onDateClick,
  onEventClick,
  onEventDoubleClick,
}: {
  day: CalendarDay;
  events: CalendarEvent[];
  theme: ReturnType<typeof getCalendarTheme>;
  translations: ReturnType<typeof getCalendarTranslations>;
  maxEvents: number;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventDoubleClick?: (event: CalendarEvent) => void;
}) {
  const visibleEvents = events.slice(0, maxEvents);
  const hiddenCount = events.length - maxEvents;

  return (
    <div
      className={cn(
        'min-h-[100px] p-1 border-b border-r flex flex-col transition-colors',
        day.isToday && 'ring-2 ring-inset',
        !day.isCurrentMonth && 'opacity-50'
      )}
      style={{
        backgroundColor: day.isToday
          ? theme.bgToday
          : day.isWeekend
          ? theme.bgWeekend
          : !day.isCurrentMonth
          ? theme.bgOtherMonth
          : theme.bgPrimary,
        borderColor: theme.borderLight,
        ...(day.isToday && { ringColor: theme.accent }),
      }}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => onDateClick?.(day.date)}
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors hover:opacity-80',
            day.isToday && 'text-white'
          )}
          style={{
            backgroundColor: day.isToday ? theme.accent : 'transparent',
            color: day.isToday ? '#fff' : theme.textPrimary,
          }}
        >
          {day.date.getDate()}
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        {visibleEvents.map((event) => (
          <EventItem
            key={event.id}
            event={event}
            date={day.date}
            theme={theme}
            onClick={() => onEventClick?.(event)}
            onDoubleClick={() => onEventDoubleClick?.(event)}
            compact
          />
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => onDateClick?.(day.date)}
            className="w-full text-xs text-left px-1 py-0.5 hover:underline"
            style={{ color: theme.accent }}
          >
            {translations.labels.moreEvents.replace('{count}', String(hiddenCount))}
          </button>
        )}
      </div>
    </div>
  );
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
    defaultView = 'month',
    firstDayOfWeek = 0,
    // showWeekNumbers = false, // Reserved for future use
    maxEventsPerDay = 3,
    permissions = {},
  } = config;

  const theme = getCalendarTheme(themeName);
  const t = mergeCalendarTranslations(locale, customTranslations);
  const monthNames = getMonthNames(locale);
  const weekdayNames = getWeekdayNames(locale, firstDayOfWeek);

  // State
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(defaultView);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Convert tasks to calendar events
  const events = useMemo(() => tasksToEvents(tasks), [tasks]);

  // Get calendar days for current view
  const calendarDays = useMemo(() => {
    return getCalendarDays(currentYear, currentMonth, firstDayOfWeek);
  }, [currentYear, currentMonth, firstDayOfWeek]);

  // Map events to days
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const day of calendarDays) {
      const dayKey = day.toISOString().split('T')[0] as string;
      const dayEvents = events.filter((event) => isDateInTaskRange(day, event.task));
      map.set(dayKey, dayEvents);
    }

    return map;
  }, [calendarDays, events]);

  // Build calendar day info
  const calendarDayInfo: CalendarDay[] = useMemo(() => {
    return calendarDays.map((date) => {
      const dayKey = date.toISOString().split('T')[0] as string;
      return {
        date,
        isCurrentMonth: date.getMonth() === currentMonth,
        isToday: isToday(date),
        isWeekend: isWeekend(date),
        events: dayEventsMap.get(dayKey) || [],
      };
    });
  }, [calendarDays, currentMonth, dayEventsMap]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }, [currentYear, currentMonth]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleViewChange = useCallback((view: CalendarViewMode) => {
    setViewMode(view);
    callbacks.onViewChange?.(view);
  }, [callbacks]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn('libxai-calendar', className)}
        style={{ backgroundColor: theme.bgPrimary, ...style }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn('libxai-calendar', className)}
        style={{ backgroundColor: theme.bgPrimary, ...style }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 font-semibold">{typeof error === 'string' ? error : error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('libxai-calendar flex flex-col h-full', className)}
      style={{ backgroundColor: theme.bgPrimary, color: theme.textPrimary, ...style }}
    >
      {/* Header / Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: theme.border }}
      >
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          >
            {t.navigation.today}
          </button>

          <div className="flex items-center">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-lg transition-colors hover:bg-opacity-10"
              style={{ color: theme.textSecondary }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg transition-colors hover:bg-opacity-10"
              style={{ color: theme.textSecondary }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="text-lg font-semibold ml-2">
            {monthNames[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* View mode selector & actions */}
        <div className="flex items-center gap-3">
          {/* View mode buttons */}
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: theme.border }}
          >
            {(['month', 'week', 'day'] as CalendarViewMode[]).map((view) => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className="px-3 py-1.5 text-sm transition-colors"
                style={{
                  backgroundColor: viewMode === view ? theme.accent : theme.bgSecondary,
                  color: viewMode === view ? '#fff' : theme.textSecondary,
                }}
              >
                {t.navigation[view]}
              </button>
            ))}
          </div>

          {/* New task button */}
          {permissions.canCreateTask !== false && callbacks.onDateClick && (
            <button
              onClick={() => callbacks.onDateClick?.(new Date())}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.accent, color: '#fff' }}
            >
              <Plus size={16} />
              {t.labels.newTask}
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && (
          <div className="h-full flex flex-col">
            {/* Weekday headers */}
            <div
              className="grid grid-cols-7 border-b"
              style={{ borderColor: theme.border }}
            >
              {weekdayNames.map((name, index) => (
                <div
                  key={index}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: theme.textSecondary }}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {calendarDayInfo.map((day, index) => (
                <DayCell
                  key={index}
                  day={day}
                  events={day.events}
                  theme={theme}
                  translations={t}
                  maxEvents={maxEventsPerDay}
                  onDateClick={callbacks.onDateClick}
                  onEventClick={callbacks.onEventClick}
                  onEventDoubleClick={callbacks.onEventDoubleClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Week view */}
        {viewMode === 'week' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: theme.textMuted }}>
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p>{t.navigation.week} view coming soon</p>
            </div>
          </div>
        )}

        {/* Day view */}
        {viewMode === 'day' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: theme.textMuted }}>
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p>{t.navigation.day} view coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Legend */}
      <div
        className="px-4 py-2 border-t flex items-center gap-4 text-xs"
        style={{ borderColor: theme.border, color: theme.textSecondary }}
      >
        <div className="flex items-center gap-1.5">
          <Circle size={10} style={{ color: theme.statusTodo }} fill={theme.statusTodo} />
          {t.status.todo}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} style={{ color: theme.statusInProgress }} />
          {t.status.inProgress}
        </div>
        <div className="flex items-center gap-1.5">
          <Check size={10} style={{ color: theme.statusCompleted }} />
          {t.status.completed}
        </div>
      </div>
    </div>
  );
}

export default CalendarBoard;
