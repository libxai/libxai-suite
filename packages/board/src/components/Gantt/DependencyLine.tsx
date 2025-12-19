import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// v0.17.79: Data for rendering FULL dependency line + delete button in top layer
export interface DependencyHoverData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onDelete: () => void;
}

// Keep old interface name for backwards compatibility
export type DependencyDeleteButtonData = DependencyHoverData;

interface DependencyLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  theme: any;
  onDelete?: () => void;
  // v0.17.79: Callback to render full line + delete button in top layer (above tasks)
  onHoverChange?: (data: DependencyHoverData | null) => void;
}

export function DependencyLine({ x1, y1, x2, y2, theme, onDelete, onHoverChange }: DependencyLineProps) {
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

  // v0.17.79: Notify parent of hover state for top-layer rendering (full line + delete button)
  useEffect(() => {
    if (onHoverChange && onDelete) {
      if (isHovered) {
        onHoverChange({
          x1,
          y1,
          x2,
          y2,
          onDelete,
        });
      } else {
        onHoverChange(null);
      }
    }
  }, [isHovered, x1, y1, x2, y2, onDelete, onHoverChange]);

  // v0.17.140: If no onDelete/onHoverChange, this is a static line (hover handled by top layer)
  const isStaticLine = !onDelete && !onHoverChange;

  return (
    <g
      onMouseEnter={() => !isStaticLine && setIsHovered(true)}
      onMouseLeave={() => !isStaticLine && setIsHovered(false)}
      style={{ pointerEvents: isStaticLine ? 'none' : 'auto' }}
    >
      {/* Invisible wider path for easier hover detection - only if interactive */}
      {!isStaticLine && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          style={{ cursor: 'pointer' }}
        />
      )}

      {/* v0.17.157: ClickUp-style dependency line - solid, visible, professional */}
      <motion.path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          // Hide original line when hover renders in top layer
          opacity: (isHovered && onHoverChange) ? 0 : (isHovered ? 1 : 0.8),
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
          // Hide original arrow when hover renders in top layer
          opacity: (isHovered && onHoverChange) ? 0 : (isHovered ? 1 : 0.8),
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
          // Hide original dot when hover renders in top layer
          scale: (isHovered && onHoverChange) ? 0 : (isHovered ? 1.3 : 1),
          opacity: (isHovered && onHoverChange) ? 0 : (isHovered ? 1 : 0.8),
        }}
        transition={{
          scale: { delay: 0.3, duration: 0.15 },
          opacity: { duration: 0.2 },
        }}
      />

      {/* Delete button (appears on hover) */}
      {/* v0.17.78: Only render internally if no external handler (backwards compatibility) */}
      {isHovered && onDelete && !onHoverChange && (
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