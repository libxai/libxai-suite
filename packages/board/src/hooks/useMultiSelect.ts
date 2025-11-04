/**
 * Multi-select hook for bulk operations
 * Supports keyboard modifiers (Cmd/Ctrl, Shift) for selection
 * @module hooks/useMultiSelect
 */

import { useCallback } from 'react'
import { useSelectionState } from './useSelectionState'
import type { Card } from '../types'

export interface UseMultiSelectReturn {
  /** Selected card IDs */
  selectedCardIds: string[]
  /** Last selected card ID */
  lastSelectedCardId: string | null
  /** Check if a card is selected */
  isCardSelected: (cardId: string) => boolean
  /** Select a card */
  selectCard: (cardId: string, event?: React.MouseEvent) => void
  /** Deselect a card */
  deselectCard: (cardId: string) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Select all cards */
  selectAll: () => void
  /** Toggle card selection */
  toggleCard: (cardId: string) => void
  /** Get selected cards */
  getSelectedCards: () => Card[]
}

export interface UseMultiSelectOptions {
  /** Board cards (required for range selection and selectAll) */
  cards: Card[]
}

/**
 * Hook for multi-select functionality
 *
 * @param options - Configuration options
 */
export function useMultiSelect(options: UseMultiSelectOptions): UseMultiSelectReturn {
  const { cards } = options
  const [selectionState, setSelectionState] = useSelectionState()

  const isCardSelected = useCallback(
    (cardId: string) => {
      return selectionState.selectedCardIds.includes(cardId)
    },
    [selectionState.selectedCardIds]
  )

  const selectCard = useCallback(
    (cardId: string, event?: React.MouseEvent) => {
      if (!event) {
        // Simple selection without modifiers
        setSelectionState({
          selectedCardIds: [cardId],
          lastSelectedCardId: cardId,
        })
        return
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey

      if (isCtrlOrCmd) {
        // Cmd/Ctrl+Click: Toggle card selection
        if (selectionState.selectedCardIds.includes(cardId)) {
          setSelectionState({
            selectedCardIds: selectionState.selectedCardIds.filter((id) => id !== cardId),
            lastSelectedCardId: selectionState.lastSelectedCardId,
          })
        } else {
          setSelectionState({
            selectedCardIds: [...selectionState.selectedCardIds, cardId],
            lastSelectedCardId: cardId,
          })
        }
      } else if (isShift && selectionState.lastSelectedCardId) {
        // Shift+Click: Range selection within same column
        const card = cards.find((c) => c.id === cardId)
        const lastCard = cards.find((c) => c.id === selectionState.lastSelectedCardId)

        if (card && lastCard && card.columnId === lastCard.columnId) {
          // Get all cards in the column
          const columnCards = cards
            .filter((c) => c.columnId === card.columnId)
            .sort((a, b) => a.position - b.position)

          const startIndex = columnCards.findIndex((c) => c.id === selectionState.lastSelectedCardId)
          const endIndex = columnCards.findIndex((c) => c.id === cardId)

          const [minIndex, maxIndex] = startIndex < endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex]

          const rangeCardIds = columnCards
            .slice(minIndex, maxIndex + 1)
            .map((c) => c.id)

          // Merge with existing selection
          const newSelection = Array.from(
            new Set([...selectionState.selectedCardIds, ...rangeCardIds])
          )

          setSelectionState({
            selectedCardIds: newSelection,
            lastSelectedCardId: cardId,
          })
        } else {
          // Different column or no last selection - treat as regular selection
          setSelectionState({
            selectedCardIds: [cardId],
            lastSelectedCardId: cardId,
          })
        }
      } else {
        // Regular click: Replace selection
        setSelectionState({
          selectedCardIds: [cardId],
          lastSelectedCardId: cardId,
        })
      }
    },
    [cards, selectionState, setSelectionState]
  )

  const deselectCard = useCallback(
    (cardId: string) => {
      setSelectionState({
        selectedCardIds: selectionState.selectedCardIds.filter((id) => id !== cardId),
        lastSelectedCardId: selectionState.lastSelectedCardId,
      })
    },
    [selectionState, setSelectionState]
  )

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedCardIds: [],
      lastSelectedCardId: null,
    })
  }, [setSelectionState])

  const selectAll = useCallback(() => {
    setSelectionState({
      selectedCardIds: cards.map((card) => card.id),
      lastSelectedCardId: cards[cards.length - 1]?.id || null,
    })
  }, [cards, setSelectionState])

  const toggleCard = useCallback(
    (cardId: string) => {
      if (selectionState.selectedCardIds.includes(cardId)) {
        deselectCard(cardId)
      } else {
        setSelectionState({
          selectedCardIds: [...selectionState.selectedCardIds, cardId],
          lastSelectedCardId: cardId,
        })
      }
    },
    [selectionState, deselectCard, setSelectionState]
  )

  const getSelectedCards = useCallback(() => {
    return cards.filter((card) =>
      selectionState.selectedCardIds.includes(card.id)
    )
  }, [cards, selectionState.selectedCardIds])

  return {
    selectedCardIds: selectionState.selectedCardIds,
    lastSelectedCardId: selectionState.lastSelectedCardId,
    isCardSelected,
    selectCard,
    deselectCard,
    clearSelection,
    selectAll,
    toggleCard,
    getSelectedCards,
  }
}
