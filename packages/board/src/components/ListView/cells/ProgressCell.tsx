/**
 * ProgressCell - Progress bar cell for ListView
 */

import { cn } from '../../../utils';

interface ProgressCellProps {
  value: number;
  onChange?: (value: number) => void;
  isDark: boolean;
  disabled?: boolean;
}

export function ProgressCell({
  value = 0,
  onChange,
  isDark,
  disabled = false,
}: ProgressCellProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onChange) return;

    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.round((x / rect.width) * 100);
    const clampedValue = Math.max(0, Math.min(100, percentage));
    onChange(clampedValue);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        onClick={handleClick}
        className={cn(
          'flex-1 h-2 rounded-full overflow-hidden',
          isDark ? 'bg-white/10' : 'bg-gray-200',
          !disabled && onChange && 'cursor-pointer'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            value === 100 ? 'bg-green-500' : 'bg-[#3B82F6]'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn('text-xs w-8 text-right', isDark ? 'text-[#9CA3AF]' : 'text-gray-500')}>
        {value}%
      </span>
    </div>
  );
}
