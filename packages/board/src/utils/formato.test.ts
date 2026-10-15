import { describe, it, expect } from 'vitest';
import { numero, moneda, horas, porcentaje, fecha, hora } from './formato';

describe('formato (QA Asakaa 2.2: un solo formato, las mismas salidas que la app)', () => {
  it('números: punto de miles y coma decimal en español; al revés en inglés', () => {
    expect(numero(20122500)).toBe('20.122.500');
    expect(numero(12.5, 'es', 1)).toBe('12,5');
    expect(numero(20122500, 'en')).toBe('20,122,500');
  });

  it('moneda con el código detrás', () => {
    expect(moneda(20122500, 'COP')).toBe('$20.122.500 COP');
    expect(moneda(1000, 'USD', 'en')).toBe('$1,000 USD');
    expect(moneda(-725300, 'COP')).toBe('-$725.300 COP');
    expect(moneda(1500, null)).toBe('$1.500');
  });

  it('moneda compacta', () => {
    expect(moneda(725300, 'COP', 'es', { compacto: true })).toBe('$725,3 mil COP');
    expect(moneda(20122500, 'COP', 'es', { compacto: true })).toBe('$20,1 M COP');
    expect(moneda(23048600, 'USD', 'en', { compacto: true })).toBe('$23M USD');
    expect(moneda(725300, 'USD', 'en', { compacto: true })).toBe('$725.3K USD');
    expect(moneda(950, 'COP', 'es', { compacto: true })).toBe('$950 COP');
  });

  it('horas y minutos', () => {
    expect(horas(0)).toBe('0 h');
    expect(horas(45)).toBe('45 min');
    expect(horas(750)).toBe('12 h 30 min');
    expect(horas(720)).toBe('12 h');
    expect(horas(60 * 1200)).toBe('1.200 h');
  });

  it('porcentaje sin espacio', () => {
    expect(porcentaje(77)).toBe('77%');
    expect(porcentaje(0)).toBe('0%');
    expect(porcentaje(98.5, 'es', 1)).toBe('98,5%');
  });

  it('fechas: sin cero delante y con año cuando no es el actual', () => {
    const hoy = new Date(2026, 9, 15);
    expect(fecha('2026-07-06', 'es', { hoy })).toBe('6 jul');
    expect(fecha('2025-12-20', 'es', { hoy })).toBe('20 dic 2025');
    expect(fecha('2026-07-06', 'es', { hoy, anio: 'siempre' })).toBe('6 jul 2026');
    expect(fecha('2026-07-06', 'en', { hoy })).toBe('Jul 6');
    expect(fecha('2025-12-20', 'en', { hoy })).toBe('Dec 20, 2025');
    expect(fecha(null)).toBe('—');
  });

  it('hora local de 24 h en español', () => {
    expect(hora(new Date(2026, 9, 8, 14, 42))).toBe('14:42');
  });

  it('acepta locales largos («en-US», «es-CO»)', () => {
    expect(numero(1234.5, 'en-US', 1)).toBe('1,234.5');
    expect(numero(1234.5, 'es-CO', 1)).toBe('1.234,5');
  });
});
