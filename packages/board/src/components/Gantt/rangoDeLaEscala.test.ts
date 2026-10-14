import { describe, it, expect } from 'vitest';
import { conHoy, fechaAlAbrir, inicioDeLaEscala, ladoDeHoy } from './rangoDeLaEscala';

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

describe('Hoy en el Gantt (QA Asakaa E16)', () => {
  const sep2 = new Date(2026, 8, 2), sep17 = new Date(2026, 8, 17), oct8 = new Date(2026, 9, 8);

  it('el rango siempre incluye hoy, aunque el proyecto ya haya terminado', () => {
    const r = conHoy(sep2, sep17, oct8);
    expect([dia(r.inicio), dia(r.fin)]).toEqual([dia(sep2), dia(oct8)]);
    const antes = conHoy(oct8, new Date(2026, 11, 1), sep2);
    expect(dia(antes.inicio)).toBe(dia(sep2));
  });

  it('abre en hoy si cae dentro de las tareas; si no, en el borde más cercano', () => {
    expect(dia(fechaAlAbrir(sep2, new Date(2026, 11, 1), oct8))).toBe(dia(oct8));
    expect(dia(fechaAlAbrir(sep2, sep17, oct8))).toBe(dia(sep17));   // proyecto terminado: las últimas barras
    expect(dia(fechaAlAbrir(oct8, new Date(2026, 11, 1), sep2))).toBe(dia(oct8)); // aún no empieza: las primeras
    expect(dia(fechaAlAbrir(null, null, oct8))).toBe(dia(oct8));
  });

  it('la píldora sabe de qué lado queda hoy', () => {
    expect(ladoDeHoy(50, 100, 900)).toBe('left');
    expect(ladoDeHoy(1200, 100, 900)).toBe('right');
    expect(ladoDeHoy(500, 100, 900)).toBeNull();
  });
});
