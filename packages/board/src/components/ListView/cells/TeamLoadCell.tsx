/**
 * TeamLoadCell - Avatar + team name + load percentage badge
 * Chronos V2.0 Interactive Time Manager
 */

import { cn } from '../../../utils';
import type { Task } from '../../Gantt/types';

interface TeamLoadCellProps {
  task: Task;
  isDark: boolean;
}

export function TeamLoadCell({
  task,
  isDark,
}: TeamLoadCellProps) {
  const assignee = task.assignees?.[0];
  const teamLoad = task.teamLoad;

  if (!assignee && !teamLoad) {
    return (
      <span className={cn('text-[11px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
        —
      </span>
    );
  }

  const loadPercent = teamLoad?.percentage ?? 0;
  const loadLabel = teamLoad?.label || assignee?.name || '—';

  // Badge color by utilization
  const badgeColor = loadPercent >= 100
    ? 'bg-[#FF453A]/15 text-[#FF453A]'   // over-utilized
    : loadPercent >= 80
      ? 'bg-[#FFD60A]/15 text-[#FFD60A]'  // heavy
      : 'bg-[#32D74B]/15 text-[#32D74B]'; // healthy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Row 1: Avatar + Name */}
      <div className="flex items-center gap-2">
        {assignee && (
          assignee.avatar ? (
            <img
              src={assignee.avatar}
              alt={assignee.name}
              className={cn("w-5 h-5 rounded-full object-cover ring-1", isDark ? "ring-white/10" : "ring-gray-200")}
            />
          ) : (
            <div
              className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1", isDark ? "ring-white/10" : "ring-gray-200")}
              style={{ backgroundColor: assignee.color || '#6B7280' }}
            >
              {assignee.initials || assignee.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )
        )}
        <span className={cn(
          'text-[11px] truncate',
          isDark ? 'text-white/60' : 'text-gray-600'
        )}>
          {loadLabel}
        </span>
      </div>

      {/* Row 2: Load badge */}
      {teamLoad && (
        <span className={cn(
          'px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide w-fit',
          badgeColor
        )}>
          {loadPercent}% LOAD
        </span>
      )}
    </div>
  );
}
