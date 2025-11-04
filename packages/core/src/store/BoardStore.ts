/**
 * BoardStore - Specialized store for board data
 * @module store/BoardStore
 */

import { Store } from './Store'
import { Card, Column, Board } from '../models'
import type { CardData, ColumnData, BoardData, Dependency } from '../types'
import { DependencyEngine } from '../lib/DependencyEngine'

/**
 * Board state structure
 */
export interface BoardState {
  board: Board | null
  columns: Map<string, Column>
  cards: Map<string, Card>
}

/**
 * Specialized store for managing board, columns, and cards
 *
 * @example
 * ```typescript
 * const boardStore = new BoardStore({
 *   board: new Board({ id: 'b1', title: 'Project', columnIds: [] }),
 *   columns: new Map(),
 *   cards: new Map()
 * })
 *
 * // Subscribe to card events
 * boardStore.subscribe('card:created', (event) => {
 *   console.log('New card:', event.data)
 * })
 *
 * // Add a card
 * boardStore.addCard({
 *   id: 'card-1',
 *   title: 'Task 1',
 *   columnId: 'todo',
 *   position: 0
 * })
 * ```
 */
export class BoardStore extends Store<BoardState> {
  private dependencyEngine: DependencyEngine

  constructor(initialState?: Partial<BoardState>) {
    super({
      board: initialState?.board || null,
      columns: initialState?.columns || new Map(),
      cards: initialState?.cards || new Map(),
    })
    this.dependencyEngine = new DependencyEngine()
  }

  // ========================================================================
  // BOARD OPERATIONS
  // ========================================================================

  /**
   * Set the board
   */
  setBoard(boardData: BoardData): void {
    const board = Board.fromData(boardData)

    this.setState(state => ({
      ...state,
      board,
    }))

    this.emit('board:created', board.toData())
  }

  /**
   * Update the board
   */
  updateBoard(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): void {
    this.setState(state => {
      if (!state.board) throw new Error('No board set')

      const updatedBoard = state.board.update(changes)

      return {
        ...state,
        board: updatedBoard,
      }
    })

    this.emit('board:updated', { id: this.getState().board!.id, changes })
  }

  /**
   * Get board
   */
  getBoard(): Board | null {
    return this.getState().board
  }

  // ========================================================================
  // COLUMN OPERATIONS
  // ========================================================================

  /**
   * Add a column
   */
  addColumn(columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>): Column {
    const column = new Column(columnData)

    this.setState(state => {
      const newColumns = new Map(state.columns)
      newColumns.set(column.id, column)

      const updatedBoard = state.board?.addColumn(column.id)

      return {
        ...state,
        columns: newColumns,
        board: updatedBoard || state.board,
      }
    })

    this.emit('column:created', column.toData())

    return column
  }

  /**
   * Update a column
   */
  updateColumn(columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): void {
    this.setState(state => {
      const column = state.columns.get(columnId)
      if (!column) throw new Error(`Column ${columnId} not found`)

      const updatedColumn = column.update(changes)
      const newColumns = new Map(state.columns)
      newColumns.set(columnId, updatedColumn)

      return {
        ...state,
        columns: newColumns,
      }
    })

    this.emit('column:updated', { id: columnId, changes })
  }

  /**
   * Delete a column
   */
  deleteColumn(columnId: string): void {
    this.setState(state => {
      const newColumns = new Map(state.columns)
      newColumns.delete(columnId)

      const updatedBoard = state.board?.removeColumn(columnId)

      return {
        ...state,
        columns: newColumns,
        board: updatedBoard || state.board,
      }
    })

    this.emit('column:deleted', { id: columnId })
  }

  /**
   * Get a column by ID
   */
  getColumn(columnId: string): Column | undefined {
    return this.getState().columns.get(columnId)
  }

  /**
   * Get all columns
   */
  getAllColumns(): Column[] {
    return Array.from(this.getState().columns.values())
  }

  // ========================================================================
  // CARD OPERATIONS
  // ========================================================================

  /**
   * Add a card
   */
  addCard(cardData: Omit<CardData, 'createdAt' | 'updatedAt'>): Card {
    const card = new Card(cardData)

    this.setState(state => {
      const newCards = new Map(state.cards)
      newCards.set(card.id, card)

      // Add card to column
      const column = state.columns.get(card.columnId)
      if (column) {
        const updatedColumn = column.addCard(card.id)
        const newColumns = new Map(state.columns)
        newColumns.set(column.id, updatedColumn)

        return {
          ...state,
          cards: newCards,
          columns: newColumns,
        }
      }

      return {
        ...state,
        cards: newCards,
      }
    })

    this.emit('card:created', card.toData())

    return card
  }

  /**
   * Update a card
   */
  updateCard(cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): void {
    this.setState(state => {
      const card = state.cards.get(cardId)
      if (!card) throw new Error(`Card ${cardId} not found`)

      const updatedCard = card.update(changes)
      const newCards = new Map(state.cards)
      newCards.set(cardId, updatedCard)

      return {
        ...state,
        cards: newCards,
      }
    })

    this.emit('card:updated', { id: cardId, changes })
  }

  /**
   * Delete a card
   */
  deleteCard(cardId: string): void {
    const card = this.getState().cards.get(cardId)
    if (!card) return

    this.setState(state => {
      const newCards = new Map(state.cards)
      newCards.delete(cardId)

      // Remove card from column
      const column = state.columns.get(card.columnId)
      if (column) {
        const updatedColumn = column.removeCard(cardId)
        const newColumns = new Map(state.columns)
        newColumns.set(column.id, updatedColumn)

        return {
          ...state,
          cards: newCards,
          columns: newColumns,
        }
      }

      return {
        ...state,
        cards: newCards,
      }
    })

    this.emit('card:deleted', { id: cardId })
  }

  /**
   * Move a card to another column
   */
  moveCard(cardId: string, toColumnId: string, newPosition: number): void {
    this.setState(state => {
      const card = state.cards.get(cardId)
      if (!card) throw new Error(`Card ${cardId} not found`)

      const fromColumnId = card.columnId

      // Update card
      const updatedCard = card.update({ columnId: toColumnId, position: newPosition })
      const newCards = new Map(state.cards)
      newCards.set(cardId, updatedCard)

      // Update columns
      const newColumns = new Map(state.columns)

      // Remove from old column
      const fromColumn = state.columns.get(fromColumnId)
      if (fromColumn) {
        newColumns.set(fromColumnId, fromColumn.removeCard(cardId))
      }

      // Add to new column
      const toColumn = state.columns.get(toColumnId)
      if (toColumn) {
        newColumns.set(toColumnId, toColumn.addCard(cardId, newPosition))
      }

      return {
        ...state,
        cards: newCards,
        columns: newColumns,
      }
    })

    this.emit('card:moved', {
      id: cardId,
      fromColumnId: this.getState().cards.get(cardId)!.columnId,
      toColumnId,
      newPosition,
    })
  }

  /**
   * Get a card by ID
   */
  getCard(cardId: string): Card | undefined {
    return this.getState().cards.get(cardId)
  }

  /**
   * Get all cards
   */
  getAllCards(): Card[] {
    return Array.from(this.getState().cards.values())
  }

  /**
   * Get cards by column ID
   */
  getCardsByColumn(columnId: string): Card[] {
    const column = this.getColumn(columnId)
    if (!column) return []

    return column.cardIds
      .map(cardId => this.getState().cards.get(cardId))
      .filter((card): card is Card => card !== undefined)
  }

  // ========================================================================
  // DEPENDENCY OPERATIONS
  // ========================================================================

  /**
   * Add a dependency to a card
   *
   * @param cardId - Card to add dependency to
   * @param dependency - Dependency configuration
   * @throws Error if dependency would create a cycle
   */
  addDependency(cardId: string, dependency: Dependency): void {
    const card = this.getCard(cardId)
    if (!card) {
      throw new Error(`Card ${cardId} not found`)
    }

    // Check if dependency task exists
    const depTask = this.getCard(dependency.taskId)
    if (!depTask) {
      throw new Error(`Dependency task ${dependency.taskId} not found`)
    }

    // Check if would create circular dependency
    if (this.dependencyEngine.wouldCreateCycle(this.getAllCards(), cardId, dependency.taskId)) {
      throw new Error(`Adding dependency would create a circular dependency`)
    }

    // Add dependency to card
    const updatedCard = card.addDependency(dependency)
    const newCards = new Map(this.getState().cards)
    newCards.set(cardId, updatedCard)

    this.setState(state => ({
      ...state,
      cards: newCards,
    }))

    this.emit('card:dependency:added', { cardId, dependency })
  }

  /**
   * Remove a dependency from a card
   *
   * @param cardId - Card to remove dependency from
   * @param dependencyTaskId - ID of task to remove dependency for
   */
  removeDependency(cardId: string, dependencyTaskId: string): void {
    const card = this.getCard(cardId)
    if (!card) {
      throw new Error(`Card ${cardId} not found`)
    }

    const updatedCard = card.removeDependency(dependencyTaskId)

    // Only update if changed
    if (updatedCard !== card) {
      const newCards = new Map(this.getState().cards)
      newCards.set(cardId, updatedCard)

      this.setState(state => ({
        ...state,
        cards: newCards,
      }))

      this.emit('card:dependency:removed', { cardId, dependencyTaskId })
    }
  }

  /**
   * Get all dependencies for a card
   *
   * @param cardId - Card ID to get dependencies for
   * @returns Array of cards this card depends on
   */
  getDependencies(cardId: string): Card[] {
    const card = this.getCard(cardId)
    if (!card || !card.dependencies) return []

    const dependentTaskIds = card.getDependentTaskIds()
    return this.getAllCards().filter(c => dependentTaskIds.includes(c.id))
  }

  /**
   * Get all cards that depend on a given card (successors)
   *
   * @param cardId - Card ID to find dependents for
   * @returns Array of cards that depend on this card
   */
  getDependentCards(cardId: string): Card[] {
    return this.dependencyEngine.getSuccessors(this.getAllCards(), cardId)
  }

  /**
   * Validate all dependencies in the board
   *
   * @throws Error if validation fails
   */
  validateDependencies(): void {
    this.dependencyEngine.validateDependencies(this.getAllCards())
  }

  /**
   * Resolve all dependencies and get topological order
   *
   * @returns Dependency resolution result with ordered tasks and critical path
   */
  resolveDependencies() {
    return this.dependencyEngine.resolveDependencies(this.getAllCards())
  }

  /**
   * Get cards in dependency order (dependencies first)
   *
   * @returns Cards sorted in topological order
   */
  getCardsInDependencyOrder(): Card[] {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards())
    return result.orderedTasks
  }

  /**
   * Get critical path task IDs
   *
   * @returns Array of task IDs on the critical path
   */
  getCriticalPath(): string[] {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards())
    return result.criticalPath
  }

  /**
   * Check if a card is on the critical path
   *
   * @param cardId - Card ID to check
   * @returns true if card is on critical path
   */
  isOnCriticalPath(cardId: string): boolean {
    const criticalPath = this.getCriticalPath()
    return criticalPath.includes(cardId)
  }

  /**
   * Update card dates based on dependencies (auto-schedule)
   *
   * This recalculates start dates for all cards based on their dependencies
   */
  autoSchedule(): void {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards())

    // Update each card with its calculated earliest start
    const newCards = new Map(this.getState().cards)

    result.orderedTasks.forEach(task => {
      const earliestStart = result.earliestStarts.get(task.id)
      if (earliestStart && task.startDate) {
        const currentStart = new Date(task.startDate)

        // Only update if calculated start is later than current start
        if (earliestStart > currentStart) {
          const duration = task.getDuration() || 0
          const newEnd = new Date(earliestStart)
          newEnd.setDate(newEnd.getDate() + duration)

          const updatedCard = task.update({
            startDate: earliestStart,
            endDate: newEnd,
          })

          newCards.set(task.id, updatedCard)
        }
      }
    })

    this.setState(state => ({
      ...state,
      cards: newCards,
    }))

    this.emit('cards:auto-scheduled', { count: result.orderedTasks.length })
  }
}
