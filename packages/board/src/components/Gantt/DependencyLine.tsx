import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DependencyLineStyle } from './types';

// v0.17.363: Simplified to single-layer rendering with correct ClickUp-style routing
// Data for hover state (delete button position tracking)
export interface DependencyHoverData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onDelete: () => void;
  lineStyle?: DependencyLineStyle;
  mouseX?: number;
  mouseY?: number;
}

// Keep old interface name for backwards compatibility
export type DependencyDeleteButtonData = DependencyHoverData;

interface DependencyLineProps {
  x1: number; // Exit X (right side of source bar)
  y1: number; // Exit Y (center of source bar)
  x2: number; // Enter X (left side of destination bar)
  y2: number; // Enter Y (center of destination bar)
  theme: any;
  onDelete?: () => void;
  // v0.17.310: Dependency line style (curved or squared)
  lineStyle?: DependencyLineStyle;
  // v0.17.363: Is this line being rendered in the hover layer?
  isHoverLayer?: boolean;
}

/**
 * v0.17.363: TRUE ClickUp-style dependency line routing
 *
 * RULES:
 * 1. Lines ALWAYS exit from the RIGHT side of the source bar
 * 2. Lines ALWAYS enter from the LEFT side of the destination bar
 * 3. The vertical segment is placed BEFORE (to the left of) the destination bar
 *
 * Pattern: source(right) → horizontal → vertical → horizontal → destination(left)
 *
 * For FORWARD dependencies (destination is to the right of source):
 *   Exit right → go horizontal to turnX → turn down/up → go to destination Y → turn right → enter left
 *   turnX = x2 - OFFSET (just before destination)
 *
 * For BACKWARD dependencies (destination is to the left of source):
 *   Exit right → short horizontal → turn down/up → go to destination Y → turn LEFT → enter left
 *   turnX = x2 - OFFSET (still before destination, which is now to the left)
 *   This means we go RIGHT first, then DOWN, then LEFT to reach destination
 */
export function DependencyLine({
  x1, y1, x2, y2,
  theme,
  onDelete,
  lineStyle = 'curved',
  isHoverLayer = false,
}: DependencyLineProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const dy = y2 - y1;
  const goingDown = dy > 0;
  const isSameRow = Math.abs(dy) < 5;

  // Corner radius for smooth turns
  const cornerRadius = 5;
  const r = cornerRadius;

  // OFFSET from bars for the vertical segment
  const OFFSET = 20;

  let path: string;
  let turnX: number;

  if (isSameRow) {
    // Same row - direct horizontal line (or gentle curve)
    turnX = (x1 + x2) / 2;
    if (lineStyle === 'squared') {
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else {
      const ctrlOffset = Math.min(Math.abs(x2 - x1) / 3, 30);
      path = `M ${x1} ${y1} C ${x1 + ctrlOffset} ${y1}, ${x2 - ctrlOffset} ${y2}, ${x2} ${y2}`;
    }
  } else {
    // Different rows - need routing
    // CRITICAL: turnX is ALWAYS to the LEFT of the destination bar
    // This ensures we ALWAYS enter from the left
    turnX = x2 - OFFSET;

    // But we need to ensure turnX is not behind the source exit
    // If destination is way to the left, we need to go right first, then back left
    const needsExtraSegment = turnX < x1 + OFFSET;

    if (needsExtraSegment) {
      // Backward dependency: destination is to the left
      // We need: exit right → horizontal right → vertical → horizontal LEFT → enter left
      const midX = x1 + OFFSET; // Go right first

      if (lineStyle === 'squared') {
        path = `M ${x1} ${y1} ` +
               `L ${midX} ${y1} ` +           // Horizontal right
               `L ${midX} ${y2} ` +           // Vertical
               `L ${x2} ${y2}`;               // Horizontal left to destination
      } else {
        // Curved version
        if (goingDown) {
          path = `M ${x1} ${y1} ` +
                 `L ${midX - r} ${y1} ` +
                 `Q ${midX} ${y1} ${midX} ${y1 + r} ` +
                 `L ${midX} ${y2 - r} ` +
                 `Q ${midX} ${y2} ${midX - r} ${y2} ` +
                 `L ${x2} ${y2}`;
        } else {
          path = `M ${x1} ${y1} ` +
                 `L ${midX - r} ${y1} ` +
                 `Q ${midX} ${y1} ${midX} ${y1 - r} ` +
                 `L ${midX} ${y2 + r} ` +
                 `Q ${midX} ${y2} ${midX - r} ${y2} ` +
                 `L ${x2} ${y2}`;
        }
      }
      turnX = midX; // For delete button positioning
    } else {
      // Forward dependency: destination is to the right
      // turnX is just before destination
      if (lineStyle === 'squared') {
        path = `M ${x1} ${y1} ` +
               `L ${turnX} ${y1} ` +
               `L ${turnX} ${y2} ` +
               `L ${x2} ${y2}`;
      } else {
        // Curved version
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
      }
    }
  }

  // Arrow marker at the end - ALWAYS points RIGHT (entering from left)
  const arrowSize = 5;
  const arrowPath = `M ${x2} ${y2} L ${x2 - arrowSize} ${y2 - arrowSize * 0.5} M ${x2} ${y2} L ${x2 - arrowSize} ${y2 + arrowSize * 0.5}`;

  // Dependencies are always gray - critical path only affects TASK BARS, not dependency lines
  const lineColor = theme.dependency;
  const hoverColor = theme.dependencyHover || lineColor;

  // Delete button colors
  const deleteColor = '#f87171';
  const deleteColorSoft = 'rgba(248, 113, 113, 0.15)';

  // Calculate delete button position (on vertical segment or midpoint for same-row)
  let deleteX = turnX;
  let deleteY = (y1 + y2) / 2;

  // If mouse position available, follow cursor along vertical segment
  if (mousePos && !isSameRow) {
    deleteX = turnX;
    deleteY = Math.max(Math.min(y1, y2) + 15, Math.min(Math.max(y1, y2) - 15, mousePos.y));
  }

  // Mouse event handler
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos(null);
  };

  // For hover layer, we render with glow effect
  if (isHoverLayer) {
    return (
      <g
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {/* Wider hover detection area */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          style={{ cursor: 'pointer' }}
        />

        {/* Glow effect layer */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.15}
          style={{ pointerEvents: 'none', filter: 'blur(4px)' }}
        />

        {/* Highlighted dependency line */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Arrow head */}
        <path
          d={arrowPath}
          fill="none"
          stroke={hoverColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Endpoint dot */}
        <circle
          cx={x2}
          cy={y2}
          r={4}
          fill={hoverColor}
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Delete button */}
        {onDelete && (
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={deleteX}
              cy={deleteY}
              r={9}
              fill={deleteColorSoft}
              stroke={deleteColor}
              strokeWidth={1.5}
            />
            <line
              x1={deleteX - 3}
              y1={deleteY - 3}
              x2={deleteX + 3}
              y2={deleteY + 3}
              stroke={deleteColor}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <line
              x1={deleteX + 3}
              y1={deleteY - 3}
              x2={deleteX - 3}
              y2={deleteY + 3}
              stroke={deleteColor}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </motion.g>
        )}
      </g>
    );
  }

  // Base layer rendering (non-hover)
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{ cursor: onDelete ? 'pointer' : 'default' }}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinecap="round"
        style={{ cursor: onDelete ? 'pointer' : 'default' }}
      />

      {/* Main dependency line */}
      <motion.path
        d={path}
        fill="none"
        stroke={isHovered ? hoverColor : lineColor}
        strokeWidth={isHovered ? 2.5 : 2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.5, ease: 'easeInOut' },
          opacity: { duration: 0.2 },
        }}
      />

      {/* Arrow head */}
      <motion.path
        d={arrowPath}
        fill="none"
        stroke={isHovered ? hoverColor : lineColor}
        strokeWidth={isHovered ? 2.5 : 2}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
      />

      {/* Endpoint dot */}
      <motion.circle
        cx={x2}
        cy={y2}
        r={isHovered ? 4 : 3}
        fill={isHovered ? hoverColor : lineColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.15 }}
      />

      {/* Delete button (appears on hover) */}
      {isHovered && onDelete && (
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={deleteX}
            cy={deleteY}
            r={9}
            fill={deleteColorSoft}
            stroke={deleteColor}
            strokeWidth={1.5}
          />
          <line
            x1={deleteX - 3}
            y1={deleteY - 3}
            x2={deleteX + 3}
            y2={deleteY + 3}
            stroke={deleteColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={deleteX + 3}
            y1={deleteY - 3}
            x2={deleteX - 3}
            y2={deleteY + 3}
            stroke={deleteColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </motion.g>
      )}
    </g>
  );
}
