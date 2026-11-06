import { describe, it, expect } from 'vitest';
import { paginar, PAPELES } from './exportarDocumento';

describe('paginar el Gantt (A22)', () => {
  it('cabe en una página', () => {
    expect(paginar(2000, 1000, 200, 150, 120, 80)).toEqual([{ desde: 120, alto: 880 }]);
  });
  it('corta por filas enteras: ninguna tarea sale partida', () => {
    /* 10 px/mm: una página da 1500 px, 1380 de cuerpo tras la cabecera: 17 filas de 80 */
    const cortes = paginar(2000, 4120, 200, 150, 120, 80);
    expect(cortes.map((c) => c.alto % 80)).toEqual(cortes.map(() => 0));
    expect(cortes[0]).toEqual({ desde: 120, alto: 1360 });
  });
  it('los cortes cubren toda la imagen, sin huecos ni solapes', () => {
    const cortes = paginar(2000, 5000, 200, 150, 120, 80);
    expect(cortes[0]!.desde).toBe(120);
    cortes.slice(1).forEach((c, i) => expect(c.desde).toBe(cortes[i]!.desde + cortes[i]!.alto));
    const ultimo = cortes[cortes.length - 1]!;
    expect(ultimo.desde + ultimo.alto).toBe(5000);
  });
  it('una fila más alta que la página no cuelga', () => {
    const cortes = paginar(100, 3000, 200, 150, 10, 2000);
    expect(cortes.length).toBeGreaterThan(0);
    expect(cortes.length).toBeLessThan(5);
  });
  it('los papeles van apaisados', () => {
    for (const p of Object.values(PAPELES)) expect(p.ancho).toBeGreaterThan(p.alto);
  });
});
