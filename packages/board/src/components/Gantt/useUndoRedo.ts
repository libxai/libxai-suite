import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoResult<T> {
  state: T;
  setState: (newStateOrUpdater: T | ((prev: T) => T), addToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

/**
 * Custom hook for undo/redo functionality
 * @param initialState - Initial state value
 * @param maxHistorySize - Maximum number of history entries (default: 50)
 */
export function useUndoRedo<T>(
  initialState: T,
  maxHistorySize: number = 50
): UseUndoRedoResult<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Track if we're currently applying undo/redo to avoid infinite loops
  const isApplyingHistory = useRef(false);

  const setState = useCallback(
    (newStateOrUpdater: T | ((prev: T) => T), addToHistory: boolean = true) => {
      setHistory((currentHistory) => {
        // Resolve the new state (handle both direct values and updater functions)
        const resolvedNewState =
          typeof newStateOrUpdater === 'function'
            ? (newStateOrUpdater as (prev: T) => T)(currentHistory.present)
            : newStateOrUpdater;

        if (isApplyingHistory.current) {
          // If we're applying history, just update present without adding to history
          return {
            ...currentHistory,
            present: resolvedNewState,
          };
        }

        if (!addToHistory) {
          // Direct state update without history
          return {
            ...currentHistory,
            present: resolvedNewState,
          };
        }

        const newPast = [...currentHistory.past, currentHistory.present];

        // Limit history size
        if (newPast.length > maxHistorySize) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: resolvedNewState,
          future: [], // Clear future when making a new change
        };
      });
    },
    [maxHistorySize]
  );

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) {
        return currentHistory;
      }

      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, currentHistory.past.length - 1);

      isApplyingHistory.current = true;
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 0);

      return {
        past: newPast,
        present: previous,
        future: [currentHistory.present, ...currentHistory.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) {
        return currentHistory;
      }

      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);

      isApplyingHistory.current = true;
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 0);

      return {
        past: [...currentHistory.past, currentHistory.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((currentHistory) => ({
      past: [],
      present: currentHistory.present,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
  };
}
