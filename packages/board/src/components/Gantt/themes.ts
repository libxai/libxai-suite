import { GanttTheme } from './types';

export const themes: Record<string, GanttTheme> = {
  dark: {
    // Backgrounds — Chronos V2: Ultra-dark base
    bgPrimary: '#050505',
    bgSecondary: '#0A0A0A',
    bgGrid: 'rgba(255, 255, 255, 0.02)',
    bgWeekend: 'rgba(17, 17, 17, 0.4)',

    // Borders — Chronos V2: Subtle glass borders
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',

    // Text — Chronos V2: Unified with drawer tokens
    textPrimary: 'rgba(255, 255, 255, 0.92)',
    textSecondary: 'rgba(255, 255, 255, 0.60)',
    textTertiary: 'rgba(255, 255, 255, 0.35)',

    // Accent & Interactive — Chronos Blue (#2E94FF)
    accent: '#2E94FF',
    accentHover: '#5AADFF',
    accentLight: 'rgba(46, 148, 255, 0.12)',

    // Task Elements — Chronos blue execution bars
    taskBarPrimary: '#2E94FF',
    taskBarProgress: '#5AADFF',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path — Softer Tailwind red
    dependency: '#444444',
    dependencyHover: '#FFFFFF',
    criticalPath: '#EF4444',
    criticalPathLight: 'rgba(239, 68, 68, 0.15)',

    // Special Elements — Softer red today marker
    today: '#EF4444',
    todayLight: 'rgba(239, 68, 68, 0.08)',
    milestone: '#FFFFFF',
    milestoneLight: 'rgba(255, 255, 255, 0.1)',

    // Status Colors
    statusTodo: '#666666',
    statusInProgress: '#2E94FF',
    statusCompleted: '#10B981',

    // Hover & Focus States
    hoverBg: 'rgba(255, 255, 255, 0.04)',
    focusRing: '#2E94FF',

    // Chronos V2 additions
    dotGrid: 'rgba(255, 255, 255, 0.05)',
    glassHeader: '#0A0A0A',
    glassToolbar: 'rgba(0, 0, 0, 0.4)',
    forecastHud: 'rgba(15, 15, 15, 0.9)',
    neonRedGlow: '0 0 8px rgba(239, 68, 68, 0.25)',
    executionBarBg: 'rgba(46, 148, 255, 0.12)',
  },
  
  light: {
    // Backgrounds
    // v0.17.71: Improved contrast and visual breathing
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F8FAFC',  // Slate 50 - subtle contrast
    bgGrid: '#F1F5F9',  // Slate 100 - more visible zebra stripes
    bgWeekend: 'rgba(37, 99, 235, 0.03)',

    // Borders - v0.17.71: More visible separation
    border: '#CBD5E1',  // Slate 300 - stronger column dividers
    borderLight: '#E2E8F0',  // Slate 200

    // Text - v0.17.71: Enhanced hierarchy
    textPrimary: '#0F172A',  // Slate 900 - darkest for phases
    textSecondary: '#334155',  // Slate 700 - for child tasks
    textTertiary: '#64748B',  // Slate 500 - for metadata

    // Accent & Interactive
    accent: '#2E94FF',
    accentHover: '#1D4ED8',
    accentLight: 'rgba(37, 99, 235, 0.08)',

    // Task Elements
    taskBarPrimary: '#2E94FF',
    taskBarProgress: '#1E40AF',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    // v0.17.361: Solid colors for better visibility
    dependency: '#6B7280',
    dependencyHover: '#2E94FF',  // v0.17.450: Bright blue hover for better visibility
    criticalPath: '#DC2626',
    criticalPathLight: 'rgba(220, 38, 38, 0.1)',

    // Special Elements - v0.17.180: Exact ClickUp "Today" line color
    today: '#D21E24',  // Exact ClickUp red
    todayLight: 'rgba(210, 30, 36, 0.1)',
    milestone: '#F59E0B',
    milestoneLight: 'rgba(245, 158, 11, 0.08)',

    // Status Colors
    statusTodo: '#64748B',  // Slate 500
    statusInProgress: '#2E94FF',
    statusCompleted: '#059669',

    // Hover & Focus States
    hoverBg: 'rgba(0, 0, 0, 0.04)',
    focusRing: '#2E94FF',

    // Chronos V2 additions (light-mode equivalents)
    dotGrid: 'rgba(0, 0, 0, 0.04)',
    glassHeader: '#F8FAFC',
    glassToolbar: 'rgba(255, 255, 255, 0.85)',
    forecastHud: 'rgba(248, 250, 252, 0.95)',
    neonRedGlow: '0 0 10px rgba(220, 38, 38, 0.3)',
    executionBarBg: 'rgba(37, 99, 235, 0.28)',
  },

  neutral: {
    // Backgrounds
    // v0.17.71: Improved contrast and visual breathing
    bgPrimary: '#FAFAF9',
    bgSecondary: '#F5F5F4',
    bgGrid: '#EFEDEC',  // v0.17.71: More visible zebra stripes
    bgWeekend: 'rgba(41, 37, 36, 0.02)',

    // Borders - v0.17.71: More visible separation
    border: '#D6D3D1',  // Stone 300 - visible column dividers
    borderLight: '#E7E5E4',  // Stone 200

    // Text - v0.17.71: Enhanced hierarchy
    textPrimary: '#0C0A09',  // Stone 950 - maximum contrast for phases
    textSecondary: '#44403C',  // Stone 700 - for child tasks
    textTertiary: '#78716C',  // Stone 500 - for metadata

    // Accent & Interactive
    accent: '#292524',
    accentHover: '#44403C',
    accentLight: 'rgba(41, 37, 36, 0.08)',

    // Task Elements
    taskBarPrimary: '#292524',
    taskBarProgress: '#1C1917',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    // v0.17.361: Solid colors for better visibility
    dependency: '#78716C',
    dependencyHover: '#A8A29E',  // v0.17.450: Lighter stone hover for better visibility
    criticalPath: '#44403C',  // Dark gray instead of red - monochromatic
    criticalPathLight: 'rgba(68, 64, 60, 0.08)',

    // Special Elements - v0.17.71: Darker "Today" line for zen mode
    today: '#1C1917',  // Black - maintains monochrome philosophy
    todayLight: 'rgba(28, 25, 23, 0.06)',
    milestone: '#57534E',  // Medium gray - no yellow
    milestoneLight: 'rgba(87, 83, 78, 0.08)',

    // Status Colors
    statusTodo: '#78716C',  // Stone 500
    statusInProgress: '#292524',
    statusCompleted: '#15803D',

    // Hover & Focus States
    hoverBg: 'rgba(0, 0, 0, 0.035)',
    focusRing: '#292524',

    // Chronos V2 additions (neutral-mode equivalents)
    dotGrid: 'rgba(0, 0, 0, 0.03)',
    glassHeader: '#F5F5F4',
    glassToolbar: 'rgba(250, 250, 249, 0.85)',
    forecastHud: 'rgba(245, 245, 244, 0.95)',
    neonRedGlow: '0 0 10px rgba(68, 64, 60, 0.3)',
    executionBarBg: 'rgba(41, 37, 36, 0.25)',
  },
};