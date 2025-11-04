/**
 * ViewRegistry - Manages view registration and switching
 * @module views/ViewRegistry
 */

import type { ViewAdapter, ViewOptions, ViewBoardData } from './ViewAdapter'

/**
 * View registry events
 */
export type ViewRegistryEvent =
  | 'view:registered'
  | 'view:unregistered'
  | 'view:switched'
  | 'view:error'

/**
 * View registry event data
 */
export interface ViewRegistryEventData {
  'view:registered': { viewId: string; view: ViewAdapter }
  'view:unregistered': { viewId: string }
  'view:switched': { fromViewId: string | null; toViewId: string; timestamp: number }
  'view:error': { viewId: string; error: Error }
}

/**
 * View registry event callback
 */
export type ViewRegistryEventCallback<K extends ViewRegistryEvent> = (
  data: ViewRegistryEventData[K]
) => void

/**
 * View metadata
 */
export interface ViewMetadata {
  id: string
  name: string
  version?: string
  description?: string
  icon?: string
  supportedExports?: string[]
  registeredAt: number
  timesActivated: number
  lastActivatedAt: number | null
}

/**
 * ViewRegistry
 *
 * Manages registration, activation, and switching of views.
 *
 * @example
 * ```typescript
 * const registry = new ViewRegistry()
 *
 * // Register views
 * registry.register(new KanbanView())
 * registry.register(new GanttView())
 *
 * // Switch between views
 * await registry.activate('kanban', container, data)
 * await registry.switchTo('gantt') // Smooth transition
 *
 * // Query views
 * const views = registry.listViews()
 * const current = registry.getCurrentView()
 * ```
 */
export class ViewRegistry {
  private views = new Map<string, ViewAdapter>()
  private metadata = new Map<string, ViewMetadata>()
  private currentView: ViewAdapter | null = null
  private currentViewId: string | null = null
  private container: HTMLElement | null = null
  private currentData: ViewBoardData | null = null
  private listeners = new Map<ViewRegistryEvent, Set<ViewRegistryEventCallback<any>>>()

  // ========================================================================
  // REGISTRATION
  // ========================================================================

  /**
   * Register a new view
   *
   * @param view - View to register
   * @throws Error if view with same ID already registered
   */
  register(view: ViewAdapter): void {
    if (this.views.has(view.id)) {
      throw new Error(`View '${view.id}' is already registered`)
    }

    this.views.set(view.id, view)
    this.metadata.set(view.id, {
      id: view.id,
      name: view.name,
      version: view.version,
      description: view.description,
      icon: view.icon,
      supportedExports: view.supportedExports,
      registeredAt: Date.now(),
      timesActivated: 0,
      lastActivatedAt: null,
    })

    this.emit('view:registered', { viewId: view.id, view })
  }

  /**
   * Unregister a view
   *
   * @param viewId - View ID to unregister
   * @throws Error if trying to unregister active view
   */
  unregister(viewId: string): void {
    if (!this.views.has(viewId)) {
      throw new Error(`View '${viewId}' is not registered`)
    }

    if (this.currentViewId === viewId) {
      throw new Error(`Cannot unregister active view '${viewId}'. Switch to another view first.`)
    }

    this.views.delete(viewId)
    this.metadata.delete(viewId)

    this.emit('view:unregistered', { viewId })
  }

  /**
   * Check if a view is registered
   */
  hasView(viewId: string): boolean {
    return this.views.has(viewId)
  }

  /**
   * Get a registered view
   */
  getView(viewId: string): ViewAdapter | undefined {
    return this.views.get(viewId)
  }

  /**
   * List all registered views
   */
  listViews(): ViewMetadata[] {
    return Array.from(this.metadata.values())
  }

  /**
   * Get view metadata
   */
  getMetadata(viewId: string): ViewMetadata | undefined {
    return this.metadata.get(viewId)
  }

  // ========================================================================
  // ACTIVATION & SWITCHING
  // ========================================================================

  /**
   * Activate a view
   *
   * Mounts the view to the container with the provided data.
   *
   * @param viewId - View ID to activate
   * @param container - Container element
   * @param data - Initial data
   * @param options - View options
   * @throws Error if view not found
   */
  async activate(
    viewId: string,
    container: HTMLElement,
    data: ViewBoardData,
    options?: ViewOptions
  ): Promise<void> {
    const view = this.views.get(viewId)
    if (!view) {
      throw new Error(`View '${viewId}' not found`)
    }

    // Deactivate current view if any
    if (this.currentView) {
      this.currentView.unmount()
    }

    // Store container and data
    this.container = container
    this.currentData = data

    // Configure view if options provided
    if (options) {
      view.configure(options)
    }

    // Mount new view
    const startTime = performance.now()
    try {
      view.mount(container, data)

      // Update metadata
      const meta = this.metadata.get(viewId)
      if (meta) {
        meta.timesActivated++
        meta.lastActivatedAt = Date.now()
      }

      // Update current view
      const previousViewId = this.currentViewId
      this.currentView = view
      this.currentViewId = viewId

      // Emit event
      this.emit('view:switched', {
        fromViewId: previousViewId,
        toViewId: viewId,
        timestamp: Date.now(),
      })

      // Emit ready event on view
      const renderTime = performance.now() - startTime
      view.emit('view:ready', { viewId, renderTime })
    } catch (error) {
      this.emit('view:error', { viewId, error: error as Error })
      throw error
    }
  }

  /**
   * Switch to another view
   *
   * Convenience method that unmounts current view and mounts new one.
   * Uses the same container and data as current view.
   *
   * @param viewId - View ID to switch to
   * @param options - Optional view options
   * @throws Error if no view is currently active or if target view not found
   */
  async switchTo(viewId: string, options?: ViewOptions): Promise<void> {
    if (!this.container || !this.currentData) {
      throw new Error('No view is currently active. Use activate() first.')
    }

    await this.activate(viewId, this.container, this.currentData, options)
  }

  /**
   * Update current view with new data
   *
   * @param data - New data
   * @throws Error if no view is active
   */
  update(data: ViewBoardData): void {
    if (!this.currentView) {
      throw new Error('No view is currently active')
    }

    this.currentData = data
    this.currentView.update(data)
  }

  /**
   * Deactivate current view
   */
  deactivate(): void {
    if (this.currentView) {
      this.currentView.unmount()
      this.currentView = null
      this.currentViewId = null
    }
  }

  // ========================================================================
  // STATE QUERIES
  // ========================================================================

  /**
   * Get current active view
   */
  getCurrentView(): ViewAdapter | null {
    return this.currentView
  }

  /**
   * Get current view ID
   */
  getCurrentViewId(): string | null {
    return this.currentViewId
  }

  /**
   * Check if a specific view is active
   */
  isActive(viewId: string): boolean {
    return this.currentViewId === viewId
  }

  /**
   * Get current container
   */
  getContainer(): HTMLElement | null {
    return this.container
  }

  /**
   * Get current data
   */
  getCurrentData(): ViewBoardData | null {
    return this.currentData
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  /**
   * Configure current view
   *
   * @param options - View options
   * @throws Error if no view is active
   */
  configure(options: ViewOptions): void {
    if (!this.currentView) {
      throw new Error('No view is currently active')
    }

    this.currentView.configure(options)
  }

  /**
   * Get current view configuration
   *
   * @throws Error if no view is active
   */
  getConfig(): ViewOptions {
    if (!this.currentView) {
      throw new Error('No view is currently active')
    }

    return this.currentView.getConfig()
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Subscribe to registry events
   */
  on<K extends ViewRegistryEvent>(
    event: K,
    callback: ViewRegistryEventCallback<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Emit a registry event
   */
  private emit<K extends ViewRegistryEvent>(event: K, data: ViewRegistryEventData[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get statistics about views
   */
  getStats(): {
    totalViews: number
    activeViewId: string | null
    mostActivatedView: ViewMetadata | null
    averageActivations: number
  } {
    const metas = Array.from(this.metadata.values())
    const totalActivations = metas.reduce((sum, meta) => sum + meta.timesActivated, 0)

    let mostActivatedView: ViewMetadata | null = null
    let maxActivations = 0

    metas.forEach((meta) => {
      if (meta.timesActivated > maxActivations) {
        maxActivations = meta.timesActivated
        mostActivatedView = meta
      }
    })

    return {
      totalViews: this.views.size,
      activeViewId: this.currentViewId,
      mostActivatedView,
      averageActivations: metas.length > 0 ? totalActivations / metas.length : 0,
    }
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners.clear()
  }

  /**
   * Destroy registry and cleanup
   */
  destroy(): void {
    this.deactivate()
    this.views.clear()
    this.metadata.clear()
    this.listeners.clear()
    this.container = null
    this.currentData = null
  }
}
