/**
 * DateCell - Date picker cell for ListView
 * v1.3.0: Refactored to use DateRangePicker for enhanced UI
 */

import { DateRangePicker } from './DateRangePicker';

interface DateCellProps {
  value?: Date | string;
  onChange?: (value: Date | undefined) => void;
  isDark: boolean;
  locale: string;
  disabled?: boolean;
  /** Which field this cell represents: 'start' | 'end' */
  dateField?: 'start' | 'end';
  /** Start date (for range display context) */
  startDate?: Date | string | null;
  /** End date (for range display context) */
  endDate?: Date | string | null;
}

export function DateCell({
  value,
  onChange,
  isDark,
  locale,
  disabled = false,
  dateField = 'end',
  startDate,
  endDate,
}: DateCellProps) {
  // Convert value to proper date
  const dateValue = value ? (value instanceof Date ? value : new Date(value)) : null;

  // Use provided start/end dates or default to the value
  const effectiveStartDate = dateField === 'start' ? dateValue : (startDate || null);
  const effectiveEndDate = dateField === 'end' ? dateValue : (endDate || null);

  const handleChange = (newStart: Date | undefined, newEnd: Date | undefined) => {
    if (!onChange) return;

    // Return the date for the field this cell represents
    if (dateField === 'start') {
      onChange(newStart);
    } else {
      onChange(newEnd);
    }
  };

  return (
    <DateRangePicker
      startDate={effectiveStartDate}
      endDate={effectiveEndDate}
      onChange={handleChange}
      singleDateMode={true}
      singleDateField={dateField}
      isDark={isDark}
      locale={locale}
      disabled={disabled || !onChange}
      placeholder="-"
    />
  );
}
