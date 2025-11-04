/**
 * Board Model - Immutable board entity
 * @module models/Board
 */

import type { BoardData, BoardSettings } from '../types'

/**
 * Immutable Board entity
 *
 * @example
 * ```typescript
 * const board = new Board({
 *   id: 'board-1',
 *   title: 'My Project',
 *   columnIds: ['todo', 'in-progress', 'done']
 * })
 *
 * // Add a column
 * const updated = board.addColumn('review')
 * ```
 */
export class Board {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly columnIds: readonly string[]
  readonly settings?: Readonly<BoardSettings>
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(data: Omit<BoardData, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }) {
    this.id = data.id
    this.title = data.title
    this.description = data.description
    this.columnIds = Object.freeze([...data.columnIds])
    this.settings = data.settings ? Object.freeze({ ...data.settings }) : undefined
    this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : undefined
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()

    // Freeze the instance
    Object.freeze(this)
  }

  /**
   * Create a new Board instance with updated properties
   *
   * @param changes - Partial board data to update
   * @returns New Board instance with applied changes
   */
  update(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): Board {
    return new Board({
      ...this.toData(),
      ...changes,
      updatedAt: new Date(),
    })
  }

  /**
   * Add a column to the board
   *
   * @param columnId - Column ID to add
   * @param position - Position to insert (default: end)
   * @returns New Board instance with column added
   */
  addColumn(columnId: string, position?: number): Board {
    const newColumnIds = [...this.columnIds]
    const insertPos = position ?? newColumnIds.length

    newColumnIds.splice(insertPos, 0, columnId)

    return this.update({ columnIds: newColumnIds })
  }

  /**
   * Remove a column from the board
   *
   * @param columnId - Column ID to remove
   * @returns New Board instance with column removed
   */
  removeColumn(columnId: string): Board {
    const newColumnIds = this.columnIds.filter(id => id !== columnId)
    return this.update({ columnIds: newColumnIds })
  }

  /**
   * Reorder columns
   *
   * @param columnIds - New column order
   * @returns New Board instance with columns reordered
   */
  reorderColumns(columnIds: string[]): Board {
    // Validate that all column IDs are present
    if (columnIds.length !== this.columnIds.length) {
      throw new Error('Column IDs length mismatch')
    }

    const sortedExisting = [...this.columnIds].sort()
    const sortedNew = [...columnIds].sort()

    if (JSON.stringify(sortedExisting) !== JSON.stringify(sortedNew)) {
      throw new Error('Column IDs mismatch')
    }

    return this.update({ columnIds })
  }

  /**
   * Move a column to a new position
   *
   * @param columnId - Column ID to move
   * @param newPosition - New position
   * @returns New Board instance with column moved
   */
  moveColumn(columnId: string, newPosition: number): Board {
    const newColumnIds = this.columnIds.filter(id => id !== columnId)
    newColumnIds.splice(newPosition, 0, columnId)
    return this.update({ columnIds: newColumnIds })
  }

  /**
   * Check if board has a column
   *
   * @param columnId - Column ID to check
   * @returns true if board contains the column
   */
  hasColumn(columnId: string): boolean {
    return this.columnIds.includes(columnId)
  }

  /**
   * Get column count
   *
   * @returns Number of columns in the board
   */
  getColumnCount(): number {
    return this.columnIds.length
  }

  /**
   * Get column position
   *
   * @param columnId - Column ID
   * @returns Column position or -1 if not found
   */
  getColumnPosition(columnId: string): number {
    return this.columnIds.indexOf(columnId)
  }

  /**
   * Update board settings
   *
   * @param settings - Partial settings to update
   * @returns New Board instance with settings updated
   */
  updateSettings(settings: Partial<BoardSettings>): Board {
    return this.update({
      settings: {
        ...this.settings,
        ...settings,
      },
    })
  }

  /**
   * Convert Board instance to plain data object
   *
   * @returns BoardData object
   */
  toData(): BoardData {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      columnIds: [...this.columnIds],
      settings: this.settings ? { ...this.settings } : undefined,
      metadata: this.metadata ? { ...this.metadata } : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a Board from plain data object
   *
   * @param data - BoardData object
   * @returns Board instance
   */
  static fromData(data: BoardData): Board {
    return new Board(data)
  }
}
