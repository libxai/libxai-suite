/**
 * User Analytics Integration
 * Generic adapter for PostHog, Mixpanel, Google Analytics, etc.
 * @module utils/analytics
 */

import { logger } from './logger'

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
}

export interface AnalyticsUser {
  id: string
  properties?: Record<string, any>
}

export interface AnalyticsProvider {
  /** Track an event */
  track(event: AnalyticsEvent): void | Promise<void>
  /** Identify a user */
  identify(user: AnalyticsUser): void | Promise<void>
  /** Track page view */
  page?(name: string, properties?: Record<string, any>): void | Promise<void>
  /** Set user properties */
  setUserProperties?(properties: Record<string, any>): void | Promise<void>
}

/**
 * Analytics Manager
 * Supports multiple analytics providers
 */
export class AnalyticsManager {
  private providers: AnalyticsProvider[] = []
  private analyticsLogger = logger.child('Analytics')
  private enabled: boolean = true
  private queue: AnalyticsEvent[] = []
  private isInitialized: boolean = false

  constructor(providers: AnalyticsProvider[] = []) {
    this.providers = providers
  }

  /**
   * Initialize analytics
   */
  initialize(): void {
    this.isInitialized = true

    // Flush queued events
    this.queue.forEach((event) => this.track(event.name, event.properties))
    this.queue = []

    this.analyticsLogger.info('Analytics initialized', {
      providerCount: this.providers.length,
    })
  }

  /**
   * Add analytics provider
   */
  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider)
    this.analyticsLogger.debug('Analytics provider added')
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.analyticsLogger.info(`Analytics ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
    }

    // Queue events if not initialized
    if (!this.isInitialized) {
      this.queue.push(event)
      return
    }

    this.analyticsLogger.debug(`Track event: ${eventName}`, properties)

    // Send to all providers
    this.providers.forEach((provider) => {
      try {
        provider.track(event)
      } catch (error) {
        this.analyticsLogger.error('Failed to track event', error as Error, {
          eventName,
          provider: provider.constructor.name,
        })
      }
    })
  }

  /**
   * Identify user
   */
  identify(userId: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.isInitialized) {
      return
    }

    const user: AnalyticsUser = {
      id: userId,
      properties,
    }

    this.analyticsLogger.debug(`Identify user: ${userId}`, properties)

    this.providers.forEach((provider) => {
      try {
        provider.identify(user)
      } catch (error) {
        this.analyticsLogger.error('Failed to identify user', error as Error, {
          userId,
        })
      }
    })
  }

  /**
   * Track page view
   */
  page(name: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.isInitialized) {
      return
    }

    this.analyticsLogger.debug(`Page view: ${name}`, properties)

    this.providers.forEach((provider) => {
      try {
        provider.page?.(name, properties)
      } catch (error) {
        this.analyticsLogger.error('Failed to track page view', error as Error, {
          name,
        })
      }
    })
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.isInitialized) {
      return
    }

    this.providers.forEach((provider) => {
      try {
        provider.setUserProperties?.(properties)
      } catch (error) {
        this.analyticsLogger.error('Failed to set user properties', error as Error)
      }
    })
  }
}

/**
 * Global analytics instance
 */
export const analytics = new AnalyticsManager()

/**
 * Console Analytics Provider (for debugging)
 */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent): void {
    console.log('[Analytics] Event:', event.name, event.properties)
  }

  identify(user: AnalyticsUser): void {
    console.log('[Analytics] Identify:', user.id, user.properties)
  }

  page(name: string, properties?: Record<string, any>): void {
    console.log('[Analytics] Page:', name, properties)
  }

  setUserProperties(properties: Record<string, any>): void {
    console.log('[Analytics] Set User Properties:', properties)
  }
}

/**
 * PostHog Analytics Provider
 */
export class PostHogProvider implements AnalyticsProvider {
  constructor(private posthog: any) {}

  track(event: AnalyticsEvent): void {
    this.posthog.capture(event.name, event.properties)
  }

  identify(user: AnalyticsUser): void {
    this.posthog.identify(user.id, user.properties)
  }

  page(name: string, properties?: Record<string, any>): void {
    this.posthog.capture('$pageview', { ...properties, name })
  }

  setUserProperties(properties: Record<string, any>): void {
    this.posthog.people?.set(properties)
  }
}

/**
 * Mixpanel Analytics Provider
 */
export class MixpanelProvider implements AnalyticsProvider {
  constructor(private mixpanel: any) {}

  track(event: AnalyticsEvent): void {
    this.mixpanel.track(event.name, event.properties)
  }

  identify(user: AnalyticsUser): void {
    this.mixpanel.identify(user.id)
    if (user.properties) {
      this.mixpanel.people.set(user.properties)
    }
  }

  page(name: string, properties?: Record<string, any>): void {
    this.mixpanel.track('Page View', { ...properties, page: name })
  }

  setUserProperties(properties: Record<string, any>): void {
    this.mixpanel.people.set(properties)
  }
}

/**
 * Google Analytics 4 Provider
 */
export class GoogleAnalyticsProvider implements AnalyticsProvider {
  constructor(private gtag: (...args: any[]) => void) {}

  track(event: AnalyticsEvent): void {
    this.gtag('event', event.name, event.properties)
  }

  identify(user: AnalyticsUser): void {
    this.gtag('set', 'user_properties', {
      user_id: user.id,
      ...user.properties,
    })
  }

  page(name: string, properties?: Record<string, any>): void {
    this.gtag('event', 'page_view', {
      page_title: name,
      ...properties,
    })
  }

  setUserProperties(properties: Record<string, any>): void {
    this.gtag('set', 'user_properties', properties)
  }
}

/**
 * Track Kanban-specific events
 */
export const KanbanAnalytics = {
  /** Track board loaded */
  boardLoaded: (boardId: string, cardCount: number, columnCount: number) => {
    analytics.track('board_loaded', {
      board_id: boardId,
      card_count: cardCount,
      column_count: columnCount,
    })
  },

  /** Track card created */
  cardCreated: (cardId: string, columnId: string) => {
    analytics.track('card_created', {
      card_id: cardId,
      column_id: columnId,
    })
  },

  /** Track card moved */
  cardMoved: (cardId: string, fromColumn: string, toColumn: string) => {
    analytics.track('card_moved', {
      card_id: cardId,
      from_column: fromColumn,
      to_column: toColumn,
    })
  },

  /** Track card updated */
  cardUpdated: (cardId: string, fields: string[]) => {
    analytics.track('card_updated', {
      card_id: cardId,
      updated_fields: fields,
    })
  },

  /** Track card deleted */
  cardDeleted: (cardId: string) => {
    analytics.track('card_deleted', {
      card_id: cardId,
    })
  },

  /** Track column created */
  columnCreated: (columnId: string) => {
    analytics.track('column_created', {
      column_id: columnId,
    })
  },

  /** Track column deleted */
  columnDeleted: (columnId: string, cardCount: number) => {
    analytics.track('column_deleted', {
      column_id: columnId,
      card_count: cardCount,
    })
  },

  /** Track search performed */
  searchPerformed: (query: string, resultCount: number) => {
    analytics.track('search_performed', {
      query,
      result_count: resultCount,
    })
  },

  /** Track filter applied */
  filterApplied: (filterType: string, value: any) => {
    analytics.track('filter_applied', {
      filter_type: filterType,
      value,
    })
  },

  /** Track AI feature used */
  aiFeatureUsed: (feature: string, success: boolean) => {
    analytics.track('ai_feature_used', {
      feature,
      success,
    })
  },

  /** Track performance issue */
  performanceIssue: (metric: string, value: number, threshold: number) => {
    analytics.track('performance_issue', {
      metric,
      value,
      threshold,
    })
  },

  /** Track error occurred */
  errorOccurred: (errorType: string, message: string, component?: string) => {
    analytics.track('error_occurred', {
      error_type: errorType,
      message,
      component,
    })
  },
}
