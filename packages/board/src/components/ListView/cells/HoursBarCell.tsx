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

  // Bar color based on percentage — Chronos design: green healthy, red over
  const barColor = percentage > 100
    ? '#FF453A'  // neonRed - over budget
    : percentage >= 80
      ? '#FFD60A'  // neonAmber - approaching limit
      : '#32D74B'; // green - healthy

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
      className="flex items-center gap-2 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chronos: Bordered card container for hours + bar */}
      <div
        className="flex flex-col gap-1.5 flex-1 min-w-0"
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
          backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
        }}
      >
        {/* Hours text line */}
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: isDark ? '#FFFFFF' : '#111827',
            }}
          >
            {spentHours}h
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF',
            }}
          >
            / {allocatedHours}h
          </span>
          {overHours > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                color: '#FF453A',
              }}
            >
              +{overHours}h {isEs ? 'Exceso' : 'Over'}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full overflow-hidden"
          style={{
            height: '3px',
            backgroundColor: isDark ? '#333' : '#E5E7EB',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
              borderRadius: '2px',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* + Log button (always visible, matching Chronos design) */}
      {onOpenTimeLog && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenTimeLog(task); }}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-colors"
          style={{
            border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
            backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
            color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
          }}
        >
          <Plus className="w-3 h-3" />
          Log
        </button>
      )}
    </div>
  );
}
