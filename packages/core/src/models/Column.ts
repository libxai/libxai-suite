/**
 * Column Model - Immutable column entity
 * @module models/Column
 */

import type { ColumnData } from '../types'

/**
 * Immutable Column entity
 *
 * @example
 * ```typescript
 * const column = new Column({
 *   id: 'col-1',
 *   title: 'To Do',
 *   position: 0,
 *   cardIds: []
 * })
 *
 * // Add a card
 * const updated = column.addCard('card-1')
 * ```
 */
export class Column {
  readonly id: string
  readonly title: string
  readonly position: number
  readonly cardIds: readonly string[]
  readonly wipLimit?: number
  readonly wipLimitType?: 'soft' | 'hard'
  readonly color?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(data: Omit<ColumnData, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }) {
    this.id = data.id
    this.title = data.title
    this.position = data.position
    this.cardIds = Object.freeze([...data.cardIds])
    this.wipLimit = data.wipLimit
    this.wipLimitType = data.wipLimitType
    this.color = data.color
    this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : undefined
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()

    // Freeze the instance
    Object.freeze(this)
  }

  /**
   * Create a new Column instance with updated properties
   *
   * @param changes - Partial column data to update
   * @returns New Column instance with applied changes
   */
  update(changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): Column {
    return new Column({
      ...this.toData(),
      ...changes,
      updatedAt: new Date(),
    })
  }

  /**
   * Add a card to the column
   *
   * @param cardId - Card ID to add
   * @param position - Position to insert (default: end)
   * @returns New Column instance with card added
   */
  addCard(cardId: string, position?: number): Column {
    const newCardIds = [...this.cardIds]
    const insertPos = position ?? newCardIds.length

    newCardIds.splice(insertPos, 0, cardId)

    return this.update({ cardIds: newCardIds })
  }

  /**
   * Remove a card from the column
   *
   * @param cardId - Card ID to remove
   * @returns New Column instance with card removed
   */
  removeCard(cardId: string): Column {
    const newCardIds = this.cardIds.filter(id => id !== cardId)
    return this.update({ cardIds: newCardIds })
  }

  /**
   * Move a card within the column
   *
   * @param cardId - Card ID to move
   * @param newPosition - New position
   * @returns New Column instance with card moved
   */
  moveCard(cardId: string, newPosition: number): Column {
    const newCardIds = this.cardIds.filter(id => id !== cardId)
    newCardIds.splice(newPosition, 0, cardId)
    return this.update({ cardIds: newCardIds })
  }

  /**
   * Check if column has a card
   *
   * @param cardId - Card ID to check
   * @returns true if column contains the card
   */
  hasCard(cardId: string): boolean {
    return this.cardIds.includes(cardId)
  }

  /**
   * Get card count
   *
   * @returns Number of cards in the column
   */
  getCardCount(): number {
    return this.cardIds.length
  }

  /**
   * Check if WIP limit is exceeded
   *
   * @returns true if card count exceeds WIP limit
   */
  isWipLimitExceeded(): boolean {
    if (!this.wipLimit) return false
    return this.cardIds.length > this.wipLimit
  }

  /**
   * Check if adding a card would exceed WIP limit
   *
   * @returns true if adding a card would exceed hard limit
   */
  canAddCard(): boolean {
    if (!this.wipLimit || this.wipLimitType !== 'hard') return true
    return this.cardIds.length < this.wipLimit
  }

  /**
   * Convert Column instance to plain data object
   *
   * @returns ColumnData object
   */
  toData(): ColumnData {
    return {
      id: this.id,
      title: this.title,
      position: this.position,
      cardIds: [...this.cardIds],
      wipLimit: this.wipLimit,
      wipLimitType: this.wipLimitType,
      color: this.color,
      metadata: this.metadata ? { ...this.metadata } : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a Column from plain data object
   *
   * @param data - ColumnData object
   * @returns Column instance
   */
  static fromData(data: ColumnData): Column {
    return new Column(data)
  }
}
