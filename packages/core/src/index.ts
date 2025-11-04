/**
 * @libxai/core - Framework-agnostic core logic
 *
 * Pure TypeScript business logic with 0 UI dependencies.
 * Use with React, Vue, Svelte, or Vanilla JS.
 *
 * @packageDocumentation
 */

// Models
export { Card, Column, Board } from './models'

// Store
export { Store, BoardStore, DragStore, dragStore, SelectionStore, selectionStore } from './store'
export type {
  BoardState,
  DragState,
  DragEvent,
  DragEventData,
  DragEventCallback,
  SelectionState,
  SelectionEvent,
  SelectionEventData,
  SelectionEventCallback,
} from './store'

// Types
export type {
  // Base types
  Priority,
  CardStatus,
  Dependency,
  DependencyType,
  BaseEntity,
  CardData,
  ColumnData,
  BoardData,
  BoardSettings,
  UserData,
  // Event types
  EventListener,
  StoreEvent,
  CardEvent,
  ColumnEvent,
  BoardEvent,
  AnyEvent,
  EventType,
  // Gantt types
  Milestone,
  Baseline,
  BaselineCardSnapshot,
  CriticalPath,
  ScheduledTask,
  ResourceAllocation,
  ResourceUtilization,
  GanttConfig,
  GanttState,
  DependencyValidation,
  AutoScheduleOptions,
  TaskConstraintType,
  TaskConstraint,
} from './types'

// Views
export { BaseViewAdapter, ViewRegistry } from './views'
export type {
  ViewAdapter,
  ViewEvent,
  ViewEventData,
  ViewEventCallback,
  ViewOptions,
  ExportFormat,
  ViewBoardData,
} from './views'
export type {
  ViewRegistryEvent,
  ViewRegistryEventData,
  ViewRegistryEventCallback,
  ViewMetadata,
} from './views'

// Runtime
export { AsakaaRuntime, PluginRegistry } from './runtime'
export type {
  RuntimeConfig,
  RuntimeEvent,
  RuntimeEventData,
  RuntimeEventCallback,
  SerializationFormat,
  SerializedBoardData,
  Plugin,
  PluginContext,
  PluginMetadata,
} from './runtime'

// Serialization
export {
  JSONSerializer,
  createJSONSerializer,
  BinarySerializer,
  createBinarySerializer,
  SerializerRegistry,
  serializerRegistry,
  BaseSerializer,
} from './serialization'
export type {
  Serializer,
  SerializedData,
  SerializationOptions,
  SerializerFormat,
} from './serialization'

// Adapters
export { BoardController } from './adapters/vanilla'
export type { BoardControllerOptions, EventHandler } from './adapters/vanilla'

// Gantt - Dependency engine and utilities
export { DependencyEngine } from './gantt'
