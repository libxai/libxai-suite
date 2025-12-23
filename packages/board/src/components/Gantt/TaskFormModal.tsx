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
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Users,
  Link2,
  Clock,
  AlertCircle,
  Milestone as MilestoneIcon,
  Flag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CircleDot,
} from 'lucide-react'
import { Task, Theme, TaskTag } from './types'
import { themes } from './themes'
import { TASK_COLORS } from './ColorPicker'
import { Portal } from '../Portal'
import { TagPicker } from './TagPicker'
import { AttachmentUploader } from '../Attachments'
import type { Attachment } from '../../types'

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
  { id: 'todo', title: 'Por Hacer', color: '#6B7280' },
  { id: 'in-progress', title: 'En Progreso', color: '#F59E0B' },
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
}

// Priority configuration
const PRIORITIES = [
  { id: 'low', label: 'Baja', color: '#10B981', icon: '🟢' },
  { id: 'medium', label: 'Media', color: '#F59E0B', icon: '🟡' },
  { id: 'high', label: 'Alta', color: '#F97316', icon: '🟠' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444', icon: '🔴' },
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
  onDeleteAttachment,
}: TaskFormModalProps) {
  const allStatuses: CustomStatus[] = [
    ...DEFAULT_STATUSES,
    ...customStatuses.filter(cs => !DEFAULT_STATUSES.some(ds => ds.id === cs.id)),
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

  // Refs for click outside
  const statusRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const assigneesRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const dateRowRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    progress: 0,
    status: 'todo',
    priority: 'medium',
    isMilestone: false,
    color: '#6366F1',
    assignees: [],
    dependencies: [],
    tags: [], // v0.17.158
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with task data
  useEffect(() => {
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
        color: task.color || '#6366F1',
        assignees: task.assignees || [],
        dependencies: task.dependencies || [],
        tags: task.tags || [], // v0.17.158
      })
      if ((task.dependencies && task.dependencies.length > 0) || task.isMilestone) {
        setShowAdvanced(true)
      }
    } else {
      setFormData({
        name: '',
        description: '',
        progress: 0,
        status: 'todo',
        priority: 'medium',
        isMilestone: false,
        color: '#6366F1',
        assignees: [],
        dependencies: [],
        pendingFiles: [], // v0.17.166
        tags: [], // v0.17.158
      })
      setShowAdvanced(false)
      setPendingFiles([]) // v0.17.166: Clear pending files on reset
    }
  }, [task, isOpen])

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
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido'
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la de inicio'
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

  // Pill button base style
  const pillStyle = {
    backgroundColor: themeColors.bgSecondary,
    border: `1px solid ${themeColors.borderLight}`,
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
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-xl rounded-xl shadow-2xl pointer-events-auto overflow-hidden"
              data-theme={theme}
              style={{
                backgroundColor: themeColors.bgPrimary,
                border: `1px solid ${themeColors.border}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Minimal */}
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentStatus.color || themeColors.accent }}
                  />
                  <span className="text-sm font-medium" style={{ color: themeColors.textSecondary }}>
                    {mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: themeColors.textTertiary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = themeColors.hoverBg
                    e.currentTarget.style.color = themeColors.textPrimary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = themeColors.textTertiary
                  }}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="p-5 space-y-4">
                  {/* Task Name - Large & Prominent */}
                  <div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 placeholder:opacity-50"
                      style={{ color: themeColors.textPrimary }}
                      placeholder="Nombre de la tarea"
                      disabled={isLoading}
                      autoFocus
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Description - Subtle */}
                  <div>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:opacity-40"
                      style={{ color: themeColors.textSecondary }}
                      placeholder="Agregar descripción..."
                      rows={2}
                      disabled={isLoading}
                    />
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${themeColors.borderLight}` }} />

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
                            className="absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg shadow-xl overflow-hidden"
                            style={{ backgroundColor: themeColors.bgPrimary, border: `1px solid ${themeColors.border}` }}
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
                        <span>{currentPriority.label}</span>
                        <ChevronDown className="w-3 h-3" style={{ color: themeColors.textTertiary }} />
                      </button>

                      <AnimatePresence>
                        {showPriorityDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-0 top-full mt-1 z-50 min-w-[130px] rounded-lg shadow-xl overflow-hidden"
                            style={{ backgroundColor: themeColors.bgPrimary, border: `1px solid ${themeColors.border}` }}
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
                                {priority.label}
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
                              <span style={{ color: themeColors.textTertiary }}>Asignar</span>
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
                              className="absolute left-0 top-full mt-1 z-50 min-w-[180px] max-h-[200px] overflow-y-auto rounded-lg shadow-xl"
                              style={{ backgroundColor: themeColors.bgPrimary, border: `1px solid ${themeColors.border}` }}
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
                                            initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                                            color: themeColors.accent,
                                          }]
                                      handleChange('assignees', newAssignees)
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0"
                                      style={{ backgroundColor: themeColors.accent }}
                                    >
                                      {user.name.charAt(0).toUpperCase()}
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
                        <span>{currentColor.name}</span>
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
                                backgroundColor: themeColors.bgPrimary,
                                border: `1px solid ${themeColors.border}`,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
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
                                        title={color.name}
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

                  {/* Dates Row */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" style={{ color: themeColors.textTertiary }} />
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
                                const viewportHeight = window.innerHeight
                                const pickerHeight = 320 // Approximate height
                                // Open upward if not enough space below
                                const spaceBelow = viewportHeight - rect.bottom
                                const top = spaceBelow < pickerHeight ? rect.top - pickerHeight - 8 : rect.bottom + 8
                                setDatePickerPosition({ top, left: rect.left })
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
                        {formData.startDate ? formData.startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Inicio'}
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
                                const viewportHeight = window.innerHeight
                                const pickerHeight = 320
                                const spaceBelow = viewportHeight - rect.bottom
                                const top = spaceBelow < pickerHeight ? rect.top - pickerHeight - 8 : rect.bottom + 8
                                setDatePickerPosition({ top, left: rect.left })
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
                        {formData.endDate ? formData.endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Fin'}
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
                                backgroundColor: themeColors.bgPrimary,
                                border: `1px solid ${themeColors.border}`,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Quick Options */}
                              <div className="w-40 py-2" style={{ borderRight: `1px solid ${themeColors.border}` }}>
                                {(() => {
                                  const today = new Date()
                                  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
                                  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
                                  const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14)

                                  const options = [
                                    { label: 'Hoy', date: today },
                                    { label: 'Mañana', date: tomorrow },
                                    { label: 'Próxima semana', date: nextWeek },
                                    { label: '2 semanas', date: twoWeeks },
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
                                  Borrar fechas
                                </button>
                              </div>

                              {/* Calendar */}
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <button type="button" onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))} className="p-1 rounded hover:bg-white/10"><ChevronLeft className="w-4 h-4" style={{ color: themeColors.textSecondary }} /></button>
                                  <span className="text-sm font-medium" style={{ color: themeColors.textPrimary }}>{datePickerMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                                  <button type="button" onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))} className="p-1 rounded hover:bg-white/10"><ChevronRight className="w-4 h-4" style={{ color: themeColors.textSecondary }} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                                    <div key={i} className="w-7 h-7 flex items-center justify-center text-xs" style={{ color: themeColors.textTertiary }}>{d}</div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const year = datePickerMonth.getFullYear(), month = datePickerMonth.getMonth()
                                    const firstDay = new Date(year, month, 1).getDay()
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
                                            backgroundColor: isStart ? '#3B82F6' : isEnd ? '#7C3AED' : isInRange ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                                            boxShadow: isToday && !isStart && !isEnd ? 'inset 0 0 0 1px #3B82F6' : 'none',
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

                  {/* Progress Row - Compact */}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4" style={{ color: themeColors.textTertiary }} />
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.progress}
                        onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          backgroundColor: themeColors.bgSecondary,
                          accentColor: formData.progress < 30 ? '#EF4444' : formData.progress < 70 ? '#F59E0B' : '#10B981',
                        }}
                        disabled={isLoading}
                      />
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full min-w-[45px] text-center"
                        style={{
                          backgroundColor: `${formData.progress < 30 ? '#EF4444' : formData.progress < 70 ? '#F59E0B' : '#10B981'}20`,
                          color: formData.progress < 30 ? '#EF4444' : formData.progress < 70 ? '#F59E0B' : '#10B981',
                        }}
                      >
                        {formData.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Advanced Options - Collapsible */}
                  {/* v0.17.227: Attachments moved inside advanced options for cleaner form */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-xs w-full py-2 transition-colors"
                      style={{ color: themeColors.textTertiary }}
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                      Opciones avanzadas
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
                                    Adjuntos {mode === 'create'
                                      ? (pendingFiles.length > 0 && `(${pendingFiles.length})`)
                                      : (attachments.length > 0 && `(${attachments.length})`)}
                                  </span>
                                </div>
                                {mode === 'create' ? (
                                  <AttachmentUploader
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
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors hover:bg-white/5">
                              <input
                                type="checkbox"
                                checked={formData.isMilestone}
                                onChange={(e) => handleChange('isMilestone', e.target.checked)}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: themeColors.accent }}
                                disabled={isLoading}
                              />
                              <MilestoneIcon className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm" style={{ color: themeColors.textPrimary }}>Marcar como hito</span>
                            </label>

                            {/* Dependencies */}
                            {availableTasks.length > 0 && (
                              <div>
                                <label className="flex items-center gap-2 text-xs mb-2" style={{ color: themeColors.textTertiary }}>
                                  <Link2 className="w-3.5 h-3.5" />
                                  Dependencias
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg" style={{ backgroundColor: themeColors.bgSecondary }}>
                                  {availableTasks.filter(t => t.id !== task?.id).map((t) => {
                                    const isSelected = formData.dependencies?.includes(t.id)
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                          const newDeps = isSelected
                                            ? (formData.dependencies || []).filter(id => id !== t.id)
                                            : [...(formData.dependencies || []), t.id]
                                          handleChange('dependencies', newDeps)
                                        }}
                                        className="px-2 py-1 rounded-full text-xs transition-colors"
                                        style={{
                                          backgroundColor: isSelected ? `${themeColors.accent}30` : themeColors.bgPrimary,
                                          color: isSelected ? themeColors.accent : themeColors.textSecondary,
                                          border: `1px solid ${isSelected ? themeColors.accent : themeColors.borderLight}`,
                                        }}
                                        disabled={isLoading}
                                      >
                                        {t.name}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer - Simplified */}
                <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${themeColors.border}` }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm rounded-lg transition-colors"
                    style={{ color: themeColors.textSecondary }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    style={{ backgroundColor: themeColors.accent, color: '#FFF' }}
                    onMouseEnter={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                    ) : (
                      <>{mode === 'create' ? 'Crear tarea' : 'Guardar'}</>
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
