/**
 * Design System Constants for Gantt Chart
 * Centralizes all spacing, sizing, and border radius values for consistency
 */

/**
 * Border Radius System (8pt grid)
 * - Small (4px): Badges, small interactive elements
 * - Medium (6px): Task bars, buttons, cards
 * - Large (8px): Modals, tooltips, dropdowns
 */
export const BORDER_RADIUS = {
  small: 4,   // Badges, handles
  medium: 6,  // Task bars, buttons
  large: 8,   // Tooltips, modals
} as const;

/**
 * Spacing System (8pt grid)
 * All spacing values should be multiples of 8 for visual harmony
 */
export const SPACING = {
  xs: 4,   // 0.5rem - Tight spacing (badges, icons)
  sm: 8,   // 1rem - Small spacing (gaps between elements)
  md: 16,  // 2rem - Medium spacing (section padding)
  lg: 24,  // 3rem - Large spacing (hierarchy indentation)
  xl: 32,  // 4rem - Extra large spacing
} as const;

/**
 * Padding System (8pt grid)
 * Consistent padding for different UI elements
 */
export const PADDING = {
  badge: { x: 6, y: 2 },           // Badges: 2px vertical, 6px horizontal
  cell: { x: 12, y: 8 },           // Grid cells: 8px vertical, 12px horizontal
  header: { x: 12, y: 0 },         // Headers: 12px horizontal
  button: { x: 12, y: 6 },         // Buttons: 6px vertical, 12px horizontal
} as const;

/**
 * Hierarchy Indentation
 * Consistent indentation for nested tasks (8pt grid)
 */
export const INDENT_SIZE = 24;  // 3rem - Hierarchy level indentation

/**
 * Row Heights
 */
export const ROW_HEIGHTS = {
  task: 32,      // Standard task row height
  header: 48,    // Timeline header height
} as const;

/**
 * Shadow System
 * Consistent drop-shadow values for depth hierarchy
 */
export const SHADOWS = {
  taskBar: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))',
  taskBarProgress: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))',
  summaryBar: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
  tooltip: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
} as const;
