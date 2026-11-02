import { describe, it, expect } from 'vitest';
import { partirNombre, prefijosConHermanas, rutaDelNombre } from './nombreLargo';

describe('R5 / ronda 3 A1 · nombres largos', () => {
  it('por defecto el corte va al final: el nombre entero en el comienzo, sin cola (no se pierde el verbo)', () => {
    expect(partirNombre('Submit a App Store y Play Store')).toEqual({ comienzo: 'Submit a App Store y Play Store', cola: '' });
    expect(partirNombre('Preparación de Assets para Stores', 3)).toEqual({ comienzo: 'Preparación de Assets para Stores', cola: '' });
  });

  it('hermanas que comparten el inicio: la cola empieza en la palabra donde se separan', () => {
    const nombres = [
      'Amarillado en tableros MK y C&P – Bahía GENSA U2',
      'Amarillado en tableros MK y C&P – Bahía Paipa U4',
      'Ensamble mecánico',
    ];
    const p = prefijosConHermanas(nombres);
    expect(p[2]).toBe(0);
    const { comienzo, cola } = partirNombre(nombres[0], p[0]);
    expect(comienzo).toBe('Amarillado en tableros MK y C&P – Bahía');
    expect(cola).toBe(' GENSA U2');
    expect(comienzo + cola).toBe(nombres[0]);
    expect(partirNombre(nombres[2], p[2]).cola).toBe('');
  });

  it('un inicio común corto (< 12) no parte el nombre', () => {
    const p = prefijosConHermanas(['Revisión de planos', 'Revisar contrato']);
    expect(p[0]).toBeLessThan(12);
    expect(partirNombre('Revisión de planos', p[0]).cola).toBe('');
  });

  it('el comienzo nunca acaba en espacio (se perdía al pintarlo)', () => {
    const p = prefijosConHermanas(['Monitoreo y Control del Proyecto A', 'Monitoreo y Control del Proyecto B']);
    const { comienzo, cola } = partirNombre('Monitoreo y Control del Proyecto A', p[0]);
    expect(comienzo).not.toMatch(/\s$/);
    expect(cola).toMatch(/^\s/);
  });

  it('la ruta lleva el código de cada antepasado', () => {
    expect(rutaDelNombre([{ name: 'Tablero 3', wbsCode: '6.3' }], 'Ensamble mecánico')).toBe('6.3 Tablero 3 › Ensamble mecánico');
  });
});
