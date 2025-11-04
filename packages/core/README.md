# @libxai/core

**Framework-agnostic core logic for ASAKAA project management library**

Pure TypeScript business logic with 0 UI dependencies. Use with React, Vue, Svelte, or Vanilla JS.

## Status: ✅ Phase 1 Complete | 🚧 Phase 2 In Progress (v0.7.0)

### ✅ Phase 1 Completed (100%)
- [x] Package structure and build setup
- [x] TypeScript configuration (strict mode)
- [x] Base types (Card, Column, Board, User)
- [x] Event types for store
- [x] Immutable Card model with 15+ utility methods
- [x] Immutable Column model with WIP limits
- [x] Immutable Board model with column management
- [x] Generic Store<T> with pub/sub pattern
- [x] Specialized BoardStore with CRUD operations
- [x] Build system (20KB bundle, tree-shakeable)

### 🔄 Phase 2 In Progress (60%)
- [x] React adapters (BoardProvider, useBoard, useFilteredCards)
- [x] Linked to @libxai/board package
- [ ] Export from main index (name conflict to resolve)
- [ ] Refactor existing components to use adapters
- [ ] Remove Jotai dependency
- [ ] Unit tests (target: >95% coverage)

## Installation

```bash
npm install @libxai/core
# or
pnpm add @libxai/core
# or
yarn add @libxai/core
```

## Quick Start

```typescript
import { Card } from '@libxai/core'

// Create an immutable card
const card = new Card({
  id: 'card-1',
  title: 'Implement authentication',
  description: 'Add JWT-based auth',
  columnId: 'in-progress',
  position: 0,
  priority: 'HIGH',
  assignedUserIds: ['user-1']
})

// Update returns a new instance (immutable)
const updated = card.update({
  title: 'Implement OAuth authentication'
})

// Original is unchanged
console.log(card.title) // 'Implement authentication'
console.log(updated.title) // 'Implement OAuth authentication'

// Utility methods
card.isOverdue() // boolean
card.isAssignedTo('user-1') // true
card.getProgress() // number | undefined
```

## Architecture

### Immutable Models

All models are immutable using `Object.freeze()`:

- **Card**: Task/item entity
- **Column**: Workflow stage (todo, in-progress, done)
- **Board**: Top-level container
- **User**: Team member entity

### Event-Based Store

Framework-agnostic state management using pub/sub pattern:

```typescript
// Coming soon
import { BoardStore } from '@libxai/core'

const store = new BoardStore(initialData)

store.subscribe('card:created', (event) => {
  console.log('New card:', event.data)
})

store.emit('card:created', { ...cardData })
```

### Services

Business logic layer with dependency injection:

```typescript
// Coming soon
import { CardService } from '@libxai/core'

const service = new CardService(repository)
await service.createCard({ title: 'New task', columnId: 'todo' })
```

## Design Principles

### SOLID

- **Single Responsibility**: Each class/module has one job
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Interfaces are properly defined
- **Interface Segregation**: Small, specific APIs
- **Dependency Inversion**: Depend on abstractions

### Performance

- **O(1) operations** where possible (Maps, Sets)
- **O(log n) for sorted operations** (binary search)
- **Lazy evaluation** for expensive computations
- **Tree-shakeable** exports

### Zero Dependencies

The only dependency is `zod` for runtime validation. No React, no UI libraries.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Test coverage
npm run test:coverage

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

Business Source License 1.1 (BUSL-1.1)

## Roadmap

### Phase 1 (Current - Week 1-2)
- [x] Setup package structure
- [x] Base types and models
- [ ] Event-based store
- [ ] Core services
- [ ] Unit tests

### Phase 2 (Week 3-4)
- [ ] Algorithms optimization
- [ ] Performance benchmarks
- [ ] Documentation (TSDoc)
- [ ] Integration with @libxai/board

### Phase 3 (Week 5-6)
- [ ] Advanced features (undo/redo, persistence)
- [ ] Multi-view support preparation
- [ ] API finalization

## Contributing

See [ARCHITECTURE_REFACTORING_PLAN.md](../../ARCHITECTURE_REFACTORING_PLAN.md) for the complete architectural vision.
