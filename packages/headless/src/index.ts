/**
 * @libxai/headless
 *
 * Framework-agnostic headless UI hooks for ASAKAA project management.
 * Use with React, Vue, Svelte, or Vanilla JS.
 *
 * @packageDocumentation
 */

// Re-export core types
export type {
  Card,
  Column,
  Board,
  CardData,
  ColumnData,
  BoardData,
  Priority,
  CardStatus,
  Dependency,
  DependencyType
} from '@libxai/core'

// Hooks
export * from './hooks'

// Types
export * from './types'
