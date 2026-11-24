/**
 * QA Latty R3 · BUG-11 · «Agenda: la tarea aparece en cada día de su rango» (Respuesta_Divar_R3 §2.6), con
 * `agendaPorRango`. Sin la prop, como siempre: en el día en que arranca.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CalendarAgenda } from './CalendarAgenda';
import { buildMonthGrid, type CalTask } from './calendarLayout';

afterEach(() => cleanup());

const grid = buildMonthGrid(2026, 10); // noviembre 2026
const tarea = (uid: string, s: number, e: number, o: Partial<CalTask> = {}): CalTask => ({
  uid, id: '', name: uid, projectId: 'p', startSerial: s, endSerial: e, hrs: 0, cost: '',
  critical: false, realStart: grid.serialToDate(s), realEnd: grid.serialToDate(e), ...o,
});

const dias = (c: HTMLElement, nombre: string) =>
  [...c.querySelectorAll('.cal-agenda-day')].filter(d => [...d.querySelectorAll('.cal-agenda-item')].some(b => b.textContent?.includes(nombre))).length;

describe('la Agenda por rango', () => {
  it('con porRango: en cada día de su rango; un hito, en su día', () => {
    const { container } = render(
      <CalendarAgenda porRango grid={grid} items={[]} money="Hrs" projColor="#000" todaySerial={0} locale="es"
        tasks={[tarea('Larga', 10, 14), tarea('Hito', 12, 12, { milestone: true })]} />,
    );
    expect(dias(container, 'Larga')).toBe(5);
    expect(dias(container, 'Hito')).toBe(1);
  });
  it('sin la prop, como siempre: sólo el día en que arranca', () => {
    const { container } = render(
      <CalendarAgenda grid={grid} items={[]} money="Hrs" projColor="#000" todaySerial={0} locale="es" tasks={[tarea('Larga', 10, 14)]} />,
    );
    expect(dias(container, 'Larga')).toBe(1);
  });
  it('el rango se recorta a la ventana visible (1 … 42)', () => {
    const { container } = render(
      <CalendarAgenda porRango grid={grid} items={[]} money="Hrs" projColor="#000" todaySerial={0} locale="es" tasks={[tarea('Cruza', 40, 42)]} />,
    );
    expect(dias(container, 'Cruza')).toBe(3);
  });
});
