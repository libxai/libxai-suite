/**
 * StatusFilter - Dropdown filter for task status in ListView
 * Allows filtering by: All, Completed, In Progress, To Do/Pending
 * Also includes "Hide Completed" toggle
 * @version 0.18.0
 */

import { useState, useRef, useEffect } from 'react';
import { Filter, Check, CheckCircle2, PlayCircle, Circle, EyeOff } from 'lucide-react';
import { cn } from '../../utils';

export type StatusFilterValue = 'all' | 'completed' | 'in-progress' | 'todo';

interface StatusFilterProps {
  value: StatusFilterValue;
  hideCompleted: boolean;
  onChange: (value: StatusFilterValue) => void;
  onHideCompletedChange: (hide: boolean) => void;
  isDark: boolean;
  locale: string;
}

const translations = {
  en: {
    filters: 'Filters',
    filterByStatus: 'FILTER BY STATUS',
    showAll: 'Show All',
    completed: 'Completed',
    inProgress: 'In Progress',
    toDo: 'To Do / Pending',
    hideCompleted: 'Hide Completed Tasks',
  },
  es: {
    filters: 'Filtros',
    filterByStatus: 'FILTRAR POR ESTADO',
    showAll: 'Mostrar Todo',
    completed: 'Completadas',
    inProgress: 'En Progreso',
    toDo: 'Por Hacer / Pendiente',
    hideCompleted: 'Ocultar Tareas Completadas',
  },
};

export function StatusFilter({
  value,
  hideCompleted,
  onChange,
  onHideCompletedChange,
  isDark,
  locale,
}: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = locale === 'es' ? translations.es : translations.en;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      (dropdownRef as any)._cleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if ((dropdownRef as any)._cleanup) {
        (dropdownRef as any)._cleanup();
      }
    };
  }, [isOpen]);

  const options: Array<{ value: StatusFilterValue; label: string; icon: React.ReactNode; color: string }> = [
    { value: 'all', label: t.showAll, icon: <div className="w-4 h-4 rounded-full border-2 border-[#3B82F6] bg-[#3B82F6]" />, color: 'text-[#3B82F6]' },
    { value: 'completed', label: t.completed, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500' },
    { value: 'in-progress', label: t.inProgress, icon: <PlayCircle className="w-4 h-4" />, color: 'text-blue-500' },
    { value: 'todo', label: t.toDo, icon: <Circle className="w-4 h-4" />, color: 'text-gray-400' },
  ];

  const hasActiveFilter = value !== 'all' || hideCompleted;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Filter Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
          isDark
            ? 'border-white/10 hover:bg-white/10 text-white'
            : 'border-gray-200 hover:bg-gray-100 text-gray-700',
          hasActiveFilter && (isDark ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]' : 'bg-blue-50 border-blue-200 text-blue-600'),
          isOpen && (isDark ? 'bg-white/10' : 'bg-gray-100')
        )}
      >
        <Filter className="w-4 h-4" />
        {t.filters}
        {hasActiveFilter && (
          <span className={cn(
            'w-2 h-2 rounded-full',
            isDark ? 'bg-[#3B82F6]' : 'bg-blue-500'
          )} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-2 w-72 rounded-lg shadow-xl border z-50',
            isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {/* Header */}
          <div className={cn(
            'px-4 py-3 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}>
            <span className={cn(
              'text-xs font-medium uppercase tracking-wider',
              isDark ? 'text-[#6B7280]' : 'text-gray-400'
            )}>
              {t.filterByStatus}
            </span>
          </div>

          {/* Options */}
          <div className="py-2">
            {options.map((option) => {
              // Don't show checkmark on status options when hideCompleted is active
              const isSelected = value === option.value && !hideCompleted;

              // Dynamic icon for "all" option - solid when selected, outline when not
              const getIcon = () => {
                if (option.value === 'all') {
                  return isSelected
                    ? <div className="w-4 h-4 rounded-full border-2 border-[#3B82F6] bg-[#3B82F6]" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-400" />;
                }
                return option.icon;
              };

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    // Selecting any status option disables hide completed
                    onHideCompletedChange(false);
                    // Close menu after selection
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                    isSelected && (isDark ? 'bg-white/5' : 'bg-gray-50')
                  )}
                >
                  <span className={cn(isSelected ? option.color : 'text-gray-400', 'flex-shrink-0')}>
                    {getIcon()}
                  </span>
                  <span className={cn(
                    'flex-1 text-left whitespace-nowrap',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-[#3B82F6]' : 'text-blue-500')} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div className={cn(
            'my-2 mx-4 h-px',
            isDark ? 'bg-white/10' : 'bg-gray-200'
          )} />

          {/* Hide Completed Toggle */}
          <div className="py-1">
            <button
              onClick={() => {
                onHideCompletedChange(!hideCompleted);
                // If enabling hide completed, reset to show all
                if (!hideCompleted) {
                  onChange('all');
                }
                // Close menu after selection
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                hideCompleted && (isDark ? 'bg-white/5' : 'bg-gray-50')
              )}
            >
              <EyeOff className={cn(
                'w-4 h-4 flex-shrink-0',
                hideCompleted
                  ? (isDark ? 'text-[#3B82F6]' : 'text-blue-500')
                  : (isDark ? 'text-[#6B7280]' : 'text-gray-400')
              )} />
              <span className={cn(
                'flex-1 text-left whitespace-nowrap',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {t.hideCompleted}
              </span>
              {hideCompleted && (
                <Check className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-[#3B82F6]' : 'text-blue-500')} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
