/**
 * Performance Monitoring Hooks
 * @module hooks/usePerformanceMonitor
 */

import { useEffect, useRef, useCallback } from 'react'
import { metricsTracker, trackComponentPerformance, trackRenderPerformance } from '../utils/metrics'
import { logger } from '../utils/logger'

/**
 * Hook to track component mount/unmount performance
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent')
 *   return <div>Content</div>
 * }
 * ```
 */
export function usePerformanceMonitor(componentName: string): void {
  const mountTime = useRef(performance.now())
  const renderCount = useRef(0)

  useEffect(() => {
    const mountDuration = performance.now() - mountTime.current
    trackComponentPerformance(componentName, 'mount', mountDuration)

    logger.debug(`${componentName} mounted`, {
      duration: `${Math.round(mountDuration)}ms`,
    })

    return () => {
      const unmountTime = performance.now()
      const totalLifetime = unmountTime - mountTime.current
      trackComponentPerformance(componentName, 'unmount', 0, {
        lifetime: Math.round(totalLifetime),
      })

      logger.debug(`${componentName} unmounted`, {
        lifetime: `${Math.round(totalLifetime)}ms`,
        renderCount: renderCount.current,
      })
    }
  }, [componentName])

  // Track renders
  useEffect(() => {
    renderCount.current++
    trackRenderPerformance(componentName, renderCount.current)
  })
}

/**
 * Hook to track async operations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const trackOperation = useOperationTracker('MyComponent')
 *
 *   const handleSave = async () => {
 *     await trackOperation('save', async () => {
 *       await api.save(data)
 *     })
 *   }
 * }
 * ```
 */
export function useOperationTracker(componentName: string) {
  return useCallback(
    async <T,>(operationName: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> => {
      const startTime = performance.now()

      try {
        const result = await operation()
        const duration = performance.now() - startTime

        trackComponentPerformance(componentName, operationName, duration, {
          ...metadata,
          success: true,
        })

        logger.debug(`${componentName}.${operationName} completed`, {
          duration: `${Math.round(duration)}ms`,
          ...metadata,
        })

        return result
      } catch (error) {
        const duration = performance.now() - startTime

        trackComponentPerformance(componentName, operationName, duration, {
          ...metadata,
          success: false,
          error: (error as Error).message,
        })

        logger.error(`${componentName}.${operationName} failed`, error as Error, {
          duration: `${Math.round(duration)}ms`,
          ...metadata,
        })

        throw error
      }
    },
    [componentName]
  )
}

/**
 * Hook to track render performance with details
 *
 * @example
 * ```tsx
 * function MyComponent({ items }) {
 *   useRenderTracker('MyComponent', { itemCount: items.length })
 *   return <div>{items.map(...)}</div>
 * }
 * ```
 */
export function useRenderTracker(componentName: string, metadata?: Record<string, any>): void {
  const renderCount = useRef(0)
  const renderStart = useRef(performance.now())

  useEffect(() => {
    renderCount.current++
    const renderDuration = performance.now() - renderStart.current

    trackRenderPerformance(componentName, renderCount.current, renderDuration)

    if (renderDuration > 16) {
      // Warn if render takes longer than 1 frame (16ms)
      logger.warn(`Slow render detected in ${componentName}`, {
        duration: `${Math.round(renderDuration)}ms`,
        renderCount: renderCount.current,
        ...metadata,
      })
    }

    logger.debug(`${componentName} rendered`, {
      renderCount: renderCount.current,
      duration: `${Math.round(renderDuration)}ms`,
      ...metadata,
    })
  })

  // Update render start time for next render
  renderStart.current = performance.now()
}

/**
 * Hook to track interaction performance (clicks, drags, etc.)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const trackInteraction = useInteractionTracker('MyComponent')
 *
 *   const handleClick = trackInteraction('click', (event) => {
 *     // Handle click
 *   })
 * }
 * ```
 */
export function useInteractionTracker(componentName: string) {
  return useCallback(
    <T extends (...args: any[]) => any>(
      interactionName: string,
      handler: T,
      metadata?: Record<string, any>
    ): T => {
      return ((...args: any[]) => {
        const startTime = performance.now()

        try {
          const result = handler(...args)

          // Handle async handlers
          if (result instanceof Promise) {
            return result
              .then((res) => {
                const duration = performance.now() - startTime
                trackComponentPerformance(componentName, interactionName, duration, metadata)
                return res
              })
              .catch((error) => {
                const duration = performance.now() - startTime
                trackComponentPerformance(componentName, `${interactionName}.error`, duration, {
                  ...metadata,
                  error: error.message,
                })
                throw error
              })
          }

          // Sync handler
          const duration = performance.now() - startTime
          trackComponentPerformance(componentName, interactionName, duration, metadata)

          return result
        } catch (error) {
          const duration = performance.now() - startTime
          trackComponentPerformance(componentName, `${interactionName}.error`, duration, {
            ...metadata,
            error: (error as Error).message,
          })
          throw error
        }
      }) as T
    },
    [componentName]
  )
}

/**
 * Hook to get performance metrics summary
 *
 * @example
 * ```tsx
 * function PerformanceDashboard() {
 *   const metrics = useMetricsSummary()
 *   return <div>{JSON.stringify(metrics, null, 2)}</div>
 * }
 * ```
 */
export function useMetricsSummary(): Record<string, any> {
  const [summary, setSummary] = React.useState(metricsTracker.getSummary())

  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(metricsTracker.getSummary())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return summary
}

/**
 * Hook to track specific metric value
 */
export function useMetricValue(metricName: string): number {
  const [value, setValue] = React.useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(metricsTracker.getAverage(metricName))
    }, 1000)

    return () => clearInterval(interval)
  }, [metricName])

  return value
}

// Need to import React for hooks
import * as React from 'react'
