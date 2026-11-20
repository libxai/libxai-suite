// N23 + N24 (2ª revisión de Yesid, 19-nov): «El panel nuevo solo deja cambiar estado, avance, responsable y restricción.
// Fechas, estimado, prioridad, tarea padre, dependencias y descripción no se pueden editar ahí.» Ahora sí, en el sitio.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { ListaV6 } from './ListaV6';
import { TODOS_LOS_DIAS } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

afterEach(cleanup);
const HOY = new Date(2026, 10, 14, 12);
const d = (m: number, dia: number) => new Date(2026, m, dia, 12);
const dia = (x?: Date) => (x ? `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` : null);
const hoja = (id: string, name: string, extra: Partial<Task> = {}): Task =>
  ({ id, name, startDate: d(10, 2), endDate: d(10, 6), progress: 0, status: 'todo', effortMinutes: 600, ...extra }) as Task;
const tareas = (): Task[] => [{
  id: 'f1', name: 'Desarrollo', progress: 0, status: 'todo',
  subtasks: [hoja('a', 'Integración'), hoja('b', 'Pruebas', { dependencies: ['a'] }), hoja('c', 'Recibo')],
} as Task];

function montar() {
  const onActualizar = vi.fn(async () => true);
  const r = render(<ListaV6 tasks={tareas()} es cal={TODOS_LOS_DIAS} tarifaDe={() => 0} monedaCodigo="COP" hoy={HOY} panel={{ onActualizar }} />);
  const abrir = (nombre: string) => {
    const f = [...r.container.querySelectorAll<HTMLElement>('tbody tr')].find((x) => x.querySelector('.nm')?.textContent === nombre)!;
    fireEvent.click(f);
    return r.container.querySelector('.dp4') as HTMLElement;
  };
  return { ...r, abrir, onActualizar, ultimo: () => onActualizar.mock.calls.at(-1)?.[1] as Partial<Task> };
}

describe('el panel de la tarea, editable en el sitio', () => {
  it('fechas: el fin se elige en el calendario; un inicio después del fin corre el fin con sus días (N25)', () => {
    const m = montar();
    const panel = m.abrir('Integración');
    fireEvent.click(within(panel).getByRole('button', { name: /^Cambiar el fin:/ }));
    fireEvent.click(panel.querySelector('[data-calendario-v4] [data-iso="2026-11-10"]')!);
    expect(dia(m.ultimo().endDate)).toBe('2026-11-10');
    fireEvent.click(within(panel).getByRole('button', { name: /^Cambiar el inicio:/ }));
    fireEvent.click(panel.querySelector('[data-calendario-v4] [data-iso="2026-11-12"]')!);
    /* era del 2 al 6 (5 días): empieza el 12 y termina el 16 */
    expect([dia(m.ultimo().startDate), dia(m.ultimo().endDate)]).toEqual(['2026-11-12', '2026-11-16']);
  });

  it('estimado: se escribe en horas y se guarda en minutos', () => {
    const m = montar();
    const panel = m.abrir('Integración');
    fireEvent.click(within(panel).getByRole('button', { name: /^Cambiar el estimado:/ }));
    const caja = panel.querySelector('[data-estimado]') as HTMLInputElement;
    fireEvent.change(caja, { target: { value: '12,5' } });
    fireEvent.keyDown(caja, { key: 'Enter' });
    expect((m.ultimo() as { effortMinutes?: number }).effortMinutes).toBe(750);
  });

  it('prioridad: se elige en su selector', () => {
    const m = montar();
    const panel = m.abrir('Integración');
    fireEvent.click(within(panel).getByRole('button', { name: /^Prioridad:/ }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: /Alta/ }));
    expect(m.ultimo().priority).toBe('high');
  });

  it('dependencias: se añaden y se quitan (N24)', () => {
    const m = montar();
    let panel = m.abrir('Recibo');
    fireEvent.click(within(panel).getByRole('button', { name: 'Añadir dependencia' }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: /Integración/ }));
    expect(m.ultimo().dependencies).toEqual(['a']);
    panel = m.abrir('Pruebas');
    fireEvent.click(within(panel).getByRole('button', { name: 'Quitar la dependencia de «Integración»' }));
    expect(m.ultimo().dependencies).toEqual([]);
  });

  it('«Dependencias…» del menú abre el panel con «Añadir dependencia» desplegado', async () => {
    const m = montar();
    const f = [...m.container.querySelectorAll<HTMLElement>('tbody tr')].find((x) => x.querySelector('.nm')?.textContent === 'Recibo')!;
    fireEvent.contextMenu(f);
    fireEvent.click(m.container.querySelector('.lv-menu [data-op="dependencies"]')!);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    const panel = m.container.querySelector('.dp4') as HTMLElement;
    expect(within(panel).getAllByRole('menuitemradio').some((b) => /Integración/.test(b.textContent ?? ''))).toBe(true);
  });

  it('descripción: se escribe en el sitio y se guarda al salir del campo', () => {
    const m = montar();
    const panel = m.abrir('Integración');
    fireEvent.click(within(panel).getByRole('button', { name: 'Editar la descripción' }));
    const caja = panel.querySelector('[data-descripcion]') as HTMLTextAreaElement;
    fireEvent.change(caja, { target: { value: 'Conectar con el ERP' } });
    fireEvent.blur(caja);
    expect((m.ultimo() as { description?: string }).description).toBe('Conectar con el ERP');
  });
});
