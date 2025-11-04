/**
 * Theme Definitions
 * ASAKAA v0.5.0 - Elite Theming System
 */

import type { Theme, ThemeName } from './types'

/**
 * DARK THEME (Enhanced) - DEFAULT
 * Philosophy: Speed, efficiency, focus
 * Optimized for developer productivity
 */
export const darkTheme: Theme = {
  name: 'dark',
  displayName: 'Dark (Enhanced)',
  emoji: '🌙',
  colors: {
    // Background colors
    bgPrimary: '#222326',
    bgSecondary: '#2A2B2F',
    bgTertiary: '#33343A',
    bgCard: '#2d2d2d',
    bgHover: '#353535',
    bgActive: '#404040',
    bgInput: '#2a2a2a',

    // Text colors
    textPrimary: '#F4F5F8',
    textSecondary: '#AEB6C0',
    textTertiary: '#7A7F8A',
    textDisabled: '#606060',
    textInverse: '#1a1a1a',

    // Border colors
    borderPrimary: 'rgba(255, 255, 255, 0.1)',
    borderSecondary: 'rgba(255, 255, 255, 0.05)',
    borderDefault: '#404040',
    borderHover: '#505050',
    borderSubtle: '#2a2a2a',

    // Interactive colors
    accentPrimary: '#5E6AD2',
    accentHover: '#7780DD',
    interactivePrimary: '#0ea5e9',
    interactivePrimaryHover: '#0284c7',
    interactivePrimaryBorder: 'rgba(14, 165, 233, 0.3)',
    interactivePrimaryBackground: 'rgba(14, 165, 233, 0.1)',
    interactivePrimaryBackgroundHover: 'rgba(14, 165, 233, 0.2)',

    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    danger: '#ef4444',
    dangerBorder: 'rgba(239, 68, 68, 0.3)',
    dangerBackground: 'rgba(239, 68, 68, 0.1)',
    dangerBackgroundHover: 'rgba(239, 68, 68, 0.2)',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.5)',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
}

/**
 * LIGHT THEME (Accessible Standard)
 * Philosophy: Clarity, legibility, professionalism
 * WCAG AAA compliant (7:1 contrast)
 */
export const lightTheme: Theme = {
  name: 'light',
  displayName: 'Light (Standard)',
  emoji: '☀️',
  colors: {
    // Background colors
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F7F7F8',
    bgTertiary: '#EEEFF1',
    bgCard: '#ffffff',
    bgHover: '#f3f4f6',
    bgActive: '#e5e7eb',
    bgInput: '#f9fafb',

    // Text colors
    textPrimary: '#1A1A1A',
    textSecondary: '#5A5A5A',
    textTertiary: '#8A8A8A',
    textDisabled: '#d1d5db',
    textInverse: '#ffffff',

    // Border colors
    borderPrimary: 'rgba(0, 0, 0, 0.1)',
    borderSecondary: 'rgba(0, 0, 0, 0.05)',
    borderDefault: '#e5e7eb',
    borderHover: '#d1d5db',
    borderSubtle: '#f3f4f6',

    // Interactive colors
    accentPrimary: '#5E6AD2',
    accentHover: '#4A56B8',
    interactivePrimary: '#0ea5e9',
    interactivePrimaryHover: '#0284c7',
    interactivePrimaryBorder: 'rgba(14, 165, 233, 0.3)',
    interactivePrimaryBackground: 'rgba(14, 165, 233, 0.08)',
    interactivePrimaryBackgroundHover: 'rgba(14, 165, 233, 0.15)',

    // Status colors
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    danger: '#dc2626',
    dangerBorder: 'rgba(220, 38, 38, 0.3)',
    dangerBackground: 'rgba(220, 38, 38, 0.08)',
    dangerBackgroundHover: 'rgba(220, 38, 38, 0.15)',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.2)',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
}

/**
 * NEUTRAL THEME (Zen Mode)
 * Philosophy: Minimalism, calm technology, maximum concentration
 * Strictly monochromatic - states communicated via icons/typography
 */
export const neutralTheme: Theme = {
  name: 'neutral',
  emoji: '⚪',
  displayName: 'Neutral (Zen)',
  colors: {
    // Background colors - Light neutral tones (matching Gantt neutral theme)
    bgPrimary: '#FAFAF9',
    bgSecondary: '#F5F5F4',
    bgTertiary: '#E7E5E4',
    bgCard: '#FEFEFE',
    bgHover: '#F0EFEE',
    bgActive: '#E7E5E4',
    bgInput: '#FAFAF9',

    // Text colors
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textTertiary: '#A8A29E',
    textDisabled: '#D6D3D1',
    textInverse: '#FAFAF9',

    // Border colors
    borderPrimary: '#E7E5E4',
    borderSecondary: '#F0EFEE',
    borderDefault: '#E7E5E4',
    borderHover: '#D6D3D1',
    borderSubtle: '#F5F5F4',

    // Interactive colors - Neutral with subtle accents
    accentPrimary: '#292524',
    accentHover: '#44403C',
    interactivePrimary: '#292524',
    interactivePrimaryHover: '#44403C',
    interactivePrimaryBorder: 'rgba(41, 37, 36, 0.3)',
    interactivePrimaryBackground: 'rgba(41, 37, 36, 0.06)',
    interactivePrimaryBackgroundHover: 'rgba(41, 37, 36, 0.12)',

    // Status colors (minimal in Zen mode)
    success: '#15803D',
    warning: '#CA8A04',
    error: '#B91C1C',
    info: '#1D4ED8',
    danger: '#B91C1C',
    dangerBorder: 'rgba(185, 28, 28, 0.3)',
    dangerBackground: 'rgba(185, 28, 28, 0.08)',
    dangerBackgroundHover: 'rgba(185, 28, 28, 0.15)',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.12)',
    lg: '0 12px 32px rgba(0, 0, 0, 0.15)',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
}

/**
 * All themes registry
 */
export const themes: Record<ThemeName, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  neutral: neutralTheme,
}

/**
 * Default theme
 */
export const defaultTheme: ThemeName = 'dark'
