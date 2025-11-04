/**
 * Debug Mode Utilities
 * Advanced debugging tools for development
 * @module utils/debug
 */

import { logger, Logger, LogLevel } from './logger'
import { metricsTracker } from './metrics'
import { analytics } from './analytics'

export interface DebugConfig {
  /** Enable debug mode */
  enabled: boolean
  /** Enable verbose logging */
  verbose: boolean
  /** Enable performance tracking */
  trackPerformance: boolean
  /** Enable analytics tracking */
  trackAnalytics: boolean
  /** Enable state logging */
  logState: boolean
  /** Enable render tracking */
  trackRenders: boolean
  /** Custom debug panel */
  showDebugPanel: boolean
}

/**
 * Debug Manager
 */
class DebugManager {
  private config: DebugConfig = {
    enabled: false,
    verbose: false,
    trackPerformance: true,
    trackAnalytics: true,
    logState: false,
    trackRenders: false,
    showDebugPanel: false,
  }

  private debugLogger: Logger = logger.child('Debug')
  private stateHistory: any[] = []
  private renderHistory: Map<string, number> = new Map()

  constructor() {
    // Auto-enable in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      this.enable()
    }
  }

  /**
   * Enable debug mode
   */
  enable(config?: Partial<DebugConfig>): void {
    this.config = {
      ...this.config,
      enabled: true,
      ...config,
    }

    // Set logger to DEBUG level
    if (this.config.verbose) {
      Logger.configure({ minLevel: LogLevel.DEBUG })
    }

    this.debugLogger.info('Debug mode enabled', this.config)

    // Expose debug utilities on window
    if (typeof window !== 'undefined') {
      ;(window as any).__ASAKAA_DEBUG__ = {
        logger,
        metrics: metricsTracker,
        analytics,
        config: this.config,
        getStateHistory: () => this.stateHistory,
        getRenderHistory: () => Object.fromEntries(this.renderHistory),
        clearHistory: () => {
          this.stateHistory = []
          this.renderHistory.clear()
        },
        exportMetrics: () => metricsTracker.getSummary(),
        enableVerbose: () => {
          this.config.verbose = true
          Logger.configure({ minLevel: LogLevel.DEBUG })
        },
        disableVerbose: () => {
          this.config.verbose = false
          Logger.configure({ minLevel: LogLevel.INFO })
        },
      }

      console.log(
        '%c🚀 ASAKAA Debug Mode Enabled',
        'background: #1a1a1a; color: #60a5fa; font-size: 14px; padding: 8px; border-radius: 4px;'
      )
      console.log('%cAccess debug utilities via window.__ASAKAA_DEBUG__', 'color: #9ca3af; font-size: 12px;')
      console.log('%cAvailable commands:', 'color: #9ca3af; font-size: 12px; margin-top: 4px;')
      console.log('%c  - __ASAKAA_DEBUG__.exportMetrics()', 'color: #60a5fa; font-size: 11px;')
      console.log('%c  - __ASAKAA_DEBUG__.getStateHistory()', 'color: #60a5fa; font-size: 11px;')
      console.log('%c  - __ASAKAA_DEBUG__.getRenderHistory()', 'color: #60a5fa; font-size: 11px;')
      console.log('%c  - __ASAKAA_DEBUG__.clearHistory()', 'color: #60a5fa; font-size: 11px;')
      console.log('%c  - __ASAKAA_DEBUG__.enableVerbose()', 'color: #60a5fa; font-size: 11px;')
      console.log('%c  - __ASAKAA_DEBUG__.disableVerbose()', 'color: #60a5fa; font-size: 11px;')
    }
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this.config.enabled = false
    this.debugLogger.info('Debug mode disabled')

    if (typeof window !== 'undefined') {
      delete (window as any).__ASAKAA_DEBUG__
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get current config
   */
  getConfig(): DebugConfig {
    return { ...this.config }
  }

  /**
   * Log state change
   */
  logStateChange(componentName: string, prevState: any, nextState: any, action?: string): void {
    if (!this.config.enabled || !this.config.logState) {
      return
    }

    const entry = {
      timestamp: Date.now(),
      component: componentName,
      action,
      prevState,
      nextState,
      diff: this.getStateDiff(prevState, nextState),
    }

    this.stateHistory.push(entry)

    // Keep only last 100 entries
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }

    this.debugLogger.debug(`State change: ${componentName}`, {
      action,
      diff: entry.diff,
    })
  }

  /**
   * Track component render
   */
  trackRender(componentName: string, props?: any): void {
    if (!this.config.enabled || !this.config.trackRenders) {
      return
    }

    const count = (this.renderHistory.get(componentName) || 0) + 1
    this.renderHistory.set(componentName, count)

    if (count > 50) {
      this.debugLogger.warn(`High render count detected: ${componentName}`, {
        count,
        props,
      })
    }

    this.debugLogger.debug(`Render: ${componentName} (#${count})`, { props })
  }

  /**
   * Log performance warning
   */
  performanceWarning(message: string, details: Record<string, any>): void {
    if (!this.config.enabled || !this.config.trackPerformance) {
      return
    }

    this.debugLogger.warn(`⚠️ Performance: ${message}`, details)

    // Also track in analytics
    if (this.config.trackAnalytics) {
      analytics.track('debug_performance_warning', {
        message,
        ...details,
      })
    }
  }

  /**
   * Get state diff between two objects
   */
  private getStateDiff(prev: any, next: any): Record<string, { from: any; to: any }> {
    const diff: Record<string, { from: any; to: any }> = {}

    // Check for changed/added properties
    Object.keys(next || {}).forEach((key) => {
      if (prev?.[key] !== next?.[key]) {
        diff[key] = { from: prev?.[key], to: next?.[key] }
      }
    })

    // Check for removed properties
    Object.keys(prev || {}).forEach((key) => {
      if (!(key in (next || {}))) {
        diff[key] = { from: prev?.[key], to: undefined }
      }
    })

    return diff
  }

  /**
   * Create a debug-aware component wrapper
   */
  wrapComponent<P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
  ): React.ComponentType<P> {
    if (!this.config.enabled || !this.config.trackRenders) {
      return Component
    }

    return (props: P) => {
      this.trackRender(componentName, props)
      return React.createElement(Component, props)
    }
  }

  /**
   * Time an operation with detailed logging
   */
  async timeOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return operation()
    }

    const startTime = performance.now()
    const startMem = (performance as any).memory?.usedJSHeapSize || 0

    try {
      this.debugLogger.debug(`⏱️ Starting: ${name}`)
      const result = await operation()
      const duration = performance.now() - startTime
      const endMem = (performance as any).memory?.usedJSHeapSize || 0
      const memDelta = endMem - startMem

      this.debugLogger.info(`✅ Completed: ${name}`, {
        duration: `${Math.round(duration)}ms`,
        memoryDelta: `${Math.round(memDelta / 1024)}KB`,
      })

      if (duration > 1000) {
        this.performanceWarning(`Slow operation: ${name}`, {
          duration,
          threshold: 1000,
        })
      }

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      this.debugLogger.error(`❌ Failed: ${name}`, error as Error, {
        duration: `${Math.round(duration)}ms`,
      })
      throw error
    }
  }

  /**
   * Assert condition with custom message
   */
  assert(condition: boolean, message: string, context?: Record<string, any>): void {
    if (!this.config.enabled || condition) {
      return
    }

    this.debugLogger.error(`Assertion failed: ${message}`, new Error('Assertion failed'), context)

    if (this.config.verbose) {
      debugger // Pause execution in dev tools
    }
  }

  /**
   * Create a checkpoint for debugging
   */
  checkpoint(name: string, data?: any): void {
    if (!this.config.enabled || !this.config.verbose) {
      return
    }

    console.group(`📍 Checkpoint: ${name}`)
    console.log('Timestamp:', new Date().toISOString())
    if (data) {
      console.log('Data:', data)
    }
    console.trace('Stack trace:')
    console.groupEnd()
  }
}

/**
 * Global debug manager instance
 */
export const debugManager = new DebugManager()

/**
 * Debug decorator for methods
 */
export function debug(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    return debugManager.timeOperation(`${target.constructor.name}.${propertyKey}`, () =>
      originalMethod.apply(this, args)
    )
  }

  return descriptor
}

/**
 * Log component lifecycle
 */
export function logLifecycle(componentName: string) {
  return function (Component: React.ComponentType<any>) {
    return debugManager.wrapComponent(Component, componentName)
  }
}

// Need React import
import * as React from 'react'

/**
 * Export debug utilities for global access
 */
export const Debug = {
  enable: (config?: Partial<DebugConfig>) => debugManager.enable(config),
  disable: () => debugManager.disable(),
  isEnabled: () => debugManager.isEnabled(),
  logState: (component: string, prev: any, next: any, action?: string) =>
    debugManager.logStateChange(component, prev, next, action),
  trackRender: (component: string, props?: any) => debugManager.trackRender(component, props),
  performanceWarning: (message: string, details: Record<string, any>) =>
    debugManager.performanceWarning(message, details),
  timeOperation: <T,>(name: string, operation: () => Promise<T>) => debugManager.timeOperation(name, operation),
  assert: (condition: boolean, message: string, context?: Record<string, any>) =>
    debugManager.assert(condition, message, context),
  checkpoint: (name: string, data?: any) => debugManager.checkpoint(name, data),
}
