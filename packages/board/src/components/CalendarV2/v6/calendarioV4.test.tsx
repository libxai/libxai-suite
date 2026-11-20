/**
 * Guía v4 de Yesid · el Calendario (maqueta asakaa-calendario.html):
 *   · la barra que sigue de la semana anterior lleva el nombre atenuado; hasta 4 carriles y «+N más»;
 *   · «Semana» dibuja una barra continua por tarea, con las horas de cada día arriba;
 *   · la franja de vencidas muestra como máximo 3 y «+N más» (o «Ver en la Lista»);
 *   · los festivos, sombreados con su nombre; el pie dice el calendario del proyecto (con sábado hábil, solo el domingo);
 *   · «Vista» cambia el color de las barras y la leyenda; filtros por responsable, estado y fase;
 *   · la ficha abre la tarea en la Lista; «Horas y costo planeados por persona» con sus tres caras.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalendarioV6, VISTA_CALENDARIO_V6_POR_DEFECTO, FILTROS_CALENDARIO_V4_VACIOS, semanaIsoDe, type VistaCalendarioV6 } from './CalendarioV6';
import { calendarioDe } from '../../Gantt/motorDeProgramacion';
import type { Task } from '../../Gantt/types';

const HOY = new Date(2026, 10, 4, 12); // miércoles 4 nov 2026
const d = (m: number, dia: number) => new Date(2026, m, dia, 12);
const juan = { id: 'u1', name: 'Juan Pardo', initials: 'JP' };
const ana = { id: 'u2', name: 'Ana Ruiz', initials: 'AR' };
const hoja = (id: string, name: string, s: Date, e: Date, extra: Partial<Task> = {}): Task =>
  ({ id, name, startDate: s, endDate: e, progress: 0, status: 'todo', effortMinutes: 600, ...extra }) as Task;
const FESTIVOS = [{ date: '2026-11-16', name: 'Independencia de Cartagena' }];
const CAL = calendarioDe({ enabledWeekdays: [false, true, true, true, true, true, false], holidayDates: new Set(FESTIVOS.map((f) => f.date)) });

const tareas = (): Task[] => [
  { id: 'f1', name: 'Desarrollo', progress: 0, status: 'todo', subtasks: [
    hoja('a', 'Pantallas de inicio', d(9, 28), d(10, 11), { status: 'in-progress', progress: 50, assignees: [juan] as never }),
    hoja('b', 'Botón de pago', d(9, 26), d(9, 30), { assignees: [ana] as never }),
    hoja('c', 'Recibo', d(10, 9), d(10, 13), { dependencies: ['a'], status: 'blocked' } as Partial<Task>),
  ] } as Task,
  { id: 'f2', name: 'Pruebas', progress: 0, status: 'todo', subtasks: [
    hoja('d', 'Pruebas en dispositivos', d(10, 30), d(11, 4), { status: 'completed', progress: 100 }),
    ...[1, 2, 3, 4, 5].map((i) => hoja(`e${i}`, `Revisión ${i}`, d(10, 18), d(10, 18), { assignees: [juan] as never })),
  ] } as Task,
];

function montar(extra: Partial<React.ComponentProps<typeof CalendarioV6>> = {}, vista: Partial<VistaCalendarioV6> = {}) {
  return render(
    <CalendarioV6 tasks={tareas()} es cal={CAL} festivos={FESTIVOS} ancla={HOY} onAncla={() => {}}
      vista={{ ...VISTA_CALENDARIO_V6_POR_DEFECTO, ...vista }} onVista={() => {}} filtros={FILTROS_CALENDARIO_V4_VACIOS} onFiltros={() => {}}
      tarifaDe={() => 100000} monedaCodigo="COP" hoy={HOY} {...extra} />,
  );
}
const barras = (c: HTMLElement, id: string, sel = '.cb') => [...c.querySelectorAll<HTMLElement>(`${sel}[data-id="${id}"]`)];
afterEach(() => { window.location.hash = ''; });

describe('Calendario v4 · el mes', () => {
  it('título, resumen y la semana ISO', () => {
    const { container } = montar();
    expect(container.querySelector('.cal-title')!.textContent).toBe('Noviembre 2026');
    expect(container.querySelector('.cal-sum')!.textContent).toContain('8 tareas abiertas en el mes');
    expect(container.querySelector('.cal-sum')!.textContent).toContain('1 completada oculta Mostrar');
    expect(semanaIsoDe(d(10, 2))).toBe(45);
    expect(semanaIsoDe(new Date(2027, 0, 1, 12))).toBe(53);
    expect(semanaIsoDe(d(0, 1))).toBe(1);
  });

  it('la barra que sigue de la semana anterior: nombre atenuado, sin icono ni avance escrito', () => {
    const { container } = montar();
    const [primera, segunda, tercera] = barras(container, 'a');
    expect(primera!.className).not.toContain('cont');
    expect(primera!.querySelector('.schip.prog')).toBeTruthy();
    expect(primera!.querySelector('.pct')!.textContent).toBe('50%');
    expect(segunda!.className).toContain('cont');
    expect(segunda!.className).toContain('cl');
    expect(segunda!.querySelector('.schip')).toBeNull();
    expect(segunda!.getAttribute('title')).toBe('1.1 Pantallas de inicio · 28 oct–11 nov');
    expect(tercera!.className).toContain('cont');
  });

  it('hasta 4 carriles: con 5 tareas un día se ven 3 y «+2 más», que abre la lista del día', () => {
    const { container } = montar();
    const mas = screen.getByRole('button', { name: 'Ver las 5 tareas del 18 nov' });
    expect(mas.textContent).toBe('+2 más');
    const semana = mas.closest('.wk') as HTMLElement;
    expect(semana.querySelectorAll('.cb').length).toBe(3);
    fireEvent.click(mas);
    const lista = screen.getByRole('dialog', { name: 'Tareas del 18 nov' });
    expect(within(lista).getAllByRole('button').length).toBe(5);
    expect(container.querySelector('.cv-pop h4')!.textContent).toBe('Tareas del 18 nov · 5');
  });

  it('el alto de la semana sigue al contenido, con un mínimo de dos carriles', () => {
    const { container } = montar();
    const semanas = [...container.querySelectorAll<HTMLElement>('.wk')];
    expect(semanas[3]!.style.gridTemplateRows).toBe('25px repeat(4,22px) 7px'); // la del 18
    expect(semanas[5]!.style.gridTemplateRows).toBe('25px repeat(2,22px) 7px'); // vacía (la completada, oculta)
  });

  it('el festivo, sombreado con su nombre; el pie dice el calendario del proyecto', () => {
    const { container } = montar({ onVerCalendarioDelProyecto: () => {} });
    const dia = [...container.querySelectorAll('.day.hol')].find((e) => e.textContent?.includes('16'))!;
    expect(dia.querySelector('.hn')!.textContent).toBe('Independencia de Cartagena');
    expect(dia.querySelector('.sr')!.textContent).toBe('lunes 16 de noviembre, festivo: Independencia de Cartagena');
    expect(container.querySelector('.vfoot .fl')!.textContent).toBe('Calendario del proyecto: lunes a viernes, sin sus festivos (1 este mes)Ver en la Ficha');
    expect(container.querySelectorAll('.wk')[1]!.querySelectorAll('.day.we').length).toBe(2);
  });

  it('con sábado hábil solo se sombrea el domingo', () => {
    const { container } = montar({ diasLaborables: [false, true, true, true, true, true, true] });
    const semana = container.querySelectorAll('.wk')[1]!;
    expect([...semana.querySelectorAll('.day.we')].map((e) => e.querySelector('.n')!.textContent)).toEqual(['8']);
    expect(container.querySelector('.vfoot .fl')!.textContent).toContain('lunes a sábado');
  });

  it('«Vista» cambia el color de las barras y la leyenda', () => {
    const a = montar();
    expect(a.container.querySelector('section')!.className).toContain('by-estado');
    expect(a.container.querySelector('.legend-it')!.textContent).toBe('Por hacerEn progresoBloqueada');
    a.unmount();
    const { container } = montar({}, { color: 'fase' });
    expect(container.querySelector('section')!.className).toContain('by-fase');
    expect(container.querySelector('.legend-it')!.textContent).toBe('DesarrolloPruebas');
    expect(barras(container, 'b')[0]!.className).toContain('p1');
    expect(barras(container, 'e1')[0]!.className).toContain('p2');
  });

  it('las completadas: «Mostrar» las pone a la vista', () => {
    const onVista = vi.fn();
    const { container } = montar({ onVista });
    expect(barras(container, 'd').length).toBe(0);
    fireEvent.click(screen.getByRole('link', { name: 'Mostrar' }));
    expect(onVista).toHaveBeenCalledWith(expect.objectContaining({ mostrarHechas: true }));
  });

  it('el filtro de fase deja solo sus tareas y el resumen lo cuenta', () => {
    const onFiltros = vi.fn();
    const { container } = montar({ filtros: { ...FILTROS_CALENDARIO_V4_VACIOS, fases: ['f2'] }, onFiltros });
    expect(barras(container, 'a').length).toBe(0);
    expect(barras(container, 'e1').length).toBe(1);
    expect(container.querySelector('.cal-sum')!.textContent).toContain('1 filtro activo Quitar');
    fireEvent.click(screen.getByRole('link', { name: 'Quitar' }));
    expect(onFiltros).toHaveBeenCalledWith(FILTROS_CALENDARIO_V4_VACIOS);
  });
});

describe('Calendario v4 · las vencidas', () => {
  it('una línea de texto con «Ver en la Lista»', () => {
    const onVerVencidas = vi.fn();
    const { container } = montar({ onVerVencidas });
    const franja = screen.getByRole('group', { name: 'Vencidas: 1 tarea vencida sin terminar' });
    expect(franja.querySelector('.lr-h')!.textContent).toBe('1 vencida');
    expect(container.querySelector('.lr-it')!.getAttribute('title')).toBe('Venció el 30 oct, hace 3 días hábiles · Ana Ruiz');
    fireEvent.click(within(franja).getByRole('link', { name: 'Ver en la Lista' }));
    expect(onVerVencidas).toHaveBeenCalled();
  });

  it('como máximo 3 y «+N más»', () => {
    const muchas = [{ id: 'r', name: 'Atrasadas', progress: 0, status: 'todo', subtasks: [1, 2, 3, 4, 5, 6].map((i) => hoja(`v${i}`, `Vencida ${i}`, d(9, 1 + i), d(9, 10 + i))) } as Task];
    const onVerVencidas = vi.fn();
    montar({ tasks: muchas, onVerVencidas });
    const franja = screen.getByRole('group', { name: 'Vencidas: 6 tareas vencidas sin terminar' });
    expect(franja.querySelectorAll('.lr-it').length).toBe(3);
    const mas = within(franja).getByRole('link', { name: 'Ver las otras 3 vencidas en la Lista' });
    expect(mas.textContent).toBe('+3 más');
    expect(within(franja).queryByRole('link', { name: 'Ver en la Lista' })).toBeNull();
    fireEvent.click(mas);
    expect(onVerVencidas).toHaveBeenCalled();
  });
});

describe('Calendario v4 · la semana', () => {
  it('una barra continua de dos renglones por tarea, con las horas del día arriba', () => {
    const { container } = montar({}, { escala: 'semana' });
    expect(container.querySelector('.cal-title')!.textContent).toBe('2–8 nov 2026Semana 45');
    expect(barras(container, 'a', '.wb').length).toBe(1);
    const a = barras(container, 'a', '.wb')[0]!;
    expect(a.querySelector('.l1')!.textContent).toBe('1.1Pantallas de inicio50%');
    expect(a.querySelector('.l2')!.textContent).toBe('JPJuan Pardo·0,9 h al día·28 oct–11 nov');
    const lunes = container.querySelector('.wh') as HTMLElement;
    expect(lunes.querySelector('.tot')!.textContent).toBe('0,9 h');
  });

  it('la bloqueada dice a quién espera', () => {
    const { container } = montar({ ancla: d(10, 10) }, { escala: 'semana' });
    expect(barras(container, 'c', '.wb')[0]!.querySelector('.wait')!.textContent).toBe('Espera a 1.1');
  });
});

describe('Calendario v4 · la ficha y el pie', () => {
  it('la ficha: estado, fechas, horas y «Abrir en la Lista»', () => {
    const onAbrirEnLista = vi.fn();
    const { container } = montar({ onAbrirEnLista });
    fireEvent.click(barras(container, 'a')[0]!);
    const ficha = screen.getByRole('dialog', { name: 'Pantallas de inicio' });
    expect(ficha.querySelector('.fi-crumb')!.textContent).toBe('Fase 1 · Desarrollo');
    expect(ficha.textContent).toContain('11 días hábiles');
    expect(ficha.textContent).toContain('0 / 10 h');
    expect(barras(container, 'a').every((b) => b.className.includes('sel'))).toBe(true);
    fireEvent.click(within(ficha).getByRole('button', { name: 'Abrir en la Lista' }));
    expect(onAbrirEnLista).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), '1.1');
  });

  it('#t=1.3 abre el mes de la tarea y su ficha', () => {
    window.location.hash = '#t=1.3';
    const onAncla = vi.fn();
    montar({ onAncla });
    expect(onAncla).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Recibo' })).toBeTruthy();
  });

  it('horas y costo planeados por persona, con la nota y Recursos', () => {
    const onVerRecursos = vi.fn();
    const { container } = montar({ onVerRecursos });
    const pie = container.querySelector('details.res') as HTMLElement;
    expect(pie.querySelector('summary')!.textContent).toMatch(/^Horas y costo planeados por persona· 2 personas este mes · [\d,]+ h$/); // N14 · «Sin responsable» ya no cuenta como persona
    expect([...pie.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Persona', 'Tareas', 'Horas planeadas', 'Costo planeado']);
    expect(pie.querySelector('tbody tr:last-child td')!.textContent).toBe('+Sin responsable');
    fireEvent.click(within(pie).getByRole('link', { name: 'Ver la carga de cada persona en Recursos' }));
    expect(onVerRecursos).toHaveBeenCalled();
  });

  it('sin permiso de dinero: sin costo y el candado; con escalas distintas, «No evaluable»', () => {
    const a = montar({ conCosto: false });
    const pie = a.container.querySelector('details.res') as HTMLElement;
    expect([...pie.querySelectorAll('thead th')].map((t) => t.textContent)).toEqual(['Persona', 'Tareas', 'Horas planeadas']);
    expect(pie.textContent).toContain('Costo por persona: visible para gerente y Finanzas');
    expect(pie.textContent).not.toMatch(/\$/);
    a.unmount();
    const { container } = montar({ noEvaluable: 'Tarifas en escalas distintas' });
    const ne = container.querySelector('details.res tfoot .ne') as HTMLElement;
    expect(ne.textContent).toBe('No evaluable');
    expect(ne.getAttribute('title')).toBe('Tarifas en escalas distintas');
  });

  it('el «?» trae cómo leer el calendario', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cómo leer el calendario' }));
    const ayuda = screen.getByRole('dialog', { name: 'Cómo leer el calendario' });
    expect(ayuda.textContent).toContain('El tramo más intenso de una barra es su avance.');
    expect(ayuda.textContent).toContain('Rótulo atenuado: la barra continúa de la semana anterior.');
  });
});
