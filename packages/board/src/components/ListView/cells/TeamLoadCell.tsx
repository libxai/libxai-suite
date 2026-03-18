/**
 * TeamLoadCell - Fusión de Asignados + Carga Equipo
 * Chronos V2.0 → V3.0
 *
 * Leaf tasks: Avatar 28px + name + load badge (green/cyan/amber/red)
 * Parent tasks: Stacked avatars (max 3 + "+N") of unique assignees from children
 * Unassigned: Person icon + "Sin asignar" / "Unassigned"
 */

import { User } from 'lucide-react';
import { cn } from '../../../utils';
import type { Task } from '../../Gantt/types';

interface TeamLoadCellProps {
  task: Task;
  isDark: boolean;
  locale?: string;
}

// Collect unique assignees from all descendants
function collectUniqueAssignees(task: Task): Array<{ name: string; avatar?: string; initials?: string; color?: string }> {
  const map = new Map<string, { name: string; avatar?: string; initials?: string; color?: string }>();

  function walk(t: Task) {
    if (t.assignees) {
      for (const a of t.assignees) {
        if (a.name && !map.has(a.name)) {
          map.set(a.name, a);
        }
      }
    }
    if (t.subtasks) {
      for (const sub of t.subtasks) walk(sub);
    }
  }

  walk(task);
  return Array.from(map.values());
}

// Badge color by load percentage (spec: 4 tiers)
function getLoadBadgeStyle(pct: number): { bg: string; text: string } {
  if (pct > 100) return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' };     // red — overloaded
  if (pct >= 86) return { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' };    // amber — near limit
  if (pct >= 61) return { bg: 'rgba(0,229,204,0.15)', text: '#00E5CC' };     // cyan — healthy busy
  return { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' };                    // green — normal
}

function Avatar({ assignee, size = 28, isDark }: {
  assignee: { name: string; avatar?: string; initials?: string; color?: string };
  size?: number;
  isDark: boolean;
}) {
  const sizeClass = size === 28 ? 'w-7 h-7' : size === 24 ? 'w-6 h-6' : 'w-5 h-5';
  const fontSize = size === 28 ? 'text-[10px]' : 'text-[9px]';

  if (assignee.avatar) {
    return (
      <img
        src={assignee.avatar}
        alt={assignee.name}
        className={cn(sizeClass, "rounded-full object-cover ring-1 flex-shrink-0", isDark ? "ring-white/10" : "ring-gray-200")}
      />
    );
  }

  return (
    <div
      className={cn(sizeClass, "rounded-full flex items-center justify-center font-bold text-white ring-1 flex-shrink-0", fontSize, isDark ? "ring-white/10" : "ring-gray-200")}
      style={{ backgroundColor: assignee.color || '#6B7280' }}
    >
      {assignee.initials || assignee.name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export function TeamLoadCell({
  task,
  isDark,
  locale = 'en',
}: TeamLoadCellProps) {
  const isEs = locale === 'es';
  const isParent = !!(task as any).hasChildren;
  const assignee = task.assignees?.[0];
  const teamLoad = task.teamLoad;

  // ── Parent task: stacked avatars of unique descendants ──
  if (isParent) {
    const uniqueAssignees = collectUniqueAssignees(task);
    if (uniqueAssignees.length === 0) return null; // empty cell per spec

    const visible = uniqueAssignees.slice(0, 3);
    const overflow = uniqueAssignees.length - 3;

    return (
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((a, i) => (
            <Avatar key={a.name + i} assignee={a} size={24} isDark={isDark} />
          ))}
        </div>
        {overflow > 0 && (
          <span
            className={cn(
              'ml-1 text-[10px] font-mono',
              isDark ? 'text-white/40' : 'text-gray-400'
            )}
            title={uniqueAssignees.slice(3).map(a => a.name).join(', ')}
          >
            +{overflow}
          </span>
        )}
      </div>
    );
  }

  // ── Leaf task: no assignee ──
  if (!assignee) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            isDark ? 'bg-white/5' : 'bg-gray-100'
          )}
        >
          <User className="w-3.5 h-3.5" style={{ color: '#4B5563' }} />
        </div>
        <span className={cn('text-[11px]', isDark ? 'text-white/30' : 'text-gray-400')}>
          {isEs ? 'Sin asignar' : 'Unassigned'}
        </span>
      </div>
    );
  }

  // ── Leaf task: assigned ──
  const loadPercent = teamLoad?.percentage ?? 0;
  const hasLoad = !!teamLoad && loadPercent > 0;
  const badgeStyle = hasLoad ? getLoadBadgeStyle(loadPercent) : null;

  return (
    <div className="flex flex-col gap-1">
      {/* Row 1: Avatar + Name */}
      <div className="flex items-center gap-2">
        <Avatar assignee={assignee} size={28} isDark={isDark} />
        <span
          className={cn('text-[13px] truncate', isDark ? 'text-white' : 'text-gray-900')}
          style={{ maxWidth: '100px' }}
        >
          {assignee.name}
        </span>
      </div>

      {/* Row 2: Load badge — only if teamLoad data exists */}
      {hasLoad && badgeStyle && (
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide w-fit font-semibold"
          style={{
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.text,
          }}
        >
          {loadPercent}% LOAD
        </span>
      )}
    </div>
  );
}
