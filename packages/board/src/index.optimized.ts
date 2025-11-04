/**
 * ASAKAA Board - AI-native Kanban board library (Optimized Bundle)
 * @packageDocumentation
 *
 * This is the optimized entry point with code splitting for better performance.
 * Heavy components are lazy-loaded to reduce initial bundle size.
 *
 * Bundle sizes:
 * - Core bundle (eager): ~80KB - Board, Column, Card, basic features
 * - Charts (lazy): ~400KB - Analytics components
 * - PDF Export (lazy): ~150KB - Export/import functionality
 * - Advanced features (lazy): ~50KB - Modals, bulk ops, command palette
 *
 * For backwards compatibility, use the default import from '@libxai/board'
 * For optimal bundle size, import specific components:
 *
 * @example
 * ```tsx
 * // Optimal (only loads what you use)
 * import { KanbanBoard, Card, Column } from '@libxai/board'
 * import { VelocityChart } from '@libxai/board/lazy'
 *
 * // All-in-one (larger bundle)
 * import * as Board from '@libxai/board'
 * ```
 */

// ============================================================================
// VIEWS (v0.7.0 - ViewAdapter Pattern)
// ============================================================================

export { KanbanViewAdapter, createKanbanView } from './views'
export type { KanbanViewConfig } from './views'

// ============================================================================
// CORE COMPONENTS (Eager - ~80KB)
// ============================================================================

// Essential Board Components
export {
  KanbanBoard,
  Column,
  Card,
  EditableColumnTitle,
  ErrorBoundary,
  withErrorBoundary,
} from './components'

export type {
  KanbanBoardProps,
  ColumnProps,
  CardProps,
  EditableColumnTitleProps,
  ErrorBoundaryProps,
} from './components'

// Essential Selectors (lightweight)
export {
  PrioritySelector,
  DateRangePicker,
  UserAssignmentSelector,
  DependenciesSelector,
} from './components'

export type {
  PrioritySelectorProps,
  DateRangePickerProps,
  UserAssignmentSelectorProps,
  DependenciesSelectorProps,
} from './components'

// UI Components (lightweight)
export {
  GroupBySelector,
  FilterBar,
  SwimlaneBoardView,
  CardTemplateSelector,
  DEFAULT_TEMPLATES,
  KeyboardShortcutsHelp,
} from './components'

export type {
  GroupBySelectorProps,
  FilterBarProps,
  SwimlaneBoardViewProps,
  CardTemplateSelectorProps,
  KeyboardShortcutsHelpProps,
} from './components'

// Attachment Uploader (lightweight)
export { AttachmentUploader } from './components'
export type { AttachmentUploaderProps } from './components'

// v0.6.0: Card Stacking (lightweight)
export { CardStack } from './components/CardStack/CardStack'
export type { CardStackProps } from './components/CardStack/CardStack'

// Theme System (v0.5.0)
export { ThemeProvider, useTheme, ThemeSwitcher, ConfigMenu } from './theme'
export { ThemeModal } from './components'
export { themes, darkTheme, lightTheme, neutralTheme, defaultTheme } from './theme'
export type { ThemeName, Theme, ThemeColors, ThemeContextValue, ThemeModalProps, ConfigMenuProps } from './theme'

// ============================================================================
// LAZY-LOADED COMPONENTS (Code Split)
// ============================================================================

/**
 * Heavy components that are lazy-loaded for optimal performance
 * Import these from '@libxai/board/lazy' for best bundle optimization
 */
export * as Lazy from './components/lazy'

// Also export lazy components directly for convenience
export {
  VelocityChart,
  BurnDownChart,
  DistributionCharts,
  ExportImportModal,
  CardDetailModal,
  CardDetailModalV2,
  BulkOperationsToolbar,
  CommandPalette,
  GeneratePlanModal,
  AIUsageDashboard,
  CardRelationshipsGraph,
  CardHistoryTimeline,
  CardHistoryReplay,
  preloadComponent,
} from './components/lazy'

// Export types for lazy components
export type {
  VelocityChartProps,
  VelocityDataPoint,
  BurnDownChartProps,
  BurnDownDataPoint,
  DistributionChartsProps,
  DistributionDataPoint,
  ExportImportModalProps,
  CardDetailModalProps,
  CardDetailModalV2Props,
  BulkOperationsToolbarProps,
  CommandPaletteProps,
  GeneratePlanModalProps,
  AIUsageDashboardProps,
  CardRelationshipsGraphProps,
  CardHistoryTimelineProps,
  CardHistoryReplayProps,
} from './components'

// ============================================================================
// HOOKS
// ============================================================================

// Core Hooks (lightweight)
export {
  useKanbanState,
  useFilters,
  useMultiSelect,
  useKeyboardShortcuts,
  DEFAULT_SHORTCUTS,
  useCardStacking,
} from './hooks'

export type {
  UseKanbanStateOptions,
  UseKanbanStateReturn,
  UseFiltersOptions,
  UseFiltersReturn,
  FilterState,
  SortState,
  DateFilter,
  SortBy,
  SortOrder,
  UseMultiSelectReturn,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
  UseCardStackingOptions,
  UseCardStackingResult,
} from './hooks'

// Legacy Jotai-based hook (to be deprecated in v0.8.0)
export { useBoard as useBoardLegacy } from './hooks'
export type {
  UseBoardOptions as UseBoardLegacyOptions,
  UseBoardReturn as UseBoardLegacyReturn,
} from './hooks'

// AI Hook (optional dependency)
export { useAI } from './hooks'
export type { UseAIOptions, UseAIReturn } from './hooks'

// ============================================================================
// REACT ADAPTERS (@libxai/core integration)
// ============================================================================

/**
 * New framework-agnostic React adapters (v0.7.0)
 * These replace the Jotai-based hooks for better performance and modularity
 */
export { BoardProvider, useBoardStore } from './adapters/react'
export type { BoardProviderProps } from './adapters/react'

export { useBoard } from './adapters/react'
export type { UseBoardReturn } from './adapters/react'

export { useFilteredCards, useSortedCards } from './adapters/react'
export type { CardFilters } from './adapters/react'

// ============================================================================
// TYPES
// ============================================================================

export type {
  Board,
  Column as ColumnType,
  Card as CardType,
  Priority,
  CardStatus,
  BoardCallbacks,
  AICallbacks,
  Insight,
  InsightType,
  InsightSeverity,
  AssigneeSuggestion,
  GeneratedPlan,
  BoardConfig,
  RenderProps,
  DragData,
  DropData,
  CardFilter,
  CardSort,
  CardSortKey,
  User,
  Comment,
  Activity,
  ActivityType,
  Attachment,
  GroupByOption,
  SwimlaneConfig,
  Swimlane,
  KeyboardAction,
  KeyboardShortcut,
  CardTemplate,
  ExportFormat,
  ExportOptions,
  ImportResult,
  CardStack as CardStackType,
  StackingStrategy,
  StackingConfig,
  StackSuggestion,
} from './types'

// ============================================================================
// UTILITIES
// ============================================================================

export {
  cn,
  calculatePosition,
  generateInitialPositions,
  retryWithBackoff,
  retrySyncOperation,
  createRetryWrapper,
  CircuitBreaker,
} from './utils'
export type { RetryOptions, RetryResult } from './utils'

// ============================================================================
// AI UTILITIES (Optional)
// ============================================================================

export { aiUsageTracker, formatCost } from './lib/ai/costs'
export type { AIOperation, UsageStats } from './lib/ai/costs'
export { AI_MODELS, AI_FEATURES, RATE_LIMITS } from './lib/ai/config'
export type { AIModelKey } from './lib/ai/config'

// ============================================================================
// STATE (Advanced Usage - to be deprecated)
// ============================================================================

/**
 * State management hooks - using @libxai/core stores
 * Replacement for Jotai atoms
 */
export { useDragState } from './hooks/useDragState'
export { useSelectionState } from './hooks/useSelectionState'
export type { UseDragStateReturn } from './hooks/useDragState'
export type { UseSelectionStateReturn } from './hooks/useSelectionState'

// ============================================================================
// PLUGINS (Advanced Usage)
// ============================================================================

export { PluginManager, pluginManager } from './plugins'
export type { Plugin, PluginContext, PluginHooks, IPluginManager } from './plugins'

// ============================================================================
// RE-EXPORT @libxai/core
// ============================================================================

/**
 * Framework-agnostic core exports
 * Import these when building custom adapters or using vanilla JS
 */
export * from '@libxai/core'
