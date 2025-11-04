# Vanilla JS Adapter Example

## Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>Asakaa Board - Vanilla JS</title>
  <style>
    .board {
      padding: 20px;
    }
    .board-title {
      font-size: 24px;
      margin-bottom: 20px;
    }
    .columns {
      display: flex;
      gap: 20px;
      overflow-x: auto;
    }
    .column {
      min-width: 300px;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .column-header h2 {
      font-size: 18px;
      margin: 0;
    }
    .card-count {
      background: #666;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card {
      background: white;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      cursor: pointer;
    }
    .card:hover {
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .card h3 {
      font-size: 14px;
      margin: 0 0 8px 0;
    }
    .card p {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
    .priority {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 8px;
    }
    .priority-urgent {
      background: #ff4444;
      color: white;
    }
    .priority-high {
      background: #ff8800;
      color: white;
    }
    .priority-medium {
      background: #ffbb00;
      color: black;
    }
    .priority-low {
      background: #44bb44;
      color: white;
    }
  </style>
</head>
<body>
  <div id="board-container"></div>

  <div id="controls" style="padding: 20px;">
    <button onclick="addSampleCard()">Add Sample Card</button>
    <button onclick="addColumn()">Add Column</button>
  </div>

  <script type="module">
    import { BoardController } from '@libxai/core/adapters/vanilla'

    // Initialize the board
    const controller = new BoardController({
      container: document.getElementById('board-container'),
      initialData: {
        board: {
          id: 'board-1',
          title: 'My Project Board',
          columnIds: ['col-1', 'col-2', 'col-3']
        },
        columns: [
          {
            id: 'col-1',
            title: 'To Do',
            position: 0,
            cardIds: []
          },
          {
            id: 'col-2',
            title: 'In Progress',
            position: 1,
            cardIds: []
          },
          {
            id: 'col-3',
            title: 'Done',
            position: 2,
            cardIds: []
          }
        ],
        cards: [
          {
            id: 'card-1',
            title: 'Setup project',
            description: 'Initialize the repository and configure tools',
            position: 0,
            columnId: 'col-1',
            status: 'TODO',
            priority: 'HIGH'
          },
          {
            id: 'card-2',
            title: 'Design database schema',
            description: 'Create ERD and database migration files',
            position: 1,
            columnId: 'col-1',
            status: 'TODO',
            priority: 'MEDIUM'
          }
        ]
      }
    })

    // Listen to events
    controller.on('card:created', (event) => {
      console.log('Card created:', event.data)
    })

    controller.on('card:moved', (event) => {
      console.log('Card moved:', event.data)
    })

    controller.on('column:created', (event) => {
      console.log('Column created:', event.data)
    })

    // Make controller global for button handlers
    window.boardController = controller

    // Add sample card
    window.addSampleCard = function() {
      const cardId = 'card-' + Date.now()
      controller.addCard({
        id: cardId,
        title: 'New Task ' + cardId,
        description: 'This is a sample task',
        position: controller.getCardsByColumn('col-1').length,
        columnId: 'col-1',
        status: 'TODO',
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)]
      })
    }

    // Add column
    window.addColumn = function() {
      const colId = 'col-' + Date.now()
      const columns = controller.getColumns()
      controller.addColumn({
        id: colId,
        title: 'New Column',
        position: columns.length,
        cardIds: []
      })
    }

    // Initial render
    controller.render()
  </script>
</body>
</html>
```

## With Custom Renderers

```typescript
import { BoardController } from '@libxai/core/adapters/vanilla'
import type { BoardState, Column, Card } from '@libxai/core'

const controller = new BoardController({
  container: document.getElementById('board'),
  initialData: {
    // ... your data
  },
  renderers: {
    // Custom board renderer
    renderBoard: (container, state) => {
      container.innerHTML = `
        <div class="custom-board">
          <header>
            <h1>${state.board?.title || 'Untitled Board'}</h1>
            <p>${state.columns.size} columns, ${state.cards.size} cards</p>
          </header>
          <div class="columns-wrapper" id="columns"></div>
        </div>
      `

      // Render columns
      const columnsContainer = container.querySelector('#columns')
      state.columns.forEach(column => {
        const columnEl = document.createElement('div')
        // ... custom column rendering
        columnsContainer.appendChild(columnEl)
      })
    },

    // Custom card renderer
    renderCard: (container, card) => {
      container.className = 'card custom-card'
      container.innerHTML = `
        <div class="card-header">
          <h3>${card.title}</h3>
          ${card.priority ? `<span class="priority">${card.priority}</span>` : ''}
        </div>
        <div class="card-body">
          ${card.description || ''}
        </div>
        <div class="card-footer">
          ${card.assignedUserIds?.length || 0} assignees
        </div>
      `

      // Add event listeners
      container.addEventListener('click', () => {
        console.log('Card clicked:', card.id)
      })
    }
  }
})
```

## Without Auto-Render

```typescript
const controller = new BoardController({
  container: document.getElementById('board'),
  autoRender: false, // Disable automatic rendering
  initialData: {
    // ... your data
  }
})

// Manually render when needed
controller.addCard({
  id: 'card-1',
  title: 'New Card',
  columnId: 'col-1',
  position: 0,
  status: 'TODO'
})

// Render manually
controller.render()
```

## Event-Driven Updates

```typescript
const controller = new BoardController({
  container: document.getElementById('board'),
  initialData: { /* ... */ }
})

// Listen to specific events
const unsubCardCreated = controller.on('card:created', (event) => {
  console.log('New card:', event.data.title)

  // Show notification
  showNotification(`Card "${event.data.title}" created`)
})

controller.on('card:updated', (event) => {
  console.log('Card updated:', event.data)
})

controller.on('card:deleted', (event) => {
  console.log('Card deleted:', event.data)
})

// Listen to all events
controller.onAll((event) => {
  console.log('Event:', event.type, event.data)

  // Log to analytics
  analytics.track(event.type, event.data)
})

// Unsubscribe later
unsubCardCreated()
```

## Drag and Drop Integration

```typescript
import { BoardController } from '@libxai/core/adapters/vanilla'

const controller = new BoardController({
  container: document.getElementById('board'),
  initialData: { /* ... */ },
  renderers: {
    renderCard: (container, card) => {
      container.className = 'card'
      container.setAttribute('draggable', 'true')
      container.innerHTML = `<h3>${card.title}</h3>`

      // Drag start
      container.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('cardId', card.id)
        e.dataTransfer.setData('columnId', card.columnId)
      })
    },

    renderColumn: (container, column, cards) => {
      container.className = 'column'
      container.innerHTML = `
        <h2>${column.title}</h2>
        <div class="cards-container" data-column-id="${column.id}"></div>
      `

      const cardsContainer = container.querySelector('.cards-container')

      // Allow drop
      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault()
      })

      // Handle drop
      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault()

        const cardId = e.dataTransfer.getData('cardId')
        const fromColumnId = e.dataTransfer.getData('columnId')
        const toColumnId = column.id

        if (fromColumnId !== toColumnId) {
          const newPosition = cards.length
          controller.moveCard(cardId, toColumnId, newPosition)
        }
      })

      // Render cards
      cards.forEach(card => {
        const cardEl = document.createElement('div')
        controller.renderCard(cardEl, card)
        cardsContainer.appendChild(cardEl)
      })
    }
  }
})
```

## Integration with Other Libraries

### With jQuery

```javascript
import { BoardController } from '@libxai/core/adapters/vanilla'

const controller = new BoardController({
  container: $('#board')[0],
  initialData: { /* ... */ }
})

// Use jQuery for custom rendering
controller.on('card:created', (event) => {
  const $card = $('<div>')
    .addClass('card')
    .text(event.data.title)
    .click(() => {
      alert(`Card ${event.data.id} clicked`)
    })

  $(`[data-column-id="${event.data.columnId}"]`)
    .find('.cards')
    .append($card)
})
```

### With Alpine.js

```html
<div x-data="boardData()" id="board">
  <template x-for="column in columns" :key="column.id">
    <div class="column">
      <h2 x-text="column.title"></h2>
      <template x-for="card in getCardsForColumn(column.id)" :key="card.id">
        <div class="card" x-text="card.title"></div>
      </template>
    </div>
  </template>
</div>

<script>
import { BoardController } from '@libxai/core/adapters/vanilla'

function boardData() {
  const controller = new BoardController({
    container: document.getElementById('board'),
    autoRender: false,
    initialData: { /* ... */ }
  })

  return {
    controller,
    columns: controller.getColumns(),
    cards: controller.getCards(),

    getCardsForColumn(columnId) {
      return controller.getCardsByColumn(columnId)
    },

    init() {
      controller.onAll(() => {
        this.columns = controller.getColumns()
        this.cards = controller.getCards()
      })
    }
  }
}
</script>
```

## API Reference

### Constructor

```typescript
new BoardController(options: BoardControllerOptions)
```

### Methods

- `getState()`: Get current board state
- `getBoard()`: Get the board
- `getColumns()`: Get all columns
- `getCards()`: Get all cards
- `getCardsByColumn(columnId)`: Get cards in a column
- `addCard(cardData)`: Add a new card
- `updateCard(cardId, changes)`: Update a card
- `deleteCard(cardId)`: Delete a card
- `moveCard(cardId, toColumnId, position)`: Move a card
- `addColumn(columnData)`: Add a new column
- `updateColumn(columnId, changes)`: Update a column
- `deleteColumn(columnId)`: Delete a column
- `on(eventType, handler)`: Subscribe to events
- `onAll(handler)`: Subscribe to all events
- `off(eventType, handler)`: Unsubscribe from events
- `render()`: Manually trigger a render
- `destroy()`: Cleanup and destroy the controller

### Events

- `card:created` - New card created
- `card:updated` - Card updated
- `card:deleted` - Card deleted
- `card:moved` - Card moved to different column
- `column:created` - New column created
- `column:updated` - Column updated
- `column:deleted` - Column deleted
- `board:updated` - Board updated

---

**Generated**: 2025-10-19
**Module**: @libxai/core/adapters/vanilla
**Version**: v0.7.0
