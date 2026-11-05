import { describe, it, expect } from 'vitest';
import { aplicarFiltros, cuantosFiltros, opcionesDeFiltro, SIN_FILTROS, SIN_RESPONSABLE } from './filtrosDelGantt';
import type { Task } from './types';

const persona = (name: string) => ({ name, initials: name[0]!, color: '#000' });
const tarea = (id: string, extra: Partial<Task> = {}): Task => ({ id, name: id, startDate: new Date(2026, 10, 2), endDate: new Date(2026, 10, 6), progress: 0, status: 'todo', ...extra } as Task);
const arbol: Task[] = [
  tarea('F1', { name: 'Diseño', assignees: [persona('Grupo')], subtasks: [
    tarea('a', { assignees: [persona('Ana')], priority: 'high' }),
    tarea('b', { assignees: [persona('Luis')], priority: 'low', startDate: new Date(2026, 10, 16), endDate: new Date(2026, 10, 20) }),
  ] }),
  tarea('F2', { name: 'Obra', subtasks: [tarea('c', { priority: 'high' })] }),
  tarea('suelta', { assignees: [persona('Ana')] }),
];
const ids = (ts: Task[]): string[] => ts.flatMap((t) => [t.id, ...ids(t.subtasks ?? [])]);

describe('filtros del Gantt', () => {
  it('sin filtros devuelve el mismo árbol', () => {
    expect(aplicarFiltros(arbol, SIN_FILTROS)).toBe(arbol);
  });
  it('responsable: se queda el grupo con su hija, y no el grupo que no tiene ninguna', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, responsables: ['Ana'] }))).toEqual(['F1', 'a', 'suelta']);
  });
  it('el responsable de un grupo no lo salva: mandan las tareas de trabajo', () => {
    expect(aplicarFiltros(arbol, { ...SIN_FILTROS, responsables: ['Grupo'] })).toEqual([]);
  });
  it('sin responsable', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, responsables: [SIN_RESPONSABLE] }))).toEqual(['F2', 'c']);
  });
  it('fase: solo esa rama', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, fases: ['F2'] }))).toEqual(['F2', 'c']);
  });
  it('prioridad: una tarea sin prioridad no coincide', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, prioridades: ['high'] }))).toEqual(['F1', 'a', 'F2', 'c']);
  });
  it('fechas: entra lo que se cruza con el rango, también con un solo extremo', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, desde: '2026-11-10', hasta: '2026-11-17' }))).toEqual(['F1', 'b']);
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, desde: '2026-11-07' }))).toEqual(['F1', 'b']);
    /* los extremos cuentan: las tareas van del 2 al 6 */
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, hasta: '2026-11-02' }))).toEqual(['F1', 'a', 'F2', 'c', 'suelta']);
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, desde: '2026-11-06', hasta: '2026-11-06' }))).toEqual(['F1', 'a', 'F2', 'c', 'suelta']);
  });
  it('una tarea sin fechas no entra en un rango', () => {
    const sinFechas = [tarea('x', { startDate: undefined, endDate: undefined })];
    expect(aplicarFiltros(sinFechas, { ...SIN_FILTROS, desde: '2026-01-01' })).toEqual([]);
  });
  it('los filtros se suman', () => {
    expect(ids(aplicarFiltros(arbol, { ...SIN_FILTROS, responsables: ['Ana'], prioridades: ['high'] }))).toEqual(['F1', 'a']);
  });
  it('el rango cuenta como un filtro', () => {
    expect(cuantosFiltros({ ...SIN_FILTROS, responsables: ['Ana', 'Luis'], desde: '2026-01-01', hasta: '2026-02-01' })).toBe(3);
  });
  it('opciones: solo lo que existe, sin la gente de los grupos', () => {
    const o = opcionesDeFiltro(arbol);
    expect(o.responsables).toEqual(['Ana', 'Luis']);
    expect(o.haySinResponsable).toBe(true);
    expect(o.fases.map((f) => f.nombre)).toEqual(['Diseño', 'Obra']);
    expect(o.prioridades).toEqual(['high', 'low']);
  });
});
