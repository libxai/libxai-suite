/**
 * Internationalization (i18n) for CalendarBoard
 * @version 0.17.0
 */

import type { CalendarTranslations } from './types';

export type CalendarSupportedLocale = 'en' | 'es';

/**
 * English translations
 */
export const en: CalendarTranslations = {
  navigation: {
    today: 'Today',
    previous: 'Previous',
    next: 'Next',
    month: 'Month',
    week: 'Week',
    day: 'Day',
  },

  weekdays: {
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
  },

  weekdaysFull: {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  },

  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
  },

  status: {
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',
  },

  labels: {
    allDay: 'All day',
    moreEvents: '+{count} more',
    noEvents: 'No tasks',
    newTask: 'New Task',
    viewAll: 'View all',
    week: 'Week',
  },

  tooltips: {
    progress: 'Progress',
    status: 'Status',
    assignees: 'Assignees',
    duration: 'Duration',
    days: 'days',
  },
};

/**
 * Spanish translations
 */
export const es: CalendarTranslations = {
  navigation: {
    today: 'Hoy',
    previous: 'Anterior',
    next: 'Siguiente',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
  },

  weekdays: {
    sun: 'Dom',
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mié',
    thu: 'Jue',
    fri: 'Vie',
    sat: 'Sáb',
  },

  weekdaysFull: {
    sunday: 'Domingo',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
  },

  months: {
    january: 'Enero',
    february: 'Febrero',
    march: 'Marzo',
    april: 'Abril',
    may: 'Mayo',
    june: 'Junio',
    july: 'Julio',
    august: 'Agosto',
    september: 'Septiembre',
    october: 'Octubre',
    november: 'Noviembre',
    december: 'Diciembre',
  },

  status: {
    todo: 'Por Hacer',
    inProgress: 'En Progreso',
    completed: 'Completado',
  },

  labels: {
    allDay: 'Todo el día',
    moreEvents: '+{count} más',
    noEvents: 'Sin tareas',
    newTask: 'Nueva Tarea',
    viewAll: 'Ver todo',
    week: 'Semana',
  },

  tooltips: {
    progress: 'Progreso',
    status: 'Estado',
    assignees: 'Asignados',
    duration: 'Duración',
    days: 'días',
  },
};

/**
 * All available translations
 */
export const calendarTranslations: Record<CalendarSupportedLocale, CalendarTranslations> = {
  en,
  es,
};

/**
 * Get translations for a specific locale
 */
export function getCalendarTranslations(locale: CalendarSupportedLocale | string): CalendarTranslations {
  return calendarTranslations[locale as CalendarSupportedLocale] || calendarTranslations.en;
}

/**
 * Merge custom translations with default translations
 */
export function mergeCalendarTranslations(
  locale: CalendarSupportedLocale | string,
  customTranslations?: Partial<CalendarTranslations>
): CalendarTranslations {
  const base = getCalendarTranslations(locale);

  if (!customTranslations) {
    return base;
  }

  return {
    navigation: { ...base.navigation, ...customTranslations.navigation },
    weekdays: { ...base.weekdays, ...customTranslations.weekdays },
    weekdaysFull: { ...base.weekdaysFull, ...customTranslations.weekdaysFull },
    months: { ...base.months, ...customTranslations.months },
    status: { ...base.status, ...customTranslations.status },
    labels: { ...base.labels, ...customTranslations.labels },
    tooltips: { ...base.tooltips, ...customTranslations.tooltips },
  };
}

/**
 * Get month names array based on locale
 */
export function getMonthNames(locale: CalendarSupportedLocale | string): string[] {
  const t = getCalendarTranslations(locale);
  return [
    t.months.january,
    t.months.february,
    t.months.march,
    t.months.april,
    t.months.may,
    t.months.june,
    t.months.july,
    t.months.august,
    t.months.september,
    t.months.october,
    t.months.november,
    t.months.december,
  ];
}

/**
 * Get weekday names array based on locale and first day of week
 */
export function getWeekdayNames(
  locale: CalendarSupportedLocale | string,
  firstDayOfWeek: number = 0,
  short: boolean = true
): string[] {
  const t = getCalendarTranslations(locale);
  const weekdays = short
    ? [t.weekdays.sun, t.weekdays.mon, t.weekdays.tue, t.weekdays.wed, t.weekdays.thu, t.weekdays.fri, t.weekdays.sat]
    : [
        t.weekdaysFull.sunday,
        t.weekdaysFull.monday,
        t.weekdaysFull.tuesday,
        t.weekdaysFull.wednesday,
        t.weekdaysFull.thursday,
        t.weekdaysFull.friday,
        t.weekdaysFull.saturday,
      ];

  // Rotate array to start from firstDayOfWeek
  return [...weekdays.slice(firstDayOfWeek), ...weekdays.slice(0, firstDayOfWeek)];
}
