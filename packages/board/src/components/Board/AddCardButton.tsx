/**
 * AddCardButton Component - ClickUp-style inline task creation
 * Inline form to add new cards/tasks to a Kanban column
 * @module components/Board/AddCardButton
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '../../utils'
import type { User } from '../Card/UserAssignmentSelector'

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
  availableUsers?: User[]
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

/**
 * AddCardButton - ClickUp-style inline form to add new cards to a Kanban column
 *
 * Features:
 * - Expandable inline form with accent border
 * - Quick name input with inline action buttons
 * - Optional: assignee selector, date picker, priority
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 *
 * @example
 * ```tsx
 * <AddCardButton
 *   columnId="todo"
 *   onAddCard={(data) => createTask(data)}
 *   availableUsers={users}
 * />
 * ```
 */
export function AddCardButton({
  columnId,
  onAddCard,
  availableUsers = [],
  className,
  placeholder,
  buttonLabel,
  disabled = false,
  theme = 'dark',
  locale = 'es',
}: AddCardButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent' | ''>('')
  const [showAssignees, setShowAssignees] = useState(false)
  const [showDates, setShowDates] = useState(false)
  const [showPriority, setShowPriority] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Translations
  const t = {
    placeholder: placeholder || (locale === 'es' ? 'Nombre de la tarea...' : 'Task Name...'),
    buttonLabel: buttonLabel || (locale === 'es' ? 'Agregar Tarea' : 'Add Task'),
    save: locale === 'es' ? 'Guardar' : 'Save',
    addAssignee: locale === 'es' ? 'Agregar asignado' : 'Add assignee',
    addDates: locale === 'es' ? 'Agregar fechas' : 'Add dates',
    addPriority: locale === 'es' ? 'Agregar prioridad' : 'Add priority',
    startDate: locale === 'es' ? 'Inicio' : 'Start',
    endDate: locale === 'es' ? 'Fin' : 'End',
    low: locale === 'es' ? 'Baja' : 'Low',
    medium: locale === 'es' ? 'Media' : 'Medium',
    high: locale === 'es' ? 'Alta' : 'High',
    urgent: locale === 'es' ? 'Urgente' : 'Urgent',
  }

  // Cancel handler - defined early for useEffect dependency
  const handleCancel = useCallback(() => {
    setName('')
    setSelectedAssignees([])
    setStartDate('')
    setEndDate('')
    setPriority('')
    setShowAssignees(false)
    setShowDates(false)
    setShowPriority(false)
    setIsExpanded(false)
  }, [])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Handle click outside to collapse
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        if (!name.trim()) {
          handleCancel()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded, name, handleCancel])

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName || isSubmitting) return

    setIsSubmitting(true)

    try {
      await onAddCard({
        name: trimmedName,
        columnId,
        assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        priority: priority || undefined,
      })

      // Reset form
      setName('')
      setSelectedAssignees([])
      setStartDate('')
      setEndDate('')
      setPriority('')
      setShowAssignees(false)
      setShowDates(false)
      setShowPriority(false)
      // Keep expanded for quick consecutive adds
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error creating card:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [name, columnId, selectedAssignees, startDate, endDate, priority, onAddCard, isSubmitting])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        handleCancel()
      }
    },
    [handleSubmit, handleCancel]
  )

  const toggleAssignee = useCallback((userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }, [])

  // Theme-based colors
  const isDark = theme === 'dark'

  // ClickUp-style "+ Add Task" button (collapsed state)
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
          'text-emerald-500 hover:text-emerald-400',
          isDark ? 'hover:bg-[#2a2a3e]' : 'hover:bg-gray-100',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="text-sm font-medium">{t.buttonLabel}</span>
      </button>
    )
  }

  // ClickUp-style expanded form with accent border
  return (
    <div
      ref={formRef}
      className={cn(
        'rounded-lg overflow-hidden shadow-lg',
        isDark ? 'bg-[#1e1e2e]' : 'bg-white',
        className
      )}
      style={{
        border: '2px solid #10b981', // Emerald/turquoise accent border like ClickUp
      }}
    >
      {/* Main input area */}
      <div className="p-3">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.placeholder}
          disabled={isSubmitting}
          className={cn(
            'w-full px-0 py-1 text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-0',
            isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
          )}
        />

        {/* Inline action buttons row - ClickUp style */}
        <div className="flex items-center gap-1 mt-3">
          {/* Add Assignee */}
          {availableUsers.length > 0 && (
            <button
              onClick={() => setShowAssignees(!showAssignees)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors',
                showAssignees || selectedAssignees.length > 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isDark
                    ? 'text-gray-400 hover:bg-[#2a2a3e] hover:text-gray-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              )}
              type="button"
              title={t.addAssignee}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {selectedAssignees.length > 0 && (
                <span className="ml-0.5">{selectedAssignees.length}</span>
              )}
            </button>
          )}

          {/* Add Dates */}
          <button
            onClick={() => setShowDates(!showDates)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors',
              showDates || startDate || endDate
                ? 'bg-blue-500/20 text-blue-400'
                : isDark
                  ? 'text-gray-400 hover:bg-[#2a2a3e] hover:text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
            type="button"
            title={t.addDates}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          {/* Add Priority */}
          <button
            onClick={() => setShowPriority(!showPriority)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors',
              showPriority || priority
                ? priority === 'urgent' ? 'bg-red-500/20 text-red-400'
                  : priority === 'high' ? 'bg-orange-500/20 text-orange-400'
                  : priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400'
                  : priority === 'low' ? 'bg-green-500/20 text-green-400'
                  : 'bg-orange-500/20 text-orange-400'
                : isDark
                  ? 'text-gray-400 hover:bg-[#2a2a3e] hover:text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
            type="button"
            title={t.addPriority}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Save button */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium text-white transition-all',
              'bg-emerald-500 hover:bg-emerald-600',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500'
            )}
            type="button"
          >
            {isSubmitting ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t.save
            )}
          </button>
        </div>
      </div>

      {/* Expandable Sections */}
      {showAssignees && availableUsers.length > 0 && (
        <div className={cn(
          'px-3 pb-3 pt-0',
          'border-t',
          isDark ? 'border-[#3a3a4e]' : 'border-gray-200'
        )}>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {availableUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleAssignee(user.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all',
                  selectedAssignees.includes(user.id)
                    ? 'bg-emerald-500 text-white'
                    : isDark
                      ? 'bg-[#2a2a3e] text-gray-300 hover:bg-[#3a3a4e]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                type="button"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                ) : (
                  <div className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium',
                    selectedAssignees.includes(user.id) ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
                  )}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{user.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showDates && (
        <div className={cn(
          'px-3 pb-3 pt-0',
          'border-t',
          isDark ? 'border-[#3a3a4e]' : 'border-gray-200'
        )}>
          <div className="grid grid-cols-2 gap-2 pt-3">
            <div>
              <label className={cn('block text-[10px] uppercase tracking-wide mb-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                {t.startDate}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  'w-full px-2 py-1.5 rounded text-xs border',
                  isDark
                    ? 'bg-[#2a2a3e] border-[#3a3a4e] text-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                )}
              />
            </div>
            <div>
              <label className={cn('block text-[10px] uppercase tracking-wide mb-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                {t.endDate}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn(
                  'w-full px-2 py-1.5 rounded text-xs border',
                  isDark
                    ? 'bg-[#2a2a3e] border-[#3a3a4e] text-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                )}
              />
            </div>
          </div>
        </div>
      )}

      {showPriority && (
        <div className={cn(
          'px-3 pb-3 pt-0',
          'border-t',
          isDark ? 'border-[#3a3a4e]' : 'border-gray-200'
        )}>
          <div className="flex gap-1.5 pt-3">
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
              const colors = {
                low: 'bg-green-500',
                medium: 'bg-yellow-500',
                high: 'bg-orange-500',
                urgent: 'bg-red-500',
              }
              return (
                <button
                  key={p}
                  onClick={() => setPriority(priority === p ? '' : p)}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all',
                    priority === p
                      ? `${colors[p]} text-white`
                      : isDark
                        ? 'bg-[#2a2a3e] text-gray-400 hover:bg-[#3a3a4e]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                  type="button"
                >
                  {t[p]}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
