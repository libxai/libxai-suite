// David (Axon), 24-nov, puntos 40 y 42: editar el estimado, las fechas y el avance con un clic en la Lista, arrastrar para
// rellenar, y las horas registradas y estimadas en columnas separadas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { ListaV6 } from './ListaV6';
import { leerEstimado, type AccionesDelPanelV4 } from './PanelDeTareaV4';
import { TODOS_LOS_DIAS } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

const d = (dia: number) => new Date(2026, 10, dia, 12);
const dia = (x?: Date) => (x ? new Date(x).getDate() : null);
const ANA = { id: 'u1', name: 'Ana', initials: 'A', color: '#111' } as never;
const hoja = (id: string, extra: Partial<Task> = {}): Task =>
  ({ id, name: id, startDate: d(24), endDate: d(26), progress: 10, status: 'in-progress', effortMinutes: 600, timeLoggedMinutes: 900, ...extra }) as Task;
const tareas = (): Task[] => [{
  id: 'fase', name: 'fase', progress: 0, status: 'todo',
  subtasks: [hoja('uno', { assignees: [ANA] }), hoja('dos', { effortMinutes: 0, timeLoggedMinutes: 0, startDate: d(10), endDate: d(11) }), hoja('tres', { status: 'completed', progress: 100 })],
} as Task];

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function montar(panel: Partial<AccionesDelPanelV4> = {}, extra: Partial<React.ComponentProps<typeof ListaV6>> = {}) {
  localStorage.setItem('cols', '[]');
  const onActualizar = vi.fn(async (_t: Task, _c: Partial<Task>): Promise<boolean> => true);
  const onGuardarEstado = vi.fn(async () => true);
  const r = render(<ListaV6 tasks={tareas()} es cal={TODOS_LOS_DIAS} tarifaDe={() => 0} hoy={d(24)} claveColumnas="cols" onGuardarEstado={onGuardarEstado}
    vista={{ densidad: 'normal', mostrarHechas: true, agruparPorFase: true, leyenda: false }}
    panel={{ onActualizar, personas: [{ id: 'u1', name: 'Ana' }], ...panel }} {...extra} />);
  const fila = (n: string) => r.container.querySelector<HTMLElement>(`tr[data-id="${n}"]`)!;
  return { ...r, fila, onActualizar, onGuardarEstado };
}

describe('editar en la celda', () => {
  it('el estimado: clic, número y Enter; más de 24 h vale, y no se abre el panel', () => {
    const m = montar();
    fireEvent.click(m.getByLabelText('Horas estimadas de «dos», cambiar'));
    const i = m.getByLabelText('Horas estimadas de «dos», cambiar') as HTMLInputElement;
    fireEvent.change(i, { target: { value: '40,5' } });
    fireEvent.keyDown(i, { key: 'Enter' });
    expect(m.onActualizar.mock.calls).toHaveLength(1);
    expect(m.onActualizar.mock.calls[0]![1]).toEqual({ effortMinutes: 2430 });
    expect(m.container.querySelector('.dp4')).toBeNull();
  });

  it('lo que no vale no se guarda y lo dice; Escape cancela', () => {
    const m = montar();
    fireEvent.click(m.getByLabelText('Horas estimadas de «uno», cambiar'));
    const i = m.getByLabelText('Horas estimadas de «uno», cambiar') as HTMLInputElement;
    fireEvent.change(i, { target: { value: 'abc' } });
    fireEvent.keyDown(i, { key: 'Enter' });
    expect(m.getByRole('alert').textContent).toContain('40');
    fireEvent.keyDown(i, { key: 'Escape' });
    expect(m.onActualizar).not.toHaveBeenCalled();
  });

  it('las fechas: el calendario sigue abierto aunque el ratón salga de la fila (el fallo del 13-nov)', () => {
    const m = montar();
    fireEvent.mouseEnter(m.fila('uno'));
    fireEvent.click(m.getByLabelText('Fin de «uno», cambiar'));
    fireEvent.mouseLeave(m.fila('uno'));
    fireEvent.click(m.container.querySelector('[data-calendario-v4] [data-iso="2026-11-28"]')!);
    expect(dia(m.onActualizar.mock.calls[0]![1].endDate as Date)).toBe(28);
    expect(m.container.querySelector('.ce-cal')).toBeNull();
  });

  it('un inicio después del fin corre el fin con sus días', () => {
    const m = montar();
    fireEvent.click(m.getByLabelText('Inicio de «uno», cambiar'));
    fireEvent.click(m.container.querySelector('[data-calendario-v4] [data-iso="2026-11-27"]')!);
    const c = m.onActualizar.mock.calls[0]![1];
    expect([dia(c.startDate as Date), dia(c.endDate as Date)]).toEqual([27, 29]);
  });

  it('el avance: 60 se guarda; 101 no; una completada no se edita', () => {
    const m = montar();
    const abrir = () => { fireEvent.click(m.getByLabelText('Avance de «uno», cambiar')); return m.getByLabelText('Avance de «uno», cambiar') as HTMLInputElement; };
    let i = abrir();
    fireEvent.change(i, { target: { value: '101' } }); fireEvent.keyDown(i, { key: 'Enter' }); fireEvent.keyDown(i, { key: 'Escape' });
    expect(m.onGuardarEstado).not.toHaveBeenCalled();
    i = abrir();
    fireEvent.change(i, { target: { value: '60' } }); fireEvent.keyDown(i, { key: 'Enter' });
    expect(m.onGuardarEstado.mock.calls[0]!.slice(1)).toEqual(['in-progress', 60]);
    expect(m.queryByLabelText('Avance de «tres», cambiar')).toBeNull();
  });

  it('quien solo edita lo suyo cambia fechas pero no el estimado; sin permiso, nada; un padre, nunca', () => {
    let m = montar({ puedeAsignar: () => false });
    expect(m.queryByLabelText('Fin de «uno», cambiar')).not.toBeNull();
    expect(m.queryByLabelText('Horas estimadas de «uno», cambiar')).toBeNull();
    expect(m.container.querySelector('[data-tirador="est"], [data-tirador="who"]')).toBeNull();
    cleanup();
    m = montar({ puedeEditar: false });
    expect(m.container.querySelector('.ce-btn, .tirador')).toBeNull();
    cleanup();
    m = montar();
    expect(m.fila('fase').querySelector('.ce-btn, .tirador')).toBeNull();
  });

  it('leerEstimado: horas de una tarea, no de un día', () => {
    expect(['40', '8,5', '0', '1200', '-1', '1e3', ''].map(leerEstimado)).toEqual([40, 8.5, 0, 1200, null, null, null]);
  });
});

describe('arrastrar para rellenar', () => {
  /* jsdom no mide: a cada fila, 40 px de alto */
  const medir = (m: ReturnType<typeof montar>) => [...m.container.querySelectorAll<HTMLElement>('tr[data-id]')].forEach((r, i) => {
    r.getBoundingClientRect = () => ({ top: i * 40, bottom: i * 40 + 40, left: 0, right: 500, width: 500, height: 40, x: 0, y: i * 40, toJSON: () => '' }) as DOMRect;
  });
  const arrastrar = async (m: ReturnType<typeof montar>, c: string, de: string, y: number) => {
    medir(m);
    fireEvent.mouseDown(m.fila(de).querySelector(`[data-tirador="${c}"]`)!, { button: 0 });
    fireEvent.mouseMove(document, { clientY: y });
    await act(async () => { fireEvent.mouseUp(document); });
  };

  it('el responsable pasa a las filas de debajo, y «Deshacer» devuelve lo de antes', async () => {
    const m = montar();
    await arrastrar(m, 'who', 'uno', 130);
    expect(m.onActualizar.mock.calls.map(([t, c]) => [t.id, (c.assignees as { id: string }[]).map((a) => a.id)])).toEqual([['dos', ['u1']], ['tres', ['u1']]]);
    m.onActualizar.mockClear();
    await act(async () => { fireEvent.click(m.getByText('Deshacer')); });
    expect(m.onActualizar.mock.calls.map(([t, c]) => [t.id, c.assignees])).toEqual([['dos', []], ['tres', []]]);
  });

  it('hacia arriba también, y salta la fase', async () => {
    const m = montar();
    await arrastrar(m, 'est', 'uno', 5);
    expect(m.onActualizar).not.toHaveBeenCalled();
    await arrastrar(m, 'est', 'tres', 50);
    expect(m.onActualizar.mock.calls.map(([t]) => t.id)).toEqual(['uno', 'dos']);
  });

  it('un clic sin arrastrar no cambia nada; Escape lo cancela', async () => {
    const m = montar();
    await arrastrar(m, 's', 'uno', 60);
    expect(m.onActualizar).not.toHaveBeenCalled();
    medir(m);
    fireEvent.mouseDown(m.fila('uno').querySelector('[data-tirador="s"]')!, { button: 0 });
    fireEvent.mouseMove(document, { clientY: 130 });
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => { fireEvent.mouseUp(document); });
    expect(m.onActualizar).not.toHaveBeenCalled();
  });

  it('si el guardado falla, lo dice', async () => {
    const m = montar();
    m.onActualizar.mockResolvedValue(false);
    await arrastrar(m, 'e', 'uno', 130);
    expect(m.container.textContent).toContain('No se pudo actualizar 2 tareas.');
  });
});

describe('las horas, por separado', () => {
  it('registradas, estimadas y el % usado; en rojo si pasa de lo estimado', () => {
    const m = montar();
    const celdas = (n: string) => [...m.fila(n).querySelectorAll('td')].map((t) => t.textContent);
    expect(celdas('uno')).toEqual(expect.arrayContaining(['15 h', '10 h', '150%']));
    expect(m.fila('uno').querySelector('.uso.pasa')).not.toBeNull();
    expect(celdas('dos')).toEqual(expect.arrayContaining(['0 h', 'Sin estimar', '—']));
    expect([...m.container.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(expect.arrayContaining(['Registradas', 'Estimadas', '% de horas']));
  });

  it('quien tenía «Horas» oculta sigue sin verlas', () => {
    localStorage.setItem('cols2', '["hrs"]');
    const m = montar({}, { claveColumnas: 'cols2' });
    expect(m.container.querySelector('thead')!.textContent).not.toMatch(/Registradas|Estimadas|% de horas/);
  });
});
