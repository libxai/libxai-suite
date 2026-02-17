/**
 * HoursBarCell - Visual hours bar with spent/allocated + Log button
 * Chronos V2.0 Interactive Time Manager
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../../utils';
import type { Task } from '../../Gantt/types';

interface HoursBarCellProps {
  task: Task;
  isDark: boolean;
  locale?: string;
  onOpenTimeLog?: (task: Task) => void;
}

export function HoursBarCell({
  task,
  isDark,
  locale = 'en',
  onOpenTimeLog,
}: HoursBarCellProps) {
  const isEs = locale === 'es';
  const [isHovered, setIsHovered] = useState(false);

  const spentMinutes = task.timeLoggedMinutes || 0;
  const allocatedMinutes = task.effortMinutes || 0;
  const spentHours = Math.round((spentMinutes / 60) * 10) / 10;
  const allocatedHours = Math.round((allocatedMinutes / 60) * 10) / 10;

  const percentage = allocatedMinutes > 0 ? (spentMinutes / allocatedMinutes) * 100 : 0;
  const overHours = percentage > 100 ? Math.round(((spentMinutes - allocatedMinutes) / 60) * 10) / 10 : 0;

  // Bar color based on percentage
  const barColor = percentage > 100
    ? '#FF453A'  // neonRed - over budget
    : percentage >= 80
      ? '#FFD60A'  // neonAmber - approaching limit
      : '#007BFF'; // accent blue - healthy

  if (allocatedMinutes === 0 && spentMinutes === 0) {
    return (
      <div
        className="flex items-center gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className={cn('text-[11px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
          —
        </span>
        {isHovered && onOpenTimeLog && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenTimeLog(task); }}
            className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-[#007BFF]/15 text-[#007BFF] hover:bg-[#007BFF]/25 transition-colors"
          >
            {isEs ? 'Reg' : 'Log'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top line: hours info */}
      <div className="flex items-center gap-1.5">
        <span className={cn('text-[11px] font-mono', isDark ? 'text-white/60' : 'text-gray-600')}>
          {spentHours}h
          <span className={isDark ? 'text-white/20' : 'text-gray-300'}> / </span>
          {allocatedHours}h
        </span>
        {overHours > 0 && (
          <span className="text-[9px] font-mono text-[#FF453A]">
            +{overHours}h {isEs ? 'Exceso' : 'Over'}
          </span>
        )}
        {isHovered && onOpenTimeLog && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenTimeLog(task); }}
            className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-[#007BFF]/15 text-[#007BFF] hover:bg-[#007BFF]/25 transition-colors flex items-center gap-0.5"
          >
            <Plus className="w-2.5 h-2.5" />
            {isEs ? 'Reg' : 'Log'}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className={cn('w-full h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
