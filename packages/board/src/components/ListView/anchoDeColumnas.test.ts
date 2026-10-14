import { describe, it, expect } from 'vitest';
import { anchoMinimoDeColumna, anchoMinimoDeLaTabla, NOMBRE_MINIMO } from './anchoDeColumnas';

describe('anchos mínimos de la Lista (QA Asakaa E39: cabeceras montadas)', () => {
  it('una columna no baja de su ancho de diseño', () => {
    expect(anchoMinimoDeColumna({ id: 'effortMinutes', type: 'effortMinutes', width: 100 })).toBe(100);
    expect(anchoMinimoDeColumna({ id: 'hoursBar', type: 'hoursBar', width: 200 })).toBe(200);
  });

  it('la de Nombre puede ceder hasta su mínimo, no más', () => {
    expect(anchoMinimoDeColumna({ id: 'name', type: 'name', width: 400 })).toBe(NOMBRE_MINIMO);
    expect(anchoMinimoDeColumna({ id: 'name', type: 'name', width: 180 })).toBe(180);
  });

  it('un minWidth explícito manda', () => {
    expect(anchoMinimoDeColumna({ id: 'x', width: 300, minWidth: 90 })).toBe(90);
  });

  it('la tabla suma columnas y huecos fijos', () => {
    expect(anchoMinimoDeLaTabla([
      { id: 'name', type: 'name', width: 300 },
      { id: 'effortMinutes', width: 100 },
      { id: 'timeLoggedMinutes', width: 100 },
      { id: 'progress', width: 100 },
    ], 48)).toBe(220 + 300 + 48);
  });
});
