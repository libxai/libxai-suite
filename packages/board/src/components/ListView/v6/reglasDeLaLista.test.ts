import { describe, it, expect } from 'vitest';
import type { Task } from '../../Gantt/types';
import { calendarioDe } from '../../Gantt/motorDeProgramacion';
import { cifrasDe, diasDeRetraso, duracionHabil, estadoDe, estaVencida, millones } from './reglasDeLaLista';

const d = (s: string) => new Date(`${s}T12:00:00`);
const hoja = (id: string, extra: Partial<Task> = {}): Task => ({ id, name: id, startDate: d('2026-10-13'), endDate: d('2026-10-28'), progress: 0, ...extra } as Task);
const padre = (id: string, subtasks: Task[]): Task => ({ id, name: id, progress: 0, subtasks } as Task);
/* lunes a viernes, con los festivos de Colombia de oct-nov 2026 */
const CAL = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false], holidayDates: new Set(['2026-10-12', '2026-11-02', '2026-11-16']) });
const HOY = d('2026-11-02');

describe('maquetas v3 · las reglas de la Lista', () => {
  it('B9 · el estado del padre sale de sus hojas', () => {
    expect(estadoDe(padre('p', [hoja('a', { status: 'completed' }), hoja('b', { status: 'completed' })]))).toBe('done');
    expect(estadoDe(padre('p', [hoja('a', { status: 'completed' }), hoja('b', { status: 'blocked' })]))).toBe('blocked');
    expect(estadoDe(padre('p', [hoja('a', { status: 'completed' }), hoja('b', { status: 'todo' })]))).toBe('prog');
    expect(estadoDe(padre('p', [hoja('a', { status: 'todo' }), hoja('b', { status: 'todo' })]))).toBe('todo');
  });

  it('vencida: hoja sin terminar con el fin pasado; el retraso, desde el día hábil siguiente', () => {
    const t = hoja('2.3', { status: 'in-progress', endDate: d('2026-10-28') });
    expect(estaVencida(t, HOY)).toBe(true);
    /* 29 y 30 oct (2-nov es festivo): «Vencida hace 2 días hábiles», como la maqueta */
    expect(diasDeRetraso(t, HOY, CAL)).toBe(2);
    expect(estaVencida(hoja('x', { status: 'completed', endDate: d('2026-10-20') }), HOY)).toBe(false);
  });

  it('la duración en días hábiles (1.1: 1 sep–11 sep = 9 d)', () => {
    expect(duracionHabil(hoja('1.1', { startDate: d('2026-09-01'), endDate: d('2026-09-11') }), CAL)).toBe(9);
  });

  it('P12 · las cifras de un padre son la suma de sus hojas, con el costo a la tarifa de cada una', () => {
    const p = padre('2', [
      hoja('2.1', { status: 'completed', timeLoggedMinutes: 64 * 60, effortMinutes: 60 * 60 } as Partial<Task>),
      hoja('2.3', { status: 'in-progress', timeLoggedMinutes: 36 * 60, effortMinutes: 40 * 60, endDate: d('2026-10-28') } as Partial<Task>),
    ]);
    const c = cifrasDe(p, () => 95000, HOY);
    expect(c).toMatchObject({ reg: 100, est: 100, hechas: 1, hojas: 2, vencidas: 1 });
    expect(c.costo).toBe(100 * 95000);
    expect(millones(c.costo, true)).toBe('$9,5 M');
  });
});
