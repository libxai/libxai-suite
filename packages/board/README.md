# ASAKAA Board

AI-native Kanban board component for React. Built for performance and developer experience.

## Features

- **Blazing Fast**: 60 FPS with 10,000+ cards using automatic virtualization
- **AI-Powered**: Optional AI features for plan generation, risk prediction, and more
- **Keyboard First**: Full keyboard navigation support
- **Customizable**: Styled by default, fully customizable via render props
- **Tiny Bundle**: <100KB gzipped core (AI features optional)
- **Type Safe**: Written in TypeScript with complete type definitions
- **Framework Agnostic Backend**: Works with any backend (Supabase, Firebase, REST, GraphQL)

## Installation

```bash
npm install @libxai/board
```

For AI features (optional):
```bash
npm install ai
```

## Quick Start

```tsx
import { KanbanBoard, useKanbanState } from '@libxai/board'
import '@libxai/board/styles.css'

function App() {
  const { board, callbacks } = useKanbanState({
    initialBoard: {
      id: 'my-board',
      columns: [
        { id: 'col-1', title: 'To Do', position: 1000, cardIds: [] },
        { id: 'col-2', title: 'Done', position: 2000, cardIds: [] }
      ],
      cards: []
    }
  })

  return <KanbanBoard board={board} callbacks={callbacks} />
}
```

## Documentation

- [API Reference](./docs/api.md)
- [Examples](./examples/)
- [Storybook](https://asakaa-storybook.netlify.app) (coming soon)

## Performance

- Renders 1,000 cards in <1 second
- Maintains 60 FPS during drag operations
- Automatic virtualization for large lists
- Optimized with React.memo and atomic state

## License

Business Source License 1.1 - See LICENSE file

## Contributing

This is a commercial open source project. Contributions welcome!
