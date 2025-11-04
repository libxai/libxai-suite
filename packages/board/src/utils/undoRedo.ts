/**
 * Undo/Redo System with Command Pattern
 * @module utils/undoRedo
 */

import { logger } from './logger'
import type { Board } from '../types'

export interface Command {
  /** Unique command ID */
  id: string
  /** Command type/name */
  type: string
  /** Execute the command */
  execute: () => void | Promise<void>
  /** Undo the command */
  undo: () => void | Promise<void>
  /** Command metadata */
  metadata?: Record<string, any>
  /** Timestamp */
  timestamp: number
}

export interface UndoRedoOptions {
  /** Maximum history size (default: 50) */
  maxHistory?: number
  /** Enable batching of commands (default: true) */
  enableBatching?: boolean
  /** Batch timeout in ms (default: 300) */
  batchTimeout?: number
  /** Callback when history changes */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
}

/**
 * Undo/Redo Manager
 *
 * @example
 * ```ts
 * const undoRedo = new UndoRedoManager()
 *
 * // Execute a command
 * undoRedo.execute({
 *   id: 'move-card-1',
 *   type: 'MOVE_CARD',
 *   execute: () => moveCard(cardId, newColumn),
 *   undo: () => moveCard(cardId, oldColumn),
 *   timestamp: Date.now()
 * })
 *
 * // Undo/Redo
 * undoRedo.undo()
 * undoRedo.redo()
 * ```
 */
export class UndoRedoManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistory: number
  private enableBatching: boolean
  private batchTimeout: number
  private batchTimer: NodeJS.Timeout | null = null
  private batchCommands: Command[] = []
  private onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
  private undoLogger = logger.child('UndoRedo')

  constructor(options: UndoRedoOptions = {}) {
    this.maxHistory = options.maxHistory ?? 50
    this.enableBatching = options.enableBatching ?? true
    this.batchTimeout = options.batchTimeout ?? 300
    this.onHistoryChange = options.onHistoryChange
  }

  /**
   * Execute a command
   */
  async execute(command: Command): Promise<void> {
    try {
      await Promise.resolve(command.execute())

      if (this.enableBatching) {
        this.addToBatch(command)
      } else {
        this.pushToUndoStack(command)
      }

      // Clear redo stack when new command is executed
      this.redoStack = []

      this.undoLogger.debug(`Command executed: ${command.type}`, {
        commandId: command.id,
      })

      this.notifyHistoryChange()
    } catch (error) {
      this.undoLogger.error(`Failed to execute command: ${command.type}`, error as Error, {
        commandId: command.id,
      })
      throw error
    }
  }

  /**
   * Undo last command
   */
  async undo(): Promise<boolean> {
    if (this.undoStack.length === 0) {
      this.undoLogger.warn('Nothing to undo')
      return false
    }

    // Flush batch first
    this.flushBatch()

    const command = this.undoStack.pop()!

    try {
      await Promise.resolve(command.undo())

      this.redoStack.push(command)

      this.undoLogger.info(`Command undone: ${command.type}`, {
        commandId: command.id,
      })

      this.notifyHistoryChange()
      return true
    } catch (error) {
      // Restore command to undo stack on failure
      this.undoStack.push(command)

      this.undoLogger.error(`Failed to undo command: ${command.type}`, error as Error, {
        commandId: command.id,
      })

      return false
    }
  }

  /**
   * Redo last undone command
   */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) {
      this.undoLogger.warn('Nothing to redo')
      return false
    }

    const command = this.redoStack.pop()!

    try {
      await Promise.resolve(command.execute())

      this.undoStack.push(command)

      this.undoLogger.info(`Command redone: ${command.type}`, {
        commandId: command.id,
      })

      this.notifyHistoryChange()
      return true
    } catch (error) {
      // Restore command to redo stack on failure
      this.redoStack.push(command)

      this.undoLogger.error(`Failed to redo command: ${command.type}`, error as Error, {
        commandId: command.id,
      })

      return false
    }
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0 || this.batchCommands.length > 0
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get undo stack
   */
  getUndoStack(): Command[] {
    return [...this.undoStack]
  }

  /**
   * Get redo stack
   */
  getRedoStack(): Command[] {
    return [...this.redoStack]
  }

  /**
   * Clear history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.batchCommands = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    this.undoLogger.info('History cleared')
    this.notifyHistoryChange()
  }

  /**
   * Get history size
   */
  getHistorySize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    }
  }

  /**
   * Add command to batch
   */
  private addToBatch(command: Command): void {
    this.batchCommands.push(command)

    // Reset batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch()
    }, this.batchTimeout)
  }

  /**
   * Flush batched commands
   */
  private flushBatch(): void {
    if (this.batchCommands.length === 0) {
      return
    }

    if (this.batchCommands.length === 1) {
      // Single command, add directly
      this.pushToUndoStack(this.batchCommands[0]!)
    } else {
      // Multiple commands, create batch command
      const batchCommand = this.createBatchCommand(this.batchCommands)
      this.pushToUndoStack(batchCommand)
    }

    this.batchCommands = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
  }

  /**
   * Create batch command from multiple commands
   */
  private createBatchCommand(commands: Command[]): Command {
    return {
      id: `batch-${Date.now()}`,
      type: 'BATCH',
      execute: async () => {
        for (const cmd of commands) {
          await Promise.resolve(cmd.execute())
        }
      },
      undo: async () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          await Promise.resolve(commands[i]!.undo())
        }
      },
      metadata: {
        commands: commands.map((cmd) => ({
          id: cmd.id,
          type: cmd.type,
        })),
        count: commands.length,
      },
      timestamp: Date.now(),
    }
  }

  /**
   * Push command to undo stack
   */
  private pushToUndoStack(command: Command): void {
    this.undoStack.push(command)

    // Limit stack size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }
  }

  /**
   * Notify history change
   */
  private notifyHistoryChange(): void {
    if (this.onHistoryChange) {
      this.onHistoryChange(this.canUndo(), this.canRedo())
    }
  }
}

/**
 * Create board state command
 */
export function createBoardCommand(
  type: string,
  prevBoard: Board,
  nextBoard: Board,
  setBoard: (board: Board) => void
): Command {
  return {
    id: `${type}-${Date.now()}`,
    type,
    execute: () => setBoard(nextBoard),
    undo: () => setBoard(prevBoard),
    metadata: {
      prevBoardId: prevBoard.id,
      nextBoardId: nextBoard.id,
    },
    timestamp: Date.now(),
  }
}

/**
 * Global undo/redo manager instance
 */
export const undoRedoManager = new UndoRedoManager()
