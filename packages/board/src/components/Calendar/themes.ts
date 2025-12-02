/**
 * CalendarBoard Themes
 * @version 0.17.0
 */

import type { CalendarTheme } from './types';

/**
 * Dark theme for CalendarBoard
 */
export const darkTheme: CalendarTheme = {
  // Backgrounds
  bgPrimary: '#0d1117',
  bgSecondary: '#161b22',
  bgHover: '#21262d',
  bgToday: '#1f6feb20',
  bgWeekend: '#161b2280',
  bgOtherMonth: '#0d111750',

  // Borders
  border: '#30363d',
  borderLight: '#21262d',

  // Text
  textPrimary: '#c9d1d9',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',
  textToday: '#58a6ff',

  // Accent colors
  accent: '#58a6ff',
  accentHover: '#79b8ff',
  accentLight: '#58a6ff20',

  // Status colors
  statusTodo: '#8b949e',
  statusInProgress: '#f0883e',
  statusCompleted: '#3fb950',

  // Interactive
  focusRing: '#58a6ff',
};

/**
 * Light theme for CalendarBoard
 */
export const lightTheme: CalendarTheme = {
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f6f8fa',
  bgHover: '#f3f4f6',
  bgToday: '#dbeafe',
  bgWeekend: '#f9fafb',
  bgOtherMonth: '#f3f4f680',

  // Borders
  border: '#d0d7de',
  borderLight: '#e5e7eb',

  // Text
  textPrimary: '#24292f',
  textSecondary: '#57606a',
  textMuted: '#8b949e',
  textToday: '#0969da',

  // Accent colors
  accent: '#0969da',
  accentHover: '#0550ae',
  accentLight: '#dbeafe',

  // Status colors
  statusTodo: '#8b949e',
  statusInProgress: '#bf8700',
  statusCompleted: '#1a7f37',

  // Interactive
  focusRing: '#0969da',
};

/**
 * Neutral theme for CalendarBoard
 */
export const neutralTheme: CalendarTheme = {
  // Backgrounds
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgHover: '#1f3460',
  bgToday: '#6366f120',
  bgWeekend: '#16213e80',
  bgOtherMonth: '#1a1a2e50',

  // Borders
  border: '#2a3f5f',
  borderLight: '#1f3460',

  // Text
  textPrimary: '#e4e6eb',
  textSecondary: '#a8b2c1',
  textMuted: '#6b7280',
  textToday: '#818cf8',

  // Accent colors
  accent: '#6366f1',
  accentHover: '#818cf8',
  accentLight: '#6366f120',

  // Status colors
  statusTodo: '#9ca3af',
  statusInProgress: '#fbbf24',
  statusCompleted: '#34d399',

  // Interactive
  focusRing: '#6366f1',
};

/**
 * All available themes
 */
export const calendarThemes = {
  dark: darkTheme,
  light: lightTheme,
  neutral: neutralTheme,
} as const;

export type CalendarThemeName = keyof typeof calendarThemes;

/**
 * Get theme by name
 */
export function getCalendarTheme(themeName: CalendarThemeName): CalendarTheme {
  return calendarThemes[themeName] || calendarThemes.dark;
}
