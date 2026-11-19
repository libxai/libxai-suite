/** QA Asakaa E14 (Yesid, 17-nov): el menú contextual con el mismo orden en todas las filas, y la sangría en el menú. */
import { describe, expect, it } from 'vitest';
import { armarMenuDeLaTarea, hermanaDeArriba, tienePadre, type EntradaDelMenu, type IdDelMenu } from './menuDeLaTarea';
import { indentTasks, outdentTasks } from './hierarchyUtils';
import type { Task } from './types';

const e = (label: string, disabled = false): EntradaDelMenu => ({ label, onClick: () => {}, disabled });
const todas = (deshabilitar: IdDelMenu[] = []): Partial<Record<IdDelMenu, EntradaDelMenu>> => Object.fromEntries(
  (['edit', 'addSubtask', 'indent', 'outdent', 'dependencies', 'milestone', 'markIncomplete', 'setInProgress', 'markComplete', 'duplicate', 'split', 'delete'] as IdDelMenu[])
    .map((id) => [id, e(id, deshabilitar.includes(id))]),
);

describe('el menú de la tarea', () => {
  it('una fase y una tarea final tienen las mismas opciones en el mismo orden (el caso de Yesid)', () => {
    const final = armarMenuDeLaTarea(todas());
    const fase = armarMenuDeLaTarea(todas(['edit', 'dependencies', 'milestone', 'markIncomplete', 'setInProgress', 'markComplete', 'split']));
    expect(fase.map((i) => i.id)).toEqual(final.map((i) => i.id));
    // la segunda opción es «Agregar subtarea» en las dos, nunca «Duplicar»
    expect(final[1]!.id).toBe('addSubtask');
    expect(fase[1]!.id).toBe('addSubtask');
    expect(fase.find((i) => i.id === 'edit')!.disabled).toBe(true);
    expect(fase.find((i) => i.id === 'duplicate')!.disabled).toBe(false);
  });
  it('trae sangría y quitar sangría, junto a agregar subtarea', () => {
    const ids = armarMenuDeLaTarea(todas()).map((i) => i.id);
    expect(ids.slice(0, 4)).toEqual(['edit', 'addSubtask', 'indent', 'outdent']);
  });
  it('una raya entre grupos, nunca al principio ni dos seguidas', () => {
    const items = armarMenuDeLaTarea({ addSubtask: e('a'), delete: e('d') });
    expect(items.map((i) => (i.separator ? '—' : i.id))).toEqual(['addSubtask', '—', 'delete']);
  });
});

const t = (id: string, position: number, subtasks?: Task[], isExpanded = true): Task =>
  ({ id, name: id, progress: 0, position, subtasks, isExpanded } as Task);

describe('la sangría', () => {
  // A (desplegada, con A1) · B
  const arbol = () => [t('A', 0, [t('A1', 0)]), t('B', 1)];

  it('la hermana de arriba es la del mismo nivel, no la última fila visible', () => {
    expect(hermanaDeArriba(arbol(), 'B')!.id).toBe('A');
    expect(hermanaDeArriba(arbol(), 'A')).toBeNull();
    expect(hermanaDeArriba(arbol(), 'A1')).toBeNull();
  });
  it('B con sangría queda bajo A (como lo guarda la app), no bajo A1', () => {
    const r = indentTasks(arbol(), ['B']);
    expect(r.map((x) => x.id)).toEqual(['A']);
    expect(r[0]!.subtasks!.map((x) => x.id)).toEqual(['A1', 'B']);
  });
  it('la primera de su nivel no cambia', () => {
    expect(indentTasks(arbol(), ['A']).map((x) => x.id)).toEqual(['A', 'B']);
  });
  it('quitar sangría solo si cuelga de otra', () => {
    expect(tienePadre(arbol(), 'A1')).toBe(true);
    expect(tienePadre(arbol(), 'B')).toBe(false);
    expect(outdentTasks(arbol(), ['A1']).map((x) => x.id)).toEqual(['A', 'A1', 'B']);
  });
});
