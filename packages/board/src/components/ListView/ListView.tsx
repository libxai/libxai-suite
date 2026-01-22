/**
 * ListView Component
 * Professional list view for task management with dynamic columns
 * ClickUp-style features: column customization, context menu, custom fields
 * @version 0.18.0
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Search,
  Plus,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type {
  ListViewProps,
  FlattenedTask,
  TableColumn,
  ContextMenuState,
  CustomFieldDefinition,
  CustomFieldValue,
} from './types';
import { mergeListViewTranslations } from './i18n';
import { cn } from '../../utils';

// Cell renderers
import { StatusCell } from './cells/StatusCell';
import { PriorityCell } from './cells/PriorityCell';
import { AssigneesCell } from './cells/AssigneesCell';
import { DateCell } from './cells/DateCell';
import { ProgressCell } from './cells/ProgressCell';
import { TextCell } from './cells/TextCell';
import { NumberCell } from './cells/NumberCell';
import { DropdownCell } from './cells/DropdownCell';
import { CheckboxCell } from './cells/CheckboxCell';
import { TagsCell } from './cells/TagsCell';
import { TimeCell } from './cells/TimeCell';

// Components
import { TableContextMenu } from './TableContextMenu';
import { ColumnSelector } from './ColumnSelector';
import { CreateFieldModal } from './CreateFieldModal';
import { StatusFilter, type StatusFilterValue } from './StatusFilter';

type SortField = 'name' | 'startDate' | 'endDate' | 'progress' | 'status' | 'priority' | string;
type SortOrder = 'asc' | 'desc';

// Default columns when none provided
const DEFAULT_COLUMNS: TableColumn[] = [
  { id: 'name', type: 'name', label: 'Name', width: 300, visible: true, sortable: true, resizable: true },
  { id: 'status', type: 'status', label: 'Status', width: 140, visible: true, sortable: true, resizable: true },
  { id: 'startDate', type: 'startDate', label: 'Start Date', width: 120, visible: true, sortable: true, resizable: true },
  { id: 'endDate', type: 'endDate', label: 'End Date', width: 120, visible: true, sortable: true, resizable: true },
  { id: 'progress', type: 'progress', label: 'Progress', width: 100, visible: true, sortable: true, resizable: true },
];

/**
 * Flatten hierarchical tasks to flat list with level info
 */
function flattenTasksWithLevel(tasks: Task[], level = 0): FlattenedTask[] {
  const result: FlattenedTask[] = [];

  for (const task of tasks) {
    result.push({
      ...task,
      level,
      hasChildren: (task.subtasks?.length || 0) > 0,
      parentPath: [task.id],
    });
    if (task.subtasks?.length && task.isExpanded !== false) {
      result.push(...flattenTasksWithLevel(task.subtasks, level + 1));
    }
  }

  return result;
}

/**
 * Main ListView Component
 */
export function ListView({
  tasks,
  config = {},
  callbacks = {},
  isLoading = false,
  error,
  className,
  style,
  availableUsers = [],
  customFields = [],
}: ListViewProps) {
  const {
    theme: themeName = 'dark',
    locale = 'en',
    customTranslations,
    showSearch = true,
    showHierarchy = true,
    tableColumns,
    allowColumnCustomization = true,
    allowColumnResize = true,
    enableContextMenu = true,
    // v0.18.0: Create task button
    showCreateTaskButton = false,
    onCreateTask,
    // v0.18.3: Persist filter state
    persistFilter = false,
  } = config;

  const t = mergeListViewTranslations(locale, customTranslations);
  const isDark = themeName === 'dark';

  // v0.18.3: Load persisted filter state from localStorage
  const loadPersistedFilter = useCallback(() => {
    if (!persistFilter || typeof window === 'undefined') {
      return { statusFilter: 'all' as StatusFilterValue, hideCompleted: false };
    }
    try {
      const saved = localStorage.getItem(persistFilter);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          statusFilter: (parsed.statusFilter || 'all') as StatusFilterValue,
          hideCompleted: parsed.hideCompleted || false,
        };
      }
    } catch (e) {
      console.error('Error loading persisted filter:', e);
    }
    return { statusFilter: 'all' as StatusFilterValue, hideCompleted: false };
  }, [persistFilter]);

  // State
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(() => loadPersistedFilter().statusFilter);
  const [hideCompleted, setHideCompleted] = useState(() => loadPersistedFilter().hideCompleted);
  const [columns, setColumns] = useState<TableColumn[]>(tableColumns || DEFAULT_COLUMNS);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    type: 'task',
  });

  // Column resize state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Sync columns with prop changes
  useEffect(() => {
    if (tableColumns) {
      setColumns(tableColumns);
    }
  }, [tableColumns]);

  // v0.18.3: Persist filter state to localStorage when it changes
  useEffect(() => {
    if (!persistFilter || typeof window === 'undefined') return;
    try {
      localStorage.setItem(persistFilter, JSON.stringify({
        statusFilter,
        hideCompleted,
      }));
    } catch (e) {
      console.error('Error persisting filter state:', e);
    }
  }, [persistFilter, statusFilter, hideCompleted]);

  // Build expanded tasks set from task.isExpanded props
  const expandedTasks = useMemo(() => {
    const expanded = new Set<string>();
    function collectExpanded(taskList: Task[]) {
      for (const task of taskList) {
        if (task.subtasks?.length) {
          if (task.isExpanded !== false) {
            expanded.add(task.id);
          }
          collectExpanded(task.subtasks);
        }
      }
    }
    collectExpanded(tasks);
    return expanded;
  }, [tasks]);

  // Get visible columns
  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);

  // Toggle task expansion - delegates to parent via callback
  const toggleExpand = useCallback((taskId: string) => {
    callbacks.onTaskToggleExpand?.(taskId);
  }, [callbacks]);

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    callbacks.onSortChange?.({ column: field as any, direction: sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [sortField, sortOrder, callbacks]);

  // Column management
  const handleColumnsChange = useCallback((newColumns: TableColumn[]) => {
    setColumns(newColumns);
    callbacks.onColumnsChange?.(newColumns);
  }, [callbacks]);

  const handleColumnHide = useCallback((columnId: string) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: false } : col
    );
    handleColumnsChange(newColumns);
  }, [columns, handleColumnsChange]);

  const handleColumnSort = useCallback((columnId: string, direction: SortOrder) => {
    setSortField(columnId);
    setSortOrder(direction);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, task?: Task, columnId?: string) => {
    if (!enableContextMenu) return;
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: task ? 'task' : 'header',
      task,
      columnId,
    });
  }, [enableContextMenu]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    if (!allowColumnResize) return;
    e.preventDefault();
    e.stopPropagation();
    const column = columns.find(c => c.id === columnId);
    if (column) {
      setResizingColumn(columnId);
      setResizeStartX(e.clientX);
      setResizeStartWidth(column.width);
    }
  }, [columns, allowColumnResize]);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const newWidth = Math.max(50, resizeStartWidth + delta);
      const newColumns = columns.map(col =>
        col.id === resizingColumn ? { ...col, width: newWidth } : col
      );
      setColumns(newColumns);
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        callbacks.onColumnsChange?.(columns);
      }
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, columns, callbacks]);

  // Custom field creation
  const handleCreateCustomField = useCallback(async (field: Omit<CustomFieldDefinition, 'id' | 'projectId'>) => {
    if (callbacks.onCreateCustomField) {
      const fullField: CustomFieldDefinition = {
        ...field,
        id: `cf_${Date.now()}`,
        projectId: '',
      };
      await callbacks.onCreateCustomField(fullField);
    }
    setShowCreateFieldModal(false);
  }, [callbacks]);

  // Helper to get task status
  const getTaskStatus = useCallback((task: Task): 'completed' | 'in-progress' | 'todo' => {
    if (task.progress === 100 || task.status === 'completed') return 'completed';
    if ((task.progress && task.progress > 0) || task.status === 'in-progress') return 'in-progress';
    return 'todo';
  }, []);

  // Filter and sort tasks
  const displayTasks = useMemo(() => {
    let flatTasks = flattenTasksWithLevel(tasks);

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      flatTasks = flatTasks.filter(task =>
        task.name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      flatTasks = flatTasks.filter(task => getTaskStatus(task) === statusFilter);
    }

    // Hide completed tasks
    if (hideCompleted) {
      flatTasks = flatTasks.filter(task => getTaskStatus(task) !== 'completed');
    }

    // Sort
    flatTasks.sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'startDate':
          aVal = a.startDate?.getTime() || 0;
          bVal = b.startDate?.getTime() || 0;
          break;
        case 'endDate':
          aVal = a.endDate?.getTime() || 0;
          bVal = b.endDate?.getTime() || 0;
          break;
        case 'progress':
          aVal = a.progress || 0;
          bVal = b.progress || 0;
          break;
        case 'status':
          aVal = a.status || 'todo';
          bVal = b.status || 'todo';
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return flatTasks;
  }, [tasks, searchQuery, statusFilter, hideCompleted, sortField, sortOrder, getTaskStatus]);

  // Render cell based on column type
  const renderCell = useCallback((task: Task, column: TableColumn) => {
    const handleUpdate = (updates: Partial<Task>) => {
      callbacks.onTaskUpdate?.({ ...task, ...updates });
    };

    // Helper to get custom field value
    const getCustomFieldValue = <T,>(fieldId: string | undefined): T | undefined => {
      if (!fieldId) return undefined;
      const taskWithFields = task as Task & { customFields?: CustomFieldValue[] };
      return taskWithFields.customFields?.find((cf: CustomFieldValue) => cf.fieldId === fieldId)?.value as T | undefined;
    };

    // Helper to update custom field value
    const updateCustomField = (fieldId: string | undefined, value: any) => {
      if (!fieldId) return;
      const taskWithFields = task as Task & { customFields?: CustomFieldValue[] };
      const customFields: CustomFieldValue[] = [...(taskWithFields.customFields || [])];
      const idx = customFields.findIndex((cf: CustomFieldValue) => cf.fieldId === fieldId);
      if (idx >= 0) {
        customFields[idx] = { fieldId, value };
      } else {
        customFields.push({ fieldId, value });
      }
      handleUpdate({ customFields } as any);
    };

    switch (column.type) {
      case 'name':
        return null; // Handled separately with expand/collapse logic

      case 'status':
        return (
          <StatusCell
            value={task.status || (task.progress === 100 ? 'completed' : task.progress && task.progress > 0 ? 'in-progress' : 'todo')}
            onChange={(status) => {
              const progress = status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0;
              handleUpdate({ status, progress });
            }}
            isDark={isDark}
            locale={locale}
            translations={t.status}
          />
        );

      case 'priority':
        return (
          <PriorityCell
            value={task.priority}
            onChange={(priority) => handleUpdate({ priority: priority as any })}
            isDark={isDark}
            locale={locale}
          />
        );

      case 'assignees':
        return (
          <AssigneesCell
            value={task.assignees || []}
            availableUsers={availableUsers}
            onChange={(assignees) => handleUpdate({ assignees })}
            isDark={isDark}
            locale={locale}
          />
        );

      case 'startDate':
        return (
          <DateCell
            value={task.startDate}
            onChange={(startDate) => handleUpdate({ startDate })}
            isDark={isDark}
            locale={locale}
            dateField="start"
            startDate={task.startDate}
            endDate={task.endDate}
          />
        );

      case 'endDate':
        return (
          <DateCell
            value={task.endDate}
            onChange={(endDate) => handleUpdate({ endDate })}
            isDark={isDark}
            locale={locale}
            dateField="end"
            startDate={task.startDate}
            endDate={task.endDate}
          />
        );

      case 'progress':
        return (
          <ProgressCell
            value={task.progress || 0}
            onChange={(progress) => {
              const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'todo';
              handleUpdate({ progress, status });
            }}
            isDark={isDark}
          />
        );

      case 'tags':
        return (
          <TagsCell
            value={task.tags || []}
            isDark={isDark}
          />
        );

      case 'text':
        return (
          <TextCell
            value={getCustomFieldValue<string>(column.customFieldId) || ''}
            onChange={(value) => updateCustomField(column.customFieldId, value)}
            isDark={isDark}
          />
        );

      case 'number':
        return (
          <NumberCell
            value={getCustomFieldValue<number>(column.customFieldId) || 0}
            onChange={(value) => updateCustomField(column.customFieldId, value)}
            isDark={isDark}
          />
        );

      case 'date':
        const dateVal = getCustomFieldValue<Date | string>(column.customFieldId);
        return (
          <DateCell
            value={dateVal ? new Date(dateVal) : undefined}
            onChange={(date) => updateCustomField(column.customFieldId, date)}
            isDark={isDark}
            locale={locale}
          />
        );

      case 'dropdown':
        return (
          <DropdownCell
            value={getCustomFieldValue<string>(column.customFieldId) || ''}
            options={column.options || []}
            onChange={(value) => updateCustomField(column.customFieldId, value)}
            isDark={isDark}
          />
        );

      case 'checkbox':
        return (
          <CheckboxCell
            value={getCustomFieldValue<boolean>(column.customFieldId) || false}
            onChange={(checked) => updateCustomField(column.customFieldId, checked)}
            isDark={isDark}
          />
        );

      // v0.18.3: Time tracking columns
      case 'estimatedTime': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).estimatedTime}
            onChange={(minutes) => handleUpdate({ estimatedTime: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
          />
        );
      }

      // v1.1.0: Quoted time column
      case 'quotedTime': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).quotedTime}
            onChange={(minutes) => handleUpdate({ quotedTime: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
          />
        );
      }

      case 'elapsedTime': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).elapsedTime}
            onChange={(minutes) => handleUpdate({ elapsedTime: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
          />
        );
      }

      // v1.2.0: New time tracking columns
      case 'effortMinutes': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).effortMinutes}
            onChange={(minutes) => handleUpdate({ effortMinutes: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
          />
        );
      }

      case 'timeLoggedMinutes': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).timeLoggedMinutes}
            onChange={callbacks.onLogTime ? (minutes) => {
              // Inline time logging - pass minutes directly to callback
              callbacks.onLogTime?.(task, minutes);
            } : undefined}
            isDark={isDark}
            locale={locale}
            placeholder={locale === 'es' ? 'Agregar' : 'Add'}
            disabled={isCompleted}
          />
        );
      }

      case 'soldEffortMinutes': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        return (
          <TimeCell
            value={(task as any).soldEffortMinutes}
            onChange={(minutes) => handleUpdate({ soldEffortMinutes: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
          />
        );
      }

      default:
        return <span className={cn("text-sm", isDark ? "text-[#94A3B8]" : "text-gray-500")}>-</span>;
    }
  }, [callbacks, isDark, locale, availableUsers, t]);

  // Get column label with translations
  const getColumnLabel = useCallback((column: TableColumn): string => {
    const labelMap: Record<string, string> = {
      name: t.columns.name,
      status: t.columns.status,
      priority: t.columns.priority,
      assignees: t.columns.assignees,
      startDate: t.columns.startDate,
      endDate: t.columns.endDate,
      progress: t.columns.progress,
      tags: (t.columns as any).tags || (locale === 'es' ? 'Etiquetas' : 'Tags'),
      // v0.18.3: Time tracking columns
      estimatedTime: (t.columns as any).estimatedTime || (locale === 'es' ? 'Estimado' : 'Estimated'),
      // v1.1.0: Quoted time column
      quotedTime: (t.columns as any).quotedTime || (locale === 'es' ? 'Ofertado' : 'Quoted'),
      elapsedTime: (t.columns as any).elapsedTime || (locale === 'es' ? 'Tiempo' : 'Time Spent'),
      // v1.2.0: New time tracking columns
      effortMinutes: (t.columns as any).effortMinutes || (locale === 'es' ? 'Estimado' : 'Estimated'),
      timeLoggedMinutes: (t.columns as any).timeLoggedMinutes || (locale === 'es' ? 'Tiempo' : 'Time Logged'),
      soldEffortMinutes: (t.columns as any).soldEffortMinutes || (locale === 'es' ? 'Ofertado' : 'Quoted'),
    };
    const label = labelMap[column.type] || column.label;
    // Ensure we always return a string to prevent React error #310
    return typeof label === 'string' ? label : String(label || column.type);
  }, [t, locale]);

  // Calculate total width for grid
  const totalWidth = useMemo(() => {
    return visibleColumns.reduce((sum, col) => sum + col.width, 0) + (allowColumnCustomization ? 48 : 0);
  }, [visibleColumns, allowColumnCustomization]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-[#3B82F6]" />
          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {t.empty.noTasks}...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
              Error
            </h3>
            <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
              {typeof error === 'string' ? error : error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center">
            <List className="w-8 h-8 text-[#3B82F6]" />
          </div>
          <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
            {t.empty.noTasks}
          </h3>
          <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {t.empty.addFirstTask}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      className={cn(
        "flex-1 flex flex-col w-full h-full overflow-hidden",
        isDark ? "bg-[#0F1117]" : "bg-white",
        resizingColumn && "select-none",
        className
      )}
      style={style}
    >
      {/* Toolbar */}
      <div className={cn("flex-shrink-0 px-6 py-4 border-b", isDark ? "border-white/10" : "border-gray-200")}>
        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <StatusFilter
            value={statusFilter}
            hideCompleted={hideCompleted}
            onChange={setStatusFilter}
            onHideCompletedChange={setHideCompleted}
            isDark={isDark}
            locale={locale}
          />

          {/* Task count - next to filters */}
          <div className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {displayTasks.length} {t.pagination.tasks}
          </div>

          {/* Search */}
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-400")} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.toolbar.searchPlaceholder}
                className={cn(
                  "w-full h-9 pl-10 pr-4 rounded-lg border outline-none focus:ring-2 focus:ring-[#3B82F6]/30",
                  isDark
                    ? "bg-white/5 border-white/10 text-white placeholder:text-[#6B7280]"
                    : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
                )}
              />
            </div>
          )}

          {/* Spacer to push right items */}
          <div className="flex-1" />

          {/* Create Task Button - v0.18.0: Same style as GanttToolbar */}
          {showCreateTaskButton && onCreateTask && (
            <motion.button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span>{t.toolbar.newTask}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: totalWidth }}>
          {/* List Header */}
          <div
            className={cn(
              "flex-shrink-0 flex items-center border-b text-xs font-medium uppercase tracking-wider sticky top-0 z-10",
              isDark ? "border-white/10 bg-[#0F1117]" : "border-gray-200 bg-gray-50"
            )}
          >
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3",
                  isDark ? "text-[#9CA3AF]" : "text-gray-500"
                )}
                style={{ width: column.width, minWidth: column.minWidth }}
                onContextMenu={(e) => handleContextMenu(e, undefined, column.id)}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="flex items-center gap-1 hover:text-[#3B82F6]"
                  >
                    {getColumnLabel(column)}
                    <ArrowUpDown className={cn(
                      "w-3 h-3",
                      sortField === column.id && "text-[#3B82F6]"
                    )} />
                  </button>
                ) : (
                  <span>{getColumnLabel(column)}</span>
                )}

                {/* Resize handle */}
                {allowColumnResize && column.resizable && (
                  <div
                    className={cn(
                      "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group",
                      "hover:bg-[#3B82F6]",
                      resizingColumn === column.id && "bg-[#3B82F6]"
                    )}
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                )}
              </div>
            ))}

            {/* Add column button */}
            {allowColumnCustomization && (
              <div className="relative flex items-center justify-center px-3 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnSelector(prev => !prev);
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isDark
                      ? "hover:bg-white/10 text-[#9CA3AF] hover:text-white"
                      : "hover:bg-gray-200 text-gray-400 hover:text-gray-600",
                    showColumnSelector && (isDark ? "bg-white/10" : "bg-gray-200")
                  )}
                  title={locale === 'es' ? 'Agregar columna' : 'Add column'}
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Column Selector - positioned relative to button */}
                <ColumnSelector
                  isOpen={showColumnSelector}
                  onClose={() => setShowColumnSelector(false)}
                  columns={columns}
                  customFields={customFields}
                  onColumnsChange={handleColumnsChange}
                  onCreateCustomField={() => {
                    setShowColumnSelector(false);
                    setShowCreateFieldModal(true);
                  }}
                  isDark={isDark}
                  locale={locale}
                />
              </div>
            )}
          </div>

          {/* Task List */}
          <AnimatePresence mode="popLayout">
            {displayTasks.map((task, index) => {
              const isExpanded = expandedTasks.has(task.id);
              // v0.18.3: Limit animation delay to max 200ms for better filter responsiveness
              const animationDelay = Math.min(index * 0.01, 0.2);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: animationDelay }}
                  className={cn(
                    "flex items-center border-b transition-colors",
                    isDark
                      ? "border-white/5 hover:bg-white/5"
                      : "border-gray-100 hover:bg-gray-50"
                  )}
                  onClick={() => callbacks.onTaskClick?.(task)}
                  onDoubleClick={() => callbacks.onTaskDoubleClick?.(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                >
                  {visibleColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center px-4 py-3 min-h-[52px]"
                      style={{ width: column.width, minWidth: column.minWidth }}
                    >
                      {column.type === 'name' ? (
                        // Name column with hierarchy
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          {/* Indentation spacer for hierarchy levels */}
                          {showHierarchy && task.level > 0 && (
                            <div style={{ width: `${task.level * 24}px` }} className="flex-shrink-0" />
                          )}
                          {showHierarchy && task.hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(task.id);
                              }}
                              className={cn("p-0.5 rounded flex-shrink-0", isDark ? "hover:bg-white/10" : "hover:bg-gray-200")}
                            >
                              {isExpanded ? (
                                <ChevronDown className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-400")} />
                              ) : (
                                <ChevronRight className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-400")} />
                              )}
                            </button>
                          )}
                          {showHierarchy && !task.hasChildren && <div className="w-5 flex-shrink-0" />}

                          <span className={cn(
                            "truncate font-medium",
                            isDark ? "text-white" : "text-gray-900",
                            task.progress === 100 && (isDark ? "line-through text-[#6B7280]" : "line-through text-gray-400")
                          )}>
                            {task.name}
                          </span>
                        </div>
                      ) : (
                        renderCell(task, column)
                      )}
                    </div>
                  ))}

                  {/* Empty cell for add column button alignment */}
                  {allowColumnCustomization && (
                    <div className="w-12 flex-shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty search state */}
          {displayTasks.length === 0 && searchQuery && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <List className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                <p className={cn(isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
                  {t.empty.noResults}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <TableContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        isDark={isDark}
        locale={locale}
        onTaskEdit={callbacks.onTaskEdit}
        onTaskDuplicate={callbacks.onTaskDuplicate}
        onTaskDelete={callbacks.onTaskDelete}
        onTaskUpdate={callbacks.onTaskUpdate}
        onColumnHide={handleColumnHide}
        onColumnSort={handleColumnSort}
        availableUsers={availableUsers}
      />

      {/* Create Field Modal */}
      <CreateFieldModal
        isOpen={showCreateFieldModal}
        onClose={() => setShowCreateFieldModal(false)}
        onSave={handleCreateCustomField}
        isDark={isDark}
        locale={locale}
      />
    </div>
  );
}

export default ListView;
