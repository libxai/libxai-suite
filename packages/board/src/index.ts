/**
 * ASAKAA Board - AI-native Kanban board library
 * @packageDocumentation
 */

// Views (v0.7.0 - ViewAdapter pattern)
export { KanbanViewAdapter, createKanbanView } from './views'
export type { KanbanViewConfig } from './views'

// Components
export {
  KanbanBoard,
  Column,
  Card,
  EditableColumnTitle,
  PrioritySelector,
  DateRangePicker,
  UserAssignmentSelector,
  DependenciesSelector,
  ErrorBoundary,
  withErrorBoundary,
  CommandPalette,
  CardDetailModal,
  CardDetailModalV2,
  AttachmentUploader,
  VelocityChart,
  BurnDownChart,
  DistributionCharts,
  BulkOperationsToolbar,
  SwimlaneBoardView,
  GroupBySelector,
  KeyboardShortcutsHelp,
  CardTemplateSelector,
  DEFAULT_TEMPLATES,
  ExportImportModal,
  FilterBar,
  ConfigMenu,
  ThemeModal,
  CoverImageManager,
  // LazyLoadWrapper,
  // withLazyLoad,
} from './components'

// Loading Skeletons (v0.8.2 - shimmer effects for loading states)
export {
  LoadingSkeleton,
  CardSkeleton,
  ColumnSkeleton,
  BoardSkeleton,
  ListSkeleton,
  TableSkeleton,
  GanttSkeleton,
  SkeletonGroup,
} from './components/LoadingSkeleton'
export type { LoadingSkeletonProps } from './components/LoadingSkeleton'

// Framer Motion Animations (v0.8.2 - declarative animations)
export {
  // Animated components
  AnimatedCard,
  FadeInCard,
  StaggeredCardList,
} from './animations'
export type { AnimatedCardProps } from './animations'

// Drag Physics (v0.8.2 - physics-based drag interactions)
export {
  DragPhysics,
  useDragPhysics,
  dragPhysicsPresets,
} from './components'
export type { DragPhysicsProps, DragPhysicsPreset } from './components'

// Card Flip Animations (v0.8.2 - 3D card flips)
export {
  FlipCard,
  StackedFlipCards,
  CarouselFlipCard,
  useFlipCard,
  flipCardPresets,
} from './components'
export type { FlipCardProps, FlipCardPreset } from './components'

// Animation variants (for custom animations)
export {
  easing as animationEasing,
  transitions as animationTransitions,
  cardEnter,
  cardHover,
  cardDrag,
  cardFlip,
  cardSwipe,
  columnEnter,
  columnCollapse,
  modalBackdrop,
  modalContent,
  buttonPress,
  buttonShimmer,
  listContainer,
  listItem,
  skeletonPulse,
  shimmer,
  toastSlide,
  progressFill,
  fade,
  slide,
  scale,
  rotate,
} from './animations/motion-variants'

// Gantt Components (v0.8.0)
export {
  GanttBoard,
  GanttToolbar,
  TaskGrid,
  Timeline,
  TaskBar,
  DependencyLine,
  Milestone as GanttMilestone,
  ColumnManager,
  ContextMenu,
  MenuIcons,
  themes as ganttThemes,
  cardToGanttTask,
  ganttTaskToCardUpdate,
  cardsToGanttTasks,
  ganttUtils, // v0.8.0 - Public utilities
} from './components/Gantt'
export type {
  Task as GanttTask,
  TimeScale,
  Theme as GanttTheme,
  GanttConfig as GanttBoardConfig,
  GanttPermissions, // v0.8.2 - Permissions for authorization
  GanttColumn,
  ColumnType as GanttColumnType,
  Assignee as GanttAssignee,
  GanttTheme as GanttThemeConfig,
  GanttBoardRef, // v0.8.0 - Imperative API
  GanttTemplates, // v0.8.0 - Customizable templates
} from './components/Gantt'

// v0.6.0: Smart Card Stacking
export { CardStack } from './components/CardStack/CardStack'
export type { CardStackProps } from './components/CardStack/CardStack'

// v0.6.0: Card History & Time Travel
export { CardHistoryTimeline, CardHistoryReplay } from './components/CardHistory'
export type { CardHistoryTimelineProps, CardHistoryReplayProps } from './components/CardHistory'

// v0.6.0: Card Relationships Graph
export { CardRelationshipsGraph } from './components/CardRelationships'
export type { CardRelationshipsGraphProps } from './components/CardRelationships'

export type {
  ColumnProps,
  CardProps,
  EditableColumnTitleProps,
  PrioritySelectorProps,
  DateRangePickerProps,
  UserAssignmentSelectorProps,
  DependenciesSelectorProps,
  ErrorBoundaryProps,
  CommandPaletteProps,
  CardDetailModalProps,
  CardDetailModalV2Props,
  AttachmentUploaderProps,
  VelocityChartProps,
  VelocityDataPoint,
  BurnDownChartProps,
  BurnDownDataPoint,
  DistributionChartsProps,
  DistributionDataPoint,
  BulkOperationsToolbarProps,
  SwimlaneBoardViewProps,
  GroupBySelectorProps,
  KeyboardShortcutsHelpProps,
  CardTemplateSelectorProps,
  ExportImportModalProps,
  FilterBarProps,
  // GanttViewProps,
  // GanttTimelineProps,
  ConfigMenuProps,
  ThemeModalProps,
  CoverImageManagerProps,
  // LazyLoadWrapperProps,
} from './components'

// export type { SkeletonProps } from './components/Skeleton'

// AI Components
export { GeneratePlanModal, AIUsageDashboard } from './components/AI'
export type { GeneratePlanModalProps, AIUsageDashboardProps } from './components/AI'

// Hooks (Jotai-based - legacy, will be deprecated in v0.8.0)
export {
  useKanbanState,
  useBoard,
  useFilters,
  useAI,
  useMultiSelect,
  useKeyboardShortcuts,
  DEFAULT_SHORTCUTS,
  useCardStacking,
  useKanbanGanttSync, // v0.8.1 - Kanban-Gantt synchronization
  cardToTask,
  taskToCard,
  cardsToTasks,
  tasksToCards,
} from './hooks'
export type {
  UseKanbanStateOptions,
  UseKanbanStateReturn,
  UseBoardOptions,
  UseBoardReturn,
  UseFiltersOptions,
  UseFiltersReturn,
  FilterState,
  SortState,
  DateFilter,
  SortBy,
  SortOrder,
  UseAIOptions,
  UseAIReturn,
  UseMultiSelectReturn,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
  UseCardStackingOptions,
  UseCardStackingResult,
  UseKanbanGanttSyncOptions, // v0.8.1
  UseKanbanGanttSyncReturn, // v0.8.1
} from './hooks'

// React Adapters (@libxai/core integration - v0.7.0)
export { BoardProvider, useBoardStore } from './adapters/react'
export type { BoardProviderProps } from './adapters/react'

// Export with alias to avoid conflict with legacy useBoard hook
export { useBoard as useBoardCore } from './adapters/react'
export type { UseBoardReturn as UseBoardCoreReturn } from './adapters/react'

export { useFilteredCards, useSortedCards } from './adapters/react'
export type { CardFilters } from './adapters/react'

// Types
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
  KanbanBoardProps,
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

// Utilities
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

// AI Utilities
export { aiUsageTracker, formatCost } from './lib/ai/costs'
export type {
  AIOperation,
  UsageStats,
} from './lib/ai/costs'
export { AI_MODELS, AI_FEATURES, RATE_LIMITS } from './lib/ai/config'
export type { AIModelKey } from './lib/ai/config'

// State (advanced usage) - Now using @libxai/core stores
export { useDragState } from './hooks/useDragState'
export { useSelectionState } from './hooks/useSelectionState'
export type { UseDragStateReturn } from './hooks/useDragState'
export type { UseSelectionStateReturn } from './hooks/useSelectionState'

// Plugins
export { PluginManager, pluginManager } from './plugins'
export type { Plugin, PluginContext, PluginHooks, IPluginManager } from './plugins'

// Virtual Scrolling Components (v0.7.0)
export { VirtualList, useVirtualList } from './components/VirtualList'
export type { VirtualListProps } from './components/VirtualList'
export { VirtualGrid, useVirtualGrid, shouldVirtualizeGrid } from './components/VirtualGrid'
export type { VirtualGridProps } from './components/VirtualGrid'

// Enterprise Virtual Scrolling (v0.8.2 - 10K+ items optimization)
export {
  EnterpriseVirtualGrid,
  useEnterpriseVirtualGrid,
  shouldUseEnterpriseVirtualization,
} from './components/VirtualGrid'
export type {
  EnterpriseVirtualGridProps,
  PerformanceMetrics,
} from './components/VirtualGrid'

export {
  EnterpriseVirtualList,
  useEnterpriseVirtualList,
} from './components/VirtualList'
export type {
  EnterpriseVirtualListProps,
} from './components/VirtualList'

// Design Tokens (v0.7.0)
export {
  designTokens,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  zIndex,
  duration,
  easing,
  shadows,
  opacity,
  kanban as kanbanTokens,
  gantt as ganttTokens,
  getToken,
  generateCSSVariables,
  generateThemeVariables,
  generateCompleteCSS,
  exportTokensToCSS,
  darkTheme as darkTokenTheme,
  lightTheme as lightTokenTheme,
  neutralTheme as neutralTokenTheme,
} from './tokens'
export type {
  SpacingToken,
  BorderRadiusToken,
  FontSizeToken,
  FontWeightToken,
  LineHeightToken,
  ZIndexToken,
  DurationToken,
  EasingToken,
  ShadowToken,
  OpacityToken,
  DesignTokens,
  TokenValue,
  ThemeColors as TokenThemeColors,
} from './tokens'

// Theme System (v0.5.0)
export { ThemeProvider, useTheme, ThemeSwitcher, themes, darkTheme, lightTheme, neutralTheme, defaultTheme } from './theme'
export type { ThemeName, Theme, ThemeColors, ThemeContextValue } from './theme'

// Re-export @libxai/core (v0.7.0 - framework-agnostic models and store)
export {
  Card as CardModel,
  Column as ColumnModel,
  Board as BoardModel,
  BoardStore,
  Store,
  DependencyEngine,
} from '@libxai/core'

export type {
  CardData,
  ColumnData,
  BoardData,
  UserData,
  BaseEntity,
  BoardState,
  StoreEvent,
  Dependency,
  DependencyType,
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
} from '@libxai/core'

// Note: Priority type already exported from ./types above
