/**
 * TimePill - Compact time indicator component
 * v1.1.0: Shows logged time vs estimate with visual health indicator
 *
 * Displays: "2h / 4h" or "2h" (if no estimate)
 * Colors: green (on-track), yellow (at-risk), red (over-budget), gray (no estimate)
 */

import { cn } from '../../utils'
import type { TimeTrackingSummary } from '../../types'

export interface TimePillProps {
  /** Time tracking summary data */
  summary: TimeTrackingSummary
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show estimate in pill */
  showEstimate?: boolean
  /** Click handler (e.g., to open time popover) */
  onClick?: () => void
  /** Additional class names */
  className?: string
}

/**
 * Format minutes as compact duration string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h${remainingMinutes}m`
}

/**
 * Get color classes based on health status
 */
function getHealthColors(health: TimeTrackingSummary['health']): {
  text: string
  bg: string
  border: string
} {
  switch (health) {
    case 'on-track':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
      }
    case 'at-risk':
      return {
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
      }
    case 'over-budget':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
      }
    case 'no-estimate':
    default:
      return {
        text: 'text-gray-500 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-800/50',
        border: 'border-gray-200 dark:border-gray-700',
      }
  }
}

/**
 * Clock icon component
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-3 h-3', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function TimePill({
  summary,
  size = 'sm',
  showEstimate = true,
  onClick,
  className,
}: TimePillProps) {
  const colors = getHealthColors(summary.health)

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-2.5 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  // Format the display text
  const loggedText = formatDuration(summary.loggedMinutes)
  const estimateText = summary.estimateMinutes
    ? formatDuration(summary.estimateMinutes)
    : null

  const displayText =
    showEstimate && estimateText
      ? `${loggedText} / ${estimateText}`
      : loggedText

  // Show nothing if no time logged and no estimate
  if (summary.loggedMinutes === 0 && !summary.estimateMinutes) {
    return null
  }

  const Component = onClick ? 'button' : 'span'

  return (
    <Component
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        'transition-colors duration-150',
        colors.text,
        colors.bg,
        colors.border,
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1',
        className
      )}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <ClockIcon className={iconSizes[size]} />
      <span>{displayText}</span>
    </Component>
  )
}

export default TimePill
