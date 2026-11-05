import { useEffect, useCallback, useRef } from 'react';
import { Task } from './types';

interface UseGanttKeyboardProps {
  tasks: Task[];
  selectedTaskIds: Set<string>;
  onTaskSelect: (taskId: string, multiSelect?: boolean) => void;
  onTaskCreate: (afterTaskId: string, direction: 'above' | 'below') => void;
  onTaskDelete: (taskIds: string[]) => void;
  onTaskDuplicate: (taskIds: string[]) => void;
  onTaskMove: (taskIds: string[], direction: 'up' | 'down') => void;
  onTaskIndent: (taskIds: string[]) => void;
  onTaskOutdent: (taskIds: string[]) => void;
  onTaskRename: (taskId: string) => void;
  onTaskToggleExpand: (taskId: string) => void;
  onOpenTaskModal: (taskId: string) => void;
  enableKeyboard?: boolean;
  /**
   * G15 · Gantt v6: el teclado solo actúa con el foco en una fila (el resto de la página conserva sus flechas y su
   * Tab, sin trampa de foco), Enter abre el panel, y las fechas y la sangría van con Alt.
   */
  v6?: { abrirPanel: (task: Task) => void; moverDias?: (task: Task, dias: number) => void };
}

export function useGanttKeyboard({
  tasks,
  selectedTaskIds,
  onTaskSelect,
  onTaskCreate,
  onTaskDelete,
  onTaskDuplicate,
  onTaskMove,
  onTaskIndent,
  onTaskOutdent,
  onTaskRename,
  onTaskToggleExpand,
  onOpenTaskModal,
  enableKeyboard = true,
  v6,
}: UseGanttKeyboardProps) {
  const isEditingRef = useRef(false);

  // Set editing state from outside
  const setIsEditing = useCallback((editing: boolean) => {
    isEditingRef.current = editing;
  }, []);

  // Flatten tasks for navigation
  const flattenTasks = useCallback((tasks: Task[]): Task[] => {
    const result: Task[] = [];
    const traverse = (tasks: Task[]) => {
      for (const task of tasks) {
        result.push(task);
        if (task.subtasks && task.subtasks.length > 0 && task.isExpanded) {
          traverse(task.subtasks);
        }
      }
    };
    traverse(tasks);
    return result;
  }, []);

  // Get first selected task
  const getFirstSelectedTask = useCallback(() => {
    const flatTasks = flattenTasks(tasks);
    for (const task of flatTasks) {
      if (selectedTaskIds.has(task.id)) {
        return task;
      }
    }
    return null;
  }, [tasks, selectedTaskIds, flattenTasks]);

  // Navigate with arrow keys
  const handleNavigation = useCallback(
    (direction: 'up' | 'down', multiSelect: boolean) => {
      const flatTasks = flattenTasks(tasks);
      if (flatTasks.length === 0) return;

      const selectedTask = getFirstSelectedTask();
      if (!selectedTask) {
        // No selection, select first task
        onTaskSelect(flatTasks[0].id, false);
        return;
      }

      const currentIndex = flatTasks.findIndex((t) => t.id === selectedTask.id);
      if (currentIndex === -1) return;

      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= flatTasks.length) return;

      const nextTask = flatTasks[nextIndex];
      onTaskSelect(nextTask.id, multiSelect);
    },
    [tasks, getFirstSelectedTask, flattenTasks, onTaskSelect]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if keyboard is disabled
      if (!enableKeyboard) return;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        isEditingRef.current;

      if (isInputField) {
        // Only allow Escape to cancel editing
        if (e.key === 'Escape') {
          target.blur();
          isEditingRef.current = false;
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      const selectedIds = Array.from(selectedTaskIds);
      const selectedTask = getFirstSelectedTask();

      if (v6) {
        const fila = target.closest?.('[data-task-row]');
        if (!fila) return;
        /* Sobre un botón de la fila, Enter y Espacio son de ese botón. */
        if (target !== fila && (e.key === 'Enter' || e.key === ' ')) return;
        /* Tab sale de la tabla: sangrar va con Alt+Mayús+flecha, como en MS Project. */
        if (e.key === 'Tab') return;
        /* La fila con el foco manda: se puede llegar a ella con Tab, sin haberla seleccionado. */
        const lista = flattenTasks(tasks);
        const id = fila.getAttribute('data-task-row');
        const indice = lista.findIndex((t) => t.id === id);
        const actual = lista[indice] ?? selectedTask;
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          const destino = lista[indice + (e.key === 'ArrowUp' ? -1 : 1)];
          if (destino) onTaskSelect(destino.id, false);
          return;
        }
        if (e.altKey && e.shiftKey && selectedIds.length > 0 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault();
          if (e.key === 'ArrowRight') onTaskIndent(selectedIds); else onTaskOutdent(selectedIds);
          return;
        }
        if (e.altKey && actual && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          /* Alt+← es «atrás» en el navegador: sin esto, además de mover la tarea, se va de la página. */
          e.preventDefault();
          v6.moverDias?.(actual, e.key === 'ArrowRight' ? 1 : -1);
          return;
        }
        if (actual && !e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault();
          const tieneHijas = !!actual.subtasks?.length;
          if (e.key === 'ArrowRight') {
            if (tieneHijas && !actual.isExpanded) onTaskToggleExpand(actual.id);
            else if (tieneHijas) { const hija = lista[indice + 1]; if (hija) onTaskSelect(hija.id, false); }
          } else if (tieneHijas && actual.isExpanded) onTaskToggleExpand(actual.id);
          else {
            /* En una hoja o un grupo cerrado, ← sube a su grupo, como en cualquier árbol. */
            const padre = lista.find((t) => t.subtasks?.some((h) => h.id === actual.id));
            if (padre) onTaskSelect(padre.id, false);
          }
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !ctrlOrCmd && actual) {
          e.preventDefault();
          v6.abrirPanel(actual);
          return;
        }
        if (e.key === 'Home' || e.key === 'End') {
          const destino = e.key === 'Home' ? lista[0] : lista[lista.length - 1];
          if (destino) { e.preventDefault(); onTaskSelect(destino.id, false); }
          return;
        }
      }

      // Navigation: Arrow Up/Down (con Alt mueven la tarea: más abajo)
      if (e.key === 'ArrowUp' && !e.altKey) {
        e.preventDefault();
        handleNavigation('up', e.shiftKey);
        return;
      }
      if (e.key === 'ArrowDown' && !e.altKey) {
        e.preventDefault();
        handleNavigation('down', e.shiftKey);
        return;
      }

      // Expand/Collapse: Arrow Right/Left
      if (selectedTask && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        if (selectedTask.subtasks && selectedTask.subtasks.length > 0) {
          e.preventDefault();
          if (e.key === 'ArrowRight' && !selectedTask.isExpanded) {
            onTaskToggleExpand(selectedTask.id);
          } else if (e.key === 'ArrowLeft' && selectedTask.isExpanded) {
            onTaskToggleExpand(selectedTask.id);
          }
        }
        return;
      }

      // Move: Alt + Arrow Up/Down
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          onTaskMove(selectedIds, e.key === 'ArrowUp' ? 'up' : 'down');
        }
        return;
      }

      // Indent: Tab
      if (e.key === 'Tab' && !e.shiftKey) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          onTaskIndent(selectedIds);
        }
        return;
      }

      // Outdent: Shift + Tab
      if (e.key === 'Tab' && e.shiftKey) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          onTaskOutdent(selectedIds);
        }
        return;
      }

      // Create below: Enter
      if (e.key === 'Enter' && !e.shiftKey && !ctrlOrCmd) {
        if (selectedTask) {
          e.preventDefault();
          onTaskCreate(selectedTask.id, 'below');
        }
        return;
      }

      // Create above: Shift + Enter
      if (e.key === 'Enter' && e.shiftKey && !ctrlOrCmd) {
        if (selectedTask) {
          e.preventDefault();
          onTaskCreate(selectedTask.id, 'above');
        }
        return;
      }

      // Open modal: Ctrl/Cmd + Enter
      if (e.key === 'Enter' && ctrlOrCmd) {
        if (selectedTask) {
          e.preventDefault();
          onOpenTaskModal(selectedTask.id);
        }
        return;
      }

      // Rename: F2
      if (e.key === 'F2') {
        if (selectedTask) {
          e.preventDefault();
          onTaskRename(selectedTask.id);
        }
        return;
      }

      // Delete: Delete or Cmd/Ctrl + Backspace
      if (e.key === 'Delete' || (e.key === 'Backspace' && ctrlOrCmd)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          onTaskDelete(selectedIds);
        }
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (e.key === 'd' && ctrlOrCmd && !e.shiftKey) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          onTaskDuplicate(selectedIds);
        }
        return;
      }
    },
    [
      enableKeyboard,
      selectedTaskIds,
      getFirstSelectedTask,
      handleNavigation,
      onTaskCreate,
      onTaskDelete,
      onTaskDuplicate,
      onTaskMove,
      onTaskIndent,
      onTaskOutdent,
      onTaskRename,
      onTaskToggleExpand,
      onOpenTaskModal,
      v6,
      tasks,
      flattenTasks,
      onTaskSelect,
    ]
  );

  // Register keyboard event listener
  useEffect(() => {
    if (!enableKeyboard) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboard, handleKeyDown]);

  return { setIsEditing };
}
