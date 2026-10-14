import { describe, it, expect } from 'vitest';
import { rollUpParentDates } from './hierarchyUtils';
import type { Task } from './types';

const hoja = (id: string, progress: number, effortMinutes: number | null, soldEffortMinutes: number | null = null) =>
  ({ id, name: id, progress, effortMinutes, soldEffortMinutes, startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 2) } as unknown as Task);

describe('el avance de una fase en el Gantt = la fórmula de la base (QA Asakaa E6)', () => {
  it('Fase 2 de Torre Alpha: 28 % (ponderado por horas), no 36 % (media simple)', () => {
    const fase = { id: 'F2', name: 'Fase 2', progress: 0, subtasks: [
      hoja('a', 100, 5040), hoja('b', 45, 7560), hoja('c', 0, 9000), hoja('d', 0, 9000),
    ] } as Task;
    expect(rollUpParentDates([fase])[0].progress).toBe(28);
  });

  it('una hoja sin horas pesa 60 min (no 0): no da 100 % con trabajo pendiente', () => {
    const fase = { id: 'F', name: 'F', progress: 0, subtasks: [hoja('a', 100, 600), hoja('b', 0, null)] } as Task;
    expect(rollUpParentDates([fase])[0].progress).toBe(91); // 600·100 / 660
  });

  it('las subfases cuentan por sus HOJAS, no por la media de la subfase', () => {
    const sub = { id: 'S', name: 'S', progress: 0, subtasks: [hoja('x', 100, 60), hoja('y', 0, 60), hoja('z', 0, 60)] } as Task;
    const fase = { id: 'F', name: 'F', progress: 0, subtasks: [sub, hoja('w', 100, 60)] } as Task;
    expect(rollUpParentDates([fase])[0].progress).toBe(50); // 2 de 4 hojas iguales
  });
});
