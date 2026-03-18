/**
 * ScheduleVarianceCell - Schedule dates + variance badge for Chronos V2.0
 * Shows: "Oct 24 vs Oct 30" + badge (-4d Delay / +2d Early / On Track)
 */

import { cn } from '../../../utils';

interface ScheduleVarianceCellProps {
  startDate?: Date;
  endDate?: Date;
  scheduleVariance?: number; // days: negative = delay, positive = ahead
  isDark: boolean;
  locale?: string;
  /** Whether the task has any time allocated (estimated or quoted hours) */
  hasTimeAllocated?: boolean;
}

export function ScheduleVarianceCell({
  startDate,
  endDate,
  scheduleVariance,
  isDark,
  locale = 'en',
  hasTimeAllocated = true,
}: ScheduleVarianceCellProps) {
  if (!startDate && !endDate) {
    return (
      <span className={cn('text-[11px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
        -
      </span>
    );
  }

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getVarianceBadge = () => {
    if (scheduleVariance === undefined || scheduleVariance === null) return null;

    const isEs = locale === 'es';

    if (scheduleVariance === 0) {
      // If no hours allocated, show "Tiempo no asignado" instead of "En Tiempo"
      if (!hasTimeAllocated) {
        return (
          <span className="font-mono" style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8', fontWeight: 500 }}>
            {isEs ? 'Tiempo no asignado' : 'No time allocated'}
          </span>
        );
      }
      return (
        <span className="font-mono" style={{ fontSize: '10px', color: '#3B9EFF', fontWeight: 600 }}>
          {isEs ? 'En Tiempo' : 'On Track'}
        </span>
      );
    }

    if (scheduleVariance > 0) {
      return (
        <span className="font-mono" style={{ fontSize: '10px', color: '#3BF06E', fontWeight: 600 }}>
          +{scheduleVariance}d {isEs ? 'Adelante' : 'Early'}
        </span>
      );
    }

    return (
      <span className="font-mono" style={{ fontSize: '10px', color: '#FF2D20', fontWeight: 600 }}>
        {scheduleVariance}d {isEs ? 'Atraso' : 'Delay'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span className={cn('text-[11px] font-mono', isDark ? 'text-white/60' : 'text-gray-500')}>
        {startDate ? formatShortDate(startDate) : '—'}
        <span className={isDark ? 'text-white/20 mx-1' : 'text-gray-300 mx-1'}>vs</span>
        {endDate ? formatShortDate(endDate) : '—'}
      </span>
      {getVarianceBadge()}
    </div>
  );
}
