/**
 * Mapeo de datos reales del Gantt → estructuras del Calendario (Sprint 1).
 *
 * Toma las tareas reales (LibXAITask) que ya carga ProjectCalendar y las
 * proyecta sobre la grilla del mes visible como barras (CalTask). NO inventa
 * datos: hitos/desembolsos/externos/ausencias solo aparecen si hay fuente real
 * (en S1 derivamos "vencimientos" de tareas que terminan en el mes; el resto
 * llega cuando existan sus entidades — S2/S3).
 */
import type { Task as LibXAITask } from '../Gantt/types';
import type { CalTask, DayItem, MonthGrid } from './calendarLayout';

/** Aplana el árbol llevando la FASE (tarea-padre raíz) de cada tarea, para el
 *  filtro "Fase". La raíz es su propia fase. */
function flatten(tasks: LibXAITask[]): Array<{ t: LibXAITask; phaseId: string; phaseName: string }> {
  const out: Array<{ t: LibXAITask; phaseId: string; phaseName: string }> = [];
  const walk = (list: LibXAITask[], phaseId: string, phaseName: string) => {
    for (const t of list) {
      // si estamos en el nivel raíz, la fase es la tarea misma.
      const pId = phaseId || t.id;
      const pName = phaseName || t.name;
      out.push({ t, phaseId: pId, phaseName: pName });
      if (t.subtasks?.length) walk(t.subtasks, pId, pName);
    }
  };
  walk(tasks, '', '');
  return out;
}

function toDate(v: Date | string | undefined | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** "$1.9k" / "$475" — formato compacto coherente con el resto de Asakaa. */
function fmtCost(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(amount)}`;
}

export interface BuildOpts {
  tasks: LibXAITask[];
  grid: MonthGrid;
  /** projectId → color (CSS). En vista de un proyecto, un solo color. */
  projectColor: (projectId: string) => string;
  /** tarifa media para estimar costo cuando no hay costo explícito. */
  hourlyRate: number;
  /** id de proyecto de las tareas (el calendario es por proyecto en S1). */
  projectId: string;
}

export interface BuiltCalendar {
  calTasks: CalTask[];
  dayItems: DayItem[];
  /** ¿el mes visible tiene algo que mostrar? (para estado vacío C13) */
  isEmpty: boolean;
}

/**
 * Construye las barras (y items derivados) para el mes visible de la grilla.
 * Recorta tareas a la ventana de la grilla; las que no intersectan se omiten.
 */
export function buildCalendar(opts: BuildOpts): BuiltCalendar {
  const { tasks, grid, projectColor, hourlyRate, projectId } = opts;
  const flat = flatten(tasks);
  const gridEndSerial = 6 * 7; // 6 semanas

  const calTasks: CalTask[] = [];
  for (const { t, phaseId, phaseName } of flat) {
    const start = toDate(t.startDate);
    const end = toDate(t.endDate);
    if (!start || !end) continue;

    const sSerial = grid.dateToSerial(start);
    const eSerial = grid.dateToSerial(end);
    // Omite tareas totalmente fuera de la ventana visible.
    if (eSerial < 1 || sSerial > gridEndSerial) continue;

    const mins = (t as { effortMinutes?: number | null }).effortMinutes ?? 0;
    const hrs = Math.round((mins / 60) * 10) / 10;
    const explicitCost = (t as { costAtCompletion?: number | null }).costAtCompletion;
    const cost = explicitCost != null ? fmtCost(explicitCost) : fmtCost(hrs * hourlyRate);
    const assignee = t.assignees?.[0];
    const who = assignee?.initials || (assignee?.name ? initials(assignee.name) : undefined);

    // ID visible: usar wbsCode/displayId si existe (legible, ej. "1.2"); si solo
    // hay el UUID interno, dejarlo vacío (S1 no muestra UUIDs crudos en la barra
    // — los IDs cortos por proyecto son la feature C11 de Sprint 3).
    const shortId = (t as { displayId?: string }).displayId
      || (t as { wbsCode?: string }).wbsCode
      || '';
    const visibleId = isUuid(shortId || t.id) ? '' : (shortId || t.id);

    calTasks.push({
      uid: t.id,            // UUID real para lógica (drag/simulación/drawer)
      id: visibleId,        // solo para mostrar (vacío si es UUID)
      name: t.name,
      projectId,
      startSerial: Math.max(sSerial, 1),
      endSerial: Math.min(eSerial, gridEndSerial),
      hrs,
      cost,
      critical: !!t.isCriticalPath,
      who,
      realStart: start,
      realEnd: end,
      phaseId,
      phaseName,
    });
  }
  // color por proyecto se aplica en el render; aquí solo dejamos el projectId.
  void projectColor;

  // S1: sin entidades de hito/desembolso/externo/ausencia → dayItems vacío.
  // (Se poblará en S2/S3 cuando existan esas fuentes; el render ya los soporta.)
  const dayItems: DayItem[] = [];

  return {
    calTasks,
    dayItems,
    isEmpty: calTasks.length === 0 && dayItems.length === 0,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s) || /^task-\d+/.test(s); }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(year: number, month: number, locale: 'es' | 'en'): string {
  return `${(locale === 'es' ? MONTHS_ES : MONTHS_EN)[month]} ${year}`;
}
