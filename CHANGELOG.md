# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-01-04

### 🎉 Initial Release - LibXAI Suite

This is the inaugural release of **@libxai/board**, the flagship component of LibXAI Suite.

**Migration Note**: This package was previously published as `@asakaa/board`. All functionality remains the same with improved branding and organizational structure.

### What's Included

#### Gantt Chart Features
- 40+ imperative methods with DHTMLX-compatible API
- Critical Path Analysis with automatic CPM calculation
- Auto-scheduling with dependency cascade
- Split tasks with configurable gaps (Bryntum-style)
- Dependency management (4 types: SS, FF, SF, FS)
- Circular dependency detection using DFS algorithm
- Export to PDF, Excel, PNG, CSV
- 6 zoom levels: Hour, Day, Week, Month, Quarter, Year
- 50-level undo/redo system
- Multi-level task hierarchy with visual indentation
- Drag-to-resize and move task bars
- Progress tracking with visual indicators
- Milestone markers (diamond shapes)
- Today indicator line

#### Kanban Board Features
- Smooth drag-and-drop powered by @dnd-kit
- Virtual scrolling for 10,000+ cards
- Advanced filtering and search
- Multi-select and bulk operations
- Command palette (Cmd+K)
- Export/Import (JSON, CSV, PDF)

#### Shared Features
- TypeScript with complete type definitions
- 3 professional themes: Dark, Light, Neutral
- Responsive design
- WCAG AA compliant
- Keyboard shortcuts
- Zero configuration required

### Package Information
- **NPM**: `npm install @libxai/board`
- **Repository**: https://github.com/libxai/libxai-suite
- **Homepage**: https://libxai.com/board
- **License**: BUSL-1.1 (converts to Apache 2.0 on 2027-10-12)

---

## [0.8.1-patch.1] - 2025-11-03

### Fixed
- **Split Task Persistence**: Fixed critical bug where split task segments returned to original position after drag
  - Root cause: `GanttBoard.handleTaskDateChange` was not preserving `segments` array when updating task dates
  - Solution: Added conditional spread operator to preserve segments: `...(task.segments && { segments: task.segments })`
  - Impact: Segment positions now persist correctly after drag operations

### Changed
- **Code Architecture**: Refactored drag state management for better modularity
  - Extracted drag state logic into `useDragState` custom hook
  - Centralized 14 individual useState calls into single hook invocation
  - Improved maintainability with computed states (isDragging, isResizing, isConnecting)
  - Added `resetDragState` function to eliminate code duplication

### Technical
- New hook: `useDragState` for centralized drag state management (127 lines)
- Reduced TaskBar.tsx complexity by extracting state logic
- Fixed TypeScript unused import warning

---

## [0.8.1] - 2025-11-02

### Added - Killer Features (Better than DHTMLX!)

ASAKAA Gantt now includes 3 game-changing features that make it objectively BETTER than DHTMLX Gantt:

#### 1. Automatic Critical Path Method (CPM) - FREE
**Why this matters**: DHTMLX charges $1,299 per developer for critical path in their PRO license. We include it FREE with automatic recalculation.

- **Visual Highlighting**: Critical path tasks automatically display in RED (#DC2626) for instant identification
- **Full CPM Algorithm**: Forward Pass (ES/EF) and Backward Pass (LS/LF) implementation
- **Zero Configuration**: Automatically recalculates whenever tasks or dependencies change
- **Real-time Updates**: Uses `useMemo` for optimal performance without manual triggers
- **Slack Calculation**: Identifies tasks with zero float time on critical path
- **Smart Detection**: Works with multi-level task hierarchies and complex dependencies

**DHTMLX Comparison**:
- DHTMLX: $1,299/dev PRO license + manual configuration required
- ASAKAA: FREE + automatic recalculation on every change

#### 2. Intelligent Auto-Scheduling - FREE
**Why this matters**: DHTMLX requires manual configuration and doesn't cascade updates. We do it automatically with full cascade support.

- **Cascade Effect**: Moving a task automatically reschedules ALL dependent tasks recursively
- **Duration Preservation**: Task durations remain constant during rescheduling
- **Smart Dependencies**: Handles complex dependency chains with proper sequencing
- **Zero Manual Work**: No need to manually update dependent tasks
- **Instant Feedback**: Changes propagate immediately in the UI
- **Recursive Algorithm**: Uses `ganttUtils.autoScheduleDependents()` for deep cascade

**Example**: Drag Task A from Jan 1-10 to Jan 5-15. All tasks depending on A automatically shift to start after Jan 15.

**DHTMLX Comparison**:
- DHTMLX: Requires manual configuration + no automatic cascade
- ASAKAA: Fully automatic with recursive cascade effect

#### 3. Split Task Feature (with GAP support) - FREE
**Why this matters**: DHTMLX/Bryntum charge premium for split task, requiring complex configuration. We provide it FREE with Bryntum-style gap rendering.

- **Context Menu Access**: Right-click any task bar to split it
- **GAP Creation**: Creates pause in work schedule while keeping same task
- **Visual Segments**: Renders multiple time segments with gaps between them
- **Duration Preservation**: Total work days remain constant (end date extends by gap)
- **Configurable Gap**: Default 3-day pause, customizable via API
- **Segments Array**: Task stores multiple `{startDate, endDate}` segments
- **Imperative API**: `ganttUtils.splitTask(tasks, taskId, splitDate, gapDays)`
- **GanttBoardRef API**: `ref.splitTask(taskId, splitDate, gapDays)`

**Example**:
- Original: Jan 1-10 (10 days continuous work)
- After split at Jan 5 with 3-day gap: Jan 1-4 [GAP: Jan 5-7] Jan 8-13
- Same task, same name, just paused for 3 days

**Visual Rendering**: Multiple task bars on same row with visible gaps

**DHTMLX/Bryntum Comparison**:
- DHTMLX/Bryntum: Premium feature, complex configuration
- ASAKAA: FREE + Simple right-click + Automatic visual rendering

### Technical Implementation

- **New Methods**: `ganttUtils.calculateCriticalPath()`, `ganttUtils.autoScheduleDependents()`, `ganttUtils.splitTask()`
- **Context Menu**: Added `ContextMenu` component with split task option (scissor icon)
- **Visual Updates**: RED task bars for critical path (#DC2626)
- **API Extension**: `GanttBoardRef.splitTask()` for imperative control
- **Performance**: All features use memoization and efficient algorithms
- **Bundle Size**: Minimal impact (~3KB) for all 3 features combined

### Why Choose ASAKAA Over DHTMLX?

| Feature | ASAKAA Gantt | DHTMLX Gantt |
|---------|--------------|--------------|
| **Critical Path** | ✅ FREE + Auto-calculated | ❌ PRO only ($1,299/dev) + Manual config |
| **Auto-Scheduling** | ✅ FREE + Automatic cascade | ❌ Requires manual configuration |
| **Split Task** | ✅ FREE + Built-in | ❌ Not available |
| **Total Cost** | ✅ **$0** | ❌ **$1,299 per developer** |

---

## [0.8.0] - 2025-01-26

### Added

#### Gantt Chart - Critical Improvements
- **Circular Dependency Detection**: Prevents creation of circular task dependencies using DFS algorithm
  - Visual feedback with alert modal when circular dependency is detected
  - Protects workflow integrity and prevents logical deadlocks
- **Date Validation System**: Comprehensive validation for task date ranges
  - Prevents invalid states where start date > end date
  - Enforces minimum task duration of 1 day
  - Silent validation with console warnings for better UX
- **Undo/Redo System**: Complete history management for all task operations
  - Support for up to 50 levels of undo/redo
  - Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Y` (redo) on Windows/Linux
  - Keyboard shortcuts: `Cmd+Z` (undo), `Cmd+Shift+Z` (redo) on macOS
  - Functional update support for state management
  - Covers all operations: create, delete, edit, move, indent, outdent, duplicate tasks

#### Gantt Chart - Visual Enhancements
- **Hierarchical Icon System**: Differentiated icons based on task level
  - Level 0 (Projects): Thick circle icon (2px stroke)
  - Level 1 (Tasks): Regular circle icon (1.5px stroke)
  - Level 2+ (Subtasks): Small filled dot (2.5px radius)
  - Milestones: Diamond icon with accent color
- **Enhanced Typography Hierarchy**: Improved visual hierarchy in task list
  - Level 0: 14px, Semi-Bold (600), 100% opacity
  - Level 1: 13px, Medium (500), 95% opacity
  - Level 2+: 12px, Regular (400), 88% opacity
- **Improved Tooltip System**: Fixed tooltip persistence issues
  - Tooltips properly hide when dragging operations start
  - AnimatePresence for smooth exit animations
  - No tooltip accumulation during link creation

#### Gantt Chart - User Experience
- **Horizontal Scrolling**: Fixed horizontal scroll to view future dates beyond viewport
- **Today Indicator**: Red vertical line marking current date in timeline
- **Progress Visualization**: Inline progress bars with percentage display
- **Milestone Differentiation**: Milestones render as diamonds in timeline (not bars)
- **Default Week View**: Timeline defaults to week view for optimal balance
- **Dependency Lines**: Curved dependency lines showing task flow

### Fixed
- Tooltip "Link" text no longer persists when creating task dependencies
- Horizontal scroll now works correctly for extended timelines
- Task date validation prevents invalid date ranges

### Changed
- Default column visibility: Only "Task Name" visible by default
- Other columns accessible via "+" button in column manager
- Typography refinement for better visual hierarchy

### Technical
- New hooks: `useUndoRedo`, `useGanttUndoRedoKeys`
- Enhanced `TaskBar` component with date validation
- Improved `GanttBoard` with circular dependency detection
- Better type safety with functional update support

---

## [0.7.0] - Previous Release

### Added
- Gantt chart component with timeline visualization
- Task hierarchy with subtasks
- Drag and drop for task scheduling
- Dependency management
- Multiple view modes (Day, Week, Month)
- Theme support (Light, Dark, High Contrast)
- Column management
- Keyboard shortcuts for task operations

[0.8.0]: https://github.com/asakaa/board/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/asakaa/board/releases/tag/v0.7.0
