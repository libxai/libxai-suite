import { describe, it, expect } from 'vitest';
import { fechaCorta } from './fechaCorta';

const hoy = new Date(2026, 9, 30, 12);

describe('fechaCorta (R6)', () => {
  it('del año en curso, sin año', () => {
    expect(fechaCorta(new Date(2026, 8, 6), 'es', hoy)).toBe('6 sep');
    expect(fechaCorta(new Date(2026, 8, 6), 'en', hoy)).toBe('Sep 6');
  });
  it('de otro año, con su año (antes o después)', () => {
    expect(fechaCorta(new Date(2027, 6, 30), 'es', hoy)).toBe('30 jul 2027');
    expect(fechaCorta(new Date(2025, 11, 1), 'es-CO', hoy)).toBe('1 dic 2025');
    expect(fechaCorta(new Date(2027, 6, 30), 'en-US', hoy)).toBe('Jul 30, 2027');
  });
});
