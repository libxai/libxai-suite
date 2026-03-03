/**
 * ProjectHealthSidebar - Right panel for project health metrics
 * Chronos V2.0 Interactive Time Manager
 */

import { cn } from '../../utils';
import type { ProjectHealthData } from './types';

interface ProjectHealthSidebarProps {
  data: ProjectHealthData;
  isDark: boolean;
  locale?: string;
  onClose?: () => void;
}

function fmtMinutes(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ProjectHealthSidebar({
  data,
  isDark,
  locale = 'en',
  onClose,
}: ProjectHealthSidebarProps) {
  const isEs = locale === 'es';

  return (
    <div className={cn(
      'w-[220px] xl:w-[280px] flex-shrink-0 overflow-y-auto border-l',
      isDark ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'
    )}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b flex items-center justify-between', isDark ? 'border-[#222]' : 'border-gray-200')}>
        <h3 className={cn(
          'text-[10px] font-mono uppercase tracking-wider font-bold',
          isDark ? 'text-white/40' : 'text-gray-500'
        )}>
          {isEs ? 'SALUD DEL PROYECTO' : 'PROJECT HEALTH'}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'p-1 rounded transition-colors',
              isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            )}
            title={isEs ? 'Cerrar panel' : 'Close panel'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Section: Project Hours — always shown when totalHours provided */}
      {(data.totalHoursSpentMinutes !== undefined || data.totalHoursAllocatedMinutes !== undefined) && (() => {
        const spent = data.totalHoursSpentMinutes ?? 0;
        const allocated = data.totalHoursAllocatedMinutes ?? 0;
        const pct = allocated > 0 ? Math.min(Math.round((spent / allocated) * 100), 100) : 0;
        const isOver = spent > allocated && allocated > 0;
        const barColor = isOver ? '#FF2D20' : pct >= 80 ? '#FFD60A' : '#3BF06E';
        return (
          <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
            <h4 className={cn('text-[10px] font-mono uppercase tracking-wider mb-3', isDark ? 'text-white/40' : 'text-gray-500')}>
              {isEs ? 'HORAS DEL PROYECTO' : 'PROJECT HOURS'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'Usado' : 'Spent'}
                </span>
                <span className={cn('text-[11px] font-mono font-bold', isOver ? 'text-[#FF2D20]' : isDark ? 'text-white/80' : 'text-gray-800')}>
                  {fmtMinutes(spent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'Asignado' : 'Allocated'}
                </span>
                <span className={cn('text-[11px] font-mono', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {fmtMinutes(allocated)}
                </span>
              </div>
              {allocated > 0 && (
                <div className={cn('w-full h-1.5 rounded-full overflow-hidden mt-1', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Section: Technical Health — hidden when openRFIs/submittals not provided */}
      {(data.openRFIs !== undefined || data.submittalsApprovalPercent !== undefined) && (
        <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
          <h4 className={cn(
            'text-[10px] font-mono uppercase tracking-wider mb-3',
            isDark ? 'text-white/40' : 'text-gray-500'
          )}>
            {isEs ? 'SALUD TÉCNICA' : 'TECHNICAL HEALTH'}
          </h4>

          <div className="space-y-3">
            {data.openRFIs !== undefined && (
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'RFIs Abiertos' : 'Open RFIs'}
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-mono font-bold',
                  data.openRFIs > 0
                    ? 'bg-[#FF2D20]/15 text-[#FF2D20]'
                    : 'bg-[#3BF06E]/15 text-[#3BF06E]'
                )}>
                  {data.openRFIs}
                </span>
              </div>
            )}
            {data.submittalsApprovalPercent !== undefined && (
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'Aprobación Submittals' : 'Submittals Approval'}
                </span>
                <span className={cn(
                  'text-[11px] font-mono font-bold',
                  data.submittalsApprovalPercent >= 80 ? 'text-[#3BF06E]' : 'text-[#FFD60A]'
                )}>
                  {data.submittalsApprovalPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Schedule Variance — hidden when not provided */}
      {data.scheduleVarianceDays !== undefined && (
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
        <h4 className={cn(
          'text-[10px] font-mono uppercase tracking-wider mb-3',
          isDark ? 'text-white/40' : 'text-gray-500'
        )}>
          {isEs ? 'VARIACIÓN DE CRONOGRAMA' : 'SCHEDULE VARIANCE'}
        </h4>

        {(() => {
          const days = data.scheduleVarianceDays ?? 0;
          const isAhead = days > 0;
          const isBehind = days < 0;
          const label = data.scheduleVarianceLabel || (
            isAhead
              ? `+${days} ${isEs ? 'Días ADELANTE' : 'Days AHEAD'}`
              : isBehind
                ? `${days} ${isEs ? 'Días ATRÁS' : 'Days BEHIND'}`
                : (isEs ? 'EN TIEMPO' : 'ON TRACK')
          );

          return (
            <div className={cn(
              'px-3 py-2 rounded-lg text-center font-mono text-sm font-bold',
              isAhead && 'bg-[#3BF06E]/15 text-[#3BF06E]',
              isBehind && 'bg-[#FF2D20]/15 text-[#FF2D20]',
              !isAhead && !isBehind && 'bg-[#3B9EFF]/15 text-[#3B9EFF]'
            )}>
              {label}
            </div>
          );
        })()}
      </div>
      )}

      {/* Section: Team Availability */}
      {data.teams && data.teams.length > 0 && (
        <div className="px-5 py-4">
          <h4 className={cn(
            'text-[10px] font-mono uppercase tracking-wider mb-3',
            isDark ? 'text-white/40' : 'text-gray-500'
          )}>
            {isEs ? 'DISPONIBILIDAD DEL EQUIPO' : 'TEAM AVAILABILITY'}
          </h4>

          <div className="space-y-3">
            {data.teams.map((team, i) => {
              const barColor = team.utilizationPercent >= 100
                ? '#FF2D20'
                : team.utilizationPercent >= 80
                  ? '#FFD60A'
                  : team.color || '#3BF06E';

              return (
                <div key={`${team.name}-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                      {team.name}
                    </span>
                    <span className={cn('text-[10px] font-mono', isDark ? 'text-white/40' : 'text-gray-500')}>
                      {team.utilizationPercent}%
                    </span>
                  </div>
                  <div className={cn('w-full h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(team.utilizationPercent, 100)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
