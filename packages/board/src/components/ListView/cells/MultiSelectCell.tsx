/**
 * MultiSelectCell - Multi-option cell for ListView custom fields
 *
 * Same shape as DropdownCell, with three differences that matter:
 *
 *   1. the menu STAYS OPEN when picking, because picking several options one
 *      at a time with the menu closing after each is unusable;
 *   2. `value` is an array, and `onChange` always receives a NEW array — never
 *      the same reference mutated, which React would not see;
 *   3. an optional `maxSelectable`: once reached, the unpicked options are
 *      disabled rather than hidden, so the limit is visible instead of the
 *      list mysteriously shrinking.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../utils';

interface MultiSelectCellProps {
  value?: string[];
  options: string[];
  onChange?: (value: string[]) => void;
  isDark: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Optional cap on how many options can be picked. */
  maxSelectable?: number;
  /** How many chips to show before collapsing into "+N". */
  maxVisible?: number;
}

export function MultiSelectCell({
  value = [],
  options = [],
  onChange,
  isDark,
  placeholder = '-',
  disabled = false,
  maxSelectable,
  maxVisible = 2,
}: MultiSelectCellProps) {
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

  const visible = value.slice(0, maxVisible);
  const hidden = value.length - visible.length;

  const label = value.length === 0
    ? placeholder
    : visible.join(', ') + (hidden > 0 ? ` +${hidden}` : '');

  if (disabled || !onChange) {
    return (
      <span className={cn('text-sm truncate', isDark ? 'text-white/60' : 'text-gray-500')}>
        {label}
      </span>
    );
  }

  const toggle = (option: string) => {
    const picked = value.includes(option);
    /*
     * A NEW array every time. Mutating and passing the same reference is the
     * classic way to make a parent's `useMemo`/`memo` skip the update, and the
     * cell would look stuck while the data underneath had already changed.
     */
    const next = picked
      ? value.filter(v => v !== option)
      : [...value, option];

    /* The cap only blocks ADDING; removing is always allowed. */
    if (!picked && maxSelectable != null && value.length >= maxSelectable) return;

    onChange(next);
  };

  const capReached = maxSelectable != null && value.length >= maxSelectable;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded transition-colors min-w-[80px]',
          isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
        )}
      >
        <span className={cn(
          'text-sm flex-1 text-left truncate',
          isDark ? 'text-white/60' : 'text-gray-500',
          value.length === 0 && (isDark ? 'text-white/30' : 'text-gray-400')
        )}>
          {label}
        </span>
        <ChevronDown className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-white/30' : 'text-gray-400')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 py-1 rounded-lg shadow-lg border min-w-[140px] max-h-48 overflow-y-auto',
            isDark ? 'bg-[#1A1A1A] border-[#222]' : 'bg-white border-gray-200'
          )}
        >
          {options.length === 0 ? (
            <p className={cn('px-3 py-2 text-sm', isDark ? 'text-white/30' : 'text-gray-400')}>
              No options
            </p>
          ) : (
            options.map((option) => {
              const picked = value.includes(option);
              /* Disabled, not hidden: a list that silently shrinks is worse. */
              const blocked = !picked && capReached;
              return (
                <button
                  key={option}
                  disabled={blocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option);
                    /* The menu STAYS OPEN: picking several is the whole point. */
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors',
                    blocked
                      ? 'opacity-40 cursor-not-allowed'
                      : (isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'),
                    picked && (isDark ? 'bg-white/[0.03]' : 'bg-gray-50')
                  )}
                >
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {option}
                  </span>
                  {picked && <Check className="w-4 h-4 text-[#00E5CC]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
