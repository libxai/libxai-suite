/**
 * Portal Component
 * Renders children outside the parent DOM hierarchy
 * Solves z-index stacking context issues
 */

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useGanttTheme } from '../Gantt/GanttThemeContext'

export interface PortalProps {
  children: ReactNode
  /** Element to portal into (defaults to document.body) */
  container?: HTMLElement
}

/**
 * Portal component that renders children at the root level
 * Perfect for modals, tooltips, dropdowns that need to escape stacking context
 * Automatically applies Gantt theme CSS variables when used within GanttBoard
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false)
  const ganttTheme = useGanttTheme()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) {
    return null
  }

  const target = container || (typeof document !== 'undefined' ? document.body : null)

  if (!target) {
    return null
  }

  // If we have a Gantt theme, wrap children in a themed container
  if (ganttTheme) {
    const { theme, themeName } = ganttTheme

    // Generate CSS variables from the theme
    const themeStyles: CSSProperties & Record<string, string> = {
      // Background variables
      '--asakaa-color-background-primary': theme.bgPrimary,
      '--asakaa-color-background-secondary': theme.bgSecondary,
      '--asakaa-color-background-card': theme.bgGrid,
      '--asakaa-color-background-hover': theme.hoverBg,

      // Text variables
      '--asakaa-color-text-primary': theme.textPrimary,
      '--asakaa-color-text-secondary': theme.textSecondary,
      '--asakaa-color-text-tertiary': theme.textTertiary,
      '--asakaa-color-text-inverse': theme.taskBarHandle || '#FFFFFF',

      // Border variables
      '--asakaa-color-border-default': theme.border,
      '--asakaa-color-border-hover': theme.borderLight,
      '--asakaa-color-border-subtle': theme.borderLight,

      // Interactive variables
      '--asakaa-color-interactive-primary': theme.accent,
      '--asakaa-color-interactive-primaryHover': theme.accentHover,
      '--asakaa-color-interactive-primaryBorder': `${theme.accent}4D`, // 30% opacity
      '--asakaa-color-interactive-primaryBackground': `${theme.accent}1A`, // 10% opacity
      '--asakaa-color-interactive-primaryBackgroundHover': `${theme.accent}33`, // 20% opacity

      // Status colors
      '--asakaa-color-status-success': theme.statusCompleted,
      '--asakaa-color-status-warning': theme.milestone,
      '--asakaa-color-status-error': theme.criticalPath,
      '--asakaa-color-danger': theme.criticalPath,
      '--asakaa-color-danger-border': `${theme.criticalPath}4D`,
      '--asakaa-color-danger-background': `${theme.criticalPath}14`,
      '--asakaa-color-danger-backgroundHover': `${theme.criticalPath}26`,
    }

    return createPortal(
      <div
        data-theme={themeName}
        data-gantt-portal="true"
        style={themeStyles}
      >
        {children}
      </div>,
      target
    )
  }

  return createPortal(children, target)
}
