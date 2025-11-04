/**
 * CardHistoryReplay Component
 * Video-player-style controls for replaying card history
 * @module components/CardHistory
 */

import { useMemo } from 'react'
import type { ReplayState, CardHistoryEvent } from '../../types/card-history'
import { getEventIcon, formatEventDescription } from '../../types/card-history'
import { cn } from '../../utils'

export interface CardHistoryReplayProps {
  /** Current replay state */
  replayState: ReplayState | null
  /** All history events */
  events: CardHistoryEvent[]
  /** Start replay */
  onStartReplay: () => void
  /** Stop replay */
  onStopReplay: () => void
  /** Toggle play/pause */
  onTogglePlayback: () => void
  /** Go to previous event */
  onPrevious: () => void
  /** Go to next event */
  onNext: () => void
  /** Go to specific event */
  onGoToEvent: (index: number) => void
  /** Change playback speed */
  onSpeedChange: (speed: number) => void
  /** Custom className */
  className?: string
}

/**
 * Replay controls for time-travel functionality
 */
export function CardHistoryReplay({
  replayState,
  events,
  onStartReplay,
  onStopReplay,
  onTogglePlayback,
  onPrevious,
  onNext,
  onGoToEvent,
  onSpeedChange,
  className,
}: CardHistoryReplayProps) {
  // Available playback speeds
  const speeds = [0.5, 1, 1.5, 2, 3]

  // Current event
  const currentEvent = useMemo(() => {
    if (!replayState || events.length === 0) return null
    return events[replayState.currentIndex]
  }, [replayState, events])

  // Progress percentage
  const progress = useMemo(() => {
    if (!replayState || replayState.totalEvents === 0) return 0
    return (replayState.currentIndex / (replayState.totalEvents - 1)) * 100
  }, [replayState])

  // If no events, show empty state
  if (events.length === 0) {
    return (
      <div className={cn('history-replay-empty', className)}>
        <div className="history-replay-empty-icon">⏳</div>
        <p className="history-replay-empty-text">No history to replay</p>
      </div>
    )
  }

  // If not in replay mode, show start button
  if (!replayState) {
    return (
      <div className={cn('history-replay-start', className)}>
        <button className="history-replay-start-button" onClick={onStartReplay}>
          <svg
            className="history-replay-start-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Start Time Travel</span>
        </button>
        <p className="history-replay-start-hint">
          Replay {events.length} events from this card's history
        </p>
      </div>
    )
  }

  return (
    <div className={cn('history-replay', className)}>
      {/* Current Event Display */}
      <div className="history-replay-current-event">
        <div className="history-replay-event-icon">
          {currentEvent && getEventIcon(currentEvent.type)}
        </div>
        <div className="history-replay-event-info">
          <div className="history-replay-event-description">
            {currentEvent && formatEventDescription(currentEvent)}
          </div>
          <div className="history-replay-event-meta">
            <span className="history-replay-event-index">
              Event {replayState.currentIndex + 1} of {replayState.totalEvents}
            </span>
            <span className="history-replay-event-time">
              {currentEvent && currentEvent.timestamp.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="history-replay-progress-container">
        <input
          type="range"
          className="history-replay-progress-slider"
          min="0"
          max={replayState.totalEvents - 1}
          value={replayState.currentIndex}
          onChange={(e) => onGoToEvent(parseInt(e.target.value))}
        />
        <div
          className="history-replay-progress-fill"
          style={{ width: `${progress}%` }}
        />
        {/* Event markers on timeline */}
        <div className="history-replay-progress-markers">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                'history-replay-progress-marker',
                index === replayState.currentIndex && 'active'
              )}
              style={{
                left: `${(index / (replayState.totalEvents - 1)) * 100}%`,
              }}
              onClick={() => onGoToEvent(index)}
              title={formatEventDescription(event)}
            />
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="history-replay-controls">
        {/* Previous Button */}
        <button
          className="history-replay-control-btn"
          onClick={onPrevious}
          disabled={!replayState.canGoBack}
          title="Previous event (←)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          className="history-replay-control-btn history-replay-control-play"
          onClick={onTogglePlayback}
          title={replayState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {replayState.isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Next Button */}
        <button
          className="history-replay-control-btn"
          onClick={onNext}
          disabled={!replayState.canGoForward}
          title="Next event (→)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        {/* Speed Control */}
        <div className="history-replay-speed">
          <label className="history-replay-speed-label">Speed:</label>
          <div className="history-replay-speed-buttons">
            {speeds.map((speed) => (
              <button
                key={speed}
                className={cn(
                  'history-replay-speed-btn',
                  replayState.speed === speed && 'active'
                )}
                onClick={() => onSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Stop Button */}
        <button
          className="history-replay-control-btn history-replay-stop"
          onClick={onStopReplay}
          title="Stop replay (Esc)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="history-replay-shortcuts">
        <span className="history-replay-shortcut">
          <kbd>Space</kbd> Play/Pause
        </span>
        <span className="history-replay-shortcut">
          <kbd>←</kbd> Previous
        </span>
        <span className="history-replay-shortcut">
          <kbd>→</kbd> Next
        </span>
        <span className="history-replay-shortcut">
          <kbd>Esc</kbd> Stop
        </span>
      </div>

      {/* Card State Preview */}
      <div className="history-replay-card-preview">
        <div className="history-replay-card-preview-header">
          <span className="history-replay-card-preview-title">
            Card State at This Point
          </span>
          <span className="history-replay-card-preview-time">
            {currentEvent && currentEvent.timestamp.toLocaleDateString()}
          </span>
        </div>
        <div className="history-replay-card-preview-content">
          <div className="history-replay-card-preview-field">
            <span className="history-replay-card-preview-label">Title:</span>
            <span className="history-replay-card-preview-value">
              {replayState.cardState.title}
            </span>
          </div>
          {replayState.cardState.description && (
            <div className="history-replay-card-preview-field">
              <span className="history-replay-card-preview-label">Description:</span>
              <span className="history-replay-card-preview-value">
                {replayState.cardState.description}
              </span>
            </div>
          )}
          <div className="history-replay-card-preview-field">
            <span className="history-replay-card-preview-label">Priority:</span>
            <span className="history-replay-card-preview-value">
              {replayState.cardState.priority || 'None'}
            </span>
          </div>
          {replayState.cardState.labels && replayState.cardState.labels.length > 0 && (
            <div className="history-replay-card-preview-field">
              <span className="history-replay-card-preview-label">Labels:</span>
              <div className="history-replay-card-preview-labels">
                {replayState.cardState.labels.map((label) => (
                  <span key={label} className="history-replay-card-preview-label-tag">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
