/**
 * TaskDetailModal Component
 * Shared task detail modal for Calendar, Kanban, and Gantt views
 * ClickUp-style full-screen modal with all task fields
 * @version 0.18.9
 *
 * v0.18.9: Removed unused sections (Custom Fields, Checklists), made Subtasks functional
 * v0.17.422: Added emoji picker and file attachments in comments
 * v0.17.401: Added @mentions support in comments
 * v0.17.253: Editable task name with debounce auto-save
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Upload,
  MessageSquare,
  Check,
  ChevronDown,
  Trash2,
  File,
  Image,
  FileText as FileTextIcon,
  Palette,
  Diamond,
} from 'lucide-react';
import { MentionInput, CommentContent, extractMentionedUserIds } from './MentionInput';
import type { MentionUser, CommentAttachment, PendingFile } from './MentionInput';
import type { Task, Assignee, TaskTag } from '../Gantt/types';
import type { Card, Attachment } from '../../types';
import { cn } from '../../utils';
import { TagPicker } from '../Gantt/TagPicker';
import { TASK_COLORS } from '../Gantt/ColorPicker';

// Type for item that can be either Task or Card
export type TaskOrCard = Task | Card;

// Helper to convert Card to Task format for internal use
function normalizeToTask(item: TaskOrCard, availableUsers: Assignee[] = []): Task {
  // Check if it's a Card (has 'title' instead of 'name')
  if ('title' in item && !('name' in item)) {
    const card = item as Card;
    // Map card assignedUserIds to Task assignees format
    // Resolve IDs to actual user info from availableUsers
    const assignees: Assignee[] = (card.assignedUserIds || []).map(id => {
      // Try to find user by ID in availableUsers
      const user = availableUsers.find(u => (u as any).id === id);
      if (user) {
        return user;
      }
      // Fallback if user not found - but don't show as assignee
      return null;
    }).filter((a): a is Assignee => a !== null);

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
    // v0.17.441: Include dependencies when converting back to Card
    dependencies: task.dependencies,
  };
}

/** Comment type for activity panel */
export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  /** v0.17.422: Attachments for comments */
  attachments?: CommentAttachment[];
  createdAt: Date | string;
  updatedAt?: Date | string;
  user?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    color?: string;
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
  /** v0.17.241: Attachments for the task */
  attachments?: Attachment[];
  /** v0.17.241: Callback when files are dropped/selected for upload */
  onUploadAttachments?: (taskId: string, files: File[]) => Promise<void>;
  /** v0.17.241: Callback to delete an attachment */
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
  /** v0.17.243: Available tasks for dependencies selection */
  availableTasks?: Task[];
  /** v0.17.252: Comments for activity panel */
  comments?: TaskComment[];
  /** v0.17.422: Callback to add a new comment (with optional mentionedUserIds and attachments) */
  onAddComment?: (taskId: string, content: string, mentionedUserIds?: string[], attachments?: CommentAttachment[]) => Promise<void>;
  /** v0.17.252: Current user info for displaying comments */
  currentUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
  };
  /** v0.17.401: Users available for @mentions in comments */
  mentionableUsers?: MentionUser[];
  /** v0.17.422: Upload comment attachments callback */
  onUploadCommentAttachments?: (files: File[]) => Promise<CommentAttachment[]>;
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
  availableUsers = [],
  availableTags = [],
  onCreateTag,
  attachments = [],
  onUploadAttachments,
  onDeleteAttachment,
  availableTasks = [],
  comments = [],
  onAddComment,
  currentUser,
  mentionableUsers = [],
  onUploadCommentAttachments,
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(task ? normalizeToTask(task, availableUsers) : null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [editingProgress, setEditingProgress] = useState(false);
  const [showDependenciesDropdown, setShowDependenciesDropdown] = useState(false);
  const [dependencySearch, setDependencySearch] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // v0.17.241: Attachment drag state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // v0.17.251: Local description state with debounce for auto-save
  const [localDescription, setLocalDescription] = useState('');
  const descriptionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // v0.17.442: Auto-resize textarea ref
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // v0.17.253: Local task name state with debounce for auto-save
  const [localTaskName, setLocalTaskName] = useState('');
  const taskNameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v0.17.252: Comment input state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  // v0.17.422: Pending files for comment attachments
  const [pendingCommentFiles, setPendingCommentFiles] = useState<PendingFile[]>([]);

  // v0.18.9: Subtasks state
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Update local state when task prop changes
  useEffect(() => {
    if (task) {
      const normalizedTask = normalizeToTask(task, availableUsers);
      setSelectedTask(normalizedTask);
      setLocalDescription((normalizedTask as any).description || '');
      setLocalTaskName(normalizedTask.name || '');
    }
  }, [task?.id, availableUsers]);

  // v0.17.442: Auto-resize description textarea when description changes or modal opens
  useEffect(() => {
    if (!isOpen || !localDescription) return;

    // Small delay to ensure textarea is rendered
    const timer = setTimeout(() => {
      const textarea = descriptionTextareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, localDescription]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (descriptionDebounceRef.current) {
        clearTimeout(descriptionDebounceRef.current);
      }
      if (taskNameDebounceRef.current) {
        clearTimeout(taskNameDebounceRef.current);
      }
    };
  }, []);

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
    setShowAssigneesDropdown(false);
    setShowDatePicker(null);
    setShowDependenciesDropdown(false);
    setDependencySearch('');
    setShowColorPicker(false);
  }, []);

  // Update task field
  const updateTaskField = useCallback((field: keyof Task, value: any) => {
    if (!selectedTask) return;
    const updatedTask = { ...selectedTask, [field]: value };
    handleUpdate(updatedTask);
  }, [selectedTask, handleUpdate]);

  // v0.17.442: Auto-resize description textarea
  const autoResizeDescription = useCallback(() => {
    const textarea = descriptionTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
    }
  }, []);

  // v0.17.251: Handle description change with debounce (auto-save after typing stops)
  const handleDescriptionChange = useCallback((value: string) => {
    // Update local state immediately for responsive UI
    setLocalDescription(value);

    // v0.17.442: Auto-resize textarea
    setTimeout(autoResizeDescription, 0);

    // Clear any existing debounce timer
    if (descriptionDebounceRef.current) {
      clearTimeout(descriptionDebounceRef.current);
    }

    // Set new debounce timer (800ms delay before saving)
    descriptionDebounceRef.current = setTimeout(() => {
      if (selectedTask) {
        const updatedTask = { ...selectedTask, description: value } as Task;
        handleUpdate(updatedTask);
      }
    }, 800);
  }, [selectedTask, handleUpdate, autoResizeDescription]);

  // v0.17.253: Handle task name change with debounce (auto-save after typing stops)
  const handleTaskNameChange = useCallback((value: string) => {
    // Update local state immediately for responsive UI
    setLocalTaskName(value);

    // Clear any existing debounce timer
    if (taskNameDebounceRef.current) {
      clearTimeout(taskNameDebounceRef.current);
    }

    // Set new debounce timer (800ms delay before saving)
    taskNameDebounceRef.current = setTimeout(() => {
      if (selectedTask && value.trim()) {
        const updatedTask = { ...selectedTask, name: value.trim() };
        handleUpdate(updatedTask);
      }
    }, 800);
  }, [selectedTask, handleUpdate]);

  // v0.17.422: Handle file selection for comment attachments
  const handleCommentFilesSelect = useCallback((files: File[]) => {
    const newPendingFiles: PendingFile[] = files.map(file => {
      const pendingFile: PendingFile = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        pendingFile.preview = URL.createObjectURL(file);
      }

      return pendingFile;
    });

    setPendingCommentFiles(prev => [...prev, ...newPendingFiles]);
  }, []);

  // v0.17.422: Handle remove pending file
  const handleRemoveCommentFile = useCallback((fileId: string) => {
    setPendingCommentFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      // Revoke preview URL to prevent memory leaks
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // v0.17.422: Handle submit comment with mentions and attachments support
  const handleSubmitComment = useCallback(async () => {
    if (!selectedTask || (!commentText.trim() && pendingCommentFiles.length === 0) || !onAddComment) return;

    setIsSubmittingComment(true);
    try {
      // Extract mentioned user IDs from the comment text
      const mentionedUserIds = extractMentionedUserIds(commentText, mentionableUsers);

      // Upload pending files if any
      let uploadedAttachments: CommentAttachment[] = [];
      if (pendingCommentFiles.length > 0 && onUploadCommentAttachments) {
        const files = pendingCommentFiles.map(pf => pf.file);
        uploadedAttachments = await onUploadCommentAttachments(files);
      }

      await onAddComment(
        selectedTask.id,
        commentText.trim(),
        mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      );

      // Clear comment input and pending files
      setCommentText('');
      // Revoke all preview URLs
      pendingCommentFiles.forEach(pf => {
        if (pf.preview) URL.revokeObjectURL(pf.preview);
      });
      setPendingCommentFiles([]);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [selectedTask, commentText, pendingCommentFiles, onAddComment, mentionableUsers, onUploadCommentAttachments]);

  // v0.18.9: Handle add subtask
  const handleAddSubtask = useCallback(() => {
    if (!selectedTask || !newSubtaskName.trim()) return;

    const newSubtask: Task = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: newSubtaskName.trim(),
      progress: 0,
      startDate: new Date(),
      endDate: new Date(),
    };

    const updatedSubtasks = [...(selectedTask.subtasks || []), newSubtask];
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    handleUpdate(updatedTask);
    setNewSubtaskName('');
    setIsAddingSubtask(false);
  }, [selectedTask, newSubtaskName, handleUpdate]);

  // v0.18.9: Handle toggle subtask completion
  const handleToggleSubtask = useCallback((subtaskId: string) => {
    if (!selectedTask?.subtasks) return;

    const updatedSubtasks = selectedTask.subtasks.map(subtask => {
      if (subtask.id === subtaskId) {
        return { ...subtask, progress: subtask.progress === 100 ? 0 : 100 };
      }
      return subtask;
    });

    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    handleUpdate(updatedTask);
  }, [selectedTask, handleUpdate]);

  // v0.18.9: Handle delete subtask
  const handleDeleteSubtask = useCallback((subtaskId: string) => {
    if (!selectedTask?.subtasks) return;

    const updatedSubtasks = selectedTask.subtasks.filter(s => s.id !== subtaskId);
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    handleUpdate(updatedTask);
  }, [selectedTask, handleUpdate]);

  // v0.17.252: Format comment date
  const formatCommentDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'es' ? 'Ahora' : 'Just now';
    if (diffMins < 60) return locale === 'es' ? `Hace ${diffMins} min` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'es' ? `Hace ${diffDays}d` : `${diffDays}d ago`;

    return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  }, [locale]);

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

  // v0.17.241: Handle file drop for attachments
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (!selectedTask || !onUploadAttachments) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      await onUploadAttachments(selectedTask.id, files);
    } finally {
      setIsUploadingFiles(false);
    }
  }, [selectedTask, onUploadAttachments]);

  // v0.17.241: Handle file input change
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTask || !onUploadAttachments || !e.target.files) return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      await onUploadAttachments(selectedTask.id, files);
    } finally {
      setIsUploadingFiles(false);
    }
    // Reset input
    e.target.value = '';
  }, [selectedTask, onUploadAttachments]);

  // v0.17.241: Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  // v0.17.241: Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // v0.17.241: Get file icon based on type
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileTextIcon;
    return File;
  }, []);

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

              {/* Task Title with checkbox - v0.17.253: Editable name */}
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
                      "mt-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                      selectedTask.progress === 100
                        ? "bg-green-500 border-green-500"
                        : isDark ? "border-white/30 hover:border-white/50" : "border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {selectedTask.progress === 100 && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={localTaskName}
                    onChange={(e) => handleTaskNameChange(e.target.value)}
                    placeholder={locale === 'es' ? 'Nombre de la tarea...' : 'Task name...'}
                    className={cn(
                      "text-xl font-semibold flex-1 bg-transparent outline-none border-none px-0 py-0",
                      "focus:ring-0 focus:outline-none",
                      selectedTask.progress === 100
                        ? "line-through text-[#6B7280]"
                        : (isDark ? "text-white placeholder:text-[#6B7280]" : "text-gray-900 placeholder:text-gray-400")
                    )}
                  />
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
                  <div className="flex items-center gap-3 relative">
                    <User className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Asignados' : 'Assignees'}
                    </span>
                    <button
                      onClick={() => {
                        closeAllDropdowns();
                        setShowAssigneesDropdown(!showAssigneesDropdown);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
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
                          {locale === 'es' ? 'Agregar' : 'Add'}
                        </span>
                      )}
                      <ChevronDown className={cn("w-3 h-3", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    </button>

                    {/* Assignees Dropdown */}
                    <AnimatePresence>
                      {showAssigneesDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAssigneesDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={cn(
                              "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[200px] max-h-[280px] overflow-y-auto",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                          >
                            {availableUsers.length > 0 ? (
                              availableUsers.map((user) => {
                                const isSelected = selectedTask.assignees?.some(a => a.name === user.name);
                                return (
                                  <button
                                    key={user.name}
                                    onClick={() => {
                                      const currentAssignees = selectedTask.assignees || [];
                                      let newAssignees: Assignee[];
                                      if (isSelected) {
                                        newAssignees = currentAssignees.filter(a => a.name !== user.name);
                                      } else {
                                        newAssignees = [...currentAssignees, user];
                                      }
                                      updateTaskField('assignees', newAssignees);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                                      isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                      isSelected && (isDark ? "bg-white/5" : "bg-gray-50")
                                    )}
                                  >
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                                      style={{ backgroundColor: user.color || '#8B5CF6' }}
                                    >
                                      {user.initials || user.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className={cn("flex-1", isDark ? "text-white" : "text-gray-900")}>
                                      {user.name}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-4 h-4 text-green-500" />
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <div className={cn("px-3 py-4 text-sm text-center", isDark ? "text-[#6B7280]" : "text-gray-500")}>
                                {locale === 'es' ? 'No hay usuarios disponibles' : 'No users available'}
                              </div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
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
                            {/* Quick Options - Left Side */}
                            <div className={cn("w-44 py-2 border-r", isDark ? "border-white/10" : "border-gray-200")}>
                              {(() => {
                                const today = new Date();
                                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                                const nextSaturday = new Date(today); nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
                                const nextMonday = new Date(today); nextMonday.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
                                const nextWeekend = new Date(today); nextWeekend.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7) + 7);
                                const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);
                                const fourWeeks = new Date(today); fourWeeks.setDate(today.getDate() + 28);

                                const quickOptions = [
                                  { label: locale === 'es' ? 'Hoy' : 'Today', date: today, display: today.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                  { label: locale === 'es' ? 'Mañana' : 'Tomorrow', date: tomorrow, display: tomorrow.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).slice(0, 3) + '.' },
                                  { label: locale === 'es' ? 'Este fin de semana' : 'This weekend', date: nextSaturday, display: locale === 'es' ? 'sáb.' : 'sat.' },
                                  { label: locale === 'es' ? 'Próxima semana' : 'Next week', date: nextMonday, display: locale === 'es' ? 'lun.' : 'mon.' },
                                  { label: locale === 'es' ? 'Próximo fin de semana' : 'Next weekend', date: nextWeekend, display: nextWeekend.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                  { label: locale === 'es' ? '2 semanas' : '2 weeks', date: twoWeeks, display: twoWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                  { label: locale === 'es' ? '4 semanas' : '4 weeks', date: fourWeeks, display: fourWeeks.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' }) },
                                ];

                                return quickOptions.map((option, i) => (
                                  <button
                                    key={i}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                      isDark ? "hover:bg-white/5 text-white" : "hover:bg-gray-50 text-gray-900"
                                    )}
                                    onClick={() => {
                                      if (showDatePicker === 'start') {
                                        const newEndDate = selectedTask.endDate && option.date > selectedTask.endDate
                                          ? option.date
                                          : selectedTask.endDate;
                                        updateTaskDates(option.date, newEndDate);
                                        setShowDatePicker('end');
                                      } else {
                                        const newStartDate = selectedTask.startDate && option.date < selectedTask.startDate
                                          ? option.date
                                          : selectedTask.startDate;
                                        updateTaskDates(newStartDate, option.date);
                                        setShowDatePicker(null);
                                      }
                                    }}
                                  >
                                    <span>{option.label}</span>
                                    <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                      {option.display}
                                    </span>
                                  </button>
                                ));
                              })()}
                              {/* Clear dates button */}
                              <div className={cn("border-t mt-2 pt-2", isDark ? "border-white/10" : "border-gray-200")}>
                                <button
                                  onClick={() => {
                                    updateTaskDates(undefined, undefined);
                                    setShowDatePicker(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                    isDark ? "hover:bg-white/5 text-red-400" : "hover:bg-gray-50 text-red-500"
                                  )}
                                >
                                  <span>{locale === 'es' ? 'Quitar fechas' : 'Clear dates'}</span>
                                  <X className="w-4 h-4 opacity-50" />
                                </button>
                              </div>
                            </div>

                            {/* Calendar - Right Side */}
                            <div className="p-4">
                              {/* Selection indicator */}
                              <div className={cn("text-xs mb-3 px-2 py-1 rounded", isDark ? "bg-white/5 text-[#9CA3AF]" : "bg-gray-100 text-gray-600")}>
                                {showDatePicker === 'start'
                                  ? (locale === 'es' ? '📅 Selecciona fecha de inicio' : '📅 Select start date')
                                  : (locale === 'es' ? '📅 Selecciona fecha de fin' : '📅 Select end date')}
                              </div>
                              {/* Month Header */}
                              <div className="flex items-center justify-between mb-4">
                                <span className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>
                                  {datePickerMonth.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setDatePickerMonth(new Date())}
                                    className={cn(
                                      "p-1 rounded text-sm transition-colors",
                                      isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
                                    )}
                                  >
                                    {locale === 'es' ? 'Hoy' : 'Today'}
                                  </button>
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                  </button>
                                  <button
                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                                    className={cn("p-1 rounded", isDark ? "hover:bg-white/10" : "hover:bg-gray-100")}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </button>
                                </div>
                              </div>

                              {/* Weekday Headers */}
                              <div className="grid grid-cols-7 gap-1 mb-2">
                                {(locale === 'es'
                                  ? ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá']
                                  : ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
                                ).map((day) => (
                                  <div key={day} className={cn("w-8 h-8 flex items-center justify-center text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Calendar Days */}
                              <div className="grid grid-cols-7 gap-1">
                                {getDatePickerDays().map((d, i) => {
                                  const isToday = d.date.toDateString() === new Date().toDateString();
                                  const isStartDate = selectedTask.startDate?.toDateString() === d.date.toDateString();
                                  const isEndDate = selectedTask.endDate?.toDateString() === d.date.toDateString();
                                  const isSelected = isStartDate || isEndDate;
                                  const isInRange = selectedTask.startDate && selectedTask.endDate &&
                                    d.date >= selectedTask.startDate && d.date <= selectedTask.endDate;

                                  return (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        const clickedDate = new Date(d.date);
                                        if (showDatePicker === 'start') {
                                          const newEndDate = selectedTask.endDate && clickedDate > selectedTask.endDate
                                            ? clickedDate
                                            : selectedTask.endDate;
                                          updateTaskDates(clickedDate, newEndDate);
                                          setShowDatePicker('end');
                                        } else {
                                          const newStartDate = selectedTask.startDate && clickedDate < selectedTask.startDate
                                            ? clickedDate
                                            : selectedTask.startDate;
                                          updateTaskDates(newStartDate, clickedDate);
                                          setShowDatePicker(null);
                                        }
                                      }}
                                      className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors",
                                        !d.isCurrentMonth && (isDark ? "text-[#4B5563]" : "text-gray-300"),
                                        d.isCurrentMonth && (isDark ? "text-white" : "text-gray-900"),
                                        isToday && "ring-2 ring-[#3B82F6]",
                                        isStartDate && "bg-[#3B82F6] text-white",
                                        isEndDate && !isStartDate && "bg-[#7C3AED] text-white",
                                        isInRange && !isSelected && (isDark ? "bg-[#7C3AED]/20" : "bg-purple-100"),
                                        !isSelected && (isDark ? "hover:bg-white/10" : "hover:bg-gray-100")
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
                  <div className="flex items-start gap-3 relative">
                    <Link2 className={cn("w-4 h-4 mt-1.5", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24 mt-1", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Relaciones' : 'Relations'}
                    </span>
                    <div className="flex-1">
                      {/* Selected dependencies as chips */}
                      {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {selectedTask.dependencies.map((depId) => {
                            const depTask = availableTasks.find(t => t.id === depId);
                            return (
                              <span
                                key={depId}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                  isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"
                                )}
                              >
                                {depTask?.name || depId.slice(0, 8)}
                                <button
                                  onClick={() => {
                                    const newDeps = (selectedTask.dependencies || []).filter(id => id !== depId);
                                    updateTaskField('dependencies', newDeps);
                                  }}
                                  className={cn(
                                    "ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                                  )}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Add dependency button */}
                      <button
                        onClick={() => {
                          closeAllDropdowns();
                          setShowDependenciesDropdown(!showDependenciesDropdown);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                          {locale === 'es' ? 'Agregar dependencia' : 'Add dependency'}
                        </span>
                      </button>

                      {/* Dependencies Dropdown */}
                      <AnimatePresence>
                        {showDependenciesDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => {
                              setShowDependenciesDropdown(false);
                              setDependencySearch('');
                            }} />
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden min-w-[280px] max-h-[320px]",
                                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                              )}
                            >
                              {/* Search input */}
                              <div className={cn("p-2 border-b", isDark ? "border-white/10" : "border-gray-200")}>
                                <input
                                  type="text"
                                  value={dependencySearch}
                                  onChange={(e) => setDependencySearch(e.target.value)}
                                  placeholder={locale === 'es' ? 'Buscar tarea...' : 'Search task...'}
                                  className={cn(
                                    "w-full px-3 py-2 rounded-md text-sm outline-none",
                                    isDark
                                      ? "bg-white/5 text-white placeholder:text-[#6B7280] focus:bg-white/10"
                                      : "bg-gray-100 text-gray-900 placeholder:text-gray-400"
                                  )}
                                  autoFocus
                                />
                              </div>

                              {/* Task list */}
                              <div className="max-h-[240px] overflow-y-auto">
                                {availableTasks.length > 0 ? (
                                  availableTasks
                                    .filter(t => t.id !== selectedTask.id)
                                    .filter(t =>
                                      dependencySearch === '' ||
                                      t.name.toLowerCase().includes(dependencySearch.toLowerCase())
                                    )
                                    .map((depTask) => {
                                      const isSelected = selectedTask.dependencies?.includes(depTask.id);
                                      return (
                                        <button
                                          key={depTask.id}
                                          onClick={() => {
                                            const currentDeps = selectedTask.dependencies || [];
                                            let newDeps: string[];
                                            if (isSelected) {
                                              newDeps = currentDeps.filter(id => id !== depTask.id);
                                            } else {
                                              newDeps = [...currentDeps, depTask.id];
                                            }
                                            updateTaskField('dependencies', newDeps);
                                          }}
                                          className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                                            isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                            isSelected && (isDark ? "bg-white/5" : "bg-gray-50")
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                                              isSelected
                                                ? "bg-blue-500 border-blue-500"
                                                : isDark ? "border-white/30" : "border-gray-300"
                                            )}
                                          >
                                            {isSelected && (
                                              <Check className="w-3 h-3 text-white" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <span className={cn("block truncate", isDark ? "text-white" : "text-gray-900")}>
                                              {depTask.name}
                                            </span>
                                            <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                              {depTask.id.slice(0, 8)}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })
                                ) : (
                                  <div className={cn("px-3 py-4 text-sm text-center", isDark ? "text-[#6B7280]" : "text-gray-500")}>
                                    {locale === 'es' ? 'No hay tareas disponibles' : 'No tasks available'}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Color */}
                  <div className="flex items-center gap-3 relative">
                    <Palette className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Color' : 'Color'}
                    </span>
                    <button
                      onClick={() => {
                        closeAllDropdowns();
                        setShowColorPicker(!showColorPicker);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                        isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selectedTask.color || '#6366F1' }}
                      />
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                        {TASK_COLORS.find(c => c.value === selectedTask.color)?.name || (locale === 'es' ? 'Azul' : 'Blue')}
                      </span>
                      <ChevronDown className={cn("w-3 h-3", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    </button>

                    {/* Color Picker Dropdown */}
                    <AnimatePresence>
                      {showColorPicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={cn(
                              "absolute left-32 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden p-3",
                              isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                            )}
                          >
                            <div className="grid grid-cols-6 gap-1.5">
                              {TASK_COLORS.map((color) => {
                                const isSelected = selectedTask.color === color.value;
                                return (
                                  <button
                                    key={color.value}
                                    onClick={() => {
                                      updateTaskField('color', color.value);
                                      setShowColorPicker(false);
                                    }}
                                    className={cn(
                                      "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                      isSelected && "ring-2 ring-offset-2",
                                      isDark ? "ring-offset-[#1A1D25]" : "ring-offset-white"
                                    )}
                                    style={{
                                      backgroundColor: color.value,
                                      outlineColor: isSelected ? color.value : undefined,
                                    }}
                                    title={color.name}
                                  >
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-white" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Milestone */}
                  <div className="flex items-center gap-3">
                    <Diamond className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <span className={cn("text-sm w-24", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                      {locale === 'es' ? 'Hito' : 'Milestone'}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTask.isMilestone || false}
                        onChange={(e) => updateTaskField('isMilestone' as any, e.target.checked)}
                        className={cn(
                          "w-4 h-4 rounded border-2 cursor-pointer appearance-none transition-colors",
                          selectedTask.isMilestone
                            ? "bg-purple-500 border-purple-500"
                            : isDark ? "border-white/30 bg-transparent" : "border-gray-300 bg-transparent",
                          "checked:bg-purple-500 checked:border-purple-500"
                        )}
                      />
                      <span className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>
                        {locale === 'es' ? 'Marcar como hito' : 'Mark as milestone'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description section */}
                <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className={cn("w-4 h-4", isDark ? "text-[#6B7280]" : "text-gray-400")} />
                    <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Descripción' : 'Description'}
                    </h3>
                  </div>
                  <textarea
                    ref={descriptionTextareaRef}
                    value={localDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder={locale === 'es' ? 'Agregar descripción...' : 'Add description...'}
                    className={cn(
                      "w-full min-h-[100px] max-h-[400px] px-3 py-2 rounded-lg text-sm resize-none outline-none transition-colors overflow-y-auto",
                      isDark
                        ? "bg-white/5 text-white placeholder:text-[#6B7280] focus:bg-white/10"
                        : "bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:bg-gray-200"
                    )}
                  />
                  <button className={cn(
                    "flex items-center gap-2 text-sm mt-2 transition-colors",
                    isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-700"
                  )}>
                    <Sparkles className="w-4 h-4" />
                    {locale === 'es' ? 'Escribe con IA' : 'Write with AI'}
                  </button>
                </div>

                {/* Subtasks section - v0.18.9: Functional */}
                <div className={cn("mt-6 pt-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                      {locale === 'es' ? 'Subtareas' : 'Subtasks'}
                      {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                        <span className={cn("ml-2 text-xs font-normal", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                          ({selectedTask.subtasks.filter(s => s.progress === 100).length}/{selectedTask.subtasks.length})
                        </span>
                      )}
                    </h3>
                  </div>
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedTask.subtasks.map((subtask) => (
                        <div key={subtask.id} className={cn(
                          "flex items-center gap-2 group p-2 rounded-lg -mx-2 transition-colors",
                          isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                        )}>
                          <button
                            onClick={() => handleToggleSubtask(subtask.id)}
                            className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                              subtask.progress === 100
                                ? "bg-green-500 border-green-500"
                                : isDark ? "border-white/20 hover:border-green-500/50" : "border-gray-300 hover:border-green-500"
                            )}
                          >
                            {subtask.progress === 100 && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <span className={cn(
                            "text-sm flex-1",
                            subtask.progress === 100
                              ? "line-through text-[#6B7280]"
                              : isDark ? "text-white" : "text-gray-900"
                          )}>
                            {subtask.name}
                          </span>
                          <button
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            className={cn(
                              "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                              isDark ? "hover:bg-white/10 text-[#6B7280] hover:text-red-400" : "hover:bg-gray-100 text-gray-400 hover:text-red-500"
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add subtask form */}
                  {isAddingSubtask ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSubtaskName}
                        onChange={(e) => setNewSubtaskName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskName.trim()) {
                            handleAddSubtask();
                          } else if (e.key === 'Escape') {
                            setIsAddingSubtask(false);
                            setNewSubtaskName('');
                          }
                        }}
                        placeholder={locale === 'es' ? 'Nombre de la subtarea...' : 'Subtask name...'}
                        autoFocus
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors",
                          isDark
                            ? "bg-white/5 border border-white/10 text-white placeholder:text-[#6B7280] focus:border-blue-500/50"
                            : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                        )}
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskName.trim()}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          newSubtaskName.trim()
                            ? "bg-blue-500 hover:bg-blue-600 text-white"
                            : isDark ? "bg-white/5 text-[#6B7280] cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {locale === 'es' ? 'Agregar' : 'Add'}
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskName('');
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          isDark ? "hover:bg-white/10 text-[#9CA3AF]" : "hover:bg-gray-100 text-gray-500"
                        )}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingSubtask(true)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        isDark ? "bg-white/5 hover:bg-white/10 text-[#9CA3AF]" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      {locale === 'es' ? 'Agregar subtarea' : 'Add subtask'}
                    </button>
                  )}
                </div>

                {/* Attachments Section - v0.17.241: Functional */}
                <div className={cn(
                  "mt-6 pt-4 border-t",
                  isDark ? "border-white/10" : "border-gray-200"
                )}>
                  <h3 className={cn(
                    "text-sm font-semibold mb-3",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {locale === 'es' ? 'Adjuntos' : 'Attachments'}
                    {attachments.length > 0 && (
                      <span className={cn("ml-2 text-xs font-normal", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                        ({attachments.length})
                      </span>
                    )}
                  </h3>

                  {/* Existing attachments */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.type);
                        const isImage = attachment.type.startsWith('image/');

                        return (
                          <div
                            key={attachment.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg group transition-colors",
                              isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                            )}
                          >
                            {/* Thumbnail or icon */}
                            {isImage && attachment.thumbnailUrl ? (
                              <img
                                src={attachment.thumbnailUrl}
                                alt={attachment.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className={cn(
                                "w-10 h-10 rounded flex items-center justify-center",
                                isDark ? "bg-white/10" : "bg-gray-200"
                              )}>
                                <FileIcon className={cn("w-5 h-5", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                              </div>
                            )}

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "text-sm font-medium truncate block hover:underline",
                                  isDark ? "text-white" : "text-gray-900"
                                )}
                              >
                                {attachment.name}
                              </a>
                              <p className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>

                            {/* Delete button */}
                            {onDeleteAttachment && (
                              <button
                                onClick={() => onDeleteAttachment(attachment.id)}
                                className={cn(
                                  "p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all",
                                  isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-500"
                                )}
                                title={locale === 'es' ? 'Eliminar' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleFileDrop}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer relative",
                      isDraggingFile
                        ? (isDark ? "border-blue-500 bg-blue-500/10" : "border-blue-400 bg-blue-50")
                        : (isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300"),
                      isUploadingFiles && "pointer-events-none opacity-50"
                    )}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={handleFileInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={!onUploadAttachments || isUploadingFiles}
                    />
                    {isUploadingFiles ? (
                      <>
                        <div className="w-6 h-6 mx-auto mb-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                          {locale === 'es' ? 'Subiendo...' : 'Uploading...'}
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className={cn(
                          "w-6 h-6 mx-auto mb-2",
                          isDraggingFile ? "text-blue-500" : (isDark ? "text-[#6B7280]" : "text-gray-400")
                        )} />
                        <p className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-500")}>
                          {isDraggingFile
                            ? (locale === 'es' ? 'Suelta los archivos aquí' : 'Drop files here')
                            : (locale === 'es'
                                ? <>Suelta tus archivos aquí o <span className="underline">haz clic para subir</span></>
                                : <>Drop your files here or <span className="underline">click to upload</span></>
                              )
                          }
                        </p>
                        {!onUploadAttachments && (
                          <p className={cn("text-xs mt-1", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                            {locale === 'es' ? 'Upload no disponible' : 'Upload not available'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Panel - Right Sidebar */}
            <div className={cn(
              "w-80 border-l flex flex-col",
              isDark ? "border-white/10 bg-[#0F1117]" : "border-gray-200 bg-gray-50"
            )}>
              {/* Activity Header */}
              <div className={cn(
                "px-4 py-3 border-b",
                isDark ? "border-white/10" : "border-gray-200"
              )}>
                <h3 className={cn(
                  "text-sm font-semibold",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {locale === 'es' ? 'Actividad' : 'Activity'}
                  {comments.length > 0 && (
                    <span className={cn("ml-2 text-xs font-normal", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                      ({comments.length})
                    </span>
                  )}
                </h3>
              </div>

              {/* Activity Content - Comments List */}
              <div className="flex-1 overflow-y-auto p-4">
                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: comment.user?.color || '#8B5CF6' }}
                        >
                          {comment.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        {/* Comment Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>
                              {comment.user?.name || (locale === 'es' ? 'Usuario' : 'User')}
                            </span>
                            <span className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                              {formatCommentDate(comment.createdAt)}
                            </span>
                          </div>
                          <div className={cn("text-sm", isDark ? "text-[#9CA3AF]" : "text-gray-600")}>
                            <CommentContent content={comment.content} theme={theme} />
                          </div>
                          {/* v0.17.422: Comment Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {comment.attachments.map((attachment) => {
                                const isImage = attachment.type.startsWith('image/');
                                return (
                                  <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                                      isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                                    )}
                                  >
                                    {isImage ? (
                                      <Image className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                                    ) : (
                                      <File className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                                    )}
                                    <span className={cn("text-xs truncate max-w-[100px]", isDark ? "text-white" : "text-gray-900")}>
                                      {attachment.name}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className={cn(
                      "w-10 h-10 mb-3",
                      isDark ? "text-[#3B4252]" : "text-gray-300"
                    )} />
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-[#6B7280]" : "text-gray-500"
                    )}>
                      {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
                    </p>
                  </div>
                )}
              </div>

              {/* Comment Input - v0.17.422: Now with @mentions, emojis and attachments support */}
              <div className={cn(
                "p-4 border-t",
                isDark ? "border-white/10" : "border-gray-200"
              )}>
                <MentionInput
                  value={commentText}
                  onChange={setCommentText}
                  onSubmit={handleSubmitComment}
                  users={mentionableUsers}
                  placeholder={locale === 'es' ? 'Escribe un comentario... (usa @ para mencionar)' : 'Write a comment... (use @ to mention)'}
                  disabled={!onAddComment}
                  isSubmitting={isSubmittingComment}
                  theme={theme}
                  locale={locale}
                  currentUser={currentUser}
                  enableEmoji
                  enableAttachments={!!onUploadCommentAttachments}
                  pendingFiles={pendingCommentFiles}
                  onFilesSelect={handleCommentFilesSelect}
                  onRemoveFile={handleRemoveCommentFile}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
