/**
 * Task Form Modal - Complete CRUD for Gantt Tasks
 * v0.17.70: Redesigned layout - more compact, assignees at top
 * Full-featured task creation/editing with user assignment, dates, dependencies, etc.
 * Similar to DHTMLX Gantt lightbox
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Users,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Milestone as MilestoneIcon,
  Palette,
  Flag,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Task, Theme } from './types'
import { themes } from './themes'
import { ColorPicker } from './ColorPicker'

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
  description?: string // v0.17.28: Task description for Kanban cards
  startDate?: Date
  endDate?: Date
  progress: number
  status: string // v0.17.54: Changed to string to support custom statuses
  priority?: TaskPriority // v0.17.28: Task priority for Kanban cards
  isMilestone: boolean
  color?: string // v0.11.0: Custom task color
  assignees?: Array<{ name: string; avatar?: string; initials: string; color: string }>
  dependencies?: string[]
}

export interface TaskFormModalProps {
  /** Is modal open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Task to edit (undefined for create mode) */
  task?: Task
  /** Available tasks for dependencies */
  availableTasks?: Task[]
  /** Available users for assignment */
  availableUsers?: Array<{ id: string; name: string; avatar?: string }>
  /** Submit handler */
  onSubmit: (data: TaskFormData) => void | Promise<void>
  /** Is submitting */
  isLoading?: boolean
  /** Mode: create or edit */
  mode?: 'create' | 'edit'
  /** Theme: dark, light, or neutral (zen) */
  theme?: Theme
  /** v0.17.54: Custom statuses from Kanban columns */
  customStatuses?: CustomStatus[]
}

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
}: TaskFormModalProps) {
  // v0.17.54: Combine default statuses with custom ones
  const allStatuses: CustomStatus[] = [
    ...DEFAULT_STATUSES,
    ...customStatuses.filter(cs => !DEFAULT_STATUSES.some(ds => ds.id === cs.id)),
  ]
  // Get theme colors (with fallback to dark theme)
  const themeColors = (themes[theme] || themes.dark)!

  // v0.17.70: Collapsible sections state
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Common styles
  const inputStyle = {
    backgroundColor: themeColors.bgSecondary,
    border: `1px solid ${themeColors.borderLight}`,
    color: themeColors.textPrimary,
  }

  const labelStyle = {
    color: themeColors.textSecondary,
  }

  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    progress: 0,
    status: 'todo',
    priority: 'medium',
    isMilestone: false,
    color: '#6366F1', // v0.11.0: Default blue pastel color
    assignees: [],
    dependencies: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with task data (edit mode)
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
        color: task.color || '#6366F1', // v0.11.0: Use task color or default
        assignees: task.assignees || [],
        dependencies: task.dependencies || [],
      })
      // Show advanced if task has dependencies or is milestone
      if ((task.dependencies && task.dependencies.length > 0) || task.isMilestone) {
        setShowAdvanced(true)
      }
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        description: '',
        progress: 0,
        status: 'todo',
        priority: 'medium',
        isMilestone: false,
        color: '#6366F1', // v0.11.0: Default blue pastel color
        assignees: [],
        dependencies: [],
      })
      setShowAdvanced(false)
    }
  }, [task, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

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
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting task:', error)
    }
  }

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Smart status updates based on progress
      if (field === 'progress') {
        const progressValue = typeof value === 'number' ? value : parseInt(value, 10)

        // Auto-complete task when progress reaches 100%
        if (progressValue === 100 && prev.status !== 'completed') {
          updated.status = 'completed'
        }
        // Auto-start task when progress > 0 and status is still 'todo'
        else if (progressValue > 0 && progressValue < 100 && prev.status === 'todo') {
          updated.status = 'in-progress'
        }
        // Auto-reset to todo when progress is 0 (regardless of current status)
        // This ensures strikethrough is removed when user sets progress back to 0
        else if (progressValue === 0 && prev.status !== 'todo') {
          updated.status = 'todo'
        }
      }

      return updated
    })

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-2xl rounded-xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: themeColors.bgPrimary,
                border: `1px solid ${themeColors.border}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: `1px solid ${themeColors.border}` }}
              >
                <h2 className="text-lg font-semibold" style={{ color: themeColors.textPrimary }}>
                  {mode === 'create' ? 'Nueva Tarea' : 'Editar Tarea'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color: themeColors.textSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form - v0.17.70: Redesigned compact layout */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Task Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={labelStyle}>
                    Nombre de la Tarea *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = themeColors.accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = themeColors.borderLight)}
                    placeholder="Ej: Diseñar mockups de la aplicación"
                    disabled={isLoading}
                    autoFocus
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* v0.17.70: Two-column layout for dates + assignees */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left column: Dates */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium flex items-center gap-2" style={labelStyle}>
                      <Calendar className="w-4 h-4" />
                      Fechas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs block mb-1" style={{ color: themeColors.textTertiary }}>Inicio</span>
                        <input
                          type="date"
                          value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                          className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                          style={inputStyle}
                          disabled={isLoading || formData.isMilestone}
                        />
                      </div>
                      <div>
                        <span className="text-xs block mb-1" style={{ color: themeColors.textTertiary }}>Fin</span>
                        <input
                          type="date"
                          value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                          onChange={(e) => handleChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                          className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                          style={inputStyle}
                          disabled={isLoading || formData.isMilestone}
                        />
                      </div>
                    </div>
                    {errors.endDate && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.endDate}
                      </p>
                    )}
                  </div>

                  {/* Right column: Assignees - v0.17.70: Moved to top */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 flex items-center gap-2" style={labelStyle}>
                      <Users className="w-4 h-4" />
                      Asignar a
                    </label>
                    {availableUsers.length > 0 ? (
                      <div
                        className="space-y-1 max-h-[88px] overflow-y-auto p-2 rounded-lg"
                        style={{
                          backgroundColor: themeColors.bgSecondary,
                          border: `1px solid ${themeColors.borderLight}`,
                        }}
                      >
                        {availableUsers.map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2 cursor-pointer p-1.5 rounded text-sm"
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <input
                              type="checkbox"
                              checked={formData.assignees?.some((a) => a.name === user.name)}
                              onChange={(e) => {
                                const newAssignees = e.target.checked
                                  ? [
                                      ...(formData.assignees || []),
                                      {
                                        id: user.id,
                                        name: user.name,
                                        avatar: user.avatar,
                                        initials: user.name
                                          .split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .toUpperCase()
                                          .slice(0, 2),
                                        color: themeColors.accent,
                                      },
                                    ]
                                  : (formData.assignees || []).filter((a) => a.name !== user.name)
                                handleChange('assignees', newAssignees)
                              }}
                              className="w-4 h-4 rounded flex-shrink-0"
                              style={{
                                accentColor: themeColors.accent,
                              }}
                              disabled={isLoading}
                            />
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-semibold flex-shrink-0"
                              style={{ backgroundColor: themeColors.accent }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate" style={{ color: themeColors.textPrimary }}>{user.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="p-3 rounded-lg text-sm text-center"
                        style={{
                          backgroundColor: themeColors.bgSecondary,
                          border: `1px solid ${themeColors.borderLight}`,
                          color: themeColors.textTertiary,
                        }}
                      >
                        No hay usuarios disponibles
                      </div>
                    )}
                  </div>
                </div>

                {/* v0.17.70: Three-column layout for Status, Priority, Progress */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={labelStyle}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Estado
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={inputStyle}
                      disabled={isLoading}
                    >
                      {allStatuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={labelStyle}>
                      <Flag className="w-3.5 h-3.5" />
                      Prioridad
                    </label>
                    <select
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={inputStyle}
                      disabled={isLoading}
                    >
                      <option value="low">🟢 Baja</option>
                      <option value="medium">🟡 Media</option>
                      <option value="high">🟠 Alta</option>
                      <option value="urgent">🔴 Urgente</option>
                    </select>
                  </div>

                  {/* Progress - Compact */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5 flex items-center justify-between" style={labelStyle}>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Progreso
                      </span>
                      <span
                        className="font-semibold px-1.5 py-0.5 rounded text-xs"
                        style={{
                          color: formData.progress < 30 ? '#EF4444' : formData.progress < 70 ? '#F59E0B' : '#10B981',
                          backgroundColor: formData.progress < 30 ? 'rgba(239, 68, 68, 0.1)' : formData.progress < 70 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        }}
                      >
                        {formData.progress}%
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.progress}
                        onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          backgroundColor: themeColors.bgSecondary,
                          accentColor: formData.progress < 30 ? '#EF4444' : formData.progress < 70 ? '#F59E0B' : '#10B981',
                        }}
                        disabled={isLoading}
                      />
                    </div>
                    {/* Quick buttons */}
                    <div className="flex gap-1 mt-1.5">
                      {[0, 50, 100].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleChange('progress', value)}
                          disabled={isLoading}
                          className="flex-1 px-1 py-0.5 text-xs font-medium rounded transition-all"
                          style={{
                            backgroundColor: formData.progress === value
                              ? (value < 30 ? '#EF4444' : value < 70 ? '#F59E0B' : '#10B981')
                              : themeColors.bgSecondary,
                            color: formData.progress === value
                              ? '#FFFFFF'
                              : themeColors.textTertiary,
                            border: `1px solid ${formData.progress === value
                              ? 'transparent'
                              : themeColors.borderLight}`,
                          }}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* v0.17.70: Color picker - Inline compact version */}
                <div>
                  <label className="block text-xs font-medium mb-2 flex items-center gap-1.5" style={labelStyle}>
                    <Palette className="w-3.5 h-3.5" />
                    Color
                  </label>
                  <ColorPicker
                    value={formData.color}
                    onChange={(color) => handleChange('color', color)}
                    disabled={isLoading}
                  />
                </div>

                {/* v0.17.70: Description - Collapsible */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={labelStyle}>
                    <FileText className="w-3.5 h-3.5" />
                    Descripción
                    <span className="text-xs font-normal" style={{ color: themeColors.textTertiary }}>(opcional)</span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none text-sm"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = themeColors.accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = themeColors.borderLight)}
                    placeholder="Describe los detalles de la tarea..."
                    rows={2}
                    disabled={isLoading}
                  />
                </div>

                {/* v0.17.70: Advanced Options - Collapsible section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium w-full py-2 px-3 rounded-lg transition-colors"
                    style={{
                      color: themeColors.textSecondary,
                      backgroundColor: themeColors.bgSecondary,
                      border: `1px solid ${themeColors.borderLight}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = themeColors.bgSecondary)}
                  >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Opciones avanzadas
                    <span className="text-xs font-normal" style={{ color: themeColors.textTertiary }}>
                      (hito, dependencias)
                    </span>
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                          {/* Milestone Checkbox */}
                          <div
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{
                              backgroundColor: themeColors.bgSecondary,
                              border: `1px solid ${themeColors.borderLight}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              id="isMilestone"
                              checked={formData.isMilestone}
                              onChange={(e) => handleChange('isMilestone', e.target.checked)}
                              className="w-4 h-4 rounded focus:ring-2"
                              style={{
                                accentColor: themeColors.accent,
                              }}
                              disabled={isLoading}
                            />
                            <label htmlFor="isMilestone" className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: themeColors.textPrimary }}>
                              <MilestoneIcon className="w-4 h-4 text-yellow-500" />
                              Marcar como Hito (Milestone)
                            </label>
                          </div>

                          {/* Dependencies */}
                          {availableTasks.length > 0 && (
                            <div>
                              <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={labelStyle}>
                                <Link2 className="w-3.5 h-3.5" />
                                Dependencias
                              </label>
                              <div
                                className="space-y-1 max-h-28 overflow-y-auto p-2 rounded-lg"
                                style={{
                                  backgroundColor: themeColors.bgSecondary,
                                  border: `1px solid ${themeColors.borderLight}`,
                                }}
                              >
                                {availableTasks
                                  .filter((t) => t.id !== task?.id)
                                  .map((t) => (
                                    <label
                                      key={t.id}
                                      className="flex items-center gap-2 cursor-pointer p-1.5 rounded text-sm"
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeColors.hoverBg)}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.dependencies?.includes(t.id)}
                                        onChange={(e) => {
                                          const newDeps = e.target.checked
                                            ? [...(formData.dependencies || []), t.id]
                                            : (formData.dependencies || []).filter((id) => id !== t.id)
                                          handleChange('dependencies', newDeps)
                                        }}
                                        className="w-4 h-4 rounded flex-shrink-0"
                                        style={{
                                          accentColor: themeColors.accent,
                                        }}
                                        disabled={isLoading}
                                      />
                                      <span className="truncate" style={{ color: themeColors.textPrimary }}>{t.name}</span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 px-6 py-4"
                style={{
                  borderTop: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.bgPrimary,
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: themeColors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = themeColors.textPrimary
                    e.currentTarget.style.backgroundColor = themeColors.hoverBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = themeColors.textSecondary
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    backgroundColor: themeColors.accent,
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = themeColors.accentHover)}
                  onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = themeColors.accent)}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {mode === 'create' ? 'Crear Tarea' : 'Guardar Cambios'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
