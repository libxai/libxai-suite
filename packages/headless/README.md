# @libxai/headless

> Framework-agnostic headless UI hooks for ASAKAA project management

[![License](https://img.shields.io/badge/license-BUSL--1.1-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/badge/bundle-~9KB-green.svg)]()

**@libxai/headless** provides the business logic and state management for ASAKAA without any UI dependencies. Use these hooks with **React, Vue, Svelte, or Vanilla JavaScript** to build custom project management interfaces.

## Why Headless?

Headless UI separates **what** your application does from **how** it looks:

- 🎨 **Full Design Control** - Style components your way
- 🔄 **Framework Agnostic** - Works with any framework
- 📦 **Tree-Shakeable** - Only ~9KB bundled
- 🧪 **Easy Testing** - Test logic without UI
- ♿ **Accessibility First** - You control the markup

Similar to libraries like **Radix UI**, **Headless UI**, and **TanStack Query**.

## Installation

```bash
npm install @libxai/headless @libxai/core
```

## Core Hooks

### `useBoardState`

Complete board state management with CRUD operations.

```typescript
import { useBoardState } from '@libxai/headless'

const board = useBoardState({
  initialBoard: {
    id: 'board-1',
    title: 'My Project',
    columnIds: []
  }
})

// Add a column
const column = board.addColumn({
  id: 'col-1',
  title: 'To Do',
  position: 0,
  boardId: 'board-1'
})

// Add a card
const card = board.addCard({
  id: 'card-1',
  title: 'Implement feature',
  columnId: 'col-1',
  position: 0,
  boardId: 'board-1'
})

// Move card
board.moveCard('card-1', 'col-2', 0)

// Get all cards
const allCards = board.getAllCards()
```

**API:**
- `setBoard(boardData)` - Set board data
- `updateBoard(changes)` - Update board properties
- `getBoard()` - Get current board
- `addColumn(columnData)` - Add column
- `updateColumn(id, changes)` - Update column
- `deleteColumn(id)` - Delete column
- `getAllColumns()` - Get all columns
- `addCard(cardData)` - Add card
- `updateCard(id, changes)` - Update card
- `deleteCard(id)` - Delete card
- `moveCard(id, columnId, position)` - Move card
- `getAllCards()` - Get all cards
- `getCardsByColumn(columnId)` - Get cards in column
- `addDependency(cardId, dependency)` - Add task dependency
- `removeDependency(cardId, taskId)` - Remove dependency
- `getCriticalPath()` - Calculate critical path
- `autoSchedule()` - Auto-schedule tasks

### `useCardDrag`

Drag & drop logic without UI dependencies.

```typescript
import { useCardDrag } from '@libxai/headless'

const drag = useCardDrag({
  onDragStart: (cardId, sourceColumn) => {
    console.log(`Started dragging ${cardId}`)
  },
  onDrop: (cardId, targetColumn, position) => {
    // Update board state
    board.moveCard(cardId, targetColumn, position)
  }
})

// Start dragging
drag.startDrag('card-1', 'col-1')

// Update position
drag.updateDrag({ x: 100, y: 200 })

// Update target column
drag.updateTarget('col-2')

// End drag
drag.endDrag('col-2', 0)

// Or cancel
drag.cancelDrag()
```

**API:**
- `startDrag(cardId, sourceColumn)` - Start dragging
- `updateDrag(position)` - Update cursor position
- `updateTarget(targetColumn)` - Update target column
- `endDrag(targetColumn?, position?)` - End drag
- `cancelDrag()` - Cancel drag
- `isDragging()` - Check if dragging
- `getDraggedCardId()` - Get dragged card
- `getDragState()` - Get complete drag state
- `subscribe(callback)` - Subscribe to changes

### `useMultiSelect`

Multi-selection logic with keyboard modifiers.

```typescript
import { useMultiSelect } from '@libxai/headless'

const selection = useMultiSelect({
  onSelectionChange: (selectedIds) => {
    console.log('Selected cards:', selectedIds)
  }
})

// Select single card
selection.select('card-1')

// Add to selection (Ctrl+Click)
selection.add('card-2')

// Toggle selection
selection.toggle('card-3')

// Select multiple
selection.selectMultiple(['card-1', 'card-2', 'card-3'])

// Clear all
selection.clear()

// Check selection
if (selection.isSelected('card-1')) {
  console.log('Card 1 is selected')
}
```

**API:**
- `select(cardId)` - Select card (replaces selection)
- `add(cardId)` - Add card to selection
- `remove(cardId)` - Remove from selection
- `toggle(cardId)` - Toggle selection
- `selectMultiple(cardIds)` - Select multiple
- `clear()` - Clear all selection
- `isSelected(cardId)` - Check if selected
- `getSelectedCardIds()` - Get selected IDs
- `getCount()` - Get selection count
- `hasSelection()` - Check if any selected
- `subscribe(callback)` - Subscribe to changes

### `useKeyboardNav`

Keyboard shortcuts without framework coupling.

```typescript
import { useKeyboardNav } from '@libxai/headless'

const keyboard = useKeyboardNav()

// Register shortcuts
keyboard.register({
  key: 'n',
  ctrlKey: true,
  handler: (event) => {
    event.preventDefault()
    // Open new card dialog
  },
  description: 'Create new card'
})

keyboard.register({
  key: 'Escape',
  handler: () => {
    // Close dialogs
  },
  description: 'Close dialogs'
})

// Initialize (starts listening)
keyboard.init()

// Cleanup when done
keyboard.destroy()
```

**API:**
- `register(shortcut)` - Register shortcut
- `unregister(key)` - Unregister shortcut
- `init()` - Start listening
- `destroy()` - Stop listening and cleanup
- `getShortcuts()` - Get all shortcuts

## Usage with Different Frameworks

### React

```tsx
import { useBoardState, useCardDrag } from '@libxai/headless'
import { useEffect, useState } from 'react'

function KanbanBoard() {
  const board = useBoardState()
  const [cards, setCards] = useState([])

  useEffect(() => {
    const unsubscribe = board.subscribe((state) => {
      setCards(Array.from(state.cards.values()))
    })
    return unsubscribe
  }, [])

  return (
    <div>
      {cards.map(card => (
        <Card key={card.id} data={card} />
      ))}
    </div>
  )
}
```

### Vue 3

```vue
<script setup>
import { useBoardState } from '@libxai/headless'
import { ref, onMounted, onUnmounted } from 'vue'

const board = useBoardState()
const cards = ref([])

let unsubscribe

onMounted(() => {
  unsubscribe = board.subscribe((state) => {
    cards.value = Array.from(state.cards.values())
  })
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div>
    <Card v-for="card in cards" :key="card.id" :data="card" />
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { useBoardState } from '@libxai/headless'
  import { onMount, onDestroy } from 'svelte'

  const board = useBoardState()
  let cards = []
  let unsubscribe

  onMount(() => {
    unsubscribe = board.subscribe((state) => {
      cards = Array.from(state.cards.values())
    })
  })

  onDestroy(() => {
    unsubscribe?.()
  })
</script>

{#each cards as card (card.id)}
  <Card data={card} />
{/each}
```

### Vanilla JavaScript

```javascript
import { useBoardState } from '@libxai/headless'

const board = useBoardState()

// Subscribe to changes
board.subscribe((state) => {
  const cards = Array.from(state.cards.values())
  renderCards(cards)
})

// Add column
board.addColumn({
  id: 'col-1',
  title: 'To Do',
  position: 0
})

// Add card
board.addCard({
  id: 'card-1',
  title: 'My Task',
  columnId: 'col-1',
  position: 0
})

function renderCards(cards) {
  const container = document.getElementById('board')
  container.innerHTML = cards
    .map(card => `
      <div class="card" data-id="${card.id}">
        <h3>${card.title}</h3>
      </div>
    `)
    .join('')
}
```

## Advanced Features

### Critical Path Method (CPM)

Calculate project critical path for Gantt scheduling:

```typescript
const board = useBoardState()

// Add cards with dependencies
board.addCard({
  id: 'task-1',
  title: 'Design',
  duration: 5
})

board.addCard({
  id: 'task-2',
  title: 'Development',
  duration: 10
})

board.addCard({
  id: 'task-3',
  title: 'Testing',
  duration: 3
})

// Add dependencies
board.addDependency('task-2', {
  taskId: 'task-1',
  type: 'finish-to-start'
})

board.addDependency('task-3', {
  taskId: 'task-2',
  type: 'finish-to-start'
})

// Calculate critical path
const criticalPath = board.getCriticalPath()
console.log('Critical tasks:', criticalPath)

// Check if task is on critical path
const isCritical = board.isOnCriticalPath('task-2')
```

### Auto-Scheduling

Automatically schedule tasks based on dependencies:

```typescript
// Auto-schedule all tasks
board.autoSchedule()

// Get scheduled dates
const cards = board.getAllCards()
cards.forEach(card => {
  console.log(`${card.title}: ${card.startDate} - ${card.endDate}`)
})
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import type {
  BoardState,
  DragState,
  SelectionState,
  UseBoardStateReturn,
  UseCardDragReturn,
  UseMultiSelectReturn
} from '@libxai/headless'
```

## Bundle Size

- **ESM**: ~9KB (minified)
- **CJS**: ~9KB (minified)
- **Tree-shakeable**: Import only what you need

## Architecture

```
@libxai/headless
├── uses → @libxai/core (Pure TypeScript business logic)
└── provides → Framework-agnostic hooks

Your App (React/Vue/Svelte)
├── uses → @libxai/headless
└── provides → Custom UI components
```

## Examples

See `/examples` directory for complete implementations:
- React Kanban Board
- Vue Task Manager
- Svelte Project Planner
- Vanilla JS Dashboard

## Related Packages

- **[@libxai/core](../core)** - Pure TypeScript business logic
- **[@libxai/board](../board)** - React UI components
- **[@libxai/react](../react)** - React-specific hooks (coming soon)

## License

Business Source License 1.1 (BUSL-1.1)

Converts to Apache 2.0 on 2027-10-12

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Support

- 📖 [Documentation](https://asakaa.dev/docs)
- 💬 [Discord Community](https://discord.gg/asakaa)
- 🐛 [Report Issues](https://github.com/Yesid8/asakaa/issues)
