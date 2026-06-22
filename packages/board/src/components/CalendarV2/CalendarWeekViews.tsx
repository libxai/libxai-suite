/**
 * Calendario (Asakaa Pulse) — vistas Semana y Lookahead (Sprint 2, SOLO LECTURA).
 *
 * Reemplaza el placeholder "Vista en construcción" de CalendarView para los
 * modos 'semana' (1 semana) y 'lookahead' (2 semanas desde hoy). Cada semana se
 * pinta con el mismo lenguaje del Mes (WeekBg + CalBar/CalChip/CalMoreChip) pero
 * con filas más altas (slotH 28, height ~182px como ScreenLookahead del diseño)
 * y, debajo de cada una, la franja de capacidad real del equipo (CalCapRow).
 *
 * No duplica el motor de datos: recibe las tareas/ítems ya proyectados por
 * calendarData/calendarLayout y las filas de capacidad (capRows) ya derivadas de
 * useTeamCapacity por el contenedor. Sin drag/resize: pura proyección.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  layoutWeek, isWeekendSerial,
  type MonthGrid, type CalTask, type DayItem,
} from './calendarLayout';
import { CalBar, CalChip, CalMoreChip, type MoneyMode } from './CalendarParts';
import { CalCapRow, type CapDay, type DayCapacity } from './CalendarCapacity';

const WEEK_SLOT_H = 28;
const WEEK_ROW_H = 182;

/** Rango de una semana en serial de la grilla [ws, we]. */
export interface WeekRange { ws: number; we: number }

/** Capacidad por semana: índice de semana → { días + mapa de carga por día }. */
export interface WeekCap { days: CapDay[]; capByDay: Map<string, DayCapacity> }
export type CapRowsByWeek = Record<number, WeekCap>;

export interface WeekGridViewProps {
  grid: MonthGrid;
  /** 1 semana (Semana) o 2 (Lookahead). */
  weeks: WeekRange[];
  tasks: CalTask[];
  items: DayItem[];
  money: MoneyMode;
  projColor: string;
  todaySerial: number;
  locale: 'es' | 'en';
  /** capRows[wi] = celdas de capacidad de la semana wi (alineadas a [ws..we]). */
  capRows?: CapRowsByWeek;
  /** nº de personas en la capacidad del equipo (para el footer). */
  teamSize?: number;
  onTaskOpen?: (taskId: string) => void;
  onMore: (day: number, items: DayItem[], tasksOfDay: CalTask[]) => void;
  /** click en una celda de capacidad → abre desglose por persona. */
  onCapDay?: (key: string, dayLabel: string, anchor: HTMLElement) => void;
}

export function WeekGridView({
  grid, weeks, tasks, items, money, projColor, todaySerial, locale,
  capRows, teamSize, onTaskOpen, onMore, onCapDay,
}: WeekGridViewProps): React.ReactElement {
  const isEs = locale === 'es';
  return (
    <div className="cal-grid-zone" style={{ position: 'relative' }}>
      <div className="cal-weeks" style={{ flex: 'none' }}>
        {weeks.map((w, wi) => (
          <div key={w.ws} style={{ display: 'contents' }}>
            <WeekRowTall
              grid={grid}
              ws={w.ws}
              we={w.we}
              tasks={tasks}
              items={items}
              money={money}
              projColor={projColor}
              todaySerial={todaySerial}
              onTaskOpen={onTaskOpen}
              onMore={onMore}
            />
            {capRows && capRows[wi] ? (
              <CalCapRow days={capRows[wi].days} capByDay={capRows[wi].capByDay} onSelectDay={onCapDay} />
            ) : null}
          </div>
        ))}
      </div>

      <div className="cal-cap-label">
        <span>
          {isEs ? 'Capacidad del equipo' : 'Team capacity'}
          {teamSize != null
            ? ` · ${teamSize} ${isEs ? (teamSize === 1 ? 'persona' : 'personas') : (teamSize === 1 ? 'person' : 'people')}`
            : ''}
        </span>
        <span>
          {isEs
            ? 'Click en un día abre el desglose por persona'
            : 'Click a day to open the per-person breakdown'}
        </span>
      </div>
    </div>
  );
}

// ── Una semana de altura aumentada (Semana / Lookahead) ──────────────────────
interface WeekRowTallProps {
  grid: MonthGrid;
  ws: number; we: number;
  tasks: CalTask[];
  items: DayItem[];
  money: MoneyMode;
  projColor: string;
  todaySerial: number;
  onTaskOpen?: (taskId: string) => void;
  onMore: (day: number, items: DayItem[], tasksOfDay: CalTask[]) => void;
}

function WeekRowTall({
  grid, ws, we, tasks, items, money, projColor, todaySerial, onTaskOpen, onMore,
}: WeekRowTallProps): React.ReactElement {
  const lay = useMemo(() => layoutWeek(tasks, items, ws, we), [tasks, items, ws, we]);
  const deadlineDays = useMemo(
    () => new Set(items.filter((i) => i.type === 'deadline').map((i) => i.serial)),
    [items],
  );

  const days: number[] = [];
  for (let d = ws; d <= we; d++) days.push(d);

  const style: CSSProperties = { height: `${WEEK_ROW_H}px`, flex: 'none' };

  return (
    <div className="cal-week" style={style}>
      <div className="cal-week-bg">
        {days.map((d) => {
          const date = grid.serialToDate(d);
          const inMonth = d >= grid.monthStartSerial && d <= grid.monthEndSerial;
          let cls = 'cal-day';
          if (isWeekendSerial(grid, d)) cls += ' wknd';
          if (!inMonth) cls += ' out';
          if (d === todaySerial) cls += ' today';
          if (deadlineDays.has(d)) cls += ' deadline-day';
          return (
            <div key={d} className={cls}>
              <span className="cal-day-num">{date.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="cal-items">
        {lay.bars.map((b, i) => (
          <div
            key={`b${i}`}
            onClick={() => onTaskOpen?.(b.t.uid)}
            style={{ cursor: onTaskOpen ? 'pointer' : 'default', display: 'contents' }}
          >
            <CalBar bar={b} ws={ws} money={money} projColor={projColor} slotH={WEEK_SLOT_H} />
          </div>
        ))}
        {lay.chips.map((c, i) => (
          <CalChip key={`c${i}`} chip={c} ws={ws} slotH={WEEK_SLOT_H} />
        ))}
        {lay.more.map((m, i) => (
          <CalMoreChip
            key={`m${i}`}
            more={m}
            ws={ws}
            slotH={WEEK_SLOT_H}
            onClick={() => onMore(
              m.day,
              m.items,
              tasks.filter((t) => t.startSerial <= m.day && t.endSerial >= m.day),
            )}
          />
        ))}
      </div>
    </div>
  );
}
