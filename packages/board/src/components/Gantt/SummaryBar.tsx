import { motion } from 'framer-motion';
import { Task, GanttTheme } from './types';
import { parentTaskUtils } from './parentTaskUtils';

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
  const height = 14; // Further reduced for minimalist design (was 20px, matching TaskBar reduction)
  const barY = y + 9; // Adjusted center position for new height (was 6)

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

  // Triangle cap size
  const capSize = 8;

  return (
    <g onClick={() => onClick?.(task)} style={{ cursor: 'pointer' }}>
      {/* Main horizontal bar - solid dark color */}
      <motion.rect
        x={actualStartX + capSize}
        y={barY}
        width={actualWidth - capSize * 2}
        height={height}
        fill={task.isCriticalPath ? '#DC2626' : theme.taskBarPrimary}
        opacity={0.9}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Progress fill - lighter color */}
      <rect
        x={actualStartX + capSize}
        y={barY}
        width={(actualWidth - capSize * 2) * (progress / 100)}
        height={height}
        fill={theme.taskBarProgress}
        opacity={0.8}
        style={{ pointerEvents: 'none' }}
      />

      {/* Left triangle cap (pointing left) */}
      <path
        d={`M ${actualStartX} ${barY + height / 2}
            L ${actualStartX + capSize} ${barY}
            L ${actualStartX + capSize} ${barY + height}
            Z`}
        fill={task.isCriticalPath ? '#DC2626' : theme.taskBarPrimary}
        opacity={0.9}
      />

      {/* Right triangle cap (pointing right) */}
      <path
        d={`M ${actualStartX + actualWidth} ${barY + height / 2}
            L ${actualStartX + actualWidth - capSize} ${barY}
            L ${actualStartX + actualWidth - capSize} ${barY + height}
            Z`}
        fill={task.isCriticalPath ? '#DC2626' : theme.taskBarPrimary}
        opacity={0.9}
      />

      {/* Bottom border line for depth effect */}
      <line
        x1={actualStartX + capSize}
        y1={barY + height}
        x2={actualStartX + actualWidth - capSize}
        y2={barY + height}
        stroke={theme.border}
        strokeWidth={1}
        opacity={0.5}
        style={{ pointerEvents: 'none' }}
      />

      {/* Task name (only if enough space) */}
      {actualWidth > 100 && (
        <text
          x={actualStartX + 16}
          y={barY + height / 2}
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize="12"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
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
          x={actualStartX + actualWidth - 12}
          y={barY + height / 2}
          dominantBaseline="middle"
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.9)"
          fontSize="10"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
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
