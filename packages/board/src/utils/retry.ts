/**
 * Retry utilities with exponential backoff
 * For resilient API calls and persistence operations
 * @module utils/retry
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number
  /** Function to determine if error should be retried */
  shouldRetry?: (error: Error, attempt: number) => boolean
  /** Callback when retry is attempted */
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

export interface RetryResult<T> {
  data?: T
  error?: Error
  attempts: number
  success: boolean
}

/**
 * Default retry logic - retries on network errors
 */
const defaultShouldRetry = (error: Error): boolean => {
  // Retry on network errors
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return true
  }

  // Retry on specific error codes
  if ('status' in error) {
    const status = (error as any).status
    // Retry on server errors (5xx) and rate limiting (429)
    return status >= 500 || status === 429
  }

  return false
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1)
  // Add jitter (random variation) to prevent thundering herd
  const jitter = delay * 0.2 * Math.random()
  return Math.min(delay + jitter, maxDelay)
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => api.updateBoard(board),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`)
 *     }
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options

  let lastError: Error | undefined
  let attempts = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt

    try {
      const data = await fn()
      return {
        data,
        attempts,
        success: true,
      }
    } catch (error) {
      lastError = error as Error

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts
      if (isLastAttempt || !shouldRetry(lastError, attempt)) {
        return {
          error: lastError,
          attempts,
          success: false,
        }
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay)

      // Call retry callback
      if (onRetry) {
        try {
          onRetry(lastError, attempt, delay)
        } catch (callbackError) {
          console.error('Error in retry callback:', callbackError)
        }
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript doesn't know that
  return {
    error: lastError || new Error('Unknown error'),
    attempts,
    success: false,
  }
}

/**
 * Retry a function synchronously (for non-async operations)
 * No backoff, just immediate retries
 */
export function retrySyncOperation<T>(
  fn: () => T,
  maxAttempts: number = 3
): { data?: T; error?: Error; success: boolean } {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = fn()
      return { data, success: true }
    } catch (error) {
      lastError = error as Error

      if (attempt === maxAttempts) {
        return { error: lastError, success: false }
      }
    }
  }

  return { error: lastError || new Error('Unknown error'), success: false }
}

/**
 * Create a retry wrapper function
 * Returns a function that automatically retries on failure
 *
 * @example
 * ```ts
 * const saveBoard = createRetryWrapper(
 *   api.saveBoard,
 *   { maxAttempts: 3 }
 * )
 *
 * const result = await saveBoard(boardData)
 * ```
 */
export function createRetryWrapper<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), options)
  }
}

/**
 * Retry with circuit breaker pattern
 * Stops retrying if too many failures occur
 */
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private isOpen: boolean = false

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.isOpen) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime

      // Try to close circuit after reset timeout
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.reset()
      } else {
        throw new Error('Circuit breaker is open - too many failures')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.isOpen = false
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.isOpen = true
    }
  }

  private reset(): void {
    this.failures = 0
    this.isOpen = false
  }

  getStatus(): { failures: number; isOpen: boolean } {
    return {
      failures: this.failures,
      isOpen: this.isOpen,
    }
  }
}
