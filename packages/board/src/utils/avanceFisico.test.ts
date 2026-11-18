/**
 * La regla única del avance (v4, 18-nov) · las pruebas de aceptación de la revisión de Yesid en producción (17-nov) y
 * lo que cambia a propósito respecto a la fórmula anterior.
 */
import { describe, it, expect } from 'vitest';
import { avanceDeTarea, collectLeaves, computeWeightedProgress, minutosQuePesa } from './avanceFisico';
import type { Task } from '../components/Gantt/types';

const tarea = (id: string, o: { progress?: number; horas?: number | null; vendidas?: number | null; status?: string; weight?: number; hijas?: Task[] } = {}) =>
  ({
    id, name: id, progress: o.progress ?? 0, status: o.status ?? 'todo', weight: o.weight ?? 0,
    effortMinutes: o.horas == null ? o.horas : o.horas * 60, soldEffortMinutes: o.vendidas == null ? null : o.vendidas * 60,
    subtasks: o.hijas, startDate: new Date(2026, 10, 2), endDate: new Date(2026, 10, 3),
  } as unknown as Task);

describe('regla v4: horas estimadas, 1 h sin estimar, completada = 100', () => {
  it('Yesid · «Atención a comentarios»: 1 de 4 completadas, todas sin estimar → 25 % (la Lista decía 0 %)', () => {
    const fase = tarea('3.3.17', { hijas: [tarea('a', { status: 'completed' }), tarea('b'), tarea('c'), tarea('d')] });
    expect(avanceDeTarea(fase)).toBe(25);
  });

  it('Yesid · P26025 Materialización: 21 de 74 h → 28 % (la Lista decía 100 %)', () => {
    const fase = tarea('1', { hijas: [tarea('a', { horas: 21, status: 'completed', progress: 100 }), tarea('b', { horas: 53 })] });
    expect(avanceDeTarea(fase)).toBe(28);
  });

  it('sin estimado o con 0 h pesa 1 h (antes un 0 explícito pesaba 0)', () => {
    expect(minutosQuePesa({ effort_minutes: null })).toBe(60);
    expect(minutosQuePesa({ effort_minutes: 0 })).toBe(60);
    expect(minutosQuePesa({ effort_minutes: 90 })).toBe(90);
    const fase = tarea('F', { hijas: [tarea('a', { horas: 0, status: 'completed' }), tarea('b', { horas: 0 })] });
    expect(avanceDeTarea(fase)).toBe(50);
  });

  it('las horas VENDIDAS ya no sustituyen al estimado (P26031 COMPRAS: 56 % en el Gantt por esto; v4 da 53 %)', () => {
    // una estimada de 1 h al 100 % y una sin estimar con 10 h vendidas al 0 %: antes 1/11 = 9 %; ahora 1 h y 1 h = 50 %
    const fase = tarea('F', { hijas: [tarea('a', { horas: 1, status: 'completed' }), tarea('b', { horas: null, vendidas: 10 })] });
    expect(avanceDeTarea(fase)).toBe(50);
  });

  it('una hoja COMPLETADA cuenta 100 aunque su porcentaje guardado diga otra cosa', () => {
    const fase = tarea('F', { hijas: [tarea('a', { horas: 2, status: 'done', progress: 40 }), tarea('b', { horas: 2 })] });
    expect(avanceDeTarea(fase)).toBe(50);
  });

  it('cuenta las HOJAS de toda la rama, no la media de las subfases', () => {
    const sub = tarea('S', { hijas: [tarea('x', { horas: 1, status: 'completed' }), tarea('y', { horas: 1 }), tarea('z', { horas: 1 })] });
    const fase = tarea('F', { hijas: [sub, tarea('w', { horas: 1, status: 'completed' })] });
    expect(avanceDeTarea(fase)).toBe(50);
  });

  it('los pesos manuales del coordinador (≥ 99 y en ≥ 95 % de las hojas) siguen mandando (sql/124)', () => {
    const hojas = collectLeaves([tarea('a', { weight: 80, status: 'completed' }), tarea('b', { weight: 20 })]);
    expect(computeWeightedProgress(hojas)).toBe(80);
  });

  it('una hoja: su propio avance; completada, 100', () => {
    expect(avanceDeTarea(tarea('h', { progress: 35 }))).toBe(35);
    expect(avanceDeTarea(tarea('h', { progress: 35, status: 'completed' }))).toBe(100);
  });

  it('sin hojas, 0', () => {
    expect(computeWeightedProgress([])).toBe(0);
  });
});
