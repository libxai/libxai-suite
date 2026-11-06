/**
 * A14 (revisión de Yesid) · LAS COLUMNAS A ELECCIÓN del Gantt v6: se añaden con el «+» del encabezado. Aquí solo está qué
 * son y qué texto lleva cada celda; los calculados no se guardan, salen de la tarea, del calendario y de la línea base.
 */
import type { ColumnType, Task } from './types';
import { diferenciaHabil, enlacesDe, habilesEntre, type Calendario } from './motorDeProgramacion';
import { fechaCorta } from './fechaCorta';

export interface ColumnaOpcional { id: ColumnType; es: string; en: string; ancho: number; }

export const COLUMNAS_OPCIONALES: ColumnaOpcional[] = [
  { id: 'duration', es: 'Duración', en: 'Duration', ancho: 52 },
  { id: 'predecessors', es: 'Predecesoras', en: 'Predecessors', ancho: 92 },
  { id: 'hours', es: 'Horas', en: 'Hours', ancho: 48 },
  { id: 'cost', es: 'Costo', en: 'Cost', ancho: 80 },
  { id: 'slack', es: 'Holgura', en: 'Slack', ancho: 56 },
  { id: 'baselineEnd', es: 'Fin L. base', en: 'Baseline end', ancho: 72 },
  { id: 'variance', es: 'Variación', en: 'Variance', ancho: 64 },
];

export interface ContextoDeColumnas {
  cal: Calendario;
  es: boolean;
  /** id → WBS, para nombrar las predecesoras. */
  wbsDe: Map<string, string>;
  /** Tarifa por hora de una tarea (la de su responsable). */
  tarifa?: (t: Task) => number;
  dinero?: (n: number) => string;
}

/** Las horas estimadas: las de la tarea o, en una fase, la suma de sus hijas. */
export function minutosEstimados(t: Task): number {
  if (t.subtasks?.length) return t.subtasks.reduce((s, h) => s + minutosEstimados(h), 0);
  return t.effortMinutes ?? 0;
}

export function costoEstimado(t: Task, tarifa: (t: Task) => number): number {
  if (t.subtasks?.length) return t.subtasks.reduce((s, h) => s + costoEstimado(h, tarifa), 0);
  return ((t.effortMinutes ?? 0) / 60) * tarifa(t);
}

/** Días hábiles de atraso frente a la línea base: positivo es tarde. `null` si la tarea no estaba en esa línea base. */
export function variacion(t: Task, cal: Calendario): number | null {
  if (!t.baselineEndDate || !t.endDate) return null;
  return diferenciaHabil(new Date(t.baselineEndDate), new Date(t.endDate), cal);
}

const VACIO = '—';

export function textoDeColumna(id: ColumnType, t: Task, c: ContextoDeColumnas): string {
  const fase = !!t.subtasks?.length;
  switch (id) {
    case 'duration':
      return t.startDate && t.endDate ? `${habilesEntre(new Date(t.startDate), new Date(t.endDate), c.cal)} d` : VACIO;
    case 'predecessors': {
      const enlaces = enlacesDe(t);
      if (!enlaces.length) return VACIO;
      return enlaces.map((e) => {
        const wbs = c.wbsDe.get(e.id) ?? '?';
        const lag = e.lag ? `${e.lag > 0 ? '+' : ''}${e.lag}` : '';
        return e.type === 'FS' && !lag ? wbs : `${wbs}${e.type}${lag}`;
      }).join(', ');
    }
    case 'hours': {
      const m = minutosEstimados(t);
      return m ? `${Math.round((m / 60) * 10) / 10} h` : VACIO;
    }
    case 'cost': {
      if (!c.tarifa) return VACIO;
      const v = costoEstimado(t, c.tarifa);
      return v ? (c.dinero ? c.dinero(v) : String(Math.round(v))) : VACIO;
    }
    case 'slack':
      return !fase && t.cpmData ? `${t.cpmData.totalFloat} d` : VACIO;
    case 'baselineEnd':
      return t.baselineEndDate ? fechaCorta(new Date(t.baselineEndDate), c.es ? 'es' : 'en') : VACIO;
    case 'variance': {
      const v = variacion(t, c.cal);
      if (v === null) return VACIO;
      return `${v > 0 ? '+' : ''}${v} d`;
    }
    default:
      return VACIO;
  }
}

/** Rojo si algo va mal en esa celda; verde si va por delante. */
export function tonoDeColumna(id: ColumnType, t: Task, cal: Calendario): 'rojo' | 'verde' | null {
  if (id === 'slack' && t.cpmData && !t.subtasks?.length) return t.cpmData.totalFloat <= 0 ? 'rojo' : null;
  if (id === 'variance') {
    const v = variacion(t, cal);
    if (v === null || v === 0) return null;
    return v > 0 ? 'rojo' : 'verde';
  }
  return null;
}
