/**
 * BulletChart - Compact visualization for financial/time metrics
 * v1.4.0: Bullet charts for comparing actual vs estimated vs quoted
 *
 * Use cases:
 * - Time tracking: Actual vs Estimated vs Quoted hours
 * - Budget: Spent vs Allocated vs Total budget
 * - Progress: Completed vs Target vs Goal
 */

import { cn } from '../../utils';

export interface BulletChartProps {
  /** Actual/current value (the bar) */
  actual: number;
  /** Target/estimated value (the marker line) */
  target: number;
  /** Maximum/quoted value (the background range) */
  maximum: number;
  /** Optional label for the chart */
  label?: string;
  /** Unit suffix (e.g., "h", "$", "%") */
  unit?: string;
  /** Height of the chart in pixels */
  height?: number;
  /** Show numeric values */
  showValues?: boolean;
  /** Theme */
  isDark?: boolean;
  /** Locale for formatting */
  locale?: string;
  /** Custom colors */
  colors?: {
    actual?: string;
    target?: string;
    maximum?: string;
    over?: string;
  };
  /** Tooltip content */
  tooltip?: {
    actual?: string;
    target?: string;
    maximum?: string;
  };
}

/**
 * Get status color based on actual vs target
 */
function getStatusColor(actual: number, target: number, maximum: number, colors?: BulletChartProps['colors']) {
  const overTarget = actual > target;
  const overMaximum = actual > maximum;

  if (overMaximum) {
    return colors?.over || '#EF4444'; // Red - over maximum
  }
  if (overTarget) {
    return colors?.actual || '#F59E0B'; // Amber - over target but within max
  }
  return colors?.actual || '#22C55E'; // Green - on track
}

export function BulletChart({
  actual,
  target,
  maximum,
  label,
  unit = '',
  height = 24,
  showValues = true,
  isDark = false,
  locale = 'en',
  colors,
  tooltip,
}: BulletChartProps) {
  // Calculate percentages (capped at 100% for display)
  const maxValue = Math.max(actual, target, maximum);
  const scale = maxValue > 0 ? 100 / maxValue : 0;

  const actualPercent = Math.min(actual * scale, 100);
  const targetPercent = Math.min(target * scale, 100);
  const maximumPercent = Math.min(maximum * scale, 100);

  const statusColor = getStatusColor(actual, target, maximum, colors);
  const isOverTarget = actual > target;
  const isOverMaximum = actual > maximum;

  // Format value for display
  const formatValue = (value: number): string => {
    if (unit === 'h') {
      // Hours - show decimal
      return `${(value / 60).toFixed(1)}${unit}`;
    }
    if (unit === '$') {
      // Currency
      return `${unit}${value.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}`;
    }
    return `${value}${unit}`;
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Label row */}
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
              {label}
            </span>
          )}
          {showValues && (
            <div className={cn('flex items-center gap-2', isDark ? 'text-[#9CA3AF]' : 'text-gray-500')}>
              <span
                className={cn(
                  'font-medium',
                  isOverMaximum && 'text-red-500',
                  isOverTarget && !isOverMaximum && 'text-amber-500',
                  !isOverTarget && 'text-green-500'
                )}
                title={tooltip?.actual}
              >
                {formatValue(actual)}
              </span>
              <span>/</span>
              <span title={tooltip?.target}>{formatValue(target)}</span>
              <span title={tooltip?.maximum}>({formatValue(maximum)})</span>
            </div>
          )}
        </div>
      )}

      {/* Chart bar */}
      <div
        className={cn(
          'relative w-full rounded-full overflow-hidden',
          isDark ? 'bg-white/10' : 'bg-gray-200'
        )}
        style={{ height }}
      >
        {/* Maximum range (lightest - full width) */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            isDark ? 'bg-white/5' : 'bg-gray-100'
          )}
          style={{ width: `${maximumPercent}%` }}
          title={tooltip?.maximum || `${locale === 'es' ? 'Máximo' : 'Maximum'}: ${formatValue(maximum)}`}
        />

        {/* Target zone (medium - up to target) */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            isDark ? 'bg-white/10' : 'bg-gray-300'
          )}
          style={{ width: `${targetPercent}%` }}
          title={tooltip?.target || `${locale === 'es' ? 'Objetivo' : 'Target'}: ${formatValue(target)}`}
        />

        {/* Actual value bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${actualPercent}%`,
            backgroundColor: statusColor,
          }}
          title={tooltip?.actual || `${locale === 'es' ? 'Actual' : 'Actual'}: ${formatValue(actual)}`}
        />

        {/* Target marker line */}
        <div
          className={cn(
            'absolute top-0 bottom-0 w-0.5',
            isDark ? 'bg-white' : 'bg-gray-700'
          )}
          style={{ left: `${targetPercent}%` }}
          title={tooltip?.target || `${locale === 'es' ? 'Objetivo' : 'Target'}: ${formatValue(target)}`}
        />
      </div>
    </div>
  );
}

/**
 * Compact inline version for table cells
 */
export interface InlineBulletChartProps {
  actual: number;
  target: number;
  maximum: number;
  unit?: string;
  isDark?: boolean;
}

export function InlineBulletChart({
  actual,
  target,
  maximum,
  unit = '',
  isDark = false,
}: InlineBulletChartProps) {
  const maxValue = Math.max(actual, target, maximum);
  const scale = maxValue > 0 ? 100 / maxValue : 0;

  const actualPercent = Math.min(actual * scale, 100);
  const targetPercent = Math.min(target * scale, 100);

  const isOverTarget = actual > target;
  const isOverMaximum = actual > maximum;

  const statusColor = isOverMaximum
    ? '#EF4444'
    : isOverTarget
      ? '#F59E0B'
      : '#22C55E';

  const formatValue = (value: number): string => {
    if (unit === 'h') {
      return `${(value / 60).toFixed(1)}h`;
    }
    return `${value}${unit}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      {/* Mini bar */}
      <div
        className={cn(
          'relative flex-1 h-2 rounded-full overflow-hidden',
          isDark ? 'bg-white/10' : 'bg-gray-200'
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${actualPercent}%`,
            backgroundColor: statusColor,
          }}
        />
        <div
          className={cn(
            'absolute top-0 bottom-0 w-0.5',
            isDark ? 'bg-white/50' : 'bg-gray-500'
          )}
          style={{ left: `${targetPercent}%` }}
        />
      </div>

      {/* Value */}
      <span
        className={cn(
          'text-xs font-medium whitespace-nowrap',
          isOverMaximum && 'text-red-500',
          isOverTarget && !isOverMaximum && 'text-amber-500',
          !isOverTarget && (isDark ? 'text-green-400' : 'text-green-600')
        )}
      >
        {formatValue(actual)}
      </span>
    </div>
  );
}

/**
 * Financial tooltip content generator
 */
export interface FinancialTooltipData {
  label: string;
  quoted: number;
  estimated: number;
  actual: number;
  unit: string;
  locale?: string;
}

export function generateFinancialTooltip(data: FinancialTooltipData): string {
  const { label, quoted, estimated, actual, unit, locale = 'en' } = data;

  const formatValue = (value: number): string => {
    if (unit === 'h') {
      return `${(value / 60).toFixed(1)}h`;
    }
    if (unit === '$') {
      return `$${value.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}`;
    }
    return `${value}${unit}`;
  };

  const variance = actual - estimated;
  const variancePercent = estimated > 0 ? Math.round((variance / estimated) * 100) : 0;
  const isOver = variance > 0;

  const lines = [
    label,
    '─'.repeat(20),
    `${locale === 'es' ? 'Ofertado' : 'Quoted'}: ${formatValue(quoted)}`,
    `${locale === 'es' ? 'Estimado' : 'Estimated'}: ${formatValue(estimated)}`,
    `${locale === 'es' ? 'Real' : 'Actual'}: ${formatValue(actual)}`,
    '─'.repeat(20),
    `${locale === 'es' ? 'Variación' : 'Variance'}: ${isOver ? '+' : ''}${formatValue(variance)} (${isOver ? '+' : ''}${variancePercent}%)`,
  ];

  return lines.join('\n');
}
