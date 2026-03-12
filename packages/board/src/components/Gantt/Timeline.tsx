import React, { useMemo, useCallback, useState, useRef } from 'react';
import { TimeScale, Task, GanttTemplates, DependentTaskPreview, DependencyLineStyle } from './types';
import { TaskBar, TaskTooltipData } from './TaskBar';
import { TaskTooltip } from './TaskTooltip';
import { DependencyLine } from './DependencyLine';
import { Milestone } from './Milestone';
import { ganttUtils } from './ganttUtils';
import { useGanttI18n } from './GanttI18nContext';

interface TimelineProps {
  tasks: Task[];
  theme: any;
  rowHeight: number;
  timeScale: TimeScale;
  startDate: Date;
  endDate: Date;
  zoom: number;
  locale?: string; // v0.17.400: Locale for date formatting (e.g., 'en', 'es')
  templates: Required<GanttTemplates>; // v0.8.0
  dependencyLineStyle?: DependencyLineStyle; // v0.17.310: Dependency line style
  showTaskBarLabels?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void; // v0.8.0
  onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0
  onTaskDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
  onDependencyCreate?: (fromTask: Task, toTaskId: string) => void;
  onDependencyDelete?: (taskId: string, dependencyId: string) => void;
  /** v3.0.0: Show baseline ghost bars behind actual bars (Oracle view) */
  showBaseline?: boolean;
  showCriticalPath?: boolean;
  showDependencies?: boolean;
  highlightWeekends?: boolean;
  /** v4.1.0: Per-task edit check — returns false for read-only bars */
  canEditTask?: (task: Task) => boolean;
}

export interface TaskPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function Timeline({
  tasks,
  theme,
  rowHeight: ROW_HEIGHT,
  timeScale,
  startDate,
  endDate,
  zoom,
  locale = 'en', // v0.17.400: Default to English
  templates,
  dependencyLineStyle = 'curved', // v0.17.310
  showTaskBarLabels = true,
  onTaskClick,
  onTaskDblClick, // v0.8.0
  onTaskContextMenu, // v0.8.0
  onTaskDateChange,
  onDependencyCreate,
  onDependencyDelete,
  showBaseline,
  showCriticalPath = true,
  showDependencies = true,
  highlightWeekends = true,
  canEditTask,
}: TimelineProps) {
  const HEADER_HEIGHT = 48; // Must match TaskGrid's HEADER_HEIGHT for alignment

  // v0.17.400: Get i18n translations
  const t = useGanttI18n();

  // v1.4.28: Ref to content SVG for viewport-aware tooltip positioning
  const contentSvgRef = useRef<SVGSVGElement>(null);

  // v0.13.0: State for dependency cascade preview
  const [cascadePreviews, setCascadePreviews] = useState<DependentTaskPreview[]>([]);

  // v1.5.0: Track drag offset so dependency lines follow the dragged bar in real-time
  const [dragOffset, setDragOffset] = useState<{ taskId: string; daysDelta: number } | null>(null);

  // v0.17.76: State for active tooltip - rendered in top layer for proper z-order
  const [activeTooltip, setActiveTooltip] = useState<TaskTooltipData | null>(null);

  // v0.17.451: Track hovered dependency line for top-layer rendering
  const [hoveredDepLine, setHoveredDepLine] = useState<{
    key: string;
    fromId: string;
    toId: string;
    exitX: number;
    exitY: number;
    enterX: number;
    enterY: number;
  } | null>(null);

  // v0.17.452: Ref to track if mouse is over a dependency line (for fast mouse movement fix)
  const isOverDependencyRef = useRef(false);

  // v0.17.452: Track deleted dependencies locally for instant UI feedback
  // Note: We don't clear this on tasks change - once deleted, it stays hidden
  // The Set will naturally become irrelevant as the dependency no longer exists in data
  const [deletedDeps, setDeletedDeps] = useState<Set<string>>(new Set());

  // v1.4.19: State for click-to-schedule indicator (ClickUp-style)
  // Tracks mouse position over empty task rows to show where the bar will be created
  const [scheduleIndicator, setScheduleIndicator] = useState<{
    taskId: string;
    x: number;
    y: number;
    date: Date;
  } | null>(null);

  // v0.17.452: Handler for SVG mouse move - clears hover if mouse moved off dependency lines
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // If we have a hovered line but mouse is not over a dependency element, clear it
    if (hoveredDepLine && !isOverDependencyRef.current) {
      // Check if the target or any parent has the dependency data attribute
      let target = e.target as Element | null;
      let isOverDep = false;
      while (target && target !== e.currentTarget) {
        if (target.getAttribute?.('data-dependency-line') === 'true' ||
            target.getAttribute?.('data-dependency-hover-overlay') === 'true') {
          isOverDep = true;
          break;
        }
        target = target.parentElement;
      }
      if (!isOverDep) {
        setHoveredDepLine(null);
      }
    }
  }, [hoveredDepLine]);

  // v0.17.76: Callback for TaskBar hover changes
  const handleTooltipChange = useCallback((tooltipData: TaskTooltipData | null) => {
    setActiveTooltip(tooltipData);
  }, []);

  // v0.17.363: calculateVerticalX removed - DependencyLine now handles its own routing

  // Calculate dimensions
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = timeScale === 'day' ? 60 : timeScale === 'week' ? 20 : 8;
  const timelineWidth = totalDays * dayWidth * zoom;

  // Get week number - moved before useMemo
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Check if date is weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Convert pixel position to date
  const pixelToDate = useCallback((pixelX: number): Date => {
    const days = Math.round(pixelX / (dayWidth * zoom));
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }, [startDate, dayWidth, zoom]);

  // Handle click on timeline to create task bar for tasks without dates
  const handleTimelineClick = useCallback((e: React.MouseEvent<SVGRectElement>, task: Task) => {
    // Only create bar if task doesn't have dates (no existing bar)
    if (task.startDate && task.endDate) {
      return; // Task already has dates, do nothing
    }

    const svgElement = e.currentTarget.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // Calculate the clicked date
    const clickedDate = pixelToDate(svgPoint.x);

    // Create a 1-day task bar
    const endDate = new Date(clickedDate);
    endDate.setDate(endDate.getDate() + 1);

    // Clear the schedule indicator
    setScheduleIndicator(null);

    // Call the date change handler to create the task bar
    onTaskDateChange?.(task, clickedDate, endDate);
  }, [pixelToDate, onTaskDateChange]);

  // v1.4.19: Handle mouse move over empty task row to show schedule indicator
  const handleEmptyRowMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>, task: Task, rowIndex: number) => {
    const svgElement = e.currentTarget.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // Calculate the date at cursor position
    const hoverDate = pixelToDate(svgPoint.x);

    // Calculate snapped X position (align to day grid)
    const days = Math.round(svgPoint.x / (dayWidth * zoom));
    const snappedX = days * dayWidth * zoom;

    setScheduleIndicator({
      taskId: task.id,
      x: snappedX,
      y: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
      date: hoverDate,
    });
  }, [pixelToDate, dayWidth, zoom, ROW_HEIGHT]);

  // v1.4.19: Handle mouse leave from empty task row
  const handleEmptyRowMouseLeave = useCallback(() => {
    setScheduleIndicator(null);
  }, []);

  // Calculate parent task dates from subtasks and flatten for rendering
  const flatTasks = useMemo(() => {
    // Helper function to calculate parent dates from subtasks (MS Project style)
    // v0.17.47: Parent tasks ALWAYS derive dates from subtasks (summary task behavior)
    // This is the standard behavior in professional project management tools
    const calculateParentDates = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        // If task has subtasks, calculate dates from them
        if (task.subtasks && task.subtasks.length > 0) {
          // First, recursively calculate dates for nested subtasks
          const updatedSubtasks = calculateParentDates(task.subtasks);

          // Filter subtasks that have dates
          const subtasksWithDates = updatedSubtasks.filter(st => st.startDate && st.endDate);

          if (subtasksWithDates.length > 0) {
            // Calculate earliest start and latest end from subtasks
            const startDates = subtasksWithDates.map(st => st.startDate!.getTime());
            const endDates = subtasksWithDates.map(st => st.endDate!.getTime());

            const earliestStart = new Date(Math.min(...startDates));
            const latestEnd = new Date(Math.max(...endDates));

            // v0.17.47: ALWAYS update parent dates from subtasks (MS Project summary task behavior)
            // Parent tasks are read-only containers - their dates are derived from children
            return {
              ...task,
              subtasks: updatedSubtasks,
              startDate: earliestStart,
              endDate: latestEnd,
            };
          }

          return { ...task, subtasks: updatedSubtasks };
        }

        return task;
      });
    };

    // Helper function to flatten tasks for rendering
    const flattenTasks = (tasks: Task[], result: Task[] = []): Task[] => {
      // Sort by position to maintain creation order
      const sortedTasks = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      for (const task of sortedTasks) {
        result.push(task);
        // Only include subtasks if parent is expanded (or if isExpanded is undefined, default to true)
        if (task.subtasks && task.subtasks.length > 0 && (task.isExpanded === undefined || task.isExpanded)) {
          flattenTasks(task.subtasks, result);
        }
      }
      return result;
    };

    // Apply parent date calculation before flattening
    const tasksWithCalculatedDates = calculateParentDates(tasks);
    const flattened = flattenTasks(tasksWithCalculatedDates);

    return flattened;
  }, [tasks]);

  // Calculate task position
  const getTaskPosition = useCallback((task: Task) => {
    // Return null position for tasks without dates
    if (!task.startDate || !task.endDate) {
      return { x: 0, width: 0 };
    }

    const taskStart = task.startDate.getTime();
    const taskEnd = task.endDate.getTime();
    const rangeStart = startDate.getTime();

    const daysFromStart = (taskStart - rangeStart) / (1000 * 60 * 60 * 24);
    // +1 so the end-date day is fully included (e.g. 16→28 feb = 13 columns, not 12)
    const duration = (taskEnd - taskStart) / (1000 * 60 * 60 * 24) + 1;

    const x = daysFromStart * dayWidth * zoom;
    // Minimum width: allow 1 day minimum, but ensure at least 40px for visibility
    const minWidth = Math.max(dayWidth * zoom, 40);
    const width = Math.max(duration * dayWidth * zoom, minWidth);

    return { x, width };
  }, [startDate, dayWidth, zoom]);

  // Build task positions map for collision detection
  // v0.13.7: Y positions no longer include HEADER_HEIGHT (header is now separate sticky element)
  const taskPositions = useMemo((): TaskPosition[] => {
    return flatTasks
      .filter(task => task.startDate && task.endDate) // Only include tasks with dates
      .map((task) => {
        const { x, width } = getTaskPosition(task);
        const actualIndex = flatTasks.findIndex(t => t.id === task.id);
        const y = actualIndex * ROW_HEIGHT + (ROW_HEIGHT - 18) / 2; // v1.4.29: Centered for 18px bar
        return {
          id: task.id,
          x,
          y,
          width,
          height: 18, // v1.4.29: Slimmer elegant bars
        };
      });
  }, [flatTasks, getTaskPosition]);

  // v0.13.0: Handle drag move for dependency cascade preview
  // v1.5.0: Also store drag offset so dependency lines follow in real-time
  const handleTaskDragMove = useCallback((taskId: string, daysDelta: number, isDragging: boolean) => {
    if (!isDragging) {
      setCascadePreviews([]);
      setDragOffset(null);
      return;
    }

    // Store drag offset for dependency line adjustment
    setDragOffset({ taskId, daysDelta });

    if (daysDelta === 0) {
      setCascadePreviews([]);
      return;
    }

    // Calculate cascade preview positions for all dependent tasks
    const previews = ganttUtils.calculateCascadePreview(
      tasks,
      taskId,
      daysDelta,
      flatTasks,
      startDate,
      dayWidth * zoom,
      ROW_HEIGHT,
      HEADER_HEIGHT
    );

    setCascadePreviews(previews);
  }, [tasks, flatTasks, startDate, dayWidth, zoom, ROW_HEIGHT, HEADER_HEIGHT]);

  // v1.5.0: Get drag-adjusted position for dependency line endpoints
  // During drag, offsets the dragged task and its cascade dependents
  const getDragAdjustedPosition = useCallback((taskId: string, pos: { x: number; width: number }) => {
    if (!dragOffset) return pos;
    const scaledDayWidth = dayWidth * zoom;
    const pixelDelta = dragOffset.daysDelta * scaledDayWidth;

    // Dragged task — offset by daysDelta
    if (taskId === dragOffset.taskId) {
      return { x: pos.x + pixelDelta, width: pos.width };
    }

    // Dependent task with cascade preview — use preview position
    const preview = cascadePreviews.find(p => p.taskId === taskId);
    if (preview) {
      return { x: preview.previewX, width: preview.width };
    }

    return pos;
  }, [dragOffset, cascadePreviews, dayWidth, zoom]);

  // Generate timeline headers
  // v0.17.400: Use locale for date formatting (e.g., 'es' -> 'Dic 22', 'en' -> 'Dec 22')
  const headers = useMemo(() => {
    const result: Array<{ date: Date; label: string; x: number }> = [];
    const current = new Date(startDate);
    let index = 0;

    while (current <= endDate) {
      const daysFromStart =
        (current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const x = daysFromStart * dayWidth * zoom;

      if (timeScale === 'day') {
        result.push({
          date: new Date(current),
          label: current.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          x,
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === 'week') {
        const weekNum = getWeekNumber(current);
        result.push({
          date: new Date(current),
          label: `${t.labels.week} ${weekNum}`,
          x,
        });
        current.setDate(current.getDate() + 7);
      } else {
        result.push({
          date: new Date(current),
          label: current.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
          x,
        });
        current.setMonth(current.getMonth() + 1);
      }
      index++;
    }

    return result;
  }, [startDate, endDate, timeScale, dayWidth, zoom, locale, t.labels.week]);

  // Today position
  const todayX = useMemo(() => {
    const today = new Date();
    const daysFromStart = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysFromStart * dayWidth * zoom;
  }, [startDate, dayWidth, zoom]);

  // v0.13.7: Content height calculation (without header - header is now separate)
  const contentHeight = Math.max(flatTasks.length * ROW_HEIGHT, 600 - HEADER_HEIGHT);

  return (
    <div
      className="w-full flex flex-col"
      data-gantt-chart
      style={{ backgroundColor: theme.bgPrimary }}
    >
      {/* v0.13.7: Sticky Header - stays visible during vertical scroll */}
      {/* Chronos V2: Frosted glass header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: theme.glassHeader || theme.bgSecondary,
          flexShrink: 0,
          height: `${HEADER_HEIGHT}px`,
          borderBottom: `1px solid ${theme.borderLight}`,
          boxSizing: 'border-box', // Border included in height
        }}
      >
        <svg
          width={Math.max(timelineWidth, 1000)}
          height={HEADER_HEIGHT - 1} // -1 for border
          style={{ display: 'block' }}
        >
          {/* Header Background — opaque to prevent task bars bleeding through */}
          <rect
            x={0}
            y={0}
            width={Math.max(timelineWidth, 1000)}
            height={HEADER_HEIGHT}
            fill={theme.glassHeader || theme.bgSecondary}
          />

          {/* Header Grid Lines and Text */}
          {headers.map((header, index) => (
            <g key={`header-${index}`}>
              {/* Grid line in header - skip first line since TaskGrid border serves as divider */}
              {index > 0 && (
                <line
                  x1={header.x}
                  y1={0}
                  x2={header.x}
                  y2={HEADER_HEIGHT}
                  stroke={theme.border}
                  strokeWidth={1}
                  opacity={0.1}
                />
              )}

              {/* Header text - JetBrains Mono for technical/date display */}
              <text
                x={header.x + 8}
                y={HEADER_HEIGHT / 2}
                fill={theme.textTertiary}
                fontSize="11"
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontWeight="500"
                dominantBaseline="middle"
              >
                {header.label}
              </text>
            </g>
          ))}

          {/* Today marker in header — Chronos V2: Badge instead of circle */}
          {todayX >= 0 && todayX <= timelineWidth && (
            <g>
              {/* Neon glow circle */}
              <circle cx={todayX} cy={HEADER_HEIGHT - 10} r={4} fill={theme.today} opacity={1} />
              {theme.neonRedGlow && (
                <circle cx={todayX} cy={HEADER_HEIGHT - 10} r={6} fill="none" stroke={theme.today} strokeWidth={1} opacity={0.3} />
              )}
              {/* TODAY badge */}
              {theme.neonRedGlow && (
                <g transform={`translate(${todayX - 18}, 2)`}>
                  <rect x={0} y={0} width={36} height={14} rx={2} fill="rgba(0,0,0,0.8)" stroke={theme.today} strokeWidth={0.5} opacity={0.8} />
                  <text x={18} y={10} textAnchor="middle" fill={theme.today} fontSize="7" fontFamily="'JetBrains Mono', monospace" fontWeight="700" letterSpacing="0.1em">{t.labels.today.toUpperCase()}</text>
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Scrollable Content Area */}
      {/* v0.17.31: Added overflow:visible to allow tooltips to render above the header */}
      {/* v0.17.452: Added onMouseMove to detect when mouse leaves dependency lines (fast movement fix) */}
      <svg
        ref={contentSvgRef}
        width={Math.max(timelineWidth, 1000)}
        height={contentHeight}
        style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
        onMouseMove={handleSvgMouseMove}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>

          {/* Neutral theme: Diagonal stripes pattern for critical/overdue tasks */}
          <pattern id="diagonal-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={theme.border} strokeWidth="2" />
          </pattern>

          {/* Chronos V2: Weekend hatched pattern — diagonal toward right */}
          <pattern id="weekend-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={(theme.bgPrimary || '').charAt(1) === '0' ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.04)'} strokeWidth="4" />
          </pattern>

          {/* v1.4.29: Diagonal stripes for remaining (no-progress) area of task bars */}
          <pattern id="bar-remaining-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            {/* Stripe 1: colored band */}
            <rect x="0" y="0" width="5" height="10" fill="#2E94FF" opacity="0.18" />
            {/* Stripe 2: gray band */}
            <rect x="5" y="0" width="5" height="10" fill="#94A3B8" opacity="0.12" />
          </pattern>
        </defs>

        {/* Full SVG Background - v0.17.220: Matches TaskGrid bgPrimary for alignment */}
        <rect
          x={0}
          y={0}
          width={Math.max(timelineWidth, 1000)}
          height={contentHeight}
          fill={theme.bgPrimary}
        />

        {/* Weekend backgrounds removed — only hatch overlay after row backgrounds */}

        {/* Row Backgrounds - v0.17.220: Alternating rows matching TaskGrid */}
        {flatTasks.map((task, index) => (
          <rect
            key={`row-bg-${task.id}`}
            x={0}
            y={index * ROW_HEIGHT}
            width={Math.max(timelineWidth, 1000)}
            height={ROW_HEIGHT}
            fill={index % 2 === 0 ? theme.bgPrimary : theme.bgGrid}
            opacity={1}
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* v1.4.29: Grid lines rendered AFTER row backgrounds so they are never covered */}
        {/* Vertical column grid lines */}
        {headers.map((header, index) =>
          index > 0 ? (
            <line
              key={`vgrid-${index}`}
              x1={header.x}
              y1={0}
              x2={header.x}
              y2={flatTasks.length * ROW_HEIGHT}
              stroke={theme.borderLight}
              strokeWidth={1}
              shapeRendering="crispEdges"
              opacity={theme.neonRedGlow ? 1 : 0.1}
            />
          ) : null
        )}

        {/* Weekend overlays — subtle gray tint + diagonal hatch */}
        {highlightWeekends && headers.map((header, index) => {
          const nextX = headers[index + 1]?.x || timelineWidth;
          const isWeekendDay = isWeekend(header.date);

          return isWeekendDay ? (
            <g key={`we-overlay-${index}`}>
              <rect
                x={header.x}
                y={0}
                width={nextX - header.x}
                height={flatTasks.length * ROW_HEIGHT}
                fill={(theme.bgPrimary || '').charAt(1) === '0' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                style={{ pointerEvents: 'none' }}
              />
              <rect
                x={header.x}
                y={0}
                width={nextX - header.x}
                height={flatTasks.length * ROW_HEIGHT}
                fill="url(#weekend-hatch)"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ) : null;
        })}

        {/* Row interactions: Click-to-Create functionality */}
        {flatTasks.map((task, index) => {
          const hasTaskBar = task.startDate && task.endDate;

          return (
            <g key={`row-group-${task.id}`}>
              {/* Clickable area for tasks without dates - v1.4.19: ClickUp-style with moving indicator */}
              {!hasTaskBar && (
                <>
                  <rect
                    key={`clickable-${task.id}`}
                    x={0}
                    y={index * ROW_HEIGHT}
                    width={timelineWidth}
                    height={ROW_HEIGHT}
                    fill="transparent"
                    style={{
                      cursor: 'pointer',
                      pointerEvents: 'all'
                    }}
                    onClick={(e) => handleTimelineClick(e, task)}
                    onMouseMove={(e) => handleEmptyRowMouseMove(e, task, index)}
                    onMouseLeave={() => {
                      handleEmptyRowMouseLeave();
                    }}
                  />
                  {/* v1.4.19: Schedule indicator - circular marker that follows cursor (ClickUp-style) */}
                  {scheduleIndicator && scheduleIndicator.taskId === task.id && (
                    <g style={{ pointerEvents: 'none' }}>
                      {/* Vertical line at cursor position */}
                      <line
                        x1={scheduleIndicator.x}
                        y1={index * ROW_HEIGHT + 4}
                        x2={scheduleIndicator.x}
                        y2={index * ROW_HEIGHT + ROW_HEIGHT - 4}
                        stroke={theme.accent}
                        strokeWidth={2}
                        opacity={0.8}
                      />
                      {/* Circle indicator */}
                      <circle
                        cx={scheduleIndicator.x}
                        cy={scheduleIndicator.y}
                        r={8}
                        fill={theme.accent}
                        opacity={0.9}
                      />
                      {/* Inner circle for visual effect */}
                      <circle
                        cx={scheduleIndicator.x}
                        cy={scheduleIndicator.y}
                        r={4}
                        fill="white"
                        opacity={0.9}
                      />
                      {/* Date tooltip above the indicator */}
                      <g transform={`translate(${scheduleIndicator.x}, ${index * ROW_HEIGHT - 8})`}>
                        <rect
                          x={-40}
                          y={-20}
                          width={80}
                          height={20}
                          rx={4}
                          fill={theme.bgSecondary}
                          stroke={theme.border}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={-6}
                          textAnchor="middle"
                          fill={theme.textPrimary}
                          fontSize="11"
                          fontFamily="Inter, sans-serif"
                          fontWeight="500"
                        >
                          {scheduleIndicator.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </text>
                      </g>
                    </g>
                  )}
                  {/* Placeholder text - only show when no indicator is active */}
                  {(!scheduleIndicator || scheduleIndicator.taskId !== task.id) && (
                    <text
                      key={`placeholder-${task.id}`}
                      x={todayX > 0 ? todayX : 100}
                      y={index * ROW_HEIGHT + ROW_HEIGHT / 2}
                      fill={theme.textTertiary}
                      fontSize="12"
                      fontFamily="Inter, sans-serif"
                      fontStyle="italic"
                      dominantBaseline="middle"
                      opacity={0.4}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {t.labels.clickToSetDates}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* v0.17.363: Dependencies moved to AFTER tasks for proper layering */}

        {/* Tasks - v0.13.7: Adjusted Y positions */}
        {flatTasks.map((task, index) => {
          // Don't render task bar if task doesn't have dates
          if (!task.startDate || !task.endDate) {
            return null;
          }

          const { x, width } = getTaskPosition(task);
          const y = index * ROW_HEIGHT + (ROW_HEIGHT - 18) / 2; // v1.4.29: Centered for 18px bar

          // Container phase (has subtasks): render as bracket bar
          const isContainer = task.subtasks && task.subtasks.length > 0 && !task.isMilestone;

          if (task.isMilestone) {
            return (
              <Milestone
                key={task.id}
                task={task}
                x={x + width / 2}
                y={y + 12}
                theme={theme}
                onClick={onTaskClick}
              />
            );
          }

          if (isContainer) {
            // v5.0.0: Master/Summary bars — 8px progress bar with SPI-colored fill
            const isDarkTheme = !theme.bgPrimary || theme.bgPrimary.startsWith('#0') || theme.bgPrimary.startsWith('#1');
            const masterH = 8;
            const masterY = y + (ROW_HEIGHT - 18) / 2 + (18 - masterH) / 2;
            const masterR = 4;

            // Calculate SPI for color
            const progress = task.progress || 0;
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const hasStarted = task.startDate && now >= task.startDate;
            const isOverduePhase = task.endDate && (() => {
              const end = new Date(task.endDate!);
              end.setHours(0, 0, 0, 0);
              return now > end;
            })();
            const isFuturePhase = task.startDate && now < task.startDate;

            let spi = 1.0;
            if (hasStarted && task.startDate && task.endDate && !isFuturePhase) {
              const start = new Date(task.startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(task.endDate);
              end.setHours(0, 0, 0, 0);
              const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              const elapsedDays = Math.min((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), totalDays);
              const timelinePct = (elapsedDays / totalDays) * 100;
              spi = timelinePct > 0 ? progress / timelinePct : 1.0;
            }

            let fillColor: string;
            if (progress >= 100) {
              fillColor = '#00E5CC';
            } else if (isFuturePhase) {
              fillColor = '#4B5563';
            } else if (isOverduePhase && progress < 100) {
              fillColor = '#EF4444';
            } else if (spi >= 0.95) {
              fillColor = '#22C55E';
            } else if (spi >= 0.80) {
              fillColor = '#F59E0B';
            } else {
              fillColor = '#EF4444';
            }

            const fillWidth = Math.max((progress / 100) * width, progress > 0 ? masterR * 2 : 0);
            const showPctOnBar = width > 100 && progress > 0;

            return (
              <g
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTaskContextMenu?.(task, e as unknown as React.MouseEvent);
                }}
                onMouseMove={(e) => {
                  handleTooltipChange({
                    task,
                    x,
                    y: masterY,
                    width,
                    height: masterH,
                    showBelow: masterY < 100,
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  });
                }}
                onMouseLeave={() => handleTooltipChange(null)}
                style={{ cursor: 'default' }}
              >
                {/* Invisible hover area — full row height for easy targeting */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={ROW_HEIGHT}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                />
                {/* Ghost background — full duration */}
                <rect
                  x={x}
                  y={masterY}
                  width={width}
                  height={masterH}
                  rx={masterR}
                  fill={isDarkTheme ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}
                />
                {/* Progress fill — SPI-colored */}
                {progress > 0 && (
                  <rect
                    x={x}
                    y={masterY}
                    width={fillWidth}
                    height={masterH}
                    rx={masterR}
                    fill={fillColor}
                  />
                )}
                {/* Percentage label on bar (only if wide enough) */}
                {showPctOnBar && (
                  <text
                    x={x + fillWidth + 6}
                    y={masterY + masterH / 2}
                    dominantBaseline="central"
                    fill={isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {Math.round(progress)}%
                  </text>
                )}
              </g>
            );
          }

          return (
            <TaskBar
              key={task.id}
              task={task}
              x={x}
              y={y}
              width={width}
              theme={theme}
              dayWidth={dayWidth * zoom}
              startDate={startDate}
              templates={templates}
              onClick={onTaskClick}
              onDoubleClick={onTaskDblClick} // v0.8.0
              onContextMenu={onTaskContextMenu} // v0.8.0
              onDateChange={onTaskDateChange}
              onDependencyCreate={onDependencyCreate}
              allTaskPositions={taskPositions}
              onDragMove={handleTaskDragMove} // v0.13.0
              onHoverChange={handleTooltipChange} // v0.17.76: Top-layer tooltip
              showBaseline={showBaseline} // v3.0.0: Baseline overlay
              showTaskBarLabels={showTaskBarLabels}
              showCriticalPath={showCriticalPath}
              readOnly={canEditTask ? !canEditTask(task) : false}
            />
          );
        })}

        {/* v0.17.363: SINGLE dependency layer - rendered AFTER tasks for proper z-order */}
        {/* v0.17.451: Base layer only - hover overlay rendered separately at end */}
        {showDependencies && flatTasks.map((task, toIndex) => {
          if (!task.dependencies || task.dependencies.length === 0) return null;
          if (!task.startDate || !task.endDate) return null;

          return task.dependencies.map((depId) => {
            const depTask = flatTasks.find((t) => t.id === depId);
            if (!depTask) return null;
            if (!depTask.startDate || !depTask.endDate) return null;

            const fromIndex = flatTasks.findIndex((t) => t.id === depId);
            // v1.5.0: Use drag-adjusted positions so lines follow during drag
            const fromPos = getDragAdjustedPosition(depTask.id, getTaskPosition(depTask));
            const toPos = getDragAdjustedPosition(task.id, getTaskPosition(task));

            const exitX = fromPos.x + fromPos.width;
            const exitY = fromIndex * ROW_HEIGHT + 26;
            const enterX = toPos.x;
            const enterY = toIndex * ROW_HEIGHT + 26;

            const lineKey = `dep-${depId}-${task.id}`;

            // v0.17.452: Skip rendering if this dependency was deleted locally
            if (deletedDeps.has(lineKey)) return null;

            return (
              <DependencyLine
                key={lineKey}
                x1={exitX}
                y1={exitY}
                x2={enterX}
                y2={enterY}
                theme={theme}
                lineStyle={dependencyLineStyle}
                onDelete={() => onDependencyDelete?.(task.id, depId)}
                onHoverChange={(isHovered) => {
                  // v0.17.452: Update ref for fast mouse movement detection
                  isOverDependencyRef.current = isHovered;
                  if (isHovered) {
                    setHoveredDepLine({
                      key: lineKey,
                      fromId: depId,
                      toId: task.id,
                      exitX,
                      exitY,
                      enterX,
                      enterY,
                    });
                  }
                  // v0.17.451: Don't clear on base layer mouseLeave - let overlay handle it
                }}
              />
            );
          });
        })}

        {/* v0.13.0: Dependency Cascade Preview - Ghost bars showing where dependent tasks will move */}
        {/* v0.13.4: Simplified - no conflicting animation, direct position */}
        {/* v0.13.7: Adjusted Y positions for cascade previews */}
        {cascadePreviews.map((preview) => (
          <g
            key={`cascade-preview-${preview.taskId}`}
            style={{ pointerEvents: 'none' }}
          >
            {/* Ghost bar at exact preview position - matched to actual bar height (18px) */}
            <rect
              x={preview.previewX}
              y={preview.y - HEADER_HEIGHT}
              width={preview.width}
              height={18}
              rx={6}
              fill={preview.color || theme.accent}
              opacity={0.15}
              stroke={theme.accent}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {/* Days delta label */}
            {Math.abs(preview.daysDelta) > 0 && (
              <text
                x={preview.previewX + preview.width / 2}
                y={preview.y - HEADER_HEIGHT + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.accent}
                fontSize="10"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
                style={{ userSelect: 'none' }}
              >
                {preview.daysDelta > 0 ? `+${preview.daysDelta}d` : `${preview.daysDelta}d`}
              </text>
            )}
          </g>
        ))}

        {/* v0.17.451: Dependency hover overlay - rendered LAST to appear on top of all lines */}
        {showDependencies && hoveredDepLine && (
          <DependencyLine
            key={`${hoveredDepLine.key}-hover-overlay`}
            x1={hoveredDepLine.exitX}
            y1={hoveredDepLine.exitY}
            x2={hoveredDepLine.enterX}
            y2={hoveredDepLine.enterY}
            theme={theme}
            lineStyle={dependencyLineStyle}
            onDelete={() => {
              // v0.17.452: Clear hover state and mark as deleted for instant UI feedback
              const lineKey = hoveredDepLine.key;
              setHoveredDepLine(null);
              isOverDependencyRef.current = false;
              setDeletedDeps(prev => new Set(prev).add(lineKey));
              onDependencyDelete?.(hoveredDepLine.toId, hoveredDepLine.fromId);
            }}
            hoverOverlayOnly={true}
            onHoverChange={(isHovered) => {
              // v0.17.452: Update ref for fast mouse movement detection
              isOverDependencyRef.current = isHovered;
              // Only clear if mouse actually left the overlay area
              if (!isHovered) {
                setHoveredDepLine(null);
              }
            }}
          />
        )}

        {/* v0.17.179: Today Line — Chronos V2: Neon red with glow */}
        {todayX >= 0 && todayX <= timelineWidth && (
          <g style={{ pointerEvents: 'none' }}>
            {/* Glow effect (wider, transparent) */}
            {theme.neonRedGlow && (
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={contentHeight}
                stroke={theme.today}
                strokeWidth={6}
                opacity={0.15}
              />
            )}
            {/* Sharp line */}
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={contentHeight}
              stroke={theme.today}
              strokeWidth={1}
              opacity={1}
            />
          </g>
        )}

      </svg>

      {/* v1.4.28: Tooltip rendered via portal to document.body — never clipped by scroll containers */}
      {activeTooltip && (
        <TaskTooltip
          tooltipData={activeTooltip}
          theme={theme}
          locale={locale === 'es' ? 'es' : 'en'}
        />
      )}
    </div>
  );
}