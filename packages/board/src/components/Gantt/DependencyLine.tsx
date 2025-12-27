import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { DependencyLineStyle } from './types';

// v0.17.79: Data for rendering FULL dependency line + delete button in top layer
// v0.17.323: Added mouseX/mouseY for cursor-following delete button (ClickUp style)
// v0.17.342: Added routeY for ClickUp-style routing
// v0.17.347: Added fromIndex/toIndex for proper smart routing in hover layer
export interface DependencyHoverData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  routeY?: number; // v0.17.342: Y coordinate for horizontal segment
  fromIndex?: number; // v0.17.347: Row index of origin task
  toIndex?: number; // v0.17.347: Row index of destination task
  onDelete: () => void;
  lineStyle?: DependencyLineStyle; // v0.17.310
  mouseX?: number; // v0.17.323: Cursor X position for delete button
  mouseY?: number; // v0.17.323: Cursor Y position for delete button
}

// Keep old interface name for backwards compatibility
export type DependencyDeleteButtonData = DependencyHoverData;

interface DependencyLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // v0.17.342: New props for ClickUp-style routing
  routeY?: number; // The Y coordinate where the horizontal segment should be
  fromIndex?: number; // Row index of origin task
  toIndex?: number; // Row index of destination task
  rowHeight?: number; // Height of each row
  theme: any;
  onDelete?: () => void;
  // v0.17.79: Callback to render full line + delete button in top layer (above tasks)
  onHoverChange?: (data: DependencyHoverData | null) => void;
  // v0.17.310: Dependency line style (curved or squared)
  lineStyle?: DependencyLineStyle;
}

export function DependencyLine({
  x1, y1, x2, y2,
  routeY: propRouteY,
  fromIndex,
  toIndex: _toIndex, // v0.17.351: Kept for API compatibility
  rowHeight: _rowHeight, // v0.17.342: Available for future use
  theme,
  onDelete,
  onHoverChange,
  lineStyle = 'curved'
}: DependencyLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  // v0.17.351: Simplified ClickUp-style dependency lines
  // ALWAYS use L-shape path for ALL dependency lines between different rows
  // This ensures consistent, clean lines that never pass through task bars

  const dx = x2 - x1;

  // For midpoint calculations (delete button position)
  const midX = x1 + dx / 2;

  // ROW_HEIGHT = 56px, TaskBar: top = row*56+12, bottom = row*56+44
  const ROW_HEIGHT = 56;

  // Corner radius for smooth turns
  const cornerRadius = 5;

  // v0.17.346: Calculate routeY upfront (used for hover layer)
  const calculatedRouteY = fromIndex !== undefined
    ? fromIndex * ROW_HEIGHT + 44 + 6 // 6px below source bar bottom
    : (propRouteY ?? (y1 + 22));

  let path: string;

  // v0.17.352: ClickUp-style routing - vertical segment goes to LEFT of destination bar
  // This ensures lines never pass through task bars
  // x2 is the LEFT edge of destination bar, so we route the vertical segment there
  const verticalX = x2 - 12; // 12px to the left of destination bar
  const r = cornerRadius;

  if (lineStyle === 'squared') {
    path = `M ${x1} ${y1} ` +
           `L ${verticalX} ${y1} ` +     // Horizontal to left of dest bar
           `L ${verticalX} ${y2} ` +     // Vertical down/up
           `L ${x2} ${y2}`;              // Short horizontal into destination
  } else {
    // With rounded corners
    const goingDown = y2 > y1;
    if (Math.abs(y2 - y1) < 5) {
      // Same row - simple horizontal curve
      const ctrlOffset = Math.min(Math.abs(dx) / 3, 30);
      path = `M ${x1} ${y1} C ${x1 + ctrlOffset} ${y1}, ${x2 - ctrlOffset} ${y2}, ${x2} ${y2}`;
    } else if (goingDown) {
      path = `M ${x1} ${y1} ` +
             `L ${verticalX - r} ${y1} ` +
             `Q ${verticalX} ${y1} ${verticalX} ${y1 + r} ` +  // Corner: turn down
             `L ${verticalX} ${y2 - r} ` +
             `Q ${verticalX} ${y2} ${verticalX + r} ${y2} ` +  // Corner: turn right
             `L ${x2} ${y2}`;
    } else {
      path = `M ${x1} ${y1} ` +
             `L ${verticalX - r} ${y1} ` +
             `Q ${verticalX} ${y1} ${verticalX} ${y1 - r} ` +  // Corner: turn up
             `L ${verticalX} ${y2 + r} ` +
             `Q ${verticalX} ${y2} ${verticalX + r} ${y2} ` +  // Corner: turn right
             `L ${x2} ${y2}`;
    }
  }

  // Arrow marker at the end - pointing horizontally into the target
  const arrowSize = 5;
  const arrowX = x2 - arrowSize;
  const arrowY = y2 - arrowSize * 0.5;
  const arrowX2 = x2 - arrowSize;
  const arrowY2 = y2 + arrowSize * 0.5;

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
          routeY: calculatedRouteY, // v0.17.342: Include routing Y for hover layer
          onDelete,
          lineStyle, // v0.17.310
        });
      } else {
        onHoverChange(null);
      }
    }
  }, [isHovered, x1, y1, x2, y2, calculatedRouteY, onDelete, onHoverChange, lineStyle]);

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