/**
 * Design Tokens - Centralized design system tokens
 * @module tokens/design-tokens
 */

/**
 * Spacing tokens (in pixels)
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

/**
 * Border radius tokens (in pixels)
 */
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const

/**
 * Font size tokens (in pixels)
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const

/**
 * Font weight tokens
 */
export const fontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const

/**
 * Line height tokens
 */
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const

/**
 * Z-index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const

/**
 * Transition durations (in milliseconds)
 */
export const duration = {
  instant: 0,
  fastest: 75,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
} as const

/**
 * Transition timing functions
 */
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom cubic-bezier
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

/**
 * Shadow tokens
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const

/**
 * Opacity tokens
 */
export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  80: 0.8,
  90: 0.9,
  100: 1,
} as const

/**
 * Kanban-specific tokens
 */
export const kanban = {
  column: {
    width: 320,
    minWidth: 280,
    maxWidth: 400,
    gap: 16,
    padding: 12,
    headerHeight: 48,
  },
  card: {
    minHeight: 80,
    maxHeight: 400,
    padding: 12,
    gap: 8,
  },
  board: {
    padding: 16,
    gap: 16,
  },
} as const

/**
 * Gantt-specific tokens
 */
export const gantt = {
  timeline: {
    headerHeight: 60,
    rowHeight: 44,
    minRowHeight: 32,
    maxRowHeight: 80,
    taskPadding: 4,
    gridLineWidth: 1,
  },
  task: {
    height: 28,
    minHeight: 20,
    maxHeight: 40,
    borderRadius: 4,
    padding: 6,
  },
  dependency: {
    lineWidth: 2,
    arrowSize: 8,
  },
  scale: {
    day: {
      columnWidth: 40,
      minColumnWidth: 30,
      maxColumnWidth: 60,
    },
    week: {
      columnWidth: 80,
      minColumnWidth: 60,
      maxColumnWidth: 120,
    },
    month: {
      columnWidth: 120,
      minColumnWidth: 80,
      maxColumnWidth: 200,
    },
    quarter: {
      columnWidth: 200,
      minColumnWidth: 150,
      maxColumnWidth: 300,
    },
  },
  milestone: {
    size: 16,
    rotation: 45, // degrees
  },
} as const

/**
 * Combined design tokens
 */
export const designTokens = {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  zIndex,
  duration,
  easing,
  shadows,
  opacity,
  kanban,
  gantt,
} as const

/**
 * Type helpers
 */
export type SpacingToken = keyof typeof spacing
export type BorderRadiusToken = keyof typeof borderRadius
export type FontSizeToken = keyof typeof fontSize
export type FontWeightToken = keyof typeof fontWeight
export type LineHeightToken = keyof typeof lineHeight
export type ZIndexToken = keyof typeof zIndex
export type DurationToken = keyof typeof duration
export type EasingToken = keyof typeof easing
export type ShadowToken = keyof typeof shadows
export type OpacityToken = keyof typeof opacity

/**
 * Design token value types
 */
export type DesignTokens = typeof designTokens
export type TokenValue = string | number

/**
 * Utility to get token value with fallback
 */
export function getToken<T extends TokenValue>(
  tokens: Record<string, T>,
  key: string,
  fallback: T
): T {
  return tokens[key] ?? fallback
}
