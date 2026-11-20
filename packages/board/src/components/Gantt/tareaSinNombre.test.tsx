// Yesid (17-nov): ocho «New Task» vacías en P26031 («No guardar tareas sin nombre»).
// Enter en el nombre de una fila crea la siguiente: ahora entra con su nombre abierto y vacío; sin nombre, se quita y
// no se encadena otra; con nombre, se queda.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { GanttBoard } from './GanttBoard';
import { createTask } from './hierarchyUtils';
import type { Task } from './types';

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g.ResizeObserver) g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  if (!g.IntersectionObserver) g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  if (!window.matchMedia) (window as unknown as Record<string, unknown>).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});
afterEach(() => { cleanup(); try { localStorage.clear(); sessionStorage.clear(); } catch { /* */ } });

const hoy = new Date(2026, 10, 20);
const TAREAS: Task[] = [
  { id: 'a', name: 'Diseño', startDate: hoy, endDate: new Date(2026, 10, 25), progress: 0, status: 'todo' },
  { id: 'b', name: 'Montaje', startDate: hoy, endDate: new Date(2026, 10, 27), progress: 0, status: 'todo' },
];
const nombres = (t: Task[]): string[] => t.flatMap((x) => [x.name, ...nombres(x.subtasks ?? [])]);

function montar() {
  const cambios = vi.fn();
  const r = render(<GanttBoard tasks={TAREAS} onTasksChange={cambios} config={{ locale: 'es', disenoV6: true } as never} />);
  return { ...r, cambios, ultima: () => (cambios.mock.calls.at(-1)?.[0] ?? TAREAS) as Task[] };
}

function abrirNombreDe(nombre: string) {
  /* los botones de la fila salen al pasar el ratón */
  const fila = [...document.querySelectorAll('[data-task-row]')].find((f) => (f.textContent ?? '').includes(nombre)) as HTMLElement | undefined;
  if (!fila) throw new Error(`no está la fila ${nombre}`);
  /* F2 sobre la fila elegida abre su nombre (el atajo de la tabla); si no, el botón que sale al pasar el ratón */
  act(() => { fireEvent.click(fila); });
  act(() => { fireEvent.keyDown(document, { key: 'F2' }); });
  if (!document.querySelector('input[type="text"]')) {
    act(() => { fireEvent.mouseOver(fila, { relatedTarget: document.body }); fireEvent.mouseEnter(fila, { relatedTarget: document.body }); });
    const boton = fila.querySelector('[aria-label="Renombrar (F2)"]') as HTMLElement | null;
    if (!boton) throw new Error('no se abre el nombre de la fila');
    act(() => { fireEvent.click(boton); });
  }
  const campo = document.querySelector('input[type="text"]') as HTMLInputElement;
  expect(campo.value).toBe(nombre);
  return campo;
}

describe('la tarea insertada no se guarda sin nombre', () => {
  it('createTask: la nueva nace sin nombre (antes «New Task»)', () => {
    const { newTask } = createTask(TAREAS, 'a', 'below');
    expect(newTask.name).toBe('');
  });

  it('Enter en el nombre crea la siguiente con su nombre abierto; Escape la quita y no queda nada', () => {
    const m = montar();
    const campo = abrirNombreDe('Diseño');
    act(() => { fireEvent.keyDown(campo, { key: 'Enter' }); });
    const nueva = document.querySelector('input[placeholder="Nombre de la tarea"]') as HTMLInputElement;
    expect(nueva, 'la fila nueva entra con su nombre abierto').toBeTruthy();
    expect(nueva.value).toBe('');
    /* mientras se escribe, quien monta el Gantt la ve SIN nombre (y la app no la guarda) */
    expect(nombres(m.ultima())).toContain('');
    act(() => { fireEvent.keyDown(nueva, { key: 'Escape' }); });
    expect(document.querySelector('input[placeholder="Nombre de la tarea"]')).toBeNull();
    expect(nombres(m.ultima())).toEqual(['Diseño', 'Montaje']);
  });

  it('Enter con el nombre vacío no encadena otra fila', () => {
    const m = montar();
    const campo = abrirNombreDe('Diseño');
    act(() => { fireEvent.keyDown(campo, { key: 'Enter' }); });
    const nueva = document.querySelector('input[placeholder="Nombre de la tarea"]') as HTMLInputElement;
    act(() => { fireEvent.keyDown(nueva, { key: 'Enter' }); });
    expect(document.querySelector('input[placeholder="Nombre de la tarea"]')).toBeNull();
    expect(nombres(m.ultima())).toEqual(['Diseño', 'Montaje']);
  });

  it('si la app vuelve a pasar sus tareas (sin la fila, que no guardó) mientras se escribe, la fila sigue ahí', () => {
    const m = montar();
    const campo = abrirNombreDe('Diseño');
    act(() => { fireEvent.keyDown(campo, { key: 'Enter' }); });
    expect(document.querySelector('input[placeholder="Nombre de la tarea"]')).toBeTruthy();
    m.rerender(<GanttBoard tasks={TAREAS.map((t) => ({ ...t }))} onTasksChange={m.cambios} config={{ locale: 'es', disenoV6: true } as never} />);
    const nueva = document.querySelector('input[placeholder="Nombre de la tarea"]') as HTMLInputElement;
    expect(nueva, 'la fila por nombrar no se pierde').toBeTruthy();
    act(() => { fireEvent.change(nueva, { target: { value: 'Pruebas FAT' } }); });
    act(() => { fireEvent.blur(nueva); });
    expect(nombres(m.ultima())).toEqual(['Diseño', 'Pruebas FAT', 'Montaje']);
  });

  it('Tab en la recién insertada guarda su nombre a su nivel (la sangría se hace después, con la comprobación E5)', () => {
    const m = montar();
    const campo = abrirNombreDe('Diseño');
    act(() => { fireEvent.keyDown(campo, { key: 'Enter' }); });
    const nueva = document.querySelector('input[placeholder="Nombre de la tarea"]') as HTMLInputElement;
    act(() => { fireEvent.change(nueva, { target: { value: 'Pruebas FAT' } }); });
    act(() => { fireEvent.keyDown(nueva, { key: 'Tab' }); });
    const ultima = m.ultima();
    expect(ultima.map((t) => t.name)).toEqual(['Diseño', 'Pruebas FAT', 'Montaje']);
    expect(ultima.every((t) => !t.subtasks?.length)).toBe(true);
  });

  it('con nombre, se queda con ese nombre', () => {
    const m = montar();
    const campo = abrirNombreDe('Diseño');
    act(() => { fireEvent.keyDown(campo, { key: 'Enter' }); });
    const nueva = document.querySelector('input[placeholder="Nombre de la tarea"]') as HTMLInputElement;
    act(() => { fireEvent.change(nueva, { target: { value: 'Pruebas FAT' } }); });
    act(() => { fireEvent.blur(nueva); });
    expect(nombres(m.ultima())).toEqual(['Diseño', 'Pruebas FAT', 'Montaje']);
  });
});
