/**
 * Calendario (Asakaa Pulse) — Sprint 2, franja de Capacidad (C7).
 *
 * Solo lectura. Pinta, bajo cada semana de la grilla, una celda por día con
 * "{asignadas}h / {capacidad}h" + barra (verde <90%, ámbar 90-100%, roja >100%),
 * y al hacer click abre un popover con el desglose por persona.
 *
 * Una sola fuente de verdad: TODOS los números salen de los `TeamMember` de
 * useTeamCapacity (member.dailyEstimated). Nada se inventa. Sáb/Dom/festivos
 * no admiten registro de horas → "—" y se omiten de la agregación.
 *
 * Clases .cal-* definidas en calendar.css:
 *   .cal-cap-row / .cal-cap-cell (.ok|.warn|.over|.off|.sel) / .cal-cap-track / .cal-cap-fill
 *   .cal-pop / .cal-pop-head / .cal-person-row (.over) / .cal-person-track / .cal-person-fill
 */

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
export interface DailyLog { date: string; hours: number }
export interface TeamMember { userId: string; name: string; weeklyCapacity?: number; dailyEstimated: DailyLog[] }

// ─── Tipos ───

/** Día tal como lo entrega la grilla del calendario para esta semana. */
export interface CapDay {
  serial: number;
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
}

/** Carga agregada de un día: horas asignadas vs. capacidad-techo del equipo. */
export interface DayCapacity {
  assigned: number;
  capacity: number;
  perPerson: PersonLoad[];
}

/** Carga de una persona en un día concreto. */
export interface PersonLoad {
  name: string;
  initials: string;
  color: string;
  hours: number;
  capacity: number;
}

// ─── Helpers internos ───

/** 'YYYY-MM-DD' en calendario local (NO UTC) — debe casar con las claves de dailyEstimated. */
function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Iniciales (máx. 2) a partir del nombre — fallback consistente con el avatar del equipo. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Paleta determinista por persona (mismo color para el mismo userId entre renders). */
const PERSON_COLORS = ['#00E5CC', '#8B5CF6', '#F97316', '#22C55E', '#EF4444', '#EC4899', '#F59E0B', '#3B82F6'];
function colorForIndex(i: number): string {
  return PERSON_COLORS[i % PERSON_COLORS.length]!;
}

/** Nivel visual de una celda a partir del % de uso. */
function levelClass(pct: number): 'ok' | 'warn' | 'over' {
  if (pct > 1) return 'over';
  if (pct >= 0.9) return 'warn';
  return 'ok';
}

const NBSP = ' ';

/** Redondea a 1 decimal y limpia el ".0" para mostrar (12.0 → "12", 12.5 → "12.5"). */
function fmtH(h: number): string {
  const r = Math.round(h * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// ─── Helper export: agregación por día ───

/**
 * Agrega `dailyEstimated` de todos los `members` por fecha, SOLO en días
 * hábiles no festivos. La capacidad-techo de cada persona ese día es
 * `dailyCapacityHours`; la del equipo es nº de personas × dailyCapacityHours.
 * Devuelve un Map fecha('YYYY-MM-DD') → {assigned, capacity, perPerson}.
 *
 * @param members TeamMember[] de useTeamCapacity (member.dailyEstimated: DailyLog[]).
 * @param days    días de la semana visible (de la grilla del calendario).
 * @param dailyCapacityHours techo de horas por persona/día hábil (de timesheetSettings).
 */
export function buildCapacityByDay(
  members: TeamMember[],
  days: CapDay[],
  dailyCapacityHours: number,
): Map<string, DayCapacity> {
  const out = new Map<string, DayCapacity>();

  // Solo agregamos los días hábiles no festivos de la semana visible.
  const workKeys = new Set<string>();
  for (const d of days) {
    if (d.isWeekend || d.isHoliday) continue;
    workKeys.add(toLocalISO(d.date));
  }
  if (workKeys.size === 0) return out;

  // color/iniciales deterministas por persona (índice estable dentro del equipo)
  const metaByUser = new Map<string, { color: string; initials: string }>();
  members.forEach((m, idx) => {
    metaByUser.set(m.userId, { color: colorForIndex(idx), initials: initialsOf(m.name) });
  });

  // fecha → userId → horas asignadas (suma de dailyEstimated de esa persona ese día)
  const byDateUser = new Map<string, Map<string, number>>();
  for (const m of members) {
    for (const log of (m.dailyEstimated as DailyLog[])) {
      if (!log.date || !workKeys.has(log.date)) continue;
      if (!byDateUser.has(log.date)) byDateUser.set(log.date, new Map());
      const userMap = byDateUser.get(log.date)!;
      userMap.set(m.userId, (userMap.get(m.userId) ?? 0) + (log.hours || 0));
    }
  }

  for (const key of workKeys) {
    const userMap = byDateUser.get(key) ?? new Map<string, number>();
    const perPerson: PersonLoad[] = members.map((m) => {
      const meta = metaByUser.get(m.userId)!;
      return {
        name: m.name,
        initials: meta.initials,
        color: meta.color,
        hours: Math.round((userMap.get(m.userId) ?? 0) * 100) / 100,
        capacity: dailyCapacityHours,
      };
    });
    const assigned = perPerson.reduce((s, p) => s + p.hours, 0);
    out.set(key, {
      assigned: Math.round(assigned * 100) / 100,
      capacity: dailyCapacityHours * members.length,
      perPerson,
    });
  }

  return out;
}

// ─── CalCapRow ───

/**
 * Fila de capacidad bajo una semana: una celda por día. Sáb/Dom/festivo → "—".
 * Click en un día con datos dispara `onSelectDay` para abrir el desglose.
 */
export function CalCapRow({
  days,
  capByDay,
  selectedKey,
  onSelectDay,
}: {
  days: CapDay[];
  capByDay: Map<string, DayCapacity>;
  selectedKey?: string | null;
  onSelectDay?: (key: string, dayLabel: string, anchor: HTMLElement) => void;
}) {
  return (
    <div className="cal-cap-row">
      {days.map((d) => {
        const key = toLocalISO(d.date);
        const off = d.isWeekend || d.isHoliday;
        const cap = off ? undefined : capByDay.get(key);
        const hasData = !!cap && cap.capacity > 0;
        const pct = hasData ? cap!.assigned / cap!.capacity : 0;
        const lvl = off ? 'off' : levelClass(pct);
        const cls = 'cal-cap-cell ' + lvl + (selectedKey === key ? ' sel' : '');

        const dayLabel = d.date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });

        return (
          <div
            key={d.serial}
            className={cls}
            role={hasData && onSelectDay ? 'button' : undefined}
            tabIndex={hasData && onSelectDay ? 0 : undefined}
            title={off ? undefined : dayLabel}
            onClick={(e) => {
              if (!hasData || !onSelectDay) return;
              onSelectDay(key, dayLabel, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (!hasData || !onSelectDay) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDay(key, dayLabel, e.currentTarget);
              }
            }}
          >
            <div className="nums">
              {off || !hasData ? (
                <span>{off ? '—' : `0h${NBSP}/${NBSP}—`}</span>
              ) : (
                <>
                  <b>{fmtH(cap!.assigned)}h</b>
                  <span>/{NBSP}{fmtH(cap!.capacity)}h</span>
                </>
              )}
            </div>
            <div className="cal-cap-track">
              {hasData ? (
                <div className="cal-cap-fill" style={{ width: Math.min(pct * 100, 100) + '%' }} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CalBreakdownPopover ───

/**
 * Popover de desglose por persona de un día. Lista cada persona con su barra
 * (roja si sus horas exceden su capacidad). Cierra con click fuera + Escape.
 */
export function CalBreakdownPopover({
  dayLabel,
  perPerson,
  onClose,
  style,
}: {
  dayLabel: string;
  perPerson: PersonLoad[];
  onClose: () => void;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const assigned = perPerson.reduce((s, p) => s + p.hours, 0);
  const capacity = perPerson.reduce((s, p) => s + p.capacity, 0);
  const over = capacity > 0 && assigned > capacity;
  const delta = Math.round((assigned - capacity) * 10) / 10;

  return (
    <div
      ref={ref}
      className="cal-pop"
      role="dialog"
      style={{ position: 'absolute', width: '276px', zIndex: 30, ...style }}
    >
      <div className="cal-pop-head">
        <div className="sup">Capacidad · {dayLabel}</div>
        <div className="tit" style={over ? { color: 'var(--red)' } : undefined}>
          {fmtH(assigned)}h asignadas / {fmtH(capacity)}h
        </div>
        {over ? (
          <div className="rng"><b>+{fmtH(delta)}h sobre capacidad</b></div>
        ) : (
          <div className="rng">{perPerson.length} {perPerson.length === 1 ? 'persona' : 'personas'}</div>
        )}
      </div>
      <div>
        {perPerson.map((p) => {
          const pOver = p.capacity > 0 && p.hours > p.capacity;
          const denom = p.capacity > 0 ? p.capacity : 1;
          return (
            <div key={p.name} className={pOver ? 'cal-person-row over' : 'cal-person-row'}>
              <span className="pava" style={{ background: p.color }}>{p.initials}</span>
              <span className="nm" title={p.name}>{p.name}</span>
              <div className="cal-person-track">
                <div
                  className="cal-person-fill"
                  style={{ width: Math.min((p.hours / denom) * 100, 100) + '%' }}
                />
              </div>
              <span className="hrs">{fmtH(p.hours)}h / {fmtH(p.capacity)}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
