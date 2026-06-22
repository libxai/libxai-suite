/**
 * Motor de layout del Calendario (Asakaa Pulse) — Sprint 1.
 *
 * Convierte tareas reales (del Gantt) en barras posicionadas por semana, y los
 * elementos de día (hitos/desembolsos/vencimientos/externos/ausencias) en chips,
 * empaquetándolos en "lanes" sin solaparse — fiel a layoutWeek del diseño de
 * referencia (cal-data.js). Solo lectura.
 *
 * El calendario usa un "serial" de día: índice continuo dentro del mes visible
 * (1..N), con lunes = columna 0. Esto permite posicionar barras que cruzan
 * semanas con muescas de continuación.
 */

export type DayItemType = 'hito' | 'desembolso' | 'deadline' | 'ext' | 'aus';

export interface CalTask {
  uid: string;           // ID REAL (UUID interno) — para drag, simulación, drawer
  id: string;            // ID VISIBLE (TK-xxx / wbs; vacío si solo hay UUID) — solo para mostrar
  name: string;
  projectId: string;     // para color por proyecto
  startSerial: number;   // día-serial de inicio dentro del mes visible
  endSerial: number;     // día-serial de fin
  hrs: number;
  cost: string;          // formateado, ej. "$1.9k"
  critical: boolean;     // ruta crítica (CPM)
  who?: string;          // iniciales del responsable
  realStart: Date;
  realEnd: Date;
  /** fase = tarea-padre RAÍZ del WBS (para el filtro "Fase"). uid de la raíz;
   *  si la tarea es de primer nivel, su propia fase es ella misma. */
  phaseId?: string;
  phaseName?: string;
}

export interface DayItem {
  serial: number;
  type: DayItemType;
  label: string;
}

export interface LaidBar {
  t: CalTask;
  s: number;   // serial visible recortado al rango de la semana
  e: number;
  lane: number;
  contL: boolean;  // continúa de la semana anterior
  contR: boolean;  // continúa a la semana siguiente
}

export interface LaidChip {
  it: DayItem;
  day: number;
  lane: number;
}

export interface LaidMore {
  day: number;
  lane: number;
  count: number;
  items: DayItem[];
}

export interface WeekLayout {
  bars: LaidBar[];
  chips: LaidChip[];
  more: LaidMore[];
  laneCount: number;
}

/**
 * Empaqueta barras y chips de una semana [ws, we] en lanes.
 * Reproduce el algoritmo del diseño de referencia (cal-data.js layoutWeek).
 */
export function layoutWeek(
  tasks: CalTask[],
  items: DayItem[],
  ws: number,
  we: number,
  maxSlots = 5,
): WeekLayout {
  const lanes: Array<Array<[number, number]>> = [];
  const bars: LaidBar[] = [];

  const segs = tasks
    .filter((t) => t.endSerial >= ws && t.startSerial <= we)
    .sort((a, b) => a.startSerial - b.startSerial || b.endSerial - a.endSerial);

  for (const t of segs) {
    const s = Math.max(t.startSerial, ws);
    const e = Math.min(t.endSerial, we);
    let lane = 0;
    while ((lanes[lane] || []).some(([ls, le]) => !(e < ls || s > le))) lane++;
    (lanes[lane] = lanes[lane] || []).push([s, e]);
    bars.push({ t, s, e, lane, contL: t.startSerial < ws, contR: t.endSerial > we });
  }

  // Qué lanes ocupa cada columna (día), para colocar chips en huecos.
  const colOcc: Record<number, Set<number>> = {};
  for (let d = ws; d <= we; d++) colOcc[d] = new Set();
  bars.forEach((b) => { for (let d = b.s; d <= b.e; d++) colOcc[d]!.add(b.lane); });

  const chips: LaidChip[] = [];
  const more: LaidMore[] = [];
  const byDay: Record<number, DayItem[]> = {};
  items
    .filter((it) => it.serial >= ws && it.serial <= we)
    .forEach((it) => { (byDay[it.serial] = byDay[it.serial] || []).push(it); });

  Object.keys(byDay).forEach((k) => {
    const d = +k;
    const list = byDay[d]!;
    const free: number[] = [];
    for (let l = 0; l < maxSlots; l++) if (!colOcc[d]!.has(l)) free.push(l);
    if (list.length <= free.length) {
      list.forEach((it, i) => chips.push({ it, day: d, lane: free[i]! }));
    } else {
      const shown = Math.max(free.length - 1, 0);
      list.slice(0, shown).forEach((it, i) => chips.push({ it, day: d, lane: free[i]! }));
      more.push({
        day: d,
        lane: free[shown] != null ? free[shown]! : maxSlots - 1,
        count: list.length - shown,
        items: list.slice(shown),
      });
    }
  });

  let laneCount = lanes.length;
  chips.forEach((c) => { laneCount = Math.max(laneCount, c.lane + 1); });
  more.forEach((m) => { laneCount = Math.max(laneCount, m.lane + 1); });
  return { bars, chips, more, laneCount: Math.max(laneCount, 1) };
}

// ── Helpers de fecha/serial para el mes visible ──────────────────────────────

const DOW_ES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const DOW_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function dowLabels(locale: 'es' | 'en'): string[] {
  return locale === 'es' ? DOW_ES : DOW_EN;
}

/** Lunes (0) .. domingo (6) para una fecha. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export interface MonthGrid {
  /** Fecha del primer día visible (puede ser de mes anterior, siempre lunes). */
  gridStart: Date;
  /** Semanas como rangos de serial [ws, we], 6 semanas máximo. */
  weeks: Array<{ ws: number; we: number }>;
  /** serial → Date */
  serialToDate: (serial: number) => Date;
  /** Date → serial dentro de la grid (o null si fuera). */
  dateToSerial: (d: Date) => number;
  /** serial del primer día del mes objetivo (para detectar "out"). */
  monthStartSerial: number;
  monthEndSerial: number;
}

/**
 * Construye la grilla de un mes: empieza el lunes de la semana del día 1, cubre
 * 6 semanas (estándar de calendarios mensuales), serial continuo desde 1.
 */
export function buildMonthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const offset = mondayIndex(first); // cuántos días de relleno antes del día 1
  const gridStart = new Date(year, month, 1 - offset);
  const weeks: Array<{ ws: number; we: number }> = [];
  for (let w = 0; w < 6; w++) {
    weeks.push({ ws: w * 7 + 1, we: w * 7 + 7 });
  }
  const serialToDate = (serial: number): Date => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + (serial - 1));
    return d;
  };
  const dateToSerial = (d: Date): number => {
    const ms = d.getTime() - gridStart.getTime();
    return Math.floor(ms / 86400000) + 1;
  };
  const monthStartSerial = dateToSerial(first);
  const lastDay = new Date(year, month + 1, 0);
  const monthEndSerial = dateToSerial(lastDay);
  return { gridStart, weeks, serialToDate, dateToSerial, monthStartSerial, monthEndSerial };
}

export function isWeekendSerial(grid: MonthGrid, serial: number): boolean {
  return mondayIndex(grid.serialToDate(serial)) >= 5;
}
