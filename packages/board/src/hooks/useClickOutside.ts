/**
 * useClickOutside Hook
 * Detects clicks outside of a specified element
 * @module hooks/useClickOutside
 */

import { useEffect, RefObject } from 'react'

/**
 * Hook to detect clicks outside of specified elements
 * @param refs - Array of refs or single ref to monitor
 * @param handler - Callback when click outside is detected
 * @param enabled - Whether the hook is enabled (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T> | RefObject<T>[],
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const refsArray = Array.isArray(refs) ? refs : [refs]

      // Check if click is inside any of the refs
      const isInside = refsArray.some((ref) => {
        const el = ref.current
        if (!el) return false

        const target = event.target as Node
        return el === target || el.contains(target)
      })

      if (!isInside) {
        handler(event)
      }
    }

    // Add listeners with a small delay to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', listener)
      document.addEventListener('touchstart', listener)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [refs, handler, enabled])
}
