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
    /* E10 (Yesid, 17-nov): sin quien registre las horas desde la tabla, la ayuda no ofrece F2 */
    expect(a.textContent).not.toContain('Editar las horas registradas');
  });
  it('E10 · sin onRegistrarHoras las horas no se editan en la tabla: ni F2 ni clic', () => {
    const { container } = montar();
    expect(container.querySelector('button.hrs.ed')).toBeNull();
    expect(container.querySelector('span.hrs')).not.toBeNull();
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

  it('«No evaluable» por horas sin registrar: el pie dice ese motivo, no el de las escalas («una sola verdad»)', () => {
    const { container } = montar({ salud: { ...SALUD, noEvaluable: 'Falta registrar el 78%', noEvaluableCorto: 'por horas sin registrar' } });
    const resumen = (container.querySelector('details.fin summary') as HTMLElement).textContent ?? '';
    expect(resumen).toContain('por horas sin registrar');
    expect(resumen).not.toContain('escalas');
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

describe('Lista v4 · el total y la cabecera («una sola verdad»)', () => {
  it('el «Fin» del total es el fin previsto de la cabecera; el del plan va en el globo', () => {
    const { container } = montar({ finPrevisto: new Date(2026, 11, 14, 12) });
    const fin = container.querySelector('tfoot [data-fin-previsto]') as HTMLElement;
    expect(fin.textContent).toBe('14 dic');
    expect(fin.getAttribute('title')).toMatch(/Fin previsto: 14 dic[\s\S]*plan vigente termina el/);
  });
  it('sin fin previsto, el del plan, como antes', () => {
    const { container } = montar();
    expect((container.querySelector('tfoot [data-fin-previsto]') as HTMLElement).getAttribute('title')).toBeNull();
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

  it('cambiar la tarea padre desde el panel (como el Tablero): al final del nuevo padre, con su número y «Deshacer»', async () => {
    const onCambiarPadre = vi.fn(() => true);
    const { container } = montar({ onCambiarPadre });
    fireEvent.click(fila(container, 'Integración'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: /^Tarea padre: Directa de la fase/ }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: /Pagos/ }));
    await waitFor(() => expect(onCambiarPadre).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'p', 2));
    const aviso = await waitFor(() => { const a = container.querySelector('[data-aviso-padre]') as HTMLElement; expect(a).toBeTruthy(); return a; });
    expect(aviso.textContent).toContain('«Integración» ahora es 1.2.3, dentro de Pagos.');
    fireEvent.click(within(aviso).getByRole('button', { name: 'Deshacer' }));
    /* vuelve a su padre (la fase) y a su sitio (la primera) */
    await waitFor(() => expect(onCambiarPadre).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }), 'f1', 0));
    await waitFor(() => expect(container.querySelector('[data-aviso-padre]')?.textContent).toContain('Cambio deshecho'));
  });

  it('una tarea que quien mira no puede cambiar: sin estado, avance ni padre; las horas, sí', () => {
    const { container } = montar({
      onCambiarPadre: vi.fn(), onGuardarEstado: vi.fn(),
      panel: { puedeEditarTarea: (t) => t.id !== 'a', onRegistrarHoras: vi.fn() },
    });
    fireEvent.click(fila(container, 'Integración'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    expect(within(panel).queryByRole('button', { name: /^Estado:/ })).toBeNull();
    expect(within(panel).queryByRole('button', { name: /^Tarea padre:/ })).toBeNull();
    expect(within(panel).queryByLabelText('Avance en porcentaje')).toBeNull();
    expect(within(panel).getByRole('button', { name: /Registrar/ })).toBeTruthy();
    fireEvent.click(fila(container, 'Recibo'));
    expect(within(container.querySelector('.dp4') as HTMLElement).getByRole('button', { name: /^Estado:/ })).toBeTruthy();
  });

  it('sin onCambiarPadre, el panel dice la tarea padre sin poder cambiarla', () => {
    const { container } = montar();
    fireEvent.click(fila(container, 'Integración'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    expect(within(panel).queryByRole('button', { name: /^Tarea padre:/ })).toBeNull();
    expect(panel.textContent).toContain('Directa de la fase');
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

describe('E15 (Yesid, 17-nov) · menú contextual y «Añadir tarea» en la tabla', () => {
  /* jsdom no trae CSS.escape (el navegador sí): devolver el foco a la fila lo usa */
  if (!(globalThis as { CSS?: { escape?: unknown } }).CSS?.escape) vi.stubGlobal('CSS', { escape: (s: string) => s });
  const opciones = (c: HTMLElement) => [...c.querySelectorAll<HTMLButtonElement>('.lv-menu [role="menuitem"]')];

  it('clic derecho abre el menú con el mismo orden que el Gantt, en una fase y en una tarea', () => {
    const acciones = { onCambiarPadre: vi.fn(), onCrearTarea: vi.fn(), onDuplicar: vi.fn(), onEliminar: vi.fn(), onGuardarEstado: vi.fn() };
    const { container } = montar(acciones);
    fireEvent.contextMenu(fila(container, 'Pagos'));
    const deLaFase = opciones(container).map((b) => b.dataset.op);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.contextMenu(fila(container, 'Recibo'));
    const deLaTarea = opciones(container).map((b) => b.dataset.op);
    expect(deLaTarea).toEqual(deLaFase);
    expect(deLaTarea.slice(0, 4)).toEqual(['edit', 'addSubtask', 'indent', 'outdent']);
    expect(deLaTarea.at(-1)).toBe('delete');
  });

  it('«Aplicar sangría» cuelga la tarea de su hermana de arriba; «Quitar sangría» la saca detrás de su padre', async () => {
    const onCambiarPadre = vi.fn(() => true);
    const { container } = montar({ onCambiarPadre });
    fireEvent.contextMenu(fila(container, 'Recibo'));
    fireEvent.click(container.querySelector('.lv-menu [data-op="indent"]')!);
    await waitFor(() => expect(onCambiarPadre).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }), 'b', 0));
    fireEvent.contextMenu(fila(container, 'Recibo'));
    fireEvent.click(container.querySelector('.lv-menu [data-op="outdent"]')!);
    // Pagos es la 2.ª hija de Desarrollo: Recibo queda la 3.ª (posición 2)
    await waitFor(() => expect(onCambiarPadre).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'c' }), 'f1', 2));
  });

  it('la primera de su nivel no puede aplicar sangría (sale apagada, no desaparece)', () => {
    const { container } = montar({ onCambiarPadre: vi.fn() });
    fireEvent.contextMenu(fila(container, 'Botón de pago'));
    expect(container.querySelector<HTMLButtonElement>('.lv-menu [data-op="indent"]')!.disabled).toBe(true);
  });

  it('«+ Añadir tarea» al final: se escribe el nombre y Enter la crea en la raíz; queda lista para otra', async () => {
    const onCrearTarea = vi.fn(async () => true);
    const { container } = montar({ onCrearTarea });
    fireEvent.click(screen.getByRole('button', { name: /Añadir tarea/ }));
    const caja = screen.getByRole('textbox', { name: 'Añadir tarea' });
    fireEvent.change(caja, { target: { value: '  Pruebas de carga ' } });
    fireEvent.keyDown(caja, { key: 'Enter' });
    await waitFor(() => expect(onCrearTarea).toHaveBeenCalledWith('Pruebas de carga', null));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Añadir tarea' }) as HTMLInputElement).value).toBe(''));
    /* N26 (2ª revisión de Yesid): tras Enter el cursor sigue en el campo, listo para la siguiente */
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Añadir tarea' })));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Añadir tarea' }), { key: 'Escape' });
    expect(container.querySelector('.add-row.nueva')).toBeNull();
  });

  it('«Agregar subtarea» abre la fila de escritura dentro de su padre, detrás de su última hija visible', async () => {
    const onCrearTarea = vi.fn(async () => true);
    const { container } = montar({ onCrearTarea });
    fireEvent.contextMenu(fila(container, 'Pagos'));
    fireEvent.click(container.querySelector('.lv-menu [data-op="addSubtask"]')!);
    const filas = [...container.querySelectorAll('tbody tr')];
    const i = filas.findIndex((r) => r.classList.contains('nueva'));
    expect(filas[i - 1]!.querySelector('.nm')?.textContent).toBe('Recibo');
    const caja = screen.getByRole('textbox', { name: 'Añadir subtarea en «Pagos»' });
    fireEvent.change(caja, { target: { value: 'Conciliación' } });
    fireEvent.keyDown(caja, { key: 'Enter' });
    await waitFor(() => expect(onCrearTarea).toHaveBeenCalledWith('Conciliación', 'p'));
  });

  it('sin onCrearTarea no hay fila de alta; duplicar y eliminar llegan a la app', () => {
    const onDuplicar = vi.fn(); const onEliminar = vi.fn();
    const { container } = montar({ onDuplicar, onEliminar });
    expect(container.querySelector('.add-row')).toBeNull();
    fireEvent.contextMenu(fila(container, 'Recibo'));
    fireEvent.click(container.querySelector('.lv-menu [data-op="duplicate"]')!);
    expect(onDuplicar).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
    fireEvent.contextMenu(fila(container, 'Recibo'));
    fireEvent.click(container.querySelector('.lv-menu [data-op="delete"]')!);
    expect(onEliminar).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });
});
