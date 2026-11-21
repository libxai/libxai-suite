/**
 * El avance de un conjunto de tareas · UNA sola fórmula en la librería (y la app, el servidor y la base la copian).
 *
 * Movida desde ListView (1.9.46, QA Asakaa E4) para que el Gantt la use también (1.9.47, QA Asakaa E6).
 *
 * 18-nov · REGLA v4 (guía de Yesid; revisión de producción del 17-nov: la fase COMPRAS de P26031 daba 10 % en la
 * Lista, 56 % en el Gantt y 82 % en el Informe, porque cada vista tenía su fórmula):
 *   · se cuentan las tareas HOJA (sin subtareas);
 *   · cada una pesa sus HORAS ESTIMADAS; sin estimado (o 0) pesa 1 h. Sin respaldo en las horas vendidas;
 *   · una hoja COMPLETADA cuenta 100 % (aunque su porcentaje guardado diga otra cosa);
 *   · excepción que se conserva: si un coordinador repartió PESOS manuales (suman ≥ 99 y los tienen ≥ 95 % de las
 *     hojas), mandan los pesos (sql/124, Axon);
 *   · redondeado a entero.
 * Pruebas de aceptación de Yesid: «1 de 4 completadas, sin estimar» = 25 %; P26025 Materialización 21 de 74 h = 28 %.
 *
 * 21-nov · LOS HITOS NO PESAN (respuesta de Yesid a N29 de su 2ª revisión): «un hito es una fecha, no trabajo; la regla
 * de "sin estimado pesa 1 h" es solo para tareas. Los hitos se cuentan aparte ("2 de 5 hitos cumplidos"), y un proyecto
 * que solo tiene hitos sale "No evaluable" en avance». Una hoja que es hito no entra en el avance (ni por horas ni por
 * pesos manuales); sin tareas que no sean hitos, el avance es 0 y `hayTrabajoQueMedir` dice que no hay nada que medir.
 */
import type { Task } from '../components/Gantt/types';
import { estadoDeHoja } from '../components/ListView/v6/reglasDeLaLista';

export type HojaConAvance = {
  progress: number;
  weight: number;
  effort_minutes?: number | null;
  /** ya no pesa (regla v4); se deja en el tipo para no romper a quien lo pase */
  sold_effort_minutes?: number | null;
  /** completada por su estado: cuenta 100 */
  hecha?: boolean;
  /** un hito: no pesa en el avance (21-nov) */
  hito?: boolean;
};

/** Minutos que pesa una hoja: sus horas estimadas; sin estimado (o 0), 1 h. */
export function minutosQuePesa(l: Pick<HojaConAvance, 'effort_minutes'>): number {
  const e = l.effort_minutes ?? 0;
  return e > 0 ? e : 60;
}

const avanceDeHoja = (l: HojaConAvance) => (l.hecha ? 100 : Math.max(0, Math.min(100, l.progress || 0)));

export function computeWeightedProgress(todas: HojaConAvance[]): number {
  const leaves = todas.filter((l) => !l.hito);
  if (leaves.length === 0) return 0;

  const conPeso = leaves.filter((l) => (l.weight || 0) > 0);
  const sumaPesos = conPeso.reduce((s, l) => s + l.weight, 0);
  if (sumaPesos >= 99 && conPeso.length / leaves.length >= 0.95) {
    return Math.round(conPeso.reduce((s, l) => s + avanceDeHoja(l) * l.weight, 0) / sumaPesos);
  }

  const den = leaves.reduce((s, l) => s + minutosQuePesa(l), 0);
  return den > 0 ? Math.round(leaves.reduce((s, l) => s + avanceDeHoja(l) * minutosQuePesa(l), 0) / den) : 0;
}

/**
 * Collects all leaf tasks (tasks without subtasks) from a tree.
 */
export function collectLeaves(list: Task[], out: HojaConAvance[] = []): HojaConAvance[] {
  for (const t of list) {
    if (t.subtasks && t.subtasks.length > 0) {
      collectLeaves(t.subtasks, out);
    } else {
      const x = t as any;
      out.push({
        progress: t.progress || 0,
        weight: x.weight || 0,
        effort_minutes: x.effort_minutes ?? x.effortMinutes ?? null,
        sold_effort_minutes: x.sold_effort_minutes ?? x.soldEffortMinutes ?? null,
        hecha: estadoDeHoja(t) === 'done',
        hito: !!t.isMilestone,
      });
    }
  }
  return out;
}

/**
 * El avance de UNA tarea con la regla única: una fase (o cualquier padre) se calcula con sus hojas; una hoja, su
 * propio avance (100 si está completada). Lo usan la Lista, su panel y su orden, en vez de leer el `progress` que
 * guardó la base para los padres (otra fórmula: hijas directas y sin estimar fuera).
 */
export function avanceDeTarea(t: Task): number {
  if (t.subtasks && t.subtasks.length > 0) return computeWeightedProgress(collectLeaves(t.subtasks));
  return Math.round(estadoDeHoja(t) === 'done' ? 100 : Math.max(0, Math.min(100, t.progress ?? 0)));
}

/** ¿Hay alguna tarea que no sea hito (algo que medir)? Sin ninguna, el avance es «No evaluable». */
export function hayTrabajoQueMedir(list: Task[]): boolean {
  return collectLeaves(list).some((l) => !l.hito);
}

/** Los hitos de un árbol, aparte del avance: cuántos hay y cuántos se cumplieron («2 de 5 hitos cumplidos»). */
export function contarHitos(list: Task[]): { total: number; cumplidos: number } {
  let total = 0;
  let cumplidos = 0;
  const recorrer = (ts: Task[]) => {
    for (const t of ts) {
      if (t.isMilestone) {
        total += 1;
        if (estadoDeHoja(t) === 'done') cumplidos += 1;
      }
      if (t.subtasks && t.subtasks.length > 0) recorrer(t.subtasks);
    }
  };
  recorrer(list);
  return { total, cumplidos };
}
