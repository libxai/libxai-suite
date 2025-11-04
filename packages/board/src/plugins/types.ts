/**
 * Plugin System Types
 * Extensible plugin architecture for ASAKAA
 * @module plugins/types
 */

import type { Board, Card, Column, BoardCallbacks } from '../types'

export interface PluginContext {
  /** Current board state */
  board: Board
  /** Board callbacks */
  callbacks: BoardCallbacks
  /** Set board state */
  setBoard: (board: Board) => void
  /** Get plugin config */
  getConfig: <T = any>(key: string) => T | undefined
  /** Set plugin config */
  setConfig: (key: string, value: any) => void
}

export interface PluginHooks {
  /** Called when plugin is registered */
  onInit?: (context: PluginContext) => void | Promise<void>
  /** Called when plugin is unregistered */
  onDestroy?: () => void | Promise<void>

  /** Called before board is loaded */
  onBeforeBoardLoad?: (board: Board, context: PluginContext) => Board | Promise<Board>
  /** Called after board is loaded */
  onAfterBoardLoad?: (board: Board, context: PluginContext) => void | Promise<void>

  /** Called before card is created */
  onBeforeCardCreate?: (card: Partial<Card>, context: PluginContext) => Partial<Card> | Promise<Partial<Card>>
  /** Called after card is created */
  onAfterCardCreate?: (card: Card, context: PluginContext) => void | Promise<void>

  /** Called before card is updated */
  onBeforeCardUpdate?: (
    cardId: string,
    updates: Partial<Card>,
    context: PluginContext
  ) => Partial<Card> | Promise<Partial<Card>>
  /** Called after card is updated */
  onAfterCardUpdate?: (card: Card, context: PluginContext) => void | Promise<void>

  /** Called before card is moved */
  onBeforeCardMove?: (
    cardId: string,
    fromColumn: string,
    toColumn: string,
    position: number,
    context: PluginContext
  ) => { toColumn: string; position: number } | Promise<{ toColumn: string; position: number }>
  /** Called after card is moved */
  onAfterCardMove?: (
    cardId: string,
    fromColumn: string,
    toColumn: string,
    context: PluginContext
  ) => void | Promise<void>

  /** Called before card is deleted */
  onBeforeCardDelete?: (cardId: string, context: PluginContext) => boolean | Promise<boolean>
  /** Called after card is deleted */
  onAfterCardDelete?: (cardId: string, context: PluginContext) => void | Promise<void>

  /** Called before column is created */
  onBeforeColumnCreate?: (
    column: Partial<Column>,
    context: PluginContext
  ) => Partial<Column> | Promise<Partial<Column>>
  /** Called after column is created */
  onAfterColumnCreate?: (column: Column, context: PluginContext) => void | Promise<void>

  /** Called before column is deleted */
  onBeforeColumnDelete?: (columnId: string, context: PluginContext) => boolean | Promise<boolean>
  /** Called after column is deleted */
  onAfterColumnDelete?: (columnId: string, context: PluginContext) => void | Promise<void>

  /** Called on board state change */
  onBoardChange?: (board: Board, prevBoard: Board, context: PluginContext) => void | Promise<void>
}

export interface Plugin extends PluginHooks {
  /** Unique plugin identifier */
  id: string
  /** Plugin name */
  name: string
  /** Plugin version */
  version: string
  /** Plugin description */
  description?: string
  /** Plugin author */
  author?: string
  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[]
  /** Plugin configuration schema */
  configSchema?: Record<string, any>
  /** Default configuration */
  defaultConfig?: Record<string, any>
}

export interface IPluginManager {
  /** Register a plugin */
  register(plugin: Plugin): void
  /** Unregister a plugin */
  unregister(pluginId: string): void
  /** Get registered plugin */
  getPlugin(pluginId: string): Plugin | undefined
  /** Get all registered plugins */
  getPlugins(): Plugin[]
  /** Check if plugin is registered */
  hasPlugin(pluginId: string): boolean
  /** Enable/disable plugin */
  setEnabled(pluginId: string, enabled: boolean): void
  /** Check if plugin is enabled */
  isEnabled(pluginId: string): boolean
}
