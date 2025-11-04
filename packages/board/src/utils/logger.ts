/**
 * Structured Logger for ASAKAA
 * Lightweight, browser-compatible logging system
 * @module utils/logger
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogContext {
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: LogContext
  component?: string
  action?: string
  duration?: number
  error?: {
    message: string
    stack?: string
    name: string
  }
}

export interface LoggerOptions {
  /** Minimum log level (default: INFO in production, DEBUG in development) */
  minLevel?: LogLevel
  /** Enable/disable logging (default: true) */
  enabled?: boolean
  /** Custom log handler for sending logs to external service */
  onLog?: (entry: LogEntry) => void
  /** Enable performance timing (default: true) */
  enableTiming?: boolean
  /** Component name prefix */
  componentName?: string
}

/**
 * Structured Logger Class
 *
 * @example
 * ```ts
 * const logger = new Logger({ componentName: 'KanbanBoard' })
 *
 * logger.info('Board loaded', { boardId: 'abc-123', cardCount: 42 })
 * logger.warn('Slow operation detected', { duration: 1500 })
 * logger.error('Failed to save', { error: err })
 *
 * // With timing
 * const timer = logger.startTimer('drag-operation')
 * // ... do work
 * timer.end({ cardId: 'card-1' })
 * ```
 */
export class Logger {
  private options: Required<LoggerOptions>
  private static globalOptions: Partial<LoggerOptions> = {}

  constructor(options: LoggerOptions = {}) {
    const isDev = process.env.NODE_ENV === 'development'

    this.options = {
      minLevel: options.minLevel ?? (isDev ? LogLevel.DEBUG : LogLevel.INFO),
      enabled: options.enabled ?? true,
      onLog: options.onLog ?? this.defaultLogHandler,
      enableTiming: options.enableTiming ?? true,
      componentName: options.componentName ?? 'ASAKAA',
      ...Logger.globalOptions,
    }
  }

  /**
   * Set global logger configuration
   * Applies to all logger instances
   */
  static configure(options: Partial<LoggerOptions>): void {
    Logger.globalOptions = { ...Logger.globalOptions, ...options }
  }

  /**
   * Create child logger with component name
   */
  child(componentName: string): Logger {
    return new Logger({
      ...this.options,
      componentName: `${this.options.componentName}:${componentName}`,
    })
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    })
  }

  /**
   * Start a timer for performance tracking
   */
  startTimer(action: string): Timer {
    if (!this.options.enableTiming) {
      return new Timer(() => {}, false)
    }

    return new Timer(
      (duration: number, context?: LogContext) => {
        this.log(LogLevel.DEBUG, `${action} completed`, {
          ...context,
          action,
          duration,
        })
      },
      true
    )
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.options.enabled || level < this.options.minLevel) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      component: this.options.componentName,
      ...context,
    }

    this.options.onLog(entry)
  }

  /**
   * Default log handler (console)
   */
  private defaultLogHandler = (entry: LogEntry): void => {
    const { timestamp, level, message, component, ...rest } = entry

    const prefix = `[${timestamp}] [${level}] [${component}]`
    const hasContext = Object.keys(rest).length > 0

    switch (level) {
      case 'DEBUG':
        console.debug(prefix, message, hasContext ? rest : '')
        break
      case 'INFO':
        console.info(prefix, message, hasContext ? rest : '')
        break
      case 'WARN':
        console.warn(prefix, message, hasContext ? rest : '')
        break
      case 'ERROR':
        console.error(prefix, message, hasContext ? rest : '')
        if (entry.error?.stack) {
          console.error(entry.error.stack)
        }
        break
    }
  }
}

/**
 * Timer for performance tracking
 */
class Timer {
  private startTime: number

  constructor(
    private onEnd: (duration: number, context?: LogContext) => void,
    private enabled: boolean
  ) {
    this.startTime = enabled ? performance.now() : 0
  }

  /**
   * End timer and log duration
   */
  end(context?: LogContext): number {
    if (!this.enabled) {
      return 0
    }

    const duration = Math.round(performance.now() - this.startTime)
    this.onEnd(duration, context)
    return duration
  }

  /**
   * Get elapsed time without ending timer
   */
  elapsed(): number {
    if (!this.enabled) {
      return 0
    }
    return Math.round(performance.now() - this.startTime)
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger()

/**
 * Create a scoped logger for a component
 */
export function createLogger(componentName: string, options?: LoggerOptions): Logger {
  return new Logger({
    ...options,
    componentName,
  })
}
