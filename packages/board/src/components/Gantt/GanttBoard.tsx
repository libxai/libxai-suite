import { useState, useRef, useEffect, useCallback, useMemo, useContext, forwardRef, useImperativeHandle } from 'react';
import { Task, TimeScale, Theme, GanttConfig, GanttColumn, ColumnType, RowDensity } from './types';
import { deriveThemeFromCSS } from './deriveThemeFromCSS';
import { GanttToolbar } from './GanttToolbar';
import { TaskGrid } from './TaskGrid';
import { Timeline } from './Timeline';
import { ContextMenu, MenuIcons } from './ContextMenu'; // v0.8.0: Split task context menu
import { TaskFormModal } from './TaskFormModal'; // v0.10.0: Task edit modal
import { motion } from 'framer-motion';
import { useUndoRedo } from './useUndoRedo';
import { useGanttUndoRedoKeys } from './useGanttUndoRedoKeys';
import { ThemeContext } from '../../theme/ThemeProvider';
import { GanttThemeContext } from './GanttThemeContext';
import { GanttBoardRef } from './GanttBoardRef';
import { ganttUtils } from './ganttUtils';
import { mergeTemplates } from './defaultTemplates';
import html2canvas from 'html2canvas';
import {
  indentTasks,
  outdentTasks,
  moveTasks,
  deleteTasks,
  duplicateTasks,
  createTask,
  renameTask,
  toggleTaskExpansion,
  createSubtask,
} from './hierarchyUtils';

interface GanttBoardProps {
  tasks: Task[];
  config?: GanttConfig;
  onTasksChange?: (tasks: Task[]) => void;
}

// Utility function to get row height based on density
const getRowHeight = (density: RowDensity): number => {
  switch (density) {
    case 'compact':
      return 40;
    case 'comfortable':
      return 48;
    case 'spacious':
      return 56;
    default:
      return 48;
  }
};

export const GanttBoard = forwardRef<GanttBoardRef, GanttBoardProps>(function GanttBoard(
  { tasks, config = {}, onTasksChange },
  ref
) {
  const {
    theme: initialTheme,
    timeScale: initialTimeScale = 'week',
    rowDensity: initialRowDensity = 'comfortable',
    showThemeSelector = true,
    showExportButton = true, // v0.12.0: Show export dropdown in toolbar
    availableUsers = [],
    templates,
    enableAutoCriticalPath = true, // v0.11.1: Allow disabling automatic CPM calculation
    // UI events
    onThemeChange, // v0.9.0
    // Basic events
    onTaskClick,
    onTaskDblClick, // v0.8.0
    onTaskContextMenu, // v0.8.0
    onTaskUpdate,
    onProgressChange, // v0.8.0
    // Dependency events
    onDependencyCreate,
    onDependencyDelete,
    // Lifecycle events (v0.8.0)
    onBeforeTaskAdd,
    onAfterTaskAdd,
    onBeforeTaskUpdate,
    onAfterTaskUpdate,
  } = config;

  // Try to get global theme from ThemeProvider (will return undefined if not in ThemeProvider)
  const themeContext = useContext(ThemeContext);
  const globalTheme = themeContext?.theme as Theme | undefined;

  // Use global theme if available, otherwise fall back to initialTheme or 'dark'
  const [currentTheme, setCurrentTheme] = useState<Theme>(globalTheme || initialTheme || 'dark');

  const [timeScale, setTimeScale] = useState<TimeScale>(initialTimeScale);
  const [rowDensity, setRowDensity] = useState<RowDensity>(initialRowDensity);
  const [zoom, setZoom] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const [gridWidthOverride, setGridWidthOverride] = useState<number | null>(null);

  // v0.8.0: Context menu state for Split task feature
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; task: Task | null }>({
    isOpen: false,
    x: 0,
    y: 0,
    task: null,
  });

  // v0.10.0: Task form modal state for editing
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Sync with global theme changes (from ThemeContext)
  useEffect(() => {
    if (globalTheme && globalTheme !== currentTheme) {
      setCurrentTheme(globalTheme);
    }
  }, [globalTheme]);

  // v0.11.6: Sync with initialTheme prop changes (for external theme control)
  useEffect(() => {
    if (initialTheme && initialTheme !== currentTheme) {
      setCurrentTheme(initialTheme);
    }
  }, [initialTheme]);

  // v0.9.0: Handle theme change with callback
  const handleThemeChange = useCallback(
    (newTheme: Theme) => {
      setCurrentTheme(newTheme);
      onThemeChange?.(newTheme);
    },
    [onThemeChange]
  );

  // Use undo/redo hook for task management
  const {
    state: localTasks,
    setState: setLocalTasks,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  } = useUndoRedo<Task[]>(tasks, 50);

  // Sync parent tasks prop changes to local state (e.g., after external DB operations)
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks, setLocalTasks]);

  // Sync local tasks with parent when they change
  useEffect(() => {
    if (onTasksChange) {
      onTasksChange(localTasks);
    }
  }, [localTasks, onTasksChange]);

  // Column configuration - Default: Only show task name
  const [columns, setColumns] = useState<GanttColumn[]>([
    { id: 'name', label: 'TASK NAME', width: 240, visible: true, sortable: true },
    { id: 'startDate', label: 'Start Date', width: 110, visible: false, sortable: true },
    { id: 'endDate', label: 'End Date', width: 110, visible: false, sortable: true },
    { id: 'duration', label: 'Duration', width: 80, visible: false, sortable: true },
    { id: 'assignees', label: 'Assignees', width: 120, visible: false, sortable: false },
    { id: 'status', label: 'Status', width: 80, visible: false, sortable: true },
    { id: 'progress', label: '% Complete', width: 120, visible: false, sortable: true },
  ]);

  // Calculate grid width based on visible columns (memoized)
  const calculatedGridWidth = useMemo(() =>
    columns
      .filter(col => col.visible)
      .reduce((sum, col) => sum + col.width, 0) + 60, // +60 for add button and padding
    [columns]
  );

  const gridWidth = gridWidthOverride || calculatedGridWidth;

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  // Derivar theme desde CSS variables si hay ThemeProvider, sino usar theme estático
  const theme = useMemo(() => {
    return deriveThemeFromCSS(currentTheme);
  }, [currentTheme]);

  // Crear valor del contexto del tema para componentes hijos (Portal, etc.)
  const ganttThemeContextValue = useMemo(() => ({
    theme,
    themeName: currentTheme,
  }), [theme, currentTheme]);

  // Merge user templates with defaults
  const mergedTemplates = useMemo(() => {
    return mergeTemplates(templates);
  }, [templates]);

  // 🚀 KILLER FEATURE #1: Calculate Critical Path (auto-updates when tasks change)
  // This is BETTER than DHTMLX - we recalculate CPM automatically on every change
  // v0.11.1: Can be disabled via enableAutoCriticalPath prop to preserve custom colors
  const tasksWithCriticalPath = useMemo(() => {
    // If auto critical path is disabled, return tasks as-is (preserve custom colors)
    if (!enableAutoCriticalPath) {
      return localTasks;
    }

    const criticalPathIds = ganttUtils.calculateCriticalPath(localTasks);

    const markCritical = (tasks: Task[]): Task[] => {
      return tasks.map(task => ({
        ...task,
        isCriticalPath: criticalPathIds.includes(task.id),
        subtasks: task.subtasks ? markCritical(task.subtasks) : undefined,
      }));
    };

    return markCritical(localTasks);
  }, [localTasks, enableAutoCriticalPath]);

  // Calculate row height based on density
  const rowHeight = getRowHeight(rowDensity);

  // Enable undo/redo keyboard shortcuts
  useGanttUndoRedoKeys({
    undo,
    redo,
    canUndo,
    canRedo,
    enabled: true,
  });

  // Expose imperative API via ref (similar to DHTMLX gantt.* methods)
  useImperativeHandle(ref, () => ({
    // ==================== CRUD Methods ====================
    getTask: (id: string) => ganttUtils.findTaskById(localTasks, id),

    addTask: (task: Task, parentId?: string) => {
      setLocalTasks((prev) => {
        if (!parentId) {
          // Add as root-level task
          return [...prev, { ...task, level: 0 }];
        }

        // Add as subtask
        const addToParent = (tasks: Task[]): Task[] => {
          return tasks.map((t) => {
            if (t.id === parentId) {
              return {
                ...t,
                subtasks: [...(t.subtasks || []), { ...task, parentId, level: (t.level || 0) + 1 }],
                isExpanded: true,
              };
            }
            if (t.subtasks) {
              return { ...t, subtasks: addToParent(t.subtasks) };
            }
            return t;
          });
        };
        return addToParent(prev);
      });
    },

    updateTask: (id: string, updates: Partial<Task>) => {
      setLocalTasks((prev) => {
        const update = (tasks: Task[]): Task[] => {
          return tasks.map((task) => {
            if (task.id === id) {
              return { ...task, ...updates };
            }
            if (task.subtasks) {
              return { ...task, subtasks: update(task.subtasks) };
            }
            return task;
          });
        };
        return update(prev);
      });
    },

    deleteTask: (id: string) => {
      setLocalTasks((prev) => {
        const remove = (tasks: Task[]): Task[] => {
          return tasks.filter((task) => {
            if (task.id === id) return false;
            if (task.subtasks) {
              task.subtasks = remove(task.subtasks);
            }
            return true;
          });
        };
        return remove(prev);
      });
    },

    deleteTasks: (ids: string[]) => {
      setLocalTasks((prev) => deleteTasks(prev, ids));
    },

    duplicateTask: (id: string) => {
      setLocalTasks((prev) => duplicateTasks(prev, [id]));
    },

    // v0.8.1: Split task feature (creates GAP like Bryntum)
    splitTask: (id: string, splitDate: Date, gapDays = 3) => {
      setLocalTasks((prev) => ganttUtils.splitTask(prev, id, splitDate, gapDays));
    },

    // ==================== Utility Methods ====================
    calculateEndDate: ganttUtils.calculateEndDate,
    calculateDuration: ganttUtils.calculateDuration,
    validateDependency: (fromTaskId: string, toTaskId: string) => {
      return !ganttUtils.validateDependencies(localTasks, fromTaskId, toTaskId);
    },

    // ==================== Data Methods ====================
    getAllTasks: () => ganttUtils.flattenTasks(localTasks),

    getTasksByStatus: (status: 'todo' | 'in-progress' | 'completed') => {
      return ganttUtils.flattenTasks(localTasks).filter((t) => t.status === status);
    },

    getTasksByParent: (parentId?: string) => {
      if (!parentId) {
        // Return root-level tasks
        return localTasks.filter((t) => !t.parentId);
      }
      const parent = ganttUtils.findTaskById(localTasks, parentId);
      return parent?.subtasks || [];
    },

    getCriticalPath: () => {
      return ganttUtils.flattenTasks(localTasks).filter((t) => t.isCriticalPath);
    },

    // ==================== Hierarchy Methods ====================
    indentTask: (taskId: string) => {
      setLocalTasks((prev) => indentTasks(prev, [taskId]));
    },

    outdentTask: (taskId: string) => {
      setLocalTasks((prev) => outdentTasks(prev, [taskId]));
    },

    moveTask: (taskId: string, direction: 'up' | 'down') => {
      setLocalTasks((prev) => moveTasks(prev, [taskId], direction));
    },

    createSubtask: async (parentId: string) => {
      // Create subtask first
      const { tasks: newTasks, newTask } = createSubtask(localTasks, parentId);

      // v0.8.0: Before event (cancelable, supports async)
      if (onBeforeTaskAdd) {
        const result = onBeforeTaskAdd({ ...newTask, parentId });
        // Handle both sync and async callbacks
        const shouldContinue = result instanceof Promise ? await result : result;
        if (shouldContinue === false) {
          return; // Cancel creation
        }
      }

      // Only update state if not cancelled
      setLocalTasks(newTasks);

      // v0.8.0: After event (non-cancelable)
      if (onAfterTaskAdd) {
        onAfterTaskAdd({ ...newTask, parentId });
      }
    },

    // ==================== UI Methods ====================
    scrollToTask: (id: string) => {
      // Find task index in flattened list
      const flatTasks = ganttUtils.flattenTasks(localTasks);
      const index = flatTasks.findIndex((t) => t.id === id);

      if (index !== -1 && gridScrollRef.current) {
        const scrollTop = index * rowHeight;
        gridScrollRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
        if (timelineScrollRef.current) {
          timelineScrollRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    },

    highlightTask: (id: string, duration = 2000) => {
      // TODO: Implement visual highlighting - currently a no-op
      void id;
      void duration;
    },

    expandTask: (id: string) => {
      setLocalTasks((prev) => {
        const expand = (tasks: Task[]): Task[] => {
          return tasks.map((task) => {
            if (task.id === id) {
              return { ...task, isExpanded: true };
            }
            if (task.subtasks) {
              return { ...task, subtasks: expand(task.subtasks) };
            }
            return task;
          });
        };
        return expand(prev);
      });
    },

    collapseTask: (id: string) => {
      setLocalTasks((prev) => {
        const collapse = (tasks: Task[]): Task[] => {
          return tasks.map((task) => {
            if (task.id === id) {
              return { ...task, isExpanded: false };
            }
            if (task.subtasks) {
              return { ...task, subtasks: collapse(task.subtasks) };
            }
            return task;
          });
        };
        return collapse(prev);
      });
    },

    expandAll: () => {
      setLocalTasks((prev) => {
        const expandAll = (tasks: Task[]): Task[] => {
          return tasks.map((task) => ({
            ...task,
            isExpanded: true,
            subtasks: task.subtasks ? expandAll(task.subtasks) : undefined,
          }));
        };
        return expandAll(prev);
      });
    },

    collapseAll: () => {
      setLocalTasks((prev) => {
        const collapseAll = (tasks: Task[]): Task[] => {
          return tasks.map((task) => ({
            ...task,
            isExpanded: false,
            subtasks: task.subtasks ? collapseAll(task.subtasks) : undefined,
          }));
        };
        return collapseAll(prev);
      });
    },

    // ==================== Undo/Redo ====================
    undo,
    redo,
    canUndo: () => canUndo,
    canRedo: () => canRedo,
    clearHistory,

    // ==================== Export/Import ====================
    exportToPNG: async () => {
      if (!ganttContainerRef.current) {
        throw new Error('Gantt container not found');
      }

      const canvas = await html2canvas(ganttContainerRef.current, {
        backgroundColor: theme.bgPrimary,
        scale: 2, // Higher quality
      });

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
      });
    },

    exportToPDF: async (filename?: string) => {
      await ganttUtils.exportToPDF(localTasks, filename);
    },

    exportToExcel: async (filename?: string) => {
      await ganttUtils.exportToExcel(localTasks, filename);
    },

    exportToJSON: () => ganttUtils.exportToJSON(localTasks),
    exportToCSV: () => ganttUtils.exportToCSV(localTasks),

    importFromJSON: (json: string) => {
      const imported = ganttUtils.importFromJSON(json);
      setLocalTasks(imported);
    },

    // ==================== State Methods ====================
    getTasks: () => localTasks,

    refresh: () => {
      // Force re-render by creating a new reference
      setLocalTasks((prev) => [...prev]);
    },

    clearAll: () => {
      setLocalTasks([]);
    },
  }), [localTasks, undo, redo, canUndo, canRedo, clearHistory, theme, rowHeight]);

  // Handle column toggle (memoized)
  const handleToggleColumn = useCallback((columnId: ColumnType) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  // Handle task toggle (memoized)
  const handleTaskToggle = useCallback((taskId: string) => {
    setLocalTasks((prev) => toggleTaskExpansion(prev, taskId));
    config.onTaskToggleExpand?.(taskId);
  }, [config]);

  // Handle task updates from context menu (memoized)
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    // v0.8.0: Before event (cancelable)
    if (onBeforeTaskUpdate) {
      const shouldContinue = onBeforeTaskUpdate(taskId, updates);
      if (shouldContinue === false) {
        return; // Cancel the update
      }
    }

    // Find current task to detect progress change
    const currentTask = ganttUtils.findTaskById(localTasks, taskId);
    const oldProgress = currentTask?.progress;

    const updateTask = (tasks: Task[]): Task[] => {
      return tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, ...updates };
        }
        if (task.subtasks) {
          return { ...task, subtasks: updateTask(task.subtasks) };
        }
        return task;
      });
    };
    setLocalTasks(updateTask(localTasks));

    // Call callback events
    const updatedTask = ganttUtils.findTaskById(updateTask(localTasks), taskId);
    if (updatedTask) {
      onTaskUpdate?.(updatedTask);

      // v0.8.0: After event
      onAfterTaskUpdate?.(updatedTask);

      // v0.8.0: Progress change event
      if (updates.progress !== undefined && oldProgress !== undefined && updates.progress !== oldProgress) {
        onProgressChange?.(taskId, oldProgress, updates.progress);
      }
    }
  }, [localTasks, onTaskUpdate, onBeforeTaskUpdate, onAfterTaskUpdate, onProgressChange]);

  // Hierarchy handlers
  const handleTaskIndent = useCallback((taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setLocalTasks((prev) => indentTasks(prev, taskIds));
    config.onTaskIndent?.(taskIds[0]!);
  }, [config]);

  const handleTaskOutdent = useCallback((taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setLocalTasks((prev) => outdentTasks(prev, taskIds));
    config.onTaskOutdent?.(taskIds[0]!);
  }, [config]);

  const handleTaskMove = useCallback((taskIds: string[], direction: 'up' | 'down') => {
    if (taskIds.length === 0) return;
    setLocalTasks((prev) => moveTasks(prev, taskIds, direction));
    config.onTaskMove?.(taskIds[0]!, direction);
  }, [config]);

  const handleMultiTaskDelete = useCallback((taskIds: string[]) => {
    // Call the SaaS onMultiTaskDelete handler if provided
    if (config.onMultiTaskDelete) {
      config.onMultiTaskDelete(taskIds);
    } else {
      // Fallback: update local state and call individual delete handlers
      setLocalTasks((prev) => deleteTasks(prev, taskIds));
      taskIds.forEach(id => config.onTaskDelete?.(id));
    }
  }, [config]);

  const handleTaskDuplicate = useCallback((taskIds: string[]) => {
    setLocalTasks((prev) => duplicateTasks(prev, taskIds));
    taskIds.forEach(id => config.onTaskDuplicate?.(id));
  }, [config]);

  const handleTaskCreate = useCallback((afterTaskId: string, direction: 'above' | 'below') => {
    setLocalTasks((prev) => {
      const { tasks, newTask } = createTask(prev, afterTaskId, direction);

      // v0.8.0: Before event (cancelable)
      if (onBeforeTaskAdd) {
        const shouldContinue = onBeforeTaskAdd(newTask);
        if (shouldContinue === false) {
          return prev; // Cancel the addition, return unchanged tasks
        }
      }

      config.onTaskCreate?.(newTask.parentId, newTask.position || 0);

      // v0.8.0: After event
      onAfterTaskAdd?.(newTask);

      return tasks;
    });
  }, [config, onBeforeTaskAdd, onAfterTaskAdd]);

  const handleTaskRename = useCallback((taskId: string, newName: string) => {
    setLocalTasks((prev) => renameTask(prev, taskId, newName));
    config.onTaskRename?.(taskId, newName);
  }, [config]);

  const handleCreateSubtask = useCallback((parentTaskId: string) => {
    setLocalTasks((prev) => {
      const { tasks } = createSubtask(prev, parentTaskId);
      config.onTaskCreate?.(parentTaskId, 0);
      return tasks;
    });
  }, [config]);

  // 🚀 KILLER FEATURE #2: Handle task date changes WITH auto-scheduling
  // When you move a task, all dependent tasks are automatically rescheduled
  // This is BETTER than DHTMLX - they require manual configuration
  const handleTaskDateChange = useCallback((task: Task, newStart: Date, newEnd: Date) => {
    // v0.13.3: Calculate daysDelta to preserve relative gaps in cascade
    const daysDelta = task.startDate
      ? Math.round((newStart.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const updateTaskDates = (tasks: Task[]): Task[] => {
      return tasks.map((t) => {
        if (t.id === task.id) {
          // v0.8.1: Preserve segments array when updating task dates
          // This is critical for split tasks - we must keep the updated segments
          return {
            ...t,
            startDate: newStart,
            endDate: newEnd,
            ...(task.segments && { segments: task.segments }) // Preserve segments if they exist
          };
        }
        if (t.subtasks) {
          return { ...t, subtasks: updateTaskDates(t.subtasks) };
        }
        return t;
      });
    };

    // First, update the dragged task's dates
    let updatedTasks = updateTaskDates(localTasks);

    // Then, auto-schedule all dependent tasks (cascade effect)
    // v0.13.3: Pass daysDelta to preserve relative gaps between tasks
    updatedTasks = ganttUtils.autoScheduleDependents(updatedTasks, task.id, daysDelta);

    setLocalTasks(updatedTasks);

    // v0.8.1: Pass full updated task object including segments
    const updatedTask = { ...task, startDate: newStart, endDate: newEnd };
    onTaskUpdate?.(updatedTask);
  }, [localTasks, onTaskUpdate]);

  // 🚀 KILLER FEATURE #3: Handle context menu for Split task
  // This is BETTER than DHTMLX - they don't have a built-in split task feature
  const handleTaskContextMenu = useCallback((task: Task, event: React.MouseEvent) => {
    // Call user's custom handler if provided
    onTaskContextMenu?.(task, event);

    // Show our built-in context menu with Split option
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      task,
    });
  }, [onTaskContextMenu]);

  // Handle split task action
  const handleSplitTask = useCallback((task: Task, splitDate: Date) => {
    // Call ganttUtils.splitTask to split the task
    const updatedTasks = ganttUtils.splitTask(localTasks, task.id, splitDate);
    setLocalTasks(updatedTasks);

    // Close context menu
    setContextMenu({ isOpen: false, x: 0, y: 0, task: null });
  }, [localTasks]);

  // v0.10.0: Handle task double click - open edit modal
  const handleTaskDblClickInternal = useCallback((task: Task) => {
    // Call user's custom handler if provided
    onTaskDblClick?.(task);

    // Open built-in edit modal
    setEditingTask(task);
  }, [onTaskDblClick]);

  // Helper function to detect circular dependencies using DFS
  const wouldCreateCircularDependency = useCallback((fromTaskId: string, toTaskId: string, tasks: Task[]): boolean => {
    // Build dependency map
    const dependencyMap = new Map<string, string[]>();

    const buildMap = (taskList: Task[]) => {
      taskList.forEach(task => {
        if (task.dependencies) {
          dependencyMap.set(task.id, task.dependencies);
        }
        if (task.subtasks) {
          buildMap(task.subtasks);
        }
      });
    };

    buildMap(tasks);

    // Simulate adding the new dependency
    const existingDeps = dependencyMap.get(toTaskId) || [];
    dependencyMap.set(toTaskId, [...existingDeps, fromTaskId]);

    // DFS to detect cycle
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (!visited.has(taskId)) {
        visited.add(taskId);
        recStack.add(taskId);

        const deps = dependencyMap.get(taskId) || [];
        for (const depId of deps) {
          if (!visited.has(depId) && hasCycle(depId)) {
            return true;
          } else if (recStack.has(depId)) {
            return true;
          }
        }
      }
      recStack.delete(taskId);
      return false;
    };

    return hasCycle(toTaskId);
  }, []);

  // Handle dependency creation (memoized)
  const handleDependencyCreate = useCallback((fromTask: Task, toTaskId: string) => {
    // Check for circular dependency
    if (wouldCreateCircularDependency(fromTask.id, toTaskId, localTasks)) {
      // Show error feedback - you could integrate a toast notification here
      console.warn('Cannot create dependency: would create a circular dependency');
      alert('Cannot create this dependency: it would create a circular dependency chain.\n\nTask dependencies must flow in one direction only.');
      return;
    }

    const updateTaskDependencies = (tasks: Task[]): Task[] => {
      return tasks.map((t) => {
        if (t.id === toTaskId) {
          const dependencies = t.dependencies || [];
          // Avoid duplicate dependencies
          if (!dependencies.includes(fromTask.id)) {
            return { ...t, dependencies: [...dependencies, fromTask.id] };
          }
        }
        if (t.subtasks) {
          return { ...t, subtasks: updateTaskDependencies(t.subtasks) };
        }
        return t;
      });
    };
    setLocalTasks(updateTaskDependencies(localTasks));
    onDependencyCreate?.(fromTask.id, toTaskId);
  }, [localTasks, onDependencyCreate, wouldCreateCircularDependency]);

  // Handle dependency deletion (memoized)
  const handleDependencyDelete = useCallback((taskId: string, dependencyId: string) => {
    const removeTaskDependency = (tasks: Task[]): Task[] => {
      return tasks.map((t) => {
        if (t.id === taskId && t.dependencies) {
          const dependencies = t.dependencies.filter((depId) => depId !== dependencyId);
          return { ...t, dependencies };
        }
        if (t.subtasks) {
          return { ...t, subtasks: removeTaskDependency(t.subtasks) };
        }
        return t;
      });
    };
    setLocalTasks(removeTaskDependency(localTasks));
    onDependencyDelete?.(taskId, dependencyId);
  }, [localTasks, onDependencyDelete]);

  // Calculate date range (memoized)
  const { startDate, endDate } = useMemo(() => {
    // Filter tasks that have dates
    const tasksWithDates = localTasks.filter(t => t.startDate && t.endDate);

    if (tasksWithDates.length === 0) {
      // Default range if no tasks have dates
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const end = new Date(today);
      end.setDate(end.getDate() + 60);
      return { startDate: start, endDate: end };
    }

    const allDates = tasksWithDates.flatMap((t) => [t.startDate, t.endDate]).filter((d): d is Date => d !== undefined);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const padding = timeScale === 'day' ? 7 : timeScale === 'week' ? 14 : 30;
    minDate.setDate(minDate.getDate() - padding);
    maxDate.setDate(maxDate.getDate() + padding);

    return { startDate: minDate, endDate: maxDate };
  }, [localTasks, timeScale]);

  // Handlers (future implementation - currently unused but kept for future features)
  // TODO: Implement zoom controls in toolbar
  // const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  // const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));

  // TODO: Implement "Today" button in toolbar
  // const handleTodayClick = () => {
  //   if (timelineScrollRef.current) {
  //     const today = new Date();
  //     const dayWidth = timeScale === 'day' ? 60 : timeScale === 'week' ? 20 : 8;
  //     const daysFromStart = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  //     const scrollX = daysFromStart * dayWidth * zoom - 300;
  //     timelineScrollRef.current.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
  //   }
  // };

  // TODO: Implement add task functionality
  // const handleAddTask = () => {
  //   // Placeholder - implement in parent component if needed
  // };

  // v0.12.0: Export handlers for toolbar
  const handleExportPNG = useCallback(async () => {
    if (!ganttContainerRef.current) return;

    const canvas = await html2canvas(ganttContainerRef.current, {
      backgroundColor: theme.bgPrimary,
      scale: 2,
    });

    // Create download link
    const link = document.createElement('a');
    link.download = 'gantt-chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [theme]);

  const handleExportPDF = useCallback(async () => {
    await ganttUtils.exportToPDF(localTasks);
  }, [localTasks]);

  const handleExportExcel = useCallback(async () => {
    await ganttUtils.exportToExcel(localTasks);
  }, [localTasks]);

  const handleExportCSV = useCallback(() => {
    const csv = ganttUtils.exportToCSV(localTasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'gantt-chart.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [localTasks]);

  const handleExportJSON = useCallback(() => {
    const json = ganttUtils.exportToJSON(localTasks);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'gantt-chart.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [localTasks]);

  const handleExportMSProject = useCallback(() => {
    ganttUtils.exportToMSProject(localTasks, 'Gantt Project', 'project.xml');
  }, [localTasks]);

  // Handle separator resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Synchronized scrolling and resizing
  useEffect(() => {
    const gridScroll = gridScrollRef.current;
    const timelineScroll = timelineScrollRef.current;

    if (!gridScroll || !timelineScroll) return;

    // v0.9.1: Respect disableScrollSync config to prevent auto-scroll during drag
    const disableSync = config.disableScrollSync || false;

    const handleGridScroll = () => {
      if (disableSync) {
        // Only update scroll position state, don't sync to timeline
        setScrollTop(gridScroll.scrollTop);
        return;
      }
      if (timelineScroll.scrollTop !== gridScroll.scrollTop) {
        timelineScroll.scrollTop = gridScroll.scrollTop;
      }
      setScrollTop(gridScroll.scrollTop);
    };

    const handleTimelineScroll = () => {
      if (disableSync) {
        // Only update scroll position state, don't sync to grid
        setScrollTop(timelineScroll.scrollTop);
        return;
      }
      if (gridScroll.scrollTop !== timelineScroll.scrollTop) {
        gridScroll.scrollTop = timelineScroll.scrollTop;
      }
      setScrollTop(timelineScroll.scrollTop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth > 300 && newWidth < window.innerWidth - 400) {
          setGridWidthOverride(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    gridScroll.addEventListener('scroll', handleGridScroll);
    timelineScroll.addEventListener('scroll', handleTimelineScroll);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      gridScroll.removeEventListener('scroll', handleGridScroll);
      timelineScroll.removeEventListener('scroll', handleTimelineScroll);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, config.disableScrollSync]);

  return (
    <GanttThemeContext.Provider value={ganttThemeContextValue}>
    <div
      ref={ganttContainerRef}
      className="flex flex-col h-full w-full"
      style={{
        backgroundColor: theme.bgPrimary,
        fontFamily: 'Inter, sans-serif',
        minHeight: 0, // Critical for flex children to shrink
        // v0.9.1: Prevent browser auto-scroll when disableScrollSync is enabled
        ...(config.disableScrollSync && {
          scrollBehavior: 'auto',
          overflowAnchor: 'none',
        }),
      }}
    >
      {/* Toolbar */}
      <GanttToolbar
        theme={theme}
        timeScale={timeScale}
        onTimeScaleChange={setTimeScale}
        zoom={zoom}
        onZoomChange={setZoom}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        rowDensity={rowDensity}
        onRowDensityChange={setRowDensity}
        showThemeSelector={showThemeSelector}
        // v0.12.0: Export handlers
        onExportPNG={showExportButton ? handleExportPNG : undefined}
        onExportPDF={showExportButton ? handleExportPDF : undefined}
        onExportExcel={showExportButton ? handleExportExcel : undefined}
        onExportCSV={showExportButton ? handleExportCSV : undefined}
        onExportJSON={showExportButton ? handleExportJSON : undefined}
        onExportMSProject={showExportButton ? handleExportMSProject : undefined}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Task Grid */}
        <div
          ref={gridScrollRef}
          className="gantt-grid-scroll overflow-y-auto overflow-x-hidden"
          style={{
            width: gridWidth,
            minHeight: 0,
            // v0.9.1: Prevent browser auto-scroll when disableScrollSync is enabled
            ...(config.disableScrollSync && {
              scrollBehavior: 'auto',
              overflowAnchor: 'none',
            }),
          }}
        >
          <TaskGrid
            tasks={tasksWithCriticalPath}
            theme={theme}
            rowHeight={rowHeight}
            availableUsers={availableUsers}
            templates={mergedTemplates}
            onTaskClick={onTaskClick}
            onTaskDblClick={handleTaskDblClickInternal} // v0.10.0: Use internal handler that opens modal
            onTaskContextMenu={onTaskContextMenu} // v0.8.0
            onTaskToggle={handleTaskToggle}
            scrollTop={scrollTop}
            columns={columns}
            onToggleColumn={handleToggleColumn}
            onTaskUpdate={handleTaskUpdate}
            onTaskIndent={handleTaskIndent}
            onTaskOutdent={handleTaskOutdent}
            onTaskMove={handleTaskMove}
            onMultiTaskDelete={handleMultiTaskDelete}
            onTaskDuplicate={handleTaskDuplicate}
            onTaskCreate={handleTaskCreate}
            onTaskRename={handleTaskRename}
            onCreateSubtask={handleCreateSubtask}
            onOpenTaskModal={onTaskClick ? (task: Task) => onTaskClick(task) : undefined}
          />
        </div>

        {/* Separator - Resizable */}
        <div
          className="relative flex-shrink-0 cursor-col-resize group"
          style={{
            width: 8,
            backgroundColor: isResizing ? theme.accent : theme.border,
            transition: 'background-color 0.2s',
          }}
          onMouseDown={handleMouseDown}
        >
          <motion.div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2"
            style={{
              width: 2,
              backgroundColor: theme.accent,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isResizing ? 1 : 0 }}
            whileHover={{ opacity: 1 }}
          />
        </div>

        {/* Timeline */}
        <div
          ref={timelineScrollRef}
          className="gantt-timeline-scroll flex-1 overflow-auto"
          style={{
            minHeight: 0,
            // v0.9.1: Prevent browser auto-scroll when disableScrollSync is enabled
            ...(config.disableScrollSync && {
              scrollBehavior: 'auto',
              overflowAnchor: 'none',
            }),
          }}
        >
          <Timeline
            tasks={tasksWithCriticalPath}
            theme={theme}
            rowHeight={rowHeight}
            timeScale={timeScale}
            startDate={startDate}
            endDate={endDate}
            zoom={zoom}
            templates={mergedTemplates}
            onTaskClick={onTaskClick}
            onTaskDblClick={handleTaskDblClickInternal} // v0.10.0: Use internal handler that opens modal
            onTaskContextMenu={handleTaskContextMenu} // v0.8.0: Now uses our handler for Split feature
            onTaskDateChange={handleTaskDateChange}
            onDependencyCreate={handleDependencyCreate}
            onDependencyDelete={handleDependencyDelete}
          />
        </div>
      </div>

      {/* v0.8.0: Context Menu for Split task feature */}
      {contextMenu.task && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          theme={theme}
          onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0, task: null })}
          items={[
            {
              id: 'split',
              label: 'Split Task',
              icon: MenuIcons.Split,
              onClick: () => {
                if (!contextMenu.task?.startDate || !contextMenu.task?.endDate) {
                  console.warn('Cannot split task without dates');
                  return;
                }

                // Calculate midpoint date for split
                const startTime = contextMenu.task.startDate.getTime();
                const endTime = contextMenu.task.endDate.getTime();
                const midTime = startTime + (endTime - startTime) / 2;
                const splitDate = new Date(midTime);

                // Call split handler
                handleSplitTask(contextMenu.task, splitDate);
              },
              disabled: !contextMenu.task?.startDate || !contextMenu.task?.endDate,
            },
          ]}
        />
      )}

      {/* v0.10.0: Task Edit Modal */}
      {editingTask && (
        <TaskFormModal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSubmit={(updates) => {
            handleTaskUpdate(editingTask.id, updates);
            setEditingTask(null);
          }}
          mode="edit"
          theme={currentTheme}
        />
      )}
    </div>
    </GanttThemeContext.Provider>
  );
})