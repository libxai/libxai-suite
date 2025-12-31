/**
 * CheckboxCell - Checkbox/toggle cell for ListView custom fields
 */

import { Check } from 'lucide-react';
import { cn } from '../../../utils';

interface CheckboxCellProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  isDark: boolean;
  disabled?: boolean;
}

export function CheckboxCell({
  value = false,
  onChange,
  isDark,
  disabled = false,
}: CheckboxCellProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!value);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !onChange}
      className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
        value
          ? 'bg-[#3B82F6] border-[#3B82F6]'
          : isDark
            ? 'border-[#4B5563] hover:border-[#6B7280]'
            : 'border-gray-300 hover:border-gray-400',
        (disabled || !onChange) && 'opacity-50 cursor-not-allowed'
      )}
    >
      {value && <Check className="w-3 h-3 text-white" />}
    </button>
  );
}
