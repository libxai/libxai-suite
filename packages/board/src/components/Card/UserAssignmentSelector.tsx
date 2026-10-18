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
  /** Gantt v6 (Asakaa): un avatar de 22 px (o un círculo discontinuo con «+» sin nadie). */
  variante?: 'v6'
  /** Gantt v6: el nombre de la tarea, para el nombre accesible del botón. */
  nombreDeLaTarea?: string
  /** Gantt v6: español para los textos del botón. */
  es?: boolean
}

export function UserAssignmentSelector({
  assignedUsers = [],
  availableUsers,
  onChange,
  className,
  maxVisibleAvatars = 3,
  variante,
  nombreDeLaTarea,
  es = true,
}: UserAssignmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // v0.17.63: Calculate position and open menu in ONE synchronous action
  const openMenu = () => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const menuWidth = 300
    const menuHeight = 380
    const GAP = 4

    // Horizontal positioning
    let leftPos = rect.right - menuWidth
    if (leftPos < 10) leftPos = rect.left
    if (leftPos + menuWidth > viewportWidth - 10) {
      leftPos = viewportWidth - menuWidth - 10
    }

    // Vertical positioning - open upward if no space below
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    let topPos: number

    if (spaceBelow >= menuHeight + GAP) {
      // Open downward
      topPos = rect.bottom + GAP
    } else if (spaceAbove >= menuHeight + GAP) {
      // Open upward - position so bottom of menu is at top of button
      topPos = rect.top - menuHeight - GAP
    } else {
      // Not enough space either way - use the one with more space
      topPos = spaceBelow >= spaceAbove
        ? rect.bottom + GAP
        : Math.max(10, rect.top - menuHeight - GAP)
    }

    // Set position FIRST, then open (synchronous batch)
    setMenuPosition({ top: topPos, left: leftPos })
    setIsOpen(true)
  }

  // v0.17.65: Scroll lock removed - position:fixed handles positioning correctly
  // The Portal renders outside the overflow container, so no lock needed

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
      {/* Gantt v6 · el botón de la maqueta. */}
      {variante === 'v6' ? (
        <button
          ref={buttonRef}
          type="button"
          data-resp-v6
          onClick={() => isOpen ? setIsOpen(false) : openMenu()}
          aria-label={assignedUsers.length > 0
            ? `${es ? 'Responsable' : 'Owner'}: ${assignedUsers.map((u) => u.name).join(', ')}`
            : `${es ? 'Sin responsable. Asignar' : 'No owner. Assign'} ${nombreDeLaTarea ?? ''}`.trim()}
          title={assignedUsers.map((u) => u.name).join(', ') || undefined}
          style={{ width: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer', position: 'relative',
            border: assignedUsers.length > 0 ? 0 : '1px dashed var(--v6-tenue-borde, #7A848E)',
            background: assignedUsers.length > 0 ? 'var(--v6-neutro-fondo, #E1E4E8)' : 'transparent',
            color: assignedUsers.length > 0 ? 'var(--v6-texto, #0E1114)' : 'var(--v6-tenue, #5F6972)',
            fontSize: 11, fontWeight: 600, letterSpacing: '-0.03em', overflow: 'hidden' }}
        >
          {assignedUsers.length === 0 ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          ) : assignedUsers[0]?.avatar ? (
            <img src={assignedUsers[0].avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            assignedUsers[0]?.initials
          )}
          {assignedUsers.length > 1 && (
            <span aria-hidden style={{ position: 'absolute', right: -4, bottom: -3, minWidth: 12, height: 12, padding: '0 2px', borderRadius: 6, fontSize: 8, lineHeight: '12px', background: 'var(--v6-tarjeta, #fff)', color: 'var(--v6-texto-2, #4D5761)', boxShadow: '0 0 0 1px var(--v6-borde, #E2E5E9)' }}>+{assignedUsers.length - 1}</span>
          )}
        </button>
      ) : (
      <button
        ref={buttonRef}
        onClick={() => isOpen ? setIsOpen(false) : openMenu()}
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
      )}

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
                    <span className="font-semibold flex-1 text-left truncate" style={{ color: 'var(--modal-v2-text-primary, rgba(255, 255, 255, 0.95))' }}>
                      {user.name}
                    </span>

                    {/* Checkmark - fixed width for consistent alignment */}
                    <span className="w-5 text-lg flex-shrink-0 text-right" style={{ color: isAssigned ? '#00E5CC' : 'transparent' }}>
                      {isAssigned ? '✓' : ''}
                    </span>
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
