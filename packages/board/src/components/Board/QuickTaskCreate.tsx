/**
 * QuickTaskCreate — Chronos V2.0 Glass inline task creation form
 * Shared between CalendarBoard and KanbanBoard (AddCardButton)
 * @module components/Board/QuickTaskCreate
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, CalendarDays, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils'
import type { User as UserType } from '../Card/UserAssignmentSelector'

export interface QuickTaskCreateData {
  name: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: UserType
  assigneeId?: string | null
  startDate?: Date
  endDate?: Date
}

export interface QuickTaskCreateProps {
  /** Called when user submits the form */
  onSubmit: (data: QuickTaskCreateData) => void
  /** Called when user cancels / clicks outside */
  onCancel: () => void
  /** Available users for assignee picker */
  availableUsers?: UserType[]
  /** Dark or light theme */
  isDark?: boolean
  /** Locale for i18n */
  locale?: 'en' | 'es'
  /** Default date (e.g. the calendar cell's date) */
  defaultDate?: Date
  /** Extra CSS class */
  className?: string
  /** Whether dropdowns open upward (bottom-full) or downward (top-full). Default: 'up' */
  dropdownDirection?: 'up' | 'down'
}

export function QuickTaskCreate({
  onSubmit,
  onCancel,
  availableUsers = [],
  isDark = true,
  locale = 'es',
  defaultDate,
  className,
  dropdownDirection = 'up',
}: QuickTaskCreateProps) {
  const [name, setName] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent' | undefined>(undefined)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerMonth, setDatePickerMonth] = useState(defaultDate || new Date())

  const inputRef = useRef<HTMLInputElement>(null)
  const isEs = locale === 'es'

  // Dropdown position classes
  const ddPos = dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const closeAllDropdowns = useCallback(() => {
    setShowPriorityDropdown(false)
    setShowAssigneeDropdown(false)
    setShowDatePicker(false)
  }, [])

  const resetAndClose = useCallback(() => {
    setName('')
    setPriority(undefined)
    setAssigneeId(null)
    setSelectedDate(null)
    closeAllDropdowns()
    onCancel()
  }, [onCancel, closeAllDropdowns])

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    const selectedUser = availableUsers.find(u => u.id === assigneeId)
    const taskDate = selectedDate || defaultDate
    onSubmit({
      name: trimmed,
      priority,
      assignee: selectedUser || undefined,
      assigneeId,
      startDate: taskDate,
      endDate: taskDate,
    })
    // Reset for next task
    setName('')
    setPriority(undefined)
    setAssigneeId(null)
    setSelectedDate(null)
    closeAllDropdowns()
    inputRef.current?.focus()
  }, [name, priority, assigneeId, selectedDate, defaultDate, availableUsers, onSubmit, closeAllDropdowns])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && name.trim()) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Escape') {
        resetAndClose()
      }
    },
    [handleSubmit, resetAndClose, name]
  )

  const displayDate = selectedDate || defaultDate || new Date()

  return (
    <div
      className={cn('quick-task-create', className)}
      onClick={() => closeAllDropdowns()}
    >
      {/* Name input */}
      <div className="p-2.5">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isEs ? 'Nombre de la tarea...' : 'Task name...'}
          className={cn(
            'w-full bg-transparent text-sm outline-none font-mono',
            isDark ? 'text-white/90 placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-400'
          )}
          autoFocus
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Toolbar: Flag | Date | Assignee | Save */}
      <div className={cn(
        'px-2.5 py-2 flex items-center justify-between border-t',
        isDark ? 'border-white/[0.08]' : 'border-gray-100'
      )}>
        <div className="flex items-center gap-1">
          {/* Priority dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowPriorityDropdown(!showPriorityDropdown)
                setShowAssigneeDropdown(false)
                setShowDatePicker(false)
              }}
              type="button"
              className={cn(
                'p-1 rounded transition-colors',
                priority
                  ? priority === 'urgent' || priority === 'high'
                    ? 'text-red-400 bg-red-500/20'
                    : priority === 'medium'
                      ? 'text-yellow-400 bg-yellow-500/20'
                      : 'text-green-400 bg-green-500/20'
                  : isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-100 text-gray-400'
              )}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showPriorityDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  className={cn(
                    'absolute left-0 z-[60] rounded-lg shadow-xl overflow-hidden min-w-[120px]',
                    ddPos,
                    isDark ? 'bg-[#111] border border-white/10' : 'bg-white border border-gray-200'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { id: 'urgent' as const, label: isEs ? 'Urgente' : 'Urgent', color: 'bg-red-500' },
                    { id: 'high' as const, label: isEs ? 'Alta' : 'High', color: 'bg-orange-500' },
                    { id: 'medium' as const, label: isEs ? 'Media' : 'Medium', color: 'bg-yellow-500' },
                    { id: 'low' as const, label: isEs ? 'Baja' : 'Low', color: 'bg-green-500' },
                    { id: undefined, label: isEs ? 'Sin prioridad' : 'No priority', color: 'bg-gray-400' },
                  ].map((p) => (
                    <button
                      key={p.id || 'none'}
                      onClick={() => {
                        setPriority(p.id)
                        setShowPriorityDropdown(false)
                      }}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
                        priority === p.id && (isDark ? 'bg-white/5' : 'bg-gray-50')
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', p.color)} />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>{p.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDatePicker(!showDatePicker)
                setShowPriorityDropdown(false)
                setShowAssigneeDropdown(false)
                setDatePickerMonth(selectedDate || defaultDate || new Date())
              }}
              type="button"
              className={cn(
                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors font-mono',
                selectedDate
                  ? isDark ? 'bg-[#007FFF]/20 text-[#007FFF]' : 'bg-blue-500/20 text-blue-600'
                  : isDark ? 'bg-white/5 text-white/30 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <CalendarDays className="w-3 h-3" />
              {displayDate.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  className={cn(
                    'absolute left-0 z-[60] rounded-xl shadow-2xl overflow-hidden flex',
                    ddPos,
                    isDark ? 'bg-[#111] border border-white/10' : 'bg-white border border-gray-200'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Quick Options */}
                  <div className={cn('w-40 py-2 border-r', isDark ? 'border-white/10' : 'border-gray-200')}>
                    {(() => {
                      const today = new Date()
                      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
                      const nextSat = new Date(today); nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7))
                      const nextMon = new Date(today); nextMon.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7))
                      const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14)
                      const fourWeeks = new Date(today); fourWeeks.setDate(today.getDate() + 28)
                      const loc = isEs ? 'es-ES' : 'en-US'
                      const opts = [
                        { label: isEs ? 'Hoy' : 'Today', date: today, display: today.toLocaleDateString(loc, { weekday: 'short' }).slice(0, 3) + '.' },
                        { label: isEs ? 'Mañana' : 'Tomorrow', date: tomorrow, display: tomorrow.toLocaleDateString(loc, { weekday: 'short' }).slice(0, 3) + '.' },
                        { label: isEs ? 'Este fin de semana' : 'This weekend', date: nextSat, display: isEs ? 'sáb.' : 'sat.' },
                        { label: isEs ? 'Próxima semana' : 'Next week', date: nextMon, display: isEs ? 'lun.' : 'mon.' },
                        { label: isEs ? '2 semanas' : '2 weeks', date: twoWeeks, display: twoWeeks.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) },
                        { label: isEs ? '4 semanas' : '4 weeks', date: fourWeeks, display: fourWeeks.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) },
                      ]
                      return opts.map((o, i) => (
                        <button
                          key={i}
                          type="button"
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors',
                            isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-900'
                          )}
                          onClick={() => { setSelectedDate(o.date); setShowDatePicker(false) }}
                        >
                          <span>{o.label}</span>
                          <span className={cn('text-[10px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>{o.display}</span>
                        </button>
                      ))
                    })()}
                  </div>

                  {/* Mini calendar */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn('text-xs font-medium font-mono', isDark ? 'text-white' : 'text-gray-900')}>
                        {datePickerMonth.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setDatePickerMonth(new Date())}
                          className={cn('px-1.5 py-0.5 rounded text-[10px] transition-colors font-mono', isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-500')}
                        >
                          {isEs ? 'Hoy' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                          className={cn('p-0.5 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                          className={cn('p-0.5 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {(isEs
                        ? ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
                        : ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
                      ).map((d) => (
                        <div key={d} className={cn('w-6 h-6 flex items-center justify-center text-[10px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5">
                      {(() => {
                        const yr = datePickerMonth.getFullYear(), mo = datePickerMonth.getMonth()
                        const firstDay = new Date(yr, mo, 1).getDay()
                        const daysInMonth = new Date(yr, mo + 1, 0).getDate()
                        const prevDays = new Date(yr, mo, 0).getDate()
                        const todayStr = new Date().toDateString()
                        const calDays: Array<{ dayNum: number; isCurrent: boolean; date: Date }> = []
                        for (let i = firstDay - 1; i >= 0; i--) calDays.push({ dayNum: prevDays - i, isCurrent: false, date: new Date(yr, mo - 1, prevDays - i) })
                        for (let i = 1; i <= daysInMonth; i++) calDays.push({ dayNum: i, isCurrent: true, date: new Date(yr, mo, i) })
                        const rem = 42 - calDays.length
                        for (let i = 1; i <= rem; i++) calDays.push({ dayNum: i, isCurrent: false, date: new Date(yr, mo + 1, i) })
                        return calDays.map((d, i) => {
                          const isToday = d.date.toDateString() === todayStr
                          const isSel = (selectedDate || defaultDate)?.toDateString() === d.date.toDateString()
                          return (
                            <button
                              key={i}
                              type="button"
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors font-mono',
                                !d.isCurrent && (isDark ? 'text-white/20' : 'text-gray-300'),
                                d.isCurrent && (isDark ? 'text-white' : 'text-gray-900'),
                                isToday && 'ring-1 ring-[#007FFF]',
                                isSel && 'bg-[#007FFF] text-white',
                                !isSel && (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')
                              )}
                              onClick={() => { setSelectedDate(d.date); setShowDatePicker(false) }}
                            >
                              {d.dayNum}
                            </button>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Assignee dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAssigneeDropdown(!showAssigneeDropdown)
                setShowPriorityDropdown(false)
                setShowDatePicker(false)
              }}
              type="button"
              className={cn(
                'p-1 rounded transition-colors',
                assigneeId
                  ? 'text-[#007FFF] bg-[#007FFF]/20'
                  : isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-100 text-gray-400'
              )}
            >
              {assigneeId ? (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-mono font-bold"
                  style={{ backgroundColor: availableUsers.find(u => u.id === assigneeId)?.color || '#007FFF' }}
                >
                  {availableUsers.find(u => u.id === assigneeId)?.initials ||
                   availableUsers.find(u => u.id === assigneeId)?.name?.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </button>
            <AnimatePresence>
              {showAssigneeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: dropdownDirection === 'up' ? -5 : 5 }}
                  className={cn(
                    'absolute left-0 z-[60] rounded-lg shadow-xl overflow-hidden min-w-[160px] max-h-[200px] overflow-y-auto',
                    ddPos,
                    isDark ? 'bg-[#111] border border-white/10' : 'bg-white border border-gray-200'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => { setAssigneeId(null); setShowAssigneeDropdown(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
                      !assigneeId && (isDark ? 'bg-white/5' : 'bg-gray-50')
                    )}
                  >
                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', isDark ? 'bg-white/10' : 'bg-gray-200')}>
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className={isDark ? 'text-white/40' : 'text-gray-500'}>
                      {isEs ? 'Sin asignar' : 'Unassigned'}
                    </span>
                  </button>
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => { setAssigneeId(user.id); setShowAssigneeDropdown(false) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
                        assigneeId === user.id && (isDark ? 'bg-white/5' : 'bg-gray-50')
                      )}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-mono font-bold"
                        style={{ backgroundColor: user.color || '#007FFF' }}
                      >
                        {user.initials || user.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>{user.name}</span>
                    </button>
                  ))}
                  {availableUsers.length === 0 && (
                    <div className={cn('px-3 py-2 text-xs font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
                      {isEs ? 'No hay usuarios disponibles' : 'No users available'}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          type="button"
          className={cn(
            'px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors',
            name.trim()
              ? 'bg-[#007FFF] hover:bg-[#0066CC] text-white'
              : isDark ? 'bg-white/5 text-white/20' : 'bg-gray-100 text-gray-400'
          )}
        >
          {isEs ? 'Guardar' : 'Save'}
        </button>
      </div>
    </div>
  )
}
