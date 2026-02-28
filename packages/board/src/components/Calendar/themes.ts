/**
 * CalendarBoard Themes — Chronos V2.0
 * @version 2.0.0
 */

import type { CalendarTheme } from './types';

/**
 * Dark theme — Chronos V2.0 Design Language
 * Ultra-dark (#050505) with #222 grid borders, glass elements, and neon accents
 */
export const darkTheme: CalendarTheme = {
  // Backgrounds
  bgPrimary: '#050505',
  bgSecondary: '#080808',
  bgHover: 'rgba(255, 255, 255, 0.02)',
  bgToday: 'rgba(0, 127, 255, 0.08)',
  bgWeekend: '#050505',
  bgOtherMonth: '#080808',

  // Borders
  border: '#222222',
  borderLight: '#1a1a1a',

  // Text
  textPrimary: 'rgba(255, 255, 255, 0.90)',
  textSecondary: 'rgba(255, 255, 255, 0.60)',
  textMuted: 'rgba(255, 255, 255, 0.30)',
  textToday: '#007FFF',

  // Accent colors
  accent: '#007FFF',
  accentHover: '#3399FF',
  accentLight: 'rgba(0, 127, 255, 0.15)',

  // Status colors
  statusTodo: 'rgba(255, 255, 255, 0.40)',
  statusInProgress: '#007FFF',
  statusCompleted: '#34D399',

  // Interactive
  focusRing: '#007FFF',

  // Chronos V2.0 extended tokens
  glass: 'rgba(20, 20, 20, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHover: 'rgba(255, 255, 255, 0.05)',
  neonRed: '#FF2E2E',
  glowBlue: '0 0 10px rgba(0, 127, 255, 0.3)',
  glowRed: '0 0 10px rgba(255, 46, 46, 0.4)',
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

  // Extended tokens (light variants)
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassHover: 'rgba(0, 0, 0, 0.04)',
  neonRed: '#DC2626',
  glowBlue: '0 0 10px rgba(0, 127, 255, 0.15)',
  glowRed: '0 0 10px rgba(220, 38, 38, 0.2)',
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

  // Extended tokens
  glass: 'rgba(26, 26, 46, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassHover: 'rgba(255, 255, 255, 0.04)',
  neonRed: '#EF4444',
  glowBlue: '0 0 10px rgba(99, 102, 241, 0.3)',
  glowRed: '0 0 10px rgba(239, 68, 68, 0.3)',
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
