/**
 * CSS Custom Properties Generator
 * Generates CSS variables from design tokens
 * @module tokens/css-generator
 */

import { designTokens } from './design-tokens'
import type { TokenValue } from './design-tokens'

/**
 * Convert a nested object to flat CSS custom properties
 */
function flattenTokens(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, TokenValue> = {}
): Record<string, TokenValue> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenTokens(value as Record<string, unknown>, newKey, result)
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Format token value for CSS
 */
function formatCSSValue(value: TokenValue): string {
  if (typeof value === 'number') {
    // Check if it's likely a pixel value
    if (value > 0 && value < 1000) {
      return `${value}px`
    }
    return value.toString()
  }
  return value
}

/**
 * Generate CSS custom properties from design tokens
 */
export function generateCSSVariables(prefix = 'asakaa'): string {
  const flatTokens = flattenTokens(designTokens)
  const cssVars: string[] = []

  for (const [key, value] of Object.entries(flatTokens)) {
    const varName = `--${prefix}-${key}`
    const varValue = formatCSSValue(value)
    cssVars.push(`  ${varName}: ${varValue};`)
  }

  return `:root {\n${cssVars.join('\n')}\n}`
}

/**
 * Generate CSS custom properties for a specific theme
 */
export interface ThemeColors {
  // Background colors
  background: {
    primary: string
    secondary: string
    tertiary: string
    card: string
    hover: string
    active: string
  }
  // Text colors
  text: {
    primary: string
    secondary: string
    tertiary: string
    disabled: string
    inverse: string
  }
  // Border colors
  border: {
    default: string
    hover: string
    focus: string
    active: string
  }
  // Status colors
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
  // Priority colors
  priority: {
    low: string
    medium: string
    high: string
    urgent: string
  }
  // Interactive colors
  interactive: {
    primary: string
    primaryHover: string
    primaryActive: string
    secondary: string
    secondaryHover: string
    secondaryActive: string
  }
  // Gantt-specific colors
  gantt: {
    gridLine: string
    todayLine: string
    taskBackground: string
    taskBorder: string
    criticalPath: string
    milestone: string
    dependency: string
    weekend: string
  }
}

/**
 * Generate theme CSS variables
 */
export function generateThemeVariables(
  theme: ThemeColors,
  prefix = 'asakaa'
): string {
  const cssVars: string[] = []

  // Flatten theme colors
  const flatColors = flattenTokens(theme as unknown as Record<string, unknown>)

  for (const [key, value] of Object.entries(flatColors)) {
    const varName = `--${prefix}-color-${key}`
    cssVars.push(`  ${varName}: ${value};`)
  }

  return `:root {\n${cssVars.join('\n')}\n}`
}

/**
 * Dark theme colors
 */
export const darkTheme: ThemeColors = {
  background: {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    tertiary: '#3a3a3a',
    card: '#2d2d2d',
    hover: '#353535',
    active: '#404040',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    tertiary: '#808080',
    disabled: '#606060',
    inverse: '#1a1a1a',
  },
  border: {
    default: '#404040',
    hover: '#505050',
    focus: '#0ea5e9',
    active: '#0284c7',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  priority: {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  },
  interactive: {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryActive: '#0369a1',
    secondary: '#6b7280',
    secondaryHover: '#4b5563',
    secondaryActive: '#374151',
  },
  gantt: {
    gridLine: '#404040',
    todayLine: '#0ea5e9',
    taskBackground: '#3b82f6',
    taskBorder: '#2563eb',
    criticalPath: '#ef4444',
    milestone: '#8b5cf6',
    dependency: '#6b7280',
    weekend: '#2a2a2a',
  },
}

/**
 * Light theme colors
 */
export const lightTheme: ThemeColors = {
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    card: '#ffffff',
    hover: '#f3f4f6',
    active: '#e5e7eb',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    disabled: '#d1d5db',
    inverse: '#ffffff',
  },
  border: {
    default: '#e5e7eb',
    hover: '#d1d5db',
    focus: '#0ea5e9',
    active: '#0284c7',
  },
  status: {
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },
  priority: {
    low: '#9ca3af',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  },
  interactive: {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryActive: '#0369a1',
    secondary: '#6b7280',
    secondaryHover: '#4b5563',
    secondaryActive: '#374151',
  },
  gantt: {
    gridLine: '#e5e7eb',
    todayLine: '#0ea5e9',
    taskBackground: '#3b82f6',
    taskBorder: '#2563eb',
    criticalPath: '#ef4444',
    milestone: '#8b5cf6',
    dependency: '#6b7280',
    weekend: '#f9fafb',
  },
}

/**
 * Neutral theme colors
 */
export const neutralTheme: ThemeColors = {
  background: {
    primary: '#18181b',
    secondary: '#27272a',
    tertiary: '#3f3f46',
    card: '#27272a',
    hover: '#3f3f46',
    active: '#52525b',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    disabled: '#52525b',
    inverse: '#18181b',
  },
  border: {
    default: '#3f3f46',
    hover: '#52525b',
    focus: '#0ea5e9',
    active: '#0284c7',
  },
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  priority: {
    low: '#71717a',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  },
  interactive: {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryActive: '#0369a1',
    secondary: '#71717a',
    secondaryHover: '#52525b',
    secondaryActive: '#3f3f46',
  },
  gantt: {
    gridLine: '#3f3f46',
    todayLine: '#0ea5e9',
    taskBackground: '#3b82f6',
    taskBorder: '#2563eb',
    criticalPath: '#ef4444',
    milestone: '#8b5cf6',
    dependency: '#71717a',
    weekend: '#27272a',
  },
}

/**
 * Generate complete CSS with all tokens and theme
 */
export function generateCompleteCSS(
  theme: ThemeColors = darkTheme,
  prefix = 'asakaa'
): string {
  const tokenVars = generateCSSVariables(prefix)
  const themeVars = generateThemeVariables(theme, prefix)

  return `${tokenVars}\n\n${themeVars}`
}

/**
 * Export CSS to file content
 */
export function exportTokensToCSS(): string {
  return `/**
 * ASAKAA Design Tokens
 * Auto-generated from design-tokens.ts
 * Do not edit this file directly
 */

${generateCompleteCSS(darkTheme)}

/* Light theme */
[data-theme="light"] {
${generateThemeVariables(lightTheme, 'asakaa')
  .split('\n')
  .slice(1, -1)
  .join('\n')}
}

/* Neutral theme */
[data-theme="neutral"] {
${generateThemeVariables(neutralTheme, 'asakaa')
  .split('\n')
  .slice(1, -1)
  .join('\n')}
}
`
}
