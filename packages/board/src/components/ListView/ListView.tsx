/**
 * ListView Component
 * Professional list view for task management
 * @version 0.17.0
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Check,
  Circle,
  Clock,
  Trash2,
  Edit,
  Copy,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type {
  ListViewProps,
  ListSort,
  ListFilter,
  FlattenedTask,
  ListColumn,
} from './types';
import { getListViewTheme } from './themes';
import { getListViewTranslations, mergeListViewTranslations } from './i18n';
import { cn } from '../../utils';

/**
 * Default columns configuration
 */
const DEFAULT_COLUMNS: ListColumn[] = [
  { id: 'name', label: 'name', width: 300, minWidth: 200, visible: true, sortable: true, resizable: true },
  { id: 'status', label: 'status', width: 120, minWidth: 100, visible: true, sortable: true },
  { id: 'progress', label: 'progress', width: 120, minWidth: 80, visible: true, sortable: true },
  { id: 'startDate', label: 'startDate', width: 120, minWidth: 100, visible: true, sortable: true },
  { id: 'endDate', label: 'endDate', width: 120, minWidth: 100, visible: true, sortable: true },
  { id: 'assignees', label: 'assignees', width: 150, minWidth: 100, visible: true, sortable: false },
  { id: 'actions', label: 'actions', width: 80, visible: true, sortable: false },
];

/**
 * Flatten tasks with hierarchy information
 */
function flattenTasks(tasks: Task[], level = 0, parentPath: string[] = []): FlattenedTask[] {
  const result: FlattenedTask[] = [];

  for (const task of tasks) {
    const currentPath = [...parentPath, task.id];
    result.push({
      ...task,
      level,
      hasChildren: (task.subtasks?.length || 0) > 0,
      parentPath: currentPath,
    });

    if (task.subtasks?.length && task.isExpanded !== false) {
      result.push(...flattenTasks(task.subtasks, level + 1, currentPath));
    }
  }

  return result;
}

/**
 * Format date for display
 */
function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Status badge component
 */
function StatusBadge({
  status,
  theme,
  translations,
}: {
  status?: 'todo' | 'in-progress' | 'completed';
  theme: ReturnType<typeof getListViewTheme>;
  translations: ReturnType<typeof getListViewTranslations>;
}) {
  const statusConfig = {
    todo: {
      color: theme.statusTodo,
      label: translations.status.todo,
      Icon: Circle,
    },
    'in-progress': {
      color: theme.statusInProgress,
      label: translations.status.inProgress,
      Icon: Clock,
    },
    completed: {
      color: theme.statusCompleted,
      label: translations.status.completed,
      Icon: Check,
    },
  };

  const config = statusConfig[status || 'todo'];
  const Icon = config.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({
  progress,
  theme,
}: {
  progress: number;
  theme: ReturnType<typeof getListViewTheme>;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.bgSecondary }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor:
              progress >= 100
                ? theme.statusCompleted
                : progress > 0
                ? theme.statusInProgress
                : theme.statusTodo,
          }}
        />
      </div>
      <span
        className="text-xs font-medium w-10 text-right"
        style={{ color: theme.textSecondary }}
      >
        {progress}%
      </span>
    </div>
  );
}

/**
 * Assignees display component
 */
function AssigneesDisplay({
  assignees,
  theme,
}: {
  assignees?: Task['assignees'];
  theme: ReturnType<typeof getListViewTheme>;
}) {
  if (!assignees || assignees.length === 0) {
    return <span style={{ color: theme.textMuted }}>-</span>;
  }

  return (
    <div className="flex items-center -space-x-2">
      {assignees.slice(0, 3).map((assignee, index) => (
        <div
          key={index}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2"
          style={{
            backgroundColor: assignee.color,
            borderColor: theme.bgPrimary,
            color: '#fff',
          }}
          title={assignee.name}
        >
          {assignee.avatar ? (
            <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            assignee.initials
          )}
        </div>
      ))}
      {assignees.length > 3 && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2"
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.bgPrimary,
            color: theme.textSecondary,
          }}
        >
          +{assignees.length - 3}
        </div>
      )}
    </div>
  );
}

/**
 * Row actions dropdown component
 */
function RowActions({
  task,
  theme,
  translations,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetails,
}: {
  task: Task;
  theme: ReturnType<typeof getListViewTheme>;
  translations: ReturnType<typeof getListViewTranslations>;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onViewDetails?: (task: Task) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-opacity-10 transition-colors"
        style={{
          color: theme.textSecondary,
          backgroundColor: isOpen ? theme.bgHover : 'transparent',
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[140px]"
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
          >
            {onViewDetails && (
              <button
                onClick={() => {
                  onViewDetails(task);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-opacity-10 transition-colors"
                style={{ color: theme.textPrimary }}
              >
                <Eye size={14} />
                {translations.actions.viewDetails}
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(task);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-opacity-10 transition-colors"
                style={{ color: theme.textPrimary }}
              >
                <Edit size={14} />
                {translations.actions.edit}
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={() => {
                  onDuplicate(task);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-opacity-10 transition-colors"
                style={{ color: theme.textPrimary }}
              >
                <Copy size={14} />
                {translations.actions.duplicate}
              </button>
            )}
            {onDelete && (
              <>
                <div className="my-1 border-t" style={{ borderColor: theme.border }} />
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-opacity-10 transition-colors text-red-500"
                >
                  <Trash2 size={14} />
                  {translations.actions.delete}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
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
}: ListViewProps) {
  const {
    theme: themeName = 'dark',
    locale = 'en',
    customTranslations,
    enableSelection = true,
    enableMultiSelect = true,
    showSearch = true,
    showFilters = true,
    showHierarchy = true,
    columns = DEFAULT_COLUMNS,
    rowHeight = 48,
    permissions = {},
  } = config;

  const theme = getListViewTheme(themeName);
  const t = mergeListViewTranslations(locale, customTranslations);

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<ListSort>({ column: 'name', direction: 'asc' });
  const [filter, setFilter] = useState<ListFilter>({ search: '', showCompleted: true });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Flatten tasks with hierarchy
  const flattenedTasks = useMemo(() => {
    if (!showHierarchy) {
      // Return all tasks flat without hierarchy
      const allTasks: FlattenedTask[] = [];
      const collectTasks = (taskList: Task[]) => {
        for (const task of taskList) {
          allTasks.push({
            ...task,
            level: 0,
            hasChildren: false,
            parentPath: [task.id],
          });
          if (task.subtasks?.length) {
            collectTasks(task.subtasks);
          }
        }
      };
      collectTasks(tasks);
      return allTasks;
    }
    return flattenTasks(tasks);
  }, [tasks, showHierarchy]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return flattenedTasks.filter((task) => {
      // Search filter
      if (filter.search && !task.name.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filter.status?.length && !filter.status.includes(task.status || 'todo')) {
        return false;
      }

      // Hide completed filter
      if (!filter.showCompleted && task.status === 'completed') {
        return false;
      }

      // Assignee filter
      if (filter.assignees?.length) {
        const taskAssigneeNames = task.assignees?.map((a) => a.name.toLowerCase()) || [];
        if (!filter.assignees.some((name) => taskAssigneeNames.includes(name.toLowerCase()))) {
          return false;
        }
      }

      // Date range filter
      if (filter.dateRange) {
        const taskStart = task.startDate ? new Date(task.startDate) : null;
        const taskEnd = task.endDate ? new Date(task.endDate) : null;
        const filterStart = new Date(filter.dateRange.start);
        const filterEnd = new Date(filter.dateRange.end);

        if (taskStart && taskEnd) {
          if (taskEnd < filterStart || taskStart > filterEnd) {
            return false;
          }
        }
      }

      return true;
    });
  }, [flattenedTasks, filter]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.column) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'startDate':
          const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
          comparison = aStart - bStart;
          break;
        case 'endDate':
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
          comparison = aEnd - bEnd;
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'status':
          const statusOrder = { todo: 0, 'in-progress': 1, completed: 2 };
          comparison = (statusOrder[a.status || 'todo'] || 0) - (statusOrder[b.status || 'todo'] || 0);
          break;
        default:
          comparison = 0;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredTasks, sort]);

  // Handlers
  const handleSort = useCallback((column: ListSort['column']) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    callbacks.onSortChange?.({ column, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  }, [sort, callbacks]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTasks.map((t) => t.id)));
    }
  }, [selectedIds, sortedTasks]);

  const handleSelectRow = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      callbacks.onSelectionChange?.(Array.from(next));
      return next;
    });
  }, [callbacks]);

  const handleToggleExpand = useCallback((taskId: string) => {
    callbacks.onTaskToggleExpand?.(taskId);
  }, [callbacks]);

  // Visible columns
  const visibleColumns = columns.filter((col) => col.visible);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn('libxai-listview', className)}
        style={{ backgroundColor: theme.bgPrimary, ...style }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn('libxai-listview', className)}
        style={{ backgroundColor: theme.bgPrimary, ...style }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 font-semibold">{typeof error === 'string' ? error : error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('libxai-listview flex flex-col h-full', className)}
      style={{ backgroundColor: theme.bgPrimary, color: theme.textPrimary, ...style }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: theme.border }}
      >
        <div className="flex items-center gap-3">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: theme.textMuted }}
              />
              <input
                type="text"
                placeholder={t.toolbar.searchPlaceholder}
                value={filter.search || ''}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-9 pr-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                }}
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors"
              style={{
                backgroundColor: showFilterPanel ? theme.accentLight : theme.bgSecondary,
                borderColor: showFilterPanel ? theme.accent : theme.border,
                color: showFilterPanel ? theme.accent : theme.textSecondary,
              }}
            >
              <Filter size={16} />
              {t.toolbar.filter}
            </button>
          )}

          {/* Clear filters */}
          {(filter.search || filter.status?.length || filter.assignees?.length) && (
            <button
              onClick={() => setFilter({ search: '', showCompleted: true })}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ color: theme.accent }}
            >
              <X size={14} />
              {t.toolbar.clearFilters}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Selection info */}
          {selectedIds.size > 0 && (
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {selectedIds.size} {t.bulk.selected}
            </span>
          )}

          {/* Bulk delete */}
          {selectedIds.size > 0 && permissions.canDeleteTask !== false && callbacks.onBulkDelete && (
            <button
              onClick={() => callbacks.onBulkDelete?.(Array.from(selectedIds))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
              {t.bulk.delete}
            </button>
          )}

          {/* New Task */}
          {permissions.canCreateTask !== false && callbacks.onTaskCreate && (
            <button
              onClick={() => callbacks.onTaskCreate?.()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: theme.accent, color: '#fff' }}
            >
              <Plus size={16} />
              {t.toolbar.newTask}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div
          className="px-4 py-3 border-b flex items-center gap-4"
          style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}
        >
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.textSecondary }}>{t.filters.status}:</span>
            {(['todo', 'in-progress', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilter((prev) => {
                    const current = prev.status || [];
                    const next = current.includes(status)
                      ? current.filter((s) => s !== status)
                      : [...current, status];
                    return { ...prev, status: next.length ? next : undefined };
                  });
                }}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filter.status?.includes(status) ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: filter.status?.includes(status) ? theme.accentLight : theme.bgPrimary,
                  color: filter.status?.includes(status) ? theme.accent : theme.textSecondary,
                  borderColor: theme.border,
                }}
              >
                {t.status[status.replace('-', '') as keyof typeof t.status] || status}
              </button>
            ))}
          </div>

          {/* Show completed toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filter.showCompleted ?? true}
              onChange={(e) => setFilter((prev) => ({ ...prev, showCompleted: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {t.filters.showCompleted}
            </span>
          </label>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-10" style={{ backgroundColor: theme.bgSecondary }}>
            <tr>
              {/* Checkbox column */}
              {enableSelection && enableMultiSelect && (
                <th className="w-10 px-3 py-2 border-b" style={{ borderColor: theme.border }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedTasks.length && sortedTasks.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
              )}

              {/* Data columns */}
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b cursor-pointer"
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    borderColor: theme.border,
                    color: theme.textSecondary,
                  }}
                  onClick={() => column.sortable && handleSort(column.id as ListSort['column'])}
                >
                  <div className="flex items-center gap-1">
                    {t.columns[column.id as keyof typeof t.columns] || column.label}
                    {column.sortable && (
                      <span className="ml-1">
                        {sort.column === column.id ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.3 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (enableSelection && enableMultiSelect ? 1 : 0)}
                  className="px-3 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span style={{ color: theme.textMuted }}>
                      {filter.search || filter.status?.length
                        ? t.empty.noResults
                        : t.empty.noTasks}
                    </span>
                    {permissions.canCreateTask !== false && callbacks.onTaskCreate && !filter.search && (
                      <button
                        onClick={() => callbacks.onTaskCreate?.()}
                        className="flex items-center gap-1 text-sm"
                        style={{ color: theme.accent }}
                      >
                        <Plus size={16} />
                        {t.empty.addFirstTask}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedTasks.map((task, index) => (
                <tr
                  key={task.id}
                  className="group transition-colors cursor-pointer"
                  style={{
                    backgroundColor: selectedIds.has(task.id)
                      ? theme.bgSelected
                      : index % 2 === 0
                      ? 'transparent'
                      : theme.bgAlternate,
                  }}
                  onClick={() => callbacks.onTaskClick?.(task)}
                  onDoubleClick={() => callbacks.onTaskDoubleClick?.(task)}
                >
                  {/* Checkbox */}
                  {enableSelection && enableMultiSelect && (
                    <td
                      className="w-10 px-3 py-2 border-b"
                      style={{ borderColor: theme.borderLight }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.id)}
                        onChange={() => handleSelectRow(task.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                  )}

                  {/* Data cells */}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className="px-3 border-b"
                      style={{
                        height: rowHeight,
                        borderColor: theme.borderLight,
                      }}
                    >
                      {column.id === 'name' && (
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: showHierarchy ? task.level * 20 : 0 }}
                        >
                          {showHierarchy && task.hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExpand(task.id);
                              }}
                              className="p-0.5 rounded hover:bg-opacity-10 transition-colors"
                              style={{ color: theme.textSecondary }}
                            >
                              {task.isExpanded !== false ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                          )}
                          {showHierarchy && !task.hasChildren && <span className="w-5" />}
                          <span
                            className={`font-medium ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}
                            style={{ color: task.color || theme.textPrimary }}
                          >
                            {task.name}
                          </span>
                        </div>
                      )}
                      {column.id === 'status' && (
                        <StatusBadge status={task.status} theme={theme} translations={t} />
                      )}
                      {column.id === 'progress' && (
                        <ProgressBar progress={task.progress} theme={theme} />
                      )}
                      {column.id === 'startDate' && (
                        <span style={{ color: theme.textSecondary }}>
                          {formatDate(task.startDate)}
                        </span>
                      )}
                      {column.id === 'endDate' && (
                        <span style={{ color: theme.textSecondary }}>
                          {formatDate(task.endDate)}
                        </span>
                      )}
                      {column.id === 'assignees' && (
                        <AssigneesDisplay assignees={task.assignees} theme={theme} />
                      )}
                      {column.id === 'actions' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <RowActions
                            task={task}
                            theme={theme}
                            translations={t}
                            onEdit={
                              permissions.canUpdateTask !== false
                                ? (t) => callbacks.onTaskClick?.(t)
                                : undefined
                            }
                            onDelete={
                              permissions.canDeleteTask !== false
                                ? callbacks.onTaskDelete
                                : undefined
                            }
                            onViewDetails={callbacks.onTaskClick}
                          />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 border-t flex items-center justify-between text-sm"
        style={{ borderColor: theme.border, color: theme.textSecondary }}
      >
        <span>
          {t.pagination.showing} {sortedTasks.length} {t.pagination.of} {flattenedTasks.length} {t.pagination.tasks}
        </span>
      </div>
    </div>
  );
}

export default ListView;
