/**
 * VirtualGrid - 2D virtual scrolling component for grid layouts
 * @module components/VirtualGrid
 */

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface VirtualGridProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of the scrollable container in pixels */
  height: number | string
  /** Width of the scrollable container in pixels */
  width?: number | string
  /** Estimated width of each column in pixels */
  estimateColumnWidth: number
  /** Render function for each column */
  renderColumn: (item: T, index: number) => React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Overscan count (number of columns to render outside viewport) */
  overscan?: number
  /** Optional gap between columns in pixels */
  gap?: number
  /** Optional key extractor function */
  getItemKey?: (item: T, index: number) => string | number
  /** Enable horizontal scrolling only */
  horizontal?: boolean
}

/**
 * VirtualGrid component for efficient rendering of large horizontal lists/grids
 *
 * Optimized for Kanban boards with many columns
 *
 * @example
 * ```tsx
 * <VirtualGrid
 *   items={columns}
 *   height="100%"
 *   estimateColumnWidth={320}
 *   renderColumn={(column) => <ColumnComponent column={column} />}
 *   getItemKey={(column) => column.id}
 * />
 * ```
 */
export function VirtualGrid<T>({
  items,
  height,
  width = '100%',
  estimateColumnWidth,
  renderColumn,
  className = '',
  overscan = 3,
  gap = 16,
  getItemKey,
  horizontal = true,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const columnVirtualizer = useVirtualizer({
    horizontal,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateColumnWidth,
    overscan,
    gap,
  })

  const virtualColumns = columnVirtualizer.getVirtualItems()

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    overflow: 'auto',
    position: 'relative',
  }

  const innerStyle: React.CSSProperties = {
    width: `${columnVirtualizer.getTotalSize()}px`,
    height: '100%',
    position: 'relative',
  }

  return (
    <div ref={parentRef} style={containerStyle} className={className}>
      <div style={innerStyle}>
        {virtualColumns.map((virtualColumn) => {
          const item = items[virtualColumn.index]
          if (!item) return null
          const key = getItemKey ? getItemKey(item, virtualColumn.index) : virtualColumn.index

          const columnStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: virtualColumn.start,
            width: virtualColumn.size,
            height: '100%',
          }

          return (
            <div key={key} style={columnStyle} data-index={virtualColumn.index}>
              {renderColumn(item, virtualColumn.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Hook for advanced 2D virtualization with both rows and columns
 */
export function useVirtualGrid<T>(options: {
  items: T[]
  scrollElement: HTMLElement | null
  estimateColumnWidth: number
  estimateRowHeight?: number
  overscan?: number
  gap?: number
}) {
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: options.items.length,
    getScrollElement: () => options.scrollElement,
    estimateSize: () => options.estimateColumnWidth,
    overscan: options.overscan ?? 3,
    gap: options.gap ?? 0,
  })

  return {
    columnVirtualizer,
    virtualColumns: columnVirtualizer.getVirtualItems(),
    totalWidth: columnVirtualizer.getTotalSize(),
  }
}

/**
 * Utility to determine if grid should use virtualization
 */
export function shouldVirtualizeGrid(columnCount: number, threshold = 10): boolean {
  return columnCount > threshold
}
