/**
 * CardDetailModal V2.0 - Premium task detail view
 *
 * Design Philosophy:
 * - Speed above all: <100ms open time
 * - Keyboard-first interaction
 * - Single vertical flow (no sidebars)
 * - Instant inline editing
 * - Zero friction UX
 *
 * ALL PHASES IMPLEMENTED:
 * ✅ Phase 1: Modal + Header + Metadata (COMPLETE)
 * ✅ Phase 2: Status & Priority selectors (COMPLETE)
 * ✅ Phase 3: Assignees & Labels selectors (COMPLETE)
 * ✅ Phase 4: Date picker & Time input (COMPLETE)
 * ✅ Phase 5: Markdown renderer (COMPLETE)
 * ✅ Phase 6: Animations & Accessibility polish (COMPLETE)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Portal } from '../Portal'
import { CoverImageManager } from '../CoverImage'
import { useKanbanTheme } from '../Board/KanbanThemeContext'
import type { Card, User, Comment, Activity } from '../../types'
import './card-detail-modal-v2.css'

export interface CardDetailModalV2Props {
  /** Card to display */
  card: Card | null

  /** Whether modal is open */
  isOpen: boolean

  /** Close callback */
  onClose: () => void

  /** Update card callback */
  onUpdate?: (cardId: string, updates: Partial<Card>) => void

  /** Delete card callback */
  onDelete?: (cardId: string) => void

  /** Available users for assignment */
  availableUsers?: User[]

  /** Comments for this card */
  comments?: Comment[]

  /** Activity log for this card */
  activities?: Activity[]

  /** Add comment callback */
  onAddComment?: (cardId: string, content: string) => void

  /** Delete comment callback */
  onDeleteComment?: (commentId: string) => void

  /** Current user */
  currentUser?: User

  /** AI: Generate description */
  onAIGenerateDescription?: (card: Card) => Promise<string>

  /** AI: Create subtasks */
  onAICreateSubtasks?: (card: Card) => Promise<string[]>

  /** AI: Find similar tasks */
  onAIFindSimilar?: (card: Card) => Promise<Card[]>

  /** Available columns for status */
  availableColumns?: Array<{ id: string; title: string }>

  /** Available labels */
  availableLabels?: string[]

  /** Upload cover image callback (optional - returns public URL) */
  onUploadCoverImage?: (file: File) => Promise<string>

  /** Unsplash API key for cover images (optional) */
  unsplashAccessKey?: string
}

interface Subtask {
  id: string
  title: string
  completed: boolean
}

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const STATUS_OPTIONS = ['todo', 'in-progress', 'review', 'done'] as const

export function CardDetailModalV2({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete: _onDelete,
  availableUsers = [],
  comments = [],
  activities = [],
  onAddComment,
  onDeleteComment: _onDeleteComment,
  currentUser,
  onAIGenerateDescription: _onAIGenerateDescription,
  onAICreateSubtasks: _onAICreateSubtasks,
  onAIFindSimilar: _onAIFindSimilar,
  availableColumns = [],
  availableLabels = [],
  onUploadCoverImage,
  unsplashAccessKey,
}: CardDetailModalV2Props) {
  // Get theme from context
  const kanbanTheme = useKanbanTheme()
  const themeName = kanbanTheme?.themeName || 'dark'

  // Local state - Initialize immediately from card prop to avoid render delay
  const [localCard, setLocalCard] = useState<Card | null>(card)

  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [commentText, setCommentText] = useState('')
  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'history'>('all')
  const [showCoverManager, setShowCoverManager] = useState(false)

  // Popover states
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false)
  const [showLabelMenu, setShowLabelMenu] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // Refs
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)
  const priorityMenuRef = useRef<HTMLDivElement>(null)
  const assigneeMenuRef = useRef<HTMLDivElement>(null)
  const labelMenuRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLInputElement>(null)

  // Update local card when prop changes - THIS IS THE FIX!
  // Initialize local card immediately when card prop is available
  useEffect(() => {
    if (card && !localCard) {
      setLocalCard({ ...card })
    } else if (card && localCard && card.id !== localCard.id) {
      setLocalCard({ ...card })
    }
  }, [card, localCard])

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setShowStatusMenu(false)
      }
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(target)) {
        setShowPriorityMenu(false)
      }
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(target)) {
        setShowAssigneeMenu(false)
      }
      if (labelMenuRef.current && !labelMenuRef.current.contains(target)) {
        setShowLabelMenu(false)
      }
    }

    if (showStatusMenu || showPriorityMenu || showAssigneeMenu || showLabelMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return undefined
  }, [showStatusMenu, showPriorityMenu, showAssigneeMenu, showLabelMenu])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // ESC - Close modal or menus
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showStatusMenu || showPriorityMenu || showAssigneeMenu || showLabelMenu || showDatePicker || showTimePicker) {
          setShowStatusMenu(false)
          setShowPriorityMenu(false)
          setShowAssigneeMenu(false)
          setShowLabelMenu(false)
          setShowDatePicker(false)
          setShowTimePicker(false)
        } else if (!isTyping) {
          onClose()
        }
        return
      }

      // Ignore shortcuts if typing
      if (isTyping && e.key !== 'Escape') return

      const isMod = e.metaKey || e.ctrlKey

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault()
          setShowStatusMenu(true)
          break
        case 'a':
          e.preventDefault()
          setShowAssigneeMenu(true)
          break
        case 'p':
          e.preventDefault()
          setShowPriorityMenu(true)
          break
        case 'l':
          e.preventDefault()
          setShowLabelMenu(true)
          break
        case 'd':
          if (!isMod) {
            e.preventDefault()
            setShowDatePicker(true)
            setTimeout(() => datePickerRef.current?.focus(), 0)
          }
          break
        case 'e':
          if (!isMod) {
            e.preventDefault()
            setShowTimePicker(true)
          }
          break
        case 'i':
          e.preventDefault()
          setIsEditingDescription(true)
          setTimeout(() => descriptionRef.current?.focus(), 0)
          break
        case 't':
          e.preventDefault()
          setIsAddingSubtask(true)
          break
        case 'c':
          e.preventDefault()
          commentRef.current?.focus()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, showStatusMenu, showPriorityMenu, showAssigneeMenu, showLabelMenu, showDatePicker, showTimePicker])


  // Handlers
  const handleTitleChange = useCallback(
    (e: React.FormEvent<HTMLHeadingElement>) => {
      const newTitle = e.currentTarget.textContent?.trim() || ''
      if (localCard && newTitle !== localCard.title) {
        const updated = { ...localCard, title: newTitle }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { title: newTitle })
      }
    },
    [localCard, onUpdate]
  )

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLHeadingElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.currentTarget.textContent = localCard?.title || ''
        e.currentTarget.blur()
      }
    },
    [localCard]
  )

  // Note: handleDescriptionChange removed - now handled inline in MarkdownEditor

  const handleDescriptionBlur = useCallback(() => {
    if (localCard && card && localCard.description !== card.description) {
      onUpdate?.(localCard.id, { description: localCard.description })
    }
    setIsEditingDescription(false)
  }, [localCard, card, onUpdate])

  const handleStatusChange = useCallback(
    (status: string) => {
      if (localCard) {
        const updated = { ...localCard, columnId: status }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { columnId: status })
        setShowStatusMenu(false)
      }
    },
    [localCard, onUpdate]
  )

  const handlePriorityChange = useCallback(
    (priority: string) => {
      if (localCard) {
        const updated = { ...localCard, priority: priority as any }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { priority: priority as any })
        setShowPriorityMenu(false)
      }
    },
    [localCard, onUpdate]
  )

  const handleToggleAssignee = useCallback(
    (userId: string) => {
      if (localCard) {
        const currentAssignees = localCard.assignedUserIds || []
        const newAssignees = currentAssignees.includes(userId)
          ? currentAssignees.filter((id) => id !== userId)
          : [...currentAssignees, userId]

        const updated = { ...localCard, assignedUserIds: newAssignees }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { assignedUserIds: newAssignees })
      }
    },
    [localCard, onUpdate]
  )

  const handleToggleLabel = useCallback(
    (label: string) => {
      if (localCard) {
        const currentLabels = localCard.labels || []
        const newLabels = currentLabels.includes(label)
          ? currentLabels.filter((l) => l !== label)
          : [...currentLabels, label]

        const updated = { ...localCard, labels: newLabels }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { labels: newLabels })
      }
    },
    [localCard, onUpdate]
  )

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (localCard) {
        const newDate = e.target.value
        const updated = { ...localCard, endDate: newDate }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { endDate: newDate })
        setShowDatePicker(false)
      }
    },
    [localCard, onUpdate]
  )

  const handleTimeChange = useCallback(
    (hours: string) => {
      if (localCard) {
        const updated = { ...localCard, estimatedTime: parseFloat(hours) || 0 }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { estimatedTime: parseFloat(hours) || 0 })
      }
    },
    [localCard, onUpdate]
  )

  const handleAddSubtask = useCallback(() => {
    if (newSubtaskTitle.trim()) {
      const newSubtask: Subtask = {
        id: `subtask-${Date.now()}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      }
      setSubtasks([...subtasks, newSubtask])
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
    }
  }, [newSubtaskTitle, subtasks])

  const handleToggleSubtask = useCallback(
    (id: string) => {
      setSubtasks(
        subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
      )
    },
    [subtasks]
  )

  const handleDeleteSubtask = useCallback(
    (id: string) => {
      setSubtasks(subtasks.filter((st) => st.id !== id))
    },
    [subtasks]
  )

  const handleSendComment = useCallback(() => {
    if (commentText.trim() && localCard && onAddComment) {
      onAddComment(localCard.id, commentText.trim())
      setCommentText('')
    }
  }, [commentText, localCard, onAddComment])

  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSendComment()
      }
    },
    [handleSendComment]
  )

  const handleCoverImageChange = useCallback(
    (url: string) => {
      if (localCard) {
        const updated = { ...localCard, coverImage: url }
        setLocalCard(updated)
        onUpdate?.(localCard.id, { coverImage: url })
        setShowCoverManager(false)
      }
    },
    [localCard, onUpdate]
  )

  const handleCoverImageRemove = useCallback(() => {
    if (localCard) {
      const updated = { ...localCard, coverImage: undefined }
      setLocalCard(updated)
      onUpdate?.(localCard.id, { coverImage: undefined })
      // Don't close manager immediately - let user see the change
      // setShowCoverManager(false)
    }
  }, [localCard, onUpdate])

  // Enhanced markdown renderer with GFM support
  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {text}
      </ReactMarkdown>
    )
  }

  // Filter activities
  const filteredActivity = activities.filter((activity) => {
    if (activityFilter === 'comments') {
      return activity.type.includes('COMMENT')
    }
    if (activityFilter === 'history') {
      return !activity.type.includes('COMMENT')
    }
    return true
  })

  // CRITICAL FIX: Use card prop directly for early return check
  // Using localCard causes race condition with Portal mount + useEffect timing
  if (!isOpen || !card) {
    return null
  }

  // Use localCard if available (for live edits), fallback to card prop
  const displayCard = localCard || card

  const assignedUsers = availableUsers.filter((user) =>
    displayCard.assignedUserIds?.includes(user.id)
  )

  const completedSubtasksCount = subtasks.filter((st) => st.completed).length

  return (
    <Portal>
      <div
        className="modal-v2-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="modal-v2-container"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          data-theme={themeName}
        >
          {/* HEADER */}
          <header className="modal-v2-header">
            <h1
              id="modal-title"
              ref={titleRef}
              className="modal-v2-title"
              contentEditable
              suppressContentEditableWarning
              onBlur={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
            >
              {displayCard.title}
            </h1>

            <p className="modal-v2-ai-prompt">
              <span className="modal-v2-ai-icon">✨</span>
              Ask AI to write a description, create subtasks, or find similar tasks
            </p>

            <button className="modal-v2-close" onClick={onClose} aria-label="Close">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          {/* COVER IMAGE SECTION */}
          <section className="modal-v2-cover-section">
            {!showCoverManager && !displayCard.coverImage && (
              <button
                className="modal-v2-add-cover-button"
                onClick={() => setShowCoverManager(true)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Add cover image
              </button>
            )}

            {!showCoverManager && displayCard.coverImage && (
              <div className="modal-v2-cover-preview-wrapper">
                <img
                  src={displayCard.coverImage}
                  alt={`Cover for ${displayCard.title}`}
                  className="modal-v2-cover-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="modal-v2-cover-actions">
                  <button
                    className="modal-v2-cover-action-button"
                    onClick={() => setShowCoverManager(true)}
                  >
                    Change
                  </button>
                  <button
                    className="modal-v2-cover-action-button danger"
                    onClick={handleCoverImageRemove}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {showCoverManager && (
              <div className="modal-v2-cover-manager-wrapper">
                <div className="modal-v2-cover-manager-header">
                  <h3>Cover Image</h3>
                  <button
                    className="modal-v2-cover-manager-close"
                    onClick={() => setShowCoverManager(false)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <CoverImageManager
                  coverImage={displayCard.coverImage}
                  onUpload={onUploadCoverImage}
                  onChange={handleCoverImageChange}
                  onRemove={handleCoverImageRemove}
                  unsplashAccessKey={unsplashAccessKey}
                  showRecentUploads={true}
                />
              </div>
            )}
          </section>

          {/* METADATA GRID */}
          <section className="modal-v2-metadata">
            {/* STATUS FIELD */}
            <div className="modal-v2-field-wrapper" ref={statusMenuRef}>
              <button
                className="modal-v2-field"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
              >
                <div className="modal-v2-field-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>Status</span>
                  <kbd className="modal-v2-shortcut">S</kbd>
                </div>
                <div className="modal-v2-field-value">{displayCard.columnId || 'No status'}</div>
              </button>
              {showStatusMenu && (
                <div className="modal-v2-popover">
                  {(availableColumns.length > 0 ? availableColumns : STATUS_OPTIONS.map(s => ({ id: s, title: s }))).map((col) => (
                    <button
                      key={col.id}
                      className={`modal-v2-popover-item ${
                        displayCard.columnId === col.id ? 'active' : ''
                      }`}
                      onClick={() => handleStatusChange(col.id)}
                    >
                      {col.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ASSIGNEES FIELD */}
            <div className="modal-v2-field-wrapper" ref={assigneeMenuRef}>
              <button
                className="modal-v2-field"
                onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
              >
                <div className="modal-v2-field-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Assignees</span>
                  <kbd className="modal-v2-shortcut">A</kbd>
                </div>
                <div className="modal-v2-field-value">
                  {assignedUsers.length > 0 ? (
                    <div className="modal-v2-avatars">
                      {assignedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="modal-v2-avatar"
                          style={{ background: user.color }}
                          title={user.name}
                        >
                          {user.initials}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="modal-v2-empty">Empty</span>
                  )}
                </div>
              </button>
              {showAssigneeMenu && (
                <div className="modal-v2-popover">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      className={`modal-v2-popover-item ${
                        displayCard.assignedUserIds?.includes(user.id) ? 'active' : ''
                      }`}
                      onClick={() => handleToggleAssignee(user.id)}
                    >
                      <div
                        className="modal-v2-avatar-small"
                        style={{ background: user.color }}
                      >
                        {user.initials}
                      </div>
                      {user.name}
                      {displayCard.assignedUserIds?.includes(user.id) && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginLeft: 'auto' }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRIORITY FIELD */}
            <div className="modal-v2-field-wrapper" ref={priorityMenuRef}>
              <button
                className="modal-v2-field"
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              >
                <div className="modal-v2-field-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Priority</span>
                  <kbd className="modal-v2-shortcut">P</kbd>
                </div>
                <div className="modal-v2-field-value">
                  {displayCard.priority || 'None'}
                </div>
              </button>
              {showPriorityMenu && (
                <div className="modal-v2-popover">
                  {PRIORITY_OPTIONS.map((priority) => (
                    <button
                      key={priority}
                      className={`modal-v2-popover-item priority-${priority.toLowerCase()} ${
                        displayCard.priority === priority ? 'active' : ''
                      }`}
                      onClick={() => handlePriorityChange(priority)}
                    >
                      {priority}
                    </button>
                  ))}
                  <button
                    className="modal-v2-popover-item"
                    onClick={() => handlePriorityChange('')}
                  >
                    None
                  </button>
                </div>
              )}
            </div>

            {/* LABELS FIELD */}
            <div className="modal-v2-field-wrapper" ref={labelMenuRef}>
              <button
                className="modal-v2-field"
                onClick={() => setShowLabelMenu(!showLabelMenu)}
              >
                <div className="modal-v2-field-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  <span>Labels</span>
                  <kbd className="modal-v2-shortcut">L</kbd>
                </div>
                <div className="modal-v2-field-value">
                  {displayCard.labels && displayCard.labels.length > 0 ? (
                    <span>{displayCard.labels.join(', ')}</span>
                  ) : (
                    <span className="modal-v2-empty">Empty</span>
                  )}
                </div>
              </button>
              {showLabelMenu && (
                <div className="modal-v2-popover">
                  {(availableLabels.length > 0 ? availableLabels : ['Bug', 'Feature', 'Enhancement', 'Documentation']).map((label) => (
                    <button
                      key={label}
                      className={`modal-v2-popover-item ${
                        displayCard.labels?.includes(label) ? 'active' : ''
                      }`}
                      onClick={() => handleToggleLabel(label)}
                    >
                      {label}
                      {displayCard.labels?.includes(label) && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ marginLeft: 'auto' }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DUE DATE FIELD */}
            <button
              className="modal-v2-field"
              onClick={() => {
                setShowDatePicker(!showDatePicker)
                setTimeout(() => datePickerRef.current?.showPicker?.(), 0)
              }}
            >
              <div className="modal-v2-field-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Due Date</span>
                <kbd className="modal-v2-shortcut">D</kbd>
              </div>
              <div className="modal-v2-field-value">
                {displayCard.endDate
                  ? new Date(displayCard.endDate).toLocaleDateString()
                  : 'Not set'}
              </div>
              <input
                ref={datePickerRef}
                type="date"
                value={
                  typeof displayCard.endDate === 'string'
                    ? displayCard.endDate.split('T')[0]
                    : displayCard.endDate
                    ? (() => {
                        // Convert Date to YYYY-MM-DD using UTC to avoid timezone shifts
                        const d = new Date(displayCard.endDate)
                        const year = d.getUTCFullYear()
                        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
                        const day = String(d.getUTCDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()
                    : ''
                }
                onChange={handleDateChange}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
            </button>

            {/* ESTIMATED TIME FIELD */}
            <div className="modal-v2-field-wrapper">
              <button
                className="modal-v2-field"
                onClick={() => setShowTimePicker(!showTimePicker)}
              >
                <div className="modal-v2-field-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Estimated Time</span>
                  <kbd className="modal-v2-shortcut">E</kbd>
                </div>
                <div className="modal-v2-field-value">
                  {displayCard.estimatedTime ? `${displayCard.estimatedTime}h` : 'Not set'}
                </div>
              </button>
              {showTimePicker && (
                <div className="modal-v2-popover">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Hours"
                    value={displayCard.estimatedTime || ''}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="modal-v2-time-input"
                    autoFocus
                    onBlur={() => setShowTimePicker(false)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* DESCRIPTION */}
          <section className="modal-v2-section">
            <div className="modal-v2-section-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <h2>Description</h2>
              <button className="modal-v2-ai-button">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
                AI Assist
              </button>
            </div>

            {isEditingDescription ? (
              <textarea
                className="modal-v2-textarea"
                value={displayCard.description || ''}
                onChange={(e) => {
                  if (localCard) {
                    const updated: Card = { ...localCard, description: e.target.value }
                    setLocalCard(updated)
                  }
                }}
                onBlur={handleDescriptionBlur}
                placeholder="Add a detailed description..."
                autoFocus
              />
            ) : (
              <div className="modal-v2-content" onClick={() => setIsEditingDescription(true)}>
                {displayCard.description ? (
                  <div className="modal-v2-markdown">{renderMarkdown(displayCard.description)}</div>
                ) : (
                  <p className="modal-v2-placeholder">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Add description...
                  </p>
                )}
              </div>
            )}
          </section>

          {/* SUBTASKS */}
          <section className="modal-v2-section">
            <div className="modal-v2-section-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <h2>Subtasks</h2>
              {subtasks.length > 0 && (
                <span className="modal-v2-count">
                  {completedSubtasksCount}/{subtasks.length}
                </span>
              )}
              <button className="modal-v2-add-button" onClick={() => setIsAddingSubtask(true)}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add
              </button>
            </div>

            <div className="modal-v2-subtasks">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`modal-v2-subtask ${subtask.completed ? 'completed' : ''}`}
                >
                  <button
                    className="modal-v2-subtask-checkbox"
                    onClick={() => handleToggleSubtask(subtask.id)}
                  >
                    {subtask.completed ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                        <path
                          d="M9 12l2 2 4-4"
                          stroke="white"
                          strokeWidth="2"
                          fill="none"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </button>
                  <span className="modal-v2-subtask-title">{subtask.title}</span>
                  <button
                    className="modal-v2-subtask-delete"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}

              {isAddingSubtask && (
                <div className="modal-v2-subtask-input-row">
                  <input
                    type="text"
                    placeholder="Subtask title..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask()
                      if (e.key === 'Escape') {
                        setIsAddingSubtask(false)
                        setNewSubtaskTitle('')
                      }
                    }}
                    onBlur={handleAddSubtask}
                    autoFocus
                    className="modal-v2-subtask-input"
                  />
                </div>
              )}
            </div>
          </section>

          {/* ACTIVITY & COMMENTS */}
          <section className="modal-v2-section">
            <div className="modal-v2-section-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <h2>Activity</h2>
              <div className="modal-v2-filters">
                <button
                  className={`modal-v2-filter ${activityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActivityFilter('all')}
                >
                  All
                </button>
                <button
                  className={`modal-v2-filter ${activityFilter === 'comments' ? 'active' : ''}`}
                  onClick={() => setActivityFilter('comments')}
                >
                  Comments
                </button>
                <button
                  className={`modal-v2-filter ${activityFilter === 'history' ? 'active' : ''}`}
                  onClick={() => setActivityFilter('history')}
                >
                  History
                </button>
              </div>
            </div>

            {/* Comment Input */}
            <div className="modal-v2-comment-input">
              {currentUser && (
                <div className="modal-v2-avatar" style={{ background: currentUser.color }}>
                  {currentUser.initials}
                </div>
              )}
              <div className="modal-v2-comment-wrapper">
                <textarea
                  ref={commentRef}
                  className="modal-v2-comment-textarea"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  rows={1}
                />
                <div className="modal-v2-comment-toolbar">
                  <div className="modal-v2-toolbar-left">
                    <button className="modal-v2-toolbar-button" title="Attach file">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <button className="modal-v2-toolbar-button" title="Mention user">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
                      </svg>
                    </button>
                    <button className="modal-v2-toolbar-button" title="Add emoji">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className="modal-v2-send-button"
                    onClick={handleSendComment}
                    disabled={!commentText.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="modal-v2-timeline">
              {filteredActivity.map((activity) => {
                const user = availableUsers.find((u) => u.id === activity.userId)
                const isComment = activity.type.includes('COMMENT')

                if (isComment) {
                  const comment = comments.find((c) => c.id === activity.metadata?.commentId)
                  if (!comment) return null

                  return (
                    <div key={activity.id} className="modal-v2-activity-item comment-item">
                      {user && (
                        <div className="modal-v2-avatar" style={{ background: user.color }}>
                          {user.initials}
                        </div>
                      )}
                      <div className="modal-v2-activity-content">
                        <div className="modal-v2-activity-header">
                          <span className="modal-v2-activity-user">
                            {user?.name || 'Unknown'}
                          </span>
                          <span className="modal-v2-activity-time">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="modal-v2-comment-body">{comment.content}</div>
                      </div>
                    </div>
                  )
                }

                // History item
                return (
                  <div key={activity.id} className="modal-v2-activity-item history-item">
                    <div className="modal-v2-history-icon">
                      {activity.type.includes('CREATED') && '➕'}
                      {activity.type.includes('UPDATED') && '✏️'}
                      {activity.type.includes('MOVED') && '➡️'}
                      {activity.type.includes('DELETED') && '🗑️'}
                      {activity.type.includes('ASSIGNED') && '👤'}
                      {activity.type.includes('PRIORITY') && '🎯'}
                      {activity.type.includes('LABEL') && '🏷️'}
                    </div>
                    <div className="modal-v2-activity-content">
                      <div className="modal-v2-history-text">
                        <span className="modal-v2-activity-user">
                          {user?.name || 'Unknown'}
                        </span>{' '}
                        {activity.type.replace(/_/g, ' ').toLowerCase()}
                        {activity.newValue && (
                          <>
                            {' to '}
                            <strong>{activity.newValue}</strong>
                          </>
                        )}
                      </div>
                      <span className="modal-v2-activity-time">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}

              {filteredActivity.length === 0 && (
                <div className="modal-v2-empty">
                  <p>No activity yet</p>
                  <span>Activity will appear here</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Portal>
  )
}
