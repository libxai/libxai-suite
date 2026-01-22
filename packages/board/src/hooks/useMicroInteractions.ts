/**
 * useMicroInteractions - Hook for cell-level micro-interactions
 *
 * Features:
 * - Flash green on save (visual feedback)
 * - Slot machine number animation
 * - Delayed checkbox confirmation
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Flash effect for save confirmation
 * Shows a brief green flash when data is saved
 */
export function useSaveFlash(duration = 600) {
  const [isFlashing, setIsFlashing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsFlashing(true);
    timeoutRef.current = setTimeout(() => {
      setIsFlashing(false);
    }, duration);
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isFlashing, triggerFlash };
}

/**
 * Slot machine animation for number changes
 * Animates through intermediate values when number changes
 */
export function useSlotMachine(
  value: number | undefined,
  options: {
    enabled?: boolean;
    duration?: number;
    steps?: number;
  } = {}
) {
  const { enabled = true, duration = 400, steps = 8 } = options;
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValueRef = useRef(value);
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any pending animations
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];

    if (!enabled || value === previousValueRef.current || value === undefined) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current ?? 0;
    const endValue = value;
    const diff = endValue - startValue;
    const stepDuration = duration / steps;

    setIsAnimating(true);

    // Animate through intermediate values
    for (let i = 1; i <= steps; i++) {
      const timeout = setTimeout(() => {
        // Ease-out animation
        const progress = i / steps;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const intermediateValue = Math.round(startValue + diff * easedProgress);
        setDisplayValue(intermediateValue);

        if (i === steps) {
          setIsAnimating(false);
          setDisplayValue(endValue);
        }
      }, stepDuration * i);

      animationRef.current.push(timeout);
    }

    previousValueRef.current = value;

    return () => {
      animationRef.current.forEach(clearTimeout);
      animationRef.current = [];
    };
  }, [value, enabled, duration, steps]);

  return { displayValue, isAnimating };
}

/**
 * Delayed checkbox confirmation
 * Shows intermediate state before committing the change
 */
export function useDelayedCheckbox(
  onChange: ((value: boolean) => void) | undefined,
  options: {
    delay?: number;
    onCancel?: () => void;
  } = {}
) {
  const { delay = 1500, onCancel } = options;
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startChange = useCallback((newValue: boolean) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setPendingValue(newValue);
    setProgress(0);

    // Progress animation
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / delay) * 100, 100);
      setProgress(newProgress);
    }, 16); // ~60fps

    // Commit after delay
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      onChange?.(newValue);
      setPendingValue(null);
      setProgress(0);
    }, delay);
  }, [delay, onChange]);

  const cancelChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setPendingValue(null);
    setProgress(0);
    onCancel?.();
  }, [onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isPending = pendingValue !== null;

  return {
    pendingValue,
    isPending,
    progress,
    startChange,
    cancelChange,
  };
}

/**
 * CSS class generator for flash animation
 */
export function getFlashClasses(isFlashing: boolean, isDark: boolean): string {
  if (!isFlashing) return '';

  return isDark
    ? 'animate-flash-save-dark'
    : 'animate-flash-save-light';
}

/**
 * CSS for flash animations (to be added to stylesheets)
 */
export const FLASH_ANIMATION_CSS = `
@keyframes flash-save-dark {
  0% { background-color: transparent; }
  25% { background-color: rgba(34, 197, 94, 0.3); }
  100% { background-color: transparent; }
}

@keyframes flash-save-light {
  0% { background-color: transparent; }
  25% { background-color: rgba(34, 197, 94, 0.2); }
  100% { background-color: transparent; }
}

.animate-flash-save-dark {
  animation: flash-save-dark 0.6s ease-out;
}

.animate-flash-save-light {
  animation: flash-save-light 0.6s ease-out;
}
`;
