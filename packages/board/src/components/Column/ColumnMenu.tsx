/**
 * Column Menu Component
 * Three-dot menu for column actions (rename, delete, etc.)
 * v0.17.55: Added delete functionality for custom columns
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'

export interface ColumnMenuProps {
  /** Current column title */
  columnTitle: string
  /** Rename handler */
  onRename: (newTitle: string) => void
  /** v0.17.55: Delete handler - if provided, shows delete option */
  onDelete?: () => void
  /** v0.17.55: Whether column can be deleted (default columns cannot) */
  isDeletable?: boolean
  /** Custom className */
  className?: string
}

export function ColumnMenu({
  columnTitle,
  onRename,
  onDelete,
  isDeletable = false,
  className,
}: ColumnMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(columnTitle)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update menu position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    }
  }, [isOpen])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setIsRenaming(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setIsRenaming(false)
        setNewTitle(columnTitle)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, columnTitle])

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleRenameClick = () => {
    setIsRenaming(true)
    setNewTitle(columnTitle)
  }

  const handleRenameSubmit = () => {
    const trimmedTitle = newTitle.trim()
    if (trimmedTitle && trimmedTitle !== columnTitle) {
      onRename(trimmedTitle)
    }
    setIsRenaming(false)
    setIsOpen(false)
    setNewTitle(columnTitle)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setNewTitle(columnTitle)
    }
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Three-dot menu button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
        title="Column options"
        aria-label="Column menu"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="fixed rounded-xl shadow-2xl border min-w-[200px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              background: 'linear-gradient(135deg, #1f1f1f 0%, #1a1a1a 100%)',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              zIndex: 99999,
            }}
          >
            {isRenaming ? (
              // Rename input
              <div className="p-3">
                <label className="text-xs font-bold text-white/80 uppercase tracking-wider block mb-2">
                  Rename Column
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameSubmit}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/20 text-white placeholder-white/50 outline-none focus:border-blue-500/50 transition-all"
                  placeholder="Column name"
                  maxLength={50}
                />
              </div>
            ) : (
              // Menu options
              <div className="py-1">
                <button
                  onClick={handleRenameClick}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-white/90 hover:bg-white/10 transition-all"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="font-medium">Rename</span>
                </button>

                {/* v0.17.55: Delete option - only for custom columns */}
                {isDeletable && onDelete && (
                  <>
                    <div className="h-px bg-white/10 mx-2 my-1" />
                    <button
                      onClick={() => {
                        onDelete()
                        setIsOpen(false)
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 4H14M5 4V2.5C5 2.22386 5.22386 2 5.5 2H10.5C10.7761 2 11 2.22386 11 2.5V4M12.5 4V13.5C12.5 13.7761 12.2761 14 12 14H4C3.72386 14 3.5 13.7761 3.5 13.5V4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.5 7V11M9.5 7V11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="font-medium">Delete</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </Portal>
      )}
    </div>
  )
}
