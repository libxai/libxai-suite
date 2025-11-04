import { useState, useCallback } from 'react';

export function useGanttSelection() {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

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
