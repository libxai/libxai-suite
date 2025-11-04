import { useState } from 'react';
import { motion } from 'framer-motion';

interface DependencyLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  theme: any;
  onDelete?: () => void;
}

export function DependencyLine({ x1, y1, x2, y2, theme, onDelete }: DependencyLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate control points for smooth Bézier curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const midX = x1 + dx / 2;
  
  // Create elegant S-curve path
  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  // Arrow marker at the end
  const arrowSize = 6;
  const angle = Math.atan2(dy, dx);
  const arrowX = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

  // Dependencies are always gray - critical path only affects TASK BARS, not dependency lines
  const lineColor = theme.dependency;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        strokeLinecap="round"
        style={{ cursor: 'pointer' }}
      />

      {/* Main dependency line */}
      <motion.path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: isHovered ? 1 : 0.6,
          strokeWidth: isHovered ? 2.5 : 2,
        }}
        transition={{
          pathLength: { duration: 0.5, ease: 'easeInOut' },
          opacity: { duration: 0.2 },
          strokeWidth: { duration: 0.2 },
        }}
      />

      {/* Arrow head */}
      <motion.path
        d={`M ${x2} ${y2} L ${arrowX} ${arrowY} M ${x2} ${y2} L ${arrowX2} ${arrowY2}`}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isHovered ? 1 : 0.6,
          scale: isHovered ? 1.1 : 1,
          strokeWidth: isHovered ? 2.5 : 2,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Endpoint dot */}
      <motion.circle
        cx={x2}
        cy={y2}
        r={3}
        fill={lineColor}
        initial={{ scale: 0 }}
        animate={{
          scale: isHovered ? 1.33 : 1,
        }}
        transition={{
          scale: { delay: 0.3, duration: 0.2 },
        }}
      />

      {/* Delete button (appears on hover) */}
      {isHovered && onDelete && (
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ cursor: 'pointer' }}
        >
          {/* Position delete button at midpoint of the line */}
          <circle
            cx={midX}
            cy={(y1 + y2) / 2}
            r={10}
            fill={theme.bgSecondary}
            stroke={theme.error || '#ef4444'}
            strokeWidth={2}
          />
          {/* X icon */}
          <line
            x1={midX - 4}
            y1={(y1 + y2) / 2 - 4}
            x2={midX + 4}
            y2={(y1 + y2) / 2 + 4}
            stroke={theme.error || '#ef4444'}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={midX + 4}
            y1={(y1 + y2) / 2 - 4}
            x2={midX - 4}
            y2={(y1 + y2) / 2 + 4}
            stroke={theme.error || '#ef4444'}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </motion.g>
      )}
    </g>
  );
}