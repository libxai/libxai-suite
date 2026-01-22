/**
 * useExcelNav - Excel-style keyboard navigation for table cells
 *
 * Features:
 * - Tab: Move to next editable cell (right, then down)
 * - Shift+Tab: Move to previous editable cell (left, then up)
 * - Arrow keys: Navigate between cells
 * - Enter: Edit current cell / confirm and move down
 * - Escape: Cancel edit
 */

import { useState, useCallback, useRef } from 'react';

export interface CellPosition {
  rowIndex: number;
  columnId: string;
}

export interface UseExcelNavOptions {
  /** Total number of rows */
  rowCount: number;
  /** Column IDs in order (only editable columns) */
  editableColumns: string[];
  /** Callback when cell focus changes */
  onCellFocus?: (position: CellPosition) => void;
  /** Callback to start editing a cell */
  onCellEdit?: (position: CellPosition) => void;
  /** Whether navigation is enabled */
  enabled?: boolean;
  /** Container ref for scroll management */
  containerRef?: React.RefObject<HTMLElement>;
}

export interface UseExcelNavReturn {
  /** Currently focused cell position */
  focusedCell: CellPosition | null;
  /** Currently editing cell position */
  editingCell: CellPosition | null;
  /** Set focused cell */
  setFocusedCell: (position: CellPosition | null) => void;
  /** Start editing a cell */
  startEditing: (position: CellPosition) => void;
  /** Stop editing */
  stopEditing: () => void;
  /** Handle keydown on the table */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Get cell props for a specific cell */
  getCellProps: (rowIndex: number, columnId: string) => {
    'data-focused': boolean;
    'data-editing': boolean;
    tabIndex: number;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
  };
  /** Check if a cell is focused */
  isCellFocused: (rowIndex: number, columnId: string) => boolean;
  /** Check if a cell is being edited */
  isCellEditing: (rowIndex: number, columnId: string) => boolean;
}

/**
 * Hook for Excel-style keyboard navigation in tables
 */
export function useExcelNav({
  rowCount,
  editableColumns,
  onCellFocus,
  onCellEdit,
  enabled = true,
  containerRef,
}: UseExcelNavOptions): UseExcelNavReturn {
  const [focusedCell, setFocusedCellState] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const lastFocusRef = useRef<CellPosition | null>(null);

  // Set focused cell with callback
  const setFocusedCell = useCallback((position: CellPosition | null) => {
    setFocusedCellState(position);
    if (position) {
      lastFocusRef.current = position;
      onCellFocus?.(position);
    }
  }, [onCellFocus]);

  // Start editing a cell
  const startEditing = useCallback((position: CellPosition) => {
    setFocusedCell(position);
    setEditingCell(position);
    onCellEdit?.(position);
  }, [setFocusedCell, onCellEdit]);

  // Stop editing
  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Get next cell position (Tab)
  const getNextCell = useCallback((current: CellPosition): CellPosition | null => {
    const colIndex = editableColumns.indexOf(current.columnId);
    if (colIndex === -1 || editableColumns.length === 0) return null;

    // Try next column
    if (colIndex < editableColumns.length - 1) {
      const nextCol = editableColumns[colIndex + 1];
      if (nextCol) {
        return {
          rowIndex: current.rowIndex,
          columnId: nextCol,
        };
      }
    }

    // Move to first column of next row
    if (current.rowIndex < rowCount - 1) {
      const firstCol = editableColumns[0];
      if (firstCol) {
        return {
          rowIndex: current.rowIndex + 1,
          columnId: firstCol,
        };
      }
    }

    // Reached the end
    return null;
  }, [editableColumns, rowCount]);

  // Get previous cell position (Shift+Tab)
  const getPrevCell = useCallback((current: CellPosition): CellPosition | null => {
    const colIndex = editableColumns.indexOf(current.columnId);
    if (colIndex === -1 || editableColumns.length === 0) return null;

    // Try previous column
    if (colIndex > 0) {
      const prevCol = editableColumns[colIndex - 1];
      if (prevCol) {
        return {
          rowIndex: current.rowIndex,
          columnId: prevCol,
        };
      }
    }

    // Move to last column of previous row
    if (current.rowIndex > 0) {
      const lastCol = editableColumns[editableColumns.length - 1];
      if (lastCol) {
        return {
          rowIndex: current.rowIndex - 1,
          columnId: lastCol,
        };
      }
    }

    // Reached the beginning
    return null;
  }, [editableColumns, rowCount]);

  // Get cell below (Enter / ArrowDown)
  const getCellBelow = useCallback((current: CellPosition): CellPosition | null => {
    if (current.rowIndex < rowCount - 1) {
      return {
        rowIndex: current.rowIndex + 1,
        columnId: current.columnId,
      };
    }
    return null;
  }, [rowCount]);

  // Get cell above (ArrowUp)
  const getCellAbove = useCallback((current: CellPosition): CellPosition | null => {
    if (current.rowIndex > 0) {
      return {
        rowIndex: current.rowIndex - 1,
        columnId: current.columnId,
      };
    }
    return null;
  }, []);

  // Get cell to the right (ArrowRight)
  const getCellRight = useCallback((current: CellPosition): CellPosition | null => {
    const colIndex = editableColumns.indexOf(current.columnId);
    if (colIndex === -1 || editableColumns.length === 0) return null;

    if (colIndex < editableColumns.length - 1) {
      const nextCol = editableColumns[colIndex + 1];
      if (nextCol) {
        return {
          rowIndex: current.rowIndex,
          columnId: nextCol,
        };
      }
    }
    return null;
  }, [editableColumns]);

  // Get cell to the left (ArrowLeft)
  const getCellLeft = useCallback((current: CellPosition): CellPosition | null => {
    const colIndex = editableColumns.indexOf(current.columnId);
    if (colIndex === -1 || editableColumns.length === 0) return null;

    if (colIndex > 0) {
      const prevCol = editableColumns[colIndex - 1];
      if (prevCol) {
        return {
          rowIndex: current.rowIndex,
          columnId: prevCol,
        };
      }
    }
    return null;
  }, [editableColumns]);

  // Scroll cell into view
  const scrollCellIntoView = useCallback((position: CellPosition) => {
    if (!containerRef?.current) return;

    const container = containerRef.current;
    const cell = container.querySelector(
      `[data-row="${position.rowIndex}"][data-column="${position.columnId}"]`
    ) as HTMLElement;

    if (cell) {
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [containerRef]);

  // Handle keydown
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled || !focusedCell) return;

    // Don't intercept if we're editing and it's not a navigation key
    if (editingCell) {
      // Only handle Escape and Enter while editing
      if (event.key === 'Escape') {
        event.preventDefault();
        stopEditing();
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        stopEditing();
        const nextCell = getCellBelow(focusedCell);
        if (nextCell) {
          setFocusedCell(nextCell);
          scrollCellIntoView(nextCell);
        }
        return;
      }
      // Let other keys pass through to the input
      return;
    }

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        const nextTabCell = event.shiftKey
          ? getPrevCell(focusedCell)
          : getNextCell(focusedCell);
        if (nextTabCell) {
          setFocusedCell(nextTabCell);
          scrollCellIntoView(nextTabCell);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        const belowCell = getCellBelow(focusedCell);
        if (belowCell) {
          setFocusedCell(belowCell);
          scrollCellIntoView(belowCell);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        const aboveCell = getCellAbove(focusedCell);
        if (aboveCell) {
          setFocusedCell(aboveCell);
          scrollCellIntoView(aboveCell);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        const rightCell = getCellRight(focusedCell);
        if (rightCell) {
          setFocusedCell(rightCell);
          scrollCellIntoView(rightCell);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        const leftCell = getCellLeft(focusedCell);
        if (leftCell) {
          setFocusedCell(leftCell);
          scrollCellIntoView(leftCell);
        }
        break;

      case 'Enter':
        event.preventDefault();
        startEditing(focusedCell);
        break;

      case 'F2':
        event.preventDefault();
        startEditing(focusedCell);
        break;

      case 'Escape':
        event.preventDefault();
        setFocusedCell(null);
        break;

      default:
        // Start typing = start editing (for alphanumeric keys)
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          startEditing(focusedCell);
          // Don't prevent default - let the key pass through to the input
        }
        break;
    }
  }, [
    enabled,
    focusedCell,
    editingCell,
    getNextCell,
    getPrevCell,
    getCellBelow,
    getCellAbove,
    getCellRight,
    getCellLeft,
    setFocusedCell,
    startEditing,
    stopEditing,
    scrollCellIntoView,
  ]);

  // Check if a cell is focused
  const isCellFocused = useCallback((rowIndex: number, columnId: string): boolean => {
    return focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId;
  }, [focusedCell]);

  // Check if a cell is being edited
  const isCellEditing = useCallback((rowIndex: number, columnId: string): boolean => {
    return editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;
  }, [editingCell]);

  // Get cell props
  const getCellProps = useCallback((rowIndex: number, columnId: string) => {
    const isFocused = isCellFocused(rowIndex, columnId);
    const isEditing = isCellEditing(rowIndex, columnId);

    return {
      'data-focused': isFocused,
      'data-editing': isEditing,
      'data-row': rowIndex,
      'data-column': columnId,
      tabIndex: isFocused ? 0 : -1,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setFocusedCell({ rowIndex, columnId });
      },
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        startEditing({ rowIndex, columnId });
      },
    };
  }, [isCellFocused, isCellEditing, setFocusedCell, startEditing]);

  return {
    focusedCell,
    editingCell,
    setFocusedCell,
    startEditing,
    stopEditing,
    handleKeyDown,
    getCellProps,
    isCellFocused,
    isCellEditing,
  };
}
