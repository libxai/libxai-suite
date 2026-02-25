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
  // v0.17.451: Callback when hover state changes (for z-order management)
  onHoverChange?: (isHovered: boolean) => void;
  // v0.17.451: Only render the hover overlay (for top-layer)
  hoverOverlayOnly?: boolean;
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
  onHoverChange,
  hoverOverlayOnly = false,
}: DependencyLineProps) {
  // v0.17.451: Local hover state only used for tracking, actual rendering done via Timeline
  const [, setIsLocalHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const dy = y2 - y1;
  const goingDown = dy > 0;
  const isSameRow = Math.abs(dy) < 5;

  // OFFSET from bars for the vertical segment
  const OFFSET = 20;

  // v0.17.366: isBackward needs to be defined outside the else block for delete button positioning
  const isBackward = !isSameRow && x2 <= x1;

  let path: string;
  let turnX: number;

  // v0.17.440: Original elegant S-curve for curved style, squared routing for squared style
  const dx = x2 - x1;
  const midX = x1 + dx / 2;
  turnX = midX; // Default for delete button positioning

  if (lineStyle === 'squared') {
    // Squared style - clean right angles that avoid task bars
    if (isSameRow) {
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else if (isBackward) {
      const exitPadding = 15;
      const firstTurnX = x1 + exitPadding;
      const secondTurnX = x2 - OFFSET;
      const bridgeY = goingDown ? y1 + 20 : y1 - 20;
      turnX = secondTurnX;

      path = `M ${x1} ${y1} ` +
             `L ${firstTurnX} ${y1} ` +
             `L ${firstTurnX} ${bridgeY} ` +
             `L ${secondTurnX} ${bridgeY} ` +
             `L ${secondTurnX} ${y2} ` +
             `L ${x2} ${y2}`;
    } else {
      turnX = x2 - OFFSET;
      path = `M ${x1} ${y1} ` +
             `L ${turnX} ${y1} ` +
             `L ${turnX} ${y2} ` +
             `L ${x2} ${y2}`;
    }
  } else {
    // v0.17.440: ORIGINAL elegant S-curve - simple Bézier, no routing logic
    // This is the exact curve from before the squared option was added
    path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
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

  // Delete button position - follows cursor along the line, projected onto nearest segment
  // Default: midpoint of the line
  let deleteX = turnX;
  let deleteY = (y1 + y2) / 2;

  if (mousePos) {
    if (lineStyle === 'squared') {
      if (isSameRow) {
        deleteX = Math.max(x1 + 10, Math.min(x2 - 10, mousePos.x));
        deleteY = y1;
      } else if (isBackward) {
        const firstTurnX = x1 + 15;
        const secondTurnX = x2 - OFFSET;
        const bridgeY = goingDown ? y1 + 20 : y1 - 20;

        const segments: [number, number, number, number][] = [
          [x1, y1, firstTurnX, y1],
          [firstTurnX, y1, firstTurnX, bridgeY],
          [firstTurnX, bridgeY, secondTurnX, bridgeY],
          [secondTurnX, bridgeY, secondTurnX, y2],
          [secondTurnX, y2, x2, y2],
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
        const segments: [number, number, number, number][] = [
          [x1, y1, turnX, y1],
          [turnX, y1, turnX, y2],
          [turnX, y2, x2, y2],
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
    } else {
      // Curved: sample the Bézier and find closest point
      const cp1x = midX, cp1y = y1, cp2x = midX, cp2y = y2;
      let minDist = Infinity;
      let bestX = deleteX, bestY = deleteY;
      for (let t = 0; t <= 1; t += 0.02) {
        const it = 1 - t;
        const bx = it*it*it*x1 + 3*it*it*t*cp1x + 3*it*t*t*cp2x + t*t*t*x2;
        const by = it*it*it*y1 + 3*it*it*t*cp1y + 3*it*t*t*cp2y + t*t*t*y2;
        const d = Math.hypot(mousePos.x - bx, mousePos.y - by);
        if (d < minDist) {
          minDist = d;
          bestX = bx;
          bestY = by;
        }
      }
      deleteX = bestX;
      deleteY = bestY;
    }
  }

  // Helper function to project a point onto a line segment
  function projectPointOnSegment(px: number, py: number, sx1: number, sy1: number, sx2: number, sy2: number) {
    const sdx = sx2 - sx1;
    const sdy = sy2 - sy1;
    const lenSq = sdx * sdx + sdy * sdy;

    if (lenSq === 0) return { x: sx1, y: sy1 };

    let t = ((px - sx1) * sdx + (py - sy1) * sdy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: sx1 + t * sdx,
      y: sy1 + t * sdy,
    };
  }

  // v1.4.27: Use SVG getScreenCTM() for accurate mouse→SVG coordinate conversion
  // This correctly handles scroll offsets, zoom, and any CSS transforms on parent elements
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const inverseCTM = ctm.inverse();
    setMousePos({
      x: inverseCTM.a * e.clientX + inverseCTM.c * e.clientY + inverseCTM.e,
      y: inverseCTM.b * e.clientX + inverseCTM.d * e.clientY + inverseCTM.f,
    });
  };

  const handleMouseLeave = () => {
    setIsLocalHovered(false);
    setMousePos(null);
    onHoverChange?.(false);
  };

  const handleMouseEnter = () => {
    setIsLocalHovered(true);
    onHoverChange?.(true);
  };

  // Render the delete button SVG elements
  const renderDeleteButton = (animInitial: Record<string, any>) => {
    if (!onDelete) return null;
    return (
      <motion.g
        initial={animInitial}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      >
        {/* Larger invisible hit area so the X is easy to click */}
        <circle
          cx={deleteX}
          cy={deleteY}
          r={16}
          fill="transparent"
          style={{ cursor: 'pointer' }}
        />
        <circle
          cx={deleteX}
          cy={deleteY}
          r={9}
          fill={deleteColorSoft}
          stroke={deleteColor}
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
        <line
          x1={deleteX - 3}
          y1={deleteY - 3}
          x2={deleteX + 3}
          y2={deleteY + 3}
          stroke={deleteColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        <line
          x1={deleteX + 3}
          y1={deleteY - 3}
          x2={deleteX - 3}
          y2={deleteY + 3}
          stroke={deleteColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      </motion.g>
    );
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

        {/* Delete button */}
        {renderDeleteButton({ opacity: 0, scale: 0.8 })}
      </g>
    );
  }

  // v0.17.451: If hoverOverlayOnly, only render the hover overlay for top-layer
  if (hoverOverlayOnly) {
    return (
      <g
        data-dependency-hover-overlay="true"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        style={{ cursor: onDelete ? 'pointer' : 'default' }}
      >
        {/* Invisible wider path for hover detection */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          strokeLinecap="round"
          style={{ cursor: onDelete ? 'pointer' : 'default' }}
        />
        {/* Background cover - hide gray lines underneath */}
        <path
          d={path}
          fill="none"
          stroke={theme.bgPrimary || '#1A1D21'}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Subtle outer glow - very light */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.12}
          style={{ pointerEvents: 'none' }}
        />
        {/* Main highlighted line - same width as base */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={2}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Highlighted arrow */}
        <path
          d={arrowPath}
          fill="none"
          stroke={hoverColor}
          strokeWidth={2}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Highlighted dot - slightly larger */}
        <circle
          cx={x2}
          cy={y2}
          r={3.5}
          fill={hoverColor}
          style={{ pointerEvents: 'none' }}
        />
        {/* Delete button */}
        {renderDeleteButton({ opacity: 0, scale: 0 })}
      </g>
    );
  }

  // Base layer rendering (non-hover)
  return (
    <g
      data-dependency-line="true"
      onMouseEnter={handleMouseEnter}
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

      {/* Main dependency line - base layer (always gray) */}
      <motion.path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.5, ease: 'easeInOut' },
          opacity: { duration: 0.2 },
        }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arrow head - base layer */}
      <motion.path
        d={arrowPath}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Endpoint dot - base layer */}
      <motion.circle
        cx={x2}
        cy={y2}
        r={3}
        fill={lineColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.15 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* v0.17.451: Hover overlay is now rendered in a separate top-layer via Timeline */}
    </g>
  );
}
