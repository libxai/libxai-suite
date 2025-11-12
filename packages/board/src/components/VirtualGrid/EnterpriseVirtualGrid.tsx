/**
 * EnterpriseVirtualGrid - Enterprise-grade virtual scrolling for 10K+ items
 * Features:
 * - Dynamic overscan based on scroll velocity
 * - Performance monitoring
 * - Resize observer for responsive layouts
 * - Scroll restoration
 * - Memory-efficient rendering
 * @module components/VirtualGrid
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual'

export interface EnterpriseVirtualGridProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of the scrollable container in pixels */
  height: number | string
  /** Width of the scrollable container in pixels */
  width?: number | string
  /** Estimated width of each column in pixels */
  estimateColumnWidth: number
  /** Render function for each column */
  renderColumn: (item: T, index: number, virtualizer: Virtualizer<HTMLDivElement, Element>) => React.ReactNode
  /** Optional className for the container */
  className?: string
  /** Base overscan count (will be adjusted dynamically) */
  overscan?: number
  /** Optional gap between columns in pixels */
  gap?: number
  /** Optional key extractor function */
  getItemKey?: (item: T, index: number) => string | number
  /** Enable horizontal scrolling only */
  horizontal?: boolean
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean
  /** Performance callback */
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void
  /** Enable scroll velocity-based overscan */
  enableDynamicOverscan?: boolean
  /** Max overscan multiplier (default: 3x base overscan) */
  maxOverscanMultiplier?: number
  /** Enable resize observer */
  enableResizeObserver?: boolean
  /** Scroll restoration key */
  scrollRestorationKey?: string
}

export interface PerformanceMetrics {
  renderTime: number
  scrollVelocity: number
  visibleItemCount: number
  totalItemCount: number
  overscan: number
  fps: number
  memoryUsage?: number
}

interface ScrollState {
  velocity: number
  lastScrollTop: number
  lastScrollTime: number
}

/**
 * EnterpriseVirtualGrid - Professional virtual scrolling with advanced features
 *
 * Optimized for:
 * - 10,000+ items without lag
 * - Smooth scrolling at 60 FPS
 * - Dynamic resource allocation
 * - Memory efficiency
 *
 * @example
 * ```tsx
 * <EnterpriseVirtualGrid
 *   items={columns}
 *   height="100vh"
 *   estimateColumnWidth={320}
 *   renderColumn={(column, index, virtualizer) => (
 *     <ColumnComponent column={column} virtualizer={virtualizer} />
 *   )}
 *   enableDynamicOverscan
 *   enablePerformanceMonitoring
 *   onPerformanceMetrics={(metrics) => console.log('FPS:', metrics.fps)}
 * />
 * ```
 */
export function EnterpriseVirtualGrid<T>({
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
  enablePerformanceMonitoring = false,
  onPerformanceMetrics,
  enableDynamicOverscan = true,
  maxOverscanMultiplier = 3,
  enableResizeObserver = true,
  scrollRestorationKey,
}: EnterpriseVirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [dynamicOverscan, setDynamicOverscan] = useState(overscan)
  const [scrollState, setScrollState] = useState<ScrollState>({
    velocity: 0,
    lastScrollTop: 0,
    lastScrollTime: Date.now(),
  })
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)

  // Performance monitoring
  const frameTimeRef = useRef<number[]>([])
  const renderTimeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(performance.now())

  // Column virtualizer with dynamic overscan
  const columnVirtualizer = useVirtualizer({
    horizontal,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateColumnWidth,
    overscan: dynamicOverscan,
    gap,
  })

  // Calculate scroll velocity and adjust overscan dynamically
  const handleScroll = useCallback(() => {
    if (!enableDynamicOverscan || !parentRef.current) return

    const currentScrollTop = horizontal
      ? parentRef.current.scrollLeft
      : parentRef.current.scrollTop
    const currentTime = Date.now()

    const timeDelta = currentTime - scrollState.lastScrollTime
    const scrollDelta = Math.abs(currentScrollTop - scrollState.lastScrollTop)

    if (timeDelta > 0) {
      const velocity = scrollDelta / timeDelta // pixels per millisecond

      setScrollState({
        velocity,
        lastScrollTop: currentScrollTop,
        lastScrollTime: currentTime,
      })

      // Adjust overscan based on velocity
      // Fast scrolling: increase overscan to prevent blank spaces
      // Slow scrolling: decrease overscan to save memory
      let newOverscan = overscan

      if (velocity > 5) { // Very fast scrolling (>5px/ms)
        newOverscan = Math.min(overscan * maxOverscanMultiplier, overscan * 3)
      } else if (velocity > 2) { // Fast scrolling (>2px/ms)
        newOverscan = Math.min(overscan * 2, overscan * maxOverscanMultiplier)
      } else if (velocity > 0.5) { // Medium scrolling
        newOverscan = Math.ceil(overscan * 1.5)
      } else if (velocity < 0.1) { // Nearly stopped
        newOverscan = overscan
      }

      if (newOverscan !== dynamicOverscan) {
        setDynamicOverscan(newOverscan)
      }
    }
  }, [enableDynamicOverscan, horizontal, scrollState, overscan, dynamicOverscan, maxOverscanMultiplier])

  // Attach scroll listener
  useEffect(() => {
    const element = parentRef.current
    if (!element || !enableDynamicOverscan) return

    element.addEventListener('scroll', handleScroll, { passive: true })
    return () => element.removeEventListener('scroll', handleScroll)
  }, [handleScroll, enableDynamicOverscan])

  // Resize observer for responsive layouts
  useEffect(() => {
    if (!enableResizeObserver || !parentRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
        columnVirtualizer.measure()
      }
    })

    resizeObserver.observe(parentRef.current)
    return () => resizeObserver.disconnect()
  }, [enableResizeObserver, columnVirtualizer])

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring) return

    const measurePerformance = () => {
      const now = performance.now()
      const frameDelta = now - lastFrameTimeRef.current
      lastFrameTimeRef.current = now

      // Track frame times for FPS calculation
      frameTimeRef.current.push(frameDelta)
      if (frameTimeRef.current.length > 60) {
        frameTimeRef.current.shift()
      }

      // Calculate FPS (average over last 60 frames)
      const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length
      const fps = Math.round(1000 / avgFrameTime)

      const virtualItems = columnVirtualizer.getVirtualItems()

      const metrics: PerformanceMetrics = {
        renderTime: renderTimeRef.current,
        scrollVelocity: scrollState.velocity,
        visibleItemCount: virtualItems.length,
        totalItemCount: items.length,
        overscan: dynamicOverscan,
        fps,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
      }

      onPerformanceMetrics?.(metrics)
    }

    const intervalId = setInterval(measurePerformance, 1000) // Report every second
    return () => clearInterval(intervalId)
  }, [enablePerformanceMonitoring, onPerformanceMetrics, scrollState.velocity, items.length, dynamicOverscan, columnVirtualizer])

  // Scroll restoration
  useEffect(() => {
    if (!scrollRestorationKey || !parentRef.current) return

    const savedPosition = sessionStorage.getItem(`scroll-${scrollRestorationKey}`)
    if (savedPosition) {
      const position = parseInt(savedPosition, 10)
      if (horizontal) {
        parentRef.current.scrollLeft = position
      } else {
        parentRef.current.scrollTop = position
      }
    }

    const element = parentRef.current
    const savePosition = () => {
      if (!element) return
      const position = horizontal ? element.scrollLeft : element.scrollTop
      sessionStorage.setItem(`scroll-${scrollRestorationKey}`, position.toString())
    }

    element.addEventListener('scroll', savePosition, { passive: true })
    return () => {
      element.removeEventListener('scroll', savePosition)
    }
  }, [scrollRestorationKey, horizontal])

  const virtualColumns = columnVirtualizer.getVirtualItems()

  // Measure render time
  const renderStartTime = useMemo(() => performance.now(), [virtualColumns])
  useEffect(() => {
    renderTimeRef.current = performance.now() - renderStartTime
  }, [renderStartTime])

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    overflow: 'auto',
    position: 'relative',
    willChange: 'scroll-position', // GPU acceleration hint
  }

  const innerStyle: React.CSSProperties = {
    width: `${columnVirtualizer.getTotalSize()}px`,
    height: '100%',
    position: 'relative',
  }

  return (
    <div
      ref={parentRef}
      style={containerStyle}
      className={className}
      data-virtualized="true"
      data-item-count={items.length}
      data-visible-count={virtualColumns.length}
      data-overscan={dynamicOverscan}
    >
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
            transform: 'translateZ(0)', // Force GPU acceleration
          }

          return (
            <div
              key={key}
              style={columnStyle}
              data-index={virtualColumn.index}
              data-virtual-key={key}
            >
              {renderColumn(item, virtualColumn.index, columnVirtualizer)}
            </div>
          )
        })}
      </div>

      {/* Performance overlay (dev mode) */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div>Items: {virtualColumns.length}/{items.length}</div>
          <div>Overscan: {dynamicOverscan}</div>
          <div>Velocity: {scrollState.velocity.toFixed(2)} px/ms</div>
          {containerSize && <div>Size: {Math.round(containerSize.width)}x{Math.round(containerSize.height)}</div>}
        </div>
      )}
    </div>
  )
}

/**
 * Hook for advanced enterprise-grade virtualization
 */
export function useEnterpriseVirtualGrid<T>(options: {
  items: T[]
  scrollElement: HTMLElement | null
  estimateColumnWidth: number
  overscan?: number
  gap?: number
  enableDynamicOverscan?: boolean
}) {
  const [dynamicOverscan, setDynamicOverscan] = useState(options.overscan ?? 3)
  const [scrollVelocity, setScrollVelocity] = useState(0)

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: options.items.length,
    getScrollElement: () => options.scrollElement,
    estimateSize: () => options.estimateColumnWidth,
    overscan: dynamicOverscan,
    gap: options.gap ?? 0,
  })

  return {
    columnVirtualizer,
    virtualColumns: columnVirtualizer.getVirtualItems(),
    totalWidth: columnVirtualizer.getTotalSize(),
    dynamicOverscan,
    scrollVelocity,
    setDynamicOverscan,
    setScrollVelocity,
  }
}

/**
 * Utility to determine if grid should use enterprise virtualization
 */
export function shouldUseEnterpriseVirtualization(
  columnCount: number,
  threshold = 50
): boolean {
  return columnCount > threshold
}
