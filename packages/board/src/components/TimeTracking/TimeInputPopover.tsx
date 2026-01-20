/**
 * TimeInputPopover - Compact popover for entering time values
 * v1.3.0: Extracted from TaskDetailModal for reuse in ListView
 *
 * Used for:
 * - Logging time from list view column
 * - Setting estimates
 * - Setting quoted time
 */

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils';

export interface TimeInputPopoverProps {
  /** Mode determines the title and behavior */
  mode: 'estimate' | 'quoted' | 'log';
  /** Locale for translations */
  locale: 'en' | 'es';
  /** Dark mode */
  isDark: boolean;
  /** Current value in minutes (for estimate/quoted modes) */
  currentValue?: number | null;
  /** Called when user saves the value */
  onSave: (minutes: number | null, note?: string) => Promise<void>;
  /** Called when popover should close */
  onClose: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Parse duration string to minutes
 * Supports: "2h 30m", "2h", "30m", "2:30", "150"
 */
function parseDurationToMinutes(input: string): number | null {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || trimmed === '-') {
    return null;
  }

  // Format: "2:30" (hours:minutes)
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  // Format: "2h 30m" or "2h" or "30m"
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = trimmed.match(/(\d+)\s*m/);

  if (hourMatch || minuteMatch) {
    const hours = hourMatch?.[1] ? parseFloat(hourMatch[1]) : 0;
    const minutes = minuteMatch?.[1] ? parseInt(minuteMatch[1], 10) : 0;
    return Math.round(hours * 60) + minutes;
  }

  // Format: plain number (assume minutes)
  const plainNumber = parseFloat(trimmed);
  if (!isNaN(plainNumber)) {
    return Math.round(plainNumber);
  }

  return null;
}

/**
 * Format minutes as duration string (e.g., "2h 30m")
 */
function formatMinutesToDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes === 0) return '';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function TimeInputPopover({
  mode,
  locale,
  isDark,
  currentValue,
  onSave,
  onClose,
  className,
}: TimeInputPopoverProps) {
  const [durationInput, setDurationInput] = useState(formatMinutesToDuration(currentValue));
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const totalMinutes = parseDurationToMinutes(durationInput);
    await onSave(totalMinutes && totalMinutes > 0 ? totalMinutes : null, note || undefined);
    setIsSaving(false);
  };

  const handleClear = async () => {
    setIsSaving(true);
    await onSave(null);
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const titles = {
    estimate: locale === 'es' ? 'Duración estimada' : 'Estimated duration',
    quoted: locale === 'es' ? 'Tiempo ofertado' : 'Quoted time',
    log: locale === 'es' ? 'Registrar tiempo' : 'Log time',
  };

  const placeholders = {
    estimate: locale === 'es' ? '1h 30m' : '1h 30m',
    quoted: locale === 'es' ? '1h 30m' : '1h 30m',
    log: locale === 'es' ? '1h 30m' : '1h 30m',
  };

  return (
    <div
      className={cn(
        "w-64 p-3 rounded-lg shadow-xl border",
        isDark ? "bg-[#1F2937] border-[#374151]" : "bg-white border-gray-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
          {titles[mode]}
        </span>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "p-1 rounded transition-colors",
            isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duration Input - Compact Style */}
      <div className="mb-3">
        <input
          ref={inputRef}
          type="text"
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[mode]}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border transition-all",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
            isDark
              ? "bg-[#374151] border-[#4B5563] text-white placeholder:text-gray-500"
              : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
          )}
        />
        <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
          {locale === 'es' ? 'Ej: 1h 30m, 45m, 2:30' : 'e.g. 1h 30m, 45m, 2:30'}
        </p>
      </div>

      {/* Note field only for log mode */}
      {mode === 'log' && (
        <div className="mb-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={locale === 'es' ? 'Comentario (opcional)' : 'Comment (optional)'}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-lg border transition-all",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
              isDark
                ? "bg-[#374151] border-[#4B5563] text-white placeholder:text-gray-500"
                : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
            )}
          />
        </div>
      )}

      {/* Action Button - Single button, full width */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !durationInput.trim()}
        className={cn(
          "w-full py-2 px-3 text-sm font-medium rounded-lg transition-colors",
          "bg-blue-600 hover:bg-blue-700 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isSaving
          ? (locale === 'es' ? 'Guardando...' : 'Saving...')
          : (locale === 'es' ? 'Guardar' : 'Save')}
      </button>

      {/* Clear button only for estimate/quoted modes with existing value */}
      {currentValue && mode !== 'log' && (
        <button
          type="button"
          onClick={handleClear}
          disabled={isSaving}
          className={cn(
            "w-full mt-2 py-1.5 px-3 text-xs font-medium rounded-lg transition-colors",
            isDark
              ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              : "text-gray-500 hover:text-red-600 hover:bg-red-50"
          )}
        >
          {locale === 'es' ? 'Quitar valor' : 'Clear value'}
        </button>
      )}
    </div>
  );
}

export default TimeInputPopover;
