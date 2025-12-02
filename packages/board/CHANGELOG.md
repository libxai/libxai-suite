# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.16.9] - 2024-12-02

### Fixed
- **Gantt Separator Line**: Simplified to single clean divider line
  - Removed duplicate borders (TaskGrid border-right + separator lines)
  - Now only one 1px line between TaskGrid and Timeline
  - Clean visual appearance without multiple lines

---

## [0.16.8] - 2024-12-02

### Fixed
- **Gantt Separator Line**: Completely redesigned the resizable divider between TaskGrid and Timeline
  - Changed from thick 8px gray bar to thin 1px line
  - Transparent clickable area (12px) for easy grabbing
  - Visual line only 1px wide (expands to 2px when resizing)
  - Smooth hover indicator with accent color
  - Fixed erratic resize behavior by calculating position relative to container
  - Better min/max width constraints (200px - 800px)

---

## [0.16.7] - 2024-12-01

### Fixed
- **Subtask Date Inheritance**: Subtasks now inherit start/end dates from parent task
  - Previously subtasks used fixed dates (today + 7 days) regardless of parent
  - Now subtasks fit within parent task date range
  - Ensures visual consistency in Gantt chart

---

## [0.16.6] - 2024-12-01

### Changed
- **Production Ready**: Removed all debug console.log statements from GanttBoard and TaskGrid
- **Split Task Menu**: Disabled Split Task in TaskGrid context menu (only available in Timeline)
- Code cleanup for professional release

---

## [0.16.5] - 2024-12-01

### Fixed
- **Context Menu Delete Persistence**: Fixed critical bug where deleting tasks from context menu didn't persist to database
  - Root cause: Timeline context menu was using `config.onTaskDelete` which didn't exist in consumer apps
  - Solution: Now uses `handleMultiTaskDelete` which properly calls `config.onMultiTaskDelete`
  - Impact: Delete operations now correctly persist to database

### Changed
- Unified delete flow across TaskGrid and Timeline context menus

---

## [0.16.4] - 2024-12-01

### Added
- Debug logging for task delete flow to diagnose persistence issues
  - Logs in TaskGrid context menu
  - Logs in GanttBoard handleMultiTaskDelete

---

## [0.16.3] - 2024-12-01

### Fixed
- **Unified Context Menu**: TaskGrid now uses the same context menu as Timeline
  - Both menus now have identical options with i18n support
  - "Add Subtask" action now properly calls `onCreateSubtask` callback

### Added
- `GanttI18nContext` integration in TaskGrid for translations
- New icons: `MenuIcons.Pencil`, `MenuIcons.MarkIncomplete`, `MenuIcons.SetInProgress`, `MenuIcons.MarkComplete`

---

## [0.16.2] - 2024-11-30

### Fixed
- **Double Modal Bug**: Fixed issue where double-clicking a task opened two edit modals
  - Root cause: Both library and consumer were opening modals on double-click
  - Solution: Added check `if (!onTaskEdit)` before opening built-in modal

---

## [0.16.1] - 2024-11-30

### Added
- **Context Menu Callbacks**: New callbacks for context menu actions
  - `onTaskEdit`: Called when "Edit Task" is clicked
  - `onTaskAddSubtask`: Called when "Add Subtask" is clicked
  - `onTaskMarkIncomplete`: Called when "Mark Incomplete" is clicked
  - `onTaskSetInProgress`: Called when "Set In Progress" is clicked
- **i18n for Context Menu**: Added translations for all context menu labels

---

## [0.16.0] - 2024-11-30

### Added
- **Enhanced Context Menu**: Full-featured context menu with status management
  - Edit Task, Add Subtask options
  - Mark Incomplete, Set In Progress, Mark Complete
  - Split Task, Delete Task
- **Consumer Callbacks**: Support for custom handlers for all context menu actions

---

## [0.15.0] - 2024-11-28

### Added
- **Internationalization (i18n) System**
  - `locale` prop in config ('en' | 'es')
  - `customTranslations` for overriding defaults
  - Full Spanish language support
- **useGanttI18n Hook**: Access translations anywhere in component tree

---

## [0.14.7] - 2024-11-26

### Changed
- **Default Task Color**: Changed from indigo (#6366F1) to electric blue (#3B82F6)

---

## [0.14.3] - 2024-11-24

### Added
- **Create Task Button**: `showCreateTaskButton` and `onCreateTask` in config

---

## [0.14.0] - 2024-11-22

### Added
- **AI Assistant Integration**: Natural language task editing with `aiAssistant` config

---

## [0.13.11] - 2024-11-20

### Fixed
- **Scroll Synchronization**: Improved TaskGrid and Timeline scroll sync

---

## [0.13.8] - 2024-11-17

### Added
- **Column Resize**: Draggable column borders with `onColumnResize` callback
- **Task Name Tooltip**: Full name shown on hover

---

## [0.11.2] - 2024-11-10

### Added
- **Disable Auto Critical Path**: `enableAutoCriticalPath: false` to preserve custom colors

---

## [0.11.0] - 2024-11-08

### Added
- **Custom Task Colors**: `color` property on Task with color picker in form

---

## [0.10.0] - 2024-11-05

### Added
- **Task Edit Modal**: Built-in `TaskFormModal` component, opens on double-click

---

## [0.9.0] - 2024-11-01

### Added
- **GanttBoardRef**: 40+ imperative methods for programmatic control

---

## [0.8.1] - 2024-10-30

### Added - Premium Features (FREE)
- **Critical Path Method (CPM)**: Automatic calculation - FREE (vs DHTMLX $1,299/dev)
- **Auto-Scheduling**: Dependency cascade - FREE
- **Split Task Feature**: Bryntum-style gaps - FREE

---

## [0.8.0] - 2024-10-28

### Initial Release - LibXAI Suite

#### Gantt Chart
- 40+ imperative methods (DHTMLX-compatible API)
- Critical Path Analysis, Auto-scheduling, Split tasks
- Dependency management (SS, FF, SF, FS)
- Export: PDF, Excel, PNG, CSV
- 6 zoom levels, 50-level undo/redo
- Multi-level hierarchy, drag operations, milestones

#### Kanban Board
- @dnd-kit drag-and-drop
- Virtual scrolling (10,000+ cards)
- Filtering, search, multi-select
- Command palette (Cmd+K)

#### Core
- TypeScript with complete types
- 3 themes: Dark, Light, Neutral
- WCAG AA compliant, keyboard shortcuts
- Zero configuration required

---

## Package Information

- **NPM**: `npm install @libxai/board`
- **Repository**: https://github.com/libxai/libxai-suite
- **License**: BUSL-1.1 (Apache 2.0 on 2027-10-12)
