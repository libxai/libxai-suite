// David (Axon), 24-nov: «No me deja asignar usuarios a las tareas» y «Costos del proyecto se cierra al cambiar de ventana».
// En la Lista v4 el «+» de la tabla era un dibujo y el responsable del panel, un texto: no había por dónde asignar.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { ListaV6 } from './ListaV6';
import { CostosDelProyectoV4 } from './CostosDelProyectoV4';
import type { AccionesDelPanelV4 } from './PanelDeTareaV4';
import { TODOS_LOS_DIAS } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

const HOY = new Date(2026, 10, 24, 12);
const PERSONAS = [{ id: 'u1', name: 'Andrés Riaño' }, { id: 'u2', name: 'Gustavo Jaramillo' }, { id: 'u3', name: 'Gustavo Jaramillo' }];
const hoja = (id: string, name: string, extra: Partial<Task> = {}): Task =>
  ({ id, name, startDate: new Date(2026, 10, 24, 12), endDate: new Date(2026, 10, 27, 12), progress: 0, status: 'todo', ...extra }) as Task;
const YA = { id: 'u2', name: 'Gustavo Jaramillo', initials: 'GJ', color: '#111', estimatedMinutes: 480 } as never;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function montar(panel: Partial<AccionesDelPanelV4> = {}) {
  const onActualizar = vi.fn(async () => true);
  const tasks = [{ id: 'f1', name: 'Fase 1', progress: 0, status: 'todo', subtasks: [hoja('a', 'Kickoff'), hoja('b', 'Pruebas', { assignees: [YA] })] } as Task];
  const r = render(<ListaV6 tasks={tasks} es cal={TODOS_LOS_DIAS} tarifaDe={() => 0} hoy={HOY} panel={{ onActualizar, personas: PERSONAS, ...panel }} />);
  const fila = (nombre: string) => [...r.container.querySelectorAll<HTMLElement>('tbody tr')].find((f) => f.querySelector('.nm')?.textContent === nombre)!;
  return { ...r, fila, onActualizar, ids: () => ((onActualizar.mock.calls.at(-1) as unknown[])[1] as { assignees: { id: string }[] }).assignees.map((a) => a.id) };
}

describe('asignar desde la Lista v4', () => {
  it('el «+» de la tabla abre el selector y asigna, sin abrir el panel', () => {
    const m = montar();
    fireEvent.click(m.fila('Kickoff').querySelector('[data-asignar]')!);
    fireEvent.click(m.container.querySelector('[data-persona="u1"]')!);
    expect(m.ids()).toEqual(['u1']);
    expect(m.container.querySelector('.dp4')).toBeNull();
  });

  it('se suma una segunda persona y la primera conserva sus horas; volver a pulsarla la quita', () => {
    const m = montar();
    fireEvent.click(m.fila('Pruebas').querySelector('[data-asignar]')!);
    fireEvent.click(m.container.querySelector('[data-persona="u1"]')!);
    expect(m.ids()).toEqual(['u2', 'u1']);
    expect(((m.onActualizar.mock.calls.at(-1) as unknown[])[1] as { assignees: unknown[] }).assignees[0]).toBe(YA);
    fireEvent.click(m.container.querySelector('[data-persona="u2"]')!);
    expect(m.ids()).toEqual([]);
  });

  it('dos personas con el mismo nombre no se confunden', () => {
    const m = montar();
    fireEvent.click(m.fila('Pruebas').querySelector('[data-asignar]')!);
    expect(m.container.querySelector('[data-persona="u3"]')!.getAttribute('aria-selected')).toBe('false');
    fireEvent.click(m.container.querySelector('[data-persona="u3"]')!);
    expect(m.ids()).toEqual(['u2', 'u3']);
  });

  it('busca sin tildes', () => {
    const m = montar();
    fireEvent.click(m.fila('Kickoff').querySelector('[data-asignar]')!);
    fireEvent.change(m.getByLabelText('Buscar persona'), { target: { value: 'andres' } });
    expect([...m.container.querySelectorAll('[data-persona]')].map((e) => e.getAttribute('data-persona'))).toEqual(['u1']);
  });

  it('también desde el panel de la tarea; Escape cierra el selector y no el panel', () => {
    const m = montar();
    fireEvent.click(m.fila('Kickoff'));
    const panel = m.container.querySelector('.dp4') as HTMLElement;
    fireEvent.click(panel.querySelector('[data-responsable-del-panel] [data-asignar]')!);
    fireEvent.click(panel.querySelector('[data-persona="u2"]')!);
    expect(m.ids()).toEqual(['u2']);
    fireEvent.keyDown(within(panel).getByLabelText('Buscar persona'), { key: 'Escape' });
    expect(m.container.querySelector('.sr-menu')).toBeNull();
    expect(m.container.querySelector('.dp4')).not.toBeNull();
  });

  it('escribir o pulsar Enter en el buscador no mueve la tabla ni abre el panel', () => {
    const m = montar();
    fireEvent.click(m.fila('Kickoff').querySelector('[data-asignar]')!);
    fireEvent.keyDown(m.getByLabelText('Buscar persona'), { key: 'Enter' });
    expect(m.container.querySelector('.dp4')).toBeNull();
    expect(m.container.querySelector('.sr-menu')).not.toBeNull();
  });

  it('sin permiso, archivado o en una tarea padre no se ofrece', () => {
    for (const sin of [{ puedeAsignar: () => false }, { puedeEditar: false }, { puedeEditarTarea: () => false }, { personas: [] }]) {
      const m = montar(sin);
      expect(m.container.querySelector('[data-asignar]')).toBeNull();
      cleanup();
    }
    const m = montar();
    expect(m.fila('Fase 1').querySelector('[data-asignar]')).toBeNull();
  });
});

describe('«Costos del proyecto» se queda como lo dejó', () => {
  const pie = () => render(<CostosDelProyectoV4 tasks={[hoja('a', 'Kickoff')]} es tarifaDe={() => 0} monedaCodigo="COP" />).container.querySelector('details')!;
  it('empieza plegado; si se abre, sigue abierto al volver a montarse; si se cierra, cerrado', () => {
    let d = pie();
    expect(d.open).toBe(false);
    d.open = true; fireEvent(d, new Event('toggle'));
    cleanup(); d = pie();
    expect(d.open).toBe(true);
    d.open = false; fireEvent(d, new Event('toggle'));
    cleanup();
    expect(pie().open).toBe(false);
  });
});
