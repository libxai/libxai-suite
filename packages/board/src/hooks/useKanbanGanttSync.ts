/**
 * useKanbanGanttSync - Bidirectional synchronization between Kanban and Gantt
 *
 * This hook provides seamless synchronization between Card (Kanban) and Task (Gantt) entities,
 * ensuring changes in one view are automatically reflected in the other.
 *
 * @example
 * ```tsx
 * const { cards, tasks, updateCard, updateTask } = useKanbanGanttSync({
 *   initialCards: myCards,
 *   onCardsChange: setCards,
 *   onTasksChange: setTasks
 * });
 *
 * // Use 'cards' for KanbanBoard
 * <KanbanBoard cards={cards} onCardUpdate={updateCard} />
 *
 * // Use 'tasks' for GanttBoard
 * <GanttBoard tasks={tasks} onTasksChange={updateTask} />
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import type { Card } from '../types';
import type { Task } from '../components/Gantt/types';

export interface UseKanbanGanttSyncOptions {
  /** Initial cards data (from Kanban) */
  initialCards?: Card[];
  /** Initial tasks data (from Gantt) */
  initialTasks?: Task[];
  /** Callback when cards change */
  onCardsChange?: (cards: Card[]) => void;
  /** Callback when tasks change */
  onTasksChange?: (tasks: Task[]) => void;
  /** Enable auto-sync (default: true) */
  autoSync?: boolean;
}

export interface UseKanbanGanttSyncReturn {
  /** Synchronized cards for Kanban */
  cards: Card[];
  /** Synchronized tasks for Gantt */
  tasks: Task[];
  /** Update a single card (syncs to tasks) */
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  /** Update multiple cards (syncs to tasks) */
  updateCards: (cards: Card[]) => void;
  /** Update a single task (syncs to cards) */
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  /** Update multiple tasks (syncs to cards) */
  updateTasks: (tasks: Task[]) => void;
  /** Force a manual sync */
  forceSync: () => void;
}

/**
 * Convert Card to Task (Kanban → Gantt)
 */
export function cardToTask(card: Card): Task {
  // Parse dates (handle both Date objects and strings)
  const parseDate = (date: Date | string | undefined): Date | undefined => {
    if (!date) return undefined;
    return date instanceof Date ? date : new Date(date);
  };

  return {
    id: card.id,
    name: card.title,
    startDate: parseDate(card.startDate) || parseDate(card.dueDate),
    endDate: parseDate(card.endDate) || parseDate(card.dueDate),
    progress: card.progress || 0,

    // Map assignees
    assignees: card.assignedUserIds?.map(userId => ({
      name: userId, // In real app, lookup user name
      initials: userId.substring(0, 2).toUpperCase(),
      color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Generate color
    })),

    // Map status (Kanban column → Task status)
    status: mapCardStatusToTaskStatus(card.columnId),

    // Dependencies (both formats supported)
    dependencies: Array.isArray(card.dependencies)
      ? card.dependencies.map(dep => typeof dep === 'string' ? dep : dep.taskId)
      : undefined,

    // Additional metadata
    isMilestone: card.labels?.includes('milestone') || false,
    isCriticalPath: card.priority === 'URGENT',
  };
}

/**
 * Convert Task to Card (Gantt → Kanban)
 */
export function taskToCard(task: Task, defaultColumnId: string = 'todo'): Card {
  // Determine column ID based on task status
  const columnId = mapTaskStatusToColumnId(task.status) || defaultColumnId;

  return {
    id: task.id,
    title: task.name,
    position: task.position || 0,
    columnId,

    // Map dates
    startDate: task.startDate,
    endDate: task.endDate,
    dueDate: task.endDate, // For backward compatibility

    // Map progress
    progress: task.progress,

    // Map assignees
    assignedUserIds: task.assignees?.map(a => a.name) || [],

    // Map dependencies
    dependencies: task.dependencies,

    // Map priority (from critical path)
    priority: task.isCriticalPath ? 'URGENT' : 'MEDIUM',

    // Map labels
    labels: [
      ...(task.isMilestone ? ['milestone'] : []),
      ...(task.isCriticalPath ? ['critical-path'] : []),
    ],
  };
}

/**
 * Map Kanban column ID to Task status
 */
function mapCardStatusToTaskStatus(columnId: string): 'todo' | 'in-progress' | 'completed' | undefined {
  const normalized = columnId.toLowerCase();
  if (normalized.includes('done') || normalized.includes('complete')) return 'completed';
  if (normalized.includes('progress') || normalized.includes('doing')) return 'in-progress';
  if (normalized.includes('todo') || normalized.includes('backlog')) return 'todo';
  return undefined;
}

/**
 * Map Task status to Kanban column ID
 */
function mapTaskStatusToColumnId(status?: 'todo' | 'in-progress' | 'completed'): string | undefined {
  switch (status) {
    case 'todo': return 'todo';
    case 'in-progress': return 'in-progress';
    case 'completed': return 'done';
    default: return undefined;
  }
}

/**
 * Convert array of Cards to Tasks
 */
export function cardsToTasks(cards: Card[]): Task[] {
  return cards.map(cardToTask);
}

/**
 * Convert array of Tasks to Cards
 */
export function tasksToCards(tasks: Task[], defaultColumnId?: string): Card[] {
  return tasks.map(task => taskToCard(task, defaultColumnId));
}

/**
 * Hook for Kanban-Gantt synchronization
 */
export function useKanbanGanttSync(options: UseKanbanGanttSyncOptions = {}): UseKanbanGanttSyncReturn {
  const {
    initialCards = [],
    initialTasks = [],
    onCardsChange,
    onTasksChange,
    autoSync = true,
  } = options;

  // Determine initial source (cards take precedence if both provided)
  const [cards, setCards] = useState<Card[]>(() => {
    if (initialCards.length > 0) return initialCards;
    if (initialTasks.length > 0) return tasksToCards(initialTasks);
    return [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (initialCards.length > 0) return cardsToTasks(initialCards);
    if (initialTasks.length > 0) return initialTasks;
    return [];
  });

  // Track which entity was last updated to prevent sync loops
  const [lastUpdated, setLastUpdated] = useState<'cards' | 'tasks' | null>(null);

  // Sync cards → tasks
  useEffect(() => {
    if (!autoSync || lastUpdated !== 'cards') return;

    const syncedTasks = cardsToTasks(cards);
    setTasks(syncedTasks);
    onTasksChange?.(syncedTasks);
    setLastUpdated(null); // Reset
  }, [cards, autoSync, lastUpdated, onTasksChange]);

  // Sync tasks → cards
  useEffect(() => {
    if (!autoSync || lastUpdated !== 'tasks') return;

    const syncedCards = tasksToCards(tasks);
    setCards(syncedCards);
    onCardsChange?.(syncedCards);
    setLastUpdated(null); // Reset
  }, [tasks, autoSync, lastUpdated, onCardsChange]);

  // Update single card
  const updateCard = useCallback((cardId: string, updates: Partial<Card>) => {
    setCards(prevCards => {
      const newCards = prevCards.map(card =>
        card.id === cardId ? { ...card, ...updates } : card
      );
      setLastUpdated('cards');
      return newCards;
    });
  }, []);

  // Update multiple cards
  const updateCards = useCallback((newCards: Card[]) => {
    setCards(newCards);
    setLastUpdated('cards');
  }, []);

  // Update single task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      setLastUpdated('tasks');
      return newTasks;
    });
  }, []);

  // Update multiple tasks
  const updateTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    setLastUpdated('tasks');
  }, []);

  // Force manual sync
  const forceSync = useCallback(() => {
    const syncedTasks = cardsToTasks(cards);
    setTasks(syncedTasks);
    onTasksChange?.(syncedTasks);
  }, [cards, onTasksChange]);

  return {
    cards,
    tasks,
    updateCard,
    updateCards,
    updateTask,
    updateTasks,
    forceSync,
  };
}
