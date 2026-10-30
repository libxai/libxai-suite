/**
 * Gantt ronda 2 (Yesid, 30-oct) · R4 · UNA regla de «vencida» para el filtro «Solo vencidas», el aviso «12 vencidas · Ver»
 * y el chip de un grupo plegado: sin terminar (ni estado completed ni 100 %) y con el fin ANTES de hoy (el día de hoy aún
 * no es retraso).
 */
import type { Task } from './types';

export function esVencida(t: Pick<Task, 'endDate' | 'progress' | 'status'>, hoy: Date = new Date()): boolean {
  if (!t.endDate) return false;
  if (t.status === 'completed' || (t.progress ?? 0) >= 100) return false;
  const finDelDia = new Date(t.endDate.getFullYear(), t.endDate.getMonth(), t.endDate.getDate()).getTime();
  return finDelDia < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
}

/** Cuántas hojas vencidas hay debajo de un grupo (para su chip cuando está plegado). */
export function vencidasDebajo(t: Pick<Task, 'subtasks'>, hoy: Date = new Date()): number {
  let n = 0;
  const recorrer = (ts?: Task[]) => {
    for (const h of ts ?? []) {
      if (h.subtasks?.length) recorrer(h.subtasks);
      else if (esVencida(h, hoy)) n++;
    }
  };
  recorrer(t.subtasks);
  return n;
}
