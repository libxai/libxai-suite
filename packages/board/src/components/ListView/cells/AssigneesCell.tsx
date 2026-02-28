/**
 * AssigneesCell - User assignment cell for ListView
 * v2.0.0: Redesigned to match PulseTaskDrawer assignee picker
 */

import { useState, useRef, useEffect } from 'react';
import { User, Plus, X, Search } from 'lucide-react';
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
  /** @deprecated v2.0 — workload indicators removed to match drawer design */
  showWorkloadIndicators?: boolean;
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if user is assigned by name (since Assignee type uses name, not id)
  const isAssigned = (userName: string) => value.some(a => a.name === userName);

  const handleToggleUser = (user: AvailableUser) => {
    if (!onChange) return;

    if (isAssigned(user.name)) {
      onChange(value.filter(a => a.name !== user.name));
    } else {
      const newAssignee: TaskAssignee = {
        name: user.name,
        initials: getInitials(user.name),
        color: user.color || getAvatarColor(user.name).replace('bg-', '').replace('-500', ''),
        avatar: user.avatarUrl,
        id: user.id,
      } as any;
      onChange([...value, newAssignee]);
    }
    setIsOpen(false);
    setSearch('');
  };

  // Display mode (no onChange or disabled)
  if (disabled || !onChange) {
    if (value.length === 0) {
      return (
        <span className={cn('text-sm', isDark ? 'text-white/30' : 'text-gray-400')}>
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
              isDark ? 'border-[#0D0D0D]' : 'border-white',
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
              isDark ? 'bg-[#1A1A1A] border-[#0D0D0D] text-white' : 'bg-gray-200 border-white text-gray-600'
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
          isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
        )}
      >
        {value.length === 0 ? (
          <>
            <User className={cn('w-4 h-4', isDark ? 'text-white/30' : 'text-gray-400')} />
            <Plus className={cn('w-3 h-3', isDark ? 'text-white/30' : 'text-gray-400')} />
          </>
        ) : (
          <div className="flex items-center -space-x-1">
            {value.slice(0, 2).map((assignee, idx) => (
              <div
                key={`${assignee.name}-${idx}`}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border',
                  isDark ? 'border-[#0D0D0D]' : 'border-white',
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
              <span className={cn('text-xs ml-1', isDark ? 'text-white/60' : 'text-gray-500')}>
                +{value.length - 2}
              </span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute z-50 top-full left-0 mt-1.5 rounded-lg overflow-hidden"
          style={{
            width: 260,
            backgroundColor: isDark ? 'rgba(17, 17, 17, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {/* Search — icon + input inline */}
          <div
            className="flex items-center gap-1.5"
            style={{
              padding: '8px 10px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <Search
              className="flex-shrink-0"
              style={{
                width: 14, height: 14,
                color: isDark ? 'rgba(255,255,255,0.20)' : '#94A3B8',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'es' ? 'Buscar miembros...' : 'Search members...'}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.92)' : '#0F172A',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>

          {/* Selected chips */}
          {value.length > 0 && (
            <div
              className="flex flex-wrap gap-1"
              style={{
                padding: '6px 10px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              {value.map((assignee, idx) => (
                <span
                  key={`${assignee.name}-${idx}`}
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    padding: '2px 6px 2px 4px',
                    borderRadius: 4,
                    backgroundColor: assignee.color ? `${assignee.color}20` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    color: assignee.color || (isDark ? '#fff' : '#334155'),
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      backgroundColor: assignee.color || (isDark ? '#3B82F6' : '#3B82F6'),
                      fontSize: 8, fontWeight: 700, color: '#fff',
                    }}
                  >
                    {assignee.avatar ? (
                      <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      assignee.initials || getInitials(assignee.name)
                    )}
                  </span>
                  {assignee.name.split(' ')[0]}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter(a => a.name !== assignee.name));
                    }}
                    className="flex items-center justify-center"
                    style={{
                      width: 14, height: 14, borderRadius: 3,
                      border: 'none', background: 'transparent',
                      color: 'inherit', cursor: 'pointer', opacity: 0.7,
                    }}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User list */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 4 }}>
            {filteredUsers.length === 0 ? (
              <div
                style={{
                  padding: '12px 10px',
                  fontSize: 12,
                  color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
                  textAlign: 'center',
                }}
              >
                {locale === 'es' ? 'No se encontraron miembros' : 'No members found'}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const assigned = isAssigned(user.name);
                return (
                  <button
                    key={user.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleUser(user);
                    }}
                    className="flex items-center w-full"
                    style={{
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: assigned
                        ? (isDark ? 'rgba(0, 127, 255, 0.12)' : 'rgba(59, 130, 246, 0.08)')
                        : 'transparent',
                      color: isDark ? 'rgba(255,255,255,0.92)' : '#0F172A',
                      fontSize: 12,
                      textAlign: 'left' as const,
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!assigned) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!assigned) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 24, height: 24, borderRadius: '50%',
                        backgroundColor: user.color || '#3B82F6',
                        fontSize: 9, fontWeight: 700, color: '#fff',
                      }}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name}
                    </span>
                    {assigned && (
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 16, height: 16, borderRadius: 4,
                          backgroundColor: 'rgba(96, 165, 250, 0.2)',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#60A5FA' }} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
