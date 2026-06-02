/**
 * DateRangePicker - Enhanced date picker with quick options
 * Matches the style from TaskDetailModal
 * Can be used for single date or date range selection
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils';

export interface DateRangePickerProps {
  /** Start date value */
  startDate?: Date | string | null;
  /** End date value (optional - for range mode) */
  endDate?: Date | string | null;
  /** Called when dates change */
  onChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  /** Single date mode - only select one date */
  singleDateMode?: boolean;
  /** Which date to select in single mode: 'start' | 'end' */
  singleDateField?: 'start' | 'end';
  isDark: boolean;
  locale: string;
  disabled?: boolean;
  /** Placeholder text when no date selected */
  placeholder?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  singleDateMode = false,
  singleDateField = 'end',
  isDark,
  locale,
  disabled = false,
  placeholder,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingField, setSelectingField] = useState<'start' | 'end'>(singleDateField);
  const [viewMonth, setViewMonth] = useState(() => {
    const dateToUse = singleDateField === 'start' ? startDate : endDate;
    if (dateToUse) {
      const d = dateToUse instanceof Date ? dateToUse : new Date(dateToUse);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // v1.8.1 — anchor-based fixed positioning for the popup. Without this,
  // the dropdown was a child of the table cell and got clipped (or pushed
  // off-screen) when the cell sat near the right or bottom edge of the
  // viewport. Now we portal it to <body> and place it relative to the
  // trigger's bounding rect, flipping above/right when there's no room.
  const [pos, setPos] = useState<{ top: number; left: number; flipUp: boolean } | null>(null);

  const startDateValue = startDate ? (startDate instanceof Date ? startDate : new Date(startDate)) : null;
  const endDateValue = endDate ? (endDate instanceof Date ? endDate : new Date(endDate)) : null;

  // Close on outside click — must consider the portaled popup since it
  // lives outside `ref`'s subtree.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Compute popup position when open. Re-runs on scroll/resize so the popup
  // tracks the trigger if the user scrolls the table while it's open.
  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // The popup is a 2-pane layout (sidebar + calendar). Width ~520px
      // covers the typical layout; height ~360px (six week-rows + header).
      const POPUP_WIDTH = 520;
      const POPUP_HEIGHT = 360;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < POPUP_HEIGHT && rect.top > spaceBelow;
      const top = flipUp ? rect.top - 4 : rect.bottom + 4;
      // Clamp horizontally so the popup never escapes the viewport.
      const left = Math.min(
        Math.max(rect.left, 8),
        window.innerWidth - POPUP_WIDTH - 8,
      );
      setPos({ top, left, flipUp });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isOpen]);

  // Reset selecting field when opening
  useEffect(() => {
    if (isOpen) {
      setSelectingField(singleDateMode ? singleDateField : 'start');
    }
  }, [isOpen, singleDateMode, singleDateField]);

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder || '-';
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Generate calendar days
  const getCalendarDays = useCallback(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewMonth]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (singleDateMode) {
      if (singleDateField === 'start') {
        onChange(date, endDateValue || undefined);
      } else {
        onChange(startDateValue || undefined, date);
      }
      setIsOpen(false);
    } else {
      if (selectingField === 'start') {
        const newEndDate = endDateValue && date > endDateValue ? date : endDateValue;
        onChange(date, newEndDate || undefined);
        setSelectingField('end');
      } else {
        const newStartDate = startDateValue && date < startDateValue ? date : startDateValue;
        onChange(newStartDate || undefined, date);
        setIsOpen(false);
      }
    }
  };

  // Quick date options
  const getQuickOptions = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
    const nextWeekend = new Date(today);
    nextWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7) + 7);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    const fourWeeks = new Date(today);
    fourWeeks.setDate(today.getDate() + 28);

    return [
      {
        label: locale === 'es' ? 'Hoy' : 'Today',
        date: today,
        display: today.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.',
      },
      {
        label: locale === 'es' ? 'Mañana' : 'Tomorrow',
        date: tomorrow,
        display: tomorrow.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.',
      },
      {
        label: locale === 'es' ? 'Este fin de semana' : 'This weekend',
        date: nextSaturday,
        display: locale === 'es' ? 'sáb.' : 'sat.',
      },
      {
        label: locale === 'es' ? 'Próxima semana' : 'Next week',
        date: nextMonday,
        display: locale === 'es' ? 'lun.' : 'mon.',
      },
      {
        label: locale === 'es' ? 'Próximo fin de semana' : 'Next weekend',
        date: nextWeekend,
        display: nextWeekend.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
      },
      {
        label: locale === 'es' ? '2 semanas' : '2 weeks',
        date: twoWeeks,
        display: twoWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
      },
      {
        label: locale === 'es' ? '4 semanas' : '4 weeks',
        date: fourWeeks,
        display: fourWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }),
      },
    ];
  };

  // Read-only mode
  if (disabled) {
    const displayDate = singleDateMode
      ? (singleDateField === 'start' ? startDateValue : endDateValue)
      : endDateValue;
    return (
      <div className="flex items-center gap-2">
        <Calendar className={cn('w-4 h-4', isDark ? 'text-white/30' : 'text-gray-400')} />
        <span className={cn('text-sm', isDark ? 'text-white/60' : 'text-gray-500')}>
          {formatDate(displayDate)}
        </span>
      </div>
    );
  }

  const displayDate = singleDateMode
    ? (singleDateField === 'start' ? startDateValue : endDateValue)
    : endDateValue;

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          // Reset view month to selected date
          const dateToShow = singleDateField === 'start' ? startDateValue : endDateValue;
          if (dateToShow) {
            setViewMonth(new Date(dateToShow.getFullYear(), dateToShow.getMonth(), 1));
          }
        }}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded transition-colors',
          isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
        )}
      >
        <Calendar className={cn('w-4 h-4', isDark ? 'text-white/30' : 'text-gray-400')} />
        <span className={cn('text-sm', isDark ? 'text-white/60' : 'text-gray-500')}>
          {formatDate(displayDate)}
        </span>
      </button>

      {/* Dropdown — portaled to <body> with anchor-based positioning so it
          escapes the table's overflow clipping and flips when near edges. */}
      {isOpen && pos && createPortal(
        <div
          ref={popupRef}
          className={cn(
            'rounded-xl shadow-2xl overflow-hidden flex',
            isDark ? 'bg-[#1A1A1A] border border-[#222]' : 'bg-white border border-gray-200'
          )}
          style={{
            position: 'fixed',
            top: pos.flipUp ? undefined : pos.top,
            bottom: pos.flipUp ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            zIndex: 10001,
          }}
          onClick={(e) => e.stopPropagation()}
        >
            {/* Quick Options - Left Side */}
            <div className={cn('w-44 py-2 border-r', isDark ? 'border-[#222]' : 'border-gray-200')}>
              {getQuickOptions().map((option, i) => (
                <button
                  key={i}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    isDark ? 'hover:bg-white/[0.05] text-white' : 'hover:bg-gray-50 text-gray-900'
                  )}
                  onClick={() => handleDateSelect(option.date)}
                >
                  <span>{option.label}</span>
                  <span className={cn('text-xs', isDark ? 'text-white/30' : 'text-gray-400')}>
                    {option.display}
                  </span>
                </button>
              ))}

              {/* Clear date button */}
              <div className={cn('border-t mt-2 pt-2', isDark ? 'border-[#222]' : 'border-gray-200')}>
                <button
                  onClick={() => {
                    if (singleDateMode) {
                      if (singleDateField === 'start') {
                        onChange(undefined, endDateValue || undefined);
                      } else {
                        onChange(startDateValue || undefined, undefined);
                      }
                    } else {
                      onChange(undefined, undefined);
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    isDark ? 'hover:bg-white/[0.05] text-red-400' : 'hover:bg-gray-50 text-red-500'
                  )}
                >
                  <span>{locale === 'es' ? 'Quitar fecha' : 'Clear date'}</span>
                  <X className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </div>

            {/* Calendar - Right Side */}
            <div className="p-4">
              {/* Selection indicator (only in range mode) */}
              {!singleDateMode && (
                <div className={cn('text-xs mb-3 px-2 py-1 rounded', isDark ? 'bg-white/[0.03] text-white/60' : 'bg-gray-100 text-gray-600')}>
                  {selectingField === 'start'
                    ? (locale === 'es' ? '📅 Selecciona fecha de inicio' : '📅 Select start date')
                    : (locale === 'es' ? '📅 Selecciona fecha de fin' : '📅 Select end date')}
                </div>
              )}

              {/* Month Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                  {viewMonth.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMonth(new Date())}
                    className={cn(
                      'p-1 rounded text-sm transition-colors',
                      isDark ? 'hover:bg-white/[0.05] text-white' : 'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    {locale === 'es' ? 'Hoy' : 'Today'}
                  </button>
                  <button
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
                    className={cn('p-1 rounded', isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100')}
                  >
                    <ChevronLeft className={cn('w-4 h-4', isDark ? 'text-white' : 'text-gray-600')} />
                  </button>
                  <button
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
                    className={cn('p-1 rounded', isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100')}
                  >
                    <ChevronRight className={cn('w-4 h-4', isDark ? 'text-white' : 'text-gray-600')} />
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {(locale === 'es'
                  ? ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
                  : ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
                ).map((day) => (
                  <div
                    key={day}
                    className={cn('w-8 h-8 flex items-center justify-center text-xs', isDark ? 'text-white/30' : 'text-gray-400')}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((d, i) => {
                  const isToday = d.date.toDateString() === new Date().toDateString();
                  const isStartDate = startDateValue?.toDateString() === d.date.toDateString();
                  const isEndDate = endDateValue?.toDateString() === d.date.toDateString();
                  const isSelected = isStartDate || isEndDate;
                  const isInRange = !singleDateMode && startDateValue && endDateValue &&
                    d.date >= startDateValue && d.date <= endDateValue;

                  return (
                    <button
                      key={i}
                      onClick={() => handleDateSelect(new Date(d.date))}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors',
                        !d.isCurrentMonth && (isDark ? 'text-white/20' : 'text-gray-300'),
                        d.isCurrentMonth && (isDark ? 'text-white' : 'text-gray-900'),
                        isToday && 'ring-2 ring-[#00E5CC]',
                        isStartDate && 'bg-[#00E5CC] text-white',
                        isEndDate && !isStartDate && 'bg-[#7C3AED] text-white',
                        isInRange && !isSelected && (isDark ? 'bg-[#7C3AED]/20' : 'bg-purple-100'),
                        !isSelected && (isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100')
                      )}
                    >
                      {d.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
