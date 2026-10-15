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

/** QA Asakaa (mejora 2.1): ¿el Gantt está en español? Para fechas y textos que no viven en `i18n`. */
export function useGanttEnEspanol(): boolean {
  const t = useContext(GanttI18nContext);
  /* QA Asakaa 2.6.2 · sin proveedor (p. ej. TaskFormModal abierto desde la app, fuera del
     Gantt) el contexto es el inglés por defecto aunque la app esté en español: entonces
     manda el idioma de la página, que la app fija en <html lang>. */
  if (t === en && typeof document !== 'undefined') return document.documentElement.lang?.startsWith('es') ?? false;
  return t.toolbar.visibility === 'Visibilidad';
}
