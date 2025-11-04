/**
 * CommandPalette - Premium command palette (Cmd+K / Ctrl+K)
 * Quick access to all board actions, search, navigation, and AI features
 */

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { Portal } from '../Portal'
import type { Board, Priority, User } from '../../types'
import './command-palette.css'

export interface CommandPaletteProps {
  /** Current board state */
  board: Board

  /** Available users for assignment */
  availableUsers?: User[]

  /** Callback to create a new card */
  onCreateCard?: (columnId: string, title: string) => void

  /** Callback to navigate to a card */
  onNavigateToCard?: (cardId: string) => void

  /** Callback to search and filter cards */
  onSearch?: (query: string) => void

  /** Callback to change card priority */
  onChangePriority?: (cardId: string, priority: Priority) => void

  /** Callback to assign user to card */
  onAssignUser?: (cardId: string, userId: string) => void

  /** AI Callbacks */
  onGeneratePlan?: () => void
  onPredictRisks?: () => void
  onOpenAIUsage?: () => void

  /** Custom keyboard shortcut (default: Cmd+K / Ctrl+K) */
  shortcut?: string

  /** Custom CSS class */
  className?: string
}

type CommandPage = 'home' | 'create-card' | 'navigate' | 'priority' | 'assign' | 'ai'

export function CommandPalette({
  board,
  onCreateCard,
  onNavigateToCard,
  onSearch,
  onChangePriority,
  onAssignUser,
  onGeneratePlan,
  onPredictRisks,
  onOpenAIUsage,
  shortcut = 'k',
  className = '',
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState<CommandPage>('home')
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [selectedCard, setSelectedCard] = useState<string>('')

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === shortcut) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false)
        setPage('home')
        setSearch('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setPage('home')
      setSearch('')
      setSelectedColumn('')
      setSelectedCard('')
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSelectCommand = useCallback(
    (value: string) => {
      // Parse command value
      const [action, param] = value.split(':')

      switch (action) {
        case 'create-card':
          setPage('create-card')
          break

        case 'create-card-in':
          setSelectedColumn(param || '')
          // Focus on input to type card title
          break

        case 'navigate':
          if (param) {
            onNavigateToCard?.(param)
            handleClose()
          } else {
            setPage('navigate')
          }
          break

        case 'search':
          onSearch?.(search)
          handleClose()
          break

        case 'priority':
          setPage('priority')
          break

        case 'set-priority':
          if (selectedCard && param) {
            onChangePriority?.(selectedCard, param as Priority)
            handleClose()
          }
          break

        case 'assign':
          setPage('assign')
          break

        case 'assign-user':
          if (selectedCard && param) {
            onAssignUser?.(selectedCard, param)
            handleClose()
          }
          break

        case 'ai':
          setPage('ai')
          break

        case 'ai-generate-plan':
          onGeneratePlan?.()
          handleClose()
          break

        case 'ai-predict-risks':
          onPredictRisks?.()
          handleClose()
          break

        case 'ai-usage':
          onOpenAIUsage?.()
          handleClose()
          break

        case 'back':
          setPage('home')
          break

        default:
          break
      }
    },
    [
      search,
      selectedCard,
      onCreateCard,
      onNavigateToCard,
      onSearch,
      onChangePriority,
      onAssignUser,
      onGeneratePlan,
      onPredictRisks,
      onOpenAIUsage,
      handleClose,
    ]
  )

  const handleCreateCard = useCallback(() => {
    if (selectedColumn && search.trim()) {
      onCreateCard?.(selectedColumn, search.trim())
      handleClose()
    }
  }, [selectedColumn, search, onCreateCard, handleClose])

  if (!isOpen) return null

  return (
    <Portal>
      <div className="command-palette-overlay" onClick={handleClose}>
        <div
          className={`command-palette ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Command value={search} onValueChange={setSearch} label="Command Menu">
            <div className="command-palette-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <Command.Input
                placeholder={
                  page === 'create-card' && selectedColumn
                    ? 'Type card title and press Enter...'
                    : page === 'create-card'
                    ? 'Select a column first...'
                    : 'Type a command or search...'
                }
                className="command-palette-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && page === 'create-card' && selectedColumn) {
                    handleCreateCard()
                  }
                }}
              />
              <div className="command-palette-shortcut">
                <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                <kbd>K</kbd>
              </div>
            </div>

            <Command.List className="command-palette-list">
              <Command.Empty className="command-palette-empty">
                No results found.
              </Command.Empty>

              {/* HOME PAGE */}
              {page === 'home' && (
                <>
                  <Command.Group heading="Actions" className="command-palette-group">
                    <Command.Item
                      value="create-card"
                      onSelect={handleSelectCommand}
                      className="command-palette-item"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M12 8v8m-4-4h8" />
                      </svg>
                      <span>Create Card</span>
                      <div className="command-palette-item-shortcut">C</div>
                    </Command.Item>

                    <Command.Item
                      value="navigate"
                      onSelect={handleSelectCommand}
                      className="command-palette-item"
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
                        <polyline points="12 16 16 12 12 8" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <span>Navigate to Card</span>
                      <div className="command-palette-item-shortcut">G</div>
                    </Command.Item>

                    <Command.Item
                      value="search"
                      onSelect={handleSelectCommand}
                      className="command-palette-item"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <span>Search Cards</span>
                      <div className="command-palette-item-shortcut">/</div>
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="AI Features" className="command-palette-group">
                    <Command.Item
                      value="ai"
                      onSelect={handleSelectCommand}
                      className="command-palette-item command-palette-item-ai"
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
                      <span>AI Commands</span>
                      <div className="command-palette-item-badge">AI</div>
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="Cards" className="command-palette-group">
                    {board.cards.slice(0, 5).map((card) => (
                      <Command.Item
                        key={card.id}
                        value={`navigate:${card.id}`}
                        onSelect={handleSelectCommand}
                        className="command-palette-item"
                      >
                        <div
                          className="command-palette-item-dot"
                          style={{
                            background:
                              card.priority === 'URGENT'
                                ? '#EF4444'
                                : card.priority === 'HIGH'
                                ? '#F59E0B'
                                : card.priority === 'MEDIUM'
                                ? '#3B82F6'
                                : '#6B7280',
                          }}
                        />
                        <span>{card.title}</span>
                        {card.labels && card.labels.length > 0 && (
                          <div className="command-palette-item-labels">
                            {card.labels.slice(0, 2).map((label) => (
                              <span key={label} className="command-palette-item-label">
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}

              {/* CREATE CARD PAGE */}
              {page === 'create-card' && (
                <>
                  <Command.Item
                    value="back"
                    onSelect={handleSelectCommand}
                    className="command-palette-item"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </Command.Item>

                  <Command.Group
                    heading="Select Column"
                    className="command-palette-group"
                  >
                    {board.columns.map((column) => (
                      <Command.Item
                        key={column.id}
                        value={`create-card-in:${column.id}`}
                        onSelect={handleSelectCommand}
                        className="command-palette-item"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="7" height="18" rx="1" />
                        </svg>
                        <span>{column.title}</span>
                        <div className="command-palette-item-count">
                          {column.cardIds.length} cards
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}

              {/* NAVIGATE PAGE */}
              {page === 'navigate' && (
                <>
                  <Command.Item
                    value="back"
                    onSelect={handleSelectCommand}
                    className="command-palette-item"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </Command.Item>

                  <Command.Group heading="All Cards" className="command-palette-group">
                    {board.cards.map((card) => {
                      const column = board.columns.find((c) => c.id === card.columnId)
                      return (
                        <Command.Item
                          key={card.id}
                          value={`navigate:${card.id}`}
                          onSelect={handleSelectCommand}
                          className="command-palette-item"
                          keywords={[card.title, card.description || '', ...(card.labels || [])]}
                        >
                          <div
                            className="command-palette-item-dot"
                            style={{
                              background:
                                card.priority === 'URGENT'
                                  ? '#EF4444'
                                  : card.priority === 'HIGH'
                                  ? '#F59E0B'
                                  : card.priority === 'MEDIUM'
                                  ? '#3B82F6'
                                  : '#6B7280',
                            }}
                          />
                          <div className="command-palette-item-content">
                            <div>{card.title}</div>
                            <div className="command-palette-item-meta">
                              {column?.title}
                            </div>
                          </div>
                          {card.labels && card.labels.length > 0 && (
                            <div className="command-palette-item-labels">
                              {card.labels.slice(0, 2).map((label) => (
                                <span key={label} className="command-palette-item-label">
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                </>
              )}

              {/* AI PAGE */}
              {page === 'ai' && (
                <>
                  <Command.Item
                    value="back"
                    onSelect={handleSelectCommand}
                    className="command-palette-item"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                  </Command.Item>

                  <Command.Group heading="AI Features" className="command-palette-group">
                    <Command.Item
                      value="ai-generate-plan"
                      onSelect={handleSelectCommand}
                      className="command-palette-item command-palette-item-ai"
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
                      <span>Generate Project Plan</span>
                      <div className="command-palette-item-badge">AI</div>
                    </Command.Item>

                    <Command.Item
                      value="ai-predict-risks"
                      onSelect={handleSelectCommand}
                      className="command-palette-item command-palette-item-ai"
                    >
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
                      <span>Predict Risks</span>
                      <div className="command-palette-item-badge">AI</div>
                    </Command.Item>

                    <Command.Item
                      value="ai-usage"
                      onSelect={handleSelectCommand}
                      className="command-palette-item command-palette-item-ai"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                      <span>AI Usage & Costs</span>
                      <div className="command-palette-item-badge">AI</div>
                    </Command.Item>
                  </Command.Group>
                </>
              )}
            </Command.List>

            <div className="command-palette-footer">
              <div className="command-palette-footer-hint">
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="command-palette-footer-hint">
                <kbd>Enter</kbd>
                <span>Select</span>
              </div>
              <div className="command-palette-footer-hint">
                <kbd>Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </Command>
        </div>
      </div>
    </Portal>
  )
}
