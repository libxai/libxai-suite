/**
 * CalendarBoard Component — Chronos V2.0 Design
 * Ultra-dark calendar with glass elements, monospace accents, and neon highlights
 * @version 2.0.0
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  X,
  Flag,
  Plus,
  Calendar,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type { CalendarBoardProps, CalendarDay } from './types';
import { mergeCalendarTranslations } from './i18n';
import type { CalendarTranslations } from './types';
import { cn } from '../../utils';
import { TaskDetailModal } from '../TaskDetailModal';
import { QuickTaskCreate } from '../Board/QuickTaskCreate';

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
 * Status Icon — Chronos V2.0 style
 */
function StatusIcon({ task, isDark }: { task: Task; isDark: boolean }) {
  if (task.progress === 100 || task.status === 'completed') {
    return <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />;
  }
  if ((task.progress && task.progress > 0) || task.status === 'in-progress') {
    return <PlayCircle className="w-3 h-3 text-[#007FFF] flex-shrink-0" />;
  }
  return <Circle className={cn("w-3 h-3 flex-shrink-0", isDark ? "text-white/40" : "text-gray-400")} />;
}

// ============================================================================
// Multi-Day Spanning Bar Types & Constants
// ============================================================================

const BAR_HEIGHT = 26;
const BAR_INNER_HEIGHT = 22;
const MAX_MULTI_DAY_LANES = 10;

interface BarSegment {
  taskId: string;
  task: Task;
  rowIndex: number;
  startCol: number;
  endCol: number;
  spanCols: number;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
}

interface BarLayout {
  segmentsByCell: Map<number, BarSegment[]>;
  multiDayTaskIds: Set<string>;
  maxLanesPerRow: number[];
}

/** Calculate day index robustly (UTC to avoid DST issues) */
function dayIndex(date: Date, gridStart: Date): number {
  const utc1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utc2 = Date.UTC(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate());
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

// ─── Chronos V2.0 Helpers ────────────────────────────────────────

/** Format effort: days (default), hours (lens=hours), or dollars (lens=financial) */
function formatEffortDays(minutes: number | undefined, lens: 'hours' | 'financial' = 'hours', hourlyRate = 0): string | null {
  if (!minutes || minutes <= 0) return null;
  if (lens === 'financial' && hourlyRate > 0) {
    const dollars = Math.round((minutes / 60) * hourlyRate);
    return dollars >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : `$${dollars}`;
  }
  const days = Math.round(minutes / 480);
  return days > 0 ? `${days}d` : null;
}

/** Format cost variance between sold vs actual effort */
function formatCostVariance(task: Task, lens: 'hours' | 'financial' = 'hours', hourlyRate = 0): { text: string; isNegative: boolean } | null {
  if (task.soldEffortMinutes == null || task.effortMinutes == null) return null;
  const deltaMinutes = task.soldEffortMinutes - task.effortMinutes;
  if (deltaMinutes === 0) return null;
  const isNegative = deltaMinutes < 0; // over budget
  let display: string;
  if (lens === 'financial' && hourlyRate > 0) {
    const dollars = Math.round(Math.abs(deltaMinutes / 60) * hourlyRate);
    display = dollars >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : `$${dollars}`;
  } else {
    const hours = Math.round(Math.abs(deltaMinutes) / 60);
    display = hours >= 1000 ? `$${(hours / 1000).toFixed(1)}k` : `$${hours}`;
  }
  return { text: `${isNegative ? '-' : '+'}${display}`, isNegative };
}

/** Format minutes as hours or dollars depending on lens */
function fmtMinutes(minutes: number, lens: 'hours' | 'financial' = 'hours', hourlyRate = 0): string {
  if (lens === 'financial' && hourlyRate > 0) {
    const dollars = Math.round(Math.abs(minutes / 60) * hourlyRate);
    return dollars >= 1000 ? `$${(dollars / 1000).toFixed(1)}k` : `$${dollars}`;
  }
  const hours = Math.round(Math.abs(minutes) / 60);
  return hours >= 1000 ? `$${(hours / 1000).toFixed(1)}k` : `$${hours}`;
}

/**
 * MultiDayBar — Renders a spanning bar segment across calendar cells
 * v2.0.0: Enhanced with metadata, critical path, and blocker badges
 */
function MultiDayBar({
  segment,
  isDark,
  onClick,
  blurFinancials,
  isSelected,
  t,
  lens = 'hours',
  hourlyRate = 0,
}: {
  segment: BarSegment;
  isDark: boolean;
  onClick: () => void;
  blurFinancials?: boolean;
  isSelected?: boolean;
  t: CalendarTranslations;
  lens?: 'hours' | 'financial';
  hourlyRate?: number;
}) {
  const { task, spanCols, lane, isStart, isEnd } = segment;

  const isCompleted = task.progress === 100 || task.status === 'completed';
  const isCritical = task.isCriticalPath;

  const roundedClass = isStart && isEnd
    ? 'rounded'
    : isStart
      ? 'rounded-l'
      : isEnd
        ? 'rounded-r'
        : '';

  // v2.0.0: Pre-compute metadata for end segment
  const effortStr = isEnd ? formatEffortDays(task.effortMinutes, lens, hourlyRate) : null;
  const costVar = isEnd ? formatCostVariance(task, lens, hourlyRate) : null;
  const criticalBlocker = isEnd
    ? task.blockers?.find(b => b.severity === 'critical')
    : null;

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ scale: 1.005 }}
      className={cn(
        "absolute flex items-center gap-1.5 px-2 text-xs cursor-pointer overflow-hidden",
        roundedClass,
        isCompleted
          ? (isDark
              ? "text-emerald-400"
              : "bg-emerald-500/10 text-emerald-600 border border-emerald-200")
          : isCritical
            ? (isDark
                ? "text-white/90"
                : "bg-red-50 border border-red-200 text-red-700 hover:border-red-300")
            : (isDark
                ? "text-white/90"
                : "bg-gray-50 border border-gray-200 text-gray-700 hover:border-blue-300"),
      )}
      style={{
        top: `${lane * BAR_HEIGHT}px`,
        left: '1px',
        width: `calc(${spanCols * 100}% - 2px)`,
        height: `${BAR_INNER_HEIGHT}px`,
        zIndex: 10,
        ...(isDark ? (
          isCompleted
            ? {
                background: 'rgba(16, 185, 129, 0.28)',
                border: '1px solid rgba(16, 185, 129, 0.50)',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.2), inset 0 0 14px rgba(16, 185, 129, 0.1)',
              }
            : isCritical
              ? {
                  background: 'rgba(239, 68, 68, 0.35)',
                  border: '1px solid rgba(239, 68, 68, 0.65)',
                  boxShadow: '0 0 18px rgba(239, 68, 68, 0.3), inset 0 0 18px rgba(239, 68, 68, 0.15)',
                }
              : {
                  background: 'rgba(18, 100, 255, 0.38)',
                  border: '1px solid rgba(18, 100, 255, 0.65)',
                  boxShadow: '0 0 18px rgba(18, 100, 255, 0.28), inset 0 0 18px rgba(18, 100, 255, 0.14)',
                }
        ) : {}),
        borderLeftWidth: isStart ? '3px' : undefined,
        borderLeftColor: isStart ? (isCritical ? '#EF4444' : (isCompleted ? '#10B981' : '#1264FF')) : undefined,
        // v2.3.0: Selection highlight — ring glow on all segments
        ...(isSelected ? {
          boxShadow: isDark
            ? '0 0 0 1.5px rgba(0, 229, 255, 0.7), 0 0 12px rgba(0, 229, 255, 0.3)'
            : '0 0 0 1.5px rgba(59, 130, 246, 0.7), 0 0 12px rgba(59, 130, 246, 0.2)',
          zIndex: 20,
        } : {}),
      }}
    >
      {/* v2.0.0: Critical prefix */}
      {isCritical && isStart && (
        <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider flex-shrink-0">
          {t.labels.critical}:
        </span>
      )}

      {/* Task name */}
      <span className="truncate flex-1 text-left font-medium">{task.name}</span>

      {/* v2.0.0: Right-aligned metadata (end segment only) */}
      {isEnd && (effortStr || costVar) && (
        <span className="flex items-center gap-1 flex-shrink-0 text-[9px] font-mono text-white/35 ml-1">
          {effortStr && <span>{t.labels.estimate}: {effortStr}</span>}
          {costVar && (
            <>
              <span className="text-white/15">|</span>
              <span className={cn(
                costVar.isNegative ? 'text-red-400' : 'text-emerald-400',
                blurFinancials && 'blur-sm select-none'
              )}>
                {costVar.text}
              </span>
            </>
          )}
        </span>
      )}

      {/* v2.0.0: Blocker badge (critical blockers) */}
      {criticalBlocker && (
        <span className="flex-shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 ml-1">
          {t.labels.blocker}: {criticalBlocker.type}
        </span>
      )}

      {/* Progress bar at bottom */}
      {task.progress > 0 && task.progress < 100 && (
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-[#1264FF]"
          style={{ width: `${task.progress}%` }}
        />
      )}
    </motion.button>
  );
}

/**
 * Main CalendarBoard Component — Chronos V2.0
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
  blurFinancials = false,
  suppressDetailModal = false,
  lens: calLens = 'hours',
  hourlyRate: calRate = 0,
}: CalendarBoardProps) {
  const {
    theme: themeName = 'dark',
    locale = 'en',
    customTranslations,
    showBacklog = true,
  } = config;

  const t = mergeCalendarTranslations(locale, customTranslations);
  const isDark = themeName === 'dark' || themeName === 'neutral';

  // State
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [expandedCells, setExpandedCells] = useState<Record<number, number>>({});
  const DEFAULT_VISIBLE_TASKS = 3;
  const TASKS_INCREMENT = 3;

  // v2.1.0: Wrapper for task click — respects suppressDetailModal
  // v2.3.0: Also sets selectedTaskId for visual highlight across all segments
  const handleOpenTask = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    if (!suppressDetailModal) {
      setSelectedTask(task);
    }
    onTaskOpen?.(task.id);
  }, [suppressDetailModal, onTaskOpen]);

  // Quick create state (cell index tracks which cell's popover is open)
  const [quickCreateCell, setQuickCreateCell] = useState<number | null>(null);

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

  // Backlog: tasks without dates (unscheduled)
  const backlogTasks = useMemo(() => {
    return flattenTasks(tasks).filter(t => !t.startDate || !t.endDate);
  }, [tasks]);

  // v2.0.0: System status aggregations for sidebar footer
  const systemStatus = useMemo(() => {
    const allTasks = flattenTasks(tasks);
    let totalEffort = 0;
    let totalSoldEffort = 0;
    let totalVarianceDays = 0;
    let varianceCount = 0;
    let totalCostDelta = 0;

    allTasks.forEach(t => {
      if (t.effortMinutes) totalEffort += t.effortMinutes;
      if (t.soldEffortMinutes) totalSoldEffort += t.soldEffortMinutes;
      if (t.scheduleVariance != null) {
        totalVarianceDays += t.scheduleVariance;
        varianceCount++;
      }
      if (t.soldEffortMinutes && t.effortMinutes) {
        totalCostDelta += (t.soldEffortMinutes - t.effortMinutes);
      }
    });

    const budgetUtil = totalSoldEffort > 0
      ? Math.min(100, Math.round((totalEffort / totalSoldEffort) * 100))
      : 0;
    const avgVariance = varianceCount > 0 ? Math.round(totalVarianceDays / varianceCount) : 0;
    const costSign = totalCostDelta < 0 ? '-' : '+';
    const costDisplay = `${costSign}${fmtMinutes(totalCostDelta, calLens, calRate)}`;

    return { budgetUtil, avgVariance, costDisplay, hasCostData: totalSoldEffort > 0 };
  }, [tasks, calLens, calRate]);

  // v2.0.0: Weekly cash out aggregation per calendar row
  const weeklyCashOut = useMemo(() => {
    const rowCosts: number[] = [0, 0, 0, 0, 0, 0]; // 6 rows max
    calendarDays.forEach((day, index) => {
      const row = Math.floor(index / 7);
      day.events.forEach(ev => {
        if (ev.task.startDate && ev.task.soldEffortMinutes) {
          const taskStart = new Date(ev.task.startDate);
          const cellDate = day.date;
          if (
            taskStart.getFullYear() === cellDate.getFullYear() &&
            taskStart.getMonth() === cellDate.getMonth() &&
            taskStart.getDate() === cellDate.getDate()
          ) {
            if (row < rowCosts.length) rowCosts[row]! -= ev.task.soldEffortMinutes; // negative = cash out
          }
        }
      });
    });
    return rowCosts;
  }, [calendarDays]);

  // ============================================================================
  // MULTI-DAY BAR LAYOUT — compute spanning bar positions
  // ============================================================================
  const barLayout = useMemo((): BarLayout => {
    const flatTaskList = flattenTasks(tasks);
    const segmentsByCell = new Map<number, BarSegment[]>();
    const multiDayTaskIds = new Set<string>();
    const maxLanesPerRow: number[] = [0, 0, 0, 0, 0, 0];

    if (calendarDays.length === 0) {
      return { segmentsByCell, multiDayTaskIds, maxLanesPerRow };
    }

    const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const gridStart = dateOnly(calendarDays[0]!.date);
    const gridEnd = dateOnly(calendarDays[calendarDays.length - 1]!.date);

    // Collect multi-day tasks with their clamped cell ranges
    const multiDayTasks: Array<{
      task: Task;
      startIdx: number;
      endIdx: number;
    }> = [];

    for (const task of flatTaskList) {
      if (!task.startDate || !task.endDate) continue;

      const taskStart = dateOnly(task.startDate);
      const taskEnd = dateOnly(task.endDate);

      // Skip single-day tasks
      if (taskStart.getTime() === taskEnd.getTime()) continue;
      // Skip if entirely outside visible grid
      if (taskEnd < gridStart || taskStart > gridEnd) continue;

      // Clamp to visible grid
      const clampedStart = taskStart < gridStart ? gridStart : taskStart;
      const clampedEnd = taskEnd > gridEnd ? gridEnd : taskEnd;

      const startIdx = dayIndex(clampedStart, gridStart);
      const endIdx = dayIndex(clampedEnd, gridStart);

      if (startIdx < 0 || startIdx > 41 || endIdx < 0 || endIdx > 41) continue;
      if (startIdx === endIdx) continue; // became single-day after clamping

      multiDayTaskIds.add(task.id);
      multiDayTasks.push({ task, startIdx, endIdx });
    }

    // Sort: startIdx ascending, then duration descending (longer first → lower lanes)
    multiDayTasks.sort((a, b) => {
      if (a.startIdx !== b.startIdx) return a.startIdx - b.startIdx;
      return (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx);
    });

    // Lane assignment per row: rowLaneEndCol[row][lane] = last occupied column
    const rowLaneEndCol: number[][] = [[], [], [], [], [], []];

    for (const { task, startIdx, endIdx } of multiDayTasks) {
      const startRow = Math.floor(startIdx / 7);
      const endRow = Math.floor(endIdx / 7);

      const taskStart = dateOnly(task.startDate!);
      const taskEnd = dateOnly(task.endDate!);

      let skipped = false;

      for (let row = startRow; row <= endRow; row++) {
        const segStartCol = row === startRow ? startIdx % 7 : 0;
        const segEndCol = row === endRow ? endIdx % 7 : 6;
        const spanCols = segEndCol - segStartCol + 1;

        // Find lowest free lane
        let lane = 0;
        const endCols = rowLaneEndCol[row] ?? [];
        if (!rowLaneEndCol[row]) rowLaneEndCol[row] = endCols;
        while (lane < endCols.length && (endCols[lane] ?? -1) >= segStartCol) {
          lane++;
        }

        // Cap at MAX_MULTI_DAY_LANES
        if (lane >= MAX_MULTI_DAY_LANES) {
          skipped = true;
          break;
        }

        // Reserve this lane
        if (lane >= endCols.length) {
          endCols.push(segEndCol);
        } else {
          endCols[lane] = segEndCol;
        }

        maxLanesPerRow[row] = Math.max(maxLanesPerRow[row] ?? 0, lane + 1);

        const isStart = (row === startRow) && (taskStart >= gridStart);
        const isEnd = (row === endRow) && (taskEnd <= gridEnd);

        const cellIndex = row * 7 + segStartCol;
        const segment: BarSegment = {
          taskId: task.id,
          task,
          rowIndex: row,
          startCol: segStartCol,
          endCol: segEndCol,
          spanCols,
          lane,
          isStart,
          isEnd,
        };

        if (!segmentsByCell.has(cellIndex)) {
          segmentsByCell.set(cellIndex, []);
        }
        segmentsByCell.get(cellIndex)!.push(segment);
      }

      // If task exceeded lane limit, remove from multiDayTaskIds so it renders as single-day
      if (skipped) {
        multiDayTaskIds.delete(task.id);
        // Clean up any segments already added for this task
        segmentsByCell.forEach((segs, key) => {
          const filtered = segs.filter(s => s.taskId !== task.id);
          if (filtered.length === 0) {
            segmentsByCell.delete(key);
          } else {
            segmentsByCell.set(key, filtered);
          }
        });
      }
    }

    return { segmentsByCell, multiDayTaskIds, maxLanesPerRow };
  }, [calendarDays, tasks]);

  // Day names — Chronos uses uppercase short names
  const dayNames = locale === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month name — Chronos: "October 2030" style (capitalized, bold)
  const monthName = currentDate.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Capitalize first letter
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // ============================================================================
  // LOADING STATE — Chronos V2.0
  // ============================================================================
  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#050505]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-[#007FFF]" />
          <p className={cn("text-sm font-mono", isDark ? "text-white/30" : "text-gray-600")}>
            {t.labels.noEvents}...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE — Chronos V2.0
  // ============================================================================
  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#050505]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-500/10")}>
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white/90" : "text-gray-900")}>
              Error
            </h3>
            <p className={cn("text-sm", isDark ? "text-white/40" : "text-gray-600")}>
              {typeof error === 'string' ? error : error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // EMPTY STATE — Chronos V2.0
  // ============================================================================
  if (tasks.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#050505]" : "bg-white", className)} style={style}>
        <div className="text-center max-w-md">
          <div className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center",
            isDark ? "bg-[#007FFF]/10 border border-[#007FFF]/20" : "bg-blue-500/10"
          )}>
            <Calendar className={cn("w-8 h-8", isDark ? "text-[#007FFF]" : "text-blue-500")} />
          </div>
          <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white/90" : "text-gray-900")}>
            {t.labels.noEvents}
          </h3>
          <p className={cn("text-sm", isDark ? "text-white/30" : "text-gray-600")}>
            {t.labels.newTask}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN CALENDAR — Chronos V2.0
  // ============================================================================
  return (
    <div className={cn("flex-1 flex flex-col w-full h-full overflow-hidden", isDark ? "bg-[#050505]" : "bg-white", className)} style={style}>

      {/* Main content: Calendar + Backlog Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">

      {/* Calendar section */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

      {/* ================================================================== */}
      {/* HEADER — Chronos V2.0: Glass bar with month navigation              */}
      {/* ================================================================== */}
      <div className={cn(
        "flex-shrink-0 h-10 flex items-center justify-between px-4 z-20",
        isDark ? "bg-[#050505] border-b border-[#222]" : "bg-white border-b border-gray-200"
      )}>
        {/* Left: View selector + Month navigation */}
        <div className="flex items-center gap-3 shrink-0">
          {/* View selector pill */}
          <div className={cn(
            "flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-md text-xs transition-all",
            isDark ? "bg-[#111] border border-white/10" : "bg-gray-100 border border-gray-200"
          )}>
            <Calendar className={cn("w-3.5 h-3.5", isDark ? "text-[#007FFF]" : "text-blue-500")} />
            <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
              {locale === 'es' ? 'Calendario' : 'Calendar'}
            </span>
          </div>

          {/* Separator */}
          <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />

          {/* Month navigation */}
          <div className="flex items-center gap-1.5 select-none">
            <button
              onClick={goToPreviousMonth}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded transition-colors",
                isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className={cn(
              "text-sm font-semibold tracking-tight min-w-[150px] text-center",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {capitalizedMonthName}
            </span>
            <button
              onClick={goToNextMonth}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded transition-colors",
                isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Custom content + Today button */}
        <div className="flex items-center gap-3 shrink-0">
          {config.toolbarRightContent && (
            <>
              {config.toolbarRightContent}
              <div className={cn("h-4 w-px", isDark ? "bg-white/10" : "bg-gray-200")} />
            </>
          )}
          <button
            onClick={goToToday}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
              isDark
                ? "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                : "bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200"
            )}
          >
            {t.navigation.today}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* WEEKDAY HEADERS — Chronos V2.0: Mono font, tracking-widest         */}
      {/* ================================================================== */}
      <div className={cn(
        "grid grid-cols-7 sticky top-0 z-10",
        isDark ? "bg-[#050505] border-b border-[#222]" : "bg-white border-b border-gray-200"
      )}>
        {dayNames.map((day) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-[10px] font-bold uppercase tracking-widest",
              isDark ? "text-white/60 font-mono" : "text-gray-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ================================================================== */}
      {/* CALENDAR GRID — Chronos V2.0: Border-separated cells               */}
      {/* ================================================================== */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "grid grid-cols-7 min-h-[800px]",
            isDark ? "bg-[#050505]" : "bg-white"
          )}
          style={{ gridAutoRows: 'minmax(140px, auto)' }}
          onClick={() => setSelectedTaskId(null)}
        >
          {calendarDays.map((day, index) => {
            const isLastCol = index % 7 === 6;
            const isLastRow = index >= 35;

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[140px] p-2 transition-colors flex flex-col relative group overflow-visible",
                  // Borders: right + bottom (Chronos grid style)
                  !isLastCol && (isDark ? "border-r border-[#222]" : "border-r border-gray-200"),
                  !isLastRow && (isDark ? "border-b border-[#222]" : "border-b border-gray-200"),
                  // Background
                  isDark
                    ? (day.isCurrentMonth
                        ? "bg-[#050505] hover:bg-white/[0.02]"
                        : "bg-[#080808] opacity-50")
                    : (day.isCurrentMonth
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-50 opacity-50"),
                  // Today highlight
                  day.isToday && isDark && "ring-1 ring-[#007FFF]/40 ring-inset bg-[#007FFF]/[0.03]",
                  day.isToday && !isDark && "ring-2 ring-blue-500 ring-inset"
                )}
              >
                {/* Day number — top left, mono font */}
                <span className={cn(
                  "text-xs font-mono select-none relative z-20",
                  day.isToday
                    ? (isDark ? "text-[#007FFF] font-bold" : "text-blue-600 font-bold")
                    : day.isCurrentMonth
                      ? (isDark ? "text-white/60" : "text-gray-900")
                      : (isDark ? "text-white/20" : "text-gray-400")
                )}>
                  {String(day.date.getDate()).padStart(2, '0')}
                </span>

                {/* ====== BAR ZONE — multi-day spanning bars ====== */}
                {(() => {
                  const rowIdx = Math.floor(index / 7);
                  const barZoneHeight = (barLayout.maxLanesPerRow[rowIdx] ?? 0) * BAR_HEIGHT;
                  const cellSegments = barLayout.segmentsByCell.get(index);

                  if (barZoneHeight === 0 && !cellSegments) return null;

                  return (
                    <div
                      className="relative -mx-2 overflow-visible"
                      style={{ minHeight: `${barZoneHeight}px`, zIndex: 5 }}
                    >
                      {cellSegments?.map((segment) => (
                        <MultiDayBar
                          key={segment.taskId}
                          segment={segment}
                          isDark={isDark}
                          blurFinancials={blurFinancials}
                          isSelected={selectedTaskId === segment.taskId}
                          t={t}
                          lens={calLens}
                          hourlyRate={calRate}
                          onClick={() => {
                            handleOpenTask(segment.task);
                            callbacks.onEventClick?.({
                              id: segment.task.id,
                              title: segment.task.name,
                              start: segment.task.startDate!,
                              end: segment.task.endDate!,
                              task: segment.task,
                            });
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* v2.0.0: Milestone dots */}
                {(() => {
                  const milestones = day.events.filter(
                    ev => ev.task.isMilestone && !barLayout.multiDayTaskIds.has(ev.id)
                  );
                  if (milestones.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1 mt-0.5 px-0.5">
                      {milestones.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 cursor-pointer"
                          title={m.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTask(m.task);
                          }}
                        />
                      ))}
                      {milestones.length > 4 && (
                        <span className={cn("text-[8px] font-mono", isDark ? "text-white/30" : "text-gray-400")}>
                          +{milestones.length - 4}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* v2.0.0: Risk/Warning pills */}
                {(() => {
                  const warnings: Array<{ taskId: string; type: string; severity: string; variance?: number }> = [];
                  day.events.forEach(ev => {
                    ev.task.blockers?.forEach(b => {
                      if (b.severity === 'warning' || b.severity === 'critical') {
                        warnings.push({ taskId: ev.id, type: b.type, severity: b.severity, variance: ev.task.scheduleVariance });
                      }
                    });
                  });
                  const w = warnings[0];
                  if (!w) return null;
                  return (
                    <div className="mt-0.5 px-0.5">
                      <div className={cn(
                        "text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1",
                        w.severity === 'critical'
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      )}>
                        <span>⚠</span>
                        <span className="truncate">
                          {t.labels.risk}: {w.type}
                          {w.variance ? ` (+${Math.abs(w.variance)}d ${t.labels.delay})` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Single-day events (excluding multi-day tasks) */}
                {(() => {
                  const singleDayEvents = day.events.filter(
                    ev => !barLayout.multiDayTaskIds.has(ev.id)
                  );
                  const visibleCount = expandedCells[index] || DEFAULT_VISIBLE_TASKS;
                  const visibleEvents = singleDayEvents.slice(0, visibleCount);
                  const remainingCount = singleDayEvents.length - visibleCount;

                  return (
                    <div className="mt-1 space-y-0.5 flex-1">
                      {visibleEvents.map((event) => (
                        <motion.button
                          key={event.id}
                          onClick={() => {
                            handleOpenTask(event.task);
                            callbacks.onEventClick?.(event);
                          }}
                          whileHover={{ scale: 1.01 }}
                          className={cn(
                            "w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] transition-all text-left",
                            event.task.progress === 100 || event.task.status === 'completed'
                              ? (isDark
                                  ? "text-emerald-400"
                                  : "bg-emerald-500/10 text-emerald-600")
                              : (isDark
                                  ? "text-white/90"
                                  : "bg-gray-50 border border-gray-200 text-gray-700 hover:border-blue-300")
                          )}
                          style={isDark ? (
                            event.task.progress === 100 || event.task.status === 'completed'
                              ? {
                                  background: 'rgba(16, 185, 129, 0.28)',
                                  border: '1px solid rgba(16, 185, 129, 0.50)',
                                  boxShadow: '0 0 14px rgba(16, 185, 129, 0.2), inset 0 0 14px rgba(16, 185, 129, 0.1)',
                                }
                              : event.task.isCriticalPath
                                ? {
                                    background: 'rgba(239, 68, 68, 0.35)',
                                    border: '1px solid rgba(239, 68, 68, 0.65)',
                                    boxShadow: '0 0 18px rgba(239, 68, 68, 0.3), inset 0 0 18px rgba(239, 68, 68, 0.15)',
                                  }
                                : {
                                    background: 'rgba(18, 100, 255, 0.38)',
                                    border: '1px solid rgba(18, 100, 255, 0.65)',
                                    boxShadow: '0 0 18px rgba(18, 100, 255, 0.28), inset 0 0 18px rgba(18, 100, 255, 0.14)',
                                  }
                          ) : undefined}
                        >
                          {/* v2.0.0: Type icon — diamond for milestones, circle for regular */}
                          <span className={cn(
                            "flex-shrink-0 text-[9px]",
                            event.task.isMilestone
                              ? (isDark ? "text-amber-400" : "text-amber-600")
                              : event.task.isCriticalPath
                                ? "text-red-400"
                                : (isDark ? "text-[#1264FF]" : "text-gray-400")
                          )}>
                            {event.task.isMilestone ? '◆' : '●'}
                          </span>
                          <span className="truncate flex-1">{event.title}</span>
                        </motion.button>
                      ))}

                      {/* "+X MORE" button */}
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
                            "text-[10px] px-1.5 py-0.5 cursor-pointer font-mono font-medium uppercase tracking-wide transition-all rounded",
                            isDark ? "text-white/25 hover:text-white/50 hover:bg-white/5" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          +{remainingCount} {locale === 'es' ? 'más' : 'more'}
                        </button>
                      )}

                      {/* "LESS" button */}
                      {visibleCount > DEFAULT_VISIBLE_TASKS && singleDayEvents.length > DEFAULT_VISIBLE_TASKS && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCells(prev => ({
                              ...prev,
                              [index]: DEFAULT_VISIBLE_TASKS
                            }));
                          }}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 cursor-pointer font-mono font-medium uppercase tracking-wide transition-all rounded",
                            isDark ? "text-white/25 hover:text-white/50 hover:bg-white/5" : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {locale === 'es' ? 'menos' : 'less'}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Quick create button — bottom right (only when onTaskCreate exists) */}
                {day.isCurrentMonth && callbacks.onTaskCreate && (
                  <div className="flex items-center justify-end mt-1">
                    {(() => {
                      const isNearBottom = index >= 28;
                      const isNearRight = index % 7 >= 5;

                      return (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickCreateCell(quickCreateCell === index ? null : index);
                            }}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center transition-all",
                              quickCreateCell === index
                                ? "opacity-100 bg-[#007FFF] text-white"
                                : "opacity-0 group-hover:opacity-100",
                              isDark
                                ? "hover:bg-[#007FFF] text-white/30 hover:text-white"
                                : "hover:bg-blue-500 text-gray-400 hover:text-white"
                            )}
                          >
                            <Plus className={cn("w-3.5 h-3.5 transition-transform", quickCreateCell === index && "rotate-45")} />
                          </button>

                          {/* ============================================== */}
                          {/* QUICK CREATE POPOVER — Shared QuickTaskCreate   */}
                          {/* ============================================== */}
                          <AnimatePresence>
                            {quickCreateCell === index && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setQuickCreateCell(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: isNearBottom ? -5 : 5, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: isNearBottom ? -5 : 5, scale: 0.95 }}
                                  transition={{ duration: 0.12 }}
                                  className={cn(
                                    "absolute w-[320px] rounded-lg shadow-2xl z-50",
                                    isNearBottom ? "bottom-full mb-1" : "top-full mt-1",
                                    isNearRight ? "right-0" : "left-0",
                                    isDark
                                      ? "bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                                      : "bg-white border border-gray-200 shadow-xl"
                                  )}
                                >
                                  <QuickTaskCreate
                                    onSubmit={(data) => {
                                      callbacks.onTaskCreate?.({
                                        name: data.name,
                                        startDate: data.startDate || day.date,
                                        endDate: data.endDate || day.date,
                                        priority: data.priority,
                                        assignees: data.assignee ? [data.assignee] : undefined,
                                      });
                                      setQuickCreateCell(null);
                                    }}
                                    onCancel={() => setQuickCreateCell(null)}
                                    availableUsers={config.availableUsers}
                                    isDark={isDark}
                                    locale={locale === 'es' ? 'es' : 'en'}
                                    defaultDate={day.date}
                                    dropdownDirection={isNearBottom ? 'up' : 'down'}
                                  />
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* v2.0.0: Weekly cash out — last column of each row */}
                {index % 7 === 6 && (() => {
                  const row = Math.floor(index / 7);
                  const cashOut = weeklyCashOut[row];
                  if (!cashOut || cashOut === 0) return null;
                  const display = fmtMinutes(cashOut, calLens, calRate);
                  return (
                    <div className={cn(
                      "absolute bottom-1 right-2 text-[9px] font-mono font-bold tabular-nums z-20",
                      cashOut < 0 ? "text-red-400" : "text-emerald-400",
                      blurFinancials && "blur-sm select-none"
                    )}>
                      {t.labels.cashOut}: {cashOut < 0 ? '-' : '+'}{display}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      </div>{/* /Calendar section */}

      {/* ================================================================== */}
      {/* BACKLOG SIDEBAR — Chronos V2.0                                      */}
      {/* ================================================================== */}
      {showBacklog && (
        <aside className={cn(
          "w-[280px] flex-shrink-0 flex flex-col overflow-hidden",
          isDark
            ? "bg-[#050505] border-l border-[#222]"
            : "bg-white border-l border-gray-200"
        )}>
          {/* Sidebar Header */}
          <div className={cn(
            "flex-shrink-0 h-14 flex items-center justify-between px-4",
            isDark ? "bg-[#080808] border-b border-[#222]" : "bg-gray-50 border-b border-gray-200"
          )}>
            <span className={cn(
              "text-[10px] font-mono font-bold uppercase tracking-[0.2em]",
              isDark ? "text-white/40" : "text-gray-500"
            )}>
              {t.labels.backlogTitle}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-mono tabular-nums",
                isDark ? "text-white/20" : "text-gray-400"
              )}>
                {backlogTasks.length}
              </span>
            </div>
          </div>

          {/* Scrollable task cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {backlogTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                  isDark ? "bg-white/5" : "bg-gray-100"
                )}>
                  <Calendar className={cn("w-5 h-5", isDark ? "text-white/20" : "text-gray-400")} />
                </div>
                <p className={cn("text-xs font-mono", isDark ? "text-white/20" : "text-gray-400")}>
                  {locale === 'es' ? 'Sin tareas pendientes' : 'No unscheduled tasks'}
                </p>
              </div>
            ) : (
              backlogTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    handleOpenTask(task);
                  }}
                  className={cn(
                    "w-full text-left rounded-md p-3 transition-all group/card",
                    isDark
                      ? "bg-[#0A0A0A] border border-white/[0.05] hover:border-white/[0.12] hover:bg-[#0E0E0E]"
                      : "bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  )}
                >
                  {/* Task name */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className={cn(
                      "w-1 h-1 rounded-full mt-1.5 flex-shrink-0",
                      isDark ? "bg-white/20" : "bg-gray-300"
                    )} />
                    <span className={cn(
                      "text-sm font-medium leading-snug line-clamp-2",
                      isDark ? "text-white/80 group-hover/card:text-white" : "text-gray-800"
                    )}>
                      {task.name}
                    </span>
                  </div>

                  {/* Tags row */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-3">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                            border: `1px solid ${tag.color}30`,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {task.tags.length > 3 && (
                        <span className={cn(
                          "text-[9px] font-mono px-1 py-0.5",
                          isDark ? "text-white/20" : "text-gray-400"
                        )}>
                          +{task.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* v2.0.0: Estimate + Cost row */}
                  {(task.effortMinutes || task.soldEffortMinutes) && (
                    <div className={cn(
                      "flex items-center gap-2 mt-1.5 ml-3 text-[9px] font-mono",
                      isDark ? "text-white/25" : "text-gray-400",
                      blurFinancials && "blur-sm select-none"
                    )}>
                      {formatEffortDays(task.effortMinutes, calLens, calRate) && (
                        <span>{t.labels.estimate}: {formatEffortDays(task.effortMinutes, calLens, calRate)}</span>
                      )}
                      {(() => {
                        const cv = formatCostVariance(task, calLens, calRate);
                        if (!cv) return null;
                        return (
                          <span className={cv.isNegative ? 'text-red-400' : 'text-emerald-400'}>
                            {cv.text}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Bottom row: priority + assignees */}
                  <div className="flex items-center justify-between mt-2 ml-3">
                    <div className="flex items-center gap-1.5">
                      {task.priority && (
                        <Flag className={cn(
                          "w-3 h-3",
                          task.priority === 'urgent' || task.priority === 'high'
                            ? "text-red-400"
                            : task.priority === 'medium'
                              ? "text-yellow-400"
                              : "text-green-400"
                        )} />
                      )}
                      <StatusIcon task={task} isDark={isDark} />
                    </div>
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex -space-x-1">
                        {task.assignees.slice(0, 2).map((assignee, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-mono font-bold text-white ring-1 ring-[#050505]"
                            style={{ backgroundColor: assignee.color || '#007FFF' }}
                            title={assignee.name}
                          >
                            {assignee.initials || assignee.name?.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* v2.0.0: Quick-add input */}
          {callbacks.onTaskCreate && (
            <div className={cn(
              "flex-shrink-0 px-3 py-2.5 border-t",
              isDark ? "border-[#222] bg-[#080808]" : "border-gray-200 bg-gray-50"
            )}>
              <input
                type="text"
                placeholder={t.labels.typeToAdd}
                className={cn(
                  "w-full text-[11px] font-mono bg-transparent outline-none",
                  isDark ? "text-white/70 placeholder:text-white/15" : "text-gray-700 placeholder:text-gray-400"
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    callbacks.onTaskCreate?.({
                      name: (e.target as HTMLInputElement).value.trim(),
                    });
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          )}

          {/* v2.0.0: System Status Footer */}
          {systemStatus.hasCostData && (
            <div className={cn(
              "flex-shrink-0 px-4 py-3 border-t space-y-2.5",
              isDark ? "border-[#222] bg-[#080808]" : "border-gray-200 bg-gray-50"
            )}>
              <div className={cn(
                "text-[10px] font-mono font-bold uppercase tracking-[0.2em]",
                isDark ? "text-white/40" : "text-gray-500"
              )}>
                ◈ {t.labels.systemStatus}
              </div>

              {/* Budget Utilization */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-mono", isDark ? "text-white/40" : "text-gray-500")}>
                    {t.labels.budgetUtil}
                  </span>
                  <span className={cn(
                    "text-[10px] font-mono font-bold tabular-nums",
                    isDark ? "text-white/60" : "text-gray-700",
                    blurFinancials && "blur-sm select-none"
                  )}>
                    {systemStatus.budgetUtil}%
                  </span>
                </div>
                <div className={cn("h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-gray-200")}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${systemStatus.budgetUtil}%`,
                      background: systemStatus.budgetUtil > 90
                        ? '#EF4444'
                        : systemStatus.budgetUtil > 70
                          ? '#F59E0B'
                          : 'linear-gradient(to right, #2E94FF, #8B5CF6)',
                    }}
                  />
                </div>
              </div>

              {/* Variance + Cost boxes */}
              <div className="grid grid-cols-2 gap-2">
                <div className={cn(
                  "rounded-md px-2 py-1.5 text-center",
                  isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-100 border border-gray-200"
                )}>
                  <div className={cn(
                    "text-[8px] font-mono uppercase tracking-wider mb-0.5",
                    isDark ? "text-white/25" : "text-gray-400"
                  )}>
                    {t.labels.variance}
                  </div>
                  <div className={cn(
                    "text-[11px] font-mono font-bold tabular-nums",
                    systemStatus.avgVariance > 0 ? "text-emerald-400" :
                    systemStatus.avgVariance < 0 ? "text-red-400" :
                    (isDark ? "text-white/50" : "text-gray-600")
                  )}>
                    {systemStatus.avgVariance > 0 ? '+' : ''}{systemStatus.avgVariance} {t.labels.days}
                  </div>
                </div>
                <div className={cn(
                  "rounded-md px-2 py-1.5 text-center",
                  isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-gray-100 border border-gray-200"
                )}>
                  <div className={cn(
                    "text-[8px] font-mono uppercase tracking-wider mb-0.5",
                    isDark ? "text-white/25" : "text-gray-400"
                  )}>
                    {t.labels.cost}
                  </div>
                  <div className={cn(
                    "text-[11px] font-mono font-bold tabular-nums",
                    systemStatus.costDisplay.startsWith('-') ? "text-red-400" : "text-emerald-400",
                    blurFinancials && "blur-sm select-none"
                  )}>
                    {systemStatus.costDisplay}
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      </div>{/* /Main content flex wrapper */}

      {/* ================================================================== */}
      {/* TASK DETAIL MODAL                                                   */}
      {/* v2.1.0: Suppress when consumer provides own drawer                  */}
      {/* ================================================================== */}
      {!suppressDetailModal && <TaskDetailModal
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
        blurFinancials={blurFinancials}
      />}

      {/* ================================================================== */}
      {/* DAY TASKS POPOVER — Chronos V2.0 Glass                             */}
      {/* ================================================================== */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-h-[400px] rounded-xl shadow-2xl z-50 overflow-hidden",
                isDark
                  ? "bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/[0.08]"
                  : "bg-white border border-gray-200"
              )}
            >
              <div className={cn(
                "px-4 py-3 border-b flex items-center justify-between",
                isDark ? "border-white/[0.08] bg-[#080808]" : "border-gray-200"
              )}>
                <span className={cn("font-medium text-sm", isDark ? "text-white/90" : "text-gray-900")}>
                  {selectedDay.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-white/40" : "hover:bg-gray-100 text-gray-500")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 max-h-[320px] overflow-y-auto space-y-1.5">
                {selectedDay.events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedDay(null);
                      handleOpenTask(event.task);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                      isDark ? "hover:bg-white/5 border border-white/5" : "hover:bg-gray-50 border border-gray-100"
                    )}
                  >
                    <StatusIcon task={event.task} isDark={isDark} />
                    <span className={cn("text-sm truncate flex-1", isDark ? "text-white/80" : "text-gray-900")}>
                      {event.title}
                    </span>
                    {(event.task.priority === 'high' || event.task.priority === 'urgent') && (
                      <Flag className="w-3.5 h-3.5 text-red-400" />
                    )}
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
