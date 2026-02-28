/**
 * TimeInputPopover - Chronos V2 micro-popover for time entry
 * Glass morphism design matching ListView Chronos style
 */

import { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { cn } from '../../utils';

export interface TimeInputPopoverProps {
  mode: 'estimate' | 'quoted' | 'log';
  locale: 'en' | 'es';
  isDark: boolean;
  currentValue?: number | null;
  onSave: (minutes: number | null, note?: string) => Promise<void>;
  onClose: () => void;
  className?: string;
}

function parseDurationToMinutes(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === '-') return null;

  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = trimmed.match(/(\d+)\s*m/);

  if (hourMatch || minuteMatch) {
    const hours = hourMatch?.[1] ? parseFloat(hourMatch[1]) : 0;
    const minutes = minuteMatch?.[1] ? parseInt(minuteMatch[1], 10) : 0;
    return Math.round(hours * 60) + minutes;
  }

  const plainNumber = parseFloat(trimmed);
  if (!isNaN(plainNumber)) return Math.round(plainNumber * 60);

  return null;
}

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
    if (e.key === 'Escape') onClose();
  };

  const titles = {
    estimate: locale === 'es' ? 'Estimación' : 'Estimate',
    quoted: locale === 'es' ? 'T. Ofertado' : 'Quoted',
    log: locale === 'es' ? 'Registrar' : 'Log Time',
  };

  const isEs = locale === 'es';

  return (
    <div
      className={cn("w-56", className)}
      style={{
        background: isDark ? 'rgba(10, 10, 10, 0.95)' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E5E7EB',
        borderRadius: '8px',
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 8px 32px rgba(0,0,0,0.12)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F3F4F6',
        }}
      >
        <div className="flex items-center gap-1.5">
          <Clock
            className="w-3 h-3"
            style={{ color: isDark ? '#007FFF' : '#2E94FF' }}
          />
          <span
            className="font-mono uppercase tracking-wider"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: isDark ? 'rgba(255,255,255,0.5)' : '#6B7280',
            }}
          >
            {titles[mode]}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded transition-colors"
          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Duration Input */}
        <input
          ref={inputRef}
          type="text"
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="2h 30m"
          className="w-full font-mono outline-none"
          style={{
            fontSize: '13px',
            fontWeight: 700,
            padding: '6px 10px',
            borderRadius: '4px',
            border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
            background: isDark ? '#1A1A1A' : '#F9FAFB',
            color: isDark ? '#FFFFFF' : '#111827',
          }}
        />
        <p
          className="font-mono"
          style={{
            fontSize: '9px',
            color: isDark ? 'rgba(255,255,255,0.25)' : '#9CA3AF',
            letterSpacing: '0.02em',
          }}
        >
          {isEs ? '8=8h · 1h 30m · 45m · 2:30' : '8=8h · 1h 30m · 45m · 2:30'}
        </p>

        {/* Note field for log mode */}
        {mode === 'log' && (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isEs ? 'Nota (opcional)' : 'Note (optional)'}
            className="w-full outline-none"
            style={{
              fontSize: '11px',
              padding: '5px 10px',
              borderRadius: '4px',
              border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
              background: isDark ? '#1A1A1A' : '#F9FAFB',
              color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
            }}
          />
        )}

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !durationInput.trim()}
          className="w-full font-mono uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '6px 0',
            borderRadius: '4px',
            border: isDark ? '1px solid rgba(0,127,255,0.3)' : '1px solid #2E94FF',
            background: isDark ? 'rgba(0,127,255,0.15)' : '#2E94FF',
            color: isDark ? '#007FFF' : '#FFFFFF',
          }}
        >
          {isSaving
            ? (isEs ? 'Guardando...' : 'Saving...')
            : (isEs ? 'Registrar' : 'Save')}
        </button>

        {/* Clear button for estimate/quoted */}
        {currentValue && mode !== 'log' && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving}
            className="w-full font-mono uppercase tracking-wider transition-colors"
            style={{
              fontSize: '9px',
              padding: '4px 0',
              color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF',
            }}
          >
            {isEs ? 'Quitar' : 'Clear'}
          </button>
        )}
      </div>
    </div>
  );
}

export default TimeInputPopover;
