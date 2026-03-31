/**
 * TimeCell - Displays time in human-readable format (hours/minutes)
 * v0.18.3: Added for time tracking columns (estimatedTime, elapsedTime)
 * v1.4.0: Added micro-interactions (flash on save)
 *
 * Input: time in minutes (number)
 * Output: formatted string like "2h 30m" or "45m"
 */

import { useState, useRef, useEffect } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { cn } from '../../../utils';
import { useSaveFlash } from '../../../hooks/useMicroInteractions';

interface TimeCellProps {
  /** Time value in minutes */
  value?: number | null;
  /** Called when value changes (in minutes) - enables inline editing */
  onChange?: (value: number | null) => void;
  isDark: boolean;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Enable flash green on save */
  enableSaveFlash?: boolean;
  /**
   * Governance v2.0: Blur the value for unauthorized users
   * When true, shows a blurred placeholder instead of the actual value
   */
  isBlurred?: boolean;
  /** Display mode: 'hours' shows Xh Ym, 'financial' shows $X (minutes/60 × hourlyRate) */
  lens?: 'hours' | 'financial';
  /** Rate used to convert hours → dollars when lens='financial' */
  hourlyRate?: number;
}

/**
 * Format minutes to human-readable time string
 * @param minutes - Time in minutes
 * @param locale - Locale for formatting ('en' or 'es')
 * @returns Formatted string like "2h 30m" (compact format for both locales)
 */
function formatTime(minutes: number | null | undefined, _locale: string = 'en'): string {
  // Handle null, undefined, 0, empty string, or falsy values
  if (minutes === null || minutes === undefined || minutes === 0 || !minutes || Number(minutes) === 0) {
    return '-';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  // Use compact format for both locales to fit in cells
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Parse time string to minutes
 * Supports formats: "2h 30m", "2h30m", "2.5h", "150m", "150", "2:30"
 */
function parseTimeToMinutes(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || trimmed === '-') {
    return null;
  }

  // Try hours:minutes format (2:30)
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/);
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const hours = parseInt(colonMatch[1], 10);
    const mins = parseInt(colonMatch[2], 10);
    return hours * 60 + mins;
  }

  // Try hours and minutes format (2h 30m, 2h30m, 2h 30min)
  const hmMatch = trimmed.match(/^(\d+\.?\d*)\s*h\s*(\d+)?\s*(m|min)?$/);
  if (hmMatch && hmMatch[1]) {
    const hours = parseFloat(hmMatch[1]);
    const mins = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
    return Math.round(hours * 60) + mins;
  }

  // Try hours only format (2h, 2.5h)
  const hMatch = trimmed.match(/^(\d+\.?\d*)\s*h$/);
  if (hMatch && hMatch[1]) {
    return Math.round(parseFloat(hMatch[1]) * 60);
  }

  // Try minutes only format (30m, 30min) - MUST have 'm' or 'min' suffix
  const mMatch = trimmed.match(/^(\d+)\s*(m|min)$/);
  if (mMatch && mMatch[1]) {
    return parseInt(mMatch[1], 10);
  }

  // Plain number (assumes HOURS, not minutes)
  // e.g., "100" = 100 hours = 6000 minutes
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return Math.round(num * 60);
  }

  return null;
}

export function TimeCell({
  value,
  onChange,
  isDark,
  locale = 'en',
  placeholder: _placeholder,
  disabled = false,
  enableSaveFlash = true,
  isBlurred = false,
  lens = 'hours',
  hourlyRate = 0,
}: TimeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Micro-interaction: flash green on save
  const { isFlashing, triggerFlash } = useSaveFlash();

  const isFin = lens === 'financial' && hourlyRate > 0;
  const formattedValue = isFin && value
    ? `$${Math.round((value / 60) * hourlyRate).toLocaleString('en-US')}`
    : formatTime(value, locale);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    // When entering edit mode, show current value in editable format
    if (value) {
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      if (hours > 0 && mins > 0) {
        setEditValue(`${hours}h ${mins}m`);
      } else if (hours > 0) {
        setEditValue(`${hours}h`);
      } else {
        setEditValue(`${mins}m`);
      }
    } else {
      setEditValue('');
    }
  }, [value, isEditing]);

  const handleSave = () => {
    const parsedMinutes = parseTimeToMinutes(editValue);
    if (parsedMinutes !== value) {
      onChange?.(parsedMinutes);
      // Trigger flash after save
      if (enableSaveFlash) {
        triggerFlash();
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Governance v2.0: Blurred mode for unauthorized users
  if (isBlurred) {
    return (
      <div
        className="flex items-center gap-1.5"
        title={locale === 'es' ? 'No tienes permisos para ver este dato' : 'You don\'t have permission to view this data'}
      >
        <Clock className={cn('w-3.5 h-3.5 flex-shrink-0', isDark ? 'text-white/30' : 'text-gray-400')} />
        <span
          className={cn(
            'text-sm select-none blur-[4px] opacity-60 pointer-events-none',
            isDark ? 'text-white/60' : 'text-gray-500'
          )}
          aria-hidden="true"
        >
          ••••
        </span>
      </div>
    );
  }

  const ValueIcon = isFin ? DollarSign : Clock;

  // Read-only mode (no onChange provided)
  if (disabled || !onChange) {
    // Parent tasks with no value: render empty (no dash)
    if (!value || value === 0) return null;
    return (
      <div className="flex items-center gap-1.5">
        <ValueIcon className={cn('w-3.5 h-3.5 flex-shrink-0', isDark ? 'text-white/30' : 'text-gray-400')} />
        <span className={cn(
          'text-sm font-mono',
          isDark ? 'text-white/60' : 'text-gray-500',
        )}>
          {formattedValue}
        </span>
      </div>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        placeholder={locale === 'es' ? '8 (=8h), 1h 30m' : '8 (=8h), 1h 30m'}
        className={cn(
          'w-full px-2 py-1 text-sm rounded border outline-none',
          isDark
            ? 'bg-white/[0.03] border-[#007BFF] text-white placeholder:text-white/30'
            : 'bg-white border-[#007BFF] text-gray-900 placeholder:text-gray-400'
        )}
      />
    );
  }

  // Display mode (clickable to edit)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        'flex items-center gap-1 text-sm text-left w-full px-1.5 py-1 rounded transition-[background-color] duration-300 overflow-hidden',
        isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100',
        value != null && value > 0
          ? (isDark ? 'text-white/60' : 'text-gray-600')
          : (isDark ? 'text-white/30' : 'text-gray-400'),
        // Flash animation
        isFlashing && (isDark ? 'bg-green-500/30' : 'bg-green-500/20')
      )}
    >
      {value != null && value > 0 && (
        <ValueIcon className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-white/30' : 'text-gray-400')} />
      )}
      <span className="truncate font-mono">{formattedValue}</span>
    </button>
  );
}
