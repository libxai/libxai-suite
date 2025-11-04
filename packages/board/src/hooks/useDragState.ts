/**
 * useDragState - React hook for drag state management
 * @module hooks/useDragState
 *
 * Replacement for Jotai's useAtom(dragStateAtom)
 */

import { useState, useEffect, useCallback } from 'react'
import { dragStore, type DragState } from '@libxai/core'

/**
 * Hook return type
 */
export type UseDragStateReturn = [
  state: DragState,
  setState: (state: DragState) => void
]

/**
 * React hook for drag state
 *
 * Drop-in replacement for `useAtom(dragStateAtom)`
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [dragState, setDragState] = useDragState()
 *
 *   const handleDragStart = () => {
 *     setDragState({
 *       isDragging: true,
 *       draggedCardId: 'card-1',
 *       sourceColumnId: 'col-1',
 *       targetColumnId: 'col-1',
 *     })
 *   }
 *
 *   return <div>{dragState.isDragging ? 'Dragging...' : 'Idle'}</div>
 * }
 * ```
 */
export function useDragState(): UseDragStateReturn {
  const [state, setState] = useState<DragState>(() => dragStore.getState())

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = dragStore.subscribe((newState) => {
      setState(newState)
    })

    return unsubscribe
  }, [])

  const setDragState = useCallback((newState: DragState) => {
    dragStore.setState(newState)
  }, [])

  return [state, setDragState]
}
