/**
 * Dropdown Component
 * Base dropdown with Floating UI for intelligent positioning
 * Theme-aware, accessible, and performant
 * @module components/Dropdown
 */

import { useRef, useState, useCallback, ReactNode } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  arrow,
  FloatingArrow,
  Placement,
  useMergeRefs,
} from '@floating-ui/react'
import { Portal } from '../Portal'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useKeyboardNav } from '../../hooks/useKeyboardNav'
import './dropdown.css'

export interface DropdownProps {
  /** Trigger element (button, input, etc.) */
  trigger: ReactNode | ((props: { isOpen: boolean; toggle: () => void }) => ReactNode)

  /** Dropdown content */
  children: ReactNode | ((props: {
    activeIndex: number
    setActiveIndex: (index: number) => void
    close: () => void
  }) => ReactNode)

  /** Controlled open state */
  isOpen?: boolean

  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void

  /** Placement preference */
  placement?: Placement

  /** Offset from trigger (px) */
  offsetDistance?: number

  /** Max height for dropdown content (px) */
  maxHeight?: number

  /** Min width (defaults to trigger width) */
  minWidth?: number | 'trigger'

  /** Max width */
  maxWidth?: number

  /** Show arrow pointing to trigger */
  showArrow?: boolean

  /** Custom className for dropdown content */
  className?: string

  /** Custom className for trigger wrapper */
  triggerClassName?: string

  /** Disable click outside to close */
  disableClickOutside?: boolean

  /** Disable keyboard navigation */
  disableKeyboardNav?: boolean

  /** Number of items for keyboard navigation */
  itemCount?: number

  /** Callback when item is selected via keyboard */
  onSelectItem?: (index: number) => void

  /** Callback when dropdown opens */
  onOpen?: () => void

  /** Callback when dropdown closes */
  onClose?: () => void

  /** Animation duration (ms) */
  animationDuration?: number

  /** Z-index for dropdown */
  zIndex?: number
}

/**
 * Base Dropdown component with intelligent positioning
 * Uses Floating UI for automatic positioning and collision detection
 */
export function Dropdown({
  trigger,
  children,
  isOpen: controlledIsOpen,
  onOpenChange,
  placement = 'bottom-start',
  offsetDistance = 8,
  maxHeight = 320,
  minWidth = 'trigger',
  maxWidth,
  showArrow = false,
  className = '',
  triggerClassName = '',
  disableClickOutside = false,
  disableKeyboardNav = false,
  itemCount = 0,
  onSelectItem,
  onOpen,
  onClose,
  animationDuration: _animationDuration = 200,
  zIndex = 1000,
}: DropdownProps) {
  // Internal state for uncontrolled mode
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use controlled or uncontrolled state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const setIsOpen = useCallback(
    (newIsOpen: boolean) => {
      const wasOpen = isOpen
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(newIsOpen)
      }
      onOpenChange?.(newIsOpen)

      // Call lifecycle callbacks
      if (newIsOpen && !wasOpen) {
        onOpen?.()
      } else if (!newIsOpen && wasOpen) {
        onClose?.()
      }
    },
    [controlledIsOpen, onOpenChange, onOpen, onClose, isOpen]
  )

  const toggle = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen, setIsOpen])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  // Refs
  const localTriggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<SVGSVGElement>(null)

  // Floating UI setup
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      offset(offsetDistance),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth:
              minWidth === 'trigger' ? `${rects.reference.width}px` : minWidth ? `${minWidth}px` : undefined,
            maxWidth: maxWidth ? `${maxWidth}px` : undefined,
            maxHeight: `${maxHeight}px`,
          })
        },
        padding: 8,
      }),
      showArrow ? arrow({ element: arrowRef }) : null,
    ].filter(Boolean),
    whileElementsMounted: autoUpdate,
  })

  // Merge refs - connects local ref with Floating UI reference for positioning
  const triggerRef = useMergeRefs([localTriggerRef, refs.setReference])

  // Click outside to close
  useClickOutside(
    [localTriggerRef, dropdownRef],
    close,
    isOpen && !disableClickOutside
  )

  // Keyboard navigation
  const { activeIndex, setActiveIndex, handleKeyDown } = useKeyboardNav({
    itemCount,
    onSelect: onSelectItem,
    onEscape: close,
    enabled: isOpen && !disableKeyboardNav,
    loop: true,
    containerRef: dropdownRef,
  })

  // Render trigger
  const renderTrigger = () => {
    if (typeof trigger === 'function') {
      return trigger({ isOpen, toggle })
    }
    return trigger
  }

  // Render children
  const renderChildren = () => {
    if (typeof children === 'function') {
      return children({ activeIndex, setActiveIndex, close })
    }
    return children
  }

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        className={`dropdown-trigger ${triggerClassName}`}
        onClick={toggle}
      >
        {renderTrigger()}
      </div>

      {/* Dropdown Content - Only render when open to ensure proper positioning */}
      {isOpen && (
        <Portal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex,
            }}
            className={`dropdown-content ${className}`}
            role="menu"
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
          >
            <div ref={dropdownRef} className="dropdown-inner">
              {renderChildren()}
            </div>

            {/* Arrow */}
            {showArrow && (
              <FloatingArrow
                ref={arrowRef}
                context={context}
                className="dropdown-arrow"
              />
            )}
          </div>
        </Portal>
      )}
    </>
  )
}

// Export helper for creating dropdown items with keyboard nav props
export function createDropdownItem(props: ReturnType<typeof useKeyboardNav>['getItemProps'], content: ReactNode) {
  return (
    <div {...props} className="dropdown-item">
      {content}
    </div>
  )
}
