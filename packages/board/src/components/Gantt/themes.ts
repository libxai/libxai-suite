import { GanttTheme } from './types';

export const themes: Record<string, GanttTheme> = {
  dark: {
    // Backgrounds
    // v0.17.71: Improved contrast - sidebar darker, main area brighter
    bgPrimary: '#1A1D21',
    bgSecondary: '#22262D',  // Slightly lighter for better card contrast
    bgGrid: '#1E2126',  // v0.17.71: More visible zebra stripes
    bgWeekend: 'rgba(59, 130, 246, 0.03)',

    // Borders - v0.17.71: More visible separation
    border: '#334155',  // Brighter border for better column separation
    borderLight: '#2D3139',

    // Text - v0.17.71: Enhanced hierarchy
    textPrimary: '#FFFFFF',  // Pure white for maximum brightness (Phases)
    textSecondary: '#CBD5E1',  // Slate 300 - for child tasks
    textTertiary: '#64748B',  // Slate 500 - for metadata

    // Accent & Interactive - Electric Blue brand color
    accent: '#3B82F6',
    accentHover: '#60A5FA',
    accentLight: 'rgba(59, 130, 246, 0.12)',

    // Task Elements - Electric Blue brand color
    taskBarPrimary: '#3B82F6',
    taskBarProgress: '#2563EB',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    dependency: 'rgba(180, 185, 197, 0.25)',
    dependencyHover: 'rgba(180, 185, 197, 0.45)',
    criticalPath: '#EF4444',
    criticalPathLight: 'rgba(239, 68, 68, 0.12)',

    // Special Elements - v0.17.178: Red "Today" line like ClickUp
    today: '#EF4444',  // Red 500 - prominent like ClickUp
    todayLight: 'rgba(239, 68, 68, 0.12)',
    milestone: '#F59E0B',
    milestoneLight: 'rgba(245, 158, 11, 0.1)',

    // Status Colors
    statusTodo: '#64748B',  // Slate 500
    statusInProgress: '#3B82F6',
    statusCompleted: '#10B981',

    // Hover & Focus States
    hoverBg: 'rgba(255, 255, 255, 0.06)',
    focusRing: '#3B82F6',
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
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentLight: 'rgba(37, 99, 235, 0.08)',

    // Task Elements
    taskBarPrimary: '#2563EB',
    taskBarProgress: '#1E40AF',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    dependency: 'rgba(75, 85, 99, 0.25)',
    dependencyHover: 'rgba(75, 85, 99, 0.45)',
    criticalPath: '#DC2626',
    criticalPathLight: 'rgba(220, 38, 38, 0.1)',

    // Special Elements - v0.17.178: Red "Today" line like ClickUp
    today: '#DC2626',  // Red 600 - prominent like ClickUp
    todayLight: 'rgba(220, 38, 38, 0.1)',
    milestone: '#F59E0B',
    milestoneLight: 'rgba(245, 158, 11, 0.08)',

    // Status Colors
    statusTodo: '#64748B',  // Slate 500
    statusInProgress: '#2563EB',
    statusCompleted: '#059669',

    // Hover & Focus States
    hoverBg: 'rgba(0, 0, 0, 0.04)',
    focusRing: '#2563EB',
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
    dependency: 'rgba(87, 83, 78, 0.25)',
    dependencyHover: 'rgba(87, 83, 78, 0.4)',
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
  },
};