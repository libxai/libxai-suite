/**
 * QA Asakaa · mejora fuerte 5 · el motor del cronograma: días hábiles con festivos, los
 * cuatro tipos de enlace con desfase, empujar sin adelantar y los conflictos.
 *
 * Calendario de las pruebas: lunes a viernes; el lunes 12-oct-2026 es festivo.
 *   oct 2026:  L5 M6 X7 J8 V9 | S10 D11 | L12(festivo) M13 X14 J15 V16 | S17 D18 | L19 …
 */
import { describe, it, expect } from 'vitest';
import { pasaDeSuLimite, holguras, moverConservandoHabiles,
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

describe('moverConservandoHabiles (G12)', () => {
  const lv = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false] });
  const d = (m: number, dia: number) => new Date(2026, m - 1, dia);
  const ymd = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
  const antes = { inicio: d(11, 3), fin: d(11, 6) }; // martes a viernes: 4 días hábiles

  it('mover dos días conserva los 4 hábiles y no acaba en domingo', () => {
    const r = moverConservandoHabiles(antes, d(11, 5), d(11, 8), lv);
    expect([ymd(r.inicio), ymd(r.fin)]).toEqual(['11/5', '11/10']);
  });
  it('soltar en fin de semana lleva al lunes; hacia atrás, al viernes', () => {
    expect(ymd(moverConservandoHabiles(antes, d(11, 7), d(11, 10), lv).inicio)).toBe('11/9');
    const atras = moverConservandoHabiles({ inicio: d(11, 10), fin: d(11, 13) }, d(11, 8), d(11, 11), lv);
    expect(ymd(atras.inicio)).toBe('11/6');
  });
  it('estirar no se toca: manda lo que se soltó', () => {
    const r = moverConservandoHabiles(antes, d(11, 3), d(11, 12), lv);
    expect(ymd(r.fin)).toBe('11/12');
    const izquierda = moverConservandoHabiles(antes, d(11, 2), d(11, 6), lv);
    expect(ymd(izquierda.inicio)).toBe('11/2');
  });
  it('un hito sigue siendo de un día', () => {
    const r = moverConservandoHabiles({ inicio: d(11, 3), fin: d(11, 3) }, d(11, 5), d(11, 5), lv);
    expect([ymd(r.inicio), ymd(r.fin)]).toEqual(['11/5', '11/5']);
  });
});

describe('holguras (A19)', () => {
  const lv = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false] });
  const d = (m: number, dia: number) => new Date(2026, m - 1, dia);
  const t = (id: string, ini: Date, fin: Date, extra: Partial<Task> = {}): Task => ({ id, name: id, startDate: ini, endDate: fin, progress: 0, ...extra } as Task);

  it('la cadena más larga es crítica; la paralela tiene su holgura en días hábiles', () => {
    /* A 2–6 nov → B 9–13 nov (FS). C 2–4 nov, suelta: puede correrse hasta el 13, 7 días hábiles. */
    const r = holguras([t('A', d(11, 2), d(11, 6)), t('B', d(11, 9), d(11, 13), { dependencies: ['A'] }), t('C', d(11, 2), d(11, 4))], lv);
    expect(r.get('A')).toMatchObject({ total: 0, critica: true });
    expect(r.get('B')).toMatchObject({ total: 0, critica: true });
    expect(r.get('C')).toMatchObject({ total: 7, critica: false });
  });
  it('los fines de semana no cuentan como holgura', () => {
    const r = holguras([t('A', d(11, 2), d(11, 13)), t('C', d(11, 6), d(11, 6))], lv);
    expect(r.get('C')?.total).toBe(5); /* del viernes 6 al viernes 13: 5 hábiles, no 7 */
  });
  it('el desfase consume holgura', () => {
    /* A acaba el 4; B empieza el 9 con desfase de 2 (5 y 6): no le queda margen. */
    const conLag = holguras([t('A', d(11, 2), d(11, 4)), t('B', d(11, 9), d(11, 13), { dependencyLinks: [{ id: 'A', type: 'FS', lag: 2 }] })], lv);
    expect(conLag.get('A')?.total).toBe(0);
    const sinLag = holguras([t('A', d(11, 2), d(11, 4)), t('B', d(11, 9), d(11, 13), { dependencies: ['A'] })], lv);
    expect(sinLag.get('A')?.total).toBe(2);
  });
  it('SS y FF limitan por su lado', () => {
    /* SS: B debe empezar como pronto cuando A. A puede empezar tan tarde como B. */
    const ss = holguras([t('A', d(11, 2), d(11, 3)), t('B', d(11, 4), d(11, 6), { dependencyLinks: [{ id: 'A', type: 'SS', lag: 0 }] })], lv);
    expect(ss.get('A')?.total).toBe(2);
    /* FF: A no puede acabar después que B. */
    const ff = holguras([t('A', d(11, 2), d(11, 3)), t('B', d(11, 2), d(11, 6), { dependencyLinks: [{ id: 'A', type: 'FF', lag: 0 }] })], lv);
    expect(ff.get('A')?.total).toBe(3);
  });
  it('la holgura libre no pasa de lo que deja la sucesora', () => {
    /* A acaba el 3; B empieza el 5: 1 día libre. C (después de B) es lo último. */
    const r = holguras([t('A', d(11, 2), d(11, 3)), t('B', d(11, 5), d(11, 6), { dependencies: ['A'] }), t('X', d(11, 2), d(11, 13))], lv);
    expect(r.get('A')?.libre).toBe(1);
    expect(r.get('A')?.total).toBe(6);
  });
  it('una hija no se libra del límite de su fase', () => {
    /* Fase con una sucesora que arranca justo después: su hija corta, dentro, tiene hueco hasta el fin de la fase y nada más. */
    const fase = t('F', d(11, 2), d(11, 6), { subtasks: [t('h1', d(11, 2), d(11, 6)), t('h2', d(11, 2), d(11, 3))] });
    const r = holguras([fase, t('S', d(11, 9), d(11, 13), { dependencies: ['F'] })], lv);
    expect(r.get('h2')?.total).toBe(3);
    expect(r.get('h1')?.critica).toBe(true);
  });
  it('un ciclo no cuelga', () => {
    const r = holguras([t('A', d(11, 2), d(11, 3), { dependencies: ['B'] }), t('B', d(11, 4), d(11, 5), { dependencies: ['A'] })], lv);
    expect(r.size).toBe(2);
  });
  it('sin fechas no hay nada que calcular', () => {
    expect(holguras([{ id: 'x', name: 'x', progress: 0 } as Task], lv).size).toBe(0);
  });
});

describe('restricciones y fijadas (A17)', () => {
  const lv = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false] });
  const d = (m: number, dia: number) => new Date(2026, m - 1, dia);
  const t = (id: string, ini: Date, fin: Date, extra: Partial<Task> = {}): Task => ({ id, name: id, startDate: ini, endDate: fin, progress: 0, ...extra } as Task);

  it('«no antes de» corre la tarea conservando sus días hábiles, y dice que es una restricción', () => {
    const a = t('A', d(11, 3), d(11, 6), { noAntesDe: d(11, 10) });
    const r = fechasQueCumplen(a, d(11, 3), d(11, 6), [a], lv);
    expect([r.inicio.getDate(), r.fin.getDate()]).toEqual([10, 13]);
    expect(r.porQue?.restriccion).toBe(true);
  });
  it('una restricción cumplida no mueve nada', () => {
    const a = t('A', d(11, 12), d(11, 13), { noAntesDe: d(11, 10) });
    expect(fechasQueCumplen(a, d(11, 12), d(11, 13), [a], lv).porQue).toBeNull();
  });
  it('un enlace también puede correrla más allá de su restricción', () => {
    const p = t('P', d(11, 2), d(11, 20));
    const a = t('A', d(11, 3), d(11, 4), { noAntesDe: d(11, 10), dependencies: ['P'] });
    expect(fechasQueCumplen(a, d(11, 3), d(11, 4), [p, a], lv).inicio.getDate()).toBe(23);
  });
  it('una fijada no se empuja: el enlace queda como conflicto', () => {
    const p = t('P', d(11, 2), d(11, 10));
    const s = t('S', d(11, 4), d(11, 5), { dependencies: ['P'], fijada: true });
    expect(empujarSucesoras([p, s], ['P'], lv)).toEqual([]);
    expect(conflictosDelCronograma([p, s], lv).map((c) => c.sucesora.id)).toEqual(['S']);
  });
  it('la cadena se corta en la fijada', () => {
    const p = t('P', d(11, 2), d(11, 10));
    const f = t('F', d(11, 4), d(11, 5), { dependencies: ['P'], fijada: true });
    const n = t('N', d(11, 6), d(11, 6), { dependencies: ['F'] });
    expect(empujarSucesoras([p, f, n], ['P'], lv)).toEqual([]);
  });
  it('terminar el: se sabe si la tarea se pasa, y el mismo día no es pasarse', () => {
    expect(pasaDeSuLimite(t('A', d(11, 3), d(11, 6), { terminarEl: d(11, 5) }))).toBe(true);
    expect(pasaDeSuLimite(t('A', d(11, 3), d(11, 6), { terminarEl: d(11, 6) }))).toBe(false);
    expect(pasaDeSuLimite(t('A', d(11, 3), d(11, 6)))).toBe(false);
  });
});
