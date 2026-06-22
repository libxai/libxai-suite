/**
 * Popover de impacto CPM (Calendario, Sprint 3, regla C5).
 *
 * Se muestra al soltar una tarea movida/redimensionada. Presenta el resultado
 * de simulateReschedule (sin commit): fechas antes→después, sucesoras movidas,
 * impacto en fin de proyecto, y si está en ruta crítica. Confirmar dispara el
 * commit real (updateTask del Gantt); Cancelar revierte sin efectos.
 */
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { RescheduleSimulation } from './calendarReschedule';

interface Props {
  taskName: string;
  taskId: string;
  sim: RescheduleSimulation;
  busy?: boolean;
  locale: 'es' | 'en';
  onConfirm: () => void;
  onCancel: () => void;
  style?: CSSProperties;
}

function fmt(d: Date, locale: 'es' | 'en'): string {
  return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'short' });
}

export function CalendarReschedulePopover({ taskName, taskId, sim, busy, locale, onConfirm, onCancel, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const es = locale === 'es';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const critical = sim.wasCritical;
  const delta = sim.projectEndDeltaDays;
  const deltaLabel = delta > 0
    ? `+${delta} ${es ? (delta === 1 ? 'día' : 'días') : (delta === 1 ? 'day' : 'days')} · ${fmt(sim.oldProjectEnd, locale)} → ${fmt(sim.newProjectEnd, locale)}`
    : `+0 ${es ? 'días' : 'days'}${sim.slackDays > 0 ? ` · ${es ? 'holgura' : 'slack'} ${sim.slackDays}${es ? 'd' : 'd'}` : ''}`;

  const confirmLabel = delta > 0
    ? (es ? `Confirmar +${delta} ${delta === 1 ? 'día' : 'días'}` : `Confirm +${delta} ${delta === 1 ? 'day' : 'days'}`)
    : (es ? 'Confirmar movimiento' : 'Confirm move');

  return (
    <div ref={ref} className="cal-pop" style={{ width: '324px', zIndex: 60, ...style }} role="dialog">
      <div className="cal-pop-head">
        <div className="sup">{es ? 'Confirmar movimiento' : 'Confirm move'}</div>
        <div className="tit">{taskId ? `${taskId} · ` : ''}{taskName}</div>
        <div className="rng">
          {fmt(sim.oldStart, locale)} – {fmt(sim.oldEnd, locale)} → <b>{fmt(sim.newStart, locale)} – {fmt(sim.newEnd, locale)}</b>
        </div>
      </div>

      {critical ? (
        <div className="cal-pop-warn">⚠ {es ? 'Esta tarea está en ruta crítica' : 'This task is on the critical path'}</div>
      ) : null}

      <div className="cal-impact">
        <div className="cal-impact-row">
          <span className="k">{es ? 'Tareas sucesoras movidas' : 'Successor tasks moved'}</span>
          <span className="v">
            {sim.movedSuccessors.length === 0
              ? (es ? 'Ninguna' : 'None')
              : `${sim.movedSuccessors.length}${sim.movedSuccessors.length <= 2 ? ' · ' + sim.movedSuccessors.map((s) => s.name).join(', ') : ''}`}
          </span>
        </div>
        <div className="cal-impact-row">
          <span className="k">{es ? 'Fin de proyecto' : 'Project end'}</span>
          <span className={delta > 0 ? 'v bad' : 'v good'}>{deltaLabel}</span>
        </div>
        <div className="cal-impact-row">
          <span className="k">{es ? 'Ruta crítica' : 'Critical path'}</span>
          <span className="v">
            {sim.stillCritical
              ? (es ? 'Sigue en CPM' : 'Stays critical')
              : sim.wasCritical
                ? (es ? 'Sale de CPM' : 'Leaves critical')
                : (es ? `No entra · holgura ${sim.slackDays}d` : `Not critical · slack ${sim.slackDays}d`)}
          </span>
        </div>
      </div>

      <div className="cal-pop-actions">
        <button type="button" className="cal-btn" onClick={onCancel} disabled={busy}>
          {es ? 'Cancelar' : 'Cancel'}
        </button>
        <button
          type="button"
          className={critical || delta > 0 ? 'cal-btn danger' : 'cal-btn primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? (es ? 'Guardando…' : 'Saving…') : confirmLabel}
        </button>
      </div>
    </div>
  );
}
