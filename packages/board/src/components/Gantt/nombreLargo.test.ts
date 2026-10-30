import { describe, it, expect } from 'vitest';
import { partirNombre, rutaDelNombre } from './nombreLargo';

describe('R5 · nombres largos', () => {
  it('lo corto no se parte', () => {
    expect(partirNombre('Ensamble mecánico')).toEqual({ comienzo: 'Ensamble mecánico', cola: '' });
  });
  it('lo largo deja a la vista la parte que cambia, y juntos son el nombre', () => {
    const n = 'Amarillado en tableros MK y C&P – Bahía GENSA U2';
    const { comienzo, cola } = partirNombre(n);
    expect(comienzo + cola).toBe(n);
    expect(cola.trim()).toMatch(/GENSA U2$/);
    expect(cola.trim().length).toBeLessThanOrEqual(24);
  });
  it('el espacio del corte va con la cola: el comienzo nunca acaba en espacio (se perdía al pintarlo)', () => {
    for (const n of ['Monitoreo y Control del Proyecto', 'Revisión de documentación de entrada', 'Elaboración de informes para PPM',
      'Reuniones internas de seguimiento', 'Amarillado en tableros MK y C&P – Bahía GENSA U2']) {
      const { comienzo, cola } = partirNombre(n);
      expect(comienzo + cola).toBe(n);
      expect(comienzo).not.toMatch(/\s$/);
      if (cola) expect(cola).toMatch(/^\s/);
    }
  });
  it('la ruta lleva el código de cada antepasado', () => {
    expect(rutaDelNombre([{ name: 'Tablero 3', wbsCode: '6.3' }], 'Ensamble mecánico')).toBe('6.3 Tablero 3 › Ensamble mecánico');
  });
});
