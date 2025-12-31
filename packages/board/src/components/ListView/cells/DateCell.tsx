/**
 * DateCell - Date picker cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils';

interface DateCellProps {
  value?: Date | string;
  onChange?: (value: Date) => void;
  isDark: boolean;
  locale: string;
  disabled?: boolean;
}

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const DAY_NAMES = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  es: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
};

export function DateCell({
  value,
  onChange,
  isDark,
  locale,
  disabled = false,
}: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = value instanceof Date ? value : new Date(value);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  const dateValue = value ? (value instanceof Date ? value : new Date(value)) : null;
  const lang = locale === 'es' ? 'es' : 'en';

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

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days: React.ReactNode[] = [];

    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = dateValue &&
        dateValue.getDate() === day &&
        dateValue.getMonth() === month &&
        dateValue.getFullYear() === year;
      const isToday =
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      days.push(
        <button
          key={day}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(date);
            setIsOpen(false);
          }}
          className={cn(
            'w-8 h-8 rounded-full text-sm transition-colors',
            isSelected
              ? 'bg-[#3B82F6] text-white'
              : isToday
                ? isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'
                : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-900'
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  if (disabled || !onChange) {
    return (
      <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
        {formatDate(dateValue)}
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
          'flex items-center gap-2 px-2 py-1 rounded transition-colors',
          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        )}
      >
        <Calendar className={cn('w-4 h-4', isDark ? 'text-[#6B7280]' : 'text-gray-400')} />
        <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
          {formatDate(dateValue)}
        </span>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 top-full left-0 mt-1 p-3 rounded-lg shadow-lg border',
            isDark ? 'bg-[#1F2937] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
              }}
              className={cn('p-1 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
            >
              <ChevronLeft className={cn('w-4 h-4', isDark ? 'text-white' : 'text-gray-600')} />
            </button>
            <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
              {MONTH_NAMES[lang][viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
              }}
              className={cn('p-1 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
            >
              <ChevronRight className={cn('w-4 h-4', isDark ? 'text-white' : 'text-gray-600')} />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES[lang].map((day) => (
              <div
                key={day}
                className={cn('w-8 h-6 text-xs flex items-center justify-center', isDark ? 'text-[#6B7280]' : 'text-gray-400')}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Quick options */}
          <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(new Date());
                setIsOpen(false);
              }}
              className={cn(
                'flex-1 py-1.5 text-xs rounded',
                isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {locale === 'es' ? 'Hoy' : 'Today'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange?.(tomorrow);
                setIsOpen(false);
              }}
              className={cn(
                'flex-1 py-1.5 text-xs rounded',
                isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {locale === 'es' ? 'Mañana' : 'Tomorrow'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
