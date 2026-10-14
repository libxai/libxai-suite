/**
 * ═══ UNA TAREA NO EMPIEZA ANTES DE QUE TERMINE AQUELLO DE LO QUE DEPENDE ═══════
 *
 * QA de Asakaa (8-oct), E14: «Una tarea que depende de otra se puede arrastrar
 * a una fecha anterior a su predecesora sin ningún aviso; la flecha
 * simplemente se dobla hacia atrás.»
 *
 * Decisión de Arcadio (14-oct): ajustar y avisar, como MS Project. La tarea se
 * queda en el primer día posible (el siguiente al fin de su predecesora más
 * tardía) y la app avisa (config.onDependencyConstraint).
 *
 * `dependencies` son las PREDECESORAS (la tarea depende de ellas), igual que en
 * ganttUtils.getDependentTasks.
 */
import type { Task } from './types';

const MS_DIA = 864e5;
const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const sumarDias = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

function buscar(tareas: Task[], id: string): Task | null {
  for (const t of tareas) {
    if (t.id === id) return t;
    if (t.subtasks?.length) { const f = buscar(t.subtasks, id); if (f) return f; }
  }
  return null;
}

export interface PrimerDiaPosible {
  /** El día siguiente al fin de la predecesora que termina más tarde. */
  fecha: Date;
  predecesora: Task;
}

/** null si la tarea no depende de ninguna con fecha de fin. */
export function primerDiaPosible(tarea: Pick<Task, 'dependencies'>, todas: Task[]): PrimerDiaPosible | null {
  let mejor: PrimerDiaPosible | null = null;
  for (const id of tarea.dependencies ?? []) {
    const p = buscar(todas, id);
    if (!p?.endDate) continue;
    const fecha = sumarDias(p.endDate, 1);
    if (!mejor || dia(fecha) > dia(mejor.fecha)) mejor = { fecha, predecesora: p };
  }
  return mejor;
}

export interface FechasAjustadas {
  inicio: Date;
  fin: Date;
  /** Presente solo si hubo que mover la tarea. */
  ajuste: PrimerDiaPosible | null;
}

/**
 * Si `inicio` cae antes del primer día posible, mueve la tarea entera (mismo
 * largo) para que empiece ese día. Si solo se movió el inicio (estirar el
 * borde izquierdo), el fin se queda y el inicio se pega al primer día posible.
 */
export function ajustarAPredecesoras(
  tarea: Pick<Task, 'dependencies' | 'startDate' | 'endDate'>,
  inicio: Date,
  fin: Date,
  todas: Task[],
): FechasAjustadas {
  const limite = primerDiaPosible(tarea, todas);
  if (!limite || dia(inicio) >= dia(limite.fecha)) return { inicio, fin, ajuste: null };
  const dias = Math.round((dia(limite.fecha) - dia(inicio)) / MS_DIA);
  const soloElInicio = !!tarea.endDate && dia(tarea.endDate) === dia(fin);
  const nuevoInicio = sumarDias(inicio, dias);
  const nuevoFin = soloElInicio ? (dia(fin) < dia(nuevoInicio) ? new Date(nuevoInicio) : fin) : sumarDias(fin, dias);
  return { inicio: nuevoInicio, fin: nuevoFin, ajuste: limite };
}
