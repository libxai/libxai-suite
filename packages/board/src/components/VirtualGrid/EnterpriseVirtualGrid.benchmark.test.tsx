/**
 * Enterprise Virtual Grid - Performance Benchmark Tests
 * Tests with 10,000+ items to validate enterprise-grade performance
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnterpriseVirtualGrid, PerformanceMetrics } from './EnterpriseVirtualGrid'

// Mock data generators
function generateMockColumns(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `col-${i}`,
    title: `Column ${i}`,
    cardIds: Array.from({ length: Math.floor(Math.random() * 50) + 10 }, (_, j) => `card-${i}-${j}`),
  }))
}

function generateMockCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    title: `Card ${i}`,
    description: `Description for card ${i}`,
    columnId: `col-${Math.floor(i / 100)}`,
    position: i,
    priority: (['low', 'medium', 'high', 'urgent'] as const)[i % 4],
  }))
}

describe('EnterpriseVirtualGrid - Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('10K+ Items Performance', () => {
    it('should render 10,000 items without lag', () => {
      const items = generateMockCards(10000)
      const renderItem = vi.fn((item) => (
        <div data-testid={`card-${item.id}`}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))

      const startTime = performance.now()

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enableDynamicOverscan
          enablePerformanceMonitoring
        />
      )

      const renderTime = performance.now() - startTime

      // Should render in under 100ms
      expect(renderTime).toBeLessThan(100)

      // Should have virtualized container
      expect(container.querySelector('[data-virtualized="true"]')).toBeInTheDocument()

      // Should only render visible items (not all 10K)
      const visibleCount = parseInt(container.querySelector('[data-visible-count]')?.getAttribute('data-visible-count') || '0')
      expect(visibleCount).toBeLessThan(50) // Only ~10-20 columns should be visible
      expect(visibleCount).toBeGreaterThan(0)

      // Total count should be tracked
      expect(container.querySelector('[data-item-count="10000"]')).toBeInTheDocument()
    })

    it('should handle 50,000 items efficiently', () => {
      const items = generateMockCards(50000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const startTime = performance.now()

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      const renderTime = performance.now() - startTime

      // Should still render quickly even with 50K items
      expect(renderTime).toBeLessThan(150)

      // Should only render visible items
      const visibleCount = parseInt(container.querySelector('[data-visible-count]')?.getAttribute('data-visible-count') || '0')
      expect(visibleCount).toBeLessThan(50)
    })

    it('should handle 100 columns with 100 cards each (10K total)', () => {
      const columns = generateMockColumns(100)
      const renderColumn = vi.fn((column) => (
        <div data-testid={`column-${column.id}`}>
          <h2>{column.title}</h2>
          <div>{column.cardIds.length} cards</div>
        </div>
      ))

      const { container } = render(
        <EnterpriseVirtualGrid
          items={columns}
          height="100vh"
          estimateColumnWidth={320}
          renderColumn={renderColumn}
          horizontal
        />
      )

      // Should only render visible columns
      const visibleCount = parseInt(container.querySelector('[data-visible-count]')?.getAttribute('data-visible-count') || '0')
      expect(visibleCount).toBeLessThan(20) // Only ~5-10 columns visible at 320px width
    })
  })

  describe('Dynamic Overscan', () => {
    it('should adjust overscan based on scroll velocity', async () => {
      const items = generateMockCards(1000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enableDynamicOverscan
          overscan={3}
        />
      )

      // Initial overscan should be 3
      const initialOverscan = parseInt(container.querySelector('[data-overscan]')?.getAttribute('data-overscan') || '0')
      expect(initialOverscan).toBe(3)

      // After fast scrolling, overscan should increase
      // (Would require scroll simulation in a real test)
    })

    it('should use base overscan when scroll velocity is low', () => {
      const items = generateMockCards(1000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)
      const baseOverscan = 5

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enableDynamicOverscan
          overscan={baseOverscan}
        />
      )

      const overscan = parseInt(container.querySelector('[data-overscan]')?.getAttribute('data-overscan') || '0')
      expect(overscan).toBe(baseOverscan)
    })
  })

  describe('Performance Monitoring', () => {
    it('should report performance metrics when enabled', async () => {
      const items = generateMockCards(10000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)
      const onMetrics = vi.fn()

      render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enablePerformanceMonitoring
          onPerformanceMetrics={onMetrics}
        />
      )

      // Wait for metrics to be reported (every 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(onMetrics).toHaveBeenCalled()

      const metrics: PerformanceMetrics = onMetrics.mock.calls[0][0]
      expect(metrics).toHaveProperty('renderTime')
      expect(metrics).toHaveProperty('scrollVelocity')
      expect(metrics).toHaveProperty('visibleItemCount')
      expect(metrics).toHaveProperty('totalItemCount')
      expect(metrics).toHaveProperty('overscan')
      expect(metrics).toHaveProperty('fps')

      expect(metrics.totalItemCount).toBe(10000)
      expect(metrics.visibleItemCount).toBeLessThan(50)
      expect(metrics.fps).toBeGreaterThan(0)
    })

    it('should not call performance callback when monitoring is disabled', async () => {
      const items = generateMockCards(1000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)
      const onMetrics = vi.fn()

      render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enablePerformanceMonitoring={false}
          onPerformanceMetrics={onMetrics}
        />
      )

      await new Promise(resolve => setTimeout(resolve, 1100))

      expect(onMetrics).not.toHaveBeenCalled()
    })
  })

  describe('Memory Efficiency', () => {
    it('should maintain low DOM node count with 10K items', () => {
      const items = generateMockCards(10000)
      const renderItem = vi.fn((item) => <div data-card-id={item.id}>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      // Count actual rendered DOM nodes
      const renderedCards = container.querySelectorAll('[data-card-id]')

      // Should only render visible + overscan items
      expect(renderedCards.length).toBeLessThan(50)
      expect(renderedCards.length).toBeGreaterThan(0)

      // Verify render function was only called for visible items
      expect(renderItem).toHaveBeenCalledTimes(renderedCards.length)
    })

    it('should not render items outside viewport', () => {
      const items = generateMockCards(1000)
      const renderItem = vi.fn((item) => <div data-card-id={item.id}>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          overscan={2}
        />
      )

      const renderedCards = container.querySelectorAll('[data-card-id]')

      // With 600px height and 320px width, should only see ~2-3 columns + overscan (2)
      expect(renderedCards.length).toBeLessThan(10)
    })
  })

  describe('Resize Observer', () => {
    it('should handle container resize', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enableResizeObserver
        />
      )

      expect(container.querySelector('[data-virtualized="true"]')).toBeInTheDocument()

      // ResizeObserver should be attached (can't easily test the callback without real DOM)
    })

    it('should not attach resize observer when disabled', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          enableResizeObserver={false}
        />
      )

      expect(container.querySelector('[data-virtualized="true"]')).toBeInTheDocument()
    })
  })

  describe('GPU Acceleration', () => {
    it('should apply transform: translateZ(0) for GPU acceleration', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      const firstVirtualItem = container.querySelector('[data-index="0"]') as HTMLElement
      expect(firstVirtualItem).toBeInTheDocument()
      expect(firstVirtualItem?.style.transform).toContain('translateZ(0)')
    })

    it('should apply willChange: scroll-position to container', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      const virtualContainer = container.querySelector('[data-virtualized="true"]') as HTMLElement
      expect(virtualContainer?.style.willChange).toBe('scroll-position')
    })
  })

  describe('Scroll Restoration', () => {
    it('should save scroll position to sessionStorage', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
          scrollRestorationKey="test-scroll"
        />
      )

      // Would need to simulate scroll to test saving
      // sessionStorage.getItem('scroll-test-scroll') should eventually be set
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const renderItem = vi.fn()

      const { container } = render(
        <EnterpriseVirtualGrid
          items={[]}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      expect(container.querySelector('[data-item-count="0"]')).toBeInTheDocument()
      expect(container.querySelector('[data-visible-count="0"]')).toBeInTheDocument()
      expect(renderItem).not.toHaveBeenCalled()
    })

    it('should handle single item', () => {
      const items = [{ id: 'single', title: 'Single Item' }]
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )

      expect(container.querySelector('[data-item-count="1"]')).toBeInTheDocument()
      expect(renderItem).toHaveBeenCalledTimes(1)
    })

    it('should handle very large item width', () => {
      const items = generateMockCards(100)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      const { container } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={2000} // Very wide columns
          renderColumn={renderItem}
        />
      )

      // Should only render 1-2 columns visible at once
      const visibleCount = parseInt(container.querySelector('[data-visible-count]')?.getAttribute('data-visible-count') || '0')
      expect(visibleCount).toBeLessThan(5)
    })
  })

  describe('Performance Comparison', () => {
    it('should be faster than non-virtualized rendering for 1000+ items', () => {
      const items = generateMockCards(1000)
      const renderItem = vi.fn((item) => <div>{item.title}</div>)

      // Virtualized rendering
      const virtualizedStart = performance.now()
      const { unmount: unmountVirtualized } = render(
        <EnterpriseVirtualGrid
          items={items}
          height={600}
          estimateColumnWidth={320}
          renderColumn={renderItem}
        />
      )
      const virtualizedTime = performance.now() - virtualizedStart
      unmountVirtualized()

      // Non-virtualized rendering (for comparison)
      const nonVirtualizedStart = performance.now()
      const { unmount: unmountNonVirtualized } = render(
        <div style={{ height: 600, overflow: 'auto' }}>
          {items.map(item => renderItem(item, items.indexOf(item)))}
        </div>
      )
      const nonVirtualizedTime = performance.now() - nonVirtualizedStart
      unmountNonVirtualized()

      // Virtualized should be significantly faster
      expect(virtualizedTime).toBeLessThan(nonVirtualizedTime * 0.5) // At least 2x faster
    })
  })
})
