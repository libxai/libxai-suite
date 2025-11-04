/**
 * Theme Provider
 * ASAKAA v0.5.0
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { ThemeName, ThemeContextValue } from './types'
import { themes, defaultTheme } from './themes'

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'asakaa-theme'

export interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeName
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme: initialTheme = defaultTheme,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      if (stored && (stored === 'dark' || stored === 'light' || stored === 'neutral')) {
        return stored as ThemeName
      }
    }
    return initialTheme
  })

  const setTheme = useCallback(
    (newTheme: ThemeName) => {
      setThemeState(newTheme)
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme)
      }
    },
    [storageKey]
  )

  // Apply theme to document
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const currentTheme = themes[theme]

    // DUAL SYSTEM: Generate BOTH --theme-* AND --asakaa-color-* variables
    // This ensures compatibility during migration from old to new system

    // 1. Generate --theme-* variables (legacy compatibility)
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--theme-${camelToKebab(key)}`, value)
      }
    })

    // 2. Generate --asakaa-color-* variables (new system - following tokens.css naming)
    const colorMap: Record<string, string> = {
      // Background
      bgPrimary: '--asakaa-color-background-primary',
      bgSecondary: '--asakaa-color-background-secondary',
      bgTertiary: '--asakaa-color-background-tertiary',
      bgCard: '--asakaa-color-background-card',
      bgHover: '--asakaa-color-background-hover',
      bgActive: '--asakaa-color-background-active',
      bgInput: '--asakaa-color-background-input',

      // Text
      textPrimary: '--asakaa-color-text-primary',
      textSecondary: '--asakaa-color-text-secondary',
      textTertiary: '--asakaa-color-text-tertiary',
      textDisabled: '--asakaa-color-text-disabled',
      textInverse: '--asakaa-color-text-inverse',

      // Border
      borderPrimary: '--asakaa-color-border-primary',
      borderSecondary: '--asakaa-color-border-secondary',
      borderDefault: '--asakaa-color-border-default',
      borderHover: '--asakaa-color-border-hover',
      borderSubtle: '--asakaa-color-border-subtle',

      // Interactive
      accentPrimary: '--asakaa-color-accent-primary',
      accentHover: '--asakaa-color-accent-hover',
      interactivePrimary: '--asakaa-color-interactive-primary',
      interactivePrimaryHover: '--asakaa-color-interactive-primaryHover',
      interactivePrimaryBorder: '--asakaa-color-interactive-primaryBorder',
      interactivePrimaryBackground: '--asakaa-color-interactive-primaryBackground',
      interactivePrimaryBackgroundHover: '--asakaa-color-interactive-primaryBackgroundHover',

      // Status & Danger
      success: '--asakaa-color-status-success',
      warning: '--asakaa-color-status-warning',
      error: '--asakaa-color-status-error',
      info: '--asakaa-color-status-info',
      danger: '--asakaa-color-danger',
      dangerBorder: '--asakaa-color-danger-border',
      dangerBackground: '--asakaa-color-danger-background',
      dangerBackgroundHover: '--asakaa-color-danger-backgroundHover',
    }

    Object.entries(colorMap).forEach(([themeKey, cssVar]) => {
      const value = currentTheme.colors[themeKey as keyof typeof currentTheme.colors]
      if (value) {
        root.style.setProperty(cssVar, value)
      }
    })

    // 3. Set data-theme attribute for CSS selectors
    root.setAttribute('data-theme', theme)

    // 4. Set class for backward compatibility
    root.classList.remove('theme-dark', 'theme-light', 'theme-neutral')
    root.classList.add(`theme-${theme}`)
  }, [theme])

  const value: ThemeContextValue = {
    theme,
    setTheme,
    themes,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

/**
 * Utility: Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
