/**
 * Date Utilities for Gantt Timeline Calculations
 * @module lib/DateUtils
 */

import type { Card } from '../models/Card'

/**
 * Timeline scale for Gantt display
 */
export type TimelineScale = 'day' | 'week' | 'month' | 'quarter' | 'year'

/**
 * Timeline range with start and end dates
 */
export interface TimelineRange {
  start: Date
  end: Date
}

/**
 * Week configuration
 */
export interface WeekConfig {
  /** First day of week (0 = Sunday, 1 = Monday, etc.) */
  firstDayOfWeek: number
  /** Working days (0 = Sunday, 6 = Saturday) */
  workingDays: number[]
}

/**
 * DateUtils - Utility class for date and timeline calculations
 *
 * Features:
 * - Business day calculations
 * - Week number calculations
 * - Timeline range detection
 * - Date formatting for Gantt display
 * - Working day vs weekend detection
 *
 * @example
 * ```typescript
 * const utils = new DateUtils()
 * const future = utils.addBusinessDays(new Date(), 5)
 * const days = utils.getBusinessDaysBetween(start, end)
 * ```
 */
export class DateUtils {
  private weekConfig: WeekConfig

  constructor(weekConfig?: Partial<WeekConfig>) {
    this.weekConfig = {
      firstDayOfWeek: weekConfig?.firstDayOfWeek ?? 1, // Monday
      workingDays: weekConfig?.workingDays ?? [1, 2, 3, 4, 5], // Mon-Fri
    }
  }

  /**
   * Add business days to a date
   *
   * @param date - Starting date
   * @param days - Number of business days to add
   * @returns New date with business days added
   */
  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date)
    let remainingDays = Math.abs(days)
    const direction = days >= 0 ? 1 : -1

    while (remainingDays > 0) {
      result.setDate(result.getDate() + direction)

      if (this.isWorkingDay(result)) {
        remainingDays--
      }
    }

    return result
  }

  /**
   * Calculate number of business days between two dates
   *
   * @param start - Start date
   * @param end - End date
   * @returns Number of business days (excluding weekends)
   */
  getBusinessDaysBetween(start: Date, end: Date): number {
    const startDate = new Date(start)
    const endDate = new Date(end)

    // Normalize to start of day
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (startDate > endDate) {
      return -this.getBusinessDaysBetween(endDate, startDate)
    }

    let count = 0
    const current = new Date(startDate)

    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }

    return count
  }

  /**
   * Calculate total days between two dates (including weekends)
   *
   * @param start - Start date
   * @param end - End date
   * @returns Number of calendar days
   */
  getCalendarDaysBetween(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if a date is a working day
   *
   * @param date - Date to check
   * @returns true if date is a working day
   */
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay()
    return this.weekConfig.workingDays.includes(dayOfWeek)
  }

  /**
   * Check if a date is a weekend
   *
   * @param date - Date to check
   * @returns true if date is Saturday or Sunday
   */
  isWeekend(date: Date): boolean {
    return !this.isWorkingDay(date)
  }

  /**
   * Get ISO week number for a date
   *
   * @param date - Date to get week number for
   * @returns ISO week number (1-53)
   */
  getWeekNumber(date: Date): number {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1)
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return weekNo
  }

  /**
   * Get month name for a date
   *
   * @param date - Date to get month for
   * @param format - 'long' or 'short'
   * @returns Month name
   */
  getMonthName(date: Date, format: 'long' | 'short' = 'long'): string {
    return date.toLocaleString('en-US', { month: format })
  }

  /**
   * Get quarter number for a date
   *
   * @param date - Date to get quarter for
   * @returns Quarter number (1-4)
   */
  getQuarter(date: Date): number {
    return Math.floor(date.getMonth() / 3) + 1
  }

  /**
   * Format date for Gantt timeline display
   *
   * @param date - Date to format
   * @param scale - Timeline scale
   * @returns Formatted date string
   */
  formatForGantt(date: Date, scale: TimelineScale): string {
    switch (scale) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      case 'week':
        return `W${this.getWeekNumber(date)}`

      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      case 'quarter':
        return `Q${this.getQuarter(date)} ${date.getFullYear()}`

      case 'year':
        return date.getFullYear().toString()

      default:
        return date.toLocaleDateString()
    }
  }

  /**
   * Get timeline range for a set of tasks
   *
   * @param tasks - Tasks to analyze
   * @param padding - Days to add before/after (default: 7)
   * @returns Timeline range covering all tasks
   */
  getTimelineRange(tasks: Card[], padding = 7): TimelineRange {
    if (tasks.length === 0) {
      const today = new Date()
      return {
        start: new Date(today),
        end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    }

    let minDate: Date | null = null
    let maxDate: Date | null = null

    tasks.forEach((task) => {
      if (task.startDate) {
        const start = new Date(task.startDate)
        if (!minDate || start < minDate) {
          minDate = start
        }
      }

      if (task.endDate) {
        const end = new Date(task.endDate)
        if (!maxDate || end > maxDate) {
          maxDate = end
        }
      }
    })

    // Fallback to today if no dates found
    if (!minDate) minDate = new Date()
    if (!maxDate) {
      maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)
    }

    // Add padding
    const start = new Date(minDate)
    start.setDate(start.getDate() - padding)

    const end = new Date(maxDate)
    end.setDate(end.getDate() + padding)

    return { start, end }
  }

  /**
   * Generate timeline points for rendering
   *
   * @param range - Timeline range
   * @param scale - Timeline scale
   * @returns Array of dates representing timeline points
   */
  generateTimelinePoints(range: TimelineRange, scale: TimelineScale): Date[] {
    const points: Date[] = []
    const current = new Date(range.start)

    while (current <= range.end) {
      points.push(new Date(current))

      switch (scale) {
        case 'day':
          current.setDate(current.getDate() + 1)
          break

        case 'week':
          current.setDate(current.getDate() + 7)
          break

        case 'month':
          current.setMonth(current.getMonth() + 1)
          break

        case 'quarter':
          current.setMonth(current.getMonth() + 3)
          break

        case 'year':
          current.setFullYear(current.getFullYear() + 1)
          break
      }
    }

    return points
  }

  /**
   * Get start of day (midnight)
   *
   * @param date - Date to normalize
   * @returns Date set to 00:00:00.000
   */
  startOfDay(date: Date): Date {
    const result = new Date(date)
    result.setHours(0, 0, 0, 0)
    return result
  }

  /**
   * Get end of day (23:59:59.999)
   *
   * @param date - Date to normalize
   * @returns Date set to 23:59:59.999
   */
  endOfDay(date: Date): Date {
    const result = new Date(date)
    result.setHours(23, 59, 59, 999)
    return result
  }

  /**
   * Get start of week
   *
   * @param date - Date to get start of week for
   * @returns Date representing start of week
   */
  startOfWeek(date: Date): Date {
    const result = new Date(date)
    const day = result.getDay()
    const diff = (day < this.weekConfig.firstDayOfWeek ? 7 : 0) + day - this.weekConfig.firstDayOfWeek

    result.setDate(result.getDate() - diff)
    result.setHours(0, 0, 0, 0)
    return result
  }

  /**
   * Get end of week
   *
   * @param date - Date to get end of week for
   * @returns Date representing end of week
   */
  endOfWeek(date: Date): Date {
    const start = this.startOfWeek(date)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  /**
   * Get start of month
   *
   * @param date - Date to get start of month for
   * @returns Date representing first day of month
   */
  startOfMonth(date: Date): Date {
    const result = new Date(date)
    result.setDate(1)
    result.setHours(0, 0, 0, 0)
    return result
  }

  /**
   * Get end of month
   *
   * @param date - Date to get end of month for
   * @returns Date representing last day of month
   */
  endOfMonth(date: Date): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + 1, 0)
    result.setHours(23, 59, 59, 999)
    return result
  }

  /**
   * Check if two dates are on the same day
   *
   * @param date1 - First date
   * @param date2 - Second date
   * @returns true if dates are on the same day
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  /**
   * Check if date is today
   *
   * @param date - Date to check
   * @returns true if date is today
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date())
  }

  /**
   * Calculate working hours between two dates (assuming 8-hour workday)
   *
   * @param start - Start date
   * @param end - End date
   * @param hoursPerDay - Working hours per day (default: 8)
   * @returns Total working hours
   */
  getWorkingHoursBetween(start: Date, end: Date, hoursPerDay = 8): number {
    const businessDays = this.getBusinessDaysBetween(start, end)
    return businessDays * hoursPerDay
  }

  /**
   * Parse date string or Date object to Date
   *
   * @param dateInput - Date string or Date object
   * @returns Parsed Date object
   */
  parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return new Date(dateInput)
    }
    return new Date(dateInput)
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   *
   * @param date - Date to format
   * @returns ISO date string
   */
  toISODateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Clone a date object
   *
   * @param date - Date to clone
   * @returns New Date instance with same value
   */
  clone(date: Date): Date {
    return new Date(date.getTime())
  }
}

/**
 * Default DateUtils instance with standard configuration
 */
export const dateUtils = new DateUtils()
