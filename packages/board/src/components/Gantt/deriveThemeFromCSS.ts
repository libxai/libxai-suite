import { GanttTheme } from './types';
import { themes } from './themes';

/**
 * Deriva un objeto GanttTheme desde las variables CSS del ThemeProvider global.
 * Si no hay ThemeProvider, retorna el theme especificado o 'dark' por defecto.
 *
 * @param themeName - Nombre del tema ('dark' | 'light' | 'neutral')
 * @returns GanttTheme object con colores derivados de CSS variables
 */
export function deriveThemeFromCSS(themeName: 'dark' | 'light' | 'neutral' = 'dark'): GanttTheme {
  // Si estamos en SSR, retornar theme estático
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return themes[themeName] || themes.dark;
  }

  // Obtener valores computados de variables CSS
  const root = document.documentElement;
  const styles = getComputedStyle(root);

  // Helper para obtener variable CSS con fallback
  const getVar = (varName: string, fallback: string): string => {
    const value = styles.getPropertyValue(varName).trim();
    return value || fallback;
  };

  // Derivar theme desde variables CSS (sistema --theme-*)
  const derivedTheme: GanttTheme = {
    // Backgrounds
    bgPrimary: getVar('--theme-bg-primary', themes[themeName].bgPrimary),
    bgSecondary: getVar('--theme-bg-secondary', themes[themeName].bgSecondary),
    bgGrid: getVar('--theme-bg-card', themes[themeName].bgGrid),
    bgWeekend: getVar('--theme-bg-hover', themes[themeName].bgWeekend),

    // Borders
    border: getVar('--theme-border-primary', themes[themeName].border),
    borderLight: getVar('--theme-border-subtle', themes[themeName].borderLight),

    // Text
    textPrimary: getVar('--theme-text-primary', themes[themeName].textPrimary),
    textSecondary: getVar('--theme-text-secondary', themes[themeName].textSecondary),
    textTertiary: getVar('--theme-text-tertiary', themes[themeName].textTertiary),

    // Accent & Interactive
    accent: getVar('--theme-accent-primary', themes[themeName].accent),
    accentHover: getVar('--theme-accent-hover', themes[themeName].accentHover),
    accentLight: getVar('--theme-accent-primary', themes[themeName].accentLight), // usaremos opacity

    // Task Elements
    taskBarPrimary: getVar('--theme-accent-primary', themes[themeName].taskBarPrimary),
    taskBarProgress: getVar('--theme-accent-hover', themes[themeName].taskBarProgress),
    taskBarHandle: getVar('--theme-text-inverse', themes[themeName].taskBarHandle || '#FFFFFF'),

    // Dependencies & Critical Path
    dependency: getVar('--theme-border-secondary', themes[themeName].dependency),
    dependencyHover: getVar('--theme-border-secondary', themes[themeName].dependencyHover),
    criticalPath: getVar('--theme-error', themes[themeName].criticalPath),
    criticalPathLight: getVar('--theme-error', themes[themeName].criticalPathLight),

    // Special Elements - Theme-specific today indicator
    // Light: uses accent (blue), Neutral: uses text primary (black), Dark: custom
    today: themeName === 'light'
      ? getVar('--theme-accent-primary', themes[themeName].today)
      : themeName === 'neutral'
      ? getVar('--theme-text-primary', themes[themeName].today)
      : getVar('--theme-error', themes[themeName].today),
    todayLight: themeName === 'light'
      ? getVar('--theme-accent-primary', themes[themeName].todayLight)
      : themeName === 'neutral'
      ? getVar('--theme-text-primary', themes[themeName].todayLight)
      : getVar('--theme-error', themes[themeName].todayLight),
    milestone: getVar('--theme-warning', themes[themeName].milestone),
    milestoneLight: getVar('--theme-warning', themes[themeName].milestoneLight),

    // Status Colors
    statusTodo: getVar('--theme-text-tertiary', themes[themeName].statusTodo),
    statusInProgress: getVar('--theme-accent-primary', themes[themeName].statusInProgress),
    statusCompleted: getVar('--theme-success', themes[themeName].statusCompleted),

    // Hover & Focus States
    hoverBg: getVar('--theme-bg-hover', themes[themeName].hoverBg),
    focusRing: getVar('--theme-accent-primary', themes[themeName].focusRing),
  };

  return derivedTheme;
}
