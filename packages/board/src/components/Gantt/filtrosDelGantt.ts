/**
 * G13 (revisión de Yesid) · los filtros del Gantt: responsable, fase, fechas y prioridad, además del estado.
 *
 * Como `hideCompleted`, solo OCULTAN: los datos no se tocan. Mandan las tareas de trabajo: un grupo se queda si le
 * queda alguna hija, y se va si no, aunque él coincida (la barra de resumen no es trabajo de nadie).
 */
import type { ColumnType, RowDensity, Task, TaskFilterType, TimeScale } from './types';

export interface FiltrosDelGantt {
  responsables: string[];
  /** Ids de las tareas raíz con hijas. */
  fases: string[];
  prioridades: string[];
  /** 'YYYY-MM-DD'. Una tarea entra si se cruza con el rango. */
  desde: string | null;
  hasta: string | null;
}

export const SIN_FILTROS: FiltrosDelGantt = { responsables: [], fases: [], prioridades: [], desde: null, hasta: null };
/** Valor de «Sin responsable» en `responsables`. */
export const SIN_RESPONSABLE = '__sin_responsable__';

export function cuantosFiltros(f: FiltrosDelGantt): number {
  return f.responsables.length + f.fases.length + f.prioridades.length + (f.desde || f.hasta ? 1 : 0);
}

const ymd = (d: Date | string | undefined | null): string | null => {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export interface OpcionesDeFiltro {
  responsables: string[];
  haySinResponsable: boolean;
  fases: Array<{ id: string; nombre: string }>;
  prioridades: string[];
}

const ORDEN_DE_PRIORIDAD = ['urgent', 'high', 'medium', 'low'];

/** Lo que tiene sentido ofrecer con estas tareas: solo valores que existen. */
export function opcionesDeFiltro(tareas: Task[]): OpcionesDeFiltro {
  const personas = new Set<string>();
  const prioridades = new Set<string>();
  let haySinResponsable = false;
  const recorrer = (lista: Task[]) => {
    for (const t of lista) {
      if (t.subtasks?.length) { recorrer(t.subtasks); continue; }
      if (t.assignees?.length) t.assignees.forEach((a) => personas.add(a.name));
      else haySinResponsable = true;
      if (t.priority) prioridades.add(t.priority);
    }
  };
  recorrer(tareas);
  return {
    responsables: [...personas].sort((a, b) => a.localeCompare(b)),
    haySinResponsable,
    fases: tareas.filter((t) => t.subtasks?.length).map((t) => ({ id: t.id, nombre: t.name })),
    prioridades: ORDEN_DE_PRIORIDAD.filter((p) => prioridades.has(p)),
  };
}

export function aplicarFiltros(tareas: Task[], f: FiltrosDelGantt): Task[] {
  if (cuantosFiltros(f) === 0) return tareas;
  const coincide = (t: Task): boolean => {
    if (f.responsables.length) {
      const suyas = t.assignees?.length ? t.assignees.map((a) => a.name) : [SIN_RESPONSABLE];
      if (!suyas.some((n) => f.responsables.includes(n))) return false;
    }
    if (f.prioridades.length && !(t.priority && f.prioridades.includes(t.priority))) return false;
    if (f.desde || f.hasta) {
      const inicio = ymd(t.startDate) ?? ymd(t.endDate);
      const fin = ymd(t.endDate) ?? inicio;
      if (!inicio || !fin) return false;
      if (f.desde && fin < f.desde) return false;
      if (f.hasta && inicio > f.hasta) return false;
    }
    return true;
  };
  const recorrer = (lista: Task[]): Task[] => {
    const out: Task[] = [];
    for (const t of lista) {
      if (t.subtasks?.length) {
        const hijas = recorrer(t.subtasks);
        if (hijas.length) out.push({ ...t, subtasks: hijas });
      } else if (coincide(t)) out.push(t);
    }
    return out;
  };
  const raiz = f.fases.length ? tareas.filter((t) => f.fases.includes(t.id)) : tareas;
  return recorrer(raiz);
}

/** A15 · una vista guardada: lo que se ve, con su nombre. */
export interface VistaGuardada {
  nombre: string;
  taskFilter: TaskFilterType;
  filtros: FiltrosDelGantt;
  columnas: ColumnType[];
  escala: TimeScale;
  densidad: RowDensity;
}

const CLAVE_DE_VISTAS = 'gantt-vistas-v6';

export function leerVistas(): VistaGuardada[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_DE_VISTAS) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
export function escribirVistas(v: VistaGuardada[]): void {
  try { localStorage.setItem(CLAVE_DE_VISTAS, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}
/** Guardar con un nombre que ya existe la sustituye, en su sitio. */
export function conVista(lista: VistaGuardada[], vista: VistaGuardada): VistaGuardada[] {
  return lista.some((v) => v.nombre === vista.nombre) ? lista.map((v) => (v.nombre === vista.nombre ? vista : v)) : [...lista, vista];
}
