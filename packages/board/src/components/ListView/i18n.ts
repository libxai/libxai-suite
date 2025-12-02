/**
 * Internationalization (i18n) for ListView
 * @version 0.17.0
 */

import type { ListViewTranslations } from './types';

export type ListViewSupportedLocale = 'en' | 'es';

/**
 * English translations
 */
export const en: ListViewTranslations = {
  columns: {
    name: 'Task Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    progress: 'Progress',
    status: 'Status',
    assignees: 'Assignees',
    priority: 'Priority',
    actions: 'Actions',
  },

  toolbar: {
    search: 'Search',
    searchPlaceholder: 'Search tasks...',
    filter: 'Filter',
    clearFilters: 'Clear Filters',
    export: 'Export',
    columns: 'Columns',
    newTask: 'New Task',
  },

  filters: {
    status: 'Status',
    assignees: 'Assignees',
    dateRange: 'Date Range',
    showCompleted: 'Show Completed',
    all: 'All',
    none: 'None',
  },

  status: {
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',
  },

  actions: {
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    viewDetails: 'View Details',
  },

  empty: {
    noTasks: 'No tasks yet',
    noResults: 'No tasks match your filters',
    addFirstTask: 'Add your first task',
  },

  pagination: {
    showing: 'Showing',
    of: 'of',
    tasks: 'tasks',
    previous: 'Previous',
    next: 'Next',
  },

  bulk: {
    selected: 'selected',
    delete: 'Delete',
    move: 'Move to',
    assignTo: 'Assign to',
  },
};

/**
 * Spanish translations
 */
export const es: ListViewTranslations = {
  columns: {
    name: 'Nombre de Tarea',
    startDate: 'Fecha Inicio',
    endDate: 'Fecha Fin',
    progress: 'Progreso',
    status: 'Estado',
    assignees: 'Asignados',
    priority: 'Prioridad',
    actions: 'Acciones',
  },

  toolbar: {
    search: 'Buscar',
    searchPlaceholder: 'Buscar tareas...',
    filter: 'Filtrar',
    clearFilters: 'Limpiar Filtros',
    export: 'Exportar',
    columns: 'Columnas',
    newTask: 'Nueva Tarea',
  },

  filters: {
    status: 'Estado',
    assignees: 'Asignados',
    dateRange: 'Rango de Fechas',
    showCompleted: 'Mostrar Completadas',
    all: 'Todos',
    none: 'Ninguno',
  },

  status: {
    todo: 'Por Hacer',
    inProgress: 'En Progreso',
    completed: 'Completado',
  },

  actions: {
    edit: 'Editar',
    delete: 'Eliminar',
    duplicate: 'Duplicar',
    viewDetails: 'Ver Detalles',
  },

  empty: {
    noTasks: 'Sin tareas aún',
    noResults: 'Ninguna tarea coincide con los filtros',
    addFirstTask: 'Agrega tu primera tarea',
  },

  pagination: {
    showing: 'Mostrando',
    of: 'de',
    tasks: 'tareas',
    previous: 'Anterior',
    next: 'Siguiente',
  },

  bulk: {
    selected: 'seleccionadas',
    delete: 'Eliminar',
    move: 'Mover a',
    assignTo: 'Asignar a',
  },
};

/**
 * All available translations
 */
export const listViewTranslations: Record<ListViewSupportedLocale, ListViewTranslations> = {
  en,
  es,
};

/**
 * Get translations for a specific locale
 */
export function getListViewTranslations(locale: ListViewSupportedLocale | string): ListViewTranslations {
  return listViewTranslations[locale as ListViewSupportedLocale] || listViewTranslations.en;
}

/**
 * Merge custom translations with default translations
 */
export function mergeListViewTranslations(
  locale: ListViewSupportedLocale | string,
  customTranslations?: Partial<ListViewTranslations>
): ListViewTranslations {
  const base = getListViewTranslations(locale);

  if (!customTranslations) {
    return base;
  }

  return {
    columns: { ...base.columns, ...customTranslations.columns },
    toolbar: { ...base.toolbar, ...customTranslations.toolbar },
    filters: { ...base.filters, ...customTranslations.filters },
    status: { ...base.status, ...customTranslations.status },
    actions: { ...base.actions, ...customTranslations.actions },
    empty: { ...base.empty, ...customTranslations.empty },
    pagination: { ...base.pagination, ...customTranslations.pagination },
    bulk: { ...base.bulk, ...customTranslations.bulk },
  };
}
