import { describe, it, expect } from 'vitest';
import { parseTimeInput } from './TaskFormModal';

describe('QA Latty BUG-33 · «Horas estimadas» entiende lo que se escribe', () => {
  it('los formatos que pidió el QA', () => {
    expect(parseTimeInput('2h 30m')).toBe(150);
    expect(parseTimeInput('45m')).toBe(45);
    expect(parseTimeInput('2.5')).toBe(150);
    expect(parseTimeInput('2,5')).toBe(150);
    expect(parseTimeInput('8')).toBe(480);
    expect(parseTimeInput('1d')).toBe(480);
    expect(parseTimeInput('1,5h')).toBe(90);
  });
  it('lo que no se entiende es null (el campo lo dice, no lo convierte en otra cosa)', () => {
    expect(parseTimeInput('abc')).toBeNull();
    expect(parseTimeInput('abc 2h')).toBeNull();
    expect(parseTimeInput('')).toBeNull();
  });
});
