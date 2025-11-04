/**
 * Status Selector Component
 * Reusable status selector for both Card and Gantt
 * Follows the same pattern as PrioritySelector
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'

export type TaskStatus = 'todo' | 'in-progress' | 'completed'

export interface StatusSelectorProps {
  status?: TaskStatus
  onChange: (status: TaskStatus) => void
  className?: string
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
}: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    }
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

  const handleSelect = (newStatus: TaskStatus) => {
    onChange(newStatus)
    setIsOpen(false)
  }

  const currentConfig = STATUS_CONFIG[status]
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

      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="status-selector-menu"
            style={{
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 99999,
              minWidth: '180px',
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
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-sm font-medium transition-all active:scale-[0.98] status-option"
                  style={{
                    color: config.color,
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--modal-v2-bg-tertiary, rgba(255, 255, 255, 0.15))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <StatusIcon icon={config.icon} color={config.color} />
                  <span className="font-semibold">{config.label}</span>
                  {status === key && (
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
