/**
 * Date Range Picker V2
 * Quick selection buttons + interactive calendar
 * Uses world-class Dropdown system for perfect positioning
 */

import { useState } from 'react'
import { Dropdown } from '../Dropdown'

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
  const [tempStartDate, setTempStartDate] = useState<string>(startDate || '')
  const [tempEndDate, setTempEndDate] = useState<string>(endDate || '')

  const handleQuickSelect = (days: number, close: () => void) => {
    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + days)

    const startStr = today.toISOString().split('T')[0] || ''
    const endStr = end.toISOString().split('T')[0] || ''

    setTempStartDate(startStr)
    setTempEndDate(endStr)
    onChange(startStr, endStr)
    close()
  }

  const handleApply = (close: () => void) => {
    onChange(tempStartDate || undefined, tempEndDate || undefined)
    close()
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
    <Dropdown
      trigger={({ isOpen }) => (
        <button
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all hover:bg-white/5 ${
            overdue ? 'asakaa-date-overdue' : 'asakaa-date'
          } ${className || ''}`}
          style={{
            transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          }}
          title={hasDateSet ? `${formatDateRange()}` : 'Set date range'}
          aria-label="Select date range"
          aria-expanded={isOpen}
          aria-haspopup="menu"
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
      )}
      placement="bottom-start"
      minWidth={320}
      maxHeight={480}
      itemCount={QUICK_OPTIONS.length}
      onOpen={() => {
        setTempStartDate(startDate || '')
        setTempEndDate(endDate || '')
      }}
    >
      {({ activeIndex, close }) => (
        <div className="date-range-picker-dropdown">
          {/* Quick selection */}
          <div className="dropdown-button-wrapper">
            <div className="dropdown-section-header" style={{ marginBottom: '12px' }}>
              Quick Select
            </div>
            <div className="dropdown-quick-grid">
              {QUICK_OPTIONS.map((option, index) => (
                <button
                  key={option.label}
                  onClick={() => handleQuickSelect(option.days, close)}
                  className="dropdown-quick-button"
                  data-active={activeIndex === index}
                  data-index={index}
                  role="option"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual date inputs */}
          <div className="dropdown-button-wrapper">
            <div className="dropdown-section-header" style={{ marginBottom: '12px' }}>
              Custom Range
            </div>
            <div className="dropdown-form-actions">
              <div className="dropdown-form-group">
                <label className="dropdown-label">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="dropdown-input"
                />
              </div>
              <div className="dropdown-form-group">
                <label className="dropdown-label">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="dropdown-input"
                />
              </div>

              {/* Apply button */}
              <button
                onClick={() => handleApply(close)}
                className="dropdown-primary-button"
              >
                Apply
              </button>

              {/* Clear button */}
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setTempStartDate('')
                    setTempEndDate('')
                    onChange(undefined, undefined)
                    close()
                  }}
                  className="dropdown-danger-button"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Dropdown>
  )
}
