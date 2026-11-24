/**
 * AddCardButton Component — «+ Agregar tarea» y el formulario en línea.
 *
 * QA Latty R3 · N-17 / N-11 (Respuesta_Divar_R3 §2.5): un botón de texto dentro de la columna, alineado con las tarjetas,
 * sin borde punteado ni píldora; el formulario OCUPA SU LUGAR (antes flotaba en un portal y quedaba encima de la tarjeta
 * recién creada). Al guardar se queda debajo de la tarjeta nueva, vacío y con el cursor, para crear varias seguidas; se
 * cierra con Escape o al hacer clic fuera.
 * @module components/Board/AddCardButton
 */

import { useState, useCallback, useRef, useEffect } from 'react'
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

  const isDark = theme === 'dark'
  const isEs = locale === 'es'

  const t = {
    buttonLabel: buttonLabel || (isEs ? 'Agregar tarea' : 'Add task'), /* QA Latty BUG-26 · mayúscula sólo al principio, como el resto */
  }

  // Click-outside to close
  useEffect(() => {
    if (!isExpanded) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current && !buttonRef.current.contains(target)) {
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
    <div ref={buttonRef} className={cn('asakaa-add-card', isExpanded && 'asakaa-add-card--editing', className)} data-abierto={isExpanded ? '' : undefined}>
      {isExpanded ? (
        <QuickTaskCreate
          onSubmit={handleSubmit}
          onCancel={() => setIsExpanded(false)}
          availableUsers={availableUsers}
          isDark={isDark}
          locale={locale}
          dropdownDirection="up"
        />
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          className="asakaa-add-card__button"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t.buttonLabel}
        </button>
      )}
    </div>
  )
}
