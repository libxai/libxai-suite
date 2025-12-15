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
  KanbanToolbar, // v0.17.26: Kanban toolbar component
  AddColumnButton, // v0.9.0: Button to add new columns
  AddCardButton, // v0.17.49: Inline form to add new cards to columns
  Column,
  Card,
  EditableColumnTitle,
  PrioritySelector,
  DateRangePicker,
  UserAssignmentSelector,
  DependenciesSelector,
  wouldCreateCircularDependency,
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
  // LazyLoadWrapper,
  // withLazyLoad,
} from './components'

// Skeleton Loaders
// export {
//   Skeleton,
//   BoardSkeleton,
//   ColumnSkeleton,
//   CardSkeleton,
//   ChartSkeleton,
//   ModalSkeleton,
//   TableSkeleton,
// } from './components/Skeleton'

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
  TaskFormModal, // v0.9.0 - Task CRUD modal
  themes as ganttThemes,
  cardToGanttTask,
  ganttTaskToCardUpdate,
  cardsToGanttTasks,
  ganttUtils, // v0.8.0 - Public utilities
  GanttAIAssistant, // v0.14.0 - AI Assistant for natural language task editing
  // AI Command Parser utilities (v0.14.0)
  GANTT_AI_SYSTEM_PROMPT,
  generateTasksContext,
  findTaskByName,
  parseNaturalDate,
  parseNaturalDuration,
  parseProgress,
  parseStatus,
  parseLocalCommand,
  validateAIResponse,
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
  TaskFormModalProps, // v0.9.0 - Task form props
  TaskFormData, // v0.9.0 - Task form data
  TaskPriority, // v0.17.28 - Task priority type
  GanttAIAssistantConfig, // v0.14.0 - AI Assistant config
  AICommandResult, // v0.14.0 - AI command result
  AIMessage, // v0.17.42 - AI chat message type
  PersistHistoryConfig, // v0.17.42 - AI history persistence config
} from './components/Gantt'

// v0.15.0: Internationalization (i18n) for Gantt
export {
  getTranslations,
  mergeTranslations,
  translations as ganttTranslations,
  en as ganttEnTranslations,
  es as ganttEsTranslations,
} from './components/Gantt/i18n'
export { useGanttI18n, GanttI18nContext } from './components/Gantt/GanttI18nContext'
export type { GanttTranslations, SupportedLocale } from './components/Gantt/i18n'

// v0.17.0: ListView Component
export { ListView } from './components/ListView'
export type {
  ListViewProps,
  ListViewConfig,
  ListViewCallbacks,
  ListViewPermissions,
  ListViewTheme,
  ListViewTranslations,
  ListSort,
  ListSortColumn,
  SortDirection,
  ListFilter,
  ListColumn,
  FlattenedTask,
} from './components/ListView'
export {
  listViewThemes,
  listViewDarkTheme,
  listViewLightTheme,
  listViewNeutralTheme,
  getListViewTheme,
} from './components/ListView'
export type { ListViewThemeName } from './components/ListView'
export {
  listViewTranslations,
  listViewEnTranslations,
  listViewEsTranslations,
  getListViewTranslations,
  mergeListViewTranslations,
} from './components/ListView'
export type { ListViewSupportedLocale } from './components/ListView'

// v0.17.0: CalendarBoard Component
export { CalendarBoard } from './components/Calendar'
export type {
  CalendarBoardProps,
  CalendarConfig,
  CalendarCallbacks,
  CalendarPermissions,
  CalendarTheme,
  CalendarTranslations,
  CalendarEvent,
  CalendarDay,
  CalendarViewMode,
  WeekDay,
} from './components/Calendar'
export {
  calendarThemes,
  calendarDarkTheme,
  calendarLightTheme,
  calendarNeutralTheme,
  getCalendarTheme,
} from './components/Calendar'
export type { CalendarThemeName } from './components/Calendar'
export {
  calendarTranslations,
  calendarEnTranslations,
  calendarEsTranslations,
  getCalendarTranslations,
  mergeCalendarTranslations,
  getMonthNames,
  getWeekdayNames,
} from './components/Calendar'
export type { CalendarSupportedLocale } from './components/Calendar'

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
  KanbanToolbarProps, // v0.17.26
  AddColumnButtonProps, // v0.9.0
  AddCardButtonProps, // v0.17.49
  AddCardData, // v0.17.49
  // LazyLoadWrapperProps,
} from './components'

// export type { SkeletonProps } from './components/Skeleton'

// AI Components
export { GeneratePlanModal, AIUsageDashboard, GenerateGanttTasksDialog } from './components/AI'
export type { GeneratePlanModalProps, AIUsageDashboardProps, GenerateGanttTasksDialogProps, GanttTask as AIGanttTask, GeneratedTasksResponse } from './components/AI'

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
  Subtask,
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
