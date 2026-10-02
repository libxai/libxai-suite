/** 1.9.42 · el Mes en modo vencimiento: «qué vence cada día». */
import { describe, it, expect } from 'vitest';
import { layoutDueWeek, type CalTask } from './calendarLayout';

const t = (uid: string, end: number, o: Partial<CalTask> = {}): CalTask => ({
  uid, id: '', name: uid, projectId: 'p', startSerial: end - 3, endSerial: end, hrs: 0, cost: '',
  critical: false, realStart: new Date(), realEnd: new Date(), ...o,
});

describe('layoutDueWeek', () => {
  it('cada tarea es un chip de UN día en su fin (no en su inicio)', () => {
    const lay = layoutDueWeek([t('a', 10)], [], 8, 14, 3);
    expect(lay.bars).toHaveLength(1);
    expect(lay.bars[0]).toMatchObject({ s: 10, e: 10, lane: 0 });
  });
  it('caben `slots`; el resto va a «+N» en la fila del número (lane -1)', () => {
    const lay = layoutDueWeek([t('a', 10), t('b', 10), t('c', 10)], [], 8, 14, 2);
    expect(lay.bars.map(b => b.lane)).toEqual([0, 1]);
    expect(lay.more).toEqual([expect.objectContaining({ day: 10, lane: -1, count: 1 })]);
  });
  it('los contenedores (padres) no salen; las terminadas van al final del día', () => {
    const lay = layoutDueWeek([t('hecha', 10, { done: true }), t('padre', 10, { container: true }), t('abierta', 10)], [], 8, 14, 5);
    expect(lay.bars.map(b => b.t.uid)).toEqual(['abierta', 'hecha']);
  });
  it('fuera de la semana no pinta nada', () => {
    expect(layoutDueWeek([t('a', 20)], [], 8, 14, 3).bars).toEqual([]);
  });
});
