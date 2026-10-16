/**
 * QA Asakaa · mejora fuerte 5 · el motor del cronograma: días hábiles con festivos, los
 * cuatro tipos de enlace con desfase, empujar sin adelantar y los conflictos.
 *
 * Calendario de las pruebas: lunes a viernes; el lunes 12-oct-2026 es festivo.
 *   oct 2026:  L5 M6 X7 J8 V9 | S10 D11 | L12(festivo) M13 X14 J15 V16 | S17 D18 | L19 …
 */
import { describe, it, expect } from 'vitest';
import {
  calendarioDe, sumarHabiles, habilesEntre, finConDuracion, fechasQueCumplen, empujarSucesoras,
  conflictosDelCronograma, enlacesDe, TODOS_LOS_DIAS,
} from './motorDeProgramacion';
import type { Task } from './types';

const d = (dia: number, mes = 10) => new Date(2026, mes - 1, dia);
const iso = (x: Date) => `${x.getMonth() + 1}-${x.getDate()}`;
const CAL = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false], holidayDates: ['2026-10-12'] });

const tarea = (id: string, ini: number, fin: number, extra: Partial<Task> = {}): Task =>
  ({ id, name: id, progress: 0, startDate: d(ini), endDate: d(fin), ...extra });

describe('el calendario del espacio', () => {
  it('sumar días hábiles salta el fin de semana y el festivo', () => {
    expect(iso(sumarHabiles(d(9), 1, CAL))).toBe('10-13'); // V9 + 1 → M13 (S, D y el lunes festivo fuera)
    expect(iso(sumarHabiles(d(13), -1, CAL))).toBe('10-9');
    expect(iso(sumarHabiles(d(10), 0, CAL))).toBe('10-13'); // un sábado «+0» es el siguiente hábil
  });
  it('la duración cuenta solo días hábiles, los dos extremos incluidos', () => {
    expect(habilesEntre(d(8), d(14), CAL)).toBe(4); // J8 V9 M13 X14
    expect(iso(finConDuracion(d(8), 4, CAL))).toBe('10-14');
  });
  it('sin calendario (o sin ningún día laborable) todos los días cuentan, como antes', () => {
    expect(habilesEntre(d(8), d(14), TODOS_LOS_DIAS)).toBe(7);
    expect(habilesEntre(d(8), d(14), calendarioDe({ enabledWeekdays: [false, false, false, false, false, false, false] }))).toBe(7);
  });
});

describe('los cuatro tipos de enlace, con desfase', () => {
  const A = tarea('A', 5, 9); // L5 → V9
  it('FS: empieza el siguiente día hábil al fin (+ desfase)', () => {
    const B = tarea('B', 6, 7, { dependencies: ['A'] });
    expect(iso(fechasQueCumplen(B, d(6), d(7), [A, B], CAL).inicio)).toBe('10-13');
    const B2 = tarea('B', 6, 7, { dependencyLinks: [{ id: 'A', type: 'FS', lag: 2 }] });
    expect(iso(fechasQueCumplen(B2, d(6), d(7), [A, B2], CAL).inicio)).toBe('10-15'); // M13 +2 hábiles
  });
  it('SS: empieza cuando empieza la predecesora (+ desfase)', () => {
    const B = tarea('B', 1, 2, { dependencyLinks: [{ id: 'A', type: 'SS', lag: 1 }] });
    expect(iso(fechasQueCumplen(B, d(1), d(2), [A, B], CAL).inicio)).toBe('10-6');
  });
  it('FF: termina cuando termina la predecesora; conserva su duración', () => {
    const B = tarea('B', 5, 6, { dependencyLinks: [{ id: 'A', type: 'FF', lag: 0 }] }); // dura 2 hábiles
    const r = fechasQueCumplen(B, d(5), d(6), [A, B], CAL);
    expect([iso(r.inicio), iso(r.fin)]).toEqual(['10-8', '10-9']);
  });
  it('SF: termina cuando empieza la predecesora', () => {
    const B = tarea('B', 1, 2, { dependencyLinks: [{ id: 'A', type: 'SF', lag: 0 }] });
    expect(iso(fechasQueCumplen(B, d(1), d(2), [A, B], CAL).fin)).toBe('10-5');
  });
  it('desfase negativo = adelanto', () => {
    const B = tarea('B', 1, 1, { dependencyLinks: [{ id: 'A', type: 'FS', lag: -2 }] });
    expect(iso(fechasQueCumplen(B, d(1), d(1), [A, B], CAL).inicio)).toBe('10-8'); // V9 +1 −2 → J8
  });
  it('si ya cumple, no se toca (más tarde de lo exigido está bien)', () => {
    const B = tarea('B', 20, 21, { dependencies: ['A'] });
    const r = fechasQueCumplen(B, d(20), d(21), [A, B], CAL);
    expect(r.porQue).toBeNull();
    expect(iso(r.inicio)).toBe('10-20');
  });
  it('con varias predecesoras manda la más exigente', () => {
    const C = tarea('C', 13, 16);
    const B = tarea('B', 1, 1, { dependencyLinks: [{ id: 'A', type: 'FS', lag: 0 }, { id: 'C', type: 'FF', lag: 0 }] });
    const r = fechasQueCumplen(B, d(1), d(1), [A, B, C], CAL);
    expect(iso(r.fin)).toBe('10-16');
    expect(r.porQue?.predecesora.id).toBe('C');
  });
  it('un hito ocupa un solo día', () => {
    const H = tarea('H', 1, 3, { isMilestone: true, dependencies: ['A'] });
    const r = fechasQueCumplen(H, d(1), d(3), [A, H], CAL);
    expect([iso(r.inicio), iso(r.fin)]).toEqual(['10-13', '10-13']);
  });
  it('los ids sueltos de la lista vieja son FS sin desfase', () => {
    expect(enlacesDe({ dependencies: ['A', 'B'], dependencyLinks: [{ id: 'B', type: 'SS', lag: 3 }] }))
      .toEqual([{ id: 'A', type: 'FS', lag: 0 }, { id: 'B', type: 'SS', lag: 3 }]);
  });
});

describe('empujar, nunca adelantar', () => {
  it('si la predecesora se atrasa, las sucesoras se corren en cadena, lo justo', () => {
    const A = tarea('A', 5, 14); // se alargó hasta X14
    const B = tarea('B', 13, 14, { dependencies: ['A'] });
    const C = tarea('C', 15, 15, { dependencies: ['B'] });
    const r = empujarSucesoras([A, B, C], ['A'], CAL);
    const b = r.find((x) => x.id === 'B')!;
    const c = r.find((x) => x.id === 'C')!;
    expect([iso(b.startDate), iso(b.endDate)]).toEqual(['10-15', '10-16']);
    expect(iso(c.startDate)).toBe('10-19'); // tras el fin de semana
  });
  it('si la predecesora se adelanta, nadie se mueve', () => {
    const A = tarea('A', 1, 2);
    const B = tarea('B', 13, 14, { dependencies: ['A'] });
    expect(empujarSucesoras([A, B], ['A'], CAL)).toEqual([]);
  });
  it('un ciclo no cuelga', () => {
    const A = tarea('A', 5, 9, { dependencies: ['B'] });
    const B = tarea('B', 5, 9, { dependencies: ['A'] });
    expect(() => empujarSucesoras([A, B], ['A'], CAL)).not.toThrow();
  });
  it('también dentro de fases (subtareas)', () => {
    const A = tarea('A', 5, 14);
    const F = { ...tarea('F', 5, 20), subtasks: [tarea('B', 13, 14, { dependencies: ['A'] })] };
    expect(empujarSucesoras([A, F], ['A'], CAL).map((x) => x.id)).toEqual(['B']);
  });
});

describe('los conflictos', () => {
  it('nombra el enlace que no se cumple y cuántos días faltan', () => {
    const A = tarea('A', 5, 9);
    const B = tarea('B', 8, 9, { dependencies: ['A'] });
    const c = conflictosDelCronograma([A, B], CAL);
    expect(c).toHaveLength(1);
    expect(c[0].predecesora.id).toBe('A');
    expect(c[0].dias).toBe(2); // J8 → M13: J8, V9 y M13 hábiles → 2 de distancia
  });
  it('sin conflictos, lista vacía', () => {
    const A = tarea('A', 5, 9);
    const B = tarea('B', 13, 14, { dependencies: ['A'] });
    expect(conflictosDelCronograma([A, B], CAL)).toEqual([]);
  });
});
