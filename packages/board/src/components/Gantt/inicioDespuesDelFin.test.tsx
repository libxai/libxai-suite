// N25 (2ª revisión de Yesid, 19-nov): «Poner el inicio después del fin da "Error updating task", sin más».
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { GanttBoard } from './GanttBoard';
import type { Task } from './types';

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!g.IntersectionObserver) g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
});
afterEach(cleanup);

const d = (s: string) => new Date(`${s}T12:00:00`);
const dia = (x: Date | undefined) => (x ? `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` : null);
/* lunes a viernes: una tarea del lunes 16 al miércoles 18 de noviembre (3 días hábiles) */
const TAREA: Task = { id: 'a', name: 'Diseño', startDate: d('2026-11-16'), endDate: d('2026-11-18'), progress: 0, status: 'todo' };
const config = { locale: 'es', disenoV6: true, workingDaysConfig: { enabledWeekdays: [false, true, true, true, true, true, false], holidayDates: [] } } as never;

function montar() {
  const actualizada = vi.fn();
  render(<GanttBoard tasks={[TAREA]} config={{ ...(config as object), onTaskUpdate: actualizada } as never} />);
  /* la celda Inicio o Fin de la fila, como lo haría una persona: abre el calendario y elige el día */
  const elegir = (campo: 'inicio' | 'fin', iso: string) => {
    const fila = document.querySelector('[data-task-row]') as HTMLElement;
    const botones = [...fila.querySelectorAll('button')].filter((b) => /\d{1,2} nov/.test(b.textContent ?? ''));
    act(() => { fireEvent.click(botones[campo === 'inicio' ? 0 : 1]); });
    const dia = document.querySelector(`[data-calendario-del-gantt] [data-iso="${iso}"]`) as HTMLElement;
    act(() => { fireEvent.click(dia); });
  };
  return { elegir, ultima: () => actualizada.mock.calls.at(-1)?.[0] as Task };
}

describe('N25 · el inicio después del fin corre el fin (y al revés), conservando los días hábiles', () => {
  it('inicio el lunes 23 (después del fin): termina el miércoles 25', () => {
    const m = montar();
    m.elegir('inicio', '2026-11-23');
    expect([dia(m.ultima().startDate), dia(m.ultima().endDate)]).toEqual(['2026-11-23', '2026-11-25']);
  });
  it('fin el viernes 13 (antes del inicio): empieza el miércoles 11', () => {
    const m = montar();
    m.elegir('fin', '2026-11-13');
    expect([dia(m.ultima().startDate), dia(m.ultima().endDate)]).toEqual(['2026-11-11', '2026-11-13']);
  });
  it('dentro de su rango no cambia nada más (estirar sigue siendo estirar)', () => {
    const m = montar();
    m.elegir('fin', '2026-11-20');
    expect([dia(m.ultima().startDate), dia(m.ultima().endDate)]).toEqual(['2026-11-16', '2026-11-20']);
  });
});
