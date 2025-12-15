/**
 * User Assignment Selector Component
 * Multi-select user assignment with avatar display
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'

export interface User {
  id: string
  name: string
  avatar?: string
  initials: string
  color: string
}

export interface UserAssignmentSelectorProps {
  assignedUsers?: User[]
  availableUsers: User[]
  onChange: (users: User[]) => void
  className?: string
  maxVisibleAvatars?: number
}

export function UserAssignmentSelector({
  assignedUsers = [],
  availableUsers,
  onChange,
  className,
  maxVisibleAvatars = 3,
}: UserAssignmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpward: false })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // v0.17.61: Smart positioning - menu appears DIRECTLY adjacent to button
  useEffect(() => {
    if (isOpen && buttonRef.current && menuRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const menuWidth = 300
      const GAP = 4

      // Measure actual menu height after render
      const actualMenuHeight = menuRef.current.offsetHeight || 350

      // Horizontal: Right-align menu with button's right edge
      let leftPos = rect.right - menuWidth
      if (leftPos < 10) {
        leftPos = rect.left
      }
      if (leftPos + menuWidth > viewportWidth - 10) {
        leftPos = viewportWidth - menuWidth - 10
      }

      // Vertical: Position directly adjacent to button
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      let topPos: number
      let openUpward = false

      if (spaceBelow >= actualMenuHeight + GAP) {
        // Enough space below - open downward
        topPos = rect.bottom + GAP
        openUpward = false
      } else if (spaceAbove >= actualMenuHeight + GAP) {
        // Open upward - bottom of menu touches top of button
        topPos = rect.top - actualMenuHeight - GAP
        openUpward = true
      } else {
        // Constrained - use direction with more space
        if (spaceBelow >= spaceAbove) {
          topPos = rect.bottom + GAP
          openUpward = false
        } else {
          // Position so menu bottom aligns near button top
          topPos = Math.max(10, rect.top - actualMenuHeight - GAP)
          openUpward = true
        }
      }

      setMenuPosition({ top: topPos, left: leftPos, openUpward })
    }
  }, [isOpen])

  // v0.17.61: Lock scroll on ALL scrollable ancestors (column, modal, body)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const scrollLockTargets: { element: HTMLElement; original: string }[] = []

      // Find all scrollable ancestors - check multiple selectors
      const scrollableSelectors = [
        '.asakaa-column-cards',    // Kanban column
        '.modal-v2-container',     // Card detail modal
        '.modal-content',          // Generic modal content
        '[data-scroll-container]', // Custom scroll containers
      ]

      for (const selector of scrollableSelectors) {
        const container = buttonRef.current.closest(selector) as HTMLElement
        if (container) {
          scrollLockTargets.push({
            element: container,
            original: container.style.overflow
          })
          container.style.overflow = 'hidden'
        }
      }

      // Always lock body as final safety net
      scrollLockTargets.push({
        element: document.body,
        original: document.body.style.overflow
      })
      document.body.style.overflow = 'hidden'

      return () => {
        scrollLockTargets.forEach(({ element, original }) => {
          element.style.overflow = original
        })
      }
    }
    return undefined
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen])

  const handleToggleUser = (user: User) => {
    const isAssigned = assignedUsers.some((u) => u.id === user.id)

    if (isAssigned) {
      onChange(assignedUsers.filter((u) => u.id !== user.id))
    } else {
      onChange([...assignedUsers, user])
    }
  }

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const visibleUsers = assignedUsers.slice(0, maxVisibleAvatars)
  const overflowCount = assignedUsers.length - maxVisibleAvatars

  return (
    <div className={`relative ${className || ''}`}>
      {/* Avatar display or add button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-0.5 rounded transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
        title={assignedUsers.length > 0 ? `${assignedUsers.length} assigned` : 'Assign users'}
      >
        {assignedUsers.length > 0 ? (
          <div className="asakaa-avatar-group">
            {visibleUsers.map((user) => (
              <div
                key={user.id}
                className="asakaa-avatar"
                title={user.name}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="asakaa-avatar-img"
                  />
                ) : (
                  user.initials
                )}
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="asakaa-avatar">
                +{overflowCount}
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'rgba(96, 165, 250, 0.15)',
              border: '1.5px solid rgba(96, 165, 250, 0.4)',
              color: '#60a5fa',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 8a3 3 0 100-6 3 3 0 000 6zM4 14c0-2.21 1.79-4 4-4s4 1.79 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="13"
                y1="5"
                x2="13"
                y2="9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="11"
                y1="7"
                x2="15"
                y2="7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </button>

      {/* User selection menu - Using Portal to escape stacking context */}
      {/* v0.17.57: Fixed positioning + smart upward/downward + maxHeight for viewport safety */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="user-selector-menu rounded-xl shadow-2xl border min-w-[300px]"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--modal-v2-bg, #1f1f1f)',
              border: '1px solid var(--modal-v2-border, rgba(255, 255, 255, 0.15))',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              zIndex: 99999,
            }}
          >
          {/* Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.1))' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--modal-v2-text-secondary, rgba(255, 255, 255, 0.8))' }}>
              Assign Users
            </span>
          </div>

          {/* Search input */}
          <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.1))' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-all"
              style={{
                background: 'var(--modal-v2-bg-secondary, rgba(255, 255, 255, 0.05))',
                borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.2))',
                color: 'var(--modal-v2-text-primary, #ffffff)',
              }}
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="py-2 max-h-[300px] overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--modal-v2-text-tertiary, rgba(255, 255, 255, 0.6))' }}>
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isAssigned = assignedUsers.some((u) => u.id === user.id)

                return (
                  <button
                    key={user.id}
                    onClick={() => handleToggleUser(user)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-all active:scale-98"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--modal-v2-bg-tertiary, rgba(255, 255, 255, 0.1))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm"
                      style={{
                        backgroundColor: user.color,
                        color: '#fff',
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.initials
                      )}
                    </div>

                    {/* Name */}
                    <span className="font-semibold flex-1 text-left" style={{ color: 'var(--modal-v2-text-primary, rgba(255, 255, 255, 0.95))' }}>
                      {user.name}
                    </span>

                    {/* Checkmark */}
                    {isAssigned && (
                      <span className="text-lg" style={{ color: '#3b82f6' }}>✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Clear button */}
          {assignedUsers.length > 0 && (
            <div className="px-3 py-3 border-t border-white/10">
              <button
                onClick={() => {
                  onChange([])
                  setIsOpen(false)
                }}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-red-600/30 active:scale-95 border"
                style={{
                  color: '#f87171',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                  background: 'rgba(248, 113, 113, 0.08)',
                }}
              >
                Clear All
              </button>
            </div>
          )}
          </div>
        </Portal>
      )}
    </div>
  )
}
