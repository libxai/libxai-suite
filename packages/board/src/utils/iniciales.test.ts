import { describe, it, expect } from 'vitest';
import { inicialesDe } from './iniciales';

describe('inicialesDe (QA Asakaa E41): la misma regla que la app', () => {
  it('primer nombre + último', () => {
    expect(inicialesDe('Arcadio Ortiz')).toBe('AO');
    expect(inicialesDe('James McDonald')).toBe('JM');
    expect(inicialesDe('María José Pérez Gil')).toBe('MG');
  });
  it('una palabra y vacío', () => {
    expect(inicialesDe('Yesid')).toBe('YE');
    expect(inicialesDe('')).toBe('?');
    expect(inicialesDe(undefined)).toBe('?');
  });
});
