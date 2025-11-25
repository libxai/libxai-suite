/**
 * User Assignment Selector V2
 * Multi-select user assignment with avatar display
 * Uses world-class Dropdown system for perfect positioning
 */

import { useState } from 'react'
import { Dropdown } from '../Dropdown'

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
  const [searchQuery, setSearchQuery] = useState('')

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
    <Dropdown
      trigger={({ isOpen }) => (
        <button
          className={`dropdown-avatar-trigger ${className || ''}`}
          style={{
            transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          }}
          title={assignedUsers.length > 0 ? `${assignedUsers.length} assigned` : 'Assign users'}
          aria-label="Assign users"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {assignedUsers.length > 0 ? (
            <div className="asakaa-avatar-group">
              {visibleUsers.map((user) => (
                <div
                  key={user.id}
                  className="asakaa-avatar"
                  title={user.name}
                  style={{
                    backgroundColor: user.color,
                    color: '#fff',
                  }}
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
                <div className="asakaa-avatar dropdown-avatar-overflow">
                  +{overflowCount}
                </div>
              )}
            </div>
          ) : (
            <div className="dropdown-avatar-empty-trigger">
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
      placement="bottom-start"
      minWidth={300}
      maxHeight={350}
      itemCount={filteredUsers.length}
      onSelectItem={(index) => {
        const user = filteredUsers[index]
        if (user) {
          handleToggleUser(user)
        }
      }}
      onClose={() => setSearchQuery('')}
    >
      {({ activeIndex, close }) => (
        <div>
          {/* Header */}
          <div className="dropdown-section-header">Assign Users</div>

          {/* Search input */}
          <div className="dropdown-search-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="dropdown-search-input"
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="dropdown-list">
            {filteredUsers.length === 0 ? (
              <div className="dropdown-empty">
                No users found
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const isAssigned = assignedUsers.some((u) => u.id === user.id)

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      handleToggleUser(user)
                    }}
                    className="dropdown-item"
                    data-active={activeIndex === index}
                    data-index={index}
                    role="option"
                    aria-selected={isAssigned}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                        backgroundColor: user.color,
                        color: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        user.initials
                      )}
                    </div>

                    {/* Name */}
                    <span style={{ flex: 1, fontWeight: 600 }}>
                      {user.name}
                    </span>

                    {/* Checkmark */}
                    {isAssigned && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 9L7.5 12.5L14 6"
                          stroke="var(--asakaa-color-interactive-primary)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Clear button */}
          {assignedUsers.length > 0 && (
            <div className="dropdown-button-wrapper">
              <button
                onClick={() => {
                  onChange([])
                  close()
                }}
                className="dropdown-danger-button"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}
