var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/models/Card.ts
var Card;
var init_Card = __esm({
  "src/models/Card.ts"() {
    Card = class _Card {
      constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.position = data.position;
        this.columnId = data.columnId;
        this.priority = data.priority;
        this.status = data.status;
        this.assignedUserIds = data.assignedUserIds ? Object.freeze([...data.assignedUserIds]) : void 0;
        this.labels = data.labels ? Object.freeze([...data.labels]) : void 0;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.dependencies = data.dependencies ? Object.freeze(data.dependencies.map((dep) => Object.freeze({ ...dep }))) : void 0;
        this.estimatedTime = data.estimatedTime;
        this.actualTime = data.actualTime;
        this.progress = data.progress;
        this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : void 0;
        this.createdAt = data.createdAt || /* @__PURE__ */ new Date();
        this.updatedAt = data.updatedAt || /* @__PURE__ */ new Date();
        Object.freeze(this);
      }
      /**
       * Create a new Card instance with updated properties
       *
       * @param changes - Partial card data to update
       * @returns New Card instance with applied changes
       */
      update(changes) {
        return new _Card({
          ...this.toData(),
          ...changes,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * Convert Card instance to plain data object
       *
       * @returns CardData object
       */
      toData() {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          position: this.position,
          columnId: this.columnId,
          priority: this.priority,
          status: this.status,
          assignedUserIds: this.assignedUserIds ? [...this.assignedUserIds] : void 0,
          labels: this.labels ? [...this.labels] : void 0,
          startDate: this.startDate,
          endDate: this.endDate,
          dependencies: this.dependencies ? this.dependencies.map((dep) => ({ ...dep })) : void 0,
          estimatedTime: this.estimatedTime,
          actualTime: this.actualTime,
          progress: this.progress,
          metadata: this.metadata ? { ...this.metadata } : void 0,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
      /**
       * Create a Card from plain data object
       *
       * @param data - CardData object
       * @returns Card instance
       */
      static fromData(data) {
        return new _Card(data);
      }
      /**
       * Check if card is overdue
       *
       * @returns true if card has end date and it's in the past
       */
      isOverdue() {
        if (!this.endDate) return false;
        return new Date(this.endDate) < /* @__PURE__ */ new Date();
      }
      /**
       * Get number of days until due date
       *
       * @returns Number of days until due (positive = future, negative = past), or undefined if no end date
       */
      getDaysUntilDue() {
        if (!this.endDate) return void 0;
        const now = /* @__PURE__ */ new Date();
        const due = new Date(this.endDate);
        const diffMs = due.getTime() - now.getTime();
        return Math.round(diffMs / (1e3 * 60 * 60 * 24));
      }
      /**
       * Check if card is assigned to a specific user
       *
       * @param userId - User ID to check
       * @returns true if user is assigned to this card
       */
      isAssignedTo(userId) {
        return this.assignedUserIds?.includes(userId) ?? false;
      }
      /**
       * Check if card has a specific label
       *
       * @param label - Label to check
       * @returns true if card has the label
       */
      hasLabel(label) {
        return this.labels?.includes(label) ?? false;
      }
      /**
       * Calculate progress based on manual override or actual time vs estimated time
       *
       * @returns Progress percentage (0-100) or undefined if no estimate
       */
      getProgress() {
        if (this.progress !== void 0) {
          return Math.max(0, Math.min(100, this.progress));
        }
        if (!this.estimatedTime || this.estimatedTime === 0) return void 0;
        if (!this.actualTime) return 0;
        const progress = this.actualTime / this.estimatedTime * 100;
        return Math.min(progress, 100);
      }
      /**
       * Get duration in days between start and end date
       *
       * @returns Duration in days, or undefined if dates not set
       */
      getDuration() {
        if (!this.startDate || !this.endDate) return void 0;
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffMs = end.getTime() - start.getTime();
        return Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
      }
      /**
       * Check if this card has any dependencies
       *
       * @returns true if card has dependencies
       */
      hasDependencies() {
        return (this.dependencies?.length ?? 0) > 0;
      }
      /**
       * Get list of task IDs this card depends on
       *
       * @returns Array of dependent task IDs
       */
      getDependentTaskIds() {
        if (!this.dependencies) return [];
        return this.dependencies.map((dep) => dep.taskId);
      }
      /**
       * Check if this card depends on a specific task
       *
       * @param taskId - Task ID to check
       * @returns true if this card depends on the specified task
       */
      dependsOn(taskId) {
        return this.getDependentTaskIds().includes(taskId);
      }
      /**
       * Get dependency relationship with a specific task
       *
       * @param taskId - Task ID to check
       * @returns Dependency object if exists, undefined otherwise
       */
      getDependency(taskId) {
        return this.dependencies?.find((dep) => dep.taskId === taskId);
      }
      /**
       * Add a dependency to this card
       *
       * @param dependency - Dependency to add
       * @returns New Card instance with added dependency
       */
      addDependency(dependency) {
        const existingDeps = this.dependencies ? [...this.dependencies.map((d) => ({ ...d }))] : [];
        if (existingDeps.some((d) => d.taskId === dependency.taskId)) {
          return this;
        }
        return this.update({
          dependencies: [...existingDeps, dependency]
        });
      }
      /**
       * Remove a dependency from this card
       *
       * @param taskId - ID of task to remove dependency for
       * @returns New Card instance with removed dependency
       */
      removeDependency(taskId) {
        if (!this.dependencies) return this;
        const filtered = this.dependencies.filter((dep) => dep.taskId !== taskId).map((d) => ({ ...d }));
        if (filtered.length === this.dependencies.length) {
          return this;
        }
        return this.update({
          dependencies: filtered.length > 0 ? filtered : void 0
        });
      }
      /**
       * Check if dates are valid (start before end)
       *
       * @returns true if dates are valid or not set
       */
      hasValidDates() {
        if (!this.startDate || !this.endDate) return true;
        return new Date(this.startDate) <= new Date(this.endDate);
      }
      /**
       * Check if card is currently in progress (between start and end dates)
       *
       * @returns true if current date is between start and end dates
       */
      isInProgress() {
        if (!this.startDate || !this.endDate) return false;
        const now = /* @__PURE__ */ new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        return now >= start && now <= end;
      }
      /**
       * Check if card hasn't started yet
       *
       * @returns true if start date is in the future
       */
      isNotStarted() {
        if (!this.startDate) return false;
        return new Date(this.startDate) > /* @__PURE__ */ new Date();
      }
      /**
       * Check if card is completed (past end date or 100% progress)
       *
       * @returns true if card is considered completed
       */
      isCompleted() {
        const progress = this.getProgress();
        if (progress !== void 0 && progress >= 100) return true;
        if (this.status === "DONE") return true;
        return this.isOverdue();
      }
    };
  }
});

// src/models/Column.ts
var Column;
var init_Column = __esm({
  "src/models/Column.ts"() {
    Column = class _Column {
      constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.position = data.position;
        this.cardIds = Object.freeze([...data.cardIds]);
        this.wipLimit = data.wipLimit;
        this.wipLimitType = data.wipLimitType;
        this.color = data.color;
        this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : void 0;
        this.createdAt = data.createdAt || /* @__PURE__ */ new Date();
        this.updatedAt = data.updatedAt || /* @__PURE__ */ new Date();
        Object.freeze(this);
      }
      /**
       * Create a new Column instance with updated properties
       *
       * @param changes - Partial column data to update
       * @returns New Column instance with applied changes
       */
      update(changes) {
        return new _Column({
          ...this.toData(),
          ...changes,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * Add a card to the column
       *
       * @param cardId - Card ID to add
       * @param position - Position to insert (default: end)
       * @returns New Column instance with card added
       */
      addCard(cardId, position) {
        const newCardIds = [...this.cardIds];
        const insertPos = position ?? newCardIds.length;
        newCardIds.splice(insertPos, 0, cardId);
        return this.update({ cardIds: newCardIds });
      }
      /**
       * Remove a card from the column
       *
       * @param cardId - Card ID to remove
       * @returns New Column instance with card removed
       */
      removeCard(cardId) {
        const newCardIds = this.cardIds.filter((id) => id !== cardId);
        return this.update({ cardIds: newCardIds });
      }
      /**
       * Move a card within the column
       *
       * @param cardId - Card ID to move
       * @param newPosition - New position
       * @returns New Column instance with card moved
       */
      moveCard(cardId, newPosition) {
        const newCardIds = this.cardIds.filter((id) => id !== cardId);
        newCardIds.splice(newPosition, 0, cardId);
        return this.update({ cardIds: newCardIds });
      }
      /**
       * Check if column has a card
       *
       * @param cardId - Card ID to check
       * @returns true if column contains the card
       */
      hasCard(cardId) {
        return this.cardIds.includes(cardId);
      }
      /**
       * Get card count
       *
       * @returns Number of cards in the column
       */
      getCardCount() {
        return this.cardIds.length;
      }
      /**
       * Check if WIP limit is exceeded
       *
       * @returns true if card count exceeds WIP limit
       */
      isWipLimitExceeded() {
        if (!this.wipLimit) return false;
        return this.cardIds.length > this.wipLimit;
      }
      /**
       * Check if adding a card would exceed WIP limit
       *
       * @returns true if adding a card would exceed hard limit
       */
      canAddCard() {
        if (!this.wipLimit || this.wipLimitType !== "hard") return true;
        return this.cardIds.length < this.wipLimit;
      }
      /**
       * Convert Column instance to plain data object
       *
       * @returns ColumnData object
       */
      toData() {
        return {
          id: this.id,
          title: this.title,
          position: this.position,
          cardIds: [...this.cardIds],
          wipLimit: this.wipLimit,
          wipLimitType: this.wipLimitType,
          color: this.color,
          metadata: this.metadata ? { ...this.metadata } : void 0,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
      /**
       * Create a Column from plain data object
       *
       * @param data - ColumnData object
       * @returns Column instance
       */
      static fromData(data) {
        return new _Column(data);
      }
    };
  }
});

// src/models/Board.ts
var Board;
var init_Board = __esm({
  "src/models/Board.ts"() {
    Board = class _Board {
      constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.columnIds = Object.freeze([...data.columnIds]);
        this.settings = data.settings ? Object.freeze({ ...data.settings }) : void 0;
        this.metadata = data.metadata ? Object.freeze({ ...data.metadata }) : void 0;
        this.createdAt = data.createdAt || /* @__PURE__ */ new Date();
        this.updatedAt = data.updatedAt || /* @__PURE__ */ new Date();
        Object.freeze(this);
      }
      /**
       * Create a new Board instance with updated properties
       *
       * @param changes - Partial board data to update
       * @returns New Board instance with applied changes
       */
      update(changes) {
        return new _Board({
          ...this.toData(),
          ...changes,
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * Add a column to the board
       *
       * @param columnId - Column ID to add
       * @param position - Position to insert (default: end)
       * @returns New Board instance with column added
       */
      addColumn(columnId, position) {
        const newColumnIds = [...this.columnIds];
        const insertPos = position ?? newColumnIds.length;
        newColumnIds.splice(insertPos, 0, columnId);
        return this.update({ columnIds: newColumnIds });
      }
      /**
       * Remove a column from the board
       *
       * @param columnId - Column ID to remove
       * @returns New Board instance with column removed
       */
      removeColumn(columnId) {
        const newColumnIds = this.columnIds.filter((id) => id !== columnId);
        return this.update({ columnIds: newColumnIds });
      }
      /**
       * Reorder columns
       *
       * @param columnIds - New column order
       * @returns New Board instance with columns reordered
       */
      reorderColumns(columnIds) {
        if (columnIds.length !== this.columnIds.length) {
          throw new Error("Column IDs length mismatch");
        }
        const sortedExisting = [...this.columnIds].sort();
        const sortedNew = [...columnIds].sort();
        if (JSON.stringify(sortedExisting) !== JSON.stringify(sortedNew)) {
          throw new Error("Column IDs mismatch");
        }
        return this.update({ columnIds });
      }
      /**
       * Move a column to a new position
       *
       * @param columnId - Column ID to move
       * @param newPosition - New position
       * @returns New Board instance with column moved
       */
      moveColumn(columnId, newPosition) {
        const newColumnIds = this.columnIds.filter((id) => id !== columnId);
        newColumnIds.splice(newPosition, 0, columnId);
        return this.update({ columnIds: newColumnIds });
      }
      /**
       * Check if board has a column
       *
       * @param columnId - Column ID to check
       * @returns true if board contains the column
       */
      hasColumn(columnId) {
        return this.columnIds.includes(columnId);
      }
      /**
       * Get column count
       *
       * @returns Number of columns in the board
       */
      getColumnCount() {
        return this.columnIds.length;
      }
      /**
       * Get column position
       *
       * @param columnId - Column ID
       * @returns Column position or -1 if not found
       */
      getColumnPosition(columnId) {
        return this.columnIds.indexOf(columnId);
      }
      /**
       * Update board settings
       *
       * @param settings - Partial settings to update
       * @returns New Board instance with settings updated
       */
      updateSettings(settings) {
        return this.update({
          settings: {
            ...this.settings,
            ...settings
          }
        });
      }
      /**
       * Convert Board instance to plain data object
       *
       * @returns BoardData object
       */
      toData() {
        return {
          id: this.id,
          title: this.title,
          description: this.description,
          columnIds: [...this.columnIds],
          settings: this.settings ? { ...this.settings } : void 0,
          metadata: this.metadata ? { ...this.metadata } : void 0,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
      /**
       * Create a Board from plain data object
       *
       * @param data - BoardData object
       * @returns Board instance
       */
      static fromData(data) {
        return new _Board(data);
      }
    };
  }
});

// src/models/index.ts
var models_exports = {};
__export(models_exports, {
  Board: () => Board,
  Card: () => Card,
  Column: () => Column
});
var init_models = __esm({
  "src/models/index.ts"() {
    init_Card();
    init_Column();
    init_Board();
  }
});

// src/index.ts
init_models();

// src/store/Store.ts
var Store = class {
  constructor(initialState) {
    this.state = initialState;
    this.subscribers = /* @__PURE__ */ new Map();
    this.globalSubscribers = /* @__PURE__ */ new Set();
  }
  /**
   * Get current state (readonly)
   *
   * @returns Current state
   */
  getState() {
    return this.state;
  }
  /**
   * Update state
   *
   * @param updater - Function that receives current state and returns new state
   * @returns New state
   */
  setState(updater) {
    const prevState = this.state;
    this.state = updater(this.state);
    this.emit("state:changed", {
      prevState,
      nextState: this.state
    });
    return this.state;
  }
  /**
   * Subscribe to a specific event
   *
   * @param eventType - Event type to listen to
   * @param listener - Listener function
   * @returns Unsubscribe function
   */
  subscribe(eventType, listener) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, /* @__PURE__ */ new Set());
    }
    const listeners = this.subscribers.get(eventType);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }
  /**
   * Subscribe to all events
   *
   * @param listener - Listener function
   * @returns Unsubscribe function
   */
  subscribeAll(listener) {
    this.globalSubscribers.add(listener);
    return () => {
      this.globalSubscribers.delete(listener);
    };
  }
  /**
   * Emit an event
   *
   * @param eventType - Event type
   * @param data - Event data
   * @param metadata - Optional metadata
   */
  emit(eventType, data, metadata) {
    const event = {
      type: eventType,
      data,
      timestamp: /* @__PURE__ */ new Date(),
      metadata
    };
    const listeners = this.subscribers.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
    this.globalSubscribers.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in global event listener:`, error);
      }
    });
  }
  /**
   * Clear all subscribers
   */
  clearSubscribers() {
    this.subscribers.clear();
    this.globalSubscribers.clear();
  }
  /**
   * Get subscriber count for an event
   *
   * @param eventType - Event type (omit for total count)
   * @returns Number of subscribers
   */
  getSubscriberCount(eventType) {
    if (eventType) {
      return this.subscribers.get(eventType)?.size ?? 0;
    }
    let total = this.globalSubscribers.size;
    this.subscribers.forEach((listeners) => {
      total += listeners.size;
    });
    return total;
  }
  /**
   * Check if there are any subscribers for an event
   *
   * @param eventType - Event type
   * @returns true if there are subscribers
   */
  hasSubscribers(eventType) {
    return this.getSubscriberCount(eventType) > 0;
  }
};

// src/store/BoardStore.ts
init_models();

// src/lib/DependencyEngine.ts
var DependencyError = class extends Error {
  constructor(message, type, taskIds) {
    super(message);
    this.type = type;
    this.taskIds = taskIds;
    this.name = "DependencyError";
  }
};
var DependencyEngine = class {
  /**
   * Resolve all dependencies and calculate scheduling information
   *
   * @param tasks - Array of tasks to analyze
   * @returns Dependency resolution result
   */
  resolveDependencies(tasks) {
    const graph = this.buildDependencyGraph(tasks);
    const circularDependencies = this.detectCycles(graph, tasks);
    const orderedTasks = this.topologicalSort(tasks, graph);
    const earliestStarts = this.calculateEarliestStarts(orderedTasks, tasks);
    const criticalPath = this.calculateCriticalPath(orderedTasks, earliestStarts);
    return {
      orderedTasks,
      criticalPath,
      circularDependencies,
      earliestStarts
    };
  }
  /**
   * Build dependency graph (adjacency list)
   *
   * @param tasks - Array of tasks
   * @returns Map of task ID to dependent task IDs
   */
  buildDependencyGraph(tasks) {
    const graph = /* @__PURE__ */ new Map();
    tasks.forEach((task) => {
      if (!graph.has(task.id)) {
        graph.set(task.id, /* @__PURE__ */ new Set());
      }
    });
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          if (!graph.has(dep.taskId)) {
            graph.set(dep.taskId, /* @__PURE__ */ new Set());
          }
          graph.get(dep.taskId).add(task.id);
        });
      }
    });
    return graph;
  }
  /**
   * Detect circular dependencies using DFS
   *
   * @param graph - Dependency graph
   * @param tasks - Array of tasks
   * @returns Array of circular dependency chains
   */
  detectCycles(graph, tasks) {
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const cycles = [];
    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      const neighbors = graph.get(nodeId) || /* @__PURE__ */ new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, neighbor]);
        }
      }
      recursionStack.delete(nodeId);
    };
    tasks.forEach((task) => {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    });
    return cycles;
  }
  /**
   * Topological sort using Kahn's algorithm
   *
   * @param tasks - Array of tasks
   * @param graph - Dependency graph
   * @returns Tasks in dependency order
   */
  topologicalSort(tasks, graph) {
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const inDegree = /* @__PURE__ */ new Map();
    tasks.forEach((task) => {
      inDegree.set(task.id, 0);
    });
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach(() => {
          const current = inDegree.get(task.id) || 0;
          inDegree.set(task.id, current + 1);
        });
      }
    });
    const queue = [];
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });
    const sorted = [];
    while (queue.length > 0) {
      const taskId = queue.shift();
      const task = taskMap.get(taskId);
      if (task) {
        sorted.push(task);
      }
      const dependents = graph.get(taskId) || /* @__PURE__ */ new Set();
      dependents.forEach((depId) => {
        const degree = inDegree.get(depId) || 0;
        inDegree.set(depId, degree - 1);
        if (degree - 1 === 0) {
          queue.push(depId);
        }
      });
    }
    if (sorted.length !== tasks.length) {
      return tasks;
    }
    return sorted;
  }
  /**
   * Calculate earliest start date for each task based on dependencies
   *
   * @param orderedTasks - Tasks in topological order
   * @param allTasks - All tasks (for lookup)
   * @returns Map of task ID to earliest start date
   */
  calculateEarliestStarts(orderedTasks, allTasks) {
    const earliestStarts = /* @__PURE__ */ new Map();
    const taskMap = new Map(allTasks.map((task) => [task.id, task]));
    orderedTasks.forEach((task) => {
      let earliestStart = task.startDate ? new Date(task.startDate) : /* @__PURE__ */ new Date();
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach((dep) => {
          const depTask = taskMap.get(dep.taskId);
          if (!depTask) return;
          const depEarliestStart = earliestStarts.get(dep.taskId) || /* @__PURE__ */ new Date();
          const depDuration = depTask.getDuration() || 0;
          const lag = dep.lag || 0;
          let calculatedStart;
          if (dep.type === "finish-to-start") {
            calculatedStart = new Date(depEarliestStart);
            calculatedStart.setDate(calculatedStart.getDate() + depDuration + lag);
          } else if (dep.type === "start-to-start") {
            calculatedStart = new Date(depEarliestStart);
            calculatedStart.setDate(calculatedStart.getDate() + lag);
          } else if (dep.type === "finish-to-finish") {
            const taskDuration = task.getDuration() || 0;
            calculatedStart = new Date(depEarliestStart);
            calculatedStart.setDate(calculatedStart.getDate() + depDuration + lag - taskDuration);
          } else if (dep.type === "start-to-finish") {
            const duration = task.getDuration() || 0;
            calculatedStart = new Date(depEarliestStart);
            calculatedStart.setDate(calculatedStart.getDate() + lag - duration);
          } else {
            calculatedStart = depEarliestStart;
          }
          if (calculatedStart > earliestStart) {
            earliestStart = calculatedStart;
          }
        });
      }
      earliestStarts.set(task.id, earliestStart);
    });
    return earliestStarts;
  }
  /**
   * Calculate critical path (longest path through the project)
   *
   * @param orderedTasks - Tasks in topological order
   * @param earliestStarts - Earliest start dates
   * @returns Array of task IDs on critical path
   */
  calculateCriticalPath(orderedTasks, earliestStarts) {
    if (orderedTasks.length === 0) return [];
    const latestStarts = /* @__PURE__ */ new Map();
    let projectEnd = /* @__PURE__ */ new Date(0);
    orderedTasks.forEach((task) => {
      const start = earliestStarts.get(task.id) || /* @__PURE__ */ new Date();
      const duration = task.getDuration() || 0;
      const finish = new Date(start);
      finish.setDate(finish.getDate() + duration);
      if (finish > projectEnd) {
        projectEnd = finish;
      }
    });
    for (let i = orderedTasks.length - 1; i >= 0; i--) {
      const currentTask = orderedTasks[i];
      const duration = currentTask.getDuration() || 0;
      let latestFinish = new Date(projectEnd);
      orderedTasks.forEach((otherTask) => {
        if (otherTask.dependsOn(currentTask.id)) {
          const otherLatestStart = latestStarts.get(otherTask.id);
          if (otherLatestStart && otherLatestStart < latestFinish) {
            latestFinish = otherLatestStart;
          }
        }
      });
      const latestStart = new Date(latestFinish);
      latestStart.setDate(latestStart.getDate() - duration);
      latestStarts.set(currentTask.id, latestStart);
    }
    const criticalPath = [];
    orderedTasks.forEach((task) => {
      const earliest = earliestStarts.get(task.id);
      const latest = latestStarts.get(task.id);
      if (earliest && latest) {
        const slack = latest.getTime() - earliest.getTime();
        if (slack === 0) {
          criticalPath.push(task.id);
        }
      }
    });
    return criticalPath;
  }
  /**
   * Validate dependencies for a set of tasks
   *
   * @param tasks - Tasks to validate
   * @throws DependencyError if validation fails
   */
  validateDependencies(tasks) {
    const taskIds = new Set(tasks.map((task) => task.id));
    tasks.forEach((task) => {
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          if (!taskIds.has(dep.taskId)) {
            throw new DependencyError(
              `Task ${task.id} depends on non-existent task ${dep.taskId}`,
              "missing",
              [task.id, dep.taskId]
            );
          }
        });
      }
    });
    const graph = this.buildDependencyGraph(tasks);
    const cycles = this.detectCycles(graph, tasks);
    if (cycles.length > 0) {
      throw new DependencyError(
        `Circular dependencies detected: ${cycles.map((c) => c.join(" -> ")).join(", ")}`,
        "circular",
        cycles.flat()
      );
    }
  }
  /**
   * Check if adding a dependency would create a cycle
   *
   * @param tasks - Current tasks
   * @param fromTaskId - Task that will depend on toTaskId
   * @param toTaskId - Task that fromTaskId will depend on
   * @returns true if adding dependency would create a cycle
   */
  wouldCreateCycle(tasks, fromTaskId, toTaskId) {
    const fromTask = tasks.find((t) => t.id === fromTaskId);
    if (!fromTask) return false;
    const tempTask = fromTask.addDependency({
      taskId: toTaskId,
      type: "finish-to-start"
    });
    const tempTasks = tasks.map((task) => task.id === fromTaskId ? tempTask : task);
    const graph = this.buildDependencyGraph(tempTasks);
    const cycles = this.detectCycles(graph, tempTasks);
    return cycles.length > 0;
  }
  /**
   * Get all tasks that depend on a given task (successors)
   *
   * @param tasks - All tasks
   * @param taskId - Task ID to find successors for
   * @returns Array of successor tasks
   */
  getSuccessors(tasks, taskId) {
    return tasks.filter((task) => task.dependsOn(taskId));
  }
  /**
   * Get all tasks that a given task depends on (predecessors)
   *
   * @param tasks - All tasks
   * @param taskId - Task ID to find predecessors for
   * @returns Array of predecessor tasks
   */
  getPredecessors(tasks, taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.dependencies) return [];
    const predecessorIds = task.getDependentTaskIds();
    return tasks.filter((t) => predecessorIds.includes(t.id));
  }
  /**
   * Calculate total slack (float) for a task
   *
   * @param _task - Task to calculate slack for (unused, kept for API consistency)
   * @param earliestStart - Earliest possible start date
   * @param latestStart - Latest allowable start date
   * @returns Slack in days
   */
  calculateSlack(_task, earliestStart, latestStart) {
    const diffMs = latestStart.getTime() - earliestStart.getTime();
    return Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  }
};

// src/store/BoardStore.ts
var BoardStore = class extends Store {
  constructor(initialState) {
    super({
      board: initialState?.board || null,
      columns: initialState?.columns || /* @__PURE__ */ new Map(),
      cards: initialState?.cards || /* @__PURE__ */ new Map()
    });
    this.dependencyEngine = new DependencyEngine();
  }
  // ========================================================================
  // BOARD OPERATIONS
  // ========================================================================
  /**
   * Set the board
   */
  setBoard(boardData) {
    const board = Board.fromData(boardData);
    this.setState((state) => ({
      ...state,
      board
    }));
    this.emit("board:created", board.toData());
  }
  /**
   * Update the board
   */
  updateBoard(changes) {
    this.setState((state) => {
      if (!state.board) throw new Error("No board set");
      const updatedBoard = state.board.update(changes);
      return {
        ...state,
        board: updatedBoard
      };
    });
    this.emit("board:updated", { id: this.getState().board.id, changes });
  }
  /**
   * Get board
   */
  getBoard() {
    return this.getState().board;
  }
  // ========================================================================
  // COLUMN OPERATIONS
  // ========================================================================
  /**
   * Add a column
   */
  addColumn(columnData) {
    const column = new Column(columnData);
    this.setState((state) => {
      const newColumns = new Map(state.columns);
      newColumns.set(column.id, column);
      const updatedBoard = state.board?.addColumn(column.id);
      return {
        ...state,
        columns: newColumns,
        board: updatedBoard || state.board
      };
    });
    this.emit("column:created", column.toData());
    return column;
  }
  /**
   * Update a column
   */
  updateColumn(columnId, changes) {
    this.setState((state) => {
      const column = state.columns.get(columnId);
      if (!column) throw new Error(`Column ${columnId} not found`);
      const updatedColumn = column.update(changes);
      const newColumns = new Map(state.columns);
      newColumns.set(columnId, updatedColumn);
      return {
        ...state,
        columns: newColumns
      };
    });
    this.emit("column:updated", { id: columnId, changes });
  }
  /**
   * Delete a column
   */
  deleteColumn(columnId) {
    this.setState((state) => {
      const newColumns = new Map(state.columns);
      newColumns.delete(columnId);
      const updatedBoard = state.board?.removeColumn(columnId);
      return {
        ...state,
        columns: newColumns,
        board: updatedBoard || state.board
      };
    });
    this.emit("column:deleted", { id: columnId });
  }
  /**
   * Get a column by ID
   */
  getColumn(columnId) {
    return this.getState().columns.get(columnId);
  }
  /**
   * Get all columns
   */
  getAllColumns() {
    return Array.from(this.getState().columns.values());
  }
  // ========================================================================
  // CARD OPERATIONS
  // ========================================================================
  /**
   * Add a card
   */
  addCard(cardData) {
    const card = new Card(cardData);
    this.setState((state) => {
      const newCards = new Map(state.cards);
      newCards.set(card.id, card);
      const column = state.columns.get(card.columnId);
      if (column) {
        const updatedColumn = column.addCard(card.id);
        const newColumns = new Map(state.columns);
        newColumns.set(column.id, updatedColumn);
        return {
          ...state,
          cards: newCards,
          columns: newColumns
        };
      }
      return {
        ...state,
        cards: newCards
      };
    });
    this.emit("card:created", card.toData());
    return card;
  }
  /**
   * Update a card
   */
  updateCard(cardId, changes) {
    this.setState((state) => {
      const card = state.cards.get(cardId);
      if (!card) throw new Error(`Card ${cardId} not found`);
      const updatedCard = card.update(changes);
      const newCards = new Map(state.cards);
      newCards.set(cardId, updatedCard);
      return {
        ...state,
        cards: newCards
      };
    });
    this.emit("card:updated", { id: cardId, changes });
  }
  /**
   * Delete a card
   */
  deleteCard(cardId) {
    const card = this.getState().cards.get(cardId);
    if (!card) return;
    this.setState((state) => {
      const newCards = new Map(state.cards);
      newCards.delete(cardId);
      const column = state.columns.get(card.columnId);
      if (column) {
        const updatedColumn = column.removeCard(cardId);
        const newColumns = new Map(state.columns);
        newColumns.set(column.id, updatedColumn);
        return {
          ...state,
          cards: newCards,
          columns: newColumns
        };
      }
      return {
        ...state,
        cards: newCards
      };
    });
    this.emit("card:deleted", { id: cardId });
  }
  /**
   * Move a card to another column
   */
  moveCard(cardId, toColumnId, newPosition) {
    this.setState((state) => {
      const card = state.cards.get(cardId);
      if (!card) throw new Error(`Card ${cardId} not found`);
      const fromColumnId = card.columnId;
      const updatedCard = card.update({ columnId: toColumnId, position: newPosition });
      const newCards = new Map(state.cards);
      newCards.set(cardId, updatedCard);
      const newColumns = new Map(state.columns);
      const fromColumn = state.columns.get(fromColumnId);
      if (fromColumn) {
        newColumns.set(fromColumnId, fromColumn.removeCard(cardId));
      }
      const toColumn = state.columns.get(toColumnId);
      if (toColumn) {
        newColumns.set(toColumnId, toColumn.addCard(cardId, newPosition));
      }
      return {
        ...state,
        cards: newCards,
        columns: newColumns
      };
    });
    this.emit("card:moved", {
      id: cardId,
      fromColumnId: this.getState().cards.get(cardId).columnId,
      toColumnId,
      newPosition
    });
  }
  /**
   * Get a card by ID
   */
  getCard(cardId) {
    return this.getState().cards.get(cardId);
  }
  /**
   * Get all cards
   */
  getAllCards() {
    return Array.from(this.getState().cards.values());
  }
  /**
   * Get cards by column ID
   */
  getCardsByColumn(columnId) {
    const column = this.getColumn(columnId);
    if (!column) return [];
    return column.cardIds.map((cardId) => this.getState().cards.get(cardId)).filter((card) => card !== void 0);
  }
  // ========================================================================
  // DEPENDENCY OPERATIONS
  // ========================================================================
  /**
   * Add a dependency to a card
   *
   * @param cardId - Card to add dependency to
   * @param dependency - Dependency configuration
   * @throws Error if dependency would create a cycle
   */
  addDependency(cardId, dependency) {
    const card = this.getCard(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    const depTask = this.getCard(dependency.taskId);
    if (!depTask) {
      throw new Error(`Dependency task ${dependency.taskId} not found`);
    }
    if (this.dependencyEngine.wouldCreateCycle(this.getAllCards(), cardId, dependency.taskId)) {
      throw new Error(`Adding dependency would create a circular dependency`);
    }
    const updatedCard = card.addDependency(dependency);
    const newCards = new Map(this.getState().cards);
    newCards.set(cardId, updatedCard);
    this.setState((state) => ({
      ...state,
      cards: newCards
    }));
    this.emit("card:dependency:added", { cardId, dependency });
  }
  /**
   * Remove a dependency from a card
   *
   * @param cardId - Card to remove dependency from
   * @param dependencyTaskId - ID of task to remove dependency for
   */
  removeDependency(cardId, dependencyTaskId) {
    const card = this.getCard(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    const updatedCard = card.removeDependency(dependencyTaskId);
    if (updatedCard !== card) {
      const newCards = new Map(this.getState().cards);
      newCards.set(cardId, updatedCard);
      this.setState((state) => ({
        ...state,
        cards: newCards
      }));
      this.emit("card:dependency:removed", { cardId, dependencyTaskId });
    }
  }
  /**
   * Get all dependencies for a card
   *
   * @param cardId - Card ID to get dependencies for
   * @returns Array of cards this card depends on
   */
  getDependencies(cardId) {
    const card = this.getCard(cardId);
    if (!card || !card.dependencies) return [];
    const dependentTaskIds = card.getDependentTaskIds();
    return this.getAllCards().filter((c) => dependentTaskIds.includes(c.id));
  }
  /**
   * Get all cards that depend on a given card (successors)
   *
   * @param cardId - Card ID to find dependents for
   * @returns Array of cards that depend on this card
   */
  getDependentCards(cardId) {
    return this.dependencyEngine.getSuccessors(this.getAllCards(), cardId);
  }
  /**
   * Validate all dependencies in the board
   *
   * @throws Error if validation fails
   */
  validateDependencies() {
    this.dependencyEngine.validateDependencies(this.getAllCards());
  }
  /**
   * Resolve all dependencies and get topological order
   *
   * @returns Dependency resolution result with ordered tasks and critical path
   */
  resolveDependencies() {
    return this.dependencyEngine.resolveDependencies(this.getAllCards());
  }
  /**
   * Get cards in dependency order (dependencies first)
   *
   * @returns Cards sorted in topological order
   */
  getCardsInDependencyOrder() {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards());
    return result.orderedTasks;
  }
  /**
   * Get critical path task IDs
   *
   * @returns Array of task IDs on the critical path
   */
  getCriticalPath() {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards());
    return result.criticalPath;
  }
  /**
   * Check if a card is on the critical path
   *
   * @param cardId - Card ID to check
   * @returns true if card is on critical path
   */
  isOnCriticalPath(cardId) {
    const criticalPath = this.getCriticalPath();
    return criticalPath.includes(cardId);
  }
  /**
   * Update card dates based on dependencies (auto-schedule)
   *
   * This recalculates start dates for all cards based on their dependencies
   */
  autoSchedule() {
    const result = this.dependencyEngine.resolveDependencies(this.getAllCards());
    const newCards = new Map(this.getState().cards);
    result.orderedTasks.forEach((task) => {
      const earliestStart = result.earliestStarts.get(task.id);
      if (earliestStart && task.startDate) {
        const currentStart = new Date(task.startDate);
        if (earliestStart > currentStart) {
          const duration = task.getDuration() || 0;
          const newEnd = new Date(earliestStart);
          newEnd.setDate(newEnd.getDate() + duration);
          const updatedCard = task.update({
            startDate: earliestStart,
            endDate: newEnd
          });
          newCards.set(task.id, updatedCard);
        }
      }
    });
    this.setState((state) => ({
      ...state,
      cards: newCards
    }));
    this.emit("cards:auto-scheduled", { count: result.orderedTasks.length });
  }
};

// src/store/DragStore.ts
var DragStore = class {
  constructor() {
    this.state = {
      isDragging: false,
      draggedCardId: null,
      sourceColumnId: null,
      targetColumnId: null
    };
    this.listeners = /* @__PURE__ */ new Set();
    this.eventListeners = /* @__PURE__ */ new Map();
  }
  // ========================================================================
  // GETTERS
  // ========================================================================
  /**
   * Get current drag state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Check if currently dragging
   */
  isDragging() {
    return this.state.isDragging;
  }
  /**
   * Get dragged card ID
   */
  getDraggedCardId() {
    return this.state.draggedCardId;
  }
  /**
   * Get source column ID
   */
  getSourceColumnId() {
    return this.state.sourceColumnId;
  }
  /**
   * Get target column ID
   */
  getTargetColumnId() {
    return this.state.targetColumnId;
  }
  // ========================================================================
  // SETTERS
  // ========================================================================
  /**
   * Start dragging a card
   *
   * @param cardId - Card being dragged
   * @param sourceColumnId - Source column
   */
  startDrag(cardId, sourceColumnId) {
    this.state = {
      isDragging: true,
      draggedCardId: cardId,
      sourceColumnId,
      targetColumnId: sourceColumnId
    };
    this.emit("drag:start", { cardId, sourceColumnId });
    this.notify();
  }
  /**
   * Update drag target column
   *
   * @param targetColumnId - Target column
   */
  updateTarget(targetColumnId) {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return;
    }
    const cardId = this.state.draggedCardId;
    this.state = {
      ...this.state,
      targetColumnId
    };
    this.emit("drag:over", {
      cardId,
      targetColumnId
    });
    this.notify();
  }
  /**
   * End drag operation
   */
  endDrag() {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return;
    }
    const { draggedCardId, sourceColumnId, targetColumnId } = this.state;
    this.emit("drag:end", {
      cardId: draggedCardId,
      sourceColumnId,
      targetColumnId
    });
    this.reset();
  }
  /**
   * Cancel drag operation
   */
  cancelDrag() {
    if (!this.state.isDragging || !this.state.draggedCardId) {
      return;
    }
    this.emit("drag:cancel", { cardId: this.state.draggedCardId });
    this.reset();
  }
  /**
   * Reset drag state
   */
  reset() {
    this.state = {
      isDragging: false,
      draggedCardId: null,
      sourceColumnId: null,
      targetColumnId: null
    };
    this.notify();
  }
  /**
   * Set entire drag state at once
   * (For compatibility with existing code)
   *
   * @param state - New drag state
   */
  setState(state) {
    this.state = { ...state };
    this.notify();
  }
  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================
  /**
   * Subscribe to state changes
   *
   * @param callback - Called when state changes
   * @returns Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  /**
   * Subscribe to drag events
   *
   * @param event - Event type
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, /* @__PURE__ */ new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
  /**
   * Emit drag event
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
  /**
   * Notify all subscribers
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
  /**
   * Clear all listeners (cleanup)
   */
  destroy() {
    this.listeners.clear();
    this.eventListeners.clear();
    this.reset();
  }
};
var dragStore = new DragStore();

// src/store/SelectionStore.ts
var SelectionStore = class {
  constructor() {
    this.state = {
      selectedCardIds: [],
      lastSelectedCardId: null
    };
    this.listeners = /* @__PURE__ */ new Set();
    this.eventListeners = /* @__PURE__ */ new Map();
  }
  // ========================================================================
  // GETTERS
  // ========================================================================
  /**
   * Get current selection state
   */
  getState() {
    return {
      selectedCardIds: [...this.state.selectedCardIds],
      lastSelectedCardId: this.state.lastSelectedCardId
    };
  }
  /**
   * Get selected card IDs
   */
  getSelectedCardIds() {
    return [...this.state.selectedCardIds];
  }
  /**
   * Get last selected card ID
   */
  getLastSelectedCardId() {
    return this.state.lastSelectedCardId;
  }
  /**
   * Get selection count
   */
  getCount() {
    return this.state.selectedCardIds.length;
  }
  /**
   * Check if a card is selected
   *
   * @param cardId - Card ID to check
   */
  isSelected(cardId) {
    return this.state.selectedCardIds.includes(cardId);
  }
  /**
   * Check if any cards are selected
   */
  hasSelection() {
    return this.state.selectedCardIds.length > 0;
  }
  // ========================================================================
  // SETTERS
  // ========================================================================
  /**
   * Select a single card (replaces current selection)
   *
   * @param cardId - Card to select
   */
  select(cardId) {
    this.state = {
      selectedCardIds: [cardId],
      lastSelectedCardId: cardId
    };
    this.emit("selection:changed", {
      selectedCardIds: [cardId],
      lastSelectedCardId: cardId
    });
    this.notify();
  }
  /**
   * Add a card to selection
   *
   * @param cardId - Card to add
   */
  add(cardId) {
    if (this.state.selectedCardIds.includes(cardId)) {
      return;
    }
    this.state = {
      selectedCardIds: [...this.state.selectedCardIds, cardId],
      lastSelectedCardId: cardId
    };
    this.emit("selection:card-added", { cardId });
    this.emit("selection:changed", {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: cardId
    });
    this.notify();
  }
  /**
   * Remove a card from selection
   *
   * @param cardId - Card to remove
   */
  remove(cardId) {
    if (!this.state.selectedCardIds.includes(cardId)) {
      return;
    }
    this.state = {
      selectedCardIds: this.state.selectedCardIds.filter((id) => id !== cardId),
      lastSelectedCardId: this.state.lastSelectedCardId
    };
    this.emit("selection:card-removed", { cardId });
    this.emit("selection:changed", {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: this.state.lastSelectedCardId
    });
    this.notify();
  }
  /**
   * Toggle card selection
   *
   * @param cardId - Card to toggle
   */
  toggle(cardId) {
    if (this.state.selectedCardIds.includes(cardId)) {
      this.remove(cardId);
    } else {
      this.add(cardId);
    }
  }
  /**
   * Select multiple cards (replaces current selection)
   *
   * @param cardIds - Cards to select
   */
  selectMultiple(cardIds) {
    const lastCardId = cardIds[cardIds.length - 1] || null;
    this.state = {
      selectedCardIds: [...cardIds],
      lastSelectedCardId: lastCardId
    };
    this.emit("selection:changed", {
      selectedCardIds: cardIds,
      lastSelectedCardId: lastCardId
    });
    this.notify();
  }
  /**
   * Add multiple cards to selection
   *
   * @param cardIds - Cards to add
   */
  addMultiple(cardIds) {
    const newCardIds = cardIds.filter((id) => !this.state.selectedCardIds.includes(id));
    if (newCardIds.length === 0) {
      return;
    }
    const lastCardId = cardIds[cardIds.length - 1] || this.state.lastSelectedCardId;
    this.state = {
      selectedCardIds: [...this.state.selectedCardIds, ...newCardIds],
      lastSelectedCardId: lastCardId
    };
    newCardIds.forEach((cardId) => {
      this.emit("selection:card-added", { cardId });
    });
    this.emit("selection:changed", {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: lastCardId
    });
    this.notify();
  }
  /**
   * Clear all selections
   */
  clear() {
    const previousCount = this.state.selectedCardIds.length;
    if (previousCount === 0) {
      return;
    }
    this.state = {
      selectedCardIds: [],
      lastSelectedCardId: null
    };
    this.emit("selection:cleared", { previousCount });
    this.emit("selection:changed", {
      selectedCardIds: [],
      lastSelectedCardId: null
    });
    this.notify();
  }
  /**
   * Set entire selection state at once
   * (For compatibility with existing code)
   *
   * @param state - New selection state
   */
  setState(state) {
    this.state = {
      selectedCardIds: [...state.selectedCardIds],
      lastSelectedCardId: state.lastSelectedCardId
    };
    this.emit("selection:changed", {
      selectedCardIds: this.state.selectedCardIds,
      lastSelectedCardId: this.state.lastSelectedCardId
    });
    this.notify();
  }
  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================
  /**
   * Subscribe to state changes
   *
   * @param callback - Called when state changes
   * @returns Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  /**
   * Subscribe to selection events
   *
   * @param event - Event type
   * @param callback - Event callback
   * @returns Unsubscribe function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, /* @__PURE__ */ new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
  /**
   * Emit selection event
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
  /**
   * Notify all subscribers
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
  /**
   * Clear all listeners (cleanup)
   */
  destroy() {
    this.listeners.clear();
    this.eventListeners.clear();
    this.clear();
  }
};
var selectionStore = new SelectionStore();

// src/views/ViewAdapter.ts
var BaseViewAdapter = class {
  constructor() {
    this.version = "1.0.0";
    this.description = "";
    this.icon = "";
    this.supportedExports = ["json"];
    this.container = null;
    this.data = null;
    this.options = {
      animations: true,
      virtualScrolling: false,
      theme: "dark",
      readonly: false
    };
    this.listeners = /* @__PURE__ */ new Map();
  }
  // ========================================================================
  // LIFECYCLE
  // ========================================================================
  mount(container, data) {
    this.container = container;
    this.data = data;
    this.emit("view:mounted", { viewId: this.id, timestamp: Date.now() });
  }
  unmount() {
    this.emit("view:unmounted", { viewId: this.id, timestamp: Date.now() });
    if (this.container) {
      this.container.innerHTML = "";
      this.container = null;
    }
    this.data = null;
    this.listeners.clear();
  }
  update(data) {
    this.data = data;
    this.emit("view:updated", { viewId: this.id, data });
  }
  // ========================================================================
  // EVENTS
  // ========================================================================
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  configure(options) {
    this.options = { ...this.options, ...options };
  }
  getConfig() {
    return { ...this.options };
  }
  // ========================================================================
  // HELPERS
  // ========================================================================
  /**
   * Check if view is mounted
   */
  isMounted() {
    return this.container !== null && this.data !== null;
  }
  /**
   * Get container dimensions
   */
  getContainerSize() {
    if (!this.container) {
      return { width: 0, height: 0 };
    }
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
  }
  /**
   * Apply theme classes to container
   */
  applyTheme() {
    if (!this.container) return;
    const themeClass = `asakaa-theme-${this.options.theme}`;
    this.container.classList.add("asakaa-view", themeClass);
  }
  /**
   * Cleanup theme classes
   */
  cleanupTheme() {
    if (!this.container) return;
    this.container.classList.remove(
      "asakaa-view",
      "asakaa-theme-dark",
      "asakaa-theme-light",
      "asakaa-theme-neutral"
    );
  }
};

// src/views/ViewRegistry.ts
var ViewRegistry = class {
  constructor() {
    this.views = /* @__PURE__ */ new Map();
    this.metadata = /* @__PURE__ */ new Map();
    this.currentView = null;
    this.currentViewId = null;
    this.container = null;
    this.currentData = null;
    this.listeners = /* @__PURE__ */ new Map();
  }
  // ========================================================================
  // REGISTRATION
  // ========================================================================
  /**
   * Register a new view
   *
   * @param view - View to register
   * @throws Error if view with same ID already registered
   */
  register(view) {
    if (this.views.has(view.id)) {
      throw new Error(`View '${view.id}' is already registered`);
    }
    this.views.set(view.id, view);
    this.metadata.set(view.id, {
      id: view.id,
      name: view.name,
      version: view.version,
      description: view.description,
      icon: view.icon,
      supportedExports: view.supportedExports,
      registeredAt: Date.now(),
      timesActivated: 0,
      lastActivatedAt: null
    });
    this.emit("view:registered", { viewId: view.id, view });
  }
  /**
   * Unregister a view
   *
   * @param viewId - View ID to unregister
   * @throws Error if trying to unregister active view
   */
  unregister(viewId) {
    if (!this.views.has(viewId)) {
      throw new Error(`View '${viewId}' is not registered`);
    }
    if (this.currentViewId === viewId) {
      throw new Error(`Cannot unregister active view '${viewId}'. Switch to another view first.`);
    }
    this.views.delete(viewId);
    this.metadata.delete(viewId);
    this.emit("view:unregistered", { viewId });
  }
  /**
   * Check if a view is registered
   */
  hasView(viewId) {
    return this.views.has(viewId);
  }
  /**
   * Get a registered view
   */
  getView(viewId) {
    return this.views.get(viewId);
  }
  /**
   * List all registered views
   */
  listViews() {
    return Array.from(this.metadata.values());
  }
  /**
   * Get view metadata
   */
  getMetadata(viewId) {
    return this.metadata.get(viewId);
  }
  // ========================================================================
  // ACTIVATION & SWITCHING
  // ========================================================================
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
  async activate(viewId, container, data, options) {
    const view = this.views.get(viewId);
    if (!view) {
      throw new Error(`View '${viewId}' not found`);
    }
    if (this.currentView) {
      this.currentView.unmount();
    }
    this.container = container;
    this.currentData = data;
    if (options) {
      view.configure(options);
    }
    const startTime = performance.now();
    try {
      view.mount(container, data);
      const meta = this.metadata.get(viewId);
      if (meta) {
        meta.timesActivated++;
        meta.lastActivatedAt = Date.now();
      }
      const previousViewId = this.currentViewId;
      this.currentView = view;
      this.currentViewId = viewId;
      this.emit("view:switched", {
        fromViewId: previousViewId,
        toViewId: viewId,
        timestamp: Date.now()
      });
      const renderTime = performance.now() - startTime;
      view.emit("view:ready", { viewId, renderTime });
    } catch (error) {
      this.emit("view:error", { viewId, error });
      throw error;
    }
  }
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
  async switchTo(viewId, options) {
    if (!this.container || !this.currentData) {
      throw new Error("No view is currently active. Use activate() first.");
    }
    await this.activate(viewId, this.container, this.currentData, options);
  }
  /**
   * Update current view with new data
   *
   * @param data - New data
   * @throws Error if no view is active
   */
  update(data) {
    if (!this.currentView) {
      throw new Error("No view is currently active");
    }
    this.currentData = data;
    this.currentView.update(data);
  }
  /**
   * Deactivate current view
   */
  deactivate() {
    if (this.currentView) {
      this.currentView.unmount();
      this.currentView = null;
      this.currentViewId = null;
    }
  }
  // ========================================================================
  // STATE QUERIES
  // ========================================================================
  /**
   * Get current active view
   */
  getCurrentView() {
    return this.currentView;
  }
  /**
   * Get current view ID
   */
  getCurrentViewId() {
    return this.currentViewId;
  }
  /**
   * Check if a specific view is active
   */
  isActive(viewId) {
    return this.currentViewId === viewId;
  }
  /**
   * Get current container
   */
  getContainer() {
    return this.container;
  }
  /**
   * Get current data
   */
  getCurrentData() {
    return this.currentData;
  }
  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  /**
   * Configure current view
   *
   * @param options - View options
   * @throws Error if no view is active
   */
  configure(options) {
    if (!this.currentView) {
      throw new Error("No view is currently active");
    }
    this.currentView.configure(options);
  }
  /**
   * Get current view configuration
   *
   * @throws Error if no view is active
   */
  getConfig() {
    if (!this.currentView) {
      throw new Error("No view is currently active");
    }
    return this.currentView.getConfig();
  }
  // ========================================================================
  // EVENTS
  // ========================================================================
  /**
   * Subscribe to registry events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  /**
   * Emit a registry event
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
  // ========================================================================
  // UTILITIES
  // ========================================================================
  /**
   * Get statistics about views
   */
  getStats() {
    const metas = Array.from(this.metadata.values());
    const totalActivations = metas.reduce((sum, meta) => sum + meta.timesActivated, 0);
    let mostActivatedView = null;
    let maxActivations = 0;
    metas.forEach((meta) => {
      if (meta.timesActivated > maxActivations) {
        maxActivations = meta.timesActivated;
        mostActivatedView = meta;
      }
    });
    return {
      totalViews: this.views.size,
      activeViewId: this.currentViewId,
      mostActivatedView,
      averageActivations: metas.length > 0 ? totalActivations / metas.length : 0
    };
  }
  /**
   * Clear all listeners
   */
  clearListeners() {
    this.listeners.clear();
  }
  /**
   * Destroy registry and cleanup
   */
  destroy() {
    this.deactivate();
    this.views.clear();
    this.metadata.clear();
    this.listeners.clear();
    this.container = null;
    this.currentData = null;
  }
};

// src/runtime/Plugin.ts
var PluginRegistry = class {
  constructor(runtime) {
    this.plugins = /* @__PURE__ */ new Map();
    this.metadata = /* @__PURE__ */ new Map();
    this.contexts = /* @__PURE__ */ new Map();
    this.runtime = runtime;
  }
  /**
   * Install a plugin
   *
   * @param plugin - Plugin to install
   * @throws Error if plugin with same ID already installed
   */
  async install(plugin) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin '${plugin.id}' is already installed`);
    }
    const context = this.createContext(plugin.id);
    await plugin.install(context);
    this.plugins.set(plugin.id, plugin);
    this.contexts.set(plugin.id, context);
    this.metadata.set(plugin.id, {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      homepage: plugin.homepage,
      installedAt: Date.now(),
      enabled: true
    });
    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Installed plugin: ${plugin.name} v${plugin.version}`);
    }
  }
  /**
   * Uninstall a plugin
   *
   * @param pluginId - Plugin ID to uninstall
   */
  async uninstall(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' is not installed`);
    }
    const context = this.contexts.get(pluginId);
    await plugin.uninstall(context);
    this.plugins.delete(pluginId);
    this.contexts.delete(pluginId);
    this.metadata.delete(pluginId);
    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Uninstalled plugin: ${plugin.name}`);
    }
  }
  /**
   * Enable a plugin
   *
   * @param pluginId - Plugin ID to enable
   */
  async enable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    const meta = this.metadata.get(pluginId);
    if (!plugin || !meta) {
      throw new Error(`Plugin '${pluginId}' is not installed`);
    }
    if (meta.enabled) {
      return;
    }
    const context = this.contexts.get(pluginId);
    if (plugin.enable) {
      await plugin.enable(context);
    }
    meta.enabled = true;
    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Enabled plugin: ${plugin.name}`);
    }
  }
  /**
   * Disable a plugin
   *
   * @param pluginId - Plugin ID to disable
   */
  async disable(pluginId) {
    const plugin = this.plugins.get(pluginId);
    const meta = this.metadata.get(pluginId);
    if (!plugin || !meta) {
      throw new Error(`Plugin '${pluginId}' is not installed`);
    }
    if (!meta.enabled) {
      return;
    }
    const context = this.contexts.get(pluginId);
    if (plugin.disable) {
      await plugin.disable(context);
    }
    meta.enabled = false;
    if (this.runtime.isDevMode()) {
      console.log(`[PluginRegistry] Disabled plugin: ${plugin.name}`);
    }
  }
  /**
   * Check if a plugin is installed
   */
  hasPlugin(pluginId) {
    return this.plugins.has(pluginId);
  }
  /**
   * Get a plugin
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }
  /**
   * List all installed plugins
   */
  listPlugins() {
    return Array.from(this.metadata.values());
  }
  /**
   * Get plugin metadata
   */
  getMetadata(pluginId) {
    return this.metadata.get(pluginId);
  }
  /**
   * Destroy registry and uninstall all plugins
   */
  async destroy() {
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      await this.uninstall(pluginId);
    }
    this.plugins.clear();
    this.metadata.clear();
    this.contexts.clear();
  }
  /**
   * Create plugin context
   */
  createContext(pluginId) {
    const listeners = [];
    const pluginData = /* @__PURE__ */ new Map();
    return {
      getRuntime: () => this.runtime,
      getState: () => this.runtime.getState(),
      onStateChange: (callback) => {
        const unsubscribe = this.runtime.onStateChange(callback);
        listeners.push(unsubscribe);
        return unsubscribe;
      },
      onViewChange: (callback) => {
        const unsubscribe = this.runtime.on("view:changed", ({ viewId }) => {
          callback(viewId);
        });
        listeners.push(unsubscribe);
        return unsubscribe;
      },
      setData: (key, value) => {
        pluginData.set(key, value);
      },
      getData: (key) => {
        return pluginData.get(key);
      },
      removeAllListeners: () => {
        listeners.forEach((unsubscribe) => unsubscribe());
        listeners.length = 0;
      },
      log: (...args) => {
        if (this.runtime.isDevMode()) {
          console.log(`[Plugin:${pluginId}]`, ...args);
        }
      }
    };
  }
};

// src/runtime/AsakaaRuntime.ts
var AsakaaRuntime = class {
  constructor(config = {}) {
    this.listeners = /* @__PURE__ */ new Map();
    this.autoSaveInterval = null;
    this.isDestroyed = false;
    // Performance monitoring
    this.perfMarks = /* @__PURE__ */ new Map();
    this.config = {
      devMode: false,
      enablePerfMonitoring: false,
      defaultView: "kanban",
      ...config
    };
    this.store = this.initializeStore(config.initialData);
    this.viewRegistry = new ViewRegistry();
    this.pluginRegistry = new PluginRegistry(this);
    this.store.subscribeAll(() => {
      this.emit("state:changed", { state: this.store.getState() });
    });
    this.viewRegistry.on("view:switched", ({ toViewId, timestamp }) => {
      this.emit("view:changed", { viewId: toViewId, timestamp });
    });
    if (this.config.autoSave?.enabled) {
      this.setupAutoSave();
    }
    this.emit("runtime:initialized", { timestamp: Date.now(), config: this.config });
    if (this.config.devMode) {
      console.log("[AsakaaRuntime] Initialized with config:", this.config);
    }
  }
  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  initializeStore(initialData) {
    const columnsMap = /* @__PURE__ */ new Map();
    const cardsMap = /* @__PURE__ */ new Map();
    let board = null;
    if (initialData) {
      if (initialData.columns) {
        const { Column: Column2 } = (init_models(), __toCommonJS(models_exports));
        initialData.columns.forEach((colData) => {
          columnsMap.set(colData.id, new Column2(colData));
        });
      }
      if (initialData.cards) {
        const { Card: Card2 } = (init_models(), __toCommonJS(models_exports));
        initialData.cards.forEach((cardData) => {
          cardsMap.set(cardData.id, new Card2(cardData));
        });
      }
      if (initialData.board) {
        const { Board: Board2 } = (init_models(), __toCommonJS(models_exports));
        board = new Board2(initialData.board);
      }
    }
    return new BoardStore({
      board,
      columns: columnsMap,
      cards: cardsMap
    });
  }
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  /**
   * Get the BoardStore instance
   */
  getStore() {
    this.ensureNotDestroyed();
    return this.store;
  }
  /**
   * Get current board state
   */
  getState() {
    this.ensureNotDestroyed();
    return this.store.getState();
  }
  /**
   * Subscribe to state changes
   *
   * @param callback - State change callback
   * @returns Unsubscribe function
   */
  onStateChange(callback) {
    this.ensureNotDestroyed();
    return this.store.subscribeAll(() => {
      callback(this.store.getState());
    });
  }
  // ========================================================================
  // VIEW MANAGEMENT
  // ========================================================================
  /**
   * Register a view
   *
   * @param view - View to register
   */
  registerView(view) {
    this.ensureNotDestroyed();
    this.viewRegistry.register(view);
    if (this.config.devMode) {
      console.log(`[AsakaaRuntime] Registered view: ${view.id} (${view.name})`);
    }
  }
  /**
   * Unregister a view
   *
   * @param viewId - View ID to unregister
   */
  unregisterView(viewId) {
    this.ensureNotDestroyed();
    this.viewRegistry.unregister(viewId);
    if (this.config.devMode) {
      console.log(`[AsakaaRuntime] Unregistered view: ${viewId}`);
    }
  }
  /**
   * Activate a view
   *
   * @param viewId - View ID to activate
   * @param container - Container element
   * @param options - View options
   */
  async activateView(viewId, container, options) {
    this.ensureNotDestroyed();
    const startTime = this.perfMark("activateView");
    try {
      const data = this.serializeForView();
      await this.viewRegistry.activate(viewId, container, data, options);
      if (this.config.enablePerfMonitoring) {
        const duration = this.perfMeasure("activateView", startTime);
        console.log(`[AsakaaRuntime] View activated in ${duration}ms`);
      }
    } catch (error) {
      this.emit("runtime:error", {
        error,
        context: `activateView(${viewId})`
      });
      throw error;
    }
  }
  /**
   * Switch to another view
   *
   * @param viewId - View ID to switch to
   * @param options - View options
   */
  async switchView(viewId, options) {
    this.ensureNotDestroyed();
    const startTime = this.perfMark("switchView");
    try {
      await this.viewRegistry.switchTo(viewId, options);
      if (this.config.enablePerfMonitoring) {
        const duration = this.perfMeasure("switchView", startTime);
        console.log(`[AsakaaRuntime] View switched in ${duration}ms`);
      }
    } catch (error) {
      this.emit("runtime:error", {
        error,
        context: `switchView(${viewId})`
      });
      throw error;
    }
  }
  /**
   * Get current view ID
   */
  getCurrentViewId() {
    this.ensureNotDestroyed();
    return this.viewRegistry.getCurrentViewId();
  }
  /**
   * List all registered views
   */
  listViews() {
    this.ensureNotDestroyed();
    return this.viewRegistry.listViews();
  }
  /**
   * Update current view with latest data
   */
  updateView() {
    this.ensureNotDestroyed();
    const data = this.serializeForView();
    this.viewRegistry.update(data);
  }
  // ========================================================================
  // SERIALIZATION
  // ========================================================================
  /**
   * Serialize runtime state to SerializedBoardData format for views
   */
  serializeForView() {
    const state = this.store.getState();
    return {
      board: state.board?.toData() || null,
      columns: Array.from(state.columns.values()).map((col) => col.toData()),
      cards: Array.from(state.cards.values()).map((card) => card.toData())
    };
  }
  /**
   * Export runtime state
   *
   * @param format - Serialization format
   * @returns Serialized data
   */
  async serialize(format = "json") {
    this.ensureNotDestroyed();
    const data = this.serializeForView();
    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "binary":
        throw new Error("Binary serialization not yet implemented");
      case "msgpack":
        throw new Error("MessagePack serialization not yet implemented");
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
  }
  /**
   * Import data into runtime
   *
   * @param data - Data to import
   * @param format - Data format
   */
  async deserialize(data, format = "json") {
    this.ensureNotDestroyed();
    let boardData;
    switch (format) {
      case "json":
        boardData = JSON.parse(data);
        break;
      case "binary":
        throw new Error("Binary deserialization not yet implemented");
      case "msgpack":
        throw new Error("MessagePack deserialization not yet implemented");
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
    this.store = this.initializeStore({
      board: boardData.board || void 0,
      columns: boardData.columns,
      cards: boardData.cards
    });
    if (this.viewRegistry.getCurrentViewId()) {
      this.updateView();
    }
  }
  // ========================================================================
  // AUTO-SAVE
  // ========================================================================
  setupAutoSave() {
    if (!this.config.autoSave) return;
    const { interval, storage = "localStorage", key = "asakaa-board" } = this.config.autoSave;
    this.autoSaveInterval = setInterval(async () => {
      try {
        const data = await this.serialize("json");
        if (storage === "localStorage") {
          localStorage.setItem(key, data);
        } else if (storage === "sessionStorage") {
          sessionStorage.setItem(key, data);
        }
        if (this.config.devMode) {
          console.log(`[AsakaaRuntime] Auto-saved to ${storage}`);
        }
      } catch (error) {
        console.error("[AsakaaRuntime] Auto-save failed:", error);
      }
    }, interval);
  }
  /**
   * Load data from auto-save storage
   */
  async loadFromAutoSave() {
    if (!this.config.autoSave) return false;
    const { storage = "localStorage", key = "asakaa-board" } = this.config.autoSave;
    try {
      let data = null;
      if (storage === "localStorage") {
        data = localStorage.getItem(key);
      } else if (storage === "sessionStorage") {
        data = sessionStorage.getItem(key);
      }
      if (data) {
        await this.deserialize(data, "json");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[AsakaaRuntime] Failed to load from auto-save:", error);
      return false;
    }
  }
  /**
   * Clear auto-save storage
   */
  clearAutoSave() {
    if (!this.config.autoSave) return;
    const { storage = "localStorage", key = "asakaa-board" } = this.config.autoSave;
    if (storage === "localStorage") {
      localStorage.removeItem(key);
    } else if (storage === "sessionStorage") {
      sessionStorage.removeItem(key);
    }
  }
  // ========================================================================
  // PLUGIN MANAGEMENT
  // ========================================================================
  /**
   * Install a plugin
   *
   * @param plugin - Plugin to install
   */
  async installPlugin(plugin) {
    this.ensureNotDestroyed();
    await this.pluginRegistry.install(plugin);
    this.emit("plugin:installed", { pluginId: plugin.id });
  }
  /**
   * Uninstall a plugin
   *
   * @param pluginId - Plugin ID to uninstall
   */
  async uninstallPlugin(pluginId) {
    this.ensureNotDestroyed();
    await this.pluginRegistry.uninstall(pluginId);
    this.emit("plugin:uninstalled", { pluginId });
  }
  /**
   * Enable a plugin
   *
   * @param pluginId - Plugin ID to enable
   */
  async enablePlugin(pluginId) {
    this.ensureNotDestroyed();
    await this.pluginRegistry.enable(pluginId);
  }
  /**
   * Disable a plugin
   *
   * @param pluginId - Plugin ID to disable
   */
  async disablePlugin(pluginId) {
    this.ensureNotDestroyed();
    await this.pluginRegistry.disable(pluginId);
  }
  /**
   * List all installed plugins
   */
  listPlugins() {
    this.ensureNotDestroyed();
    return this.pluginRegistry.listPlugins();
  }
  /**
   * Get plugin by ID
   */
  getPlugin(pluginId) {
    this.ensureNotDestroyed();
    return this.pluginRegistry.getPlugin(pluginId);
  }
  // ========================================================================
  // EVENTS
  // ========================================================================
  /**
   * Subscribe to runtime events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  /**
   * Emit a runtime event
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
  // ========================================================================
  // PERFORMANCE MONITORING
  // ========================================================================
  perfMark(name) {
    if (!this.config.enablePerfMonitoring) return 0;
    const time = performance.now();
    this.perfMarks.set(name, time);
    return time;
  }
  perfMeasure(name, startTime) {
    if (!this.config.enablePerfMonitoring) return 0;
    const duration = performance.now() - startTime;
    this.perfMarks.delete(name);
    return duration;
  }
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const state = this.getState();
    return {
      currentView: this.getCurrentViewId(),
      stateSize: state.cards.size + state.columns.size,
      viewCount: this.viewRegistry.listViews().length
    };
  }
  // ========================================================================
  // UTILITIES
  // ========================================================================
  /**
   * Get runtime configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Check if runtime is in dev mode
   */
  isDevMode() {
    return this.config.devMode || false;
  }
  /**
   * Check if runtime is destroyed
   */
  isRuntimeDestroyed() {
    return this.isDestroyed;
  }
  ensureNotDestroyed() {
    if (this.isDestroyed) {
      throw new Error("Runtime has been destroyed. Create a new instance.");
    }
  }
  // ========================================================================
  // LIFECYCLE
  // ========================================================================
  /**
   * Destroy the runtime and cleanup resources
   */
  destroy() {
    if (this.isDestroyed) return;
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.pluginRegistry.destroy();
    this.viewRegistry.deactivate();
    this.viewRegistry.destroy();
    this.listeners.clear();
    this.perfMarks.clear();
    this.isDestroyed = true;
    this.emit("runtime:destroyed", { timestamp: Date.now() });
    if (this.config.devMode) {
      console.log("[AsakaaRuntime] Destroyed");
    }
  }
};

// src/serialization/Serializer.ts
var BaseSerializer = class {
  constructor() {
    this.version = "0.7.0";
  }
  /**
   * Create serialized data structure
   */
  createSerializedData(board, columns, cards, options = {}) {
    const data = {
      version: this.version,
      timestamp: options.includeTimestamp !== false ? Date.now() : 0,
      board,
      columns,
      cards
    };
    if (options.includeMetadata !== false) {
      data.metadata = {
        serializer: this.constructor.name,
        nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
      };
    }
    return data;
  }
  /**
   * Validate serialized data structure
   */
  validateSerializedData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid serialized data: not an object");
    }
    if (!data.version || typeof data.version !== "string") {
      throw new Error("Invalid serialized data: missing or invalid version");
    }
    if (!Array.isArray(data.columns)) {
      throw new Error("Invalid serialized data: columns must be an array");
    }
    if (!Array.isArray(data.cards)) {
      throw new Error("Invalid serialized data: cards must be an array");
    }
    if (data.board !== null && typeof data.board !== "object") {
      throw new Error("Invalid serialized data: board must be an object or null");
    }
  }
};

// src/serialization/JSONSerializer.ts
var JSONSerializer = class extends BaseSerializer {
  /**
   * Serialize data to JSON string
   */
  async serialize(data, options = {}) {
    try {
      const indent = options.prettyPrint ? 2 : void 0;
      return JSON.stringify(data, this.replacer, indent);
    } catch (error) {
      throw new Error(
        `JSON serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Deserialize JSON string to data
   */
  async deserialize(input, _options) {
    try {
      const data = JSON.parse(input, this.reviver);
      this.validateSerializedData(data);
      return data;
    } catch (error) {
      throw new Error(
        `JSON deserialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Get MIME type
   */
  getMimeType() {
    return "application/json";
  }
  /**
   * Get file extension
   */
  getFileExtension() {
    return ".json";
  }
  /**
   * JSON replacer for special types
   */
  replacer(_key, value) {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    if (value instanceof Map) {
      return { __type: "Map", value: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: "Set", value: Array.from(value) };
    }
    return value;
  }
  /**
   * JSON reviver for special types
   */
  reviver(_key, value) {
    if (value && value.__type === "Date") {
      return new Date(value.value);
    }
    if (value && value.__type === "Map") {
      return new Map(value.value);
    }
    if (value && value.__type === "Set") {
      return new Set(value.value);
    }
    return value;
  }
};
function createJSONSerializer() {
  return new JSONSerializer();
}

// src/serialization/BinarySerializer.ts
var BinarySerializer = class extends BaseSerializer {
  constructor() {
    super(...arguments);
    this.textEncoder = new TextEncoder();
    this.textDecoder = new TextDecoder();
  }
  /**
   * Serialize data to binary format
   */
  async serialize(data, _options = {}) {
    try {
      const json = JSON.stringify(data);
      const bytes = this.textEncoder.encode(json);
      return bytes;
    } catch (error) {
      throw new Error(
        `Binary serialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Deserialize binary format to data
   */
  async deserialize(input, _options) {
    try {
      const json = this.textDecoder.decode(input);
      const data = JSON.parse(json);
      this.validateSerializedData(data);
      return data;
    } catch (error) {
      throw new Error(
        `Binary deserialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Get MIME type
   */
  getMimeType() {
    return "application/octet-stream";
  }
  /**
   * Get file extension
   */
  getFileExtension() {
    return ".bin";
  }
};
function createBinarySerializer() {
  return new BinarySerializer();
}

// src/serialization/SerializerRegistry.ts
var SerializerRegistry = class {
  constructor() {
    this.serializers = /* @__PURE__ */ new Map();
    this.register("json", new JSONSerializer());
    this.register("binary", new BinarySerializer());
  }
  /**
   * Register a serializer
   *
   * @param format - Format identifier
   * @param serializer - Serializer instance
   */
  register(format, serializer) {
    this.serializers.set(format, serializer);
  }
  /**
   * Unregister a serializer
   *
   * @param format - Format identifier
   */
  unregister(format) {
    this.serializers.delete(format);
  }
  /**
   * Get a serializer by format
   *
   * @param format - Format identifier
   * @returns Serializer instance
   * @throws Error if format not found
   */
  getSerializer(format) {
    const serializer = this.serializers.get(format);
    if (!serializer) {
      throw new Error(`Serializer for format '${format}' not found`);
    }
    return serializer;
  }
  /**
   * Check if a format is supported
   *
   * @param format - Format to check
   */
  isSupported(format) {
    return this.serializers.has(format);
  }
  /**
   * Get all supported formats
   */
  getSupportedFormats() {
    return Array.from(this.serializers.keys());
  }
  /**
   * Serialize data using specified format
   *
   * @param format - Serialization format
   * @param data - Data to serialize
   * @param options - Serialization options
   * @returns Serialized output
   */
  async serialize(format, data, options) {
    const serializer = this.getSerializer(format);
    return serializer.serialize(data, options);
  }
  /**
   * Deserialize data using specified format
   *
   * @param format - Serialization format
   * @param input - Serialized input
   * @param options - Deserialization options
   * @returns Deserialized data
   */
  async deserialize(format, input, options) {
    const serializer = this.getSerializer(format);
    return serializer.deserialize(input, options);
  }
  /**
   * Get MIME type for a format
   *
   * @param format - Format identifier
   * @returns MIME type string
   */
  getMimeType(format) {
    return this.getSerializer(format).getMimeType();
  }
  /**
   * Get file extension for a format
   *
   * @param format - Format identifier
   * @returns File extension (e.g., '.json')
   */
  getFileExtension(format) {
    return this.getSerializer(format).getFileExtension();
  }
};
var serializerRegistry = new SerializerRegistry();

// src/adapters/vanilla/BoardController.ts
var BoardController = class {
  constructor(options) {
    this.container = options.container;
    this.renderers = options.renderers || {};
    this.autoRender = options.autoRender ?? true;
    this.eventListeners = /* @__PURE__ */ new Map();
    const initialState = {
      board: null,
      columns: /* @__PURE__ */ new Map(),
      cards: /* @__PURE__ */ new Map()
    };
    if (options.initialData) {
      if (options.initialData.board) {
        initialState.board = new Board(options.initialData.board);
      }
      if (options.initialData.columns) {
        options.initialData.columns.forEach((col) => {
          initialState.columns.set(col.id, new Column(col));
        });
      }
      if (options.initialData.cards) {
        options.initialData.cards.forEach((card) => {
          initialState.cards.set(card.id, new Card(card));
        });
      }
    }
    this.store = new BoardStore(initialState);
    if (this.autoRender) {
      this.store.subscribeAll((event) => {
        this.handleStateChange(event);
      });
    }
  }
  /**
   * Get current board state
   */
  getState() {
    return this.store.getState();
  }
  /**
   * Get the board
   */
  getBoard() {
    return this.store.getBoard();
  }
  /**
   * Get all columns
   */
  getColumns() {
    return this.store.getAllColumns();
  }
  /**
   * Get all cards
   */
  getCards() {
    return this.store.getAllCards();
  }
  /**
   * Get cards in a specific column
   */
  getCardsByColumn(columnId) {
    return this.store.getCardsByColumn(columnId);
  }
  // ============================================================================
  // Board Operations
  // ============================================================================
  /**
   * Update board
   */
  updateBoard(changes) {
    this.store.updateBoard(changes);
  }
  // ============================================================================
  // Column Operations
  // ============================================================================
  /**
   * Add a new column
   */
  addColumn(columnData) {
    return this.store.addColumn(columnData);
  }
  /**
   * Update a column
   */
  updateColumn(columnId, changes) {
    this.store.updateColumn(columnId, changes);
  }
  /**
   * Delete a column
   */
  deleteColumn(columnId) {
    this.store.deleteColumn(columnId);
  }
  /**
   * Get a column by ID
   */
  getColumn(columnId) {
    return this.store.getColumn(columnId);
  }
  // ============================================================================
  // Card Operations
  // ============================================================================
  /**
   * Add a new card
   */
  addCard(cardData) {
    return this.store.addCard(cardData);
  }
  /**
   * Update a card
   */
  updateCard(cardId, changes) {
    this.store.updateCard(cardId, changes);
  }
  /**
   * Delete a card
   */
  deleteCard(cardId) {
    this.store.deleteCard(cardId);
  }
  /**
   * Move a card to a different column
   */
  moveCard(cardId, toColumnId, newPosition) {
    this.store.moveCard(cardId, toColumnId, newPosition);
  }
  /**
   * Get a card by ID
   */
  getCard(cardId) {
    return this.store.getCard(cardId);
  }
  // ============================================================================
  // Event System
  // ============================================================================
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
  on(eventType, handler) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, /* @__PURE__ */ new Set());
    }
    this.eventListeners.get(eventType).add(handler);
    const unsubStore = this.store.subscribe(eventType, handler);
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(handler);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
      unsubStore();
    };
  }
  /**
   * Subscribe to all events
   */
  onAll(handler) {
    return this.store.subscribeAll(handler);
  }
  /**
   * Unsubscribe from an event
   */
  off(eventType, handler) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }
  // ============================================================================
  // Rendering
  // ============================================================================
  /**
   * Manually trigger a render
   */
  render() {
    const state = this.getState();
    if (this.renderers?.renderBoard) {
      this.renderers.renderBoard(this.container, state);
    } else {
      this.defaultRender(state);
    }
  }
  /**
   * Default render implementation
   */
  defaultRender(state) {
    this.container.innerHTML = "";
    const boardEl = document.createElement("div");
    boardEl.className = "board";
    boardEl.setAttribute("data-board-id", state.board?.id || "");
    if (state.board) {
      const titleEl = document.createElement("h1");
      titleEl.className = "board-title";
      titleEl.textContent = state.board.title;
      boardEl.appendChild(titleEl);
    }
    const columnsEl = document.createElement("div");
    columnsEl.className = "columns";
    const columns = this.getColumns();
    columns.forEach((column) => {
      const columnEl = this.renderColumnElement(column);
      columnsEl.appendChild(columnEl);
    });
    boardEl.appendChild(columnsEl);
    this.container.appendChild(boardEl);
  }
  /**
   * Render a column element
   */
  renderColumnElement(column) {
    const columnEl = document.createElement("div");
    columnEl.className = "column";
    columnEl.setAttribute("data-column-id", column.id);
    const headerEl = document.createElement("div");
    headerEl.className = "column-header";
    const titleEl = document.createElement("h2");
    titleEl.textContent = column.title;
    headerEl.appendChild(titleEl);
    const countEl = document.createElement("span");
    countEl.className = "card-count";
    countEl.textContent = `${column.cardIds.length}`;
    headerEl.appendChild(countEl);
    columnEl.appendChild(headerEl);
    const cardsEl = document.createElement("div");
    cardsEl.className = "cards";
    const cards = this.getCardsByColumn(column.id);
    cards.forEach((card) => {
      const cardEl = this.renderCardElement(card);
      cardsEl.appendChild(cardEl);
    });
    columnEl.appendChild(cardsEl);
    return columnEl;
  }
  /**
   * Render a card element
   */
  renderCardElement(card) {
    if (this.renderers?.renderCard) {
      const cardEl2 = document.createElement("div");
      this.renderers.renderCard(cardEl2, card);
      return cardEl2;
    }
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.setAttribute("data-card-id", card.id);
    const titleEl = document.createElement("h3");
    titleEl.textContent = card.title;
    cardEl.appendChild(titleEl);
    if (card.description) {
      const descEl = document.createElement("p");
      descEl.textContent = card.description;
      cardEl.appendChild(descEl);
    }
    if (card.priority) {
      const priorityEl = document.createElement("span");
      priorityEl.className = `priority priority-${card.priority.toLowerCase()}`;
      priorityEl.textContent = card.priority;
      cardEl.appendChild(priorityEl);
    }
    return cardEl;
  }
  /**
   * Handle state changes
   */
  handleStateChange(_event) {
    if (this.autoRender) {
      this.render();
    }
  }
  /**
   * Destroy the controller and cleanup
   */
  destroy() {
    this.eventListeners.clear();
    this.container.innerHTML = "";
  }
};

// src/gantt/DependencyEngine.ts
var DependencyEngine2 = class {
  /**
   * Initialize engine with card data
   */
  constructor(cards) {
    this.cards = /* @__PURE__ */ new Map();
    this.adjacencyList = /* @__PURE__ */ new Map();
    this.reverseAdjacencyList = /* @__PURE__ */ new Map();
    if (cards) {
      this.setCards(cards);
    }
  }
  /**
   * Update cards in the engine
   */
  setCards(cards) {
    this.cards.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    cards.forEach((card) => {
      this.cards.set(card.id, card);
      this.adjacencyList.set(card.id, /* @__PURE__ */ new Set());
      this.reverseAdjacencyList.set(card.id, /* @__PURE__ */ new Set());
    });
    cards.forEach((card) => {
      if (card.dependencies) {
        card.dependencies.forEach((dep) => {
          this.adjacencyList.get(dep.taskId)?.add(card.id);
          this.reverseAdjacencyList.get(card.id)?.add(dep.taskId);
        });
      }
    });
  }
  /**
   * Validate dependencies
   * Checks for:
   * - Circular dependencies (cycles)
   * - Invalid task IDs
   * - Self-dependencies
   */
  validateDependencies() {
    const errors = [];
    const circularDependencies = [];
    const invalidTaskIds = [];
    this.cards.forEach((card, cardId) => {
      if (card.dependencies) {
        card.dependencies.forEach((dep) => {
          if (!this.cards.has(dep.taskId)) {
            invalidTaskIds.push(dep.taskId);
            errors.push(`Card ${cardId} depends on non-existent task ${dep.taskId}`);
          }
          if (dep.taskId === cardId) {
            errors.push(`Card ${cardId} has self-dependency`);
          }
        });
      }
    });
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const path = [];
    const detectCycle = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      const neighbors = this.adjacencyList.get(nodeId) || /* @__PURE__ */ new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          circularDependencies.push([...cycle, neighbor]);
          errors.push(`Circular dependency detected: ${cycle.join(" -> ")} -> ${neighbor}`);
          return true;
        }
      }
      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };
    for (const cardId of this.cards.keys()) {
      if (!visited.has(cardId)) {
        detectCycle(cardId);
      }
    }
    return {
      isValid: errors.length === 0,
      circularDependencies,
      invalidTaskIds: Array.from(new Set(invalidTaskIds)),
      errors
    };
  }
  /**
   * Topological sort using Kahn's algorithm
   * Returns tasks in dependency order (tasks with no dependencies first)
   */
  topologicalSort() {
    const inDegree = /* @__PURE__ */ new Map();
    const queue = [];
    const result = [];
    this.cards.forEach((_, cardId) => {
      const deps = this.reverseAdjacencyList.get(cardId) || /* @__PURE__ */ new Set();
      inDegree.set(cardId, deps.size);
      if (deps.size === 0) {
        queue.push(cardId);
      }
    });
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);
      const dependents = this.adjacencyList.get(current) || /* @__PURE__ */ new Set();
      dependents.forEach((dependent) => {
        const degree = inDegree.get(dependent);
        inDegree.set(dependent, degree - 1);
        if (degree - 1 === 0) {
          queue.push(dependent);
        }
      });
    }
    return result;
  }
  /**
   * Calculate scheduled tasks using Critical Path Method (CPM)
   * Performs forward and backward pass to calculate early/late dates and floats
   */
  calculateSchedule(options) {
    const validation = this.validateDependencies();
    if (!validation.isValid) {
      throw new Error(`Invalid dependencies: ${validation.errors.join(", ")}`);
    }
    const scheduled = /* @__PURE__ */ new Map();
    const sorted = this.topologicalSort();
    const projectStartDate = options?.projectStartDate || /* @__PURE__ */ new Date();
    const workingHoursPerDay = options?.workingHoursPerDay || 8;
    sorted.forEach((cardId) => {
      const card = this.cards.get(cardId);
      const predecessors = Array.from(this.reverseAdjacencyList.get(cardId) || /* @__PURE__ */ new Set());
      let earlyStart = new Date(projectStartDate);
      if (predecessors.length > 0) {
        const latestPredecessorFinish = Math.max(
          ...predecessors.map((predId) => {
            const pred = scheduled.get(predId);
            if (!pred) return projectStartDate.getTime();
            const dep = card.dependencies?.find((d) => d.taskId === predId);
            const lag = (dep?.lag || 0) * 24 * 60 * 60 * 1e3;
            return pred.earlyFinish.getTime() + lag;
          })
        );
        earlyStart = new Date(latestPredecessorFinish);
      }
      const duration = this.getTaskDuration(card, workingHoursPerDay);
      const earlyFinish = new Date(earlyStart.getTime() + duration * 24 * 60 * 60 * 1e3);
      scheduled.set(cardId, {
        cardId,
        earlyStart,
        earlyFinish,
        lateStart: earlyStart,
        // Will be updated in backward pass
        lateFinish: earlyFinish,
        // Will be updated in backward pass
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
        predecessors,
        successors: Array.from(this.adjacencyList.get(cardId) || /* @__PURE__ */ new Set())
      });
    });
    const projectEndDate = new Date(
      Math.max(...Array.from(scheduled.values()).map((s) => s.earlyFinish.getTime()))
    );
    const reversedSorted = [...sorted].reverse();
    reversedSorted.forEach((cardId) => {
      const task = scheduled.get(cardId);
      const successors = this.adjacencyList.get(cardId) || /* @__PURE__ */ new Set();
      let lateFinish = new Date(projectEndDate);
      if (successors.size > 0) {
        const earliestSuccessorStart = Math.min(
          ...Array.from(successors).map((succId) => {
            const succ = scheduled.get(succId);
            if (!succ) return projectEndDate.getTime();
            const succCard = this.cards.get(succId);
            const dep = succCard.dependencies?.find((d) => d.taskId === cardId);
            const lag = (dep?.lag || 0) * 24 * 60 * 60 * 1e3;
            return succ.lateStart.getTime() - lag;
          })
        );
        lateFinish = new Date(earliestSuccessorStart);
      }
      const duration = task.earlyFinish.getTime() - task.earlyStart.getTime();
      const lateStart = new Date(lateFinish.getTime() - duration);
      const totalFloat = (lateStart.getTime() - task.earlyStart.getTime()) / (24 * 60 * 60 * 1e3);
      let freeFloat = 0;
      if (successors.size > 0) {
        const earliestSuccStart = Math.min(
          ...Array.from(successors).map((succId) => scheduled.get(succId).earlyStart.getTime())
        );
        freeFloat = (earliestSuccStart - task.earlyFinish.getTime()) / (24 * 60 * 60 * 1e3);
      }
      scheduled.set(cardId, {
        ...task,
        lateStart,
        lateFinish,
        totalFloat: Math.max(0, Math.round(totalFloat * 10) / 10),
        freeFloat: Math.max(0, Math.round(freeFloat * 10) / 10),
        isCritical: totalFloat <= 0.1
        // Critical if float is near zero
      });
    });
    return scheduled;
  }
  /**
   * Find critical path through the project
   */
  findCriticalPath() {
    const scheduled = this.calculateSchedule();
    const criticalTasks = Array.from(scheduled.values()).filter((task) => task.isCritical).sort((a, b) => a.earlyStart.getTime() - b.earlyStart.getTime());
    const cardIds = criticalTasks.map((task) => task.cardId);
    const duration = criticalTasks.reduce((sum, task) => {
      const durationMs = task.earlyFinish.getTime() - task.earlyStart.getTime();
      return sum + durationMs / (24 * 60 * 60 * 1e3);
    }, 0);
    const hasDelays = criticalTasks.some((task) => {
      const card = this.cards.get(task.cardId);
      return card?.endDate && new Date(card.endDate) < task.earlyFinish;
    });
    return {
      cardIds,
      duration: Math.round(duration * 10) / 10,
      hasDelays,
      totalSlack: 0
      // Critical path has zero slack
    };
  }
  /**
   * Get task duration in days
   */
  getTaskDuration(card, workingHoursPerDay) {
    if (card.startDate && card.endDate) {
      const start = new Date(card.startDate);
      const end = new Date(card.endDate);
      const diffMs = end.getTime() - start.getTime();
      return Math.ceil(diffMs / (24 * 60 * 60 * 1e3));
    }
    if (card.estimatedTime) {
      return Math.ceil(card.estimatedTime / workingHoursPerDay);
    }
    return 1;
  }
  /**
   * Check if a task can start given its dependencies
   */
  canTaskStart(cardId, currentDate = /* @__PURE__ */ new Date()) {
    const card = this.cards.get(cardId);
    if (!card || !card.dependencies || card.dependencies.length === 0) {
      return true;
    }
    return card.dependencies.every((dep) => {
      const depCard = this.cards.get(dep.taskId);
      if (!depCard) return false;
      switch (dep.type) {
        case "finish-to-start":
          return depCard.progress === 100 || depCard.endDate && new Date(depCard.endDate) <= currentDate;
        case "start-to-start":
          return depCard.progress !== void 0 && depCard.progress > 0;
        case "finish-to-finish":
        case "start-to-finish":
          return true;
        default:
          return false;
      }
    });
  }
  /**
   * Get all predecessors of a task (tasks it depends on)
   */
  getPredecessors(cardId) {
    return Array.from(this.reverseAdjacencyList.get(cardId) || /* @__PURE__ */ new Set());
  }
  /**
   * Get all successors of a task (tasks that depend on it)
   */
  getSuccessors(cardId) {
    return Array.from(this.adjacencyList.get(cardId) || /* @__PURE__ */ new Set());
  }
  /**
   * Add a dependency between two tasks
   * @param fromCardId - Task that others depend on
   * @param toCardId - Task that depends on fromCard
   */
  addDependency(fromCardId, toCardId) {
    if (!this.cards.has(fromCardId) || !this.cards.has(toCardId)) {
      return false;
    }
    const tempAdjList = new Map(this.adjacencyList);
    const tempSet = new Set(tempAdjList.get(fromCardId) || []);
    tempSet.add(toCardId);
    tempAdjList.set(fromCardId, tempSet);
    if (this.hasPath(toCardId, fromCardId, tempAdjList)) {
      return false;
    }
    this.adjacencyList.get(fromCardId)?.add(toCardId);
    this.reverseAdjacencyList.get(toCardId)?.add(fromCardId);
    return true;
  }
  /**
   * Remove a dependency between two tasks
   */
  removeDependency(fromCardId, toCardId) {
    const removed1 = this.adjacencyList.get(fromCardId)?.delete(toCardId) || false;
    const removed2 = this.reverseAdjacencyList.get(toCardId)?.delete(fromCardId) || false;
    return removed1 && removed2;
  }
  /**
   * Check if there's a path from source to target
   */
  hasPath(source, target, adjacencyList) {
    if (source === target) return true;
    const visited = /* @__PURE__ */ new Set();
    const queue = [source];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === target) return true;
      visited.add(current);
      const neighbors = adjacencyList.get(current) || /* @__PURE__ */ new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    return false;
  }
};

export { AsakaaRuntime, BaseSerializer, BaseViewAdapter, BinarySerializer, Board, BoardController, BoardStore, Card, Column, DependencyEngine2 as DependencyEngine, DragStore, JSONSerializer, PluginRegistry, SelectionStore, SerializerRegistry, Store, ViewRegistry, createBinarySerializer, createJSONSerializer, dragStore, selectionStore, serializerRegistry };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map