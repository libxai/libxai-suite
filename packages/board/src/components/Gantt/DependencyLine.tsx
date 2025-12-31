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
 * v0.17.364: TRUE ClickUp-style dependency line routing
 *
 * RULES:
 * 1. Lines ALWAYS exit from the RIGHT side of the source bar
 * 2. Lines ALWAYS enter from the LEFT side of the destination bar
 * 3. The vertical segment is ALWAYS placed to the LEFT of the destination bar
 *
 * Pattern: source(right) → horizontal → vertical → horizontal → destination(left)
 *
 * For FORWARD dependencies (x2 > x1, destination RIGHT of source):
 *   The vertical segment is just before destination: turnX = x2 - OFFSET
 *   Path: right → horizontal → down/up → right into destination
 *
 * For BACKWARD dependencies (x2 <= x1, destination LEFT of or at same X as source):
 *   The vertical segment must still be LEFT of destination: turnX = x2 - OFFSET
 *   Path: right → horizontal past source → down/up → LEFT back to destination
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

  // v0.17.366: isBackward needs to be defined outside the else block for delete button positioning
  const isBackward = !isSameRow && x2 <= x1;

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
    // The vertical segment MUST be to the LEFT of the destination (x2)
    // This is the KEY insight: turnX = x2 - OFFSET, ALWAYS
    turnX = x2 - OFFSET;

    if (isBackward) {
      // BACKWARD dependency: destination is to the LEFT of source
      // The MAIN vertical segment MUST be to the LEFT of the destination bar
      //
      // We need a 5-segment path:
      // 1. Exit right from source (short horizontal)
      // 2. Go down/up partway (short vertical)
      // 3. Go LEFT past the destination (long horizontal)
      // 4. Go down/up to destination row (MAIN vertical - LEFT of destination)
      // 5. Go RIGHT into destination (short horizontal)

      const exitPadding = 15;
      const firstTurnX = x1 + exitPadding;   // Just after source
      const secondTurnX = x2 - OFFSET;        // Just LEFT of destination (this is the main vertical)

      // Y position for the horizontal bridge between the two verticals
      // Go halfway between source and destination rows
      const bridgeY = goingDown ? y1 + 20 : y1 - 20;

      turnX = secondTurnX; // For delete button positioning

      if (lineStyle === 'squared') {
        path = `M ${x1} ${y1} ` +
               `L ${firstTurnX} ${y1} ` +          // 1. Exit right
               `L ${firstTurnX} ${bridgeY} ` +     // 2. Short vertical
               `L ${secondTurnX} ${bridgeY} ` +    // 3. Horizontal left (bridge)
               `L ${secondTurnX} ${y2} ` +         // 4. Main vertical (LEFT of dest)
               `L ${x2} ${y2}`;                    // 5. Enter destination from left
      } else {
        // Curved version with 4 turns
        if (goingDown) {
          path = `M ${x1} ${y1} ` +
                 `L ${firstTurnX - r} ${y1} ` +
                 `Q ${firstTurnX} ${y1} ${firstTurnX} ${y1 + r} ` +         // Turn 1: down
                 `L ${firstTurnX} ${bridgeY - r} ` +
                 `Q ${firstTurnX} ${bridgeY} ${firstTurnX - r} ${bridgeY} ` + // Turn 2: left
                 `L ${secondTurnX + r} ${bridgeY} ` +
                 `Q ${secondTurnX} ${bridgeY} ${secondTurnX} ${bridgeY + r} ` + // Turn 3: down
                 `L ${secondTurnX} ${y2 - r} ` +
                 `Q ${secondTurnX} ${y2} ${secondTurnX + r} ${y2} ` +       // Turn 4: right
                 `L ${x2} ${y2}`;
        } else {
          path = `M ${x1} ${y1} ` +
                 `L ${firstTurnX - r} ${y1} ` +
                 `Q ${firstTurnX} ${y1} ${firstTurnX} ${y1 - r} ` +         // Turn 1: up
                 `L ${firstTurnX} ${bridgeY + r} ` +
                 `Q ${firstTurnX} ${bridgeY} ${firstTurnX - r} ${bridgeY} ` + // Turn 2: left
                 `L ${secondTurnX + r} ${bridgeY} ` +
                 `Q ${secondTurnX} ${bridgeY} ${secondTurnX} ${bridgeY - r} ` + // Turn 3: up
                 `L ${secondTurnX} ${y2 + r} ` +
                 `Q ${secondTurnX} ${y2} ${secondTurnX + r} ${y2} ` +       // Turn 4: right
                 `L ${x2} ${y2}`;
        }
      }
    } else {
      // FORWARD dependency: destination is to the RIGHT of source
      // turnX is just before destination (to the left of it)
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

  // v0.17.366: Calculate delete button position - follows cursor along the ENTIRE line path
  // Project mouse position onto the closest point on the line segments
  let deleteX = turnX;
  let deleteY = (y1 + y2) / 2;

  if (mousePos) {
    // For same row - simple horizontal line
    if (isSameRow) {
      deleteX = Math.max(x1 + 10, Math.min(x2 - 10, mousePos.x));
      deleteY = y1;
    } else if (isBackward) {
      // Backward dependency has 5 segments, find closest point
      const firstTurnX = x1 + 15;
      const secondTurnX = x2 - OFFSET;
      const bridgeY = goingDown ? y1 + 20 : y1 - 20;

      // Define segments: [startX, startY, endX, endY]
      const segments: [number, number, number, number][] = [
        [x1, y1, firstTurnX, y1],           // 1. Horizontal right
        [firstTurnX, y1, firstTurnX, bridgeY], // 2. Short vertical
        [firstTurnX, bridgeY, secondTurnX, bridgeY], // 3. Horizontal left (bridge)
        [secondTurnX, bridgeY, secondTurnX, y2], // 4. Main vertical
        [secondTurnX, y2, x2, y2],           // 5. Enter destination
      ];

      let minDist = Infinity;
      let closestPoint = { x: deleteX, y: deleteY };

      for (const seg of segments) {
        const point = projectPointOnSegment(mousePos.x, mousePos.y, seg[0], seg[1], seg[2], seg[3]);
        const dist = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          closestPoint = point;
        }
      }

      deleteX = closestPoint.x;
      deleteY = closestPoint.y;
    } else {
      // Forward dependency has 3 segments
      const segments: [number, number, number, number][] = [
        [x1, y1, turnX, y1],     // Horizontal from source
        [turnX, y1, turnX, y2],  // Vertical
        [turnX, y2, x2, y2],     // Horizontal to destination
      ];

      let minDist = Infinity;
      let closestPoint = { x: deleteX, y: deleteY };

      for (const seg of segments) {
        const point = projectPointOnSegment(mousePos.x, mousePos.y, seg[0], seg[1], seg[2], seg[3]);
        const dist = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          closestPoint = point;
        }
      }

      deleteX = closestPoint.x;
      deleteY = closestPoint.y;
    }
  }

  // Helper function to project a point onto a line segment
  function projectPointOnSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return { x: x1, y: y1 }; // Segment is a point

    // Project point onto line, clamped to segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: x1 + t * dx,
      y: y1 + t * dy,
    };
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
        data-dependency-line="true"
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

        {/* Delete button - v0.17.366: Follows cursor along entire line */}
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
      data-dependency-line="true"
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

      {/* Delete button (appears on hover) - v0.17.366: Follows cursor along entire line */}
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
