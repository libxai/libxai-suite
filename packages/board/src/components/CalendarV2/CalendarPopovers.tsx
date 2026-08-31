/* ============================================================
   ASAKAA PULSE · Calendario — popovers de solo lectura (Sprint 1)
   Fiel al diseño de referencia (cal-components.jsx / cal-screens.jsx).
   Usa las clases .cal-* de calendar.css. Sin drag, sin CPM (eso es S3).
   ============================================================ */
import React, { useEffect, useRef } from 'react';
import type { DayItem, DayItemType } from './calendarLayout';

/** Icono por tipo de elemento de día (C2). */
const CHIP_ICON: Record<DayItemType, string> = {
  hito: '◆',
  desembolso: '◆',
  deadline: '⚑',
  ext: '○',
  aus: '⊘',
};

/** Color del icono/swatch por tipo, vía variables del tema. */
const TYPE_COLOR: Record<DayItemType, string> = {
  hito: 'var(--cyan)',
  desembolso: 'var(--cyan)',
  deadline: 'var(--red)',
  ext: 'var(--txt2)',
  aus: 'var(--orange)',
};

// ── CalMorePopover ───────────────────────────────────────────────────────────

/** Una barra de tarea que cae en el día (opcional, además de los DayItem). */
export interface MoreTaskRow {
  /** color del proyecto (CSS var o hex) para el swatch cuadrado. */
  swatch: string;
  /** ID visible de la tarea (TK-xxx). */
  taskId: string;
  label: string;
  /** valor del extremo: horas o coste según toggle. */
  value: string;
  critical?: boolean;
}

export interface CalMorePopoverProps {
  /** Etiqueta legible del día, ej. "Mar 16 jun". */
  dayLabel: string;
  /** Todos los elementos de día (tipados) que caen ese día. */
  items: DayItem[];
  /** Barras de tareas que también caen ese día (opcional). */
  tasks?: MoreTaskRow[];
  /** Valor mostrado por item (opcional): serial/tipo → string ya formateado. */
  itemValue?: (it: DayItem) => string;
  onClose: () => void;
  style?: React.CSSProperties;
}

/**
 * Popover "+N más": lista de TODOS los elementos del día, tipados.
 * Cabecera "{dayLabel} · {n} elementos". Cierra al click fuera (onClose).
 */
export function CalMorePopover({
  dayLabel,
  items,
  tasks = [],
  itemValue,
  onClose,
  style,
}: CalMorePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const total = tasks.length + items.length;
  const defaultItemValue = (it: DayItem): string => {
    switch (it.type) {
      case 'hito':
        return 'Hito';
      case 'desembolso':
        return 'Desemb.';
      case 'deadline':
        return 'Vence';
      case 'aus':
        return 'Ausencia';
      case 'ext':
      default:
        return '';
    }
  };
  const valueOf = itemValue || defaultItemValue;

  return (
    <div
      ref={ref}
      className="cal-pop"
      style={{ position: 'absolute', width: '320px', zIndex: 30, ...style }}
      role="dialog"
      aria-label={`${dayLabel} · ${total} elementos`}
    >
      <div className="cal-pop-head">
        <div className="sup">
          {dayLabel} · {total} {total === 1 ? 'elemento' : 'elementos'}
        </div>
      </div>
      <div className="cal-pop-list">
        {tasks.map((r, i) => (
          <div key={`t${i}`} className="cal-pop-item">
            <span className="sw" style={{ background: r.swatch }} />
            {r.taskId ? <span className="tk">{r.taskId}</span> : null}
            <span
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {r.label}
            </span>
            {r.critical ? (
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '8px',
                  letterSpacing: '0.1em',
                  color: '#031',
                  background: 'var(--cyan)',
                  borderRadius: '3px',
                  padding: '1.5px 3.5px',
                  fontWeight: 700,
                }}
              >
                CPM
              </span>
            ) : null}
            <span className="v">{r.value}</span>
          </div>
        ))}
        {items.map((it, i) => (
          <div key={`i${i}`} className="cal-pop-item">
            <span className="ico" style={{ color: TYPE_COLOR[it.type] }}>
              {CHIP_ICON[it.type]}
            </span>
            <span
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {it.label}
            </span>
            <span className="v">{valueOf(it)}</span>
          </div>
        ))}
        <div className="cal-scrollbar" />
      </div>
    </div>
  );
}

// ── CalEmptyState ────────────────────────────────────────────────────────────

export interface UpcomingMilestone {
  type: 'hito' | 'deadline';
  label: string;
  /** fecha ya formateada, ej. "14 oct". */
  date: string;
}

export interface CalEmptyStateProps {
  /** Etiqueta del mes visible, ej. "Junio 2026". */
  monthLabel: string;
  upcomingMilestones?: UpcomingMilestone[];
  locale?: 'es' | 'en';
  /**
   * Crear la primera tarea. Sin esto el estado vacio solo describe; con esto
   * ofrece la salida, que es lo que pide REQ-07 §2.5: «el mensaje debe decir
   * que hacer y ofrecer hacerlo».
   *
   * Opcional a proposito: quien no lo pase mantiene el estado de solo lectura.
   */
  onCreateTask?: () => void;
}

const EMPTY_COPY = {
  es: {
    title: 'Sin tareas programadas este mes',
    upcoming: 'Próximos hitos',
    /*
     * REQ-07 §2.5. El texto anterior decia «arrastra tareas del BACKLOG o
     * crealas en el GANTT» y «el plan CPM proyectara aqui...».
     *
     * Yesid: «no hay un backlog visible en ninguna parte, y 'el plan CPM' no
     * significa nada para quien usa la herramienta».
     *
     * Lo nuevo nombra lo que el usuario SI ve —el mes— y ofrece la accion.
     */
    body: 'Las tareas con fecha en este mes aparecerán aquí.',
    crear: 'Crear una tarea',
  },
  en: {
    title: 'No tasks scheduled this month',
    upcoming: 'Upcoming milestones',
    body: 'Tasks with dates in this month will show up here.',
    crear: 'Create a task',
  },
};

/**
 * Estado vacío premium (C13): glifo ◇◇◇, título guía, y tarjeta "Próximos
 * hitos" si hay upcomingMilestones. Solo lectura.
 */
export function CalEmptyState({
  monthLabel,
  upcomingMilestones = [],
  locale = 'es',
  onCreateTask,
}: CalEmptyStateProps) {
  const copy = EMPTY_COPY[locale] || EMPTY_COPY.es;

  return (
    <div className="cal-empty">
      <div className="glyph">◇ ◇ ◇</div>
      <h3>{copy.title}</h3>
      <p>
        {copy.body}
        <br />
        <b>{monthLabel}</b>
      </p>
      {onCreateTask ? (
        <button type="button" className="cal-empty-crear" onClick={onCreateTask}>
          {copy.crear}
        </button>
      ) : null}
      {upcomingMilestones.length > 0 ? (
        <div className="cal-empty-hitos">
          <div className="hd">{copy.upcoming}</div>
          {upcomingMilestones.map((m, i) => (
            <div key={i} className="cal-empty-hito">
              <span className={'ic ' + (m.type === 'deadline' ? 'rd' : 'cy')}>
                {m.type === 'deadline' ? '⚑' : '◆'}
              </span>
              {m.label}
              <span className="d">{m.date}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
