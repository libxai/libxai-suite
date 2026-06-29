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
}

export function CalBar({ bar, ws, money, projColor, slotH = DEFAULT_SLOT_H }: CalBarProps): React.ReactElement {
  const { t } = bar;
  const col = bar.s - ws;
  const span = bar.e - bar.s + 1;
  const cls =
    'cal-bar' +
    (t.critical ? ' cpm' : '') +
    (bar.contL ? ' cont-l' : '') +
    (bar.contR ? ' cont-r' : '');
  const val = money === '$' ? t.cost : `${t.hrs}h`;
  const style: ProjVars = {
    '--proj': projColor,
    left: `calc(${col}/7*100% + 3px)`,
    width: `calc(${span}/7*100% - 6px)`,
    top: `${bar.lane * slotH}px`,
  };
  return (
    <div className={cls} style={style}>
      {t.critical && span >= 3 ? <span className="cpm-tag">CPM</span> : null}
      {t.id ? <span className="tk">{t.id}</span> : null}
      <span className="nom">{t.name}</span>
      {span >= 3 ? <span className="val">{val}</span> : null}
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
}

export function CalMoreChip({ more, ws, slotH = DEFAULT_SLOT_H, onClick }: CalMoreChipProps): React.ReactElement {
  const col = more.day - ws;
  const style: CSSProperties = {
    left: `calc(${col}/7*100% + 3px)`,
    top: `${more.lane * slotH}px`,
  };
  return (
    <div
      className="cal-more"
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(more) : undefined}
    >
      +{more.count} más
    </div>
  );
}

/* ---------- Leyenda al pie ---------- */
export interface CalLegendProps {
  projects: CalProject[];
}

export function CalLegend({ projects }: CalLegendProps): React.ReactElement {
  return (
    <div className="cal-legend">
      {projects.map((p) => (
        <span key={p.id || p.name}>
          <span className="dot" style={{ background: p.color }} />
          {p.id ? `${p.id} ` : ''}{p.name}
        </span>
      ))}
      <span>
        <i style={{ color: 'var(--cyan)' }}>▣</i> Ruta crítica
      </span>
      <span>
        <i style={{ color: 'var(--cyan)' }}>◆</i> Hito / Desembolso
      </span>
      <span>
        <i style={{ color: 'var(--red)' }}>⚑</i> Vencimiento
      </span>
      <span>
        <i style={{ color: 'var(--txt2)' }}>○</i> Evento externo
      </span>
      <span>
        <i style={{ color: 'var(--orange)' }}>⊘</i> Ausencia
      </span>
    </div>
  );
}
