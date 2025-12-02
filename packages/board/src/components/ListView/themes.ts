/**
 * ListView Themes
 * @version 0.17.0
 */

import type { ListViewTheme } from './types';

/**
 * Dark theme for ListView
 */
export const darkTheme: ListViewTheme = {
  // Backgrounds
  bgPrimary: '#0d1117',
  bgSecondary: '#161b22',
  bgHover: '#21262d',
  bgSelected: '#1f6feb20',
  bgAlternate: '#0d111780',

  // Borders
  border: '#30363d',
  borderLight: '#21262d',

  // Text
  textPrimary: '#c9d1d9',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',

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
  checkboxBg: '#21262d',
  checkboxChecked: '#58a6ff',
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
