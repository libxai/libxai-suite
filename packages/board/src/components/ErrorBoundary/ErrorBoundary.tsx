/**
 * Error Boundary Component
 * Catches errors in child components and provides fallback UI
 * @module components/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode
  /** Custom fallback UI (receives error and reset callback) */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Component identifier for error tracking */
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary for catching React errors
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error) => console.error(error)}
 *   componentName="KanbanBoard"
 * >
 *   <KanbanBoard {...props} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, componentName } = this.props

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${componentName || 'Component'}:`, error)
      console.error('Error Info:', errorInfo)
    }

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo)
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError)
      }
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, componentName } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.resetError)
      }

      // Default fallback UI
      return (
        <div
          className="p-6 rounded-lg border"
          style={{
            background: 'linear-gradient(135deg, #2d1b1b 0%, #1a1a1a 100%)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            {/* Error icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2" />
              <path d="M12 8V12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="#EF4444" />
            </svg>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-1">
                {componentName ? `Error in ${componentName}` : 'Something went wrong'}
              </h3>
              <p className="text-sm text-white/70 mb-3">
                {error.message || 'An unexpected error occurred'}
              </p>

              {process.env.NODE_ENV === 'development' && (
                <details className="mb-3">
                  <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs text-white/60 bg-black/30 p-3 rounded overflow-auto max-h-48">
                    {error.stack}
                  </pre>
                </details>
              )}

              <button
                onClick={this.resetError}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-red-600/20 border border-red-500/30"
                style={{ color: '#EF4444' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook-based error boundary wrapper
 * Use this for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}
