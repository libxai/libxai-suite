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
  verticalX?: number; // v0.17.353: X position for vertical segment (calculated by Timeline)
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
  // v0.17.353: Dynamic vertical segment position (calculated by Timeline to avoid task bars)
  verticalX?: number; // X position for vertical segment
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
  verticalX: _verticalX, // v0.17.362: No longer used, kept for API compatibility
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

  // v0.17.353: Smart routing for dependency lines
  // verticalX is calculated by Timeline to avoid task bars

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

  // v0.17.362: TRUE ClickUp-style routing
  // Pattern: Exit RIGHT → short horizontal → vertical → horizontal → Enter LEFT
  // The vertical segment should be close to the bars, not far to the right

  const r = cornerRadius;
  const goingDown = y2 > y1;
  const OFFSET = 15; // Small offset from bar edges

  // Determine where to place the vertical segment
  // If destination is to the RIGHT of source: vertical at x1 + OFFSET (just after source)
  // If destination is to the LEFT of source: vertical at x2 - OFFSET (just before destination)
  const isForward = x2 >= x1; // Destination bar starts at or after source bar ends

  if (lineStyle === 'squared') {
    if (Math.abs(y2 - y1) < 5) {
      // Same row - direct horizontal line
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else if (isForward) {
      // Forward: source is LEFT, destination is RIGHT
      // Exit right → go to x2-OFFSET → vertical → enter left
      const turnX = x2 - OFFSET;
      path = `M ${x1} ${y1} ` +
             `L ${turnX} ${y1} ` +       // Horizontal to turn point
             `L ${turnX} ${y2} ` +       // Vertical
             `L ${x2} ${y2}`;            // Short horizontal into destination
    } else {
      // Backward: source is RIGHT, destination is LEFT
      // Exit right → short horizontal → vertical → horizontal to destination
      const turnX = x1 + OFFSET;
      path = `M ${x1} ${y1} ` +
             `L ${turnX} ${y1} ` +       // Short horizontal right
             `L ${turnX} ${y2} ` +       // Vertical
             `L ${x2} ${y2}`;            // Horizontal left to destination
    }
  } else {
    // Curved style with rounded corners
    if (Math.abs(y2 - y1) < 5) {
      // Same row - smooth curve
      const ctrlOffset = Math.min(Math.abs(dx) / 3, 30);
      path = `M ${x1} ${y1} C ${x1 + ctrlOffset} ${y1}, ${x2 - ctrlOffset} ${y2}, ${x2} ${y2}`;
    } else if (isForward) {
      // Forward dependency: vertical segment just before destination
      const turnX = x2 - OFFSET;
      if (goingDown) {
        path = `M ${x1} ${y1} ` +
               `L ${turnX - r} ${y1} ` +
               `Q ${turnX} ${y1} ${turnX} ${y1 + r} ` +
               `L ${turnX} ${y2 - r} ` +
               `Q ${turnX} ${y2} ${turnX + r} ${y2} ` +
               `L ${x2} ${y2}`;
      } else {
        path = `M ${x1} ${y1} ` +
               `L ${turnX - r} ${y1} ` +
               `Q ${turnX} ${y1} ${turnX} ${y1 - r} ` +
               `L ${turnX} ${y2 + r} ` +
               `Q ${turnX} ${y2} ${turnX + r} ${y2} ` +
               `L ${x2} ${y2}`;
      }
    } else {
      // Backward dependency: destination is to the LEFT of source
      // We need to go: right from source → down/up → LEFT to destination
      // turnX is just after source (to the right)
      const turnX = x1 + OFFSET;
      if (goingDown) {
        // Going DOWN then LEFT
        path = `M ${x1} ${y1} ` +                              // Start at source exit (right side)
               `L ${turnX - r} ${y1} ` +                       // Go right a bit
               `Q ${turnX} ${y1} ${turnX} ${y1 + r} ` +        // Curve: turn DOWN
               `L ${turnX} ${y2 - r} ` +                       // Go down
               `Q ${turnX} ${y2} ${turnX - r} ${y2} ` +        // Curve: turn LEFT
               `L ${x2} ${y2}`;                                // Go left to destination
      } else {
        // Going UP then LEFT
        path = `M ${x1} ${y1} ` +                              // Start at source exit (right side)
               `L ${turnX - r} ${y1} ` +                       // Go right a bit
               `Q ${turnX} ${y1} ${turnX} ${y1 - r} ` +        // Curve: turn UP
               `L ${turnX} ${y2 + r} ` +                       // Go up
               `Q ${turnX} ${y2} ${turnX - r} ${y2} ` +        // Curve: turn LEFT
               `L ${x2} ${y2}`;                                // Go left to destination
      }
    }
  }

  // DEBUG: Log the path being generated
  console.log('[DEP PATH]', { x1, y1, x2, y2, isForward, goingDown, path });

  // Arrow marker at the end - pointing in the direction the line enters
  const arrowSize = 5;
  // v0.17.362: Arrow direction depends on whether we enter from left or right
  // Forward (x2 >= x1): enters from left, arrow points RIGHT (into x2)
  // Backward (x2 < x1): enters from right, arrow points LEFT (into x2)
  const isForwardDep = x2 >= x1;
  const arrowDir = isForwardDep ? -1 : 1; // -1 = arrow points right (entry from left), 1 = arrow points left (entry from right)
  const arrowX = x2 + (arrowSize * arrowDir);
  const arrowY = y2 - arrowSize * 0.5;
  const arrowX2 = x2 + (arrowSize * arrowDir);
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
          routeY: calculatedRouteY,
          onDelete,
          lineStyle,
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
          // v0.17.361: Full opacity for better visibility (hide when hover layer active)
          opacity: (isHovered && onHoverChange) ? 0 : 1,
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
          // v0.17.361: Full opacity for better visibility (hide when hover layer active)
          opacity: (isHovered && onHoverChange) ? 0 : 1,
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
          // v0.17.361: Full opacity for better visibility (hide when hover layer active)
          scale: (isHovered && onHoverChange) ? 0 : (isHovered ? 1.3 : 1),
          opacity: (isHovered && onHoverChange) ? 0 : 1,
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