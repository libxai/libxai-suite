import { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, GanttTemplates } from './types';
import { TaskPosition } from './Timeline';
import { useDragState } from './hooks/useDragState';

interface TaskBarProps {
  task: Task;
  x: number;
  y: number;
  width: number;
  theme: any;
  dayWidth: number;
  startDate: Date;
  templates: Required<GanttTemplates>; // v0.8.0
  onClick?: (task: Task) => void;
  onDoubleClick?: (task: Task) => void; // v0.8.0
  onContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0
  onDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
  onDependencyCreate?: (fromTask: Task, toTaskId: string) => void;
  allTaskPositions?: TaskPosition[];
}

type DragMode = 'none' | 'move' | 'resize-start' | 'resize-end' | 'connect';

export function TaskBar({
  task,
  x,
  y,
  width,
  theme,
  dayWidth,
  startDate,
  templates,
  onClick,
  onDoubleClick, // v0.8.0
  onContextMenu, // v0.8.0
  onDateChange,
  onDependencyCreate,
  allTaskPositions = []
}: TaskBarProps) {
  // v0.8.1: Centralized drag state management for better modularity
  const dragState = useDragState(x, width);
  const svgRef = useRef<SVGGElement>(null);

  // Destructure for easier access (keeps existing code readable)
  const {
    dragMode, setDragMode,
    dragOffset, setDragOffset,
    ghostX, setGhostX,
    ghostWidth, setGhostWidth,
    connectionLine, setConnectionLine,
    hoveredTaskId, setHoveredTaskId,
    activeZone, setActiveZone,
    draggedSegmentIndex, setDraggedSegmentIndex,
    draggedSegmentStartX, setDraggedSegmentStartX,
    segmentDragOffsetX, setSegmentDragOffsetX,
    hoveredSegmentIndex, setHoveredSegmentIndex,
    isHovered, setIsHovered,
    isDragging, isResizing, isConnecting,
    resetDragState
  } = dragState;

  const height = 32;
  const borderRadius = 8;

  // Detect task states for neutral theme visualization
  const isOverdue = task.endDate && task.endDate < new Date() && task.progress < 100;
  const isAtRisk = task.isCriticalPath;  // Critical path tasks are "at risk"
  const isNeutralTheme = theme.name === 'neutral' || theme.today === '#1C1917';  // Detect neutral theme

  // Dynamic resize zones based on bar width for better UX
  const getResizeZone = (barWidth: number): number => {
    if (barWidth >= 80) return 20;      // Large bars: 20px zones
    if (barWidth >= 60) return 15;      // Medium bars: 15px zones
    if (barWidth >= 50) return 12;      // Small bars: 12px zones
    return 10;                          // Very small bars: 10px zones
  };

  const RESIZE_ZONE = getResizeZone(width);
  const isSmallBar = width < 50;          // Flag for special handling
  const isVerySmallBar = width < 40;      // Flag for ultra-small bars (simplified UX)

  // Format date for tooltip
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate duration
  const getDuration = () => {
    const days = Math.ceil((task.endDate!.getTime() - task.startDate!.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Snap position to nearest day
  const snapToDay = (pixelX: number): number => {
    const dayOffset = Math.round(pixelX / dayWidth) * dayWidth;
    return dayOffset;
  };

  // Convert pixel position to date
  const pixelToDate = (pixelX: number): Date => {
    const days = Math.round(pixelX / dayWidth);
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  // Check if point is inside a task's bounding box
  const findTaskAtPoint = (pointX: number, pointY: number): string | null => {
    for (const taskPos of allTaskPositions) {
      // Skip current task
      if (taskPos.id === task.id) continue;

      // Check if point is within task bounds (with some padding for easier targeting)
      const padding = 5;
      if (
        pointX >= taskPos.x - padding &&
        pointX <= taskPos.x + taskPos.width + padding &&
        pointY >= taskPos.y - padding &&
        pointY <= taskPos.y + taskPos.height + padding
      ) {
        return taskPos.id;
      }
    }
    return null;
  };

  // TODO: Implement dynamic cursor styling based on mouse position
  // Determine cursor based on position
  // const getCursorStyle = (mouseX: number): string => {
  //   if (dragMode !== 'none') {
  //     if (dragMode === 'connect') return 'crosshair';
  //     if (dragMode === 'resize-start' || dragMode === 'resize-end') return 'ew-resize';
  //     if (dragMode === 'move') return 'grabbing';
  //   }
  //   const relativeX = mouseX - x;
  //   // Resize zones at edges
  //   if (relativeX <= RESIZE_ZONE) return 'ew-resize';
  //   if (relativeX >= width - RESIZE_ZONE) return 'ew-resize';
  //   // Move zone in the middle
  //   return 'grab';
  // };

  // Handle mouse down for dragging
  // v0.8.1: Added segmentX parameter for split tasks - allows segments to calculate their own offset
  const handleMouseDown = useCallback((e: React.MouseEvent, mode?: DragMode, segmentX?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const svgElement = svgRef.current?.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // v0.8.1: Use segment position if provided (for split tasks), otherwise use global x
    const effectiveX = segmentX !== undefined ? segmentX : x;

    // Determine mode based on click position if not specified
    let actualMode = mode;
    if (!actualMode) {
      const relativeX = svgPoint.x - effectiveX;

      // Keyboard modifiers for forced modes
      if (e.shiftKey) {
        // SHIFT: Connection mode
        actualMode = 'connect';
        setConnectionLine({ x: x + width, y: y + height / 2 });
      } else if (e.ctrlKey || e.metaKey) {
        // CTRL/CMD: Force MOVE (useful for small bars)
        actualMode = 'move';
      } else if (e.altKey) {
        // ALT: Force RESIZE based on which half of bar is clicked
        actualMode = relativeX < width / 2 ? 'resize-start' : 'resize-end';
      }
      // Auto-detection based on position (adaptive based on bar size)
      else if (isVerySmallBar) {
        // Very small bars (<40px): Simple split - left half = move, right half = resize
        if (relativeX < width / 2) {
          actualMode = 'move';
        } else {
          actualMode = 'resize-end';  // Always resize from end for consistency
        }
      } else if (isSmallBar) {
        // Small bars (40-50px): Only resize if clicking very close to edges
        if (relativeX <= RESIZE_ZONE / 2) {
          actualMode = 'resize-start';
        } else if (relativeX >= width - RESIZE_ZONE / 2) {
          actualMode = 'resize-end';
        } else {
          actualMode = 'move';  // Default to move for small bars
        }
      } else {
        // Normal bars: Standard zone detection
        if (relativeX <= RESIZE_ZONE) {
          actualMode = 'resize-start';
        } else if (relativeX >= width - RESIZE_ZONE) {
          actualMode = 'resize-end';
        } else {
          actualMode = 'move';
        }
      }
    }

    setDragMode(actualMode);
    setIsHovered(false); // Hide all tooltips when dragging starts
    setActiveZone(null); // Clear active zone

    if (actualMode === 'move') {
      // v0.8.1: Use effectiveX (segment position for split tasks, global x otherwise)
      setDragOffset(svgPoint.x - effectiveX);
    } else if (actualMode === 'connect') {
      setConnectionLine({ x: x + width, y: y + height / 2 });
    } else {
      setDragOffset(0);
    }

    setGhostX(effectiveX);
    setGhostWidth(width);
  }, [x, width, y, height]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragMode === 'none') return;

    const svgElement = svgRef.current?.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    if (dragMode === 'connect') {
      // Update connection line end point
      setConnectionLine({ x: svgPoint.x, y: svgPoint.y });

      // Check if hovering over another task
      const targetTaskId = findTaskAtPoint(svgPoint.x, svgPoint.y);
      setHoveredTaskId(targetTaskId);
    } else if (dragMode === 'move') {
      // Move entire bar (or all segments if split task)
      const rawNewX = svgPoint.x - dragOffset;
      const snappedX = snapToDay(rawNewX);
      setGhostX(snappedX);
      setGhostWidth(width);

      // v0.8.1: For split tasks, calculate offset relative to the DRAGGED SEGMENT position
      if (task.segments && task.segments.length > 0 && draggedSegmentIndex !== null) {
        const segmentOffset = snappedX - draggedSegmentStartX; // Use saved segment position
        setSegmentDragOffsetX(segmentOffset);
      }
    } else if (dragMode === 'resize-start') {
      // Resize from start
      const rawNewStart = svgPoint.x;
      const snappedStart = snapToDay(rawNewStart);
      const newWidth = (x + width) - snappedStart;

      // Prevent negative or too small width (minimum 1 day)
      if (newWidth >= dayWidth) {
        setGhostX(snappedStart);
        setGhostWidth(newWidth);
      }
    } else if (dragMode === 'resize-end') {
      // Resize from end
      const rawNewEnd = svgPoint.x;
      const snappedEnd = snapToDay(rawNewEnd);
      const newWidth = snappedEnd - x;

      // Prevent negative or too small width (minimum 1 day)
      if (newWidth >= dayWidth) {
        setGhostWidth(newWidth);
      }
    }
  }, [dragMode, x, width, dayWidth, dragOffset, task, snapToDay, draggedSegmentIndex, draggedSegmentStartX, findTaskAtPoint, setHoveredTaskId, setConnectionLine, setGhostX, setGhostWidth, setSegmentDragOffsetX]);

  // Handle mouse up to finish dragging
  const handleMouseUp = useCallback(() => {
    if (dragMode === 'none') return;

    if (dragMode === 'connect') {
      // Create dependency if hovering over a valid task
      if (hoveredTaskId && onDependencyCreate) {
        onDependencyCreate(task, hoveredTaskId);
      }
      setConnectionLine(null);
      setHoveredTaskId(null);
    } else {
      const taskDuration = task.endDate!.getTime() - task.startDate!.getTime();
      let newStartDate: Date;
      let newEndDate: Date;
      let isValid = true;

      if (dragMode === 'move') {
        // Calculate new dates maintaining duration
        newStartDate = pixelToDate(ghostX);
        newEndDate = new Date(newStartDate.getTime() + taskDuration);

        // v0.8.1: Bryntum-style - Update ONLY the dragged segment (independent movement)
        if (task.segments && task.segments.length > 0 && draggedSegmentIndex !== null) {
          const dayOffset = Math.round(segmentDragOffsetX / dayWidth);
          const updatedSegments = task.segments.map((seg, idx) => {
            // Only update the segment that was dragged
            if (idx === draggedSegmentIndex) {
              const newSegStart = new Date(seg.startDate);
              const newSegEnd = new Date(seg.endDate);
              newSegStart.setDate(newSegStart.getDate() + dayOffset);
              newSegEnd.setDate(newSegEnd.getDate() + dayOffset);
              return { startDate: newSegStart, endDate: newSegEnd };
            }
            // Keep other segments unchanged
            return seg;
          });

          // Calculate new overall task dates (from all segments)
          const allDates = updatedSegments.flatMap(s => [s.startDate, s.endDate]);
          const newTaskStart = new Date(Math.min(...allDates.map(d => d.getTime())));
          const newTaskEnd = new Date(Math.max(...allDates.map(d => d.getTime())));

          // Update task with new segments
          onDateChange?.({ ...task, segments: updatedSegments }, newTaskStart, newTaskEnd);
          // v0.8.1: Use centralized reset function from useDragState hook
          resetDragState(x, width);
          return; // Exit early since we handled the update
        }
      } else if (dragMode === 'resize-start') {
        // Change start date, keep end date
        newStartDate = pixelToDate(ghostX);
        newEndDate = task.endDate!;

        // Validate: start date must be before end date
        if (newStartDate >= newEndDate) {
          console.warn('Invalid date range: start date must be before end date');
          isValid = false;
        }
      } else if (dragMode === 'resize-end') {
        // Change end date, keep start date
        newStartDate = task.startDate!;
        newEndDate = pixelToDate(ghostX + ghostWidth);

        // Validate: end date must be after start date
        if (newEndDate <= newStartDate) {
          console.warn('Invalid date range: end date must be after start date');
          isValid = false;
        }
      } else {
        // Shouldn't reach here, but handle gracefully
        isValid = false;
      }

      // Only update if valid
      if (isValid && newStartDate! && newEndDate!) {
        // Additional validation: minimum task duration of 1 day
        const minDuration = 24 * 60 * 60 * 1000; // 1 day in milliseconds
        if (newEndDate.getTime() - newStartDate.getTime() < minDuration) {
          console.warn('Invalid date range: task must be at least 1 day long');
          // Reset to original dates by not calling onDateChange
        } else {
          onDateChange?.(task, newStartDate, newEndDate);
        }
      }
    }

    // v0.8.1: Use centralized reset function from useDragState hook
    resetDragState(x, width);
  }, [dragMode, ghostX, ghostWidth, task, onDateChange, hoveredTaskId, onDependencyCreate, x, width, dayWidth, pixelToDate, segmentDragOffsetX, draggedSegmentIndex, resetDragState]);

  // Setup global mouse listeners for smooth dragging
  useEffect(() => {
    if (dragMode === 'none') return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragMode, handleMouseMove, handleMouseUp]);

  // v0.8.1: isDragging, isResizing, isConnecting now provided by useDragState hook
  const displayX = isDragging && !isConnecting ? ghostX : x;
  const displayWidth = isDragging && !isConnecting ? ghostWidth : width;

  // v0.8.0: Generate tooltip and custom class using templates
  const tooltipContent = templates.taskTooltip(task);
  const tooltipText = typeof tooltipContent === 'string' ? tooltipContent : '';
  const customClass = templates.taskClass(task);

  return (
    <g
      ref={svgRef}
      onMouseEnter={() => !isDragging && setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setIsHovered(false);
          setActiveZone(null);
        }
      }}
      onClick={() => !isDragging && onClick?.(task)}
      onDoubleClick={(e) => {
        // v0.8.0: Double-click event
        if (!isDragging) {
          e.stopPropagation();
          onDoubleClick?.(task);
        }
      }}
      onContextMenu={(e) => {
        // v0.8.0: Context menu event
        e.preventDefault();
        onContextMenu?.(task, e as any);
      }}
    >
      {/* v0.8.0: Tooltip using taskTooltip template */}
      {tooltipText && <title dangerouslySetInnerHTML={{ __html: tooltipText }} />}
      {/* Zone Indicators with hover feedback - v0.8.1: Disabled for split tasks (segments are independent) */}
      {isHovered && !isDragging && !isSmallBar && !task.segments && (
        <>
          {/* Left resize zone with subtle highlight on hover */}
          <rect
            x={x}
            y={y}
            width={RESIZE_ZONE}
            height={height}
            fill={activeZone === 'resize-start' ? theme.accent : 'transparent'}
            opacity={activeZone === 'resize-start' ? 0.15 : 0}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
            onMouseEnter={() => setActiveZone('resize-start')}
            onMouseDown={(e) => handleMouseDown(e as any, 'resize-start')}
          />
          {/* Center move zone */}
          <rect
            x={x + RESIZE_ZONE}
            y={y}
            width={width - RESIZE_ZONE * 2}
            height={height}
            fill={activeZone === 'move' ? theme.accent : 'transparent'}
            opacity={activeZone === 'move' ? 0.1 : 0}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseEnter={() => setActiveZone('move')}
            onMouseDown={(e) => handleMouseDown(e as any, 'move')}
          />
          {/* Right resize zone with subtle highlight on hover */}
          <rect
            x={x + width - RESIZE_ZONE}
            y={y}
            width={RESIZE_ZONE}
            height={height}
            fill={activeZone === 'resize-end' ? theme.accent : 'transparent'}
            opacity={activeZone === 'resize-end' ? 0.15 : 0}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
            onMouseEnter={() => setActiveZone('resize-end')}
            onMouseDown={(e) => handleMouseDown(e as any, 'resize-end')}
          />
        </>
      )}

      {/* Simplified zones for very small bars (split in half) */}
      {isHovered && !isDragging && isVerySmallBar && (
        <>
          {/* Left half - MOVE zone */}
          <rect
            x={x}
            y={y}
            width={width / 2}
            height={height}
            fill={activeZone === 'move' ? theme.accent : 'transparent'}
            opacity={activeZone === 'move' ? 0.2 : 0}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseEnter={() => setActiveZone('move')}
            onMouseDown={(e) => handleMouseDown(e as any, 'move')}
          />
          {/* Right half - RESIZE zone */}
          <rect
            x={x + width / 2}
            y={y}
            width={width / 2}
            height={height}
            fill={activeZone === 'resize-end' ? theme.accent : 'transparent'}
            opacity={activeZone === 'resize-end' ? 0.2 : 0}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
            onMouseEnter={() => setActiveZone('resize-end')}
            onMouseDown={(e) => handleMouseDown(e as any, 'resize-end')}
          />
          {/* Visual divider line at center */}
          {isHovered && (
            <motion.line
              x1={x + width / 2}
              y1={y + 4}
              x2={x + width / 2}
              y2={y + height - 4}
              stroke={theme.textTertiary}
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.3}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.2 }}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </>
      )}

      {/* Ghost/Preview Bar (shown while dragging) */}
      {/* v0.8.1: Hide ghost bar for split tasks - segments handle their own visualization */}
      {isDragging && !isConnecting && !task.segments && (
        <motion.rect
          x={ghostX}
          y={y}
          width={ghostWidth}
          height={height}
          rx={borderRadius}
          fill={task.isCriticalPath ? '#DC2626' : theme.taskBarPrimary}
          opacity={0.3}
          stroke={task.isCriticalPath ? '#EF4444' : theme.accent}
          strokeWidth={2}
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.15 }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Main Task Bar - Background (light for contrast with progress) - v0.8.0: With custom class */}
      {/* v0.8.1: Hide main bar when task has segments (split task) */}
      {/* v0.11.0: Custom task colors with parent/subtask opacity */}
      {!task.segments && (
        <motion.rect
          x={displayX}
          y={y}
          width={displayWidth}
          height={height}
          rx={borderRadius}
          fill={
            task.isCriticalPath
              ? '#DC2626' // Critical path always red
              : task.color
              ? task.color // v0.11.0: Custom color
              : theme.taskBarPrimary // Fallback to theme
          }
          data-task-class={customClass}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: isDragging && !isConnecting
              ? 0.15
              : task.parentId
              ? 0.6 // v0.11.0: Subtasks more transparent (60%)
              : isHovered
              ? 0.9 // Parent tasks more opaque on hover
              : 0.8, // Parent tasks base opacity (80%)
            scale: isHovered && !isDragging ? 1.02 : 1,
          }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
          onMouseDown={(e) => handleMouseDown(e as any)}
          style={{
            cursor: isDragging ? (isConnecting ? 'crosshair' : isResizing ? 'ew-resize' : 'grabbing') : 'grab',
            pointerEvents: 'all'
          }}
        />
      )}

      {/* Progress Fill - Solid color for instant visual scanning */}
      {/* Eye processes shape/color faster than text */}
      {/* v0.11.0: Use custom task color for progress fill */}
      {!task.segments && (
        <rect
          x={displayX}
          y={y}
          width={displayWidth * (task.progress / 100)}
          height={height}
          rx={borderRadius}
          fill={
            task.isCriticalPath
              ? '#DC2626' // Critical path always red
              : task.color
              ? task.color // v0.11.0: Custom color
              : theme.taskBarProgress // Fallback to theme
          }
          opacity={1}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* v0.8.1: Render segments if task is split (has gaps) - Bryntum-style independent segments */}
      {task.segments && task.segments.map((segment, idx) => {
        const segmentStartX = ((segment.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
        const segmentEndX = ((segment.endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
        const segmentWidth = segmentEndX - segmentStartX + dayWidth;

        // v0.8.1: Only apply drag offset to the specific segment being dragged
        const isThisSegmentDragging = isDragging && dragMode === 'move' && draggedSegmentIndex === idx;
        const isThisSegmentHovered = hoveredSegmentIndex === idx;
        const displaySegmentX = isThisSegmentDragging ? segmentStartX + segmentDragOffsetX : segmentStartX;

        return (
          <g
            key={`segment-${idx}`}
            onMouseEnter={() => !isDragging && setHoveredSegmentIndex(idx)}
            onMouseLeave={() => !isDragging && setHoveredSegmentIndex(null)}
          >
            {/* Segment background - interactive */}
            {/* v0.11.0: Custom task colors for segments */}
            <motion.rect
              x={displaySegmentX}
              y={y}
              width={segmentWidth}
              height={height}
              rx={borderRadius}
              fill={
                task.isCriticalPath
                  ? '#DC2626' // Critical path always red
                  : task.color
                  ? task.color // v0.11.0: Custom color
                  : theme.taskBarPrimary // Fallback to theme
              }
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: isThisSegmentDragging
                  ? 0.6
                  : task.parentId
                  ? 0.6 // v0.11.0: Subtask segments more transparent
                  : isThisSegmentHovered
                  ? 0.9
                  : 0.8,
                scale: isThisSegmentHovered && !isDragging ? 1.02 : 1,
              }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
              onMouseDown={(e) => {
                // v0.8.1: Capture which segment is being dragged and pass its position
                e.stopPropagation();
                setDraggedSegmentIndex(idx);
                setDraggedSegmentStartX(segmentStartX); // Save original position for offset calculation
                handleMouseDown(e as any, undefined, segmentStartX);
              }}
              style={{
                cursor: isDragging ? (isConnecting ? 'crosshair' : isResizing ? 'ew-resize' : 'grabbing') : 'grab',
                pointerEvents: 'all'
              }}
            />
            {/* Segment progress - v0.11.0: Use custom task color */}
            <rect
              x={displaySegmentX}
              y={y}
              width={segmentWidth * (task.progress / 100)}
              height={height}
              rx={borderRadius}
              fill={
                task.isCriticalPath
                  ? '#DC2626' // Critical path always red
                  : task.color
                  ? task.color // v0.11.0: Custom color
                  : theme.taskBarProgress // Fallback to theme
              }
              opacity={1}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {/* Neutral Theme: State visualization without color */}
      {/* v0.8.1: Hide state visualization for split tasks (shown on segments instead) */}
      {isNeutralTheme && (isOverdue || isAtRisk) && !task.segments && (
        <>
          {/* At Risk: Dotted border */}
          {isAtRisk && !isOverdue && (
            <rect
              x={displayX}
              y={y}
              width={displayWidth}
              height={height}
              rx={borderRadius}
              fill="none"
              stroke={theme.border}
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Overdue: Diagonal stripes pattern */}
          {isOverdue && (
            <rect
              x={displayX}
              y={y}
              width={displayWidth}
              height={height}
              rx={borderRadius}
              fill="url(#diagonal-stripes)"
              opacity={0.3}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </>
      )}

      {/* Task Name Text - v0.8.0: Using taskLabel template */}
      {/* v0.8.1: Hide text for split tasks to avoid blocking segment clicks */}
      {displayWidth > 60 && !task.segments && (() => {
        const label = templates.taskLabel(task);
        const labelText = typeof label === 'string' ? label : task.name;
        const truncated = labelText.length > Math.floor(displayWidth / 8)
          ? `${labelText.substring(0, Math.floor(displayWidth / 8))}...`
          : labelText;

        return (
          <text
            x={displayX + 12}
            y={y + height / 2}
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="500"
            fontFamily="Inter, sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {truncated}
          </text>
        );
      })()}

      {/* Progress Percentage */}
      {/* v0.8.1: Hide progress text for split tasks to avoid blocking segment clicks */}
      {displayWidth > 100 && task.progress > 0 && task.progress < 100 && !isDragging && !task.segments && (
        <text
          x={displayX + displayWidth - 12}
          y={y + height / 2}
          dominantBaseline="middle"
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.9)"
          fontSize="11"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.progress}%
        </text>
      )}

      {/* Status Indicator Badge */}
      {/* v0.8.1: Hide status badge for split tasks to avoid blocking segment clicks */}
      {task.status && displayWidth > 80 && !isDragging && !task.segments && (
        <g style={{ pointerEvents: 'none' }}>
          {task.status === 'completed' && (
            <circle
              cx={displayX + displayWidth - 8}
              cy={y + 8}
              r={4}
              fill={theme.statusCompleted}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          )}
          {task.status === 'in-progress' && (
            <circle
              cx={displayX + displayWidth - 8}
              cy={y + 8}
              r={4}
              fill={theme.statusInProgress}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              opacity={0.8}
            />
          )}
        </g>
      )}

      {/* Enhanced Resize Handles (larger, easier to grab) */}
      {/* v0.8.1: Hide resize handles for split tasks */}
      {(isHovered || isResizing) && !isConnecting && !task.segments && (
        <>
          {/* Start Handle - Adaptive positioning for small bars */}
          <g style={{ pointerEvents: 'all' }}>
            {/* Invisible larger hit area */}
            <rect
              x={isSmallBar ? displayX - 15 : displayX - 10}
              y={y - 5}
              width={isSmallBar ? 25 : 20}
              height={height + 10}
              fill="transparent"
              onMouseDown={(e) => handleMouseDown(e as any, 'resize-start')}
              style={{ cursor: 'ew-resize' }}
            />
            {/* Visual indicator - positioned outside for small bars */}
            <motion.rect
              x={isSmallBar ? displayX - 8 : displayX - 3}
              y={y + 6}
              width={isSmallBar ? 8 : 6}
              height={isSmallBar ? height - 12 : height - 16}
              rx={3}
              fill={dragMode === 'resize-start' ? theme.accent : theme.taskBarHandle}
              stroke={theme.taskBarPrimary}
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: dragMode === 'resize-start' ? 1.2 : 1
              }}
              transition={{
                duration: 0.2,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              style={{ pointerEvents: 'none' }}
            />
          </g>

          {/* End Handle - Adaptive positioning for small bars */}
          <g style={{ pointerEvents: 'all' }}>
            {/* Invisible larger hit area */}
            <rect
              x={isSmallBar ? displayX + displayWidth - 10 : displayX + displayWidth - 10}
              y={y - 5}
              width={isSmallBar ? 25 : 20}
              height={height + 10}
              fill="transparent"
              onMouseDown={(e) => handleMouseDown(e as any, 'resize-end')}
              style={{ cursor: 'ew-resize' }}
            />
            {/* Visual indicator - positioned outside for small bars */}
            <motion.rect
              x={isSmallBar ? displayX + displayWidth : displayX + displayWidth - 3}
              y={y + 6}
              width={isSmallBar ? 8 : 6}
              height={isSmallBar ? height - 12 : height - 16}
              rx={3}
              fill={dragMode === 'resize-end' ? theme.accent : theme.taskBarHandle}
              stroke={theme.taskBarPrimary}
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: dragMode === 'resize-end' ? 1.2 : 1
              }}
              transition={{
                duration: 0.2,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        </>
      )}

      {/* Connection Handle (right side, Shift+Click) - v0.8.1: Disabled for split tasks (segments are independent) */}
      <AnimatePresence>
        {isHovered && !isDragging && !task.segments && (
          <motion.g
            style={{ pointerEvents: 'all' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.circle
              cx={x + width + 8}
              cy={y + height / 2}
              r={6}
              fill={theme.accent}
              stroke="#FFFFFF"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{
                duration: 0.2,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e as any, 'connect');
              }}
              style={{ cursor: 'crosshair' }}
            />
            {/* Tooltip hint */}
            <text
              x={x + width + 20}
              y={y + height / 2}
              dominantBaseline="middle"
              fill={theme.textTertiary}
              fontSize="10"
              fontFamily="Inter, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              Link
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Connection Line (while connecting) */}
      {isConnecting && connectionLine && (
        <g style={{ pointerEvents: 'none' }}>
          <motion.line
            x1={x + width}
            y1={y + height / 2}
            x2={connectionLine.x}
            y2={connectionLine.y}
            stroke={hoveredTaskId ? theme.statusCompleted : theme.accent}
            strokeWidth={hoveredTaskId ? 3 : 2}
            strokeDasharray="6 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredTaskId ? 1 : 0.8 }}
            transition={{ duration: 0.15 }}
          />
          <motion.circle
            cx={connectionLine.x}
            cy={connectionLine.y}
            r={hoveredTaskId ? 8 : 6}
            fill={hoveredTaskId ? theme.statusCompleted : theme.accent}
            stroke="#FFFFFF"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          />
          {/* Hover indicator text */}
          {hoveredTaskId && (
            <motion.text
              x={connectionLine.x + 15}
              y={connectionLine.y}
              dominantBaseline="middle"
              fill={theme.statusCompleted}
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              initial={{ opacity: 0, x: connectionLine.x + 10 }}
              animate={{ opacity: 1, x: connectionLine.x + 15 }}
              transition={{ duration: 0.2 }}
            >
              Connect
            </motion.text>
          )}
        </g>
      )}

      {/* Hover Glow Effect - v0.8.1: Disabled for split tasks (segments are independent) */}
      {(isHovered || isDragging) && !isConnecting && !task.segments && (
        <motion.rect
          x={displayX - 2}
          y={y - 2}
          width={displayWidth + 4}
          height={height + 4}
          rx={borderRadius + 2}
          fill="none"
          stroke={isDragging ? theme.accent : theme.taskBarPrimary}
          strokeWidth={2}
          opacity={isDragging ? 0.6 : 0.4}
          initial={{ opacity: 0 }}
          animate={{ opacity: isDragging ? 0.6 : 0.4 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Vertical Snap Guides (shown while resizing) */}
      {isResizing && (
        <>
          <line
            x1={ghostX}
            y1={0}
            x2={ghostX}
            y2={1000}
            stroke={theme.accent}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.3}
            style={{ pointerEvents: 'none' }}
          />
          <line
            x1={ghostX + ghostWidth}
            y1={0}
            x2={ghostX + ghostWidth}
            y2={1000}
            stroke={theme.accent}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.3}
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}

      {/* Enhanced Detailed Tooltip (shown on hover, hidden while dragging) - v0.8.1: Disabled for split tasks (segments are independent) */}
      <AnimatePresence>
        {isHovered && !isDragging && !task.segments && (
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{ pointerEvents: 'none' }}
          >
            {/* Tooltip Background */}
            <rect
              x={displayX + displayWidth / 2 - 120}
              y={y - 95}
              width={240}
              height={82}
              rx={8}
              fill={theme.bgSecondary}
              stroke={theme.border}
              strokeWidth={1}
              filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))"
            />

            {/* Tooltip Arrow */}
            <path
              d={`M ${displayX + displayWidth / 2 - 6} ${y - 13} L ${displayX + displayWidth / 2} ${y - 3} L ${displayX + displayWidth / 2 + 6} ${y - 13}`}
              fill={theme.bgSecondary}
              stroke={theme.border}
              strokeWidth={1}
            />

            {/* Task Name */}
            <text
              x={displayX + displayWidth / 2}
              y={y - 73}
              textAnchor="middle"
              fill={theme.textPrimary}
              fontSize="13"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {task.name.length > 28 ? `${task.name.substring(0, 28)}...` : task.name}
            </text>

            {/* Dates */}
            <text
              x={displayX + displayWidth / 2 - 110}
              y={y - 55}
              fill={theme.textTertiary}
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              Start:
            </text>
            <text
              x={displayX + displayWidth / 2 - 70}
              y={y - 55}
              fill={theme.textSecondary}
              fontSize="11"
              fontWeight="500"
              fontFamily="Inter, sans-serif"
            >
              {formatDate(task.startDate!)}
            </text>

            <text
              x={displayX + displayWidth / 2 - 110}
              y={y - 40}
              fill={theme.textTertiary}
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              End:
            </text>
            <text
              x={displayX + displayWidth / 2 - 70}
              y={y - 40}
              fill={theme.textSecondary}
              fontSize="11"
              fontWeight="500"
              fontFamily="Inter, sans-serif"
            >
              {formatDate(task.endDate!)}
            </text>

            {/* Duration */}
            <text
              x={displayX + displayWidth / 2 + 10}
              y={y - 55}
              fill={theme.textTertiary}
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              Duration:
            </text>
            <text
              x={displayX + displayWidth / 2 + 65}
              y={y - 55}
              fill={theme.textSecondary}
              fontSize="11"
              fontWeight="500"
              fontFamily="Inter, sans-serif"
            >
              {getDuration()}
            </text>

            {/* Progress */}
            <text
              x={displayX + displayWidth / 2 + 10}
              y={y - 40}
              fill={theme.textTertiary}
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              Progress:
            </text>
            <text
              x={displayX + displayWidth / 2 + 65}
              y={y - 40}
              fill={theme.textSecondary}
              fontSize="11"
              fontWeight="500"
              fontFamily="Inter, sans-serif"
            >
              {task.progress}%
            </text>

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <>
                <text
                  x={displayX + displayWidth / 2 - 110}
                  y={y - 25}
                  fill={theme.textTertiary}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                >
                  Assignees:
                </text>
                <text
                  x={displayX + displayWidth / 2 - 50}
                  y={y - 25}
                  fill={theme.textSecondary}
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter, sans-serif"
                >
                  {task.assignees.map(a => a.name).join(', ').substring(0, 30)}
                  {task.assignees.map(a => a.name).join(', ').length > 30 ? '...' : ''}
                </text>
              </>
            )}

            {/* Interaction Hints - Adaptive for bar size */}
            <text
              x={displayX + displayWidth / 2}
              y={y - 18}
              textAnchor="middle"
              fill={theme.textTertiary}
              fontSize="9"
              fontFamily="Inter, sans-serif"
              style={{ opacity: 0.7 }}
            >
              {isVerySmallBar
                ? 'Left: move • Right: resize'
                : isSmallBar
                ? 'Drag to move • Hold ALT + drag edge to resize'
                : 'Drag edges to resize • Drag center to move • Click ⚫ to link'
              }
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}
