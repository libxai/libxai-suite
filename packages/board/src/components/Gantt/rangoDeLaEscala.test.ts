import { describe, it, expect } from 'vitest';
import { inicioDeLaEscala } from './rangoDeLaEscala';

const dia = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;

describe('inicioDeLaEscala (QA Asakaa E13)', () => {
  it('Semana empieza en lunes, sea cual sea el día', () => {
    expect(dia(inicioDeLaEscala(new Date(2026, 8, 19), 'week'))).toBe('2026-9-14 0:0'); // sábado 19 sep → lunes 14
    expect(dia(inicioDeLaEscala(new Date(2026, 8, 20), 'week'))).toBe('2026-9-14 0:0'); // domingo
    expect(dia(inicioDeLaEscala(new Date(2026, 8, 14, 15, 30), 'week'))).toBe('2026-9-14 0:0'); // lunes con hora
  });

  it('Mes empieza el día 1', () => {
    expect(dia(inicioDeLaEscala(new Date(2026, 8, 18), 'month'))).toBe('2026-9-1 0:0');
  });

  it('Día solo quita la hora', () => {
    expect(dia(inicioDeLaEscala(new Date(2026, 8, 18, 9, 45), 'day'))).toBe('2026-9-18 0:0');
  });

  it('la columna «oct» cae en el 1 de octubre: una tarea del 14 oct queda 13 días dentro', () => {
    const inicio = inicioDeLaEscala(new Date(2026, 8, 18), 'month');
    const oct = new Date(inicio); oct.setMonth(oct.getMonth() + 1);
    const tarea = new Date(2026, 9, 14);
    expect(Math.round((tarea.getTime() - oct.getTime()) / 864e5)).toBe(13);
  });
});
