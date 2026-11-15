/**
 * Guía v4 de Yesid · la Lista (maqueta asakaa-lista.html):
 *   · cabeceras sin abreviar y la unidad en el globo; abre con Tarea, Estado, Fin, Avance, Horas y Costo;
 *   · 20 px por nivel con guías; escudo de riesgo; la vencida dice en «Fin» cuántos días hábiles; «Sin estimar»;
 *   · un solo pie, «Costos del proyecto», con sus tres caras (cifra, «No evaluable», «Visible para gerente y Finanzas»);
 *   · el panel v4 (sin <select>); el «?» con la leyenda y los atajos; #t=3.4 y #vencidas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { ListaV6 } from './ListaV6';
import type { SaludDelPieV4 } from './CostosDelProyectoV4';
import { TODOS_LOS_DIAS } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

const HOY = new Date(2026, 10, 14, 12);
const d = (m: number, dia: number) => new Date(2026, m, dia, 12);
const hoja = (id: string, name: string, extra: Partial<Task> = {}): Task =>
  ({ id, name, startDate: d(10, 2), endDate: d(10, 20), progress: 0, status: 'todo', effortMinutes: 600, ...extra }) as Task;
const juan = { id: 'u1', name: 'Juan Pardo', initials: 'JP' };
const tareas = (): Task[] => [{
  id: 'f1', name: 'Desarrollo', progress: 0, status: 'todo',
  subtasks: [
    hoja('a', 'Integración', { status: 'in-progress', progress: 40, assignees: [juan] as never, timeLoggedMinutes: 240 } as Partial<Task>),
    { id: 'p', name: 'Pagos', progress: 0, status: 'todo', subtasks: [
      hoja('b', 'Botón de pago', { endDate: d(10, 10), riesgos: [{ id: 'r1', codigo: 'R-01', titulo: 'Pasarela', nivel: 'alto' }] }),
      hoja('c', 'Recibo', { effortMinutes: 0 } as Partial<Task>),
    ] } as Task,
  ],
} as Task];

const SALUD: SaludDelPieV4 = { veDinero: true, ofertado: 1e8, planeado: 6e7, real: 3e7, alTerminar: 7e7, horasRegistradas: 4, horasGanadas: 4, noEvaluable: null, porQueVe: 'porque gerencia este proyecto' };

function montar(extra: Partial<React.ComponentProps<typeof ListaV6>> = {}) {
  return render(<ListaV6 tasks={tareas()} es cal={TODOS_LOS_DIAS} tarifaDe={() => 100000} monedaCodigo="COP" hoy={HOY} salud={SALUD} {...extra} />);
}
const fila = (c: HTMLElement, nombre: string) => [...c.querySelectorAll<HTMLElement>('tbody tr')].find((r) => r.querySelector('.nm')?.textContent === nombre)!;
afterEach(() => { window.location.hash = ''; });

describe('Lista v4 · la tabla', () => {
  it('cabeceras sin abreviar, con la unidad en el globo; abre sin Inicio ni Duración', () => {
    const { container } = montar();
    const ths = [...container.querySelectorAll('.lt thead th')].map((t) => t.textContent?.replace(/[↑↓+\d]/g, '').trim()).filter(Boolean);
    expect(ths).toEqual(['Tarea', 'Responsable', 'Estado', 'Fin', 'Avance', 'Horas', 'Costo']);
    expect(container.querySelector('thead th[title^="Horas registradas / estimadas"]')).toBeTruthy();
    expect(container.querySelector('thead th[title^="Costo real en COP"]')).toBeTruthy();
  });

  it('20 px por nivel con guías, y el escudo del riesgo', () => {
    const { container } = montar();
    expect((fila(container, 'Botón de pago').querySelector('.gd') as HTMLElement).style.getPropertyValue('--n')).toBe('2');
    expect(fila(container, 'Desarrollo').querySelector('.gd')).toBeNull();
    expect(fila(container, 'Botón de pago').querySelector('.rk[data-nivel="alto"]')?.getAttribute('title')).toBe('Riesgo R-01 · Alto: Pasarela');
  });

  it('la vencida dice en «Fin» la fecha y los días hábiles; la tarea sin estimar dice «Sin estimar»', () => {
    const { container } = montar();
    expect(fila(container, 'Botón de pago').querySelector('.chip-red')?.getAttribute('title')).toMatch(/^10 nov, vencida hace \d+ días hábiles$/);
    expect(fila(container, 'Recibo').querySelector('.noest')?.textContent).toBe('Sin estimar');
    expect(fila(container, 'Integración').querySelector('.noest')).toBeNull();
  });

  it('el «?» trae la leyenda y los atajos', () => {
    const { container } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cómo leer la lista y atajos de teclado' }));
    const a = container.querySelector('.lv-ayuda') as HTMLElement;
    expect(a.textContent).toContain('Fecha de fin vencida');
    expect(a.textContent).toContain('Editar las horas registradas');
  });
});

describe('Lista v4 · Filtros', () => {
  const nombres = (c: HTMLElement) => [...c.querySelectorAll('tbody tr .nm')].map((n) => n.textContent);
  const VACIOS = { estados: [], responsables: [], vencidas: false, conRiesgo: false };
  it('«Con riesgo abierto» deja las hojas con riesgo y sus padres, con su chip', () => {
    const onFiltros = vi.fn();
    const { container } = montar({ filtros: { ...VACIOS, conRiesgo: true }, onFiltros });
    expect(nombres(container)).toEqual(['Desarrollo', 'Pagos', 'Botón de pago']);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro: Con riesgo abierto' }));
    expect(onFiltros).toHaveBeenCalledWith(expect.objectContaining({ conRiesgo: false }));
  });
  it('Responsable y Estado', () => {
    expect(nombres(montar({ filtros: { ...VACIOS, responsables: ['u1'] } }).container)).toEqual(['Desarrollo', 'Integración']);
  });
  it('Estado «En progreso»', () => {
    expect(nombres(montar({ filtros: { ...VACIOS, estados: ['prog'] } }).container)).toEqual(['Desarrollo', 'Integración']);
  });
});

describe('Lista v4 · el pie «Costos del proyecto»', () => {
  it('uno solo, con la salud financiera y el costo por persona', () => {
    const { container } = montar();
    expect(container.querySelectorAll('details.fin').length).toBe(1);
    const sum = (container.querySelector('details.fin summary') as HTMLElement).textContent!;
    expect(sum).toContain('Costos del proyecto');
    expect(sum).toMatch(/real \$30,0 M COP de \$60,0 M COP planeado · margen previsto 30% \(planeado 40%\) · 1 persona con tareas abiertas/);
    expect(container.textContent).toContain('Salud financiera');
    expect(container.textContent).toContain('Costo por persona');
    expect(container.textContent).toContain('Usted ve la tarifa y el costo de cada persona porque gerencia este proyecto.');
  });

  it('«No evaluable»: costos y márgenes no se calculan, con el motivo en el globo', () => {
    const { container } = montar({ salud: { ...SALUD, noEvaluable: 'Tarifas en escalas distintas' } });
    expect((container.querySelector('details.fin summary') as HTMLElement).textContent).toContain('No evaluable');
    const ne = [...container.querySelectorAll('.fgrid .ne')];
    expect(ne.length).toBe(4);
    expect(ne[0]!.getAttribute('title')).toBe('Tarifas en escalas distintas');
  });

  it('sin permiso de dinero: horas por persona y «Visible para gerente y Finanzas»', () => {
    const { container } = montar({ salud: { ...SALUD, veDinero: false }, conCosto: false });
    const pie = container.querySelector('details.fin') as HTMLElement;
    expect(pie.querySelector('summary')!.textContent).toContain('Visible para gerente y Finanzas');
    expect(pie.textContent).toContain('Horas por persona');
    expect(pie.textContent).not.toMatch(/Tarifa|\$/);
    expect(container.querySelector('thead th[title^="Costo real"]')).toBeNull();
  });
});

describe('Lista v4 · el panel y los enlaces', () => {
  it('el panel v4: sin <select>, y el estado llega a onGuardarEstado con la regla del %', async () => {
    const onGuardarEstado = vi.fn(() => true);
    const { container } = montar({ onGuardarEstado });
    fireEvent.click(fila(container, 'Integración'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    expect(panel.querySelector('select')).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: /^Estado: En progreso/ }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: 'Completada' }));
    await waitFor(() => expect(onGuardarEstado).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'completed', 100));
  });

  it('el avance escrito se valida y llega con el estado de siempre', async () => {
    const onGuardarEstado = vi.fn(() => true);
    const { container } = montar({ onGuardarEstado });
    fireEvent.click(fila(container, 'Integración'));
    const campo = within(container.querySelector('.dp4') as HTMLElement).getByLabelText('Avance en porcentaje');
    fireEvent.change(campo, { target: { value: '140' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('Escriba un número entero entre 0 y 100.');
    fireEvent.change(campo, { target: { value: '55' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    await waitFor(() => expect(onGuardarEstado).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'in-progress', 55));
  });

  it('#t=1.2.1 abre el panel de esa tarea y #vencidas filtra las vencidas', () => {
    window.location.hash = '#t=1.2.1';
    const a = montar();
    expect((a.container.querySelector('.dp4 .dp-title') as HTMLElement).textContent).toBe('Botón de pago');
    a.unmount();
    window.location.hash = '#vencidas';
    const { container } = montar();
    const nombres = [...container.querySelectorAll('tbody tr .nm')].map((n) => n.textContent);
    expect(nombres).toEqual(['Desarrollo', 'Pagos', 'Botón de pago']);
  });
});
