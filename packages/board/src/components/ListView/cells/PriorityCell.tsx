/**
 * PriorityCell - Priority selector cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { Flag, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils';

interface PriorityCellProps {
  value?: string;
  onChange?: (value: string) => void;
  isDark: boolean;
  locale: string;
  disabled?: boolean;
}

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: { en: 'Urgent', es: 'Urgente' }, color: 'text-red-500', bg: 'bg-red-500' },
  { value: 'high', label: { en: 'High', es: 'Alta' }, color: 'text-orange-500', bg: 'bg-orange-500' },
  { value: 'medium', label: { en: 'Medium', es: 'Media' }, color: 'text-yellow-500', bg: 'bg-yellow-500' },
  { value: 'low', label: { en: 'Low', es: 'Baja' }, color: 'text-blue-500', bg: 'bg-blue-500' },
  { value: 'none', label: { en: 'None', es: 'Ninguna' }, color: 'text-gray-400', bg: 'bg-gray-400' },
];

export function PriorityCell({
  value = 'none',
  onChange,
  isDark,
  locale,
  disabled = false,
}: PriorityCellProps) {
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

  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === value) ?? PRIORITY_OPTIONS[4]!;
  const lang = locale === 'es' ? 'es' : 'en';

  if (disabled || !onChange) {
    return (
      <div className="flex items-center gap-2">
        <Flag className={cn('w-4 h-4', currentPriority.color)} />
        <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
          {currentPriority.label[lang]}
        </span>
      </div>
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
          'flex items-center gap-2 px-2 py-1 rounded transition-colors',
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        )}
      >
        <Flag className={cn('w-4 h-4', currentPriority.color)} />
        <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
          {currentPriority.label[lang]}
        </span>
        <ChevronDown className={cn('w-3 h-3', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 py-1 rounded-lg shadow-lg border min-w-[120px]',
            isDark ? 'bg-[#1F2937] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                value === option.value && (isDark ? 'bg-white/5' : 'bg-gray-50')
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', option.bg)} />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>
                {option.label[lang]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
