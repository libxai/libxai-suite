import { useEffect } from 'react';

interface UseGanttUndoRedoKeysOptions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for undo/redo
 * Ctrl+Z / Cmd+Z for undo
 * Ctrl+Y / Cmd+Shift+Z for redo
 */
export function useGanttUndoRedoKeys({
  undo,
  redo,
  canUndo,
  canRedo,
  enabled = true,
}: UseGanttUndoRedoKeysOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if (ctrlKey && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
      if (canRedo) {
        if (!isMac && ctrlKey && e.key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (isMac && ctrlKey && e.shiftKey && e.key === 'z') {
          e.preventDefault();
          redo();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo, enabled]);
}
