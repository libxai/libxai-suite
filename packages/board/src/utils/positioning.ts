/**
 * Lexicographic positioning utilities
 * Uses fractional indexing for efficient reordering without touching all items
 * @module utils/positioning
 */

/**
 * Calculate position between two items
 * Uses lexicographic ordering (fractional indexing)
 *
 * @param before - Position of item before (or null if first)
 * @param after - Position of item after (or null if last)
 * @returns New position value
 *
 * @example
 * calculatePosition(null, 1000) // => 500 (before first item)
 * calculatePosition(1000, 2000) // => 1500 (between two items)
 * calculatePosition(1000, null) // => 2000 (after last item)
 */
export function calculatePosition(
  before: number | null,
  after: number | null
): number {
  // First item
  if (before === null && after === null) {
    return 1000
  }

  // Insert at beginning
  if (before === null && after !== null) {
    return after / 2
  }

  // Insert at end
  if (before !== null && after === null) {
    return before + 1000
  }

  // Insert between
  if (before !== null && after !== null) {
    return (before + after) / 2
  }

  return 1000
}

/**
 * Generate initial positions for an array of items
 * Spaces them 1000 apart for room to insert
 *
 * @param count - Number of items
 * @returns Array of position values
 */
export function generateInitialPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * 1000)
}

/**
 * Rebalance positions when they get too close
 * Call this periodically to maintain clean spacing
 *
 * @param positions - Current positions (sorted)
 * @returns Rebalanced positions
 */
export function rebalancePositions(positions: number[]): number[] {
  if (positions.length === 0) return []
  if (positions.length === 1) return [1000]

  const sorted = [...positions].sort((a, b) => a - b)
  return sorted.map((_, i) => (i + 1) * 1000)
}

/**
 * Check if positions need rebalancing
 * Returns true if any two positions are < 1 apart
 */
export function needsRebalancing(positions: number[]): boolean {
  const sorted = [...positions].sort((a, b) => a - b)

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1]! - sorted[i]! < 1) {
      return true
    }
  }

  return false
}

/**
 * Find position for dropping a card
 *
 * @param columnCards - Cards in target column (sorted by position)
 * @param dropIndex - Index where card is dropped
 * @returns New position value
 */
export function calculateDropPosition(
  columnCards: { position: number }[],
  dropIndex: number
): number {
  // Empty column
  if (columnCards.length === 0) {
    return 1000
  }

  // Drop at beginning
  if (dropIndex === 0) {
    return calculatePosition(null, columnCards[0]!.position)
  }

  // Drop at end
  if (dropIndex >= columnCards.length) {
    return calculatePosition(
      columnCards[columnCards.length - 1]!.position,
      null
    )
  }

  // Drop between items
  return calculatePosition(
    columnCards[dropIndex - 1]!.position,
    columnCards[dropIndex]!.position
  )
}
