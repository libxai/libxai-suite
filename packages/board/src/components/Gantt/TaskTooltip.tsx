/**
 * TaskTooltip - v0.17.76
 *
 * Renders task tooltips in a separate SVG layer to ensure they always appear
 * above all task bars regardless of their vertical position.
 *
 * This solves the SVG z-order issue where tooltips appearing below a task bar
 * would be hidden behind tasks rendered later in the DOM.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Task } from './types';

export interface TaskTooltipData {
  task: Task;
  x: number;
  y: number;
  width: number;
  height: number;
  showBelow: boolean;
}

interface TaskTooltipProps {
  tooltipData: TaskTooltipData | null;
  theme: any;
}

export function TaskTooltip({ tooltipData, theme }: TaskTooltipProps) {
  if (!tooltipData) return null;

  const { task, x, y, width, height, showBelow } = tooltipData;

  const tooltipHeight = 82;
  const tooltipGap = 13;

  // Calculate tooltip Y position
  const tooltipY = showBelow
    ? y + height + tooltipGap
    : y - tooltipHeight - tooltipGap;

  // Arrow path
  const arrowPath = showBelow
    ? `M ${x + width / 2 - 6} ${y + height + 3} L ${x + width / 2} ${y + height + 13} L ${x + width / 2 + 6} ${y + height + 3}`
    : `M ${x + width / 2 - 6} ${y - 13} L ${x + width / 2} ${y - 3} L ${x + width / 2 + 6} ${y - 13}`;

  // Text Y positions
  const nameY = tooltipY + 22;
  const row1Y = tooltipY + 40;
  const row2Y = tooltipY + 55;
  const assigneesY = tooltipY + 70;

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate duration
  const getDuration = () => {
    if (!task.startDate || !task.endDate) return 'N/A';
    const days = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Bar size flags for hint text
  const isSmallBar = width < 50;
  const isVerySmallBar = width < 40;

  return (
    <AnimatePresence>
      <motion.g
        initial={{ opacity: 0, y: showBelow ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: showBelow ? -10 : 10 }}
        transition={{ duration: 0.2 }}
        style={{ pointerEvents: 'none' }}
      >
        {/* Tooltip Arrow */}
        <path
          d={arrowPath}
          fill={theme.bgSecondary}
          stroke={theme.border}
          strokeWidth={1}
        />

        {/* Tooltip Background */}
        <rect
          x={x + width / 2 - 120}
          y={tooltipY}
          width={240}
          height={tooltipHeight}
          rx={8}
          fill={theme.bgSecondary}
          stroke={theme.border}
          strokeWidth={1}
          filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))"
        />

        {/* Task Name */}
        <text
          x={x + width / 2}
          y={nameY}
          textAnchor="middle"
          fill={theme.textPrimary}
          fontSize="13"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {task.name.length > 28 ? `${task.name.substring(0, 28)}...` : task.name}
        </text>

        {/* Start Date */}
        <text
          x={x + width / 2 - 110}
          y={row1Y}
          fill={theme.textTertiary}
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          Start:
        </text>
        <text
          x={x + width / 2 - 70}
          y={row1Y}
          fill={theme.textSecondary}
          fontSize="11"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {task.startDate ? formatDate(task.startDate) : 'N/A'}
        </text>

        {/* End Date */}
        <text
          x={x + width / 2 - 110}
          y={row2Y}
          fill={theme.textTertiary}
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          End:
        </text>
        <text
          x={x + width / 2 - 70}
          y={row2Y}
          fill={theme.textSecondary}
          fontSize="11"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {task.endDate ? formatDate(task.endDate) : 'N/A'}
        </text>

        {/* Duration */}
        <text
          x={x + width / 2 + 10}
          y={row1Y}
          fill={theme.textTertiary}
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          Duration:
        </text>
        <text
          x={x + width / 2 + 65}
          y={row1Y}
          fill={theme.textSecondary}
          fontSize="11"
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {getDuration()}
        </text>

        {/* Progress */}
        <text
          x={x + width / 2 + 10}
          y={row2Y}
          fill={theme.textTertiary}
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          Progress:
        </text>
        <text
          x={x + width / 2 + 65}
          y={row2Y}
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
              x={x + width / 2 - 110}
              y={assigneesY}
              fill={theme.textTertiary}
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              Assignees:
            </text>
            <text
              x={x + width / 2 - 50}
              y={assigneesY}
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

        {/* v0.17.137: Removed interaction hints text for cleaner tooltip */}
      </motion.g>
    </AnimatePresence>
  );
}
