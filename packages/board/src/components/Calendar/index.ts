/**
 * CalendarBoard Component Exports
 * @version 0.17.0
 */

// Main component
export { CalendarBoard } from './CalendarBoard';
export { CalendarBoard as default } from './CalendarBoard';

// Types
export type {
  CalendarBoardProps,
  CalendarConfig,
  CalendarCallbacks,
  CalendarPermissions,
  CalendarTheme,
  CalendarTranslations,
  CalendarEvent,
  CalendarDay,
  CalendarViewMode,
  WeekDay,
} from './types';

// Themes
export {
  calendarThemes,
  darkTheme as calendarDarkTheme,
  lightTheme as calendarLightTheme,
  neutralTheme as calendarNeutralTheme,
  getCalendarTheme,
} from './themes';
export type { CalendarThemeName } from './themes';

// i18n
export {
  calendarTranslations,
  en as calendarEnTranslations,
  es as calendarEsTranslations,
  getCalendarTranslations,
  mergeCalendarTranslations,
  getMonthNames,
  getWeekdayNames,
} from './i18n';
export type { CalendarSupportedLocale } from './i18n';
