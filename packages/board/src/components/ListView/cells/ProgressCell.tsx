/**
 * ProgressCell - Progress bar cell for ListView
 * v1.4.0: Added micro-interactions (slot machine animation, flash on save)
 */

import { cn } from '../../../utils';
import { useSaveFlash, useSlotMachine } from '../../../hooks/useMicroInteractions';

interface ProgressCellProps {
  value: number;
  onChange?: (value: number) => void;
  isDark: boolean;
  disabled?: boolean;
  /** Enable slot machine animation on value change */
  enableSlotMachine?: boolean;
  /** Enable flash green on save */
  enableSaveFlash?: boolean;
}

export function ProgressCell({
  value = 0,
  onChange,
  isDark,
  disabled = false,
  enableSlotMachine = true,
  enableSaveFlash = true,
}: ProgressCellProps) {
  // Micro-interactions
  const { isFlashing, triggerFlash } = useSaveFlash();
  const { displayValue, isAnimating } = useSlotMachine(value, {
    enabled: enableSlotMachine,
    duration: 300,
    steps: 6,
  });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onChange) return;

    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.round((x / rect.width) * 100);
    const clampedValue = Math.max(0, Math.min(100, percentage));

    if (clampedValue !== value) {
      onChange(clampedValue);
      // Trigger flash after save
      if (enableSaveFlash) {
        triggerFlash();
      }
    }
  };

  // Use animated display value for the percentage
  const displayPercent = displayValue ?? value;

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full rounded px-1 py-0.5 transition-all duration-300",
        // Flash animation
        isFlashing && (isDark ? 'bg-green-500/30' : 'bg-green-500/20')
      )}
    >
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
            displayPercent === 100 ? 'bg-green-500' : 'bg-[#3B82F6]',
            isAnimating && 'transition-none'
          )}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      <span
        className={cn(
          'text-xs w-8 text-right tabular-nums transition-all',
          isDark ? 'text-[#9CA3AF]' : 'text-gray-500',
          // Slot machine animation emphasis
          isAnimating && 'font-medium scale-105'
        )}
      >
        {displayPercent}%
      </span>
    </div>
  );
}
