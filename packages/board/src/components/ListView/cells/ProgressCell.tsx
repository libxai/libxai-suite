/**
 * ProgressCell - Progress bar cell for ListView
 * v1.4.0: Added micro-interactions (slot machine animation, flash on save)
 * v2.5.0: Added inline numeric editing — click on percentage to type value
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Micro-interactions
  const { isFlashing, triggerFlash } = useSaveFlash();
  const { displayValue, isAnimating } = useSlotMachine(value, {
    enabled: enableSlotMachine,
    duration: 300,
    steps: 6,
  });

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onChange) return;

    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.round((x / rect.width) * 100);
    const clampedValue = Math.max(0, Math.min(100, percentage));

    if (clampedValue !== value) {
      onChange(clampedValue);
      if (enableSaveFlash) {
        triggerFlash();
      }
    }
  };

  const handlePercentClick = useCallback((e: React.MouseEvent) => {
    if (disabled || !onChange) return;
    e.stopPropagation();
    setEditValue(String(value));
    setIsEditing(true);
  }, [disabled, onChange, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && onChange) {
      const clamped = Math.max(0, Math.min(100, num));
      if (clamped !== value) {
        onChange(clamped);
        if (enableSaveFlash) triggerFlash();
      }
    }
  }, [editValue, onChange, value, enableSaveFlash, triggerFlash]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setIsEditing(false);
  }, [commitEdit]);

  // Use animated display value for the percentage
  const displayPercent = displayValue ?? value;

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full rounded px-1 py-0.5 transition-[background-color] duration-300",
        // Flash animation
        isFlashing && (isDark ? 'bg-[#3BF06E]/30' : 'bg-[#3BF06E]/20')
      )}
    >
      <div
        onClick={handleBarClick}
        className={cn(
          'flex-1 h-2 rounded-full overflow-hidden',
          isDark ? 'bg-white/[0.05]' : 'bg-gray-200',
          !disabled && onChange && 'cursor-pointer'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            displayPercent === 100 ? 'bg-[#3BF06E]' : 'bg-[#3B9EFF]',
            isAnimating && 'transition-none'
          )}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      {isEditing ? (
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            maxLength={3}
            className={cn(
              'w-8 text-xs text-right tabular-nums font-mono rounded border px-1 py-0 outline-none',
              isDark
                ? 'bg-white/10 border-white/20 text-white focus:border-blue-400'
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
            )}
          />
          <span className={cn('text-xs font-mono', isDark ? 'text-white/40' : 'text-gray-400')}>%</span>
        </div>
      ) : (
        <span
          onClick={handlePercentClick}
          className={cn(
            'text-xs w-8 text-right tabular-nums font-mono rounded px-1',
            isDark ? 'text-white/60' : 'text-gray-500',
            !disabled && onChange && 'cursor-pointer hover:bg-white/[0.08]',
            // Slot machine animation emphasis
            isAnimating && 'font-medium scale-105'
          )}
          title={!disabled && onChange ? 'Click to edit' : undefined}
        >
          {displayPercent}%
        </span>
      )}
    </div>
  );
}
