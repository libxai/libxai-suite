import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'
import type { Priority } from '../../types'

export interface PrioritySelectorProps {
  priority?: Priority
  onChange: (priority?: Priority) => void
  className?: string
}

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', color: '#E74C3C' },
  HIGH: { label: 'High', color: '#E67E22' },
  MEDIUM: { label: 'Normal', color: '#F1C40F' },
  LOW: { label: 'Low', color: '#2ECC71' },
} as const

const CLEAR_COLOR = '#BDC3C7'

const PriorityIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill={color} opacity="0.9" />
    <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" opacity="0.3" />
  </svg>
)

export function PrioritySelector({
  priority,
  onChange,
  className,
}: PrioritySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // v0.17.62: Calculate position IMMEDIATELY when opening
  const calculatePosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 }

    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const menuWidth = 160
    const menuHeight = 220
    const GAP = 4

    let leftPos = rect.right - menuWidth
    if (leftPos < 10) leftPos = rect.left
    if (leftPos + menuWidth > viewportWidth - 10) {
      leftPos = viewportWidth - menuWidth - 10
    }

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    let topPos: number

    if (spaceBelow >= menuHeight + GAP) {
      topPos = rect.bottom + GAP
    } else if (spaceAbove >= menuHeight + GAP) {
      topPos = rect.top - menuHeight - GAP
    } else if (spaceBelow >= spaceAbove) {
      topPos = rect.bottom + GAP
    } else {
      topPos = Math.max(10, rect.top - menuHeight - GAP)
    }

    return { top: topPos, left: leftPos }
  }

  useEffect(() => {
    if (isOpen) {
      setMenuPosition(calculatePosition())
    }
  }, [isOpen])

  // v0.17.62: Lock scroll on ALL scrollable ancestors
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return

    const scrollLockTargets: { element: HTMLElement; original: string }[] = []
    const selectors = ['.asakaa-column-cards', '.modal-v2-container', '.modal-content']

    for (const selector of selectors) {
      const el = buttonRef.current.closest(selector) as HTMLElement
      if (el) {
        scrollLockTargets.push({ element: el, original: el.style.overflow })
        el.style.overflow = 'hidden'
      }
    }

    scrollLockTargets.push({ element: document.body, original: document.body.style.overflow })
    document.body.style.overflow = 'hidden'

    return () => {
      scrollLockTargets.forEach(({ element, original }) => {
        element.style.overflow = original
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

  const handleSelect = (newPriority?: Priority) => {
    onChange(newPriority)
    setIsOpen(false)
  }

  const currentConfig = priority ? PRIORITY_CONFIG[priority] : null
  const flagColor = currentConfig?.color || CLEAR_COLOR

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/15 hover:scale-110 active:scale-95"
        style={{
          background: priority ? `${flagColor}10` : 'transparent',
          boxShadow: priority ? `0 0 0 2px ${flagColor}30 inset` : 'none',
        }}
        title={currentConfig?.label || 'Set priority'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 2L3 14M3 2L13 6L3 8V2Z"
            stroke={flagColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={flagColor}
            fillOpacity={priority ? "0.6" : "0.4"}
          />
        </svg>
      </button>

      {/* v0.17.57: Fixed positioning for proper viewport handling */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="priority-selector-menu"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 99999,
              minWidth: '160px',
              maxHeight: 'calc(100vh - 40px)',
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
              Priority
            </span>
          </div>

          <div className="py-1">
            {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium transition-all active:scale-[0.98] priority-option"
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
                  <PriorityIcon color={config.color} />
                  <span className="font-semibold text-sm">{config.label}</span>
                  {priority === key && (
                    <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )
            )}

            <div
              className="mt-0.5 pt-0.5 border-t"
              style={{ borderColor: 'var(--modal-v2-border, rgba(255, 255, 255, 0.1))' }}
            >
              <button
                onClick={() => handleSelect(undefined)}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium transition-all active:scale-[0.98]"
                style={{
                  color: 'var(--modal-v2-text-primary, #e5e5e5)',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--modal-v2-bg-tertiary, rgba(255, 255, 255, 0.15))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
                </svg>
                <span className="font-semibold text-sm">Clear</span>
                {!priority && (
                  <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
