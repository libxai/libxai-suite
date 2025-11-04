# Integration Guide - @libxai/headless

This guide shows you how to integrate ASAKAA headless hooks into your existing project.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Framework-Specific Integration](#framework-specific-integration)
4. [Advanced Patterns](#advanced-patterns)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)

## Installation

```bash
npm install @libxai/headless @libxai/core
```

## Quick Start

### 1. Initialize Board State

```typescript
import { useBoardState } from '@libxai/headless'

const board = useBoardState({
  initialBoard: {
    id: 'my-board',
    title: 'My Project',
    columnIds: []
  }
})

// Add columns
board.addColumn({ id: 'col-1', title: 'To Do', position: 0 })
board.addColumn({ id: 'col-2', title: 'Done', position: 1 })

// Add cards
board.addCard({ id: 'card-1', title: 'Task 1', columnId: 'col-1', position: 0 })
```

### 2. Handle Drag & Drop

```typescript
import { useCardDrag } from '@libxai/headless'

const drag = useCardDrag({
  onDrop: (cardId, targetColumn, position) => {
    board.moveCard(cardId, targetColumn, position)
  }
})
```

### 3. Manage Selection

```typescript
import { useMultiSelect } from '@libxai/headless'

const selection = useMultiSelect({
  onSelectionChange: (ids) => {
    console.log('Selected:', ids)
  }
})
```

## Framework-Specific Integration

### React Integration

#### Basic Setup

```tsx
import { useBoardState } from '@libxai/headless'
import { useState, useEffect } from 'react'

function BoardComponent() {
  const [board] = useState(() => useBoardState())
  const [cards, setCards] = useState([])

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = board.subscribe((state) => {
      setCards(Array.from(state.cards.values()))
    })

    return () => unsubscribe()
  }, [board])

  return (
    <div>
      {cards.map(card => (
        <div key={card.id}>{card.title}</div>
      ))}
    </div>
  )
}
```

#### Custom Hook Pattern

```tsx
// useBoard.ts
import { useBoardState } from '@libxai/headless'
import { useState, useEffect, useMemo } from 'react'

export function useBoard(initialBoard) {
  const board = useMemo(() => useBoardState({ initialBoard }), [])
  const [state, setState] = useState(() => board.store.getState())

  useEffect(() => {
    const unsubscribe = board.subscribe(setState)
    return () => unsubscribe()
  }, [board])

  return {
    board,
    cards: Array.from(state.cards.values()),
    columns: Array.from(state.columns.values())
  }
}

// Usage
function App() {
  const { board, cards, columns } = useBoard(myBoardData)

  return (
    <Board columns={columns}>
      {cards.map(card => (
        <Card key={card.id} data={card} />
      ))}
    </Board>
  )
}
```

#### With Context API

```tsx
// BoardContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { useBoardState } from '@libxai/headless'

const BoardContext = createContext(null)

export function BoardProvider({ children, initialBoard }) {
  const [board] = useState(() => useBoardState({ initialBoard }))
  const [state, setState] = useState(() => board.store.getState())

  useEffect(() => {
    const unsubscribe = board.subscribe(setState)
    return () => unsubscribe()
  }, [board])

  return (
    <BoardContext.Provider value={{ board, state }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardContext() {
  const context = useContext(BoardContext)
  if (!context) throw new Error('useBoardContext must be used within BoardProvider')
  return context
}

// Usage
function App() {
  return (
    <BoardProvider initialBoard={myBoard}>
      <KanbanBoard />
    </BoardProvider>
  )
}

function KanbanBoard() {
  const { board, state } = useBoardContext()
  // ... use board and state
}
```

### Vue 3 Integration

#### Composition API

```vue
<script setup>
import { useBoardState } from '@libxai/headless'
import { ref, onMounted, onUnmounted } from 'vue'

const board = useBoardState()
const cards = ref([])
const columns = ref([])

let unsubscribe

onMounted(() => {
  unsubscribe = board.subscribe((state) => {
    cards.value = Array.from(state.cards.values())
    columns.value = Array.from(state.columns.values())
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

function addCard(title) {
  board.addCard({
    id: crypto.randomUUID(),
    title,
    columnId: columns.value[0].id,
    position: cards.value.length
  })
}
</script>

<template>
  <div class="board">
    <div v-for="column in columns" :key="column.id">
      <h2>{{ column.title }}</h2>
      <div v-for="card in cards.filter(c => c.columnId === column.id)" :key="card.id">
        {{ card.title }}
      </div>
    </div>
    <button @click="addCard('New Task')">Add Card</button>
  </div>
</template>
```

#### Composable Pattern

```typescript
// composables/useBoard.ts
import { useBoardState } from '@libxai/headless'
import { ref, onMounted, onUnmounted } from 'vue'

export function useBoard(initialBoard) {
  const board = useBoardState({ initialBoard })
  const cards = ref([])
  const columns = ref([])

  let unsubscribe

  onMounted(() => {
    unsubscribe = board.subscribe((state) => {
      cards.value = Array.from(state.cards.values())
      columns.value = Array.from(state.columns.values())
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return {
    board,
    cards,
    columns
  }
}
```

### Svelte Integration

```svelte
<script>
  import { useBoardState } from '@libxai/headless'
  import { onMount, onDestroy } from 'svelte'

  let board = useBoardState()
  let cards = []
  let columns = []
  let unsubscribe

  onMount(() => {
    unsubscribe = board.subscribe((state) => {
      cards = Array.from(state.cards.values())
      columns = Array.from(state.columns.values())
    })
  })

  onDestroy(() => {
    unsubscribe?.()
  })

  function addCard(title) {
    board.addCard({
      id: crypto.randomUUID(),
      title,
      columnId: columns[0].id,
      position: cards.length
    })
  }
</script>

<div class="board">
  {#each columns as column (column.id)}
    <div class="column">
      <h2>{column.title}</h2>
      {#each cards.filter(c => c.columnId === column.id) as card (card.id)}
        <div class="card">{card.title}</div>
      {/each}
    </div>
  {/each}
  <button on:click={() => addCard('New Task')}>Add Card</button>
</div>
```

## Advanced Patterns

### Custom State Management

```typescript
import { useBoardState } from '@libxai/headless'

// Wrap with custom state management
class BoardManager {
  private board = useBoardState()
  private listeners = new Set()

  constructor(initialBoard) {
    this.board = useBoardState({ initialBoard })

    // Subscribe to internal changes
    this.board.subscribe(() => {
      this.notifyListeners()
    })
  }

  // Custom methods
  addCardToFirstColumn(title) {
    const columns = this.board.getAllColumns()
    if (columns.length > 0) {
      const cards = this.board.getCardsByColumn(columns[0].id)
      this.board.addCard({
        id: crypto.randomUUID(),
        title,
        columnId: columns[0].id,
        position: cards.length
      })
    }
  }

  // Observer pattern
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const state = this.board.store.getState()
    this.listeners.forEach(listener => listener(state))
  }
}

// Usage
const manager = new BoardManager(myBoard)
manager.subscribe(state => console.log('State changed:', state))
manager.addCardToFirstColumn('New Task')
```

### Undo/Redo Pattern

```typescript
class UndoableBoardState {
  private board = useBoardState()
  private history = []
  private currentIndex = -1

  execute(action) {
    // Execute action
    action(this.board)

    // Save state
    const state = this.board.store.getState()
    this.history = this.history.slice(0, this.currentIndex + 1)
    this.history.push(state)
    this.currentIndex++
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--
      const previousState = this.history[this.currentIndex]
      this.restoreState(previousState)
    }
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      const nextState = this.history[this.currentIndex]
      this.restoreState(nextState)
    }
  }

  private restoreState(state) {
    // Restore board state
    // Implementation depends on your needs
  }
}
```

### Middleware Pattern

```typescript
function withLogging(board) {
  return new Proxy(board, {
    get(target, prop) {
      const value = target[prop]
      if (typeof value === 'function') {
        return function(...args) {
          console.log(`Calling ${prop} with:`, args)
          const result = value.apply(target, args)
          console.log(`Result:`, result)
          return result
        }
      }
      return value
    }
  })
}

const board = withLogging(useBoardState())
board.addCard({ ... }) // Logs automatically
```

## Migration Guide

### From Redux

```typescript
// Before (Redux)
const mapStateToProps = state => ({
  cards: state.board.cards,
  columns: state.board.columns
})

const mapDispatchToProps = {
  addCard,
  moveCard
}

// After (Headless)
const board = useBoardState()
const cards = board.getAllCards()
const columns = board.getAllColumns()

board.addCard({ ... })
board.moveCard(cardId, columnId, position)
```

### From Custom State Management

```typescript
// Before
class BoardState {
  private cards = []
  private columns = []

  addCard(card) {
    this.cards.push(card)
    this.notifyListeners()
  }
}

// After
const board = useBoardState()

board.addCard({ ... }) // Built-in notifications
board.subscribe(state => {
  // React to changes
})
```

## Best Practices

### 1. Initialize Once

```typescript
// ✅ Good - Initialize once
const [board] = useState(() => useBoardState())

// ❌ Bad - Re-initializes on every render
const board = useBoardState()
```

### 2. Subscribe Early

```typescript
// ✅ Good - Subscribe in useEffect
useEffect(() => {
  const unsubscribe = board.subscribe(handleChange)
  return () => unsubscribe()
}, [board])

// ❌ Bad - Subscribe directly in render
board.subscribe(handleChange)
```

### 3. Clean Up Subscriptions

```typescript
// ✅ Good - Clean up
useEffect(() => {
  const unsubscribe = board.subscribe(handleChange)
  return () => unsubscribe()
}, [])

// ❌ Bad - Memory leak
useEffect(() => {
  board.subscribe(handleChange)
}, [])
```

### 4. Use Derived State

```typescript
// ✅ Good - Derive from state
const todoCards = cards.filter(card => card.columnId === 'todo')

// ❌ Bad - Store derived state
const [todoCards, setTodoCards] = useState([])
```

### 5. Batch Updates

```typescript
// ✅ Good - Batch related updates
function moveMultipleCards(cardIds, targetColumn) {
  cardIds.forEach((cardId, index) => {
    board.moveCard(cardId, targetColumn, index)
  })
}

// Updates will be batched internally
```

## Performance Tips

### Memoize Expensive Computations

```typescript
const criticalPath = useMemo(() => {
  return board.getCriticalPath()
}, [cards, dependencies])
```

### Selective Subscriptions

```typescript
// Subscribe only to what you need
const unsubscribe = board.subscribe((state) => {
  // Only update if cards in this column changed
  const columnCards = Array.from(state.cards.values())
    .filter(card => card.columnId === myColumnId)

  setCards(columnCards)
})
```

### Use Virtual Scrolling for Large Lists

For boards with 1000+ cards, use virtual scrolling:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedCardList({ cards }) {
  const parentRef = useRef()

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100
  })

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <Card key={cards[virtualRow.index].id} data={cards[virtualRow.index]} />
      ))}
    </div>
  )
}
```

## Troubleshooting

### State Not Updating

Make sure you're subscribed correctly:

```typescript
useEffect(() => {
  const unsubscribe = board.subscribe((state) => {
    // This should be called on every change
    console.log('State updated:', state)
  })

  return () => unsubscribe()
}, [board])
```

### Memory Leaks

Always unsubscribe when component unmounts:

```typescript
useEffect(() => {
  const unsubscribe = board.subscribe(handleChange)
  return () => unsubscribe() // Important!
}, [])
```

### TypeScript Errors

Make sure you have the correct types imported:

```typescript
import type { BoardData, CardData, ColumnData } from '@libxai/core'
import type { UseBoardStateReturn } from '@libxai/headless'
```

## Next Steps

- See [README.md](./README.md) for API documentation
- Check [examples/](./examples/) for complete implementations
- Visit [@libxai/board](../board) for pre-built React components

## Support

- 📖 [Documentation](https://asakaa.dev/docs)
- 💬 [Discord](https://discord.gg/asakaa)
- 🐛 [Issues](https://github.com/Yesid8/asakaa/issues)
