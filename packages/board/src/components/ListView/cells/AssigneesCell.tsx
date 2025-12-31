/**
 * AssigneesCell - User assignment cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { User, Plus, X, Check } from 'lucide-react';
import { cn } from '../../../utils';
import type { AvailableUser } from '../types';

// Local type that matches Task.assignees inline definition (includes avatar)
interface TaskAssignee {
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

interface AssigneesCellProps {
  value?: TaskAssignee[];
  availableUsers?: AvailableUser[];
  onChange?: (assignees: TaskAssignee[]) => void;
  isDark: boolean;
  locale: string;
  disabled?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? 'bg-blue-500';
}

export function AssigneesCell({
  value = [],
  availableUsers = [],
  onChange,
  isDark,
  locale,
  disabled = false,
}: AssigneesCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Check if user is assigned by name (since Assignee type uses name, not id)
  const isAssigned = (userName: string) => value.some(a => a.name === userName);

  const handleToggleUser = (user: AvailableUser) => {
    if (!onChange) return;

    if (isAssigned(user.name)) {
      onChange(value.filter(a => a.name !== user.name));
    } else {
      // Convert AvailableUser to TaskAssignee format
      const newAssignee: TaskAssignee = {
        name: user.name,
        initials: getInitials(user.name),
        color: user.color || getAvatarColor(user.name).replace('bg-', '').replace('-500', ''),
        avatar: user.avatarUrl,
      };
      onChange([...value, newAssignee]);
    }
  };

  // Display mode (no onChange or disabled)
  if (disabled || !onChange) {
    if (value.length === 0) {
      return (
        <span className={cn('text-sm', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
          -
        </span>
      );
    }

    return (
      <div className="flex items-center -space-x-2">
        {value.slice(0, 3).map((assignee, idx) => (
          <div
            key={`${assignee.name}-${idx}`}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white border-2',
              isDark ? 'border-[#0F1117]' : 'border-white',
              !assignee.avatar && getAvatarColor(assignee.name)
            )}
            style={assignee.color && !assignee.avatar ? { backgroundColor: assignee.color } : undefined}
            title={assignee.name}
          >
            {assignee.avatar ? (
              <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              assignee.initials || getInitials(assignee.name)
            )}
          </div>
        ))}
        {value.length > 3 && (
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2',
              isDark ? 'bg-[#374151] border-[#0F1117] text-white' : 'bg-gray-200 border-white text-gray-600'
            )}
          >
            +{value.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded transition-colors',
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        )}
      >
        {value.length === 0 ? (
          <>
            <User className={cn('w-4 h-4', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
            <Plus className={cn('w-3 h-3', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
          </>
        ) : (
          <div className="flex items-center -space-x-1">
            {value.slice(0, 2).map((assignee, idx) => (
              <div
                key={`${assignee.name}-${idx}`}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border',
                  isDark ? 'border-[#0F1117]' : 'border-white',
                  !assignee.avatar && getAvatarColor(assignee.name)
                )}
                style={assignee.color && !assignee.avatar ? { backgroundColor: assignee.color } : undefined}
              >
                {assignee.avatar ? (
                  <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  assignee.initials || getInitials(assignee.name)
                )}
              </div>
            ))}
            {value.length > 2 && (
              <span className={cn('text-xs ml-1', isDark ? 'text-[#9CA3AF]' : 'text-gray-500')}>
                +{value.length - 2}
              </span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 rounded-lg shadow-lg border w-64',
            isDark ? 'bg-[#1F2937] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'es' ? 'Buscar usuario...' : 'Search user...'}
              className={cn(
                'w-full px-3 py-1.5 text-sm rounded border outline-none',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-[#6B7280]'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
              )}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredUsers.length === 0 ? (
              <p className={cn('px-3 py-2 text-sm', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
                {locale === 'es' ? 'No se encontraron usuarios' : 'No users found'}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleUser(user);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white',
                      !user.avatarUrl && getAvatarColor(user.name)
                    )}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={isDark ? 'text-white' : 'text-gray-900'}>{user.name}</div>
                    {user.email && (
                      <div className={cn('text-xs', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
                        {user.email}
                      </div>
                    )}
                  </div>
                  {isAssigned(user.name) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Selected users */}
          {value.length > 0 && (
            <div className="p-2 border-t flex flex-wrap gap-1" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }}>
              {value.map((assignee, idx) => (
                <span
                  key={`${assignee.name}-${idx}`}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full',
                    isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {assignee.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter(a => a.name !== assignee.name));
                    }}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
