/**
 * Task Form Modal - Complete CRUD for Gantt Tasks
 * v0.17.98: Complete ClickUp-style redesign
 * - Cleaner, more minimal design
 * - Color picker in popover instead of inline grid
 * - Pill-button style for Status/Priority/Assignees
 * - Larger, more prominent task name input
 * - Horizontal field row like ClickUp
 */

import { useState, useEffect, useRef } from 'react'
import { useGanttEnEspanol } from './GanttI18nContext';
import { inicialesDe } from '../../utils/iniciales';
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Users,
  Link2,
  AlertCircle,
  Milestone as MilestoneIcon,
  Flag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CircleDot,
  Plus,
} from 'lucide-react'
import { Task, Theme, TaskTag } from './types'
import { themes } from './themes'
import { TASK_COLORS, nombreDelColorDeTarea } from './ColorPicker'
import { fechaCorta } from './fechaCorta'
import { Portal } from '../Portal'
import { TagPicker } from './TagPicker'
import { AttachmentUploader } from '../Attachments'
import type { Attachment } from '../../types'

// v1.2.0: Time formatting utilities
function formatMinutesToDisplay(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/*
 * QA Latty BUG-33 · «2h 30m», «45m», «2.5» y «2,5» tienen que entrar. El lector era SIN anclas y sin decimales: «2.5» se
 * leía como 2 h y «abc 2h» como 2 h. Ahora la cadena entera tiene que ser una de estas formas (un número solo = horas,
 * 1 d = 8 h); si no, null y el campo lo dice.
 */
export function parseTimeInput(input: string): number | null {
  if (!input || input.trim() === '') return null;
  const t = input.trim().toLowerCase().replace(/,/g, '.');
  const NUM = '(\\d+(?:\\.\\d+)?)';
  let m = t.match(new RegExp('^' + NUM + '\\s*h\\s*(\\d+)\\s*(?:m|min)?$'));
  if (m) return Math.round(parseFloat(m[1]!) * 60) + parseInt(m[2]!, 10);
  m = t.match(new RegExp('^' + NUM + '\\s*h$'));
  if (m) return Math.round(parseFloat(m[1]!) * 60);
  m = t.match(/^(\d+)\s*(?:m|min)$/);
  if (m) return parseInt(m[1]!, 10);
  m = t.match(new RegExp('^' + NUM + '\\s*d$'));
  if (m) return Math.round(parseFloat(m[1]!) * 480);
  m = t.match(new RegExp('^' + NUM + '$'));
  if (m) return Math.round(parseFloat(m[1]!) * 60);
  return null;
}

// v0.17.28: Priority type for Kanban sync
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// v0.17.54: Custom status type for dynamic Kanban columns
export interface CustomStatus {
  id: string
  title: string
  color?: string
}

// v0.17.54: Default statuses that are always available
export const DEFAULT_STATUSES: CustomStatus[] = [
  // QA Asakaa · mejora fuerte 7: los nombres del catálogo único (Por hacer · En progreso · Completada)
  { id: 'todo', title: 'Por hacer', color: '#6B7280' },
  { id: 'in-progress', title: 'En progreso', color: '#F59E0B' },
  { id: 'completed', title: 'Completada', color: '#10B981' },
]

export interface TaskFormData {
  name: string
  description?: string
  startDate?: Date
  endDate?: Date
  progress: number
  status: string
  priority?: TaskPriority
  isMilestone: boolean
  color?: string
  assignees?: Array<{ name: string; avatar?: string; initials: string; color: string }>
  dependencies?: string[]
  tags?: TaskTag[] // v0.17.158: Tags/Labels support
  pendingFiles?: File[] // v0.17.166: Files to upload after task creation
  effortMinutes?: number | null // v1.2.0: Estimated effort in minutes
  parentId?: string | null // v2.3.0: Parent task (phase) for hierarchy
  location?: string // v2.3.0: Location field
  equipment?: string // v2.3.0: Asset/Equipment field
}

export interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task
  availableTasks?: Task[]
  availableUsers?: Array<{ id: string; name: string; avatar?: string }>
  onSubmit: (data: TaskFormData) => void | Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
  theme?: Theme
  customStatuses?: CustomStatus[]
  // v0.17.158: Tags support
  availableTags?: TaskTag[]
  onCreateTag?: (name: string, color: string) => Promise<TaskTag | null>
  // v0.17.165: Attachments support
  attachments?: Attachment[]
  onUploadAttachments?: (taskId: string, files: File[]) => Promise<void> | void
  onDeleteAttachment?: (attachmentId: string) => void
  /**
   * QA Latty BUG-33 · «Ubicación» y «Activo / equipo» se pedían siempre y ninguna app los guardaba: lo escrito se
   * perdía. Sólo salen si quien usa el modal los guarda.
   */
  mostrarUbicacionYActivo?: boolean
  /** v2.2.0: Pre-select status when creating from a specific column */
  defaultStatus?: string
}

// Priority configuration
const PRIORITIES = [
  { id: 'low', label: 'Baja', labelEn: 'Low', color: '#10B981', icon: '🟢' },
  { id: 'medium', label: 'Media', labelEn: 'Medium', color: '#F59E0B', icon: '🟡' },
  { id: 'high', label: 'Alta', labelEn: 'High', color: '#F97316', icon: '🟠' },
  { id: 'urgent', label: 'Urgente', labelEn: 'Urgent', color: '#EF4444', icon: '🔴' },
]

export function TaskFormModal({
  isOpen,
  onClose,
  task,
  availableTasks = [],
  availableUsers = [],
  onSubmit,
  isLoading = false,
  mode = task ? 'edit' : 'create',
  theme = 'dark',
  customStatuses = [],
  availableTags = [],
  onCreateTag,
  attachments = [],
  onUploadAttachments,
  mostrarUbicacionYActivo = false,
  onDeleteAttachment,
  defaultStatus,
}: TaskFormModalProps) {
  const esForm = useGanttEnEspanol(); // QA Asakaa 2.1
  /* Mejora fuerte 7 · los tres estados en el idioma de la pantalla (antes, solo en español), y sin
     repetir una columna que se llama como uno de ellos (las tres sembradas del Tablero). */
  const NOMBRE_EN: Record<string, string> = { todo: 'To do', 'in-progress': 'In progress', completed: 'Completed' }
  const nombresPorDefecto = new Set(DEFAULT_STATUSES.flatMap(ds => [ds.title.toLowerCase(), (NOMBRE_EN[ds.id] ?? '').toLowerCase(), 'por hacer', 'en progreso', 'completada', 'completado', 'to do', 'in progress', 'completed', 'done']))
  const allStatuses: CustomStatus[] = [
    ...DEFAULT_STATUSES.map(ds => (esForm ? ds : { ...ds, title: NOMBRE_EN[ds.id] ?? ds.title })),
    ...customStatuses.filter(cs => !DEFAULT_STATUSES.some(ds => ds.id === cs.id) && !nombresPorDefecto.has((cs.title ?? '').trim().toLowerCase())),
  ]

  const themeColors = (themes[theme] || themes.dark)!

  // Dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 }) // v0.17.155
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)
  const [datePickerMonth, setDatePickerMonth] = useState(new Date())
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 })
  const [showAdvanced, setShowAdvanced] = useState(false)
  // v0.17.166: Pending files for create mode (files selected before task is created)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  // v0.18.0: Dependencies dropdown state (same UI as TaskDetailModal)
  const [showDependenciesDropdown, setShowDependenciesDropdown] = useState(false)
  /* QA Latty BUG-56 · el desplegable de dependencias se cortaba al fondo del modal (el cuerpo tiene su propio scroll): sin sitio debajo, abre hacia arriba */
  const [depsHaciaArriba, setDepsHaciaArriba] = useState(false)

  /* QA Asakaa 2.6.2 · una ventana de diálogo se cierra con Escape. Si hay un desplegable
     abierto, Escape cierra ESE (su propio manejador) y la ventana se queda. */
  const hayDesplegable = showStatusDropdown || showPriorityDropdown || showAssigneesDropdown || showColorPicker || showDatePicker !== null || showDependenciesDropdown
  useEffect(() => {
    if (!isOpen || hayDesplegable) return
    const alPulsar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [isOpen, hayDesplegable, onClose])
  const [dependencySearch, setDependencySearch] = useState('')
  // QA Asakaa 2.3.7: clic fuera o Escape cierran el desplegable sin tragarse el clic.
  const desplegableDepsRef = useRef<HTMLDivElement>(null)
  const botonDepsRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!showDependenciesDropdown) return
    const fuera = (e: MouseEvent) => {
      const n = e.target as Node
      if (desplegableDepsRef.current?.contains(n) || botonDepsRef.current?.contains(n)) return
      setShowDependenciesDropdown(false)
      setDependencySearch('')
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setShowDependenciesDropdown(false) } }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc, true) }
  }, [showDependenciesDropdown])

  // Refs for click outside
  const statusRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const assigneesRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const dateRowRef = useRef<HTMLDivElement>(null)

  /* QA Latty BUG-33 · el texto de «Horas estimadas» mientras se escribe, y si no se entiende */

  const [textoHoras, setTextoHoras] = useState<string | null>(null)

  const [horasIlegibles, setHorasIlegibles] = useState(false)

  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    progress: 0,
    status: 'todo',
    priority: 'medium',
    isMilestone: false,
    color: '#00E5CC',
    assignees: [],
    dependencies: [],
    tags: [], // v0.17.158
    parentId: null,
    location: '',
    equipment: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with task data
  useEffect(() => {
    setTextoHoras(null); setHorasIlegibles(false) // QA Latty BUG-33 · otra tarea, otro texto
    if (task) {
      setFormData({
        name: task.name,
        description: (task as any).description || '',
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        status: task.status || 'todo',
        priority: (task as any).priority || 'medium',
        isMilestone: task.isMilestone || false,
        color: task.color || '#00E5CC',
        assignees: task.assignees || [],
        dependencies: task.dependencies || [],
        tags: task.tags || [], // v0.17.158
        parentId: task.parentId || null,
        location: (task as any).location || '',
        equipment: (task as any).equipment || '',
      })
      if ((task.dependencies && task.dependencies.length > 0) || task.isMilestone) {
        setShowAdvanced(true)
      }
    } else {
      setFormData({
        name: '',
        description: '',
        progress: 0,
        status: defaultStatus || 'todo',
        priority: 'medium',
        isMilestone: false,
        color: '#00E5CC',
        assignees: [],
        dependencies: [],
        pendingFiles: [], // v0.17.166
        tags: [], // v0.17.158
        parentId: null,
        location: '',
        equipment: '',
      })
      setShowAdvanced(false)
      setPendingFiles([]) // v0.17.166: Clear pending files on reset
    }
  }, [task, isOpen, defaultStatus])

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusDropdown(false)
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriorityDropdown(false)
      if (assigneesRef.current && !assigneesRef.current.contains(e.target as Node)) setShowAssigneesDropdown(false)
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = esForm ? 'Escriba el nombre de la tarea.' : 'Type the task name.'
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = esForm ? 'La fecha de fin debe ser posterior a la de inicio.' : 'The end date must be after the start date.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      // v0.17.166: Include pending files in form data for create mode
      const submitData = mode === 'create' && pendingFiles.length > 0
        ? { ...formData, pendingFiles }
        : formData
      await onSubmit(submitData)
      setPendingFiles([]) // Clear pending files after submit
      onClose()
    } catch (error) {
      console.error('Error submitting task:', error)
    }
  }

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // v0.17.110: Sync progress when status changes
      if (field === 'status') {
        const statusValue = value as string
        if (statusValue === 'todo') updated.progress = 0
        else if (statusValue === 'in-progress') {
          // If coming from completed/todo, set to 50%, otherwise keep current
          if (prev.progress === 0 || prev.progress === 100) updated.progress = 50
        }
        else if (statusValue === 'completed' || statusValue === 'closed') updated.progress = 100
        else if (statusValue === 'in-review' || statusValue === 'review') updated.progress = 75
      }
      // Sync status when progress changes
      if (field === 'progress') {
        const progressValue = typeof value === 'number' ? value : parseInt(value, 10)
        if (progressValue === 100 && prev.status !== 'completed') updated.status = 'completed'
        else if (progressValue > 0 && progressValue < 100 && prev.status === 'todo') updated.status = 'in-progress'
        else if (progressValue === 0 && prev.status !== 'todo') updated.status = 'todo'
      }
      return updated
    })
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
    }
  }

  // Get current status/priority info
  const currentStatus = allStatuses.find(s => s.id === formData.status) ?? DEFAULT_STATUSES[0]!
  const currentPriority = PRIORITIES.find(p => p.id === formData.priority) ?? PRIORITIES[1]!
  const currentColor = TASK_COLORS.find(c => c.value === formData.color) ?? TASK_COLORS[0]!

  // Pill button base style — glass surface for dark, solid for light
  const isDarkTheme = theme === 'dark'
  const pillStyle = {
    backgroundColor: isDarkTheme ? '#1d1f27' : themeColors.bgSecondary,
    border: `1px solid ${isDarkTheme ? 'rgba(65,71,84,0.1)' : themeColors.borderLight}`,
    color: themeColors.textPrimary,
  }


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
            style={{
              backgroundColor: isDarkTheme ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            {/* QA Asakaa 2.6.2 · «"Nueva Tarea" no se anuncia como ventana emergente». */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label={mode === 'create' ? (esForm ? 'Nueva tarea' : 'New task') : (esForm ? 'Editar tarea' : 'Edit task')}
              className="w-full max-w-[640px] rounded-xl pointer-events-auto flex flex-col"
              data-theme={theme}
              style={{
                backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                border: `1px solid ${isDarkTheme ? 'rgba(65,71,84,0.1)' : themeColors.border}`,
                boxShadow: isDarkTheme ? '0 8px 48px rgba(0, 0, 0, 0.8)' : '0 8px 32px rgba(0, 0, 0, 0.12)',
                maxHeight: '90vh',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {/* 1. Header Section — fixed, not scrollable */}
                <header className="px-8 pt-8 pb-4 space-y-4 flex-shrink-0">
                  <input
                    type="text"
                    value={formData.name}
                    aria-label={esForm ? 'Nombre de la tarea' : 'Task name'}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                    style={{
                      color: themeColors.textPrimary,
                      fontSize: 30,
                      fontWeight: 700,
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                    placeholder={esForm ? 'Nombre de la tarea' : 'Task name'}
                    disabled={isLoading}
                    autoFocus
                  />
                  {errors.name && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.name}
                    </p>
                  )}
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0 resize-none task-form-description"
                    style={{
                      color: themeColors.textPrimary,
                      fontSize: 16,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      ['--placeholder-color' as any]: themeColors.textTertiary,
                    }}
                    placeholder={esForm ? 'Agregar descripción...' : 'Add a description...'}
                    rows={2}
                    disabled={isLoading}
                  />
                </header>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">

                  {/* v0.17.98: Pill Button Row - ClickUp Style */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill */}
                    <div ref={statusRef} className="relative">
                      <button
                        type="button"
                        onClick={() => !isLoading && setShowStatusDropdown(!showStatusDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80"
                        style={{
                          ...pillStyle,
                          borderColor: currentStatus.color,
                          backgroundColor: `${currentStatus.color}15`,
                        }}
                        disabled={isLoading}
                      >
                        <CircleDot className="w-3.5 h-3.5" style={{ color: currentStatus.color }} />
                        <span style={{ color: currentStatus.color }}>{currentStatus.title}</span>
                        <ChevronDown className="w-3 h-3" style={{ color: currentStatus.color }} />
                      </button>

                      <AnimatePresence>
                        {showStatusDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg overflow-hidden"
                            style={{
                              backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                              backdropFilter: isDarkTheme ? 'blur(16px)' : undefined,
                              border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                              boxShadow: isDarkTheme ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                            }}
                          >
                            {allStatuses.map((status) => (
                              <button
                                key={status.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                style={{ color: themeColors.textPrimary }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                onClick={() => { handleChange('status', status.id); setShowStatusDropdown(false) }}
                              >
                                <CircleDot className="w-3.5 h-3.5" style={{ color: status.color }} />
                                {status.title}
                                {formData.status === status.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: themeColors.accent }} />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Priority Pill */}
                    <div ref={priorityRef} className="relative">
                      <button
                        type="button"
                        onClick={() => !isLoading && setShowPriorityDropdown(!showPriorityDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80"
                        style={pillStyle}
                        disabled={isLoading}
                      >
                        <Flag className="w-3.5 h-3.5" style={{ color: currentPriority.color }} />
                        <span>{esForm ? currentPriority.label : currentPriority.labelEn}</span>
                        <ChevronDown className="w-3 h-3" style={{ color: themeColors.textTertiary }} />
                      </button>

                      <AnimatePresence>
                        {showPriorityDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 top-full mt-1 z-50 min-w-[130px] rounded-lg overflow-hidden"
                            style={{
                              backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                              backdropFilter: isDarkTheme ? 'blur(16px)' : undefined,
                              border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                              boxShadow: isDarkTheme ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                            }}
                          >
                            {PRIORITIES.map((priority) => (
                              <button
                                key={priority.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                style={{ color: themeColors.textPrimary }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                onClick={() => { handleChange('priority', priority.id as TaskPriority); setShowPriorityDropdown(false) }}
                              >
                                <span>{priority.icon}</span>
                                {esForm ? priority.label : priority.labelEn}
                                {formData.priority === priority.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: themeColors.accent }} />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Assignees Pill */}
                    {availableUsers.length > 0 && (
                      <div ref={assigneesRef} className="relative">
                        <button
                          type="button"
                          onClick={() => !isLoading && setShowAssigneesDropdown(!showAssigneesDropdown)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80"
                          style={pillStyle}
                          disabled={isLoading}
                        >
                          {formData.assignees && formData.assignees.length > 0 ? (
                            <>
                              <div className="flex -space-x-1">
                                {formData.assignees.slice(0, 3).map((a, i) => (
                                  <div
                                    key={i}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium border-2"
                                    style={{ backgroundColor: a.color || themeColors.accent, borderColor: themeColors.bgSecondary }}
                                  >
                                    {a.initials}
                                  </div>
                                ))}
                              </div>
                              {formData.assignees.length > 3 && (
                                <span style={{ color: themeColors.textTertiary }}>+{formData.assignees.length - 3}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <Users className="w-3.5 h-3.5" style={{ color: themeColors.textTertiary }} />
                              <span style={{ color: themeColors.textTertiary }}>{esForm ? 'Asignar' : 'Assign'}</span>
                            </>
                          )}
                          <ChevronDown className="w-3 h-3" style={{ color: themeColors.textTertiary }} />
                        </button>

                        <AnimatePresence>
                          {showAssigneesDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 top-full mt-1 z-50 min-w-[180px] max-h-[200px] overflow-y-auto rounded-lg"
                              style={{
                                backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                                backdropFilter: isDarkTheme ? 'blur(16px)' : undefined,
                                border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                                boxShadow: isDarkTheme ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                              }}
                            >
                              {availableUsers.map((user) => {
                                const isSelected = formData.assignees?.some(a => a.name === user.name)
                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                                    style={{ color: themeColors.textPrimary }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    onClick={() => {
                                      const newAssignees = isSelected
                                        ? (formData.assignees || []).filter(a => a.name !== user.name)
                                        : [...(formData.assignees || []), {
                                            name: user.name,
                                            avatar: user.avatar,
                                            initials: inicialesDe(user.name),
                                            color: themeColors.accent,
                                          }]
                                      handleChange('assignees', newAssignees)
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0"
                                      style={{ backgroundColor: themeColors.accent }}
                                    >
                                      {inicialesDe(user.name)}
                                    </div>
                                    <span className="truncate flex-1 text-left">{user.name}</span>
                                    {/* Fixed width checkmark area for consistent alignment */}
                                    <div className="w-4 flex-shrink-0 flex justify-end">
                                      {isSelected && <Check className="w-3.5 h-3.5" style={{ color: themeColors.accent }} />}
                                    </div>
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Color Pill */}
                    <div ref={colorRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoading) {
                            if (showColorPicker) {
                              setShowColorPicker(false)
                            } else {
                              // v0.17.155: Calculate position for Portal
                              if (colorRef.current) {
                                const rect = colorRef.current.getBoundingClientRect()
                                const viewportHeight = window.innerHeight
                                const pickerHeight = 120 // Approximate height of color picker
                                const spaceBelow = viewportHeight - rect.bottom
                                const top = spaceBelow < pickerHeight ? rect.top - pickerHeight - 8 : rect.bottom + 8
                                setColorPickerPosition({ top, left: rect.left })
                              }
                              setShowColorPicker(true)
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80"
                        style={pillStyle}
                        disabled={isLoading}
                      >
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: formData.color }} />
                        <span>{nombreDelColorDeTarea(currentColor, esForm)}</span>
                        <ChevronDown className="w-3 h-3" style={{ color: themeColors.textTertiary }} />
                      </button>

                      {/* v0.17.155: Color Picker using Portal to escape overflow:hidden */}
                      <AnimatePresence>
                        {showColorPicker && (
                          <Portal>
                            <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowColorPicker(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.12 }}
                              className="rounded-lg"
                              style={{
                                position: 'fixed',
                                top: `${colorPickerPosition.top}px`,
                                left: `${colorPickerPosition.left}px`,
                                zIndex: 99999,
                                backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                                backdropFilter: isDarkTheme ? 'blur(16px)' : undefined,
                                border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                                boxShadow: isDarkTheme ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.25)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* v0.17.186: Fixed click area with pointerEvents none on inner circle */}
                              <div style={{ padding: '6px 8px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 28px)', gap: '2px' }}>
                                  {TASK_COLORS.slice(0, 18).map((color) => {
                                    const isSelected = formData.color === color.value;
                                    return (
                                      <button
                                        key={color.value}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleChange('color', color.value);
                                          setShowColorPicker(false);
                                        }}
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '6px',
                                          backgroundColor: 'transparent',
                                          cursor: 'pointer',
                                          border: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          padding: 0,
                                        }}
                                        title={nombreDelColorDeTarea(color, esForm)}
                                      >
                                        <span
                                          style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            backgroundColor: color.value,
                                            outline: isSelected ? `2px solid ${color.value}` : 'none',
                                            outlineOffset: '2px',
                                            pointerEvents: 'none',
                                            display: 'block',
                                          }}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          </Portal>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* v0.17.158: Tags Picker */}
                    {availableTags.length > 0 || onCreateTag ? (
                      <TagPicker
                        selectedTags={formData.tags || []}
                        availableTags={availableTags}
                        onChange={(tags) => handleChange('tags', tags)}
                        onCreateTag={onCreateTag}
                        theme={themeColors}
                        disabled={isLoading}
                      />
                    ) : null}
                  </div>

                  {/* 3. Row 2: Date & Progress — 2-col grid */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                  <div className="space-y-3">
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: themeColors.textTertiary, display: 'block' }}>
                      {esForm ? 'Rango de fechas' : 'Date range'}
                    </label>
                  <div className="flex items-center gap-3" style={{ backgroundColor: isDarkTheme ? '#191b22' : themeColors.bgSecondary, borderRadius: 8, border: `1px solid ${isDarkTheme ? 'rgba(65,71,84,0.05)' : themeColors.borderLight}`, padding: '10px 16px' }}>
                    <Calendar className="w-5 h-5" style={{ color: '#00E5CC' }} />
                    <div ref={dateRowRef} className="flex items-center gap-2 flex-1 relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoading && !formData.isMilestone) {
                            if (showDatePicker === 'start') {
                              setShowDatePicker(null)
                            } else {
                              // Calculate position for Portal
                              if (dateRowRef.current) {
                                const rect = dateRowRef.current.getBoundingClientRect()
                                setDatePickerPosition({ top: rect.bottom + 8, left: Math.max(16, rect.left - 40) })
                              }
                              setShowDatePicker('start')
                              setDatePickerMonth(formData.startDate || new Date())
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          ...pillStyle,
                          opacity: formData.isMilestone ? 0.5 : 1,
                          cursor: formData.isMilestone ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isLoading || formData.isMilestone}
                      >
                        {formData.startDate ? fechaCorta(formData.startDate, esForm ? 'es' : 'en', new Date()) : (esForm ? 'Inicio' : 'Start')}
                      </button>
                      <span style={{ color: themeColors.textTertiary }}>→</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoading && !formData.isMilestone) {
                            if (showDatePicker === 'end') {
                              setShowDatePicker(null)
                            } else {
                              // Calculate position for Portal
                              if (dateRowRef.current) {
                                const rect = dateRowRef.current.getBoundingClientRect()
                                setDatePickerPosition({ top: rect.bottom + 8, left: Math.max(16, rect.left - 40) })
                              }
                              setShowDatePicker('end')
                              setDatePickerMonth(formData.endDate || formData.startDate || new Date())
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          ...pillStyle,
                          opacity: formData.isMilestone ? 0.5 : 1,
                          cursor: formData.isMilestone ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isLoading || formData.isMilestone}
                      >
                        {formData.endDate ? fechaCorta(formData.endDate, esForm ? 'es' : 'en', new Date()) : (esForm ? 'Fin' : 'End')}
                      </button>

                      {/* Date Picker Popover - Using Portal to escape overflow:hidden */}
                      <AnimatePresence>
                        {showDatePicker && (
                          <Portal>
                            <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setShowDatePicker(null)} />
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="rounded-xl shadow-2xl overflow-hidden flex"
                              style={{
                                position: 'fixed',
                                top: `${datePickerPosition.top}px`,
                                left: `${datePickerPosition.left}px`,
                                zIndex: 99999,
                                backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                                border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                                boxShadow: isDarkTheme ? '0 8px 32px rgba(0, 0, 0, 0.6)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Quick Options */}
                              <div className="w-40 py-2" style={{ borderRight: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}` }}>
                                {(() => {
                                  const today = new Date()
                                  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
                                  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
                                  const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14)

                                  const options = [
                                    { label: esForm ? 'Hoy' : 'Today', date: today },
                                    { label: esForm ? 'Mañana' : 'Tomorrow', date: tomorrow },
                                    { label: esForm ? 'Próxima semana' : 'Next week', date: nextWeek },
                                    { label: esForm ? '2 semanas' : '2 weeks', date: twoWeeks },
                                  ]

                                  return options.map((opt, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      className="w-full px-3 py-2 text-sm text-left transition-colors"
                                      style={{ color: themeColors.textPrimary }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      onClick={() => {
                                        if (showDatePicker === 'start') {
                                          handleChange('startDate', opt.date)
                                          if (!formData.endDate || opt.date > formData.endDate) handleChange('endDate', opt.date)
                                          setShowDatePicker('end')
                                        } else {
                                          handleChange('endDate', opt.date)
                                          if (!formData.startDate || opt.date < formData.startDate) handleChange('startDate', opt.date)
                                          setShowDatePicker(null)
                                        }
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))
                                })()}
                                <div style={{ borderTop: `1px solid ${themeColors.border}`, margin: '0.5rem 0' }} />
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-sm text-left transition-colors"
                                  style={{ color: '#EF4444' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  onClick={() => { handleChange('startDate', undefined); handleChange('endDate', undefined); setShowDatePicker(null) }}
                                >
                                  {esForm ? 'Borrar fechas' : 'Clear dates'}
                                </button>
                              </div>

                              {/* Calendar */}
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                                    className="p-1 rounded"
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <ChevronLeft className="w-4 h-4" style={{ color: themeColors.textSecondary }} />
                                  </button>
                                  <span className="text-sm font-medium" style={{ color: themeColors.textPrimary, fontFamily: 'JetBrains Mono, monospace' }}>{datePickerMonth.toLocaleDateString(esForm ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}</span>
                                  <button
                                    type="button"
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                                    className="p-1 rounded"
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <ChevronRight className="w-4 h-4" style={{ color: themeColors.textSecondary }} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                  {/* QA Asakaa 2.4.5: semana en LUNES */}{(esForm ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((d, i) => (
                                    <div key={i} className="w-7 h-7 flex items-center justify-center text-xs" style={{ color: themeColors.textTertiary }}>{d}</div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const year = datePickerMonth.getFullYear(), month = datePickerMonth.getMonth()
                                    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
                                    const daysInMonth = new Date(year, month + 1, 0).getDate()
                                    const today = new Date()
                                    const days: { day: number; date: Date; isCurrentMonth: boolean }[] = []

                                    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: new Date(year, month, -i).getDate(), date: new Date(year, month - 1, new Date(year, month, -i).getDate()), isCurrentMonth: false })
                                    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, month, i), isCurrentMonth: true })
                                    const remaining = 42 - days.length
                                    for (let i = 1; i <= remaining; i++) days.push({ day: i, date: new Date(year, month + 1, i), isCurrentMonth: false })

                                    return days.map((d, i) => {
                                      const isToday = d.date.toDateString() === today.toDateString()
                                      const isStart = formData.startDate?.toDateString() === d.date.toDateString()
                                      const isEnd = formData.endDate?.toDateString() === d.date.toDateString()
                                      const isInRange = formData.startDate && formData.endDate && d.date >= formData.startDate && d.date <= formData.endDate

                                      return (
                                        <button
                                          key={i}
                                          type="button"
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors"
                                          style={{
                                            color: !d.isCurrentMonth ? themeColors.textTertiary : isStart || isEnd ? '#FFF' : themeColors.textPrimary,
                                            backgroundColor: isStart ? themeColors.accent : isEnd ? '#7C3AED' : isInRange ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                                            boxShadow: isToday && !isStart && !isEnd ? `inset 0 0 0 1px ${themeColors.accent}` : 'none',
                                          }}
                                          onClick={() => {
                                            if (showDatePicker === 'start') {
                                              handleChange('startDate', d.date)
                                              if (formData.endDate && d.date > formData.endDate) handleChange('endDate', d.date)
                                              setShowDatePicker('end')
                                            } else {
                                              handleChange('endDate', d.date)
                                              if (formData.startDate && d.date < formData.startDate) handleChange('startDate', d.date)
                                              setShowDatePicker(null)
                                            }
                                          }}
                                        >
                                          {d.day}
                                        </button>
                                      )
                                    })
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          </Portal>
                        )}
                      </AnimatePresence>
                    </div>
                    {errors.endDate && <span className="text-xs text-red-400">{errors.endDate}</span>}
                  </div>
                  </div>
                  {/* Progress — static bar matching design */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: themeColors.textTertiary }}>
                        {esForm ? 'Progreso inicial' : 'Initial progress'}
                      </label>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#00E5CC' }}>
                        {formData.progress}%
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full overflow-hidden cursor-pointer"
                      style={{ backgroundColor: isDarkTheme ? '#33343c' : '#E5E7EB' }}
                      onClick={(e) => {
                        if (isLoading) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100 / 5) * 5;
                        handleChange('progress', Math.max(0, Math.min(100, pct)));
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${formData.progress}%`, backgroundColor: '#00E5CC' }}
                      />
                    </div>
                  </div>
                  </section>

                  {/* Advanced Options - Collapsible */}
                  <div style={{ borderTop: `1px solid ${isDarkTheme ? 'rgba(65,71,84,0.05)' : themeColors.borderLight}`, paddingTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 w-full py-2 transition-colors"
                      style={{ color: themeColors.textPrimary }}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} style={{ color: themeColors.textTertiary }} />
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif" }}>{esForm ? 'Opciones avanzadas' : 'Advanced options'}</span>
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-3">
                            {/* v1.2.0: Duración estimada (Effort Estimate) */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  style={{ color: themeColors.textTertiary }}
                                >
                                  <path d="M12 6v6l4 2" />
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                                <span className="text-xs" style={{ color: themeColors.textTertiary }}>
                                  {esForm ? 'Horas estimadas' : 'Estimated hours'}
                                </span>
                              </div>
                              {/* QA Latty BUG-33 · reformateaba en cada tecla («4» → «4h») y no dejaba escribir «2h 30m»: el
                                  texto es libre mientras se escribe, se formatea al salir, y lo que no se entiende se dice. */}
                              <input
                                type="text"
                                placeholder={esForm ? 'Ej.: 8 (=8 h), 2h 30m, 45m, 2,5, 1d (1 día = 8 h)' : 'E.g. 8 (=8 h), 2h 30m, 45m, 2.5, 1d (1 day = 8 h)'}
                                value={textoHoras ?? (formData.effortMinutes ? formatMinutesToDisplay(formData.effortMinutes) : '')}
                                aria-invalid={horasIlegibles || undefined}
                                onChange={(e) => {
                                  const texto = e.target.value;
                                  setTextoHoras(texto);
                                  const minutes = parseTimeInput(texto);
                                  if (minutes != null || texto.trim() === '') { handleChange('effortMinutes', minutes); setHorasIlegibles(false); }
                                }}
                                onBlur={() => {
                                  if (textoHoras == null) return;
                                  const minutes = parseTimeInput(textoHoras);
                                  if (minutes == null && textoHoras.trim() !== '') { setHorasIlegibles(true); return; }
                                  setHorasIlegibles(false);
                                  setTextoHoras(null);
                                }}
                                className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                                style={{
                                  backgroundColor: themeColors.bgSecondary,
                                  color: themeColors.textPrimary,
                                  border: `1px solid ${themeColors.borderLight}`,
                                }}
                              />
                              {horasIlegibles && (
                                <p role="alert" className="text-xs mt-1" style={{ color: '#DC2626' }}>
                                  {esForm ? 'No se entiende: escribe 8, 2h 30m, 45m, 2,5 o 1d' : 'Not understood: type 8, 2h 30m, 45m, 2.5 or 1d'}
                                </p>
                              )}
                            </div>

                            {/* v2.3.0: Parent Phase dropdown */}
                            {availableTasks.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: themeColors.textTertiary }}>
                                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                                  </svg>
                                  <span className="text-xs" style={{ color: themeColors.textTertiary }}>
                                    {esForm ? 'Fase padre' : 'Parent phase'}
                                  </span>
                                </div>
                                <select
                                  value={formData.parentId || ''}
                                  onChange={(e) => handleChange('parentId', e.target.value || null)}
                                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors appearance-none cursor-pointer"
                                  style={{
                                    backgroundColor: themeColors.bgSecondary,
                                    color: themeColors.textPrimary,
                                    border: `1px solid ${themeColors.borderLight}`,
                                  }}
                                  disabled={isLoading}
                                >
                                  <option value="">{esForm ? '— Sin fase padre (raíz) —' : '— No parent phase (top level) —'}</option>
                                  {availableTasks
                                    .filter(t => t.id !== task?.id)
                                    .map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                              </div>
                            )}

                            {/* v2.3.0: Location & Equipment fields · QA Latty BUG-33: sólo si se guardan */}
                            {mostrarUbicacionYActivo && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span style={{ fontSize: 14 }}>📍</span>
                                  <span className="text-xs" style={{ color: themeColors.textTertiary }}>
                                    {esForm ? 'Ubicación' : 'Location'}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder={esForm ? 'Ej.: Zona Norte, Piso 3' : 'E.g. North area, 3rd floor'}
                                  value={formData.location || ''}
                                  onChange={(e) => handleChange('location', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                                  style={{
                                    backgroundColor: themeColors.bgSecondary,
                                    color: themeColors.textPrimary,
                                    border: `1px solid ${themeColors.borderLight}`,
                                  }}
                                  disabled={isLoading}
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span style={{ fontSize: 14 }}>🔧</span>
                                  <span className="text-xs" style={{ color: themeColors.textTertiary }}>
                                    {esForm ? 'Activo / equipo' : 'Asset / equipment'}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  placeholder={esForm ? 'Ej.: CMC-256' : 'E.g. CMC-256'}
                                  value={formData.equipment || ''}
                                  onChange={(e) => handleChange('equipment', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                                  style={{
                                    backgroundColor: themeColors.bgSecondary,
                                    color: themeColors.textPrimary,
                                    border: `1px solid ${themeColors.borderLight}`,
                                  }}
                                  disabled={isLoading}
                                />
                              </div>
                            </div>
                            )}

                            {/* v0.17.227: Attachments Section - moved here for cleaner form */}
                            {(onUploadAttachments || attachments.length > 0 || mode === 'create') && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    style={{ color: themeColors.textTertiary }}
                                  >
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                  </svg>
                                  <span className="text-xs" style={{ color: themeColors.textTertiary }}>
                                    {esForm ? 'Adjuntos' : 'Attachments'} {mode === 'create'
                                      ? (pendingFiles.length > 0 && `(${pendingFiles.length})`)
                                      : (attachments.length > 0 && `(${attachments.length})`)}
                                  </span>
                                </div>
                                {mode === 'create' ? (
                                  <AttachmentUploader
                                    locale={esForm ? 'es' : 'en'}
                                    cardId="pending"
                                    attachments={pendingFiles.map((file, idx) => ({
                                      id: `pending-${idx}`,
                                      cardId: 'pending',
                                      name: file.name,
                                      size: file.size,
                                      type: file.type,
                                      url: URL.createObjectURL(file),
                                      uploadedAt: new Date().toISOString(),
                                      uploadedBy: 'current-user',
                                    }))}
                                    onUpload={(files) => setPendingFiles(prev => [...prev, ...files])}
                                    onDelete={(id) => {
                                      const idx = parseInt(id.replace('pending-', ''), 10)
                                      setPendingFiles(prev => prev.filter((_, i) => i !== idx))
                                    }}
                                    maxSizeMB={10}
                                    maxFiles={20}
                                  />
                                ) : (
                                  <AttachmentUploader
                                    locale={esForm ? 'es' : 'en'}
                                    cardId={task?.id || 'new'}
                                    attachments={attachments}
                                    onUpload={onUploadAttachments && task?.id ? (files) => onUploadAttachments(task.id, files) : undefined}
                                    onDelete={onDeleteAttachment}
                                    maxSizeMB={10}
                                    maxFiles={20}
                                  />
                                )}
                                {mode === 'create' && pendingFiles.length > 0 && (
                                  <p className="text-xs mt-1" style={{ color: themeColors.textTertiary }}>
                                    {pendingFiles.length} archivo(s) se subirán al crear la tarea
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Milestone */}
                            <label
                              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors"
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <input
                                type="checkbox"
                                checked={formData.isMilestone}
                                onChange={(e) => handleChange('isMilestone', e.target.checked)}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: themeColors.accent }}
                                disabled={isLoading}
                              />
                              <MilestoneIcon className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm" style={{ color: themeColors.textPrimary }}>{esForm ? 'Marcar como hito' : 'Mark as milestone'}</span>
                            </label>

                            {/* Dependencies - v0.18.0: Same UI as TaskDetailModal */}
                            {availableTasks.length > 0 && (
                              <div className="relative">
                                <label className="flex items-center gap-2 text-xs mb-2" style={{ color: themeColors.textTertiary }}>
                                  <Link2 className="w-3.5 h-3.5" />
                                  {esForm ? 'Dependencias' : 'Dependencies'}
                                </label>

                                {/* Selected dependencies as chips */}
                                {formData.dependencies && formData.dependencies.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {formData.dependencies.map((depId) => {
                                      const depTask = availableTasks.find(t => t.id === depId)
                                      return (
                                        <span
                                          key={depId}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                          style={{
                                            backgroundColor: `${themeColors.accent}20`,
                                            color: themeColors.accent,
                                          }}
                                        >
                                          {depTask ? `${(depTask as Task & { wbsCode?: string }).wbsCode ? (depTask as Task & { wbsCode?: string }).wbsCode + ' · ' : ''}${depTask.name}` : '—'}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newDeps = (formData.dependencies || []).filter(id => id !== depId)
                                              handleChange('dependencies', newDeps)
                                            }}
                                            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/20"
                                            disabled={isLoading}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* Add dependency button */}
                                <button
                                  ref={botonDepsRef}
                                  type="button"
                                  onClick={() => {
                                    const boton = botonDepsRef.current
                                    const caja = boton?.closest('.overflow-y-auto') as HTMLElement | null
                                    if (boton && caja) setDepsHaciaArriba(caja.getBoundingClientRect().bottom - boton.getBoundingClientRect().bottom < 290)
                                    setShowDependenciesDropdown(!showDependenciesDropdown)
                                    setDependencySearch('')
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                                  style={{
                                    backgroundColor: themeColors.bgSecondary,
                                    color: themeColors.textSecondary,
                                  }}
                                  disabled={isLoading}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{esForm ? 'Agregar dependencia' : 'Add dependency'}</span>
                                </button>

                                {/* Dependencies Dropdown */}
                                <AnimatePresence>
                                  {showDependenciesDropdown && (
                                    <>
                                      {/* QA Asakaa 2.3.7: aquí iba una capa invisible a pantalla completa para
                                          cerrar el desplegable; se tragaba el primer clic en «Crear Tarea». Ahora
                                          lo cierra un clic fuera escuchado en el documento (no tapa nada). */}
                                      <motion.div
                                        ref={desplegableDepsRef}
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className={`absolute left-0 ${depsHaciaArriba ? 'bottom-full mb-1' : 'top-full mt-1'} z-50 rounded-lg overflow-hidden min-w-[280px] max-h-[280px]`}
                                        style={{
                                          backgroundColor: isDarkTheme ? '#0a0a0a' : themeColors.bgPrimary,
                                          backdropFilter: isDarkTheme ? 'blur(16px)' : undefined,
                                          border: `1px solid ${isDarkTheme ? '#262626' : themeColors.border}`,
                                          boxShadow: isDarkTheme ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
                                        }}
                                      >
                                        {/* Search input */}
                                        <div className="p-2" style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                                          <input
                                            type="text"
                                            value={dependencySearch}
                                            onChange={(e) => setDependencySearch(e.target.value)}
                                            placeholder={esForm ? 'Buscar tarea...' : 'Search task...'}
                                            className="w-full px-3 py-2 rounded-md text-xs outline-none"
                                            style={{
                                              backgroundColor: themeColors.bgSecondary,
                                              color: themeColors.textPrimary,
                                            }}
                                            autoFocus
                                          />
                                        </div>

                                        {/* Task list */}
                                        <div className="max-h-[200px] overflow-y-auto">
                                          {availableTasks
                                            .filter(t => t.id !== task?.id)
                                            .filter(t =>
                                              dependencySearch === '' ||
                                              t.name.toLowerCase().includes(dependencySearch.toLowerCase())
                                            )
                                            .map((depTask) => {
                                              const isSelected = formData.dependencies?.includes(depTask.id)
                                              return (
                                                <button
                                                  key={depTask.id}
                                                  type="button"
                                                  onClick={() => {
                                                    const currentDeps = formData.dependencies || []
                                                    let newDeps: string[]
                                                    if (isSelected) {
                                                      newDeps = currentDeps.filter(id => id !== depTask.id)
                                                    } else {
                                                      newDeps = [...currentDeps, depTask.id]
                                                    }
                                                    handleChange('dependencies', newDeps)
                                                  }}
                                                  className="w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors text-left"
                                                  style={{
                                                    backgroundColor: isSelected ? `${themeColors.accent}10` : 'transparent',
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = themeColors.hoverBg
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = isSelected ? `${themeColors.accent}10` : 'transparent'
                                                  }}
                                                >
                                                  <div
                                                    className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                      backgroundColor: isSelected ? themeColors.accent : 'transparent',
                                                      borderColor: isSelected ? themeColors.accent : themeColors.borderLight,
                                                    }}
                                                  >
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <span
                                                      className="block truncate"
                                                      style={{ color: themeColors.textPrimary }}
                                                    >
                                                      {depTask.name}
                                                    </span>
                                                    <span
                                                      className="text-[10px]"
                                                      style={{ color: themeColors.textTertiary }}
                                                    >
                                                      {/* QA Asakaa 2.3.7: el número de la tarea («4.1»), no el id interno («c638469b»). */}
                                                      {(depTask as Task & { wbsCode?: string }).wbsCode ?? ''}
                                                    </span>
                                                  </div>
                                                </button>
                                              )
                                            })}
                                          {availableTasks.filter(t => t.id !== task?.id).length === 0 && (
                                            <div
                                              className="px-3 py-4 text-xs text-center"
                                              style={{ color: themeColors.textTertiary }}
                                            >
                                              {esForm ? 'No hay tareas disponibles' : 'No tasks available'}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
                {/* End scrollable content */}

                {/* Footer - Executive style */}
                <div className="flex items-center justify-end gap-6 px-8 py-5 flex-shrink-0" style={{ borderTop: `1px solid ${isDarkTheme ? 'rgba(65,71,84,0.1)' : themeColors.border}`, backgroundColor: isDarkTheme ? 'rgba(25,27,34,0.2)' : undefined }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-semibold transition-colors"
                    style={{ color: themeColors.textTertiary }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = themeColors.textPrimary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = themeColors.textTertiary)}
                    disabled={isLoading}
                  >
                    {esForm ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 font-bold rounded-lg transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: '#00E5CC',
                      color: '#FFF',
                      fontSize: 14,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      boxShadow: '0 4px 20px rgba(0, 123, 255, 0.2)',
                    }}
                    onMouseEnter={(e) => !isLoading && (e.currentTarget.style.filter = 'brightness(1.1)')}
                    onMouseLeave={(e) => !isLoading && (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                    ) : (
                      <>{mode === 'create' ? (esForm ? 'Crear tarea' : 'Create task') : (esForm ? 'Guardar' : 'Save')}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
