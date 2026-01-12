/**
 * HealthBar - Visual progress bar with health status colors
 * v1.1.0: Shows time progress with color-coded health indicator
 *
 * Colors:
 * - Green (on-track): < 80% of estimate used
 * - Yellow (at-risk): 80-100% of estimate used
 * - Red (over-budget): > 100% of estimate used
 * - Gray (no-estimate): No estimate set
 */

import { cn } from '../../utils'
import type { TimeTrackingSummary } from '../../types'

export interface HealthBarProps {
  /** Time tracking summary data */
  summary: TimeTrackingSummary
  /** Show percentage label */
  showLabel?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

/**
 * Get color classes based on health status
 */
function getHealthColor(health: TimeTrackingSummary['health']): string {
  switch (health) {
    case 'on-track':
      return 'bg-green-500'
    case 'at-risk':
      return 'bg-yellow-500'
    case 'over-budget':
      return 'bg-red-500'
    case 'no-estimate':
    default:
      return 'bg-gray-400'
  }
}

/**
 * Get text color classes based on health status
 */
function getHealthTextColor(health: TimeTrackingSummary['health']): string {
  switch (health) {
    case 'on-track':
      return 'text-green-600 dark:text-green-400'
    case 'at-risk':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'over-budget':
      return 'text-red-600 dark:text-red-400'
    case 'no-estimate':
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

export function HealthBar({
  summary,
  showLabel = false,
  size = 'md',
  className,
}: HealthBarProps) {
  const barColor = getHealthColor(summary.health)
  const textColor = getHealthTextColor(summary.health)

  // Size classes for the bar
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }

  // Calculate progress width (capped at 100% for visual but can show overflow indicator)
  const progress = summary.progressPercent ?? 0
  const visualProgress = Math.min(100, progress)
  const isOverBudget = progress > 100

  // If no estimate, show a minimal bar
  if (summary.health === 'no-estimate') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden',
            sizeClasses[size]
          )}
        >
          <div className={cn('h-full w-1/4', barColor)} />
        </div>
        {showLabel && (
          <span className={cn('text-xs font-medium', textColor)}>--</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative',
          sizeClasses[size]
        )}
      >
        {/* Main progress bar */}
        <div
          className={cn('h-full transition-all duration-300', barColor)}
          style={{ width: `${visualProgress}%` }}
        />

        {/* Overflow indicator stripe pattern for over-budget */}
        {isOverBudget && (
          <div
            className="absolute inset-0 bg-red-500"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)',
            }}
          />
        )}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium tabular-nums min-w-[2.5rem] text-right', textColor)}>
          {progress}%
        </span>
      )}
    </div>
  )
}

export default HealthBar
