/**
 * TableContextMenu - Context menu for ListView
 * @version 0.18.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  PlayCircle,
  Circle,
  Flag,
  Users,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils';
import type { Task } from '../Gantt/types';
import type { AvailableUser, ContextMenuState } from './types';

// Local type that matches Task.assignees inline definition (includes avatar)
interface TaskAssignee {
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper to get color from name
function getAvatarColor(name: string): string {
  const colors = ['blue', 'green', 'purple', 'pink', 'yellow', 'red', 'indigo', 'teal'] as const;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? 'blue';
}

interface TableContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  isDark: boolean;
  locale: string;
  // Task actions
  onTaskEdit?: (task: Task) => void;
  onTaskDuplicate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskUpdate?: (task: Task) => void;
  // Column actions
  onColumnHide?: (columnId: string) => void;
  onColumnSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  // Users for assignment
  availableUsers?: AvailableUser[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
  danger?: boolean;
}

export function TableContextMenu({
  state,
  onClose,
  isDark,
  locale,
  onTaskEdit,
  onTaskDuplicate,
  onTaskDelete,
  onTaskUpdate,
  onColumnHide,
  onColumnSort,
  availableUsers = [],
}: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const t = locale === 'es' ? translations.es : translations.en;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!state.isOpen) return null;

  // Build menu items based on context type
  const getTaskMenuItems = (): MenuItem[] => {
    if (!state.task) return [];

    const items: MenuItem[] = [];

    // Edit
    if (onTaskEdit) {
      items.push({
        id: 'edit',
        label: t.edit,
        icon: <Edit3 className="w-4 h-4" />,
        onClick: () => {
          onTaskEdit(state.task!);
          onClose();
        },
      });
    }

    items.push({ id: 'sep1', label: '', icon: null, separator: true });

    // Change status submenu
    if (onTaskUpdate) {
      items.push({
        id: 'status',
        label: t.changeStatus,
        icon: <CheckCircle2 className="w-4 h-4" />,
        submenu: [
          {
            id: 'status-todo',
            label: t.todo,
            icon: <Circle className="w-4 h-4 text-gray-400" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, status: 'todo', progress: 0 });
              onClose();
            },
          },
          {
            id: 'status-in-progress',
            label: t.inProgress,
            icon: <PlayCircle className="w-4 h-4 text-blue-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, status: 'in-progress', progress: state.task!.progress || 50 });
              onClose();
            },
          },
          {
            id: 'status-completed',
            label: t.completed,
            icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, status: 'completed', progress: 100 });
              onClose();
            },
          },
        ],
      });

      // Change priority submenu
      items.push({
        id: 'priority',
        label: t.changePriority,
        icon: <Flag className="w-4 h-4" />,
        submenu: [
          {
            id: 'priority-urgent',
            label: t.urgent,
            icon: <div className="w-3 h-3 rounded-full bg-red-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, priority: 'urgent' });
              onClose();
            },
          },
          {
            id: 'priority-high',
            label: t.high,
            icon: <div className="w-3 h-3 rounded-full bg-orange-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, priority: 'high' });
              onClose();
            },
          },
          {
            id: 'priority-medium',
            label: t.medium,
            icon: <div className="w-3 h-3 rounded-full bg-yellow-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, priority: 'medium' });
              onClose();
            },
          },
          {
            id: 'priority-low',
            label: t.low,
            icon: <div className="w-3 h-3 rounded-full bg-blue-500" />,
            onClick: () => {
              onTaskUpdate({ ...state.task!, priority: 'low' });
              onClose();
            },
          },
        ],
      });

      // Assign user submenu (if users available)
      if (availableUsers.length > 0) {
        items.push({
          id: 'assign',
          label: t.assignUser,
          icon: <Users className="w-4 h-4" />,
          submenu: availableUsers.slice(0, 5).map((user) => ({
            id: `assign-${user.id}`,
            label: user.name,
            icon: (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white bg-blue-500"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ),
            onClick: () => {
              const currentAssignees = state.task!.assignees || [];
              // Check if user is already assigned by name
              const isAlreadyAssigned = currentAssignees.some(a => a.name === user.name);
              const newAssignees: TaskAssignee[] = isAlreadyAssigned
                ? currentAssignees.filter(a => a.name !== user.name)
                : [...currentAssignees, {
                    name: user.name,
                    initials: getInitials(user.name),
                    color: user.color || getAvatarColor(user.name),
                    avatar: user.avatarUrl,
                  }];
              onTaskUpdate({ ...state.task!, assignees: newAssignees });
              onClose();
            },
          })),
        });
      }
    }

    items.push({ id: 'sep2', label: '', icon: null, separator: true });

    // Duplicate
    if (onTaskDuplicate) {
      items.push({
        id: 'duplicate',
        label: t.duplicate,
        icon: <Copy className="w-4 h-4" />,
        onClick: () => {
          onTaskDuplicate(state.task!);
          onClose();
        },
      });
    }

    // Delete
    if (onTaskDelete) {
      items.push({
        id: 'delete',
        label: t.delete,
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => {
          onTaskDelete(state.task!.id);
          onClose();
        },
      });
    }

    return items;
  };

  const getHeaderMenuItems = (): MenuItem[] => {
    if (!state.columnId) return [];

    const items: MenuItem[] = [];

    // Sort options
    if (onColumnSort) {
      items.push({
        id: 'sort-asc',
        label: t.sortAsc,
        icon: <ArrowUp className="w-4 h-4" />,
        onClick: () => {
          onColumnSort(state.columnId!, 'asc');
          onClose();
        },
      });
      items.push({
        id: 'sort-desc',
        label: t.sortDesc,
        icon: <ArrowDown className="w-4 h-4" />,
        onClick: () => {
          onColumnSort(state.columnId!, 'desc');
          onClose();
        },
      });
    }

    // Hide column (not for name column)
    if (onColumnHide && state.columnId !== 'name') {
      items.push({ id: 'sep-hide', label: '', icon: null, separator: true });
      items.push({
        id: 'hide',
        label: t.hideColumn,
        icon: <EyeOff className="w-4 h-4" />,
        onClick: () => {
          onColumnHide(state.columnId!);
          onClose();
        },
      });
    }

    return items;
  };

  const menuItems = state.type === 'task' ? getTaskMenuItems() : getHeaderMenuItems();

  // Calculate position to avoid viewport overflow
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: state.x,
    top: state.y,
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        'py-1 rounded-lg shadow-xl border min-w-[180px]',
        isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {menuItems.map((item) => {
        if (item.separator) {
          return (
            <div
              key={item.id}
              className={cn('my-1 h-px', isDark ? 'bg-white/10' : 'bg-gray-200')}
            />
          );
        }

        if (item.submenu) {
          return (
            <SubmenuItem
              key={item.id}
              item={item}
              isDark={isDark}
            />
          );
        }

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
              item.danger
                ? 'text-red-500 hover:text-red-600'
                : isDark ? 'text-white' : 'text-gray-700'
            )}
          >
            <span className={cn(item.danger ? 'text-red-500' : isDark ? 'text-[#9CA3AF]' : 'text-gray-400')}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// Submenu component with hover behavior
function SubmenuItem({ item, isDark }: { item: MenuItem; isDark: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
          isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
        )}
      >
        <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-400'}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        <ChevronRight className={cn('w-4 h-4', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
      </button>

      {isOpen && item.submenu && (
        <div
          className={cn(
            'absolute left-full top-0 ml-1 py-1 rounded-lg shadow-xl border min-w-[160px]',
            isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {item.submenu.map((subItem) => (
            <button
              key={subItem.id}
              onClick={subItem.onClick}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
              )}
            >
              <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-400'}>
                {subItem.icon}
              </span>
              {subItem.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Translations
const translations = {
  en: {
    edit: 'Edit',
    changeStatus: 'Change status',
    changePriority: 'Change priority',
    assignUser: 'Assign user',
    duplicate: 'Duplicate',
    delete: 'Delete',
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    sortAsc: 'Sort A → Z',
    sortDesc: 'Sort Z → A',
    hideColumn: 'Hide column',
  },
  es: {
    edit: 'Editar',
    changeStatus: 'Cambiar estado',
    changePriority: 'Cambiar prioridad',
    assignUser: 'Asignar usuario',
    duplicate: 'Duplicar',
    delete: 'Eliminar',
    todo: 'Pendiente',
    inProgress: 'En Progreso',
    completed: 'Completado',
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    sortAsc: 'Ordenar A → Z',
    sortDesc: 'Ordenar Z → A',
    hideColumn: 'Ocultar columna',
  },
};
