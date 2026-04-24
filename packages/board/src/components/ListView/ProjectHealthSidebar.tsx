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
  lens?: 'hours' | 'financial';
  onUnassignedTaskClick?: (taskId: string) => void;
}

function fmtMinutes(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

export function ProjectHealthSidebar({
  data,
  isDark,
  locale = 'en',
  onClose,
  lens = 'hours',
  onUnassignedTaskClick,
}: ProjectHealthSidebarProps) {
  const isEs = locale === 'es';
  const isFinancial = lens === 'financial';

  return (
    <div className={cn(
      'w-[260px] xl:w-[320px] flex-shrink-0 overflow-y-auto border-l',
      isDark ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'
    )}>
      {/* Header */}
      <div className={cn('px-5 py-4 border-b flex items-center justify-between', isDark ? 'border-[#222]' : 'border-gray-200')}>
        <h3 className={cn(
          'text-[11px] font-mono uppercase tracking-wider font-bold',
          isDark ? 'text-white/60' : 'text-gray-600'
        )}>
          {isFinancial
            ? (isEs ? 'SALUD FINANCIERA' : 'FINANCIAL HEALTH')
            : (isEs ? 'SALUD DEL PROYECTO' : 'PROJECT HEALTH')}
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

      {/* Section: Financial Health — shown when lens='financial' and financial data available */}
      {isFinancial && (data.totalOffered !== undefined || data.totalEstimated !== undefined) && (() => {
        const offered = data.totalOffered ?? 0;
        const estimated = data.totalEstimated ?? 0;
        const executed = data.totalExecuted ?? 0;
        // v2.8.0: Disponible = Contrato − Ejecutado (what the user intuitively
        // expects). Previous version subtracted Estimado, which made the value
        // misleading when estimates were filled out partially or not at all
        // (a project with 0 estimates would show "Disp = full contract" even
        // after spending half the budget).
        const margin = offered - executed;
        const marginPct = offered > 0 ? Math.round((margin / offered) * 100) : 0;
        const consumedPct = offered > 0 ? Math.min(Math.round((executed / offered) * 100), 120) : 0;
        const isOverBudget = executed > offered && offered > 0;
        const barColor = isOverBudget ? '#F87171' : '#00E5CC';

        return (
          <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
            <h4 className={cn('text-[11px] font-mono uppercase tracking-wider font-semibold mb-3', isDark ? 'text-white/60' : 'text-gray-600')}>
              {isEs ? 'PRESUPUESTO' : 'BUDGET'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'V. Oferta' : 'Offered Value'}
                </span>
                <span className={cn('text-[11px] font-mono font-bold', isDark ? 'text-white/80' : 'text-gray-800')}>
                  {fmtCurrency(offered)}
                </span>
              </div>
              {(() => {
                // v2.6.0 — Estimado breakdown tooltip when equipment or travel > 0
                const estLabor = data.totalEstimatedLabor ?? 0;
                const estEq = data.totalEstimatedEquipment ?? 0;
                const estTr = data.totalEstimatedTravel ?? 0;
                const showEstBreakdown = estEq > 0 || estTr > 0;
                const estTooltip = showEstBreakdown
                  ? (isEs
                      ? `Desglose del estimado:\n· Mano de obra: ${fmtCurrency(estLabor)}\n· Activos: ${fmtCurrency(estEq)}\n· Viáticos: ${fmtCurrency(estTr)}\n───\nTotal: ${fmtCurrency(estimated)}`
                      : `Estimated breakdown:\n· Labor: ${fmtCurrency(estLabor)}\n· Equipment: ${fmtCurrency(estEq)}\n· Travel: ${fmtCurrency(estTr)}\n───\nTotal: ${fmtCurrency(estimated)}`)
                  : undefined;
                return (
                  <div className={cn('flex items-center justify-between', showEstBreakdown && 'cursor-help')} title={estTooltip}>
                    <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                      {isEs ? 'Estimado' : 'Estimated'}
                      {showEstBreakdown && <span className="ml-1 opacity-50">ⓘ</span>}
                    </span>
                    <span className={cn('text-[11px] font-mono font-bold', isDark ? 'text-white/80' : 'text-gray-800')}>
                      {fmtCurrency(estimated)}
                    </span>
                  </div>
                );
              })()}
              {executed > 0 && (() => {
                // v2.6.0 — Ejecutado breakdown tooltip when equipment or travel > 0
                const exLabor = data.totalExecutedLabor ?? 0;
                const exEq = data.totalExecutedEquipment ?? 0;
                const exTr = data.totalExecutedTravel ?? 0;
                const showExBreakdown = exEq > 0 || exTr > 0;
                const exTooltip = showExBreakdown
                  ? (isEs
                      ? `Desglose del ejecutado:\n· Mano de obra: ${fmtCurrency(exLabor)}\n· Activos: ${fmtCurrency(exEq)}\n· Viáticos: ${fmtCurrency(exTr)}\n───\nTotal: ${fmtCurrency(executed)}`
                      : `Executed breakdown:\n· Labor: ${fmtCurrency(exLabor)}\n· Equipment: ${fmtCurrency(exEq)}\n· Travel: ${fmtCurrency(exTr)}\n───\nTotal: ${fmtCurrency(executed)}`)
                  : undefined;
                return (
                  <div className={cn('flex items-center justify-between', showExBreakdown && 'cursor-help')} title={exTooltip}>
                    <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                      {isEs ? 'Ejecutado' : 'Executed'}
                      {showExBreakdown && <span className="ml-1 opacity-50">ⓘ</span>}
                    </span>
                    <span className={cn('text-[11px] font-mono font-bold', isOverBudget ? 'text-[#F87171]' : isDark ? 'text-white/80' : 'text-gray-800')}>
                      {fmtCurrency(executed)}
                    </span>
                  </div>
                );
              })()}
              {/* Progress bar: offered as 100%, estimated as fill */}
              {offered > 0 && (
                <div className={cn('w-full h-2.5 rounded-full overflow-hidden mt-2', isDark ? 'bg-white/[0.06]' : 'bg-gray-200')}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(consumedPct, 100)}%`, backgroundColor: barColor }}
                  />
                </div>
              )}
              {/* Margin display */}
              <div className={cn(
                'mt-2 px-3 py-2 rounded-lg text-center font-mono text-sm font-bold',
                margin >= 0
                  ? (isDark ? 'bg-[#00E5CC]/10 text-[#00E5CC]' : 'bg-emerald-50 text-emerald-600')
                  : (isDark ? 'bg-[#F87171]/10 text-[#F87171]' : 'bg-red-50 text-red-600')
              )}>
                {margin >= 0
                  ? `+${fmtCurrency(margin)} ${isEs ? 'Disp.' : 'Avail.'}`
                  : `${fmtCurrency(Math.abs(margin))} ${isEs ? 'Pérdida' : 'Loss'}`}
                {offered > 0 && (
                  <span className="text-[10px] ml-1 opacity-60">({marginPct}%)</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Section: Project Hours — always shown when totalHours provided
          v2.7.0 — red saturation fix: "alarm blindness" prevention.
          - Bar + text stay red ONLY when spent exceeds allocated by >10%.
          - 0-10% overrun is shown neutral/amber — the gauge colour speaks by itself.
          - Never paint the "Spent" value in red alone (the bar communicates it). */}
      {(data.totalHoursSpentMinutes !== undefined || data.totalHoursAllocatedMinutes !== undefined) && (() => {
        const spent = data.totalHoursSpentMinutes ?? 0;
        const allocated = data.totalHoursAllocatedMinutes ?? 0;
        const pct = allocated > 0 ? Math.min(Math.round((spent / allocated) * 100), 100) : 0;
        const overRatio = allocated > 0 ? spent / allocated : 0;
        const isSignificantlyOver = overRatio > 1.10;
        const barColor = isSignificantlyOver ? '#F87171' : pct >= 90 ? '#FFD60A' : '#3BF06E';
        return (
          <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
            <h4 className={cn('text-[11px] font-mono uppercase tracking-wider font-semibold mb-3', isDark ? 'text-white/60' : 'text-gray-600')}>
              {isEs ? 'HORAS DEL PROYECTO' : 'PROJECT HOURS'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-gray-600')}>
                  {isEs ? 'Usado' : 'Spent'}
                </span>
                <span className={cn('text-[11px] font-mono font-bold', isDark ? 'text-white/80' : 'text-gray-800')}>
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
            'text-[11px] font-mono uppercase tracking-wider font-semibold mb-3',
            isDark ? 'text-white/60' : 'text-gray-600'
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
                    ? 'bg-[#F87171]/15 text-[#F87171]'
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

      {/* Section: Unassigned Tasks Alert — only shown when count > 0 */}
      {data.unassignedCount != null && data.unassignedCount > 0 && (
        <div className={cn('px-5 py-4 border-b', isDark ? 'border-[#222]' : 'border-gray-200')}>
          <h4 className={cn(
            'text-[11px] font-mono uppercase tracking-wider font-semibold mb-3',
            isDark ? 'text-white/60' : 'text-gray-600'
          )}>
            {isEs ? 'TAREAS SIN ASIGNAR' : 'UNASSIGNED TASKS'}
          </h4>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg font-mono text-lg font-bold',
              data.unassignedCount >= 10
                ? 'bg-[#F87171]/15 text-[#F87171]'
                : 'bg-[#FFD60A]/15 text-[#FFD60A]'
            )}>
              {data.unassignedCount}
            </div>
            <div>
              <p className={cn('text-xs font-medium', isDark ? 'text-white/80' : 'text-gray-700')}>
                {data.unassignedCount === 1
                  ? (isEs ? 'tarea pendiente' : 'pending task')
                  : (isEs ? 'tareas pendientes' : 'pending tasks')
                }
              </p>
              <p className={cn('text-[10px]', isDark ? 'text-white/40' : 'text-gray-400')}>
                {isEs ? 'sin recurso asignado' : 'without assigned resource'}
              </p>
            </div>
          </div>
          {/* Task list — scrollable when > 5 items, clickable to navigate */}
          {data.unassignedTasks && data.unassignedTasks.length > 0 && (
            <div className={cn(
              'space-y-1.5 overflow-y-auto scrollbar-slim',
              data.unassignedTasks.length > 5 ? 'max-h-[170px]' : ''
            )}>
              {data.unassignedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onUnassignedTaskClick?.(task.id)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] w-full text-left transition-colors',
                    isDark
                      ? 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    onUnassignedTaskClick && 'cursor-pointer'
                  )}
                >
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    (data.unassignedCount ?? 0) >= 10 ? 'bg-[#F87171]' : 'bg-[#FFD60A]'
                  )} />
                  <span className="truncate">{task.name}</span>
                </button>
              ))}
            </div>
          )}
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
              isBehind && 'bg-[#F87171]/15 text-[#F87171]',
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
            'text-[11px] font-mono uppercase tracking-wider font-semibold mb-3',
            isDark ? 'text-white/60' : 'text-gray-600'
          )}>
            {isEs ? 'DISPONIBILIDAD DEL EQUIPO' : 'TEAM AVAILABILITY'}
          </h4>

          <div className="space-y-3">
            {data.teams.map((team, i) => {
              const barColor = team.utilizationPercent >= 100
                ? '#F87171'
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
