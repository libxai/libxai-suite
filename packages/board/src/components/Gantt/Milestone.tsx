import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from './types';

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
      data-task-bar="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(task)}
      style={{ cursor: 'pointer' }}
    >
      {/* Critical Path Glow (if applicable) */}
      {task.isCriticalPath && (
        <motion.circle
          cx={x}
          cy={y + 16}
          r={size + 4}
          fill={theme.criticalPathLight}
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
        fill={task.isCriticalPath ? theme.criticalPath : theme.milestone}
        stroke={theme.bgGrid}
        strokeWidth={2}
        transform={`rotate(45 ${x} ${y + 16})`}
        initial={{ scale: 0, rotate: 0 }}
        animate={{
          scale: isHovered ? 1.15 : 1,
          rotate: 45,
        }}
        transition={{
          duration: 0.3,
          type: 'spring',
          stiffness: 300,
          damping: 20,
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
          stroke={task.isCriticalPath ? theme.criticalPath : theme.milestone}
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
              rx={8}
              fill={theme.bgSecondary}
              stroke={theme.border}
              strokeWidth={1}
              filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))"
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
              fill={task.isCriticalPath ? theme.criticalPath : theme.milestone}
              transform={`rotate(45 ${x - 66} ${y - 34})`}
            />

            {/* Task Name */}
            <text
              x={x - 55}
              y={y - 32}
              fill={theme.textPrimary}
              fontSize="12"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {task.name.length > 18 ? `${task.name.substring(0, 18)}...` : task.name}
            </text>

            {/* Date */}
            <text
              x={x - 55}
              y={y - 18}
              fill={theme.textTertiary}
              fontSize="10"
              fontFamily="Inter, sans-serif"
            >
              {formatDate(task.startDate!)}
            </text>

            {/* Critical Path Badge */}
            {task.isCriticalPath && (
              <g>
                <rect
                  x={x + 10}
                  y={y - 40}
                  width={60}
                  height={16}
                  rx={4}
                  fill={theme.criticalPathLight}
                />
                <text
                  x={x + 40}
                  y={y - 30}
                  textAnchor="middle"
                  fill={theme.criticalPath}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                  letterSpacing="0.5"
                >
                  CRITICAL
                </text>
              </g>
            )}
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  );
}