/**
 * Maquetas v3 de Yesid (4-nov) · LAS REGLAS DE LA LISTA v6, sin React (también para el Tablero).
 *
 *   · estado de una hoja: el suyo (Completada · En progreso · Bloqueada · Por hacer);
 *   · estado de un padre (B9, la misma regla en Gantt, Lista y Tablero): Completada si todas sus hojas lo están;
 *     Bloqueada si todas las abiertas están bloqueadas; En progreso si alguna avanza o ya terminó; si no, Por hacer;
 *   · vencida: hoja sin terminar cuyo fin ya pasó (G2 · B2 · C2); el retraso, en días hábiles DESDE el día siguiente;
 *   · las cifras de un padre salen SOLO de sus hojas (P12: «sumar solo los estimados de las hojas»).
 */
import type { Task } from '../../Gantt/types';
import { habilesEntre, type Calendario } from '../../Gantt/motorDeProgramacion';

export type EstadoV6 = 'done' | 'prog' | 'blocked' | 'todo';

const HECHA = new Set(['completed', 'complete', 'done', 'closed', 'finished']);
const EN_CURSO = new Set(['in-progress', 'in_progress', 'inprogress', 'doing', 'active']);
const BLOQUEADA = new Set(['blocked', 'bloqueada']);

export const tieneHijas = (t: Task): boolean => !!t.subtasks && t.subtasks.length > 0;

/** El estado de una hoja, de su `status` (y su avance, si el estado no dice nada). */
export function estadoDeHoja(t: Task): EstadoV6 {
  const s = String(t.status ?? '').trim().toLowerCase();
  if (HECHA.has(s) || (!s && (t.progress ?? 0) >= 100)) return 'done';
  if (BLOQUEADA.has(s)) return 'blocked';
  if (EN_CURSO.has(s)) return 'prog';
  return (t.progress ?? 0) > 0 ? 'prog' : 'todo';
}

export function hojasDe(t: Task, fuera: Task[] = []): Task[] {
  if (tieneHijas(t)) for (const h of t.subtasks!) hojasDe(h, fuera);
  else fuera.push(t);
  return fuera;
}

/** B9 · el estado de cualquier fila: el de la hoja, o el que sale de sus hojas. */
export function estadoDe(t: Task): EstadoV6 {
  if (!tieneHijas(t)) return estadoDeHoja(t);
  const hojas = hojasDe(t).map(estadoDeHoja);
  if (hojas.every((e) => e === 'done')) return 'done';
  const abiertas = hojas.filter((e) => e !== 'done');
  if (abiertas.length && abiertas.every((e) => e === 'blocked')) return 'blocked';
  if (hojas.some((e) => e === 'prog' || e === 'done')) return 'prog';
  return 'todo';
}

const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

/** Vencida: hoja sin terminar cuyo fin es anterior a hoy. */
export function estaVencida(t: Task, hoy: Date): boolean {
  if (tieneHijas(t) || !t.endDate || estadoDeHoja(t) === 'done') return false;
  return soloDia(new Date(t.endDate)).getTime() < soloDia(hoy).getTime();
}

/** Los días hábiles de retraso de una vencida: del día hábil siguiente a su fin hasta hoy, incluido (0 si no hay). */
export function diasDeRetraso(t: Task, hoy: Date, cal: Calendario): number {
  if (!estaVencida(t, hoy) || !t.endDate) return 0;
  const manana = soloDia(new Date(t.endDate));
  manana.setDate(manana.getDate() + 1);
  const h = soloDia(hoy);
  for (let d = new Date(manana); d.getTime() <= h.getTime(); d.setDate(d.getDate() + 1)) {
    if (cal.esHabil(d)) return habilesEntre(manana, h, cal);
  }
  return 0;
}

/** La duración de una fila en días hábiles (de su inicio a su fin, ambos incluidos). */
export function duracionHabil(t: Task, cal: Calendario): number | null {
  if (!t.startDate || !t.endDate) return null;
  return habilesEntre(soloDia(new Date(t.startDate)), soloDia(new Date(t.endDate)), cal);
}

export interface CifrasDeFila {
  /** horas registradas y estimadas (de las hojas) */
  reg: number;
  est: number;
  /** costo real: horas registradas × tarifa de la hoja */
  costo: number;
  /** hojas terminadas y en total (para «2/3») */
  hechas: number;
  hojas: number;
  /** hojas vencidas */
  vencidas: number;
}

/** P12 · las cifras de una fila: las de la hoja, o la suma de SUS hojas (nunca las del propio padre). */
export function cifrasDe(t: Task, tarifaDe: (hoja: Task) => number, hoy: Date): CifrasDeFila {
  const c: CifrasDeFila = { reg: 0, est: 0, costo: 0, hechas: 0, hojas: 0, vencidas: 0 };
  for (const h of hojasDe(t)) {
    const reg = ((h as { timeLoggedMinutes?: number }).timeLoggedMinutes ?? 0) / 60;
    c.reg += reg;
    c.est += ((h as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
    c.costo += reg * (tarifaDe(h) || 0);
    c.hojas += 1;
    if (estadoDeHoja(h) === 'done') c.hechas += 1;
    if (estaVencida(h, hoy)) c.vencidas += 1;
  }
  return c;
}

/** «$3,4 M» (como la maqueta: la columna dice la moneda; la celda, la cifra en millones con un decimal). */
export function millones(v: number, es: boolean): string {
  if (!v) return '—';
  const n = (v / 1e6).toFixed(1);
  return es ? `$${n.replace('.', ',')} M` : `$${n}M`;
}

/** «38», «36,5»: las horas con un decimal sólo si lo tienen. */
export function horasCortas(v: number, es: boolean): string {
  const r = Math.round(v * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return es ? s.replace('.', ',') : s;
}
