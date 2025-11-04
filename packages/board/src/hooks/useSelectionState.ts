/**
 * useSelectionState - React hook for selection state management
 * @module hooks/useSelectionState
 *
 * Replacement for Jotai's useAtom(selectionStateAtom)
 */

import { useState, useEffect, useCallback } from 'react'
import { selectionStore, type SelectionState } from '@libxai/core'

/**
 * Hook return type
 */
export type UseSelectionStateReturn = [
  state: SelectionState,
  setState: (state: SelectionState) => void
]

/**
 * React hook for selection state
 *
 * Drop-in replacement for `useAtom(selectionStateAtom)`
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [selectionState, setSelectionState] = useSelectionState()
 *
 *   const handleSelect = (cardId: string) => {
 *     setSelectionState({
 *       selectedCardIds: [cardId],
 *       lastSelectedCardId: cardId,
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {selectionState.selectedCardIds.length} cards selected
 *     </div>
 *   )
 * }
 * ```
 */
export function useSelectionState(): UseSelectionStateReturn {
  const [state, setState] = useState<SelectionState>(() => selectionStore.getState())

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = selectionStore.subscribe((newState) => {
      setState(newState)
    })

    return unsubscribe
  }, [])

  const setSelectionState = useCallback((newState: SelectionState) => {
    selectionStore.setState(newState)
  }, [])

  return [state, setSelectionState]
}
