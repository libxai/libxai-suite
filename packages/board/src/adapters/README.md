# React Adapters for @libxai/core

Framework adapters that connect the framework-agnostic `@libxai/core` with React.

## Status: ✅ Phase 2 Complete

### Features

- **BoardProvider**: React Context Provider wrapping BoardStore
- **useBoard**: Main hook for board operations (CRUD for boards, columns, cards)
- **useFilteredCards**: Performance-optimized filtering with memoization
- **useSortedCards**: Performance-optimized sorting

## Usage

```tsx
import { BoardProvider, useBoard, useFilteredCards } from '@libxai/board/adapters/react'

function App() {
  return (
    <BoardProvider initialData={{ columns: [], cards: [] }}>
      <MyBoard />
    </BoardProvider>
  )
}

function MyBoard() {
  const { columns, cards, addCard, moveCard } = useBoard()

  // Filtered cards with memoization
  const urgentCards = useFilteredCards({
    priorities: ['HIGH', 'URGENT'],
    isOverdue: true
  })

  return (
    <div>
      <h2>{urgentCards.length} urgent tasks</h2>
      {columns.map(column => (
        <Column key={column.id} column={column} />
      ))}
    </div>
  )
}
```

## Migration from v0.6.0

The old Jotai-based hooks are still available for backward compatibility.

**Before (v0.6.0 - Jotai)**:
```tsx
import { useAtom } from 'jotai'
import { cardsAtom } from '@libxai/board'

const [cards, setCards] = useAtom(cardsAtom)
```

**After (v0.7.0 - Core)**:
```tsx
import { useBoard } from '@libxai/board/adapters/react'

const { cards, addCard, updateCard } = useBoard()
```

## Next Steps

- Refactor existing components to use new adapters
- Remove Jotai dependency
- Add unit tests for adapters
- Performance benchmarks

## Architecture

```
@libxai/board/adapters/react/
├── BoardProvider.tsx    - Context Provider
├── useBoard.ts          - Main CRUD hook
├── useFilteredCards.ts  - Performance-optimized filtering
└── index.ts             - Public exports
```

Uses `@libxai/core` under the hood for all state management.
