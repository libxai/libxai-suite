/**
 * Performance Metrics & Web Vitals Tracking
 * @module utils/metrics
 */

import { logger } from './logger'

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'count' | 'bytes'
  timestamp: number
  metadata?: Record<string, any>
}

export interface WebVitalsMetrics {
  /** First Contentful Paint */
  FCP?: number
  /** Largest Contentful Paint */
  LCP?: number
  /** First Input Delay */
  FID?: number
  /** Cumulative Layout Shift */
  CLS?: number
  /** Time to First Byte */
  TTFB?: number
  /** Interaction to Next Paint */
  INP?: number
}

export interface MetricsReporter {
  onMetric: (metric: PerformanceMetric) => void
}

/**
 * Performance Metrics Tracker
 */
export class MetricsTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private reporters: MetricsReporter[] = []
  private metricsLogger = logger.child('Metrics')

  constructor(reporters: MetricsReporter[] = []) {
    this.reporters = reporters
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'count' | 'bytes' = 'ms',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    }

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(metric)

    // Report to all reporters
    this.reporters.forEach((reporter) => {
      try {
        reporter.onMetric(metric)
      } catch (error) {
        this.metricsLogger.error('Failed to report metric', error as Error, { metric })
      }
    })

    // Log metric
    this.metricsLogger.debug(`Metric: ${name}`, {
      value: `${value}${unit}`,
      ...metadata,
    })
  }

  /**
   * Get all metrics for a specific name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || []
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return 0

    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  /**
   * Get percentile value for a metric
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return 0

    const sorted = metrics.map((m) => m.value).sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * Add a metrics reporter
   */
  addReporter(reporter: MetricsReporter): void {
    this.reporters.push(reporter)
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }> {
    const summary: Record<string, any> = {}

    this.metrics.forEach((metrics, name) => {
      summary[name] = {
        avg: this.getAverage(name),
        p50: this.getPercentile(name, 50),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99),
        count: metrics.length,
      }
    })

    return summary
  }
}

/**
 * Global metrics tracker instance
 */
export const metricsTracker = new MetricsTracker()

/**
 * Track Web Vitals using Performance Observer API
 */
export function trackWebVitals(onMetric?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    logger.warn('Performance Observer API not available')
    return
  }

  // Track Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any

      const metric: PerformanceMetric = {
        name: 'LCP',
        value: Math.round(lastEntry.renderTime || lastEntry.loadTime),
        unit: 'ms',
        timestamp: Date.now(),
      }

      metricsTracker.recordMetric(metric.name, metric.value, metric.unit)
      onMetric?.(metric)
    })

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch (error) {
    logger.debug('LCP tracking not available', { error })
  }

  // Track First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const metric: PerformanceMetric = {
          name: 'FID',
          value: Math.round(entry.processingStart - entry.startTime),
          unit: 'ms',
          timestamp: Date.now(),
        }

        metricsTracker.recordMetric(metric.name, metric.value, metric.unit)
        onMetric?.(metric)
      })
    })

    fidObserver.observe({ entryTypes: ['first-input'] })
  } catch (error) {
    logger.debug('FID tracking not available', { error })
  }

  // Track Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })

      const metric: PerformanceMetric = {
        name: 'CLS',
        value: Math.round(clsValue * 1000) / 1000,
        unit: 'count',
        timestamp: Date.now(),
      }

      metricsTracker.recordMetric(metric.name, metric.value, metric.unit)
      onMetric?.(metric)
    })

    clsObserver.observe({ entryTypes: ['layout-shift'] })
  } catch (error) {
    logger.debug('CLS tracking not available', { error })
  }

  // Track First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          const metric: PerformanceMetric = {
            name: 'FCP',
            value: Math.round(entry.startTime),
            unit: 'ms',
            timestamp: Date.now(),
          }

          metricsTracker.recordMetric(metric.name, metric.value, metric.unit)
          onMetric?.(metric)
        }
      })
    })

    fcpObserver.observe({ entryTypes: ['paint'] })
  } catch (error) {
    logger.debug('FCP tracking not available', { error })
  }
}

/**
 * Track custom component performance
 */
export function trackComponentPerformance(
  componentName: string,
  action: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  metricsTracker.recordMetric(`component.${componentName}.${action}`, duration, 'ms', metadata)
}

/**
 * Track drag & drop performance
 */
export function trackDragPerformance(
  event: 'start' | 'move' | 'end',
  duration?: number,
  metadata?: Record<string, any>
): void {
  if (duration !== undefined) {
    metricsTracker.recordMetric(`drag.${event}`, duration, 'ms', metadata)
  }
}

/**
 * Track render performance
 */
export function trackRenderPerformance(
  componentName: string,
  renderCount: number,
  duration?: number
): void {
  metricsTracker.recordMetric(`render.${componentName}.count`, renderCount, 'count')

  if (duration !== undefined) {
    metricsTracker.recordMetric(`render.${componentName}.duration`, duration, 'ms')
  }
}

/**
 * Track memory usage
 */
export function trackMemoryUsage(): void {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return
  }

  const memory = (performance as any).memory

  metricsTracker.recordMetric('memory.usedJSHeapSize', memory.usedJSHeapSize, 'bytes')
  metricsTracker.recordMetric('memory.totalJSHeapSize', memory.totalJSHeapSize, 'bytes')
  metricsTracker.recordMetric('memory.jsHeapSizeLimit', memory.jsHeapSizeLimit, 'bytes')
}

/**
 * Console reporter for debugging
 */
export const consoleReporter: MetricsReporter = {
  onMetric: (metric) => {
    logger.debug(`📊 Metric: ${metric.name} = ${metric.value}${metric.unit}`, metric.metadata)
  },
}

/**
 * Create a custom reporter that sends metrics to an external service
 */
export function createExternalReporter(
  sendMetric: (metric: PerformanceMetric) => void | Promise<void>
): MetricsReporter {
  return {
    onMetric: async (metric) => {
      try {
        await sendMetric(metric)
      } catch (error) {
        logger.error('Failed to send metric to external service', error as Error, {
          metric,
        })
      }
    },
  }
}
