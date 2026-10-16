import { describe, it, expect } from 'vitest';
import { anchoDelDia, conHoy, fechaAlAbrir, inicioDeLaEscala, ladoDeHoy, ladoFueraDeVista } from './rangoDeLaEscala';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

describe('mejora fuerte 6 · una sola lógica de escala', () => {
  it('el ancho de un día por escala', () => {
    expect([anchoDelDia('day'), anchoDelDia('week'), anchoDelDia('month')]).toEqual([60, 20, 8]);
  });
  it('ningún fichero del Gantt vuelve a copiar la fórmula (la copia distinta fue E13)', () => {
    for (const f of readdirSync(__dirname).filter((x) => /\.(ts|tsx)$/.test(x) && !x.includes('.test.') && x !== 'rangoDeLaEscala.ts')) {
      const s = readFileSync(join(__dirname, f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(s, `${f} copia el ancho por escala`).not.toMatch(/'week' \? 20 : 8/);
    }
  });
});

describe('mejora fuerte 6 · abrir en hoy o en la primera tarea pendiente', () => {
  const ene = new Date(2026, 0, 5), mar = new Date(2026, 2, 30), feb = new Date(2026, 1, 10), oct = new Date(2026, 9, 16);
  it('hoy dentro de las tareas: hoy', () => {
    expect(dia(fechaAlAbrir(ene, oct, new Date(2026, 5, 1), feb))).toBe(dia(new Date(2026, 5, 1)));
  });
  it('hoy fuera: la primera pendiente (no el borde)', () => {
    expect(dia(fechaAlAbrir(ene, mar, oct, feb))).toBe(dia(feb));
  });
  it('sin pendientes (todo terminado): el borde más cercano, como antes', () => {
    expect(dia(fechaAlAbrir(ene, mar, oct, null))).toBe(dia(mar));
  });
});

describe('mejora fuerte 6 · barra fuera de vista', () => {
  it('a la izquierda, a la derecha o visible (aunque sea un trozo)', () => {
    expect(ladoFueraDeVista(10, 90, 100, 500)).toBe('left');
    expect(ladoFueraDeVista(510, 600, 100, 500)).toBe('right');
    expect(ladoFueraDeVista(80, 120, 100, 500)).toBeNull();
    expect(ladoFueraDeVista(450, 700, 100, 500)).toBeNull();
  });
});
