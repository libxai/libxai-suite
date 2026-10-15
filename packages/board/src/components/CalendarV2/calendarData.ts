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
import { inicialesDe } from '../../utils/iniciales';
import { horas, moneda } from '../../utils/formato';
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

/**
 * QA Asakaa 2.2: «$1,9 mil COP» / «$475 COP» (en: «$1.9K USD») — el formato
 * compacto de utils/formato, el mismo del resto de Asakaa. Antes «$1.9k».
 */
export function fmtCost(amount: number, locale: 'es' | 'en' = 'es', currencyCode?: string | null): string {
  return moneda(Math.round(amount), currencyCode, locale, { compacto: true });
}

/** QA Asakaa 2.2: horas de una barra («12 h 30 min», «45 min», «0 h»). */
export function fmtHrs(hrs: number, locale: 'es' | 'en' = 'es'): string {
  return horas(Math.round(hrs * 60), locale);
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
  /** QA Asakaa 2.2 · idioma de las cifras (por defecto 'es'). */
  locale?: 'es' | 'en';
  /** QA Asakaa 2.2 · código de moneda tras la cifra; sin él, la cifra va sola. */
  currencyCode?: string | null;
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
  const { tasks, grid, projectColor, hourlyRate, projectId, locale = 'es', currencyCode } = opts;
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
    // QA Asakaa E17: un hito se pinta en su día de fin; si cae fuera de la rejilla, no se ve.
    if ((t as { isMilestone?: boolean }).isMilestone && eSerial > gridEndSerial) continue;

    const mins = (t as { effortMinutes?: number | null }).effortMinutes ?? 0;
    const hrs = Math.round((mins / 60) * 10) / 10;
    const explicitCost = (t as { costAtCompletion?: number | null }).costAtCompletion;
    const cost = explicitCost != null ? fmtCost(explicitCost, locale, currencyCode) : fmtCost(hrs * hourlyRate, locale, currencyCode);
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
      /*
       * v1.9.26 — P1 §6.4: «un campo de seleccion puede elegirse para colorear
       * los eventos».
       *
       * La app decide el color y lo pone en la tarea; aqui solo se propaga.
       * `undefined` cuando no lo manda, y entonces manda el del proyecto —el
       * comportamiento de siempre—.
       */
      color: (t as { color?: string }).color,
      /* QA Asakaa E17: un hito es su día de fin; antes se pintaba con sus 7 días. */
      startSerial: Math.max((t as { isMilestone?: boolean }).isMilestone ? eSerial : sSerial, 1),
      endSerial: Math.min(eSerial, gridEndSerial),
      hrs,
      cost,
      critical: !!t.isCriticalPath,
      who,
      realStart: start,
      realEnd: end,
      phaseId,
      phaseName,
      /* 1.9.42 · para los chips del modo vencimiento. */
      done: t.progress === 100 || (t as { status?: string }).status === 'completed',
      overdue: !(t.progress === 100 || (t as { status?: string }).status === 'completed') && (() => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const fin = new Date(end); fin.setHours(0, 0, 0, 0);
        return fin < hoy;
      })(),
      milestone: !!(t as { isMilestone?: boolean }).isMilestone,
      container: !!(t.subtasks && t.subtasks.length > 0),
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
  return inicialesDe(name); // QA Asakaa E41
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(year: number, month: number, locale: 'es' | 'en'): string {
  return `${(locale === 'es' ? MONTHS_ES : MONTHS_EN)[month]} ${year}`;
}
