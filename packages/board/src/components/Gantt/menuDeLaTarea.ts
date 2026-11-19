/**
 * QA Asakaa E14 (Yesid, 17-nov): «Al abrir el menú contextual cerca de otra fila el orden cambia y se puede tocar
 * "Duplicate" queriendo "Add Subtask". No tiene "Sangría" ni "Quitar sangría".»
 *
 * Una fase (tarea con hijas) tenía un menú de 3 opciones y una tarea final uno de 10: la segunda opción era «Duplicar»
 * en una y «Agregar subtarea» en la otra. Ahora el menú tiene SIEMPRE las mismas opciones en el mismo orden; las que no
 * aplican a esa fila (o que la persona no puede usar) salen apagadas, no desaparecen. La tabla (TaskGrid) y las barras
 * (GanttBoard) arman su menú con esta misma función.
 */
import type { ContextMenuItem } from './ContextMenu';

export type IdDelMenu =
  | 'edit' | 'addSubtask' | 'indent' | 'outdent' | 'dependencies' | 'milestone'
  | 'markIncomplete' | 'setInProgress' | 'markComplete'
  | 'duplicate' | 'split'
  | 'delete';

/** El orden, por grupos (entre grupos va una raya). */
export const GRUPOS_DEL_MENU: IdDelMenu[][] = [
  ['edit', 'addSubtask', 'indent', 'outdent', 'dependencies', 'milestone'],
  ['markIncomplete', 'setInProgress', 'markComplete'],
  ['duplicate', 'split'],
  ['delete'],
];

export type EntradaDelMenu = Omit<ContextMenuItem, 'id' | 'separator'>;

/**
 * Arma el menú en el orden fijo. Una entrada `undefined` es una opción que este tablero no ofrece en NINGUNA fila
 * (p. ej. sin manejador de dependencias): se omite, y el orden sigue igual de fila a fila. Lo que no aplica a una fila
 * se pasa con `disabled: true`.
 */
export function armarMenuDeLaTarea(entradas: Partial<Record<IdDelMenu, EntradaDelMenu>>): ContextMenuItem[] {
  const items: ContextMenuItem[] = [];
  for (const grupo of GRUPOS_DEL_MENU) {
    const delGrupo = grupo.filter((id) => entradas[id]);
    if (!delGrupo.length) continue;
    if (items.length) items.push({ id: `sep-${delGrupo[0]}`, label: '', onClick: () => {}, separator: true });
    for (const id of delGrupo) items.push({ id, ...entradas[id]! });
  }
  return items;
}

interface ConHijas { id: string; position?: number; subtasks?: ConHijas[] }

/** La hermana de arriba (mismo nivel, por posición): la que pasaría a ser su padre al aplicarle sangría. */
export function hermanaDeArriba<T extends ConHijas>(tareas: T[], id: string): T | null {
  const ordenadas = [...tareas].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const i = ordenadas.findIndex((t) => t.id === id);
  if (i > 0) return ordenadas[i - 1]!;
  if (i === 0) return null;
  for (const t of tareas) {
    if (t.subtasks?.length) {
      const dentro = hermanaDeArriba(t.subtasks as T[], id);
      if (dentro || t.subtasks.some((h) => h.id === id)) return dentro;
    }
  }
  return null;
}

/** ¿Cuelga de otra tarea? (se le puede quitar la sangría) */
export function tienePadre(tareas: ConHijas[], id: string): boolean {
  for (const t of tareas) {
    if (t.subtasks?.some((h) => h.id === id)) return true;
    if (t.subtasks?.length && tienePadre(t.subtasks, id)) return true;
  }
  return false;
}
