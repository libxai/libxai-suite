/**
 * AddCardButton Component — Dashed "+" button + floating Chronos quick-create form
 * The form appears as a popover below the button, outside the column container
 * @module components/Board/AddCardButton
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils'
import { QuickTaskCreate } from './QuickTaskCreate'
import type { QuickTaskCreateData } from './QuickTaskCreate'
import type { User as UserType } from '../Card/UserAssignmentSelector'

export interface AddCardData {
  /** Task name (required) */
  name: string
  /** Column ID where the card will be created */
  columnId: string
  /** Assigned user IDs */
  assigneeIds?: string[]
  /** Start date */
  startDate?: Date
  /** End date / due date */
  endDate?: Date
  /** Priority */
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface AddCardButtonProps {
  /** Column ID where cards will be created */
  columnId: string
  /** Callback when a new card should be created */
  onAddCard: (data: AddCardData) => void | Promise<void>
  /** Available users for assignment */
  availableUsers?: UserType[]
  /** Custom class name */
  className?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Button label */
  buttonLabel?: string
  /** Whether the button is disabled */
  disabled?: boolean
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark'
  /** Locale for translations */
  locale?: 'en' | 'es'
}

export function AddCardButton({
  columnId,
  onAddCard,
  availableUsers = [],
  className,
  buttonLabel,
  disabled = false,
  theme = 'dark',
  locale = 'es',
}: AddCardButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const [opensUp, setOpensUp] = useState(false)

  const isDark = theme === 'dark'
  const isEs = locale === 'es'

  const t = {
    buttonLabel: buttonLabel || (isEs ? 'Agregar Tarea' : 'Add Task'),
  }

  // Position the popover: below button if space, above if not
  useEffect(() => {
    if (!isExpanded || !buttonRef.current) return

    const POPOVER_HEIGHT = 90 // approximate height of the quick-create form

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const goUp = spaceBelow < POPOVER_HEIGHT + 8

      setOpensUp(goUp)
      setPopoverStyle({
        position: 'fixed',
        ...(goUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }

    updatePosition()

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isExpanded])

  // Click-outside to close
  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        formRef.current && !formRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  const handleSubmit = useCallback((data: QuickTaskCreateData) => {
    onAddCard({
      name: data.name,
      columnId,
      assigneeIds: data.assigneeId ? [data.assigneeId] : undefined,
      startDate: data.startDate,
      endDate: data.endDate,
      priority: data.priority,
    })
  }, [onAddCard, columnId])

  return (
    <div ref={buttonRef} className={cn('asakaa-add-card', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className="asakaa-add-card__button"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t.buttonLabel}
      </button>

      {/* Portal popover — floats below the button, outside column */}
      {createPortal(
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, y: opensUp ? 4 : -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: opensUp ? 4 : -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={popoverStyle}
              className={cn(
                'rounded-lg shadow-2xl',
                isDark
                  ? 'bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
                  : 'bg-white border border-gray-200 shadow-xl'
              )}
            >
              <QuickTaskCreate
                onSubmit={handleSubmit}
                onCancel={() => setIsExpanded(false)}
                availableUsers={availableUsers}
                isDark={isDark}
                locale={locale}
                dropdownDirection="up"
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
