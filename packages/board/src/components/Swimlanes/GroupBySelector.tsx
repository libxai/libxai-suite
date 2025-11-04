/**
 * GroupBySelector Component
 * Dropdown to select swimlane grouping option
 * @module components/Swimlanes
 */

import { useState, useRef, useEffect } from 'react'
import type { GroupByOption } from '../../types'
import { cn } from '../../utils'

export interface GroupBySelectorProps {
  /** Current groupBy value */
  value: GroupByOption
  /** Change handler */
  onChange: (groupBy: GroupByOption) => void
  /** Custom className */
  className?: string
}

interface GroupByConfig {
  value: GroupByOption
  label: string
  icon: string
  description: string
}

const GROUP_BY_OPTIONS: GroupByConfig[] = [
  {
    value: 'none',
    label: 'No Grouping',
    icon: '📋',
    description: 'Standard Kanban board view',
  },
  {
    value: 'assignee',
    label: 'By Assignee',
    icon: '👥',
    description: 'Group cards by assigned user',
  },
  {
    value: 'priority',
    label: 'By Priority',
    icon: '🎯',
    description: 'Group cards by priority level',
  },
  {
    value: 'label',
    label: 'By Label',
    icon: '🏷️',
    description: 'Group cards by label/tag',
  },
]

/**
 * GroupBySelector Component
 */
export function GroupBySelector({
  value,
  onChange,
  className,
}: GroupBySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const currentOption = GROUP_BY_OPTIONS.find((opt) => opt.value === value) || GROUP_BY_OPTIONS[0]!

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
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

  const handleSelect = (option: GroupByOption) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 transition-all text-sm font-medium text-white/90"
      >
        <span className="text-base leading-none">{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-2 min-w-[280px] rounded-lg bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 shadow-2xl z-50 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
              Group By
            </span>
          </div>

          <div className="py-1">
            {GROUP_BY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full px-3 py-2 flex items-start gap-3 text-left transition-all hover:bg-white/10',
                  value === option.value && 'bg-white/5'
                )}
              >
                <span className="text-xl leading-none mt-0.5">
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">
                      {option.label}
                    </span>
                    {value === option.value && (
                      <span className="text-blue-400 text-xs">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
