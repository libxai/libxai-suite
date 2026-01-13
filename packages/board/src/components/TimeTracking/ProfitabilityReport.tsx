/**
 * ProfitabilityReport - Displays profitability analysis
 * v1.2.0: Compare sold effort vs actual time logged
 *
 * Features:
 * - Summary metrics (total variance, profitable vs loss tasks)
 * - Task-level breakdown with status indicators
 * - Visual profitability indicators
 * - Filter by project
 */

import { useMemo } from 'react';
import { cn } from '../../utils';
import type {
  TaskProfitability,
  ProfitabilitySummary,
  ProfitabilityReport as ProfitabilityReportData,
} from '../../types';

export interface ProfitabilityReportProps {
  /** Report data */
  report: ProfitabilityReportData | null;
  /** Loading state */
  isLoading?: boolean;
  /** Locale for i18n */
  locale?: 'en' | 'es';
  /** Theme: 'dark' | 'light' */
  theme?: 'dark' | 'light';
  /** Additional class names */
  className?: string;
  /** Callback when task is clicked */
  onTaskClick?: (taskId: string) => void;
}

/**
 * Format minutes as human readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds}s`;
  }

  const roundedMinutes = Math.round(minutes);

  if (roundedMinutes < 60) {
    return `${roundedMinutes}m`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get status color class
 */
function getStatusColor(status: TaskProfitability['status'], isDark: boolean): string {
  switch (status) {
    case 'profitable':
      return isDark ? 'text-green-400' : 'text-green-600';
    case 'at-cost':
      return isDark ? 'text-blue-400' : 'text-blue-600';
    case 'loss':
      return isDark ? 'text-red-400' : 'text-red-600';
    case 'no-estimate':
      return isDark ? 'text-gray-500' : 'text-gray-400';
  }
}

/**
 * Get status background color class
 */
function getStatusBgColor(status: TaskProfitability['status'], isDark: boolean): string {
  switch (status) {
    case 'profitable':
      return isDark
        ? 'bg-green-900/30 border-green-700/50'
        : 'bg-green-50 border-green-200';
    case 'at-cost':
      return isDark
        ? 'bg-blue-900/30 border-blue-700/50'
        : 'bg-blue-50 border-blue-200';
    case 'loss':
      return isDark
        ? 'bg-red-900/30 border-red-700/50'
        : 'bg-red-50 border-red-200';
    case 'no-estimate':
      return isDark
        ? 'bg-gray-800/50 border-gray-700'
        : 'bg-gray-50 border-gray-200';
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: TaskProfitability['status'], locale: 'en' | 'es'): string {
  if (locale === 'es') {
    switch (status) {
      case 'profitable':
        return 'Rentable';
      case 'at-cost':
        return 'En costo';
      case 'loss':
        return 'Pérdida';
      case 'no-estimate':
        return 'Sin oferta';
    }
  }

  switch (status) {
    case 'profitable':
      return 'Profitable';
    case 'at-cost':
      return 'At Cost';
    case 'loss':
      return 'Loss';
    case 'no-estimate':
      return 'No Estimate';
  }
}

/**
 * Summary metrics card
 */
function SummaryCard({
  summary,
  locale,
  isDark,
}: {
  summary: ProfitabilitySummary;
  locale: 'en' | 'es';
  isDark: boolean;
}) {
  const isProfit = summary.totalVarianceMinutes > 0;
  const varianceColor = isProfit
    ? isDark
      ? 'text-green-400'
      : 'text-green-600'
    : summary.totalVarianceMinutes < 0
    ? isDark
      ? 'text-red-400'
      : 'text-red-600'
    : isDark
    ? 'text-gray-400'
    : 'text-gray-600';

  const cardBg = isDark ? 'bg-[#1A1D25]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textMuted = isDark ? 'text-[#9CA3AF]' : 'text-gray-500';
  const textPrimary = isDark ? 'text-[#E5E7EB]' : 'text-gray-900';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Variance */}
      <div className={cn('p-4 rounded-lg border', cardBg, borderColor)}>
        <div className={cn('text-sm font-medium mb-1', textMuted)}>
          {locale === 'es' ? 'Variación Total' : 'Total Variance'}
        </div>
        <div className={cn('text-2xl font-bold', varianceColor)}>
          {isProfit ? '+' : ''}
          {formatDuration(Math.abs(summary.totalVarianceMinutes))}
        </div>
        <div className={cn('text-xs mt-1', textMuted)}>
          {summary.avgVariancePercent > 0 ? '+' : ''}
          {summary.avgVariancePercent}%
        </div>
      </div>

      {/* Task Breakdown */}
      <div className={cn('p-4 rounded-lg border', cardBg, borderColor)}>
        <div className={cn('text-sm font-medium mb-2', textMuted)}>
          {locale === 'es' ? 'Distribución' : 'Distribution'}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? 'text-green-400' : 'text-green-600'}>
              {locale === 'es' ? 'Rentables' : 'Profitable'}
            </span>
            <span className={cn('font-medium', textPrimary)}>{summary.profitableTasksCount}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
              {locale === 'es' ? 'En costo' : 'At Cost'}
            </span>
            <span className={cn('font-medium', textPrimary)}>{summary.atCostTasksCount}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-red-400' : 'text-red-600'}>
              {locale === 'es' ? 'Pérdidas' : 'Loss'}
            </span>
            <span className={cn('font-medium', textPrimary)}>{summary.lossTasksCount}</span>
          </div>
        </div>
      </div>

      {/* Time Summary */}
      <div className={cn('p-4 rounded-lg border', cardBg, borderColor)}>
        <div className={cn('text-sm font-medium mb-2', textMuted)}>
          {locale === 'es' ? 'Tiempos' : 'Time Summary'}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className={textMuted}>
              {locale === 'es' ? 'Ofertado' : 'Sold'}
            </span>
            <span className={cn('font-medium', textPrimary)}>
              {formatDuration(summary.totalSoldMinutes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={textMuted}>
              {locale === 'es' ? 'Trabajado' : 'Logged'}
            </span>
            <span className={cn('font-medium', textPrimary)}>
              {formatDuration(summary.totalLoggedMinutes)}
            </span>
          </div>
          <div className={cn('flex justify-between pt-1 border-t', borderColor)}>
            <span className={textMuted}>
              {locale === 'es' ? 'Tareas' : 'Tasks'}
            </span>
            <span className={cn('font-medium', textPrimary)}>
              {summary.totalTasksWithEstimate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Task row component
 */
function TaskRow({
  task,
  locale,
  isDark,
  onClick,
}: {
  task: TaskProfitability;
  locale: 'en' | 'es';
  isDark: boolean;
  onClick?: (taskId: string) => void;
}) {
  const varianceSign = task.varianceMinutes !== null && task.varianceMinutes > 0 ? '+' : '';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textPrimary = isDark ? 'text-[#E5E7EB]' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#9CA3AF]' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  return (
    <tr
      className={cn('border-b', borderColor, onClick && cn('cursor-pointer', hoverBg))}
      onClick={() => onClick?.(task.taskId)}
    >
      <td className="px-4 py-3">
        <div className={cn('font-medium', textPrimary)}>{task.taskName}</div>
        {task.projectName && (
          <div className={cn('text-xs mt-1', textMuted)}>{task.projectName}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {task.soldEffortMinutes ? formatDuration(task.soldEffortMinutes) : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-center">{formatDuration(task.loggedMinutes)}</td>
      <td className="px-4 py-3 text-sm text-center">
        {task.varianceMinutes !== null ? (
          <span
            className={cn(
              'font-medium',
              task.varianceMinutes > 0
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : task.varianceMinutes < 0
                ? isDark
                  ? 'text-red-400'
                  : 'text-red-600'
                : textMuted
            )}
          >
            {varianceSign}
            {formatDuration(Math.abs(task.varianceMinutes))}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {task.variancePercent !== null ? (
          <span
            className={cn(
              'font-medium',
              task.variancePercent > 0
                ? isDark
                  ? 'text-green-400'
                  : 'text-green-600'
                : task.variancePercent < 0
                ? isDark
                  ? 'text-red-400'
                  : 'text-red-600'
                : textMuted
            )}
          >
            {varianceSign}
            {Math.abs(task.variancePercent)}%
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            getStatusBgColor(task.status, isDark),
            getStatusColor(task.status, isDark)
          )}
        >
          {getStatusLabel(task.status, locale)}
        </span>
      </td>
    </tr>
  );
}

export function ProfitabilityReport({
  report,
  isLoading = false,
  locale = 'en',
  theme = 'light',
  className,
  onTaskClick,
}: ProfitabilityReportProps) {
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#0F1117]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#1A1D25]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textPrimary = isDark ? 'text-[#E5E7EB]' : 'text-gray-900';
  const textMuted = isDark ? 'text-[#9CA3AF]' : 'text-gray-500';
  const tableHeaderBg = isDark ? 'bg-[#0F1117]/50' : 'bg-gray-50';

  // Sort tasks by variance (most profitable first)
  const sortedTasks = useMemo(() => {
    if (!report) return [];
    return [...report.tasks].sort((a, b) => {
      if (a.varianceMinutes === null) return 1;
      if (b.varianceMinutes === null) return -1;
      return b.varianceMinutes - a.varianceMinutes;
    });
  }, [report]);

  if (isLoading) {
    return (
      <div className={cn('p-8 text-center', textMuted, className)}>
        {locale === 'es' ? 'Cargando reporte...' : 'Loading report...'}
      </div>
    );
  }

  if (!report || report.tasks.length === 0) {
    return (
      <div className={cn('p-8 text-center', textMuted, className)}>
        {locale === 'es'
          ? 'No hay datos de rentabilidad disponibles'
          : 'No profitability data available'}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6 p-6', bgColor, className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', textPrimary)}>
            {locale === 'es' ? 'Reporte de Rentabilidad' : 'Profitability Report'}
          </h2>
          <p className={cn('text-sm mt-1', textMuted)}>
            {locale === 'es'
              ? 'Análisis de tiempo ofertado vs tiempo trabajado'
              : 'Analysis of sold effort vs actual time logged'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCard summary={report.summary} locale={locale} isDark={isDark} />

      {/* Tasks Table */}
      <div className={cn('rounded-lg border overflow-hidden', cardBg, borderColor)}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/5">
            <thead className={tableHeaderBg}>
              <tr>
                <th className={cn('px-4 py-3 text-left text-xs font-medium uppercase tracking-wider', textMuted)}>
                  {locale === 'es' ? 'Tarea' : 'Task'}
                </th>
                <th className={cn('px-4 py-3 text-center text-xs font-medium uppercase tracking-wider', textMuted)}>
                  {locale === 'es' ? 'Ofertado' : 'Sold'}
                </th>
                <th className={cn('px-4 py-3 text-center text-xs font-medium uppercase tracking-wider', textMuted)}>
                  {locale === 'es' ? 'Trabajado' : 'Logged'}
                </th>
                <th className={cn('px-4 py-3 text-center text-xs font-medium uppercase tracking-wider', textMuted)}>
                  {locale === 'es' ? 'Variación' : 'Variance'}
                </th>
                <th className={cn('px-4 py-3 text-center text-xs font-medium uppercase tracking-wider', textMuted)}>
                  %
                </th>
                <th className={cn('px-4 py-3 text-center text-xs font-medium uppercase tracking-wider', textMuted)}>
                  {locale === 'es' ? 'Estado' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className={cn('divide-y', borderColor)}>
              {sortedTasks.map((task) => (
                <TaskRow
                  key={task.taskId}
                  task={task}
                  locale={locale}
                  isDark={isDark}
                  onClick={onTaskClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <div className={cn('text-xs text-center', textMuted)}>
        {locale === 'es' ? (
          <>
            Rentable: variación &gt; +5% | En costo: ±5% | Pérdida: variación &lt; -5%
          </>
        ) : (
          <>
            Profitable: variance &gt; +5% | At cost: ±5% | Loss: variance &lt; -5%
          </>
        )}
      </div>
    </div>
  );
}

export default ProfitabilityReport;
