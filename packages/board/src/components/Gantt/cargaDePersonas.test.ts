import { describe, it, expect } from 'vitest';
import { inicialesDeLaBarra, tareasSobreasignadas } from './cargaDePersonas';
import { calendarioDe } from './motorDeProgramacion';
import type { Task } from './types';

const lv = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false] });
const d = (m: number, dia: number) => new Date(2026, m - 1, dia);
const ana = { id: 'a', name: 'Ana', initials: 'AN', color: '#000' };
const luis = { id: 'l', name: 'Luis', initials: 'LU', color: '#000' };
const t = (id: string, extra: Partial<Task>): Task => ({ id, name: id, progress: 0, startDate: d(11, 2), endDate: d(11, 6), assignees: [ana], ...extra } as Task);

describe('sobreasignación (A20)', () => {
  it('dos tareas de 8 h al día el mismo día son demasiado', () => {
    const r = tareasSobreasignadas([t('x', { effortMinutes: 2400 }), t('y', { effortMinutes: 2400 })], lv, 480);
    expect([...r].sort()).toEqual(['x', 'y']);
  });
  it('justo la jornada no es sobreasignar', () => {
    expect(tareasSobreasignadas([t('x', { effortMinutes: 2400 })], lv, 480).size).toBe(0);
  });
  it('solo cuentan los días que se pisan', () => {
    const r = tareasSobreasignadas([
      t('x', { effortMinutes: 2400 }),
      t('y', { effortMinutes: 960, startDate: d(11, 9), endDate: d(11, 10) }),
    ], lv, 480);
    expect(r.size).toBe(0);
  });
  it('dos responsables se reparten las horas', () => {
    expect(tareasSobreasignadas([t('x', { effortMinutes: 4800, assignees: [ana, luis] })], lv, 480).size).toBe(0);
  });
  it('lo terminado y lo que no tiene horas no carga a nadie', () => {
    const r = tareasSobreasignadas([t('x', { effortMinutes: 2400 }), t('y', { effortMinutes: 2400, progress: 100 }), t('z', {})], lv, 480);
    expect(r.size).toBe(0);
  });
  it('una fase no suma: suman sus hijas', () => {
    const fase = t('f', { effortMinutes: 99999, subtasks: [t('h', { effortMinutes: 2400 })] });
    expect(tareasSobreasignadas([fase], lv, 480).size).toBe(0);
  });
  it('una lista ya aplanada no cuenta dos veces a las hijas', () => {
    const hija = t('h', { effortMinutes: 2400 });
    expect(tareasSobreasignadas([t('f', { subtasks: [hija] }), hija], lv, 480).size).toBe(0);
  });
  it('los fines de semana no reciben horas', () => {
    expect(tareasSobreasignadas([t('x', { startDate: d(11, 6), endDate: d(11, 9), effortMinutes: 960 })], lv, 480).size).toBe(0);
  });
});

describe('iniciales en la barra', () => {
  it('uno, varios o nadie', () => {
    expect(inicialesDeLaBarra({ assignees: [ana] })).toBe('AN');
    expect(inicialesDeLaBarra({ assignees: [ana, luis] })).toBe('AN +1');
    expect(inicialesDeLaBarra({})).toBe('');
  });
});
