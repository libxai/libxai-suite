import { describe, it, expect } from 'vitest';
import { motivoDeBloqueo } from './fechaPermitida';

const d = (m: number, dd: number) => new Date(2026, m - 1, dd);

describe('motivoDeBloqueo (QA Asakaa E21)', () => {
  it('un fin anterior al inicio no se puede elegir (antes movía el inicio en silencio)', () => {
    expect(motivoDeBloqueo(d(10, 9), { campo: 'end', inicio: d(10, 14), locale: 'es' })).toBe('El fin no puede ser anterior al inicio (14 oct)');
    expect(motivoDeBloqueo(d(10, 14), { campo: 'end', inicio: new Date(2026, 9, 14, 18), locale: 'es' })).toBeNull();
  });
  it('un inicio posterior al fin tampoco', () => {
    expect(motivoDeBloqueo(d(10, 25), { campo: 'start', fin: d(10, 20), locale: 'es' })).toContain('posterior al fin');
  });
  it('nada antes del inicio del proyecto', () => {
    expect(motivoDeBloqueo(d(9, 1), { campo: 'start', minimo: d(9, 15), locale: 'es' })).toBe('Antes del inicio del proyecto (15 sept)');
    expect(motivoDeBloqueo(d(9, 15), { campo: 'start', minimo: d(9, 15), locale: 'es' })).toBeNull();
  });
});
