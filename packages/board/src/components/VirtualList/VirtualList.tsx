/**
 * VirtualList - Virtual scrolling component for large lists
 * @module components/VirtualList
 */

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of the scrollable container in pixels */
  height: number | string
  /** Estimated size of each item in pixels */
  estimateSize: number
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Overscan count (number of items to render outside viewport) */
  overscan?: number
  /** Enable horizontal scrolling instead of vertical */
  horizontal?: boolean
  /** Optional gap between items in pixels */
  gap?: number
  /** Optional key extractor function */
  getItemKey?: (item: T, index: number) => string | number
}

/**
 * VirtualList component for efficient rendering of large lists
 *
 * Uses @tanstack/react-virtual for windowing/virtualization
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={cards}
 *   height={600}
 *   estimateSize={100}
 *   renderItem={(card) => <CardComponent card={card} />}
 *   getItemKey={(card) => card.id}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  height,
  estimateSize,
  renderItem,
  className = '',
  overscan = 5,
  horizontal = false,
  gap = 0,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
    gap,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: '100%',
    overflow: 'auto',
    position: 'relative',
  }

  const innerStyle: React.CSSProperties = horizontal
    ? {
        width: `${virtualizer.getTotalSize()}px`,
        height: '100%',
        position: 'relative',
      }
    : {
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }

  return (
    <div ref={parentRef} style={containerStyle} className={className}>
      <div style={innerStyle}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          if (!item) return null
          const key = getItemKey ? getItemKey(item, virtualItem.index) : virtualItem.index

          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            top: horizontal ? 0 : virtualItem.start,
            left: horizontal ? virtualItem.start : 0,
            width: horizontal ? virtualItem.size : '100%',
            height: horizontal ? '100%' : virtualItem.size,
          }

          return (
            <div key={key} style={itemStyle} data-index={virtualItem.index}>
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Hook to access virtualizer instance for advanced use cases
 */
export function useVirtualList<T>(options: {
  items: T[]
  scrollElement: HTMLElement | null
  estimateSize: number
  overscan?: number
  horizontal?: boolean
  gap?: number
}) {
  return useVirtualizer({
    count: options.items.length,
    getScrollElement: () => options.scrollElement,
    estimateSize: () => options.estimateSize,
    overscan: options.overscan ?? 5,
    horizontal: options.horizontal ?? false,
    gap: options.gap ?? 0,
  })
}
