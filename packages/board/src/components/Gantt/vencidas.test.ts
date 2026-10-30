import { describe, it, expect } from 'vitest';
import { esVencida, vencidasDebajo } from './vencidas';
import type { Task } from './types';

const hoy = new Date(2026, 9, 30, 15);
const t = (fin: Date, progress = 0, extra: Partial<Task> = {}) => ({ id: String(Math.random()), name: 'x', startDate: fin, endDate: fin, progress, ...extra } as Task);

describe('R4 · vencidas', () => {
  it('vencida: sin terminar y con el fin antes de hoy; hoy aún no', () => {
    expect(esVencida(t(new Date(2026, 9, 29)), hoy)).toBe(true);
    expect(esVencida(t(new Date(2026, 9, 30)), hoy)).toBe(false);
    expect(esVencida(t(new Date(2026, 9, 29), 100), hoy)).toBe(false);
    expect(esVencida(t(new Date(2026, 9, 29), 40, { status: 'completed' }), hoy)).toBe(false);
  });
  it('un grupo cuenta sus hojas vencidas, a cualquier profundidad', () => {
    const g = { subtasks: [t(new Date(2026, 8, 1)), { ...t(new Date(2026, 8, 1)), subtasks: [t(new Date(2026, 7, 1)), t(new Date(2026, 11, 1))] }] } as Task;
    expect(vencidasDebajo(g, hoy)).toBe(2);
  });
});
