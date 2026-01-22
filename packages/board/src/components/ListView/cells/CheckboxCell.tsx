/**
 * CheckboxCell - Checkbox/toggle cell for ListView custom fields
 * v1.4.0: Added delayed confirmation (1.5s) with cancel option
 */

import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '../../../utils';
import { useDelayedCheckbox } from '../../../hooks/useMicroInteractions';

interface CheckboxCellProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  isDark: boolean;
  disabled?: boolean;
  /** Enable delayed confirmation (1.5s) */
  enableDelayedConfirm?: boolean;
  /** Delay in ms before committing the change */
  confirmDelay?: number;
}

export function CheckboxCell({
  value = false,
  onChange,
  isDark,
  disabled = false,
  enableDelayedConfirm = true,
  confirmDelay = 1500,
}: CheckboxCellProps) {
  const {
    pendingValue,
    isPending,
    progress,
    startChange,
    cancelChange,
  } = useDelayedCheckbox(onChange, { delay: confirmDelay });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      if (enableDelayedConfirm) {
        // If already pending, clicking cancels
        if (isPending) {
          cancelChange();
        } else {
          startChange(!value);
        }
      } else {
        onChange(!value);
      }
    }
  };

  // Show the pending value while waiting, otherwise show actual value
  const displayValue = isPending ? pendingValue : value;

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        onClick={handleClick}
        disabled={disabled || !onChange}
        className={cn(
          'relative w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          displayValue
            ? 'bg-[#3B82F6] border-[#3B82F6]'
            : isDark
              ? 'border-[#4B5563] hover:border-[#6B7280]'
              : 'border-gray-300 hover:border-gray-400',
          (disabled || !onChange) && 'opacity-50 cursor-not-allowed',
          isPending && 'ring-2 ring-offset-1',
          isPending && displayValue && 'ring-green-500/50',
          isPending && !displayValue && 'ring-red-500/50',
          isPending && (isDark ? 'ring-offset-[#0F1117]' : 'ring-offset-white')
        )}
      >
        {/* Progress ring for pending state */}
        {isPending && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 20 20"
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke={displayValue ? '#22C55E' : '#EF4444'}
              strokeWidth="2"
              strokeDasharray={`${(progress / 100) * 50.26} 50.26`}
              className="transition-all duration-100"
            />
          </svg>
        )}

        {/* Icon */}
        {isPending ? (
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        ) : displayValue ? (
          <Check className="w-3 h-3 text-white" />
        ) : null}
      </button>

      {/* Cancel button when pending */}
      {isPending && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            cancelChange();
          }}
          className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center transition-colors',
            isDark
              ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400'
              : 'bg-red-100 hover:bg-red-200 text-red-500'
          )}
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
