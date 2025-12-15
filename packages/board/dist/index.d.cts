import * as _libxai_core from '@libxai/core';
import { Dependency, BaseViewAdapter, ViewBoardData, ExportFormat as ExportFormat$1, ViewOptions, BoardData, ColumnData, CardData, BoardState, BoardStore, Board as Board$1, Column as Column$2, Card as Card$2, Priority as Priority$1, CardStatus as CardStatus$1, DragState, SelectionState } from '@libxai/core';
export { AutoScheduleOptions, BaseEntity, Baseline, BaselineCardSnapshot, BoardData, Board as BoardModel, BoardState, BoardStore, CardData, Card as CardModel, ColumnData, Column as ColumnModel, CriticalPath, Dependency, DependencyEngine, DependencyType, DependencyValidation, GanttConfig, GanttState, Milestone, ResourceAllocation, ResourceUtilization, ScheduledTask, Store, StoreEvent, TaskConstraint, TaskConstraintType, UserData } from '@libxai/core';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React$1 from 'react';
import React__default, { Component, ReactNode, ErrorInfo } from 'react';
import { ClassValue } from 'clsx';
import * as _tanstack_virtual_core from '@tanstack/virtual-core';

/**
 * Card Stack Types
 * Smart grouping of related cards within columns
 * @module types/card-stack
 */
type StackingStrategy = 'manual' | 'ai-similarity' | 'labels' | 'assignee' | 'priority' | 'epic';
interface CardStack$1 {
    /** Unique stack identifier */
    id: string;
    /** Display title for the stack */
    title: string;
    /** Cards contained in this stack */
    cardIds: string[];
    /** Column this stack belongs to */
    columnId: string;
    /** How this stack was created */
    strategy: StackingStrategy;
    /** Visual color for the stack */
    color?: string;
    /** Whether stack is expanded or collapsed */
    isExpanded: boolean;
    /** Position within the column */
    position: number;
    /** Timestamp when stack was created */
    createdAt: Date;
    /** AI confidence score (0-1) for auto-stacked groups */
    confidence?: number;
}
interface StackingConfig {
    /** Enable automatic AI-powered stacking */
    enableAutoStacking: boolean;
    /** Minimum confidence threshold for auto-stacking (0-1) */
    autoStackConfidenceThreshold: number;
    /** Minimum cards required to form a stack */
    minCardsPerStack: number;
    /** Enable manual drag-to-stack */
    enableManualStacking: boolean;
    /** Show stack summaries (card count, assignees, etc.) */
    showStackSummaries: boolean;
    /** Animation duration in ms */
    animationDuration: number;
}
interface StackSuggestion {
    /** Suggested stack configuration */
    stack: Omit<CardStack$1, 'id' | 'createdAt' | 'isExpanded' | 'position'>;
    /** Reason for suggestion */
    reason: string;
    /** Confidence score (0-1) */
    confidence: number;
}

/**
 * Core types for ASAKAA Kanban Board
 * @module types
 */

/**
 * Priority levels for cards
 */
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
/**
 * Subtask entity
 * Represents a checklist item within a card
 */
interface Subtask {
    /** Unique identifier */
    id: string;
    /** Subtask title */
    title: string;
    /** Completion status */
    completed: boolean;
    /** Position within the subtask list */
    position?: number;
    /** Assigned user ID (optional) */
    assigneeId?: string;
    /** Due date (optional) */
    dueDate?: Date | string;
    /** Created timestamp */
    createdAt?: Date | string;
    /** Updated timestamp */
    updatedAt?: Date | string;
}
/**
 * Card status types
 */
type CardStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
/**
 * Card entity
 * Represents a single task/item in the Kanban board
 */
interface Card$1 {
    /** Unique identifier */
    id: string;
    /** Card title (required) */
    title: string;
    /** Card description (optional) */
    description?: string;
    /** Lexicographic position within column (for ordering) */
    position: number;
    /** Parent column ID */
    columnId: string;
    /** Priority level */
    priority?: Priority;
    /** Assigned user ID (legacy - use assignedUserIds) */
    assigneeId?: string;
    /** Assigned user IDs (multiple users) */
    assignedUserIds?: string[];
    /** Tags/labels */
    labels?: string[];
    /** Due date (legacy - use startDate/endDate) */
    dueDate?: Date | string;
    /** Date range - start date */
    startDate?: Date | string;
    /** Date range - end date */
    endDate?: Date | string;
    /** Task dependencies - supports both legacy format (string[]) and new format (Dependency[]) */
    dependencies?: string[] | Dependency[];
    /** Estimated time (in hours) */
    estimatedTime?: number;
    /** Manual progress override (0-100%) */
    progress?: number;
    /** Cover image URL */
    coverImage?: string;
    /** Subtasks/checklist items */
    subtasks?: Subtask[];
    /** v0.17.29: Custom color for visual identification (hex color) */
    color?: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
/**
 * Column entity
 * Represents a stage/status in the workflow
 */
interface Column$1 {
    /** Unique identifier */
    id: string;
    /** Column title */
    title: string;
    /** Lexicographic position (for ordering columns) */
    position: number;
    /** Array of card IDs in this column */
    cardIds: string[];
    /** Work-in-progress limit */
    wipLimit?: number;
    /** WIP limit enforcement type: 'soft' = warning, 'hard' = block */
    wipLimitType?: 'soft' | 'hard';
    /** Color for visual distinction */
    color?: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
/**
 * Board entity
 * Top-level container for the Kanban board
 */
interface Board {
    /** Unique identifier */
    id: string;
    /** Board title */
    title?: string;
    /** Array of columns */
    columns: Column$1[];
    /** Array of all cards */
    cards: Card$1[];
    metadata?: Record<string, any>;
}
/**
 * Callbacks for board operations
 * These allow the library consumer to persist changes
 */
interface BoardCallbacks {
    /** Called when a card is moved to a different position/column */
    onCardMove?: (cardId: string, targetColumnId: string, position: number) => void | Promise<void>;
    /** Called when card properties are updated */
    onCardUpdate?: (cardId: string, updates: Partial<Card$1>) => void | Promise<void>;
    /** Called when a new card is created */
    onCardCreate?: (card: Omit<Card$1, 'id'>) => void | Promise<void>;
    /** Called when a card is deleted */
    onCardDelete?: (cardId: string) => void | Promise<void>;
    /** Called when a new column is created */
    onColumnCreate?: (column: Omit<Column$1, 'id' | 'cardIds'>) => void | Promise<void>;
    /** Called when column properties are updated */
    onColumnUpdate?: (columnId: string, updates: Partial<Column$1>) => void | Promise<void>;
    /** Called when a column is deleted */
    onColumnDelete?: (columnId: string) => void | Promise<void>;
    /** Called when columns are reordered */
    onColumnReorder?: (columnId: string, newPosition: number) => void | Promise<void>;
    /** Called when WIP limit is exceeded (hard limit only) */
    onWipLimitExceeded?: (column: Column$1, card: Card$1) => void;
}
/**
 * Insight types generated by AI
 */
type InsightType = 'RISK_DELAY' | 'RISK_OVERLOAD' | 'RISK_BLOCKER' | 'OPPORTUNITY' | 'SUGGESTION';
/**
 * Severity levels for insights
 */
type InsightSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * AI-generated insight about the board state
 */
interface Insight {
    /** Unique identifier */
    id?: string;
    /** Type of insight */
    type: InsightType;
    /** Severity level */
    severity: InsightSeverity;
    /** Human-readable title */
    title: string;
    /** Detailed description */
    description: string;
    /** AI confidence score (0-1) */
    confidence: number;
    /** Suggested action to take */
    suggestedAction?: string;
    /** Related card IDs */
    relatedCardIds?: string[];
    /** Related column IDs */
    relatedColumnIds?: string[];
    /** Timestamp */
    timestamp?: Date | string;
}
/**
 * Result of AI assignee suggestion
 */
interface AssigneeSuggestion {
    /** Suggested user ID */
    userId: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Reasoning for suggestion */
    reasoning: string;
}
/**
 * Result of AI plan generation
 */
interface GeneratedPlan {
    /** Generated columns */
    columns: Omit<Column$1, 'id'>[];
    /** Generated cards */
    cards: Omit<Card$1, 'id'>[];
    /** Explanation of the plan */
    explanation?: string;
}
/**
 * AI callbacks (optional)
 * Consumer provides these if they want AI features
 */
interface AICallbacks {
    /** Generate a complete board plan from a text prompt */
    onGeneratePlan?: (prompt: string) => Promise<GeneratedPlan>;
    /** Suggest best assignee for a card */
    onSuggestAssignee?: (card: Card$1) => Promise<AssigneeSuggestion>;
    /** Predict risks and opportunities based on board state */
    onPredictRisks?: (boardState: Board) => Promise<Insight[]>;
    /** Generate subtasks for a card */
    onGenerateSubtasks?: (card: Card$1) => Promise<Omit<Card$1, 'id'>[]>;
    /** Estimate effort for a card */
    onEstimateEffort?: (card: Card$1) => Promise<{
        hours: number;
        confidence: number;
    }>;
}
/**
 * Configuration options for the Kanban board
 */
interface BoardConfig {
    /** Theme: 'dark' | 'light' | 'neutral' */
    theme?: 'dark' | 'light' | 'neutral';
    /** Locale for i18n */
    locale?: 'en' | 'es' | string;
    /** Enable virtualization (auto-enabled if >100 cards) */
    enableVirtualization?: boolean;
    /** Enable AI features */
    enableAI?: boolean;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Fixed column width in pixels */
    columnWidth?: number;
    /** Estimated card height for virtualization */
    cardHeight?: number;
    /** Enable keyboard shortcuts */
    enableKeyboardShortcuts?: boolean;
    /** Show card count in column headers */
    showCardCount?: boolean;
    /** Show WIP limits */
    showWipLimits?: boolean;
    /** Enable column collapsing */
    enableCollapsible?: boolean;
    /** Maximum cards to display per column before showing "show more" */
    maxCardsPerColumn?: number;
}
/**
 * Render props for customization
 */
interface RenderProps {
    /** Custom card renderer */
    renderCard?: (card: Card$1) => React.ReactNode;
    /** Custom column renderer */
    renderColumn?: (column: Column$1, cards: Card$1[]) => React.ReactNode;
    /** Custom card overlay during drag */
    renderCardOverlay?: (card: Card$1) => React.ReactNode;
    /** Custom column header */
    renderColumnHeader?: (column: Column$1, cardCount: number) => React.ReactNode;
    /** Custom empty state */
    renderEmptyState?: (column: Column$1) => React.ReactNode;
}
/**
 * User entity for assignment
 */
interface User$1 {
    id: string;
    name: string;
    initials: string;
    color: string;
    avatar?: string;
}
/**
 * Main KanbanBoard component props
 */
interface KanbanBoardProps {
    /** Board data (controlled) */
    board: Board;
    /** Callbacks for mutations */
    callbacks: BoardCallbacks;
    /** AI callbacks (optional) */
    aiCallbacks?: AICallbacks;
    /** Card click handler */
    onCardClick?: (card: Card$1) => void;
    /** Render customization */
    renderProps?: RenderProps;
    /** Configuration */
    config?: BoardConfig;
    /** Available users for assignment */
    availableUsers?: User$1[];
    /** Custom CSS class */
    className?: string;
    /** Custom inline styles */
    style?: React.CSSProperties;
    /** Loading state */
    isLoading?: boolean;
    /** Error state */
    error?: Error | string;
}
/**
 * Drag event data
 */
interface DragData {
    /** Card being dragged */
    card: Card$1;
    /** Source column ID */
    sourceColumnId: string;
    /** Source position */
    sourcePosition: number;
}
/**
 * Drop event data
 */
interface DropData {
    /** Card being dropped */
    card: Card$1;
    /** Target column ID */
    targetColumnId: string;
    /** Target position */
    targetPosition: number;
    /** Source column ID */
    sourceColumnId: string;
}
/**
 * Filter criteria for cards
 */
interface CardFilter {
    /** Filter by assignee */
    assigneeIds?: string[];
    /** Filter by priority */
    priorities?: Priority[];
    /** Filter by labels */
    labels?: string[];
    /** Search in title/description */
    search?: string;
    /** Filter by date range */
    dateRange?: {
        start: Date | string;
        end: Date | string;
    };
}
/**
 * Sort options for cards
 */
type CardSortKey = 'position' | 'priority' | 'dueDate' | 'createdAt' | 'title';
interface CardSort {
    key: CardSortKey;
    direction: 'asc' | 'desc';
}
/**
 * Comment on a card
 */
interface Comment {
    /** Unique identifier */
    id: string;
    /** Card ID */
    cardId: string;
    /** Author user ID */
    authorId: string;
    /** Comment content */
    content: string;
    /** Timestamp */
    createdAt: Date | string;
    /** Last update timestamp */
    updatedAt?: Date | string;
    /** Mentions (user IDs) */
    mentions?: string[];
}
/**
 * Activity log entry types
 */
type ActivityType = 'CARD_CREATED' | 'CARD_UPDATED' | 'CARD_MOVED' | 'CARD_DELETED' | 'COMMENT_ADDED' | 'USER_ASSIGNED' | 'USER_UNASSIGNED' | 'PRIORITY_CHANGED' | 'DUE_DATE_CHANGED' | 'LABEL_ADDED' | 'LABEL_REMOVED' | 'DEPENDENCY_ADDED' | 'DEPENDENCY_REMOVED' | 'ATTACHMENT_ADDED' | 'ATTACHMENT_REMOVED';
/**
 * Activity log entry
 */
interface Activity {
    /** Unique identifier */
    id: string;
    /** Activity type */
    type: ActivityType;
    /** Card ID */
    cardId: string;
    /** User who performed the action */
    userId: string;
    /** Timestamp */
    timestamp: Date | string;
    /** Previous value (for updates) */
    previousValue?: any;
    /** New value (for updates) */
    newValue?: any;
    /** Additional metadata */
    metadata?: Record<string, any>;
}
/**
 * File attachment on a card
 */
interface Attachment {
    /** Unique identifier */
    id: string;
    /** Card ID */
    cardId: string;
    /** File name */
    name: string;
    /** File size in bytes */
    size: number;
    /** MIME type */
    type: string;
    /** File URL or data URI */
    url: string;
    /** Upload timestamp */
    uploadedAt: Date | string;
    /** User who uploaded */
    uploadedBy: string;
    /** Thumbnail URL (for images) */
    thumbnailUrl?: string;
}
/**
 * Bulk operations callbacks
 */
interface BulkOperationsCallbacks {
    /** Called when bulk update is performed */
    onBulkUpdate?: (cardIds: string[], updates: Partial<Card$1>) => void | Promise<void>;
    /** Called when bulk delete is performed */
    onBulkDelete?: (cardIds: string[]) => void | Promise<void>;
    /** Called when bulk move is performed */
    onBulkMove?: (cardIds: string[], targetColumnId: string) => void | Promise<void>;
}
/**
 * Grouping options for swimlanes
 */
type GroupByOption = 'none' | 'assignee' | 'priority' | 'label' | 'custom';
/**
 * Swimlane configuration
 */
interface SwimlaneConfig {
    /** Grouping option */
    groupBy: GroupByOption;
    /** Custom field ID (when groupBy is 'custom') */
    customFieldId?: string;
    /** Show empty swimlanes */
    showEmptyLanes?: boolean;
    /** Collapsible swimlanes */
    collapsible?: boolean;
    /** Default collapsed state */
    defaultCollapsed?: boolean;
}
/**
 * Swimlane (horizontal row grouping cards)
 */
interface Swimlane {
    /** Unique identifier */
    id: string;
    /** Swimlane title */
    title: string;
    /** Group value (user ID, priority, label, etc.) */
    groupValue: any;
    /** Card IDs in this swimlane */
    cardIds: string[];
    /** Is collapsed */
    isCollapsed?: boolean;
    /** Color for visual distinction */
    color?: string;
    /** Icon */
    icon?: string;
}
/**
 * Keyboard shortcut action types
 * v0.5.0: Added single-key shortcuts for speed
 */
type KeyboardAction = 'navigate_up' | 'navigate_down' | 'navigate_left' | 'navigate_right' | 'open_card' | 'close_modal' | 'select_all' | 'deselect_all' | 'new_card' | 'edit_card' | 'delete_card' | 'focus_search' | 'show_shortcuts' | 'new_card_modal' | 'search' | 'open_filters' | 'save' | 'undo' | 'redo' | 'quick_add' | 'delete_card_confirm';
/**
 * Keyboard shortcut definition
 */
interface KeyboardShortcut {
    /** Shortcut key(s) */
    keys: string | string[];
    /** Action to perform */
    action: KeyboardAction;
    /** Description */
    description: string;
    /** Modifier keys required */
    modifiers?: {
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        meta?: boolean;
    };
}
/**
 * Card template for quick creation
 */
interface CardTemplate {
    /** Unique identifier */
    id: string;
    /** Template name */
    name: string;
    /** Template description */
    description?: string;
    /** Icon or emoji */
    icon?: string;
    /** Pre-filled card data */
    template: Partial<Omit<Card$1, 'id' | 'position' | 'columnId'>>;
    /** Category for organization */
    category?: string;
}
/**
 * Export format options
 */
type ExportFormat = 'json' | 'csv' | 'pdf';
/**
 * Export options
 */
interface ExportOptions {
    /** Format to export */
    format: ExportFormat;
    /** Include card details */
    includeCardDetails?: boolean;
    /** Include comments */
    includeComments?: boolean;
    /** Include activity log */
    includeActivity?: boolean;
    /** Include attachments */
    includeAttachments?: boolean;
    /** Date range filter */
    dateRange?: {
        start: Date | string;
        end: Date | string;
    };
}
/**
 * Import result
 */
interface ImportResult {
    /** Was import successful */
    success: boolean;
    /** Number of cards imported */
    cardsImported?: number;
    /** Number of columns imported */
    columnsImported?: number;
    /** Errors encountered */
    errors?: string[];
    /** Warnings */
    warnings?: string[];
}

/**
 * KanbanViewAdapter - ViewAdapter implementation for Kanban board
 * @module views/KanbanViewAdapter
 *
 * Implements the ViewAdapter interface from @libxai/core to enable
 * the Kanban board to work with AsakaaRuntime and ViewRegistry.
 */

/**
 * Kanban view configuration
 */
interface KanbanViewConfig {
    /**
     * Board callbacks
     */
    callbacks?: KanbanBoardProps['callbacks'];
    /**
     * Card click handler
     */
    onCardClick?: KanbanBoardProps['onCardClick'];
    /**
     * Custom render props
     */
    renderProps?: KanbanBoardProps['renderProps'];
    /**
     * Board configuration
     */
    config?: KanbanBoardProps['config'];
    /**
     * Available users for assignment
     */
    availableUsers?: KanbanBoardProps['availableUsers'];
    /**
     * Custom class name
     */
    className?: string;
    /**
     * Custom inline styles (React.CSSProperties)
     */
    style?: React.CSSProperties;
    /**
     * View options
     */
    viewOptions?: ViewOptions;
}
/**
 * KanbanViewAdapter
 *
 * React-based ViewAdapter implementation that wraps the KanbanBoard component.
 * This allows the Kanban board to be used as a view in the ViewRegistry and
 * work seamlessly with AsakaaRuntime.
 *
 * @example
 * ```typescript
 * import { KanbanViewAdapter } from '@libxai/board'
 * import { ViewRegistry } from '@libxai/core'
 *
 * const registry = new ViewRegistry()
 * const kanbanView = new KanbanViewAdapter({
 *   callbacks: {
 *     onCardMove: (cardId, columnId) => { ... },
 *     onCardUpdate: (cardId, updates) => { ... }
 *   }
 * })
 *
 * registry.register(kanbanView)
 * await registry.activate('kanban', container, data)
 * ```
 */
declare class KanbanViewAdapter extends BaseViewAdapter<ViewBoardData> {
    readonly id = "kanban";
    readonly name = "Kanban Board";
    readonly version = "1.0.0";
    readonly description = "";
    readonly icon = "";
    readonly supportedExports: ExportFormat$1[];
    private root;
    private kanbanConfig;
    constructor(config?: KanbanViewConfig);
    /**
     * Mount the Kanban view
     *
     * @param container - DOM element to mount into
     * @param data - Initial board data
     */
    mount(container: HTMLElement, data: ViewBoardData): void;
    /**
     * Unmount the Kanban view
     */
    unmount(): void;
    /**
     * Update the view with new data
     *
     * @param data - New board data
     */
    update(data: ViewBoardData): void;
    /**
     * Configure the view
     *
     * @param options - View options
     */
    configure(options: ViewOptions): void;
    /**
     * Export the view to a specific format
     *
     * @param format - Export format
     * @returns Promise resolving to exported data
     */
    export(format: 'json' | 'csv' | 'pdf' | 'png'): Promise<string | Blob>;
    /**
     * Render the Kanban board
     */
    private render;
    /**
     * Export board data to CSV format
     */
    private exportToCSV;
    /**
     * Export board to PDF
     * Uses the PDF export functionality from the Board component
     */
    private exportToPDF;
    /**
     * Export board to PNG image
     * Uses html2canvas to capture the board
     */
    private exportToPNG;
}
/**
 * Create a new Kanban view adapter
 *
 * @param config - View configuration
 * @returns KanbanViewAdapter instance
 *
 * @example
 * ```typescript
 * const kanbanView = createKanbanView({
 *   callbacks: {
 *     onCardMove: (cardId, columnId) => console.log('Card moved'),
 *   },
 *   theme: 'dark',
 * })
 * ```
 */
declare function createKanbanView(config?: KanbanViewConfig): KanbanViewAdapter;

declare function KanbanBoard({ board, callbacks, onCardClick, renderProps, config, availableUsers, className, style, isLoading, error, children, }: KanbanBoardProps & {
    children?: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

interface KanbanToolbarI18n {
    newTask: string;
    selectColumn: string;
    export: string;
    exportCSV: string;
    exportJSON: string;
    exportExcel: string;
}
interface KanbanToolbarProps {
    columns: Column$1[];
    /**
     * Handler for creating a new task.
     * - If useColumnSelector is true: receives columnId as parameter
     * - If useColumnSelector is false: called with no parameters (opens modal)
     */
    onCreateTask?: (columnId?: string) => void;
    createTaskLabel?: string;
    theme?: 'dark' | 'light';
    locale?: 'es' | 'en';
    /**
     * v0.17.27: If true, shows dropdown to select column before creating task.
     * If false, shows a simple button that triggers onCreateTask() without columnId.
     * @default false
     */
    useColumnSelector?: boolean;
    onExportCSV?: () => void;
    onExportJSON?: () => void;
    onExportExcel?: () => Promise<void>;
    translations?: Partial<KanbanToolbarI18n>;
}
declare function KanbanToolbar({ columns, onCreateTask, createTaskLabel, theme, locale, useColumnSelector, onExportCSV, onExportJSON, onExportExcel, translations, }: KanbanToolbarProps): react_jsx_runtime.JSX.Element;

/**
 * AddColumnButton Component
 * Button to add new columns to the Kanban board
 * @module components/Board/AddColumnButton
 */
interface AddColumnButtonProps {
    /** Callback when a new column should be created */
    onAddColumn: (title: string) => void;
    /** Custom class name */
    className?: string;
    /** Placeholder text for input */
    placeholder?: string;
    /** Button label */
    buttonLabel?: string;
    /** Whether the button is disabled */
    disabled?: boolean;
}
/**
 * AddColumnButton - A button that allows users to add new columns to the Kanban board
 *
 * Can be used in two modes:
 * 1. Simple mode: Just a button that calls onAddColumn with a default name
 * 2. Input mode: Shows an input field for the user to type the column name
 *
 * @example
 * ```tsx
 * // Simple usage - inside KanbanBoard as children
 * <KanbanBoard board={board} callbacks={callbacks}>
 *   <AddColumnButton onAddColumn={(title) => callbacks.onColumnCreate?.({ title, position: 1000 })} />
 * </KanbanBoard>
 *
 * // With useKanbanState hook
 * const { helpers } = useKanbanState({ initialBoard })
 * <AddColumnButton onAddColumn={(title) => helpers.addColumn({ title, position: Date.now() })} />
 * ```
 */
declare function AddColumnButton({ onAddColumn, className, placeholder, buttonLabel, disabled, }: AddColumnButtonProps): react_jsx_runtime.JSX.Element;

/**
 * User Assignment Selector Component
 * Multi-select user assignment with avatar display
 */
interface User {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
    color: string;
}
interface UserAssignmentSelectorProps {
    assignedUsers?: User[];
    availableUsers: User[];
    onChange: (users: User[]) => void;
    className?: string;
    maxVisibleAvatars?: number;
}
declare function UserAssignmentSelector({ assignedUsers, availableUsers, onChange, className, maxVisibleAvatars, }: UserAssignmentSelectorProps): react_jsx_runtime.JSX.Element;

interface AddCardData {
    /** Task name (required) */
    name: string;
    /** Column ID where the card will be created */
    columnId: string;
    /** Assigned user IDs */
    assigneeIds?: string[];
    /** Start date */
    startDate?: Date;
    /** End date / due date */
    endDate?: Date;
    /** Priority */
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}
interface AddCardButtonProps {
    /** Column ID where cards will be created */
    columnId: string;
    /** Callback when a new card should be created */
    onAddCard: (data: AddCardData) => void | Promise<void>;
    /** Available users for assignment */
    availableUsers?: User[];
    /** Custom class name */
    className?: string;
    /** Placeholder text for input */
    placeholder?: string;
    /** Button label */
    buttonLabel?: string;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Theme: 'light' or 'dark' */
    theme?: 'light' | 'dark';
    /** Locale for translations */
    locale?: 'en' | 'es';
}
/**
 * AddCardButton - ClickUp-style inline form to add new cards to a Kanban column
 *
 * Features:
 * - Expandable inline form with accent border
 * - Quick name input with inline action buttons
 * - Optional: assignee selector, date picker, priority
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 *
 * @example
 * ```tsx
 * <AddCardButton
 *   columnId="todo"
 *   onAddCard={(data) => createTask(data)}
 *   availableUsers={users}
 * />
 * ```
 */
declare function AddCardButton({ columnId, onAddCard, availableUsers, className, placeholder, buttonLabel, disabled, theme, locale, }: AddCardButtonProps): react_jsx_runtime.JSX.Element;

interface ColumnProps {
    /** Column data */
    column: Column$1;
    /** Cards in this column */
    cards: Card$1[];
    /** Custom column renderer */
    renderColumn?: (column: Column$1, cards: Card$1[]) => React.ReactNode;
    /** Custom card renderer */
    renderCard?: (card: Card$1) => React.ReactNode;
    /** Custom header renderer */
    renderHeader?: (column: Column$1, cardCount: number) => React.ReactNode;
    /** Custom empty state */
    renderEmptyState?: (column: Column$1) => React.ReactNode;
    /** Card click handler */
    onCardClick?: (card: Card$1) => void;
    /** Card update handler */
    onCardUpdate?: (cardId: string, updates: Partial<Card$1>) => void;
    /** Available users for assignment */
    availableUsers?: User[];
    /** All cards (for dependencies) */
    allCards?: Card$1[];
    /** Enable virtualization */
    enableVirtualization?: boolean;
    /** Estimated card height for virtualization */
    cardHeight?: number;
    /** Is column collapsed */
    isCollapsed?: boolean;
    /** Toggle collapse */
    onToggleCollapse?: () => void;
    /** Column rename handler */
    onColumnRename?: (columnId: string, newTitle: string) => void;
    /** v0.17.55: Column delete handler */
    onColumnDelete?: (columnId: string) => void;
    /** v0.17.55: Whether column can be deleted (false for default columns) */
    isDeletable?: boolean;
    /** Custom className */
    className?: string;
}
/**
 * Column Component
 * Uses virtualization for large lists automatically
 */
declare const Column: React$1.NamedExoticComponent<ColumnProps>;

/**
 * Editable Column Title Component
 * Allows inline editing of column names
 */
interface EditableColumnTitleProps {
    title: string;
    onSave: (newTitle: string) => void;
    className?: string;
}
declare function EditableColumnTitle({ title, onSave, className, }: EditableColumnTitleProps): react_jsx_runtime.JSX.Element;

interface CardProps {
    /** Card data */
    card: Card$1;
    /** Custom render function */
    render?: (card: Card$1) => React.ReactNode;
    /** Click handler */
    onClick?: (card: Card$1) => void;
    /** Is card selected */
    isSelected?: boolean;
    /** Disable drag */
    disableDrag?: boolean;
    /** Custom className */
    className?: string;
    /** Card update handler */
    onUpdate?: (cardId: string, updates: Partial<Card$1>) => void;
    /** Available users for assignment */
    availableUsers?: User[];
    /** All cards (for dependencies) */
    allCards?: Card$1[];
}
/**
 * Default Card Component
 * Optimized with memo to prevent unnecessary re-renders
 */
declare const Card: React$1.NamedExoticComponent<CardProps>;

interface PrioritySelectorProps {
    priority?: Priority;
    onChange: (priority?: Priority) => void;
    className?: string;
}
declare function PrioritySelector({ priority, onChange, className, }: PrioritySelectorProps): react_jsx_runtime.JSX.Element;

/**
 * Date Range Picker Component
 * Quick selection buttons + interactive calendar
 */
interface DateRangePickerProps {
    startDate?: string;
    endDate?: string;
    onChange: (startDate?: string, endDate?: string) => void;
    className?: string;
}
declare function DateRangePicker({ startDate, endDate, onChange, className, }: DateRangePickerProps): react_jsx_runtime.JSX.Element;

/**
 * Validate if adding a dependency would create a circular reference
 * Uses Depth-First Search (DFS) algorithm
 * @param allCards - All cards in the board
 * @param fromCardId - The card that would become a dependency (the task being depended on)
 * @param toCardId - The card that would depend on fromCardId
 * @returns True if adding this dependency would create a circular reference
 */
declare function wouldCreateCircularDependency(allCards: Card$1[], fromCardId: string, toCardId: string): boolean;
interface DependenciesSelectorProps {
    /** Current card (to exclude from dependencies) */
    currentCardId: string;
    /** Currently selected dependencies */
    dependencies?: string[];
    /** All available tasks */
    availableTasks: Card$1[];
    /** Change handler */
    onChange: (dependencies: string[]) => void;
    /** Custom className */
    className?: string;
    /** Enable circular dependency validation (default: true) */
    validateCircular?: boolean;
    /** Callback when circular dependency is detected */
    onCircularDependencyError?: (targetCardId: string, targetCardTitle: string) => void;
}
declare function DependenciesSelector({ currentCardId, dependencies, availableTasks, onChange, className, validateCircular, onCircularDependencyError, }: DependenciesSelectorProps): react_jsx_runtime.JSX.Element;

interface ErrorBoundaryProps {
    /** Child components to wrap */
    children: ReactNode;
    /** Custom fallback UI (receives error and reset callback) */
    fallback?: (error: Error, reset: () => void) => ReactNode;
    /** Callback when error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Component identifier for error tracking */
    componentName?: string;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
/**
 * Error Boundary for catching React errors
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error) => console.error(error)}
 *   componentName="KanbanBoard"
 * >
 *   <KanbanBoard {...props} />
 * </ErrorBoundary>
 * ```
 */
declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    resetError: () => void;
    render(): ReactNode;
}
/**
 * Hook-based error boundary wrapper
 * Use this for functional components
 */
declare function withErrorBoundary<P extends object>(Component: React__default.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>): {
    (props: P): react_jsx_runtime.JSX.Element;
    displayName: string;
};

interface CommandPaletteProps {
    /** Current board state */
    board: Board;
    /** Available users for assignment */
    availableUsers?: User$1[];
    /** Callback to create a new card */
    onCreateCard?: (columnId: string, title: string) => void;
    /** Callback to navigate to a card */
    onNavigateToCard?: (cardId: string) => void;
    /** Callback to search and filter cards */
    onSearch?: (query: string) => void;
    /** Callback to change card priority */
    onChangePriority?: (cardId: string, priority: Priority) => void;
    /** Callback to assign user to card */
    onAssignUser?: (cardId: string, userId: string) => void;
    /** AI Callbacks */
    onGeneratePlan?: () => void;
    onPredictRisks?: () => void;
    onOpenAIUsage?: () => void;
    /** Custom keyboard shortcut (default: Cmd+K / Ctrl+K) */
    shortcut?: string;
    /** Custom CSS class */
    className?: string;
}
declare function CommandPalette({ board, onCreateCard, onNavigateToCard, onSearch, onChangePriority, onAssignUser, onGeneratePlan, onPredictRisks, onOpenAIUsage, shortcut, className, }: CommandPaletteProps): react_jsx_runtime.JSX.Element | null;

interface CardDetailModalProps {
    /** Card to display */
    card: Card$1 | null;
    /** Whether modal is open */
    isOpen: boolean;
    /** Close callback */
    onClose: () => void;
    /** Update card callback */
    onUpdate?: (cardId: string, updates: Partial<Card$1>) => void;
    /** Delete card callback */
    onDelete?: (cardId: string) => void;
    /** Available users for assignment */
    availableUsers?: User$1[];
    /** Comments for this card */
    comments?: Comment[];
    /** Activity log for this card */
    activities?: Activity[];
    /** AI insights for this card */
    aiInsights?: Insight[];
    /** Attachments for this card */
    attachments?: Attachment[];
    /** Add comment callback */
    onAddComment?: (cardId: string, content: string) => void;
    /** Delete comment callback */
    onDeleteComment?: (commentId: string) => void;
    /** Upload attachments callback */
    onUploadAttachments?: (cardId: string, files: File[]) => Promise<void> | void;
    /** Delete attachment callback */
    onDeleteAttachment?: (attachmentId: string) => void;
    /** Current user ID */
    currentUserId?: string;
    /** AI: Suggest assignee */
    onSuggestAssignee?: (card: Card$1) => Promise<AssigneeSuggestion[]>;
    /** AI: Generate subtasks */
    onGenerateSubtasks?: (card: Card$1) => Promise<Omit<Card$1, 'id'>[]>;
    /** AI: Estimate effort */
    onEstimateEffort?: (card: Card$1) => Promise<{
        hours: number;
        confidence: number;
    }>;
}
declare function CardDetailModal({ card, isOpen, onClose, onUpdate, onDelete, availableUsers, comments, activities, aiInsights, attachments, onAddComment, onDeleteComment, onUploadAttachments, onDeleteAttachment, onSuggestAssignee, onGenerateSubtasks, onEstimateEffort, currentUserId, }: CardDetailModalProps): react_jsx_runtime.JSX.Element | null;

interface CardDetailModalV2Props {
    /** Card to display */
    card: Card$1 | null;
    /** Whether modal is open */
    isOpen: boolean;
    /** Close callback */
    onClose: () => void;
    /** Update card callback */
    onUpdate?: (cardId: string, updates: Partial<Card$1>) => void;
    /** Delete card callback */
    onDelete?: (cardId: string) => void;
    /** Available users for assignment */
    availableUsers?: User$1[];
    /** Comments for this card */
    comments?: Comment[];
    /** Activity log for this card */
    activities?: Activity[];
    /** Add comment callback */
    onAddComment?: (cardId: string, content: string) => void;
    /** Delete comment callback */
    onDeleteComment?: (commentId: string) => void;
    /** Current user */
    currentUser?: User$1;
    /** AI: Generate description */
    onAIGenerateDescription?: (card: Card$1) => Promise<string>;
    /** AI: Create subtasks */
    onAICreateSubtasks?: (card: Card$1) => Promise<string[]>;
    /** AI: Find similar tasks */
    onAIFindSimilar?: (card: Card$1) => Promise<Card$1[]>;
    /** Available columns for status */
    availableColumns?: Array<{
        id: string;
        title: string;
    }>;
    /** Available labels */
    availableLabels?: string[];
    /** Upload cover image callback (optional - returns public URL) */
    onUploadCoverImage?: (file: File) => Promise<string>;
    /** Unsplash API key for cover images (optional) */
    unsplashAccessKey?: string;
    /** Theme for the modal (dark, light, neutral). If not provided, uses KanbanThemeContext or defaults to 'dark' */
    theme?: 'dark' | 'light' | 'neutral';
    /** Callback when subtasks are changed (for persistence) */
    onSubtasksChange?: (cardId: string, subtasks: Subtask[]) => void;
}
declare function CardDetailModalV2({ card, isOpen, onClose, onUpdate, onDelete: _onDelete, availableUsers, comments, activities, onAddComment, onDeleteComment: _onDeleteComment, currentUser, onAIGenerateDescription: _onAIGenerateDescription, onAICreateSubtasks: _onAICreateSubtasks, onAIFindSimilar: _onAIFindSimilar, availableColumns, availableLabels, onUploadCoverImage: _onUploadCoverImage, unsplashAccessKey: _unsplashAccessKey, theme, onSubtasksChange, }: CardDetailModalV2Props): react_jsx_runtime.JSX.Element | null;

interface AttachmentUploaderProps {
    /** Card ID for attachments */
    cardId: string;
    /** Existing attachments */
    attachments?: Attachment[];
    /** Callback when files are uploaded */
    onUpload?: (files: File[]) => Promise<void> | void;
    /** Callback when attachment is deleted */
    onDelete?: (attachmentId: string) => void;
    /** Current user ID */
    currentUserId?: string;
    /** Max file size in MB */
    maxSizeMB?: number;
    /** Allowed file types (MIME types) */
    allowedTypes?: string[];
    /** Max number of files */
    maxFiles?: number;
}
declare function AttachmentUploader({ attachments, onUpload, onDelete, maxSizeMB, allowedTypes, maxFiles, }: AttachmentUploaderProps): react_jsx_runtime.JSX.Element;

interface VelocityDataPoint {
    /** Period name (e.g., "Week 1", "Sprint 3") */
    period: string;
    /** Number of cards completed */
    completed: number;
    /** Number of cards planned */
    planned?: number;
    /** Average velocity (optional) */
    average?: number;
}
interface VelocityChartProps {
    /** Velocity data points */
    data: VelocityDataPoint[];
    /** Chart title */
    title?: string;
    /** Chart height in pixels */
    height?: number;
    /** Show average line */
    showAverage?: boolean;
    /** Show planned line */
    showPlanned?: boolean;
}
declare function VelocityChart({ data, title, height, showAverage, showPlanned, }: VelocityChartProps): react_jsx_runtime.JSX.Element;

interface BurnDownDataPoint {
    /** Day/Date label */
    day: string;
    /** Remaining tasks */
    remaining: number;
    /** Ideal burndown line */
    ideal: number;
}
interface BurnDownChartProps {
    /** Burndown data points */
    data: BurnDownDataPoint[];
    /** Chart title */
    title?: string;
    /** Chart height in pixels */
    height?: number;
    /** Total tasks at start */
    totalTasks?: number;
    /** Use area chart instead of line */
    useArea?: boolean;
}
declare function BurnDownChart({ data, title, height, totalTasks, useArea, }: BurnDownChartProps): react_jsx_runtime.JSX.Element;

interface DistributionDataPoint {
    /** Category name */
    name: string;
    /** Value/count */
    value: number;
    /** Optional color */
    color?: string;
}
interface DistributionChartsProps {
    /** Distribution data */
    data: DistributionDataPoint[];
    /** Chart title */
    title?: string;
    /** Chart type */
    type?: 'pie' | 'bar';
    /** Chart height in pixels */
    height?: number;
    /** Show percentages */
    showPercentages?: boolean;
}
declare function DistributionCharts({ data, title, type, height, showPercentages, }: DistributionChartsProps): react_jsx_runtime.JSX.Element;

interface BulkOperationsToolbarProps {
    /** Selected cards */
    selectedCards: Card$1[];
    /** Available users for assignment */
    availableUsers?: User[];
    /** Callback when selection is cleared */
    onClearSelection: () => void;
    /** Bulk operations callbacks */
    callbacks: BulkOperationsCallbacks;
    /** Available columns for move operation */
    columns?: Array<{
        id: string;
        title: string;
    }>;
    /** Available labels */
    availableLabels?: string[];
}
/**
 * Bulk Operations Toolbar Component
 */
declare const BulkOperationsToolbar: React$1.NamedExoticComponent<BulkOperationsToolbarProps>;

interface SwimlaneBoardViewProps {
    /** Board data */
    board: Board;
    /** Swimlane configuration */
    swimlaneConfig: SwimlaneConfig;
    /** All available users */
    availableUsers?: User[];
    /** Board callbacks */
    callbacks: {
        onCardMove?: (cardId: string, targetColumnId: string, position: number) => void;
        onCardUpdate?: (cardId: string, updates: Partial<Card$1>) => void;
        onColumnUpdate?: (columnId: string, updates: Partial<Column$1>) => void;
        onWipLimitExceeded?: (column: Column$1, card: Card$1) => void;
    };
    /** Custom className */
    className?: string;
}
/**
 * SwimlaneBoardView Component
 */
declare function SwimlaneBoardView({ board, swimlaneConfig, availableUsers, callbacks, className, }: SwimlaneBoardViewProps): react_jsx_runtime.JSX.Element;

interface GroupBySelectorProps {
    /** Current groupBy value */
    value: GroupByOption;
    /** Change handler */
    onChange: (groupBy: GroupByOption) => void;
    /** Custom className */
    className?: string;
}
/**
 * GroupBySelector Component
 */
declare function GroupBySelector({ value, onChange, className, }: GroupBySelectorProps): react_jsx_runtime.JSX.Element;

interface KeyboardShortcutsHelpProps {
    /** Custom shortcuts to display */
    shortcuts?: KeyboardShortcut[];
    /** Is modal open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Custom className */
    className?: string;
}
/**
 * KeyboardShortcutsHelp Component
 */
declare function KeyboardShortcutsHelp({ shortcuts, isOpen, onClose, className, }: KeyboardShortcutsHelpProps): react_jsx_runtime.JSX.Element | null;

interface CardTemplateSelectorProps {
    /** Available templates */
    templates: CardTemplate[];
    /** Template selection handler */
    onSelectTemplate: (template: CardTemplate) => void;
    /** Custom className */
    className?: string;
}
/**
 * Default card templates
 */
declare const DEFAULT_TEMPLATES: CardTemplate[];
/**
 * CardTemplateSelector Component
 */
declare function CardTemplateSelector({ templates, onSelectTemplate, className, }: CardTemplateSelectorProps): react_jsx_runtime.JSX.Element;

interface ExportImportModalProps {
    /** Board data to export */
    board: Board;
    /** Is modal open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Import handler */
    onImport?: (result: ImportResult, content: string) => void;
    /** Board element ref for PDF export */
    boardElementRef?: React.RefObject<HTMLElement>;
    /** Custom className */
    className?: string;
}
/**
 * ExportImportModal Component
 */
declare function ExportImportModal({ board, isOpen, onClose, onImport, boardElementRef, className, }: ExportImportModalProps): react_jsx_runtime.JSX.Element | null;

type DateFilter = 'all' | 'overdue' | 'today' | 'this-week' | 'custom';
type SortBy = 'created' | 'priority' | 'dueDate' | 'title' | 'estimate' | 'none';
type SortOrder = 'asc' | 'desc';
interface FilterState {
    dateFilter: DateFilter;
    dateRange?: {
        start: Date;
        end: Date;
    };
    priorities: Priority[];
    assignees: string[];
    labels: string[];
    columns: string[];
    search: string;
}
interface SortState {
    by: SortBy;
    order: SortOrder;
}
interface UseFiltersOptions {
    initialFilters?: Partial<FilterState>;
    initialSort?: Partial<SortState>;
    currentUserId?: string;
}
interface UseFiltersReturn {
    filters: FilterState;
    sort: SortState;
    setFilters: (filters: Partial<FilterState>) => void;
    setSort: (sort: Partial<SortState>) => void;
    resetFilters: () => void;
    filterMyTasks: () => void;
    filterOverdue: () => void;
    filterHighPriority: () => void;
    applyFilters: (cards: Card$1[]) => Card$1[];
    hasActiveFilters: boolean;
}
/**
 * Hook for filtering and sorting board cards
 *
 * @example
 * ```tsx
 * const { filters, setFilters, applyFilters, filterMyTasks } = useFilters({
 *   currentUserId: 'user-1'
 * })
 *
 * const filteredCards = applyFilters(board.cards)
 * ```
 */
declare function useFilters({ initialFilters, initialSort, currentUserId, }?: UseFiltersOptions): UseFiltersReturn;

interface FilterBarProps {
    filters: FilterState;
    sort: SortState;
    onFiltersChange: (filters: Partial<FilterState>) => void;
    onSortChange: (sort: Partial<SortState>) => void;
    onReset: () => void;
    onFilterMyTasks?: () => void;
    onFilterOverdue?: () => void;
    onFilterHighPriority?: () => void;
    availableUsers?: User$1[];
    availableLabels?: string[];
    availableColumns?: Array<{
        id: string;
        title: string;
    }>;
    showQuickFilters?: boolean;
    compact?: boolean;
    groupBy?: GroupByOption;
    onGroupByChange?: (value: GroupByOption) => void;
}
declare function FilterBar({ filters, sort, onFiltersChange, onSortChange, onReset, onFilterMyTasks, onFilterOverdue, onFilterHighPriority, availableUsers, availableLabels, availableColumns: _availableColumns, showQuickFilters, compact, groupBy, onGroupByChange, }: FilterBarProps): react_jsx_runtime.JSX.Element;

interface ConfigMenuProps {
    onOpenExport: () => void;
    onOpenThemes: () => void;
    onOpenShortcuts: () => void;
    className?: string;
    viewMode?: 'kanban' | 'gantt';
    onExportGanttPDF?: () => Promise<void>;
    onExportGanttExcel?: () => Promise<void>;
    onExportGanttPNG?: () => Promise<void>;
    onExportGanttCSV?: () => void;
}
declare function ConfigMenu({ onOpenExport, onOpenThemes, onOpenShortcuts, className, viewMode, onExportGanttPDF, onExportGanttExcel, onExportGanttPNG, onExportGanttCSV, }: ConfigMenuProps): react_jsx_runtime.JSX.Element;

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}
declare function ThemeModal({ isOpen, onClose, className }: ThemeModalProps): react_jsx_runtime.JSX.Element | null;

interface TaskSegment {
    startDate: Date;
    endDate: Date;
}
interface Task {
    id: string;
    name: string;
    startDate?: Date;
    endDate?: Date;
    progress: number;
    assignees?: Array<{
        name: string;
        avatar?: string;
        initials: string;
        color: string;
    }>;
    status?: string;
    dependencies?: string[];
    subtasks?: Task[];
    isExpanded?: boolean;
    isMilestone?: boolean;
    isCriticalPath?: boolean;
    color?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    segments?: TaskSegment[];
    parentId?: string;
    level?: number;
    position?: number;
}
type TimeScale = 'day' | 'week' | 'month';
type Theme$1 = 'dark' | 'light' | 'neutral';
type RowDensity = 'compact' | 'comfortable' | 'spacious';
type ColumnType = 'name' | 'startDate' | 'endDate' | 'duration' | 'assignees' | 'status' | 'progress' | 'priority';
interface GanttColumn {
    id: ColumnType;
    label: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    visible: boolean;
    sortable?: boolean;
    resizable?: boolean;
}
interface Assignee {
    name: string;
    initials: string;
    color: string;
}
interface GanttTheme {
    bgPrimary: string;
    bgSecondary: string;
    bgGrid: string;
    bgWeekend: string;
    border: string;
    borderLight: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    accent: string;
    accentHover: string;
    accentLight: string;
    taskBarPrimary: string;
    taskBarProgress: string;
    taskBarHandle: string;
    dependency: string;
    dependencyHover: string;
    criticalPath: string;
    criticalPathLight: string;
    today: string;
    todayLight: string;
    milestone: string;
    milestoneLight: string;
    statusTodo: string;
    statusInProgress: string;
    statusCompleted: string;
    hoverBg: string;
    focusRing: string;
}
/**
 * Templates for customizing Gantt rendering
 * Similar to DHTMLX gantt.templates.*
 */
interface GanttTemplates {
    /**
     * Customize task tooltip content
     * @param task - The task to render tooltip for
     * @returns Tooltip content (string or JSX)
     */
    taskTooltip?: (task: Task) => string | React.ReactNode;
    /**
     * Customize task label in timeline
     * @param task - The task to render label for
     * @returns Label content (string or JSX)
     */
    taskLabel?: (task: Task) => string | React.ReactNode;
    /**
     * Customize grid cell content
     * @param task - The task for this row
     * @param column - The column type
     * @param value - Default cell value
     * @returns Cell content (string or JSX)
     */
    gridCell?: (task: Task, column: ColumnType, value: any) => string | React.ReactNode;
    /**
     * Add custom CSS classes to task bar
     * @param task - The task to style
     * @returns Space-separated CSS class names
     */
    taskClass?: (task: Task) => string;
    /**
     * Customize milestone rendering
     * @param task - The milestone task
     * @returns Milestone content (string or JSX)
     */
    milestoneContent?: (task: Task) => string | React.ReactNode;
    /**
     * Format date display
     * @param date - Date to format
     * @returns Formatted date string
     */
    dateFormat?: (date: Date) => string;
    /**
     * Format duration display
     * @param days - Duration in days
     * @returns Formatted duration string
     */
    durationFormat?: (days: number) => string;
    /**
     * Format progress display
     * @param progress - Progress percentage (0-100)
     * @returns Formatted progress string
     */
    progressFormat?: (progress: number) => string;
}
/**
 * Permissions interface for controlling Gantt operations
 * Useful for integrating with authorization libraries like CASL
 * @example
 *
 * // With CASL integration
 * const ability = useAbility();
 *
 * <GanttBoard
 *   tasks={tasks}
 *   config={{
 *     permissions: {
 *       canCreateTask: ability.can('create', 'Task'),
 *       canUpdateTask: ability.can('update', 'Task'),
 *       canDeleteTask: ability.can('delete', 'Task'),
 *       canCreateDependency: ability.can('create', 'Dependency'),
 *       canUpdateProgress: ability.can('update', 'TaskProgress'),
 *     }
 *   }}
 * />
 *
 */
interface GanttPermissions {
    canCreateTask?: boolean;
    canUpdateTask?: boolean;
    canDeleteTask?: boolean;
    canCreateDependency?: boolean;
    canDeleteDependency?: boolean;
    canUpdateProgress?: boolean;
    canAssignUsers?: boolean;
    canModifyHierarchy?: boolean;
    canDuplicateTask?: boolean;
    canReorderTasks?: boolean;
    canExport?: boolean;
    canToggleExpansion?: boolean;
    canPerformAction?: (task: Task, action: 'create' | 'update' | 'delete' | 'assign' | 'progress') => boolean;
}
/**
 * Scroll behavior configuration for timeline interactions
 * Controls how the Gantt chart viewport behaves during user interactions
 *
 * @example
 * // Disable all automatic scrolling during drag operations
 * <GanttBoard
 *   config={{
 *     scrollBehavior: {
 *       preventAutoScroll: true,
 *       axis: 'horizontal'
 *     }
 *   }}
 * />
 *
 * @example
 * // Allow vertical auto-scroll but prevent horizontal
 * <GanttBoard
 *   config={{
 *     scrollBehavior: {
 *       preventAutoScroll: true,
 *       axis: 'horizontal',
 *       onScrollPrevented: (axis, scrollDelta) => {
 *         console.log(`Prevented ${axis} scroll by ${scrollDelta}px`);
 *       }
 *     }
 *   }}
 * />
 */
interface GanttScrollBehavior {
    /**
     * Prevent automatic viewport scrolling during drag operations
     * When true, the viewport will not automatically center on dragged tasks
     * Users can still manually scroll using scrollbars or mouse wheel
     * @default false
     */
    preventAutoScroll?: boolean;
    /**
     * Which axis to prevent auto-scroll on
     * - 'horizontal': Only prevent horizontal auto-scroll (recommended for Gantt charts)
     * - 'vertical': Only prevent vertical auto-scroll
     * - 'both': Prevent both horizontal and vertical auto-scroll
     * @default 'horizontal'
     */
    axis?: 'horizontal' | 'vertical' | 'both';
    /**
     * Callback fired when auto-scroll is prevented
     * Useful for debugging or showing user feedback
     * @param axis - Which axis was prevented ('x' or 'y')
     * @param scrollDelta - How many pixels of scroll were prevented
     */
    onScrollPrevented?: (axis: 'x' | 'y', scrollDelta: number) => void;
    /**
     * Allow auto-scroll if task would go out of viewport bounds
     * When true, auto-scroll is only prevented if task remains visible
     * @default false
     */
    allowScrollWhenOutOfBounds?: boolean;
}
/**
 * AI chat message interface
 * @version 0.17.42
 */
interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    command?: AICommandResult;
    isLoading?: boolean;
}
/**
 * Configuration for persisting AI chat history in localStorage
 * @version 0.17.42
 */
interface PersistHistoryConfig {
    /** Enable history persistence in localStorage */
    enabled: boolean;
    /** Maximum messages to persist (default: 5) */
    maxMessages?: number;
    /** Custom storage key (default: 'gantt-ai-history') */
    storageKey?: string;
}
/**
 * AI Assistant configuration for natural language task editing
 * @version 0.14.0
 * @updated 0.17.42 - Added persistHistory option
 */
interface GanttAIAssistantConfig {
    /** Enable AI assistant (default: false) */
    enabled?: boolean;
    /** Custom placeholder text */
    placeholder?: string;
    /** Position of the chat button */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    /** Handler for AI commands - should return task updates */
    onCommand?: (command: string, tasks: Task[]) => Promise<AICommandResult>;
    /** Custom suggestions for the command palette */
    suggestions?: string[];
    /** Maximum messages to keep in memory history */
    maxHistory?: number;
    /** Persist chat history in localStorage @version 0.17.42 */
    persistHistory?: PersistHistoryConfig;
}
/**
 * AI Command result interface
 * @version 0.14.0
 */
interface AICommandResult {
    type: 'move_task' | 'resize_task' | 'rename_task' | 'delete_task' | 'create_task' | 'link_tasks' | 'unlink_tasks' | 'assign_task' | 'set_progress' | 'set_status' | 'split_task' | 'group_tasks' | 'unknown';
    taskId?: string;
    taskName?: string;
    updates?: Partial<Task>;
    newTask?: Task;
    dependencyFrom?: string;
    dependencyTo?: string;
    message: string;
    success: boolean;
    error?: string;
}
interface GanttConfig {
    theme?: Theme$1;
    timeScale?: TimeScale;
    rowDensity?: RowDensity;
    showThemeSelector?: boolean;
    showExportButton?: boolean;
    availableUsers?: Array<{
        id: string;
        name: string;
        initials: string;
        color: string;
    }>;
    /**
     * v0.15.0: Internationalization (i18n) support
     * Set the locale for all UI text in the Gantt chart
     * Built-in support for 'en' (English) and 'es' (Spanish)
     * @default 'en'
     */
    locale?: 'en' | 'es' | string;
    /**
     * v0.15.0: Custom translations to override default locale strings
     * Allows partial overrides while keeping defaults for missing keys
     * @see GanttTranslations in i18n.ts
     */
    customTranslations?: Record<string, any>;
    aiAssistant?: GanttAIAssistantConfig;
    showCreateTaskButton?: boolean;
    createTaskLabel?: string;
    onCreateTask?: () => void;
    templates?: GanttTemplates;
    permissions?: GanttPermissions;
    disableScrollSync?: boolean;
    /**
     * v0.9.2: Advanced scroll behavior configuration
     * Controls how the timeline viewport behaves during drag operations
     * Provides fine-grained control over auto-scroll prevention with events
     * @see GanttScrollBehavior
     */
    scrollBehavior?: GanttScrollBehavior;
    /**
     * v0.11.1: Enable automatic Critical Path Method (CPM) calculation
     * When true (default), tasks with zero slack are automatically marked as critical (red)
     * When false, preserves custom task colors and disables automatic CPM marking
     * @default true
     */
    enableAutoCriticalPath?: boolean;
    onThemeChange?: (theme: Theme$1) => void;
    onTaskClick?: (task: Task) => void;
    onTaskDblClick?: (task: Task) => void;
    onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void;
    onTaskUpdate?: (task: Task) => void;
    onTaskDateChange?: (task: Task, startDate: Date, endDate: Date) => void;
    onProgressChange?: (taskId: string, oldProgress: number, newProgress: number) => void;
    /**
     * Called when user clicks "Edit Task" in context menu
     * If not provided, the built-in TaskFormModal will be used
     */
    onTaskEdit?: (task: Task) => void;
    /**
     * Called when user clicks "Add Subtask" in context menu
     * If not provided, the built-in subtask creation will be used
     */
    onTaskAddSubtask?: (parentTask: Task) => void;
    /**
     * Called when user clicks "Mark Incomplete" in context menu
     * Sets task status to 'todo' and progress to 0
     */
    onTaskMarkIncomplete?: (task: Task) => void;
    /**
     * Called when user clicks "Set In Progress" in context menu
     * Sets task status to 'in-progress'
     */
    onTaskSetInProgress?: (task: Task) => void;
    onDependencyCreate?: (fromTaskId: string, toTaskId: string) => void;
    onDependencyDelete?: (taskId: string, dependencyId: string) => void;
    onBeforeTaskAdd?: (task: Task) => boolean | void | Promise<boolean | void>;
    onAfterTaskAdd?: (task: Task) => void;
    onBeforeTaskUpdate?: (taskId: string, newData: Partial<Task>) => boolean | void | Promise<boolean | void>;
    onAfterTaskUpdate?: (task: Task) => void;
    onBeforeTaskDelete?: (taskId: string) => boolean | void | Promise<boolean | void>;
    onAfterTaskDelete?: (taskId: string) => void;
    onTaskCreate?: (parentId: string | undefined, position: number) => void;
    onTaskDelete?: (taskId: string) => void;
    onMultiTaskDelete?: (taskIds: string[]) => void;
    onTaskDuplicate?: (taskId: string) => void;
    onTaskMove?: (taskId: string, direction: 'up' | 'down') => void;
    onTaskIndent?: (taskId: string) => void;
    onTaskOutdent?: (taskId: string) => void;
    onTaskRename?: (taskId: string, newName: string) => void;
    onTaskToggleExpand?: (taskId: string) => void;
}

/**
 * GanttBoardRef - Imperative API for GanttBoard component
 * Similar to DHTMLX gantt.* methods for programmatic control
 */
interface GanttBoardRef {
    /**
     * Get a task by ID
     * Similar to: gantt.getTask(id)
     */
    getTask: (id: string) => Task | undefined;
    /**
     * Add a new task
     * Similar to: gantt.addTask(task)
     */
    addTask: (task: Task, parentId?: string) => void;
    /**
     * Update a task by ID
     * Similar to: gantt.updateTask(id, updates)
     */
    updateTask: (id: string, updates: Partial<Task>) => void;
    /**
     * Delete a task by ID
     * Similar to: gantt.deleteTask(id)
     */
    deleteTask: (id: string) => void;
    /**
     * Delete multiple tasks by IDs
     */
    deleteTasks: (ids: string[]) => void;
    /**
     * Duplicate a task
     */
    duplicateTask: (id: string) => void;
    /**
     * Split a task (create GAP in the middle, like Bryntum/DHTMLX) (v0.8.1)
     * Same task, but work is paused for some days then continues
     * Example: Jan 1-10 → Split at Jan 5 with 3 day gap → Jan 1-4 [GAP] Jan 8-13
     * @param id - Task ID to split
     * @param splitDate - Date where gap starts
     * @param gapDays - Number of days to pause (default: 3)
     */
    splitTask: (id: string, splitDate: Date, gapDays?: number) => void;
    /**
     * Calculate end date based on start date and duration
     * Similar to: gantt.calculateEndDate(start, duration)
     */
    calculateEndDate: (start: Date, durationDays: number) => Date;
    /**
     * Calculate duration in days between two dates
     * Similar to: gantt.calculateDuration(start, end)
     */
    calculateDuration: (start: Date, end: Date) => number;
    /**
     * Validate if creating a dependency would create a circular reference
     */
    validateDependency: (fromTaskId: string, toTaskId: string) => boolean;
    /**
     * Get all tasks (including subtasks) as a flat array
     * Similar to: gantt.getTaskByTime()
     */
    getAllTasks: () => Task[];
    /**
     * Get tasks filtered by status
     */
    getTasksByStatus: (status: 'todo' | 'in-progress' | 'completed') => Task[];
    /**
     * Get tasks by parent ID
     */
    getTasksByParent: (parentId?: string) => Task[];
    /**
     * Get the critical path tasks
     */
    getCriticalPath: () => Task[];
    /**
     * Indent task(s) - make them children of previous sibling
     */
    indentTask: (taskId: string) => void;
    /**
     * Outdent task(s) - move them to parent's level
     */
    outdentTask: (taskId: string) => void;
    /**
     * Move task up or down in the list
     */
    moveTask: (taskId: string, direction: 'up' | 'down') => void;
    /**
     * Create a subtask under a parent task
     */
    createSubtask: (parentId: string) => void;
    /**
     * Scroll to a specific task
     */
    scrollToTask: (id: string) => void;
    /**
     * Highlight a task temporarily
     */
    highlightTask: (id: string, duration?: number) => void;
    /**
     * Expand a task to show its subtasks
     */
    expandTask: (id: string) => void;
    /**
     * Collapse a task to hide its subtasks
     */
    collapseTask: (id: string) => void;
    /**
     * Expand all tasks
     */
    expandAll: () => void;
    /**
     * Collapse all tasks
     */
    collapseAll: () => void;
    /**
     * Undo last change
     * Similar to: gantt.undo()
     */
    undo: () => void;
    /**
     * Redo last undone change
     * Similar to: gantt.redo()
     */
    redo: () => void;
    /**
     * Check if undo is available
     */
    canUndo: () => boolean;
    /**
     * Check if redo is available
     */
    canRedo: () => boolean;
    /**
     * Clear undo/redo history
     */
    clearHistory: () => void;
    /**
     * Export Gantt chart to PNG image
     * Similar to: gantt.exportToPNG()
     */
    exportToPNG: () => Promise<Blob>;
    /**
     * Export tasks to PDF format
     * Similar to: gantt.exportToPDF()
     */
    exportToPDF: (filename?: string) => Promise<void>;
    /**
     * Export tasks to Excel format
     * Similar to: gantt.exportToExcel()
     */
    exportToExcel: (filename?: string) => Promise<void>;
    /**
     * Export tasks to JSON string
     * Similar to: gantt.serialize()
     */
    exportToJSON: () => string;
    /**
     * Export tasks to CSV format
     */
    exportToCSV: () => string;
    /**
     * Import tasks from JSON string
     * Similar to: gantt.parse(data)
     */
    importFromJSON: (json: string) => void;
    /**
     * Get current tasks state
     */
    getTasks: () => Task[];
    /**
     * Refresh/re-render the Gantt chart
     * Similar to: gantt.render()
     */
    refresh: () => void;
    /**
     * Clear all tasks
     * Similar to: gantt.clearAll()
     */
    clearAll: () => void;
}

interface GanttBoardProps {
    tasks: Task[];
    config?: GanttConfig;
    onTasksChange?: (tasks: Task[]) => void;
}
declare const GanttBoard: React$1.ForwardRefExoticComponent<GanttBoardProps & React$1.RefAttributes<GanttBoardRef>>;

interface GanttToolbarProps {
    theme: any;
    timeScale: TimeScale;
    onTimeScaleChange: (scale: TimeScale) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    currentTheme: Theme$1;
    onThemeChange: (theme: Theme$1) => void;
    rowDensity: RowDensity;
    onRowDensityChange: (density: RowDensity) => void;
    showThemeSelector?: boolean;
    showCreateTaskButton?: boolean;
    createTaskLabel?: string;
    onCreateTask?: () => void;
    onExportPNG?: () => Promise<void>;
    onExportPDF?: () => Promise<void>;
    onExportExcel?: () => Promise<void>;
    onExportCSV?: () => void;
    onExportJSON?: () => void;
    onExportMSProject?: () => void;
}
declare function GanttToolbar({ theme, timeScale, onTimeScaleChange, zoom, onZoomChange, currentTheme, onThemeChange, rowDensity, onRowDensityChange, showThemeSelector, // v0.17.29: Default to false - themes should be in app settings
showCreateTaskButton, createTaskLabel, // v0.15.0: Will use translations if not provided
onCreateTask, onExportPNG, onExportPDF, onExportExcel, onExportCSV, onExportJSON, onExportMSProject, }: GanttToolbarProps): react_jsx_runtime.JSX.Element;

interface TaskGridProps {
    tasks: Task[];
    theme: any;
    rowHeight: number;
    availableUsers?: Array<{
        id: string;
        name: string;
        initials: string;
        color: string;
    }>;
    templates: Required<GanttTemplates>;
    onTaskClick?: (task: Task) => void;
    onTaskDblClick?: (task: Task) => void;
    onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void;
    onTaskToggle?: (taskId: string) => void;
    scrollTop: number;
    columns: GanttColumn[];
    onToggleColumn: (columnType: ColumnType) => void;
    onColumnResize?: (columnId: ColumnType, newWidth: number) => void;
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    onTaskIndent?: (taskIds: string[]) => void;
    onTaskOutdent?: (taskIds: string[]) => void;
    onTaskMove?: (taskIds: string[], direction: 'up' | 'down') => void;
    onMultiTaskDelete?: (taskIds: string[]) => void;
    onTaskDuplicate?: (taskIds: string[]) => void;
    onTaskCreate?: (afterTaskId: string, direction: 'above' | 'below') => void;
    onTaskRename?: (taskId: string, newName: string) => void;
    onCreateSubtask?: (parentTaskId: string) => void;
    onOpenTaskModal?: (task: Task) => void;
    onDeleteRequest?: (taskId: string, taskName: string) => void;
}
declare function TaskGrid({ tasks, theme, rowHeight: ROW_HEIGHT, availableUsers, templates: _templates, // TODO: Use templates for custom rendering
onTaskClick, onTaskDblClick, // v0.8.0
onTaskContextMenu, // v0.8.0
onTaskToggle, scrollTop: _scrollTop, columns, onToggleColumn, onColumnResize, onTaskUpdate, onTaskIndent, onTaskOutdent, onTaskMove, onMultiTaskDelete, onTaskDuplicate, onTaskCreate, onTaskRename, onCreateSubtask, onOpenTaskModal, onDeleteRequest, }: TaskGridProps): react_jsx_runtime.JSX.Element;

interface TimelineProps {
    tasks: Task[];
    theme: any;
    rowHeight: number;
    timeScale: TimeScale;
    startDate: Date;
    endDate: Date;
    zoom: number;
    templates: Required<GanttTemplates>;
    onTaskClick?: (task: Task) => void;
    onTaskDblClick?: (task: Task) => void;
    onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void;
    onTaskDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
    onDependencyCreate?: (fromTask: Task, toTaskId: string) => void;
    onDependencyDelete?: (taskId: string, dependencyId: string) => void;
}
interface TaskPosition {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
declare function Timeline({ tasks, theme, rowHeight: ROW_HEIGHT, timeScale, startDate, endDate, zoom, templates, onTaskClick, onTaskDblClick, // v0.8.0
onTaskContextMenu, // v0.8.0
onTaskDateChange, onDependencyCreate, onDependencyDelete, }: TimelineProps): react_jsx_runtime.JSX.Element;

interface TaskBarProps {
    task: Task;
    x: number;
    y: number;
    width: number;
    theme: any;
    dayWidth: number;
    startDate: Date;
    templates: Required<GanttTemplates>;
    onClick?: (task: Task) => void;
    onDoubleClick?: (task: Task) => void;
    onContextMenu?: (task: Task, event: React.MouseEvent) => void;
    onDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
    onDependencyCreate?: (fromTask: Task, toTaskId: string) => void;
    allTaskPositions?: TaskPosition[];
    onDragMove?: (taskId: string, daysDelta: number, isDragging: boolean) => void;
}
declare function TaskBar({ task, x, y, width, theme, dayWidth, startDate, templates, onClick, onDoubleClick, // v0.8.0
onContextMenu, // v0.8.0
onDateChange, onDependencyCreate, allTaskPositions, onDragMove, }: TaskBarProps): react_jsx_runtime.JSX.Element;

interface DependencyLineProps {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    theme: any;
    onDelete?: () => void;
}
declare function DependencyLine({ x1, y1, x2, y2, theme, onDelete }: DependencyLineProps): react_jsx_runtime.JSX.Element;

interface MilestoneProps {
    task: Task;
    x: number;
    y: number;
    theme: any;
    onClick?: (task: Task) => void;
}
declare function Milestone({ task, x, y, theme, onClick }: MilestoneProps): react_jsx_runtime.JSX.Element;

interface ColumnManagerProps {
    columns: GanttColumn[];
    onToggleColumn: (columnId: ColumnType) => void;
    theme: any;
}
declare function ColumnManager({ columns, onToggleColumn, theme }: ColumnManagerProps): react_jsx_runtime.JSX.Element;

interface ContextMenuItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    separator?: boolean;
    disabled?: boolean;
    submenu?: ContextMenuItem[];
}
interface ContextMenuProps {
    isOpen: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
    theme: any;
}
declare function ContextMenu({ isOpen, x, y, items, onClose, theme }: ContextMenuProps): react_jsx_runtime.JSX.Element | null;
declare const MenuIcons: {
    Edit: react_jsx_runtime.JSX.Element;
    Pencil: react_jsx_runtime.JSX.Element;
    Delete: react_jsx_runtime.JSX.Element;
    Add: react_jsx_runtime.JSX.Element;
    AddSubtask: react_jsx_runtime.JSX.Element;
    Remove: react_jsx_runtime.JSX.Element;
    Link: react_jsx_runtime.JSX.Element;
    Progress: react_jsx_runtime.JSX.Element;
    Sort: react_jsx_runtime.JSX.Element;
    SortAsc: react_jsx_runtime.JSX.Element;
    SortDesc: react_jsx_runtime.JSX.Element;
    Hide: react_jsx_runtime.JSX.Element;
    Show: react_jsx_runtime.JSX.Element;
    Settings: react_jsx_runtime.JSX.Element;
    Split: react_jsx_runtime.JSX.Element;
    MarkIncomplete: react_jsx_runtime.JSX.Element;
    SetInProgress: react_jsx_runtime.JSX.Element;
    MarkComplete: react_jsx_runtime.JSX.Element;
};

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
interface CustomStatus {
    id: string;
    title: string;
    color?: string;
}
interface TaskFormData {
    name: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    progress: number;
    status: string;
    priority?: TaskPriority;
    isMilestone: boolean;
    color?: string;
    assignees?: Array<{
        name: string;
        avatar?: string;
        initials: string;
        color: string;
    }>;
    dependencies?: string[];
}
interface TaskFormModalProps {
    /** Is modal open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Task to edit (undefined for create mode) */
    task?: Task;
    /** Available tasks for dependencies */
    availableTasks?: Task[];
    /** Available users for assignment */
    availableUsers?: Array<{
        id: string;
        name: string;
        avatar?: string;
    }>;
    /** Submit handler */
    onSubmit: (data: TaskFormData) => void | Promise<void>;
    /** Is submitting */
    isLoading?: boolean;
    /** Mode: create or edit */
    mode?: 'create' | 'edit';
    /** Theme: dark, light, or neutral (zen) */
    theme?: Theme$1;
    /** v0.17.54: Custom statuses from Kanban columns */
    customStatuses?: CustomStatus[];
}
declare function TaskFormModal({ isOpen, onClose, task, availableTasks, availableUsers, onSubmit, isLoading, mode, theme, customStatuses, }: TaskFormModalProps): react_jsx_runtime.JSX.Element;

interface GanttAIAssistantProps {
    /** All current tasks in the Gantt */
    tasks: Task[];
    /** Theme configuration */
    theme: GanttTheme;
    /** AI assistant configuration */
    config: GanttAIAssistantConfig;
    /** Callback when tasks should be updated */
    onTasksUpdate: (updatedTasks: Task[]) => void;
    /** Callback for single task update */
    onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
    /** Callback for task creation */
    onTaskCreate?: (task: Task) => void;
    /** Callback for task deletion */
    onTaskDelete?: (taskId: string) => void;
    /** Callback for dependency creation */
    onDependencyCreate?: (fromTaskId: string, toTaskId: string) => void;
    /** Callback for dependency deletion */
    onDependencyDelete?: (taskId: string, dependencyId: string) => void;
}
declare function GanttAIAssistant({ tasks, theme, config, onTasksUpdate: _onTasksUpdate, // Reserved for batch updates
onTaskUpdate, onTaskCreate, onTaskDelete, onDependencyCreate, onDependencyDelete, }: GanttAIAssistantProps): react_jsx_runtime.JSX.Element | null;

/**
 * AI Command Parser for Gantt Chart
 * Parses natural language commands and converts them to task operations
 *
 * This module provides utilities for parsing AI responses and generating
 * prompts for natural language task editing.
 *
 * @version 0.14.0
 */

/**
 * System prompt for the AI model to understand Gantt task commands
 */
declare const GANTT_AI_SYSTEM_PROMPT = "You are a Gantt chart AI assistant. You help users edit project tasks using natural language commands.\n\nAVAILABLE COMMANDS:\n1. move_task - Move a task to a different date\n2. resize_task - Change task duration (extend/shorten)\n3. rename_task - Rename a task\n4. delete_task - Delete a task\n5. create_task - Create a new task\n6. link_tasks - Create dependency between tasks\n7. unlink_tasks - Remove dependency\n8. assign_task - Assign users to task\n9. set_progress - Update task progress (0-100%)\n10. set_status - Change task status (todo, in-progress, completed)\n\nRESPONSE FORMAT (JSON):\n{\n  \"type\": \"command_type\",\n  \"taskId\": \"id of the task to modify (if found)\",\n  \"taskName\": \"name of the task mentioned\",\n  \"updates\": { /* partial task updates */ },\n  \"newTask\": { /* for create_task only */ },\n  \"dependencyFrom\": \"source task id (for link/unlink)\",\n  \"dependencyTo\": \"target task id (for link/unlink)\",\n  \"message\": \"Human-readable response explaining what was done\",\n  \"success\": true/false,\n  \"error\": \"error message if failed\"\n}\n\nEXAMPLES:\n- \"Move Design to next Monday\" -> move_task with startDate update\n- \"Extend Testing by 3 days\" -> resize_task with endDate update\n- \"Rename 'Old Task' to 'New Task'\" -> rename_task with name update\n- \"Set Development progress to 50%\" -> set_progress with progress: 50\n- \"Link Design to Development\" -> link_tasks\n- \"Create a new task called 'Review'\" -> create_task\n\nTASK DATA FORMAT:\nTasks have: id, name, startDate, endDate, progress, status, dependencies[], assignees[]\n\nAlways try to match task names case-insensitively and handle partial matches.\nIf you can't find a task by name, search through the provided task list.\nIf ambiguous, ask for clarification in the message field.";
/**
 * Generate the user prompt with current tasks context
 */
declare function generateTasksContext(tasks: Task[]): string;
/**
 * Find a task by name (case-insensitive, partial match)
 */
declare function findTaskByName(tasks: Task[], name: string): Task | undefined;
/**
 * Parse date from natural language
 */
declare function parseNaturalDate(text: string, referenceDate?: Date): Date | null;
/**
 * Parse duration from natural language
 */
declare function parseNaturalDuration(text: string): number | null;
/**
 * Parse progress percentage from natural language
 */
declare function parseProgress(text: string): number | null;
/**
 * Parse task status from natural language
 */
declare function parseStatus(text: string): 'todo' | 'in-progress' | 'completed' | null;
/**
 * Local command parser (for offline/simple commands without AI)
 * This can handle basic commands without needing an AI API call
 */
declare function parseLocalCommand(command: string, tasks: Task[]): AICommandResult | null;
/**
 * Validate and sanitize AI response
 */
declare function validateAIResponse(response: unknown): AICommandResult;

/**
 * Public utility functions for Gantt operations
 * Similar to DHTMLX gantt.* utility methods
 */
declare const ganttUtils: {
    /**
     * Calculate end date based on start date and duration in days
     * @param start - Start date
     * @param durationDays - Duration in days
     * @returns End date
     */
    calculateEndDate: (start: Date, durationDays: number) => Date;
    /**
     * Calculate duration in days between two dates
     * @param start - Start date
     * @param end - End date
     * @returns Duration in days (rounded up)
     */
    calculateDuration: (start: Date, end: Date) => number;
    /**
     * Calculate working days between two dates (excluding weekends)
     * @param start - Start date
     * @param end - End date
     * @returns Number of working days
     */
    calculateWorkingDays: (start: Date, end: Date) => number;
    /**
     * Add working days to a date (excluding weekends)
     * @param start - Start date
     * @param workingDays - Number of working days to add
     * @returns End date
     */
    addWorkingDays: (start: Date, workingDays: number) => Date;
    /**
     * Check if a date is a weekend
     * @param date - Date to check
     * @returns True if weekend
     */
    isWeekend: (date: Date) => boolean;
    /**
     * Validate if creating a dependency would create a circular reference
     * Uses Depth-First Search (DFS) algorithm
     * @param tasks - All tasks
     * @param fromTaskId - Source task ID
     * @param toTaskId - Target task ID
     * @returns True if would create circular dependency
     */
    validateDependencies: (tasks: Task[], fromTaskId: string, toTaskId: string) => boolean;
    /**
     * Flatten nested tasks into a single array
     * @param tasks - Tasks with potential subtasks
     * @returns Flat array of all tasks
     */
    flattenTasks: (tasks: Task[]) => Task[];
    /**
     * Find a task by ID in nested structure
     * @param tasks - Tasks to search
     * @param taskId - ID to find
     * @returns Task if found, undefined otherwise
     */
    findTaskById: (tasks: Task[], taskId: string) => Task | undefined;
    /**
     * Get all parent tasks recursively
     * @param tasks - All tasks
     * @param taskId - Child task ID
     * @returns Array of parent tasks
     */
    getParentTasks: (tasks: Task[], taskId: string) => Task[];
    /**
     * Export tasks to JSON string
     * @param tasks - Tasks to export
     * @returns JSON string
     */
    exportToJSON: (tasks: Task[]) => string;
    /**
     * Import tasks from JSON string
     * @param json - JSON string
     * @returns Parsed tasks
     */
    importFromJSON: (json: string) => Task[];
    /**
     * Export tasks to CSV format
     * @param tasks - Tasks to export
     * @returns CSV string
     */
    exportToCSV: (tasks: Task[]) => string;
    /**
     * Format date to string (YYYY-MM-DD)
     * @param date - Date to format
     * @returns Formatted string
     */
    formatDate: (date: Date) => string;
    /**
     * Parse date from string (YYYY-MM-DD)
     * @param dateString - Date string
     * @returns Parsed Date
     */
    parseDate: (dateString: string) => Date;
    /**
     * Get date range for a task
     * @param task - Task to get range for
     * @returns Object with start and end dates, or null if no dates
     */
    getTaskDateRange: (task: Task) => {
        start: Date;
        end: Date;
    } | null;
    /**
     * Get the earliest start date from tasks
     * @param tasks - Tasks to search
     * @returns Earliest date or null
     */
    getEarliestStartDate: (tasks: Task[]) => Date | null;
    /**
     * Get the latest end date from tasks
     * @param tasks - Tasks to search
     * @returns Latest date or null
     */
    getLatestEndDate: (tasks: Task[]) => Date | null;
    /**
     * Check if two tasks overlap in time
     * @param task1 - First task
     * @param task2 - Second task
     * @returns True if tasks overlap
     */
    tasksOverlap: (task1: Task, task2: Task) => boolean;
    /**
     * Get all tasks that depend on a given task (children in dependency tree)
     * @param tasks - All tasks
     * @param taskId - Task ID to find dependents for
     * @returns Array of tasks that depend on this task
     */
    getDependentTasks: (tasks: Task[], taskId: string) => Task[];
    /**
     * Get all tasks that a given task depends on (parents in dependency tree)
     * @param tasks - All tasks
     * @param taskId - Task ID to find dependencies for
     * @returns Array of tasks this task depends on
     */
    getDependencyTasks: (tasks: Task[], taskId: string) => Task[];
    /**
     * Filter tasks by status
     * @param tasks - Tasks to filter
     * @param status - Status to filter by
     * @returns Filtered tasks
     */
    filterByStatus: (tasks: Task[], status: "todo" | "in-progress" | "completed") => Task[];
    /**
     * Filter tasks by date range
     * @param tasks - Tasks to filter
     * @param startDate - Range start
     * @param endDate - Range end
     * @returns Tasks that fall within the date range
     */
    filterByDateRange: (tasks: Task[], startDate: Date, endDate: Date) => Task[];
    /**
     * Sort tasks by start date
     * @param tasks - Tasks to sort
     * @param ascending - Sort ascending (default) or descending
     * @returns Sorted tasks
     */
    sortByStartDate: (tasks: Task[], ascending?: boolean) => Task[];
    /**
     * Sort tasks by end date
     * @param tasks - Tasks to sort
     * @param ascending - Sort ascending (default) or descending
     * @returns Sorted tasks
     */
    sortByEndDate: (tasks: Task[], ascending?: boolean) => Task[];
    /**
     * Sort tasks by progress
     * @param tasks - Tasks to sort
     * @param ascending - Sort ascending (default) or descending
     * @returns Sorted tasks
     */
    sortByProgress: (tasks: Task[], ascending?: boolean) => Task[];
    /**
     * Calculate total progress across all tasks
     * @param tasks - Tasks to calculate
     * @returns Average progress percentage
     */
    calculateTotalProgress: (tasks: Task[]) => number;
    /**
     * Get task by path (array of indices in nested structure)
     * @param tasks - Root tasks
     * @param path - Array of indices [0, 2, 1] means tasks[0].subtasks[2].subtasks[1]
     * @returns Task at path or undefined
     */
    getTaskByPath: (tasks: Task[], path: number[]) => Task | undefined;
    /**
     * Clone a task deeply (including subtasks)
     * @param task - Task to clone
     * @param newId - Optional new ID for the clone
     * @returns Cloned task
     */
    cloneTask: (task: Task, newId?: string) => Task;
    /**
     * Export tasks to PDF format
     * @param tasks - Tasks to export
     * @param filename - Optional filename (default: 'gantt-chart.pdf')
     * @returns Promise<void>
     */
    exportToPDF: (tasks: Task[], filename?: string) => Promise<void>;
    /**
     * Export tasks to Excel format
     * @param tasks - Tasks to export
     * @param filename - Optional filename (default: 'gantt-chart.xlsx')
     * @returns Promise<void>
     */
    exportToExcel: (tasks: Task[], filename?: string) => Promise<void>;
    /**
     * Export tasks to Microsoft Project XML format
     * Compatible with MS Project 2010+ and other project management tools
     * @param tasks - Tasks to export
     * @param projectName - Project name (default: 'Gantt Project')
     * @param filename - Optional filename (default: 'project.xml')
     * @returns void - Downloads the XML file
     */
    exportToMSProject: (tasks: Task[], projectName?: string, filename?: string) => void;
    /**
     * Calculate Critical Path Method (CPM) - identifies tasks with zero slack
     * @param tasks - All tasks
     * @returns Array of task IDs on the critical path
     */
    calculateCriticalPath: (tasks: Task[]) => string[];
    /**
     * Calculate slack (float) time for a task
     * @param tasks - All tasks
     * @param taskId - Task ID to calculate slack for
     * @returns Slack in days, or null if cannot be calculated
     */
    calculateSlack: (tasks: Task[], taskId: string) => number | null;
    /**
     * Check if a task is on the critical path
     * @param tasks - All tasks
     * @param taskId - Task ID to check
     * @returns True if task is on critical path
     */
    isOnCriticalPath: (tasks: Task[], taskId: string) => boolean;
    /**
     * Auto-schedule dependent tasks when a task changes
     * v0.13.3: Now takes optional daysDelta to shift dependents by same amount (preserves gap)
     * @param tasks - All tasks
     * @param changedTaskId - Task that was changed
     * @param daysDelta - Optional: days the parent moved (for preserving relative gaps)
     * @returns Updated tasks with rescheduled dependencies
     */
    autoScheduleDependents: (tasks: Task[], changedTaskId: string, daysDelta?: number) => Task[];
    /**
     * v0.13.0: Calculate cascade preview positions for dependent tasks during drag
     * v0.13.3: FIXED - Preview shows ONLY actual movement needed (keeps same relative gap)
     * Dependents shift by the same daysDelta as their parent, preserving the original gap
     * @param tasks - All tasks (nested structure)
     * @param draggedTaskId - Task being dragged
     * @param daysDelta - How many days the dragged task is being moved
     * @param flatTasks - Flattened task list with row indices
     * @param timelineStartDate - Start date of the timeline
     * @param scaledDayWidth - Width of one day in pixels (already includes zoom: dayWidth * zoom)
     * @param rowHeight - Height of each row
     * @param headerHeight - Height of the header
     * @returns Array of DependentTaskPreview objects
     */
    calculateCascadePreview: (tasks: Task[], draggedTaskId: string, daysDelta: number, flatTasks: Task[], timelineStartDate: Date, scaledDayWidth: number, rowHeight: number, headerHeight: number) => Array<{
        taskId: string;
        taskName: string;
        originalX: number;
        previewX: number;
        width: number;
        y: number;
        rowIndex: number;
        daysDelta: number;
        color?: string;
    }>;
    /**
     * 🚀 KILLER FEATURE #3: Split a task (create GAP in the middle, like Bryntum/DHTMLX)
     * Same task, but work is paused for some days then continues
     * Example: Jan 1-10 → Split at Jan 5 with 3 day gap → Jan 1-4 [GAP] Jan 8-13
     * @param tasks - All tasks
     * @param taskId - Task to split
     * @param splitDate - Date where gap starts
     * @param gapDays - Number of days to pause (default: 3)
     * @returns Updated tasks with split segments
     */
    splitTask: (tasks: Task[], taskId: string, splitDate: Date, gapDays?: number) => Task[];
};

declare const themes$1: Record<string, GanttTheme>;

/**
 * Type adapters for converting between ASAKAA Card types and Gantt Task types
 * @module Gantt/adapters
 */

/**
 * Converts an ASAKAA Card to a Gantt Task
 *
 * @param card - ASAKAA Card object
 * @param allCards - All cards in the board (for resolving subtasks)
 * @param users - Available users for assignee mapping
 * @returns Gantt Task object
 */
declare function cardToGanttTask(card: Card$1, allCards?: Card$1[], users?: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
}>): Task;
/**
 * Converts a Gantt Task back to an ASAKAA Card (partial update)
 * Note: This only returns the fields that Gantt can modify
 *
 * @param task - Gantt Task object
 * @param users - Available users for reverse mapping assignees to userIds
 * @returns Partial Card update object
 */
declare function ganttTaskToCardUpdate(task: Task, users?: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
}>): Partial<Card$1>;
/**
 * Converts an array of Cards to an array of Gantt Tasks
 *
 * @param cards - Array of ASAKAA Card objects
 * @param users - Available users for assignee mapping
 * @returns Array of Gantt Task objects
 */
declare function cardsToGanttTasks(cards: Card$1[], users?: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
}>): Task[];

/**
 * Internationalization (i18n) system for GanttBoard
 * @version 0.15.0
 *
 * Supports English (en) and Spanish (es) out of the box.
 * Users can provide custom translations via the `locale` config prop.
 */
type SupportedLocale = 'en' | 'es';
interface GanttTranslations {
    columns: {
        taskName: string;
        startDate: string;
        endDate: string;
        duration: string;
        assignees: string;
        status: string;
        progress: string;
        priority: string;
    };
    toolbar: {
        today: string;
        day: string;
        week: string;
        month: string;
        export: string;
        exportPdf: string;
        exportPng: string;
        exportCsv: string;
        exportExcel: string;
        exportMsProject: string;
        undo: string;
        redo: string;
        createTask: string;
        density: string;
        compact: string;
        normal: string;
        spacious: string;
    };
    contextMenu: {
        editTask: string;
        addSubtask: string;
        markIncomplete: string;
        setInProgress: string;
        markComplete: string;
        splitTask: string;
        deleteTask: string;
    };
    actions: {
        edit: string;
        delete: string;
        duplicate: string;
        addSubtask: string;
        indent: string;
        outdent: string;
        moveUp: string;
        moveDown: string;
        splitTask: string;
        linkTasks: string;
        unlinkTasks: string;
    };
    status: {
        todo: string;
        inProgress: string;
        completed: string;
    };
    labels: {
        progress: string;
        duration: string;
        days: string;
        day: string;
        assigned: string;
        milestone: string;
        criticalPath: string;
        subtask: string;
        task: string;
        noTasks: string;
        addTask: string;
        newTask: string;
        loading: string;
        error: string;
        today: string;
    };
    ai: {
        placeholder: string;
        thinking: string;
        suggestions: {
            moveTask: string;
            extendTask: string;
            renameTask: string;
            setProgress: string;
            linkTasks: string;
            createTask: string;
            deleteTask: string;
            assignTask: string;
        };
        errors: {
            taskNotFound: string;
            invalidDate: string;
            invalidDuration: string;
            invalidProgress: string;
            unknownCommand: string;
            processingError: string;
        };
    };
    export: {
        projectName: string;
        ganttTasks: string;
        taskId: string;
        taskName: string;
        startDate: string;
        endDate: string;
        isMilestone: string;
        parentId: string;
        yes: string;
        no: string;
        noTasksToExport: string;
    };
    dateFormat: {
        short: string;
        medium: string;
        long: string;
    };
}
/**
 * English translations (default)
 */
declare const en$2: GanttTranslations;
/**
 * Spanish translations
 */
declare const es$2: GanttTranslations;
/**
 * All available translations
 */
declare const translations: Record<SupportedLocale, GanttTranslations>;
/**
 * Get translations for a specific locale
 * Falls back to English if locale is not found
 */
declare function getTranslations(locale: SupportedLocale | string): GanttTranslations;
/**
 * Merge custom translations with default translations
 * Allows partial overrides while keeping defaults for missing keys
 */
declare function mergeTranslations(locale: SupportedLocale | string, customTranslations?: Partial<GanttTranslations>): GanttTranslations;

/**
 * Context for Gantt internationalization
 * Default value is English translations
 */
declare const GanttI18nContext: React$1.Context<GanttTranslations>;
/**
 * Hook to access translations in Gantt components
 * @returns The current translations object
 *
 * @example
 * ```tsx
 * function MyGanttComponent() {
 *   const t = useGanttI18n();
 *   return <button>{t.toolbar.createTask}</button>;
 * }
 * ```
 */
declare function useGanttI18n(): GanttTranslations;

/**
 * ListView Component Types
 * @version 0.17.0
 */

/**
 * Sort direction for list columns
 */
type SortDirection = 'asc' | 'desc';
/**
 * Sortable columns in the list view
 */
type ListSortColumn = 'name' | 'startDate' | 'endDate' | 'progress' | 'status' | 'assignees' | 'priority';
/**
 * Sort configuration
 */
interface ListSort {
    column: ListSortColumn;
    direction: SortDirection;
}
/**
 * Filter configuration for list view
 */
interface ListFilter {
    search?: string;
    status?: Array<'todo' | 'in-progress' | 'completed'>;
    assignees?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    showCompleted?: boolean;
}
/**
 * Column configuration for list view
 */
interface ListColumn {
    id: ListSortColumn | 'actions';
    label: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    visible: boolean;
    sortable: boolean;
    resizable?: boolean;
}
/**
 * Theme configuration for list view
 */
interface ListViewTheme {
    bgPrimary: string;
    bgSecondary: string;
    bgHover: string;
    bgSelected: string;
    bgAlternate: string;
    border: string;
    borderLight: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    accentLight: string;
    statusTodo: string;
    statusInProgress: string;
    statusCompleted: string;
    focusRing: string;
    checkboxBg: string;
    checkboxChecked: string;
}
/**
 * Permissions for list view operations
 */
interface ListViewPermissions {
    canCreateTask?: boolean;
    canUpdateTask?: boolean;
    canDeleteTask?: boolean;
    canBulkSelect?: boolean;
    canExport?: boolean;
    canSort?: boolean;
    canFilter?: boolean;
    canReorder?: boolean;
}
/**
 * ListView configuration
 */
interface ListViewConfig {
    /** Theme: 'dark' | 'light' | 'neutral' */
    theme?: 'dark' | 'light' | 'neutral';
    /** Locale for i18n */
    locale?: 'en' | 'es' | string;
    /** Custom translations */
    customTranslations?: Partial<ListViewTranslations>;
    /** Enable row selection */
    enableSelection?: boolean;
    /** Enable multi-select with checkboxes */
    enableMultiSelect?: boolean;
    /** Show search bar */
    showSearch?: boolean;
    /** Show filters */
    showFilters?: boolean;
    /** Show hierarchy indentation */
    showHierarchy?: boolean;
    /** Columns to display */
    columns?: ListColumn[];
    /** Row height in pixels */
    rowHeight?: number;
    /** Available users for filtering */
    availableUsers?: User$1[];
    /** Permissions */
    permissions?: ListViewPermissions;
    /** Enable virtual scrolling for large lists */
    enableVirtualization?: boolean;
    /** Items per page (0 = no pagination) */
    pageSize?: number;
}
/**
 * ListView translations
 */
interface ListViewTranslations {
    columns: {
        name: string;
        startDate: string;
        endDate: string;
        progress: string;
        status: string;
        assignees: string;
        priority: string;
        actions: string;
    };
    toolbar: {
        search: string;
        searchPlaceholder: string;
        filter: string;
        clearFilters: string;
        export: string;
        columns: string;
        newTask: string;
    };
    filters: {
        status: string;
        assignees: string;
        dateRange: string;
        showCompleted: string;
        all: string;
        none: string;
    };
    status: {
        todo: string;
        inProgress: string;
        completed: string;
    };
    actions: {
        edit: string;
        delete: string;
        duplicate: string;
        viewDetails: string;
    };
    empty: {
        noTasks: string;
        noResults: string;
        addFirstTask: string;
    };
    pagination: {
        showing: string;
        of: string;
        tasks: string;
        previous: string;
        next: string;
    };
    bulk: {
        selected: string;
        delete: string;
        move: string;
        assignTo: string;
    };
}
/**
 * Callback functions for ListView
 */
interface ListViewCallbacks {
    /** Task click handler */
    onTaskClick?: (task: Task) => void;
    /** Task double-click handler */
    onTaskDoubleClick?: (task: Task) => void;
    /** Task update handler */
    onTaskUpdate?: (task: Task) => void;
    /** Task delete handler */
    onTaskDelete?: (taskId: string) => void;
    /** Task create handler */
    onTaskCreate?: (parentId?: string) => void;
    /** Bulk delete handler */
    onBulkDelete?: (taskIds: string[]) => void;
    /** Sort change handler */
    onSortChange?: (sort: ListSort) => void;
    /** Filter change handler */
    onFilterChange?: (filter: ListFilter) => void;
    /** Selection change handler */
    onSelectionChange?: (selectedIds: string[]) => void;
    /** Row expand/collapse handler */
    onTaskToggleExpand?: (taskId: string) => void;
    /** Export handler */
    onExport?: (format: 'csv' | 'json' | 'excel') => void;
}
/**
 * Main ListView props
 */
interface ListViewProps {
    /** Tasks to display */
    tasks: Task[];
    /** Configuration */
    config?: ListViewConfig;
    /** Callbacks */
    callbacks?: ListViewCallbacks;
    /** Loading state */
    isLoading?: boolean;
    /** Error state */
    error?: Error | string;
    /** Custom CSS class */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}
/**
 * Flattened task with hierarchy info
 */
interface FlattenedTask extends Task {
    level: number;
    hasChildren: boolean;
    parentPath: string[];
}

/**
 * Main ListView Component
 */
declare function ListView({ tasks, config, callbacks, isLoading, error, className, style, }: ListViewProps): react_jsx_runtime.JSX.Element;

/**
 * ListView Themes
 * @version 0.17.0
 */

/**
 * Dark theme for ListView
 */
declare const darkTheme$3: ListViewTheme;
/**
 * Light theme for ListView
 */
declare const lightTheme$3: ListViewTheme;
/**
 * Neutral theme for ListView
 */
declare const neutralTheme$3: ListViewTheme;
/**
 * All available themes
 */
declare const listViewThemes: {
    readonly dark: ListViewTheme;
    readonly light: ListViewTheme;
    readonly neutral: ListViewTheme;
};
type ListViewThemeName = keyof typeof listViewThemes;
/**
 * Get theme by name
 */
declare function getListViewTheme(themeName: ListViewThemeName): ListViewTheme;

/**
 * Internationalization (i18n) for ListView
 * @version 0.17.0
 */

type ListViewSupportedLocale = 'en' | 'es';
/**
 * English translations
 */
declare const en$1: ListViewTranslations;
/**
 * Spanish translations
 */
declare const es$1: ListViewTranslations;
/**
 * All available translations
 */
declare const listViewTranslations: Record<ListViewSupportedLocale, ListViewTranslations>;
/**
 * Get translations for a specific locale
 */
declare function getListViewTranslations(locale: ListViewSupportedLocale | string): ListViewTranslations;
/**
 * Merge custom translations with default translations
 */
declare function mergeListViewTranslations(locale: ListViewSupportedLocale | string, customTranslations?: Partial<ListViewTranslations>): ListViewTranslations;

/**
 * CalendarBoard Component Types
 * @version 0.17.0
 */

/**
 * Calendar view modes
 */
type CalendarViewMode = 'month' | 'week' | 'day';
/**
 * Day of the week (0 = Sunday, 6 = Saturday)
 */
type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/**
 * Calendar event (task displayed on calendar)
 */
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    color?: string;
    status?: 'todo' | 'in-progress' | 'completed';
    progress?: number;
    assignees?: Task['assignees'];
    task: Task;
}
/**
 * Calendar day info
 */
interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    events: CalendarEvent[];
}
/**
 * Theme configuration for calendar
 */
interface CalendarTheme {
    bgPrimary: string;
    bgSecondary: string;
    bgHover: string;
    bgToday: string;
    bgWeekend: string;
    bgOtherMonth: string;
    border: string;
    borderLight: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textToday: string;
    accent: string;
    accentHover: string;
    accentLight: string;
    statusTodo: string;
    statusInProgress: string;
    statusCompleted: string;
    focusRing: string;
}
/**
 * Permissions for calendar operations
 */
interface CalendarPermissions {
    canCreateTask?: boolean;
    canUpdateTask?: boolean;
    canDeleteTask?: boolean;
    canDragDrop?: boolean;
    canResize?: boolean;
}
/**
 * CalendarBoard configuration
 */
interface CalendarConfig {
    /** Theme: 'dark' | 'light' | 'neutral' */
    theme?: 'dark' | 'light' | 'neutral';
    /** Locale for i18n */
    locale?: 'en' | 'es' | string;
    /** Custom translations */
    customTranslations?: Partial<CalendarTranslations>;
    /** Default view mode */
    defaultView?: CalendarViewMode;
    /** First day of week (0 = Sunday, 1 = Monday, etc.) */
    firstDayOfWeek?: WeekDay;
    /** Show week numbers */
    showWeekNumbers?: boolean;
    /** Show mini calendar in sidebar */
    showMiniCalendar?: boolean;
    /** Max events to show per day before "+N more" */
    maxEventsPerDay?: number;
    /** Available users for filtering */
    availableUsers?: User$1[];
    /** Permissions */
    permissions?: CalendarPermissions;
    /** Enable drag and drop */
    enableDragDrop?: boolean;
    /** Show task details on hover */
    showTooltip?: boolean;
}
/**
 * CalendarBoard translations
 */
interface CalendarTranslations {
    navigation: {
        today: string;
        previous: string;
        next: string;
        month: string;
        week: string;
        day: string;
    };
    weekdays: {
        sun: string;
        mon: string;
        tue: string;
        wed: string;
        thu: string;
        fri: string;
        sat: string;
    };
    weekdaysFull: {
        sunday: string;
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
    };
    months: {
        january: string;
        february: string;
        march: string;
        april: string;
        may: string;
        june: string;
        july: string;
        august: string;
        september: string;
        october: string;
        november: string;
        december: string;
    };
    status: {
        todo: string;
        inProgress: string;
        completed: string;
    };
    labels: {
        allDay: string;
        moreEvents: string;
        noEvents: string;
        newTask: string;
        viewAll: string;
        week: string;
    };
    tooltips: {
        progress: string;
        status: string;
        assignees: string;
        duration: string;
        days: string;
    };
}
/**
 * Callback functions for CalendarBoard
 */
interface CalendarCallbacks {
    /** Event click handler */
    onEventClick?: (event: CalendarEvent) => void;
    /** Event double-click handler */
    onEventDoubleClick?: (event: CalendarEvent) => void;
    /** Date click handler (create new task) */
    onDateClick?: (date: Date) => void;
    /** Task update after drag/drop */
    onTaskUpdate?: (task: Task) => void;
    /** Task delete handler */
    onTaskDelete?: (taskId: string) => void;
    /** View change handler */
    onViewChange?: (view: CalendarViewMode) => void;
    /** Date range change handler */
    onDateRangeChange?: (start: Date, end: Date) => void;
}
/**
 * Main CalendarBoard props
 */
interface CalendarBoardProps {
    /** Tasks to display */
    tasks: Task[];
    /** Configuration */
    config?: CalendarConfig;
    /** Callbacks */
    callbacks?: CalendarCallbacks;
    /** Initial date to display */
    initialDate?: Date;
    /** Loading state */
    isLoading?: boolean;
    /** Error state */
    error?: Error | string;
    /** Custom CSS class */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}

/**
 * Main CalendarBoard Component
 */
declare function CalendarBoard({ tasks, config, callbacks, initialDate, isLoading, error, className, style, }: CalendarBoardProps): react_jsx_runtime.JSX.Element;

/**
 * CalendarBoard Themes
 * @version 0.17.0
 */

/**
 * Dark theme for CalendarBoard
 */
declare const darkTheme$2: CalendarTheme;
/**
 * Light theme for CalendarBoard
 */
declare const lightTheme$2: CalendarTheme;
/**
 * Neutral theme for CalendarBoard
 */
declare const neutralTheme$2: CalendarTheme;
/**
 * All available themes
 */
declare const calendarThemes: {
    readonly dark: CalendarTheme;
    readonly light: CalendarTheme;
    readonly neutral: CalendarTheme;
};
type CalendarThemeName = keyof typeof calendarThemes;
/**
 * Get theme by name
 */
declare function getCalendarTheme(themeName: CalendarThemeName): CalendarTheme;

/**
 * Internationalization (i18n) for CalendarBoard
 * @version 0.17.0
 */

type CalendarSupportedLocale = 'en' | 'es';
/**
 * English translations
 */
declare const en: CalendarTranslations;
/**
 * Spanish translations
 */
declare const es: CalendarTranslations;
/**
 * All available translations
 */
declare const calendarTranslations: Record<CalendarSupportedLocale, CalendarTranslations>;
/**
 * Get translations for a specific locale
 */
declare function getCalendarTranslations(locale: CalendarSupportedLocale | string): CalendarTranslations;
/**
 * Merge custom translations with default translations
 */
declare function mergeCalendarTranslations(locale: CalendarSupportedLocale | string, customTranslations?: Partial<CalendarTranslations>): CalendarTranslations;
/**
 * Get month names array based on locale
 */
declare function getMonthNames(locale: CalendarSupportedLocale | string): string[];
/**
 * Get weekday names array based on locale and first day of week
 */
declare function getWeekdayNames(locale: CalendarSupportedLocale | string, firstDayOfWeek?: number, short?: boolean): string[];

interface CardStackProps {
    /** Stack configuration */
    stack: CardStack$1;
    /** All cards in the board */
    cards: Card$1[];
    /** Card render function */
    renderCard?: (card: Card$1) => React.ReactNode;
    /** Click handler for individual cards */
    onCardClick?: (card: Card$1) => void;
    /** Expand/collapse handler */
    onToggleExpand?: (stackId: string) => void;
    /** Unstack handler (remove card from stack) */
    onUnstack?: (stackId: string, cardId: string) => void;
    /** Delete entire stack handler */
    onDeleteStack?: (stackId: string) => void;
    /** Custom className */
    className?: string;
}
/**
 * CardStack - Collapsible group of related cards
 */
declare function CardStack({ stack, cards, renderCard, onCardClick, onToggleExpand, onUnstack, onDeleteStack, className, }: CardStackProps): react_jsx_runtime.JSX.Element;

/**
 * Card History & Time Travel Types
 * Tracks all changes to cards with full reproducibility
 * @module types/card-history
 */

/**
 * Types of events that can occur in a card's history
 */
type CardHistoryEventType = 'created' | 'status_changed' | 'assignee_changed' | 'priority_changed' | 'moved' | 'title_updated' | 'description_updated' | 'dates_changed' | 'labels_changed' | 'dependency_added' | 'dependency_removed' | 'comment_added' | 'archived' | 'restored';
/**
 * Represents a single change in a card's history
 */
interface CardHistoryEvent {
    /** Unique event ID */
    id: string;
    /** Card this event belongs to */
    cardId: string;
    /** When the event occurred */
    timestamp: Date;
    /** Type of change */
    type: CardHistoryEventType;
    /** User who made the change */
    userId: string;
    /** User display name (for UI) */
    userName?: string;
    /** User avatar URL (for UI) */
    userAvatar?: string;
    /** Detailed changes (before/after) */
    changes: Record<string, {
        from: any;
        to: any;
    }>;
    /** Additional context */
    metadata?: {
        /** Column names for moves */
        fromColumn?: string;
        toColumn?: string;
        /** Comment text for comment events */
        commentText?: string;
        /** Reason for change */
        reason?: string;
        /** Related card IDs */
        relatedCards?: string[];
    };
}
/**
 * Filter configuration for history events
 */
interface HistoryFilter {
    /** Filter by event types */
    types?: CardHistoryEventType[];
    /** Filter by users */
    users?: string[];
    /** Filter by date range */
    dateRange?: {
        start: Date;
        end: Date;
    };
    /** Search in change descriptions */
    searchTerm?: string;
}
/**
 * State for the replay/time-travel feature
 */
interface ReplayState {
    /** Current position in history (0 = oldest, length-1 = newest) */
    currentIndex: number;
    /** Is replay actively playing */
    isPlaying: boolean;
    /** Playback speed (1 = normal, 2 = 2x, etc.) */
    speed: number;
    /** Card state at current index */
    cardState: Card$1;
    /** Total number of events */
    totalEvents: number;
    /** Can go back */
    canGoBack: boolean;
    /** Can go forward */
    canGoForward: boolean;
}
/**
 * Timeline visualization configuration
 */
interface TimelineConfig {
    /** Show event icons */
    showIcons: boolean;
    /** Show user avatars */
    showAvatars: boolean;
    /** Group events by day */
    groupByDay: boolean;
    /** Show relative times (e.g. "2 hours ago") */
    useRelativeTime: boolean;
    /** Compact mode (less spacing) */
    compact: boolean;
}

interface CardHistoryTimelineProps {
    /** History events to display */
    events: CardHistoryEvent[];
    /** Current filter */
    filter: HistoryFilter;
    /** Update filter */
    onFilterChange: (filter: HistoryFilter) => void;
    /** Clear filter */
    onClearFilter: () => void;
    /** Click on event */
    onEventClick?: (event: CardHistoryEvent) => void;
    /** Selected event ID */
    selectedEventId?: string;
    /** Timeline configuration */
    config?: Partial<TimelineConfig>;
    /** Custom className */
    className?: string;
}
/**
 * Timeline component showing card history
 */
declare function CardHistoryTimeline({ events, filter, onFilterChange, onClearFilter, onEventClick, selectedEventId, config: customConfig, className, }: CardHistoryTimelineProps): react_jsx_runtime.JSX.Element;

interface CardHistoryReplayProps {
    /** Current replay state */
    replayState: ReplayState | null;
    /** All history events */
    events: CardHistoryEvent[];
    /** Start replay */
    onStartReplay: () => void;
    /** Stop replay */
    onStopReplay: () => void;
    /** Toggle play/pause */
    onTogglePlayback: () => void;
    /** Go to previous event */
    onPrevious: () => void;
    /** Go to next event */
    onNext: () => void;
    /** Go to specific event */
    onGoToEvent: (index: number) => void;
    /** Change playback speed */
    onSpeedChange: (speed: number) => void;
    /** Custom className */
    className?: string;
}
/**
 * Replay controls for time-travel functionality
 */
declare function CardHistoryReplay({ replayState, events, onStartReplay, onStopReplay, onTogglePlayback, onPrevious, onNext, onGoToEvent, onSpeedChange, className, }: CardHistoryReplayProps): react_jsx_runtime.JSX.Element;

/**
 * Card Relationships & Graph Types
 * Force-directed graph visualization for card dependencies and relationships
 * @module types/card-relationships
 */

/**
 * Types of relationships between cards
 */
type RelationshipType = 'blocks' | 'blocked_by' | 'depends_on' | 'required_by' | 'relates_to' | 'duplicates' | 'parent_of' | 'child_of' | 'similar_to';
/**
 * Node in the relationship graph
 */
interface GraphNode {
    /** Card ID */
    id: string;
    /** Card reference */
    card: Card$1;
    /** X position (calculated by force simulation) */
    x?: number;
    /** Y position (calculated by force simulation) */
    y?: number;
    /** X velocity (for force simulation) */
    vx?: number;
    /** Y velocity (for force simulation) */
    vy?: number;
    /** Fixed position (prevent movement) */
    fx?: number | null;
    /** Fixed position (prevent movement) */
    fy?: number | null;
    /** Node degree (number of connections) */
    degree?: number;
    /** Is this node on the critical path */
    onCriticalPath?: boolean;
    /** Cluster ID (for grouping) */
    clusterId?: string;
}
/**
 * Edge in the relationship graph
 */
interface GraphEdge {
    /** Relationship ID */
    id: string;
    /** Source node ID */
    source: string | GraphNode;
    /** Target node ID */
    target: string | GraphNode;
    /** Relationship type */
    type: RelationshipType;
    /** Edge strength (for styling) */
    strength?: number;
    /** Is this edge on the critical path */
    onCriticalPath?: boolean;
}
/**
 * Graph layout algorithms
 */
type GraphLayout = 'force' | 'hierarchical' | 'circular' | 'radial' | 'grid';
/**
 * Graph visualization configuration
 */
interface GraphConfig {
    /** Layout algorithm */
    layout: GraphLayout;
    /** Width of the graph container */
    width: number;
    /** Height of the graph container */
    height: number;
    /** Enable node dragging */
    enableDragging: boolean;
    /** Enable zoom and pan */
    enableZoom: boolean;
    /** Show node labels */
    showLabels: boolean;
    /** Show edge labels */
    showEdgeLabels: boolean;
    /** Highlight critical path */
    highlightCriticalPath: boolean;
    /** Node size */
    nodeSize: number;
    /** Edge width */
    edgeWidth: number;
    /** Animation duration */
    animationDuration: number;
    /** Force simulation strength */
    forceStrength: number;
    /** Link distance */
    linkDistance: number;
    /** Charge strength (repulsion) */
    chargeStrength: number;
    /** Center force strength */
    centerForce: number;
    /** Color scheme */
    colorScheme: 'status' | 'priority' | 'assignee' | 'cluster';
}
/**
 * Graph filters
 */
interface GraphFilter {
    /** Filter by relationship types */
    types?: RelationshipType[];
    /** Filter by card IDs */
    cardIds?: string[];
    /** Filter by columns */
    columnIds?: string[];
    /** Minimum relationship strength */
    minStrength?: number;
    /** Show only critical path */
    criticalPathOnly?: boolean;
    /** Maximum depth from selected node */
    maxDepth?: number;
}
/**
 * Critical path analysis result
 */
interface CriticalPath {
    /** Cards on the critical path */
    cardIds: string[];
    /** Relationships on the critical path */
    relationshipIds: string[];
    /** Total estimated time */
    totalDuration: number;
    /** Bottleneck cards */
    bottlenecks: string[];
}
/**
 * Graph statistics
 */
interface GraphStats {
    /** Total nodes */
    totalNodes: number;
    /** Total edges */
    totalEdges: number;
    /** Average degree */
    averageDegree: number;
    /** Density (0-1) */
    density: number;
    /** Number of clusters */
    clusters: number;
    /** Isolated nodes (no connections) */
    isolatedNodes: string[];
    /** Hub nodes (most connections) */
    hubNodes: Array<{
        cardId: string;
        degree: number;
    }>;
    /** Most common relationship type */
    mostCommonRelationType: RelationshipType;
}
/**
 * Graph interaction event
 */
interface GraphInteraction {
    /** Event type */
    type: 'node-click' | 'node-hover' | 'edge-click' | 'edge-hover' | 'canvas-click';
    /** Selected node */
    node?: GraphNode;
    /** Selected edge */
    edge?: GraphEdge;
    /** Mouse position */
    position?: {
        x: number;
        y: number;
    };
}

interface CardRelationshipsGraphProps {
    /** Graph nodes */
    nodes: GraphNode[];
    /** Graph edges */
    edges: GraphEdge[];
    /** Graph configuration */
    config: GraphConfig;
    /** Current filter */
    filter: GraphFilter;
    /** Update filter */
    onFilterChange: (filter: GraphFilter) => void;
    /** Critical path */
    criticalPath: CriticalPath | null;
    /** Graph statistics */
    stats: GraphStats;
    /** Interaction callback */
    onInteraction?: (interaction: GraphInteraction) => void;
    /** Custom className */
    className?: string;
}
/**
 * Graph visualization component
 */
declare function CardRelationshipsGraph({ nodes, edges, config, filter: _filter, onFilterChange: _onFilterChange, criticalPath, stats, onInteraction, className, }: CardRelationshipsGraphProps): react_jsx_runtime.JSX.Element;

interface GeneratePlanModalProps {
    /** Is modal open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Plan generated callback */
    onPlanGenerated: (plan: GeneratedPlan) => void;
    /** Generate plan function (from useAI hook) */
    onGeneratePlan: (prompt: string) => Promise<GeneratedPlan>;
    /** Is AI loading */
    isLoading?: boolean;
}
declare function GeneratePlanModal({ isOpen, onClose, onPlanGenerated, onGeneratePlan, isLoading: externalLoading, }: GeneratePlanModalProps): react_jsx_runtime.JSX.Element | null;

/**
 * AI Usage Dashboard
 * Display AI usage statistics and costs
 */
interface AIUsageDashboardProps {
    /** Is dashboard open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Current plan tier */
    planTier?: 'hobby' | 'pro' | 'enterprise';
}
declare function AIUsageDashboard({ isOpen, onClose, planTier, }: AIUsageDashboardProps): react_jsx_runtime.JSX.Element | null;

/**
 * Generate Gantt Tasks Dialog
 * AI-powered Gantt task generation with cost control
 */
interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    duration: number;
    progress: number;
    dependencies: string[];
    type: string;
    priority: 'high' | 'medium' | 'low';
}
interface GeneratedTasksResponse {
    tasks: {
        tasks: GanttTask[];
    };
    from_cache: boolean;
    tokens_used: number;
    mock_mode?: boolean;
    similarity?: number;
    tokens_saved?: number;
}
interface GenerateGanttTasksDialogProps {
    /** Is dialog open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Tasks generated callback */
    onTasksGenerated: (tasks: GanttTask[]) => void;
    /** Generate tasks function (calls Supabase Edge Function) */
    onGenerateTasks: (params: {
        prompt: string;
        projectName?: string;
        startDate?: string;
        endDate?: string;
    }) => Promise<GeneratedTasksResponse>;
    /** Is AI loading */
    isLoading?: boolean;
    /** Project ID (optional) */
    projectId?: string;
    /** Project name (optional) */
    projectName?: string;
}
declare function GenerateGanttTasksDialog({ isOpen, onClose, onTasksGenerated, onGenerateTasks, isLoading: externalLoading, projectName, }: GenerateGanttTasksDialogProps): react_jsx_runtime.JSX.Element | null;

/**
 * useKanbanState Hook
 * Optional hook for managing board state locally
 * Consumers can use this or manage state themselves
 * @module hooks/useKanbanState
 */

interface UseKanbanStateOptions {
    /** Initial board state */
    initialBoard: Board;
    /** Persist changes (e.g., to localStorage, API) */
    onPersist?: (board: Board) => void | Promise<void>;
    /** Enable optimistic updates (default: true) */
    optimistic?: boolean;
}
interface UseKanbanStateReturn {
    /** Current board state */
    board: Board;
    /** Callbacks for the KanbanBoard component */
    callbacks: BoardCallbacks;
    /** Direct state setters (advanced usage) */
    setBoard: React.Dispatch<React.SetStateAction<Board>>;
    /** Helper functions */
    helpers: {
        addCard: (card: Omit<Card$1, 'id'>) => string;
        addColumn: (column: Omit<Column$1, 'id' | 'cardIds'>) => string;
        deleteCard: (cardId: string) => void;
        deleteColumn: (columnId: string) => void;
        clearBoard: () => void;
    };
}
/**
 * Hook for managing Kanban board state
 *
 * @example
 * ```tsx
 * const { board, callbacks } = useKanbanState({
 *   initialBoard: myBoard,
 *   onPersist: async (board) => {
 *     await api.updateBoard(board)
 *   }
 * })
 *
 * return <KanbanBoard board={board} callbacks={callbacks} />
 * ```
 */
declare function useKanbanState({ initialBoard, onPersist, }: UseKanbanStateOptions): UseKanbanStateReturn;

interface UseBoardOptions {
    initialData: Board;
    availableUsers?: User$1[];
    onSave?: (board: Board) => void | Promise<void>;
    saveDelay?: number;
}
interface UseBoardReturn$1 {
    props: Pick<KanbanBoardProps, 'board' | 'callbacks' | 'availableUsers'>;
    board: Board;
    callbacks: BoardCallbacks;
    utils: {
        addCard: (columnId: string, title: string, data?: Partial<any>) => void;
        addColumn: (title: string, position?: number) => void;
        reset: () => void;
    };
}
/**
 * Simplified hook for Kanban board state management
 *
 * @example
 * ```tsx
 * import { KanbanBoard, useBoard } from '@libxai/board'
 *
 * function App() {
 *   const board = useBoard({
 *     initialData: myData,
 *     onSave: (board) => localStorage.setItem('board', JSON.stringify(board))
 *   })
 *
 *   return <KanbanBoard {...board.props} />
 * }
 * ```
 */
declare function useBoard$1({ initialData, availableUsers, onSave, }: UseBoardOptions): UseBoardReturn$1;

/**
 * useAI Hook
 * Optional AI features using Vercel AI SDK
 * Requires 'ai' package to be installed
 * @module hooks/useAI
 */

interface UseAIOptions {
    /** API key for AI provider */
    apiKey?: string;
    /** Model to use */
    model?: 'gpt-4' | 'gpt-4-turbo' | 'claude-3-5-sonnet' | string;
    /** Custom API endpoint */
    endpoint?: string;
    /** Base URL */
    baseURL?: string;
}
interface UseAIReturn extends AICallbacks {
    /** Is AI available (SDK installed + API key provided) */
    isAvailable: boolean;
    /** Is AI currently processing */
    isLoading: boolean;
    /** Last error */
    error: Error | null;
}
/**
 * Hook for AI features
 *
 * @example
 * ```tsx
 * const ai = useAI({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4-turbo'
 * })
 *
 * if (ai.isAvailable) {
 *   const plan = await ai.onGeneratePlan('Build a todo app')
 * }
 * ```
 */
declare function useAI(options?: UseAIOptions): UseAIReturn;

/**
 * Multi-select hook for bulk operations
 * Supports keyboard modifiers (Cmd/Ctrl, Shift) for selection
 * @module hooks/useMultiSelect
 */

interface UseMultiSelectReturn {
    /** Selected card IDs */
    selectedCardIds: string[];
    /** Last selected card ID */
    lastSelectedCardId: string | null;
    /** Check if a card is selected */
    isCardSelected: (cardId: string) => boolean;
    /** Select a card */
    selectCard: (cardId: string, event?: React.MouseEvent) => void;
    /** Deselect a card */
    deselectCard: (cardId: string) => void;
    /** Clear all selections */
    clearSelection: () => void;
    /** Select all cards */
    selectAll: () => void;
    /** Toggle card selection */
    toggleCard: (cardId: string) => void;
    /** Get selected cards */
    getSelectedCards: () => Card$1[];
}
interface UseMultiSelectOptions {
    /** Board cards (required for range selection and selectAll) */
    cards: Card$1[];
}
/**
 * Hook for multi-select functionality
 *
 * @param options - Configuration options
 */
declare function useMultiSelect(options: UseMultiSelectOptions): UseMultiSelectReturn;

/**
 * useKeyboardShortcuts Hook
 * Global keyboard shortcuts system for board navigation and actions
 * @module hooks/keyboard
 */

interface UseKeyboardShortcutsOptions {
    /** Shortcuts configuration */
    shortcuts?: KeyboardShortcut[];
    /** Enable/disable shortcuts */
    enabled?: boolean;
    /** Prevent default browser behavior */
    preventDefault?: boolean;
}
interface UseKeyboardShortcutsReturn {
    /** Register a keyboard shortcut dynamically */
    registerShortcut: (shortcut: KeyboardShortcut) => void;
    /** Unregister a keyboard shortcut */
    unregisterShortcut: (action: KeyboardAction) => void;
    /** Check if shortcuts are enabled */
    isEnabled: boolean;
}
/**
 * Default keyboard shortcuts for Kanban board
 */
declare const DEFAULT_SHORTCUTS: KeyboardShortcut[];
/**
 * useKeyboardShortcuts Hook
 *
 * @example
 * ```tsx
 * const { registerShortcut } = useKeyboardShortcuts({
 *   shortcuts: DEFAULT_SHORTCUTS,
 *   enabled: true,
 *   preventDefault: true,
 * })
 *
 * // Listen for keyboard actions
 * useEffect(() => {
 *   const handleKeyboardAction = (event: CustomEvent<KeyboardAction>) => {
 *     console.log('Action triggered:', event.detail)
 *   }
 *
 *   window.addEventListener('keyboard-action', handleKeyboardAction)
 *   return () => window.removeEventListener('keyboard-action', handleKeyboardAction)
 * }, [])
 * ```
 */
declare function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions): UseKeyboardShortcutsReturn;

/**
 * useCardStacking Hook
 * Manages card stack state and AI-powered grouping suggestions
 * @module hooks/useCardStacking
 */

interface UseCardStackingOptions {
    /** Board cards */
    cards: Card$1[];
    /** Configuration */
    config?: Partial<StackingConfig>;
    /** AI service for similarity detection (optional) */
    aiService?: {
        findSimilar: (card: Card$1, candidates: Card$1[]) => Promise<{
            card: Card$1;
            similarity: number;
        }[]>;
    };
}
interface UseCardStackingResult {
    /** All card stacks */
    stacks: CardStack$1[];
    /** Create a new stack */
    createStack: (title: string, cardIds: string[], columnId: string, strategy: StackingStrategy, color?: string) => void;
    /** Delete a stack */
    deleteStack: (stackId: string) => void;
    /** Toggle stack expand/collapse */
    toggleStack: (stackId: string) => void;
    /** Add card to stack */
    addToStack: (stackId: string, cardId: string) => void;
    /** Remove card from stack */
    removeFromStack: (stackId: string, cardId: string) => void;
    /** Get stacks for a specific column */
    getStacksForColumn: (columnId: string) => CardStack$1[];
    /** Get AI-powered stack suggestions */
    getSuggestions: (columnId: string) => Promise<StackSuggestion[]>;
    /** Apply a suggestion */
    applySuggestion: (suggestion: StackSuggestion) => void;
    /** Configuration */
    config: StackingConfig;
}
/**
 * Hook for managing card stacking
 */
declare function useCardStacking(options: UseCardStackingOptions): UseCardStackingResult;

/**
 * Board Provider Props
 */
interface BoardProviderProps {
    children: React__default.ReactNode;
    initialData?: {
        board?: BoardData;
        columns?: ColumnData[];
        cards?: CardData[];
    };
    onStateChange?: (state: BoardState) => void;
}
/**
 * BoardProvider component
 *
 * Wraps your app with BoardStore context
 *
 * @example
 * ```tsx
 * <BoardProvider initialData={{ columns: [], cards: [] }}>
 *   <Board />
 * </BoardProvider>
 * ```
 */
declare function BoardProvider({ children, initialData, onStateChange }: BoardProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access BoardStore from context
 *
 * @throws Error if used outside BoardProvider
 */
declare function useBoardStore(): BoardStore;

/**
 * Return type for useBoard hook
 */
interface UseBoardReturn {
    board: Board$1 | null;
    columns: Column$2[];
    cards: Card$2[];
    updateBoard: (changes: Partial<Omit<_libxai_core.BoardData, 'id' | 'createdAt'>>) => void;
    addColumn: (columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>) => void;
    updateColumn: (columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>) => void;
    deleteColumn: (columnId: string) => void;
    getColumn: (columnId: string) => Column$2 | undefined;
    addCard: (cardData: Omit<CardData, 'createdAt' | 'updatedAt'>) => void;
    updateCard: (cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>) => void;
    deleteCard: (cardId: string) => void;
    moveCard: (cardId: string, toColumnId: string, newPosition: number) => void;
    getCard: (cardId: string) => Card$2 | undefined;
    getCardsByColumn: (columnId: string) => Card$2[];
}
/**
 * Main hook for board operations
 *
 * Provides reactive state and methods for managing board, columns, and cards
 *
 * @example
 * ```tsx
 * function MyBoard() {
 *   const { board, columns, cards, addCard, moveCard } = useBoard()
 *
 *   return (
 *     <div>
 *       {columns.map(column => (
 *         <div key={column.id}>
 *           <h2>{column.title}</h2>
 *           {cards
 *             .filter(card => card.columnId === column.id)
 *             .map(card => (
 *               <div key={card.id}>{card.title}</div>
 *             ))}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
declare function useBoard(): UseBoardReturn;

/**
 * useFilteredCards - Hook for filtering cards with memoization
 * @module adapters/react
 */

/**
 * Filter options for cards
 */
interface CardFilters {
    searchQuery?: string;
    priorities?: Priority$1[];
    statuses?: CardStatus$1[];
    assignedUserIds?: string[];
    labels?: string[];
    columnIds?: string[];
    isOverdue?: boolean;
}
/**
 * Hook for filtered and sorted cards
 *
 * Automatically memoizes results for performance
 *
 * @param filters - Filter criteria
 * @returns Filtered cards array
 *
 * @example
 * ```tsx
 * function CardList() {
 *   const filteredCards = useFilteredCards({
 *     priorities: ['HIGH', 'URGENT'],
 *     isOverdue: true
 *   })
 *
 *   return <div>{filteredCards.length} urgent overdue tasks</div>
 * }
 * ```
 */
declare function useFilteredCards(filters?: CardFilters): Card$2[];
/**
 * Hook for sorted cards
 *
 * @param sortBy - Sort field
 * @param sortOrder - Sort order ('asc' | 'desc')
 * @returns Sorted cards array
 */
declare function useSortedCards(sortBy?: 'title' | 'priority' | 'createdAt' | 'updatedAt' | 'position', sortOrder?: 'asc' | 'desc'): Card$2[];

/**
 * Class name utility (cn)
 * Combines clsx and tailwind-merge for optimal Tailwind class handling
 */

/**
 * Merge class names intelligently
 * Handles Tailwind class conflicts properly
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500') // => 'text-blue-500' if condition is true
 */
declare function cn(...inputs: ClassValue[]): string;

/**
 * Lexicographic positioning utilities
 * Uses fractional indexing for efficient reordering without touching all items
 * @module utils/positioning
 */
/**
 * Calculate position between two items
 * Uses lexicographic ordering (fractional indexing)
 *
 * @param before - Position of item before (or null if first)
 * @param after - Position of item after (or null if last)
 * @returns New position value
 *
 * @example
 * calculatePosition(null, 1000) // => 500 (before first item)
 * calculatePosition(1000, 2000) // => 1500 (between two items)
 * calculatePosition(1000, null) // => 2000 (after last item)
 */
declare function calculatePosition(before: number | null, after: number | null): number;
/**
 * Generate initial positions for an array of items
 * Spaces them 1000 apart for room to insert
 *
 * @param count - Number of items
 * @returns Array of position values
 */
declare function generateInitialPositions(count: number): number[];

/**
 * Retry utilities with exponential backoff
 * For resilient API calls and persistence operations
 * @module utils/retry
 */
interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in ms (default: 1000) */
    initialDelay?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** Maximum delay in ms (default: 10000) */
    maxDelay?: number;
    /** Function to determine if error should be retried */
    shouldRetry?: (error: Error, attempt: number) => boolean;
    /** Callback when retry is attempted */
    onRetry?: (error: Error, attempt: number, delay: number) => void;
}
interface RetryResult<T> {
    data?: T;
    error?: Error;
    attempts: number;
    success: boolean;
}
/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```ts
 * const result = await retryWithBackoff(
 *   () => api.updateBoard(board),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`)
 *     }
 *   }
 * )
 * ```
 */
declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>>;
/**
 * Retry a function synchronously (for non-async operations)
 * No backoff, just immediate retries
 */
declare function retrySyncOperation<T>(fn: () => T, maxAttempts?: number): {
    data?: T;
    error?: Error;
    success: boolean;
};
/**
 * Create a retry wrapper function
 * Returns a function that automatically retries on failure
 *
 * @example
 * ```ts
 * const saveBoard = createRetryWrapper(
 *   api.saveBoard,
 *   { maxAttempts: 3 }
 * )
 *
 * const result = await saveBoard(boardData)
 * ```
 */
declare function createRetryWrapper<TArgs extends any[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, options?: RetryOptions): (...args: TArgs) => Promise<RetryResult<TReturn>>;
/**
 * Retry with circuit breaker pattern
 * Stops retrying if too many failures occur
 */
declare class CircuitBreaker {
    private threshold;
    private resetTimeout;
    private failures;
    private lastFailureTime;
    private isOpen;
    constructor(threshold?: number, resetTimeout?: number);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private reset;
    getStatus(): {
        failures: number;
        isOpen: boolean;
    };
}

/**
 * Supported AI Models
 */
declare const AI_MODELS: {
    readonly 'gpt-4-turbo': {
        readonly provider: "openai";
        readonly name: "GPT-4 Turbo";
        readonly contextWindow: 128000;
        readonly costPer1kInput: 0.01;
        readonly costPer1kOutput: 0.03;
        readonly supportsVision: true;
        readonly supportsJSON: true;
    };
    readonly 'gpt-4': {
        readonly provider: "openai";
        readonly name: "GPT-4";
        readonly contextWindow: 8192;
        readonly costPer1kInput: 0.03;
        readonly costPer1kOutput: 0.06;
        readonly supportsVision: false;
        readonly supportsJSON: true;
    };
    readonly 'gpt-3.5-turbo': {
        readonly provider: "openai";
        readonly name: "GPT-3.5 Turbo";
        readonly contextWindow: 16385;
        readonly costPer1kInput: 0.0005;
        readonly costPer1kOutput: 0.0015;
        readonly supportsVision: false;
        readonly supportsJSON: true;
    };
    readonly 'claude-3-5-sonnet-20241022': {
        readonly provider: "anthropic";
        readonly name: "Claude 3.5 Sonnet";
        readonly contextWindow: 200000;
        readonly costPer1kInput: 0.003;
        readonly costPer1kOutput: 0.015;
        readonly supportsVision: true;
        readonly supportsJSON: true;
    };
    readonly 'claude-3-opus-20240229': {
        readonly provider: "anthropic";
        readonly name: "Claude 3 Opus";
        readonly contextWindow: 200000;
        readonly costPer1kInput: 0.015;
        readonly costPer1kOutput: 0.075;
        readonly supportsVision: true;
        readonly supportsJSON: true;
    };
    readonly 'claude-3-haiku-20240307': {
        readonly provider: "anthropic";
        readonly name: "Claude 3 Haiku";
        readonly contextWindow: 200000;
        readonly costPer1kInput: 0.00025;
        readonly costPer1kOutput: 0.00125;
        readonly supportsVision: true;
        readonly supportsJSON: true;
    };
};
type AIModelKey = keyof typeof AI_MODELS;
/**
 * Rate Limits by Plan
 */
declare const RATE_LIMITS: {
    readonly hobby: {
        readonly requestsPerMonth: 50;
        readonly maxConcurrent: 1;
        readonly maxTokensPerRequest: 4096;
    };
    readonly pro: {
        readonly requestsPerMonth: 500;
        readonly maxConcurrent: 3;
        readonly maxTokensPerRequest: 8192;
    };
    readonly enterprise: {
        readonly requestsPerMonth: 2000;
        readonly maxConcurrent: 10;
        readonly maxTokensPerRequest: 16384;
    };
};
/**
 * Feature Flags for AI
 */
declare const AI_FEATURES: {
    readonly generatePlan: {
        readonly enabled: true;
        readonly minPlanTier: "hobby";
        readonly estimatedTokens: 2000;
    };
    readonly predictRisks: {
        readonly enabled: true;
        readonly minPlanTier: "pro";
        readonly estimatedTokens: 1500;
    };
    readonly suggestAssignee: {
        readonly enabled: true;
        readonly minPlanTier: "hobby";
        readonly estimatedTokens: 800;
    };
    readonly generateReport: {
        readonly enabled: true;
        readonly minPlanTier: "enterprise";
        readonly estimatedTokens: 3000;
    };
    readonly generateSubtasks: {
        readonly enabled: true;
        readonly minPlanTier: "hobby";
        readonly estimatedTokens: 1000;
    };
};

/**
 * AI Cost Tracking
 * Calculate and track AI API usage costs
 */

interface AIOperation {
    id: string;
    feature: 'generatePlan' | 'predictRisks' | 'suggestAssignee' | 'generateSubtasks' | 'estimateEffort';
    model: AIModelKey;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    duration: number;
    timestamp: Date;
    success: boolean;
    error?: string;
}
interface UsageStats {
    totalOperations: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    operationsByFeature: Record<string, number>;
    costsByFeature: Record<string, number>;
    averageDuration: number;
    successRate: number;
}
/**
 * Format cost as USD string
 */
declare function formatCost(cost: number): string;
/**
 * AI Usage Tracker
 * In-memory tracking of AI operations
 * In production, this would persist to a database
 */
declare class AIUsageTracker {
    private operations;
    private listeners;
    /**
     * Record a new AI operation
     */
    record(operation: Omit<AIOperation, 'id' | 'timestamp' | 'cost'>): AIOperation;
    /**
     * Get usage statistics
     */
    getStats(timeRange?: {
        start: Date;
        end: Date;
    }): UsageStats;
    /**
     * Get recent operations
     */
    getRecentOperations(limit?: number): AIOperation[];
    /**
     * Check if usage is within limits
     */
    checkLimit(planTier: 'hobby' | 'pro' | 'enterprise', period?: 'month' | 'day'): {
        used: number;
        limit: number;
        remaining: number;
        percentUsed: number;
        isExceeded: boolean;
    };
    /**
     * Subscribe to operation events
     */
    subscribe(listener: (operation: AIOperation) => void): () => void;
    /**
     * Clear all tracked operations
     */
    clear(): void;
    /**
     * Export operations as JSON
     */
    export(): string;
}
/**
 * Global usage tracker instance
 */
declare const aiUsageTracker: AIUsageTracker;

/**
 * useDragState - React hook for drag state management
 * @module hooks/useDragState
 *
 * Replacement for Jotai's useAtom(dragStateAtom)
 */

/**
 * Hook return type
 */
type UseDragStateReturn = [
    state: DragState,
    setState: (state: DragState) => void
];
/**
 * React hook for drag state
 *
 * Drop-in replacement for `useAtom(dragStateAtom)`
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [dragState, setDragState] = useDragState()
 *
 *   const handleDragStart = () => {
 *     setDragState({
 *       isDragging: true,
 *       draggedCardId: 'card-1',
 *       sourceColumnId: 'col-1',
 *       targetColumnId: 'col-1',
 *     })
 *   }
 *
 *   return <div>{dragState.isDragging ? 'Dragging...' : 'Idle'}</div>
 * }
 * ```
 */
declare function useDragState(): UseDragStateReturn;

/**
 * useSelectionState - React hook for selection state management
 * @module hooks/useSelectionState
 *
 * Replacement for Jotai's useAtom(selectionStateAtom)
 */

/**
 * Hook return type
 */
type UseSelectionStateReturn = [
    state: SelectionState,
    setState: (state: SelectionState) => void
];
/**
 * React hook for selection state
 *
 * Drop-in replacement for `useAtom(selectionStateAtom)`
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [selectionState, setSelectionState] = useSelectionState()
 *
 *   const handleSelect = (cardId: string) => {
 *     setSelectionState({
 *       selectedCardIds: [cardId],
 *       lastSelectedCardId: cardId,
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {selectionState.selectedCardIds.length} cards selected
 *     </div>
 *   )
 * }
 * ```
 */
declare function useSelectionState(): UseSelectionStateReturn;

/**
 * Plugin System Types
 * Extensible plugin architecture for ASAKAA
 * @module plugins/types
 */

interface PluginContext {
    /** Current board state */
    board: Board;
    /** Board callbacks */
    callbacks: BoardCallbacks;
    /** Set board state */
    setBoard: (board: Board) => void;
    /** Get plugin config */
    getConfig: <T = any>(key: string) => T | undefined;
    /** Set plugin config */
    setConfig: (key: string, value: any) => void;
}
interface PluginHooks {
    /** Called when plugin is registered */
    onInit?: (context: PluginContext) => void | Promise<void>;
    /** Called when plugin is unregistered */
    onDestroy?: () => void | Promise<void>;
    /** Called before board is loaded */
    onBeforeBoardLoad?: (board: Board, context: PluginContext) => Board | Promise<Board>;
    /** Called after board is loaded */
    onAfterBoardLoad?: (board: Board, context: PluginContext) => void | Promise<void>;
    /** Called before card is created */
    onBeforeCardCreate?: (card: Partial<Card$1>, context: PluginContext) => Partial<Card$1> | Promise<Partial<Card$1>>;
    /** Called after card is created */
    onAfterCardCreate?: (card: Card$1, context: PluginContext) => void | Promise<void>;
    /** Called before card is updated */
    onBeforeCardUpdate?: (cardId: string, updates: Partial<Card$1>, context: PluginContext) => Partial<Card$1> | Promise<Partial<Card$1>>;
    /** Called after card is updated */
    onAfterCardUpdate?: (card: Card$1, context: PluginContext) => void | Promise<void>;
    /** Called before card is moved */
    onBeforeCardMove?: (cardId: string, fromColumn: string, toColumn: string, position: number, context: PluginContext) => {
        toColumn: string;
        position: number;
    } | Promise<{
        toColumn: string;
        position: number;
    }>;
    /** Called after card is moved */
    onAfterCardMove?: (cardId: string, fromColumn: string, toColumn: string, context: PluginContext) => void | Promise<void>;
    /** Called before card is deleted */
    onBeforeCardDelete?: (cardId: string, context: PluginContext) => boolean | Promise<boolean>;
    /** Called after card is deleted */
    onAfterCardDelete?: (cardId: string, context: PluginContext) => void | Promise<void>;
    /** Called before column is created */
    onBeforeColumnCreate?: (column: Partial<Column$1>, context: PluginContext) => Partial<Column$1> | Promise<Partial<Column$1>>;
    /** Called after column is created */
    onAfterColumnCreate?: (column: Column$1, context: PluginContext) => void | Promise<void>;
    /** Called before column is deleted */
    onBeforeColumnDelete?: (columnId: string, context: PluginContext) => boolean | Promise<boolean>;
    /** Called after column is deleted */
    onAfterColumnDelete?: (columnId: string, context: PluginContext) => void | Promise<void>;
    /** Called on board state change */
    onBoardChange?: (board: Board, prevBoard: Board, context: PluginContext) => void | Promise<void>;
}
interface Plugin extends PluginHooks {
    /** Unique plugin identifier */
    id: string;
    /** Plugin name */
    name: string;
    /** Plugin version */
    version: string;
    /** Plugin description */
    description?: string;
    /** Plugin author */
    author?: string;
    /** Plugin dependencies (other plugin IDs) */
    dependencies?: string[];
    /** Plugin configuration schema */
    configSchema?: Record<string, any>;
    /** Default configuration */
    defaultConfig?: Record<string, any>;
}
interface IPluginManager {
    /** Register a plugin */
    register(plugin: Plugin): void;
    /** Unregister a plugin */
    unregister(pluginId: string): void;
    /** Get registered plugin */
    getPlugin(pluginId: string): Plugin | undefined;
    /** Get all registered plugins */
    getPlugins(): Plugin[];
    /** Check if plugin is registered */
    hasPlugin(pluginId: string): boolean;
    /** Enable/disable plugin */
    setEnabled(pluginId: string, enabled: boolean): void;
    /** Check if plugin is enabled */
    isEnabled(pluginId: string): boolean;
}

/**
 * Plugin Manager Implementation
 * Manages plugin lifecycle and execution
 * @module plugins/PluginManager
 */

declare class PluginManager implements IPluginManager {
    private plugins;
    private enabled;
    private config;
    private context;
    private pluginLogger;
    /**
     * Set plugin context (board state, callbacks, etc.)
     */
    setContext(context: PluginContext): void;
    /**
     * Register a plugin
     */
    register(plugin: Plugin): void;
    /**
     * Unregister a plugin
     */
    unregister(pluginId: string): void;
    /**
     * Get registered plugin
     */
    getPlugin(pluginId: string): Plugin | undefined;
    /**
     * Get all registered plugins
     */
    getPlugins(): Plugin[];
    /**
     * Check if plugin is registered
     */
    hasPlugin(pluginId: string): boolean;
    /**
     * Enable/disable plugin
     */
    setEnabled(pluginId: string, enabled: boolean): void;
    /**
     * Check if plugin is enabled
     */
    isEnabled(pluginId: string): boolean;
    /**
     * Get plugin config
     */
    getConfig<T = any>(pluginId: string, key: string): T | undefined;
    /**
     * Set plugin config
     */
    setConfig(pluginId: string, key: string, value: any): void;
    /**
     * Execute plugin hooks
     */
    executeHook<T = any>(hookName: keyof Plugin, args: any[], defaultValue?: T): Promise<T | undefined>;
    /**
     * Execute plugin hooks in parallel
     */
    executeHookParallel(hookName: keyof Plugin, args: any[]): Promise<void>;
}
/**
 * Global plugin manager instance
 */
declare const pluginManager: PluginManager;

interface VirtualListProps<T> {
    /** Array of items to render */
    items: T[];
    /** Height of the scrollable container in pixels */
    height: number | string;
    /** Estimated size of each item in pixels */
    estimateSize: number;
    /** Render function for each item */
    renderItem: (item: T, index: number) => React__default.ReactNode;
    /** Optional className for the container */
    className?: string;
    /** Overscan count (number of items to render outside viewport) */
    overscan?: number;
    /** Enable horizontal scrolling instead of vertical */
    horizontal?: boolean;
    /** Optional gap between items in pixels */
    gap?: number;
    /** Optional key extractor function */
    getItemKey?: (item: T, index: number) => string | number;
}
/**
 * VirtualList component for efficient rendering of large lists
 *
 * Uses @tanstack/react-virtual for windowing/virtualization
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={cards}
 *   height={600}
 *   estimateSize={100}
 *   renderItem={(card) => <CardComponent card={card} />}
 *   getItemKey={(card) => card.id}
 * />
 * ```
 */
declare function VirtualList<T>({ items, height, estimateSize, renderItem, className, overscan, horizontal, gap, getItemKey, }: VirtualListProps<T>): react_jsx_runtime.JSX.Element;
/**
 * Hook to access virtualizer instance for advanced use cases
 */
declare function useVirtualList<T>(options: {
    items: T[];
    scrollElement: HTMLElement | null;
    estimateSize: number;
    overscan?: number;
    horizontal?: boolean;
    gap?: number;
}): _tanstack_virtual_core.Virtualizer<HTMLElement, Element>;

interface VirtualGridProps<T> {
    /** Array of items to render */
    items: T[];
    /** Height of the scrollable container in pixels */
    height: number | string;
    /** Width of the scrollable container in pixels */
    width?: number | string;
    /** Estimated width of each column in pixels */
    estimateColumnWidth: number;
    /** Render function for each column */
    renderColumn: (item: T, index: number) => React__default.ReactNode;
    /** Optional className for the container */
    className?: string;
    /** Overscan count (number of columns to render outside viewport) */
    overscan?: number;
    /** Optional gap between columns in pixels */
    gap?: number;
    /** Optional key extractor function */
    getItemKey?: (item: T, index: number) => string | number;
    /** Enable horizontal scrolling only */
    horizontal?: boolean;
}
/**
 * VirtualGrid component for efficient rendering of large horizontal lists/grids
 *
 * Optimized for Kanban boards with many columns
 *
 * @example
 * ```tsx
 * <VirtualGrid
 *   items={columns}
 *   height="100%"
 *   estimateColumnWidth={320}
 *   renderColumn={(column) => <ColumnComponent column={column} />}
 *   getItemKey={(column) => column.id}
 * />
 * ```
 */
declare function VirtualGrid<T>({ items, height, width, estimateColumnWidth, renderColumn, className, overscan, gap, getItemKey, horizontal, }: VirtualGridProps<T>): react_jsx_runtime.JSX.Element;
/**
 * Hook for advanced 2D virtualization with both rows and columns
 */
declare function useVirtualGrid<T>(options: {
    items: T[];
    scrollElement: HTMLElement | null;
    estimateColumnWidth: number;
    estimateRowHeight?: number;
    overscan?: number;
    gap?: number;
}): {
    columnVirtualizer: _tanstack_virtual_core.Virtualizer<HTMLElement, Element>;
    virtualColumns: _tanstack_virtual_core.VirtualItem[];
    totalWidth: number;
};
/**
 * Utility to determine if grid should use virtualization
 */
declare function shouldVirtualizeGrid(columnCount: number, threshold?: number): boolean;

/**
 * Design Tokens - Centralized design system tokens
 * @module tokens/design-tokens
 */
/**
 * Spacing tokens (in pixels)
 */
declare const spacing: {
    readonly none: 0;
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 20;
    readonly '2xl': 24;
    readonly '3xl': 32;
    readonly '4xl': 40;
    readonly '5xl': 48;
    readonly '6xl': 64;
};
/**
 * Border radius tokens (in pixels)
 */
declare const borderRadius: {
    readonly none: 0;
    readonly sm: 4;
    readonly md: 8;
    readonly lg: 12;
    readonly xl: 16;
    readonly '2xl': 20;
    readonly full: 9999;
};
/**
 * Font size tokens (in pixels)
 */
declare const fontSize: {
    readonly xs: 12;
    readonly sm: 14;
    readonly base: 16;
    readonly lg: 18;
    readonly xl: 20;
    readonly '2xl': 24;
    readonly '3xl': 30;
    readonly '4xl': 36;
    readonly '5xl': 48;
};
/**
 * Font weight tokens
 */
declare const fontWeight: {
    readonly light: 300;
    readonly normal: 400;
    readonly medium: 500;
    readonly semibold: 600;
    readonly bold: 700;
    readonly extrabold: 800;
};
/**
 * Line height tokens
 */
declare const lineHeight: {
    readonly none: 1;
    readonly tight: 1.25;
    readonly snug: 1.375;
    readonly normal: 1.5;
    readonly relaxed: 1.625;
    readonly loose: 2;
};
/**
 * Z-index layers
 */
declare const zIndex: {
    readonly base: 0;
    readonly dropdown: 1000;
    readonly sticky: 1020;
    readonly fixed: 1030;
    readonly modalBackdrop: 1040;
    readonly modal: 1050;
    readonly popover: 1060;
    readonly tooltip: 1070;
};
/**
 * Transition durations (in milliseconds)
 */
declare const duration: {
    readonly instant: 0;
    readonly fastest: 75;
    readonly faster: 100;
    readonly fast: 150;
    readonly normal: 200;
    readonly slow: 300;
    readonly slower: 400;
    readonly slowest: 500;
};
/**
 * Transition timing functions
 */
declare const easing: {
    readonly linear: "linear";
    readonly ease: "ease";
    readonly easeIn: "ease-in";
    readonly easeOut: "ease-out";
    readonly easeInOut: "ease-in-out";
    readonly smooth: "cubic-bezier(0.4, 0.0, 0.2, 1)";
    readonly sharp: "cubic-bezier(0.4, 0.0, 0.6, 1)";
    readonly bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)";
};
/**
 * Shadow tokens
 */
declare const shadows: {
    readonly none: "none";
    readonly sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
    readonly base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
    readonly md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
    readonly lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
    readonly xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
    readonly '2xl': "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    readonly inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)";
};
/**
 * Opacity tokens
 */
declare const opacity: {
    readonly 0: 0;
    readonly 5: 0.05;
    readonly 10: 0.1;
    readonly 20: 0.2;
    readonly 30: 0.3;
    readonly 40: 0.4;
    readonly 50: 0.5;
    readonly 60: 0.6;
    readonly 70: 0.7;
    readonly 80: 0.8;
    readonly 90: 0.9;
    readonly 100: 1;
};
/**
 * Kanban-specific tokens
 */
declare const kanban: {
    readonly column: {
        readonly width: 320;
        readonly minWidth: 280;
        readonly maxWidth: 400;
        readonly gap: 16;
        readonly padding: 12;
        readonly headerHeight: 48;
    };
    readonly card: {
        readonly minHeight: 80;
        readonly maxHeight: 400;
        readonly padding: 12;
        readonly gap: 8;
    };
    readonly board: {
        readonly padding: 16;
        readonly gap: 16;
    };
};
/**
 * Gantt-specific tokens
 */
declare const gantt: {
    readonly timeline: {
        readonly headerHeight: 60;
        readonly rowHeight: 44;
        readonly minRowHeight: 32;
        readonly maxRowHeight: 80;
        readonly taskPadding: 4;
        readonly gridLineWidth: 1;
    };
    readonly task: {
        readonly height: 28;
        readonly minHeight: 20;
        readonly maxHeight: 40;
        readonly borderRadius: 4;
        readonly padding: 6;
    };
    readonly dependency: {
        readonly lineWidth: 2;
        readonly arrowSize: 8;
    };
    readonly scale: {
        readonly day: {
            readonly columnWidth: 40;
            readonly minColumnWidth: 30;
            readonly maxColumnWidth: 60;
        };
        readonly week: {
            readonly columnWidth: 80;
            readonly minColumnWidth: 60;
            readonly maxColumnWidth: 120;
        };
        readonly month: {
            readonly columnWidth: 120;
            readonly minColumnWidth: 80;
            readonly maxColumnWidth: 200;
        };
        readonly quarter: {
            readonly columnWidth: 200;
            readonly minColumnWidth: 150;
            readonly maxColumnWidth: 300;
        };
    };
    readonly milestone: {
        readonly size: 16;
        readonly rotation: 45;
    };
};
/**
 * Combined design tokens
 */
declare const designTokens: {
    readonly spacing: {
        readonly none: 0;
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 16;
        readonly xl: 20;
        readonly '2xl': 24;
        readonly '3xl': 32;
        readonly '4xl': 40;
        readonly '5xl': 48;
        readonly '6xl': 64;
    };
    readonly borderRadius: {
        readonly none: 0;
        readonly sm: 4;
        readonly md: 8;
        readonly lg: 12;
        readonly xl: 16;
        readonly '2xl': 20;
        readonly full: 9999;
    };
    readonly fontSize: {
        readonly xs: 12;
        readonly sm: 14;
        readonly base: 16;
        readonly lg: 18;
        readonly xl: 20;
        readonly '2xl': 24;
        readonly '3xl': 30;
        readonly '4xl': 36;
        readonly '5xl': 48;
    };
    readonly fontWeight: {
        readonly light: 300;
        readonly normal: 400;
        readonly medium: 500;
        readonly semibold: 600;
        readonly bold: 700;
        readonly extrabold: 800;
    };
    readonly lineHeight: {
        readonly none: 1;
        readonly tight: 1.25;
        readonly snug: 1.375;
        readonly normal: 1.5;
        readonly relaxed: 1.625;
        readonly loose: 2;
    };
    readonly zIndex: {
        readonly base: 0;
        readonly dropdown: 1000;
        readonly sticky: 1020;
        readonly fixed: 1030;
        readonly modalBackdrop: 1040;
        readonly modal: 1050;
        readonly popover: 1060;
        readonly tooltip: 1070;
    };
    readonly duration: {
        readonly instant: 0;
        readonly fastest: 75;
        readonly faster: 100;
        readonly fast: 150;
        readonly normal: 200;
        readonly slow: 300;
        readonly slower: 400;
        readonly slowest: 500;
    };
    readonly easing: {
        readonly linear: "linear";
        readonly ease: "ease";
        readonly easeIn: "ease-in";
        readonly easeOut: "ease-out";
        readonly easeInOut: "ease-in-out";
        readonly smooth: "cubic-bezier(0.4, 0.0, 0.2, 1)";
        readonly sharp: "cubic-bezier(0.4, 0.0, 0.6, 1)";
        readonly bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)";
    };
    readonly shadows: {
        readonly none: "none";
        readonly sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
        readonly base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
        readonly md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
        readonly lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
        readonly xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
        readonly '2xl': "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
        readonly inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)";
    };
    readonly opacity: {
        readonly 0: 0;
        readonly 5: 0.05;
        readonly 10: 0.1;
        readonly 20: 0.2;
        readonly 30: 0.3;
        readonly 40: 0.4;
        readonly 50: 0.5;
        readonly 60: 0.6;
        readonly 70: 0.7;
        readonly 80: 0.8;
        readonly 90: 0.9;
        readonly 100: 1;
    };
    readonly kanban: {
        readonly column: {
            readonly width: 320;
            readonly minWidth: 280;
            readonly maxWidth: 400;
            readonly gap: 16;
            readonly padding: 12;
            readonly headerHeight: 48;
        };
        readonly card: {
            readonly minHeight: 80;
            readonly maxHeight: 400;
            readonly padding: 12;
            readonly gap: 8;
        };
        readonly board: {
            readonly padding: 16;
            readonly gap: 16;
        };
    };
    readonly gantt: {
        readonly timeline: {
            readonly headerHeight: 60;
            readonly rowHeight: 44;
            readonly minRowHeight: 32;
            readonly maxRowHeight: 80;
            readonly taskPadding: 4;
            readonly gridLineWidth: 1;
        };
        readonly task: {
            readonly height: 28;
            readonly minHeight: 20;
            readonly maxHeight: 40;
            readonly borderRadius: 4;
            readonly padding: 6;
        };
        readonly dependency: {
            readonly lineWidth: 2;
            readonly arrowSize: 8;
        };
        readonly scale: {
            readonly day: {
                readonly columnWidth: 40;
                readonly minColumnWidth: 30;
                readonly maxColumnWidth: 60;
            };
            readonly week: {
                readonly columnWidth: 80;
                readonly minColumnWidth: 60;
                readonly maxColumnWidth: 120;
            };
            readonly month: {
                readonly columnWidth: 120;
                readonly minColumnWidth: 80;
                readonly maxColumnWidth: 200;
            };
            readonly quarter: {
                readonly columnWidth: 200;
                readonly minColumnWidth: 150;
                readonly maxColumnWidth: 300;
            };
        };
        readonly milestone: {
            readonly size: 16;
            readonly rotation: 45;
        };
    };
};
/**
 * Type helpers
 */
type SpacingToken = keyof typeof spacing;
type BorderRadiusToken = keyof typeof borderRadius;
type FontSizeToken = keyof typeof fontSize;
type FontWeightToken = keyof typeof fontWeight;
type LineHeightToken = keyof typeof lineHeight;
type ZIndexToken = keyof typeof zIndex;
type DurationToken = keyof typeof duration;
type EasingToken = keyof typeof easing;
type ShadowToken = keyof typeof shadows;
type OpacityToken = keyof typeof opacity;
/**
 * Design token value types
 */
type DesignTokens = typeof designTokens;
type TokenValue = string | number;
/**
 * Utility to get token value with fallback
 */
declare function getToken<T extends TokenValue>(tokens: Record<string, T>, key: string, fallback: T): T;

/**
 * CSS Custom Properties Generator
 * Generates CSS variables from design tokens
 * @module tokens/css-generator
 */
/**
 * Generate CSS custom properties from design tokens
 */
declare function generateCSSVariables(prefix?: string): string;
/**
 * Generate CSS custom properties for a specific theme
 */
interface ThemeColors$1 {
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
        card: string;
        hover: string;
        active: string;
    };
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        disabled: string;
        inverse: string;
    };
    border: {
        default: string;
        hover: string;
        focus: string;
        active: string;
    };
    status: {
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    priority: {
        low: string;
        medium: string;
        high: string;
        urgent: string;
    };
    interactive: {
        primary: string;
        primaryHover: string;
        primaryActive: string;
        secondary: string;
        secondaryHover: string;
        secondaryActive: string;
    };
    gantt: {
        gridLine: string;
        todayLine: string;
        taskBackground: string;
        taskBorder: string;
        criticalPath: string;
        milestone: string;
        dependency: string;
        weekend: string;
    };
}
/**
 * Generate theme CSS variables
 */
declare function generateThemeVariables(theme: ThemeColors$1, prefix?: string): string;
/**
 * Dark theme colors
 */
declare const darkTheme$1: ThemeColors$1;
/**
 * Light theme colors
 */
declare const lightTheme$1: ThemeColors$1;
/**
 * Neutral theme colors
 */
declare const neutralTheme$1: ThemeColors$1;
/**
 * Generate complete CSS with all tokens and theme
 */
declare function generateCompleteCSS(theme?: ThemeColors$1, prefix?: string): string;
/**
 * Export CSS to file content
 */
declare function exportTokensToCSS(): string;

/**
 * Theme System Types
 * ASAKAA v0.5.0
 */
type ThemeName = 'dark' | 'light' | 'neutral';
interface ThemeColors {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgCard: string;
    bgHover: string;
    bgActive: string;
    bgInput: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textDisabled: string;
    textInverse: string;
    accentPrimary: string;
    accentHover: string;
    borderPrimary: string;
    borderSecondary: string;
    borderDefault: string;
    borderHover: string;
    borderSubtle: string;
    interactivePrimary: string;
    interactivePrimaryHover: string;
    interactivePrimaryBorder: string;
    interactivePrimaryBackground: string;
    interactivePrimaryBackgroundHover: string;
    success?: string;
    warning?: string;
    error?: string;
    info?: string;
    danger: string;
    dangerBorder: string;
    dangerBackground: string;
    dangerBackgroundHover: string;
}
interface Theme {
    name: ThemeName;
    displayName: string;
    emoji: string;
    colors: ThemeColors;
    shadows: {
        sm: string;
        md: string;
        lg: string;
    };
    radii: {
        sm: string;
        md: string;
        lg: string;
        full: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}
interface ThemeContextValue {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    themes: Record<ThemeName, Theme>;
}

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: ThemeName;
    storageKey?: string;
}
declare function ThemeProvider({ children, defaultTheme: initialTheme, storageKey, }: ThemeProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access theme context
 */
declare function useTheme(): ThemeContextValue;

interface ThemeSwitcherProps {
    /** Show labels for each theme */
    showLabels?: boolean;
    /** Compact mode (icon-only) */
    compact?: boolean;
    /** Custom class name */
    className?: string;
}
declare function ThemeSwitcher({ showLabels, compact, className }: ThemeSwitcherProps): react_jsx_runtime.JSX.Element;

/**
 * Theme Definitions
 * ASAKAA v0.5.0 - Elite Theming System
 */

/**
 * DARK THEME (Enhanced) - DEFAULT
 * Philosophy: Speed, efficiency, focus
 * Optimized for developer productivity
 */
declare const darkTheme: Theme;
/**
 * LIGHT THEME (Accessible Standard)
 * Philosophy: Clarity, legibility, professionalism
 * WCAG AAA compliant (7:1 contrast)
 */
declare const lightTheme: Theme;
/**
 * NEUTRAL THEME (Zen Mode)
 * Philosophy: Minimalism, calm technology, maximum concentration
 * Strictly monochromatic - states communicated via icons/typography
 */
declare const neutralTheme: Theme;
/**
 * All themes registry
 */
declare const themes: Record<ThemeName, Theme>;
/**
 * Default theme
 */
declare const defaultTheme: ThemeName;

export { type AICallbacks, type AICommandResult, type GanttTask as AIGanttTask, type AIMessage, type AIModelKey, type AIOperation, AIUsageDashboard, type AIUsageDashboardProps, AI_FEATURES, AI_MODELS, type Activity, type ActivityType, AddCardButton, type AddCardButtonProps, type AddCardData, AddColumnButton, type AddColumnButtonProps, type AssigneeSuggestion, type Attachment, AttachmentUploader, type AttachmentUploaderProps, type Board, type BoardCallbacks, type BoardConfig, BoardProvider, type BoardProviderProps, type BorderRadiusToken, BulkOperationsToolbar, type BulkOperationsToolbarProps, BurnDownChart, type BurnDownChartProps, type BurnDownDataPoint, CalendarBoard, type CalendarBoardProps, type CalendarCallbacks, type CalendarConfig, type CalendarDay, type CalendarEvent, type CalendarPermissions, type CalendarSupportedLocale, type CalendarTheme, type CalendarThemeName, type CalendarTranslations, type CalendarViewMode, Card, CardDetailModal, type CardDetailModalProps, CardDetailModalV2, type CardDetailModalV2Props, type CardFilter, type CardFilters, CardHistoryReplay, type CardHistoryReplayProps, CardHistoryTimeline, type CardHistoryTimelineProps, type CardProps, CardRelationshipsGraph, type CardRelationshipsGraphProps, type CardSort, type CardSortKey, CardStack, type CardStackProps, type CardStack$1 as CardStackType, type CardStatus, type CardTemplate, CardTemplateSelector, type CardTemplateSelectorProps, type Card$1 as CardType, CircuitBreaker, Column, ColumnManager, type ColumnProps, type Column$1 as ColumnType, CommandPalette, type CommandPaletteProps, type Comment, ConfigMenu, type ConfigMenuProps, ContextMenu, DEFAULT_SHORTCUTS, DEFAULT_TEMPLATES, type DateFilter, DateRangePicker, type DateRangePickerProps, DependenciesSelector, type DependenciesSelectorProps, DependencyLine, type DesignTokens, DistributionCharts, type DistributionChartsProps, type DistributionDataPoint, type DragData, type DropData, type DurationToken, type EasingToken, EditableColumnTitle, type EditableColumnTitleProps, ErrorBoundary, type ErrorBoundaryProps, type ExportFormat, ExportImportModal, type ExportImportModalProps, type ExportOptions, FilterBar, type FilterBarProps, type FilterState, type FlattenedTask, type FontSizeToken, type FontWeightToken, GANTT_AI_SYSTEM_PROMPT, GanttAIAssistant, type GanttAIAssistantConfig, type Assignee as GanttAssignee, GanttBoard, type GanttConfig as GanttBoardConfig, type GanttBoardRef, type GanttColumn, type ColumnType as GanttColumnType, GanttI18nContext, Milestone as GanttMilestone, type GanttPermissions, type Task as GanttTask, type GanttTemplates, type Theme$1 as GanttTheme, type GanttTheme as GanttThemeConfig, GanttToolbar, type GanttTranslations, GenerateGanttTasksDialog, type GenerateGanttTasksDialogProps, GeneratePlanModal, type GeneratePlanModalProps, type GeneratedPlan, type GeneratedTasksResponse, type GroupByOption, GroupBySelector, type GroupBySelectorProps, type IPluginManager, type ImportResult, type Insight, type InsightSeverity, type InsightType, KanbanBoard, type KanbanBoardProps, KanbanToolbar, type KanbanToolbarProps, KanbanViewAdapter, type KanbanViewConfig, type KeyboardAction, type KeyboardShortcut, KeyboardShortcutsHelp, type KeyboardShortcutsHelpProps, type LineHeightToken, type ListColumn, type ListFilter, type ListSort, type ListSortColumn, ListView, type ListViewCallbacks, type ListViewConfig, type ListViewPermissions, type ListViewProps, type ListViewSupportedLocale, type ListViewTheme, type ListViewThemeName, type ListViewTranslations, MenuIcons, type OpacityToken, type PersistHistoryConfig, type Plugin, type PluginContext, type PluginHooks, PluginManager, type Priority, PrioritySelector, type PrioritySelectorProps, RATE_LIMITS, type RenderProps, type RetryOptions, type RetryResult, type ShadowToken, type SortBy, type SortDirection, type SortOrder, type SortState, type SpacingToken, type StackSuggestion, type StackingConfig, type StackingStrategy, type Subtask, type SupportedLocale, type Swimlane, SwimlaneBoardView, type SwimlaneBoardViewProps, type SwimlaneConfig, TaskBar, type TaskFormData, TaskFormModal, type TaskFormModalProps, TaskGrid, type TaskPriority, type Theme, type ThemeColors, type ThemeContextValue, ThemeModal, type ThemeModalProps, type ThemeName, ThemeProvider, ThemeSwitcher, type TimeScale, Timeline, type ThemeColors$1 as TokenThemeColors, type TokenValue, type UsageStats, type UseAIOptions, type UseAIReturn, type UseBoardReturn as UseBoardCoreReturn, type UseBoardOptions, type UseBoardReturn$1 as UseBoardReturn, type UseCardStackingOptions, type UseCardStackingResult, type UseDragStateReturn, type UseFiltersOptions, type UseFiltersReturn, type UseKanbanStateOptions, type UseKanbanStateReturn, type UseKeyboardShortcutsOptions, type UseKeyboardShortcutsReturn, type UseMultiSelectReturn, type UseSelectionStateReturn, type User$1 as User, UserAssignmentSelector, type UserAssignmentSelectorProps, VelocityChart, type VelocityChartProps, type VelocityDataPoint, VirtualGrid, type VirtualGridProps, VirtualList, type VirtualListProps, type WeekDay, type ZIndexToken, aiUsageTracker, borderRadius, calculatePosition, darkTheme$2 as calendarDarkTheme, en as calendarEnTranslations, es as calendarEsTranslations, lightTheme$2 as calendarLightTheme, neutralTheme$2 as calendarNeutralTheme, calendarThemes, calendarTranslations, cardToGanttTask, cardsToGanttTasks, cn, createKanbanView, createRetryWrapper, darkTheme, darkTheme$1 as darkTokenTheme, defaultTheme, designTokens, duration, easing, exportTokensToCSS, findTaskByName, fontSize, fontWeight, formatCost, en$2 as ganttEnTranslations, es$2 as ganttEsTranslations, ganttTaskToCardUpdate, themes$1 as ganttThemes, gantt as ganttTokens, translations as ganttTranslations, ganttUtils, generateCSSVariables, generateCompleteCSS, generateInitialPositions, generateTasksContext, generateThemeVariables, getCalendarTheme, getCalendarTranslations, getListViewTheme, getListViewTranslations, getMonthNames, getToken, getTranslations, getWeekdayNames, kanban as kanbanTokens, lightTheme, lightTheme$1 as lightTokenTheme, lineHeight, darkTheme$3 as listViewDarkTheme, en$1 as listViewEnTranslations, es$1 as listViewEsTranslations, lightTheme$3 as listViewLightTheme, neutralTheme$3 as listViewNeutralTheme, listViewThemes, listViewTranslations, mergeCalendarTranslations, mergeListViewTranslations, mergeTranslations, neutralTheme, neutralTheme$1 as neutralTokenTheme, opacity, parseLocalCommand, parseNaturalDate, parseNaturalDuration, parseProgress, parseStatus, pluginManager, retrySyncOperation, retryWithBackoff, shadows, shouldVirtualizeGrid, spacing, themes, useAI, useBoard$1 as useBoard, useBoard as useBoardCore, useBoardStore, useCardStacking, useDragState, useFilteredCards, useFilters, useGanttI18n, useKanbanState, useKeyboardShortcuts, useMultiSelect, useSelectionState, useSortedCards, useTheme, useVirtualGrid, useVirtualList, validateAIResponse, withErrorBoundary, wouldCreateCircularDependency, zIndex };
