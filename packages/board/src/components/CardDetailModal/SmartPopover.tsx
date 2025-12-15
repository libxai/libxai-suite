/**
 * SmartPopover - Intelligent dropdown positioning
 *
 * Features:
 * - Uses Portal to escape overflow containers
 * - Calculates position relative to viewport
 * - Opens upward when no space below
 * - Locks scroll on parent containers
 * - Closes on outside click and Escape key
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { Portal } from '../Portal'

interface SmartPopoverProps {
  /** Reference to the trigger button */
  triggerRef: React.RefObject<HTMLElement>
  /** Whether the popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Popover content */
  children: ReactNode
  /** Menu width in pixels */
  width?: number
  /** Estimated menu height for positioning calculation */
  estimatedHeight?: number
  /** Additional className */
  className?: string
}

export function SmartPopover({
  triggerRef,
  isOpen,
  onClose,
  children,
  width = 200,
  estimatedHeight = 300,
  className = '',
}: SmartPopoverProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate position when opening
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return { top: 0, left: 0 }

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const GAP = 4

    // Horizontal: align with trigger
    let leftPos = rect.left
    if (leftPos + width > viewportWidth - 10) {
      leftPos = viewportWidth - width - 10
    }
    if (leftPos < 10) leftPos = 10

    // Vertical: open down if space, else up
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    let topPos: number

    if (spaceBelow >= estimatedHeight + GAP) {
      // Open downward
      topPos = rect.bottom + GAP
    } else if (spaceAbove >= estimatedHeight + GAP) {
      // Open upward - bottom of menu at top of button
      topPos = rect.top - estimatedHeight - GAP
    } else {
      // Not enough space - use direction with more space
      if (spaceBelow >= spaceAbove) {
        topPos = rect.bottom + GAP
      } else {
        topPos = Math.max(10, rect.top - estimatedHeight - GAP)
      }
    }

    return { top: topPos, left: leftPos }
  }, [triggerRef, width, estimatedHeight])

  // Update position when opening
  useEffect(() => {
    if (isOpen) {
      setPosition(calculatePosition())
    }
  }, [isOpen, calculatePosition])

  // v0.17.65: Scroll lock removed - position:fixed handles positioning correctly
  // The Portal renders outside the overflow container, so no lock needed

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose()
      }
    }

    // Use setTimeout to avoid immediate close on the same click that opened
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <Portal>
      <div
        ref={menuRef}
        className={`smart-popover ${className}`}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${width}px`,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          zIndex: 99999,
          padding: '6px',
          background: 'var(--modal-v2-bg, #1f1f1f)',
          border: '1px solid var(--modal-v2-border, rgba(255, 255, 255, 0.15))',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          animation: 'popoverSlideIn 100ms ease-out',
        }}
      >
        {children}
      </div>
    </Portal>
  )
}
