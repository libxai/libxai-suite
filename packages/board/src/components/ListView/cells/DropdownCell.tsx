/**
 * DropdownCell - Dropdown/select cell for ListView custom fields
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../utils';

interface DropdownCellProps {
  value?: string;
  options: string[];
  onChange?: (value: string) => void;
  isDark: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function DropdownCell({
  value,
  options = [],
  onChange,
  isDark,
  placeholder = '-',
  disabled = false,
}: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (disabled || !onChange) {
    return (
      <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
        {value || placeholder}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded transition-colors min-w-[80px]',
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        )}
      >
        <span className={cn(
          'text-sm flex-1 text-left truncate',
          isDark ? 'text-[#94A3B8]' : 'text-gray-500',
          !value && (isDark ? 'text-[#6B7280]' : 'text-gray-400')
        )}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 py-1 rounded-lg shadow-lg border min-w-[120px] max-h-48 overflow-y-auto',
            isDark ? 'bg-[#1F2937] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {options.length === 0 ? (
            <p className={cn('px-3 py-2 text-sm', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
              No options
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                  value === option && (isDark ? 'bg-white/5' : 'bg-gray-50')
                )}
              >
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  {option}
                </span>
                {value === option && (
                  <Check className="w-4 h-4 text-[#3B82F6]" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
