/**
 * ListView Component
 * Professional list view for task management
 * Based on SaaS ProjectList component styles
 * @version 0.17.0
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import type { Task } from '../Gantt/types';
import type { ListViewProps, FlattenedTask } from './types';
import { mergeListViewTranslations } from './i18n';
import { cn } from '../../utils';

type SortField = 'name' | 'startDate' | 'endDate' | 'progress' | 'status';
type SortOrder = 'asc' | 'desc';

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
 * Status Icon component
 */
function StatusIcon({ status, progress }: { status?: string; progress?: number }) {
  if (progress === 100 || status === 'completed') {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  }
  if ((progress && progress > 0) || status === 'in-progress') {
    return <PlayCircle className="w-5 h-5 text-blue-500" />;
  }
  return <Circle className="w-5 h-5 text-gray-400" />;
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
    showSearch = true,
    showHierarchy = true,
  } = config;

  const t = mergeListViewTranslations(locale, customTranslations);
  const isDark = themeName === 'dark';

  // State
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize expanded tasks
  useMemo(() => {
    const parentIds = new Set<string>();
    function findParents(taskList: Task[]) {
      for (const task of taskList) {
        if (task.subtasks?.length) {
          parentIds.add(task.id);
          findParents(task.subtasks);
        }
      }
    }
    findParents(tasks);
    setExpandedTasks(parentIds);
  }, [tasks]);

  // Toggle task expansion
  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
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
    callbacks.onSortChange?.({ column: field, direction: sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [sortField, sortOrder, callbacks]);

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

    // Filter by expanded state
    const visibleTasks: FlattenedTask[] = [];
    for (const task of flatTasks) {
      let isVisible = task.level === 0;
      if (task.level > 0) {
        isVisible = true;
      }
      if (isVisible || searchQuery.trim()) {
        visibleTasks.push(task);
      }
    }

    // Sort
    if (searchQuery.trim()) {
      visibleTasks.sort((a, b) => {
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
          default:
            return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return visibleTasks;
  }, [tasks, searchQuery, sortField, sortOrder]);

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

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
    <div className={cn("flex-1 flex flex-col w-full h-full overflow-hidden", isDark ? "bg-[#0F1117]" : "bg-white", className)} style={style}>
      {/* Toolbar */}
      <div className={cn("flex-shrink-0 px-6 py-4 border-b", isDark ? "border-white/10" : "border-gray-200")}>
        <div className="flex items-center gap-4">
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

          {/* Task count */}
          <div className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
            {displayTasks.length} {t.pagination.tasks}
          </div>
        </div>
      </div>

      {/* List Header */}
      <div className={cn(
        "flex-shrink-0 grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs font-medium uppercase tracking-wider",
        isDark ? "border-white/10 bg-white/5 text-[#9CA3AF]" : "border-gray-200 bg-gray-50 text-gray-500"
      )}>
        <div className="col-span-5 flex items-center gap-2">
          <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-[#3B82F6]">
            {t.columns.name}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-[#3B82F6]">
            {t.columns.status}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <button onClick={() => handleSort('startDate')} className="flex items-center gap-1 hover:text-[#3B82F6]">
            {t.columns.startDate}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <button onClick={() => handleSort('endDate')} className="flex items-center gap-1 hover:text-[#3B82F6]">
            {t.columns.endDate}
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <div className="col-span-1 flex items-center gap-1">
          <button onClick={() => handleSort('progress')} className="flex items-center gap-1 hover:text-[#3B82F6]">
            %
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence>
          {displayTasks.map((task, index) => {
            const isExpanded = expandedTasks.has(task.id);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "grid grid-cols-12 gap-4 px-6 py-3 border-b transition-colors cursor-pointer",
                  isDark
                    ? "border-white/5 hover:bg-white/5"
                    : "border-gray-100 hover:bg-gray-50"
                )}
                style={{ paddingLeft: showHierarchy ? `${24 + task.level * 24}px` : undefined }}
                onClick={() => callbacks.onTaskClick?.(task)}
                onDoubleClick={() => callbacks.onTaskDoubleClick?.(task)}
              >
                {/* Task Name */}
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  {showHierarchy && task.hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(task.id);
                      }}
                      className={cn("p-0.5 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-200")}
                    >
                      {isExpanded ? (
                        <ChevronDown className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-400")} />
                      ) : (
                        <ChevronRight className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-400")} />
                      )}
                    </button>
                  )}
                  {showHierarchy && !task.hasChildren && <div className="w-5" />}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      callbacks.onTaskUpdate?.({
                        ...task,
                        progress: task.progress === 100 ? 0 : 100,
                        status: task.progress === 100 ? 'todo' : 'completed'
                      });
                    }}
                    className="flex-shrink-0"
                  >
                    <StatusIcon status={task.status} progress={task.progress} />
                  </button>

                  <span className={cn(
                    "truncate",
                    isDark ? "text-white" : "text-gray-900",
                    task.progress === 100 && (isDark ? "line-through text-[#6B7280]" : "line-through text-gray-400")
                  )}>
                    {task.name}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    task.progress === 100 || task.status === 'completed'
                      ? "bg-green-500/10 text-green-500"
                      : (task.progress && task.progress > 0) || task.status === 'in-progress'
                        ? "bg-blue-500/10 text-blue-500"
                        : isDark
                          ? "bg-white/10 text-[#9CA3AF]"
                          : "bg-gray-100 text-gray-600"
                  )}>
                    {task.progress === 100 || task.status === 'completed'
                      ? t.status.completed
                      : (task.progress && task.progress > 0) || task.status === 'in-progress'
                        ? t.status.inProgress
                        : t.status.todo}
                  </span>
                </div>

                {/* Start Date */}
                <div className={cn("col-span-2 flex items-center gap-1 text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
                  <Calendar className="w-4 h-4" />
                  {formatDate(task.startDate)}
                </div>

                {/* End Date */}
                <div className={cn("col-span-2 flex items-center gap-1 text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
                  <Clock className="w-4 h-4" />
                  {formatDate(task.endDate)}
                </div>

                {/* Progress */}
                <div className="col-span-1 flex items-center">
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          task.progress === 100 ? "bg-green-500" : "bg-[#3B82F6]"
                        )}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                    <span className={cn("text-xs w-8", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {task.progress || 0}%
                    </span>
                  </div>
                </div>
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
  );
}

export default ListView;
