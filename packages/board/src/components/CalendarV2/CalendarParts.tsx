/**
 * Calendario (Asakaa Pulse) — componentes de presentación puros (Sprint 1, solo lectura).
 *
 * Traducción a TSX de cal-components.jsx, fiel al diseño aprobado. Sin estado,
 * sin drag/resize: solo pintan barras de tarea, chips de día, "+N más" y la
 * leyenda usando las clases .cal-* de calendar.css y el motor de calendarLayout.ts.
 *
 * El color de cada proyecto NO se inventa: se recibe vía la prop `projects`
 * (mapa projectId → color CSS) y se inyecta en la barra como variable `--proj`.
 */

import type React from 'react';
import type { CSSProperties } from 'react';
import type { DayItemType, LaidBar, LaidChip, LaidMore } from './calendarLayout';
import { dowLabels } from './calendarLayout';

const DEFAULT_SLOT_H = 26;

/** Variable CSS personalizada para el color del proyecto. */
type ProjVars = CSSProperties & { '--proj'?: string };

/** Modo del valor mostrado en el extremo de la barra. */
export type MoneyMode = '$' | 'Hrs';

export interface CalProject {
  id: string;
  name: string;
  color: string;
}

/** Mapa projectId → color (resuelto desde la lista de proyectos). */
export type ProjectColors = Record<string, string>;

const CHIP_ICON: Record<DayItemType, string> = {
  hito: '◆',
  desembolso: '◆',
  deadline: '⚑',
  ext: '○',
  aus: '⊘',
};

/* ---------- Encabezado días de la semana ---------- */
export interface CalDowProps {
  locale: 'es' | 'en';
}

export function CalDow({ locale }: CalDowProps): React.ReactElement {
  const labels = dowLabels(locale);
  return (
    <div className="cal-dow">
      {labels.map((d, i) => (
        <div key={d} className={i >= 5 ? 'wknd' : ''}>
          {d}
        </div>
      ))}
    </div>
  );
}

/* ---------- Barra de tarea ---------- */
export interface CalBarProps {
  bar: LaidBar;
  /** Serial de inicio de la semana, para posicionar left dentro de la celda. */
  ws: number;
  money: MoneyMode;
  /** Color del proyecto de esta barra (resuelto fuera). */
  projColor?: string;
  slotH?: number;
  /** 1.9.42 · chip de vencimiento (neutro, con ✓ / alerta / bandera). */
  due?: boolean;
  /** 1.9.42 · `false` nunca pinta horas ni coste en la barra. */
  showValues?: boolean;
}

export function CalBar({ bar, ws, money, projColor, slotH = DEFAULT_SLOT_H, due = false, showValues = true }: CalBarProps): React.ReactElement {
  const { t } = bar;
  const col = bar.s - ws;
  const span = bar.e - bar.s + 1;
  const cls =
    'cal-bar' +
    (t.critical ? ' cpm' : '') +
    (bar.contL ? ' cont-l' : '') +
    (bar.contR ? ' cont-r' : '') +
    (due ? ' due' : '') +
    (due && t.done ? ' done' : '') +
    (due && t.overdue ? ' overdue' : '') +
    (due && t.milestone ? ' hito' : '');
  const val = money === '$' ? t.cost : `${t.hrs}h`;
  /* 1.9.42 · «0h» no dice nada: las horas solo si hay. */
  const conValor = showValues && (money === '$' || t.hrs > 0);
  const style: ProjVars = {
    /*
     * v1.9.26 — P1 §6.4: «un campo de seleccion puede elegirse para colorear
     * los eventos».
     *
     * El color de LA TAREA gana sobre el del proyecto. Si la app no lo manda
     * —que es lo normal— se cae al de siempre, asi que ningun consumidor
     * existente cambia.
     *
     * v1.9.32 — el color vive en LA TAREA (`bar.t.color`, lo copia
     * calendarData), no en la barra: leer solo `bar.color` lo perdía siempre
     * y el selector «Color de los eventos» no pintaba nada. La Agenda ya leía t.
     */
    '--proj': (bar as { color?: string }).color ?? (t as { color?: string }).color ?? projColor,
    left: `calc(${col}/7*100% + 3px)`,
    width: `calc(${span}/7*100% - 6px)`,
    top: `${bar.lane * slotH}px`,
  };
  return (
    <div className={cls} style={style}>
      {t.critical && span >= 3 ? <span className="cpm-tag">CPM</span> : null}
      {due && t.done ? <span className="ico" aria-hidden>✓</span> : null}
      {due && t.overdue ? (
        <svg className="ico" width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="6" y1="3.4" x2="6" y2="6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="8.6" r="0.8" fill="currentColor" />
        </svg>
      ) : null}
      {due && t.milestone ? (
        <svg className="ico" width="11" height="11" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      ) : null}
      {t.id ? <span className="tk">{t.id}</span> : null}
      <span className="nom">{t.name}</span>
      {span >= 3 && conValor ? <span className="val">{val}</span> : null}
      {due && t.overdue ? <span className="sr-only">Overdue</span> : null}
    </div>
  );
}

/* ---------- Chip de un día (hito / desembolso / vencimiento / externo / ausencia) ---------- */
export interface CalChipProps {
  chip: LaidChip;
  ws: number;
  slotH?: number;
}

export function CalChip({ chip, ws, slotH = DEFAULT_SLOT_H }: CalChipProps): React.ReactElement {
  const col = chip.day - ws;
  const cls = `cal-chip ${chip.it.type}`;
  const style: CSSProperties = {
    left: `calc(${col}/7*100% + 3px)`,
    width: 'calc(1/7*100% - 6px)',
    top: `${chip.lane * slotH}px`,
  };
  return (
    <div className={cls} style={style}>
      <span className="ico">{CHIP_ICON[chip.it.type]}</span>
      <span className="lbl2">{chip.it.label}</span>
    </div>
  );
}

/* ---------- "+N más" (abre popover con todos los items del día) ---------- */
export interface CalMoreChipProps {
  more: LaidMore;
  ws: number;
  slotH?: number;
  onClick?: (more: LaidMore) => void;
  /** 1.9.42 · en la fila del número del día, a la derecha (no gasta una fila de chips). */
  enCabecera?: boolean;
  locale?: 'es' | 'en';
}

export function CalMoreChip({ more, ws, slotH = DEFAULT_SLOT_H, onClick, enCabecera = false, locale = 'es' }: CalMoreChipProps): React.ReactElement {
  const col = more.day - ws;
  const style: CSSProperties = enCabecera
    ? { left: `calc(${col + 1}/7*100% - 4px)`, top: '-25px', transform: 'translateX(-100%)' }
    : { left: `calc(${col}/7*100% + 3px)`, top: `${more.lane * slotH}px` };
  return (
    <div
      className={enCabecera ? 'cal-more en-cabecera' : 'cal-more'}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(more) : undefined}
    >
      +{more.count} {locale === 'en' ? 'more' : 'más'}
    </div>
  );
}

/* ---------- Leyenda al pie ---------- */
export interface CalLegendProps {
  projects: CalProject[];
  locale?: 'es' | 'en';
}

export function CalLegend({ projects, locale = 'es' }: CalLegendProps): React.ReactElement {
  const en = locale === 'en';
  return (
    <div className="cal-legend">
      {projects.map((p) => (
        <span key={p.id || p.name}>
          <span className="dot" style={{ background: p.color }} />
          {p.id ? `${p.id} ` : ''}{p.name}
        </span>
      ))}
      <span>
        <i style={{ color: 'var(--cyan)' }}>▣</i> {en ? 'Critical path' : 'Ruta crítica'}
      </span>
      <span>
        <i style={{ color: 'var(--cyan)' }}>◆</i> {en ? 'Milestone' : 'Hito'}
      </span>
      <span>
        <i style={{ color: 'var(--red)' }}>⚑</i> {en ? 'Due date' : 'Vencimiento'}
      </span>
      <span>
        <i style={{ color: 'var(--txt2)' }}>○</i> {en ? 'External event' : 'Evento externo'}
      </span>
      <span>
        <i style={{ color: 'var(--orange)' }}>⊘</i> {en ? 'Absence' : 'Ausencia'}
      </span>
    </div>
  );
}
