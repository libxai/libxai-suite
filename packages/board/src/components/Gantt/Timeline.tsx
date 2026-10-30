import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { TimeScale, Task, GanttTemplates, DependentTaskPreview, DependencyLineStyle } from './types';
import { TaskBar, TaskTooltipData } from './TaskBar';
import { TaskTooltip, WorkingDaysConfig } from './TaskTooltip';
import { DependencyLine } from './DependencyLine';
import { Milestone } from './Milestone';
import { ganttUtils } from './ganttUtils';
import { calendarioDe, empujarSucesoras, enlacesDe, conflictosDelCronograma, habilesEntre } from './motorDeProgramacion';
import { anchoDelDia, ladoFueraDeVista } from './rangoDeLaEscala';

/** Mejora fuerte 5 · «CC +2», «FF», «+1»: el tipo (si no es FC) y el desfase (si no es 0). FC/CC/FF/CF en español. */
function etiquetaDelEnlace(tipo: 'FS' | 'SS' | 'FF' | 'SF', desfase: number, locale: string): string | undefined {
  const es = locale.startsWith('es');
  const nombre = tipo === 'FS' ? '' : es ? ({ SS: 'CC', FF: 'FF', SF: 'CF' } as const)[tipo] : tipo;
  const d = desfase === 0 ? '' : `${desfase > 0 ? '+' : '−'}${Math.abs(desfase)}`;
  const t = [nombre, d].filter(Boolean).join(' ');
  return t || undefined;
}
import { useGanttI18n } from './GanttI18nContext';

interface TimelineProps {
  /** Mejora fuerte 6 · la ventana visible (px) para marcar las barras fuera de vista, y adónde ir. */
  ventanaVisible?: { izq: number; der: number } | null;
  onIrAFecha?: (fecha: Date) => void;
  /** Mejora fuerte 6 · fin planeado del proyecto y fin previsto (pronóstico). */
  finPlaneado?: Date | null;
  finPrevisto?: Date | null;
  tasks: Task[];
  theme: any;
  rowHeight: number;
  timeScale: TimeScale;
  startDate: Date;
  endDate: Date;
  zoom: number;
  locale?: string; // v0.17.400: Locale for date formatting (e.g., 'en', 'es')
  templates: Required<GanttTemplates>; // v0.8.0
  dependencyLineStyle?: DependencyLineStyle; // v0.17.310: Dependency line style
  showTaskBarLabels?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskDblClick?: (task: Task) => void; // v0.8.0
  onTaskContextMenu?: (task: Task, event: React.MouseEvent) => void; // v0.8.0
  onTaskDateChange?: (task: Task, newStart: Date, newEnd: Date) => void;
  onDependencyCreate?: (fromTask: Task, toTaskId: string, tipo?: 'FS' | 'SS' | 'FF' | 'SF') => void;
  onDependencyDelete?: (taskId: string, dependencyId: string) => void;
  /** v3.0.0: Show baseline ghost bars behind actual bars (Oracle view) */
  showBaseline?: boolean;
  showCriticalPath?: boolean;
  showDependencies?: boolean;
  highlightWeekends?: boolean;
  /** 1.9.36 · 'range' pinta «Sep 1–7» en la escala W. */
  weekHeaderFormat?: 'number' | 'range';
  /** v4.1.0: Per-task edit check — returns false for read-only bars */
  canEditTask?: (task: Task) => boolean;
  /** v4.2.0: Committed on pointerup after dragging the progress edge of a task bar. */
  onTaskProgressDrag?: (task: Task, newProgress: number) => void;
  /** v4.3.0: Workspace working-day config for the tooltip Duration field. */
  workingDaysConfig?: WorkingDaysConfig;
  /** Gantt v6: la cabecera mide lo mismo que la de la tabla (60). */
  alturaCabecera?: number;
  /** Gantt v6 (Asakaa): escala, barras y marcas de la maqueta. */
  v6?: boolean;
  /** Gantt v6: alto de la barra según la densidad (18 · 22 · 26). */
  alturaBarra?: number;
}

export interface TaskPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function Timeline({
  tasks,
  theme,
  rowHeight: ROW_HEIGHT,
  timeScale,
  startDate,
  endDate,
  zoom,
  locale = 'en', // v0.17.400: Default to English
  templates,
  dependencyLineStyle = 'curved', // v0.17.310
  showTaskBarLabels = true,
  onTaskClick,
  onTaskDblClick, // v0.8.0
  onTaskContextMenu, // v0.8.0
  onTaskDateChange,
  onDependencyCreate,
  onDependencyDelete,
  showBaseline,
  showCriticalPath = true,
  showDependencies = true,
  highlightWeekends = true,
  weekHeaderFormat = 'number',
  canEditTask,
  onTaskProgressDrag,
  workingDaysConfig,
  ventanaVisible,
  onIrAFecha,
  finPlaneado,
  finPrevisto,
  alturaCabecera,
  v6 = false,
  alturaBarra,
}: TimelineProps) {
  const ALTO_BARRA = alturaBarra ?? 18; // Gantt v6: 18 · 22 · 26 según la densidad
  const HEADER_HEIGHT = alturaCabecera ?? 48; // Must match TaskGrid's HEADER_HEIGHT for alignment

  // v0.17.400: Get i18n translations
  const t = useGanttI18n();

  // v1.4.28: Ref to content SVG for viewport-aware tooltip positioning
  const contentSvgRef = useRef<SVGSVGElement>(null);
  /* P2 · el alto del contenedor que desplaza el cronograma (para que la cuadrícula llegue hasta abajo) */
  const [altoDelVisor, setAltoDelVisor] = useState(0);
  useEffect(() => {
    const svg = contentSvgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return undefined;
    let el: HTMLElement | null = svg.parentElement;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    if (!el) return undefined;
    const visor = el;
    const medir = () => setAltoDelVisor(visor.clientHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(visor);
    return () => ro.disconnect();
  }, []);

  // v0.13.0: State for dependency cascade preview
  const [cascadePreviews, setCascadePreviews] = useState<DependentTaskPreview[]>([]);

  // v1.5.0: Track drag offset so dependency lines follow the dragged bar in real-time
  const [dragOffset, setDragOffset] = useState<{ taskId: string; daysDelta: number } | null>(null);

  // v0.17.76: State for active tooltip - rendered in top layer for proper z-order
  const [activeTooltip, setActiveTooltip] = useState<TaskTooltipData | null>(null);

  // v0.17.451: Track hovered dependency line for top-layer rendering
  const [hoveredDepLine, setHoveredDepLine] = useState<{
    key: string;
    fromId: string;
    toId: string;
    exitX: number;
    exitY: number;
    enterX: number;
    enterY: number;
    salidaPorInicio?: boolean;
    entradaPorFin?: boolean;
  } | null>(null);

  /* Mejora fuerte 5 · los enlaces que NO se cumplen (datos viejos, ediciones fuera del Gantt). Gantt ronda 2 (Yesid) ·
     P1-4 · en ÁMBAR y discontinuos, con su porqué en el tooltip: el rojo queda para lo vencido y para hoy. */
  const enlacesEnConflicto = useMemo(() => new Map(
    conflictosDelCronograma(tasks, calendarioDe(workingDaysConfig)).map((c) => [`${c.predecesora.id}>${c.sucesora.id}`, c] as const),
  ), [tasks, workingDaysConfig]);
  const porQueDelConflicto = (c: { sucesora: Task; predecesora: Task; enlace: { type?: string } }): string => {
    const f = (d?: Date | null) => d ? d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { day: 'numeric', month: 'short' }).replace('.', '') : '—';
    const tipo = c.enlace.type ?? 'FS';
    if (tipo === 'FS') {
      return locale === 'es'
        ? `Empieza ${f(c.sucesora.startDate)}, antes de que termine ${c.predecesora.name} (${f(c.predecesora.endDate)})`
        : `Starts ${f(c.sucesora.startDate)}, before ${c.predecesora.name} finishes (${f(c.predecesora.endDate)})`;
    }
    return locale === 'es'
      ? `No cumple su enlace ${tipo} con ${c.predecesora.name}`
      : `Does not meet its ${tipo} link with ${c.predecesora.name}`;
  };

  // v0.17.452: Ref to track if mouse is over a dependency line (for fast mouse movement fix)
  const isOverDependencyRef = useRef(false);

  // v0.17.452: Track deleted dependencies locally for instant UI feedback
  // Note: We don't clear this on tasks change - once deleted, it stays hidden
  // The Set will naturally become irrelevant as the dependency no longer exists in data
  const [deletedDeps, setDeletedDeps] = useState<Set<string>>(new Set());

  // v1.4.19: State for click-to-schedule indicator (ClickUp-style)
  // Tracks mouse position over empty task rows to show where the bar will be created
  const [scheduleIndicator, setScheduleIndicator] = useState<{
    taskId: string;
    x: number;
    y: number;
    date: Date;
  } | null>(null);

  // v0.17.452: Handler for SVG mouse move - clears hover if mouse moved off dependency lines
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // If we have a hovered line but mouse is not over a dependency element, clear it
    if (hoveredDepLine && !isOverDependencyRef.current) {
      // Check if the target or any parent has the dependency data attribute
      let target = e.target as Element | null;
      let isOverDep = false;
      while (target && target !== e.currentTarget) {
        if (target.getAttribute?.('data-dependency-line') === 'true' ||
            target.getAttribute?.('data-dependency-hover-overlay') === 'true') {
          isOverDep = true;
          break;
        }
        target = target.parentElement;
      }
      if (!isOverDep) {
        setHoveredDepLine(null);
      }
    }
  }, [hoveredDepLine]);

  // v0.17.76: Callback for TaskBar hover changes
  const handleTooltipChange = useCallback((tooltipData: TaskTooltipData | null) => {
    setActiveTooltip(tooltipData);
  }, []);

  // v0.17.363: calculateVerticalX removed - DependencyLine now handles its own routing

  // Calculate dimensions
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = anchoDelDia(timeScale); // mejora fuerte 6: la misma regla que GanttBoard
  const timelineWidth = totalDays * dayWidth * zoom;

  // Get week number - moved before useMemo
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  // Check if date is weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Holiday set (workspace-local 'YYYY-MM-DD') derived from workingDaysConfig.
  // Se usa para sombrear los festivos en gris igual que los fines de semana.
  const holidaySet = useMemo(() => {
    const raw = workingDaysConfig?.holidayDates;
    if (!raw) return null;
    return raw instanceof Set ? raw : new Set(raw);
  }, [workingDaysConfig?.holidayDates]);

  const isHoliday = (date: Date): boolean => {
    if (!holidaySet) return false;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidaySet.has(key);
  };

  /* Gantt v6 · la duración en días hábiles (los laborables del espacio menos sus festivos). */
  const calendarioV6 = useMemo(() => calendarioDe(workingDaysConfig ?? null), [workingDaysConfig]);
  const diasHabilesDe = (t: Task): number => (t.startDate && t.endDate ? habilesEntre(t.startDate, t.endDate, calendarioV6) : 0);

  // Convert pixel position to date
  const pixelToDate = useCallback((pixelX: number): Date => {
    const days = Math.round(pixelX / (dayWidth * zoom));
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }, [startDate, dayWidth, zoom]);

  // Handle click on timeline to create task bar for tasks without dates
  const handleTimelineClick = useCallback((e: React.MouseEvent<SVGRectElement>, task: Task) => {
    // Only create bar if task doesn't have dates (no existing bar)
    if (task.startDate && task.endDate) {
      return; // Task already has dates, do nothing
    }

    const svgElement = e.currentTarget.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // Calculate the clicked date
    const clickedDate = pixelToDate(svgPoint.x);

    // Create a 1-day task bar
    const endDate = new Date(clickedDate);
    endDate.setDate(endDate.getDate() + 1);

    // Clear the schedule indicator
    setScheduleIndicator(null);

    // Call the date change handler to create the task bar
    onTaskDateChange?.(task, clickedDate, endDate);
  }, [pixelToDate, onTaskDateChange]);

  // v1.4.19: Handle mouse move over empty task row to show schedule indicator
  const handleEmptyRowMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>, task: Task, rowIndex: number) => {
    const svgElement = e.currentTarget.ownerSVGElement;
    if (!svgElement) return;

    const point = svgElement.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse());

    // Calculate the date at cursor position
    const hoverDate = pixelToDate(svgPoint.x);

    // Calculate snapped X position (align to day grid)
    const days = Math.round(svgPoint.x / (dayWidth * zoom));
    const snappedX = days * dayWidth * zoom;

    setScheduleIndicator({
      taskId: task.id,
      x: snappedX,
      y: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
      date: hoverDate,
    });
  }, [pixelToDate, dayWidth, zoom, ROW_HEIGHT]);

  // v1.4.19: Handle mouse leave from empty task row
  const handleEmptyRowMouseLeave = useCallback(() => {
    setScheduleIndicator(null);
  }, []);

  // Calculate parent task dates from subtasks and flatten for rendering
  const flatTasks = useMemo(() => {
    // Helper function to calculate parent dates from subtasks (MS Project style)
    // v0.17.47: Parent tasks ALWAYS derive dates from subtasks (summary task behavior)
    // This is the standard behavior in professional project management tools
    const calculateParentDates = (tasks: Task[]): Task[] => {
      return tasks.map(task => {
        // If task has subtasks, calculate dates from them
        if (task.subtasks && task.subtasks.length > 0) {
          // First, recursively calculate dates for nested subtasks
          const updatedSubtasks = calculateParentDates(task.subtasks);

          // Filter subtasks that have dates
          const subtasksWithDates = updatedSubtasks.filter(st => st.startDate && st.endDate);

          /* QA Asakaa E18: «con ‹Ocultar completadas›, el grupo dice Inicio 18/05 y su
             barra arranca el 18 de agosto». Aquí llegan las hijas YA FILTRADAS; las
             fechas del padre ya vienen calculadas con TODAS (rollUpParentDates), que
             es lo que muestra la rejilla. Solo se recalculan si el padre no las trae. */
          const yaTraeFechas = !!(task.startDate && task.endDate);
          if (subtasksWithDates.length > 0 && !yaTraeFechas) {
            // Calculate earliest start and latest end from subtasks
            const startDates = subtasksWithDates.map(st => st.startDate!.getTime());
            const endDates = subtasksWithDates.map(st => st.endDate!.getTime());

            const earliestStart = new Date(Math.min(...startDates));
            const latestEnd = new Date(Math.max(...endDates));

            // v0.17.47: ALWAYS update parent dates from subtasks (MS Project summary task behavior)
            // Parent tasks are read-only containers - their dates are derived from children
            return {
              ...task,
              subtasks: updatedSubtasks,
              startDate: earliestStart,
              endDate: latestEnd,
            };
          }

          return { ...task, subtasks: updatedSubtasks };
        }

        return task;
      });
    };

    // Helper function to flatten tasks for rendering
    const flattenTasks = (tasks: Task[], result: Task[] = []): Task[] => {
      // Sort by position to maintain creation order
      const sortedTasks = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      for (const task of sortedTasks) {
        result.push(task);
        // Only include subtasks if parent is expanded (or if isExpanded is undefined, default to true)
        if (task.subtasks && task.subtasks.length > 0 && (task.isExpanded === undefined || task.isExpanded)) {
          flattenTasks(task.subtasks, result);
        }
      }
      return result;
    };

    // Apply parent date calculation before flattening
    const tasksWithCalculatedDates = calculateParentDates(tasks);
    const flattened = flattenTasks(tasksWithCalculatedDates);

    return flattened;
  }, [tasks]);

  // Calculate task position
  const getTaskPosition = useCallback((task: Task) => {
    // Return null position for tasks without dates
    if (!task.startDate || !task.endDate) {
      return { x: 0, width: 0 };
    }

    const taskStart = task.startDate.getTime();
    const taskEnd = task.endDate.getTime();
    const rangeStart = startDate.getTime();

    const daysFromStart = (taskStart - rangeStart) / (1000 * 60 * 60 * 24);
    // +1 so the end-date day is fully included (e.g. 16→28 feb = 13 columns, not 12)
    const duration = (taskEnd - taskStart) / (1000 * 60 * 60 * 24) + 1;

    const x = daysFromStart * dayWidth * zoom;
    // Minimum width: allow 1 day minimum, but ensure at least 40px for visibility
    const minWidth = Math.max(dayWidth * zoom, 40);
    const width = Math.max(duration * dayWidth * zoom, minWidth);

    return { x, width };
  }, [startDate, dayWidth, zoom]);

  // Build task positions map for collision detection
  // v0.13.7: Y positions no longer include HEADER_HEIGHT (header is now separate sticky element)
  const taskPositions = useMemo((): TaskPosition[] => {
    return flatTasks
      .filter(task => task.startDate && task.endDate) // Only include tasks with dates
      .map((task) => {
        const { x, width } = getTaskPosition(task);
        const actualIndex = flatTasks.findIndex(t => t.id === task.id);
        const y = actualIndex * ROW_HEIGHT + (ROW_HEIGHT - ALTO_BARRA) / 2; // v1.4.29: Centered for 18px bar (Gantt v6: su alto)
        return {
          id: task.id,
          x,
          y,
          width,
          height: 18, // v1.4.29: Slimmer elegant bars
        };
      });
  }, [flatTasks, getTaskPosition]);

  // v0.13.0: Handle drag move for dependency cascade preview
  // v1.5.0: Also store drag offset so dependency lines follow in real-time
  const handleTaskDragMove = useCallback((taskId: string, daysDelta: number, isDragging: boolean) => {
    if (!isDragging) {
      setCascadePreviews([]);
      setDragOffset(null);
      return;
    }

    // Store drag offset for dependency line adjustment
    setDragOffset({ taskId, daysDelta });

    if (daysDelta === 0) {
      setCascadePreviews([]);
      return;
    }

    /* Mejora fuerte 5 · la vista previa = lo que hará el motor al soltar: solo las sucesoras
       que dejan de cumplir su enlace, empujadas lo justo (antes: todas, el mismo número de días). */
    const arrastrada = ganttUtils.findTaskById(tasks, taskId);
    if (!arrastrada?.startDate || !arrastrada.endDate) { setCascadePreviews([]); return; }
    const correr = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() + daysDelta); return r; };
    const nuevaInicio = correr(arrastrada.startDate);
    const nuevaFin = correr(arrastrada.endDate);
    const conLaMovida = (lista: Task[]): Task[] => lista.map((t) => t.id === taskId
      ? { ...t, startDate: nuevaInicio, endDate: nuevaFin }
      : t.subtasks ? { ...t, subtasks: conLaMovida(t.subtasks) } : t);
    const empujadas = empujarSucesoras(conLaMovida(tasks), [taskId], calendarioDe(workingDaysConfig));
    const ms = 1000 * 60 * 60 * 24;
    const ancho = dayWidth * zoom;
    const previews = empujadas.flatMap((e) => {
      const rowIndex = flatTasks.findIndex((t) => t.id === e.id);
      const t = flatTasks[rowIndex];
      if (rowIndex === -1 || !t?.startDate) return [];
      return [{
        taskId: e.id,
        taskName: t.name,
        originalX: ((t.startDate.getTime() - startDate.getTime()) / ms) * ancho,
        previewX: ((e.startDate.getTime() - startDate.getTime()) / ms) * ancho,
        width: Math.max(((e.endDate.getTime() - e.startDate.getTime()) / ms) * ancho, ancho),
        y: HEADER_HEIGHT + rowIndex * ROW_HEIGHT + (ROW_HEIGHT - ALTO_BARRA) / 2,
        rowIndex,
        daysDelta: Math.round((e.startDate.getTime() - t.startDate.getTime()) / ms),
        color: t.color,
      }];
    });

    setCascadePreviews(previews);
  }, [tasks, flatTasks, startDate, dayWidth, zoom, ROW_HEIGHT, HEADER_HEIGHT, workingDaysConfig]);

  // v1.5.0: Get drag-adjusted position for dependency line endpoints
  // During drag, offsets the dragged task and its cascade dependents
  const getDragAdjustedPosition = useCallback((taskId: string, pos: { x: number; width: number }) => {
    if (!dragOffset) return pos;
    const scaledDayWidth = dayWidth * zoom;
    const pixelDelta = dragOffset.daysDelta * scaledDayWidth;

    // Dragged task — offset by daysDelta
    if (taskId === dragOffset.taskId) {
      return { x: pos.x + pixelDelta, width: pos.width };
    }

    // Dependent task with cascade preview — use preview position
    const preview = cascadePreviews.find(p => p.taskId === taskId);
    if (preview) {
      return { x: preview.previewX, width: preview.width };
    }

    return pos;
  }, [dragOffset, cascadePreviews, dayWidth, zoom]);

  // Generate timeline headers
  // v0.17.400: Use locale for date formatting (e.g., 'es' -> 'Dic 22', 'en' -> 'Dec 22')
  const headers = useMemo(() => {
    const result: Array<{ date: Date; label: string; x: number }> = [];
    const current = new Date(startDate);
    let index = 0;

    while (current <= endDate) {
      const daysFromStart =
        (current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const x = daysFromStart * dayWidth * zoom;

      if (timeScale === 'day') {
        result.push({
          date: new Date(current),
          label: current.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          x,
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === 'week') {
        const weekNum = getWeekNumber(current);
        result.push({
          date: new Date(current),
          /* Gantt ronda 2 (Yesid) · P2 · con la v6, «Sem 35 · 24–30 ago», como la escala Día (antes «Week 35» a secas) */
          label: v6
            ? (() => {
                const fin = new Date(current);
                fin.setDate(fin.getDate() + 6);
                const es = String(locale).startsWith('es');
                const mes = (d: Date) => d.toLocaleDateString(es ? 'es-CO' : 'en-US', { month: 'short' }).replace('.', '');
                const rango = es
                  ? (mes(current) === mes(fin) ? `${current.getDate()}–${fin.getDate()} ${mes(fin)}` : `${current.getDate()} ${mes(current)}–${fin.getDate()} ${mes(fin)}`)
                  : (mes(current) === mes(fin) ? `${mes(current)} ${current.getDate()}–${fin.getDate()}` : `${mes(current)} ${current.getDate()}–${mes(fin)} ${fin.getDate()}`);
                return `${es ? 'Sem' : 'Wk'} ${weekNum} · ${rango}`;
              })()
            : weekHeaderFormat === 'range'
            ? (() => {
                const fin = new Date(current);
                fin.setDate(fin.getDate() + 6);
                const mes = (d: Date) => d.toLocaleDateString(locale, { month: 'short' });
                return mes(current) === mes(fin)
                  ? `${mes(current)} ${current.getDate()}–${fin.getDate()}`
                  : `${mes(current)} ${current.getDate()}–${mes(fin)} ${fin.getDate()}`;
              })()
            : `${t.labels.week} ${weekNum}`,
          x,
        });
        current.setDate(current.getDate() + 7);
      } else {
        result.push({
          date: new Date(current),
          label: current.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
          x,
        });
        current.setMonth(current.getMonth() + 1);
      }
      index++;
    }

    return result;
  }, [startDate, endDate, timeScale, dayWidth, zoom, locale, t.labels.week, weekHeaderFormat, v6]);

  // Today position
  const todayX = useMemo(() => {
    const today = new Date();
    const daysFromStart = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysFromStart * dayWidth * zoom;
  }, [startDate, dayWidth, zoom]);

  /*
   * Gantt v6 (Asakaa) · la escala de la maqueta en D: arriba las semanas («17 – 23 ago  S34»),
   * abajo los días (letra + número); fines de semana sombreados, festivos rayados, el día del fin
   * previsto en un círculo y hoy en una píldora oscura.
   */
  const esV6Dia = v6 && timeScale === 'day';
  const anchoDia = dayWidth * zoom;
  const mismoDia = (a?: Date | null, b?: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const mesCorto = (d: Date) => d.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  const semanasV6 = useMemo(() => {
    if (!esV6Dia) return [] as Array<{ x: number; etiqueta: string; num: number }>;
    const r: Array<{ x: number; etiqueta: string; num: number }> = [];
    headers.forEach((h, i) => {
      const d = h.date;
      if (i !== 0 && d.getDay() !== 1) return; // empieza en lunes (o en el primer día pintado)
      const lunes = new Date(d); lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
      const etiqueta = lunes.getMonth() === domingo.getMonth()
        ? `${lunes.getDate()} – ${domingo.getDate()} ${mesCorto(domingo)}`
        : `${lunes.getDate()} ${mesCorto(lunes)} – ${domingo.getDate()} ${mesCorto(domingo)}`;
      r.push({ x: h.x, etiqueta, num: getWeekNumber(lunes) });
    });
    return r;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esV6Dia, headers, locale]);
  const LETRAS = locale === 'es' ? ['D', 'L', 'M', 'X', 'J', 'V', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const hoyV6 = new Date();
  const V6S = { texto: 'var(--v6-texto, #0E1114)', texto2: 'var(--v6-texto-2, #4D5761)', tenue: 'var(--v6-tenue, #5F6972)', borde: 'var(--v6-borde, #E2E5E9)', linea: 'var(--v6-linea, #EEF0F2)', tarjeta: 'var(--v6-tarjeta, #FFFFFF)' };

  // v0.13.7: Content height calculation (without header - header is now separate)
  /* Gantt ronda 2 (Yesid) · P2 · la cuadrícula (y la trama de fines de semana y festivos) llega hasta abajo de lo visible:
     con el mínimo fijo de 600 px se cortaba a media pantalla en una ventana alta y un proyecto con pocas tareas. */
  const contentHeight = Math.max(flatTasks.length * ROW_HEIGHT, 600 - HEADER_HEIGHT, altoDelVisor - HEADER_HEIGHT - 2);

  return (
    <div
      className="w-full flex flex-col"
      data-gantt-chart
      /* 1.9.36 · la escala visible, para que la app ajuste por CSS (rayado solo en D, etc.). */
      data-escala={timeScale}
      style={{ backgroundColor: theme.bgPrimary }}
    >
      {/* v0.13.7: Sticky Header - stays visible during vertical scroll */}
      {/* Chronos V2: Frosted glass header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: v6 ? V6S.tarjeta : (theme.glassHeader || theme.bgSecondary),
          flexShrink: 0,
          height: `${HEADER_HEIGHT}px`,
          borderBottom: v6 ? `1px solid ${V6S.borde}` : `1px solid ${theme.borderLight}`,
          boxSizing: 'border-box', // Border included in height
        }}
      >
        <svg
          width={Math.max(timelineWidth, 1000)}
          height={HEADER_HEIGHT - 1} // -1 for border
          style={{ display: 'block' }}
        >
          {/* Header Background — opaque to prevent task bars bleeding through */}
          <rect
            x={0}
            y={0}
            width={Math.max(timelineWidth, 1000)}
            height={HEADER_HEIGHT}
            fill={theme.glassHeader || theme.bgSecondary}
            style={v6 ? { fill: V6S.tarjeta } : undefined}
          />

          {esV6Dia && (
            <g data-escala-v6="dia">
              {semanasV6.map((sem, i) => (
                <g key={`sem-${i}`}>
                  {sem.x > 0 && <line x1={sem.x} y1={0} x2={sem.x} y2={HEADER_HEIGHT} style={{ stroke: V6S.borde }} strokeWidth={1} shapeRendering="crispEdges" />}
                  <text x={(() => { /* la semana partida por el borde visible lleva su rótulo pegado a ese borde */ const izq = ventanaVisible?.izq ?? 0; const sig = semanasV6[i + 1]?.x ?? Infinity; return sem.x < izq && izq + 140 < sig ? izq + 8 : sem.x + 8; })()} y={12} dominantBaseline="middle" style={{ fill: V6S.texto2, fontSize: 12, fontWeight: 500 }}>
                    {sem.etiqueta}
                    <tspan dx={7} style={{ fill: V6S.tenue, fontSize: 11, fontWeight: 400, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{`${locale === 'es' ? 'S' : 'W'}${sem.num}`}</tspan>
                  </text>
                </g>
              ))}
              <line x1={0} y1={24.5} x2={Math.max(timelineWidth, 1000)} y2={24.5} style={{ stroke: V6S.linea }} strokeWidth={1} />
              {headers.map((h, i) => {
                const cx = h.x + anchoDia / 2;
                const finde = isWeekend(h.date);
                const festivo = !finde && isHoliday(h.date);
                const esFin = mismoDia(h.date, finPrevisto);
                const esHoy = mismoDia(h.date, hoyV6);
                const num = String(h.date.getDate());
                return (
                  <g key={`dia-${i}`} data-dia-v6={festivo ? 'festivo' : finde ? 'finde' : undefined}>
                    {festivo && <title>{locale === 'es' ? 'Festivo' : 'Holiday'}</title>}
                    <text x={cx} y={24 + 11} textAnchor="middle" dominantBaseline="middle" style={{ fill: V6S.tenue, fontSize: 11 }}>{LETRAS[h.date.getDay()]}</text>
                    {esHoy && <rect x={cx - 12} y={24 + 17} width={24} height={17} rx={8.5} style={{ fill: 'var(--v6-hoy-fondo, #0E1114)' }} />}
                    {esFin && !esHoy && <rect x={cx - (num.length > 1 ? 11 : 8)} y={24 + 17.5} width={num.length > 1 ? 22 : 16} height={16} rx={8} style={{ fill: 'none', stroke: V6S.texto2 }} strokeWidth={1} />}
                    <text x={cx} y={24 + 26} textAnchor="middle" dominantBaseline="middle"
                      style={{ fill: esHoy ? 'var(--v6-hoy-texto, #FFFFFF)' : (finde || festivo) ? V6S.tenue : V6S.texto, fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {num}
                    </text>
                    {/* Gantt ronda 2 (Yesid) · P2 · el subrayado punteado del festivo, legible: en «1 2» gris tenue no se veía */}
                    {festivo && <line x1={cx - 7} y1={24 + 34} x2={cx + 7} y2={24 + 34} style={{ stroke: V6S.texto2 }} strokeWidth={1.25} strokeDasharray="2 2" data-subrayado-festivo />}
                  </g>
                );
              })}
            </g>
          )}

          {/* Header Grid Lines and Text */}
          {!esV6Dia && headers.map((header, index) => (
            <g key={`header-${index}`}>
              {/* Grid line in header - skip first line since TaskGrid border serves as divider */}
              {index > 0 && (
                <line
                  x1={header.x}
                  y1={0}
                  x2={header.x}
                  y2={HEADER_HEIGHT}
                  stroke={theme.border}
                  strokeWidth={1}
                  opacity={0.1}
                />
              )}

              {/* Header text - JetBrains Mono for technical/date display.
                  Los días festivos se resaltan en ámbar para distinguirlos. */}
              <text
                x={header.x + 8}
                y={HEADER_HEIGHT / 2}
                fill={timeScale === 'day' && !isWeekend(header.date) && isHoliday(header.date) ? '#F59E0B' : theme.textTertiary}
                fontSize="11"
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontWeight="500"
                dominantBaseline="middle"
              >
                {header.label}
              </text>
            </g>
          ))}

          {/* Today marker in header — Chronos V2: Badge instead of circle */}
          {!v6 && todayX >= 0 && todayX <= timelineWidth && (
            <g data-hoy="cabecera">
              {/* Neon glow circle */}
              <circle cx={todayX} cy={HEADER_HEIGHT - 10} r={4} fill={theme.today} opacity={1} />
              {theme.neonRedGlow && (
                <circle cx={todayX} cy={HEADER_HEIGHT - 10} r={6} fill="none" stroke={theme.today} strokeWidth={1} opacity={0.3} />
              )}
              {/* TODAY badge */}
              {theme.neonRedGlow && (
                <g transform={`translate(${todayX - 18}, 2)`}>
                  {/* QA Asakaa E33: rojo sólido con letra blanca; se lee en los dos temas. */}
                  <rect x={0} y={0} width={36} height={14} rx={2} fill={theme.today} />
                  <text x={18} y={10} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="'JetBrains Mono', monospace" fontWeight="700" letterSpacing="0.1em">{t.labels.today.toUpperCase()}</text>
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Scrollable Content Area */}
      {/* v0.17.31: Added overflow:visible to allow tooltips to render above the header */}
      {/* v0.17.452: Added onMouseMove to detect when mouse leaves dependency lines (fast movement fix) */}
      <svg
        ref={contentSvgRef}
        width={Math.max(timelineWidth, 1000)}
        height={contentHeight}
        style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
        onMouseMove={handleSvgMouseMove}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>

          {/* Neutral theme: Diagonal stripes pattern for critical/overdue tasks */}
          <pattern id="diagonal-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={theme.border} strokeWidth="2" />
          </pattern>

          {/* Gantt v6 · el festivo: rayado fino a 135°. */}
          <pattern id="festivo-v6" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--v6-festivo-trama, rgba(14,17,20,0.09))' }} strokeWidth="1" />
          </pattern>

          {/* Chronos V2: Weekend hatched pattern — diagonal toward right */}
          <pattern id="weekend-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={(theme.bgPrimary || '').charAt(1) === '0' ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.04)'} strokeWidth="4" />
          </pattern>

          {/*
            * v1.4.29: Diagonal stripes for remaining (no-progress) area of task bars.
            *
            * v1.9.15 · LA BANDA SIGUE EL COLOR DE SU TAREA.
            *
            * Divar (Asakaa, 27-ago): «le puse color personalizado y se sigue
            * viendo azul porque no se ha llenado nada — deberia verse el rojizo
            * transparentoso».
            *
            * Y tenia razon: esta banda estaba fijada a `#00E5CC`. Con progreso
            * 0 % el area restante cubre la barra ENTERA, asi que tapaba el
            * color custom que se pintaba debajo. El color se guardaba, viajaba
            * y llegaba bien — se perdia justo aqui, en el ultimo pixel.
            *
            * ── ESTE PATRON GLOBAL YA NO LO USA LA BARRA ────────────────
            *
            * Mi primer intento fue poner `currentColor` aqui, creyendo que
            * heredaria el color de quien lo referencia. NO ES ASI:
            * `currentColor` dentro de un `<pattern>` se resuelve DONDE SE
            * DEFINE, no donde se usa. El borde de la barra salio del color
            * correcto y la trama de dentro siguio turquesa — medio arreglo,
            * que en una captura parece el arreglo entero.
            *
            * La solucion vive en `TaskBar`: cada barra declara SU patron con
            * su color y un `id` propio. Este se queda por si algo externo lo
            * referencia, con el color que siempre tuvo.
            */}
          <pattern id="bar-remaining-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            {/* Stripe 1: colored band — hereda el color de la barra que la usa */}
            <rect x="0" y="0" width="5" height="10" fill="#00E5CC" opacity="0.18" />
            {/* Stripe 2: gray band */}
            <rect x="5" y="0" width="5" height="10" fill="#94A3B8" opacity="0.12" />
          </pattern>
        </defs>

        {/* Full SVG Background - v0.17.220: Matches TaskGrid bgPrimary for alignment */}
        <rect
          x={0}
          y={0}
          width={Math.max(timelineWidth, 1000)}
          height={contentHeight}
          fill={theme.bgPrimary}
          style={v6 ? { fill: V6S.tarjeta } : undefined}
        />

        {/* Weekend backgrounds removed — only hatch overlay after row backgrounds */}

        {/* Row Backgrounds - v0.17.220: Alternating rows matching TaskGrid */}
        {flatTasks.map((task, index) => (
          <rect
            key={`row-bg-${task.id}`}
            x={0}
            y={index * ROW_HEIGHT}
            width={Math.max(timelineWidth, 1000)}
            height={ROW_HEIGHT}
            fill={index % 2 === 0 ? theme.bgPrimary : theme.bgGrid}
            opacity={1}
            style={v6 ? { pointerEvents: 'none', fill: V6S.tarjeta } : { pointerEvents: 'none' }}
          />
        ))}

        {/* v1.4.29: Grid lines rendered AFTER row backgrounds so they are never covered */}
        {/* Vertical column grid lines */}
        {v6 && flatTasks.map((_t, i) => (
          <line key={`linea-fila-${i}`} x1={0} y1={(i + 1) * ROW_HEIGHT - 0.5} x2={Math.max(timelineWidth, 1000)} y2={(i + 1) * ROW_HEIGHT - 0.5} style={{ stroke: V6S.linea, pointerEvents: 'none' }} strokeWidth={1} />
        ))}
        {esV6Dia && semanasV6.filter((sem) => sem.x > 0).map((sem, i) => (
          <line key={`vsem-${i}`} x1={sem.x} y1={0} x2={sem.x} y2={contentHeight} style={{ stroke: V6S.borde, pointerEvents: 'none' }} strokeWidth={1} shapeRendering="crispEdges" />
        ))}
        {!esV6Dia && headers.map((header, index) =>
          index > 0 ? (
            <line
              key={`vgrid-${index}`}
              x1={header.x}
              y1={0}
              x2={header.x}
              y2={flatTasks.length * ROW_HEIGHT}
              stroke={theme.borderLight}
              strokeWidth={1}
              shapeRendering="crispEdges"
              opacity={theme.neonRedGlow ? 1 : 0.1}
            />
          ) : null
        )}

        {/* Weekend + holiday overlays — subtle gray tint + diagonal hatch.
            Los festivos (workingDaysConfig.holidayDates) se sombrean igual que
            los fines de semana. Solo aplica en escala de día. */}
        {headers.map((header, index) => {
          const nextX = headers[index + 1]?.x || timelineWidth;
          const isWeekendDay = timeScale === 'day' && highlightWeekends && isWeekend(header.date);
          // Solo marcar festivo si NO es ya fin de semana (evita doble pintado).
          const isHolidayDay = timeScale === 'day' && !isWeekend(header.date) && isHoliday(header.date);
          const shouldShade = isWeekendDay || isHolidayDay;

          if (v6 && shouldShade) {
            const w = nextX - header.x;
            return (
              <g key={`we-overlay-${index}`} data-finde="true" style={{ pointerEvents: 'none' }}>
                <rect x={header.x} y={0} width={w} height={contentHeight} style={{ fill: 'var(--v6-finde, rgba(14,17,20,0.04))' }} />
                {isHolidayDay && <rect x={header.x} y={0} width={w} height={contentHeight} fill="url(#festivo-v6)" />}
              </g>
            );
          }
          return shouldShade ? (
            <g key={`we-overlay-${index}`} data-finde="true">
              <rect
                x={header.x}
                y={0}
                width={nextX - header.x}
                height={flatTasks.length * ROW_HEIGHT}
                fill={(theme.bgPrimary || '').charAt(1) === '0' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                style={{ pointerEvents: 'none' }}
              />
              <rect
                x={header.x}
                y={0}
                width={nextX - header.x}
                height={flatTasks.length * ROW_HEIGHT}
                fill="url(#weekend-hatch)"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ) : null;
        })}

        {/* Row interactions: Click-to-Create functionality */}
        {flatTasks.map((task, index) => {
          const hasTaskBar = task.startDate && task.endDate;

          return (
            <g key={`row-group-${task.id}`}>
              {/* Clickable area for tasks without dates - v1.4.19: ClickUp-style with moving indicator */}
              {!hasTaskBar && (
                <>
                  <rect
                    key={`clickable-${task.id}`}
                    x={0}
                    y={index * ROW_HEIGHT}
                    width={timelineWidth}
                    height={ROW_HEIGHT}
                    fill="transparent"
                    style={{
                      cursor: 'pointer',
                      pointerEvents: 'all'
                    }}
                    onClick={(e) => handleTimelineClick(e, task)}
                    onMouseMove={(e) => handleEmptyRowMouseMove(e, task, index)}
                    onMouseLeave={() => {
                      handleEmptyRowMouseLeave();
                    }}
                  />
                  {/* v1.4.19: Schedule indicator - circular marker that follows cursor (ClickUp-style) */}
                  {scheduleIndicator && scheduleIndicator.taskId === task.id && (
                    <g style={{ pointerEvents: 'none' }}>
                      {/* Vertical line at cursor position */}
                      <line
                        x1={scheduleIndicator.x}
                        y1={index * ROW_HEIGHT + 4}
                        x2={scheduleIndicator.x}
                        y2={index * ROW_HEIGHT + ROW_HEIGHT - 4}
                        stroke={theme.accent}
                        strokeWidth={2}
                        opacity={0.8}
                      />
                      {/* Circle indicator */}
                      <circle
                        cx={scheduleIndicator.x}
                        cy={scheduleIndicator.y}
                        r={8}
                        fill={theme.accent}
                        opacity={0.9}
                      />
                      {/* Inner circle for visual effect */}
                      <circle
                        cx={scheduleIndicator.x}
                        cy={scheduleIndicator.y}
                        r={4}
                        fill="white"
                        opacity={0.9}
                      />
                      {/* Date tooltip above the indicator */}
                      <g transform={`translate(${scheduleIndicator.x}, ${index * ROW_HEIGHT - 8})`}>
                        <rect
                          x={-40}
                          y={-20}
                          width={80}
                          height={20}
                          rx={4}
                          fill={theme.bgSecondary}
                          stroke={theme.border}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={-6}
                          textAnchor="middle"
                          fill={theme.textPrimary}
                          fontSize="11"
                          fontFamily="Inter, sans-serif"
                          fontWeight="500"
                        >
                          {scheduleIndicator.date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </text>
                      </g>
                    </g>
                  )}
                  {/* Placeholder text - only show when no indicator is active */}
                  {(!scheduleIndicator || scheduleIndicator.taskId !== task.id) && (
                    <text
                      key={`placeholder-${task.id}`}
                      x={todayX > 0 ? todayX : 100}
                      y={index * ROW_HEIGHT + ROW_HEIGHT / 2}
                      fill={theme.textTertiary}
                      fontSize="12"
                      fontFamily="Inter, sans-serif"
                      fontStyle="italic"
                      dominantBaseline="middle"
                      opacity={0.4}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {t.labels.clickToSetDates}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* v0.17.363: Dependencies moved to AFTER tasks for proper layering */}

        {/* Tasks - v0.13.7: Adjusted Y positions */}
        {flatTasks.map((task, index) => {
          // Don't render task bar if task doesn't have dates
          if (!task.startDate || !task.endDate) {
            return null;
          }

          const { x, width } = getTaskPosition(task);
          const y = index * ROW_HEIGHT + (ROW_HEIGHT - ALTO_BARRA) / 2; // v1.4.29: Centered for 18px bar (Gantt v6: su alto)

          // Container phase (has subtasks): render as bracket bar
          const isContainer = task.subtasks && task.subtasks.length > 0 && !task.isMilestone;

          if (task.isMilestone) {
            /* QA Asakaa E17 (decisión de Arcadio, 14-oct): el hito es la ENTREGA, su
               fecha de fin. Antes el rombo iba a la mitad de la barra (16–22 oct →
               el 19) y 19 px por debajo del centro de la fila. Milestone dibuja el
               centro del rombo en y + 16; la barra de 18 px tiene el centro en y + 9. */
            const xFin = ((task.endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 0.5) * dayWidth * zoom;
            return (
              <Milestone
                key={task.id}
                task={task}
                x={xFin}
                y={y + ALTO_BARRA / 2 - 16}
                theme={theme}
                locale={locale}
                onClick={onTaskClick}
              />
            );
          }

          /* Gantt v6 · el grupo: una línea de 4 px con su remate al final, «‹» si empieza antes de la vista,
             y su duración en días hábiles. */
          if (isContainer && v6) {
            const cy = index * ROW_HEIGHT + ROW_HEIGHT / 2;
            const izq = ventanaVisible?.izq ?? -Infinity;
            const empiezaAntes = x < izq && x + width > izq;
            const x0 = empiezaAntes ? izq + 18 : x;
            const xFinal = x + width;
            const vencidaFase = (task.progress ?? 0) < 100 && task.endDate.getTime() < new Date(new Date().toDateString()).getTime();
            return (
              <g
                key={task.id}
                data-barra-resumen="true"
                data-estado={(task.progress ?? 0) >= 100 ? 'completed' : (vencidaFase ? 'overdue' : 'planned')}
                onClick={() => onTaskClick?.(task)}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onTaskContextMenu?.(task, e as unknown as React.MouseEvent); }}
                onMouseMove={(e) => handleTooltipChange({ task, x, y: cy - 2, width, height: 4, showBelow: cy < 100, mouseX: e.clientX, mouseY: e.clientY })}
                onMouseLeave={() => handleTooltipChange(null)}
                style={{ cursor: 'default', opacity: showCriticalPath && !task.isCriticalPath ? 0.25 : 1, transition: 'opacity 300ms ease' }}
              >
                <rect x={x} y={index * ROW_HEIGHT} width={width} height={ROW_HEIGHT} fill="transparent" style={{ pointerEvents: 'all' }} />
                {empiezaAntes && (
                  <path d={`M ${izq + 11} ${cy - 4} l -4 4 l 4 4`} fill="none" stroke="var(--v6-texto-2, #4D5761)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                )}
                {xFinal - 2 > x0 && <rect x={x0} y={cy - 2} width={xFinal - 2 - x0} height={4} rx={2} data-parte="pista" fill="var(--v6-grupo, #8A939C)" />}
                <rect x={xFinal - 2} y={cy - 5} width={2} height={10} rx={1} data-parte="remate" fill="var(--v6-grupo-remate, #3A434C)" />
                {showCriticalPath && task.isCriticalPath && (
                  <rect x={x0} y={cy - 3} width={Math.max(0, xFinal - x0)} height={6} rx={3} fill="none" stroke="var(--v6-rojo-punto, #D13A40)" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                )}
                <text x={xFinal + 6} y={cy} dominantBaseline="middle" fill="var(--v6-tenue, #5F6972)" fontSize={11} fontFamily="'JetBrains Mono', ui-monospace, monospace" style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none', userSelect: 'none' }}>
                  {`${diasHabilesDe(task)} d`}
                </text>
              </g>
            );
          }

          if (isContainer) {
            // v5.0.0: Master/Summary bars — 8px progress bar with SPI-colored fill
            const isDarkTheme = !theme.bgPrimary || theme.bgPrimary.startsWith('#0') || theme.bgPrimary.startsWith('#1');
            const masterH = 8;
            const masterY = y + (ROW_HEIGHT - 18) / 2 + (18 - masterH) / 2;
            const masterR = 4;

            // Calculate SPI for color
            const progress = task.progress || 0;
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const hasStarted = task.startDate && now >= task.startDate;
            const isOverduePhase = task.endDate && (() => {
              const end = new Date(task.endDate!);
              end.setHours(0, 0, 0, 0);
              return now > end;
            })();
            const isFuturePhase = task.startDate && now < task.startDate;

            let spi = 1.0;
            if (hasStarted && task.startDate && task.endDate && !isFuturePhase) {
              const start = new Date(task.startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(task.endDate);
              end.setHours(0, 0, 0, 0);
              const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              const elapsedDays = Math.min((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), totalDays);
              const timelinePct = (elapsedDays / totalDays) * 100;
              spi = timelinePct > 0 ? progress / timelinePct : 1.0;
            }

            let fillColor: string;
            if (progress >= 100) {
              fillColor = '#00E5CC';
            } else if (isFuturePhase) {
              fillColor = '#4B5563';
            } else if (isOverduePhase && progress < 100) {
              fillColor = '#EF4444';
            } else if (spi >= 0.95) {
              fillColor = '#22C55E';
            } else if (spi >= 0.80) {
              fillColor = '#F59E0B';
            } else {
              fillColor = '#EF4444';
            }

            const fillWidth = Math.max((progress / 100) * width, progress > 0 ? masterR * 2 : 0);
            const showPctOnBar = width > 100 && progress > 0;

            // v5.1.0: CPM — master bar is critical if isCriticalPath is set (from GanttBoard)
            const masterIsCritical = task.isCriticalPath;
            const masterCpmOpacity = showCriticalPath ? (masterIsCritical ? 1.0 : 0.25) : 1.0;

            return (
              <g
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTaskContextMenu?.(task, e as unknown as React.MouseEvent);
                }}
                onMouseMove={(e) => {
                  handleTooltipChange({
                    task,
                    x,
                    y: masterY,
                    width,
                    height: masterH,
                    showBelow: masterY < 100,
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  });
                }}
                onMouseLeave={() => handleTooltipChange(null)}
                style={{ cursor: 'default', opacity: masterCpmOpacity, transition: 'opacity 300ms ease' }}
                /* 1.9.36 · barra resumen: mismo estado que las hojas (la app pinta por CSS). */
                data-barra-resumen="true"
                data-estado={progress >= 100 ? 'completed' : (isOverduePhase ? 'overdue' : 'planned')}
              >
                {/* Invisible hover area — full row height for easy targeting */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={ROW_HEIGHT}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                />
                {/* Ghost background — full duration */}
                <rect
                  x={x}
                  y={masterY}
                  width={width}
                  height={masterH}
                  rx={masterR}
                  fill={isDarkTheme ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}
                  data-parte="pista"
                />
                {/* Progress fill — SPI-colored */}
                {progress > 0 && (
                  <rect
                    x={x}
                    y={masterY}
                    width={fillWidth}
                    height={masterH}
                    rx={masterR}
                    fill={fillColor}
                    data-parte="avance"
                  />
                )}
                {/* v5.1.0: CPM critical border + glow on master bar */}
                {showCriticalPath && masterIsCritical && (
                  <rect
                    x={x}
                    y={masterY}
                    width={width}
                    height={masterH}
                    rx={masterR}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))' }}
                  />
                )}
                {/* Percentage label on bar (only if wide enough) */}
                {showPctOnBar && (
                  <text
                    x={x + fillWidth + 6}
                    y={masterY + masterH / 2}
                    dominantBaseline="central"
                    fill={isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono', monospace"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {Math.round(progress)}%
                  </text>
                )}
              </g>
            );
          }

          return (
            <TaskBar
              key={task.id}
              task={task}
              x={x}
              y={y}
              width={width}
              theme={theme}
              dayWidth={dayWidth * zoom}
              startDate={startDate}
              templates={templates}
              onClick={onTaskClick}
              onDoubleClick={onTaskDblClick} // v0.8.0
              onContextMenu={onTaskContextMenu} // v0.8.0
              onDateChange={onTaskDateChange}
              onDependencyCreate={onDependencyCreate}
              allTaskPositions={taskPositions}
              onDragMove={handleTaskDragMove} // v0.13.0
              onHoverChange={handleTooltipChange} // v0.17.76: Top-layer tooltip
              showBaseline={showBaseline} // v3.0.0: Baseline overlay
              showTaskBarLabels={showTaskBarLabels}
              showCriticalPath={showCriticalPath}
              readOnly={canEditTask ? !canEditTask(task) : false}
              onProgressChange={onTaskProgressDrag}
              v6={v6}
              alturaBarra={ALTO_BARRA}
              duracionV6={v6 ? `${diasHabilesDe(task)} d` : undefined}
            />
          );
        })}

        {/* v0.17.363: SINGLE dependency layer - rendered AFTER tasks for proper z-order */}
        {/* v0.17.451: Base layer only - hover overlay rendered separately at end */}
        {showDependencies && flatTasks.map((task, toIndex) => {
          const enlaces = enlacesDe(task); // mejora fuerte 5: con su tipo y desfase
          if (enlaces.length === 0) return null;
          if (!task.startDate || !task.endDate) return null;

          return enlaces.map(({ id: depId, type: tipo, lag: desfase }) => {
            const depTask = flatTasks.find((t) => t.id === depId);
            if (!depTask) return null;
            if (!depTask.startDate || !depTask.endDate) return null;

            const fromIndex = flatTasks.findIndex((t) => t.id === depId);
            // v1.5.0: Use drag-adjusted positions so lines follow during drag
            const fromPos = getDragAdjustedPosition(depTask.id, getTaskPosition(depTask));
            const toPos = getDragAdjustedPosition(task.id, getTaskPosition(task));

            // Mejora fuerte 5 · FS: fin → inicio; SS: inicio → inicio; FF: fin → fin; SF: inicio → fin.
            const salidaPorInicio = tipo === 'SS' || tipo === 'SF';
            const entradaPorFin = tipo === 'FF' || tipo === 'SF';
            const exitX = salidaPorInicio ? fromPos.x : fromPos.x + fromPos.width;
            const exitY = v6 ? fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2 : fromIndex * ROW_HEIGHT + 26;
            const enterX = entradaPorFin ? toPos.x + toPos.width : toPos.x;
            const enterY = v6 ? toIndex * ROW_HEIGHT + ROW_HEIGHT / 2 : toIndex * ROW_HEIGHT + 26;

            const lineKey = `dep-${depId}-${task.id}`;

            // v0.17.452: Skip rendering if this dependency was deleted locally
            if (deletedDeps.has(lineKey)) return null;

            // v5.1.0: CPM — critical deps in red, non-critical almost invisible
            const bothCritical = showCriticalPath && task.isCriticalPath && depTask.isCriticalPath;
            const conflicto = enlacesEnConflicto.get(`${depId}>${task.id}`);
            const enConflicto = !!conflicto;
            const cpmColorOverride = enConflicto ? 'var(--v6-ambar, #F59E0B)' : showCriticalPath
              ? (bothCritical ? '#EF4444' : 'rgba(255,255,255,0.10)')
              : undefined;
            const cpmStrokeWidth = showCriticalPath
              ? (bothCritical ? 2 : 1)
              : undefined;
            const cpmGlow = bothCritical
              ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.3))'
              : undefined;

            return (
              <DependencyLine
                key={lineKey}
                x1={exitX}
                y1={exitY}
                x2={enterX}
                y2={enterY}
                theme={theme}
                lineStyle={dependencyLineStyle}
                colorOverride={cpmColorOverride ?? (v6 ? 'var(--v6-dependencia, #8A939C)' : undefined)}
                strokeWidthOverride={cpmStrokeWidth ?? (v6 ? 1 : undefined)}
                glowFilter={cpmGlow}
                salidaPorInicio={salidaPorInicio}
                entradaPorFin={entradaPorFin}
                etiqueta={enConflicto
                  ? `⚠ ${etiquetaDelEnlace(tipo, desfase, locale) ?? ''}`.trim()
                  : etiquetaDelEnlace(tipo, desfase, locale)}
                discontinua={enConflicto}
                titulo={conflicto ? porQueDelConflicto(conflicto) : undefined}
                onDelete={() => onDependencyDelete?.(task.id, depId)}
                onHoverChange={(isHovered) => {
                  // v0.17.452: Update ref for fast mouse movement detection
                  isOverDependencyRef.current = isHovered;
                  if (isHovered) {
                    setHoveredDepLine({
                      key: lineKey,
                      fromId: depId,
                      toId: task.id,
                      exitX,
                      exitY,
                      enterX,
                      enterY,
                      salidaPorInicio,
                      entradaPorFin,
                    });
                  }
                  // v0.17.451: Don't clear on base layer mouseLeave - let overlay handle it
                }}
              />
            );
          });
        })}

        {/* v0.13.0: Dependency Cascade Preview - Ghost bars showing where dependent tasks will move */}
        {/* v0.13.4: Simplified - no conflicting animation, direct position */}
        {/* v0.13.7: Adjusted Y positions for cascade previews */}
        {cascadePreviews.map((preview) => (
          <g
            key={`cascade-preview-${preview.taskId}`}
            style={{ pointerEvents: 'none' }}
          >
            {/* Ghost bar at exact preview position - matched to actual bar height (18px) */}
            <rect
              x={preview.previewX}
              y={preview.y - HEADER_HEIGHT}
              width={preview.width}
              height={18}
              rx={6}
              fill={preview.color || theme.accent}
              opacity={0.15}
              stroke={theme.accent}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {/* Days delta label */}
            {Math.abs(preview.daysDelta) > 0 && (
              <text
                x={preview.previewX + preview.width / 2}
                y={preview.y - HEADER_HEIGHT + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.accent}
                fontSize="10"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
                style={{ userSelect: 'none' }}
              >
                {preview.daysDelta > 0 ? `+${preview.daysDelta}d` : `${preview.daysDelta}d`}
              </text>
            )}
          </g>
        ))}

        {/* v0.17.451: Dependency hover overlay - rendered LAST to appear on top of all lines */}
        {showDependencies && hoveredDepLine && (
          <DependencyLine
            key={`${hoveredDepLine.key}-hover-overlay`}
            x1={hoveredDepLine.exitX}
            y1={hoveredDepLine.exitY}
            x2={hoveredDepLine.enterX}
            y2={hoveredDepLine.enterY}
            theme={theme}
            lineStyle={dependencyLineStyle}
            salidaPorInicio={hoveredDepLine.salidaPorInicio}
            entradaPorFin={hoveredDepLine.entradaPorFin}
            onDelete={() => {
              // v0.17.452: Clear hover state and mark as deleted for instant UI feedback
              const lineKey = hoveredDepLine.key;
              setHoveredDepLine(null);
              isOverDependencyRef.current = false;
              setDeletedDeps(prev => new Set(prev).add(lineKey));
              onDependencyDelete?.(hoveredDepLine.toId, hoveredDepLine.fromId);
            }}
            hoverOverlayOnly={true}
            onHoverChange={(isHovered) => {
              // v0.17.452: Update ref for fast mouse movement detection
              isOverDependencyRef.current = isHovered;
              // Only clear if mouse actually left the overlay area
              if (!isHovered) {
                setHoveredDepLine(null);
              }
            }}
          />
        )}

        {/* v0.17.179: Today Line — Chronos V2: Neon red with glow */}
        {todayX >= 0 && todayX <= timelineWidth && (
          <g data-hoy="linea" style={{ pointerEvents: 'none' }}>
            {/* Glow effect (wider, transparent) */}
            {theme.neonRedGlow && !v6 && (
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={contentHeight}
                stroke={theme.today}
                strokeWidth={6}
                opacity={0.15}
              />
            )}
            {/* Sharp line */}
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={contentHeight}
              stroke={theme.today}
              strokeWidth={1}
              opacity={1}
            />
          </g>
        )}

        {/* Mejora fuerte 6 · el fin PLANEADO (gris) y el fin PREVISTO (ámbar): la distancia es el retraso. */}
        {[
          { fecha: finPlaneado, clave: 'planeado', texto: locale === 'es' ? 'Fin planeado' : 'Planned end', color: theme.textTertiary || '#94A3B8' },
          { fecha: finPrevisto, clave: 'previsto', texto: locale === 'es' ? 'Fin previsto' : 'Expected end', color: '#F59E0B' },
        ].map((m, i, todos) => {
          if (!m.fecha) return null;
          // al FINAL de ese día (la barra que termina ese día llega hasta aquí)
          const x = (((m.fecha.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1) * dayWidth * zoom;
          if (x < 0 || x > timelineWidth) return null;
          const primero = todos[0]?.fecha;
          const mismoDia = i === 1 && !!primero && Math.abs(primero.getTime() - m.fecha.getTime()) < 864e5;
          const etiquetaY = 4 + (mismoDia ? 16 : 0);
          return (
            v6 ? (
              <g key={m.clave} data-fin={m.clave} style={{ pointerEvents: 'none' }}>
                <line x1={x} y1={0} x2={x} y2={contentHeight} style={{ stroke: m.clave === 'previsto' ? V6S.tenue : 'var(--v6-separador, #CDD2D8)' }} strokeWidth={1} strokeDasharray="4 3" />
              </g>
            ) :
            <g key={m.clave} data-fin={m.clave} style={{ pointerEvents: 'none' }}>
              <line x1={x} y1={0} x2={x} y2={contentHeight} stroke={m.color} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.9} />
              <rect x={x + 3} y={etiquetaY} width={m.texto.length * 5.6 + 10} height={14} rx={3} fill={theme.bgPrimary || '#0F1115'} opacity={0.9} />
              <text x={x + 8} y={etiquetaY + 10} fontSize={9} fontWeight={600} fill={m.color} style={{ fontFamily: 'Inter, sans-serif' }}>{m.texto}</text>
            </g>
          );
        })}

        {/* Mejora fuerte 6 · «indicador cuando una barra queda fuera de vista»: en su fila, junto al
            borde, la fecha y una flecha; un clic lleva a la barra. */}
        {ventanaVisible && flatTasks.map((t, index) => {
          if (!t.startDate || !t.endDate) return null;
          const pos = getTaskPosition(t);
          const lado = ladoFueraDeVista(pos.x, pos.x + pos.width, ventanaVisible.izq, ventanaVisible.der);
          if (!lado) return null;
          const fecha = lado === 'left' ? t.endDate : t.startDate;
          const texto = lado === 'left'
            ? `◀ ${fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
            : `${fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ▶`;
          const ancho = texto.length * 5.8 + 10;
          const x = lado === 'left' ? ventanaVisible.izq + 4 : ventanaVisible.der - ancho - 4;
          const y = index * ROW_HEIGHT + ROW_HEIGHT / 2 - 8;
          if (v6) {
            const vencida = t.status !== 'completed' && (t.progress ?? 0) < 100 && t.endDate.getTime() < new Date(new Date().toDateString()).getTime();
            const textoV6 = lado === 'left' ? `‹ ${fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')}` : `${fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')} ›`;
            const anchoV6 = textoV6.length * 6.6 + 16;
            const xV6 = lado === 'left' ? ventanaVisible.izq + 4 : ventanaVisible.der - anchoV6 - 4;
            const yV6 = index * ROW_HEIGHT + ROW_HEIGHT / 2 - 11;
            return (
              <g key={`fuera-${t.id}`} data-fuera-de-vista={lado} data-vencida={vencida || undefined} role="button" style={{ cursor: onIrAFecha ? 'pointer' : 'default' }} onClick={() => onIrAFecha?.(t.startDate!)}>
                <title>{locale === 'es' ? `Ir a «${t.name}»${vencida ? `, venció el ${fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}` : ''}` : `Go to "${t.name}"`}</title>
                <rect x={xV6} y={yV6} width={anchoV6} height={22} rx={6} strokeWidth={1} style={{ fill: vencida ? 'var(--v6-rojo-fondo, #FBE9EA)' : V6S.tarjeta, stroke: vencida ? 'var(--v6-rojo-borde, rgba(192,48,58,0.75))' : V6S.borde }} />
                <text x={xV6 + anchoV6 / 2} y={yV6 + 11.5} textAnchor="middle" dominantBaseline="middle" style={{ fill: vencida ? 'var(--v6-rojo, #B02A33)' : V6S.texto2, fontSize: 11, fontWeight: 500, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{textoV6}</text>
              </g>
            );
          }
          return (
            <g
              key={`fuera-${t.id}`}
              data-fuera-de-vista={lado}
              style={{ cursor: onIrAFecha ? 'pointer' : 'default' }}
              onClick={() => onIrAFecha?.(t.startDate!)}
            >
              <title>{locale === 'es' ? `«${t.name}» está fuera de la vista: clic para ir` : `"${t.name}" is out of view: click to go`}</title>
              <rect x={x} y={y} width={ancho} height={16} rx={8} fill={theme.bgSecondary || '#1A1D21'} stroke={theme.border || 'rgba(148,163,184,0.4)'} strokeWidth={1} opacity={0.95} />
              <text x={x + ancho / 2} y={y + 11.5} fontSize={9.5} textAnchor="middle" fill={theme.textSecondary || '#94A3B8'} style={{ fontFamily: 'Inter, sans-serif' }}>{texto}</text>
            </g>
          );
        })}

      </svg>

      {/* Gantt v6 · «Fin previsto · 11 sept» abajo, pegada al borde visible, terminando en su línea. */}
      {v6 && (() => {
        const banderas = [
          finPrevisto && { clave: 'previsto', fecha: finPrevisto, texto: locale === 'es' ? 'Fin previsto' : 'Forecast finish' },
          finPlaneado && (!finPrevisto || Math.abs(finPlaneado.getTime() - finPrevisto.getTime()) >= 864e5) && { clave: 'planeado', fecha: finPlaneado, texto: locale === 'es' ? 'Fin planeado' : 'Planned finish' },
        ].filter(Boolean) as Array<{ clave: string; fecha: Date; texto: string }>;
        if (banderas.length === 0) return null;
        return (
          <div aria-hidden={false} style={{ position: 'sticky', bottom: 8, height: 0, zIndex: 6, pointerEvents: 'none' }}>
            {banderas.map((b, i) => {
              const x = (((b.fecha.getTime() - startDate.getTime()) / 864e5) + 1) * dayWidth * zoom;
              if (x < 0 || x > timelineWidth) return null;
              return (
                <div
                  key={b.clave}
                  data-bandera-fin={b.clave}
                  style={{ position: 'absolute', bottom: i * 28, left: x - 8, transform: 'translateX(-100%)', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 7px',
                    border: '1px solid var(--v6-separador, #CDD2D8)', borderRadius: 999, background: V6S.tarjeta, color: V6S.texto2, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
                  {b.texto} · {b.fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* v1.4.28: Tooltip rendered via portal to document.body — never clipped by scroll containers */}
      {activeTooltip && (
        <TaskTooltip
          tooltipData={activeTooltip}
          theme={theme}
          locale={locale === 'es' ? 'es' : 'en'}
          workingDaysConfig={workingDaysConfig}
        />
      )}
    </div>
  );
}