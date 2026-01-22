/**
 * Internationalization (i18n) system for GanttBoard
 * @version 0.15.0
 *
 * Supports English (en) and Spanish (es) out of the box.
 * Users can provide custom translations via the `locale` config prop.
 */

export type SupportedLocale = 'en' | 'es';

export interface GanttTranslations {
  // Column headers
  columns: {
    taskName: string;
    startDate: string;
    endDate: string;
    duration: string;
    assignees: string;
    status: string;
    progress: string;
    priority: string; // v0.17.29
  };

  // Toolbar
  toolbar: {
    today: string;
    day: string;
    week: string;
    month: string;
    export: string;
    exportPdf: string;
    exportPng: string;
    exportCsv: string;
    exportExcel: string;
    exportMsProject: string;
    undo: string;
    redo: string;
    createTask: string;
    // v0.16.0: Density dropdown
    density: string;
    compact: string;
    normal: string;
    spacious: string;
    // v0.17.300: Task filter
    filterAll: string;
    filterIncomplete: string;
    filterInProgress: string;
    filterCompleted: string;
    // v0.17.320: Filter dropdown enhancements
    filter: string;
    filterBy: string;
    filterAllDesc: string;
    filterIncompleteDesc: string;
    filterInProgressDesc: string;
    filterCompletedDesc: string;
    clearFilter: string;
    // v0.18.0: Hide completed toggle
    hideCompleted: string;
    toDo: string;
  };

  // v0.16.0: Context menu labels (right-click menu)
  contextMenu: {
    editTask: string;
    addSubtask: string;
    markIncomplete: string;
    setInProgress: string;
    markComplete: string;
    duplicateTask: string;
    splitTask: string;
    deleteTask: string;
  };

  // Task actions (context menu)
  actions: {
    edit: string;
    delete: string;
    duplicate: string;
    addSubtask: string;
    indent: string;
    outdent: string;
    moveUp: string;
    moveDown: string;
    splitTask: string;
    linkTasks: string;
    unlinkTasks: string;
  };

  // Status labels
  status: {
    todo: string;
    inProgress: string;
    completed: string;
  };

  // Tooltips and labels
  labels: {
    progress: string;
    duration: string;
    days: string;
    day: string;
    assigned: string;
    milestone: string;
    criticalPath: string;
    subtask: string;
    task: string;
    noTasks: string;
    addTask: string;
    newTask: string;
    loading: string;
    error: string;
    today: string;
    week: string; // v0.17.400: "Week" prefix for timeline headers
    clickToSetDates: string; // v0.17.400: Placeholder for tasks without dates
  };

  // AI Assistant
  ai: {
    placeholder: string;
    thinking: string;
    suggestions: {
      moveTask: string;
      extendTask: string;
      renameTask: string;
      setProgress: string;
      linkTasks: string;
      createTask: string;
      deleteTask: string;
      assignTask: string;
    };
    errors: {
      taskNotFound: string;
      invalidDate: string;
      invalidDuration: string;
      invalidProgress: string;
      unknownCommand: string;
      processingError: string;
    };
  };

  // Export
  export: {
    projectName: string;
    ganttTasks: string;
    taskId: string;
    taskName: string;
    startDate: string;
    endDate: string;
    isMilestone: string;
    parentId: string;
    yes: string;
    no: string;
    noTasksToExport: string;
  };

  // Date formats (for display)
  dateFormat: {
    short: string; // e.g., 'MM/dd' or 'dd/MM'
    medium: string; // e.g., 'MMM d' or 'd MMM'
    long: string; // e.g., 'MMMM d, yyyy' or 'd de MMMM de yyyy'
  };
}

/**
 * English translations (default)
 */
export const en: GanttTranslations = {
  columns: {
    taskName: 'TASK NAME',
    startDate: 'Start Date',
    endDate: 'End Date',
    duration: 'Duration',
    assignees: 'Assignees',
    status: 'Status',
    progress: '% Complete',
    priority: 'Priority', // v0.17.29
  },

  toolbar: {
    today: 'Today',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    export: 'Export',
    exportPdf: 'Export to PDF',
    exportPng: 'Export to PNG',
    exportCsv: 'Export to CSV',
    exportExcel: 'Export to Excel',
    exportMsProject: 'Export to MS Project',
    undo: 'Undo',
    redo: 'Redo',
    createTask: 'New Task',
    // v0.16.0: Density dropdown
    density: 'Row Density',
    compact: 'Compact',
    normal: 'Normal',
    spacious: 'Spacious',
    // v0.17.300: Task filter
    filterAll: 'All',
    filterIncomplete: 'Incomplete',
    filterInProgress: 'In Progress',
    filterCompleted: 'Completed',
    // v0.17.320: Filter dropdown enhancements
    filter: 'Filters',
    filterBy: 'FILTER BY STATUS',
    filterAllDesc: 'Show all tasks',
    filterIncompleteDesc: 'Hide completed tasks',
    filterInProgressDesc: 'Tasks currently being worked on',
    filterCompletedDesc: 'Only show finished tasks',
    clearFilter: 'Clear filter',
    // v0.18.0: Hide completed toggle
    hideCompleted: 'Hide Completed Tasks',
    toDo: 'To Do / Pending',
  },

  // v0.16.0: Context menu labels (right-click menu)
  contextMenu: {
    editTask: 'Edit Task',
    addSubtask: 'Add Subtask',
    markIncomplete: 'Mark Incomplete',
    setInProgress: 'Set In Progress',
    markComplete: 'Mark Complete',
    duplicateTask: 'Duplicate Task',
    splitTask: 'Split Task',
    deleteTask: 'Delete Task',
  },

  actions: {
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    addSubtask: 'Add Subtask',
    indent: 'Indent',
    outdent: 'Outdent',
    moveUp: 'Move Up',
    moveDown: 'Move Down',
    splitTask: 'Split Task',
    linkTasks: 'Link Tasks',
    unlinkTasks: 'Unlink Tasks',
  },

  status: {
    todo: 'To Do',
    inProgress: 'In Progress',
    completed: 'Completed',
  },

  labels: {
    progress: 'Progress',
    duration: 'Duration',
    days: 'days',
    day: 'day',
    assigned: 'Assigned',
    milestone: 'Milestone',
    criticalPath: 'Critical Path',
    subtask: 'Subtask',
    task: 'Task',
    noTasks: 'No tasks yet',
    addTask: 'Add task',
    newTask: 'New Task',
    loading: 'Loading...',
    error: 'Error',
    today: 'Today',
    week: 'Week', // v0.17.400
    clickToSetDates: 'Click to set dates...', // v0.17.400
  },

  ai: {
    placeholder: 'Ask AI to edit tasks... (e.g., "Move Design to next week")',
    thinking: 'Thinking...',
    suggestions: {
      moveTask: 'Move "Task Name" to next Monday',
      extendTask: 'Extend "Task Name" by 3 days',
      renameTask: 'Rename "Old Name" to "New Name"',
      setProgress: 'Set "Task Name" progress to 50%',
      linkTasks: 'Link "Task A" to "Task B"',
      createTask: 'Create a new task called "New Task"',
      deleteTask: 'Delete "Task Name"',
      assignTask: 'Assign John to "Task Name"',
    },
    errors: {
      taskNotFound: 'Task not found',
      invalidDate: 'Invalid date',
      invalidDuration: 'Invalid duration',
      invalidProgress: 'Invalid progress value',
      unknownCommand: 'Unknown command',
      processingError: 'Error processing command',
    },
  },

  export: {
    projectName: 'Gantt Project',
    ganttTasks: 'Gantt Tasks',
    taskId: 'Task ID',
    taskName: 'Task Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    isMilestone: 'Is Milestone',
    parentId: 'Parent ID',
    yes: 'Yes',
    no: 'No',
    noTasksToExport: 'No tasks available to export',
  },

  dateFormat: {
    short: 'MM/dd',
    medium: 'MMM d',
    long: 'MMMM d, yyyy',
  },
};

/**
 * Spanish translations
 */
export const es: GanttTranslations = {
  columns: {
    taskName: 'NOMBRE DE TAREA',
    startDate: 'Fecha Inicio',
    endDate: 'Fecha Fin',
    duration: 'Duración',
    assignees: 'Asignados',
    status: 'Estado',
    progress: '% Completado',
    priority: 'Prioridad', // v0.17.29
  },

  toolbar: {
    today: 'Hoy',
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    export: 'Exportar',
    exportPdf: 'Exportar a PDF',
    exportPng: 'Exportar a PNG',
    exportCsv: 'Exportar a CSV',
    exportExcel: 'Exportar a Excel',
    exportMsProject: 'Exportar a MS Project',
    undo: 'Deshacer',
    redo: 'Rehacer',
    createTask: 'Nueva Tarea',
    // v0.16.0: Density dropdown
    density: 'Densidad',
    compact: 'Compacto',
    normal: 'Normal',
    spacious: 'Espacioso',
    // v0.17.300: Task filter
    filterAll: 'Todas',
    filterIncomplete: 'Sin completar',
    filterInProgress: 'En progreso',
    filterCompleted: 'Completadas',
    // v0.17.320: Filter dropdown enhancements
    filter: 'Filtros',
    filterBy: 'FILTRAR POR ESTADO',
    filterAllDesc: 'Mostrar todas las tareas',
    filterIncompleteDesc: 'Ocultar tareas completadas',
    filterInProgressDesc: 'Tareas en las que se está trabajando',
    filterCompletedDesc: 'Solo mostrar tareas terminadas',
    clearFilter: 'Limpiar filtro',
    // v0.18.0: Hide completed toggle
    hideCompleted: 'Ocultar Tareas Completadas',
    toDo: 'Por Hacer / Pendiente',
  },

  // v0.16.0: Context menu labels (right-click menu)
  contextMenu: {
    editTask: 'Editar Tarea',
    addSubtask: 'Agregar Subtarea',
    markIncomplete: 'Marcar Incompleta',
    setInProgress: 'Marcar En Progreso',
    markComplete: 'Marcar Completada',
    duplicateTask: 'Duplicar Tarea',
    splitTask: 'Dividir Tarea',
    deleteTask: 'Eliminar Tarea',
  },

  actions: {
    edit: 'Editar',
    delete: 'Eliminar',
    duplicate: 'Duplicar',
    addSubtask: 'Agregar Subtarea',
    indent: 'Aumentar Nivel',
    outdent: 'Disminuir Nivel',
    moveUp: 'Mover Arriba',
    moveDown: 'Mover Abajo',
    splitTask: 'Dividir Tarea',
    linkTasks: 'Vincular Tareas',
    unlinkTasks: 'Desvincular Tareas',
  },

  status: {
    todo: 'Por Hacer',
    inProgress: 'En Progreso',
    completed: 'Completado',
  },

  labels: {
    progress: 'Progreso',
    duration: 'Duración',
    days: 'días',
    day: 'día',
    assigned: 'Asignado',
    milestone: 'Hito',
    criticalPath: 'Ruta Crítica',
    subtask: 'Subtarea',
    task: 'Tarea',
    noTasks: 'Sin tareas aún',
    addTask: 'Agregar tarea',
    newTask: 'Nueva Tarea',
    loading: 'Cargando...',
    error: 'Error',
    today: 'Hoy',
    week: 'Semana', // v0.17.400
    clickToSetDates: 'Clic para establecer fechas...', // v0.17.400
  },

  ai: {
    placeholder: 'Pídele a la IA que edite tareas... (ej: "Mover Diseño a la próxima semana")',
    thinking: 'Pensando...',
    suggestions: {
      moveTask: 'Mover "Nombre de Tarea" al próximo lunes',
      extendTask: 'Extender "Nombre de Tarea" por 3 días',
      renameTask: 'Renombrar "Nombre Anterior" a "Nombre Nuevo"',
      setProgress: 'Establecer progreso de "Nombre de Tarea" al 50%',
      linkTasks: 'Vincular "Tarea A" con "Tarea B"',
      createTask: 'Crear una nueva tarea llamada "Nueva Tarea"',
      deleteTask: 'Eliminar "Nombre de Tarea"',
      assignTask: 'Asignar a Juan a "Nombre de Tarea"',
    },
    errors: {
      taskNotFound: 'Tarea no encontrada',
      invalidDate: 'Fecha inválida',
      invalidDuration: 'Duración inválida',
      invalidProgress: 'Valor de progreso inválido',
      unknownCommand: 'Comando desconocido',
      processingError: 'Error procesando el comando',
    },
  },

  export: {
    projectName: 'Proyecto Gantt',
    ganttTasks: 'Tareas Gantt',
    taskId: 'ID de Tarea',
    taskName: 'Nombre de Tarea',
    startDate: 'Fecha Inicio',
    endDate: 'Fecha Fin',
    isMilestone: 'Es Hito',
    parentId: 'ID Padre',
    yes: 'Sí',
    no: 'No',
    noTasksToExport: 'No hay tareas disponibles para exportar',
  },

  dateFormat: {
    short: 'dd/MM',
    medium: 'd MMM',
    long: 'd de MMMM de yyyy',
  },
};

/**
 * All available translations
 */
export const translations: Record<SupportedLocale, GanttTranslations> = {
  en,
  es,
};

/**
 * Get translations for a specific locale
 * Falls back to English if locale is not found
 */
export function getTranslations(locale: SupportedLocale | string): GanttTranslations {
  return translations[locale as SupportedLocale] || translations.en;
}

/**
 * Merge custom translations with default translations
 * Allows partial overrides while keeping defaults for missing keys
 */
export function mergeTranslations(
  locale: SupportedLocale | string,
  customTranslations?: Partial<GanttTranslations>
): GanttTranslations {
  const base = getTranslations(locale);

  if (!customTranslations) {
    return base;
  }

  return {
    columns: { ...base.columns, ...customTranslations.columns },
    toolbar: { ...base.toolbar, ...customTranslations.toolbar },
    contextMenu: { ...base.contextMenu, ...customTranslations.contextMenu }, // v0.16.0
    actions: { ...base.actions, ...customTranslations.actions },
    status: { ...base.status, ...customTranslations.status },
    labels: { ...base.labels, ...customTranslations.labels },
    ai: {
      ...base.ai,
      ...customTranslations.ai,
      suggestions: { ...base.ai.suggestions, ...customTranslations.ai?.suggestions },
      errors: { ...base.ai.errors, ...customTranslations.ai?.errors },
    },
    export: { ...base.export, ...customTranslations.export },
    dateFormat: { ...base.dateFormat, ...customTranslations.dateFormat },
  };
}
