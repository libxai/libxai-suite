import { useState, useCallback, useEffect } from 'react';

/**
 * ═══ LA SELECCION TAMBIEN ENTRA, NO SOLO SALE ═══════════════════════════════
 *
 * Divar, 27-ago: «al seleccionar el nombre de la subtarea, el selector en gantt
 * tambien se reubique».
 *
 * En 1.9.16 la seleccion empezo a SALIR (`onTaskSelectionChange`), y con eso el
 * panel del SaaS pudo seguir al resaltado. Pero el camino de vuelta no existia:
 * quien abre una tarea desde fuera —una subtarea, el breadcrumb, una
 * notificacion— no tenia forma de mover el resaltado, y las dos cosas quedaban
 * diciendo tareas distintas. Es el mismo desajuste que se arreglo, del otro
 * lado.
 *
 * `selectedTaskId` deja el resaltado gobernable desde fuera SIN quitarle su
 * estado propio: el Gantt sigue seleccionando solo con clic y flechas, y quien
 * lo monta puede ademas empujarlo a una fila concreta.
 */
export function useGanttSelection(selectedTaskId?: string | null) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  /*
   * SE SINCRONIZA SOLO CUANDO DE VERDAD CAMBIA, y esto es lo que evita un
   * bucle: el Gantt avisa hacia fuera al seleccionar, quien escucha abre esa
   * tarea, y eso vuelve aqui como `selectedTaskId`. Si se reescribiera el
   * estado sin comprobar, cada vuelta dispararia la siguiente.
   *
   * Comparando contra lo que YA hay, la segunda vuelta no hace nada y la
   * cadena se para sola.
   */
  useEffect(() => {
    if (!selectedTaskId) return;
    setSelectedTaskIds(prev => {
      if (prev.size === 1 && prev.has(selectedTaskId)) return prev;
      return new Set([selectedTaskId]);
    });
    setLastSelectedId(prev => (prev === selectedTaskId ? prev : selectedTaskId));
  }, [selectedTaskId]);

  // Select a single task
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(new Set([taskId]));
    setLastSelectedId(taskId);
  }, []);

  // Toggle task selection (Ctrl/Cmd + Click)
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
    setLastSelectedId(taskId);
  }, []);

  // Select range (Shift + Click or Shift + Arrow)
  const selectTaskRange = useCallback(
    (taskId: string, flatTaskIds: string[]) => {
      if (!lastSelectedId) {
        selectTask(taskId);
        return;
      }

      const lastIndex = flatTaskIds.indexOf(lastSelectedId);
      const currentIndex = flatTaskIds.indexOf(taskId);

      if (lastIndex === -1 || currentIndex === -1) {
        selectTask(taskId);
        return;
      }

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = flatTaskIds.slice(start, end + 1);

      setSelectedTaskIds(new Set(rangeIds));
      setLastSelectedId(taskId);
    },
    [lastSelectedId, selectTask]
  );

  // Handle task click with modifiers
  const handleTaskClick = useCallback(
    (taskId: string, flatTaskIds: string[], ctrlOrCmd: boolean, shift: boolean) => {
      if (shift) {
        selectTaskRange(taskId, flatTaskIds);
      } else if (ctrlOrCmd) {
        toggleTaskSelection(taskId);
      } else {
        selectTask(taskId);
      }
    },
    [selectTask, toggleTaskSelection, selectTaskRange]
  );

  // Handle selection from keyboard
  const handleKeyboardSelection = useCallback(
    (taskId: string, multiSelect: boolean) => {
      if (multiSelect) {
        setSelectedTaskIds((prev) => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });
      } else {
        selectTask(taskId);
      }
    },
    [selectTask]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Check if task is selected
  const isTaskSelected = useCallback(
    (taskId: string) => {
      return selectedTaskIds.has(taskId);
    },
    [selectedTaskIds]
  );

  return {
    selectedTaskIds,
    selectTask,
    toggleTaskSelection,
    selectTaskRange,
    handleTaskClick,
    handleKeyboardSelection,
    clearSelection,
    isTaskSelected,
  };
}
