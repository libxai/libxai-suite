/**
 * Date Range Picker Component
 * Quick selection buttons + interactive calendar
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'
import './date-range-picker.css'

export interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onChange: (startDate?: string, endDate?: string) => void
  className?: string
}

const QUICK_OPTIONS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '4 Weeks', days: 28 },
  { label: '8 Weeks', days: 56 },
]

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
}: DateRangePickerProps) {
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
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen])

  const handleQuickSelect = (days: number) => {
    const now = new Date()

    // Format date as YYYY-MM-DD in LOCAL timezone (not UTC)
    // This prevents timezone offset issues where selecting "Today" assigns tomorrow's date
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const todayStr = formatLocalDate(now)

    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + days)
    const endStr = formatLocalDate(endDate)

    onChange(todayStr, endStr)
    setIsOpen(false)
  }

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Set date'

    // Parse dates as local timezone to avoid UTC conversion issues
    const parseLocalDate = (dateStr: string | Date) => {
      if (dateStr instanceof Date) return dateStr
      // Handle invalid date strings
      if (typeof dateStr !== 'string' || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return null
      }
      const parts = dateStr.split('-').map(Number)
      if (parts.length !== 3 || parts.some(p => isNaN(p))) {
        return null
      }
      const year = parts[0]
      const month = parts[1]
      const day = parts[2]
      if (year === undefined || month === undefined || day === undefined) {
        return null
      }
      return new Date(year, month - 1, day)
    }

    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)

    // Return 'Set date' if parsing failed
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Set date'
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    return `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}`
  }

  const hasDateSet = startDate && endDate

  // Check if date is overdue
  const isOverdue = () => {
    if (!endDate) return false
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return end < today
  }

  const overdue = isOverdue()

  return (
    <div className={`relative ${className || ''}`}>
      {/* Date button - plain text with color only if overdue */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all hover:bg-white/5 ${
          overdue ? 'asakaa-date-overdue' : 'asakaa-date'
        }`}
        title={hasDateSet ? `${formatDateRange()}` : 'Set date range'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {startDate && endDate && (
          <span className="whitespace-nowrap">{formatDateRange()}</span>
        )}
      </button>

      {/* Date picker menu - Using Portal to escape stacking context */}
      {isOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="drp-menu"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            {/* Quick selection */}
            <div className="drp-section drp-section-border">
              <span className="drp-label">Quick Select</span>
              <div className="drp-grid">
                {QUICK_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleQuickSelect(option.days)}
                    className="drp-btn"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual date inputs */}
            <div className="drp-section">
              <span className="drp-label">Custom Range</span>
              <div className="drp-inputs">
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => onChange(e.target.value, endDate)}
                  className="drp-input"
                />
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onChange(startDate, e.target.value)}
                  className="drp-input"
                />
              </div>

              {/* Clear button */}
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    onChange(undefined, undefined)
                    setIsOpen(false)
                  }}
                  className="drp-clear-btn"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
