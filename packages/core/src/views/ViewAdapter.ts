/**
 * ViewAdapter - Universal interface for different board views
 * @module views/ViewAdapter
 *
 * This interface allows different visualizations (Kanban, Gantt, TodoList, Table)
 * to work with the same underlying data and runtime.
 */

import type { BoardData, ColumnData, CardData } from '../types'

/**
 * Serialized board data structure for views
 * Contains the full state needed to render a board
 */
export interface ViewBoardData {
  board: BoardData | null
  columns: ColumnData[]
  cards: CardData[]
}

/**
 * View lifecycle events
 */
export type ViewEvent =
  | 'view:mounted'
  | 'view:unmounted'
  | 'view:updated'
  | 'view:error'
  | 'view:ready'

/**
 * View event callback data
 */
export interface ViewEventData {
  'view:mounted': { viewId: string; timestamp: number }
  'view:unmounted': { viewId: string; timestamp: number }
  'view:updated': { viewId: string; data: ViewBoardData }
  'view:error': { viewId: string; error: Error }
  'view:ready': { viewId: string; renderTime: number }
}

/**
 * View event callback
 */
export type ViewEventCallback<K extends ViewEvent> = (data: ViewEventData[K]) => void

/**
 * View configuration options
 */
export interface ViewOptions {
  /**
   * Enable animations
   * @default true
   */
  animations?: boolean

  /**
   * Enable virtual scrolling
   * @default false
   */
  virtualScrolling?: boolean

  /**
   * Theme
   * @default 'dark'
   */
  theme?: 'dark' | 'light' | 'neutral'

  /**
   * Readonly mode (no interactions)
   * @default false
   */
  readonly?: boolean

  /**
   * Custom CSS classes
   */
  className?: string

  /**
   * Custom inline styles
   */
  style?: Record<string, string>

  /**
   * View-specific options
   */
  [key: string]: any
}

/**
 * Export format for views
 */
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'png' | 'svg'

/**
 * ViewAdapter interface
 *
 * All views (Kanban, Gantt, TodoList, Table) must implement this interface
 * to work with the Asakaa runtime.
 *
 * @example
 * ```typescript
 * export class KanbanView implements ViewAdapter<BoardData> {
 *   readonly id = 'kanban'
 *   readonly name = 'Kanban Board'
 *   readonly version = '1.0.0'
 *
 *   mount(container: HTMLElement, data: BoardData): void {
 *     // Render kanban board
 *   }
 *
 *   unmount(): void {
 *     // Cleanup
 *   }
 *
 *   update(data: BoardData): void {
 *     // Update view with new data
 *   }
 * }
 * ```
 */
export interface ViewAdapter<TData = ViewBoardData> {
  /**
   * Unique identifier for this view
   * @example 'kanban', 'gantt', 'todolist', 'table'
   */
  readonly id: string

  /**
   * Human-readable name
   * @example 'Kanban Board', 'Gantt Chart'
   */
  readonly name: string

  /**
   * View version (semantic versioning)
   * @example '1.0.0'
   */
  readonly version?: string

  /**
   * View description
   */
  readonly description?: string

  /**
   * View icon (emoji or icon name)
   * @example '📋', 'kanban-icon'
   */
  readonly icon?: string

  /**
   * Supported export formats
   * @default ['json']
   */
  readonly supportedExports?: ExportFormat[]

  // ========================================================================
  // LIFECYCLE METHODS
  // ========================================================================

  /**
   * Mount the view to a container
   *
   * Called when the view is first activated or when switching views.
   *
   * @param container - DOM element to render into
   * @param data - Initial data to display
   */
  mount(container: HTMLElement, data: TData): void

  /**
   * Unmount the view and cleanup
   *
   * Called when switching to another view or when destroying the runtime.
   * Should cleanup event listeners, timers, and remove DOM elements.
   */
  unmount(): void

  /**
   * Update the view with new data
   *
   * Called when the underlying data changes (card moved, updated, etc).
   * Should efficiently update only what changed.
   *
   * @param data - New data to display
   */
  update(data: TData): void

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  /**
   * Subscribe to view events
   *
   * @param event - Event name
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  on<K extends ViewEvent>(event: K, callback: ViewEventCallback<K>): () => void

  /**
   * Emit a view event
   *
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends ViewEvent>(event: K, data: ViewEventData[K]): void

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  /**
   * Configure the view
   *
   * @param options - View options
   */
  configure(options: ViewOptions): void

  /**
   * Get current configuration
   *
   * @returns Current view options
   */
  getConfig(): ViewOptions

  // ========================================================================
  // EXPORT/IMPORT (Optional)
  // ========================================================================

  /**
   * Export view to specific format
   *
   * @param format - Export format
   * @returns Exported data as string or Blob
   */
  export?(format: ExportFormat): Promise<string | Blob>

  /**
   * Import data into view
   *
   * @param data - Data to import
   * @param format - Data format
   * @returns Imported data
   */
  import?(data: string | Blob, format: ExportFormat): Promise<TData>

  // ========================================================================
  // OPTIONAL FEATURES
  // ========================================================================

  /**
   * Destroy the view and free resources
   *
   * Optional method for complex cleanup (WebGL contexts, Workers, etc)
   */
  destroy?(): void

  /**
   * Resize handler
   *
   * Called when container size changes
   */
  onResize?(width: number, height: number): void

  /**
   * Focus handler
   *
   * Called when view gains focus
   */
  onFocus?(): void

  /**
   * Blur handler
   *
   * Called when view loses focus
   */
  onBlur?(): void

  /**
   * Custom render method
   *
   * For framework-specific rendering (React, Vue, Svelte)
   */
  render?(): any
}

/**
 * Base ViewAdapter implementation
 *
 * Provides default implementations for common functionality.
 * Views can extend this class instead of implementing ViewAdapter from scratch.
 *
 * @example
 * ```typescript
 * export class MyCustomView extends BaseViewAdapter<BoardData> {
 *   readonly id = 'my-view'
 *   readonly name = 'My Custom View'
 *
 *   mount(container, data) {
 *     super.mount(container, data)
 *     // Your render logic
 *   }
 * }
 * ```
 */
export abstract class BaseViewAdapter<TData = ViewBoardData> implements ViewAdapter<TData> {
  abstract readonly id: string
  abstract readonly name: string

  readonly version = '1.0.0'
  readonly description = ''
  readonly icon = ''
  readonly supportedExports: ExportFormat[] = ['json']

  protected container: HTMLElement | null = null
  protected data: TData | null = null
  protected options: ViewOptions = {
    animations: true,
    virtualScrolling: false,
    theme: 'dark',
    readonly: false,
  }

  private listeners = new Map<ViewEvent, Set<ViewEventCallback<any>>>()

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  mount(container: HTMLElement, data: TData): void {
    this.container = container
    this.data = data
    this.emit('view:mounted', { viewId: this.id, timestamp: Date.now() })
  }

  unmount(): void {
    // Emit before clearing listeners
    this.emit('view:unmounted', { viewId: this.id, timestamp: Date.now() })

    if (this.container) {
      this.container.innerHTML = ''
      this.container = null
    }
    this.data = null
    this.listeners.clear()
  }

  update(data: TData): void {
    this.data = data
    this.emit('view:updated', { viewId: this.id, data: data as any })
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  on<K extends ViewEvent>(event: K, callback: ViewEventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  emit<K extends ViewEvent>(event: K, data: ViewEventData[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  configure(options: ViewOptions): void {
    this.options = { ...this.options, ...options }
  }

  getConfig(): ViewOptions {
    return { ...this.options }
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Check if view is mounted
   */
  protected isMounted(): boolean {
    return this.container !== null && this.data !== null
  }

  /**
   * Get container dimensions
   */
  protected getContainerSize(): { width: number; height: number } {
    if (!this.container) {
      return { width: 0, height: 0 }
    }
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    }
  }

  /**
   * Apply theme classes to container
   */
  protected applyTheme(): void {
    if (!this.container) return

    const themeClass = `asakaa-theme-${this.options.theme}`
    this.container.classList.add('asakaa-view', themeClass)
  }

  /**
   * Cleanup theme classes
   */
  protected cleanupTheme(): void {
    if (!this.container) return

    this.container.classList.remove(
      'asakaa-view',
      'asakaa-theme-dark',
      'asakaa-theme-light',
      'asakaa-theme-neutral'
    )
  }
}
