/**
 * Plugin System for AsakaaRuntime
 * @module runtime/Plugin
 */

import type { AsakaaRuntime } from './AsakaaRuntime'
import type { BoardState } from '../store'

/**
 * Plugin context - API available to plugins
 */
export interface PluginContext {
  /**
   * Get runtime instance
   */
  getRuntime(): AsakaaRuntime

  /**
   * Get current board state
   */
  getState(): BoardState

  /**
   * Subscribe to state changes
   *
   * @param callback - State change callback
   * @returns Unsubscribe function
   */
  onStateChange(callback: (state: BoardState) => void): () => void

  /**
   * Subscribe to view changes
   *
   * @param callback - View change callback
   * @returns Unsubscribe function
   */
  onViewChange(callback: (viewId: string) => void): () => void

  /**
   * Store plugin-specific data
   *
   * @param key - Data key
   * @param value - Data value
   */
  setData(key: string, value: any): void

  /**
   * Get plugin-specific data
   *
   * @param key - Data key
   * @returns Stored value
   */
  getData(key: string): any

  /**
   * Remove all event listeners added by this plugin
   */
  removeAllListeners(): void

  /**
   * Log message (only in dev mode)
   */
  log(...args: any[]): void
}

/**
 * Plugin interface
 *
 * Plugins can extend Asakaa functionality without modifying core code.
 *
 * @example
 * ```typescript
 * export const autoSavePlugin: Plugin = {
 *   id: 'auto-save',
 *   name: 'Auto Save',
 *   version: '1.0.0',
 *
 *   install(context) {
 *     context.onStateChange((state) => {
 *       localStorage.setItem('board', JSON.stringify(state))
 *     })
 *     context.log('Auto-save plugin installed')
 *   },
 *
 *   uninstall(context) {
 *     context.removeAllListeners()
 *     context.log('Auto-save plugin uninstalled')
 *   }
 * }
 * ```
 */
export interface Plugin {
  /**
   * Unique plugin identifier
   */
  readonly id: string

  /**
   * Human-readable name
   */
  readonly name: string

  /**
   * Plugin version (semantic versioning)
   */
  readonly version: string

  /**
   * Plugin description
   */
  readonly description?: string

  /**
   * Plugin author
   */
  readonly author?: string

  /**
   * Plugin homepage URL
   */
  readonly homepage?: string

  /**
   * Install the plugin
   *
   * Called when plugin is first installed.
   * Setup event listeners, initialize state, etc.
   *
   * @param context - Plugin context
   */
  install(context: PluginContext): void | Promise<void>

  /**
   * Uninstall the plugin
   *
   * Called when plugin is removed.
   * Cleanup event listeners, remove state, etc.
   *
   * @param context - Plugin context
   */
  uninstall(context: PluginContext): void | Promise<void>

  /**
   * Plugin configuration options
   */
  config?: Record<string, any>

  /**
   * Enable plugin
   *
   * Optional method called when plugin is enabled after being disabled
   */
  enable?(context: PluginContext): void

  /**
   * Disable plugin
   *
   * Optional method called when plugin is temporarily disabled
   */
  disable?(context: PluginContext): void
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  homepage?: string
  installedAt: number
  enabled: boolean
}

/**
 * PluginRegistry
 *
 * Manages plugin installation, uninstallation, and lifecycle.
 */
export class PluginRegistry {
  private plugins = new Map<string, Plugin>()
  private metadata = new Map<string, PluginMetadata>()
  private contexts = new Map<string, PluginContext>()
  private runtime: AsakaaRuntime

  constructor(runtime: AsakaaRuntime) {
    this.runtime = runtime
  }

  /**
   * Install a plugin
   *
   * @param plugin - Plugin to install
   * @throws Error if plugin with same ID already installed
   */
  async install(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin '${plugin.id}' is already installed`)
    }

    // Create plugin context
    const context = this.createContext(plugin.id)

    // Install plugin
    await plugin.install(context)

    // Store plugin and metadata
    this.plugins.set(plugin.id, plugin)
    this.contexts.set(plugin.id, context)
    this.metadata.set(plugin.id, {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      homepage: plugin.homepage,
      installedAt: Date.now(),
      enabled: true,
    })

    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Installed plugin: ${plugin.name} v${plugin.version}`)
    }
  }

  /**
   * Uninstall a plugin
   *
   * @param pluginId - Plugin ID to uninstall
   */
  async uninstall(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' is not installed`)
    }

    const context = this.contexts.get(pluginId)!

    // Uninstall plugin
    await plugin.uninstall(context)

    // Remove plugin data
    this.plugins.delete(pluginId)
    this.contexts.delete(pluginId)
    this.metadata.delete(pluginId)

    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Uninstalled plugin: ${plugin.name}`)
    }
  }

  /**
   * Enable a plugin
   *
   * @param pluginId - Plugin ID to enable
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    const meta = this.metadata.get(pluginId)

    if (!plugin || !meta) {
      throw new Error(`Plugin '${pluginId}' is not installed`)
    }

    if (meta.enabled) {
      return // Already enabled
    }

    const context = this.contexts.get(pluginId)!

    if (plugin.enable) {
      await plugin.enable(context)
    }

    meta.enabled = true

    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Enabled plugin: ${plugin.name}`)
    }
  }

  /**
   * Disable a plugin
   *
   * @param pluginId - Plugin ID to disable
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    const meta = this.metadata.get(pluginId)

    if (!plugin || !meta) {
      throw new Error(`Plugin '${pluginId}' is not installed`)
    }

    if (!meta.enabled) {
      return // Already disabled
    }

    const context = this.contexts.get(pluginId)!

    if (plugin.disable) {
      await plugin.disable(context)
    }

    meta.enabled = false

    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Disabled plugin: ${plugin.name}`)
    }
  }

  /**
   * Check if a plugin is installed
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId)
  }

  /**
   * Get a plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * List all installed plugins
   */
  listPlugins(): PluginMetadata[] {
    return Array.from(this.metadata.values())
  }

  /**
   * Get plugin metadata
   */
  getMetadata(pluginId: string): PluginMetadata | undefined {
    return this.metadata.get(pluginId)
  }

  /**
   * Destroy registry and uninstall all plugins
   */
  async destroy(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys())

    for (const pluginId of pluginIds) {
      await this.uninstall(pluginId)
    }

    this.plugins.clear()
    this.metadata.clear()
    this.contexts.clear()
  }

  /**
   * Create plugin context
   */
  private createContext(pluginId: string): PluginContext {
    const listeners: Array<() => void> = []
    const pluginData = new Map<string, any>()

    return {
      getRuntime: () => this.runtime,

      getState: () => this.runtime.getState(),

      onStateChange: (callback) => {
        const unsubscribe = this.runtime.onStateChange(callback)
        listeners.push(unsubscribe)
        return unsubscribe
      },

      onViewChange: (callback) => {
        const unsubscribe = this.runtime.on('view:changed', ({ viewId }) => {
          callback(viewId)
        })
        listeners.push(unsubscribe)
        return unsubscribe
      },

      setData: (key, value) => {
        pluginData.set(key, value)
      },

      getData: (key) => {
        return pluginData.get(key)
      },

      removeAllListeners: () => {
        listeners.forEach((unsubscribe) => unsubscribe())
        listeners.length = 0
      },

      log: (...args) => {
        if (this.runtime.isDevMode()) {
          console.log(`[Plugin:${pluginId}]`, ...args)
        }
      },
    }
  }
}
