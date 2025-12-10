/**
 * GanttI18nContext - Provides translations to all Gantt components
 * @version 0.15.0
 */

import { createContext, useContext } from 'react';
import { GanttTranslations, en } from './i18n';

/**
 * Context for Gantt internationalization
 * Default value is English translations
 */
export const GanttI18nContext = createContext<GanttTranslations>(en);

/**
 * Hook to access translations in Gantt components
 * @returns The current translations object
 *
 * @example
 * ```tsx
 * function MyGanttComponent() {
 *   const t = useGanttI18n();
 *   return <button>{t.toolbar.createTask}</button>;
 * }
 * ```
 */
export function useGanttI18n(): GanttTranslations {
  return useContext(GanttI18nContext);
}
