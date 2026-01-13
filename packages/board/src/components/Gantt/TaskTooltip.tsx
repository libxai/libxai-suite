/**
 * TaskTooltip - v1.2.0
 *
 * Renders task tooltips in a separate SVG layer to ensure they always appear
 * above all task bars regardless of their vertical position.
 *
 * v1.2.0: Added three-tier time tracking display (effortMinutes, timeLoggedMinutes, soldEffortMinutes)
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
  locale?: 'en' | 'es';
}

export function TaskTooltip({ tooltipData, theme, locale = 'en' }: TaskTooltipProps) {
  if (!tooltipData) return null;

  const { task, x, y, width, height, showBelow } = tooltipData;

  // v1.2.0: Check if task has time tracking data
  const hasTimeData = task.effortMinutes != null || task.timeLoggedMinutes != null || task.soldEffortMinutes != null;
  const tooltipHeight = hasTimeData ? 130 : 82; // Increased height for time data
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
  // v1.2.0: Time tracking rows
  const timeRow1Y = tooltipY + 90;
  const timeRow2Y = tooltipY + 105;
  const timeRow3Y = tooltipY + 120;

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

  // v1.2.0: Format minutes to hours/minutes
  const formatMinutes = (minutes: number | null | undefined): string => {
    if (minutes == null || minutes === 0) return locale === 'es' ? 'N/A' : 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // v1.2.0: Translations
  const t = {
    start: locale === 'es' ? 'Inicio:' : 'Start:',
    end: locale === 'es' ? 'Fin:' : 'End:',
    duration: locale === 'es' ? 'Duración:' : 'Duration:',
    progress: locale === 'es' ? 'Progreso:' : 'Progress:',
    assignees: locale === 'es' ? 'Asignados:' : 'Assignees:',
    estimated: locale === 'es' ? 'Estimado:' : 'Estimated:',
    logged: locale === 'es' ? 'Registrado:' : 'Logged:',
    quoted: locale === 'es' ? 'Ofertado:' : 'Quoted:',
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
          {t.start}
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
          {t.end}
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
          {t.duration}
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
          {t.progress}
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
              {t.assignees}
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

        {/* v1.2.0: Time Tracking Section */}
        {hasTimeData && (
          <>
            {/* Effort Minutes (Estimated) */}
            {task.effortMinutes != null && (
              <>
                <text
                  x={x + width / 2 - 110}
                  y={timeRow1Y}
                  fill={theme.textTertiary}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                >
                  {t.estimated}
                </text>
                <text
                  x={x + width / 2 - 50}
                  y={timeRow1Y}
                  fill={theme.textSecondary}
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter, sans-serif"
                >
                  {formatMinutes(task.effortMinutes)}
                </text>
              </>
            )}

            {/* Time Logged Minutes */}
            {task.timeLoggedMinutes != null && (
              <>
                <text
                  x={x + width / 2 - 110}
                  y={timeRow2Y}
                  fill={theme.textTertiary}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                >
                  {t.logged}
                </text>
                <text
                  x={x + width / 2 - 50}
                  y={timeRow2Y}
                  fill={theme.accent}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {formatMinutes(task.timeLoggedMinutes)}
                </text>
              </>
            )}

            {/* Sold Effort Minutes (Quoted) */}
            {task.soldEffortMinutes != null && (
              <>
                <text
                  x={x + width / 2 - 110}
                  y={timeRow3Y}
                  fill={theme.textTertiary}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                >
                  {t.quoted}
                </text>
                <text
                  x={x + width / 2 - 50}
                  y={timeRow3Y}
                  fill={theme.textSecondary}
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter, sans-serif"
                >
                  {formatMinutes(task.soldEffortMinutes)}
                </text>
              </>
            )}
          </>
        )}

        {/* v0.17.137: Removed interaction hints text for cleaner tooltip */}
      </motion.g>
    </AnimatePresence>
  );
}
