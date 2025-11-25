/**
 * Priority Selector Component V2
 * Using new Dropdown system with Floating UI for perfect positioning
 * Theme-aware and accessible
 */

import { Dropdown } from '../Dropdown'
import type { Priority } from '../../types'

export interface PrioritySelectorProps {
  priority?: Priority
  onChange: (priority?: Priority) => void
  className?: string
}

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', color: '#E74C3C', darkColor: '#ff6b6b' },
  HIGH: { label: 'High', color: '#E67E22', darkColor: '#ffa94d' },
  MEDIUM: { label: 'Normal', color: '#F1C40F', darkColor: '#ffd43b' },
  LOW: { label: 'Low', color: '#2ECC71', darkColor: '#51cf66' },
} as const

const CLEAR_COLOR = '#BDC3C7'
const CLEAR_COLOR_DARK = '#868e96'

// Priority Icon Component
const PriorityIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" fill={color} opacity="0.9" />
    <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" opacity="0.3" />
  </svg>
)

// Check Icon
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M13.5 4.5L6 12L2.5 8.5"
      stroke="var(--asakaa-color-interactive-primary, #1976d2)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function PrioritySelector({ priority, onChange, className }: PrioritySelectorProps) {
  const currentConfig = priority ? PRIORITY_CONFIG[priority] : null

  // Use theme-aware color
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const flagColor = currentConfig ? (isDark ? currentConfig.darkColor : currentConfig.color) : (isDark ? CLEAR_COLOR_DARK : CLEAR_COLOR)

  const handleSelect = (newPriority?: Priority) => {
    onChange(newPriority)
  }

  const priorities = Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][]

  return (
    <Dropdown
      trigger={({ isOpen }) => (
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/15 hover:scale-110 active:scale-95 ${className || ''}`}
          style={{
            background: priority ? `${flagColor}10` : 'transparent',
            boxShadow: priority ? `0 0 0 2px ${flagColor}30 inset` : 'none',
            transform: isOpen ? 'scale(1.1)' : 'scale(1)',
          }}
          title={currentConfig?.label || 'Set priority'}
          aria-label="Select priority"
          aria-expanded={isOpen}
          aria-haspopup="menu"
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
              fillOpacity={priority ? '0.6' : '0.4'}
            />
          </svg>
        </button>
      )}
      placement="bottom-start"
      minWidth={180}
      maxHeight={280}
      itemCount={priorities.length + 1}
      onSelectItem={(index) => {
        const item = priorities[index]
        if (item) {
          handleSelect(item[0])
        } else {
          handleSelect(undefined)
        }
      }}
    >
      {({ activeIndex, close }) => (
        <div className="priority-dropdown">
          {/* Header */}
          <div className="dropdown-section-header">Priority</div>

          {/* Priority Options */}
          <div className="dropdown-section">
            {priorities.map(([key, config], index) => {
              const color = isDark ? config.darkColor : config.color
              const isActive = activeIndex === index
              const isSelected = priority === key

              return (
                <button
                  key={key}
                  onClick={() => {
                    handleSelect(key)
                    close()
                  }}
                  className="dropdown-item"
                  data-active={isActive}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  style={{
                    color: isActive ? color : 'inherit',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <PriorityIcon color={color} />
                  <span>{config.label}</span>
                  {isSelected && <CheckIcon />}
                </button>
              )
            })}

            {/* Clear Option */}
            <div style={{ borderTop: '1px solid var(--asakaa-color-border-default, #e0e0e0)', marginTop: '4px', paddingTop: '4px' }}>
              <button
                onClick={() => {
                  handleSelect(undefined)
                  close()
                }}
                className="dropdown-item"
                data-active={activeIndex === priorities.length}
                data-index={priorities.length}
                role="option"
                aria-selected={!priority}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="var(--asakaa-color-text-tertiary, #9e9e9e)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                </svg>
                <span>Clear</span>
                {!priority && <CheckIcon />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Dropdown>
  )
}
