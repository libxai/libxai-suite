/**
 * TaskTooltip - v1.5.3
 *
 * Renders task tooltips as a fixed-position HTML overlay via React Portal.
 * Tooltip follows the mouse cursor for fluid, professional UX (Linear/ClickUp style).
 *
 * v1.5.3: Tooltip follows mouse cursor instead of being anchored to bar position.
 *         Appears above-right of cursor, flips left/below when near screen edges.
 * v1.4.28: Complete rewrite — switched from SVG <g> to HTML <div> with position:fixed
 *          rendered via createPortal to document.body.
 * v1.2.0: Added three-tier time tracking display (effortMinutes, timeLoggedMinutes, soldEffortMinutes)
 */

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Task } from './types';

export interface TaskTooltipData {
  task: Task;
  x: number;
  y: number;
  width: number;
  height: number;
  showBelow: boolean;
  /** Viewport mouse position — tooltip follows cursor for fluid UX */
  mouseX: number;
  mouseY: number;
}

/**
 * Optional working-days configuration so the tooltip Duration reflects the
 * workspace's actual working schedule (weekend toggles + holidays) instead
 * of raw calendar days. When omitted, falls back to calendar days.
 */
export interface WorkingDaysConfig {
  /** Which weekdays count as working days. 0=Sun, 1=Mon, ..., 6=Sat. */
  enabledWeekdays?: boolean[]; // length 7
  /** Holiday dates in 'YYYY-MM-DD' (workspace-local) to exclude. */
  holidayDates?: Set<string> | string[];
}

interface TaskTooltipProps {
  tooltipData: TaskTooltipData | null;
  theme: any;
  locale?: 'en' | 'es';
  workingDaysConfig?: WorkingDaysConfig;
}

const TOOLTIP_WIDTH = 260;
const SCREEN_PADDING = 8;
const CURSOR_OFFSET_X = 16;  // px to the right of cursor
const CURSOR_OFFSET_Y = -12; // px above cursor (negative = up)

export function TaskTooltip({ tooltipData, theme, locale = 'en', workingDaysConfig }: TaskTooltipProps) {
  const [pos, setPos] = useState<{ left: number; top: number; showBelow: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!tooltipData) {
      setPos(null);
      return;
    }

    const { task, mouseX, mouseY } = tooltipData;
    const hasTimeData = task.effortMinutes != null || task.timeLoggedMinutes != null || task.soldEffortMinutes != null;
    const hasLastActivity = task.lastActivity != null;
    const tooltipH = (hasTimeData ? 155 : 105) + (hasLastActivity ? 28 : 0);

    // Start above-right of cursor
    let left = mouseX + CURSOR_OFFSET_X;
    let top = mouseY + CURSOR_OFFSET_Y - tooltipH;

    // Flip left if overflows right edge
    if (left + TOOLTIP_WIDTH > window.innerWidth - SCREEN_PADDING) {
      left = mouseX - TOOLTIP_WIDTH - CURSOR_OFFSET_X;
    }
    // Clamp left edge
    if (left < SCREEN_PADDING) left = SCREEN_PADDING;

    // Flip below cursor if overflows top edge
    const showBelow = top < SCREEN_PADDING;
    if (showBelow) {
      top = mouseY + 20;
    }
    // Clamp bottom edge
    if (top + tooltipH > window.innerHeight - SCREEN_PADDING) {
      top = window.innerHeight - SCREEN_PADDING - tooltipH;
    }

    setPos({ left, top, showBelow });
  }, [tooltipData]);

  if (!tooltipData || !pos) return null;

  const { task } = tooltipData;
  const hasTimeData = task.effortMinutes != null || task.timeLoggedMinutes != null || task.soldEffortMinutes != null;

  // Translations
  const t = {
    start: locale === 'es' ? 'Inicio' : 'Start',
    end: locale === 'es' ? 'Fin' : 'End',
    duration: locale === 'es' ? 'Duración' : 'Duration',
    progress: locale === 'es' ? 'Progreso' : 'Progress',
    assignees: locale === 'es' ? 'Asignados' : 'Assignees',
    estimated: locale === 'es' ? 'Estimado' : 'Estimated',
    logged: locale === 'es' ? 'Registrado' : 'Logged',
    quoted: locale === 'es' ? 'Ofertado' : 'Quoted',
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDuration = () => {
    if (!task.startDate || !task.endDate) return 'N/A';

    // Default: calendar-day count (inclusive of both ends).
    if (!workingDaysConfig?.enabledWeekdays) {
      const days = Math.max(1, Math.round((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return locale === 'es' ? `${days} día${days !== 1 ? 's' : ''}` : `${days} day${days !== 1 ? 's' : ''}`;
    }

    // Working-day count respecting workspace weekday toggles + holidays.
    const enabled = workingDaysConfig.enabledWeekdays;
    const holidaySet = workingDaysConfig.holidayDates instanceof Set
      ? workingDaysConfig.holidayDates
      : new Set(workingDaysConfig.holidayDates ?? []);
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let count = 0;
    const cursor = new Date(task.startDate.getFullYear(), task.startDate.getMonth(), task.startDate.getDate());
    const end = new Date(task.endDate.getFullYear(), task.endDate.getMonth(), task.endDate.getDate());
    while (cursor.getTime() <= end.getTime()) {
      const dow = cursor.getDay();
      if (enabled[dow] && !holidaySet.has(toKey(cursor))) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const days = Math.max(0, count);
    return locale === 'es' ? `${days} día${days !== 1 ? 's' : ''}` : `${days} day${days !== 1 ? 's' : ''}`;
  };

  const formatMinutes = (minutes: number | null | undefined): string => {
    if (minutes == null || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const labelColor = theme.textTertiary || '#9CA3AF';
  const valueColor = theme.textSecondary || '#D1D5DB';
  const nameColor = theme.textPrimary || '#F9FAFB';
  const accentColor = theme.accent || '#00E5CC';
  const bgColor = theme.bgSecondary || '#1F2937';
  const borderColor = theme.border || '#374151';

  const tooltip = (
    <div
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: TOOLTIP_WIDTH,
        zIndex: 99999,
        pointerEvents: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
        animation: 'gantt-tooltip-fade 0.12s ease-out',
      }}
    >
      <div
        style={{
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          padding: '12px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Task Name */}
        <div style={{ fontSize: 13, fontWeight: 600, color: nameColor, marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.name}
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 11 }}>
          <Row label={t.start} value={task.startDate ? formatDate(task.startDate) : 'N/A'} labelColor={labelColor} valueColor={valueColor} />
          <Row label={t.duration} value={getDuration()} labelColor={labelColor} valueColor={valueColor} />
          <Row label={t.end} value={task.endDate ? formatDate(task.endDate) : 'N/A'} labelColor={labelColor} valueColor={valueColor} />
          <Row label={t.progress} value={`${task.progress}%`} labelColor={labelColor} valueColor={valueColor} />
        </div>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div style={{ fontSize: 11, marginTop: 6 }}>
            <span style={{ color: labelColor }}>{t.assignees}: </span>
            <span style={{ color: valueColor, fontWeight: 500 }}>
              {task.assignees.map(a => a.name).join(', ')}
            </span>
          </div>
        )}

        {/* Time Tracking */}
        {hasTimeData && (
          <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11 }}>
            {task.effortMinutes != null && (
              <span>
                <span style={{ color: labelColor }}>{t.estimated}:</span>{' '}
                <span style={{ color: valueColor, fontWeight: 600 }}>{formatMinutes(task.effortMinutes)}</span>
              </span>
            )}
            {task.timeLoggedMinutes != null && (
              <span>
                <span style={{ color: labelColor }}>{t.logged}:</span>{' '}
                <span style={{ color: accentColor, fontWeight: 600 }}>{formatMinutes(task.timeLoggedMinutes)}</span>
              </span>
            )}
            {task.soldEffortMinutes != null && (
              <span>
                <span style={{ color: labelColor }}>{t.quoted}:</span>{' '}
                <span style={{ color: valueColor, fontWeight: 600 }}>{formatMinutes(task.soldEffortMinutes)}</span>
              </span>
            )}
          </div>
        )}

        {/* v2.7.0: Last activity — subtle 11px divider + one-line summary */}
        {task.lastActivity && (
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${theme?.borderSubtle || 'rgba(255,255,255,0.08)'}`,
            fontSize: 11,
            color: labelColor,
            lineHeight: 1.4,
          }}>
            <span style={{ opacity: 0.7 }}>{locale === 'es' ? 'Último: ' : 'Last: '}</span>
            <span style={{ color: valueColor }}>{task.lastActivity.userName}</span>{' '}
            <span>{task.lastActivity.summary}</span>{' '}
            <span style={{ opacity: 0.6 }}>{task.lastActivity.relativeTime}</span>
          </div>
        )}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes gantt-tooltip-fade {
          from { opacity: 0; transform: translateY(${pos.showBelow ? '-4px' : '4px'}); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(tooltip, document.body);
}

/** Simple label: value row */
function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div>
      <span style={{ color: labelColor }}>{label}: </span>
      <span style={{ color: valueColor, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
