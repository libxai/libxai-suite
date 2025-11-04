/**
 * CardHistoryTimeline Component
 * Interactive timeline visualization of card history
 * @module components/CardHistory
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import type {
  CardHistoryEvent,
  HistoryFilter,
  TimelineConfig,
  CardHistoryEventType,
} from '../../types/card-history'
import {
  DEFAULT_TIMELINE_CONFIG,
  formatEventDescription,
  getEventIcon,
  getEventColor,
} from '../../types/card-history'
import { cn } from '../../utils'

export interface CardHistoryTimelineProps {
  /** History events to display */
  events: CardHistoryEvent[]
  /** Current filter */
  filter: HistoryFilter
  /** Update filter */
  onFilterChange: (filter: HistoryFilter) => void
  /** Clear filter */
  onClearFilter: () => void
  /** Click on event */
  onEventClick?: (event: CardHistoryEvent) => void
  /** Selected event ID */
  selectedEventId?: string
  /** Timeline configuration */
  config?: Partial<TimelineConfig>
  /** Custom className */
  className?: string
}

/**
 * Timeline component showing card history
 */
export function CardHistoryTimeline({
  events,
  filter,
  onFilterChange,
  onClearFilter,
  onEventClick,
  selectedEventId,
  config: customConfig,
  className,
}: CardHistoryTimelineProps) {
  const config = useMemo(
    () => ({ ...DEFAULT_TIMELINE_CONFIG, ...customConfig }),
    [customConfig]
  )

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)

  // Group events by day if configured
  const groupedEvents = useMemo(() => {
    if (!config.groupByDay) {
      return [{ date: null, events }]
    }

    const groups = new Map<string, CardHistoryEvent[]>()
    events.forEach((event) => {
      const dateKey = event.timestamp.toISOString().split('T')[0]!
      const group = groups.get(dateKey)
      if (!group) {
        groups.set(dateKey, [event])
      } else {
        group.push(event)
      }
    })

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateStr, events]) => ({
        date: new Date(dateStr),
        events: events.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        ),
      }))
  }, [events, config.groupByDay])

  // Get unique users and event types for filter
  const { uniqueUsers, uniqueTypes } = useMemo(() => {
    const users = new Set<string>()
    const types = new Set<CardHistoryEventType>()
    events.forEach((event) => {
      users.add(event.userId)
      types.add(event.type)
    })
    return {
      uniqueUsers: Array.from(users),
      uniqueTypes: Array.from(types),
    }
  }, [events])

  // Toggle event expansion
  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filter.types && filter.types.length > 0) count++
    if (filter.users && filter.users.length > 0) count++
    if (filter.dateRange) count++
    if (filter.searchTerm) count++
    return count
  }, [filter])

  // Scroll to selected event
  useEffect(() => {
    if (selectedEventId && timelineRef.current) {
      const element = timelineRef.current.querySelector(
        `[data-event-id="${selectedEventId}"]`
      )
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedEventId])

  if (events.length === 0) {
    return (
      <div className={cn('history-timeline-empty', className)}>
        <div className="history-timeline-empty-icon">📜</div>
        <p className="history-timeline-empty-text">No history events yet</p>
        <p className="history-timeline-empty-subtext">
          Changes to this card will appear here
        </p>
      </div>
    )
  }

  return (
    <div className={cn('history-timeline', config.compact && 'compact', className)}>
      {/* Filter Bar */}
      <div className="history-timeline-filters">
        <div className="history-timeline-filter-group">
          {/* Event Type Filter */}
          <select
            className="history-timeline-filter-select"
            value={filter.types?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value
              onFilterChange({
                ...filter,
                types: value ? [value as CardHistoryEventType] : undefined,
              })
            }}
          >
            <option value="">All Events</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {getEventIcon(type)} {type.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* User Filter */}
          {uniqueUsers.length > 1 && (
            <select
              className="history-timeline-filter-select"
              value={filter.users?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value
                onFilterChange({
                  ...filter,
                  users: value ? [value] : undefined,
                })
              }}
            >
              <option value="">All Users</option>
              {uniqueUsers.map((userId) => (
                <option key={userId} value={userId}>
                  {userId}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <input
            type="text"
            className="history-timeline-filter-search"
            placeholder="Search history..."
            value={filter.searchTerm || ''}
            onChange={(e) =>
              onFilterChange({ ...filter, searchTerm: e.target.value })
            }
          />
        </div>

        {/* Clear Filter */}
        {activeFilterCount > 0 && (
          <button
            className="history-timeline-filter-clear"
            onClick={onClearFilter}
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="history-timeline-container" ref={timelineRef}>
        {groupedEvents.map((group) => (
          <div key={group.date?.toISOString() || 'all'} className="history-timeline-group">
            {/* Day Header */}
            {config.groupByDay && group.date && (
              <div className="history-timeline-day-header">
                <span className="history-timeline-day-date">
                  {group.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="history-timeline-day-count">
                  {group.events.length} events
                </span>
              </div>
            )}

            {/* Events */}
            <div className="history-timeline-events">
              {group.events.map((event, eventIndex) => {
                const isExpanded = expandedEvents.has(event.id)
                const isSelected = selectedEventId === event.id
                const eventColor = getEventColor(event.type)

                return (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    className={cn(
                      'history-timeline-event',
                      isExpanded && 'expanded',
                      isSelected && 'selected'
                    )}
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* Timeline Line */}
                    <div className="history-timeline-line">
                      {/* Event Dot */}
                      <div
                        className="history-timeline-dot"
                        style={{ backgroundColor: eventColor }}
                      >
                        {config.showIcons && (
                          <span className="history-timeline-dot-icon">
                            {getEventIcon(event.type)}
                          </span>
                        )}
                      </div>

                      {/* Connecting Line */}
                      {eventIndex < group.events.length - 1 && (
                        <div
                          className="history-timeline-connector"
                          style={{ borderColor: eventColor }}
                        />
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="history-timeline-event-content">
                      {/* Header */}
                      <div className="history-timeline-event-header">
                        <div className="history-timeline-event-header-left">
                          {/* User Avatar */}
                          {config.showAvatars && event.userAvatar && (
                            <img
                              src={event.userAvatar}
                              alt={event.userName || event.userId}
                              className="history-timeline-event-avatar"
                            />
                          )}

                          {/* Description */}
                          <div className="history-timeline-event-description">
                            <span className="history-timeline-event-user">
                              {event.userName || event.userId}
                            </span>
                            <span className="history-timeline-event-action">
                              {formatEventDescription(event)}
                            </span>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="history-timeline-event-time">
                          {config.useRelativeTime
                            ? formatRelativeTime(event.timestamp)
                            : event.timestamp.toLocaleString()}
                        </div>
                      </div>

                      {/* Changes Preview */}
                      {Object.keys(event.changes).length > 0 && (
                        <button
                          className="history-timeline-event-toggle"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEvent(event.id)
                          }}
                        >
                          {isExpanded ? '▼' : '▶'} Show changes
                        </button>
                      )}

                      {/* Expanded Changes */}
                      {isExpanded && (
                        <div className="history-timeline-event-changes">
                          {Object.entries(event.changes).map(([key, change]) => (
                            <div key={key} className="history-timeline-event-change">
                              <span className="history-timeline-event-change-key">
                                {key}:
                              </span>
                              <div className="history-timeline-event-change-values">
                                <span className="history-timeline-event-change-from">
                                  {JSON.stringify(change.from)}
                                </span>
                                <span className="history-timeline-event-change-arrow">
                                  →
                                </span>
                                <span className="history-timeline-event-change-to">
                                  {JSON.stringify(change.to)}
                                </span>
                              </div>
                            </div>
                          ))}

                          {/* Metadata */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="history-timeline-event-metadata">
                              <div className="history-timeline-event-metadata-title">
                                Additional Info:
                              </div>
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={key} className="history-timeline-event-metadata-item">
                                  <span className="history-timeline-event-metadata-key">
                                    {key}:
                                  </span>
                                  <span className="history-timeline-event-metadata-value">
                                    {JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
