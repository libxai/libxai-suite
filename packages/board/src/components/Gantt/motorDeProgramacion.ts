/**
 * ═══ EL MOTOR DEL CRONOGRAMA (QA Asakaa, mejora fuerte 5) ════════════════════════
 *
 * Yesid: «Dependencias con tipo (fin-inicio, inicio-inicio…) y desfase […];
 * reprogramación automática o, como mínimo, aviso de conflicto; duraciones en días
 * hábiles con festivos y fines de semana; hitos en su fecha exacta».
 *
 * Decisiones de Arcadio (16-oct):
 *   · cada enlace tiene tipo (FS, SS, FF, SF — los códigos de MS Project) y desfase en
 *     DÍAS HÁBILES (negativo = adelanto);
 *   · el calendario es el del espacio: sus días laborables y sus festivos;
 *   · si una predecesora se atrasa, sus sucesoras se EMPUJAN lo justo; si se adelanta,
 *     se quedan donde están (nunca se adelantan solas).
 *
 * Puro: sin React. Las fechas son días (la hora no cuenta). Sin calendario, todos los
 * días son hábiles — lo que hacía el Gantt hasta ahora.
 */
import type { Task, GanttWorkingDaysConfig } from './types';

export type TipoDeEnlace = 'FS' | 'SS' | 'FF' | 'SF';

export interface EnlaceDeTarea {
  /** La predecesora (la tarea de la que depende). */
  id: string;
  type: TipoDeEnlace;
  /** Días hábiles; negativo = adelanto. */
  lag: number;
}

export interface Calendario {
  esHabil(d: Date): boolean;
}

const MS_DIA = 864e5;
const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const clave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const masUno = (d: Date, n: number) => { const r = soloDia(d); r.setDate(r.getDate() + n); return r; };
const antes = (a: Date, b: Date) => soloDia(a).getTime() < soloDia(b).getTime();

/** Todos los días hábiles: el comportamiento de siempre si no hay calendario. */
export const TODOS_LOS_DIAS: Calendario = { esHabil: () => true };

export function calendarioDe(cfg?: GanttWorkingDaysConfig | null): Calendario {
  if (!cfg) return TODOS_LOS_DIAS;
  const semana = cfg.enabledWeekdays && cfg.enabledWeekdays.length === 7 ? cfg.enabledWeekdays : null;
  const festivos = cfg.holidayDates
    ? (cfg.holidayDates instanceof Set ? cfg.holidayDates : new Set(cfg.holidayDates))
    : null;
  // Un calendario sin ningún día laborable no se puede usar: sería un bucle sin fin.
  if (semana && !semana.some(Boolean)) return TODOS_LOS_DIAS;
  return {
    esHabil: (d) => (!semana || !!semana[d.getDay()]) && !(festivos && festivos.has(clave(d))),
  };
}

/** El primer día hábil desde `d` (incluido), hacia adelante o hacia atrás. */
export function habilDesde(d: Date, cal: Calendario, haciaAtras = false): Date {
  let r = soloDia(d);
  for (let i = 0; i < 3660 && !cal.esHabil(r); i++) r = masUno(r, haciaAtras ? -1 : 1);
  return r;
}

/**
 * `d` más `n` días hábiles. Con n = 0, el propio día si es hábil (si no, el siguiente).
 * Negativo cuenta hacia atrás.
 */
export function sumarHabiles(d: Date, n: number, cal: Calendario): Date {
  if (n === 0) return habilDesde(d, cal);
  let r = soloDia(d);
  const paso = n > 0 ? 1 : -1;
  let faltan = Math.abs(n);
  for (let i = 0; i < 36600 && faltan > 0; i++) {
    r = masUno(r, paso);
    if (cal.esHabil(r)) faltan--;
  }
  return r;
}

/** Días hábiles de `inicio` a `fin`, los dos incluidos (la duración de una barra). Mínimo 1. */
export function habilesEntre(inicio: Date, fin: Date, cal: Calendario): number {
  const a = soloDia(inicio);
  const b = soloDia(fin);
  if (b.getTime() < a.getTime()) return 1;
  let n = 0;
  for (let d = a; d.getTime() <= b.getTime(); d = masUno(d, 1)) if (cal.esHabil(d)) n++;
  return Math.max(1, n);
}

/** El fin de una tarea que empieza en `inicio` y dura `dias` hábiles. */
export function finConDuracion(inicio: Date, dias: number, cal: Calendario): Date {
  return sumarHabiles(habilDesde(inicio, cal), Math.max(1, dias) - 1, cal);
}

/** Los enlaces de una tarea: los que trae con tipo, y FS sin desfase para los ids sueltos. */
export function enlacesDe(t: Pick<Task, 'dependencies' | 'dependencyLinks'>): EnlaceDeTarea[] {
  const conTipo = new Map((t.dependencyLinks ?? []).map((l) => [l.id, l]));
  const ids = new Set([...(t.dependencies ?? []), ...conTipo.keys()]);
  return [...ids].map((id) => conTipo.get(id) ?? { id, type: 'FS' as const, lag: 0 });
}

function aplanar(tareas: Task[], fuera = new Map<string, Task>()): Map<string, Task> {
  for (const t of tareas) {
    fuera.set(t.id, t);
    if (t.subtasks?.length) aplanar(t.subtasks, fuera);
  }
  return fuera;
}

export interface Limite {
  /** Lo más pronto que puede empezar / terminar la sucesora por este enlace. */
  inicioMin?: Date;
  finMin?: Date;
  enlace: EnlaceDeTarea;
  predecesora: Task;
}

/** Lo que exige UN enlace a su sucesora (null si la predecesora no tiene fechas). */
export function limiteDelEnlace(enlace: EnlaceDeTarea, pred: Task, cal: Calendario): Limite | null {
  if (!pred.startDate || !pred.endDate) return null;
  switch (enlace.type) {
    case 'FS': return { inicioMin: sumarHabiles(pred.endDate, 1 + enlace.lag, cal), enlace, predecesora: pred };
    case 'SS': return { inicioMin: sumarHabiles(pred.startDate, enlace.lag, cal), enlace, predecesora: pred };
    case 'FF': return { finMin: sumarHabiles(pred.endDate, enlace.lag, cal), enlace, predecesora: pred };
    case 'SF': return { finMin: sumarHabiles(pred.startDate, enlace.lag, cal), enlace, predecesora: pred };
  }
}

export interface Ajuste {
  inicio: Date;
  fin: Date;
  /** El enlace que obligó a mover la tarea; null si no hubo que moverla. */
  porQue: Limite | null;
}

/**
 * Las fechas más cercanas a las pedidas que cumplen TODOS los enlaces de la tarea, sin
 * cambiar su duración en días hábiles. Si las pedidas ya los cumplen, se devuelven tal cual
 * (una tarea se puede poner MÁS TARDE de lo que exigen sus enlaces: no se adelanta sola).
 * Un hito ocupa un solo día: inicio = fin.
 */
export function fechasQueCumplen(
  tarea: Pick<Task, 'id' | 'dependencies' | 'dependencyLinks' | 'isMilestone'>,
  inicio: Date,
  fin: Date,
  todas: Task[] | Map<string, Task>,
  cal: Calendario,
): Ajuste {
  const porId = todas instanceof Map ? todas : aplanar(todas);
  const dur = tarea.isMilestone ? 1 : habilesEntre(inicio, fin, cal);
  let ini = tarea.isMilestone ? soloDia(fin) : soloDia(inicio);
  let porQue: Limite | null = null;
  // Iterar: correr por un límite de inicio puede no bastar para uno de fin y viceversa.
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    let movido = false;
    const finActual = tarea.isMilestone ? ini : finConDuracion(ini, dur, cal);
    for (const e of enlacesDe(tarea)) {
      const pred = porId.get(e.id);
      if (!pred || pred.id === tarea.id) continue;
      const l = limiteDelEnlace(e, pred, cal);
      if (!l) continue;
      if (l.inicioMin && antes(ini, l.inicioMin)) {
        ini = habilDesde(l.inicioMin, cal); porQue = l; movido = true;
      } else if (l.finMin && antes(finActual, l.finMin)) {
        ini = tarea.isMilestone ? habilDesde(l.finMin, cal) : sumarHabiles(l.finMin, -(dur - 1), cal);
        porQue = l; movido = true;
      }
    }
    if (!movido) break;
  }
  if (!porQue) return { inicio, fin, porQue: null };
  return { inicio: ini, fin: tarea.isMilestone ? ini : finConDuracion(ini, dur, cal), porQue };
}

export interface TareaEmpujada {
  id: string;
  startDate: Date;
  endDate: Date;
  porQue: Limite;
}

/**
 * Tras mover unas tareas, EMPUJA a las sucesoras que dejaron de cumplir su enlace, en
 * cadena, lo justo. Nunca adelanta a ninguna. Devuelve solo las que se movieron (con su
 * porqué); quien llama las aplica y las guarda.
 */
export function empujarSucesoras(todas: Task[], movidas: Iterable<string>, cal: Calendario): TareaEmpujada[] {
  const porId = aplanar(todas);
  // índice inverso: de cada predecesora, sus sucesoras
  const sucesoras = new Map<string, string[]>();
  for (const t of porId.values()) {
    for (const e of enlacesDe(t)) {
      const l = sucesoras.get(e.id) ?? [];
      l.push(t.id);
      sucesoras.set(e.id, l);
    }
  }
  const cola = [...movidas];
  const resultado = new Map<string, TareaEmpujada>();
  let pasos = 0;
  while (cola.length > 0 && pasos++ < 20000) {
    const id = cola.shift()!;
    for (const sid of sucesoras.get(id) ?? []) {
      const s = porId.get(sid);
      if (!s?.startDate || !s.endDate) continue;
      const a = fechasQueCumplen(s, s.startDate, s.endDate, porId, cal);
      if (!a.porQue) continue;
      const nueva: Task = { ...s, startDate: a.inicio, endDate: a.fin };
      porId.set(sid, nueva);
      resultado.set(sid, { id: sid, startDate: a.inicio, endDate: a.fin, porQue: a.porQue });
      cola.push(sid);
    }
  }
  return [...resultado.values()];
}

export interface Conflicto {
  sucesora: Task;
  predecesora: Task;
  enlace: EnlaceDeTarea;
  /** Días hábiles que habría que correr la sucesora para cumplir el enlace. */
  dias: number;
}

/** Los enlaces que NO se cumplen hoy (para marcarlos y avisar). */
export function conflictosDelCronograma(todas: Task[], cal: Calendario): Conflicto[] {
  const porId = aplanar(todas);
  const fuera: Conflicto[] = [];
  for (const s of porId.values()) {
    if (!s.startDate || !s.endDate) continue;
    for (const e of enlacesDe(s)) {
      const p = porId.get(e.id);
      if (!p) continue;
      const l = limiteDelEnlace(e, p, cal);
      if (!l) continue;
      const fin = s.isMilestone ? s.startDate : s.endDate;
      let dias = 0;
      if (l.inicioMin && antes(s.startDate, l.inicioMin)) dias = habilesEntre(s.startDate, l.inicioMin, cal) - 1;
      else if (l.finMin && antes(fin, l.finMin)) dias = habilesEntre(fin, l.finMin, cal) - 1;
      if (dias > 0 || (l.inicioMin && antes(s.startDate, l.inicioMin)) || (l.finMin && antes(fin, l.finMin))) {
        fuera.push({ sucesora: s, predecesora: p, enlace: e, dias: Math.max(1, dias) });
      }
    }
  }
  return fuera;
}

/** Los días de calendario entre dos fechas (para quien aún los necesita, p. ej. el arrastre). */
export function diasDeCalendario(a: Date, b: Date): number {
  return Math.round((soloDia(b).getTime() - soloDia(a).getTime()) / MS_DIA);
}
