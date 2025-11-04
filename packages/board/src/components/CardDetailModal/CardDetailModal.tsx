/**
 * CardDetailModal - Premium full-featured card detail modal
 * Features: Details tab, Comments, Activity log, AI suggestions
 */

import { useState, useCallback } from 'react'
import { Portal } from '../Portal'
import { AttachmentUploader } from '../Attachments'
import type { Card, User, Comment, Activity, Insight, AssigneeSuggestion, Attachment } from '../../types'
import './card-detail-modal.css'

export interface CardDetailModalProps {
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

  /** AI insights for this card */
  aiInsights?: Insight[]

  /** Attachments for this card */
  attachments?: Attachment[]

  /** Add comment callback */
  onAddComment?: (cardId: string, content: string) => void

  /** Delete comment callback */
  onDeleteComment?: (commentId: string) => void

  /** Upload attachments callback */
  onUploadAttachments?: (cardId: string, files: File[]) => Promise<void> | void

  /** Delete attachment callback */
  onDeleteAttachment?: (attachmentId: string) => void

  /** Current user ID */
  currentUserId?: string

  /** AI: Suggest assignee */
  onSuggestAssignee?: (card: Card) => Promise<AssigneeSuggestion[]>

  /** AI: Generate subtasks */
  onGenerateSubtasks?: (card: Card) => Promise<Omit<Card, 'id'>[]>

  /** AI: Estimate effort */
  onEstimateEffort?: (card: Card) => Promise<{ hours: number; confidence: number }>
}

type TabType = 'details' | 'comments' | 'activity' | 'attachments' | 'ai'

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  availableUsers = [],
  comments = [],
  activities = [],
  aiInsights = [],
  attachments = [],
  onAddComment,
  onDeleteComment,
  onUploadAttachments,
  onDeleteAttachment,
  onSuggestAssignee,
  onGenerateSubtasks,
  onEstimateEffort,
  currentUserId = 'user-1',
}: CardDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [isEditing, setIsEditing] = useState(false)
  const [editedCard, setEditedCard] = useState<Partial<Card>>({})
  const [newComment, setNewComment] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    assignees?: AssigneeSuggestion[]
    subtasks?: Omit<Card, 'id'>[]
    effort?: { hours: number; confidence: number }
  }>({})

  if (!isOpen || !card) return null

  const handleClose = useCallback(() => {
    setIsEditing(false)
    setEditedCard({})
    setActiveTab('details')
    setNewComment('')
    setAiSuggestions({})
    onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    if (onUpdate && Object.keys(editedCard).length > 0) {
      onUpdate(card.id, editedCard)
      setEditedCard({})
      setIsEditing(false)
    }
  }, [card.id, editedCard, onUpdate])

  const handleDelete = useCallback(() => {
    if (
      onDelete &&
      window.confirm('Are you sure you want to delete this card?')
    ) {
      onDelete(card.id)
      handleClose()
    }
  }, [card.id, onDelete, handleClose])

  const handleAddComment = useCallback(() => {
    if (onAddComment && newComment.trim()) {
      onAddComment(card.id, newComment.trim())
      setNewComment('')
    }
  }, [card.id, newComment, onAddComment])

  const handleSuggestAssignee = useCallback(async () => {
    if (!onSuggestAssignee) return
    setAiLoading(true)
    try {
      const suggestions = await onSuggestAssignee(card)
      setAiSuggestions((prev) => ({ ...prev, assignees: suggestions }))
    } catch (error) {
      console.error('Failed to suggest assignee:', error)
    } finally {
      setAiLoading(false)
    }
  }, [card, onSuggestAssignee])

  const handleGenerateSubtasks = useCallback(async () => {
    if (!onGenerateSubtasks) return
    setAiLoading(true)
    try {
      const subtasks = await onGenerateSubtasks(card)
      setAiSuggestions((prev) => ({ ...prev, subtasks }))
    } catch (error) {
      console.error('Failed to generate subtasks:', error)
    } finally {
      setAiLoading(false)
    }
  }, [card, onGenerateSubtasks])

  const handleEstimateEffort = useCallback(async () => {
    if (!onEstimateEffort) return
    setAiLoading(true)
    try {
      const effort = await onEstimateEffort(card)
      setAiSuggestions((prev) => ({ ...prev, effort }))
    } catch (error) {
      console.error('Failed to estimate effort:', error)
    } finally {
      setAiLoading(false)
    }
  }, [card, onEstimateEffort])

  const currentCard = { ...card, ...editedCard }

  const assignedUsers = availableUsers.filter((user) =>
    currentCard.assignedUserIds?.includes(user.id)
  )

  return (
    <Portal>
      <div className="card-detail-overlay" onClick={handleClose}>
        <div
          className="card-detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="card-detail-header">
            <div className="card-detail-header-left">
              <div
                className="card-detail-priority-dot"
                style={{
                  background:
                    currentCard.priority === 'URGENT'
                      ? '#EF4444'
                      : currentCard.priority === 'HIGH'
                      ? '#F59E0B'
                      : currentCard.priority === 'MEDIUM'
                      ? '#3B82F6'
                      : '#6B7280',
                }}
              />
              {isEditing ? (
                <input
                  type="text"
                  value={editedCard.title ?? currentCard.title}
                  onChange={(e) =>
                    setEditedCard({ ...editedCard, title: e.target.value })
                  }
                  className="card-detail-title-input"
                  placeholder="Card title"
                />
              ) : (
                <h2 className="card-detail-title">{currentCard.title}</h2>
              )}
            </div>

            <div className="card-detail-header-actions">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="card-detail-btn card-detail-btn-primary"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedCard({})
                    }}
                    className="card-detail-btn"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="card-detail-btn"
                >
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
                  Edit
                </button>
              )}

              <button onClick={handleDelete} className="card-detail-btn card-detail-btn-danger">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>

              <button onClick={handleClose} className="card-detail-btn-close">
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
            </div>
          </div>

          {/* Tabs */}
          <div className="card-detail-tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`card-detail-tab ${activeTab === 'details' ? 'active' : ''}`}
            >
              <svg
                width="16"
                height="16"
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
              Details
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`card-detail-tab ${activeTab === 'comments' ? 'active' : ''}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Comments
              {comments.length > 0 && (
                <span className="card-detail-tab-badge">{comments.length}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`card-detail-tab ${activeTab === 'activity' ? 'active' : ''}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Activity
              {activities.length > 0 && (
                <span className="card-detail-tab-badge">{activities.length}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`card-detail-tab ${activeTab === 'attachments' ? 'active' : ''}`}
            >
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
              Attachments
              {attachments.length > 0 && (
                <span className="card-detail-tab-badge">{attachments.length}</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`card-detail-tab ${activeTab === 'ai' ? 'active' : ''}`}
            >
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
              AI Insights
              <span className="card-detail-tab-badge card-detail-tab-badge-ai">
                AI
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="card-detail-content">
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="card-detail-details">
                {/* Description */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Description</label>
                  {isEditing ? (
                    <textarea
                      value={editedCard.description ?? currentCard.description ?? ''}
                      onChange={(e) =>
                        setEditedCard({ ...editedCard, description: e.target.value })
                      }
                      className="card-detail-textarea"
                      placeholder="Add a description..."
                      rows={4}
                    />
                  ) : (
                    <p className="card-detail-text">
                      {currentCard.description || 'No description'}
                    </p>
                  )}
                </div>

                {/* Assignees */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Assigned To</label>
                  {isEditing ? (
                    <select
                      multiple
                      value={editedCard.assignedUserIds ?? currentCard.assignedUserIds ?? []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                        setEditedCard({
                          ...editedCard,
                          assignedUserIds: selected,
                        })
                      }}
                      className="card-detail-textarea"
                      style={{ height: '120px', padding: '8px 12px' }}
                    >
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="card-detail-users">
                      {assignedUsers.length > 0 ? (
                        assignedUsers.map((user) => (
                          <div key={user.id} className="card-detail-user">
                            <div
                              className="card-detail-user-avatar"
                              style={{ background: user.color }}
                            >
                              {user.initials}
                            </div>
                            <span>{user.name}</span>
                          </div>
                        ))
                      ) : (
                        <span className="card-detail-empty">Unassigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Priority</label>
                  {isEditing ? (
                    <select
                      value={editedCard.priority ?? currentCard.priority ?? ''}
                      onChange={(e) =>
                        setEditedCard({
                          ...editedCard,
                          priority: (e.target.value || undefined) as any,
                        })
                      }
                      className="card-detail-textarea"
                      style={{ height: 'auto', padding: '8px 12px' }}
                    >
                      <option value="">None</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  ) : (
                    <div className="card-detail-priority">
                      <div
                        className="card-detail-priority-dot"
                        style={{
                          background:
                            currentCard.priority === 'URGENT'
                              ? '#EF4444'
                              : currentCard.priority === 'HIGH'
                              ? '#F59E0B'
                              : currentCard.priority === 'MEDIUM'
                              ? '#3B82F6'
                              : '#6B7280',
                        }}
                      />
                      <span>{currentCard.priority || 'None'}</span>
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Labels</label>
                  <div className="card-detail-labels">
                    {currentCard.labels && currentCard.labels.length > 0 ? (
                      currentCard.labels.map((label) => (
                        <span key={label} className="card-detail-label-tag">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="card-detail-empty">No labels</span>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="card-detail-section-row">
                  <div className="card-detail-section">
                    <label className="card-detail-label">Start Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedCard.startDate
                            ? new Date(editedCard.startDate).toISOString().split('T')[0]
                            : currentCard.startDate
                            ? new Date(currentCard.startDate).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            startDate: e.target.value || undefined,
                          })
                        }
                        className="card-detail-textarea"
                        style={{ height: 'auto', padding: '8px 12px' }}
                      />
                    ) : (
                      <span className="card-detail-text">
                        {currentCard.startDate
                          ? new Date(currentCard.startDate).toLocaleDateString()
                          : 'Not set'}
                      </span>
                    )}
                  </div>

                  <div className="card-detail-section">
                    <label className="card-detail-label">End Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={
                          editedCard.endDate
                            ? new Date(editedCard.endDate).toISOString().split('T')[0]
                            : currentCard.endDate
                            ? new Date(currentCard.endDate).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditedCard({
                            ...editedCard,
                            endDate: e.target.value || undefined,
                          })
                        }
                        className="card-detail-textarea"
                        style={{ height: 'auto', padding: '8px 12px' }}
                      />
                    ) : (
                      <span className="card-detail-text">
                        {currentCard.endDate
                          ? new Date(currentCard.endDate).toLocaleDateString()
                          : 'Not set'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Estimated Hours</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedCard.estimatedTime ?? currentCard.estimatedTime ?? ''}
                      onChange={(e) =>
                        setEditedCard({
                          ...editedCard,
                          estimatedTime: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="card-detail-textarea"
                      style={{ height: 'auto', padding: '8px 12px' }}
                      placeholder="Enter hours"
                    />
                  ) : (
                    <span className="card-detail-text">
                      {currentCard.estimatedTime || 'Not estimated'}
                    </span>
                  )}
                </div>

                {/* Dependencies */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Dependencies</label>
                  <div className="card-detail-dependencies">
                    {currentCard.dependencies && currentCard.dependencies.length > 0 ? (
                      currentCard.dependencies.map((dep) => {
                        const depId = typeof dep === 'string' ? dep : dep.taskId
                        return (
                          <span key={depId} className="card-detail-dependency">
                            Card #{depId.slice(-4)}
                          </span>
                        )
                      })
                    ) : (
                      <span className="card-detail-empty">No dependencies</span>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="card-detail-section">
                  <label className="card-detail-label">Created</label>
                  <span className="card-detail-text">
                    {currentCard.createdAt
                      ? new Date(currentCard.createdAt).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            )}

            {/* COMMENTS TAB */}
            {activeTab === 'comments' && (
              <div className="card-detail-comments">
                {/* New Comment */}
                <div className="card-detail-comment-form">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="card-detail-comment-textarea"
                    placeholder="Write a comment..."
                    rows={3}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="card-detail-btn card-detail-btn-primary"
                  >
                    Add Comment
                  </button>
                </div>

                {/* Comments List */}
                <div className="card-detail-comments-list">
                  {comments.length > 0 ? (
                    comments.map((comment) => {
                      const author = availableUsers.find((u) => u.id === comment.authorId)
                      return (
                        <div key={comment.id} className="card-detail-comment">
                          <div className="card-detail-comment-header">
                            <div className="card-detail-comment-author">
                              {author && (
                                <div
                                  className="card-detail-user-avatar"
                                  style={{ background: author.color }}
                                >
                                  {author.initials}
                                </div>
                              )}
                              <div>
                                <div className="card-detail-comment-author-name">
                                  {author?.name || 'Unknown'}
                                </div>
                                <div className="card-detail-comment-time">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {onDeleteComment && (
                              <button
                                onClick={() => onDeleteComment(comment.id)}
                                className="card-detail-comment-delete"
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
                            )}
                          </div>
                          <p className="card-detail-comment-content">{comment.content}</p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="card-detail-empty-state">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      <p>No comments yet</p>
                      <span>Be the first to comment</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div className="card-detail-activity">
                {activities.length > 0 ? (
                  <div className="card-detail-activity-list">
                    {activities.map((activity) => {
                      const user = availableUsers.find((u) => u.id === activity.userId)
                      return (
                        <div key={activity.id} className="card-detail-activity-item">
                          <div className="card-detail-activity-icon">
                            {activity.type.includes('CREATED') && '➕'}
                            {activity.type.includes('UPDATED') && '✏️'}
                            {activity.type.includes('MOVED') && '➡️'}
                            {activity.type.includes('DELETED') && '🗑️'}
                            {activity.type.includes('COMMENT') && '💬'}
                            {activity.type.includes('ASSIGNED') && '👤'}
                            {activity.type.includes('PRIORITY') && '🎯'}
                            {activity.type.includes('LABEL') && '🏷️'}
                            {activity.type.includes('ATTACHMENT') && '📎'}
                          </div>
                          <div className="card-detail-activity-content">
                            <div className="card-detail-activity-text">
                              <strong>{user?.name || 'Unknown'}</strong>{' '}
                              {activity.type.replace(/_/g, ' ').toLowerCase()}
                              {activity.newValue && (
                                <span className="card-detail-activity-value">
                                  {' '}
                                  to <strong>{activity.newValue}</strong>
                                </span>
                              )}
                            </div>
                            <div className="card-detail-activity-time">
                              {new Date(activity.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="card-detail-empty-state">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <p>No activity yet</p>
                    <span>Activity will appear here</span>
                  </div>
                )}
              </div>
            )}

            {/* ATTACHMENTS TAB */}
            {activeTab === 'attachments' && (
              <div className="card-detail-attachments">
                <AttachmentUploader
                  cardId={card.id}
                  attachments={attachments}
                  onUpload={onUploadAttachments ? (files) => onUploadAttachments(card.id, files) : undefined}
                  onDelete={onDeleteAttachment}
                  currentUserId={currentUserId}
                  maxSizeMB={10}
                  maxFiles={20}
                />
              </div>
            )}

            {/* AI TAB */}
            {activeTab === 'ai' && (
              <div className="card-detail-ai">
                {/* AI Actions */}
                <div className="card-detail-ai-actions">
                  <h3 className="card-detail-ai-heading">AI-Powered Suggestions</h3>

                  <button
                    onClick={handleSuggestAssignee}
                    disabled={aiLoading || !onSuggestAssignee}
                    className="card-detail-ai-btn"
                  >
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
                    Suggest Best Assignee
                  </button>

                  <button
                    onClick={handleGenerateSubtasks}
                    disabled={aiLoading || !onGenerateSubtasks}
                    className="card-detail-ai-btn"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    Generate Subtasks
                  </button>

                  <button
                    onClick={handleEstimateEffort}
                    disabled={aiLoading || !onEstimateEffort}
                    className="card-detail-ai-btn"
                  >
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
                    Estimate Effort
                  </button>
                </div>

                {/* AI Suggestions Results */}
                {aiSuggestions.assignees && (
                  <div className="card-detail-ai-results">
                    <h4>Assignee Suggestions</h4>
                    {aiSuggestions.assignees.map((suggestion, index) => {
                      const user = availableUsers.find((u) => u.id === suggestion.userId)
                      return (
                        <div key={index} className="card-detail-ai-suggestion">
                          {user && (
                            <div
                              className="card-detail-user-avatar"
                              style={{ background: user.color }}
                            >
                              {user.initials}
                            </div>
                          )}
                          <div>
                            <div className="card-detail-ai-suggestion-name">
                              {user?.name}
                            </div>
                            <div className="card-detail-ai-suggestion-reason">
                              {suggestion.reasoning}
                            </div>
                            <div className="card-detail-ai-suggestion-confidence">
                              Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {aiSuggestions.subtasks && (
                  <div className="card-detail-ai-results">
                    <h4>Suggested Subtasks</h4>
                    {aiSuggestions.subtasks.map((subtask, index) => (
                      <div key={index} className="card-detail-ai-subtask">
                        <div className="card-detail-ai-subtask-title">
                          {subtask.title}
                        </div>
                        {subtask.description && (
                          <div className="card-detail-ai-subtask-desc">
                            {subtask.description}
                          </div>
                        )}
                        {subtask.estimatedTime && (
                          <div className="card-detail-ai-subtask-time">
                            Est: {subtask.estimatedTime}h
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {aiSuggestions.effort && (
                  <div className="card-detail-ai-results">
                    <h4>Effort Estimate</h4>
                    <div className="card-detail-ai-effort">
                      <div className="card-detail-ai-effort-hours">
                        {aiSuggestions.effort.hours} hours
                      </div>
                      <div className="card-detail-ai-effort-confidence">
                        Confidence: {(aiSuggestions.effort.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {aiInsights.length > 0 && (
                  <div className="card-detail-ai-insights">
                    <h4>AI Insights</h4>
                    {aiInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className={`card-detail-ai-insight card-detail-ai-insight-${insight.severity.toLowerCase()}`}
                      >
                        <div className="card-detail-ai-insight-header">
                          <span className="card-detail-ai-insight-title">
                            {insight.title}
                          </span>
                          <span className="card-detail-ai-insight-severity">
                            {insight.severity}
                          </span>
                        </div>
                        <p className="card-detail-ai-insight-desc">
                          {insight.description}
                        </p>
                        {insight.suggestedAction && (
                          <div className="card-detail-ai-insight-action">
                            💡 {insight.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!aiSuggestions.assignees &&
                  !aiSuggestions.subtasks &&
                  !aiSuggestions.effort &&
                  aiInsights.length === 0 && (
                    <div className="card-detail-empty-state">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M2 17L12 22L22 17" />
                        <path d="M2 12L12 17L22 12" />
                      </svg>
                      <p>AI Suggestions</p>
                      <span>Click a button above to get AI-powered insights</span>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
