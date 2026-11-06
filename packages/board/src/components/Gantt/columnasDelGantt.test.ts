import { describe, it, expect } from 'vitest';
import { costoEstimado, minutosEstimados, textoDeColumna, tonoDeColumna, variacion, type ContextoDeColumnas } from './columnasDelGantt';
import { calendarioDe } from './motorDeProgramacion';
import type { Task } from './types';

const cal = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false] });
const d = (m: number, dia: number) => new Date(2026, m - 1, dia);
const t = (extra: Partial<Task> = {}): Task => ({ id: 'x', name: 'x', progress: 0, startDate: d(11, 3), endDate: d(11, 6), ...extra } as Task);
const c: ContextoDeColumnas = { cal, es: true, wbsDe: new Map([['a', '3.1'], ['b', '4']]), tarifa: () => 100, dinero: (n) => `$${n}` };

describe('columnas del Gantt', () => {
  it('duración en días hábiles', () => {
    expect(textoDeColumna('duration', t({ startDate: d(11, 6), endDate: d(11, 9) }), c)).toBe('2 d');
    expect(textoDeColumna('duration', t({ startDate: undefined, endDate: undefined }), c)).toBe('—');
  });
  it('predecesoras con WBS; FS sin desfase va limpio, lo demás se escribe', () => {
    expect(textoDeColumna('predecessors', t({ dependencies: ['a'] }), c)).toBe('3.1');
    expect(textoDeColumna('predecessors', t({ dependencyLinks: [{ id: 'a', type: 'FS', lag: 2 }, { id: 'b', type: 'SS', lag: -1 }] }), c)).toBe('3.1FS+2, 4SS-1');
    expect(textoDeColumna('predecessors', t(), c)).toBe('—');
  });
  it('una predecesora filtrada no rompe la celda', () => {
    expect(textoDeColumna('predecessors', t({ dependencies: ['fuera'] }), c)).toBe('?');
  });
  it('horas y costo: una fase suma a sus hijas', () => {
    const fase = t({ subtasks: [t({ effortMinutes: 90 }), t({ effortMinutes: 30 })], effortMinutes: 999 });
    expect(minutosEstimados(fase)).toBe(120);
    expect(textoDeColumna('hours', fase, c)).toBe('2 h');
    expect(costoEstimado(fase, () => 100)).toBe(200);
    expect(textoDeColumna('cost', fase, c)).toBe('$200');
  });
  it('sin tarifa no se inventa un costo', () => {
    expect(textoDeColumna('cost', t({ effortMinutes: 60 }), { ...c, tarifa: undefined })).toBe('—');
  });
  it('holgura: solo en tareas de trabajo y en rojo si es cero', () => {
    const cpm = { earlyStart: 0, earlyFinish: 0, lateStart: 0, lateFinish: 0, totalFloat: 0, freeFloat: 0, isCritical: true };
    expect(textoDeColumna('slack', t({ cpmData: cpm }), c)).toBe('0 d');
    expect(tonoDeColumna('slack', t({ cpmData: cpm }), cal)).toBe('rojo');
    expect(textoDeColumna('slack', t({ cpmData: cpm, subtasks: [t()] }), c)).toBe('—');
  });
  it('variación en días hábiles, con signo y color', () => {
    expect(variacion(t({ baselineEndDate: d(11, 5), endDate: d(11, 10) }), cal)).toBe(3);
    expect(textoDeColumna('variance', t({ baselineEndDate: d(11, 5), endDate: d(11, 10) }), c)).toBe('+3 d');
    expect(textoDeColumna('variance', t({ baselineEndDate: d(11, 10), endDate: d(11, 5) }), c)).toBe('-3 d');
    expect(tonoDeColumna('variance', t({ baselineEndDate: d(11, 10), endDate: d(11, 5) }), cal)).toBe('verde');
    expect(tonoDeColumna('variance', t({ baselineEndDate: d(11, 6), endDate: d(11, 6) }), cal)).toBeNull();
  });
  it('sin línea base no hay variación, y no es cero', () => {
    expect(variacion(t(), cal)).toBeNull();
    expect(textoDeColumna('variance', t(), c)).toBe('—');
    expect(textoDeColumna('baselineEnd', t(), c)).toBe('—');
  });
});
