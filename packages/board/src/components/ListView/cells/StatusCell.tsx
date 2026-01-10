/**
 * StatusCell - Status dropdown cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, PlayCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils';

interface StatusCellProps {
  value: string;
  onChange?: (value: string) => void;
  isDark: boolean;
  locale: string;
  translations: {
    todo: string;
    inProgress: string;
    completed: string;
  };
  disabled?: boolean;
}

// Only 3 options shown in dropdown
const STATUS_OPTIONS = [
  { value: 'todo', icon: Circle, color: 'text-gray-400' },
  { value: 'in-progress', icon: PlayCircle, color: 'text-blue-500' },
  { value: 'completed', icon: CheckCircle2, color: 'text-green-500' },
];

// Normalize status value to handle different formats
function normalizeStatus(status: string): string {
  const lower = status?.toLowerCase() || 'todo';
  if (lower === 'inprogress' || lower === 'in-progress' || lower === 'in_progress') {
    return 'in-progress';
  }
  if (lower === 'completed' || lower === 'done' || lower === 'complete') {
    return 'completed';
  }
  return 'todo';
}

export function StatusCell({
  value,
  onChange,
  isDark,
  translations,
  disabled = false,
}: StatusCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  // Normalize the incoming value
  const normalizedValue = normalizeStatus(value);
  const defaultStatus = STATUS_OPTIONS[0]!;
  const currentStatus = STATUS_OPTIONS.find(s => s.value === normalizedValue) ?? defaultStatus;
  const Icon = currentStatus.icon;

  const getLabel = (statusValue: string) => {
    const normalized = normalizeStatus(statusValue);
    switch (normalized) {
      case 'completed': return translations.completed;
      case 'in-progress': return translations.inProgress;
      default: return translations.todo;
    }
  };

  if (disabled || !onChange) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4 flex-shrink-0', currentStatus.color)} />
        <span className={cn('text-sm whitespace-nowrap', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
          {getLabel(value)}
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
        <Icon className={cn('w-4 h-4 flex-shrink-0', currentStatus.color)} />
        <span className={cn('text-sm whitespace-nowrap', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
          {getLabel(value)}
        </span>
        <ChevronDown className={cn('w-3 h-3', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 py-1 rounded-lg shadow-lg border min-w-[140px]',
            isDark ? 'bg-[#1F2937] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {STATUS_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            return (
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
                  normalizedValue === option.value && (isDark ? 'bg-white/5' : 'bg-gray-50')
                )}
              >
                <OptionIcon className={cn('w-4 h-4', option.color)} />
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  {getLabel(option.value)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
