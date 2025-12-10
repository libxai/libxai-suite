/**
 * Base types for ASAKAA Core
 * @module types/base
 */
/**
 * Priority levels for cards
 */
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
/**
 * Card status types
 */
type CardStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED';
/**
 * Dependency types for Gantt chart
 * - finish-to-start: Task B can't start until Task A finishes (most common)
 * - start-to-start: Task B can't start until Task A starts
 * - finish-to-finish: Task B can't finish until Task A finishes
 * - start-to-finish: Task B can't finish until Task A starts (rare)
 */
type DependencyType = 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
/**
 * Dependency configuration for Gantt scheduling
 */
interface Dependency {
    /** ID of the task this task depends on */
    taskId: string;
    /** Type of dependency relationship */
    type: DependencyType;
    /** Lag time in days (positive = delay, negative = lead time) */
    lag?: number;
}
/**
 * Base entity with common properties
 */
interface BaseEntity {
    /** Unique identifier */
    id: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Card data interface
 */
interface CardData extends BaseEntity {
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
    /** Status */
    status?: CardStatus;
    /** Assigned user IDs (multiple users) */
    assignedUserIds?: string[];
    /** Tags/labels */
    labels?: string[];
    /** Date range - start date */
    startDate?: Date;
    /** Date range - end date */
    endDate?: Date;
    /** Task dependencies with relationship types */
    dependencies?: Dependency[];
    /** Estimated time (in hours) */
    estimatedTime?: number;
    /** Actual time spent (in hours) */
    actualTime?: number;
    /** Manual progress override (0-100%) - takes precedence over calculated progress */
    progress?: number;
}
/**
 * Column data interface
 */
interface ColumnData extends BaseEntity {
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
}
/**
 * Board data interface
 */
interface BoardData extends BaseEntity {
    /** Board title */
    title: string;
    /** Board description */
    description?: string;
    /** Array of column IDs */
    columnIds: string[];
    /** Board settings */
    settings?: BoardSettings;
}
/**
 * Board settings
 */
interface BoardSettings {
    /** Default theme */
    theme?: 'dark' | 'light' | 'neutral';
    /** Enable/disable features */
    features?: {
        enableTimeTracking?: boolean;
        enableDependencies?: boolean;
        enableLabels?: boolean;
        enableDueDates?: boolean;
    };
}
/**
 * User data interface
 */
interface UserData extends BaseEntity {
    /** User name */
    name: string;
    /** User email */
    email: string;
    /** User initials (for avatar) */
    initials?: string;
    /** Avatar color */
    color?: string;
    /** User role */
    role?: 'admin' | 'member' | 'viewer';
}

/**
 * Event types for ASAKAA Core Store
 * @module types/events
 */

/**
 * Event listener function type
 */
type EventListener<T = unknown> = (event: StoreEvent<T>) => void;
/**
 * Store event structure
 */
interface StoreEvent<T = unknown> {
    /** Event type/name */
    type: string;
    /** Event payload */
    data: T;
    /** Event timestamp */
    timestamp: Date;
    /** Event metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Card events
 */
type CardEvent = {
    type: 'card:created';
    data: CardData;
} | {
    type: 'card:updated';
    data: {
        id: string;
        changes: Partial<CardData>;
    };
} | {
    type: 'card:deleted';
    data: {
        id: string;
    };
} | {
    type: 'card:moved';
    data: {
        id: string;
        fromColumnId: string;
        toColumnId: string;
        newPosition: number;
    };
};
/**
 * Column events
 */
type ColumnEvent = {
    type: 'column:created';
    data: ColumnData;
} | {
    type: 'column:updated';
    data: {
        id: string;
        changes: Partial<ColumnData>;
    };
} | {
    type: 'column:deleted';
    data: {
        id: string;
    };
} | {
    type: 'column:reordered';
    data: {
        columnIds: string[];
    };
};
/**
 * Board events
 */
type BoardEvent = {
    type: 'board:created';
    data: BoardData;
} | {
    type: 'board:updated';
    data: {
        id: string;
        changes: Partial<BoardData>;
    };
} | {
    type: 'board:deleted';
    data: {
        id: string;
    };
};
/**
 * All possible events
 */
type AnyEvent = CardEvent | ColumnEvent | BoardEvent;
/**
 * Event type names
 */
type EventType = AnyEvent['type'];

/**
 * Gantt-specific types for ASAKAA Core
 * @module types/gantt
 */

/**
 * Milestone marker in a project timeline
 */
interface Milestone {
    /** Unique identifier */
    id: string;
    /** Milestone name/title */
    name: string;
    /** Target date for the milestone */
    date: Date;
    /** Whether milestone has been achieved */
    achieved: boolean;
    /** Associated card IDs that must be completed for this milestone */
    cardIds?: string[];
    /** Optional description */
    description?: string;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Baseline snapshot for project comparison
 * Used to compare planned vs actual progress
 */
interface Baseline {
    /** Unique identifier */
    id: string;
    /** Baseline name (e.g., "Initial Plan", "Q2 Revision") */
    name: string;
    /** When this baseline was created */
    createdAt: Date;
    /** Snapshot of card data at baseline time */
    cards: Map<string, BaselineCardSnapshot>;
    /** Optional description */
    description?: string;
}
/**
 * Snapshot of a card at baseline time
 */
interface BaselineCardSnapshot {
    /** Card ID */
    id: string;
    /** Planned start date at baseline */
    startDate?: Date;
    /** Planned end date at baseline */
    endDate?: Date;
    /** Planned duration in days */
    duration?: number;
    /** Planned progress percentage */
    progress?: number;
    /** Dependencies at baseline time */
    dependencies?: Dependency[];
}
/**
 * Critical path result from dependency analysis
 */
interface CriticalPath {
    /** Array of card IDs in critical path order */
    cardIds: string[];
    /** Total duration in days */
    duration: number;
    /** Whether any task in critical path is delayed */
    hasDelays: boolean;
    /** Total slack/float in the project (0 for critical path tasks) */
    totalSlack: number;
}
/**
 * Task scheduling result
 */
interface ScheduledTask {
    /** Card ID */
    cardId: string;
    /** Calculated earliest start date */
    earlyStart: Date;
    /** Calculated earliest finish date */
    earlyFinish: Date;
    /** Calculated latest start date */
    lateStart: Date;
    /** Calculated latest finish date */
    lateFinish: Date;
    /** Total float/slack in days */
    totalFloat: number;
    /** Free float in days */
    freeFloat: number;
    /** Whether this task is on critical path */
    isCritical: boolean;
    /** Dependencies affecting this task */
    predecessors: string[];
    /** Tasks dependent on this task */
    successors: string[];
}
/**
 * Resource allocation for a task
 */
interface ResourceAllocation {
    /** Resource/user ID */
    resourceId: string;
    /** Card ID */
    cardId: string;
    /** Allocation percentage (0-100) */
    allocation: number;
    /** Start date of allocation */
    startDate: Date;
    /** End date of allocation */
    endDate: Date;
}
/**
 * Resource utilization summary
 */
interface ResourceUtilization {
    /** Resource/user ID */
    resourceId: string;
    /** Total allocated hours */
    allocatedHours: number;
    /** Available hours in period */
    availableHours: number;
    /** Utilization percentage */
    utilization: number;
    /** Whether resource is over-allocated */
    isOverAllocated: boolean;
    /** Array of card IDs assigned to this resource */
    assignedCardIds: string[];
}
/**
 * Gantt view configuration
 */
interface GanttConfig {
    /** Time scale unit */
    timeScale: 'day' | 'week' | 'month' | 'quarter';
    /** Show/hide weekends */
    showWeekends: boolean;
    /** Show/hide today marker */
    showTodayMarker: boolean;
    /** Show/hide critical path */
    highlightCriticalPath: boolean;
    /** Show/hide dependencies */
    showDependencies: boolean;
    /** Show/hide milestones */
    showMilestones: boolean;
    /** Show/hide baselines */
    showBaseline?: boolean;
    /** Active baseline ID for comparison */
    activeBaselineId?: string;
    /** Row height in pixels */
    rowHeight: number;
    /** Enable auto-scheduling */
    autoSchedule: boolean;
    /** Working hours per day */
    workingHoursPerDay: number;
    /** Working days per week (typically 5) */
    workingDaysPerWeek: number;
}
/**
 * Gantt chart state
 */
interface GanttState {
    /** All cards in the project */
    cards: Map<string, CardData>;
    /** Milestones */
    milestones: Map<string, Milestone>;
    /** Baselines */
    baselines: Map<string, Baseline>;
    /** Scheduled tasks (calculated) */
    scheduledTasks: Map<string, ScheduledTask>;
    /** Critical path (calculated) */
    criticalPath?: CriticalPath;
    /** Configuration */
    config: GanttConfig;
    /** Current view date range */
    viewRange: {
        start: Date;
        end: Date;
    };
}
/**
 * Dependency validation result
 */
interface DependencyValidation {
    /** Whether dependencies are valid */
    isValid: boolean;
    /** Array of circular dependency chains detected */
    circularDependencies: string[][];
    /** Array of invalid task IDs (tasks that don't exist) */
    invalidTaskIds: string[];
    /** Error messages */
    errors: string[];
}
/**
 * Auto-schedule options
 */
interface AutoScheduleOptions {
    /** Start date for scheduling */
    projectStartDate: Date;
    /** Working hours per day */
    workingHoursPerDay?: number;
    /** Working days */
    workingDays?: number[];
    /** Respect manual constraints */
    respectConstraints?: boolean;
    /** Level resources */
    levelResources?: boolean;
}
/**
 * Task constraint types
 */
type TaskConstraintType = 'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO';
/**
 * Task constraint
 */
interface TaskConstraint {
    /** Card ID */
    cardId: string;
    /** Constraint type */
    type: TaskConstraintType;
    /** Constraint date (if applicable) */
    date?: Date;
}

/**
 * Card Model - Immutable card entity
 * @module models/Card
 */

/**
 * Immutable Card entity
 *
 * @example
 * ```typescript
 * const card = new Card({
 *   id: 'card-1',
 *   title: 'Implement login',
 *   columnId: 'todo',
 *   position: 0
 * })
 *
 * // Update creates a new instance
 * const updated = card.update({ title: 'Implement authentication' })
 * ```
 */
declare class Card {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly position: number;
    readonly columnId: string;
    readonly priority?: Priority;
    readonly status?: CardStatus;
    readonly assignedUserIds?: readonly string[];
    readonly labels?: readonly string[];
    readonly startDate?: Date;
    readonly endDate?: Date;
    readonly dependencies?: readonly Dependency[];
    readonly estimatedTime?: number;
    readonly actualTime?: number;
    readonly progress?: number;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(data: Omit<CardData, 'createdAt' | 'updatedAt'> & {
        createdAt?: Date;
        updatedAt?: Date;
    });
    /**
     * Create a new Card instance with updated properties
     *
     * @param changes - Partial card data to update
     * @returns New Card instance with applied changes
     */
    update(changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): Card;
    /**
     * Convert Card instance to plain data object
     *
     * @returns CardData object
     */
    toData(): CardData;
    /**
     * Create a Card from plain data object
     *
     * @param data - CardData object
     * @returns Card instance
     */
    static fromData(data: CardData): Card;
    /**
     * Check if card is overdue
     *
     * @returns true if card has end date and it's in the past
     */
    isOverdue(): boolean;
    /**
     * Get number of days until due date
     *
     * @returns Number of days until due (positive = future, negative = past), or undefined if no end date
     */
    getDaysUntilDue(): number | undefined;
    /**
     * Check if card is assigned to a specific user
     *
     * @param userId - User ID to check
     * @returns true if user is assigned to this card
     */
    isAssignedTo(userId: string): boolean;
    /**
     * Check if card has a specific label
     *
     * @param label - Label to check
     * @returns true if card has the label
     */
    hasLabel(label: string): boolean;
    /**
     * Calculate progress based on manual override or actual time vs estimated time
     *
     * @returns Progress percentage (0-100) or undefined if no estimate
     */
    getProgress(): number | undefined;
    /**
     * Get duration in days between start and end date
     *
     * @returns Duration in days, or undefined if dates not set
     */
    getDuration(): number | undefined;
    /**
     * Check if this card has any dependencies
     *
     * @returns true if card has dependencies
     */
    hasDependencies(): boolean;
    /**
     * Get list of task IDs this card depends on
     *
     * @returns Array of dependent task IDs
     */
    getDependentTaskIds(): string[];
    /**
     * Check if this card depends on a specific task
     *
     * @param taskId - Task ID to check
     * @returns true if this card depends on the specified task
     */
    dependsOn(taskId: string): boolean;
    /**
     * Get dependency relationship with a specific task
     *
     * @param taskId - Task ID to check
     * @returns Dependency object if exists, undefined otherwise
     */
    getDependency(taskId: string): Dependency | undefined;
    /**
     * Add a dependency to this card
     *
     * @param dependency - Dependency to add
     * @returns New Card instance with added dependency
     */
    addDependency(dependency: Dependency): Card;
    /**
     * Remove a dependency from this card
     *
     * @param taskId - ID of task to remove dependency for
     * @returns New Card instance with removed dependency
     */
    removeDependency(taskId: string): Card;
    /**
     * Check if dates are valid (start before end)
     *
     * @returns true if dates are valid or not set
     */
    hasValidDates(): boolean;
    /**
     * Check if card is currently in progress (between start and end dates)
     *
     * @returns true if current date is between start and end dates
     */
    isInProgress(): boolean;
    /**
     * Check if card hasn't started yet
     *
     * @returns true if start date is in the future
     */
    isNotStarted(): boolean;
    /**
     * Check if card is completed (past end date or 100% progress)
     *
     * @returns true if card is considered completed
     */
    isCompleted(): boolean;
}

/**
 * Column Model - Immutable column entity
 * @module models/Column
 */

/**
 * Immutable Column entity
 *
 * @example
 * ```typescript
 * const column = new Column({
 *   id: 'col-1',
 *   title: 'To Do',
 *   position: 0,
 *   cardIds: []
 * })
 *
 * // Add a card
 * const updated = column.addCard('card-1')
 * ```
 */
declare class Column {
    readonly id: string;
    readonly title: string;
    readonly position: number;
    readonly cardIds: readonly string[];
    readonly wipLimit?: number;
    readonly wipLimitType?: 'soft' | 'hard';
    readonly color?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(data: Omit<ColumnData, 'createdAt' | 'updatedAt'> & {
        createdAt?: Date;
        updatedAt?: Date;
    });
    /**
     * Create a new Column instance with updated properties
     *
     * @param changes - Partial column data to update
     * @returns New Column instance with applied changes
     */
    update(changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): Column;
    /**
     * Add a card to the column
     *
     * @param cardId - Card ID to add
     * @param position - Position to insert (default: end)
     * @returns New Column instance with card added
     */
    addCard(cardId: string, position?: number): Column;
    /**
     * Remove a card from the column
     *
     * @param cardId - Card ID to remove
     * @returns New Column instance with card removed
     */
    removeCard(cardId: string): Column;
    /**
     * Move a card within the column
     *
     * @param cardId - Card ID to move
     * @param newPosition - New position
     * @returns New Column instance with card moved
     */
    moveCard(cardId: string, newPosition: number): Column;
    /**
     * Check if column has a card
     *
     * @param cardId - Card ID to check
     * @returns true if column contains the card
     */
    hasCard(cardId: string): boolean;
    /**
     * Get card count
     *
     * @returns Number of cards in the column
     */
    getCardCount(): number;
    /**
     * Check if WIP limit is exceeded
     *
     * @returns true if card count exceeds WIP limit
     */
    isWipLimitExceeded(): boolean;
    /**
     * Check if adding a card would exceed WIP limit
     *
     * @returns true if adding a card would exceed hard limit
     */
    canAddCard(): boolean;
    /**
     * Convert Column instance to plain data object
     *
     * @returns ColumnData object
     */
    toData(): ColumnData;
    /**
     * Create a Column from plain data object
     *
     * @param data - ColumnData object
     * @returns Column instance
     */
    static fromData(data: ColumnData): Column;
}

/**
 * Board Model - Immutable board entity
 * @module models/Board
 */

/**
 * Immutable Board entity
 *
 * @example
 * ```typescript
 * const board = new Board({
 *   id: 'board-1',
 *   title: 'My Project',
 *   columnIds: ['todo', 'in-progress', 'done']
 * })
 *
 * // Add a column
 * const updated = board.addColumn('review')
 * ```
 */
declare class Board {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly columnIds: readonly string[];
    readonly settings?: Readonly<BoardSettings>;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(data: Omit<BoardData, 'createdAt' | 'updatedAt'> & {
        createdAt?: Date;
        updatedAt?: Date;
    });
    /**
     * Create a new Board instance with updated properties
     *
     * @param changes - Partial board data to update
     * @returns New Board instance with applied changes
     */
    update(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): Board;
    /**
     * Add a column to the board
     *
     * @param columnId - Column ID to add
     * @param position - Position to insert (default: end)
     * @returns New Board instance with column added
     */
    addColumn(columnId: string, position?: number): Board;
    /**
     * Remove a column from the board
     *
     * @param columnId - Column ID to remove
     * @returns New Board instance with column removed
     */
    removeColumn(columnId: string): Board;
    /**
     * Reorder columns
     *
     * @param columnIds - New column order
     * @returns New Board instance with columns reordered
     */
    reorderColumns(columnIds: string[]): Board;
    /**
     * Move a column to a new position
     *
     * @param columnId - Column ID to move
     * @param newPosition - New position
     * @returns New Board instance with column moved
     */
    moveColumn(columnId: string, newPosition: number): Board;
    /**
     * Check if board has a column
     *
     * @param columnId - Column ID to check
     * @returns true if board contains the column
     */
    hasColumn(columnId: string): boolean;
    /**
     * Get column count
     *
     * @returns Number of columns in the board
     */
    getColumnCount(): number;
    /**
     * Get column position
     *
     * @param columnId - Column ID
     * @returns Column position or -1 if not found
     */
    getColumnPosition(columnId: string): number;
    /**
     * Update board settings
     *
     * @param settings - Partial settings to update
     * @returns New Board instance with settings updated
     */
    updateSettings(settings: Partial<BoardSettings>): Board;
    /**
     * Convert Board instance to plain data object
     *
     * @returns BoardData object
     */
    toData(): BoardData;
    /**
     * Create a Board from plain data object
     *
     * @param data - BoardData object
     * @returns Board instance
     */
    static fromData(data: BoardData): Board;
}

/**
 * Event-based Store - Framework-agnostic state management
 * @module store/Store
 */

/**
 * Generic event-based store using pub/sub pattern
 *
 * @example
 * ```typescript
 * interface AppState {
 *   count: number
 * }
 *
 * const store = new Store<AppState>({ count: 0 })
 *
 * // Subscribe to events
 * store.subscribe('count:changed', (event) => {
 *   console.log('Count:', event.data)
 * })
 *
 * // Emit events
 * store.emit('count:changed', { count: 1 })
 *
 * // Update state
 * store.setState(state => ({ count: state.count + 1 }))
 * ```
 */
declare class Store<TState = unknown> {
    private state;
    private subscribers;
    private globalSubscribers;
    constructor(initialState: TState);
    /**
     * Get current state (readonly)
     *
     * @returns Current state
     */
    getState(): Readonly<TState>;
    /**
     * Update state
     *
     * @param updater - Function that receives current state and returns new state
     * @returns New state
     */
    setState(updater: (state: TState) => TState): TState;
    /**
     * Subscribe to a specific event
     *
     * @param eventType - Event type to listen to
     * @param listener - Listener function
     * @returns Unsubscribe function
     */
    subscribe(eventType: string, listener: EventListener): () => void;
    /**
     * Subscribe to all events
     *
     * @param listener - Listener function
     * @returns Unsubscribe function
     */
    subscribeAll(listener: EventListener): () => void;
    /**
     * Emit an event
     *
     * @param eventType - Event type
     * @param data - Event data
     * @param metadata - Optional metadata
     */
    emit<T = unknown>(eventType: string, data: T, metadata?: Record<string, unknown>): void;
    /**
     * Clear all subscribers
     */
    clearSubscribers(): void;
    /**
     * Get subscriber count for an event
     *
     * @param eventType - Event type (omit for total count)
     * @returns Number of subscribers
     */
    getSubscriberCount(eventType?: string): number;
    /**
     * Check if there are any subscribers for an event
     *
     * @param eventType - Event type
     * @returns true if there are subscribers
     */
    hasSubscribers(eventType: string): boolean;
}

/**
 * Dependency Engine - Manage task dependencies for Gantt scheduling
 * @module lib/DependencyEngine
 */

/**
 * Result of dependency resolution
 */
interface DependencyResolutionResult {
    /** Tasks in topological order (dependencies first) */
    orderedTasks: Card[];
    /** Critical path task IDs */
    criticalPath: string[];
    /** Tasks that have circular dependencies */
    circularDependencies: string[][];
    /** Earliest start dates for each task */
    earliestStarts: Map<string, Date>;
}

/**
 * Board state structure
 */
interface BoardState {
    board: Board | null;
    columns: Map<string, Column>;
    cards: Map<string, Card>;
}
/**
 * Specialized store for managing board, columns, and cards
 *
 * @example
 * ```typescript
 * const boardStore = new BoardStore({
 *   board: new Board({ id: 'b1', title: 'Project', columnIds: [] }),
 *   columns: new Map(),
 *   cards: new Map()
 * })
 *
 * // Subscribe to card events
 * boardStore.subscribe('card:created', (event) => {
 *   console.log('New card:', event.data)
 * })
 *
 * // Add a card
 * boardStore.addCard({
 *   id: 'card-1',
 *   title: 'Task 1',
 *   columnId: 'todo',
 *   position: 0
 * })
 * ```
 */
declare class BoardStore extends Store<BoardState> {
    private dependencyEngine;
    constructor(initialState?: Partial<BoardState>);
    /**
     * Set the board
     */
    setBoard(boardData: BoardData): void;
    /**
     * Update the board
     */
    updateBoard(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): void;
    /**
     * Get board
     */
    getBoard(): Board | null;
    /**
     * Add a column
     */
    addColumn(columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>): Column;
    /**
     * Update a column
     */
    updateColumn(columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): void;
    /**
     * Delete a column
     */
    deleteColumn(columnId: string): void;
    /**
     * Get a column by ID
     */
    getColumn(columnId: string): Column | undefined;
    /**
     * Get all columns
     */
    getAllColumns(): Column[];
    /**
     * Add a card
     */
    addCard(cardData: Omit<CardData, 'createdAt' | 'updatedAt'>): Card;
    /**
     * Update a card
     */
    updateCard(cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): void;
    /**
     * Delete a card
     */
    deleteCard(cardId: string): void;
    /**
     * Move a card to another column
     */
    moveCard(cardId: string, toColumnId: string, newPosition: number): void;
    /**
     * Get a card by ID
     */
    getCard(cardId: string): Card | undefined;
    /**
     * Get all cards
     */
    getAllCards(): Card[];
    /**
     * Get cards by column ID
     */
    getCardsByColumn(columnId: string): Card[];
    /**
     * Add a dependency to a card
     *
     * @param cardId - Card to add dependency to
     * @param dependency - Dependency configuration
     * @throws Error if dependency would create a cycle
     */
    addDependency(cardId: string, dependency: Dependency): void;
    /**
     * Remove a dependency from a card
     *
     * @param cardId - Card to remove dependency from
     * @param dependencyTaskId - ID of task to remove dependency for
     */
    removeDependency(cardId: string, dependencyTaskId: string): void;
    /**
     * Get all dependencies for a card
     *
     * @param cardId - Card ID to get dependencies for
     * @returns Array of cards this card depends on
     */
    getDependencies(cardId: string): Card[];
    /**
     * Get all cards that depend on a given card (successors)
     *
     * @param cardId - Card ID to find dependents for
     * @returns Array of cards that depend on this card
     */
    getDependentCards(cardId: string): Card[];
    /**
     * Validate all dependencies in the board
     *
     * @throws Error if validation fails
     */
    validateDependencies(): void;
    /**
     * Resolve all dependencies and get topological order
     *
     * @returns Dependency resolution result with ordered tasks and critical path
     */
    resolveDependencies(): DependencyResolutionResult;
    /**
     * Get cards in dependency order (dependencies first)
     *
     * @returns Cards sorted in topological order
     */
    getCardsInDependencyOrder(): Card[];
    /**
     * Get critical path task IDs
     *
     * @returns Array of task IDs on the critical path
     */
    getCriticalPath(): string[];
    /**
     * Check if a card is on the critical path
     *
     * @param cardId - Card ID to check
     * @returns true if card is on critical path
     */
    isOnCriticalPath(cardId: string): boolean;
    /**
     * Update card dates based on dependencies (auto-schedule)
     *
     * This recalculates start dates for all cards based on their dependencies
     */
    autoSchedule(): void;
}

/**
 * DragStore - Manages drag and drop state
 * @module store/DragStore
 *
 * Replacement for Jotai dragStateAtom with zero dependencies
 */
/**
 * Drag state interface
 */
interface DragState {
    isDragging: boolean;
    draggedCardId: string | null;
    sourceColumnId: string | null;
    targetColumnId: string | null;
}
/**
 * Drag event types
 */
type DragEvent = 'drag:start' | 'drag:over' | 'drag:end' | 'drag:cancel';
/**
 * Drag event data
 */
interface DragEventData {
    'drag:start': {
        cardId: string;
        sourceColumnId: string;
    };
    'drag:over': {
        cardId: string;
        targetColumnId: string;
    };
    'drag:end': {
        cardId: string;
        sourceColumnId: string;
        targetColumnId: string;
    };
    'drag:cancel': {
        cardId: string;
    };
}
/**
 * Drag event callback
 */
type DragEventCallback<K extends DragEvent> = (data: DragEventData[K]) => void;
/**
 * DragStore - Simple observable store for drag state
 *
 * @example
 * ```typescript
 * const dragStore = new DragStore()
 *
 * // Subscribe to changes
 * const unsubscribe = dragStore.subscribe((state) => {
 *   console.log('Drag state changed:', state)
 * })
 *
 * // Start dragging
 * dragStore.startDrag('card-1', 'col-1')
 *
 * // Update target
 * dragStore.updateTarget('col-2')
 *
 * // End drag
 * dragStore.endDrag()
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
declare class DragStore {
    private state;
    private listeners;
    private eventListeners;
    /**
     * Get current drag state
     */
    getState(): DragState;
    /**
     * Check if currently dragging
     */
    isDragging(): boolean;
    /**
     * Get dragged card ID
     */
    getDraggedCardId(): string | null;
    /**
     * Get source column ID
     */
    getSourceColumnId(): string | null;
    /**
     * Get target column ID
     */
    getTargetColumnId(): string | null;
    /**
     * Start dragging a card
     *
     * @param cardId - Card being dragged
     * @param sourceColumnId - Source column
     */
    startDrag(cardId: string, sourceColumnId: string): void;
    /**
     * Update drag target column
     *
     * @param targetColumnId - Target column
     */
    updateTarget(targetColumnId: string): void;
    /**
     * End drag operation
     */
    endDrag(): void;
    /**
     * Cancel drag operation
     */
    cancelDrag(): void;
    /**
     * Reset drag state
     */
    reset(): void;
    /**
     * Set entire drag state at once
     * (For compatibility with existing code)
     *
     * @param state - New drag state
     */
    setState(state: DragState): void;
    /**
     * Subscribe to state changes
     *
     * @param callback - Called when state changes
     * @returns Unsubscribe function
     */
    subscribe(callback: (state: DragState) => void): () => void;
    /**
     * Subscribe to drag events
     *
     * @param event - Event type
     * @param callback - Event callback
     * @returns Unsubscribe function
     */
    on<K extends DragEvent>(event: K, callback: DragEventCallback<K>): () => void;
    /**
     * Emit drag event
     */
    private emit;
    /**
     * Notify all subscribers
     */
    private notify;
    /**
     * Clear all listeners (cleanup)
     */
    destroy(): void;
}
/**
 * Global drag store instance
 * Used to replace Jotai atom while maintaining same API
 */
declare const dragStore: DragStore;

/**
 * SelectionStore - Manages card selection state
 * @module store/SelectionStore
 *
 * Replacement for Jotai selectionStateAtom with zero dependencies
 */
/**
 * Selection state interface
 */
interface SelectionState {
    selectedCardIds: string[];
    lastSelectedCardId: string | null;
}
/**
 * Selection event types
 */
type SelectionEvent = 'selection:changed' | 'selection:cleared' | 'selection:card-added' | 'selection:card-removed';
/**
 * Selection event data
 */
interface SelectionEventData {
    'selection:changed': {
        selectedCardIds: string[];
        lastSelectedCardId: string | null;
    };
    'selection:cleared': {
        previousCount: number;
    };
    'selection:card-added': {
        cardId: string;
    };
    'selection:card-removed': {
        cardId: string;
    };
}
/**
 * Selection event callback
 */
type SelectionEventCallback<K extends SelectionEvent> = (data: SelectionEventData[K]) => void;
/**
 * SelectionStore - Simple observable store for selection state
 *
 * @example
 * ```typescript
 * const selectionStore = new SelectionStore()
 *
 * // Subscribe to changes
 * const unsubscribe = selectionStore.subscribe((state) => {
 *   console.log('Selection changed:', state.selectedCardIds)
 * })
 *
 * // Select cards
 * selectionStore.select('card-1')
 * selectionStore.selectMultiple(['card-1', 'card-2', 'card-3'])
 *
 * // Check selection
 * if (selectionStore.isSelected('card-1')) {
 *   console.log('Card 1 is selected')
 * }
 *
 * // Clear selection
 * selectionStore.clear()
 *
 * // Cleanup
 * unsubscribe()
 * ```
 */
declare class SelectionStore {
    private state;
    private listeners;
    private eventListeners;
    /**
     * Get current selection state
     */
    getState(): SelectionState;
    /**
     * Get selected card IDs
     */
    getSelectedCardIds(): string[];
    /**
     * Get last selected card ID
     */
    getLastSelectedCardId(): string | null;
    /**
     * Get selection count
     */
    getCount(): number;
    /**
     * Check if a card is selected
     *
     * @param cardId - Card ID to check
     */
    isSelected(cardId: string): boolean;
    /**
     * Check if any cards are selected
     */
    hasSelection(): boolean;
    /**
     * Select a single card (replaces current selection)
     *
     * @param cardId - Card to select
     */
    select(cardId: string): void;
    /**
     * Add a card to selection
     *
     * @param cardId - Card to add
     */
    add(cardId: string): void;
    /**
     * Remove a card from selection
     *
     * @param cardId - Card to remove
     */
    remove(cardId: string): void;
    /**
     * Toggle card selection
     *
     * @param cardId - Card to toggle
     */
    toggle(cardId: string): void;
    /**
     * Select multiple cards (replaces current selection)
     *
     * @param cardIds - Cards to select
     */
    selectMultiple(cardIds: string[]): void;
    /**
     * Add multiple cards to selection
     *
     * @param cardIds - Cards to add
     */
    addMultiple(cardIds: string[]): void;
    /**
     * Clear all selections
     */
    clear(): void;
    /**
     * Set entire selection state at once
     * (For compatibility with existing code)
     *
     * @param state - New selection state
     */
    setState(state: SelectionState): void;
    /**
     * Subscribe to state changes
     *
     * @param callback - Called when state changes
     * @returns Unsubscribe function
     */
    subscribe(callback: (state: SelectionState) => void): () => void;
    /**
     * Subscribe to selection events
     *
     * @param event - Event type
     * @param callback - Event callback
     * @returns Unsubscribe function
     */
    on<K extends SelectionEvent>(event: K, callback: SelectionEventCallback<K>): () => void;
    /**
     * Emit selection event
     */
    private emit;
    /**
     * Notify all subscribers
     */
    private notify;
    /**
     * Clear all listeners (cleanup)
     */
    destroy(): void;
}
/**
 * Global selection store instance
 * Used to replace Jotai atom while maintaining same API
 */
declare const selectionStore: SelectionStore;

/**
 * ViewAdapter - Universal interface for different board views
 * @module views/ViewAdapter
 *
 * This interface allows different visualizations (Kanban, Gantt, TodoList, Table)
 * to work with the same underlying data and runtime.
 */

/**
 * Serialized board data structure for views
 * Contains the full state needed to render a board
 */
interface ViewBoardData {
    board: BoardData | null;
    columns: ColumnData[];
    cards: CardData[];
}
/**
 * View lifecycle events
 */
type ViewEvent = 'view:mounted' | 'view:unmounted' | 'view:updated' | 'view:error' | 'view:ready';
/**
 * View event callback data
 */
interface ViewEventData {
    'view:mounted': {
        viewId: string;
        timestamp: number;
    };
    'view:unmounted': {
        viewId: string;
        timestamp: number;
    };
    'view:updated': {
        viewId: string;
        data: ViewBoardData;
    };
    'view:error': {
        viewId: string;
        error: Error;
    };
    'view:ready': {
        viewId: string;
        renderTime: number;
    };
}
/**
 * View event callback
 */
type ViewEventCallback<K extends ViewEvent> = (data: ViewEventData[K]) => void;
/**
 * View configuration options
 */
interface ViewOptions {
    /**
     * Enable animations
     * @default true
     */
    animations?: boolean;
    /**
     * Enable virtual scrolling
     * @default false
     */
    virtualScrolling?: boolean;
    /**
     * Theme
     * @default 'dark'
     */
    theme?: 'dark' | 'light' | 'neutral';
    /**
     * Readonly mode (no interactions)
     * @default false
     */
    readonly?: boolean;
    /**
     * Custom CSS classes
     */
    className?: string;
    /**
     * Custom inline styles
     */
    style?: Record<string, string>;
    /**
     * View-specific options
     */
    [key: string]: any;
}
/**
 * Export format for views
 */
type ExportFormat = 'json' | 'csv' | 'pdf' | 'png' | 'svg';
/**
 * ViewAdapter interface
 *
 * All views (Kanban, Gantt, TodoList, Table) must implement this interface
 * to work with the Asakaa runtime.
 *
 * @example
 * ```typescript
 * export class KanbanView implements ViewAdapter<BoardData> {
 *   readonly id = 'kanban'
 *   readonly name = 'Kanban Board'
 *   readonly version = '1.0.0'
 *
 *   mount(container: HTMLElement, data: BoardData): void {
 *     // Render kanban board
 *   }
 *
 *   unmount(): void {
 *     // Cleanup
 *   }
 *
 *   update(data: BoardData): void {
 *     // Update view with new data
 *   }
 * }
 * ```
 */
interface ViewAdapter<TData = ViewBoardData> {
    /**
     * Unique identifier for this view
     * @example 'kanban', 'gantt', 'todolist', 'table'
     */
    readonly id: string;
    /**
     * Human-readable name
     * @example 'Kanban Board', 'Gantt Chart'
     */
    readonly name: string;
    /**
     * View version (semantic versioning)
     * @example '1.0.0'
     */
    readonly version?: string;
    /**
     * View description
     */
    readonly description?: string;
    /**
     * View icon (emoji or icon name)
     * @example '📋', 'kanban-icon'
     */
    readonly icon?: string;
    /**
     * Supported export formats
     * @default ['json']
     */
    readonly supportedExports?: ExportFormat[];
    /**
     * Mount the view to a container
     *
     * Called when the view is first activated or when switching views.
     *
     * @param container - DOM element to render into
     * @param data - Initial data to display
     */
    mount(container: HTMLElement, data: TData): void;
    /**
     * Unmount the view and cleanup
     *
     * Called when switching to another view or when destroying the runtime.
     * Should cleanup event listeners, timers, and remove DOM elements.
     */
    unmount(): void;
    /**
     * Update the view with new data
     *
     * Called when the underlying data changes (card moved, updated, etc).
     * Should efficiently update only what changed.
     *
     * @param data - New data to display
     */
    update(data: TData): void;
    /**
     * Subscribe to view events
     *
     * @param event - Event name
     * @param callback - Event callback
     * @returns Unsubscribe function
     */
    on<K extends ViewEvent>(event: K, callback: ViewEventCallback<K>): () => void;
    /**
     * Emit a view event
     *
     * @param event - Event name
     * @param data - Event data
     */
    emit<K extends ViewEvent>(event: K, data: ViewEventData[K]): void;
    /**
     * Configure the view
     *
     * @param options - View options
     */
    configure(options: ViewOptions): void;
    /**
     * Get current configuration
     *
     * @returns Current view options
     */
    getConfig(): ViewOptions;
    /**
     * Export view to specific format
     *
     * @param format - Export format
     * @returns Exported data as string or Blob
     */
    export?(format: ExportFormat): Promise<string | Blob>;
    /**
     * Import data into view
     *
     * @param data - Data to import
     * @param format - Data format
     * @returns Imported data
     */
    import?(data: string | Blob, format: ExportFormat): Promise<TData>;
    /**
     * Destroy the view and free resources
     *
     * Optional method for complex cleanup (WebGL contexts, Workers, etc)
     */
    destroy?(): void;
    /**
     * Resize handler
     *
     * Called when container size changes
     */
    onResize?(width: number, height: number): void;
    /**
     * Focus handler
     *
     * Called when view gains focus
     */
    onFocus?(): void;
    /**
     * Blur handler
     *
     * Called when view loses focus
     */
    onBlur?(): void;
    /**
     * Custom render method
     *
     * For framework-specific rendering (React, Vue, Svelte)
     */
    render?(): any;
}
/**
 * Base ViewAdapter implementation
 *
 * Provides default implementations for common functionality.
 * Views can extend this class instead of implementing ViewAdapter from scratch.
 *
 * @example
 * ```typescript
 * export class MyCustomView extends BaseViewAdapter<BoardData> {
 *   readonly id = 'my-view'
 *   readonly name = 'My Custom View'
 *
 *   mount(container, data) {
 *     super.mount(container, data)
 *     // Your render logic
 *   }
 * }
 * ```
 */
declare abstract class BaseViewAdapter<TData = ViewBoardData> implements ViewAdapter<TData> {
    abstract readonly id: string;
    abstract readonly name: string;
    readonly version = "1.0.0";
    readonly description = "";
    readonly icon = "";
    readonly supportedExports: ExportFormat[];
    protected container: HTMLElement | null;
    protected data: TData | null;
    protected options: ViewOptions;
    private listeners;
    mount(container: HTMLElement, data: TData): void;
    unmount(): void;
    update(data: TData): void;
    on<K extends ViewEvent>(event: K, callback: ViewEventCallback<K>): () => void;
    emit<K extends ViewEvent>(event: K, data: ViewEventData[K]): void;
    configure(options: ViewOptions): void;
    getConfig(): ViewOptions;
    /**
     * Check if view is mounted
     */
    protected isMounted(): boolean;
    /**
     * Get container dimensions
     */
    protected getContainerSize(): {
        width: number;
        height: number;
    };
    /**
     * Apply theme classes to container
     */
    protected applyTheme(): void;
    /**
     * Cleanup theme classes
     */
    protected cleanupTheme(): void;
}

/**
 * ViewRegistry - Manages view registration and switching
 * @module views/ViewRegistry
 */

/**
 * View registry events
 */
type ViewRegistryEvent = 'view:registered' | 'view:unregistered' | 'view:switched' | 'view:error';
/**
 * View registry event data
 */
interface ViewRegistryEventData {
    'view:registered': {
        viewId: string;
        view: ViewAdapter;
    };
    'view:unregistered': {
        viewId: string;
    };
    'view:switched': {
        fromViewId: string | null;
        toViewId: string;
        timestamp: number;
    };
    'view:error': {
        viewId: string;
        error: Error;
    };
}
/**
 * View registry event callback
 */
type ViewRegistryEventCallback<K extends ViewRegistryEvent> = (data: ViewRegistryEventData[K]) => void;
/**
 * View metadata
 */
interface ViewMetadata {
    id: string;
    name: string;
    version?: string;
    description?: string;
    icon?: string;
    supportedExports?: string[];
    registeredAt: number;
    timesActivated: number;
    lastActivatedAt: number | null;
}
/**
 * ViewRegistry
 *
 * Manages registration, activation, and switching of views.
 *
 * @example
 * ```typescript
 * const registry = new ViewRegistry()
 *
 * // Register views
 * registry.register(new KanbanView())
 * registry.register(new GanttView())
 *
 * // Switch between views
 * await registry.activate('kanban', container, data)
 * await registry.switchTo('gantt') // Smooth transition
 *
 * // Query views
 * const views = registry.listViews()
 * const current = registry.getCurrentView()
 * ```
 */
declare class ViewRegistry {
    private views;
    private metadata;
    private currentView;
    private currentViewId;
    private container;
    private currentData;
    private listeners;
    /**
     * Register a new view
     *
     * @param view - View to register
     * @throws Error if view with same ID already registered
     */
    register(view: ViewAdapter): void;
    /**
     * Unregister a view
     *
     * @param viewId - View ID to unregister
     * @throws Error if trying to unregister active view
     */
    unregister(viewId: string): void;
    /**
     * Check if a view is registered
     */
    hasView(viewId: string): boolean;
    /**
     * Get a registered view
     */
    getView(viewId: string): ViewAdapter | undefined;
    /**
     * List all registered views
     */
    listViews(): ViewMetadata[];
    /**
     * Get view metadata
     */
    getMetadata(viewId: string): ViewMetadata | undefined;
    /**
     * Activate a view
     *
     * Mounts the view to the container with the provided data.
     *
     * @param viewId - View ID to activate
     * @param container - Container element
     * @param data - Initial data
     * @param options - View options
     * @throws Error if view not found
     */
    activate(viewId: string, container: HTMLElement, data: ViewBoardData, options?: ViewOptions): Promise<void>;
    /**
     * Switch to another view
     *
     * Convenience method that unmounts current view and mounts new one.
     * Uses the same container and data as current view.
     *
     * @param viewId - View ID to switch to
     * @param options - Optional view options
     * @throws Error if no view is currently active or if target view not found
     */
    switchTo(viewId: string, options?: ViewOptions): Promise<void>;
    /**
     * Update current view with new data
     *
     * @param data - New data
     * @throws Error if no view is active
     */
    update(data: ViewBoardData): void;
    /**
     * Deactivate current view
     */
    deactivate(): void;
    /**
     * Get current active view
     */
    getCurrentView(): ViewAdapter | null;
    /**
     * Get current view ID
     */
    getCurrentViewId(): string | null;
    /**
     * Check if a specific view is active
     */
    isActive(viewId: string): boolean;
    /**
     * Get current container
     */
    getContainer(): HTMLElement | null;
    /**
     * Get current data
     */
    getCurrentData(): ViewBoardData | null;
    /**
     * Configure current view
     *
     * @param options - View options
     * @throws Error if no view is active
     */
    configure(options: ViewOptions): void;
    /**
     * Get current view configuration
     *
     * @throws Error if no view is active
     */
    getConfig(): ViewOptions;
    /**
     * Subscribe to registry events
     */
    on<K extends ViewRegistryEvent>(event: K, callback: ViewRegistryEventCallback<K>): () => void;
    /**
     * Emit a registry event
     */
    private emit;
    /**
     * Get statistics about views
     */
    getStats(): {
        totalViews: number;
        activeViewId: string | null;
        mostActivatedView: ViewMetadata | null;
        averageActivations: number;
    };
    /**
     * Clear all listeners
     */
    clearListeners(): void;
    /**
     * Destroy registry and cleanup
     */
    destroy(): void;
}

/**
 * Plugin System for AsakaaRuntime
 * @module runtime/Plugin
 */

/**
 * Plugin context - API available to plugins
 */
interface PluginContext {
    /**
     * Get runtime instance
     */
    getRuntime(): AsakaaRuntime;
    /**
     * Get current board state
     */
    getState(): BoardState;
    /**
     * Subscribe to state changes
     *
     * @param callback - State change callback
     * @returns Unsubscribe function
     */
    onStateChange(callback: (state: BoardState) => void): () => void;
    /**
     * Subscribe to view changes
     *
     * @param callback - View change callback
     * @returns Unsubscribe function
     */
    onViewChange(callback: (viewId: string) => void): () => void;
    /**
     * Store plugin-specific data
     *
     * @param key - Data key
     * @param value - Data value
     */
    setData(key: string, value: any): void;
    /**
     * Get plugin-specific data
     *
     * @param key - Data key
     * @returns Stored value
     */
    getData(key: string): any;
    /**
     * Remove all event listeners added by this plugin
     */
    removeAllListeners(): void;
    /**
     * Log message (only in dev mode)
     */
    log(...args: any[]): void;
}
/**
 * Plugin interface
 *
 * Plugins can extend Asakaa functionality without modifying core code.
 *
 * @example
 * ```typescript
 * export const autoSavePlugin: Plugin = {
 *   id: 'auto-save',
 *   name: 'Auto Save',
 *   version: '1.0.0',
 *
 *   install(context) {
 *     context.onStateChange((state) => {
 *       localStorage.setItem('board', JSON.stringify(state))
 *     })
 *     context.log('Auto-save plugin installed')
 *   },
 *
 *   uninstall(context) {
 *     context.removeAllListeners()
 *     context.log('Auto-save plugin uninstalled')
 *   }
 * }
 * ```
 */
interface Plugin {
    /**
     * Unique plugin identifier
     */
    readonly id: string;
    /**
     * Human-readable name
     */
    readonly name: string;
    /**
     * Plugin version (semantic versioning)
     */
    readonly version: string;
    /**
     * Plugin description
     */
    readonly description?: string;
    /**
     * Plugin author
     */
    readonly author?: string;
    /**
     * Plugin homepage URL
     */
    readonly homepage?: string;
    /**
     * Install the plugin
     *
     * Called when plugin is first installed.
     * Setup event listeners, initialize state, etc.
     *
     * @param context - Plugin context
     */
    install(context: PluginContext): void | Promise<void>;
    /**
     * Uninstall the plugin
     *
     * Called when plugin is removed.
     * Cleanup event listeners, remove state, etc.
     *
     * @param context - Plugin context
     */
    uninstall(context: PluginContext): void | Promise<void>;
    /**
     * Plugin configuration options
     */
    config?: Record<string, any>;
    /**
     * Enable plugin
     *
     * Optional method called when plugin is enabled after being disabled
     */
    enable?(context: PluginContext): void;
    /**
     * Disable plugin
     *
     * Optional method called when plugin is temporarily disabled
     */
    disable?(context: PluginContext): void;
}
/**
 * Plugin metadata
 */
interface PluginMetadata {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    installedAt: number;
    enabled: boolean;
}
/**
 * PluginRegistry
 *
 * Manages plugin installation, uninstallation, and lifecycle.
 */
declare class PluginRegistry {
    private plugins;
    private metadata;
    private contexts;
    private runtime;
    constructor(runtime: AsakaaRuntime);
    /**
     * Install a plugin
     *
     * @param plugin - Plugin to install
     * @throws Error if plugin with same ID already installed
     */
    install(plugin: Plugin): Promise<void>;
    /**
     * Uninstall a plugin
     *
     * @param pluginId - Plugin ID to uninstall
     */
    uninstall(pluginId: string): Promise<void>;
    /**
     * Enable a plugin
     *
     * @param pluginId - Plugin ID to enable
     */
    enable(pluginId: string): Promise<void>;
    /**
     * Disable a plugin
     *
     * @param pluginId - Plugin ID to disable
     */
    disable(pluginId: string): Promise<void>;
    /**
     * Check if a plugin is installed
     */
    hasPlugin(pluginId: string): boolean;
    /**
     * Get a plugin
     */
    getPlugin(pluginId: string): Plugin | undefined;
    /**
     * List all installed plugins
     */
    listPlugins(): PluginMetadata[];
    /**
     * Get plugin metadata
     */
    getMetadata(pluginId: string): PluginMetadata | undefined;
    /**
     * Destroy registry and uninstall all plugins
     */
    destroy(): Promise<void>;
    /**
     * Create plugin context
     */
    private createContext;
}

/**
 * Runtime configuration
 */
interface RuntimeConfig {
    /**
     * Initial board data
     */
    initialData?: {
        board?: BoardData;
        columns?: ColumnData[];
        cards?: CardData[];
    };
    /**
     * Enable development mode
     * @default false
     */
    devMode?: boolean;
    /**
     * Enable performance monitoring
     * @default false
     */
    enablePerfMonitoring?: boolean;
    /**
     * Default view to activate
     * @default 'kanban'
     */
    defaultView?: string;
    /**
     * Auto-save configuration
     */
    autoSave?: {
        enabled: boolean;
        interval: number;
        storage?: 'localStorage' | 'sessionStorage' | 'custom';
        key?: string;
    };
}
/**
 * Runtime events
 */
type RuntimeEvent = 'runtime:initialized' | 'runtime:destroyed' | 'runtime:error' | 'state:changed' | 'view:changed' | 'plugin:installed' | 'plugin:uninstalled';
/**
 * Runtime event data
 */
interface RuntimeEventData {
    'runtime:initialized': {
        timestamp: number;
        config: RuntimeConfig;
    };
    'runtime:destroyed': {
        timestamp: number;
    };
    'runtime:error': {
        error: Error;
        context?: string;
    };
    'state:changed': {
        state: BoardState;
    };
    'view:changed': {
        viewId: string;
        timestamp: number;
    };
    'plugin:installed': {
        pluginId: string;
    };
    'plugin:uninstalled': {
        pluginId: string;
    };
}
/**
 * Runtime event callback
 */
type RuntimeEventCallback<K extends RuntimeEvent> = (data: RuntimeEventData[K]) => void;
/**
 * Serialization format
 */
type SerializationFormat = 'json' | 'binary' | 'msgpack';
/**
 * Serialized board data structure
 */
interface SerializedBoardData {
    board: BoardData | null;
    columns: ColumnData[];
    cards: CardData[];
}
/**
 * AsakaaRuntime
 *
 * The universal runtime that orchestrates all Asakaa functionality.
 * This is the main entry point for using Asakaa in any framework.
 *
 * @example
 * ```typescript
 * // Create runtime
 * const runtime = new AsakaaRuntime({
 *   initialData: { board, columns, cards },
 *   defaultView: 'kanban'
 * })
 *
 * // Register views
 * runtime.registerView(new KanbanView())
 * runtime.registerView(new GanttView())
 *
 * // Activate a view
 * await runtime.activateView('kanban', container)
 *
 * // Switch views
 * await runtime.switchView('gantt')
 *
 * // Listen to state changes
 * runtime.on('state:changed', ({ state }) => {
 *   console.log('State updated:', state)
 * })
 * ```
 */
declare class AsakaaRuntime {
    private store;
    private viewRegistry;
    private pluginRegistry;
    private config;
    private listeners;
    private autoSaveInterval;
    private isDestroyed;
    private perfMarks;
    constructor(config?: RuntimeConfig);
    private initializeStore;
    /**
     * Get the BoardStore instance
     */
    getStore(): BoardStore;
    /**
     * Get current board state
     */
    getState(): BoardState;
    /**
     * Subscribe to state changes
     *
     * @param callback - State change callback
     * @returns Unsubscribe function
     */
    onStateChange(callback: (state: BoardState) => void): () => void;
    /**
     * Register a view
     *
     * @param view - View to register
     */
    registerView(view: ViewAdapter): void;
    /**
     * Unregister a view
     *
     * @param viewId - View ID to unregister
     */
    unregisterView(viewId: string): void;
    /**
     * Activate a view
     *
     * @param viewId - View ID to activate
     * @param container - Container element
     * @param options - View options
     */
    activateView(viewId: string, container: HTMLElement, options?: ViewOptions): Promise<void>;
    /**
     * Switch to another view
     *
     * @param viewId - View ID to switch to
     * @param options - View options
     */
    switchView(viewId: string, options?: ViewOptions): Promise<void>;
    /**
     * Get current view ID
     */
    getCurrentViewId(): string | null;
    /**
     * List all registered views
     */
    listViews(): ViewMetadata[];
    /**
     * Update current view with latest data
     */
    updateView(): void;
    /**
     * Serialize runtime state to SerializedBoardData format for views
     */
    private serializeForView;
    /**
     * Export runtime state
     *
     * @param format - Serialization format
     * @returns Serialized data
     */
    serialize(format?: SerializationFormat): Promise<string>;
    /**
     * Import data into runtime
     *
     * @param data - Data to import
     * @param format - Data format
     */
    deserialize(data: string, format?: SerializationFormat): Promise<void>;
    private setupAutoSave;
    /**
     * Load data from auto-save storage
     */
    loadFromAutoSave(): Promise<boolean>;
    /**
     * Clear auto-save storage
     */
    clearAutoSave(): void;
    /**
     * Install a plugin
     *
     * @param plugin - Plugin to install
     */
    installPlugin(plugin: Plugin): Promise<void>;
    /**
     * Uninstall a plugin
     *
     * @param pluginId - Plugin ID to uninstall
     */
    uninstallPlugin(pluginId: string): Promise<void>;
    /**
     * Enable a plugin
     *
     * @param pluginId - Plugin ID to enable
     */
    enablePlugin(pluginId: string): Promise<void>;
    /**
     * Disable a plugin
     *
     * @param pluginId - Plugin ID to disable
     */
    disablePlugin(pluginId: string): Promise<void>;
    /**
     * List all installed plugins
     */
    listPlugins(): PluginMetadata[];
    /**
     * Get plugin by ID
     */
    getPlugin(pluginId: string): Plugin | undefined;
    /**
     * Subscribe to runtime events
     */
    on<K extends RuntimeEvent>(event: K, callback: RuntimeEventCallback<K>): () => void;
    /**
     * Emit a runtime event
     */
    private emit;
    private perfMark;
    private perfMeasure;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        currentView: string | null;
        stateSize: number;
        viewCount: number;
    };
    /**
     * Get runtime configuration
     */
    getConfig(): RuntimeConfig;
    /**
     * Check if runtime is in dev mode
     */
    isDevMode(): boolean;
    /**
     * Check if runtime is destroyed
     */
    isRuntimeDestroyed(): boolean;
    private ensureNotDestroyed;
    /**
     * Destroy the runtime and cleanup resources
     */
    destroy(): void;
}

/**
 * Serializer - Unified serialization interface
 * @module serialization/Serializer
 *
 * Provides a consistent API for serializing and deserializing board data
 * across multiple formats (JSON, Binary, MessagePack, etc.)
 */

/**
 * Serialized data structure
 */
interface SerializedData {
    version: string;
    timestamp: number;
    board: BoardData | null;
    columns: ColumnData[];
    cards: CardData[];
    metadata?: Record<string, unknown>;
}
/**
 * Serialization options
 */
interface SerializationOptions {
    /**
     * Include metadata in serialization
     * @default true
     */
    includeMetadata?: boolean;
    /**
     * Compress data (for binary formats)
     * @default false
     */
    compress?: boolean;
    /**
     * Pretty-print JSON
     * @default false
     */
    prettyPrint?: boolean;
    /**
     * Include timestamps
     * @default true
     */
    includeTimestamp?: boolean;
}
/**
 * Serializer interface
 *
 * All serializers must implement this interface
 */
interface Serializer<TOutput = string | Uint8Array> {
    /**
     * Serialize data
     *
     * @param data - Data to serialize
     * @param options - Serialization options
     * @returns Serialized output
     */
    serialize(data: SerializedData, options?: SerializationOptions): Promise<TOutput>;
    /**
     * Deserialize data
     *
     * @param input - Serialized input
     * @param options - Deserialization options
     * @returns Deserialized data
     */
    deserialize(input: TOutput, options?: SerializationOptions): Promise<SerializedData>;
    /**
     * Get MIME type for this format
     */
    getMimeType(): string;
    /**
     * Get file extension for this format
     */
    getFileExtension(): string;
}
/**
 * Base serializer with common functionality
 */
declare abstract class BaseSerializer<TOutput = string | Uint8Array> implements Serializer<TOutput> {
    protected version: string;
    abstract serialize(data: SerializedData, options?: SerializationOptions): Promise<TOutput>;
    abstract deserialize(input: TOutput, options?: SerializationOptions): Promise<SerializedData>;
    abstract getMimeType(): string;
    abstract getFileExtension(): string;
    /**
     * Create serialized data structure
     */
    protected createSerializedData(board: BoardData | null, columns: ColumnData[], cards: CardData[], options?: SerializationOptions): SerializedData;
    /**
     * Validate serialized data structure
     */
    protected validateSerializedData(data: any): asserts data is SerializedData;
}

/**
 * JSONSerializer - JSON serialization implementation
 * @module serialization/JSONSerializer
 */

/**
 * JSON Serializer
 *
 * Serializes board data to/from JSON format.
 * This is the most common and human-readable format.
 *
 * @example
 * ```typescript
 * const serializer = new JSONSerializer()
 *
 * const json = await serializer.serialize({
 *   version: '0.7.0',
 *   timestamp: Date.now(),
 *   board: { id: 'b1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * const data = await serializer.deserialize(json)
 * ```
 */
declare class JSONSerializer extends BaseSerializer<string> {
    /**
     * Serialize data to JSON string
     */
    serialize(data: SerializedData, options?: SerializationOptions): Promise<string>;
    /**
     * Deserialize JSON string to data
     */
    deserialize(input: string, _options?: SerializationOptions): Promise<SerializedData>;
    /**
     * Get MIME type
     */
    getMimeType(): string;
    /**
     * Get file extension
     */
    getFileExtension(): string;
    /**
     * JSON replacer for special types
     */
    private replacer;
    /**
     * JSON reviver for special types
     */
    private reviver;
}
/**
 * Create a JSON serializer instance
 */
declare function createJSONSerializer(): JSONSerializer;

/**
 * BinarySerializer - Binary serialization implementation
 * @module serialization/BinarySerializer
 *
 * Uses JSON as intermediate format, then converts to Uint8Array.
 * Future enhancement: Use Protocol Buffers or custom binary format.
 */

/**
 * Binary Serializer
 *
 * Serializes board data to/from binary format (Uint8Array).
 * Currently uses JSON as intermediate format with UTF-8 encoding.
 *
 * @example
 * ```typescript
 * const serializer = new BinarySerializer()
 *
 * const binary = await serializer.serialize({
 *   version: '0.7.0',
 *   timestamp: Date.now(),
 *   board: { id: 'b1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * const data = await serializer.deserialize(binary)
 * ```
 */
declare class BinarySerializer extends BaseSerializer<Uint8Array> {
    private textEncoder;
    private textDecoder;
    /**
     * Serialize data to binary format
     */
    serialize(data: SerializedData, _options?: SerializationOptions): Promise<Uint8Array>;
    /**
     * Deserialize binary format to data
     */
    deserialize(input: Uint8Array, _options?: SerializationOptions): Promise<SerializedData>;
    /**
     * Get MIME type
     */
    getMimeType(): string;
    /**
     * Get file extension
     */
    getFileExtension(): string;
}
/**
 * Create a binary serializer instance
 */
declare function createBinarySerializer(): BinarySerializer;

/**
 * SerializerRegistry - Central registry for all serializers
 * @module serialization/SerializerRegistry
 */

/**
 * Serializer format types
 */
type SerializerFormat = 'json' | 'binary' | 'msgpack';
/**
 * Serializer Registry
 *
 * Manages all available serializers and provides a unified API.
 *
 * @example
 * ```typescript
 * const registry = new SerializerRegistry()
 *
 * // Serialize to JSON
 * const json = await registry.serialize('json', data)
 *
 * // Deserialize from binary
 * const data = await registry.deserialize('binary', binaryData)
 *
 * // Get supported formats
 * const formats = registry.getSupportedFormats() // ['json', 'binary']
 * ```
 */
declare class SerializerRegistry {
    private serializers;
    constructor();
    /**
     * Register a serializer
     *
     * @param format - Format identifier
     * @param serializer - Serializer instance
     */
    register<T>(format: SerializerFormat, serializer: Serializer<T>): void;
    /**
     * Unregister a serializer
     *
     * @param format - Format identifier
     */
    unregister(format: SerializerFormat): void;
    /**
     * Get a serializer by format
     *
     * @param format - Format identifier
     * @returns Serializer instance
     * @throws Error if format not found
     */
    getSerializer<T = string | Uint8Array>(format: SerializerFormat): Serializer<T>;
    /**
     * Check if a format is supported
     *
     * @param format - Format to check
     */
    isSupported(format: SerializerFormat): boolean;
    /**
     * Get all supported formats
     */
    getSupportedFormats(): SerializerFormat[];
    /**
     * Serialize data using specified format
     *
     * @param format - Serialization format
     * @param data - Data to serialize
     * @param options - Serialization options
     * @returns Serialized output
     */
    serialize<T = string | Uint8Array>(format: SerializerFormat, data: SerializedData, options?: SerializationOptions): Promise<T>;
    /**
     * Deserialize data using specified format
     *
     * @param format - Serialization format
     * @param input - Serialized input
     * @param options - Deserialization options
     * @returns Deserialized data
     */
    deserialize<T = string | Uint8Array>(format: SerializerFormat, input: T, options?: SerializationOptions): Promise<SerializedData>;
    /**
     * Get MIME type for a format
     *
     * @param format - Format identifier
     * @returns MIME type string
     */
    getMimeType(format: SerializerFormat): string;
    /**
     * Get file extension for a format
     *
     * @param format - Format identifier
     * @returns File extension (e.g., '.json')
     */
    getFileExtension(format: SerializerFormat): string;
}
/**
 * Global serializer registry instance
 */
declare const serializerRegistry: SerializerRegistry;

/**
 * Vanilla JS Board Controller
 * @module adapters/vanilla
 *
 * Framework-agnostic controller for managing board state with DOM manipulation.
 * Can be used with vanilla JavaScript, jQuery, or any framework that doesn't have
 * a reactive state system.
 *
 * @example
 * ```typescript
 * const controller = new BoardController(document.getElementById('board'))
 *
 * controller.initialize({
 *   board: { id: 'board-1', title: 'My Board', columnIds: [] },
 *   columns: [],
 *   cards: []
 * })
 *
 * controller.on('card:created', (card) => {
 *   console.log('New card:', card)
 * })
 *
 * controller.addCard({
 *   id: 'card-1',
 *   title: 'New Task',
 *   columnId: 'col-1',
 *   position: 0,
 *   status: 'TODO'
 * })
 * ```
 */

interface BoardControllerOptions {
    /**
     * Root DOM element for the board
     */
    container: HTMLElement;
    /**
     * Initial data
     */
    initialData?: {
        board?: BoardData;
        columns?: ColumnData[];
        cards?: CardData[];
    };
    /**
     * Custom renderers
     */
    renderers?: {
        renderBoard?: (container: HTMLElement, state: BoardState) => void;
        renderColumn?: (container: HTMLElement, column: Column, cards: Card[]) => void;
        renderCard?: (container: HTMLElement, card: Card) => void;
    };
    /**
     * Enable auto-render on state changes
     * @default true
     */
    autoRender?: boolean;
}
type EventHandler = (event: StoreEvent) => void;
/**
 * Vanilla JS Board Controller
 *
 * Provides a simple API for managing board state without a framework.
 * Handles state management via @libxai/core and provides optional DOM rendering.
 */
declare class BoardController {
    private store;
    private container;
    private renderers;
    private autoRender;
    private eventListeners;
    constructor(options: BoardControllerOptions);
    /**
     * Get current board state
     */
    getState(): BoardState;
    /**
     * Get the board
     */
    getBoard(): Board | null;
    /**
     * Get all columns
     */
    getColumns(): Column[];
    /**
     * Get all cards
     */
    getCards(): Card[];
    /**
     * Get cards in a specific column
     */
    getCardsByColumn(columnId: string): Card[];
    /**
     * Update board
     */
    updateBoard(changes: Partial<Omit<BoardData, 'id' | 'createdAt'>>): void;
    /**
     * Add a new column
     */
    addColumn(columnData: Omit<ColumnData, 'createdAt' | 'updatedAt'>): Column;
    /**
     * Update a column
     */
    updateColumn(columnId: string, changes: Partial<Omit<ColumnData, 'id' | 'createdAt'>>): void;
    /**
     * Delete a column
     */
    deleteColumn(columnId: string): void;
    /**
     * Get a column by ID
     */
    getColumn(columnId: string): Column | undefined;
    /**
     * Add a new card
     */
    addCard(cardData: Omit<CardData, 'createdAt' | 'updatedAt'>): Card;
    /**
     * Update a card
     */
    updateCard(cardId: string, changes: Partial<Omit<CardData, 'id' | 'createdAt'>>): void;
    /**
     * Delete a card
     */
    deleteCard(cardId: string): void;
    /**
     * Move a card to a different column
     */
    moveCard(cardId: string, toColumnId: string, newPosition: number): void;
    /**
     * Get a card by ID
     */
    getCard(cardId: string): Card | undefined;
    /**
     * Subscribe to events
     *
     * @param eventType - Event type to listen for (e.g., 'card:created', 'card:updated')
     * @param handler - Event handler function
     * @returns Unsubscribe function
     *
     * @example
     * ```typescript
     * const unsub = controller.on('card:created', (event) => {
     *   console.log('Card created:', event.data)
     * })
     *
     * // Later, unsubscribe
     * unsub()
     * ```
     */
    on(eventType: string, handler: EventHandler): () => void;
    /**
     * Subscribe to all events
     */
    onAll(handler: EventHandler): () => void;
    /**
     * Unsubscribe from an event
     */
    off(eventType: string, handler: EventHandler): void;
    /**
     * Manually trigger a render
     */
    render(): void;
    /**
     * Default render implementation
     */
    private defaultRender;
    /**
     * Render a column element
     */
    private renderColumnElement;
    /**
     * Render a card element
     */
    private renderCardElement;
    /**
     * Handle state changes
     */
    private handleStateChange;
    /**
     * Destroy the controller and cleanup
     */
    destroy(): void;
}

/**
 * Dependency Engine for Gantt Chart
 * Handles task dependencies, critical path analysis, topological sorting, and cycle detection
 * @module gantt/DependencyEngine
 */

/**
 * Enhanced Dependency Engine
 *
 * Features:
 * - Topological sort for task ordering
 * - Cycle detection to prevent circular dependencies
 * - Critical path method (CPM) calculation
 * - Forward and backward pass scheduling
 * - Slack/float calculation
 * - Auto-scheduling with constraints
 */
declare class DependencyEngine {
    private cards;
    private adjacencyList;
    private reverseAdjacencyList;
    /**
     * Initialize engine with card data
     */
    constructor(cards?: CardData[]);
    /**
     * Update cards in the engine
     */
    setCards(cards: CardData[]): void;
    /**
     * Validate dependencies
     * Checks for:
     * - Circular dependencies (cycles)
     * - Invalid task IDs
     * - Self-dependencies
     */
    validateDependencies(): DependencyValidation;
    /**
     * Topological sort using Kahn's algorithm
     * Returns tasks in dependency order (tasks with no dependencies first)
     */
    topologicalSort(): string[];
    /**
     * Calculate scheduled tasks using Critical Path Method (CPM)
     * Performs forward and backward pass to calculate early/late dates and floats
     */
    calculateSchedule(options?: AutoScheduleOptions): Map<string, ScheduledTask>;
    /**
     * Find critical path through the project
     */
    findCriticalPath(): CriticalPath;
    /**
     * Get task duration in days
     */
    private getTaskDuration;
    /**
     * Check if a task can start given its dependencies
     */
    canTaskStart(cardId: string, currentDate?: Date): boolean;
    /**
     * Get all predecessors of a task (tasks it depends on)
     */
    getPredecessors(cardId: string): string[];
    /**
     * Get all successors of a task (tasks that depend on it)
     */
    getSuccessors(cardId: string): string[];
    /**
     * Add a dependency between two tasks
     * @param fromCardId - Task that others depend on
     * @param toCardId - Task that depends on fromCard
     */
    addDependency(fromCardId: string, toCardId: string): boolean;
    /**
     * Remove a dependency between two tasks
     */
    removeDependency(fromCardId: string, toCardId: string): boolean;
    /**
     * Check if there's a path from source to target
     */
    private hasPath;
}

export { type AnyEvent, AsakaaRuntime, type AutoScheduleOptions, type BaseEntity, BaseSerializer, BaseViewAdapter, type Baseline, type BaselineCardSnapshot, BinarySerializer, Board, BoardController, type BoardControllerOptions, type BoardData, type BoardEvent, type BoardSettings, type BoardState, BoardStore, Card, type CardData, type CardEvent, type CardStatus, Column, type ColumnData, type ColumnEvent, type CriticalPath, type Dependency, DependencyEngine, type DependencyType, type DependencyValidation, type DragEvent, type DragEventCallback, type DragEventData, type DragState, DragStore, type EventHandler, type EventListener, type EventType, type ExportFormat, type GanttConfig, type GanttState, JSONSerializer, type Milestone, type Plugin, type PluginContext, type PluginMetadata, PluginRegistry, type Priority, type ResourceAllocation, type ResourceUtilization, type RuntimeConfig, type RuntimeEvent, type RuntimeEventCallback, type RuntimeEventData, type ScheduledTask, type SelectionEvent, type SelectionEventCallback, type SelectionEventData, type SelectionState, SelectionStore, type SerializationFormat, type SerializationOptions, type SerializedBoardData, type SerializedData, type Serializer, type SerializerFormat, SerializerRegistry, Store, type StoreEvent, type TaskConstraint, type TaskConstraintType, type UserData, type ViewAdapter, type ViewBoardData, type ViewEvent, type ViewEventCallback, type ViewEventData, type ViewMetadata, type ViewOptions, ViewRegistry, type ViewRegistryEvent, type ViewRegistryEventCallback, type ViewRegistryEventData, createBinarySerializer, createJSONSerializer, dragStore, selectionStore, serializerRegistry };
