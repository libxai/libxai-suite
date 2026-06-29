/**
 * Simulación de reprogramación con CPM (Calendario, Sprint 3, regla C5).
 *
 * Dado un movimiento de fechas de UNA tarea, calcula —sobre una copia en
 * memoria, SIN persistir— la consecuencia: qué sucesoras se desplazan, cuánto
 * cambia el fin de proyecto, y si la tarea es/sigue en ruta crítica.
 *
 * Reutiliza el modelo de dependencias del Gantt (task.dependencies). NO duplica
 * el commit: confirmar usa el endpoint real (updateTask) — esto es solo el
 * "forward pass" en simulación para mostrar el popover de impacto.
 */
import type { Task as LibXAITask } from '../Gantt/types';

export interface RescheduleSimulation {
  taskId: string;
  oldStart: Date;
  oldEnd: Date;
  newStart: Date;
  newEnd: Date;
  /** sucesoras que se mueven por respetar dependencias (id + nombre + nuevas fechas). */
  movedSuccessors: Array<{ id: string; name: string; newStart: Date; newEnd: Date }>;
  /** delta del fin de proyecto en días (>0 lo retrasa, 0 = absorbido por holgura). */
  projectEndDeltaDays: number;
  oldProjectEnd: Date;
  newProjectEnd: Date;
  /** ¿la tarea movida estaba en ruta crítica antes del movimiento? */
  wasCritical: boolean;
  /** ¿sigue en ruta crítica tras el movimiento? */
  stillCritical: boolean;
  /** holgura (días) de la tarea antes del movimiento (informativo). */
  slackDays: number;
}

const DAY = 86400000;

function flatten(tasks: LibXAITask[]): LibXAITask[] {
  const out: LibXAITask[] = [];
  const walk = (l: LibXAITask[]) => l.forEach((t) => { out.push(t); if (t.subtasks?.length) walk(t.subtasks); });
  walk(tasks);
  return out;
}

function depIds(t: LibXAITask): string[] {
  const d = t.dependencies as unknown;
  if (!Array.isArray(d)) return [];
  // soporta string[] (legacy) y Dependency[] ({ id }).
  return d.map((x) => (typeof x === 'string' ? x : (x as { id?: string })?.id)).filter((x): x is string => !!x);
}

function durationDays(t: LibXAITask): number {
  const s = t.startDate ? new Date(t.startDate) : null;
  const e = t.endDate ? new Date(t.endDate) : null;
  if (!s || !e) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / DAY));
}

/** earliestFinish (en ms epoch) de cada tarea dado un mapa de fechas de inicio. */
function computeSchedule(
  flat: LibXAITask[],
  startOverride: Map<string, number>, // taskId → start ms
): { finish: Map<string, number>; start: Map<string, number>; projectEnd: number } {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const succ = new Map<string, string[]>();
  for (const t of flat) for (const dep of depIds(t)) {
    if (!succ.has(dep)) succ.set(dep, []);
    succ.get(dep)!.push(t.id);
  }

  const startMs = new Map<string, number>();
  const finishMs = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (id: string): number => {
    if (finishMs.has(id)) return finishMs.get(id)!;
    if (visiting.has(id)) return finishMs.get(id) ?? 0; // corta ciclos
    visiting.add(id);
    const t = byId.get(id);
    if (!t) { visiting.delete(id); return 0; }

    const deps = depIds(t).filter((d) => byId.has(d));
    // inicio = max(fin de dependencias) o el override / la fecha propia.
    let earliestStart = startOverride.has(id)
      ? startOverride.get(id)!
      : (t.startDate ? new Date(t.startDate).getTime() : 0);
    for (const d of deps) {
      const depFinish = resolve(d);
      // una sucesora arranca, como muy pronto, cuando termina su dependencia.
      if (depFinish > earliestStart) earliestStart = depFinish;
    }
    const dur = durationDays(t) * DAY;
    startMs.set(id, earliestStart);
    finishMs.set(id, earliestStart + dur);
    visiting.delete(id);
    return finishMs.get(id)!;
  };

  for (const t of flat) resolve(t.id);
  let projectEnd = 0;
  finishMs.forEach((f) => { if (f > projectEnd) projectEnd = f; });
  return { finish: finishMs, start: startMs, projectEnd };
}

/** ¿La tarea está en ruta crítica? (slack 0 = está sobre el camino más largo). */
function criticalSet(flat: LibXAITask[], finish: Map<string, number>, projectEnd: number): Set<string> {
  const byId = new Map(flat.map((t) => [t.id, t]));
  const succ = new Map<string, string[]>();
  for (const t of flat) for (const dep of depIds(t)) {
    if (!succ.has(dep)) succ.set(dep, []);
    succ.get(dep)!.push(t.id);
  }
  // latestFinish hacia atrás desde projectEnd.
  const latestFinish = new Map<string, number>();
  const order = [...flat].sort((a, b) => (finish.get(b.id) ?? 0) - (finish.get(a.id) ?? 0));
  for (const t of order) {
    const s = succ.get(t.id) ?? [];
    if (s.length === 0) latestFinish.set(t.id, projectEnd);
    else {
      let minLS = Infinity;
      for (const sid of s) {
        const lf = latestFinish.get(sid);
        const sd = byId.get(sid);
        if (lf != null && sd) minLS = Math.min(minLS, lf - durationDays(sd) * DAY);
      }
      latestFinish.set(t.id, minLS === Infinity ? projectEnd : minLS);
    }
  }
  const crit = new Set<string>();
  for (const t of flat) {
    const slack = (latestFinish.get(t.id) ?? 0) - (finish.get(t.id) ?? 0);
    if (Math.abs(slack) < DAY / 2 && depIds(t).length + (succ.get(t.id)?.length ?? 0) > 0) crit.add(t.id);
  }
  return crit;
}

/**
 * Simula mover una tarea a [newStart, newEnd]. Devuelve el impacto SIN persistir.
 */
export function simulateReschedule(
  tasks: LibXAITask[],
  taskId: string,
  newStart: Date,
  newEnd: Date,
): RescheduleSimulation | null {
  const flat = flatten(tasks);
  const moved = flat.find((t) => t.id === taskId);
  if (!moved || !moved.startDate || !moved.endDate) return null;

  const oldStart = new Date(moved.startDate);
  const oldEnd = new Date(moved.endDate);

  // Estado ANTES.
  const before = computeSchedule(flat, new Map());
  const critBefore = criticalSet(flat, before.finish, before.projectEnd);

  // Estado DESPUÉS: la duración nueva la fija newEnd-newStart; recomputamos
  // forzando el inicio de la tarea movida (las sucesoras se recolocan solas).
  const flatAfter = flat.map((t) => t.id === taskId
    ? { ...t, startDate: newStart, endDate: newEnd }
    : t);
  const after = computeSchedule(flatAfter, new Map([[taskId, newStart.getTime()]]));
  const critAfter = criticalSet(flatAfter, after.finish, after.projectEnd);

  // Sucesoras que cambiaron de fecha.
  const byIdAfter = new Map(flatAfter.map((t) => [t.id, t]));
  const movedSuccessors: RescheduleSimulation['movedSuccessors'] = [];
  for (const t of flat) {
    if (t.id === taskId) continue;
    const bStart = before.start.get(t.id);
    const aStart = after.start.get(t.id);
    if (bStart != null && aStart != null && Math.abs(aStart - bStart) >= DAY / 2) {
      const dur = durationDays(byIdAfter.get(t.id)!) * DAY;
      movedSuccessors.push({
        id: t.id,
        name: t.name,
        newStart: new Date(aStart),
        newEnd: new Date(aStart + dur),
      });
    }
  }

  const projectEndDeltaDays = Math.round((after.projectEnd - before.projectEnd) / DAY);
  const slackDays = (() => {
    // holgura de la tarea movida antes del cambio.
    const crit = critBefore.has(taskId);
    return crit ? 0 : Math.max(0, Math.round((before.projectEnd - (before.finish.get(taskId) ?? 0)) / DAY));
  })();

  return {
    taskId,
    oldStart, oldEnd, newStart, newEnd,
    movedSuccessors,
    projectEndDeltaDays,
    oldProjectEnd: new Date(before.projectEnd),
    newProjectEnd: new Date(after.projectEnd),
    wasCritical: critBefore.has(taskId),
    stillCritical: critAfter.has(taskId),
    slackDays,
  };
}
