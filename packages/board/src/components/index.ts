export { KanbanBoard, KanbanToolbar, AddColumnButton, AddCardButton } from './Board'
export type { KanbanToolbarProps, AddColumnButtonProps, AddCardButtonProps, AddCardData } from './Board'
export { Column, EditableColumnTitle } from './Column'
export {
  Card,
  PrioritySelector,
  DateRangePicker,
  UserAssignmentSelector,
  DependenciesSelector,
  wouldCreateCircularDependency,
  DragPhysics,
  useDragPhysics,
  dragPhysicsPresets,
  FlipCard,
  StackedFlipCards,
  CarouselFlipCard,
  useFlipCard,
  flipCardPresets,
} from './Card'
export { CoverImageManager } from './CoverImage'
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary'
export { CommandPalette } from './CommandPalette'
export { CardDetailModal, CardDetailModalV2 } from './CardDetailModal'
export { AttachmentUploader } from './Attachments'
export { VelocityChart, BurnDownChart, DistributionCharts } from './Charts'
export { BulkOperationsToolbar } from './BulkOperations'
export { SwimlaneBoardView, GroupBySelector } from './Swimlanes'
export { KeyboardShortcutsHelp } from './KeyboardShortcuts'
export { CardTemplateSelector, DEFAULT_TEMPLATES } from './Templates'
export { ExportImportModal } from './ExportImport'
export { FilterBar } from './FilterBar'

export type { ColumnProps, EditableColumnTitleProps } from './Column'
export type {
  CardProps,
  PrioritySelectorProps,
  DateRangePickerProps,
  UserAssignmentSelectorProps,
  DependenciesSelectorProps,
  User,
  DragPhysicsProps,
  DragPhysicsPreset,
  FlipCardProps,
  FlipCardPreset,
} from './Card'
export type { CoverImageManagerProps, RecentUpload, UnsplashPhoto } from './CoverImage'
export type { ErrorBoundaryProps } from './ErrorBoundary'
export type { CommandPaletteProps } from './CommandPalette'
export type { CardDetailModalProps, CardDetailModalV2Props } from './CardDetailModal'
export type { AttachmentUploaderProps } from './Attachments'
export type {
  VelocityChartProps,
  VelocityDataPoint,
  BurnDownChartProps,
  BurnDownDataPoint,
  DistributionChartsProps,
  DistributionDataPoint,
} from './Charts'
export type { BulkOperationsToolbarProps } from './BulkOperations'
export type { SwimlaneBoardViewProps, GroupBySelectorProps } from './Swimlanes'
export type { KeyboardShortcutsHelpProps } from './KeyboardShortcuts'
export type { CardTemplateSelectorProps } from './Templates'
export type { ExportImportModalProps } from './ExportImport'
export type { FilterBarProps } from './FilterBar'
export { ConfigMenu } from './ConfigMenu'
export { ThemeModal } from './ThemeModal'

// Lazy Load Wrapper
// export { LazyLoadWrapper, withLazyLoad } from './LazyLoadWrapper'
// export type { LazyLoadWrapperProps } from './LazyLoadWrapper'
export type { ConfigMenuProps } from './ConfigMenu'
export type { ThemeModalProps } from './ThemeModal'

// Gantt Components (v0.8.0 - coming soon)
// export { GanttView, GanttTimeline } from './Gantt'
// export type { GanttViewProps, GanttTimelineProps } from './Gantt'
// export * from './Gantt/renderers'

// Dropdown System (v0.7.1)
export { Dropdown, createDropdownItem } from './Dropdown'
export type { DropdownProps } from './Dropdown'
export { TaskDetailModal } from './TaskDetailModal'
export type { TaskDetailModalProps } from './TaskDetailModal'
