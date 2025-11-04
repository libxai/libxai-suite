/**
 * Performance Benchmarks for @libxai/board
 * @module __benchmarks__/performance
 *
 * Run with: npm run bench
 */

import { describe, bench } from 'vitest'
import { Card, Column, Board } from '@libxai/core'
import type { CardData, ColumnData, BoardData } from '@libxai/core'
import { BoardStore } from '@libxai/core'

// ============================================================================
// Test Data Generators
// ============================================================================

function generateCard(id: string, columnId: string, position: number): CardData {
  return {
    id,
    title: `Card ${id}`,
    description: `Description for card ${id}`,
    position,
    columnId,
    priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)] as any,
    status: 'TODO',
    assignedUserIds: [`user-${Math.floor(Math.random() * 10)}`],
    labels: [`label-${Math.floor(Math.random() * 5)}`],
    estimatedTime: Math.floor(Math.random() * 40) + 1,
    actualTime: Math.floor(Math.random() * 30),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function generateColumn(id: string, position: number): ColumnData {
  return {
    id,
    title: `Column ${id}`,
    position,
    cardIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function generateBoard(): BoardData {
  return {
    id: 'board-1',
    title: 'Test Board',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function generateTestData(numColumns: number, cardsPerColumn: number) {
  const columns = Array.from({ length: numColumns }, (_, i) =>
    generateColumn(`col-${i}`, i)
  )

  const cards: CardData[] = []
  columns.forEach((col, colIndex) => {
    for (let i = 0; i < cardsPerColumn; i++) {
      const cardId = `card-${colIndex}-${i}`
      cards.push(generateCard(cardId, col.id, i))
      col.cardIds.push(cardId)
    }
  })

  return { board: generateBoard(), columns, cards }
}

// ============================================================================
// Model Benchmarks
// ============================================================================

describe('Model Performance', () => {
  bench('Create 1,000 Card instances', () => {
    const cards = Array.from({ length: 1000 }, (_, i) =>
      new Card(generateCard(`card-${i}`, 'col-1', i))
    )
  })

  bench('Update 1,000 Cards (immutable)', () => {
    const cards = Array.from({ length: 1000 }, (_, i) =>
      new Card(generateCard(`card-${i}`, 'col-1', i))
    )

    cards.forEach(card => {
      card.update({ title: 'Updated Title' })
    })
  })

  bench('Create 100 Column instances', () => {
    const columns = Array.from({ length: 100 }, (_, i) =>
      new Column(generateColumn(`col-${i}`, i))
    )
  })

  bench('Add 100 cards to Column', () => {
    let column = new Column(generateColumn('col-1', 0))

    for (let i = 0; i < 100; i++) {
      column = column.addCard(`card-${i}`)
    }
  })
})

// ============================================================================
// Store Benchmarks
// ============================================================================

describe('Store Performance', () => {
  bench('Initialize store with 100 cards', () => {
    const { board, columns, cards } = generateTestData(5, 20)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })
  })

  bench('Initialize store with 1,000 cards', () => {
    const { board, columns, cards } = generateTestData(10, 100)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })
  })

  bench('Add 100 cards to store', () => {
    const { board, columns } = generateTestData(5, 0)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: new Map(),
    })

    for (let i = 0; i < 100; i++) {
      store.addCard(generateCard(`card-${i}`, columns[0].id, i))
    }
  })

  bench('Update 100 cards in store', () => {
    const { board, columns, cards } = generateTestData(5, 20)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })

    cards.forEach(card => {
      store.updateCard(card.id, { title: 'Updated' })
    })
  })

  bench('Move 100 cards between columns', () => {
    const { board, columns, cards } = generateTestData(5, 20)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })

    const targetColumn = columns[1].id

    cards.forEach((card, i) => {
      store.moveCard(card.id, targetColumn, i)
    })
  })
})

// ============================================================================
// Filtering Benchmarks
// ============================================================================

describe('Filtering Performance', () => {
  const { board, columns, cards } = generateTestData(10, 100) // 1,000 cards

  const cardsArray = cards.map(c => new Card(c))

  bench('Filter 1,000 cards by priority', () => {
    cardsArray.filter(card => card.priority === 'HIGH')
  })

  bench('Filter 1,000 cards by search query', () => {
    const query = 'card-5'
    cardsArray.filter(card =>
      card.title.toLowerCase().includes(query.toLowerCase())
    )
  })

  bench('Filter 1,000 cards by multiple criteria', () => {
    cardsArray.filter(
      card =>
        card.priority === 'HIGH' &&
        card.assignedUserIds?.includes('user-5') &&
        card.labels?.some(label => label.startsWith('label-'))
    )
  })

  bench('Filter 1,000 cards by overdue status', () => {
    cardsArray.filter(card => card.isOverdue())
  })
})

// ============================================================================
// Sorting Benchmarks
// ============================================================================

describe('Sorting Performance', () => {
  const { cards } = generateTestData(10, 100) // 1,000 cards

  const cardsArray = cards.map(c => new Card(c))

  bench('Sort 1,000 cards by title', () => {
    [...cardsArray].sort((a, b) => a.title.localeCompare(b.title))
  })

  bench('Sort 1,000 cards by priority', () => {
    const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    ;[...cardsArray].sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority] : 0
      const bPriority = b.priority ? priorityOrder[b.priority] : 0
      return bPriority - aPriority
    })
  })

  bench('Sort 1,000 cards by position', () => {
    [...cardsArray].sort((a, b) => a.position - b.position)
  })
})

// ============================================================================
// Event System Benchmarks
// ============================================================================

describe('Event System Performance', () => {
  bench('Subscribe 100 listeners to store', () => {
    const { board, columns, cards } = generateTestData(5, 20)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })

    const unsubscribers: (() => void)[] = []

    for (let i = 0; i < 100; i++) {
      const unsub = store.subscribe('card:created', () => {
        // Empty listener
      })
      unsubscribers.push(unsub)
    }

    // Clean up
    unsubscribers.forEach(unsub => unsub())
  })

  bench('Emit 100 events to 10 listeners', () => {
    const { board, columns, cards } = generateTestData(5, 20)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })

    // Add 10 listeners
    const unsubscribers: (() => void)[] = []
    for (let i = 0; i < 10; i++) {
      const unsub = store.subscribeAll(() => {
        // Empty listener
      })
      unsubscribers.push(unsub)
    }

    // Emit 100 events
    for (let i = 0; i < 100; i++) {
      store.addCard(generateCard(`card-${i}`, columns[0].id, i))
    }

    // Clean up
    unsubscribers.forEach(unsub => unsub())
  })
})

// ============================================================================
// Large Dataset Benchmarks (10,000 cards)
// ============================================================================

describe('Large Dataset Performance (10,000 cards)', () => {
  bench('Initialize store with 10,000 cards', () => {
    const { board, columns, cards } = generateTestData(20, 500) // 10,000 cards

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })
  })

  bench('Filter 10,000 cards by priority', () => {
    const { cards } = generateTestData(20, 500)
    const cardsArray = cards.map(c => new Card(c))

    cardsArray.filter(card => card.priority === 'HIGH')
  })

  bench('Sort 10,000 cards by priority', () => {
    const { cards } = generateTestData(20, 500)
    const cardsArray = cards.map(c => new Card(c))

    const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    ;[...cardsArray].sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority] : 0
      const bPriority = b.priority ? priorityOrder[b.priority] : 0
      return bPriority - aPriority
    })
  })

  bench('Get cards by column from 10,000 cards', () => {
    const { board, columns, cards } = generateTestData(20, 500)

    const columnsMap = new Map(columns.map(c => [c.id, new Column(c)]))
    const cardsMap = new Map(cards.map(c => [c.id, new Card(c)]))

    const store = new BoardStore({
      board: new Board(board),
      columns: columnsMap,
      cards: cardsMap,
    })

    columns.forEach(column => {
      store.getCardsByColumn(column.id)
    })
  })
})

/**
 * To run benchmarks:
 *
 * ```bash
 * npm run bench
 * ```
 *
 * Expected performance targets:
 * - Card creation: <1ms for 1,000 cards
 * - Store initialization: <50ms for 1,000 cards, <500ms for 10,000 cards
 * - Filtering: <10ms for 1,000 cards, <100ms for 10,000 cards
 * - Sorting: <20ms for 1,000 cards, <200ms for 10,000 cards
 * - Event emission: <1ms per event
 */
