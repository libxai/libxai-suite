/**
 * useDragState - Centralized drag state management
 * Manages all drag-related state in one place
 *
 * @version 0.8.1
 */

import { useState } from 'react';

export type DragMode = 'none' | 'move' | 'resize-start' | 'resize-end' | 'connect';
export type ActiveZone = 'move' | 'resize-start' | 'resize-end' | null;

export interface DragState {
  // Drag mode
  dragMode: DragMode;
  setDragMode: (mode: DragMode) => void;

  // Drag offset (distance from click to element origin)
  dragOffset: number;
  setDragOffset: (offset: number) => void;

  // Ghost position (visual feedback during drag)
  ghostX: number;
  setGhostX: (x: number) => void;
  ghostWidth: number;
  setGhostWidth: (width: number) => void;

  // Connection line
  connectionLine: { x: number; y: number } | null;
  setConnectionLine: (line: { x: number; y: number } | null) => void;

  // Hovered task (for dependency creation)
  hoveredTaskId: string | null;
  setHoveredTaskId: (id: string | null) => void;

  // Active zone (for visual feedback)
  activeZone: ActiveZone;
  setActiveZone: (zone: ActiveZone) => void;

  // Split task specific state
  draggedSegmentIndex: number | null;
  setDraggedSegmentIndex: (index: number | null) => void;
  draggedSegmentStartX: number;
  setDraggedSegmentStartX: (x: number) => void;
  segmentDragOffsetX: number;
  setSegmentDragOffsetX: (offset: number) => void;

  // Hover state
  hoveredSegmentIndex: number | null;
  setHoveredSegmentIndex: (index: number | null) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;

  // Computed state
  isDragging: boolean;
  isResizing: boolean;
  isConnecting: boolean;

  // Reset all drag state
  resetDragState: (x: number, width: number) => void;
}

export function useDragState(initialX: number, initialWidth: number): DragState {
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragOffset, setDragOffset] = useState(0);
  const [ghostX, setGhostX] = useState(initialX);
  const [ghostWidth, setGhostWidth] = useState(initialWidth);
  const [connectionLine, setConnectionLine] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<ActiveZone>(null);

  // Split task state
  const [draggedSegmentIndex, setDraggedSegmentIndex] = useState<number | null>(null);
  const [draggedSegmentStartX, setDraggedSegmentStartX] = useState(0);
  const [segmentDragOffsetX, setSegmentDragOffsetX] = useState(0);
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Computed state
  const isDragging = dragMode !== 'none';
  const isResizing = dragMode === 'resize-start' || dragMode === 'resize-end';
  const isConnecting = dragMode === 'connect';

  // Reset all state to initial values
  const resetDragState = (x: number, width: number) => {
    setDragMode('none');
    setConnectionLine(null);
    setHoveredTaskId(null);
    setGhostX(x);
    setGhostWidth(width);
    setSegmentDragOffsetX(0);
    setDraggedSegmentIndex(null);
    setDraggedSegmentStartX(0);
  };

  return {
    dragMode,
    setDragMode,
    dragOffset,
    setDragOffset,
    ghostX,
    setGhostX,
    ghostWidth,
    setGhostWidth,
    connectionLine,
    setConnectionLine,
    hoveredTaskId,
    setHoveredTaskId,
    activeZone,
    setActiveZone,
    draggedSegmentIndex,
    setDraggedSegmentIndex,
    draggedSegmentStartX,
    setDraggedSegmentStartX,
    segmentDragOffsetX,
    setSegmentDragOffsetX,
    hoveredSegmentIndex,
    setHoveredSegmentIndex,
    isHovered,
    setIsHovered,
    isDragging,
    isResizing,
    isConnecting,
    resetDragState,
  };
}
