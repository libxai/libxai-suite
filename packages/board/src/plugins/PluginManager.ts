/**
 * Plugin Manager Implementation
 * Manages plugin lifecycle and execution
 * @module plugins/PluginManager
 */

import type { Plugin, PluginContext, IPluginManager } from './types'
import { logger } from '../utils/logger'

export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private enabled: Set<string> = new Set()
  private config: Map<string, Record<string, any>> = new Map()
  private context: PluginContext | null = null
  private pluginLogger = logger.child('PluginManager')

  /**
   * Set plugin context (board state, callbacks, etc.)
   */
  setContext(context: PluginContext): void {
    this.context = context
  }

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    // Validate plugin
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('Plugin must have id, name, and version')
    }

    if (this.plugins.has(plugin.id)) {
      this.pluginLogger.warn(`Plugin ${plugin.id} is already registered, overwriting...`)
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const depId of plugin.dependencies) {
        if (!this.plugins.has(depId)) {
          throw new Error(`Plugin ${plugin.id} depends on ${depId} which is not registered`)
        }
      }
    }

    // Store plugin
    this.plugins.set(plugin.id, plugin)

    // Set default config
    if (plugin.defaultConfig) {
      this.config.set(plugin.id, { ...plugin.defaultConfig })
    }

    // Enable by default
    this.enabled.add(plugin.id)

    this.pluginLogger.info(`Plugin registered: ${plugin.name} v${plugin.version}`)

    // Call onInit hook
    if (plugin.onInit && this.context) {
      Promise.resolve(plugin.onInit(this.context)).catch((error) => {
        this.pluginLogger.error(`Failed to initialize plugin ${plugin.id}`, error, {
          plugin: plugin.id,
        })
      })
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)

    if (!plugin) {
      this.pluginLogger.warn(`Plugin ${pluginId} is not registered`)
      return
    }

    // Call onDestroy hook
    if (plugin.onDestroy) {
      Promise.resolve(plugin.onDestroy()).catch((error) => {
        this.pluginLogger.error(`Failed to destroy plugin ${pluginId}`, error)
      })
    }

    this.plugins.delete(pluginId)
    this.enabled.delete(pluginId)
    this.config.delete(pluginId)

    this.pluginLogger.info(`Plugin unregistered: ${plugin.name}`)
  }

  /**
   * Get registered plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId)
  }

  /**
   * Enable/disable plugin
   */
  setEnabled(pluginId: string, enabled: boolean): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`)
    }

    if (enabled) {
      this.enabled.add(pluginId)
      this.pluginLogger.info(`Plugin enabled: ${pluginId}`)
    } else {
      this.enabled.delete(pluginId)
      this.pluginLogger.info(`Plugin disabled: ${pluginId}`)
    }
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.enabled.has(pluginId)
  }

  /**
   * Get plugin config
   */
  getConfig<T = any>(pluginId: string, key: string): T | undefined {
    const config = this.config.get(pluginId)
    return config?.[key] as T | undefined
  }

  /**
   * Set plugin config
   */
  setConfig(pluginId: string, key: string, value: any): void {
    if (!this.config.has(pluginId)) {
      this.config.set(pluginId, {})
    }

    const config = this.config.get(pluginId)!
    config[key] = value

    this.pluginLogger.debug(`Plugin config set: ${pluginId}.${key}`, { value })
  }

  /**
   * Execute plugin hooks
   */
  async executeHook<T = any>(
    hookName: keyof Plugin,
    args: any[],
    defaultValue?: T
  ): Promise<T | undefined> {
    let result: T | undefined = defaultValue

    for (const plugin of this.plugins.values()) {
      if (!this.enabled.has(plugin.id)) {
        continue
      }

      const hook = plugin[hookName] as any

      if (typeof hook === 'function') {
        try {
          const hookResult = await Promise.resolve(hook.apply(plugin, args))

          // For transform hooks, use the result as input for next plugin
          if (hookResult !== undefined) {
            result = hookResult
            args[0] = hookResult // Update first argument for next plugin
          }
        } catch (error) {
          this.pluginLogger.error(`Plugin hook failed: ${plugin.id}.${hookName}`, error as Error, {
            plugin: plugin.id,
            hook: hookName,
          })
        }
      }
    }

    return result
  }

  /**
   * Execute plugin hooks in parallel
   */
  async executeHookParallel(hookName: keyof Plugin, args: any[]): Promise<void> {
    const promises: Promise<any>[] = []

    for (const plugin of this.plugins.values()) {
      if (!this.enabled.has(plugin.id)) {
        continue
      }

      const hook = plugin[hookName] as any

      if (typeof hook === 'function') {
        promises.push(
          Promise.resolve(hook.apply(plugin, args)).catch((error) => {
            this.pluginLogger.error(`Plugin hook failed: ${plugin.id}.${hookName}`, error as Error, {
              plugin: plugin.id,
              hook: hookName,
            })
          })
        )
      }
    }

    await Promise.all(promises)
  }
}

/**
 * Global plugin manager instance
 */
export const pluginManager = new PluginManager()
