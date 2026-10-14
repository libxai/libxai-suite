/**
 * El avance de un conjunto de tareas · UNA sola fórmula en la librería.
 *
 * Movida desde ListView (1.9.46, QA Asakaa E4) para que el Gantt la use también
 * (1.9.47, QA Asakaa E6: «Integraciones APPS figura 100 % en el reporte y 58–60 %
 * en Gantt y Tablero»; el Gantt hacía la MEDIA SIMPLE de las hijas).
 */
import type { Task } from '../components/Gantt/types';

export type HojaConAvance = { progress: number; weight: number; effort_minutes?: number | null; sold_effort_minutes?: number | null };

/**
 * QA de Asakaa (8-oct), E4 · ES LA FÓRMULA DE LA BASE (sql/319 progress_pct), copia
 * exacta, y la del front de la app (src/lib/avanceFisico.ts):
 *   1) pesos manuales si suman ≥ 99 y los tienen ≥ 95 % de las hojas;
 *   2) si no, ponderado por effort_minutes ?? sold_effort_minutes ?? 60;
 *   3) sin hojas, 0. Redondeado a ENTERO.
 * Antes: `effort || 60` (0 h pesaba 60), sin respaldo en las horas vendidas, un
 * camino de media simple y un decimal: Roadmap Asakaa daba 99,3 % aquí y 99 % en
 * el Portafolio.
 */
export function computeWeightedProgress(leaves: HojaConAvance[]): number {
  if (leaves.length === 0) return 0;

  const conPeso = leaves.filter((l) => (l.weight || 0) > 0);
  const sumaPesos = conPeso.reduce((s, l) => s + l.weight, 0);
  if (sumaPesos >= 99 && conPeso.length / leaves.length >= 0.95) {
    return Math.round(conPeso.reduce((s, l) => s + (l.progress || 0) * l.weight, 0) / sumaPesos);
  }

  const peso = (l: HojaConAvance) => l.effort_minutes ?? l.sold_effort_minutes ?? 60;
  const den = leaves.reduce((s, l) => s + peso(l), 0);
  if (den > 0) {
    return Math.round(leaves.reduce((s, l) => s + (l.progress || 0) * peso(l), 0) / den);
  }
  return 0;
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
      });
    }
  }
  return out;
}
