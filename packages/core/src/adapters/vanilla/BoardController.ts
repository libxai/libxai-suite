/**
 * Vanilla JS Board Controller
 * @module adapters/vanilla
 *
 * Framework-agnostic controller for managing board state with DOM manipulation.
 * Can be used with vanilla JavaScript, jQuery, or any framework that doesn't have
 * a reactive state system.
 *
 * @example
 * ```typescript
 * const controller = new BoardController(document.getElementById('board'))
 *
 * controller.initialize({
 *   board: { id: 'board-1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * controller.on('card:created', (card) => {
 *   console.log('New card:', card)
 * })
 *
 * controller.addCard({
 *   id: 'card-1',
 *   title: 'New Task',
 *   columnId: 'col-1',
 *   position: 0,
 *   status: 'TODO'
 * })
 * ```
 */

import { BoardStore, Board, Column, Card } from '../../index'
import type { BoardData, ColumnData, CardData, StoreEvent } from '../../types'
import type { BoardState } from '../../store'

export interface BoardControllerOptions {
  /**
   * Root DOM element for the board
   */
  container: HTMLElement

  /**
   * Initial data
   */
  initialData?: {
    board?: BoardData
    columns?: ColumnData[]
    cards?: CardData[]
  }

  /**
   * Custom renderers
   */
  renderers?: {
    renderBoard?: (container: HTMLElement, state: BoardState) => void
    renderColumn?: (container: HTMLElement, column: Column, cards: Card[]) => void
    renderCard?: (container: HTMLElement, card: Card) => void
  }

  /**
   * Enable auto-render on state changes
   * @default true
   */
  autoRender?: boolean
}

export type EventHandler = (event: StoreEvent) => void

/**
 * Vanilla JS Board Controller
 *
 * Provides a simple API for managing board state without a framework.
 * Handles state management via @libxai/core and provides optional DOM rendering.
 */
export class BoardController {
  private store: BoardStore
  private container: HTMLElement
  private renderers: BoardControllerOptions['renderers']
  private autoRender: boolean
  private eventListeners: Map<string, Set<EventHandler>>

  constructor(options: BoardControllerOptions) {
    this.container = options.container
    this.renderers = options.renderers || {}
    this.autoRender = options.autoRender ?? true
    this.eventListeners = new Map()

    // Initialize store
    const initialState: BoardState = {
      board: null,
      columns: new Map(),
      cards: new Map(),
    }

    if (options.initialData) {
      if (options.initialData.board) {
        initialState.board = new Board(options.initialData.board)
      }
      if (options.initialData.columns) {
        options.initialData.columns.forEach(col => {
          initialState.columns.set(col.id, new Column(col))
        })
      }
      if (options.initialData.cards) {
        options.initialData.cards.forEach(card => {
          initialState.cards.set(card.id, new Card(card))
        })
      }
    }

    this.store = new BoardStore(initialState)

    // Setup auto-render
    if (this.autoRender) {
      this.store.subscribeAll((event) => {
        this.handleStateChange(event)
      })
    }
  }

  /**
   * Get current board state
   */
  getState(): BoardState {
    return this.store.getState()
  }

  /**
   * Get the board
   */
  getBoard(): Board | null {
    return this.store.getBoard()
  }

  /**
   * Get all columns
   */
  getColumns(): Column[] {
    return this.store.getAllColumns()
  }

  /**
   * Get all cards
   */
  getCards(): Card[] {
    return this.store.getAllCards()
  }

  /**
   * Get cards in a specific column
   */
  getCardsByColumn(columnId: string): Card[] {
    return this.store.getCardsByColumn(columnId)
  }

  // ============================================================================
  // Board Operations
  // ============================================================================

  /**
   * Update board
   */
  updateBoard(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): void {
    this.store.updateBoard(changes)
  }

  // ============================================================================
  // Column Operations
  // ============================================================================

  /**
   * Add a new column
   */
  addColumn(columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>): Column {
    return this.store.addColumn(columnData)
  }

  /**
   * Update a column
   */
  updateColumn(columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): void {
    this.store.updateColumn(columnId, changes)
  }

  /**
   * Delete a column
   */
  deleteColumn(columnId: string): void {
    this.store.deleteColumn(columnId)
  }

  /**
   * Get a column by ID
   */
  getColumn(columnId: string): Column | undefined {
    return this.store.getColumn(columnId)
  }

  // ============================================================================
  // Card Operations
  // ============================================================================

  /**
   * Add a new card
   */
  addCard(cardData: Omit<CardData, 'createdAt' | 'updatedAt'>): Card {
    return this.store.addCard(cardData)
  }

  /**
   * Update a card
   */
  updateCard(cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): void {
    this.store.updateCard(cardId, changes)
  }

  /**
   * Delete a card
   */
  deleteCard(cardId: string): void {
    this.store.deleteCard(cardId)
  }

  /**
   * Move a card to a different column
   */
  moveCard(cardId: string, toColumnId: string, newPosition: number): void {
    this.store.moveCard(cardId, toColumnId, newPosition)
  }

  /**
   * Get a card by ID
   */
  getCard(cardId: string): Card | undefined {
    return this.store.getCard(cardId)
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to events
   *
   * @param eventType - Event type to listen for (e.g., 'card:created', 'card:updated')
   * @param handler - Event handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = controller.on('card:created', (event) => {
   *   console.log('Card created:', event.data)
   * })
   *
   * // Later, unsubscribe
   * unsub()
   * ```
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(handler)

    // Also subscribe to store
    const unsubStore = this.store.subscribe(eventType, handler)

    // Return combined unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType)
      if (listeners) {
        listeners.delete(handler)
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType)
        }
      }
      unsubStore()
    }
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    return this.store.subscribeAll(handler)
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, handler: EventHandler): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(handler)
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType)
      }
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  /**
   * Manually trigger a render
   */
  render(): void {
    const state = this.getState()

    if (this.renderers?.renderBoard) {
      this.renderers.renderBoard(this.container, state)
    } else {
      this.defaultRender(state)
    }
  }

  /**
   * Default render implementation
   */
  private defaultRender(state: BoardState): void {
    // Clear container
    this.container.innerHTML = ''

    // Render board
    const boardEl = document.createElement('div')
    boardEl.className = 'board'
    boardEl.setAttribute('data-board-id', state.board?.id || '')

    // Render board title
    if (state.board) {
      const titleEl = document.createElement('h1')
      titleEl.className = 'board-title'
      titleEl.textContent = state.board.title
      boardEl.appendChild(titleEl)
    }

    // Render columns container
    const columnsEl = document.createElement('div')
    columnsEl.className = 'columns'

    // Render each column
    const columns = this.getColumns()
    columns.forEach(column => {
      const columnEl = this.renderColumnElement(column)
      columnsEl.appendChild(columnEl)
    })

    boardEl.appendChild(columnsEl)
    this.container.appendChild(boardEl)
  }

  /**
   * Render a column element
   */
  private renderColumnElement(column: Column): HTMLElement {
    const columnEl = document.createElement('div')
    columnEl.className = 'column'
    columnEl.setAttribute('data-column-id', column.id)

    // Column header
    const headerEl = document.createElement('div')
    headerEl.className = 'column-header'

    const titleEl = document.createElement('h2')
    titleEl.textContent = column.title
    headerEl.appendChild(titleEl)

    const countEl = document.createElement('span')
    countEl.className = 'card-count'
    countEl.textContent = `${column.cardIds.length}`
    headerEl.appendChild(countEl)

    columnEl.appendChild(headerEl)

    // Cards container
    const cardsEl = document.createElement('div')
    cardsEl.className = 'cards'

    // Render cards
    const cards = this.getCardsByColumn(column.id)
    cards.forEach(card => {
      const cardEl = this.renderCardElement(card)
      cardsEl.appendChild(cardEl)
    })

    columnEl.appendChild(cardsEl)

    return columnEl
  }

  /**
   * Render a card element
   */
  private renderCardElement(card: Card): HTMLElement {
    if (this.renderers?.renderCard) {
      const cardEl = document.createElement('div')
      this.renderers.renderCard(cardEl, card)
      return cardEl
    }

    const cardEl = document.createElement('div')
    cardEl.className = 'card'
    cardEl.setAttribute('data-card-id', card.id)

    const titleEl = document.createElement('h3')
    titleEl.textContent = card.title
    cardEl.appendChild(titleEl)

    if (card.description) {
      const descEl = document.createElement('p')
      descEl.textContent = card.description
      cardEl.appendChild(descEl)
    }

    if (card.priority) {
      const priorityEl = document.createElement('span')
      priorityEl.className = `priority priority-${card.priority.toLowerCase()}`
      priorityEl.textContent = card.priority
      cardEl.appendChild(priorityEl)
    }

    return cardEl
  }

  /**
   * Handle state changes
   */
  private handleStateChange(_event: StoreEvent): void {
    if (this.autoRender) {
      this.render()
    }
  }

  /**
   * Destroy the controller and cleanup
   */
  destroy(): void {
    this.eventListeners.clear()
    this.container.innerHTML = ''
  }
}
