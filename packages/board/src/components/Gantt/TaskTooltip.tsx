/**
 * TaskTooltip - v1.4.28
 *
 * Renders task tooltips as a fixed-position HTML overlay via React Portal.
 * This ensures tooltips are NEVER clipped by any scroll container or SVG boundary.
 *
 * v1.4.28: Complete rewrite — switched from SVG <g> to HTML <div> with position:fixed
 *          rendered via createPortal to document.body. Viewport-aware: automatically
 *          flips above/below and clamps horizontally so it never overflows the screen.
 * v1.2.0: Added three-tier time tracking display (effortMinutes, timeLoggedMinutes, soldEffortMinutes)
 */

import { useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Task } from './types';

export interface TaskTooltipData {
  task: Task;
  x: number;
  y: number;
  width: number;
  height: number;
  showBelow: boolean;
}

interface TaskTooltipProps {
  tooltipData: TaskTooltipData | null;
  theme: any;
  locale?: 'en' | 'es';
  /** Ref to the content SVG — used to convert SVG coords to screen coords */
  svgRef?: RefObject<SVGSVGElement>;
}

const TOOLTIP_WIDTH = 260;
const TOOLTIP_GAP = 10;
const SCREEN_PADDING = 8;

export function TaskTooltip({ tooltipData, theme, locale = 'en', svgRef }: TaskTooltipProps) {
  const [pos, setPos] = useState<{ left: number; top: number; showBelow: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!tooltipData || !svgRef?.current) {
      setPos(null);
      return;
    }

    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    const { x, y, width, height, task } = tooltipData;

    // Check if task has time tracking data to determine tooltip height
    const hasTimeData = task.effortMinutes != null || task.timeLoggedMinutes != null || task.soldEffortMinutes != null;
    const tooltipH = hasTimeData ? 155 : 105;

    // Convert SVG coords to screen coords
    const barScreenLeft = svgRect.left + x;
    const barScreenTop = svgRect.top + y;
    const barScreenBottom = barScreenTop + height;
    const barCenterX = barScreenLeft + width / 2;

    // Decide above vs below
    const spaceAbove = barScreenTop - SCREEN_PADDING;
    const spaceBelow = window.innerHeight - barScreenBottom - SCREEN_PADDING;
    const showBelow = spaceAbove < tooltipH + TOOLTIP_GAP ? true : spaceBelow < tooltipH + TOOLTIP_GAP ? false : false; // prefer above

    // Y position
    const top = showBelow
      ? barScreenBottom + TOOLTIP_GAP
      : barScreenTop - TOOLTIP_GAP - tooltipH;

    // X position — centered on bar, clamped to screen
    let left = barCenterX - TOOLTIP_WIDTH / 2;
    if (left < SCREEN_PADDING) left = SCREEN_PADDING;
    if (left + TOOLTIP_WIDTH > window.innerWidth - SCREEN_PADDING) {
      left = window.innerWidth - SCREEN_PADDING - TOOLTIP_WIDTH;
    }

    setPos({ left, top, showBelow });
  }, [tooltipData, svgRef]);

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

  // Format helpers
  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDuration = () => {
    if (!task.startDate || !task.endDate) return 'N/A';
    const days = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
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
  const accentColor = theme.accent || '#3B82F6';
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
        animation: 'gantt-tooltip-fade 0.15s ease-out',
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
      </div>

      {/* CSS animation injected once */}
      <style>{`
        @keyframes gantt-tooltip-fade {
          from { opacity: 0; transform: translateY(${pos.showBelow ? '-6px' : '6px'}); }
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
