/**
 * Kanban Theme Context
 * Provides theme information to Portal components within KanbanBoard
 */

import { createContext, useContext, type ReactNode } from 'react'

export interface KanbanThemeContextValue {
  themeName: 'dark' | 'light' | 'neutral'
}

export const KanbanThemeContext = createContext<KanbanThemeContextValue | null>(null)

export interface KanbanThemeProviderProps {
  children: ReactNode
  themeName: 'dark' | 'light' | 'neutral'
}

export function KanbanThemeProvider({ children, themeName }: KanbanThemeProviderProps) {
  return (
    <KanbanThemeContext.Provider value={{ themeName }}>
      {children}
    </KanbanThemeContext.Provider>
  )
}

export function useKanbanTheme(): KanbanThemeContextValue | null {
  return useContext(KanbanThemeContext)
}
