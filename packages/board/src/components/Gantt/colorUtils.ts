/**
 * Color utility functions for Gantt chart
 * Provides consistent color transformations for task bars
 */

/**
 * Project phase color system
 * Automatically categorizes tasks by phase using keyword detection
 */

export type ProjectPhase = 'planning' | 'design' | 'development' | 'testing' | 'deployment' | 'default';

export interface PhaseColorScheme {
  base: string;        // Main color for task bar
  light: string;       // Lighter shade for gradients
  dark: string;        // Darker shade for progress
  accent: string;      // Border/text accent
}

/**
 * Phase-based color palette (professional, accessible)
 */
export const PHASE_COLORS: Record<ProjectPhase, PhaseColorScheme> = {
  planning: {
    base: '#8B5CF6',     // Purple-500 - Planning/Strategy
    light: '#A78BFA',    // Purple-400
    dark: '#7C3AED',     // Purple-600
    accent: '#6D28D9',   // Purple-700
  },
  design: {
    base: '#3B82F6',     // Blue-500 - Design/UX
    light: '#60A5FA',    // Blue-400
    dark: '#2563EB',     // Blue-600
    accent: '#1D4ED8',   // Blue-700
  },
  development: {
    base: '#10B981',     // Green-500 - Development/Build
    light: '#34D399',    // Green-400
    dark: '#059669',     // Green-600
    accent: '#047857',   // Green-700
  },
  testing: {
    base: '#F59E0B',     // Amber-500 - Testing/QA
    light: '#FBBF24',    // Amber-400
    dark: '#D97706',     // Amber-600
    accent: '#B45309',   // Amber-700
  },
  deployment: {
    base: '#EF4444',     // Red-500 - Deployment/Launch
    light: '#F87171',    // Red-400
    dark: '#DC2626',     // Red-600
    accent: '#B91C1C',   // Red-700
  },
  default: {
    base: '#6B7280',     // Gray-500 - Default/Other
    light: '#9CA3AF',    // Gray-400
    dark: '#4B5563',     // Gray-600
    accent: '#374151',   // Gray-700
  },
};

/**
 * Detect project phase from task name
 * Uses keyword matching for automatic categorization
 */
export function detectProjectPhase(taskName: string): ProjectPhase {
  const name = taskName.toLowerCase();

  // Planning keywords
  if (name.includes('plan') || name.includes('scope') || name.includes('strategy') ||
      name.includes('research') || name.includes('discovery') || name.includes('roadmap')) {
    return 'planning';
  }

  // Design keywords
  if (name.includes('design') || name.includes('ui') || name.includes('ux') ||
      name.includes('mockup') || name.includes('wireframe') || name.includes('prototype')) {
    return 'design';
  }

  // Development keywords
  if (name.includes('develop') || name.includes('code') || name.includes('implement') ||
      name.includes('build') || name.includes('feature') || name.includes('api') ||
      name.includes('backend') || name.includes('frontend')) {
    return 'development';
  }

  // Testing keywords
  if (name.includes('test') || name.includes('qa') || name.includes('review') ||
      name.includes('debug') || name.includes('fix') || name.includes('validation')) {
    return 'testing';
  }

  // Deployment keywords
  if (name.includes('deploy') || name.includes('launch') || name.includes('release') ||
      name.includes('publish') || name.includes('production')) {
    return 'deployment';
  }

  return 'default';
}

/**
 * Get phase colors for a task (with health status override)
 * Health status (at-risk, off-track) takes precedence over phase colors
 */
export function getPhaseColors(
  taskName: string,
  healthStatus: 'on-track' | 'at-risk' | 'off-track'
): PhaseColorScheme {
  // Health status overrides phase colors for critical tasks
  if (healthStatus === 'off-track') {
    return {
      base: '#EF4444',    // Red-500
      light: '#F87171',   // Red-400
      dark: '#DC2626',    // Red-600
      accent: '#B91C1C',  // Red-700
    };
  }

  if (healthStatus === 'at-risk') {
    return {
      base: '#F59E0B',    // Amber-500
      light: '#FBBF24',   // Amber-400
      dark: '#D97706',    // Amber-600
      accent: '#B45309',  // Amber-700
    };
  }

  // On-track: use phase-based colors
  const phase = detectProjectPhase(taskName);
  return PHASE_COLORS[phase];
}

/**
 * Helper to convert number to hex
 */
const toHex = (n: number): string => {
  const hex = Math.min(255, Math.max(0, Math.round(n))).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
};

/**
 * Lightens a hex color by a specified percentage
 * Used for gradients to create lighter top shade
 * @param hex - Hex color string (e.g., '#667EEA' or '667EEA')
 * @param percent - Percentage to lighten (0-100, default: 15)
 * @returns Lightened hex color
 */
export function lightenColor(hex: string, percent: number = 15): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB components
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Calculate lightening amount
  const amount = percent / 100;

  // Apply lightening (move towards 255)
  const newR = r + (255 - r) * amount;
  const newG = g + (255 - g) * amount;
  const newB = b + (255 - b) * amount;

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Darkens a hex color by a specified percentage
 * Used for progress bars to show darker shade of base color
 * @param hex - Hex color string (e.g., '#667EEA' or '667EEA')
 * @param percent - Percentage to darken (0-100, default: 20)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, percent: number = 20): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB components
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Calculate darkening factor
  const factor = 1 - (percent / 100);

  // Apply darkening
  const newR = r * factor;
  const newG = g * factor;
  const newB = b * factor;

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Get appropriate color for critical path tasks
 * Critical path uses RED border, NOT red fill
 * Fill color should still be theme-based
 * @param baseColor - Base color from theme
 * @returns Object with border and fill colors
 */
export function getCriticalPathColors(baseColor: string): {
  borderColor: string;
  fillColor: string;
} {
  return {
    borderColor: '#DC2626', // Red border for critical path
    fillColor: baseColor,   // Keep theme color for fill
  };
}

/**
 * Get progress bar color based on task state
 * Never uses red for progress - red is reserved for "at risk" state
 * @param baseColor - Base task color from theme
 * @param isCriticalPath - Whether task is on critical path
 * @returns Darker shade of base color for progress
 */
export function getProgressColor(baseColor: string, isCriticalPath: boolean = false): string {
  // Progress is ALWAYS darker shade of base color
  // Even for critical path tasks (red is only for border, not progress)
  return darkenColor(baseColor, 25);
}

/**
 * Project health status types for task timeline tracking
 */
export type HealthStatus = 'on-track' | 'at-risk' | 'off-track';

export interface HealthColors {
  fill: string;
  border: string;
  progress: string;
}

/**
 * Calculate project health status based on timeline and progress
 *
 * Algorithm:
 * 1. OFF-TRACK: Task is overdue (past end date) AND incomplete (progress < 100%)
 * 2. AT-RISK: Task is behind schedule (progress < expected progress by 10% threshold)
 * 3. ON-TRACK: Task is on schedule or ahead
 *
 * @param startDate - Task start date
 * @param endDate - Task end date
 * @param progress - Current progress (0-100)
 * @param isParentTask - Whether this is a parent task (ignores 100% completion rule)
 * @returns Health status: 'on-track' | 'at-risk' | 'off-track'
 */
export function calculateHealthStatus(
  startDate: Date | null,
  endDate: Date | null,
  progress: number,
  isParentTask: boolean = false
): HealthStatus {
  // If no dates, default to on-track
  if (!startDate || !endDate) return 'on-track';

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // If task is complete, always on-track
  // EXCEPT for parent tasks - they should reflect their children's health
  if (progress >= 100 && !isParentTask) return 'on-track';

  // OFF-TRACK: Past end date and not complete
  if (now > end) {
    return 'off-track';
  }

  // Calculate expected progress based on time elapsed
  const totalDuration = end.getTime() - start.getTime();
  const elapsedTime = now.getTime() - start.getTime();
  const expectedProgress = Math.max(0, Math.min(100, (elapsedTime / totalDuration) * 100));

  // AT-RISK: Progress is significantly behind schedule (10% threshold)
  // Example: If 50% of time has passed, but only 30% complete → at-risk
  if (progress < expectedProgress - 10) {
    return 'at-risk';
  }

  // ON-TRACK: Progress is on schedule or ahead
  return 'on-track';
}

/**
 * Get colors for a task based on health status
 * Color system: Blue (on-track) → Yellow (at-risk) → Red (off-track)
 *
 * @param health - Health status
 * @param themeAccent - Accent color from theme (for on-track)
 * @param isCriticalPath - Whether task is on critical path
 * @returns Colors for fill, border, and progress
 */
export function getHealthColors(
  health: HealthStatus,
  themeAccent: string,
  isCriticalPath: boolean = false
): HealthColors {
  // Critical path always gets red border, regardless of health
  if (isCriticalPath) {
    let fillColor = themeAccent;
    if (health === 'off-track') fillColor = '#EF4444'; // Red-500
    else if (health === 'at-risk') fillColor = '#F59E0B'; // Amber-500

    return {
      fill: fillColor,
      border: '#DC2626', // Red-600 for critical path
      progress: darkenColor(fillColor, 30),
    };
  }

  // Non-critical path: Health-based colors
  switch (health) {
    case 'off-track':
      return {
        fill: '#EF4444',    // Red-500
        border: '#DC2626',  // Red-600
        progress: darkenColor('#EF4444', 30),
      };
    case 'at-risk':
      return {
        fill: '#F59E0B',    // Amber-500 (Yellow/Orange)
        border: '#D97706',  // Amber-600
        progress: darkenColor('#F59E0B', 30),
      };
    case 'on-track':
    default:
      return {
        fill: themeAccent,  // Theme accent color (Blue)
        border: themeAccent,
        progress: darkenColor(themeAccent, 30),
      };
  }
}
