import { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Edit3, GripVertical, Calendar } from 'lucide-react';
import { Task, GanttColumn, ColumnType, GanttTemplates } from './types';
import { motion } from 'framer-motion';
// v0.17.200: ColumnManager and Keyboard moved to GanttBoard with resize handle
import { ContextMenu, ContextMenuItem, MenuIcons } from './ContextMenu';
import { useGanttKeyboard } from './useGanttKeyboard';
import { useGanttSelection } from './useGanttSelection';
import { flattenTasks as flattenTasksUtil } from './hierarchyUtils';
import { UserAssignmentSelector } from '../Card/UserAssignmentSelector';
import { StatusSelector } from '../Card/StatusSelector';
import { PrioritySelector } from '../Card/PrioritySelector'; // v0.17.29
import { GanttI18nContext } from './GanttI18nContext';
import type { User } from '../Card/UserAssignmentSelector';

interface TaskGridProps {
  tasks: Task[];
  theme: any;
  rowHeight: number;
  availableUsers?: Array<{ id: string; name: string; initials: string; color: string }>;
  templates: Required<GanttTemplates>; // v0.8.0
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void; // v0.8.0
  onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0
  onTaskToggle?: (taskId: string) => void;
  scrollTop: number;
  columns: GanttColumn[];
  onToggleColumn: (columnType: ColumnType) => void;
  onColumnResize?: (columnId: ColumnType, newWidth: number) => void; // v0.13.8
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;

  // Hierarchy handlers
  onTaskIndent?: (taskIds: string[]) => void;
  onTaskOutdent?: (taskIds: string[]) => void;
  onTaskMove?: (taskIds: string[], direction: 'up' | 'down') => void;
  onMultiTaskDelete?: (taskIds: string[]) => void;
  onTaskDuplicate?: (taskIds: string[]) => void;
  onTaskCreate?: (afterTaskId: string, direction: 'above' | 'below') => void;
  onTaskRename?: (taskId: string, newName: string) => void;
  onCreateSubtask?: (parentTaskId: string) => void;
  onOpenTaskModal?: (task: Task) => void;
  // v0.17.34: Delete confirmation request (shows modal instead of deleting directly)
  onDeleteRequest?: (taskId: string, taskName: string) => void;
  // v0.17.68: Reparent task via drag & drop
  onTaskReparent?: (taskId: string, newParentId: string | null, position?: number) => void;
}

export function TaskGrid({
  tasks,
  theme,
  rowHeight: ROW_HEIGHT,
  availableUsers = [],
  templates: _templates, // TODO: Use templates for custom rendering
  onTaskClick,
  onTaskDblClick, // v0.8.0
  onTaskContextMenu, // v0.8.0
  onTaskToggle,
  scrollTop: _scrollTop,
  columns,
  onToggleColumn,
  onColumnResize,
  onTaskUpdate,
  onTaskIndent,
  onTaskOutdent,
  onTaskMove,
  onMultiTaskDelete,
  onTaskDuplicate,
  onTaskCreate,
  onTaskRename,
  onCreateSubtask,
  onOpenTaskModal,
  onDeleteRequest, // v0.17.34
  onTaskReparent, // v0.17.68
}: TaskGridProps) {
  // v0.16.2: Get translations from context
  const translations = useContext(GanttI18nContext);

  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // v0.13.8: Column resize state
  const [resizingColumn, setResizingColumn] = useState<ColumnType | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    type: 'header' | 'task';
    columnId?: ColumnType;
    task?: Task;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    type: 'header',
  });

  // v0.17.68: Drag & drop state for reparenting tasks
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | 'child' | null>(null);
  const dragStartY = useRef<number>(0);
  const dragThreshold = 5; // Minimum pixels to move before drag starts
  const isDraggingRef = useRef<boolean>(false);
  // v0.17.146: Ghost position for drag preview + isDragging state for re-render
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // v0.17.132: Date picker state for column cells
  const [datePickerState, setDatePickerState] = useState<{
    taskId: string;
    field: 'startDate' | 'endDate';
    month: Date;
    position: { top: number; left: number };
  } | null>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTaskId]);

  // v0.13.8: Handle column resize mouse events
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const newWidth = resizeStartWidth + deltaX;
      onColumnResize?.(resizingColumn, newWidth);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, onColumnResize]);

  // Multi-selection hook
  const {
    selectedTaskIds,
    handleTaskClick: handleSelectionClick,
    isTaskSelected,
  } = useGanttSelection();

  // Keyboard shortcuts hook
  const { setIsEditing } = useGanttKeyboard({
    tasks,
    selectedTaskIds,
    onTaskSelect: (taskId: string, multiSelect?: boolean) => {
      const flatTasks = flattenTasksUtil(tasks);
      const flatTaskIds = flatTasks.map(t => t.id);
      handleSelectionClick(taskId, flatTaskIds, multiSelect || false, false);
    },
    onTaskCreate: onTaskCreate || (() => {}),
    onTaskDelete: onMultiTaskDelete || (() => {}),
    onTaskDuplicate: onTaskDuplicate || (() => {}),
    onTaskMove: onTaskMove || (() => {}),
    onTaskIndent: onTaskIndent || (() => {}),
    onTaskOutdent: onTaskOutdent || (() => {}),
    onTaskRename: (taskId: string) => {
      // Start inline rename when F2 is pressed
      const task = flattenTasksUtil(tasks).find(t => t.id === taskId);
      if (task) {
        handleRenameStart(task);
      }
    },
    onTaskToggleExpand: onTaskToggle || (() => {}),
    onOpenTaskModal: (taskId: string) => {
      const task = flattenTasksUtil(tasks).find(t => t.id === taskId);
      if (task && onOpenTaskModal) {
        onOpenTaskModal(task);
      }
    },
    enableKeyboard: true,
  });

  const flattenTasks = (tasks: Task[], level = 0): Array<{ task: Task; level: number }> => {
    const result: Array<{ task: Task; level: number }> = [];
    
    for (const task of tasks) {
      result.push({ task, level });
      if (task.subtasks && task.subtasks.length > 0 && task.isExpanded) {
        result.push(...flattenTasks(task.subtasks, level + 1));
      }
    }
    
    return result;
  };

  const flatTasks = flattenTasks(tasks);
  const HEADER_HEIGHT = 48;


  // Calculate duration
  const getDuration = (task: Task) => {
    if (!task.startDate || !task.endDate) return '-';
    const days = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d`;
  };

  // Handle rename start
  const handleRenameStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
    setIsEditing(true);
  };

  // Handle rename save
  const handleRenameSave = (taskId: string) => {
    if (editingTaskName.trim() && editingTaskName !== tasks.find(t => t.id === taskId)?.name) {
      onTaskRename?.(taskId, editingTaskName.trim());
    }
    setEditingTaskId(null);
    setEditingTaskName('');
    setIsEditing(false);
  };

  // Handle rename cancel
  const handleRenameCancel = () => {
    setEditingTaskId(null);
    setEditingTaskName('');
    setIsEditing(false);
  };

  // Handle create subtask
  const handleCreateSubtaskClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    // Create subtask at the end of parent's children
    onCreateSubtask?.(task.id);
  };

  // v0.17.68: Drag handlers for reparenting
  const handleDragStart = (taskId: string, e: React.MouseEvent) => {
    // Only start drag from the drag handle area
    e.preventDefault();
    dragStartY.current = e.clientY;
    setDraggedTaskId(taskId);
    isDraggingRef.current = false;
    setIsDraggingState(false);
    // v0.17.146: Initialize ghost position
    setGhostPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!draggedTaskId) return;

    const deltaY = Math.abs(e.clientY - dragStartY.current);
    if (deltaY > dragThreshold && !isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDraggingState(true);
    }

    // v0.17.146: Update ghost position
    setGhostPosition({ x: e.clientX, y: e.clientY });

    if (!isDraggingRef.current) return;

    // Find which task we're hovering over
    const rows = document.querySelectorAll('[data-task-row]');
    let foundTarget: string | null = null;
    let position: 'above' | 'below' | 'child' | null = null;

    rows.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const taskId = row.getAttribute('data-task-row');

      if (taskId && taskId !== draggedTaskId && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        foundTarget = taskId;

        // Determine drop position based on Y position within the row
        const relativeY = e.clientY - rect.top;
        const rowHeight = rect.height;

        if (relativeY < rowHeight * 0.25) {
          position = 'above';
        } else if (relativeY > rowHeight * 0.75) {
          position = 'below';
        } else {
          // Middle zone = make it a child
          position = 'child';
        }
      }
    });

    setDropTargetTaskId(foundTarget);
    setDropPosition(position);
  };

  const handleDragEnd = () => {
    if (isDraggingRef.current && draggedTaskId && dropTargetTaskId && dropPosition) {
      // Determine the new parent and position
      if (dropPosition === 'child') {
        // Make it a child of the target task
        onTaskReparent?.(draggedTaskId, dropTargetTaskId);
      } else if (dropPosition === 'above' || dropPosition === 'below') {
        // Find the parent of the target task
        const findParent = (tasks: Task[], targetId: string, parent: string | null = null): string | null => {
          for (const t of tasks) {
            if (t.id === targetId) return parent;
            if (t.subtasks) {
              const found = findParent(t.subtasks, targetId, t.id);
              if (found !== undefined) return found;
            }
          }
          return undefined as unknown as string | null;
        };

        const targetParent = findParent(tasks, dropTargetTaskId, null);

        // Find position within siblings
        const findPositionInSiblings = (taskList: Task[], targetId: string): number => {
          const idx = taskList.findIndex(t => t.id === targetId);
          return dropPosition === 'below' ? idx + 1 : idx;
        };

        if (targetParent === null) {
          // Target is at root level
          const pos = findPositionInSiblings(tasks, dropTargetTaskId);
          onTaskReparent?.(draggedTaskId, null, pos);
        } else {
          // Target has a parent
          const parentTask = flatTasks.find(ft => ft.task.id === targetParent)?.task;
          if (parentTask?.subtasks) {
            const pos = findPositionInSiblings(parentTask.subtasks, dropTargetTaskId);
            onTaskReparent?.(draggedTaskId, targetParent, pos);
          }
        }
      }
    }

    // Reset drag state
    setDraggedTaskId(null);
    setDropTargetTaskId(null);
    setDropPosition(null);
    setGhostPosition(null); // v0.17.146: Clear ghost
    isDraggingRef.current = false;
    setIsDraggingState(false);
  };

  // v0.17.68: Set up global drag listeners
  useEffect(() => {
    if (draggedTaskId) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
    return undefined;
  }, [draggedTaskId, dropTargetTaskId, dropPosition]);

  // Render cell content based on column type
  const renderCellContent = (column: GanttColumn, task: Task, level: number) => {
    switch (column.id) {
      case 'name':
        const isEditing = editingTaskId === task.id;
        const isHovered = hoveredTaskId === task.id;

        return (
          <div className="flex items-center gap-2 flex-1 min-w-0 relative" style={{ paddingLeft: `${level * 20}px` }}>
            {/* v0.17.68: Drag handle for reparenting - always visible, more prominent on hover */}
            {onTaskReparent && (
              <div
                className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-white/10 transition-all flex-shrink-0"
                style={{
                  color: theme.textTertiary,
                  opacity: isHovered ? 1 : 0.3,
                }}
                onMouseDown={(e) => handleDragStart(task.id, e)}
                title="Arrastrar para mover tarea"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            {/* Expand/Collapse Button OR Color Indicator - same position for alignment */}
            {task.subtasks && task.subtasks.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskToggle?.(task.id);
                }}
                className="p-0.5 hover:bg-opacity-10 rounded transition-colors flex-shrink-0"
                style={{ color: theme.textSecondary }}
              >
                {task.isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              /* v0.17.183: Color dot in same position as chevron for perfect alignment */
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{
                    backgroundColor: task.color || '#3B82F6',
                    opacity: task.parentId ? 0.6 : 1, // Subtasks more transparent
                    borderColor: task.isMilestone ? theme.accent : 'transparent',
                    borderWidth: task.isMilestone ? '2px' : '0px',
                  }}
                  title={task.isMilestone ? 'Milestone' : task.parentId ? 'Subtask' : 'Task'}
                />
              </div>
            )}

            {/* Task Name or Input */}
            {isEditing ? (
              <input
                ref={editInputRef}
                type="text"
                value={editingTaskName}
                onChange={(e) => setEditingTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSave(task.id);
                  } else if (e.key === 'Escape') {
                    handleRenameCancel();
                  }
                }}
                onBlur={() => handleRenameSave(task.id)}
                className="flex-1 px-2 py-1 rounded border outline-none"
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderColor: theme.accent,
                  color: theme.textPrimary,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  className="flex-1"
                  style={{
                    // v0.17.72: Enhanced visual hierarchy - Root tasks (level 0) are always "phases"
                    // Root tasks (no parentId): Pure primary color, heavier weight - even without children
                    // Subtasks (has parentId): Secondary color, lighter weight
                    // This ensures master tasks look prominent even before adding children
                    color: !task.parentId
                      ? theme.textPrimary  // Root/Master: Brightest (#FFFFFF dark / #0F172A light)
                      : theme.textSecondary,  // Subtasks: Muted (#CBD5E1 dark / #334155 light)
                    fontFamily: 'Inter, sans-serif',
                    fontSize: !task.parentId
                      ? '14px'  // Root/Master: Slightly larger
                      : '13px',  // Subtasks: Normal size
                    // v0.17.72: Font weight based on hierarchy level, not children count
                    fontWeight: task.isMilestone
                      ? 600  // Milestones: Semibold (most important)
                      : !task.parentId
                        ? 600  // Root/Master: Semibold - always "jump" to view
                        : 400,  // Subtasks: Normal weight
                    letterSpacing: !task.parentId
                      ? '-0.01em'  // Root/Master: Tighter tracking for headers
                      : '0',
                  }}
                  title={task.name} // v0.13.8: Show full name on hover tooltip
                >
                  {task.name}
                </span>

                {/* Hover Action Buttons */}
                {isHovered && !isEditing && (
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    {/* Create Subtask Button */}
                    <button
                      onClick={(e) => handleCreateSubtaskClick(task, e)}
                      className="p-1 rounded hover:bg-opacity-20 transition-colors"
                      style={{
                        color: theme.textTertiary,
                        backgroundColor: 'transparent'
                      }}
                      title="Create subtask"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Rename Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameStart(task);
                      }}
                      className="p-1 rounded hover:bg-opacity-20 transition-colors"
                      style={{
                        color: theme.textTertiary,
                        backgroundColor: 'transparent'
                      }}
                      title="Rename (F2)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      
      case 'startDate':
      case 'endDate':
        const isStartDate = column.id === 'startDate';
        const dateField = isStartDate ? 'startDate' : 'endDate';
        const dateValue = task[dateField];
        const isDatePickerOpen = datePickerState?.taskId === task.id && datePickerState?.field === dateField;

        const formatDisplayDate = (date: Date | string | undefined) => {
          if (!date) return '-';
          const d = typeof date === 'string' ? new Date(date) : date;
          return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        return (
          <div
            className="flex items-center justify-center w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors hover:bg-white/5"
              style={{ color: theme.textSecondary }}
              onClick={(e) => {
                if (isDatePickerOpen) {
                  setDatePickerState(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDatePickerState({
                    taskId: task.id,
                    field: dateField,
                    month: (dateValue ? (typeof dateValue === 'string' ? new Date(dateValue) : dateValue) : new Date()),
                    position: { top: rect.bottom + 4, left: rect.left }
                  });
                }
              }}
            >
              <Calendar className="w-3 h-3" style={{ color: theme.textTertiary }} />
              <span>{formatDisplayDate(dateValue)}</span>
            </button>

            {/* Date Picker Popover - Using Portal to render outside overflow:hidden containers */}
            {isDatePickerOpen && typeof document !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setDatePickerState(null)} />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed z-[9999] rounded-xl shadow-2xl overflow-visible flex"
                  style={{
                    backgroundColor: theme.bgPrimary,
                    border: `1px solid ${theme.border}`,
                    top: datePickerState?.position.top,
                    left: datePickerState?.position.left,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Quick Options */}
                  <div className="w-36 py-2" style={{ borderRight: `1px solid ${theme.border}` }}>
                    {(() => {
                      const today = new Date();
                      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
                      const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);

                      const options = [
                        { label: 'Hoy', date: today },
                        { label: 'Mañana', date: tomorrow },
                        { label: 'Próxima semana', date: nextWeek },
                        { label: '2 semanas', date: twoWeeks },
                      ];

                      return options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-3 py-1.5 text-xs text-left transition-colors"
                          style={{ color: theme.textPrimary }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.hoverBg || 'rgba(255,255,255,0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          onClick={() => {
                            onTaskUpdate?.(task.id, { [dateField]: opt.date });
                            setDatePickerState(null);
                          }}
                        >
                          {opt.label}
                        </button>
                      ));
                    })()}
                    <div style={{ borderTop: `1px solid ${theme.border}`, margin: '0.25rem 0' }} />
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-xs text-left transition-colors"
                      style={{ color: '#EF4444' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.hoverBg || 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => {
                        onTaskUpdate?.(task.id, { [dateField]: undefined });
                        setDatePickerState(null);
                      }}
                    >
                      Borrar
                    </button>
                  </div>

                  {/* Calendar */}
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => setDatePickerState(prev => prev ? { ...prev, month: new Date(prev.month.getFullYear(), prev.month.getMonth() - 1) } : null)}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
                      </button>
                      <span className="text-xs font-medium" style={{ color: theme.textPrimary }}>
                        {datePickerState?.month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDatePickerState(prev => prev ? { ...prev, month: new Date(prev.month.getFullYear(), prev.month.getMonth() + 1) } : null)}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <div key={i} className="w-6 h-6 flex items-center justify-center text-[10px]" style={{ color: theme.textTertiary }}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {(() => {
                        const month = datePickerState?.month || new Date();
                        const year = month.getFullYear(), m = month.getMonth();
                        const firstDay = new Date(year, m, 1).getDay();
                        const daysInMonth = new Date(year, m + 1, 0).getDate();
                        const today = new Date();
                        const days: { day: number; date: Date; isCurrentMonth: boolean }[] = [];

                        for (let i = firstDay - 1; i >= 0; i--) days.push({ day: new Date(year, m, -i).getDate(), date: new Date(year, m - 1, new Date(year, m, -i).getDate()), isCurrentMonth: false });
                        for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, m, i), isCurrentMonth: true });
                        const remaining = 42 - days.length;
                        for (let i = 1; i <= remaining; i++) days.push({ day: i, date: new Date(year, m + 1, i), isCurrentMonth: false });

                        return days.map((d, i) => {
                          const isToday = d.date.toDateString() === today.toDateString();
                          const currentDateValue = dateValue ? (typeof dateValue === 'string' ? new Date(dateValue) : dateValue) : null;
                          const isSelected = currentDateValue?.toDateString() === d.date.toDateString();

                          return (
                            <button
                              key={i}
                              type="button"
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors"
                              style={{
                                color: !d.isCurrentMonth ? theme.textTertiary : isSelected ? '#FFF' : theme.textPrimary,
                                backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                                boxShadow: isToday && !isSelected ? 'inset 0 0 0 1px #3B82F6' : 'none',
                              }}
                              onClick={() => {
                                onTaskUpdate?.(task.id, { [dateField]: d.date });
                                setDatePickerState(null);
                              }}
                            >
                              {d.day}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </motion.div>
              </>,
              document.body
            )}
          </div>
        );

      case 'duration':
        return (
          <div className="flex items-center justify-center w-full">
            <span
              className="text-xs tabular-nums"
              style={{
                color: theme.textSecondary,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
              }}
            >
              {getDuration(task)}
            </span>
          </div>
        );
      
      case 'assignees':
        const taskAssignedUsers: User[] = availableUsers.filter(user =>
          task.assignees?.some(a => a.name === user.name || a.initials === user.initials)
        );

        return (
          <div
            className="flex items-center justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <UserAssignmentSelector
              assignedUsers={taskAssignedUsers}
              availableUsers={availableUsers}
              onChange={(users: User[]) => {
                const newAssignees = users.map(u => ({
                  id: u.id,
                  name: u.name,
                  initials: u.initials,
                  color: u.color
                }));
                onTaskUpdate?.(task.id, {
                  assignees: newAssignees.length > 0 ? newAssignees : undefined
                });
              }}
            />
          </div>
        );
      
      case 'status':
        return (
          <div
            className="flex items-center justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <StatusSelector
              status={task.status || 'todo'}
              onChange={(status) => {
                onTaskUpdate?.(task.id, {
                  status,
                  progress: status === 'completed' ? 100 : task.progress
                });
              }}
            />
          </div>
        );
      
      case 'progress':
        return (
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[60px]" style={{ backgroundColor: theme.bgSecondary }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: task.progress === 100 ? theme.statusCompleted : theme.accent,
                }}
              />
            </div>
            <span
              className="text-xs tabular-nums min-w-[35px] text-right"
              style={{
                color: theme.textTertiary,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
              }}
            >
              {task.progress}%
            </span>
          </div>
        );

      // v0.17.29: Priority column
      case 'priority':
        // Map task priority to PrioritySelector format
        const priorityMapForSelector: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
          low: 'LOW',
          medium: 'MEDIUM',
          high: 'HIGH',
          urgent: 'URGENT',
        };
        const reversePriorityMapForTask: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
          LOW: 'low',
          MEDIUM: 'medium',
          HIGH: 'high',
          URGENT: 'urgent',
        };
        const currentPriorityValue = priorityMapForSelector[task.priority || 'medium'] || 'MEDIUM';

        return (
          <div
            className="flex items-center justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <PrioritySelector
              priority={currentPriorityValue}
              onChange={(newPriority) => {
                if (newPriority) {
                  onTaskUpdate?.(task.id, {
                    priority: reversePriorityMapForTask[newPriority] || 'medium',
                  });
                }
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Context menu items for header
  const getHeaderContextMenuItems = (columnId: ColumnType): ContextMenuItem[] => {
    return [
      {
        id: 'hide',
        label: 'Hide Column',
        icon: MenuIcons.Hide,
        onClick: () => onToggleColumn(columnId),
        disabled: columnId === 'name',
      },
      { id: 'sep1', label: '', onClick: () => {}, separator: true },
      {
        id: 'sortAsc',
        label: 'Sort Ascending',
        icon: MenuIcons.SortAsc,
        onClick: () => {
          // Implement sorting in parent component if needed
        },
      },
      {
        id: 'sortDesc',
        label: 'Sort Descending',
        icon: MenuIcons.SortDesc,
        onClick: () => {
          // Implement sorting in parent component if needed
        },
      },
    ];
  };

  // v0.16.2: Context menu items for task row - unified with GanttBoard context menu
  // v0.17.46: Parent tasks (with subtasks) have limited menu - no edit, no status changes
  const getTaskContextMenuItems = (task: Task): ContextMenuItem[] => {
    const isParentTask = task.subtasks && task.subtasks.length > 0;

    // v0.17.46: Parent tasks can only add subtasks and delete - status/progress is auto-calculated
    if (isParentTask) {
      return [
        // Add Subtask - main action for parent tasks
        {
          id: 'addSubtask',
          label: translations?.contextMenu?.addSubtask || 'Add Subtask',
          icon: MenuIcons.Add,
          onClick: () => {
            onCreateSubtask?.(task.id);
          },
        },
        // Separator before delete
        { id: 'sep1', label: '', onClick: () => {}, separator: true },
        // Delete Task
        {
          id: 'delete',
          label: translations?.contextMenu?.deleteTask || 'Delete Task',
          icon: MenuIcons.Delete,
          onClick: () => {
            if (onDeleteRequest) {
              onDeleteRequest(task.id, task.name);
            } else {
              onMultiTaskDelete?.([task.id]);
            }
          },
        },
      ];
    }

    // Regular tasks (no subtasks) - full menu
    return [
      // Edit Task - opens edit modal via double-click handler
      {
        id: 'edit',
        label: translations?.contextMenu?.editTask || 'Edit Task',
        icon: MenuIcons.Pencil,
        onClick: () => {
          onTaskDblClick?.(task);
        },
      },
      // Add Subtask
      {
        id: 'addSubtask',
        label: translations?.contextMenu?.addSubtask || 'Add Subtask',
        icon: MenuIcons.Add,
        onClick: () => {
          onCreateSubtask?.(task.id);
        },
      },
      // Separator before status changes
      { id: 'sep1', label: '', onClick: () => {}, separator: true },
      // Mark Incomplete (status: 'todo', progress: 0)
      {
        id: 'markIncomplete',
        label: translations?.contextMenu?.markIncomplete || 'Mark Incomplete',
        icon: MenuIcons.MarkIncomplete,
        onClick: () => {
          onTaskUpdate?.(task.id, { status: 'todo', progress: 0 });
        },
        disabled: task.status === 'todo',
      },
      // Set In Progress (status: 'in-progress')
      {
        id: 'setInProgress',
        label: translations?.contextMenu?.setInProgress || 'Set In Progress',
        icon: MenuIcons.SetInProgress,
        onClick: () => {
          onTaskUpdate?.(task.id, { status: 'in-progress' });
        },
        disabled: task.status === 'in-progress',
      },
      // Mark Complete (status: 'completed', progress: 100)
      {
        id: 'markComplete',
        label: translations?.contextMenu?.markComplete || 'Mark Complete',
        icon: MenuIcons.MarkComplete,
        onClick: () => {
          onTaskUpdate?.(task.id, { status: 'completed', progress: 100 });
        },
        disabled: task.status === 'completed',
      },
      // Separator before advanced options
      { id: 'sep2', label: '', onClick: () => {}, separator: true },
      // Split Task
      {
        id: 'split',
        label: translations?.contextMenu?.splitTask || 'Split Task',
        icon: MenuIcons.Split,
        onClick: () => {},
        // Split task is only available via Timeline context menu (right-click on task bar)
        disabled: true,
      },
      // Separator before delete
      { id: 'sep3', label: '', onClick: () => {}, separator: true },
      // Delete Task - v0.17.34: Use confirmation modal if available
      {
        id: 'delete',
        label: translations?.contextMenu?.deleteTask || 'Delete Task',
        icon: MenuIcons.Delete,
        onClick: () => {
          if (onDeleteRequest) {
            // Show confirmation modal
            onDeleteRequest(task.id, task.name);
          } else {
            // Fallback to direct delete
            onMultiTaskDelete?.([task.id]);
          }
        },
      },
    ];
  };

  const visibleColumns = columns.filter(col => col.visible);

  // v0.17.194: Calculate total width of all visible columns for horizontal scroll
  const totalColumnsWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) + 60; // +60 for buttons

  // v0.13.10: TaskGrid no longer has its own scroll - it syncs with Timeline scroll
  return (
    <div
      className="h-full"
      style={{
        backgroundColor: theme.bgPrimary,
        minWidth: totalColumnsWidth, // v0.17.194: Enable horizontal scroll when needed
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center"
        style={{
          backgroundColor: theme.bgGrid,
          height: `${HEADER_HEIGHT}px`,
          paddingLeft: '3px', // Alinear con el borderLeft de las filas
          borderBottom: `1px solid ${theme.border}`,
          boxSizing: 'border-box', // Border included in height
        }}
      >
        {visibleColumns.map((column, colIndex) => {
          const isLastColumn = colIndex === visibleColumns.length - 1;
          const isNameColumn = column.id === 'name';

          return (
          <div
            key={column.id}
            className={`flex items-center px-4 cursor-pointer hover:bg-opacity-50 transition-colors relative ${
              isNameColumn ? '' : 'justify-center'
            }`}
            style={{
              // v0.17.129: All columns use fixed width for consistent resize behavior
              width: `${column.width}px`,
              minWidth: `${column.minWidth ?? (isNameColumn ? 200 : 60)}px`,
              maxWidth: `${column.maxWidth ?? 2000}px`,
              flexShrink: 0,
              flexGrow: 0,
              // v0.17.129: Border between columns, none on last (GanttBoard has the main divider)
              borderRight: !isLastColumn ? `1px solid ${theme.borderLight}` : 'none',
              height: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                isOpen: true,
                x: e.clientX,
                y: e.clientY,
                type: 'header',
                columnId: column.id,
              });
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span
              className="text-xs uppercase tracking-wider"
              style={{
                color: theme.textTertiary,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                // v0.17.129: Truncate long labels elegantly
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                // v0.17.191: No extra padding needed - buttons are now at header level
                paddingRight: '0',
              }}
              title={column.label}
            >
              {column.label}
            </span>

            {/* v0.17.191: Action buttons moved outside column flow - see header level */}

            {/* v0.13.8: Resize handle for resizable columns */}
            {/* v0.17.56: Improved resize handle - wider for easier grabbing */}
            {column.resizable && (
              <div
                className="absolute right-0 top-0 bottom-0 cursor-col-resize transition-colors group"
                style={{
                  width: '8px', // v0.17.56: Wider grab area
                  marginRight: '-4px', // v0.17.56: Center on border
                  backgroundColor: resizingColumn === column.id ? `${theme.accent}30` : 'transparent',
                  zIndex: 5, // v0.17.56: Above column content
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingColumn(column.id);
                  setResizeStartX(e.clientX);
                  setResizeStartWidth(column.width);
                }}
                title="Drag to resize column"
              >
                {/* Visual indicator line on hover */}
                <div
                  className="absolute top-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    left: '3px',
                    width: '2px',
                    backgroundColor: theme.accent,
                    borderRadius: '1px',
                  }}
                />
              </div>
            )}
          </div>
        );
        })}

        {/* v0.17.200: Action buttons moved to GanttBoard with resize handle */}
      </div>

      {/* Task Rows Container - v0.13.11: This container is targeted by CSS transform for scroll sync */}
      <div className="gantt-taskgrid-content">
      {flatTasks.map(({ task, level }, index) => {
        const isSelected = isTaskSelected(task.id);

        // v0.17.146: Calculate drop indicator styles - ClickUp style with prominent line
        const isDropTarget = dropTargetTaskId === task.id;
        const showDropAbove = isDropTarget && dropPosition === 'above';
        const showDropBelow = isDropTarget && dropPosition === 'below';
        const showDropChild = isDropTarget && dropPosition === 'child';
        const dropStyles: React.CSSProperties = {};
        if (showDropChild) {
          dropStyles.backgroundColor = `${theme.accent}15`;
          dropStyles.boxShadow = `inset 0 0 0 2px ${theme.accent}`;
        }

        return (
          <motion.div
            key={task.id}
            data-task-row={task.id}
            className={`flex items-center cursor-pointer group ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
            style={{
              position: 'relative', // v0.17.146: For drop indicator positioning
              height: `${ROW_HEIGHT}px`,
              borderLeft: isSelected ? `3px solid ${theme.accent}` : `3px solid transparent`,
              backgroundColor: isSelected
                ? theme.accentLight
                : showDropChild
                  ? `${theme.accent}15`
                  : (index % 2 === 0 ? theme.bgPrimary : theme.bgGrid),
              ...dropStyles,
            }}
            onMouseEnter={() => setHoveredTaskId(task.id)}
            onMouseLeave={() => setHoveredTaskId(null)}
            onClick={(e) => {
              const flatTasks = flattenTasksUtil(tasks);
              const flatTaskIds = flatTasks.map(t => t.id);
              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
              const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

              // Handle multi-selection
              handleSelectionClick(task.id, flatTaskIds, ctrlOrCmd, e.shiftKey);

              // Also trigger the regular click handler
              onTaskClick?.(task);
            }}
            onDoubleClick={(e) => {
              // v0.8.0: Double-click event
              e.stopPropagation();
              onTaskDblClick?.(task);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                isOpen: true,
                x: e.clientX,
                y: e.clientY,
                type: 'task',
                task,
              });

              // v0.8.0: Context menu event
              onTaskContextMenu?.(task, e);
            }}
            whileHover={{
              backgroundColor: isSelected ? theme.accentLight : theme.hoverBg,
            }}
          >
            {/* v0.17.147: Drop indicator line ABOVE - clean horizontal line */}
            {showDropAbove && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: theme.accent,
                  zIndex: 10,
                }}
              />
            )}

            {/* v0.17.147: Drop indicator line BELOW - clean horizontal line */}
            {showDropBelow && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: theme.accent,
                  zIndex: 10,
                }}
              />
            )}

          {visibleColumns.map((column, colIndex) => {
            const isLastColumn = colIndex === visibleColumns.length - 1;
            const isNameColumn = column.id === 'name';

            return (
            <div
              key={`${task.id}-${column.id}`}
              className={`px-4 flex items-center ${
                isNameColumn ? 'justify-start' : 'justify-center'
              }`}
              style={{
                // v0.17.129: All columns use fixed width for consistent resize behavior
                width: `${column.width}px`,
                minWidth: `${column.minWidth ?? (isNameColumn ? 200 : 60)}px`,
                maxWidth: `${column.maxWidth ?? 2000}px`,
                flexShrink: 0,
                flexGrow: 0,
                // v0.17.129: Consistent border handling - inline style like header
                borderRight: !isLastColumn ? `1px solid ${hoveredTaskId === task.id ? theme.border : theme.borderLight}` : 'none',
                height: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {renderCellContent(column, task, isNameColumn ? level : 0)}
            </div>
          );
          })}
          </motion.div>
        );
      })}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        items={
          contextMenu.type === 'header' && contextMenu.columnId
            ? getHeaderContextMenuItems(contextMenu.columnId)
            : contextMenu.type === 'task' && contextMenu.task
            ? getTaskContextMenuItems(contextMenu.task)
            : []
        }
        onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
        theme={theme}
      />

      {/* v0.17.147: Ghost/Phantom drag preview - subtle horizontal line style */}
      {isDraggingState && ghostPosition && draggedTaskId && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: ghostPosition.x + 12,
            top: ghostPosition.y - 10,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          {/* Subtle ghost - just text with slight background */}
          {(() => {
            const draggedTask = flatTasks.find(ft => ft.task.id === draggedTaskId)?.task;
            return draggedTask ? (
              <div
                className="flex items-center gap-2 px-2 py-1 rounded"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{
                    color: theme.textSecondary,
                    opacity: 0.9,
                  }}
                >
                  {draggedTask.name}
                </span>
              </div>
            ) : null;
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}
