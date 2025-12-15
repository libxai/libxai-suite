/**
 * Status Selector Component
 * Reusable status selector for both Card and Gantt
 * Follows the same pattern as PrioritySelector
 * v0.17.54: Added support for custom statuses from Kanban columns
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'

// v0.17.54: Keep for backward compatibility, but allow string type for custom statuses
export type TaskStatus = 'todo' | 'in-progress' | 'completed'

// v0.17.54: Custom status interface for dynamic Kanban columns
export interface CustomStatusOption {
  id: string
  title: string
  color?: string
}

export interface StatusSelectorProps {
  status?: string // v0.17.54: Changed to string to support custom statuses
  onChange: (status: string) => void // v0.17.54: Changed to string
  className?: string
  customStatuses?: CustomStatusOption[] // v0.17.54: Custom statuses from Kanban columns
}

const STATUS_CONFIG = {
  'todo': {
    label: 'To Do',
    color: '#94a3b8',
    icon: 'circle'
  },
  'in-progress': {
    label: 'In Progress',
    color: '#60a5fa',
    icon: 'circle-dot'
  },
  'completed': {
    label: 'Completed',
    color: '#34d399',
    icon: 'check-circle'
  },
} as const

const StatusIcon = ({ icon, color }: { icon: string; color: string }) => {
  if (icon === 'circle') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    )
  }

  if (icon === 'circle-dot') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" fill="none" />
        <circle cx="8" cy="8" r="3" fill={color} />
      </svg>
    )
  }

  // check-circle
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.2" />
      <path d="M5 8L7 10L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function StatusSelector({
  status = 'todo',
  onChange,
  className,
  customStatuses = [],
}: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // v0.17.54: Build combined status list (default + custom)
  const allStatuses: Array<{ id: string; label: string; color: string; icon: string }> = [
    ...Object.entries(STATUS_CONFIG).map(([id, config]) => ({
      id,
      label: config.label,
      color: config.color,
      icon: config.icon,
    })),
    ...customStatuses
      .filter(cs => !Object.keys(STATUS_CONFIG).includes(cs.id))
      .map(cs => ({
        id: cs.id,
        label: cs.title,
        color: cs.color || '#8B5CF6', // Default purple for custom statuses
        icon: 'circle-dot', // Default icon for custom
      })),
  ]

  // v0.17.54: Get current status config (from defaults or custom)
  const getCurrentConfig = () => {
    const defaultConfig = STATUS_CONFIG[status as TaskStatus]
    if (defaultConfig) {
      return { ...defaultConfig, id: status }
    }
    const customConfig = customStatuses.find(cs => cs.id === status)
    if (customConfig) {
      return {
        id: customConfig.id,
        label: customConfig.title,
        color: customConfig.color || '#8B5CF6',
        icon: 'circle-dot',
      }
    }
    // Fallback to todo
    return { ...STATUS_CONFIG['todo'], id: 'todo' }
  }

  // v0.17.60: Smart positioning - menu appears adjacent to button in ALL cases
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuHeight = 280
      const menuWidth = 180
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const GAP = 4

      // Horizontal: Right-align menu with button's right edge
      let leftPos = rect.right - menuWidth
      if (leftPos < 10) {
        leftPos = rect.left
      }
      if (leftPos + menuWidth > viewportWidth - 10) {
        leftPos = viewportWidth - menuWidth - 10
      }

      // Vertical: Smart positioning based on available space
      let topPos: number

      if (spaceBelow >= menuHeight + 20) {
        // Enough space below - open downward (preferred)
        topPos = rect.bottom + GAP
      } else if (spaceAbove >= menuHeight + 20) {
        // Enough space above - open upward, menu bottom touches button top
        topPos = rect.top - menuHeight - GAP
      } else {
        // Not enough space either way - choose best option and constrain
        if (spaceBelow >= spaceAbove) {
          topPos = rect.bottom + GAP
        } else {
          topPos = Math.max(10, rect.top - Math.min(menuHeight, spaceAbove - 10) - GAP)
        }
      }

      // Final safety: ensure menu stays within viewport
      topPos = Math.max(10, Math.min(topPos, viewportHeight - menuHeight - 10))

      setMenuPosition({ top: topPos, left: leftPos })
    }
  }, [isOpen])

  // v0.17.60: Lock scroll on the actual scrollable column container
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const columnCards = buttonRef.current.closest('.asakaa-column-cards') as HTMLElement
      const scrollLockTargets: { element: HTMLElement; original: string }[] = []

      if (columnCards) {
        scrollLockTargets.push({
          element: columnCards,
          original: columnCards.style.overflow
        })
        columnCards.style.overflow = 'hidden'
      }

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
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen])

  const handleSelect = (newStatus: string) => {
    onChange(newStatus)
    setIsOpen(false)
  }

  // v0.17.54: Use dynamic config lookup
  const currentConfig = getCurrentConfig()
  const statusColor = currentConfig.color

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/15 hover:scale-110 active:scale-95"
        style={{
          background: `${statusColor}10`,
          boxShadow: `0 0 0 2px ${statusColor}30 inset`,
        }}
        title={currentConfig.label}
      >
        <StatusIcon icon={currentConfig.icon} color={statusColor} />
      </button>

      {/* v0.17.57: Fixed positioning for proper viewport handling */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="status-selector-menu"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 99999,
              minWidth: '180px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              borderRadius: '8px',
              background: 'var(--modal-v2-bg, #1f1f1f)',
              border: '1px solid var(--modal-v2-border, rgba(255, 255, 255, 0.15))',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
          <div
            className="px-3 py-1.5 border-b"
            style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.1))' }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--modal-v2-text-secondary, rgba(255, 255, 255, 0.7))' }}
            >
              Status
            </span>
          </div>

          <div className="py-1">
            {/* v0.17.54: Render all statuses (default + custom) */}
            {allStatuses.map((statusOption) => (
                <button
                  key={statusOption.id}
                  onClick={() => handleSelect(statusOption.id)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-sm font-medium transition-all active:scale-[0.98] status-option"
                  style={{
                    color: statusOption.color,
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--modal-v2-bg-tertiary, rgba(255, 255, 255, 0.15))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <StatusIcon icon={statusOption.icon} color={statusOption.color} />
                  <span className="font-semibold">{statusOption.label}</span>
                  {status === statusOption.id && (
                    <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )
            )}
          </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
