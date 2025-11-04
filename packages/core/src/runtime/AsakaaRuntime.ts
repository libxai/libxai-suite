/**
 * AsakaaRuntime - Universal runtime for Asakaa project management
 * @module runtime/AsakaaRuntime
 *
 * The core orchestrator that manages:
 * - State (BoardStore)
 * - Views (ViewRegistry)
 * - Plugins (PluginRegistry)
 * - Serialization (Import/Export)
 * - Lazy loading
 */

import { BoardStore } from '../store/BoardStore'
import { ViewRegistry } from '../views/ViewRegistry'
import { PluginRegistry } from './Plugin'
import type { ViewAdapter, ViewOptions } from '../views/ViewAdapter'
import type { Plugin } from './Plugin'
import type { BoardState } from '../store'
import type { BoardData, CardData, ColumnData } from '../types'

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  /**
   * Initial board data
   */
  initialData?: {
    board?: BoardData
    columns?: ColumnData[]
    cards?: CardData[]
  }

  /**
   * Enable development mode
   * @default false
   */
  devMode?: boolean

  /**
   * Enable performance monitoring
   * @default false
   */
  enablePerfMonitoring?: boolean

  /**
   * Default view to activate
   * @default 'kanban'
   */
  defaultView?: string

  /**
   * Auto-save configuration
   */
  autoSave?: {
    enabled: boolean
    interval: number // milliseconds
    storage?: 'localStorage' | 'sessionStorage' | 'custom'
    key?: string
  }
}

/**
 * Runtime events
 */
export type RuntimeEvent =
  | 'runtime:initialized'
  | 'runtime:destroyed'
  | 'runtime:error'
  | 'state:changed'
  | 'view:changed'
  | 'plugin:installed'
  | 'plugin:uninstalled'

/**
 * Runtime event data
 */
export interface RuntimeEventData {
  'runtime:initialized': { timestamp: number; config: RuntimeConfig }
  'runtime:destroyed': { timestamp: number }
  'runtime:error': { error: Error; context?: string }
  'state:changed': { state: BoardState }
  'view:changed': { viewId: string; timestamp: number }
  'plugin:installed': { pluginId: string }
  'plugin:uninstalled': { pluginId: string }
}

/**
 * Runtime event callback
 */
export type RuntimeEventCallback<K extends RuntimeEvent> = (data: RuntimeEventData[K]) => void

/**
 * Serialization format
 */
export type SerializationFormat = 'json' | 'binary' | 'msgpack'

/**
 * Serialized board data structure
 */
export interface SerializedBoardData {
  board: BoardData | null
  columns: ColumnData[]
  cards: CardData[]
}

/**
 * AsakaaRuntime
 *
 * The universal runtime that orchestrates all Asakaa functionality.
 * This is the main entry point for using Asakaa in any framework.
 *
 * @example
 * ```typescript
 * // Create runtime
 * const runtime = new AsakaaRuntime({
 *   initialData: { board, columns, cards },
 *   defaultView: 'kanban'
 * })
 *
 * // Register views
 * runtime.registerView(new KanbanView())
 * runtime.registerView(new GanttView())
 *
 * // Activate a view
 * await runtime.activateView('kanban', container)
 *
 * // Switch views
 * await runtime.switchView('gantt')
 *
 * // Listen to state changes
 * runtime.on('state:changed', ({ state }) => {
 *   console.log('State updated:', state)
 * })
 * ```
 */
export class AsakaaRuntime {
  private store: BoardStore
  private viewRegistry: ViewRegistry
  private pluginRegistry: PluginRegistry
  private config: RuntimeConfig
  private listeners = new Map<RuntimeEvent, Set<RuntimeEventCallback<any>>>()
  private autoSaveInterval: NodeJS.Timeout | null = null
  private isDestroyed = false

  // Performance monitoring
  private perfMarks = new Map<string, number>()

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      devMode: false,
      enablePerfMonitoring: false,
      defaultView: 'kanban',
      ...config,
    }

    // Initialize store
    this.store = this.initializeStore(config.initialData)

    // Initialize view registry
    this.viewRegistry = new ViewRegistry()

    // Initialize plugin registry (needs runtime instance, so using 'this')
    this.pluginRegistry = new PluginRegistry(this)

    // Setup state change listener
    this.store.subscribeAll(() => {
      this.emit('state:changed', { state: this.store.getState() })
    })

    // Setup view change listener
    this.viewRegistry.on('view:switched', ({ toViewId, timestamp }) => {
      this.emit('view:changed', { viewId: toViewId, timestamp })
    })

    // Setup auto-save if enabled
    if (this.config.autoSave?.enabled) {
      this.setupAutoSave()
    }

    this.emit('runtime:initialized', { timestamp: Date.now(), config: this.config })

    if (this.config.devMode) {
      console.log('[AsakaaRuntime] Initialized with config:', this.config)
    }
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeStore(initialData?: RuntimeConfig['initialData']): BoardStore {
    const columnsMap = new Map()
    const cardsMap = new Map()
    let board = null

    if (initialData) {
      // Load columns
      if (initialData.columns) {
        const { Column } = require('../models')
        initialData.columns.forEach((colData) => {
          columnsMap.set(colData.id, new Column(colData))
        })
      }

      // Load cards
      if (initialData.cards) {
        const { Card } = require('../models')
        initialData.cards.forEach((cardData) => {
          cardsMap.set(cardData.id, new Card(cardData))
        })
      }

      // Load board
      if (initialData.board) {
        const { Board } = require('../models')
        board = new Board(initialData.board)
      }
    }

    return new BoardStore({
      board,
      columns: columnsMap,
      cards: cardsMap,
    })
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Get the BoardStore instance
   */
  getStore(): BoardStore {
    this.ensureNotDestroyed()
    return this.store
  }

  /**
   * Get current board state
   */
  getState(): BoardState {
    this.ensureNotDestroyed()
    return this.store.getState()
  }

  /**
   * Subscribe to state changes
   *
   * @param callback - State change callback
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: BoardState) => void): () => void {
    this.ensureNotDestroyed()
    return this.store.subscribeAll(() => {
      callback(this.store.getState())
    })
  }

  // ========================================================================
  // VIEW MANAGEMENT
  // ========================================================================

  /**
   * Register a view
   *
   * @param view - View to register
   */
  registerView(view: ViewAdapter): void {
    this.ensureNotDestroyed()
    this.viewRegistry.register(view)

    if (this.config.devMode) {
      console.log(`[AsakaaRuntime] Registered view: ${view.id} (${view.name})`)
    }
  }

  /**
   * Unregister a view
   *
   * @param viewId - View ID to unregister
   */
  unregisterView(viewId: string): void {
    this.ensureNotDestroyed()
    this.viewRegistry.unregister(viewId)

    if (this.config.devMode) {
      console.log(`[AsakaaRuntime] Unregistered view: ${viewId}`)
    }
  }

  /**
   * Activate a view
   *
   * @param viewId - View ID to activate
   * @param container - Container element
   * @param options - View options
   */
  async activateView(
    viewId: string,
    container: HTMLElement,
    options?: ViewOptions
  ): Promise<void> {
    this.ensureNotDestroyed()

    const startTime = this.perfMark('activateView')

    try {
      const data = this.serializeForView()
      await this.viewRegistry.activate(viewId, container, data, options)

      if (this.config.enablePerfMonitoring) {
        const duration = this.perfMeasure('activateView', startTime)
        console.log(`[AsakaaRuntime] View activated in ${duration}ms`)
      }
    } catch (error) {
      this.emit('runtime:error', {
        error: error as Error,
        context: `activateView(${viewId})`,
      })
      throw error
    }
  }

  /**
   * Switch to another view
   *
   * @param viewId - View ID to switch to
   * @param options - View options
   */
  async switchView(viewId: string, options?: ViewOptions): Promise<void> {
    this.ensureNotDestroyed()

    const startTime = this.perfMark('switchView')

    try {
      await this.viewRegistry.switchTo(viewId, options)

      if (this.config.enablePerfMonitoring) {
        const duration = this.perfMeasure('switchView', startTime)
        console.log(`[AsakaaRuntime] View switched in ${duration}ms`)
      }
    } catch (error) {
      this.emit('runtime:error', {
        error: error as Error,
        context: `switchView(${viewId})`,
      })
      throw error
    }
  }

  /**
   * Get current view ID
   */
  getCurrentViewId(): string | null {
    this.ensureNotDestroyed()
    return this.viewRegistry.getCurrentViewId()
  }

  /**
   * List all registered views
   */
  listViews() {
    this.ensureNotDestroyed()
    return this.viewRegistry.listViews()
  }

  /**
   * Update current view with latest data
   */
  updateView(): void {
    this.ensureNotDestroyed()
    const data = this.serializeForView()
    this.viewRegistry.update(data)
  }

  // ========================================================================
  // SERIALIZATION
  // ========================================================================

  /**
   * Serialize runtime state to SerializedBoardData format for views
   */
  private serializeForView(): SerializedBoardData {
    const state = this.store.getState()

    return {
      board: state.board?.toData() || null,
      columns: Array.from(state.columns.values()).map((col) => col.toData()),
      cards: Array.from(state.cards.values()).map((card) => card.toData()),
    }
  }

  /**
   * Export runtime state
   *
   * @param format - Serialization format
   * @returns Serialized data
   */
  async serialize(format: SerializationFormat = 'json'): Promise<string> {
    this.ensureNotDestroyed()

    const data = this.serializeForView()

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)

      case 'binary':
        // Future: Implement binary serialization
        throw new Error('Binary serialization not yet implemented')

      case 'msgpack':
        // Future: Implement MessagePack serialization
        throw new Error('MessagePack serialization not yet implemented')

      default:
        throw new Error(`Unsupported serialization format: ${format}`)
    }
  }

  /**
   * Import data into runtime
   *
   * @param data - Data to import
   * @param format - Data format
   */
  async deserialize(data: string, format: SerializationFormat = 'json'): Promise<void> {
    this.ensureNotDestroyed()

    let boardData: SerializedBoardData

    switch (format) {
      case 'json':
        boardData = JSON.parse(data)
        break

      case 'binary':
        throw new Error('Binary deserialization not yet implemented')

      case 'msgpack':
        throw new Error('MessagePack deserialization not yet implemented')

      default:
        throw new Error(`Unsupported serialization format: ${format}`)
    }

    // Rebuild store with new data
    this.store = this.initializeStore({
      board: boardData.board || undefined,
      columns: boardData.columns,
      cards: boardData.cards,
    })

    // Update view if active
    if (this.viewRegistry.getCurrentViewId()) {
      this.updateView()
    }
  }

  // ========================================================================
  // AUTO-SAVE
  // ========================================================================

  private setupAutoSave(): void {
    if (!this.config.autoSave) return

    const { interval, storage = 'localStorage', key = 'asakaa-board' } = this.config.autoSave

    this.autoSaveInterval = setInterval(async () => {
      try {
        const data = await this.serialize('json')

        if (storage === 'localStorage') {
          localStorage.setItem(key, data)
        } else if (storage === 'sessionStorage') {
          sessionStorage.setItem(key, data)
        }

        if (this.config.devMode) {
          console.log(`[AsakaaRuntime] Auto-saved to ${storage}`)
        }
      } catch (error) {
        console.error('[AsakaaRuntime] Auto-save failed:', error)
      }
    }, interval)
  }

  /**
   * Load data from auto-save storage
   */
  async loadFromAutoSave(): Promise<boolean> {
    if (!this.config.autoSave) return false

    const { storage = 'localStorage', key = 'asakaa-board' } = this.config.autoSave

    try {
      let data: string | null = null

      if (storage === 'localStorage') {
        data = localStorage.getItem(key)
      } else if (storage === 'sessionStorage') {
        data = sessionStorage.getItem(key)
      }

      if (data) {
        await this.deserialize(data, 'json')
        return true
      }

      return false
    } catch (error) {
      console.error('[AsakaaRuntime] Failed to load from auto-save:', error)
      return false
    }
  }

  /**
   * Clear auto-save storage
   */
  clearAutoSave(): void {
    if (!this.config.autoSave) return

    const { storage = 'localStorage', key = 'asakaa-board' } = this.config.autoSave

    if (storage === 'localStorage') {
      localStorage.removeItem(key)
    } else if (storage === 'sessionStorage') {
      sessionStorage.removeItem(key)
    }
  }

  // ========================================================================
  // PLUGIN MANAGEMENT
  // ========================================================================

  /**
   * Install a plugin
   *
   * @param plugin - Plugin to install
   */
  async installPlugin(plugin: Plugin): Promise<void> {
    this.ensureNotDestroyed()
    await this.pluginRegistry.install(plugin)
    this.emit('plugin:installed', { pluginId: plugin.id })
  }

  /**
   * Uninstall a plugin
   *
   * @param pluginId - Plugin ID to uninstall
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    this.ensureNotDestroyed()
    await this.pluginRegistry.uninstall(pluginId)
    this.emit('plugin:uninstalled', { pluginId })
  }

  /**
   * Enable a plugin
   *
   * @param pluginId - Plugin ID to enable
   */
  async enablePlugin(pluginId: string): Promise<void> {
    this.ensureNotDestroyed()
    await this.pluginRegistry.enable(pluginId)
  }

  /**
   * Disable a plugin
   *
   * @param pluginId - Plugin ID to disable
   */
  async disablePlugin(pluginId: string): Promise<void> {
    this.ensureNotDestroyed()
    await this.pluginRegistry.disable(pluginId)
  }

  /**
   * List all installed plugins
   */
  listPlugins() {
    this.ensureNotDestroyed()
    return this.pluginRegistry.listPlugins()
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string) {
    this.ensureNotDestroyed()
    return this.pluginRegistry.getPlugin(pluginId)
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Subscribe to runtime events
   */
  on<K extends RuntimeEvent>(event: K, callback: RuntimeEventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Emit a runtime event
   */
  private emit<K extends RuntimeEvent>(event: K, data: RuntimeEventData[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  // ========================================================================
  // PERFORMANCE MONITORING
  // ========================================================================

  private perfMark(name: string): number {
    if (!this.config.enablePerfMonitoring) return 0
    const time = performance.now()
    this.perfMarks.set(name, time)
    return time
  }

  private perfMeasure(name: string, startTime: number): number {
    if (!this.config.enablePerfMonitoring) return 0
    const duration = performance.now() - startTime
    this.perfMarks.delete(name)
    return duration
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    currentView: string | null
    stateSize: number
    viewCount: number
  } {
    const state = this.getState()

    return {
      currentView: this.getCurrentViewId(),
      stateSize: state.cards.size + state.columns.size,
      viewCount: this.viewRegistry.listViews().length,
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get runtime configuration
   */
  getConfig(): RuntimeConfig {
    return { ...this.config }
  }

  /**
   * Check if runtime is in dev mode
   */
  isDevMode(): boolean {
    return this.config.devMode || false
  }

  /**
   * Check if runtime is destroyed
   */
  isRuntimeDestroyed(): boolean {
    return this.isDestroyed
  }

  private ensureNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Runtime has been destroyed. Create a new instance.')
    }
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Destroy the runtime and cleanup resources
   */
  destroy(): void {
    if (this.isDestroyed) return

    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }

    // Destroy plugin registry (uninstall all plugins)
    this.pluginRegistry.destroy()

    // Deactivate current view
    this.viewRegistry.deactivate()

    // Destroy view registry
    this.viewRegistry.destroy()

    // Clear listeners
    this.listeners.clear()

    // Clear performance marks
    this.perfMarks.clear()

    this.isDestroyed = true
    this.emit('runtime:destroyed', { timestamp: Date.now() })

    if (this.config.devMode) {
      console.log('[AsakaaRuntime] Destroyed')
    }
  }
}
