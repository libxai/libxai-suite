/**
 * useCardHistory Hook
 * Manages card history tracking and time-travel replay functionality
 * @module hooks/useCardHistory
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Card } from '../types'
import type {
  CardHistoryEvent,
  HistoryFilter,
  ReplayState,
  HistoryConfig,
  CardSnapshot,
  HistoryStats,
  CardHistoryEventType,
} from '../types/card-history'
import { DEFAULT_HISTORY_CONFIG, createHistoryEvent } from '../types/card-history'

export interface UseCardHistoryProps {
  /** Card to track history for */
  card: Card
  /** Optional custom configuration */
  config?: Partial<HistoryConfig>
  /** Callback when card state changes during replay */
  onReplayStateChange?: (cardState: Card) => void
}

export interface UseCardHistoryResult {
  /** All history events for this card */
  events: CardHistoryEvent[]
  /** Filtered events based on current filter */
  filteredEvents: CardHistoryEvent[]
  /** Current filter settings */
  filter: HistoryFilter
  /** Set filter */
  setFilter: (filter: HistoryFilter) => void
  /** Clear filter */
  clearFilter: () => void
  /** Current replay state */
  replayState: ReplayState | null
  /** Start replay from beginning */
  startReplay: () => void
  /** Stop replay and return to current state */
  stopReplay: () => void
  /** Play/pause replay */
  togglePlayback: () => void
  /** Go to specific event index */
  goToEvent: (index: number) => void
  /** Go to previous event */
  previousEvent: () => void
  /** Go to next event */
  nextEvent: () => void
  /** Set playback speed */
  setSpeed: (speed: number) => void
  /** Add a new event to history */
  addEvent: (
    type: CardHistoryEventType,
    userId: string,
    changes: Record<string, { from: any; to: any }>,
    metadata?: CardHistoryEvent['metadata']
  ) => void
  /** Get card snapshot at specific event */
  getSnapshot: (eventId: string) => CardSnapshot | null
  /** Get history statistics */
  stats: HistoryStats
  /** Clear all history */
  clearHistory: () => void
  /** Export history as JSON */
  exportHistory: () => string
  /** Import history from JSON */
  importHistory: (json: string) => void
}

/**
 * Hook for managing card history and time-travel
 */
export function useCardHistory({
  card,
  config: customConfig,
  onReplayStateChange,
}: UseCardHistoryProps): UseCardHistoryResult {
  const config = useMemo(
    () => ({ ...DEFAULT_HISTORY_CONFIG, ...customConfig }),
    [customConfig]
  )

  // All events for this card
  const [events, setEvents] = useState<CardHistoryEvent[]>(() => {
    if (config.persistToStorage) {
      const stored = localStorage.getItem(`${config.storagePrefix}-${card.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return parsed.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }))
        } catch (e) {
          console.error('Failed to parse stored history:', e)
        }
      }
    }
    return []
  })

  // Filter settings
  const [filter, setFilter] = useState<HistoryFilter>({})

  // Replay state
  const [replayState, setReplayState] = useState<ReplayState | null>(null)

  // Auto-save interval ref
  const autoSaveRef = useRef<NodeJS.Timeout>()

  // Playback interval ref
  const playbackRef = useRef<NodeJS.Timeout>()

  // Persist to localStorage when events change
  useEffect(() => {
    if (!config.persistToStorage) return

    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current)
    }

    autoSaveRef.current = setTimeout(() => {
      localStorage.setItem(
        `${config.storagePrefix}-${card.id}`,
        JSON.stringify(events)
      )
    }, config.autoSaveInterval)

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current)
      }
    }
  }, [events, card.id, config.persistToStorage, config.storagePrefix, config.autoSaveInterval])

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter((e) => filter.types!.includes(e.type))
    }

    if (filter.users && filter.users.length > 0) {
      filtered = filtered.filter((e) => filter.users!.includes(e.userId))
    }

    if (filter.dateRange) {
      filtered = filtered.filter(
        (e) =>
          e.timestamp >= filter.dateRange!.start &&
          e.timestamp <= filter.dateRange!.end
      )
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase()
      filtered = filtered.filter((e) => {
        const searchableText = `
          ${e.type}
          ${JSON.stringify(e.changes)}
          ${JSON.stringify(e.metadata)}
        `.toLowerCase()
        return searchableText.includes(term)
      })
    }

    return filtered
  }, [events, filter])

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({})
  }, [])

  // Add event to history
  const addEvent = useCallback(
    (
      type: CardHistoryEventType,
      userId: string,
      changes: Record<string, { from: any; to: any }>,
      metadata?: CardHistoryEvent['metadata']
    ) => {
      if (!config.enabled) return

      const event = createHistoryEvent(card.id, type, userId, changes, metadata)

      setEvents((prev) => {
        const updated = [...prev, event]
        // Limit events if max exceeded
        if (updated.length > config.maxEventsPerCard) {
          return updated.slice(updated.length - config.maxEventsPerCard)
        }
        return updated
      })
    },
    [card.id, config.enabled, config.maxEventsPerCard]
  )

  // Reconstruct card state at specific event index
  const reconstructCardState = useCallback(
    (targetIndex: number): Card => {
      let reconstructed = { ...card }

      // Apply each event up to targetIndex
      for (let i = 0; i <= targetIndex && i < events.length; i++) {
        const event = events[i]
        Object.entries(event.changes).forEach(([key, change]) => {
          ;(reconstructed as any)[key] = change.to
        })
      }

      return reconstructed
    },
    [card, events]
  )

  // Start replay
  const startReplay = useCallback(() => {
    if (events.length === 0) return

    const initialState = reconstructCardState(0)
    setReplayState({
      currentIndex: 0,
      isPlaying: false,
      speed: 1,
      cardState: initialState,
      totalEvents: events.length,
      canGoBack: false,
      canGoForward: events.length > 1,
    })

    onReplayStateChange?.(initialState)
  }, [events, reconstructCardState, onReplayStateChange])

  // Stop replay
  const stopReplay = useCallback(() => {
    if (playbackRef.current) {
      clearInterval(playbackRef.current)
    }
    setReplayState(null)
    onReplayStateChange?.(card)
  }, [card, onReplayStateChange])

  // Go to specific event
  const goToEvent = useCallback(
    (index: number) => {
      if (!replayState || index < 0 || index >= events.length) return

      const newState = reconstructCardState(index)
      setReplayState({
        ...replayState,
        currentIndex: index,
        cardState: newState,
        canGoBack: index > 0,
        canGoForward: index < events.length - 1,
      })

      onReplayStateChange?.(newState)
    },
    [replayState, events, reconstructCardState, onReplayStateChange]
  )

  // Previous event
  const previousEvent = useCallback(() => {
    if (replayState && replayState.canGoBack) {
      goToEvent(replayState.currentIndex - 1)
    }
  }, [replayState, goToEvent])

  // Next event
  const nextEvent = useCallback(() => {
    if (replayState && replayState.canGoForward) {
      goToEvent(replayState.currentIndex + 1)
    }
  }, [replayState, goToEvent])

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (!replayState) return

    setReplayState((prev) => {
      if (!prev) return null
      return { ...prev, isPlaying: !prev.isPlaying }
    })
  }, [replayState])

  // Set playback speed
  const setSpeed = useCallback((speed: number) => {
    setReplayState((prev) => {
      if (!prev) return null
      return { ...prev, speed }
    })
  }, [])

  // Auto-advance when playing
  useEffect(() => {
    if (!replayState || !replayState.isPlaying) {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
      }
      return
    }

    const interval = 1000 / replayState.speed

    playbackRef.current = setInterval(() => {
      setReplayState((prev) => {
        if (!prev || !prev.isPlaying) return prev

        if (!prev.canGoForward) {
          // Reached end, stop playing
          return { ...prev, isPlaying: false }
        }

        const nextIndex = prev.currentIndex + 1
        const newState = reconstructCardState(nextIndex)

        onReplayStateChange?.(newState)

        return {
          ...prev,
          currentIndex: nextIndex,
          cardState: newState,
          canGoBack: nextIndex > 0,
          canGoForward: nextIndex < events.length - 1,
        }
      })
    }, interval)

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current)
      }
    }
  }, [replayState?.isPlaying, replayState?.speed, events.length, reconstructCardState, onReplayStateChange])

  // Get snapshot at specific event
  const getSnapshot = useCallback(
    (eventId: string): CardSnapshot | null => {
      const index = events.findIndex((e) => e.id === eventId)
      if (index === -1) return null

      const cardState = reconstructCardState(index)
      return {
        timestamp: events[index].timestamp,
        cardState,
        eventId,
        index,
      }
    },
    [events, reconstructCardState]
  )

  // Calculate statistics
  const stats = useMemo((): HistoryStats => {
    if (events.length === 0) {
      return {
        totalEvents: 0,
        eventsByType: {} as Record<CardHistoryEventType, number>,
        eventsByUser: {},
        avgEventsPerDay: 0,
        timeInColumns: {},
      }
    }

    const eventsByType: Record<string, number> = {}
    const eventsByUser: Record<string, number> = {}
    const timeInColumns: Record<string, number> = {}

    events.forEach((event) => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1

      // Count by user
      eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1

      // Track time in columns for 'moved' events
      if (event.type === 'moved' && event.metadata?.toColumn) {
        // This is simplified - would need more sophisticated tracking
        timeInColumns[event.metadata.toColumn] =
          (timeInColumns[event.metadata.toColumn] || 0) + 1
      }
    })

    const firstEvent = events[0].timestamp
    const lastEvent = events[events.length - 1].timestamp
    const daysDiff = Math.max(
      1,
      (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      totalEvents: events.length,
      eventsByType: eventsByType as Record<CardHistoryEventType, number>,
      eventsByUser,
      firstEvent,
      lastEvent,
      avgEventsPerDay: events.length / daysDiff,
      timeInColumns,
    }
  }, [events])

  // Clear history
  const clearHistory = useCallback(() => {
    setEvents([])
    if (config.persistToStorage) {
      localStorage.removeItem(`${config.storagePrefix}-${card.id}`)
    }
  }, [card.id, config.persistToStorage, config.storagePrefix])

  // Export history
  const exportHistory = useCallback(() => {
    return JSON.stringify(events, null, 2)
  }, [events])

  // Import history
  const importHistory = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json)
      const imported = parsed.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }))
      setEvents(imported)
    } catch (e) {
      console.error('Failed to import history:', e)
    }
  }, [])

  return {
    events,
    filteredEvents,
    filter,
    setFilter,
    clearFilter,
    replayState,
    startReplay,
    stopReplay,
    togglePlayback,
    goToEvent,
    previousEvent,
    nextEvent,
    setSpeed,
    addEvent,
    getSnapshot,
    stats,
    clearHistory,
    exportHistory,
    importHistory,
  }
}
