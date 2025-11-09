# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.8.2] - 2025-11-08

### Added

#### Gantt Visual System Enhancements
- **Phase-based Color System**: Automatic task categorization by project phase with keyword detection
  - Planning tasks → Purple (#8B5CF6)
  - Design tasks → Blue (#3B82F6)
  - Development tasks → Green (#10B981)
  - Testing/QA tasks → Amber (#F59E0B)
  - Deployment tasks → Red (#EF4444)
  - Health status (at-risk, off-track) overrides phase colors when applicable
- **Typography System**: Professional Inter font family with strict weight hierarchy (400/500/600)
  - Parent task levels (L0: 500/14px, L1: 500/13px)
  - Regular tasks (500/13px) and small tasks (400/12px)
  - Milestone labels (600/11px) and badges (600/10px)
  - Helper functions: `getTypographyStyle()`, `getSVGTextProps()`, `getTaskTypography()`
- **Design System Constants**: 8pt grid system with centralized spacing, padding, and shadow values
  - Border radius scale (small: 4px, medium: 6px, large: 8px)
  - Spacing system (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
  - Shadow definitions for task bars, progress, summaries, and tooltips
  - Consistent indentation (24px per hierarchy level)
- **Task Type Icons**: Visual categorization with Lucide React icons
  - Palette (design/ui/ux), Code (develop/implement), Calendar (plan/schedule)
  - Rocket (launch/deploy), CheckCircle2 (review/test), FileText (default)

#### Gantt Interaction Improvements
- **Click Handler Fix**: Modal now opens only on clean clicks, not after drag operations
  - Uses `useRef` flag to track actual drag movement
  - Prevents false onClick triggers when releasing from drag-and-drop

### Technical

#### New Modules
- `colorUtils.ts`: Phase detection, color schemes, health status calculation
  - `detectProjectPhase()`: Keyword-based phase categorization
  - `getPhaseColors()`: Returns PhaseColorScheme based on task name and health status
  - `calculateHealthStatus()`: Timeline-based health tracking (on-track/at-risk/off-track)
  - `lightenColor()`, `darkenColor()`: Gradient color transformations
- `designSystem.ts`: Centralized design tokens
  - `BORDER_RADIUS`, `SPACING`, `PADDING`, `SHADOWS`, `INDENT_SIZE` constants
  - `ROW_HEIGHTS` for task rows (32px) and headers (48px)
- `typography.ts`: Font system definitions
  - Typography scale with size, weight, line height specifications
  - SVG text props converter for consistent rendering

#### Enhanced Components
- `TaskBar.tsx`: Phase color application, click-drag separation logic
- `SummaryBar.tsx`: Phase colors for parent tasks with gradient fills
- `Milestone.tsx`: Phase-based milestone colors
- `TaskGrid.tsx`: Icon rendering, typography system, 8pt grid spacing
- `Timeline.tsx`: Typography application to SVG date labels

#### Demo Updates
- `App.tsx`: Task click handler with Task→Card conversion for modal reuse
  - Bidirectional sync: updates both Gantt tasks and Kanban cards from modal
  - Prevents modal opening after drag operations

---

## [0.8.1] - 2025-11-06

### Added

#### Kanban-Gantt Synchronization
- Bidirectional state sync between Kanban and Gantt views via `useKanbanGanttSync` hook
- Conversion utilities: `cardToTask`, `taskToCard`, `cardsToTasks`, `tasksToCards`
- Anti-loop mechanism using `lastUpdated` flag to prevent infinite sync cycles
- Status mapping between Kanban columns and Gantt task states
- Dependency normalization for both string and object formats
- Demo component: `KanbanGanttSyncExample` with view toggle

#### Gantt UX Enhancements
- **Subtask Indicators**: Visual completion badges (X/Y format) next to parent task names with accent-colored styling
- **Auto-calculated Progress**: Weighted average calculation for parent tasks using `parentTaskUtils.calculateParentProgress()` with Sigma (∑) indicator
- **Enhanced Keyboard Navigation**: Enter toggles expand/collapse for parent tasks, creates new task below for leaf tasks
- **Improved Hover Actions**: Semi-transparent background container with accent color highlighting and scale transform (1.1x)
- **Hierarchy Guide Lines**: SVG tree-structure visualization with vertical lines and horizontal elbows at 30% opacity
- **Critical Path Color Fix**: Progress bars now use darker shade of base color (25%) instead of red to avoid confusion with "at risk" state. Red reserved for borders only.
- **Status Icons Removed**: Eliminated redundant circle icons from timeline bars to reduce visual clutter. Status communicated through progress fill and left panel.

### Technical
- New hook: `useKanbanGanttSync` (268 lines)
- New utility: `parentTaskUtils` module for parent task calculations
- New utility: `colorUtils.ts` with `darkenColor()`, `getCriticalPathColors()`, `getProgressColor()`
- Enhanced: `TaskGrid` with SVG guide lines and progress indicators
- Enhanced: `TaskBar` with color management system: critical path uses red border + theme fill, progress uses 25% darker shade
- Enhanced: `SummaryBar` height optimizations
- Updated: `useGanttKeyboard` Enter key logic for context-aware behavior
- Removed: Status indicator circle badges from task bars (reduced visual noise)
- Exports: Added sync utilities to public API (`hooks/index.ts`)

---

## [0.8.1-patch.1] - 2025-11-03

### Fixed
- Split task segment positions now persist correctly after drag operations
- Root cause: `GanttBoard.handleTaskDateChange` was not preserving `segments` array
- Solution: Conditional spread operator `...(task.segments && { segments: task.segments })`

### Changed
- Refactored drag state management into `useDragState` custom hook
- Centralized 14 individual useState calls into single hook invocation
- Added `resetDragState` function to reduce code duplication

### Technical
- New hook: `useDragState` (127 lines)
- Reduced `TaskBar.tsx` complexity via state extraction

---

## [0.8.0] - 2025-01-26

### Added

#### Critical Path Method (CPM)
- Forward Pass (ES/EF) and Backward Pass (LS/LF) algorithm implementation
- Automatic recalculation on task/dependency changes using `useMemo`
- Visual highlighting of critical tasks in red (#DC2626)
- Slack time calculation for identifying zero-float tasks
- Multi-level hierarchy support with complex dependency handling

#### Auto-Scheduling with Cascade
- Recursive dependency cascade: moving a task auto-reschedules all dependents
- Duration preservation during rescheduling operations
- Algorithm: `ganttUtils.autoScheduleDependents()` with deep traversal
- Instant UI feedback with no manual intervention required

#### Split Task Feature
- Context menu access: right-click any task bar to split
- Bryntum-style gap rendering with configurable pause duration (default: 3 days)
- Segments array storage: `{startDate, endDate}[]` per task
- Imperative APIs: `ganttUtils.splitTask()` and `GanttBoardRef.splitTask()`
- Visual rendering: multiple task bars on same row with visible gaps
- Duration preservation: total work days constant, end date extends by gap

#### Validation & Safety
- Circular dependency detection using DFS algorithm with alert modal
- Date range validation: prevents start date > end date, enforces 1-day minimum duration
- Undo/Redo system: 50-level history for all task operations
- Keyboard shortcuts: `Ctrl+Z` / `Ctrl+Y` (Windows/Linux), `Cmd+Z` / `Cmd+Shift+Z` (macOS)

#### Visual Enhancements
- Hierarchical icon system: thick circles (L0), regular circles (L1), filled dots (L2+), diamonds (milestones)
- Typography hierarchy: 14px/600 (L0), 13px/500 (L1), 12px/400 (L2+)
- Today indicator: red vertical line marking current date
- Improved tooltip system with AnimatePresence for smooth exit animations
- Default week view for optimal timeline balance

### Fixed
- Horizontal scroll now works correctly for extended timelines
- Tooltip persistence issues during drag operations resolved
- Task date validation prevents invalid date ranges

### Changed
- Default column visibility: only "Task Name" visible by default
- Other columns accessible via "+" button in column manager

### Technical
- New hooks: `useUndoRedo`, `useGanttUndoRedoKeys`
- New methods: `ganttUtils.calculateCriticalPath()`, `ganttUtils.autoScheduleDependents()`, `ganttUtils.splitTask()`
- New component: `ContextMenu` with split task option (scissor icon)
- API extension: `GanttBoardRef.splitTask()` for imperative control
- Bundle impact: ~3KB for CPM, auto-scheduling, and split task features combined

---

## [0.7.0] - 2025-01-04

### Added

#### Initial Release - LibXAI Suite
- Package renamed from `@asakaa/board` to `@libxai/board`
- 40+ imperative methods with DHTMLX-compatible API
- Multi-level task hierarchy with visual indentation
- Dependency management: 4 types (SS, FF, SF, FS)
- Drag-to-resize and move task bars
- Progress tracking with visual indicators
- Milestone markers (diamond shapes)
- Export formats: PDF, Excel, PNG, CSV
- 6 zoom levels: Hour, Day, Week, Month, Quarter, Year
- Keyboard shortcuts for task operations
- Column management with customizable visibility

#### Kanban Board Features
- Drag-and-drop powered by @dnd-kit
- Virtual scrolling for 10,000+ cards
- Advanced filtering and search
- Multi-select and bulk operations
- Command palette (Cmd+K)
- Export/Import: JSON, CSV, PDF

#### Shared Features
- TypeScript with complete type definitions
- 3 professional themes: Dark, Light, Neutral
- Responsive design with WCAG AA compliance
- Zero configuration required

### Package Information
- NPM: `npm install @libxai/board`
- Repository: https://github.com/libxai/libxai-suite
- Homepage: https://libxai.com/board
- License: BUSL-1.1 (converts to Apache 2.0 on 2027-10-12)

---

## [0.6.0] - 2024-12-15

### Added
- Timeline component with multiple time scales
- Resource allocation view for Gantt charts
- Customizable column types and templates
- Bulk edit operations for multiple tasks
- Advanced date calculations and business day support

### Changed
- Improved performance for large datasets (5000+ tasks)
- Optimized rendering pipeline with virtualization
- Enhanced accessibility with ARIA labels

---

## [0.5.0] - 2024-11-20

### Added
- Initial Gantt chart implementation
- Task hierarchy with parent-child relationships
- Basic dependency lines (FS type only)
- Timeline zoom controls
- Task creation and editing via modal

### Changed
- Migrated to React 18
- Updated build system to tsup

---

## [0.4.0] - 2024-10-05

### Added
- Kanban board core functionality
- Column management with drag-and-drop
- Card CRUD operations
- Basic filtering by labels and assignees
- Dark mode theme

### Technical
- Initial TypeScript setup
- ESLint and Prettier configuration
- Storybook integration for component development

---

[0.8.1]: https://github.com/libxai/libxai-suite/compare/v0.8.1-patch.1...v0.8.1
[0.8.1-patch.1]: https://github.com/libxai/libxai-suite/compare/v0.8.0...v0.8.1-patch.1
[0.8.0]: https://github.com/libxai/libxai-suite/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/libxai/libxai-suite/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/libxai/libxai-suite/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/libxai/libxai-suite/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/libxai/libxai-suite/releases/tag/v0.4.0
