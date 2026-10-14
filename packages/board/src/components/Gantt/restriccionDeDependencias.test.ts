import { describe, it, expect } from 'vitest';
import { ajustarAPredecesoras, primerDiaPosible } from './restriccionDeDependencias';
import type { Task } from './types';

const d = (m: number, dd: number) => new Date(2026, m - 1, dd);
const txt = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;
const tarea = (id: string, ini: Date, fin: Date, deps: string[] = []): Task =>
  ({ id, name: id, startDate: ini, endDate: fin, progress: 0, dependencies: deps } as Task);

const A = tarea('A', d(10, 14), d(10, 20));
const B = tarea('B', d(10, 10), d(10, 16));
const C = tarea('C', d(10, 21), d(10, 23), ['A', 'B']);
const fase = { ...tarea('F', d(10, 1), d(10, 30)), subtasks: [A, B] } as Task;
const todas = [fase, C];

describe('primerDiaPosible (QA Asakaa E14)', () => {
  it('es el día siguiente al fin de la predecesora más tardía, aunque esté dentro de una fase', () => {
    const p = primerDiaPosible(C, todas)!;
    expect(txt(p.fecha)).toBe('10/21');
    expect(p.predecesora.id).toBe('A');
  });
  it('sin predecesoras con fecha, nada', () => {
    expect(primerDiaPosible({ dependencies: [] }, todas)).toBeNull();
    expect(primerDiaPosible({ dependencies: ['no-existe'] }, todas)).toBeNull();
  });
});

describe('ajustarAPredecesoras', () => {
  it('arrastrar antes de la predecesora: se queda en el primer día posible, con el mismo largo, y lo dice', () => {
    const r = ajustarAPredecesoras(C, d(10, 15), d(10, 17), todas);
    expect([txt(r.inicio), txt(r.fin)]).toEqual(['10/21', '10/23']);
    expect(r.ajuste?.predecesora.id).toBe('A');
  });
  it('estirar solo el borde izquierdo: el fin se queda', () => {
    const r = ajustarAPredecesoras(C, d(10, 18), d(10, 23), todas);
    expect([txt(r.inicio), txt(r.fin)]).toEqual(['10/21', '10/23']);
  });
  it('en fecha válida no toca nada', () => {
    const r = ajustarAPredecesoras(C, d(10, 22), d(10, 24), todas);
    expect([txt(r.inicio), txt(r.fin), r.ajuste]).toEqual(['10/22', '10/24', null]);
  });
  it('la hora del día no cuenta: el 21 a las 00:00 vale aunque A termine el 20 a las 18:00', () => {
    const A2 = tarea('A', d(10, 14), new Date(2026, 9, 20, 18));
    const r = ajustarAPredecesoras(tarea('X', d(10, 1), d(10, 2), ['A']), d(10, 21), d(10, 22), [A2]);
    expect(r.ajuste).toBeNull();
  });
});
