/**
 * Theme Switcher Component
 * ASAKAA v0.5.0
 */

import { useTheme } from './ThemeProvider'
import type { ThemeName } from './types'
import './theme-switcher.css'

export interface ThemeSwitcherProps {
  /** Show labels for each theme */
  showLabels?: boolean
  /** Compact mode (icon-only) */
  compact?: boolean
  /** Custom class name */
  className?: string
}

// Theme Icon Components with explicit SVG
const ThemeIcon = ({ theme }: { theme: ThemeName }) => {
  switch (theme) {
    case 'dark':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 8.5C13.5 11.2614 11.2614 13.5 8.5 13.5C5.73858 13.5 3.5 11.2614 3.5 8.5C3.5 5.73858 5.73858 3.5 8.5 3.5C8.66667 3.5 8.83074 3.50926 8.99199 3.52734C8.10635 4.35233 7.5 5.53318 7.5 6.85C7.5 9.33579 9.49421 11.33 11.98 11.33C12.5933 11.33 13.1751 11.2075 13.7069 10.9844C13.5698 11.8951 13.2042 12.7349 12.6674 13.4367" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    case 'light':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 1V2M8 14V15M15 8H14M2 8H1M12.5 12.5L11.8 11.8M4.2 4.2L3.5 3.5M12.5 3.5L11.8 4.2M4.2 11.8L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    case 'neutral':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 8L8 8L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
  }
}

export function ThemeSwitcher({ showLabels = true, compact = false, className = '' }: ThemeSwitcherProps) {
  const { theme: currentTheme, setTheme, themes } = useTheme()

  return (
    <div className={`theme-switcher ${compact ? 'theme-switcher--compact' : ''} ${className}`}>
      {Object.entries(themes).map(([key, themeData]) => {
        const themeName = key as ThemeName
        const isActive = themeName === currentTheme

        return (
          <button
            key={themeName}
            onClick={() => setTheme(themeName)}
            className={`theme-switcher__button ${isActive ? 'theme-switcher__button--active' : ''}`}
            aria-label={`Switch to ${themeData.displayName} theme`}
            aria-pressed={isActive}
            title={themeData.displayName}
          >
            <span className="theme-switcher__icon" aria-hidden="true">
              <ThemeIcon theme={themeName} />
            </span>
            {showLabels && !compact && <span className="theme-switcher__label">{themeData.displayName}</span>}
          </button>
        )
      })}
    </div>
  )
}
