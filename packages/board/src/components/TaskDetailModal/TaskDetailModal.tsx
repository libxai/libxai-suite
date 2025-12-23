/**
 * TaskDetailModal Component
 * Shared task detail modal for Calendar, Kanban, and Gantt views
 * ClickUp-style full-screen modal with all task fields
 * @version 0.17.229
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  X,
  Flag,
  User,
  CalendarDays,
  Clock,
  Tag,
  Link2,
  FileText,
  MoreHorizontal,
  Sparkles,
  Plus,
  Maximize2,
  ListChecks,
  Upload,
} from 'lucide-react';
import type { Task, Assignee, TaskTag } from '../Gantt/types';
import type { Card } from '../../types';
import { cn } from '../../utils';
import { TagPicker } from '../Gantt/TagPicker';

// Type for item that can be either Task or Card
export type TaskOrCard = Task | Card;

// Helper to convert Card to Task format for internal use
function normalizeToTask(item: TaskOrCard): Task {
  // Check if it's a Card (has 'title' instead of 'name')
  if ('title' in item && !('name' in item)) {
    const card = item as Card;
    // Map card assignedUserIds to Task assignees format
    // Note: We only have IDs, names will need to be resolved by consumer
    const assignees: Assignee[] = (card.assignedUserIds || []).map(id => ({
      name: id, // Placeholder - actual name resolved by consumer
      initials: id.substring(0, 2).toUpperCase(),
      color: '#6366F1',
    }));

    return {
      id: card.id,
      name: card.title,
      startDate: card.startDate ? new Date(card.startDate) : undefined,
      endDate: card.endDate ? new Date(card.endDate) : undefined,
      progress: card.progress || 0,
      status: card.columnId as any,
      priority: card.priority?.toLowerCase() as any,
      assignees,
      dependencies: Array.isArray(card.dependencies)
        ? card.dependencies.map(d => typeof d === 'string' ? d : d.taskId)
        : [],
      tags: card.tags,
      subtasks: card.subtasks?.map(s => ({
        id: s.id,
        name: s.title,
        progress: s.completed ? 100 : 0,
        startDate: new Date(),
        endDate: new Date(),
      })),
      color: card.color,
      description: card.description,
    } as Task;
  }
  return item as Task;
}

// Helper to convert Task back to Card format
function taskToCard(task: Task, originalCard: Card): Card {
  return {
    ...originalCard,
    title: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
    progress: task.progress,
    priority: task.priority?.toUpperCase() as any,
    tags: task.tags,
    description: (task as any).description,
    color: task.color,
    columnId: task.status as string,
    // Keep original assignedUserIds - assignees in Task don't have IDs
    // The original card's assignedUserIds remain unchanged unless consumer updates them
    assignedUserIds: originalCard.assignedUserIds,
  };
}

export interface TaskDetailModalProps {
  /** Task or Card to display */
  task: TaskOrCard | null;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Update task callback (receives Task type) */
  onTaskUpdate?: (task: Task) => void;
  /** Update card callback (receives Card type) - use this for Kanban */
  onCardUpdate?: (card: Card) => void;
  /** Theme */
  theme?: 'dark' | 'light';
  /** Locale */
  locale?: 'en' | 'es';
  /** Available users for assignment */
  availableUsers?: Assignee[];
  /** Available tags in workspace for selection */
  availableTags?: TaskTag[];
  /** Callback to create a new tag */
  onCreateTag?: (name: string, color: string) => Promise<TaskTag | null>;
}

/**
 * TaskDetailModal - ClickUp style full-screen task detail
 */
export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdate,
  onCardUpdate,
  theme = 'dark',
  locale = 'es',
  availableUsers: _availableUsers = [],
  availableTags = [],
  onCreateTag,
}: TaskDetailModalProps) {
  const isDark = theme === 'dark';

  // Theme object for TagPicker
  const tagPickerTheme = {
    textTertiary: isDark ? '#6B7280' : '#9CA3AF',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    borderLight: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    bgPrimary: isDark ? '#1A1D25' : '#FFFFFF',
    bgSecondary: isDark ? '#0F1117' : '#F9FAFB',
    hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };

  // Check if original item is a Card
  const isCard = task && 'title' in task && !('name' in task);
  const originalItem = task;

  // Local state for editing (always use Task format internally)
  const [selectedTask, setSelectedTask] = useState<Task | null>(task ? normalizeToTask(task) : null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [editingProgress, setEditingProgress] = useState(false);

  // Update local state when task prop changes
  useEffect(() => {
    if (task) {
      setSelectedTask(normalizeToTask(task));
    }
  }, [task?.id]);

  // Handle update - emit in correct format
  const handleUpdate = useCallback((updatedTask: Task) => {
    setSelectedTask(updatedTask);

    // If original was a Card, convert back and call onCardUpdate
    if (isCard && onCardUpdate && originalItem) {
      onCardUpdate(taskToCard(updatedTask, originalItem as Card));
    } else if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  }, [isCard, originalItem, onCardUpdate, onTaskUpdate]);

  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowStatusDropdown(false);
    setShowPriorityDropdown(false);
    setShowDatePicker(null);
  }, []);

  // Update task field
  const updateTaskField = useCallback((field: keyof Task, value: any) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, [field]: value };
    handleUpdate(updatedTask);
  }, [selectedTask, handleUpdate]);

  // Update task status
  const updateTaskStatus = useCallback((statusId: string) => {
    if (!selectedTask) return;
    let progress = selectedTask.progress || 0;
    if (statusId === 'completed') progress = 100;
    else if (statusId === 'in-progress' && progress === 0) progress = 10;
    else if (statusId === 'todo') progress = 0;

    const updatedTask = { ...selectedTask, status: statusId as any, progress };
    handleUpdate(updatedTask);
    setShowStatusDropdown(false);
  }, [selectedTask, handleUpdate]);

  // Update task dates
  const updateTaskDates = useCallback((startDate: Date | undefined, endDate: Date | undefined) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, startDate, endDate };
    handleUpdate(updatedTask);
  }, [selectedTask, handleUpdate]);

  // Generate calendar days for date picker
  const getDatePickerDays = useCallback(() => {
    const year = datePickerMonth.getFullYear();
    const month = datePickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [datePickerMonth]);

  if (!isOpen || !selectedTask) return null;

  return (
    <AnimatePresence>
      {isOpen && selectedTask && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          {/* Modal - Full screen like ClickUp */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={cn(
              "fixed inset-4 md:inset-8 lg:inset-12 rounded-xl shadow-2xl z-50 flex overflow-hidden",
              isDark ? "bg-[#1A1D25]" : "bg-white"
            )}
          >
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className={cn("px-6 py-3 border-b flex items-center gap-3", isDark ? "border-white/10" : "border-gray-200")}>
                <div className="flex items-center gap-2">
                  <Circle className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                  <span className={cn("text-xs px-2 py-0.5 rounded", isDark ? "bg-white/10 text-[#9CA3AF]" : "bg-gray-100 text-gray-600")}>
                    {locale === 'es' ? 'Tarea' : 'Task'} ∨
                  </span>
                  <span className={cn("text-xs font-mono", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                    {selectedTask.id.slice(0, 8)}
                  </span>
                  <button className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
                    isDark ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  )}>
                    <Sparkles className="w-3 h-3" />
                    Ask AI
                  </button>
                </div>
                <div className="flex-1" />
                <button className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}>
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}>
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Task Title with checkbox */}
              <div className="px-6 py-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => {
                      const newProgress = selectedTask.progress === 100 ? 0 : 100;
                      const newStatus = newProgress === 100 ? 'completed' : 'todo';
                      const updatedTask = { ...selectedTask, progress: newProgress, status: newStatus as any };
                      handleUpdate(updatedTask);
                    }}
                    className={cn(
                      "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedTask.progress === 100
                        ? "bg-green-500 border-green-500"
                        : isDark ? "border-white/30 hover:border-white/50" : "border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {selectedTask.progress === 100 && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <h2 className={cn(
                    "text-xl font-semibold flex-1",
                    selectedTask.progress === 100 ? "line-through text-[#6B7280]" : (isDark ? "text-white" : "text-gray-900")
                  )}>
                    {selectedTask.name}
                  </h2>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="px-6 pb-6 flex-1 overflow-y-auto overflow-x-visible">
                <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                  {/* Status */}
                  <div className="flex items-center gap-3 relative">
                    <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Estado' : 'Status'}
                    </span>
                    <button
                      onClick={() => {
                        closeAllDropdowns();
                        setShowStatusDropdown(!showStatusDropdown);
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded font-medium cursor-pointer transition-all hover:ring-2 hover:ring-white/20",
                        selectedTask.progress === 100 || selectedTask.status === 'completed'
                          ? "bg-green-500/20 text-green-400"
                          : (selectedTask.progress && selectedTask.progress > 0) || selectedTask.status === 'in-progress'
                            ? "bg-blue-500/20 text-blue-400"
                            : isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {selectedTask.progress === 100 || selectedTask.status === 'completed'
                        ? (locale === 'es' ? 'COMPLETADO' : 'DONE')
                        : (selectedTask.progress && selectedTask.progress > 0) || selectedTask.status === 'in-progress'
                          ? (locale === 'es' ? 'EN PROGRESO' : 'IN PROGRESS')
                          : (locale === 'es' ? 'POR HACER' : 'TO DO')}
                    </button>
                    {/* Status Dropdown */}
                    <AnimatePresence>
                      {showStatusDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={cn(
                              "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[140px]",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                          >
                            {[
                              { id: 'todo', label: locale === 'es' ? 'Por hacer' : 'To Do', color: 'bg-gray-400' },
                              { id: 'in-progress', label: locale === 'es' ? 'En progreso' : 'In Progress', color: 'bg-blue-500' },
                              { id: 'completed', label: locale === 'es' ? 'Completado' : 'Done', color: 'bg-green-500' },
                            ].map((status) => (
                              <button
                                key={status.id}
                                onClick={() => updateTaskStatus(status.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                  selectedTask.status === status.id && (isDark ? "bg-white/5" : "bg-gray-50")
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full", status.color)} />
                                <span className={isDark ? "text-white" : "text-gray-900"}>{status.label}</span>
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Assignees */}
                  <div className="flex items-center gap-3">
                    <User className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Asignados' : 'Assignees'}
                    </span>
                    {selectedTask.assignees && selectedTask.assignees.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {selectedTask.assignees.slice(0, 3).map((assignee, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: assignee.color || '#8B5CF6' }}
                            title={assignee.name}
                          >
                            {assignee.initials || assignee.name.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {selectedTask.assignees.length > 3 && (
                          <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                            +{selectedTask.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={cn("text-sm", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                        {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3 relative">
                    <CalendarDays className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Fechas' : 'Dates'}
                    </span>
                    <button
                      onClick={() => {
                        setShowDatePicker(showDatePicker ? null : 'start');
                        setDatePickerMonth(selectedTask.startDate || new Date());
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                      )}
                    >
                      {selectedTask.startDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' }) || (locale === 'es' ? 'Inicio' : 'Start')}
                      <span className={cn("mx-1", isDark ? "text-[#6B7280]" : "text-gray-400")}>→</span>
                      {selectedTask.endDate?.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' }) || (locale === 'es' ? 'Fin' : 'End')}
                    </button>

                    {/* Date Picker Popover */}
                    <AnimatePresence>
                      {showDatePicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(null)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              "absolute left-0 top-full mt-2 z-50 rounded-xl shadow-2xl overflow-hidden flex",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Quick Options */}
                            <div className={cn("w-44 py-2 border-r", isDark ? "border-white/10" : "border-gray-200")}>
                              {(() => {
                                const today = new Date();
                                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                                const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
                                const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);

                                return [
                                  { label: locale === 'es' ? 'Hoy' : 'Today', date: today },
                                  { label: locale === 'es' ? 'Mañana' : 'Tomorrow', date: tomorrow },
                                  { label: locale === 'es' ? 'Próxima semana' : 'Next week', date: nextWeek },
                                  { label: locale === 'es' ? '2 semanas' : '2 weeks', date: twoWeeks },
                                ].map((option, i) => (
                                  <button
                                    key={i}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                      isDark ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                                    )}
                                    onClick={() => {
                                      if (showDatePicker === 'start') {
                                        updateTaskDates(option.date, selectedTask.endDate);
                                        setShowDatePicker('end');
                                      } else {
                                        updateTaskDates(selectedTask.startDate, option.date);
                                        setShowDatePicker(null);
                                      }
                                    }}
                                  >
                                    <span>{option.label}</span>
                                    <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                      {option.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </button>
                                ));
                              })()}
                            </div>

                            {/* Calendar Grid */}
                            <div className="p-4 w-[280px]">
                              <div className="flex items-center justify-between mb-4">
                                <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                                  {showDatePicker === 'start' ? (locale === 'es' ? 'Fecha inicio' : 'Start date') : (locale === 'es' ? 'Fecha fin' : 'End date')}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                  </button>
                                  <span className={cn("text-sm min-w-[100px] text-center", isDark ? "text-white" : "text-gray-900")}>
                                    {datePickerMonth.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-7 gap-1 mb-2">
                                {(locale === 'es' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, i) => (
                                  <div key={i} className={cn("text-xs text-center py-1", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                    {day}
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-7 gap-1">
                                {getDatePickerDays().map((d, i) => {
                                  const isToday = d.date.toDateString() === new Date().toDateString();
                                  const isStartDate = selectedTask.startDate?.toDateString() === d.date.toDateString();
                                  const isEndDate = selectedTask.endDate?.toDateString() === d.date.toDateString();
                                  const isInRange = selectedTask.startDate && selectedTask.endDate &&
                                    d.date >= selectedTask.startDate && d.date <= selectedTask.endDate;

                                  return (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        if (showDatePicker === 'start') {
                                          updateTaskDates(d.date, selectedTask.endDate && d.date > selectedTask.endDate ? d.date : selectedTask.endDate);
                                          setShowDatePicker('end');
                                        } else {
                                          updateTaskDates(selectedTask.startDate && d.date < selectedTask.startDate ? d.date : selectedTask.startDate, d.date);
                                          setShowDatePicker(null);
                                        }
                                      }}
                                      className={cn(
                                        "w-8 h-8 text-xs rounded-lg transition-colors",
                                        !d.isCurrentMonth && (isDark ? "text-[#4B5563]" : "text-gray-300"),
                                        d.isCurrentMonth && (isDark ? "text-white" : "text-gray-900"),
                                        isToday && "ring-1 ring-blue-500",
                                        (isStartDate || isEndDate) && "bg-blue-500 text-white",
                                        isInRange && !isStartDate && !isEndDate && (isDark ? "bg-blue-500/20" : "bg-blue-100"),
                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                      )}
                                    >
                                      {d.date.getDate()}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-3 relative">
                    <Flag className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Prioridad' : 'Priority'}
                    </span>
                    <button
                      onClick={() => {
                        closeAllDropdowns();
                        setShowPriorityDropdown(!showPriorityDropdown);
                      }}
                      className={cn(
                        "text-xs px-2 py-1 rounded font-medium transition-all hover:ring-2 hover:ring-white/20",
                        selectedTask.priority === 'high' || selectedTask.priority === 'urgent'
                          ? "bg-red-500/20 text-red-400"
                          : selectedTask.priority === 'medium'
                            ? "bg-yellow-500/20 text-yellow-400"
                            : selectedTask.priority === 'low'
                              ? "bg-green-500/20 text-green-400"
                              : isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {selectedTask.priority
                        ? (selectedTask.priority === 'high' || selectedTask.priority === 'urgent'
                            ? (locale === 'es' ? 'Alta' : 'High')
                            : selectedTask.priority === 'medium'
                              ? (locale === 'es' ? 'Media' : 'Medium')
                              : (locale === 'es' ? 'Baja' : 'Low'))
                        : (locale === 'es' ? 'Sin prioridad' : 'No priority')}
                    </button>
                    {/* Priority Dropdown */}
                    <AnimatePresence>
                      {showPriorityDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPriorityDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={cn(
                              "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[140px]",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                          >
                            {[
                              { id: 'urgent', label: locale === 'es' ? 'Urgente' : 'Urgent', color: 'bg-red-500' },
                              { id: 'high', label: locale === 'es' ? 'Alta' : 'High', color: 'bg-orange-500' },
                              { id: 'medium', label: locale === 'es' ? 'Media' : 'Medium', color: 'bg-yellow-500' },
                              { id: 'low', label: locale === 'es' ? 'Baja' : 'Low', color: 'bg-green-500' },
                              { id: undefined, label: locale === 'es' ? 'Sin prioridad' : 'No priority', color: 'bg-gray-400' },
                            ].map((priority) => (
                              <button
                                key={priority.id || 'none'}
                                onClick={() => {
                                  updateTaskField('priority', priority.id as Task['priority']);
                                  setShowPriorityDropdown(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                  selectedTask.priority === priority.id && (isDark ? "bg-white/5" : "bg-gray-50")
                                )}
                              >
                                <span className={cn("w-2 h-2 rounded-full", priority.color)} />
                                <span className={isDark ? "text-white" : "text-gray-900"}>{priority.label}</span>
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-3">
                    <Clock className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Duración' : 'Duration'}
                    </span>
                    <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                      {selectedTask.startDate && selectedTask.endDate
                        ? `${Math.ceil((selectedTask.endDate.getTime() - selectedTask.startDate.getTime()) / (1000 * 60 * 60 * 24))} ${locale === 'es' ? 'días' : 'days'}`
                        : (locale === 'es' ? 'Sin definir' : 'Not set')}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 rounded-full border-2", isDark ? "border-[#6B7280]" : "border-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Progreso' : 'Progress'}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      {editingProgress ? (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={selectedTask.progress || 0}
                          onChange={(e) => {
                            const newProgress = parseInt(e.target.value);
                            let newStatus = selectedTask.status;
                            if (newProgress === 100) newStatus = 'completed';
                            else if (newProgress > 0) newStatus = 'in-progress';
                            else newStatus = 'todo';
                            const updatedTask = { ...selectedTask, progress: newProgress, status: newStatus as any };
                            handleUpdate(updatedTask);
                          }}
                          onBlur={() => setEditingProgress(false)}
                          className={cn(
                            "flex-1 max-w-[120px] h-2 rounded-full appearance-none cursor-pointer",
                            isDark ? "bg-white/10" : "bg-gray-200",
                            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3B82F6] [&::-webkit-slider-thumb]:cursor-pointer"
                          )}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingProgress(true)}
                          className={cn(
                            "flex-1 h-2 rounded-full overflow-hidden max-w-[120px] cursor-pointer hover:ring-2 hover:ring-white/20 transition-all",
                            isDark ? "bg-white/10" : "bg-gray-200"
                          )}
                        >
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              selectedTask.progress === 100 ? "bg-green-500" : "bg-[#3B82F6]"
                            )}
                            style={{ width: `${selectedTask.progress || 0}%` }}
                          />
                        </button>
                      )}
                      <span className={cn("text-sm font-medium min-w-[40px]", isDark ? "text-white" : "text-gray-900")}>
                        {selectedTask.progress || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-3">
                    <Tag className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Etiquetas' : 'Tags'}
                    </span>
                    <TagPicker
                      selectedTags={selectedTask.tags || []}
                      availableTags={availableTags}
                      onChange={(newTags) => {
                        updateTaskField('tags', newTags);
                      }}
                      onCreateTag={onCreateTag}
                      theme={tagPickerTheme}
                    />
                  </div>

                  {/* Dependencies */}
                  <div className="flex items-center gap-3">
                    <Link2 className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Relaciones' : 'Relations'}
                    </span>
                    <span className={cn("text-sm", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                      {selectedTask.dependencies && selectedTask.dependencies.length > 0
                        ? `${selectedTask.dependencies.length} ${locale === 'es' ? 'dependencias' : 'dependencies'}`
                        : (locale === 'es' ? 'Vacío' : 'Empty')}
                    </span>
                  </div>
                </div>

                {/* Description section */}
                <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <button className={cn(
                    "flex items-center gap-2 text-sm transition-colors",
                    isDark ? "text-[#9CA3AF] hover:text-white" : "text-gray-500 hover:text-gray-900"
                  )}>
                    <FileText className="w-4 h-4" />
                    {locale === 'es' ? 'Agregar descripción' : 'Add description'}
                  </button>
                  <button className={cn(
                    "flex items-center gap-2 text-sm mt-2 transition-colors",
                    isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
                  )}>
                    <Sparkles className="w-4 h-4" />
                    {locale === 'es' ? 'Escribe con IA' : 'Write with AI'}
                  </button>
                </div>

                {/* Custom Fields section */}
                <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                    {locale === 'es' ? 'Campos personalizados' : 'Custom fields'}
                  </h3>
                  <button className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  )}>
                    <Plus className="w-4 h-4" />
                    {locale === 'es' ? 'Crea un campo en esta lista' : 'Create a field in this list'}
                  </button>
                </div>

                {/* Subtasks section */}
                <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900")}>
                    {locale === 'es' ? 'Subtareas' : 'Subtasks'}
                  </h3>
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedTask.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2">
                          <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center cursor-pointer",
                            subtask.progress === 100
                              ? "bg-green-500 border-green-500"
                              : isDark ? "border-white/20 hover:border-white/40" : "border-gray-300 hover:border-gray-400"
                          )}>
                            {subtask.progress === 100 && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className={cn(
                            "text-sm",
                            subtask.progress === 100
                              ? "line-through text-[#6B7280]"
                              : isDark ? "text-white" : "text-gray-900"
                          )}>
                            {subtask.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  )}>
                    <Plus className="w-4 h-4" />
                    {locale === 'es' ? 'Agregar subtarea' : 'Add subtask'}
                  </button>
                </div>

                {/* Checklists Section */}
                <div className={cn(
                  "mt-6 pt-4 border-t",
                  isDark ? "border-white/10" : "border-gray-200"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn(
                      "text-sm font-semibold",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {locale === 'es' ? 'Listas de control' : 'Checklists'}
                    </h3>
                    <button className={cn(
                      "p-1 rounded transition-colors",
                      isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500"
                    )}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  )}>
                    <ListChecks className="w-4 h-4" />
                    {locale === 'es' ? 'Crear lista de control' : 'Create checklist'}
                  </button>
                </div>

                {/* Attachments Section */}
                <div className={cn(
                  "mt-6 pt-4 border-t",
                  isDark ? "border-white/10" : "border-gray-200"
                )}>
                  <h3 className={cn(
                    "text-sm font-semibold mb-3",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {locale === 'es' ? 'Adjuntos' : 'Attachments'}
                  </h3>
                  <div className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                    isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300"
                  )}>
                    <Upload className={cn(
                      "w-6 h-6 mx-auto mb-2",
                      isDark ? "text-[#6B7280]" : "text-gray-400"
                    )} />
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-[#9CA3AF]" : "text-gray-500"
                    )}>
                      {locale === 'es'
                        ? <>Suelta tus archivos aquí para <span className="underline">subir</span></>
                        : <>Drop your files here to <span className="underline">upload</span></>
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
