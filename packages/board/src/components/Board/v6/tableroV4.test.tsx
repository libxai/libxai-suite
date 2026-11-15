/**
 * Guía v4 de Yesid · el Tablero (maqueta asakaa-tablero.html) y su panel. Lo que se ve y lo que se elige:
 *   · la miga de la tarjeta solo dice los padres que el carril no dice ya;
 *   · el carril trae nombre, barra, «n/m», vencidas y bloqueadas (sin % ni píldora); el resto, en su resumen;
 *   · «Completadas» es un riel con icono y contador; la leyenda y los atajos van en el «?»;
 *   · el panel elige estado, restricción y tarea padre con selectores propios (ningún <select>), y su historial dice el origen.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { TableroV6, VISTA_TABLERO_V6_POR_DEFECTO, FILTROS_TABLERO_V6_VACIOS } from './TableroV6';
import { cambiosDeRestriccion, leerHoras, textoDeDesfase, textoDeRestriccion } from '../../ListView/v6/PanelDeTareaV4';
import { TODOS_LOS_DIAS } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

const HOY = new Date(2026, 10, 14, 12);
const d = (m: number, dia: number) => new Date(2026, m, dia, 12);
const hoja = (id: string, name: string, extra: Partial<Task> = {}): Task =>
  ({ id, name, startDate: d(10, 2), endDate: d(10, 20), progress: 0, status: 'todo', ...extra }) as Task;

/* Fase 1 · Desarrollo: 1.1 (directa), 1.2 Pagos › 1.2.1 Botón (vencida, con riesgo) y 1.2.2 (completada) */
const tareas = (): Task[] => [
  {
    id: 'f1', name: 'Desarrollo', progress: 0, status: 'todo',
    subtasks: [
      hoja('a', 'Integración', { status: 'in-progress', progress: 40 }),
      {
        id: 'p', name: 'Pagos', progress: 0, status: 'todo',
        subtasks: [
          hoja('b', 'Botón de pago', { endDate: d(10, 10), riesgos: [{ id: 'r1', codigo: 'R-01', titulo: 'Pasarela', nivel: 'alto' }] }),
          hoja('c', 'Recibo', { status: 'completed', progress: 100 }),
        ],
      } as Task,
    ],
  } as Task,
];

function montar(extra: Partial<React.ComponentProps<typeof TableroV6>> = {}) {
  const onMover = vi.fn(() => true);
  const onVista = vi.fn();
  const utils = render(
    <TableroV6 tasks={tareas()} es cal={TODOS_LOS_DIAS} tarifaDe={() => 0} hoy={HOY} conCosto={false}
      vista={VISTA_TABLERO_V6_POR_DEFECTO} onVista={onVista} filtros={FILTROS_TABLERO_V6_VACIOS} onFiltros={vi.fn()}
      onMover={onMover} {...extra} />,
  );
  return { ...utils, onMover, onVista };
}
const tarjeta = (c: HTMLElement, wbs: string) => [...c.querySelectorAll<HTMLElement>('article.kcard')].find((k) => k.querySelector('.kc-top .kc-w')?.textContent === wbs)!;

describe('Tablero v4 · lo que se ve', () => {
  it('la miga solo dice los padres que el carril no dice ya', () => {
    const { container } = montar();
    expect(tarjeta(container, '1.1').querySelector('.kc-path')).toBeNull();
    expect(tarjeta(container, '1.2.1').querySelector('.kc-path')?.textContent).toBe('Pagos');
  });

  it('el carril trae barra, «n/m» y vencidas; sin % ni píldora de estado', () => {
    const { container } = montar();
    const cab = container.querySelector('.lane-hi') as HTMLElement;
    expect(cab.textContent).toContain('1/3');
    expect(cab.textContent).toContain('1 vencida');
    expect(cab.textContent).not.toMatch(/%/);
    expect(cab.querySelector('.schip[role=note]')).toBeNull();
  });

  it('la barra del carril abre su resumen, y Escape lo cierra', () => {
    const { container } = montar();
    fireEvent.click(container.querySelector('.lane-pg')!);
    const pop = container.querySelector('.lane-pop') as HTMLElement;
    expect(within(pop).getByText('Avance (por horas estimadas)')).toBeTruthy();
    expect(within(pop).getByText('Vencidas')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('.lane-pop')).toBeNull();
  });

  it('«Completadas» es un riel con icono y contador; al pulsarlo pide mostrar la columna', () => {
    const { container, onVista } = montar();
    const riel = container.querySelector('.rail-btn') as HTMLElement;
    expect(riel.querySelector('.schip.done i')).toBeTruthy();
    expect(riel.textContent).toBe('1');
    fireEvent.click(riel);
    expect(onVista).toHaveBeenCalledWith(expect.objectContaining({ mostrarHechas: true }));
  });

  it('el «?» trae la leyenda y los atajos', () => {
    const { container } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cómo leer el tablero y atajos de teclado' }));
    const ayuda = container.querySelector('.kb-ayuda') as HTMLElement;
    expect(ayuda.textContent).toContain('Fecha de fin vencida');
    expect(ayuda.textContent).toContain('Mover la tarjeta de columna');
  });

  it('el riesgo es un escudo con su nivel y su nombre', () => {
    const { container } = montar();
    const escudo = tarjeta(container, '1.2.1').querySelector('.kc-risk') as HTMLElement;
    expect(escudo.dataset.nivel).toBe('alto');
    expect(escudo.getAttribute('title')).toBe('Riesgo R-01 · Alto: Pasarela');
    expect(escudo.querySelector('svg path')).toBeTruthy();
  });

  it('ningún hueco vacío dice «Sin tareas»', () => {
    const { container } = montar();
    expect(container.textContent).not.toContain('Sin tareas');
  });
});

describe('Tablero v4 · el panel', () => {
  it('sin <select>: el estado se elige en un menú propio y llega a onMover', async () => {
    const { container, onMover } = montar();
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    expect(panel.querySelector('select')).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: /^Estado: En progreso/ }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: 'Bloqueada' }));
    await waitFor(() => expect(onMover).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'blocked', 40));
  });

  it('Escape cierra el menú del selector, no el panel (aunque el foco siga en el botón)', () => {
    const { container } = montar();
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    const boton = within(panel).getByRole('button', { name: /^Estado: / });
    fireEvent.click(boton);
    expect(within(panel).getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(boton, { key: 'Escape' });
    expect(within(panel).queryByRole('menu')).toBeNull();
    expect(container.querySelector('.dp4')).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Más acciones' }));
    fireEvent.keyDown(within(panel).getByRole('button', { name: 'Más acciones' }), { key: 'Escape' });
    expect(within(panel).queryByRole('menu')).toBeNull();
    expect(container.querySelector('.dp4')).toBeTruthy();
  });

  it('la restricción se elige en un menú propio y se guarda con onActualizar', async () => {
    const onActualizar = vi.fn(() => true);
    const { container } = montar({ panel: { onActualizar } });
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: /^Restricción de fecha: Ninguna/ }));
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: /^Fijar fechas/ }));
    await waitFor(() => expect(onActualizar).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), expect.objectContaining({ fijada: true })));
  });

  it('la tarea padre ofrece la fase y los padres de la misma fase', async () => {
    const onCambiarPadre = vi.fn(() => true);
    const { container } = montar({ onCambiarPadre, vista: { ...VISTA_TABLERO_V6_POR_DEFECTO, agrupar: 'padre' } });
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: /^Tarea padre: Directa de la fase/ }));
    const opciones = within(panel).getAllByRole('menuitemradio').map((o) => o.textContent);
    expect(opciones).toEqual(['Directa de la fase', '1.2Pagos']);
    fireEvent.click(within(panel).getByRole('menuitemradio', { name: /Pagos/ }));
    await waitFor(() => expect(onCambiarPadre).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'p', 2));
  });

  it('el historial dice el origen de cada cambio', async () => {
    const cargarHistorial = vi.fn(async () => [
      { id: '1', cuando: d(10, 12), quien: 'Ana Ruiz', texto: 'cambió el estado', origen: 'mcp' as const },
      { id: '2', cuando: d(10, 1), quien: null, texto: 'se creó', origen: 'importacion' as const },
    ]);
    const { container } = montar({ panel: { cargarHistorial } });
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    await waitFor(() => expect(within(panel).getByText('Historial · 2 cambios')).toBeTruthy());
    const origenes = [...panel.querySelectorAll('.horg')].map((o) => [o.textContent, o.getAttribute('title')]);
    expect(origenes).toEqual([
      ['MCP', 'Hecho por un asistente conectado por MCP, en nombre de esa persona'],
      ['Importación', 'Llegó al importar un archivo'],
    ]);
  });

  it('«Registrar» pide horas válidas antes de llamar a la app', async () => {
    const onRegistrarHoras = vi.fn(() => true);
    const { container } = montar({ panel: { onRegistrarHoras } });
    fireEvent.click(tarjeta(container, '1.1'));
    const panel = container.querySelector('.dp4') as HTMLElement;
    fireEvent.click(within(panel).getByRole('button', { name: 'Registrar' }));
    const campo = within(panel).getByLabelText('Horas trabajadas hoy');
    fireEvent.change(campo, { target: { value: '30' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(within(panel).getByRole('alert').textContent).toMatch(/entre 0,1 y 24/);
    expect(onRegistrarHoras).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: '1,5' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    await waitFor(() => expect(onRegistrarHoras).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 1.5));
  });

  it('sin permiso de costos, el panel lo dice en vez de la cifra', () => {
    const { container } = montar();
    fireEvent.click(tarjeta(container, '1.1'));
    expect((container.querySelector('.dp4 .locked') as HTMLElement).textContent).toBe('Visible para gerente y Finanzas');
  });
});

describe('Panel v4 · reglas', () => {
  const x = { fijas: 'Fechas fijas', ninguna: 'Ninguna', noAntesDel: (f: string) => `No antes del ${f}`, terminarEl: (f: string) => `Terminar el ${f}` } as never;
  const f = (dd: Date) => `${dd.getDate()}/${dd.getMonth() + 1}`;
  it('el texto de la restricción', () => {
    expect(textoDeRestriccion(hoja('a', 'A'), x, f)).toBe('Ninguna');
    expect(textoDeRestriccion(hoja('a', 'A', { fijada: true }), x, f)).toBe('Fechas fijas');
    expect(textoDeRestriccion(hoja('a', 'A', { noAntesDe: d(10, 3) }), x, f)).toBe('No antes del 3/11');
  });
  it('cada opción borra lo que no le toca', () => {
    const t = hoja('a', 'A', { terminarEl: d(10, 30) });
    expect(cambiosDeRestriccion(t, 'ini')).toEqual({ fijada: false, noAntesDe: t.startDate, terminarEl: null });
    expect(cambiosDeRestriccion(t, 'none')).toEqual({ fijada: false, noAntesDe: null, terminarEl: null });
    expect(cambiosDeRestriccion(t, 'fin')).toEqual({ fijada: false, noAntesDe: null, terminarEl: t.endDate });
  });
  it('el desfase en días hábiles', () => {
    const tx = { sinDesfase: 'Sin desfase', dias: (n: number) => `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}` } as never;
    expect(textoDeDesfase(0, tx)).toBe('Sin desfase');
    expect(textoDeDesfase(2, tx)).toBe('+2 días hábiles');
    expect(textoDeDesfase(-1, tx)).toBe('−1 día hábil');
  });
  it('las horas escritas: con coma o punto, entre 0,1 y 24', () => {
    expect(leerHoras('1,5')).toBe(1.5);
    expect(leerHoras('2')).toBe(2);
    expect(leerHoras('0')).toBeNull();
    expect(leerHoras('25')).toBeNull();
    expect(leerHoras('1,25')).toBeNull();
    expect(leerHoras('abc')).toBeNull();
  });
});
