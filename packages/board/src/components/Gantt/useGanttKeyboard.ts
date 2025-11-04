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

      // Navigation: Arrow Up/Down
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNavigation('up', e.shiftKey);
        return;
      }
      if (e.key === 'ArrowDown') {
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
