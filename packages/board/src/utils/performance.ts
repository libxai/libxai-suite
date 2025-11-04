/**
 * Performance utilities
 * @module utils/performance
 */

import { useEffect, useRef } from 'react'

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  let lastResult: ReturnType<T>

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
      lastResult = func(...args)
    }
    return lastResult
  }
}

/**
 * Custom hook for measuring render performance
 * Only active in development
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef<number>(0)

  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()

    useEffect(() => {
      const end = performance.now()
      renderCount.current++
      const renderTime = end - start

      if (renderTime > 16) {
        // > 1 frame at 60fps
        console.warn(
          `[Performance] ${componentName} render #${renderCount.current} took ${renderTime.toFixed(2)}ms`
        )
      }

      lastRenderTime.current = renderTime
    })
  }
}

/**
 * Check if virtualization should be enabled
 */
export function shouldVirtualize(itemCount: number, threshold = 100): boolean {
  return itemCount > threshold
}

/**
 * Request idle callback wrapper with fallback
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: IdleRequestCallback) => setTimeout(cb, 1)

/**
 * Cancel idle callback wrapper with fallback
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id)

/**
 * Memoization helper for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)!
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}
