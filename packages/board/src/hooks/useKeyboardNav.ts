/**
 * useKeyboardNav Hook
 * Provides keyboard navigation for dropdown menus and lists
 * @module hooks/useKeyboardNav
 */

import { useEffect, useState, useCallback, RefObject } from 'react'

export interface UseKeyboardNavOptions {
  /** Total number of items */
  itemCount: number
  /** Callback when an item is selected */
  onSelect?: (index: number) => void
  /** Callback when escape is pressed */
  onEscape?: () => void
  /** Whether the navigation is enabled */
  enabled?: boolean
  /** Whether to loop around when reaching the end */
  loop?: boolean
  /** Container ref for scrolling into view */
  containerRef?: RefObject<HTMLElement>
}

export interface UseKeyboardNavReturn {
  /** Current active index */
  activeIndex: number
  /** Set the active index */
  setActiveIndex: (index: number) => void
  /** Handle keydown event */
  handleKeyDown: (event: React.KeyboardEvent) => void
  /** Get props for an item at index */
  getItemProps: (index: number) => {
    'data-active': boolean
    'data-index': number
    role: string
    tabIndex: number
  }
}

/**
 * Hook for keyboard navigation in dropdown menus
 */
export function useKeyboardNav({
  itemCount,
  onSelect,
  onEscape,
  enabled = true,
  loop = true,
  containerRef,
}: UseKeyboardNavOptions): UseKeyboardNavReturn {
  const [activeIndex, setActiveIndex] = useState(-1)

  // Scroll item into view when active index changes
  useEffect(() => {
    if (!enabled || activeIndex === -1 || !containerRef?.current) return

    const container = containerRef.current
    const activeItem = container.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement

    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex, enabled, containerRef])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveIndex((prev) => {
            if (prev === -1) return 0
            if (prev === itemCount - 1) return loop ? 0 : prev
            return prev + 1
          })
          break

        case 'ArrowUp':
          event.preventDefault()
          setActiveIndex((prev) => {
            if (prev === -1) return itemCount - 1
            if (prev === 0) return loop ? itemCount - 1 : prev
            return prev - 1
          })
          break

        case 'Enter':
        case ' ':
          event.preventDefault()
          if (activeIndex !== -1 && onSelect) {
            onSelect(activeIndex)
          }
          break

        case 'Escape':
          event.preventDefault()
          if (onEscape) {
            onEscape()
          }
          break

        case 'Home':
          event.preventDefault()
          setActiveIndex(0)
          break

        case 'End':
          event.preventDefault()
          setActiveIndex(itemCount - 1)
          break

        default:
          break
      }
    },
    [enabled, activeIndex, itemCount, loop, onSelect, onEscape]
  )

  const getItemProps = useCallback(
    (index: number) => ({
      'data-active': index === activeIndex,
      'data-index': index,
      role: 'option',
      tabIndex: -1,
    }),
    [activeIndex]
  )

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps,
  }
}
