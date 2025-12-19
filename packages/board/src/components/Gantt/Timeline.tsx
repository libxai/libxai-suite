import { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { TimeScale, Task, GanttTemplates, DependentTaskPreview } from './types';
import { TaskBar, TaskTooltipData } from './TaskBar';
import { TaskTooltip } from './TaskTooltip';
import { DependencyLine, DependencyHoverData } from './DependencyLine';
import { Milestone } from './Milestone';
import { ganttUtils } from './ganttUtils';

interface TimelineProps {
  tasks: Task[];
  theme: any;
  rowHeight: number;
  timeScale: TimeScale;
  startDate: Date;
  endDate: Date;
  zoom: number;
  templates: Required<GanttTemplates>; // v0.8.0
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void; // v0.8.0
  onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0
  onTaskDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
  onDependencyCreate?: (fromTask: Task, toTaskId: string) => void;
  onDependencyDelete?: (taskId: string, dependencyId: string) => void;
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
  templates,
  onTaskClick,
  onTaskDblClick, // v0.8.0
  onTaskContextMenu, // v0.8.0
  onTaskDateChange,
  onDependencyCreate,
  onDependencyDelete,
}: TimelineProps) {
  const HEADER_HEIGHT = 48; // Must match TaskGrid's HEADER_HEIGHT for alignment

  // v0.13.0: State for dependency cascade preview
  const [cascadePreviews, setCascadePreviews] = useState<DependentTaskPreview[]>([]);

  // v0.17.76: State for active tooltip - rendered in top layer for proper z-order
  const [activeTooltip, setActiveTooltip] = useState<TaskTooltipData | null>(null);

  // v0.17.79: State for hovered dependency - full line + delete button rendered in top layer
  const [hoveredDependency, setHoveredDependency] = useState<DependencyHoverData | null>(null);

  // v0.17.76: Callback for TaskBar hover changes
  const handleTooltipChange = useCallback((tooltipData: TaskTooltipData | null) => {
    setActiveTooltip(tooltipData);
  }, []);

  // v0.17.140: handleDependencyHoverChange removed - hover now handled directly in Timeline via top layer

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

    // Call the date change handler to create the task bar
    onTaskDateChange?.(task, clickedDate, endDate);
  }, [pixelToDate, onTaskDateChange]);

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
      for (const task of tasks) {
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
    const duration = (taskEnd - taskStart) / (1000 * 60 * 60 * 24);

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
        const y = actualIndex * ROW_HEIGHT + 12;
        return {
          id: task.id,
          x,
          y,
          width,
          height: 32, // TaskBar height
        };
      });
  }, [flatTasks, getTaskPosition]);

  // v0.13.0: Handle drag move for dependency cascade preview
  const handleTaskDragMove = useCallback((taskId: string, daysDelta: number, isDragging: boolean) => {
    if (!isDragging || daysDelta === 0) {
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

  // Generate timeline headers
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
          label: current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          x,
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === 'week') {
        const weekNum = getWeekNumber(current);
        result.push({
          date: new Date(current),
          label: `Week ${weekNum}`,
          x,
        });
        current.setDate(current.getDate() + 7);
      } else {
        result.push({
          date: new Date(current),
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          x,
        });
        current.setMonth(current.getMonth() + 1);
      }
      index++;
    }

    return result;
  }, [startDate, endDate, timeScale, dayWidth, zoom]);

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
      className="w-full h-full flex flex-col"
      data-gantt-chart
      style={{ backgroundColor: theme.bgPrimary, overflow: 'visible' }}
    >
      {/* v0.13.7: Sticky Header - stays visible during vertical scroll */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: theme.bgGrid,
          flexShrink: 0,
          height: `${HEADER_HEIGHT}px`,
          borderBottom: `1px solid ${theme.border}`,
          boxSizing: 'border-box', // Border included in height
        }}
      >
        <svg
          width={Math.max(timelineWidth, 1000)}
          height={HEADER_HEIGHT - 1} // -1 for border
          style={{ display: 'block' }}
        >
          {/* Header Background */}
          <rect
            x={0}
            y={0}
            width={Math.max(timelineWidth, 1000)}
            height={HEADER_HEIGHT}
            fill={theme.bgGrid}
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

          {/* Today marker in header */}
          {todayX >= 0 && todayX <= timelineWidth && (
            <circle cx={todayX} cy={HEADER_HEIGHT - 10} r={6} fill={theme.today} opacity={1} />
          )}
        </svg>
      </div>

      {/* Scrollable Content Area */}
      {/* v0.17.31: Added overflow:visible to allow tooltips to render above the header */}
      <svg
        width={Math.max(timelineWidth, 1000)}
        height={contentHeight}
        style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>

          {/* Neutral theme: Diagonal stripes pattern for critical/overdue tasks */}
          <pattern id="diagonal-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={theme.border} strokeWidth="2" />
          </pattern>
        </defs>

        {/* Full SVG Background */}
        <rect
          x={0}
          y={0}
          width={Math.max(timelineWidth, 1000)}
          height={contentHeight}
          fill={theme.bgPrimary}
        />

        {/* Grid Lines and Weekend Backgrounds - v0.13.7: Adjusted Y positions (no header offset) */}
        {headers.map((header, index) => {
          const nextX = headers[index + 1]?.x || timelineWidth;
          const isWeekendDay = isWeekend(header.date);

          return (
            <g key={index}>
              {/* Weekend background - subtle highlight */}
              {isWeekendDay && (
                <rect
                  x={header.x}
                  y={0}
                  width={nextX - header.x}
                  height={flatTasks.length * ROW_HEIGHT}
                  fill={theme.bgWeekend}
                  opacity={1}
                />
              )}

              {/* Grid line - skip first line since TaskGrid border serves as divider */}
              {index > 0 && (
                <line
                  x1={header.x}
                  y1={0}
                  x2={header.x}
                  y2={flatTasks.length * ROW_HEIGHT}
                  stroke={theme.border}
                  strokeWidth={1}
                  opacity={0.1}
                />
              )}
            </g>
          );
        })}

        {/* Row Backgrounds with Click-to-Create functionality - v0.13.7: Adjusted Y positions */}
        {flatTasks.map((task, index) => {
          const hasTaskBar = task.startDate && task.endDate;

          return (
            <g key={`row-group-${task.id}`}>
              {/* Background stripe - alternating rows for better readability */}
              <rect
                key={`row-${task.id}`}
                x={0}
                y={index * ROW_HEIGHT}
                width={timelineWidth}
                height={ROW_HEIGHT}
                fill={index % 2 === 0 ? 'transparent' : theme.bgSecondary}
                opacity={1}
                style={{ pointerEvents: 'none' }}
              />

              {/* Clickable area for tasks without dates */}
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
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute('fill', theme.accentLight);
                      e.currentTarget.setAttribute('opacity', '0.5');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.setAttribute('fill', 'transparent');
                      e.currentTarget.setAttribute('opacity', '1');
                    }}
                  />
                  {/* Placeholder text for empty tasks */}
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
                    Click to set dates...
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Dependencies - v0.13.7: Adjusted Y positions */}
        {flatTasks.map((task, toIndex) => {
          if (!task.dependencies || task.dependencies.length === 0) return null;
          // Skip if task doesn't have dates
          if (!task.startDate || !task.endDate) return null;

          return task.dependencies.map((depId) => {
            const depTask = flatTasks.find((t) => t.id === depId);
            if (!depTask) return null;
            // Skip if dependency task doesn't have dates
            if (!depTask.startDate || !depTask.endDate) return null;

            const fromIndex = flatTasks.findIndex((t) => t.id === depId);
            const fromPos = getTaskPosition(depTask);
            const toPos = getTaskPosition(task);

            return (
              <DependencyLine
                key={`dep-${depId}-${task.id}`}
                x1={fromPos.x + fromPos.width}
                y1={fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2}
                x2={toPos.x}
                y2={toIndex * ROW_HEIGHT + ROW_HEIGHT / 2}
                theme={theme}
                // v0.17.140: Removed onDelete and onHoverChange - hover now handled by top layer
              />
            );
          });
        })}

        {/* Tasks - v0.13.7: Adjusted Y positions */}
        {flatTasks.map((task, index) => {
          // Don't render task bar if task doesn't have dates
          if (!task.startDate || !task.endDate) {
            return null;
          }

          const { x, width } = getTaskPosition(task);
          const y = index * ROW_HEIGHT + 12;

          // Container phase (has subtasks): render as bracket bar
          const isContainer = task.subtasks && task.subtasks.length > 0 && !task.isMilestone;

          if (task.isMilestone) {
            return (
              <Milestone
                key={task.id}
                task={task}
                x={x + width / 2}
                y={y + 16}
                theme={theme}
                onClick={onTaskClick}
              />
            );
          }

          if (isContainer) {
            // Render container as elegant bracket bar with task name
            // v0.17.45: Added onContextMenu handler for adding subtasks
            // v0.17.46: Removed onDoubleClick - parent tasks are not directly editable (MS Project style)
            return (
              <g
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTaskContextMenu?.(task, e as unknown as React.MouseEvent);
                }}
                style={{ cursor: 'default' }}
              >
                {/* Background fill - elegant and visible */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={32}
                  fill={theme.primary}
                  opacity={0.25}
                  rx={6}
                />
                {/* Top bracket line */}
                <line
                  x1={x}
                  y1={y}
                  x2={x + width}
                  y2={y}
                  stroke={theme.primary}
                  strokeWidth={3}
                  opacity={0.9}
                  strokeLinecap="round"
                />
                {/* Left vertical */}
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y + 32}
                  stroke={theme.primary}
                  strokeWidth={3}
                  opacity={0.9}
                  strokeLinecap="round"
                />
                {/* Right vertical */}
                <line
                  x1={x + width}
                  y1={y}
                  x2={x + width}
                  y2={y + 32}
                  stroke={theme.primary}
                  strokeWidth={3}
                  opacity={0.9}
                  strokeLinecap="round"
                />
                {/* Bottom bracket line */}
                <line
                  x1={x}
                  y1={y + 32}
                  x2={x + width}
                  y2={y + 32}
                  stroke={theme.primary}
                  strokeWidth={3}
                  opacity={0.9}
                  strokeLinecap="round"
                />
                {/* Task name text - Matching TaskBar pattern */}
                {width > 60 && (
                  <text
                    x={x + 12}
                    y={y + 16}
                    dominantBaseline="middle"
                    fill="#FFFFFF"
                    fontSize="13"
                    fontWeight="500"
                    fontFamily="Inter, sans-serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {task.name}
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
            />
          );
        })}

        {/* v0.17.148: Dependency hover detection layer - rendered AFTER tasks so hover works above task bars */}
        {/* Each dependency gets a hover zone that activates the highlighted state */}
        {/* IMPORTANT: Hover zone is offset from endpoints to not block task resize handles */}
        {flatTasks.map((task, toIndex) => {
          if (!task.dependencies || task.dependencies.length === 0) return null;
          if (!task.startDate || !task.endDate) return null;

          return task.dependencies.map((depId) => {
            const depTask = flatTasks.find((t) => t.id === depId);
            if (!depTask) return null;
            if (!depTask.startDate || !depTask.endDate) return null;

            const fromIndex = flatTasks.findIndex((t) => t.id === depId);
            const fromPos = getTaskPosition(depTask);
            const toPos = getTaskPosition(task);

            const x1 = fromPos.x + fromPos.width;
            const y1 = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            const x2 = toPos.x;
            const y2 = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            const dx = x2 - x1;
            const midX = x1 + dx / 2;

            // v0.17.154: Hover zone from t=0.10 to t=0.90 (80% of curve)
            // Only 10% at each end is reserved for resize handles
            // strokeWidth=12 → 6px from center each side
            // FIX: Use correct cubic Bézier formula matching the actual line:
            // Original: C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}
            // Control points: P1=(midX, y1), P2=(midX, y2)
            const cubicBezierPoint = (t: number) => {
              // P0 = (x1, y1), P1 = (midX, y1), P2 = (midX, y2), P3 = (x2, y2)
              const mt = 1 - t;
              const mt2 = mt * mt;
              const mt3 = mt2 * mt;
              const t2 = t * t;
              const t3 = t2 * t;
              const px = mt3 * x1 + 3 * mt2 * t * midX + 3 * mt * t2 * midX + t3 * x2;
              const py = mt3 * y1 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y2;
              return { x: px, y: py };
            };

            // Generate multiple points along the curve for accurate path
            // More points = smoother curve that matches the original line exactly
            const numPoints = 20;
            const pathPoints: Array<{x: number, y: number}> = [];
            for (let i = 0; i <= numPoints; i++) {
              const t = 0.10 + (i / numPoints) * 0.80; // t from 0.10 to 0.90
              pathPoints.push(cubicBezierPoint(t));
            }

            // Create a polyline path through these points
            const firstPoint = pathPoints[0]!;
            const middlePath = `M ${firstPoint.x} ${firstPoint.y} ` +
              pathPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

            const isThisHovered = hoveredDependency &&
              hoveredDependency.x1 === x1 && hoveredDependency.y1 === y1 &&
              hoveredDependency.x2 === x2 && hoveredDependency.y2 === y2;

            // Only render hover zone if this dependency is NOT currently hovered
            if (isThisHovered) return null;

            return (
              <path
                key={`dep-hover-${depId}-${task.id}`}
                d={middlePath}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHoveredDependency({
                    x1, y1, x2, y2,
                    onDelete: () => onDependencyDelete?.(task.id, depId),
                  });
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
            {/* Ghost bar at exact preview position - v0.13.7: Y adjusted (subtract HEADER_HEIGHT) */}
            <rect
              x={preview.previewX}
              y={preview.y - HEADER_HEIGHT}
              width={preview.width}
              height={32}
              rx={8}
              fill={preview.color || theme.accent}
              opacity={0.3}
              stroke={theme.accent}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            {/* Days delta label */}
            {Math.abs(preview.daysDelta) > 0 && (
              <text
                x={preview.previewX + preview.width / 2}
                y={preview.y - HEADER_HEIGHT + 16}
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

        {/* v0.17.143: Premium hovered dependency layer - elegant glow + refined delete button */}
        {/* This renders AFTER tasks in the SVG, so it appears on top */}
        {hoveredDependency && (() => {
          const { x1, y1, x2, y2, onDelete } = hoveredDependency;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const midX = x1 + dx / 2;
          const midY = (y1 + y2) / 2;
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
          const arrowSize = 6;
          const angle = Math.atan2(dy, dx);
          const arrowX = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
          const arrowY = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
          const arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
          const arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);
          const lineColor = theme.dependency;
          // Premium soft red - less aggressive, more SaaS-friendly
          const deleteColor = '#f87171';
          const deleteColorSoft = 'rgba(248, 113, 113, 0.15)';

          return (
            <g onMouseLeave={() => setHoveredDependency(null)}>
              {/* Large invisible hover area along the entire path */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={50}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
              />

              {/* Extra hover area around delete button */}
              <circle
                cx={midX}
                cy={midY}
                r={25}
                fill="transparent"
                style={{ cursor: 'pointer' }}
              />

              {/* Glow effect layer - subtle gradient glow */}
              <path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.15}
                style={{ pointerEvents: 'none', filter: 'blur(4px)' }}
              />

              {/* Highlighted dependency line - solid, prominent */}
              <path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              />

              {/* Arrow head */}
              <path
                d={`M ${x2} ${y2} L ${arrowX} ${arrowY} M ${x2} ${y2} L ${arrowX2} ${arrowY2}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              />

              {/* Endpoint dot */}
              <circle
                cx={x2}
                cy={y2}
                r={4}
                fill={lineColor}
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              />

              {/* v0.17.144: Premium delete button - instant clear on click */}
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredDependency(null); // Clear hover state immediately
                  onDelete();
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Button background - subtle, transparent with soft border */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={9}
                  fill={deleteColorSoft}
                  stroke={deleteColor}
                  strokeWidth={1.5}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {/* X icon - refined, smaller strokes */}
                <line
                  x1={midX - 3}
                  y1={midY - 3}
                  x2={midX + 3}
                  y2={midY + 3}
                  stroke={deleteColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <line
                  x1={midX + 3}
                  y1={midY - 3}
                  x2={midX - 3}
                  y2={midY + 3}
                  stroke={deleteColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </motion.g>
            </g>
          );
        })()}

        {/* v0.17.179: Today Line - Thinner like ClickUp (1px) */}
        {todayX >= 0 && todayX <= timelineWidth && (
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={contentHeight}
            stroke={theme.today}
            strokeWidth={1}
            opacity={1}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* v0.17.76: Tooltip layer - rendered last to ensure it's always on top */}
        {activeTooltip && (
          <TaskTooltip tooltipData={activeTooltip} theme={theme} />
        )}
      </svg>
    </div>
  );
}