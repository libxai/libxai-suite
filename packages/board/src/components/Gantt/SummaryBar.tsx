import { motion } from 'framer-motion';
import { Task, GanttTheme } from './types';
import { parentTaskUtils } from './parentTaskUtils';
import { darkenColor, calculateHealthStatus, getHealthColors, lightenColor, getTaskColors } from './colorUtils';
import { typography, getSVGTextProps } from './typography';
import { SHADOWS } from './designSystem';

interface SummaryBarProps {
  task: Task;
  x: number;
  y: number;
  width: number;
  theme: GanttTheme;
  dayWidth: number;
  startDate: Date;
  onClick?: (task: Task) => void;
}

/**
 * Summary Bar Component - Bryntum/DHTMLX style parent task bar
 * Shows as a thinner bar with triangular caps at start/end
 * Automatically spans from first child start to last child end
 */
export function SummaryBar({
  task,
  x,
  y,
  width,
  theme,
  dayWidth,
  startDate,
  onClick
}: SummaryBarProps) {
  const height = 10; // ClickUp/Bryntum standard: thin bracket bar for containers (10-12px)
  const barY = y + 11; // Adjusted center position for new height (32px row - 10px bar = 22px / 2 = 11px)

  // Calculate actual dates based on children
  const parentDates = parentTaskUtils.calculateParentDates(task);
  if (!parentDates) {
    return null; // No valid children with dates
  }

  // Calculate position based on children dates
  const actualStartX = ((parentDates.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  const actualEndX = ((parentDates.endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  const actualWidth = actualEndX - actualStartX + dayWidth;

  // Calculate average progress from children
  const progress = parentTaskUtils.calculateParentProgress(task);

  // Bracket-style dimensions (ClickUp/Bryntum inspired)
  const bracketWidth = 2; // Thin stroke for brackets (2-3px)
  const bracketDepth = 8; // How far brackets extend from the bar (ClickUp standard: 6-8px)

  // v0.8.3: Sequential color pipeline for parent tasks
  const healthStatus = calculateHealthStatus(parentDates?.startDate || null, parentDates?.endDate || null, progress, true);
  const phaseColors = getTaskColors(task, healthStatus);

  // Apply phase colors with red border for critical path
  const baseColor = phaseColors.base;
  const progressColor = phaseColors.dark;
  const bracketColor = task.isCriticalPath ? '#DC2626' : phaseColors.accent;

  // Gradient colors for depth
  const gradientIdFill = `summaryGradient-${task.id}`;
  const gradientIdProgress = `summaryProgressGradient-${task.id}`;
  const lighterFill = lightenColor(baseColor, 12);
  const lighterProgress = lightenColor(progressColor, 8);

  return (
    <g onClick={(e) => { e.stopPropagation(); onClick?.(task); }} style={{ cursor: 'pointer' }}>
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id={gradientIdFill} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lighterFill} stopOpacity="1" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={gradientIdProgress} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lighterProgress} stopOpacity="1" />
          <stop offset="100%" stopColor={progressColor} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Main horizontal bar - base color with gradient */}
      <motion.rect
        x={actualStartX}
        y={barY}
        width={actualWidth}
        height={height}
        fill={`url(#${gradientIdFill})`}
        opacity={0.75}
        filter={SHADOWS.summaryBar}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.75, scale: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Progress fill - darker shade with gradient */}
      <motion.rect
        x={actualStartX}
        y={barY}
        width={actualWidth * (progress / 100)}
        height={height}
        fill={`url(#${gradientIdProgress})`}
        opacity={0.9}
        filter={SHADOWS.taskBarProgress}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1, opacity: 0.9 }}
        transition={{
          duration: 0.7,
          delay: 0.15,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Left bracket [ - ClickUp/Bryntum style - VISIBLE */}
      <path
        d={`
          M ${actualStartX + bracketDepth} ${barY}
          L ${actualStartX} ${barY}
          L ${actualStartX} ${barY + height}
          L ${actualStartX + bracketDepth} ${barY + height}
        `}
        stroke={bracketColor}
        strokeWidth={2}
        fill="none"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />

      {/* Right bracket ] - ClickUp/Bryntum style - VISIBLE */}
      <path
        d={`
          M ${actualStartX + actualWidth - bracketDepth} ${barY}
          L ${actualStartX + actualWidth} ${barY}
          L ${actualStartX + actualWidth} ${barY + height}
          L ${actualStartX + actualWidth - bracketDepth} ${barY + height}
        `}
        stroke={bracketColor}
        strokeWidth={2}
        fill="none"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />

      {/* Task name (only if enough space) */}
      {actualWidth > 100 && (
        <text
          x={actualStartX + bracketDepth + 8}
          y={barY + height / 2}
          dominantBaseline="middle"
          fill="#FFFFFF"
          {...getSVGTextProps(typography.taskRegular)}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {task.name.length > Math.floor(actualWidth / 8)
            ? `${task.name.substring(0, Math.floor(actualWidth / 8))}...`
            : task.name}
        </text>
      )}

      {/* Progress percentage (if enough space) */}
      {actualWidth > 80 && progress > 0 && progress < 100 && (
        <text
          x={actualStartX + actualWidth - bracketDepth - 8}
          y={barY + height / 2}
          dominantBaseline="middle"
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.9)"
          {...getSVGTextProps(typography.percentage)}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {progress}%
        </text>
      )}

      {/* Hover tooltip */}
      <title>
        {`${task.name}\nParent Task (Summary)\nProgress: ${progress}%\n` +
          `Start: ${parentDates.startDate.toLocaleDateString()}\n` +
          `End: ${parentDates.endDate.toLocaleDateString()}\n` +
          `Children: ${task.subtasks?.length || 0} tasks`}
      </title>
    </g>
  );
}
