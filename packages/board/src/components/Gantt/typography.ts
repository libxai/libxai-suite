/**
 * Professional Typography System for Gantt Chart
 * Inspired by: ClickUp, Linear, Notion, Figma
 *
 * Design Principles:
 * - Inter font family (industry standard for UI)
 * - Precise weight hierarchy: 400 (regular), 500 (medium), 600 (semibold)
 * - Optimized letter-spacing for readability
 * - Line heights: 1.2 (headings), 1.5 (body text)
 * - Consistent sizing scale based on 4px grid
 */

export interface TypographyStyle {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  fontFamily: string;
}

export interface TypographySystem {
  // Task hierarchy levels
  parentL0: TypographyStyle;      // Top-level parent tasks (e.g., "Project Planning Phase")
  parentL1: TypographyStyle;      // Second-level parent tasks
  taskRegular: TypographyStyle;   // Regular child tasks
  taskSmall: TypographyStyle;     // Deep nested tasks (L3+)

  // UI elements
  columnHeader: TypographyStyle;  // Grid column headers
  dateLabel: TypographyStyle;     // Timeline date labels
  caption: TypographyStyle;       // Small labels, tooltips
  percentage: TypographyStyle;    // Progress percentages
  badge: TypographyStyle;         // Badges (subtask counters, critical path)

  // Milestone
  milestone: TypographyStyle;     // Milestone labels
}

/**
 * Professional Typography Tokens
 * ClickUp/Linear Standard: Inter font with precise weights
 */
export const typography: TypographySystem = {
  // ========================================
  // TASK HIERARCHY (Left Panel)
  // ========================================

  // L0 Parent: Top-level containers (e.g., "Q4 Planning")
  // Visual weight: Bold, prominent
  parentL0: {
    fontSize: '14px',
    fontWeight: 600,          // Semibold
    lineHeight: 1.4,
    letterSpacing: '-0.01em', // Tighter for headings
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // L1 Parent: Second-level containers (e.g., "Phase 1: Requirements")
  // Visual weight: Medium-bold
  parentL1: {
    fontSize: '13px',
    fontWeight: 500,          // Medium
    lineHeight: 1.4,
    letterSpacing: '0em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Regular Task: Main work items
  // Visual weight: Regular, readable
  taskRegular: {
    fontSize: '13px',
    fontWeight: 400,          // Regular
    lineHeight: 1.5,          // Better readability
    letterSpacing: '0em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Small Task: Deep nested tasks (L3+)
  // Visual weight: Light, de-emphasized
  taskSmall: {
    fontSize: '12px',
    fontWeight: 400,          // Regular
    lineHeight: 1.5,
    letterSpacing: '0.01em',  // Slightly wider for small text
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // ========================================
  // UI ELEMENTS
  // ========================================

  // Column Headers (e.g., "Task Name", "Start Date")
  columnHeader: {
    fontSize: '11px',
    fontWeight: 600,          // Semibold
    lineHeight: 1.4,
    letterSpacing: '0.02em',  // Wider for uppercase
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Timeline Date Labels (e.g., "Nov 2025", "Week 45")
  dateLabel: {
    fontSize: '11px',
    fontWeight: 500,          // Medium
    lineHeight: 1.4,
    letterSpacing: '0em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Captions & Tooltips (e.g., "3 days remaining")
  caption: {
    fontSize: '11px',
    fontWeight: 400,          // Regular
    lineHeight: 1.4,
    letterSpacing: '0.01em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Progress Percentages (e.g., "45%" inside task bar)
  percentage: {
    fontSize: '10px',
    fontWeight: 600,          // Semibold (bold for legibility on colored bg)
    lineHeight: 1,
    letterSpacing: '0em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Badges (e.g., "3/5", "CRITICAL")
  badge: {
    fontSize: '10px',
    fontWeight: 600,          // Semibold
    lineHeight: 1,
    letterSpacing: '0.03em',  // Wide for uppercase badges
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Milestone Labels
  milestone: {
    fontSize: '12px',
    fontWeight: 600,          // Semibold
    lineHeight: 1.3,
    letterSpacing: '0em',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

/**
 * Helper function to convert TypographyStyle to inline style object
 * Usage: <text {...getTypographyStyle(typography.taskRegular)} />
 */
export function getTypographyStyle(style: TypographyStyle): React.CSSProperties {
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    fontFamily: style.fontFamily,
  };
}

/**
 * Helper function to get typography for task based on hierarchy level
 * @param level - Hierarchy level (0 = root, 1 = L1 parent, 2+ = children)
 * @param isParent - Whether task has subtasks
 */
export function getTaskTypography(level: number, isParent: boolean): TypographyStyle {
  if (isParent) {
    if (level === 0) return typography.parentL0;
    if (level === 1) return typography.parentL1;
    return typography.taskRegular; // L2+ parents use regular
  }

  // Child tasks
  if (level >= 3) return typography.taskSmall;
  return typography.taskRegular;
}

/**
 * Get SVG text props for a typography style
 * SVG text elements don't support all CSS properties, so we need to map them
 */
export function getSVGTextProps(style: TypographyStyle): {
  fontSize: string;
  fontWeight: number;
  fontFamily: string;
  letterSpacing?: string;
} {
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontFamily: style.fontFamily,
    letterSpacing: style.letterSpacing !== '0em' ? style.letterSpacing : undefined,
  };
}
