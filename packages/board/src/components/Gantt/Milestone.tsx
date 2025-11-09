import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from './types';
import { typography, getSVGTextProps } from './typography';
import { calculateHealthStatus, getPhaseColors } from './colorUtils';
import { BORDER_RADIUS, SHADOWS } from './designSystem';

interface MilestoneProps {
  task: Task;
  x: number;
  y: number;
  theme: any;
  onClick?: (task: Task) => void;
}

export function Milestone({ task, x, y, theme, onClick }: MilestoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const size = 16;

  // Phase-based color system for milestones
  // Automatically categorizes by project phase from task name
  const healthStatus = calculateHealthStatus(task.startDate || null, task.endDate || task.startDate || null, task.progress);
  const phaseColors = getPhaseColors(task.name, healthStatus);

  // Apply phase colors with red border for critical path
  const milestoneColor = phaseColors.base;
  const milestoneBorder = task.isCriticalPath ? '#DC2626' : phaseColors.accent;

  // Format date for tooltip
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => { e.stopPropagation(); onClick?.(task); }}
      style={{ cursor: 'pointer' }}
    >
      {/* Health-based Glow */}
      {(task.isCriticalPath || healthStatus !== 'on-track') && (
        <motion.circle
          cx={x}
          cy={y + 16}
          r={size + 4}
          fill={`${milestoneColor}33`}
          initial={{ scale: 0 }}
          animate={{ scale: isHovered ? 1.2 : 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Diamond Shape (rotated square) */}
      <motion.rect
        x={x - size / 2}
        y={y + 16 - size / 2}
        width={size}
        height={size}
        fill={milestoneColor}
        stroke={theme.bgGrid}
        strokeWidth={2}
        transform={`rotate(45 ${x} ${y + 16})`}
        initial={{ scale: 0, rotate: 0 }}
        animate={{
          scale: isHovered ? 1.2 : 1,
          rotate: isHovered ? 50 : 45,
        }}
        transition={{
          duration: 0.25,
          type: 'spring',
          stiffness: 400,
          damping: 22,
        }}
      />

      {/* Hover Effect - Outer Ring */}
      {isHovered && (
        <motion.rect
          x={x - (size + 4) / 2}
          y={y + 16 - (size + 4) / 2}
          width={size + 4}
          height={size + 4}
          fill="none"
          stroke={milestoneBorder}
          strokeWidth={2}
          opacity={0.5}
          transform={`rotate(45 ${x} ${y + 16})`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Enhanced Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tooltip Background */}
            <rect
              x={x - 80}
              y={y - 50}
              width={160}
              height={44}
              rx={BORDER_RADIUS.large}
              fill={theme.bgSecondary}
              stroke={theme.border}
              strokeWidth={1}
              filter={SHADOWS.tooltip}
            />

            {/* Tooltip Arrow */}
            <path
              d={`M ${x - 6} ${y - 6} L ${x} ${y + 4} L ${x + 6} ${y - 6}`}
              fill={theme.bgSecondary}
              stroke={theme.border}
              strokeWidth={1}
            />

            {/* Milestone Icon in Tooltip */}
            <rect
              x={x - 70}
              y={y - 38}
              width={8}
              height={8}
              fill={milestoneColor}
              transform={`rotate(45 ${x - 66} ${y - 34})`}
            />

            {/* Task Name */}
            <text
              x={x - 55}
              y={y - 32}
              fill={theme.textPrimary}
              {...getSVGTextProps(typography.milestone)}
            >
              {task.name.length > 18 ? `${task.name.substring(0, 18)}...` : task.name}
            </text>

            {/* Date */}
            <text
              x={x - 55}
              y={y - 18}
              fill={theme.textTertiary}
              {...getSVGTextProps(typography.caption)}
            >
              {formatDate(task.startDate!)}
            </text>

            {/* Health Status Badge */}
            {(healthStatus !== 'on-track' || task.isCriticalPath) && (
              <g>
                <rect
                  x={x + 10}
                  y={y - 40}
                  width={60}
                  height={16}
                  rx={BORDER_RADIUS.small}
                  fill={`${milestoneColor}33`}
                />
                <text
                  x={x + 40}
                  y={y - 30}
                  textAnchor="middle"
                  fill={milestoneBorder}
                  {...getSVGTextProps(typography.badge)}
                  letterSpacing="0.5"
                >
                  {task.isCriticalPath ? 'CRITICAL' : healthStatus === 'off-track' ? 'OVERDUE' : 'AT RISK'}
                </text>
              </g>
            )}
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}
