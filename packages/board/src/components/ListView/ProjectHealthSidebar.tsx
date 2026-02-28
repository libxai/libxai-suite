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
}

export function ProjectHealthSidebar({
  data,
  isDark,
  locale = 'en',
}: ProjectHealthSidebarProps) {
  const isEs = locale === 'es';

  return (
    <div className={cn(
      'w-[220px] xl:w-[280px] flex-shrink-0 overflow-y-auto border-l',
      isDark ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'
    )}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
        <h3 className={cn(
          'text-[10px] font-mono uppercase tracking-wider font-bold',
          isDark ? 'text-white/40' : 'text-gray-500'
        )}>
          {isEs ? 'SALUD DEL PROYECTO' : 'PROJECT HEALTH'}
        </h3>
      </div>

      {/* Section: Technical Health */}
      <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
        <h4 className={cn(
          'text-[10px] font-mono uppercase tracking-wider mb-3',
          isDark ? 'text-white/40' : 'text-gray-500'
        )}>
          {isEs ? 'SALUD TÉCNICA' : 'TECHNICAL HEALTH'}
        </h4>

        <div className="space-y-3">
          {/* Open RFIs */}
          <div className="flex items-center justify-between">
            <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
              {isEs ? 'RFIs Abiertos' : 'Open RFIs'}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-[11px] font-mono font-bold',
              (data.openRFIs ?? 0) > 0
                ? 'bg-[#FF453A]/15 text-[#FF453A]'
                : 'bg-[#32D74B]/15 text-[#32D74B]'
            )}>
              {data.openRFIs ?? 0}
            </span>
          </div>

          {/* Submittals Approval */}
          <div className="flex items-center justify-between">
            <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
              {isEs ? 'Aprobación Submittals' : 'Submittals Approval'}
            </span>
            <span className={cn(
              'text-[11px] font-mono font-bold',
              (data.submittalsApprovalPercent ?? 0) >= 80 ? 'text-[#32D74B]' : 'text-[#FFD60A]'
            )}>
              {data.submittalsApprovalPercent ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Section: Schedule Variance */}
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
              isAhead && 'bg-[#32D74B]/15 text-[#32D74B]',
              isBehind && 'bg-[#FF453A]/15 text-[#FF453A]',
              !isAhead && !isBehind && 'bg-[#007BFF]/15 text-[#007BFF]'
            )}>
              {label}
            </div>
          );
        })()}
      </div>

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
                ? '#FF453A'
                : team.utilizationPercent >= 80
                  ? '#FFD60A'
                  : team.color || '#32D74B';

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
