/**
 * Gantt Theme Context
 * Provides derived theme to Portal components for consistent styling
 * @module components/Gantt/GanttThemeContext
 */

import { createContext, useContext } from 'react'
import type { GanttTheme } from './types'

export interface GanttThemeContextValue {
  theme: GanttTheme
  themeName: 'dark' | 'light' | 'neutral'
}

export const GanttThemeContext = createContext<GanttThemeContextValue | null>(null)

/**
 * Hook to access the Gantt theme context
 * Returns null if not within a GanttBoard
 */
export function useGanttTheme() {
  return useContext(GanttThemeContext)
}
