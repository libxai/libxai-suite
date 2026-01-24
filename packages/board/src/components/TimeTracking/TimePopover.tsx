/**
 * TimePopover - Quick time logging popover
 * v1.1.0: Allows users to quickly log time or start a timer
 *
 * Features:
 * - Quick duration input (e.g., "2h", "30m", "2:30")
 * - Start/Stop timer button
 * - Set/update estimate
 * - View recent time entries
 */

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils'
import type { TimeEntry, TimeLogInput, TimeTrackingSummary } from '../../types'

export interface TimePopoverProps {
  /** Task ID */
  taskId: string
  /** Time tracking summary */
  summary: TimeTrackingSummary
  /** Recent time entries */
  entries?: TimeEntry[]
  /** Whether timer is running for this task */
  isTimerRunning?: boolean
  /** Timer elapsed seconds (when running) */
  timerElapsedSeconds?: number
  /** Callback to log time */
  onLogTime?: (input: TimeLogInput) => Promise<void>
  /** Callback to update estimate */
  onUpdateEstimate?: (minutes: number | null) => Promise<void>
  /** Callback to start timer */
  onStartTimer?: () => void
  /** Callback to stop timer */
  onStopTimer?: () => void
  /** Callback to discard timer */
  onDiscardTimer?: () => void
  /** Close popover callback */
  onClose?: () => void
  /** Position anchor element */
  anchorEl?: HTMLElement | null
  /** Additional class names */
  className?: string
}

/**
 * Parse duration string to minutes
 */
function parseDuration(input: string): number {
  const trimmed = input.trim().toLowerCase()

  // Format: "2:30" (hours:minutes)
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  // Format: "2h 30m" or "2h" or "30m"
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/)
  const minuteMatch = trimmed.match(/(\d+)\s*m/)

  if (hourMatch || minuteMatch) {
    const hours = hourMatch?.[1] ? parseFloat(hourMatch[1]) : 0
    const minutes = minuteMatch?.[1] ? parseInt(minuteMatch[1], 10) : 0
    return Math.round(hours * 60) + minutes
  }

  // Format: plain number (assume HOURS, not minutes)
  // e.g., "100" = 100 hours = 6000 minutes
  const plainNumber = parseFloat(trimmed)
  if (!isNaN(plainNumber)) {
    return Math.round(plainNumber * 60)
  }

  return 0
}

/**
 * Format minutes as duration string
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

  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format seconds as timer display (HH:MM:SS)
 */
function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Play icon
 */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

/**
 * Stop icon
 */
function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

/**
 * X icon for discard
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

/**
 * Clock icon
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function TimePopover({
  taskId: _taskId,
  summary,
  entries = [],
  isTimerRunning = false,
  timerElapsedSeconds = 0,
  onLogTime,
  onUpdateEstimate,
  onStartTimer,
  onStopTimer,
  onDiscardTimer,
  onClose,
  className,
}: TimePopoverProps) {
  const [durationInput, setDurationInput] = useState('')
  const [estimateInput, setEstimateInput] = useState(
    summary.estimateMinutes ? formatDuration(summary.estimateMinutes) : ''
  )
  const [noteInput, setNoteInput] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [showEstimateEdit, setShowEstimateEdit] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle log time submit
  const handleLogTime = async () => {
    const minutes = parseDuration(durationInput)
    if (minutes <= 0 || !onLogTime) return

    setIsLogging(true)
    try {
      await onLogTime({
        durationMinutes: minutes,
        note: noteInput.trim() || undefined,
        source: 'manual',
      })
      setDurationInput('')
      setNoteInput('')
    } finally {
      setIsLogging(false)
    }
  }

  // Handle estimate update
  const handleUpdateEstimate = async () => {
    if (!onUpdateEstimate) return

    const minutes = estimateInput.trim() ? parseDuration(estimateInput) : null
    await onUpdateEstimate(minutes)
    setShowEstimateEdit(false)
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleLogTime()
    }
    if (e.key === 'Escape') {
      onClose?.()
    }
  }

  return (
    <div
      className={cn(
        'w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
        'divide-y divide-gray-100 dark:divide-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Time Tracking
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Timer Section */}
      <div className="px-3 py-2">
        {isTimerRunning ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-lg font-mono font-medium text-gray-900 dark:text-white">
                {formatTimerDisplay(timerElapsedSeconds)}
              </span>
            </div>
            <button
              onClick={onStopTimer}
              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white"
              title="Stop and save"
            >
              <StopIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDiscardTimer}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
              title="Discard"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onStartTimer}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
              'text-gray-700 dark:text-gray-200 font-medium text-sm'
            )}
          >
            <PlayIcon className="w-4 h-4" />
            Start Timer
          </button>
        )}
      </div>

      {/* Quick Log Section */}
      <div className="px-3 py-2 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ClockIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="8 (=8h), 2h 30m"
              className={cn(
                'w-full pl-8 pr-3 py-1.5 text-sm rounded-lg',
                'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
                'text-gray-900 dark:text-white placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              )}
            />
          </div>
          <button
            onClick={handleLogTime}
            disabled={isLogging || !durationInput.trim()}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-blue-500 hover:bg-blue-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Log
          </button>
        </div>
        <input
          type="text"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Note (optional)"
          className={cn(
            'w-full px-3 py-1.5 text-sm rounded-lg',
            'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
            'text-gray-900 dark:text-white placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          )}
        />
      </div>

      {/* Summary Section */}
      <div className="px-3 py-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Logged</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDuration(summary.loggedMinutes)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500 dark:text-gray-400">Estimate</span>
          {showEstimateEdit ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateEstimate()
                  if (e.key === 'Escape') setShowEstimateEdit(false)
                }}
                onBlur={handleUpdateEstimate}
                autoFocus
                className="w-16 px-1 py-0.5 text-sm text-right rounded border border-blue-500 bg-transparent focus:outline-none"
                placeholder="4h"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowEstimateEdit(true)}
              className="font-medium text-gray-900 dark:text-white hover:text-blue-500"
            >
              {summary.estimateMinutes
                ? formatDuration(summary.estimateMinutes)
                : 'Set estimate'}
            </button>
          )}
        </div>
        {summary.progressPercent !== null && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">Progress</span>
              <span
                className={cn(
                  'font-medium',
                  summary.health === 'on-track' && 'text-green-600',
                  summary.health === 'at-risk' && 'text-yellow-600',
                  summary.health === 'over-budget' && 'text-red-600'
                )}
              >
                {summary.progressPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  summary.health === 'on-track' && 'bg-green-500',
                  summary.health === 'at-risk' && 'bg-yellow-500',
                  summary.health === 'over-budget' && 'bg-red-500'
                )}
                style={{ width: `${Math.min(100, summary.progressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Recent Entries
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {entries.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300"
              >
                <span className="truncate flex-1">{entry.note || 'Time logged'}</span>
                <span className="font-medium ml-2">
                  {formatDuration(entry.durationMinutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePopover
