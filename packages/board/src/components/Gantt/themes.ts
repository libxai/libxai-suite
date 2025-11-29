import { GanttTheme } from './types';

export const themes: Record<string, GanttTheme> = {
  dark: {
    // Backgrounds
    // v0.14.7: Reduced zebra stripe contrast for more sophisticated look
    bgPrimary: '#1A1D21',
    bgSecondary: '#23272E',
    bgGrid: '#1C1F24',  // Reduced contrast from #1E2228
    bgWeekend: 'rgba(59, 130, 246, 0.02)',

    // Borders
    border: '#2D3139',
    borderLight: '#26292F',

    // Text
    textPrimary: '#F5F5F7',
    textSecondary: '#B4B9C5',
    textTertiary: '#7C8394',

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

    // Special Elements
    today: '#EF4444',
    todayLight: 'rgba(239, 68, 68, 0.08)',
    milestone: '#F59E0B',
    milestoneLight: 'rgba(245, 158, 11, 0.1)',

    // Status Colors
    statusTodo: '#7C8394',
    statusInProgress: '#3B82F6',
    statusCompleted: '#10B981',

    // Hover & Focus States
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    focusRing: '#3B82F6',
  },
  
  light: {
    // Backgrounds
    // v0.14.7: Reduced zebra stripe contrast for more sophisticated look
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9FAFB',
    bgGrid: '#FDFEFE',  // Reduced contrast from #FCFCFD
    bgWeekend: 'rgba(37, 99, 235, 0.02)',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F0F1F3',

    // Text
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',

    // Accent & Interactive
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentLight: 'rgba(37, 99, 235, 0.08)',

    // Task Elements
    taskBarPrimary: '#2563EB',
    taskBarProgress: '#1E40AF',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    dependency: 'rgba(75, 85, 99, 0.2)',
    dependencyHover: 'rgba(75, 85, 99, 0.4)',
    criticalPath: '#DC2626',
    criticalPathLight: 'rgba(220, 38, 38, 0.1)',

    // Special Elements - "Today" uses accent color (blue) instead of red
    today: '#2563EB',  // Accent blue - reserved red for overdue/at-risk states
    todayLight: 'rgba(37, 99, 235, 0.08)',
    milestone: '#F59E0B',
    milestoneLight: 'rgba(245, 158, 11, 0.08)',
    
    // Status Colors
    statusTodo: '#9CA3AF',
    statusInProgress: '#2563EB',
    statusCompleted: '#059669',
    
    // Hover & Focus States
    hoverBg: 'rgba(0, 0, 0, 0.03)',
    focusRing: '#2563EB',
  },
  
  neutral: {
    // Backgrounds
    // v0.14.7: Reduced zebra stripe contrast for more sophisticated look
    bgPrimary: '#FAFAF9',
    bgSecondary: '#F5F5F4',
    bgGrid: '#FBFBFA',  // Reduced contrast from #FEFEFE
    bgWeekend: 'rgba(41, 37, 36, 0.015)',

    // Borders
    border: '#E7E5E4',
    borderLight: '#F0EFEE',

    // Text
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textTertiary: '#A8A29E',

    // Accent & Interactive
    accent: '#292524',
    accentHover: '#44403C',
    accentLight: 'rgba(41, 37, 36, 0.06)',

    // Task Elements
    taskBarPrimary: '#292524',
    taskBarProgress: '#1C1917',
    taskBarHandle: '#FFFFFF',

    // Dependencies & Critical Path
    dependency: 'rgba(87, 83, 78, 0.2)',
    dependencyHover: 'rgba(87, 83, 78, 0.35)',
    criticalPath: '#44403C',  // Dark gray instead of red - monochromatic
    criticalPathLight: 'rgba(68, 64, 60, 0.08)',

    // Special Elements - Zen mode: PURE monochrome, NO color
    today: '#1C1917',  // Black - maintains monochrome philosophy
    todayLight: 'rgba(28, 25, 23, 0.04)',
    milestone: '#57534E',  // Medium gray - no yellow
    milestoneLight: 'rgba(87, 83, 78, 0.06)',
    
    // Status Colors
    statusTodo: '#A8A29E',
    statusInProgress: '#292524',
    statusCompleted: '#15803D',
    
    // Hover & Focus States
    hoverBg: 'rgba(0, 0, 0, 0.025)',
    focusRing: '#292524',
  },
};