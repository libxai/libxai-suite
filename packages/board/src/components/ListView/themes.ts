/**
 * ListView Themes
 * @version 2.0.0 — Chronos V2.0 visual language
 */

import type { ListViewTheme } from './types';

/**
 * Dark theme for ListView — Chronos V2.0
 */
export const darkTheme: ListViewTheme = {
  // Backgrounds
  bgPrimary: '#0D0D0D',
  bgSecondary: '#141414',
  bgHover: 'rgba(255,255,255,0.05)',
  bgSelected: '#0D131E',
  bgAlternate: '#141414',

  // Borders
  border: '#222222',
  borderLight: '#1A1A1A',

  // Text
  textPrimary: 'rgba(255,255,255,0.9)',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.3)',

  // Accent colors
  accent: '#007BFF',
  accentHover: '#2979FF',
  accentLight: 'rgba(0,123,255,0.15)',

  // Status colors
  statusTodo: 'rgba(255,255,255,0.4)',
  statusInProgress: '#007BFF',
  statusCompleted: '#34D399',

  // Interactive
  focusRing: '#007BFF',
  checkboxBg: '#1A1A1A',
  checkboxChecked: '#007BFF',

  // Chronos V2.0 extended tokens
  bgGroupHeader: '#222222',
  headerBg: '#1A1A1A',
  neonRed: '#FF453A',
  neonGreen: '#32D74B',
  neonAmber: '#FFD60A',
  neonBlue: '#0A84FF',
};

/**
 * Light theme for ListView
 */
export const lightTheme: ListViewTheme = {
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f6f8fa',
  bgHover: '#f3f4f6',
  bgSelected: '#dbeafe',
  bgAlternate: '#f9fafb',

  // Borders
  border: '#d0d7de',
  borderLight: '#e5e7eb',

  // Text
  textPrimary: '#24292f',
  textSecondary: '#57606a',
  textMuted: '#8b949e',

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
  checkboxBg: '#ffffff',
  checkboxChecked: '#0969da',

  // Chronos V2.0 extended tokens
  bgGroupHeader: '#F3F4F6',
  headerBg: '#F9FAFB',
  neonRed: '#DC2626',
  neonGreen: '#16A34A',
  neonAmber: '#D97706',
  neonBlue: '#2563EB',
};

/**
 * Neutral theme for ListView
 */
export const neutralTheme: ListViewTheme = {
  // Backgrounds
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgHover: '#1f3460',
  bgSelected: '#0f4c7520',
  bgAlternate: '#1a1a2e80',

  // Borders
  border: '#2a3f5f',
  borderLight: '#1f3460',

  // Text
  textPrimary: '#e4e6eb',
  textSecondary: '#a8b2c1',
  textMuted: '#6b7280',

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
  checkboxBg: '#1f3460',
  checkboxChecked: '#6366f1',

  // Chronos V2.0 extended tokens
  bgGroupHeader: '#1f3460',
  headerBg: '#16213e',
  neonRed: '#EF4444',
  neonGreen: '#34D399',
  neonAmber: '#FBBF24',
  neonBlue: '#6366F1',
};

/**
 * All available themes
 */
export const listViewThemes = {
  dark: darkTheme,
  light: lightTheme,
  neutral: neutralTheme,
} as const;

export type ListViewThemeName = keyof typeof listViewThemes;

/**
 * Get theme by name
 */
export function getListViewTheme(themeName: ListViewThemeName): ListViewTheme {
  return listViewThemes[themeName] || listViewThemes.dark;
}
