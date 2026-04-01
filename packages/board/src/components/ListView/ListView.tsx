/**
 * ListView Component
 * Professional list view for task management with dynamic columns
 * ClickUp-style features: column customization, context menu, custom fields
 * @version 0.18.0
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Search,
  Plus,
  FolderOpen,
  Folder,
  PanelRight,
  GripVertical,
  Layers,
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
// v2.0.0: Chronos Interactive Time Manager cells
import { ScheduleVarianceCell } from './cells/ScheduleVarianceCell';
import { HoursBarCell } from './cells/HoursBarCell';
import { TeamLoadCell } from './cells/TeamLoadCell';
import { BlockersCell } from './cells/BlockersCell';

// Components
import { TableContextMenu } from './TableContextMenu';
import { ganttUtils } from '../Gantt/ganttUtils';
import { ColumnSelector } from './ColumnSelector';
import { CreateFieldModal } from './CreateFieldModal';
import { StatusFilter, type StatusFilterValue } from './StatusFilter';
import { ProjectHealthSidebar } from './ProjectHealthSidebar';

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
 * Calculate average SPI (Schedule Performance Index) for a group task's subtasks
 * SPI = progress / expected_progress (based on elapsed time vs duration)
 */
function calculateGroupSPI(task: Task): number | null {
  const subtasks = task.subtasks;
  if (!subtasks?.length) return null;

  const now = new Date();
  let totalSPI = 0;
  let count = 0;

  for (const sub of subtasks) {
    if (!sub.startDate || !sub.endDate) continue;
    const start = sub.startDate.getTime();
    const end = sub.endDate.getTime();
    const duration = end - start;
    if (duration <= 0) continue;

    const elapsed = Math.max(0, Math.min(now.getTime() - start, duration));
    const expectedProgress = (elapsed / duration) * 100;
    if (expectedProgress <= 0) continue;

    const spi = (sub.progress || 0) / expectedProgress;
    totalSPI += spi;
    count++;
  }

  return count > 0 ? totalSPI / count : null;
}

/**
 * Count resource conflicts in a group (subtasks with >100% team load)
 */
function countResourceConflicts(task: Task): number {
  if (!task.subtasks?.length) return 0;
  return task.subtasks.filter(sub => sub.teamLoad && sub.teamLoad.percentage >= 100).length;
}

/**
 * Sum timeLoggedMinutes and effortMinutes recursively across all subtasks of a group.
 * Returns { spent, allocated } in minutes.
 */
function calculateGroupHours(task: Task): { spent: number; allocated: number; quoted: number } {
  if (!task.subtasks?.length) return { spent: 0, allocated: 0, quoted: 0 };
  let spent = 0;
  let allocated = 0;
  let quoted = 0;
  for (const sub of task.subtasks) {
    if (sub.subtasks?.length) {
      // Sub is itself a group — recurse, don't double-count its own values
      const nested = calculateGroupHours(sub);
      spent += nested.spent;
      allocated += nested.allocated;
      quoted += nested.quoted;
    } else {
      // Leaf task — sum directly
      spent += (sub as any).timeLoggedMinutes ?? 0;
      allocated += (sub as any).effortMinutes ?? 0;
      quoted += (sub as any).soldEffortMinutes ?? 0;
    }
  }
  return { spent, allocated, quoted };
}

function formatGroupHours(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Inline weight cell — click to edit, Enter/blur to save
 */
function WeightCellInline({ value, onChange, isDark }: { value: number; onChange: (v: number) => void; isDark: boolean }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value || ''));

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        inputMode="decimal"
        value={editVal}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setEditVal(e.target.value.replace(/[^0-9.]/g, ''))}
        onBlur={() => {
          const parsed = parseFloat(editVal);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) onChange(parsed);
          else if (editVal === '') onChange(0);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setEditVal(String(value || '')); setEditing(false); }
        }}
        className={cn(
          "w-14 text-xs text-right font-mono px-1 py-0.5 rounded border outline-none",
          isDark ? "bg-white/5 border-[#00E5CC]/50 text-white" : "bg-gray-50 border-blue-400 text-gray-900"
        )}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      />
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditVal(String(value || '')); setEditing(true); }}
      className={cn(
        "text-xs font-mono cursor-pointer hover:underline",
        value > 0 ? (isDark ? "text-white/80" : "text-gray-700") : (isDark ? "text-white/30" : "text-gray-300")
      )}
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {value > 0 ? `${value}%` : '—'}
    </button>
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
  availableUsers = [],
  customFields = [],
  toolbarRightContent,
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
    // v1.4.9: Governance v2.0 - Financial blur
    financialBlur,
    // v2.0.0: Chronos health sidebar
    healthSidebar,
    // v2.3.0: Financial lens
    lens = 'hours',
    hourlyRate = 0,
    rateMap,
    // v2.3.2: Aggregate child hours into parent hoursBar cell
    aggregateParentHours = false,
    // v2.4.0: Project totals sticky footer
    showProjectTotals = false,
  } = config;

  const t = mergeListViewTranslations(locale, customTranslations);
  const isDark = themeName === 'dark';

  // v2.5.0: Resolve per-task hourly rate from assignees' rateMap, fallback to global hourlyRate
  const getTaskRate = (task: Task): number => {
    if (!rateMap || !task.assignees || task.assignees.length === 0) return hourlyRate;
    const rates = task.assignees
      .map((a: any) => a.id ? rateMap[a.id] : undefined)
      .filter((r): r is number => r != null && r > 0);
    if (rates.length === 0) return hourlyRate;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  };

  // v2.5.1: Calculate group dollar totals — same logic as projectTotalHours (sumLeaves)
  const calculateGroupDollars = (parentTask: Task): { dollarSpent: number; dollarAllocated: number; dollarQuoted: number } => {
    let dollarSpent = 0, dollarAllocated = 0, dollarQuoted = 0;
    const sumLeaves = (taskList: Task[]) => {
      for (const t of taskList) {
        if (t.subtasks && t.subtasks.length > 0) {
          sumLeaves(t.subtasks);
        } else {
          const rate = getTaskRate(t);
          dollarSpent += (((t as any).timeLoggedMinutes ?? 0) / 60) * rate;
          dollarAllocated += (((t as any).effortMinutes ?? 0) / 60) * rate;
          dollarQuoted += (((t as any).soldEffortMinutes ?? 0) / 60) * rate;
        }
      }
    };
    if (parentTask.subtasks) {
      sumLeaves(parentTask.subtasks);
    }
    return { dollarSpent, dollarAllocated, dollarQuoted };
  };

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

  // Calculate total project hours + dollars from all tasks (flat sum of leaf nodes to avoid double counting)
  const projectTotalHours = useMemo(() => {
    function sumLeaves(taskList: Task[]): { spent: number; allocated: number; quoted: number; dollarSpent: number; dollarAllocated: number; dollarQuoted: number } {
      let spent = 0; let allocated = 0; let quoted = 0;
      let dollarSpent = 0; let dollarAllocated = 0; let dollarQuoted = 0;
      for (const t of taskList) {
        if (t.subtasks && t.subtasks.length > 0) {
          const nested = sumLeaves(t.subtasks);
          spent += nested.spent; allocated += nested.allocated; quoted += nested.quoted;
          dollarSpent += nested.dollarSpent; dollarAllocated += nested.dollarAllocated; dollarQuoted += nested.dollarQuoted;
        } else {
          const tSpent = (t as any).timeLoggedMinutes ?? 0;
          const tAlloc = (t as any).effortMinutes ?? 0;
          const tQuoted = (t as any).soldEffortMinutes ?? 0;
          spent += tSpent; allocated += tAlloc; quoted += tQuoted;
          // Calculate $ using per-task rate (same as cell rendering)
          const rate = getTaskRate(t);
          dollarSpent += (tSpent / 60) * rate;
          dollarAllocated += (tAlloc / 60) * rate;
          dollarQuoted += (tQuoted / 60) * rate;
        }
      }
      return { spent, allocated, quoted, dollarSpent, dollarAllocated, dollarQuoted };
    }
    return sumLeaves(tasks);
  }, [tasks]);

  // Pre-compute parent→children weight sums (recursive for all levels)
  const parentWeightSums = useMemo(() => {
    const sums = new Map<string, number>();
    function collectWeights(taskList: Task[]): number {
      let total = 0;
      for (const t of taskList) {
        if (t.subtasks && t.subtasks.length > 0) {
          const childSum = collectWeights(t.subtasks);
          sums.set(t.id, childSum);
          total += childSum;
        } else {
          total += (t as any).weight || 0;
        }
      }
      return total;
    }
    collectWeights(tasks);
    return sums;
  }, [tasks]);

  // Merge project total into healthSidebar data so sidebar can display it
  const healthSidebarWithTotal = useMemo(() => {
    if (!healthSidebar?.enabled || !healthSidebar.data) return healthSidebar;
    return {
      ...healthSidebar,
      data: {
        ...healthSidebar.data,
        totalHoursSpentMinutes: projectTotalHours.spent,
        totalHoursAllocatedMinutes: projectTotalHours.allocated,
      },
    };
  }, [healthSidebar, projectTotalHours]);

  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortField, setSortField] = useState<SortField>('position');
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

  // v2.5.0: Row drag & drop (mouse-based, same pattern as Gantt TaskGrid)
  const [rowDragId, setRowDragId] = useState<string | null>(null);
  const [rowDragging, setRowDragging] = useState(false);
  const [rowDropTargetId, setRowDropTargetId] = useState<string | null>(null);
  const [rowDropPosition, setRowDropPosition] = useState<'above' | 'below' | 'child' | null>(null);
  const [rowGhostPos, setRowGhostPos] = useState<{ x: number; y: number } | null>(null);
  const rowDragStartY = useRef(0);
  const rowDraggingRef = useRef(false);
  const canDragRows = !!(callbacks.onTaskMove || callbacks.onTaskReparent);

  const handleRowDragStart = useCallback((taskId: string, e: React.MouseEvent) => {
    if (!canDragRows) return;
    e.preventDefault();
    rowDragStartY.current = e.clientY;
    setRowDragId(taskId);
    rowDraggingRef.current = false;
    setRowDragging(false);
    setRowGhostPos({ x: e.clientX, y: e.clientY });
  }, [canDragRows]);

  const handleRowDragMove = useCallback((e: MouseEvent) => {
    if (!rowDragId) return;
    const delta = Math.abs(e.clientY - rowDragStartY.current);
    if (delta > 5 && !rowDraggingRef.current) {
      rowDraggingRef.current = true;
      setRowDragging(true);
    }
    setRowGhostPos({ x: e.clientX, y: e.clientY });
    if (!rowDraggingRef.current) return;

    // Find target row
    const rows = document.querySelectorAll('[data-listview-row]');
    let foundId: string | null = null;
    let pos: 'above' | 'below' | 'child' | null = null;
    rows.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const id = row.getAttribute('data-listview-row');
      if (id && id !== rowDragId && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        foundId = id;
        const relY = e.clientY - rect.top;
        const h = rect.height;
        pos = relY < h * 0.25 ? 'above' : relY > h * 0.75 ? 'below' : 'child';
      }
    });
    setRowDropTargetId(foundId);
    setRowDropPosition(pos);
  }, [rowDragId]);

  const handleRowDragEnd = useCallback(() => {
    if (rowDraggingRef.current && rowDragId && rowDropTargetId && rowDropPosition) {
      if (rowDropPosition === 'child' && callbacks.onTaskReparent) {
        callbacks.onTaskReparent(rowDragId, rowDropTargetId);
      } else if (rowDropPosition === 'above' || rowDropPosition === 'below') {
        // Find parent of target
        const findParent = (list: Task[], targetId: string, parent: string | null = null): string | null | undefined => {
          for (const t of list) {
            if (t.id === targetId) return parent;
            if (t.subtasks) {
              const found = findParent(t.subtasks, targetId, t.id);
              if (found !== undefined) return found;
            }
          }
          return undefined;
        };
        const draggedParent = findParent(tasks, rowDragId, null);
        const targetParent = findParent(tasks, rowDropTargetId, null);

        if (callbacks.onTaskReparent) {
          const findSiblings = (list: Task[], parentId: string | null): Task[] => {
            if (parentId === null) return list;
            for (const t of list) {
              if (t.id === parentId) return t.subtasks || [];
              if (t.subtasks) {
                const found = findSiblings(t.subtasks, parentId);
                if (found.length > 0 || t.subtasks.some(s => s.id === parentId)) return found;
              }
            }
            return [];
          };
          const siblings = findSiblings(tasks, targetParent ?? null);
          const targetIdx = siblings.findIndex(t => t.id === rowDropTargetId);
          const sameGroup = draggedParent === targetParent;
          const dragIdx = sameGroup ? siblings.findIndex(t => t.id === rowDragId) : -1;
          let pos = rowDropPosition === 'below' ? targetIdx + 1 : targetIdx;
          if (sameGroup && dragIdx !== -1 && dragIdx < targetIdx) pos -= 1;
          callbacks.onTaskReparent(rowDragId, targetParent ?? null, Math.max(0, pos));
        }
      }
    }
    setRowDragId(null);
    setRowDropTargetId(null);
    setRowDropPosition(null);
    setRowGhostPos(null);
    rowDraggingRef.current = false;
    setRowDragging(false);
  }, [rowDragId, rowDropTargetId, rowDropPosition, tasks, callbacks]);

  useEffect(() => {
    if (rowDragId) {
      document.addEventListener('mousemove', handleRowDragMove);
      document.addEventListener('mouseup', handleRowDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleRowDragMove);
        document.removeEventListener('mouseup', handleRowDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
    return undefined;
  }, [rowDragId, handleRowDragMove, handleRowDragEnd]);

  // v2.5.0: WBS Level filter (same as Gantt)
  const [wbsLevel, setWbsLevel] = useState<number | 'all'>('all');
  const [wbsDropdownOpen, setWbsDropdownOpen] = useState(false);
  const wbsTriggerRef = useRef<HTMLButtonElement>(null);
  const wbsDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate max depth from task tree
  const maxWbsDepth = useMemo(() => {
    let max = 0;
    function walk(taskList: Task[], depth: number) {
      for (const t of taskList) {
        if (depth > max) max = depth;
        if (t.subtasks?.length) walk(t.subtasks, depth + 1);
      }
    }
    walk(tasks, 1);
    return max;
  }, [tasks]);

  // Close WBS dropdown on outside click
  useEffect(() => {
    if (!wbsDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (wbsTriggerRef.current?.contains(e.target as Node)) return;
      if (wbsDropdownRef.current?.contains(e.target as Node)) return;
      setWbsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [wbsDropdownOpen]);

  // When wbsLevel changes, trigger expand/collapse via callbacks
  useEffect(() => {
    if (wbsLevel === 'all') {
      // Expand all
      function expandAll(taskList: Task[]) {
        for (const t of taskList) {
          if (t.subtasks?.length) {
            if (t.isExpanded === false) callbacks.onTaskToggleExpand?.(t.id);
            expandAll(t.subtasks);
          }
        }
      }
      expandAll(tasks);
    } else {
      // Expand only up to the selected level, collapse deeper
      function setLevel(taskList: Task[], depth: number) {
        for (const t of taskList) {
          if (t.subtasks?.length) {
            const shouldExpand = depth < (wbsLevel as number);
            const isCurrentlyExpanded = t.isExpanded !== false;
            if (shouldExpand !== isCurrentlyExpanded) {
              callbacks.onTaskToggleExpand?.(t.id);
            }
            setLevel(t.subtasks, depth + 1);
          }
        }
      }
      setLevel(tasks, 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wbsLevel]);

  // Column resize state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // v2.4.0: Column drag-and-drop reorder state
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

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

  // v2.4.0: Column drag-and-drop reorder handlers
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    // Never allow dragging the name column
    if (columnId === 'name') { e.preventDefault(); return; }
    setDragColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleColumnDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragColumnId(null);
    setDragOverColumnId(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    // Don't allow dropping on the name column
    if (columnId === 'name') return;
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!dragColumnId || dragColumnId === targetColumnId || targetColumnId === 'name') return;

    const newColumns = [...columns];
    const fromIndex = newColumns.findIndex(c => c.id === dragColumnId);
    const toIndex = newColumns.findIndex(c => c.id === targetColumnId);
    if (fromIndex === -1 || toIndex === -1) return;

    // Remove from old position and insert at new
    const removed = newColumns.splice(fromIndex, 1);
    if (!removed[0]) return;
    newColumns.splice(toIndex, 0, removed[0]);

    handleColumnsChange(newColumns);
    setDragColumnId(null);
    setDragOverColumnId(null);
  }, [dragColumnId, columns, handleColumnsChange]);

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
        case 'position':
          // Position order is already correct from flattenTasksWithLevel (hierarchy preserved).
          // Sorting the flat array by position would mix parent/child levels — skip sort.
          return 0;
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

      case 'assignees': {
        const isParent = (task as any).hasChildren;
        // Parent tasks: show rollup of unique assignees from subtasks
        let assigneesValue = task.assignees || [];
        if (isParent && task.subtasks?.length) {
          const uniqueMap = new Map<string, typeof assigneesValue[0]>();
          // Include parent's own assignees first
          (task.assignees || []).forEach(a => uniqueMap.set(a.name, a));
          // Then add from subtasks
          const collectAssignees = (subs: typeof task.subtasks) => {
            (subs || []).forEach(sub => {
              (sub.assignees || []).forEach(a => {
                if (!uniqueMap.has(a.name)) uniqueMap.set(a.name, a);
              });
              if (sub.subtasks?.length) collectAssignees(sub.subtasks);
            });
          };
          collectAssignees(task.subtasks);
          assigneesValue = Array.from(uniqueMap.values());
        }
        return (
          <AssigneesCell
            value={assigneesValue}
            availableUsers={availableUsers}
            onChange={(assignees) => handleUpdate({ assignees })}
            isDark={isDark}
            locale={locale}
            disabled={isParent}
          />
        );
      }

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

      case 'progress': {
        const isParent = !!(task.subtasks && task.subtasks.length > 0);
        return (
          <ProgressCell
            value={task.progress || 0}
            onChange={isParent ? undefined : (progress) => {
              const status = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'todo';
              handleUpdate({ progress, status });
            }}
            isDark={isDark}
            disabled={isParent}
          />
        );
      }

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
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      // v1.1.0: Quoted time column
      case 'quotedTime': {
        const isCompleted = task.status === 'completed' || task.progress === 100;
        // v1.4.9: Governance v2.0 - Check if this column should be blurred
        const shouldBlurQuoted = financialBlur?.enabled && (
          !financialBlur.columns || financialBlur.columns.includes('quotedTime')
        );
        return (
          <TimeCell
            value={(task as any).quotedTime}
            onChange={(minutes) => handleUpdate({ quotedTime: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
            isBlurred={shouldBlurQuoted}
            lens={lens}
            hourlyRate={getTaskRate(task)}
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
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      // v1.2.0: New time tracking columns
      case 'effortMinutes': {
        if (aggregateParentHours && task.subtasks && task.subtasks.length > 0) {
          const { allocated } = calculateGroupHours(task);
          // Financial lens for parent: sum $ from children directly
          if (lens === 'financial') {
            const groupDollars = calculateGroupDollars(task);
            const estDollars = Math.round(groupDollars.dollarAllocated);
            const offDollars = Math.round(groupDollars.dollarQuoted);
            const margin = offDollars - estDollars;
            return (
              <div className="flex items-center gap-1.5">
                {estDollars > 0 ? (
                  <span className={cn('text-sm font-mono', isDark ? 'text-white/60' : 'text-gray-500')}>
                    ${estDollars.toLocaleString('en-US')}
                  </span>
                ) : null}
                {margin !== 0 && estDollars > 0 && offDollars > 0 && (
                  <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                    margin > 0 ? 'bg-[#064e3b] text-[#10b981] border border-[#065f46]/30' : 'bg-[#451a03] text-[#f59e0b] border border-[#78350f]/30'
                  )}>
                    {margin > 0 ? '+' : ''}{Math.abs(margin) >= 1000 ? `$${(margin/1000).toFixed(1)}K` : `$${margin}`}
                  </span>
                )}
              </div>
            );
          }
          return <TimeCell value={allocated > 0 ? allocated : undefined} isDark={isDark} locale={locale} disabled lens={lens} hourlyRate={hourlyRate} />;
        }
        const isCompleted = task.status === 'completed' || task.progress === 100;
        const estMins = (task as any).effortMinutes || 0;
        const soldMins = (task as any).soldEffortMinutes || 0;
        // Financial lens: show margin badge next to estimated value
        const _taskRate = getTaskRate(task);
        if (lens === 'financial' && _taskRate && estMins > 0 && soldMins > 0) {
          const estDollars = Math.round((estMins / 60) * _taskRate);
          const offDollars = Math.round((soldMins / 60) * _taskRate);
          const margin = offDollars - estDollars;
          return (
            <div className="flex items-center gap-1.5">
              <TimeCell
                value={estMins}
                onChange={(minutes) => handleUpdate({ effortMinutes: minutes } as any)}
                isDark={isDark}
                locale={locale}
                disabled={isCompleted}
                lens={lens}
                hourlyRate={getTaskRate(task)}
              />
              {margin !== 0 && (
                <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                  margin >= 0 ? 'bg-[#064e3b] text-[#10b981] border border-[#065f46]/30' : 'bg-[#451a03] text-[#f59e0b] border border-[#78350f]/30'
                )}>
                  {margin > 0 ? '+' : ''}{Math.abs(margin) >= 1000 ? `$${(margin/1000).toFixed(1)}K` : `$${margin}`}
                </span>
              )}
            </div>
          );
        }
        return (
          <TimeCell
            value={estMins}
            onChange={(minutes) => handleUpdate({ effortMinutes: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      case 'timeLoggedMinutes': {
        if (aggregateParentHours && task.subtasks && task.subtasks.length > 0) {
          const { spent } = calculateGroupHours(task);
          return <TimeCell value={spent > 0 ? spent : undefined} isDark={isDark} locale={locale} disabled lens={lens} hourlyRate={getTaskRate(task)} />;
        }
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
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      case 'soldEffortMinutes': {
        if (aggregateParentHours && task.subtasks && task.subtasks.length > 0) {
          const { quoted } = calculateGroupHours(task);
          const shouldBlurSold = financialBlur?.enabled && (!financialBlur.columns || financialBlur.columns.includes('soldEffortMinutes'));
          return <TimeCell value={quoted > 0 ? quoted : undefined} isDark={isDark} locale={locale} disabled isBlurred={shouldBlurSold} lens={lens} hourlyRate={getTaskRate(task)} />;
        }
        const isCompleted = task.status === 'completed' || task.progress === 100;
        // v1.4.9: Governance v2.0 - Check if this column should be blurred
        const shouldBlurSold = financialBlur?.enabled && (
          !financialBlur.columns || financialBlur.columns.includes('soldEffortMinutes')
        );
        return (
          <TimeCell
            value={(task as any).soldEffortMinutes}
            onChange={(minutes) => handleUpdate({ soldEffortMinutes: minutes } as any)}
            isDark={isDark}
            locale={locale}
            disabled={isCompleted}
            isBlurred={shouldBlurSold}
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      // v2.0.0: Chronos Interactive Time Manager columns
      case 'scheduleVariance': {
        const effortMins = (task as any).effortMinutes || 0;
        const soldMins = (task as any).soldEffortMinutes || 0;
        const loggedMins = (task as any).timeLoggedMinutes || 0;
        const hasTime = effortMins > 0 || soldMins > 0 || loggedMins > 0;
        return (
          <ScheduleVarianceCell
            startDate={task.startDate}
            endDate={task.endDate}
            scheduleVariance={task.scheduleVariance}
            isDark={isDark}
            locale={locale}
            hasTimeAllocated={hasTime}
          />
        );
      }

      case 'hoursBar': {
        // If aggregateParentHours enabled and task has children, show sum of descendants
        if (aggregateParentHours && (task as any).hasChildren) {
          const { spent, allocated, quoted } = calculateGroupHours(task);
          const isOver = spent > allocated && allocated > 0;
          return (
            <span className={cn('text-[11px] font-mono flex items-center gap-1.5', isDark ? 'text-white/50' : 'text-gray-500')}>
              <span className={cn('font-bold', isOver ? 'text-[#FF453A]' : isDark ? 'text-white/80' : 'text-gray-800')}>
                {formatGroupHours(spent)}
              </span>
              {allocated > 0 && (
                <>
                  {' / '}
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>
                    {formatGroupHours(allocated)}
                  </span>
                </>
              )}
              {quoted > 0 && (
                <>
                  {' / '}
                  <span className={isDark ? 'text-amber-400/70' : 'text-amber-600'}>
                    {formatGroupHours(quoted)}
                  </span>
                </>
              )}
            </span>
          );
        }
        return (
          <HoursBarCell
            task={task}
            isDark={isDark}
            locale={locale}
            onLogTime={callbacks.onLogTime}
            onEstimateUpdate={callbacks.onEstimateUpdate}
            onSoldEffortUpdate={callbacks.onSoldEffortUpdate}
            showSoldEffort={config.showSoldEffort}
            onOpenTimeLog={callbacks.onOpenTimeLog}
            lens={lens}
            hourlyRate={getTaskRate(task)}
          />
        );
      }

      case 'teamLoad': {
        const isParent = (task as any).hasChildren || (task.subtasks && task.subtasks.length > 0);
        // Parent tasks: read-only rollup of assignees from children
        if (isParent) {
          return (
            <TeamLoadCell
              task={task}
              isDark={isDark}
              locale={locale}
            />
          );
        }
        // Leaf tasks: editable assignee picker (same as old 'assignees' column)
        return (
          <AssigneesCell
            value={task.assignees || []}
            availableUsers={availableUsers}
            onChange={(assignees) => {
              callbacks.onTaskUpdate?.({ ...task, assignees });
            }}
            isDark={isDark}
            locale={locale}
          />
        );
      }

      case 'blockers':
        return (
          <BlockersCell
            blockers={task.blockers}
            isDark={isDark}
            locale={locale}
          />
        );

      case 'weight': {
        // Parent tasks: show sum of children weights (read-only, not editable)
        const parentSum = parentWeightSums.get(task.id);
        if (parentSum !== undefined) {
          return (
            <span className={cn("text-xs font-mono", parentSum > 0 ? (isDark ? "text-white/50" : "text-gray-400") : (isDark ? "text-white/30" : "text-gray-300"))}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {parentSum > 0 ? `${Number(parentSum.toFixed(2))}%` : '—'}
            </span>
          );
        }
        // Leaf tasks: inline editable
        const weightVal = (task as any).weight || 0;
        return (
          <WeightCellInline
            value={weightVal}
            onChange={(v) => handleUpdate({ weight: v } as any)}
            isDark={isDark}
          />
        );
      }

      default:
        return <span className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>-</span>;
    }
  }, [callbacks, isDark, locale, availableUsers, t, aggregateParentHours, parentWeightSums]);

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
      elapsedTime: (t.columns as any).elapsedTime || (locale === 'es' ? 'Ejecutado' : 'Executed'),
      // v1.2.0: New time tracking columns — order: Quoted → Estimated → Executed
      soldEffortMinutes: (t.columns as any).soldEffortMinutes || (locale === 'es' ? 'Ofertado' : 'Quoted'),
      effortMinutes: (t.columns as any).effortMinutes || (locale === 'es' ? 'Estimado' : 'Estimated'),
      timeLoggedMinutes: (t.columns as any).timeLoggedMinutes || (locale === 'es' ? 'Ejecutado' : 'Executed'),
      // v2.0.0: Chronos columns
      scheduleVariance: (t.columns as any).scheduleVariance || (locale === 'es' ? 'Prog / Var' : 'Sched / Var'),
      hoursBar: (t.columns as any).hoursBar || (locale === 'es' ? 'Horas (Usado / Asignado)' : 'Hours (Spent / Allocated)'),
      teamLoad: (t.columns as any).teamLoad || (locale === 'es' ? 'Equipo' : 'Team'),
      blockers: (t.columns as any).blockers || (locale === 'es' ? 'Bloqueantes' : 'Blockers'),
      weight: (t.columns as any).weight || (locale === 'es' ? 'Peso' : 'Weight'),
    };
    const label = labelMap[column.type] || column.label;
    // Ensure we always return a string to prevent React error #310
    return typeof label === 'string' ? label : String(label || column.type);
  }, [t, locale]);

  // v2.1.0: Calculate proportional percentage for each column so they fill available width
  const columnWidthPercent = useMemo(() => {
    const colTotal = visibleColumns.reduce((sum, col) => sum + col.width, 0);
    const addColWidth = allowColumnCustomization ? 48 : 0;
    const fullTotal = colTotal + addColWidth;
    const map: Record<string, string> = {};
    for (const col of visibleColumns) {
      map[col.id] = `${(col.width / fullTotal) * 100}%`;
    }
    return map;
  }, [visibleColumns, allowColumnCustomization]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0D0D0D]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-[#007BFF]" />
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>
            {t.empty.noTasks}...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0D0D0D]" : "bg-white", className)} style={style}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <div>
            <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
              Error
            </h3>
            <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>
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
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#0D0D0D]" : "bg-white", className)} style={style}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#007BFF]/10 flex items-center justify-center">
            <List className="w-8 h-8 text-[#007BFF]" />
          </div>
          <h3 className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-gray-900")}>
            {t.empty.noTasks}
          </h3>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>
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
        isDark ? "bg-[#0D0D0D]" : "bg-white",
        resizingColumn && "select-none",
        className
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        minHeight: 0,
        ...style,
      }}
    >
      {/* Toolbar */}
      <div className={cn("flex-shrink-0 px-6 py-4 border-b", isDark ? "border-[#222]" : "border-gray-200")}>
        <div className="flex items-center gap-4">
          {/* Task count */}
          <div className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>
            {displayTasks.length} {t.pagination.tasks}
          </div>

          {/* Search */}
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-white/60" : "text-gray-400")} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.toolbar.searchPlaceholder}
                className={cn(
                  "w-full h-9 pl-10 pr-4 rounded-lg border outline-none focus:ring-2 focus:ring-[#007BFF]/30",
                  isDark
                    ? "bg-white/[0.03] border-[#222] text-white placeholder:text-white/30 font-mono"
                    : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
                )}
              />
            </div>
          )}

          {/* Spacer to push right items */}
          <div className="flex-1" />

          {/* v2.1.0: Custom right toolbar content (e.g., lens toggle) */}
          {toolbarRightContent && (
            <div className="flex items-center gap-2">
              {toolbarRightContent}
            </div>
          )}

          {/* v2.5.0: WBS Level filter (same as Gantt) */}
          {showHierarchy && maxWbsDepth > 1 && (
            <div className="relative">
              <button
                ref={wbsTriggerRef}
                onClick={() => setWbsDropdownOpen(!wbsDropdownOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-[11px] font-medium',
                  isDark
                    ? wbsDropdownOpen
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                      : 'bg-white/[0.03] border-[#333] text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
                    : wbsDropdownOpen
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Layers className="w-3.5 h-3.5" />
                {wbsLevel === 'all' ? (locale === 'es' ? 'Todos' : 'All') : `L${wbsLevel}`}
              </button>
              {wbsDropdownOpen && (
                <div
                  ref={wbsDropdownRef}
                  className={cn(
                    'absolute top-full mt-1 right-0 w-24 rounded-lg border overflow-hidden z-50 shadow-lg',
                    isDark
                      ? 'bg-[#1A1A1A] border-[#333]'
                      : 'bg-white border-gray-200'
                  )}
                >
                  {[
                    { value: 'all' as const, label: locale === 'es' ? 'Todos' : 'All' },
                    ...Array.from({ length: Math.min(maxWbsDepth, 5) }, (_, i) => ({
                      value: (i + 1) as number,
                      label: `L${i + 1}`,
                    })),
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => { setWbsLevel(opt.value); setWbsDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between',
                        isDark
                          ? wbsLevel === opt.value
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'text-white/60 hover:bg-white/[0.05] hover:text-white/80'
                          : wbsLevel === opt.value
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <span>{opt.label}</span>
                      {wbsLevel === opt.value && <span className="text-blue-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status Filter - Right side (matching Gantt toolbar position) */}
          <StatusFilter
            value={statusFilter}
            hideCompleted={hideCompleted}
            onChange={setStatusFilter}
            onHideCompletedChange={setHideCompleted}
            isDark={isDark}
            locale={locale}
          />

          {/* v2.3.1: Reopen health sidebar button — visible only when sidebar is enabled and closed */}
          {healthSidebarWithTotal?.enabled && healthSidebarWithTotal.data && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg border transition-colors',
                isDark
                  ? 'border-[#333] text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                  : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              title={locale === 'es' ? 'Abrir panel de salud' : 'Open health panel'}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* v2.5.0: Custom end content (rendered just before Create Task button) */}
          {config.toolbarEndContent}

          {/* Create Task Button - v0.18.0: Same style as GanttToolbar */}
          {showCreateTaskButton && onCreateTask && (
            <motion.button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-[transform,box-shadow]"
              style={{
                background: 'linear-gradient(135deg, #007BFF 0%, #005FCC 100%)',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span>{t.toolbar.newTask}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Table + Sidebar Container */}
      <div style={{ display: 'flex', flex: '1 1 0%', overflow: 'hidden', minHeight: 0 }}>
      {/* Table Container */}
      <div style={{ flex: '1 1 0%', overflow: 'auto', minHeight: 0 }}>
        <div style={{ width: '100%' }}>
          {/* List Header */}
          <div
            className={cn(
              "flex-shrink-0 flex items-center border-b text-[9px] font-bold uppercase tracking-wider sticky top-0 z-10",
              isDark ? "border-[#222] bg-[#1A1A1A] font-mono" : "border-gray-200 bg-gray-50"
            )}
          >
            {visibleColumns.map((column) => {
              const isDraggable = column.id !== 'name';
              const isDragOver = dragOverColumnId === column.id && dragColumnId !== column.id;
              return (
              <div
                key={column.id}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 transition-all duration-150 group",
                  isDark ? "text-white/60" : "text-gray-500",
                  isDraggable && "cursor-grab",
                  dragColumnId === column.id && "opacity-50",
                  isDragOver && (isDark
                    ? "bg-[#007BFF]/20 border-l-2 border-l-[#007BFF]"
                    : "bg-blue-50 border-l-2 border-l-blue-400")
                )}
                style={{ width: columnWidthPercent[column.id], minWidth: column.minWidth }}
                draggable={isDraggable}
                onDragStart={isDraggable ? (e) => handleColumnDragStart(e, column.id) : undefined}
                onDragEnd={isDraggable ? handleColumnDragEnd : undefined}
                onDragOver={isDraggable ? (e) => handleColumnDragOver(e, column.id) : undefined}
                onDragLeave={isDraggable ? handleColumnDragLeave : undefined}
                onDrop={isDraggable ? (e) => handleColumnDrop(e, column.id) : undefined}
                onContextMenu={(e) => handleContextMenu(e, undefined, column.id)}
              >
                {/* v2.4.0: Drag grip indicator for reorderable columns */}
                {isDraggable && (
                  <GripVertical className={cn(
                    "w-3 h-3 flex-shrink-0 transition-opacity",
                    isDark ? "text-white/20 group-hover:text-white/50" : "text-gray-300 group-hover:text-gray-500"
                  )} />
                )}
                {column.sortable ? (
                  <button
                    draggable={false}
                    onClick={() => handleSort(column.id)}
                    className="flex items-center gap-1 hover:text-[#007BFF]"
                  >
                    {getColumnLabel(column)}
                    <ArrowUpDown className={cn(
                      "w-3 h-3",
                      sortField === column.id && "text-[#007BFF]"
                    )} />
                  </button>
                ) : (
                  <span draggable={false}>{getColumnLabel(column)}</span>
                )}

                {/* Resize handle */}
                {allowColumnResize && column.resizable && (
                  <div
                    className={cn(
                      "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group",
                      "hover:bg-[#007BFF]",
                      resizingColumn === column.id && "bg-[#007BFF]"
                    )}
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                )}
              </div>
              );
            })}

            {/* Add column button */}
            {allowColumnCustomization && (
              <div className="relative flex items-center justify-center px-3 py-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnSelector(prev => !prev);
                  }}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    isDark
                      ? "hover:bg-white/[0.05] text-white/60 hover:text-white"
                      : "hover:bg-gray-200 text-gray-400 hover:text-gray-600",
                    showColumnSelector && (isDark ? "bg-white/[0.05]" : "bg-gray-200")
                  )}
                  title={locale === 'es' ? 'Agregar columna' : 'Add column'}
                >
                  <Plus className="w-3 h-3" />
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
              // Chronos V2.0: Group header for parent tasks at level 0
              const isGroupHeader = task.hasChildren && task.level === 0;
              const subtaskCount = task.subtasks?.length || 0;

              // Chronos V2.0: WBS Group Header Row — uses same column grid as normal rows
              if (isGroupHeader) {
                const { spent, allocated, quoted } = calculateGroupHours(task);
                const spi = calculateGroupSPI(task);
                const conflicts = countResourceConflicts(task);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: animationDelay }}
                    className={cn("flex items-center border-y cursor-pointer", isDark ? "border-[#222] bg-[#222]" : "border-gray-200 bg-gray-100")}
                    onClick={() => callbacks.onTaskClick?.(task)}
                  >
                    {visibleColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center px-4 py-2.5"
                        style={{ width: columnWidthPercent[column.id], minWidth: column.minWidth }}
                      >
                        {column.type === 'name' ? (
                          // Name cell — folder icon + wbs + name + count + SPI + conflicts
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                              className={cn("p-0.5 rounded flex-shrink-0", isDark ? "hover:bg-white/[0.05]" : "hover:bg-gray-200")}
                            >
                              {isExpanded
                                ? <ChevronDown className={cn("w-4 h-4", isDark ? "text-white/40" : "text-gray-500")} />
                                : <ChevronRight className={cn("w-4 h-4", isDark ? "text-white/40" : "text-gray-500")} />}
                            </button>
                            <span onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }} className="flex-shrink-0 cursor-pointer">
                              {isExpanded
                                ? <FolderOpen className="w-4 h-4" style={{ color: isDark ? '#FFD60A' : '#B45309' }} />
                                : <Folder className="w-4 h-4" style={{ color: isDark ? '#FFD60A' : '#B45309' }} />}
                            </span>
                            {task.wbsCode && (
                              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: isDark ? '#FFD60A' : '#B45309' }}>
                                {task.wbsCode}
                              </span>
                            )}
                            <span title={task.name} className={cn("text-[11px] font-semibold uppercase tracking-wide truncate", isDark ? "text-white" : "text-gray-800")} style={{ fontFamily: 'Inter, system-ui, sans-serif', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
                              {task.name}
                            </span>
                            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0", isDark ? "text-white/30 bg-white/[0.05]" : "text-gray-500 bg-gray-200")}>
                              ({subtaskCount} {locale === 'es' ? (subtaskCount === 1 ? 'Tarea' : 'Tareas') : (subtaskCount === 1 ? 'Item' : 'Items')})
                            </span>
                            {/* SPI + conflicts after name */}
                            {spi !== null && (
                              <span className={cn("text-[10px] font-mono flex-shrink-0", spi >= 1 ? "text-[#32D74B]" : spi >= 0.8 ? "text-[#FFD60A]" : "text-[#FF453A]")}>
                                Avg SPI: {spi.toFixed(2)}
                              </span>
                            )}
                            {conflicts > 0 && (
                              <span className="text-[10px] font-mono text-[#FF453A] flex-shrink-0">
                                {locale === 'es' ? 'Conflicto' : 'Conflict'}: {conflicts}
                              </span>
                            )}
                          </div>
                        ) : column.type === 'timeLoggedMinutes' ? (
                          lens === 'financial' ? (() => {
                            const groupDollars = calculateGroupDollars(task);
                            const val = Math.round(groupDollars.dollarSpent);
                            return val > 0 ? <span className={cn('text-sm font-mono', isDark ? 'text-white/60' : 'text-gray-500')}>${val.toLocaleString('en-US')}</span> : null;
                          })() : <TimeCell value={spent > 0 ? spent : undefined} isDark={isDark} locale={locale} disabled lens={lens} hourlyRate={getTaskRate(task)} />
                        ) : column.type === 'soldEffortMinutes' ? (
                          lens === 'financial' ? (() => {
                            const groupDollars = calculateGroupDollars(task);
                            const val = Math.round(groupDollars.dollarQuoted);
                            return val > 0 ? <span className={cn('text-sm font-mono', isDark ? 'text-white/60' : 'text-gray-500')}>${val.toLocaleString('en-US')}</span> : null;
                          })() : <TimeCell value={quoted > 0 ? quoted : undefined} isDark={isDark} locale={locale} disabled lens={lens} hourlyRate={getTaskRate(task)} />
                        ) : column.type === 'effortMinutes' ? (
                          lens === 'financial' ? (() => {
                            const groupDollars = calculateGroupDollars(task);
                            const estDollars = Math.round(groupDollars.dollarAllocated);
                            const offDollars = Math.round(groupDollars.dollarQuoted);
                            const margin = offDollars - estDollars;
                            return (
                              <div className="flex items-center gap-1.5">
                                {estDollars > 0 ? (
                                  <span className={cn('text-sm font-mono', isDark ? 'text-white/60' : 'text-gray-500')}>
                                    ${estDollars.toLocaleString('en-US')}
                                  </span>
                                ) : null}
                                {margin !== 0 && estDollars > 0 && offDollars > 0 && (
                                  <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                                    margin > 0 ? 'bg-[#064e3b] text-[#10b981] border border-[#065f46]/30' : 'bg-[#451a03] text-[#f59e0b] border border-[#78350f]/30'
                                  )}>
                                    {margin > 0 ? '+' : ''}{Math.abs(margin) >= 1000 ? `$${(margin/1000).toFixed(1)}K` : `$${margin}`}
                                  </span>
                                )}
                              </div>
                            );
                          })() : <TimeCell value={allocated > 0 ? allocated : undefined} isDark={isDark} locale={locale} disabled lens={lens} hourlyRate={getTaskRate(task)} />
                        ) : (
                          // v2.4.0: Render remaining column types (scheduleVariance, hoursBar, teamLoad, blockers, etc.)
                          renderCell(task, column)
                        )}
                      </div>
                    ))}
                  </motion.div>
                );
              }

              const isBeingDragged = rowDragId === task.id;
              const isDropTarget = rowDropTargetId === task.id;
              const showDropAbove = isDropTarget && rowDropPosition === 'above';
              const showDropBelow = isDropTarget && rowDropPosition === 'below';
              const showDropChild = isDropTarget && rowDropPosition === 'child';

              return (
                <motion.div
                  key={task.id}
                  data-listview-row={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: animationDelay }}
                  className={cn(
                    "flex items-center border-b transition-colors relative group",
                    isDark
                      ? "border-[#222] hover:bg-white/[0.05]"
                      : "border-gray-100 hover:bg-gray-50"
                  )}
                  style={{
                    opacity: isBeingDragged ? 0.4 : 1,
                    backgroundColor: showDropChild ? (isDark ? 'rgba(46,148,255,0.08)' : 'rgba(46,148,255,0.05)') : undefined,
                    boxShadow: showDropChild ? 'inset 0 0 0 2px #2E94FF' : undefined,
                  }}
                  onClick={() => callbacks.onTaskClick?.(task)}
                  onDoubleClick={() => callbacks.onTaskDoubleClick?.(task)}
                  onContextMenu={(e) => handleContextMenu(e, task)}
                >
                  {/* Drop indicator ABOVE */}
                  {showDropAbove && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#2E94FF', zIndex: 10 }} />
                  )}
                  {/* Drop indicator BELOW */}
                  {showDropBelow && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#2E94FF', zIndex: 10 }} />
                  )}
                  {/* Drag handle */}
                  {canDragRows && (
                    <div
                      className="flex-shrink-0 flex items-center justify-center w-5 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity"
                      onMouseDown={(e) => handleRowDragStart(task.id, e)}
                      style={{ color: isDark ? '#888' : '#999' }}
                    >
                      <GripVertical className="w-3 h-3" />
                    </div>
                  )}
                  {visibleColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center px-4 py-3 min-h-[56px]"
                      style={{ width: columnWidthPercent[column.id], minWidth: column.minWidth }}
                    >
                      {column.type === 'name' ? (
                        // Name column with hierarchy — Chronos V2.0 two-line layout
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
                              className={cn("p-0.5 rounded flex-shrink-0", isDark ? "hover:bg-white/[0.05]" : "hover:bg-gray-200")}
                            >
                              {isExpanded ? (
                                <ChevronDown className={cn("w-4 h-4", isDark ? "text-white/60" : "text-gray-400")} />
                              ) : (
                                <ChevronRight className={cn("w-4 h-4", isDark ? "text-white/60" : "text-gray-400")} />
                              )}
                            </button>
                          )}
                          {showHierarchy && !task.hasChildren && <div className="w-5 flex-shrink-0" />}

                          {/* Two-line name layout */}
                          <div className="flex flex-col min-w-0 flex-1">
                            {/* Line 1: WBS code + Task code */}
                            {(task.wbsCode || task.taskCode) && (
                              <div className="flex items-center gap-1.5">
                                {task.wbsCode && (
                                  <span className={cn("text-[10px] font-mono", isDark ? "text-[#007BFF]" : "text-blue-600")}>
                                    {task.wbsCode}
                                  </span>
                                )}
                                {task.taskCode && (
                                  <span className={cn("text-[10px] font-mono", isDark ? "text-white/40" : "text-gray-400")}>
                                    {task.taskCode}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Line 2: Task name */}
                            <span className={cn(
                              "truncate font-bold text-[13px]",
                              task.progress === 100
                                ? (isDark ? "line-through text-white/50" : "line-through text-gray-400")
                                : (isDark ? "text-white" : "text-gray-900")
                            )}>
                              {task.name}
                            </span>
                            {/* Line 3: First tag badge */}
                            {task.tags?.[0] && (
                              <span
                                className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded w-fit"
                                style={{
                                  backgroundColor: `${task.tags[0].color}20`,
                                  color: task.tags[0].color,
                                }}
                              >
                                {task.tags[0].name}
                              </span>
                            )}
                          </div>
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

          {/* v2.4.0: Project Totals Sticky Footer */}
          {showProjectTotals && displayTasks.length > 0 && (() => {
            const { spent, allocated, quoted } = projectTotalHours;
            const varianceMinutes = allocated - spent;
            const isOver = varianceMinutes < 0;
            const varianceLabel = isOver
              ? `+${formatGroupHours(Math.abs(varianceMinutes))} ${locale === 'es' ? 'EXCEDIDO' : 'OVER'}`
              : `-${formatGroupHours(varianceMinutes)} ${locale === 'es' ? 'AHORRADO' : 'SAVED'}`;
            const isFinancial = lens === 'financial' && hourlyRate > 0;
            const formatValue = (mins: number, dollarOverride?: number) => {
              if (isFinancial) {
                const dollars = dollarOverride != null ? dollarOverride : (mins / 60) * hourlyRate;
                return `$${Math.round(dollars).toLocaleString('en-US')}`;
              }
              return formatGroupHours(mins);
            };
            const varianceDollars = isFinancial ? Math.abs(projectTotalHours.dollarAllocated - projectTotalHours.dollarSpent) : 0;
            const varianceLabelFinancial = isFinancial
              ? `${isOver ? '+' : '-'}$${varianceDollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${isOver ? (locale === 'es' ? 'EXCEDIDO' : 'OVER') : (locale === 'es' ? 'AHORRADO' : 'SAVED')}`
              : varianceLabel;

            return (
              <div
                className={cn(
                  "flex items-center sticky bottom-0 z-[5]",
                  isDark
                    ? "border-t border-[#2A2A3A]"
                    : "border-t border-gray-300"
                )}
                style={{
                  backgroundColor: isDark ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                {visibleColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center px-4 py-3"
                    style={{ width: columnWidthPercent[column.id], minWidth: column.minWidth }}
                  >
                    {column.type === 'name' ? (
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-widest",
                        isDark ? "text-white" : "text-gray-900"
                      )} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {locale === 'es' ? 'TOTAL PROYECTO' : 'TOTAL PROJECT'}
                      </span>
                    ) : column.type === 'hoursBar' ? (
                      <div className="flex items-center gap-2 w-full">
                        <span className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-gray-900")}
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatValue(spent, isFinancial ? projectTotalHours.dollarSpent : undefined)}
                        </span>
                        <span className={cn("text-[11px]", isDark ? "text-white/40" : "text-gray-400")}>/</span>
                        <span className={cn("text-[11px]", isDark ? "text-white/50" : "text-gray-500")}
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatValue(allocated, isFinancial ? projectTotalHours.dollarAllocated : undefined)}
                        </span>
                        {allocated > 0 && (
                          <span className={cn(
                            "text-[10px] font-semibold ml-1",
                            isOver ? "text-[#FF453A]" : "text-[#32D74B]"
                          )} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {isFinancial ? varianceLabelFinancial : varianceLabel}
                          </span>
                        )}
                      </div>
                    ) : column.type === 'soldEffortMinutes' ? (
                      <span className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-gray-900")}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {quoted > 0 ? formatValue(quoted, isFinancial ? projectTotalHours.dollarQuoted : undefined) : '–'}
                      </span>
                    ) : column.type === 'effortMinutes' ? (() => {
                      // Financial lens: show margin in footer
                      if (isFinancial && quoted > 0 && allocated > 0) {
                        const offTotal = Math.round(projectTotalHours.dollarQuoted);
                        const estTotal = Math.round(projectTotalHours.dollarAllocated);
                        const margin = offTotal - estTotal;
                        const marginPct = offTotal > 0 ? Math.round((margin / offTotal) * 100) : 0;
                        return (
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-gray-900")}
                              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {formatValue(allocated, projectTotalHours.dollarAllocated)}
                            </span>
                            <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                              margin >= 0 ? 'bg-[#064e3b] text-[#10b981] border border-[#065f46]/30' : 'bg-[#451a03] text-[#f59e0b] border border-[#78350f]/30'
                            )}>
                              {margin >= 0 ? '+' : ''}{Math.abs(margin) >= 1000 ? `$${(margin/1000).toFixed(1)}K` : `$${margin}`}
                              <span className="ml-0.5 opacity-60">({marginPct}%)</span>
                            </span>
                          </div>
                        );
                      }
                      return (
                        <span className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-gray-900")}
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {allocated > 0 ? formatValue(allocated, isFinancial ? projectTotalHours.dollarAllocated : undefined) : '–'}
                        </span>
                      );
                    })() : column.type === 'timeLoggedMinutes' ? (
                      <span className={cn("text-[12px] font-bold", isDark ? "text-white" : "text-gray-900")}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {spent > 0 ? formatValue(spent, isFinancial ? projectTotalHours.dollarSpent : undefined) : '–'}
                      </span>
                    ) : column.type === 'progress' ? (() => {
                      // Weighted progress: sum(progress × weight) / sum(weight) for root tasks
                      const rootTasks = tasks || [];
                      let weightedSum = 0;
                      let totalW = 0;
                      let simpleSum = 0;
                      let count = 0;
                      for (const t of rootTasks) {
                        const w = (t as any).weight || parentWeightSums.get(t.id) || 0;
                        const prog = t.progress || 0;
                        if (w > 0) {
                          weightedSum += prog * w;
                          totalW += w;
                        }
                        simpleSum += prog;
                        count++;
                      }
                      const weightedPct = totalW > 0 ? Math.round((weightedSum / totalW) * 10) / 10 : (count > 0 ? Math.round(simpleSum / count) : 0);
                      return (
                        <span className={cn("text-[12px] font-bold font-mono", isDark ? "text-[#00E5CC]" : "text-cyan-600")}
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {weightedPct}%
                        </span>
                      );
                    })() : column.type === 'weight' ? (() => {
                      const allTasks = tasks || [];
                      const flatAll: any[] = [];
                      const flatten = (list: any[]) => { for (const t of list) { flatAll.push(t); if (t.subtasks?.length) flatten(t.subtasks); } };
                      flatten(allTasks);
                      const leafTasks = flatAll.filter((t: any) => !t.subtasks?.length || t.subtasks.length === 0);
                      const totalWeight = leafTasks.reduce((sum: number, t: any) => sum + (t.weight || 0), 0);
                      const isValid = Math.abs(totalWeight - 100) < 0.1;
                      return (
                        <span className={cn("text-[12px] font-bold font-mono", isValid ? (isDark ? "text-[#22C55E]" : "text-green-600") : "text-[#EF4444]")}
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {Number(totalWeight.toFixed(1))}%
                        </span>
                      );
                    })() : (
                      <span className={cn("text-[11px]", isDark ? "text-white/30" : "text-gray-300")}>–</span>
                    )}
                  </div>
                ))}
                {allowColumnCustomization && (
                  <div className="w-12 flex-shrink-0" />
                )}
              </div>
            );
          })()}

          {/* Empty search state */}
          {displayTasks.length === 0 && searchQuery && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <List className={cn("w-12 h-12 mx-auto mb-4", isDark ? "text-white/30" : "text-gray-400")} />
                <p className={cn(isDark ? "text-white/60" : "text-gray-600")}>
                  {t.empty.noResults}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* v2.0.0: Project Health Sidebar — v2.3.1: toggle open/close */}
      {healthSidebarWithTotal?.enabled && healthSidebarWithTotal.data && sidebarOpen && (
        <ProjectHealthSidebar
          data={healthSidebarWithTotal.data}
          isDark={isDark}
          locale={locale}
          onClose={() => setSidebarOpen(false)}
          lens={config?.lens}
        />
      )}
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
        onOpenTimeLog={callbacks.onOpenTimeLog}
        onReportBlocker={callbacks.onReportBlocker}
        onCopyTaskLink={callbacks.onCopyTaskLink}
        onTaskMove={callbacks.onTaskMove}
        onTaskIndent={callbacks.onTaskIndent}
        onTaskOutdent={callbacks.onTaskOutdent}
      />

      {/* v2.5.0: Drag ghost element */}
      {rowDragging && rowGhostPos && rowDragId && createPortal(
        <div
          style={{
            position: 'fixed',
            left: rowGhostPos.x + 12,
            top: rowGhostPos.y - 10,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          {(() => {
            const flatAll = ganttUtils.flattenTasks(tasks);
            const draggedTask = flatAll.find(t => t.id === rowDragId);
            return draggedTask ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: isDark ? 'rgba(10,10,10,0.9)' : 'rgba(255,255,255,0.95)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <GripVertical className="w-3 h-3" style={{ color: '#2E94FF' }} />
                <span className="text-xs font-medium" style={{ color: isDark ? '#e6edf3' : '#111827' }}>
                  {draggedTask.name}
                </span>
              </div>
            ) : null;
          })()}
        </div>,
        document.body
      )}

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
