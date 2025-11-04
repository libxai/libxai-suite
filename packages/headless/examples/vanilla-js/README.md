# Vanilla JavaScript Example

This example demonstrates how to use `@libxai/headless` with pure JavaScript without any framework.

## Features

- ✅ Board state management with `useBoardState`
- ✅ Drag & drop with `useCardDrag`
- ✅ Multi-selection with `useMultiSelect`
- ✅ Keyboard shortcuts with `useKeyboardNav`
- ✅ Critical path calculation
- ✅ Real-time statistics

## Running the Example

```bash
# From packages/headless directory
npm run build

# Serve the example
npx serve examples/vanilla-js

# Open http://localhost:3000
```

## Key Concepts

### 1. Initialize Hooks

```javascript
import { useBoardState, useCardDrag, useMultiSelect } from '@libxai/headless'

const board = useBoardState({
  initialBoard: { ... }
})

const selection = useMultiSelect({
  onSelectionChange: (ids) => console.log(ids)
})

const drag = useCardDrag({
  onDrop: (cardId, targetColumn, position) => {
    board.moveCard(cardId, targetColumn, position)
  }
})
```

### 2. Subscribe to Changes

```javascript
board.subscribe((state) => {
  renderBoard()
  updateStats()
})
```

### 3. Render UI

```javascript
function renderBoard() {
  const columns = board.getAllColumns()
  const html = columns.map(column => {
    const cards = board.getCardsByColumn(column.id)
    return `<div class="column">...</div>`
  }).join('')

  document.getElementById('board').innerHTML = html
}
```

### 4. Handle User Interactions

```javascript
// Click to select
cardEl.addEventListener('click', (e) => {
  if (e.ctrlKey) {
    selection.toggle(cardId)
  } else {
    selection.select(cardId)
  }
})

// Drag and drop
cardEl.addEventListener('dragstart', (e) => {
  drag.startDrag(cardId, columnId)
})

cardsEl.addEventListener('drop', (e) => {
  drag.endDrag(targetColumn, position)
})
```

## Keyboard Shortcuts

- `Ctrl+Shift+C` - Add column
- `Ctrl+N` - Add card
- `Ctrl+A` - Select all cards
- `Escape` - Clear selection

## Architecture

```
index.html (UI markup)
    ↓
app.js (Business logic)
    ↓
@libxai/headless (Hooks)
    ↓
@libxai/core (State management)
```

## No Build Step Required

This example works directly in the browser using ES modules. No bundler needed!

## Learn More

- [Headless Documentation](../../README.md)
- [Core API Reference](../../../core/README.md)
