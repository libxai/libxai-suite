import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Keyboard, Plus, Edit3 } from 'lucide-react';
import { Task, GanttColumn, ColumnType, GanttTemplates } from './types';
import { motion } from 'framer-motion';
import { ColumnManager } from './ColumnManager';
import { ContextMenu, ContextMenuItem, MenuIcons } from './ContextMenu';
import { useGanttKeyboard } from './useGanttKeyboard';
import { useGanttSelection } from './useGanttSelection';
import { flattenTasks as flattenTasksUtil } from './hierarchyUtils';
import { UserAssignmentSelector } from '../Card/UserAssignmentSelector';
import { StatusSelector } from '../Card/StatusSelector';
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
}: TaskGridProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const keyboardHelpRef = useRef<HTMLDivElement>(null);
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

  // Close keyboard help when clicking outside
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

  // Render cell content based on column type
  const renderCellContent = (column: GanttColumn, task: Task, level: number) => {
    switch (column.id) {
      case 'name':
        const isEditing = editingTaskId === task.id;
        const isHovered = hoveredTaskId === task.id;

        return (
          <div className="flex items-center gap-2 flex-1 min-w-0 relative" style={{ paddingLeft: `${level * 20}px` }}>
            {/* Expand/Collapse Button - Always show space for alignment */}
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
              /* Spacer for tasks without subtasks to maintain alignment */
              <div className="w-5 h-5 flex-shrink-0" />
            )}

            {/* v0.11.0: Color Indicator - Simple dot showing task color */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 border"
              style={{
                backgroundColor: task.color || '#6366F1',
                opacity: task.parentId ? 0.6 : 1, // Subtasks more transparent
                borderColor: task.isMilestone ? theme.accent : 'transparent',
                borderWidth: task.isMilestone ? '2px' : '0px',
              }}
              title={task.isMilestone ? 'Milestone' : task.parentId ? 'Subtask' : 'Task'}
            />

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
                  className="truncate flex-1"
                  style={{
                    color: theme.textPrimary,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: level === 0 ? '14px' : level === 1 ? '13px' : '12px',
                    // World-class hierarchy: Containers (with subtasks) have more weight
                    fontWeight: task.isMilestone
                      ? 600  // Milestones: Semibold (most important)
                      : (task.subtasks && task.subtasks.length > 0)
                      ? 500  // Containers: Medium (guide the eye)
                      : 400,  // Regular tasks: Normal
                    opacity: level === 0 ? 1 : level === 1 ? 0.95 : 0.88,
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
        const startDateValue = task.startDate
          ? typeof task.startDate === 'string'
            ? task.startDate
            : task.startDate.toISOString().split('T')[0]
          : undefined;
        return (
          <div
            className="flex items-center justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={startDateValue || ''}
              onChange={(e) => {
                onTaskUpdate?.(task.id, {
                  startDate: e.target.value ? new Date(e.target.value) : undefined
                });
              }}
              className="bg-transparent border-none text-xs cursor-pointer outline-none text-center"
              style={{
                color: theme.textSecondary,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
        );

      case 'endDate':
        const endDateValue = task.endDate
          ? typeof task.endDate === 'string'
            ? task.endDate
            : task.endDate.toISOString().split('T')[0]
          : undefined;
        return (
          <div
            className="flex items-center justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={endDateValue || ''}
              onChange={(e) => {
                onTaskUpdate?.(task.id, {
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                });
              }}
              className="bg-transparent border-none text-xs cursor-pointer outline-none text-center"
              style={{
                color: theme.textSecondary,
                fontFamily: 'Inter, sans-serif',
              }}
            />
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

  // Context menu items for task row
  const getTaskContextMenuItems = (task: Task): ContextMenuItem[] => {
    return [
      {
        id: 'edit',
        label: 'Edit Task',
        icon: MenuIcons.Edit,
        onClick: () => {
          // Implement edit dialog in parent component if needed
        },
      },
      {
        id: 'addSubtask',
        label: 'Add Subtask',
        icon: MenuIcons.Add,
        onClick: () => {
          // Implement subtask creation in parent component if needed
        },
      },
      {
        id: 'addDependency',
        label: 'Add Dependency',
        icon: MenuIcons.Link,
        onClick: () => {
          // Implement dependency picker in parent component if needed
        },
      },
      { id: 'sep1', label: '', onClick: () => {}, separator: true },
      {
        id: 'markComplete',
        label: task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete',
        icon: MenuIcons.Progress,
        onClick: () => {
          const newStatus = task.status === 'completed' ? 'in-progress' : 'completed';
          const newProgress = task.status === 'completed' ? task.progress : 100;
          onTaskUpdate?.(task.id, { status: newStatus, progress: newProgress });
        },
      },
      {
        id: 'setInProgress',
        label: 'Set In Progress',
        icon: MenuIcons.Progress,
        onClick: () => {
          onTaskUpdate?.(task.id, { status: 'in-progress' });
        },
        disabled: task.status === 'in-progress',
      },
      { id: 'sep2', label: '', onClick: () => {}, separator: true },
      {
        id: 'delete',
        label: 'Delete Task',
        icon: MenuIcons.Delete,
        onClick: () => {
          if (window.confirm(`Delete task "${task.name}"?`)) {
            onMultiTaskDelete?.([task.id]);
          }
        },
      },
    ];
  };

  const visibleColumns = columns.filter(col => col.visible);

  // v0.13.10: TaskGrid no longer has its own scroll - it syncs with Timeline scroll
  return (
    <div
      className="h-full overflow-hidden"
      style={{
        backgroundColor: theme.bgPrimary,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center border-b"
        style={{
          backgroundColor: theme.bgGrid,
          borderColor: theme.border,
          height: `${HEADER_HEIGHT}px`,
          marginLeft: '3px', // Alinear con el borderLeft de las filas
        }}
      >
        {visibleColumns.map((column) => (
          <div
            key={column.id}
            className={`flex items-center px-4 border-r cursor-pointer hover:bg-opacity-50 transition-colors relative ${
              column.id === 'name' ? 'justify-start' : 'justify-center'
            }`}
            style={{
              width: `${column.width}px`,
              minWidth: `${column.width}px`,
              maxWidth: `${column.width}px`,
              borderColor: theme.borderLight,
              height: '100%',
              boxSizing: 'border-box',
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
              }}
            >
              {column.label}
            </span>

            {/* v0.13.8: Resize handle for resizable columns */}
            {column.resizable && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
                style={{
                  backgroundColor: resizingColumn === column.id ? theme.accent : 'transparent',
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
                  className="absolute right-0 top-2 bottom-2 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
            )}
          </div>
        ))}
        
        {/* Add Column Button */}
        <div className="px-3 flex items-center gap-2 h-full">
          <ColumnManager
            columns={columns}
            onToggleColumn={onToggleColumn}
            theme={theme}
          />

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="p-1.5 rounded hover:bg-opacity-10 transition-colors relative group"
            style={{ color: theme.textTertiary }}
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />

            {/* Tooltip */}
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
          </button>
        </div>
      </div>

      {/* Task Rows */}
      {flatTasks.map(({ task, level }, index) => {
        const isSelected = isTaskSelected(task.id);

        return (
          <motion.div
            key={task.id}
            className="flex items-center border-b cursor-pointer group"
            style={{
              height: `${ROW_HEIGHT}px`,
              borderTop: `1px solid ${isSelected ? theme.accent : theme.borderLight}`,
              borderRight: `1px solid ${isSelected ? theme.accent : theme.borderLight}`,
              borderBottom: `1px solid ${isSelected ? theme.accent : theme.borderLight}`,
              borderLeft: isSelected ? `3px solid ${theme.accent}` : '3px solid transparent',
              backgroundColor: isSelected
                ? theme.accentLight
                : (index % 2 === 0 ? theme.bgPrimary : theme.bgGrid),
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
          {visibleColumns.map((column) => (
            <div
              key={`${task.id}-${column.id}`}
              className={`px-4 border-r flex items-center ${
                column.id === 'name' ? 'justify-start' : 'justify-center'
              }`}
              style={{
                width: `${column.width}px`,
                minWidth: `${column.width}px`,
                maxWidth: `${column.width}px`,
                borderColor: hoveredTaskId === task.id ? theme.border : theme.borderLight,
                height: '100%',
                boxSizing: 'border-box',
              }}
            >
              {renderCellContent(column, task, column.id === 'name' ? level : 0)}
            </div>
          ))}
          </motion.div>
        );
      })}

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
    </div>
  );
}
