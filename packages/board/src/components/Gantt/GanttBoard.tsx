import { useState, useRef, useEffect, useCallback, useMemo, useContext, forwardRef, useImperativeHandle } from 'react';
import { Task, TimeScale, Theme, GanttConfig, GanttColumn, ColumnType, RowDensity } from './types';
import { deriveThemeFromCSS } from './deriveThemeFromCSS';
import { GanttToolbar } from './GanttToolbar';
import { TaskGrid } from './TaskGrid';
import { Timeline } from './Timeline';
import { ContextMenu, MenuIcons } from './ContextMenu'; // v0.8.0: Split task context menu
import { TaskFormModal } from './TaskFormModal'; // v0.10.0: Task edit modal
import { GanttAIAssistant } from './GanttAIAssistant'; // v0.14.0: AI Assistant
import { motion, AnimatePresence } from 'framer-motion'; // v0.17.33: For delete confirmation modal
import { AlertTriangle, Trash2, Keyboard } from 'lucide-react'; // v0.17.33: Icons for delete confirmation
import { ColumnManager } from './ColumnManager'; // v0.17.195: Moved to GanttBoard for resize handle sync
import { useUndoRedo } from './useUndoRedo';
import { useGanttUndoRedoKeys } from './useGanttUndoRedoKeys';
import { ThemeContext } from '../../theme/ThemeProvider';
import { GanttThemeContext } from './GanttThemeContext';
import { GanttI18nContext } from './GanttI18nContext'; // v0.15.0: i18n context
import { mergeTranslations, GanttTranslations } from './i18n'; // v0.15.0: i18n
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
  reparentTask,
} from './hierarchyUtils';

interface GanttBoardProps {
  tasks: Task[];
  config?: GanttConfig;
  onTasksChange?: (tasks: Task[]) => void;
}

// v0.17.71: Increased row heights for better "breathing" - less Excel, more SaaS
const getRowHeight = (density: RowDensity): number => {
  switch (density) {
    case 'compact':
      return 44;  // Was 40 - still compact but not cramped
    case 'comfortable':
      return 52;  // Was 48 - default: luxurious spacing like Linear
    case 'spacious':
      return 60;  // Was 56 - generous for touch/accessibility
    default:
      return 52;
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
    persistExpandedState, // v0.17.181: Persist expanded state in localStorage
    aiAssistant, // v0.14.0: AI Assistant configuration
    // v0.15.0: Internationalization
    locale = 'en',
    customTranslations,
    // v0.14.3: Create Task button in toolbar
    showCreateTaskButton = false,
    createTaskLabel,
    onCreateTask,
    // UI events
    onThemeChange, // v0.9.0
    // Basic events
    onTaskClick,
    onTaskDblClick, // v0.8.0
    onTaskContextMenu, // v0.8.0
    onTaskUpdate,
    onProgressChange, // v0.8.0
    // v0.16.0: Context menu action callbacks
    onTaskEdit,
    onTaskAddSubtask,
    onTaskMarkIncomplete,
    onTaskSetInProgress,
    // Dependency events
    onDependencyCreate,
    onDependencyDelete,
    // Lifecycle events (v0.8.0)
    onBeforeTaskAdd,
    onAfterTaskAdd,
    onBeforeTaskUpdate,
    onAfterTaskUpdate,
    onBeforeTaskDelete,
    onAfterTaskDelete,
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

  // v0.17.33: Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ taskId: string; taskName: string } | null>(null);

  // v0.17.195: Keyboard shortcuts help state (moved from TaskGrid)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // v0.17.196: Close keyboard help when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (keyboardHelpRef.current && !keyboardHelpRef.current.contains(event.target as Node)) {
        setShowKeyboardHelp(false);
      }
    }

    if (showKeyboardHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showKeyboardHelp]);

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

  // v0.17.163: Track expanded states separately to preserve them across task reloads
  // This ref stores the isExpanded state for each task ID, updated whenever tasks are toggled
  // v0.17.181: Initialize from localStorage if persistExpandedState is enabled
  const getStorageKey = useCallback(() => {
    if (!persistExpandedState) return null;
    return typeof persistExpandedState === 'string'
      ? persistExpandedState
      : 'gantt-expanded-tasks';
  }, [persistExpandedState]);

  // Initialize expandedStatesRef from localStorage if persistExpandedState is enabled
  const expandedStatesRef = useRef<Map<string, boolean>>(new Map());
  const hasInitializedFromStorage = useRef(false);

  // Load from localStorage on first render if persistExpandedState is enabled
  if (!hasInitializedFromStorage.current && persistExpandedState) {
    hasInitializedFromStorage.current = true;
    const storageKey = typeof persistExpandedState === 'string'
      ? persistExpandedState
      : 'gantt-expanded-tasks';

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // stored as array of [taskId, isExpanded] tuples
          expandedStatesRef.current = new Map(parsed);
        }
      }
    } catch (e) {
      console.warn('[GanttBoard] Error loading expanded state from localStorage:', e);
    }
  }

  // v0.17.181: Save expanded states to localStorage when they change
  const saveExpandedStatesToStorage = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const entries = Array.from(expandedStatesRef.current.entries());
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch (e) {
      console.warn('[GanttBoard] Error saving expanded state to localStorage:', e);
    }
  }, [getStorageKey]);

  // Sync parent tasks prop changes to local state (e.g., after external DB operations)
  // v0.17.163: Preserve isExpanded state using ref to prevent subtasks from auto-expanding
  useEffect(() => {
    // Apply preserved expanded states to incoming tasks
    const applyExpandedState = (taskList: Task[]): Task[] => {
      return taskList.map(task => {
        const preservedState = expandedStatesRef.current.get(task.id);
        const newTask = preservedState !== undefined
          ? { ...task, isExpanded: preservedState }
          : task;

        if (newTask.subtasks?.length) {
          return { ...newTask, subtasks: applyExpandedState(newTask.subtasks) };
        }
        return newTask;
      });
    };

    // If we have preserved states, apply them; otherwise just use tasks as-is
    if (expandedStatesRef.current.size > 0) {
      setLocalTasks(applyExpandedState(tasks));
    } else {
      setLocalTasks(tasks);
    }
  }, [tasks, setLocalTasks]);

  // v0.17.19: Track previous tasks for comparison to avoid unnecessary onTasksChange calls
  const prevTasksRef = useRef<Task[]>(tasks);
  const isInitialMount = useRef(true);

  // Sync local tasks with parent when they change (optimized to avoid unnecessary calls)
  useEffect(() => {
    // Skip on initial mount - parent already has the tasks
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTasksRef.current = localTasks;
      return;
    }

    if (!onTasksChange) return;

    // Compare tasks to detect meaningful changes (not just reference changes)
    // We use JSON stringify for deep comparison - this catches:
    // - Added/removed tasks
    // - Changed task properties (name, dates, progress, etc.)
    // - But NOT just reordering of the same data in memory
    const prevJson = JSON.stringify(prevTasksRef.current);
    const currentJson = JSON.stringify(localTasks);

    if (prevJson !== currentJson) {
      prevTasksRef.current = localTasks;
      onTasksChange(localTasks);
    }
  }, [localTasks, onTasksChange]);

  // v0.15.0: Compute translations based on locale (must be before columns)
  const translations: GanttTranslations = useMemo(() => {
    return mergeTranslations(locale, customTranslations);
  }, [locale, customTranslations]);

  // Column configuration - Default: Only show task name
  // v0.13.8: Name column is resizable with min/max width constraints
  // v0.13.9: Increased default width to 320px for better readability of long task names
  // v0.15.0: Column labels now use translations
  // v0.17.56: All columns are now resizable with proper min/max constraints
  const getDefaultColumns = useCallback((t: GanttTranslations): GanttColumn[] => [
    { id: 'name', label: t.columns.taskName, width: 400, minWidth: 200, maxWidth: 2000, visible: true, sortable: true, resizable: true },
    { id: 'startDate', label: t.columns.startDate, width: 110, minWidth: 80, maxWidth: 200, visible: false, sortable: true, resizable: true },
    { id: 'endDate', label: t.columns.endDate, width: 110, minWidth: 80, maxWidth: 200, visible: false, sortable: true, resizable: true },
    { id: 'duration', label: t.columns.duration, width: 80, minWidth: 60, maxWidth: 150, visible: false, sortable: true, resizable: true },
    { id: 'assignees', label: t.columns.assignees, width: 120, minWidth: 80, maxWidth: 300, visible: false, sortable: false, resizable: true },
    { id: 'status', label: t.columns.status, width: 100, minWidth: 70, maxWidth: 180, visible: false, sortable: true, resizable: true },
    { id: 'progress', label: t.columns.progress, width: 120, minWidth: 80, maxWidth: 200, visible: false, sortable: true, resizable: true },
    { id: 'priority', label: t.columns.priority, width: 90, minWidth: 70, maxWidth: 150, visible: false, sortable: true, resizable: true }, // v0.17.29
  ], []);

  const [columns, setColumns] = useState<GanttColumn[]>(() => getDefaultColumns(translations));

  // Update column labels when locale changes
  useEffect(() => {
    setColumns(prev => prev.map(col => ({
      ...col,
      label: translations.columns[col.id === 'name' ? 'taskName' : col.id as keyof typeof translations.columns] || col.label,
    })));
  }, [translations]);

  // Calculate grid width based on visible columns (memoized)
  // v0.17.127: Only add extra padding when there are additional columns beyond 'name'
  const calculatedGridWidth = useMemo(() => {
    const visibleCols = columns.filter(col => col.visible);
    const hasAdditionalColumns = visibleCols.some(col => col.id !== 'name');
    const baseWidth = visibleCols.reduce((sum, col) => sum + col.width, 0);
    // Only add padding for additional columns area when there are extra columns
    return baseWidth + (hasAdditionalColumns ? 20 : 0);
  }, [columns]);

  // v0.17.193: Track previous column state for change detection
  const prevVisibleColumnsRef = useRef<string>(
    columns.filter(col => col.visible).map(c => c.id).join(',')
  );

  // v0.17.193: Handle column visibility changes ONLY
  // This effect ONLY runs when columns are toggled, NOT when user drags
  useEffect(() => {
    const visibleCols = columns.filter(col => col.visible);
    const currentKey = visibleCols.map(c => c.id).join(',');
    const prevKey = prevVisibleColumnsRef.current;

    // Only act if columns actually changed (not just a re-render)
    if (currentKey !== prevKey) {
      const hasAdditionalColumns = visibleCols.some(col => col.id !== 'name');
      const prevHadAdditional = prevKey.includes(','); // Had more than just 'name'

      if (!hasAdditionalColumns) {
        // All extra columns removed - reset to auto width
        setGridWidthOverride(null);
      } else if (!prevHadAdditional && hasAdditionalColumns) {
        // First additional column added - start with full width
        setGridWidthOverride(null); // Let it auto-calculate
      }
      // Note: When adding more columns to existing ones, we don't change gridWidthOverride
      // This allows the curtain behavior to work - user controls the width

      prevVisibleColumnsRef.current = currentKey;
    }
  }, [columns]);

  // v0.17.192: Grid width calculation - ClickUp style "curtain" behavior
  // User can drag to cover/uncover columns like pulling a curtain
  const gridWidth = useMemo(() => {
    const minRequired = 280; // Minimum to show task name column

    // If user has manually resized, ALWAYS respect their choice
    // This allows curtain behavior - dragging left to hide ANY number of columns
    if (gridWidthOverride !== null) {
      return Math.max(minRequired, gridWidthOverride);
    }
    // Default: show all visible columns
    return Math.max(minRequired, calculatedGridWidth);
  }, [gridWidthOverride, calculatedGridWidth]);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const keyboardHelpRef = useRef<HTMLDivElement>(null); // v0.17.196: For keyboard shortcuts tooltip

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

  // v0.13.8: Handle column resize (memoized)
  const handleColumnResize = useCallback((columnId: ColumnType, newWidth: number) => {
    setColumns(prev =>
      prev.map(col => {
        if (col.id !== columnId) return col;
        // Clamp width to min/max constraints
        const minW = col.minWidth ?? 100;
        const maxW = col.maxWidth ?? 800;
        const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
        return { ...col, width: clampedWidth };
      })
    );
  }, []);

  // Handle task toggle (memoized)
  // v0.17.163: Also update expandedStatesRef to persist state across task reloads
  // v0.17.181: Save to localStorage if persistExpandedState is enabled
  const handleTaskToggle = useCallback((taskId: string) => {
    setLocalTasks((prev) => {
      const newTasks = toggleTaskExpansion(prev, taskId);

      // Find the toggled task and update the ref with its new expanded state
      const findAndUpdateExpandedState = (taskList: Task[]) => {
        for (const task of taskList) {
          if (task.id === taskId) {
            expandedStatesRef.current.set(taskId, task.isExpanded ?? true);
            return;
          }
          if (task.subtasks?.length) {
            findAndUpdateExpandedState(task.subtasks);
          }
        }
      };
      findAndUpdateExpandedState(newTasks);

      // v0.17.181: Persist to localStorage
      saveExpandedStatesToStorage();

      return newTasks;
    });
    config.onTaskToggleExpand?.(taskId);
  }, [config, saveExpandedStatesToStorage]);

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

  // v0.17.68: Handle task reparenting via drag & drop
  const handleTaskReparent = useCallback((taskId: string, newParentId: string | null, position?: number) => {
    setLocalTasks((prev) => reparentTask(prev, taskId, newParentId, position));
    config.onTaskReparent?.(taskId, newParentId, position);
  }, [config]);

  const handleTaskMove = useCallback((taskIds: string[], direction: 'up' | 'down') => {
    if (taskIds.length === 0) return;
    setLocalTasks((prev) => moveTasks(prev, taskIds, direction));
    config.onTaskMove?.(taskIds[0]!, direction);
  }, [config]);

  const handleMultiTaskDelete = useCallback(async (taskIds: string[]) => {
    // v0.17.19: Support lifecycle callbacks for delete operations
    // Filter out tasks that are blocked by onBeforeTaskDelete
    const allowedTaskIds: string[] = [];

    for (const taskId of taskIds) {
      if (onBeforeTaskDelete) {
        const result = await Promise.resolve(onBeforeTaskDelete(taskId));
        if (result === false) {
          // Skip this task - deletion was cancelled
          continue;
        }
      }
      allowedTaskIds.push(taskId);
    }

    // If no tasks are allowed to be deleted, return early
    if (allowedTaskIds.length === 0) {
      return;
    }

    // Call the consumer's onMultiTaskDelete handler if provided
    if (config.onMultiTaskDelete) {
      config.onMultiTaskDelete(allowedTaskIds);
    } else {
      // Fallback: update local state and call individual delete handlers
      setLocalTasks((prev) => deleteTasks(prev, allowedTaskIds));
      allowedTaskIds.forEach(id => config.onTaskDelete?.(id));
    }

    // v0.17.19: Call onAfterTaskDelete for each successfully deleted task
    if (onAfterTaskDelete) {
      allowedTaskIds.forEach(id => onAfterTaskDelete(id));
    }
  }, [config, onBeforeTaskDelete, onAfterTaskDelete]);

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
  // v0.16.1: If onTaskEdit is provided, let the user handle editing (don't open built-in modal)
  // v0.17.162: Fix bug where inline rename changes weren't reflected in edit modal
  // We now look up the current task from localTasks to get the latest state
  const handleTaskDblClickInternal = useCallback((task: Task) => {
    // Look up the current version of the task from localTasks
    // This ensures we get the latest data (e.g., after inline rename)
    const currentTask = ganttUtils.findTaskById(localTasks, task.id) || task;

    // Call user's custom handler if provided
    onTaskDblClick?.(currentTask);

    // Only open built-in edit modal if user hasn't provided a custom edit handler
    // This prevents double modals when user handles editing themselves
    if (!onTaskEdit) {
      setEditingTask(currentTask);
    }
  }, [localTasks, onTaskDblClick, onTaskEdit]);

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

  // v0.13.9: Timeline has the scrollbar, TaskGrid syncs via CSS transform
  // This ensures only ONE scrollbar on the right side of the entire component
  useEffect(() => {
    const timelineScroll = timelineScrollRef.current;
    const gridContainer = gridScrollRef.current;

    if (!timelineScroll || !gridContainer) return;

    // v0.13.11: Find the TaskGrid CONTENT container (not the whole grid) to apply transform
    // This keeps the header fixed while only the task rows move
    const taskGridContent = gridContainer.querySelector('.gantt-taskgrid-content');

    const handleTimelineScroll = () => {
      const scrollY = timelineScroll.scrollTop;
      setScrollTop(scrollY);

      // Sync TaskGrid content position via CSS transform (header stays fixed)
      if (taskGridContent) {
        (taskGridContent as HTMLElement).style.transform = `translateY(-${scrollY}px)`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && gridContainer) {
        // Calculate width relative to the container's left edge for accuracy
        const containerRect = gridContainer.parentElement?.getBoundingClientRect();
        const containerLeft = containerRect?.left || 0;
        const newWidth = e.clientX - containerLeft;

        // v0.17.193: Only enforce minimum width, no maximum
        // This allows curtain behavior to cover ANY number of columns
        const minWidth = 280;
        const maxWidth = window.innerWidth - 100; // Allow expansion to almost full width

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setGridWidthOverride(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    // v0.17.131: Handle wheel events on grid to enable mouse wheel scroll on left panel
    const gridScrollContainer = gridContainer.querySelector('.gantt-grid-scroll') as HTMLElement || gridContainer;
    const handleGridWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      // Propagate wheel scroll to timeline (which handles the actual scrolling)
      if (wheelEvent.deltaY !== 0) {
        timelineScroll.scrollTop += wheelEvent.deltaY;
        e.preventDefault(); // Prevent default to avoid double-scroll
      }
    };

    timelineScroll.addEventListener('scroll', handleTimelineScroll);
    gridScrollContainer.addEventListener('wheel', handleGridWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      timelineScroll.removeEventListener('scroll', handleTimelineScroll);
      gridScrollContainer.removeEventListener('wheel', handleGridWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <GanttI18nContext.Provider value={translations}>
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
        // v0.14.3: Create Task button
        showCreateTaskButton={showCreateTaskButton}
        createTaskLabel={createTaskLabel}
        onCreateTask={onCreateTask}
        // v0.12.0: Export handlers
        onExportPNG={showExportButton ? handleExportPNG : undefined}
        onExportPDF={showExportButton ? handleExportPDF : undefined}
        onExportExcel={showExportButton ? handleExportExcel : undefined}
        onExportCSV={showExportButton ? handleExportCSV : undefined}
        onExportJSON={showExportButton ? handleExportJSON : undefined}
        onExportMSProject={showExportButton ? handleExportMSProject : undefined}
      />

      {/* Main Content - v0.13.9: TaskGrid has no scroll, Timeline has the unified vertical scroll */}
      {/* v0.17.31: Changed to clip to allow tooltips to render above header */}
      <div
        ref={gridScrollRef}
        className="flex-1 flex min-h-0"
        style={{
          overflow: 'clip',
          overflowClipMargin: '100px', // Allow tooltip to overflow above
        }}
      >
        {/* Task Grid - v0.17.194: Horizontal scroll when columns exceed width (ClickUp style) */}
        <div
          className="gantt-grid-scroll flex-shrink-0"
          style={{
            width: gridWidth,
            overflowX: 'auto', // v0.17.194: Allow horizontal scroll for many columns
            overflowY: 'hidden', // Vertical scroll handled by Timeline sync
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
            onColumnResize={handleColumnResize}
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
            onDeleteRequest={(taskId: string, taskName: string) => setDeleteConfirmation({ taskId, taskName })} // v0.17.34
            onTaskReparent={handleTaskReparent} // v0.17.68
          />
        </div>

        {/* v0.17.195: Action buttons + resize handle - buttons move with the border */}
        <div
          className="flex-shrink-0 flex items-start"
          style={{ zIndex: 15 }}
        >
          {/* Action buttons container - positioned in header area */}
          <div
            className="flex items-center gap-1 px-1"
            style={{
              position: 'relative', // v0.17.196: For keyboard help tooltip positioning
              height: '48px', // Match header height
              backgroundColor: theme.bgGrid,
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <ColumnManager
              columns={columns}
              onToggleColumn={handleToggleColumn}
              theme={theme}
            />
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className="p-1.5 rounded hover:bg-opacity-10 transition-colors"
              style={{ color: theme.textTertiary }}
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* v0.17.196: Keyboard help tooltip */}
            {showKeyboardHelp && (
              <div
                ref={keyboardHelpRef}
                className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-2xl z-50 min-w-[400px]"
                style={{
                  backgroundColor: theme.bgPrimary,
                  border: `1px solid ${theme.border}`,
                  color: theme.textPrimary,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: theme.border }}>
                  <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>
                    Keyboard Shortcuts
                  </h3>
                  <button
                    onClick={() => setShowKeyboardHelp(false)}
                    className="text-xs px-2 py-1 rounded hover:bg-opacity-10"
                    style={{ color: theme.textTertiary }}
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Navigation */}
                  <div>
                    <div className="font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Navigation</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Move focus up/down</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>↑ / ↓</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Select range</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Shift + ↑ / ↓</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Toggle selection</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Cmd/Ctrl + Click</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchy */}
                  <div>
                    <div className="font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Hierarchy</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Indent task</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Tab</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Outdent task</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Shift + Tab</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Expand/Collapse</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>→ / ←</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Editing */}
                  <div>
                    <div className="font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Editing</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Create task below</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Enter</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Create task above</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Shift + Enter</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Open task modal</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Cmd/Ctrl + Enter</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Rename task</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>F2</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Actions</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Move task up/down</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Alt + ↑ / ↓</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Delete task</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Delete</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: theme.textTertiary }}>Duplicate task</span>
                        <kbd className="px-2 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: theme.bgGrid, color: theme.textPrimary }}>Cmd/Ctrl + D</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Resize handle */}
          <div
            className="cursor-col-resize hover:bg-blue-500/20 transition-colors h-full"
            style={{
              width: 5,
              backgroundColor: 'transparent',
              borderLeft: `1px solid ${theme.border}`,
            }}
            onMouseDown={handleMouseDown}
          />
        </div>

        {/* Timeline - v0.13.9: Has both scrolls, TaskGrid syncs to this scroll */}
        {/* v0.17.31: Added overflow-y:clip to allow tooltips to render above while maintaining scroll */}
        <div
          ref={timelineScrollRef}
          className="gantt-timeline-scroll flex-1"
          style={{
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'auto',
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

      {/* v0.8.0: Context Menu for task operations (v0.16.0: Enhanced with Edit, Add Subtask, Status changes) */}
      {/* v0.17.46: Parent tasks (with subtasks) have limited menu - no edit, no status changes */}
      {contextMenu.task && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          theme={theme}
          onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0, task: null })}
          items={(() => {
            const staleTask = contextMenu.task;
            if (!staleTask) return [];

            // v0.17.162: Look up current task from localTasks to get latest data (e.g., after inline rename)
            const task = ganttUtils.findTaskById(localTasks, staleTask.id) || staleTask;
            const isParentTask = task.subtasks && task.subtasks.length > 0;

            // v0.17.46: Parent tasks can only add subtasks and delete - status/progress is auto-calculated
            if (isParentTask) {
              return [
                // Add Subtask - main action for parent tasks
                {
                  id: 'addSubtask',
                  label: translations.contextMenu?.addSubtask || 'Add Subtask',
                  icon: MenuIcons.Add,
                  onClick: () => {
                    if (onTaskAddSubtask) {
                      onTaskAddSubtask(task);
                    } else {
                      handleCreateSubtask(task.id);
                    }
                  },
                },
                // Separator before delete
                {
                  id: 'separator-delete',
                  label: '',
                  separator: true,
                  onClick: () => {},
                },
                // Delete Task
                {
                  id: 'delete',
                  label: translations.contextMenu?.deleteTask || 'Delete Task',
                  icon: MenuIcons.Delete,
                  onClick: () => {
                    setDeleteConfirmation({
                      taskId: task.id,
                      taskName: task.name,
                    });
                  },
                },
              ];
            }

            // Regular tasks (no subtasks) - full menu
            return [
              // v0.16.0: Edit Task - opens edit modal or calls custom handler
              {
                id: 'edit',
                label: translations.contextMenu?.editTask || 'Edit Task',
                icon: MenuIcons.Pencil,
                onClick: () => {
                  if (onTaskEdit) {
                    onTaskEdit(task);
                  } else {
                    setEditingTask(task);
                  }
                },
              },
              // v0.16.0: Add Subtask
              {
                id: 'addSubtask',
                label: translations.contextMenu?.addSubtask || 'Add Subtask',
                icon: MenuIcons.Add,
                onClick: () => {
                  if (onTaskAddSubtask) {
                    onTaskAddSubtask(task);
                  } else {
                    handleCreateSubtask(task.id);
                  }
                },
              },
              // Separator before status changes
              {
                id: 'separator-status',
                label: '',
                separator: true,
                onClick: () => {},
              },
              // v0.16.0: Mark Incomplete (status: 'todo', progress: 0)
              {
                id: 'markIncomplete',
                label: translations.contextMenu?.markIncomplete || 'Mark Incomplete',
                icon: MenuIcons.MarkIncomplete,
                onClick: () => {
                  if (onTaskMarkIncomplete) {
                    onTaskMarkIncomplete(task);
                  } else {
                    handleTaskUpdate(task.id, { status: 'todo', progress: 0 });
                  }
                },
                disabled: task.status === 'todo',
              },
              // v0.16.0: Set In Progress (status: 'in-progress')
              {
                id: 'setInProgress',
                label: translations.contextMenu?.setInProgress || 'Set In Progress',
                icon: MenuIcons.SetInProgress,
                onClick: () => {
                  if (onTaskSetInProgress) {
                    onTaskSetInProgress(task);
                  } else {
                    handleTaskUpdate(task.id, { status: 'in-progress' });
                  }
                },
                disabled: task.status === 'in-progress',
              },
              // v0.16.0: Mark Complete (status: 'completed', progress: 100)
              {
                id: 'markComplete',
                label: translations.contextMenu?.markComplete || 'Mark Complete',
                icon: MenuIcons.MarkComplete,
                onClick: () => {
                  handleTaskUpdate(task.id, { status: 'completed', progress: 100 });
                },
                disabled: task.status === 'completed',
              },
              // Separator before advanced options
              {
                id: 'separator-advanced',
                label: '',
                separator: true,
                onClick: () => {},
              },
              // Split Task (existing feature from v0.8.0)
              {
                id: 'split',
                label: translations.contextMenu?.splitTask || 'Split Task',
                icon: MenuIcons.Split,
                onClick: () => {
                  if (!task.startDate || !task.endDate) {
                    console.warn('Cannot split task without dates');
                    return;
                  }

                  // Calculate midpoint date for split
                  const startTime = task.startDate.getTime();
                  const endTime = task.endDate.getTime();
                  const midTime = startTime + (endTime - startTime) / 2;
                  const splitDate = new Date(midTime);

                  // Call split handler
                  handleSplitTask(task, splitDate);
                },
                disabled: !task.startDate || !task.endDate,
              },
              // Separator before delete
              {
                id: 'separator-delete',
                label: '',
                separator: true,
                onClick: () => {},
              },
              // Delete Task - v0.17.33: Now shows confirmation modal
              {
                id: 'delete',
                label: translations.contextMenu?.deleteTask || 'Delete Task',
                icon: MenuIcons.Delete,
                onClick: () => {
                  setDeleteConfirmation({
                    taskId: task.id,
                    taskName: task.name,
                  });
                },
              },
            ];
          })()}
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

      {/* v0.17.33: Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setDeleteConfirmation(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.border}`,
              }}
            >
              {/* Header */}
              <div
                className="px-6 py-4"
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: theme.textPrimary, fontFamily: 'Inter, sans-serif' }}
                    >
                      {translations.contextMenu?.deleteTask || 'Delete Task'}?
                    </h3>
                    <p
                      className="text-sm mt-1"
                      style={{ color: theme.textSecondary, fontFamily: 'Inter, sans-serif' }}
                    >
                      {locale === 'es' ? 'Esta acción no se puede deshacer' : 'This action cannot be undone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: theme.textSecondary, fontFamily: 'Inter, sans-serif' }}
                >
                  {locale === 'es' ? 'Estás a punto de eliminar la tarea' : 'You are about to delete the task'}{' '}
                  <span className="font-semibold" style={{ color: theme.textPrimary }}>
                    "{deleteConfirmation.taskName}"
                  </span>
                  .
                </p>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex items-center justify-end gap-3"
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    color: theme.textSecondary,
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {locale === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    handleMultiTaskDelete([deleteConfirmation.taskId]);
                    setDeleteConfirmation(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2"
                  style={{
                    backgroundColor: '#EF4444',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#EF4444';
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {locale === 'es' ? 'Eliminar' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v0.14.0: AI Assistant for natural language task editing */}
      {aiAssistant?.enabled && (
        <GanttAIAssistant
          tasks={localTasks}
          theme={theme}
          config={aiAssistant}
          onTasksUpdate={setLocalTasks}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreate={(task) => {
            setLocalTasks((prev) => [...prev, task]);
          }}
          onTaskDelete={(taskId) => {
            // v0.17.19: Use handleMultiTaskDelete to respect lifecycle hooks
            handleMultiTaskDelete([taskId]);
          }}
          onDependencyCreate={(fromTaskId, toTaskId) => {
            const fromTask = ganttUtils.findTaskById(localTasks, fromTaskId);
            if (fromTask) {
              handleDependencyCreate(fromTask, toTaskId);
            }
          }}
          onDependencyDelete={handleDependencyDelete}
        />
      )}
    </div>
    </GanttThemeContext.Provider>
    </GanttI18nContext.Provider>
  );
})