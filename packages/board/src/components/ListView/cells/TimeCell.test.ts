import { describe, it, expect } from 'vitest';
import { parseTimeToMinutes } from './TimeCell';

// QA Asakaa E7: la celda rechaza lo que esto marca como no válido (null con texto, o < 0).
describe('parseTimeToMinutes', () => {
  it('lee las formas válidas', () => {
    expect([parseTimeToMinutes('8'), parseTimeToMinutes('2h 30m'), parseTimeToMinutes('2:30'), parseTimeToMinutes('45m')]).toEqual([480, 150, 150, 45]);
  });
  it('«-5» da negativo y «abc» no da nada: la celda no guarda ninguno de los dos', () => {
    expect(parseTimeToMinutes('-5')).toBeLessThan(0);
    expect(parseTimeToMinutes('abc')).toBeNull();
  });
});
