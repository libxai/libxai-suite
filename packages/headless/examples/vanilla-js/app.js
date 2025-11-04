/**
 * ASAKAA Headless - Vanilla JS Example
 *
 * This example demonstrates how to use @libxai/headless hooks
 * with pure JavaScript without any framework.
 */

import { useBoardState, useCardDrag, useMultiSelect, useKeyboardNav } from '../../dist/index.js'

// Initialize hooks
const board = useBoardState({
  initialBoard: {
    id: 'demo-board',
    title: 'Demo Board',
    description: 'Vanilla JS Demo',
    columnIds: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
})

const selection = useMultiSelect({
  onSelectionChange: (selectedIds) => {
    console.log('Selection changed:', selectedIds)
    updateStats()
    renderBoard()
  }
})

const drag = useCardDrag({
  onDragStart: (cardId) => {
    console.log('Drag started:', cardId)
    updateStats()
  },
  onDragEnd: () => {
    console.log('Drag ended')
    updateStats()
  },
  onDrop: (cardId, targetColumn, position) => {
    console.log('Card dropped:', cardId, targetColumn, position)
    board.moveCard(cardId, targetColumn, position)
  }
})

const keyboard = useKeyboardNav()

// Setup keyboard shortcuts
keyboard.register({
  key: 'c',
  ctrlKey: true,
  shiftKey: true,
  handler: (e) => {
    e.preventDefault()
    addColumn()
  },
  description: 'Add new column'
})

keyboard.register({
  key: 'n',
  ctrlKey: true,
  handler: (e) => {
    e.preventDefault()
    addCard()
  },
  description: 'Add new card'
})

keyboard.register({
  key: 'Escape',
  handler: () => {
    clearSelection()
  },
  description: 'Clear selection'
})

keyboard.register({
  key: 'a',
  ctrlKey: true,
  handler: (e) => {
    e.preventDefault()
    selectAllCards()
  },
  description: 'Select all cards'
})

keyboard.init()

// Subscribe to board changes
board.subscribe((state) => {
  console.log('Board state changed:', state)
  updateStats()
  renderBoard()
})

// Initial setup
function initialize() {
  // Add default columns
  board.addColumn({
    id: 'col-todo',
    title: 'To Do',
    position: 0,
    boardId: 'demo-board'
  })

  board.addColumn({
    id: 'col-progress',
    title: 'In Progress',
    position: 1,
    boardId: 'demo-board'
  })

  board.addColumn({
    id: 'col-done',
    title: 'Done',
    position: 2,
    boardId: 'demo-board'
  })

  // Add sample cards
  board.addCard({
    id: 'card-1',
    title: 'Design System',
    description: 'Create design tokens and components',
    columnId: 'col-todo',
    position: 0,
    boardId: 'demo-board',
    priority: 'high',
    duration: 5
  })

  board.addCard({
    id: 'card-2',
    title: 'API Development',
    description: 'Build REST API endpoints',
    columnId: 'col-progress',
    position: 0,
    boardId: 'demo-board',
    priority: 'high',
    duration: 8
  })

  board.addCard({
    id: 'card-3',
    title: 'Documentation',
    description: 'Write user documentation',
    columnId: 'col-done',
    position: 0,
    boardId: 'demo-board',
    priority: 'medium',
    duration: 3
  })

  // Add dependency
  board.addDependency('card-2', {
    taskId: 'card-1',
    type: 'finish-to-start'
  })

  renderBoard()
  updateStats()
}

// Render the board
function renderBoard() {
  const boardEl = document.getElementById('board')
  const columns = board.getAllColumns()

  boardEl.innerHTML = columns.map(column => {
    const cards = board.getCardsByColumn(column.id)

    return `
      <div class="column" data-column-id="${column.id}">
        <div class="column-header">
          <span class="column-title">${column.title}</span>
          <span class="card-count">${cards.length}</span>
        </div>
        <div class="cards" data-column-id="${column.id}">
          ${cards.map(card => renderCard(card)).join('')}
        </div>
      </div>
    `
  }).join('')

  // Add event listeners
  attachEventListeners()
}

// Render a single card
function renderCard(card) {
  const isSelected = selection.isSelected(card.id)
  const isDragging = drag.getDraggedCardId() === card.id

  return `
    <div
      class="card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}"
      data-card-id="${card.id}"
      draggable="true"
    >
      <div class="card-title">${card.title}</div>
      <div class="card-meta">
        ${card.priority ? `<span>🏷️ ${card.priority}</span>` : ''}
        ${card.duration ? `<span>⏱️ ${card.duration}d</span>` : ''}
      </div>
      <div class="card-actions">
        <button onclick="editCard('${card.id}')">✏️ Edit</button>
        <button onclick="deleteCard('${card.id}')">🗑️ Delete</button>
      </div>
    </div>
  `
}

// Attach event listeners
function attachEventListeners() {
  // Card click for selection
  document.querySelectorAll('.card').forEach(cardEl => {
    cardEl.addEventListener('click', (e) => {
      const cardId = cardEl.dataset.cardId

      if (e.ctrlKey || e.metaKey) {
        selection.toggle(cardId)
      } else if (e.shiftKey) {
        selection.add(cardId)
      } else {
        selection.select(cardId)
      }
    })

    // Drag start
    cardEl.addEventListener('dragstart', (e) => {
      const cardId = cardEl.dataset.cardId
      const columnId = cardEl.closest('.cards').dataset.columnId
      drag.startDrag(cardId, columnId)
      e.dataTransfer.effectAllowed = 'move'
    })

    // Drag end
    cardEl.addEventListener('dragend', () => {
      drag.endDrag()
    })
  })

  // Drop zones
  document.querySelectorAll('.cards').forEach(cardsEl => {
    cardsEl.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    })

    cardsEl.addEventListener('drop', (e) => {
      e.preventDefault()
      const columnId = cardsEl.dataset.columnId
      const cards = board.getCardsByColumn(columnId)
      drag.endDrag(columnId, cards.length)
    })
  })
}

// Update statistics
function updateStats() {
  document.getElementById('stat-columns').textContent = board.getAllColumns().length
  document.getElementById('stat-cards').textContent = board.getAllCards().length
  document.getElementById('stat-selected').textContent = selection.getCount()
  document.getElementById('stat-dragging').textContent = drag.isDragging() ? 'Yes' : 'No'
}

// Global functions for buttons
window.addColumn = () => {
  const title = prompt('Column name:')
  if (title) {
    const columns = board.getAllColumns()
    board.addColumn({
      id: `col-${Date.now()}`,
      title,
      position: columns.length,
      boardId: 'demo-board'
    })
  }
}

window.addCard = () => {
  const columns = board.getAllColumns()
  if (columns.length === 0) {
    alert('Please add a column first!')
    return
  }

  const title = prompt('Card title:')
  if (title) {
    const firstColumn = columns[0]
    const cards = board.getCardsByColumn(firstColumn.id)

    board.addCard({
      id: `card-${Date.now()}`,
      title,
      columnId: firstColumn.id,
      position: cards.length,
      boardId: 'demo-board'
    })
  }
}

window.clearSelection = () => {
  selection.clear()
}

window.selectAllCards = () => {
  const allCards = board.getAllCards()
  selection.selectMultiple(allCards.map(card => card.id))
}

window.showCriticalPath = () => {
  const criticalPath = board.getCriticalPath()
  if (criticalPath.length === 0) {
    alert('No critical path found. Add task dependencies first!')
  } else {
    alert(`Critical Path:\n${criticalPath.join(' → ')}`)
  }
}

window.clearBoard = () => {
  if (confirm('Clear entire board?')) {
    const cards = board.getAllCards()
    cards.forEach(card => board.deleteCard(card.id))

    const columns = board.getAllColumns()
    columns.forEach(col => board.deleteColumn(col.id))
  }
}

window.editCard = (cardId) => {
  const card = board.getCard(cardId)
  const newTitle = prompt('New title:', card.title)
  if (newTitle && newTitle !== card.title) {
    board.updateCard(cardId, { title: newTitle })
  }
}

window.deleteCard = (cardId) => {
  if (confirm('Delete this card?')) {
    board.deleteCard(cardId)
  }
}

// Initialize on load
initialize()

console.log('🎯 ASAKAA Headless - Vanilla JS Example')
console.log('Board:', board)
console.log('Selection:', selection)
console.log('Drag:', drag)
console.log('Keyboard:', keyboard)
