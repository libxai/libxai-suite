/**
 * Maquetas v3 de Yesid (4-nov) · LA LISTA v6 (sólo Asakaa, `config.disenoV6`). La maqueta `asakaa-lista.html`:
 *
 *   · línea de resumen: «13 tareas · 6 completadas ocultas · Mostrar · 3 vencidas · Ver» y «Plegar todo» (L2);
 *   · árbol fase › padre › hija › nieta (treegrid) con WBS y tarea · Responsable · Estado · Inicio · Fin · Duración
 *     (d háb.) · % · Horas reg./est. · Costo, y el «+» para ver u ocultar columnas, que se recuerda (L4);
 *   · filas de 40 px, cifras en mono, vencidas con chip rojo en el Fin (G2) y «N vencidas» en su padre;
 *   · completadas ocultas por defecto; una fase terminada, plegada;
 *   · total del proyecto pegado abajo y la salud financiera, plegada, al pie (L5);
 *   · teclado: ↑ ↓ cambian de fila, → despliega, ← pliega o sube al padre, Enter abre la tarea.
 *
 * Las reglas (estado del padre, vencidas, días hábiles, cifras de las hojas) están en `reglasDeLaLista.ts`.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import type { Calendario } from '../../Gantt/motorDeProgramacion';
import { fechaCorta } from '../../Gantt/fechaCorta';
import {
  cifrasDe, diasDeRetraso, duracionHabil, estadoDe, estadoDeHoja, estaVencida, horasCortas, juzgarHoras, millones, tieneHijas, type EstadoV6,
} from './reglasDeLaLista';
import { CSS_PANEL_V6 } from './PanelDeTareaV6';
import { CSS_PANEL_V4, PanelDeTareaV4, type AccionesDelPanelV4 } from './PanelDeTareaV4';
import { EscudoDeRiesgo } from './PuntoDeRiesgo';
import { CSS_RECURSOS_V6 } from './RecursosDeLaListaV6';
import { CSS_COSTOS_V4, CostosDelProyectoV4, type SaludDelPieV4 } from './CostosDelProyectoV4';
import { avanceDeTarea, collectLeaves, computeWeightedProgress } from '../../../utils/avanceFisico';
import { MenuIcons } from '../../Gantt/ContextMenu';
import { armarMenuDeLaTarea } from '../../Gantt/menuDeLaTarea';

type Columna = 'who' | 'st' | 's' | 'e' | 'dur' | 'pct' | 'hrs' | 'cost';
const COLUMNAS: Columna[] = ['who', 'st', 's', 'e', 'dur', 'pct', 'hrs', 'cost'];
type Orden = { k: 'wbs' | 's' | 'e' | 'dur' | 'pct' | 'cost'; desc: boolean };

/** El menú Vista de la maqueta: densidad, completadas, agrupar por fase y leyenda. La lleva la app (se recuerda). */
export interface VistaV6 {
  densidad: 'compacta' | 'normal' | 'comoda';
  mostrarHechas: boolean;
  agruparPorFase: boolean;
  leyenda: boolean;
}
export const VISTA_V6_POR_DEFECTO: VistaV6 = { densidad: 'normal', mostrarHechas: false, agruparPorFase: true, leyenda: false };

/** Guía v4 · «Filtros» de la Lista: Estado, Responsable, «Solo vencidas» y «Con riesgo abierto» (la clave de cada
 * responsable: su id, o su nombre; '' = sin responsable). Los lleva la app. */
export interface FiltrosDeLaListaV4 { estados: EstadoV6[]; responsables: string[]; vencidas: boolean; conRiesgo: boolean }
export const FILTROS_LISTA_V4_VACIOS: FiltrosDeLaListaV4 = { estados: [], responsables: [], vencidas: false, conRiesgo: false };
const claveDeResponsable = (t: Task) => { const a = (t.assignees ?? [])[0] as { id?: string; name?: string } | undefined; return a ? a.id || a.name || '?' : ''; };

/** F2 · el aviso de unas horas recién escritas: se registran pasados 5 s (antes, «Deshacer» no escribe nada) */
interface HorasPendientes { id: string; wbs: string; antes: number; ahora: number; t: Task }

export interface ListaV6Props {
  tasks: Task[];
  es: boolean;
  cal: Calendario;
  /** la tarifa de una hoja (la de su responsable o la del espacio) */
  tarifaDe: (hoja: Task) => number;
  /** «COP», para el encabezado «Costo (COP)» */
  monedaCodigo?: string | null;
  /** sin permiso para ver dinero, la columna de costo no existe */
  conCosto?: boolean;
  onAbrir?: (t: Task) => void;
  seleccionada?: string | null;
  /** clave de localStorage para recordar las columnas ocultas (por vista) */
  claveColumnas?: string;
  /** al pie: la salud financiera y los recursos, plegados */
  pie?: ReactNode;
  hoy?: Date;
  /** el avance del proyecto de la cabecera: el total de la lista dice la MISMA cifra (sin él, el de sus fases) */
  avanceTotal?: number | null;
  /** la Vista (sin ella, la lleva la propia lista) */
  vista?: VistaV6;
  onVista?: (v: VistaV6) => void;
  /** F2 · registrar horas en una hoja: los minutos que se SUMAN a lo registrado (sin él, las horas no se editan) */
  onRegistrarHoras?: (t: Task, minutos: number) => void;
  /** «Columnas…» del menú Vista: cada cambio abre el menú del «+» */
  peticionColumnas?: number;
  /** G4 · las migas del panel empiezan por el proyecto */
  nombreProyecto?: string;
  /** «Recursos e impacto de flujo de caja»: la tarifa de cada persona, el costo al terminar (EAC) y el enlace a Recursos */
  tarifaDePersona?: (id: string) => number | undefined;
  costoAlTerminar?: number | null;
  /** v4 · «una sola verdad»: el fin previsto de la cabecera del proyecto; el total lo dice y el fin del plan va en su globo */
  finPrevisto?: Date | null;
  onVerRecursos?: () => void;
  /** R6 · abrir un riesgo desde el panel de la tarea */
  onVerRiesgo?: (id: string) => void;
  /** guía v4 · el pie «Costos del proyecto»: las cifras de la cabecera (sin ellas, suma las de las tareas) */
  salud?: SaludDelPieV4 | null;
  /** guía v4 · lo que el panel de la tarea hace con la app (historial, cronómetro, horas, restricción, enlaces) */
  panel?: AccionesDelPanelV4;
  /** guía v4 · guardar el estado y el avance de una hoja desde el panel; `false` si no se pudo */
  onGuardarEstado?: (t: Task, status: string, progreso: number) => boolean | void | Promise<boolean | void>;
  /** guía v4 · los filtros de la barra («Filtros»); sin ellos, solo el «Ver» de las vencidas */
  filtros?: FiltrosDeLaListaV4;
  onFiltros?: (f: FiltrosDeLaListaV4) => void;
  /** v4 · pasada común del bloque 7 · cambiar la tarea padre desde el panel (como el Tablero): el padre (null = raíz) y la
   *  posición entre sus hijas; `false` si no se pudo. Con él, el panel ofrece «Cambiar tarea padre…» y avisa con «Deshacer». */
  onCambiarPadre?: (t: Task, padre: string | null, posicion: number) => boolean | void | Promise<boolean | void>;
  /** E15 (Yesid, 17-nov) · «+ Añadir tarea» en la tabla y «Agregar subtarea» del menú: crea una tarea con ese nombre al final
   *  de su padre (null = raíz); `false` si no se pudo. Sin él, la tabla no ofrece crear. */
  onCrearTarea?: (nombre: string, padre: string | null) => boolean | void | Promise<boolean | void>;
  /** E15 · «Duplicar» y «Eliminar» del menú contextual (la app confirma el borrado) */
  onDuplicar?: (t: Task) => void;
  onEliminar?: (t: Task) => void;
}

interface Fila {
  t: Task;
  wbs: string;
  nivel: number;
  padre: string | null;
  ancestros: string[];
  esFase: boolean;
}

const TXT = {
  es: {
    tareas: 'tareas', tarea: 'tarea', ocultas: 'completadas ocultas', aLaVista: 'completadas a la vista', mostrar: 'Mostrar', ocultar: 'Ocultar',
    vencidas: 'vencidas', vencida: 'vencida', ver: 'Ver', filtrando: 'Filtrando: vencidas', quitar: 'Quitar el filtro de vencidas',
    plegar: 'Plegar todo', desplegar: 'Desplegar todo', wbs: 'Tarea', resp: 'Responsable', estado: 'Estado', inicio: 'Inicio', fin: 'Fin',
    dur: 'Duración', avance: 'Avance', horas: 'Horas', costo: 'Costo', total: 'Total del proyecto', columnas: 'Ver u ocultar columnas',
    finPrevistoTip: (p: string, plan: string) => `Fin previsto: ${p}, con lo vencido corrido. El plan vigente termina el ${plan}.`,
    tips: {
      who: 'Responsable de la tarea', st: 'Estado de la tarea; el de una fase o tarea padre se calcula con sus hijas',
      s: 'Fecha de inicio', e: 'Fecha de fin; en rojo, vencida (días hábiles del calendario del proyecto)',
      dur: 'Duración en días hábiles del calendario del proyecto',
      pct: 'Avance en %. El de una fase o del proyecto es el de sus tareas, ponderado por sus horas estimadas (una tarea sin estimar pesa como 1 h)',
      hrs: 'Horas registradas / estimadas, en horas', cost: (m: string) => `Costo real${m ? ` en ${m}` : ''}: horas registradas × tarifa de cada persona`,
    } as Record<string, string | ((m: string) => string)>,
    sinEstimar: 'Sin estimar', sinEstimarTip: 'Esta tarea no tiene horas estimadas: para el avance pesa como 1 h.',
    vencidaEl: (f: string, n: number) => `${f}, vencida hace ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`,
    ayudaTit: 'Cómo leer la lista y atajos de teclado', comoLeer: 'Cómo leer la lista', teclado: 'Teclado',
    lVencida: 'Fecha de fin vencida', lRiesgo: 'Riesgo abierto; el color es su nivel', lSinEst: 'Tarea sin horas estimadas',
    lGuia: 'Cada nivel de la jerarquía sangra 20 px; la guía une a las hijas con su padre',
    kFilas: 'Cambiar de fila', kAbrir: 'Desplegar o plegar', kDetalle: 'Abrir el detalle', kHoras: 'Editar las horas registradas', kCerrar: 'Cerrar el panel',
    numeroAvance: 'Escriba un número entero entre 0 y 100.', fEstado: 'Estado', fRiesgo: 'Con riesgo abierto', quitarFiltro: 'Quitar el filtro',
    todas: 'Mostrar todas', ayuda: 'Flechas arriba y abajo: cambiar de fila. Flecha derecha: desplegar; flecha izquierda: plegar o ir a la fila padre. Enter: abrir el detalle.',
    st: { done: 'Completada', prog: 'En progreso', blocked: 'Bloqueada', todo: 'Por hacer' } as Record<EstadoV6, string>,
    venceHace: (n: number) => (n === 1 ? 'Vencida hace 1 día hábil' : `Vencida hace ${n} días hábiles`),
    sinResp: 'Sin responsable', hechas: (a: number, b: number) => `${a} de ${b} tareas completadas`,
    vacia: 'No hay tareas que mostrar con este filtro.', tareasDe: 'Tareas del proyecto',
    editarHoras: (w: string) => `Horas registradas de ${w}, editar (F2)`,
    numero: 'Escriba un número de horas, por ejemplo 12 o 12,5.', negativas: 'Las horas no pueden ser negativas.',
    menos: 'Aquí solo se suman horas: para quitarlas, corríjalas en la Hoja de horas.',
    doble: (e: string) => `Son más del doble de lo estimado (${e} h).`, noEmpieza: (s: string) => `La tarea aún no empieza: arranca el ${s}.`,
    porDia: (n: number) => `Son más de 24 h por día hábil desde el inicio (${n} ${n === 1 ? 'día hábil' : 'días hábiles'}).`,
    otraVez: 'Pulse Enter otra vez para guardar o Esc para cancelar.',
    guardadas: (w: string, a: string, b: string) => `Horas de ${w} guardadas: ${a} h (antes ${b} h).`, deshacer: 'Deshacer',
    ahoraDentro: (n: string, w: string, p: string) => `«${n}» ahora es ${w}, dentro de ${p}.`,
    ahoraDirecta: (n: string, w: string, f: string) => `«${n}» ahora es ${w}, tarea directa de la ${f}.`,
    devuelta: (n: string) => `Cambio deshecho: «${n}» vuelve a su tarea padre.`,
    leyenda: 'Leyenda', lVenc: 'Vencida', lDur: 'Duración en días hábiles',
    m: { edit: 'Abrir el detalle', addSubtask: 'Agregar subtarea', indent: 'Aplicar sangría', outdent: 'Quitar sangría', dependencies: 'Dependencias…',
      hito: 'Convertir en hito', quitarHito: 'Quitar hito', markIncomplete: 'Marcar por hacer', setInProgress: 'Marcar en progreso',
      markComplete: 'Marcar completada', duplicate: 'Duplicar tarea', split: 'Dividir tarea', delete: 'Eliminar tarea' },
    menuDe: (n: string) => `Acciones de «${n}»`,
    esHito: 'Hito', anadir: 'Añadir tarea', anadirEn: (n: string) => `Añadir subtarea en «${n}»`, nombreNueva: 'Nombre de la tarea nueva',
    ayudaNueva: 'Enter crea la tarea (y deja escribir otra); Esc cancela.',
    fuera: (n: string, p: string) => `«${n}» sale de «${p}».`,
  },
  en: {
    tareas: 'tasks', tarea: 'task', ocultas: 'completed hidden', aLaVista: 'completed shown', mostrar: 'Show', ocultar: 'Hide',
    vencidas: 'overdue', vencida: 'overdue', ver: 'View', filtrando: 'Filtering: overdue', quitar: 'Clear the overdue filter',
    plegar: 'Collapse all', desplegar: 'Expand all', wbs: 'Task', resp: 'Owner', estado: 'Status', inicio: 'Start', fin: 'End',
    dur: 'Duration', avance: 'Progress', horas: 'Hours', costo: 'Cost', total: 'Project total', columnas: 'Show or hide columns',
    finPrevistoTip: (p: string, plan: string) => `Forecast end: ${p}, with overdue work moved forward. The current plan ends on ${plan}.`,
    tips: {
      who: 'Task owner', st: 'Task status; a phase’s or parent task’s comes from its subtasks',
      s: 'Start date', e: 'End date; in red, overdue (working days of the project calendar)',
      dur: 'Duration in working days of the project calendar',
      pct: 'Progress in %. A phase’s or the project’s is its tasks’, weighted by their estimated hours (a task without an estimate weighs 1 h)',
      hrs: 'Hours logged / estimated, in hours', cost: (m: string) => `Actual cost${m ? ` in ${m}` : ''}: logged hours × each person’s rate`,
    } as Record<string, string | ((m: string) => string)>,
    sinEstimar: 'Not estimated', sinEstimarTip: 'This task has no estimated hours: for progress it weighs 1 h.',
    vencidaEl: (f: string, n: number) => `${f}, overdue by ${n} working ${n === 1 ? 'day' : 'days'}`,
    ayudaTit: 'How to read the list and keyboard shortcuts', comoLeer: 'How to read the list', teclado: 'Keyboard',
    lVencida: 'Overdue end date', lRiesgo: 'Open risk; the colour is its level', lSinEst: 'Task without estimated hours',
    lGuia: 'Each hierarchy level is indented 20 px; the guide joins the subtasks with their parent',
    kFilas: 'Change row', kAbrir: 'Expand or collapse', kDetalle: 'Open the details', kHoras: 'Edit the logged hours', kCerrar: 'Close the panel',
    numeroAvance: 'Type a whole number between 0 and 100.', fEstado: 'Status', fRiesgo: 'With an open risk', quitarFiltro: 'Remove the filter',
    todas: 'Show all', ayuda: 'Up and down arrows: change row. Right arrow: expand; left arrow: collapse or go to the parent row. Enter: open the details.',
    st: { done: 'Completed', prog: 'In progress', blocked: 'Blocked', todo: 'To do' } as Record<EstadoV6, string>,
    venceHace: (n: number) => (n === 1 ? 'Overdue by 1 working day' : `Overdue by ${n} working days`),
    sinResp: 'No owner', hechas: (a: number, b: number) => `${a} of ${b} tasks completed`,
    vacia: 'No tasks to show with this filter.', tareasDe: 'Project tasks',
    editarHoras: (w: string) => `Logged hours of ${w}, edit (F2)`,
    numero: 'Type a number of hours, for example 12 or 12.5.', negativas: 'Hours cannot be negative.',
    menos: 'Hours can only be added here: to remove them, fix them in the Timesheet.',
    doble: (e: string) => `More than twice the estimate (${e} h).`, noEmpieza: (s: string) => `The task has not started: it starts on ${s}.`,
    porDia: (n: number) => `More than 24 h per working day since the start (${n} working ${n === 1 ? 'day' : 'days'}).`,
    otraVez: 'Press Enter again to save or Esc to cancel.',
    guardadas: (w: string, a: string, b: string) => `Hours of ${w} saved: ${a} h (was ${b} h).`, deshacer: 'Undo',
    ahoraDentro: (n: string, w: string, p: string) => `“${n}” is now ${w}, inside ${p}.`,
    ahoraDirecta: (n: string, w: string, f: string) => `“${n}” is now ${w}, a direct task of ${f}.`,
    devuelta: (n: string) => `Change undone: “${n}” is back under its parent task.`,
    leyenda: 'Legend', lVenc: 'Overdue', lDur: 'Duration in working days',
    m: { edit: 'Open the details', addSubtask: 'Add subtask', indent: 'Indent', outdent: 'Outdent', dependencies: 'Dependencies…',
      hito: 'Convert to milestone', quitarHito: 'Remove milestone', markIncomplete: 'Mark as to do', setInProgress: 'Set in progress',
      markComplete: 'Mark complete', duplicate: 'Duplicate task', split: 'Split task', delete: 'Delete task' },
    menuDe: (n: string) => `Actions for “${n}”`,
    anadir: 'Add task', anadirEn: (n: string) => `Add subtask in “${n}”`, nombreNueva: 'Name of the new task',
    esHito: 'Milestone',
    ayudaNueva: 'Enter creates the task (and lets you type another); Esc cancels.',
    fuera: (n: string, p: string) => `“${n}” is out of “${p}”.`,
  },
};

/* guía v4 · cabeceras sin abreviar; la unidad va en el globo */
const NOMBRE_COL = (c: Columna, x: typeof TXT.es): string => ({
  who: x.resp, st: x.estado, s: x.inicio, e: x.fin, dur: x.dur, pct: x.avance, hrs: x.horas, cost: x.costo,
}[c]);
const AYUDA_COL = (c: Columna, x: typeof TXT.es, moneda?: string | null): string => {
  const a = x.tips[c];
  return typeof a === 'function' ? a(moneda ?? '') : a ?? '';
};
/* guía v4 · abre con Tarea, Estado, Fin, Avance, Horas y Costo: Inicio y Duración, en el «+» */
const OCULTAS_POR_DEFECTO: Columna[] = ['s', 'dur'];

function leerOcultas(clave?: string): Set<Columna> {
  if (!clave) return new Set(OCULTAS_POR_DEFECTO);
  try {
    const guardado = localStorage.getItem(clave);
    if (guardado == null) return new Set(OCULTAS_POR_DEFECTO);
    const v = JSON.parse(guardado);
    return new Set((Array.isArray(v) ? v : []).filter((c): c is Columna => COLUMNAS.includes(c)));
  } catch { return new Set(); }
}

const iniciales = (n?: string) => (n ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();

export function ListaV6({
  tasks: tasksProp, es, cal, tarifaDe, monedaCodigo, conCosto: conCostoProp = true, onAbrir, seleccionada = null, claveColumnas, pie, hoy: hoyProp,
  avanceTotal, vista: vistaProp, onVista, onRegistrarHoras, peticionColumnas, nombreProyecto,
  tarifaDePersona, onVerRecursos, onVerRiesgo, salud, panel, onGuardarEstado, filtros: filtrosProp, onFiltros, finPrevisto, onCambiarPadre,
  onCrearTarea, onDuplicar, onEliminar,
}: ListaV6Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  /* guía v4 · sin permiso de dinero (sql/481: la base no manda tarifas), la columna de costo no existe */
  const conCosto = conCostoProp && (salud ? salud.veDinero : true);
  const hoy = useMemo(() => hoyProp ?? new Date(), [hoyProp]);
  const [vistaInterna, setVistaInterna] = useState<VistaV6>(VISTA_V6_POR_DEFECTO);
  const vista = vistaProp ?? vistaInterna;
  const cambiarVista = useCallback((v: VistaV6) => (onVista ? onVista(v) : setVistaInterna(v)), [onVista]);
  const mostrarHechas = vista.mostrarHechas;
  const agrupar = vista.agruparPorFase;
  /* F2 · las horas escritas que aún no llegaron de vuelta en `tasks` (se ven ya; se registran a los 5 s) */
  const [horasLocales, setHorasLocales] = useState<Map<string, number>>(new Map());
  const enviadas = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!enviadas.current.size) return;
    setHorasLocales((m) => { const n = new Map(m); enviadas.current.forEach((id) => n.delete(id)); return n; });
    enviadas.current = new Set();
  }, [tasksProp]);
  const tasks = useMemo(() => {
    if (!horasLocales.size) return tasksProp;
    const con = (ts: Task[]): Task[] => ts.map((t) => {
      const h = horasLocales.get(t.id);
      const sub = t.subtasks?.length ? con(t.subtasks) : t.subtasks;
      return h != null ? { ...t, timeLoggedMinutes: h * 60, subtasks: sub } : (sub !== t.subtasks ? { ...t, subtasks: sub } : t);
    });
    return con(tasksProp);
  }, [tasksProp, horasLocales]);
  const [editando, setEditando] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<HorasPendientes | null>(null);
  /* el aviso de un cambio de tarea padre, con «Deshacer»; se va solo a los 8 s */
  const [avisoPadre, setAvisoPadre] = useState<{ texto: string; deshacer?: () => void } | null>(null);
  useEffect(() => {
    if (!avisoPadre) return;
    const id = setTimeout(() => setAvisoPadre(null), 8000);
    return () => clearTimeout(id);
  }, [avisoPadre]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registrarRef = useRef(onRegistrarHoras);
  registrarRef.current = onRegistrarHoras;
  const escribir = (p: HorasPendientes) => {
    enviadas.current.add(p.id);
    registrarRef.current?.(p.t, Math.round((p.ahora - p.antes) * 60));
    /* si la app lo rechaza (sin responsable, día no laborable…), las tareas no cambian: la cifra vuelve a la suya */
    setTimeout(() => {
      if (!enviadas.current.has(p.id)) return;
      enviadas.current.delete(p.id);
      setHorasLocales((m) => { const n = new Map(m); n.delete(p.id); return n; });
    }, 8000);
  };
  const pendienteRef = useRef<HorasPendientes | null>(null);
  pendienteRef.current = pendiente;
  /* al irse de la lista con unas horas en espera, se registran ya */
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (pendienteRef.current) escribir(pendienteRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [filtro, setFiltro] = useState<null | 'vencidas'>(null);
  const [orden, setOrden] = useState<Orden>({ k: 'wbs', desc: false });
  const [ocultas, setOcultas] = useState<Set<Columna>>(() => leerOcultas(claveColumnas));
  const [menuCols, setMenuCols] = useState(false);
  useEffect(() => { if (peticionColumnas) setMenuCols(true); }, [peticionColumnas]);
  /* el menú del «+» se cierra al pulsar fuera o con Esc, esté donde esté el foco */
  const cajaCols = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (!menuCols) return;
    const fuera = (e: MouseEvent) => { if (!cajaCols.current?.contains(e.target as Node)) setMenuCols(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setMenuCols(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [menuCols]);
  const [activa, setActiva] = useState<string | null>(null);
  /* G4 · la tarea del panel acoplado (la fila queda seleccionada) */
  const [enPanel, setEnPanel] = useState<string | null>(null);

  /* el árbol en filas, con su WBS (el de la tarea, o su posición) */
  const todas = useMemo(() => {
    const out: Fila[] = [];
    const recorrer = (ts: Task[], prefijo: string, nivel: number, padre: string | null, ancestros: string[]) => {
      ts.forEach((t, i) => {
        const wbs = (t as { wbsCode?: string }).wbsCode || (prefijo ? `${prefijo}.${i + 1}` : String(i + 1));
        out.push({ t, wbs, nivel, padre, ancestros, esFase: nivel === 0 && tieneHijas(t) });
        if (tieneHijas(t)) recorrer(t.subtasks!, wbs, nivel + 1, t.id, [...ancestros, t.id]);
      });
    };
    recorrer(tasks, '', 0, null, []);
    return out;
  }, [tasks]);
  const porId = useMemo(() => new Map(todas.map((f) => [f.t.id, f])), [todas]);
  const todasRef = useRef(todas);
  todasRef.current = todas;
  const irARef = useRef<(id: string) => void>(() => {});
  const cifras = useMemo(() => new Map(todas.map((f) => [f.t.id, cifrasDe(f.t, tarifaDe, hoy)])), [todas, tarifaDe, hoy]);
  const estados = useMemo(() => new Map(todas.map((f) => [f.t.id, estadoDe(f.t)])), [todas]);

  /* una fase terminada entra plegada; lo demás, abierto */
  const [plegadas, setPlegadas] = useState<Set<string>>(() => new Set(todas.filter((f) => f.esFase && estadoDe(f.t) === 'done').map((f) => f.t.id)));
  /* las fases terminadas que se abren a mano enseñan sus completadas aunque estén ocultas */
  const [abiertasConHechas, setAbiertasConHechas] = useState<Set<string>>(new Set());

  const hojas = todas.filter((f) => !tieneHijas(f.t));
  const nAbiertas = hojas.filter((f) => estados.get(f.t.id) !== 'done').length;
  const nHechas = hojas.length - nAbiertas;
  const nVencidas = hojas.filter((f) => estaVencida(f.t, hoy)).length;

  /* las vencidas y sus padres, para el filtro «Ver» */
  const f4 = filtrosProp ?? FILTROS_LISTA_V4_VACIOS;
  const soloVencidas = filtro === 'vencidas' || f4.vencidas;
  const enElFiltro = useMemo(() => {
    if (!soloVencidas && !f4.estados.length && !f4.responsables.length && !f4.conRiesgo) return null;
    const ok = new Set<string>();
    for (const f of todas) {
      if (tieneHijas(f.t)) continue;
      if (soloVencidas && !estaVencida(f.t, hoy)) continue;
      if (f4.estados.length && !f4.estados.includes(estadoDeHoja(f.t))) continue;
      if (f4.responsables.length && !f4.responsables.includes(claveDeResponsable(f.t))) continue;
      if (f4.conRiesgo && !(f.t.riesgos ?? []).length) continue;
      ok.add(f.t.id); f.ancestros.forEach((a) => ok.add(a));
    }
    return ok;
  }, [soloVencidas, f4.estados, f4.responsables, f4.conRiesgo, todas, hoy]);
  /* filtrar por «Completada» enseña las completadas aunque estén ocultas */
  const verHechas = mostrarHechas || f4.estados.includes('done');

  /* el orden: por WBS, o por la columna, entre hermanas */
  const ordenadas = useMemo(() => {
    if (orden.k === 'wbs' && !orden.desc) return agrupar ? todas : todas.filter((f) => !f.esFase);
    const valor = (f: Fila): number => {
      const c = cifras.get(f.t.id)!;
      switch (orden.k) {
        case 's': return f.t.startDate ? new Date(f.t.startDate).getTime() : Infinity;
        case 'e': return f.t.endDate ? new Date(f.t.endDate).getTime() : Infinity;
        case 'dur': return duracionHabil(f.t, cal) ?? -1;
        case 'pct': return avanceDeTarea(f.t);
        case 'cost': return c.costo;
        default: return 0;
      }
    };
    const hijas = new Map<string | null, Fila[]>();
    for (const f of todas) { const l = hijas.get(f.padre) ?? []; l.push(f); hijas.set(f.padre, l); }
    const out: Fila[] = [];
    const raices = (): Fila[] => {
      const r = hijas.get(null) ?? [];
      return agrupar ? r : r.flatMap((f) => (f.esFase ? hijas.get(f.t.id) ?? [] : [f]));
    };
    const bajar = (padre: string | null) => {
      const l = [...(padre === null ? raices() : hijas.get(padre) ?? [])];
      if (orden.k !== 'wbs') l.sort((a, b) => (valor(a) - valor(b)) * (orden.desc ? -1 : 1));
      else if (orden.desc) l.reverse();
      for (const f of l) { out.push(f); bajar(f.t.id); }
    };
    bajar(null);
    return out;
  }, [todas, orden, cifras, cal, agrupar]);

  /* sin agrupar, la fase no pliega ni sangra: sus tareas son las de arriba */
  const ancestrosVisibles = useCallback((f: Fila) => (agrupar ? f.ancestros : f.ancestros.filter((a) => !porId.get(a)?.esFase)), [agrupar, porId]);
  const visibles = useMemo(() => ordenadas.filter((f) => {
    if (!agrupar && f.esFase) return false;
    if (ancestrosVisibles(f).some((a) => plegadas.has(a))) return false;
    if (enElFiltro && !enElFiltro.has(f.t.id)) return false;
    if (f.esFase) return true;
    if (!verHechas && estados.get(f.t.id) === 'done' && !f.ancestros.some((a) => abiertasConHechas.has(a))) return false;
    return true;
  }), [ordenadas, plegadas, enElFiltro, verHechas, estados, abiertasConHechas, agrupar, ancestrosVisibles]);

  const plegables = todas.filter((f) => tieneHijas(f.t));
  const algoAbierto = plegables.some((f) => !plegadas.has(f.t.id));

  const alternar = useCallback((f: Fila) => {
    setPlegadas((p) => {
      const n = new Set(p);
      if (n.has(f.t.id)) {
        n.delete(f.t.id);
        /* una fase terminada, abierta a mano: sus completadas a la vista */
        if (f.esFase && estados.get(f.t.id) === 'done') setAbiertasConHechas((s) => new Set(s).add(f.t.id));
      } else {
        n.add(f.t.id);
        setAbiertasConHechas((s) => { const m = new Set(s); m.delete(f.t.id); return m; });
      }
      return n;
    });
  }, [estados]);

  const guardarOcultas = (n: Set<Columna>) => {
    setOcultas(n);
    if (claveColumnas) { try { localStorage.setItem(claveColumnas, JSON.stringify([...n])); } catch { /* sin almacenamiento */ } }
  };
  const columnas = COLUMNAS.filter((c) => !ocultas.has(c) && (c !== 'cost' || conCosto));

  /* teclado: una sola fila con tabIndex 0 (la activa) */
  const tbody = useRef<HTMLTableSectionElement>(null);
  useEffect(() => {
    if (activa && !visibles.some((f) => f.t.id === activa)) setActiva(visibles[0]?.t.id ?? null);
  }, [visibles, activa]);
  const enfocar = (id: string) => {
    setActiva(id);
    requestAnimationFrame(() => tbody.current?.querySelector<HTMLElement>(`tr[data-id="${CSS.escape(id)}"]`)?.focus());
  };
  const alTeclear = (e: KeyboardEvent<HTMLTableRowElement>, f: Fila, i: number) => {
    const abierta = tieneHijas(f.t) && !plegadas.has(f.t.id);
    const siguiente = visibles[i + 1];
    const anterior = visibles[i - 1];
    const primera = visibles[0];
    const ultima = visibles[visibles.length - 1];
    if (e.key === 'ArrowDown' && siguiente) { e.preventDefault(); enfocar(siguiente.t.id); }
    else if (e.key === 'ArrowUp' && anterior) { e.preventDefault(); enfocar(anterior.t.id); }
    else if (e.key === 'Home' && primera) { e.preventDefault(); enfocar(primera.t.id); }
    else if (e.key === 'End' && ultima) { e.preventDefault(); enfocar(ultima.t.id); }
    else if (e.key === 'ArrowRight' && tieneHijas(f.t)) { e.preventDefault(); if (!abierta) alternar(f); else if (siguiente?.padre === f.t.id) enfocar(siguiente.t.id); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (abierta) alternar(f); else if (f.padre) enfocar(f.padre); }
    else if (e.key === 'Enter') { e.preventDefault(); if (f.esFase && agrupar) alternar(f); else setEnPanel(f.t.id); }
    else if (e.key === ' ') { e.preventDefault(); if (tieneHijas(f.t)) alternar(f); else setEnPanel(f.t.id); }
    else if (e.key === 'Escape' && enPanel) { e.preventDefault(); setEnPanel(null); }
    else if (e.key === 'F2' && onRegistrarHoras && !tieneHijas(f.t) && columnas.includes('hrs')) { e.preventDefault(); setEditando(f.t.id); }
  };

  /* G4 · la fila del panel (si la tarea ya no está, se cierra) y abrir otra desde él, a la vista */
  const filaDelPanel = enPanel ? porId.get(enPanel) ?? null : null;
  /* N24 · «Dependencias…»: el panel abre con «Añadir dependencia» desplegado */
  const [pedirDeps, setPedirDeps] = useState(0);
  useEffect(() => { if (enPanel && !porId.has(enPanel)) setEnPanel(null); }, [enPanel, porId]);
  const irA = (id: string) => {
    const f = porId.get(id);
    if (!f) return;
    setPlegadas((p) => { const n = new Set(p); f.ancestros.forEach((a) => n.delete(a)); return n; });
    if (estados.get(id) === 'done' && !mostrarHechas) cambiarVista({ ...vista, mostrarHechas: true });
    if (filtro === 'vencidas' && !estaVencida(f.t, hoy)) setFiltro(null);
    setEnPanel(id);
    enfocar(id);
  };
  irARef.current = irA;

  /* guía v4 · el panel cambia el estado y el avance de una hoja (la regla del %: al completar, 100; al reabrir, se conserva
   * y queda «por confirmar») */
  const [porConfirmar, setPorConfirmar] = useState<Set<string>>(new Set());
  const [errorAvance, setErrorAvance] = useState<string | null>(null);
  const STATUS: Record<EstadoV6, string> = { todo: 'todo', prog: 'in-progress', blocked: 'blocked', done: 'completed' };
  const guardarEstado = async (t: Task, e: EstadoV6) => {
    const de = estadoDeHoja(t);
    if (!onGuardarEstado || de === e) return;
    const progreso = e === 'done' ? 100 : Math.round(t.progress ?? 0);
    if (de === 'done' && e !== 'done') setPorConfirmar((p) => new Set(p).add(t.id));
    if (e === 'done') setPorConfirmar((p) => { const n = new Set(p); n.delete(t.id); return n; });
    await onGuardarEstado(t, STATUS[e], progreso);
  };
  const guardarAvance = async (t: Task, texto: string) => {
    const v = texto.trim();
    if (!/^\d{1,3}$/.test(v) || Number(v) > 100) { setErrorAvance(x.numeroAvance); return; }
    setErrorAvance(null);
    setPorConfirmar((p) => { const n = new Set(p); n.delete(t.id); return n; });
    if (Number(v) === Math.round(t.progress ?? 0)) return;
    await onGuardarEstado?.(t, String(t.status ?? STATUS[estadoDeHoja(t)]), Number(v));
  };
  useEffect(() => { setErrorAvance(null); }, [enPanel]);

  /* guía v4 · «Cómo leer la lista y atajos», en el «?» de la línea de resumen */
  const [ayuda, setAyuda] = useState(false);
  useEffect(() => {
    if (!ayuda) return;
    const fuera = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('.lv-ayuda, .help-btn')) setAyuda(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setAyuda(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [ayuda]);

  /* guía v4 · enlaces profundos: #t=3.4 abre el panel de esa tarea y #vencidas filtra las vencidas */
  const conTareas = todas.length > 0;
  useEffect(() => {
    if (!conTareas || typeof window === 'undefined') return;
    const leer = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (h === 'vencidas') setFiltro('vencidas');
      else if (h.startsWith('t=')) { const f = todasRef.current.find((r) => r.wbs === h.slice(2)); if (f) irARef.current(f.t.id); }
    };
    leer();
    window.addEventListener('hashchange', leer);
    return () => window.removeEventListener('hashchange', leer);
  }, [conTareas]);

  const total = useMemo(() => tasks.reduce((a, t) => {
    const c = cifrasDe(t, tarifaDe, hoy);
    return { reg: a.reg + c.reg, est: a.est + c.est, costo: a.costo + c.costo };
  }, { reg: 0, est: 0, costo: 0 }), [tasks, tarifaDe, hoy]);
  const fechasDelProyecto = useMemo(() => {
    let ini: number | null = null; let fin: number | null = null;
    for (const f of hojas) {
      if (f.t.startDate) ini = Math.min(ini ?? Infinity, new Date(f.t.startDate).getTime());
      if (f.t.endDate) fin = Math.max(fin ?? -Infinity, new Date(f.t.endDate).getTime());
    }
    return { ini: ini != null ? new Date(ini) : null, fin: fin != null ? new Date(fin) : null };
  }, [hojas]);
  /* regla v4 única (utils/avanceFisico): todas las hojas del proyecto, 1 h sin estimar, completada = 100 */
  const pctTotal = useMemo(() => computeWeightedProgress(collectLeaves(tasks)), [tasks]);

  /* F2 · guardar: se ve ya, se registra a los 5 s (la anterior en espera, si la hay, se registra antes) */
  const guardarHoras = (t: Task, wbs: string, antes: number, ahora: number) => {
    setEditando(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    if (pendienteRef.current) escribir(pendienteRef.current);
    const p: HorasPendientes = { id: t.id, wbs, antes, ahora, t };
    setHorasLocales((m) => new Map(m).set(t.id, ahora));
    setPendiente(p);
    temporizador.current = setTimeout(() => { escribir(p); setPendiente(null); temporizador.current = null; }, 5000);
    enfocar(t.id);
  };
  const deshacer = () => {
    const p = pendienteRef.current;
    if (!p) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    setHorasLocales((m) => { const n = new Map(m); n.delete(p.id); return n; });
    setPendiente(null);
    enfocar(p.id);
  };

  /* v4 · cambiar la tarea padre desde el panel (el Tablero hace lo mismo): al final de las hijas del nuevo padre, con su
     número nuevo en el aviso y «Deshacer», que la devuelve a su padre y a su sitio */
  const cambiarPadre = async (h: Task, padreId: string) => {
    if (!onCambiarPadre) return;
    const f = porId.get(h.id);
    const destino = porId.get(padreId);
    if (!f || !destino || f.padre === padreId) return;
    const viejo = f.padre;
    const hermanos = viejo ? porId.get(viejo)?.t.subtasks ?? [] : tasks;
    const posVieja = Math.max(0, hermanos.findIndex((s) => s.id === h.id));
    const hijos = destino.t.subtasks ?? [];
    const numero = Math.max(0, ...hijos.map((s) => Number((porId.get(s.id)?.wbs ?? '').split('.').pop()) || 0)) + 1;
    const wbsNuevo = `${destino.wbs}.${numero}`;
    const bien = await onCambiarPadre(h, destino.t.id, hijos.length);
    if (bien === false) return;
    setAvisoPadre({
      texto: destino.nivel === 0 ? x.ahoraDirecta(h.name, wbsNuevo, destino.t.name) : x.ahoraDentro(h.name, wbsNuevo, destino.t.name),
      deshacer: () => {
        setAvisoPadre(null);
        void Promise.resolve(onCambiarPadre(h, viejo, posVieja)).then((ok) => { if (ok !== false) setAvisoPadre({ texto: x.devuelta(h.name) }); });
      },
    });
  };

  /* E15 (Yesid, 17-nov) · quitar la sangría: la tarea sale de su padre y queda justo después de él */
  const quitarSangria = async (h: Task) => {
    const f = porId.get(h.id);
    if (!onCambiarPadre || !f?.padre) return;
    const padreF = porId.get(f.padre);
    if (!padreF) return;
    const abuelo = padreF.padre;
    const tios = abuelo ? porId.get(abuelo)?.t.subtasks ?? [] : tasks;
    const pos = Math.max(0, tios.findIndex((s) => s.id === padreF.t.id)) + 1;
    const posVieja = Math.max(0, (padreF.t.subtasks ?? []).findIndex((s) => s.id === h.id));
    const bien = await onCambiarPadre(h, abuelo, pos);
    if (bien === false) return;
    setAvisoPadre({
      texto: x.fuera(h.name, padreF.t.name),
      deshacer: () => {
        setAvisoPadre(null);
        void Promise.resolve(onCambiarPadre(h, padreF.t.id, posVieja)).then((ok) => { if (ok !== false) setAvisoPadre({ texto: x.devuelta(h.name) }); });
      },
    });
  };

  /* E15 · la fila para escribir una tarea nueva: al final de su padre (null = al final de la lista) */
  const [nueva, setNueva] = useState<{ padre: string | null } | null>(null);
  const [textoNueva, setTextoNueva] = useState('');
  const [creando, setCreando] = useState(false);
  const abrirNueva = (padre: string | null) => {
    if (padre) {
      const f = porId.get(padre);
      setPlegadas((p) => { const n = new Set(p); n.delete(padre); f?.ancestros.forEach((a) => n.delete(a)); return n; });
    }
    setTextoNueva('');
    setNueva({ padre });
  };
  /* N26 (2ª revisión de Yesid): «después de Enter el campo pierde el cursor, aunque el texto dice "deja escribir otra", y
     Esc no lo cierra». El campo ya no se apaga mientras se crea (readOnly en vez de disabled: no suelta el foco) y vuelve a
     tener el cursor al terminar; así Esc también le llega. */
  const campoNueva = useRef<HTMLInputElement | null>(null);
  const crearNueva = async () => {
    const nombre = textoNueva.trim();
    if (!nombre || !nueva || !onCrearTarea || creando) return;
    setCreando(true);
    try {
      const bien = await onCrearTarea(nombre, nueva.padre);
      if (bien !== false) setTextoNueva('');
    } finally {
      setCreando(false);
      requestAnimationFrame(() => campoNueva.current?.focus());
    }
  };
  /* la fila de escritura va detrás de la última fila visible de su padre */
  const trasDe = useMemo(() => {
    if (!nueva?.padre) return null;
    let ultima: string | null = null;
    for (const f of visibles) if (f.t.id === nueva.padre || f.ancestros.includes(nueva.padre)) ultima = f.t.id;
    return ultima;
  }, [nueva, visibles]);

  /* E15 · el menú contextual de la fila: el mismo orden que el del Gantt (armarMenuDeLaTarea) */
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const cajaMenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const fuera = (e: MouseEvent) => { if (!cajaMenu.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); enfocar(menu.id); } };
    const cerrar = () => setMenu(null);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    cajaMenu.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', cerrar, true); window.removeEventListener('resize', cerrar);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);
  const opcionesDelMenu = (f: Fila) => {
    const t = f.t;
    const esPadre = tieneHijas(t);
    const hermanos = f.padre ? porId.get(f.padre)?.t.subtasks ?? [] : tasks;
    const i = hermanos.findIndex((s) => s.id === t.id);
    const hermana = i > 0 ? hermanos[i - 1]! : null;
    const puede = panel?.puedeEditarTarea ? panel.puedeEditarTarea(t) : panel?.puedeEditar !== false;
    const e = estadoDeHoja(t);
    return armarMenuDeLaTarea({
      edit: { label: x.m.edit, icon: MenuIcons.Pencil, onClick: () => setEnPanel(t.id) },
      addSubtask: { label: x.m.addSubtask, icon: MenuIcons.Add, disabled: !onCrearTarea, onClick: () => abrirNueva(t.id) },
      ...(onCambiarPadre ? {
        indent: { label: x.m.indent, icon: MenuIcons.Indent, disabled: !hermana, onClick: () => { if (hermana) void cambiarPadre(t, hermana.id); } },
        outdent: { label: x.m.outdent, icon: MenuIcons.Outdent, disabled: !f.padre, onClick: () => void quitarSangria(t) },
      } : {}),
      ...(panel ? { dependencies: { label: x.m.dependencies, icon: MenuIcons.Link, disabled: esPadre, onClick: () => { setEnPanel(t.id); setPedirDeps((n) => n + 1); } } } : {}),
      ...(panel?.onActualizar ? {
        milestone: {
          label: t.isMilestone ? x.m.quitarHito : x.m.hito, icon: MenuIcons.Milestone, disabled: esPadre || !puede,
          onClick: () => void panel.onActualizar!(t, { isMilestone: !t.isMilestone }),
        },
      } : {}),
      ...(onGuardarEstado ? {
        markIncomplete: { label: x.m.markIncomplete, icon: MenuIcons.MarkIncomplete, disabled: esPadre || e === 'todo', onClick: () => void guardarEstado(t, 'todo') },
        setInProgress: { label: x.m.setInProgress, icon: MenuIcons.SetInProgress, disabled: esPadre || e === 'prog', onClick: () => void guardarEstado(t, 'prog') },
        markComplete: { label: x.m.markComplete, icon: MenuIcons.MarkComplete, disabled: esPadre || e === 'done', onClick: () => void guardarEstado(t, 'done') },
      } : {}),
      ...(onDuplicar ? { duplicate: { label: x.m.duplicate, icon: MenuIcons.Duplicate, onClick: () => onDuplicar(t) } } : {}),
      ...(onEliminar ? { delete: { label: x.m.delete, icon: MenuIcons.Delete, onClick: () => onEliminar(t) } } : {}),
    });
  };
  const filaDelMenu = menu ? porId.get(menu.id) ?? null : null;

  const ordenarPor = (k: Orden['k']) => setOrden((o) => (o.k === k ? { k, desc: !o.desc } : { k, desc: false }));
  const ariaSort = (k: Orden['k']) => (orden.k === k ? (orden.desc ? 'descending' : 'ascending') : 'none') as 'ascending' | 'descending' | 'none';
  const Th = ({ k, children, num, dur, ayuda }: { k?: Orden['k']; children: ReactNode; num?: boolean; dur?: boolean; ayuda?: string }) => (
    <th scope="col" className={[num && 'num', dur && 'col-dur'].filter(Boolean).join(' ') || undefined} aria-sort={k ? ariaSort(k) : undefined} title={ayuda}>
      {k ? (
        <button type="button" className="sortb" onClick={() => ordenarPor(k)}>
          {children}
          {orden.k === k && <span aria-hidden className="ar">{orden.desc ? '↓' : '↑'}</span>}
        </button>
      ) : children}
    </th>
  );

  const celda = (c: Columna, f: Fila) => {
    const t = f.t;
    const ci = cifras.get(t.id)!;
    const padre = tieneHijas(t);
    switch (c) {
      case 'who': {
        if (padre) return <td key={c} className="col-who" />;
        const a = (t.assignees ?? [])[0] as { name?: string; initials?: string } | undefined;
        return (
          <td key={c} className="col-who">
            {a ? <span className="avatar" role="img" title={a.name} aria-label={a.name}>{a.initials || iniciales(a.name)}</span>
              : <span className="avatar none" role="img" title={x.sinResp} aria-label={x.sinResp}>+</span>}
          </td>
        );
      }
      case 'st': {
        const e = estados.get(t.id)!;
        return <td key={c} className="col-st"><span className={`schip ${e}`}><i aria-hidden="true" />{x.st[e]}</span></td>;
      }
      case 's': return <td key={c} className="num dt">{t.startDate ? fechaCorta(new Date(t.startDate), idioma, hoy) : '—'}</td>;
      case 'e': {
        const txt = t.endDate ? fechaCorta(new Date(t.endDate), idioma, hoy) : '—';
        if (estaVencida(t, hoy)) {
          const n = diasDeRetraso(t, hoy, cal);
          return <td key={c} className="num dt"><span className="chip-red" title={x.vencidaEl(txt, n)}>{txt}<span className="sr">, {x.venceHace(n)}</span></span></td>;
        }
        return <td key={c} className="num dt">{txt}</td>;
      }
      case 'dur': { const d = duracionHabil(t, cal); return <td key={c} className="num col-dur">{d == null ? '—' : `${d} d`}</td>; }
      case 'pct': { const p = avanceDeTarea(t); return <td key={c} className="num"><span className={`pct${p === 0 ? ' zero' : ''}`}>{p}%</span></td>; }
      case 'hrs': {
        if (editando === t.id) return (
          <td key={c} className="num" onClick={(e) => e.stopPropagation()}>
            <EditorDeHoras t={t} antes={ci.reg} est={ci.est} es={es} x={x} hoy={hoy} cal={cal} idioma={idioma}
              onGuardar={(v) => guardarHoras(t, f.wbs, ci.reg, v)} onCancelar={() => { setEditando(null); enfocar(t.id); }} />
          </td>
        );
        /* guía v4 · una hoja sin horas estimadas dice «Sin estimar» (para el avance pesa como 1 h) */
        const sinEstimar = !padre && !t.isMilestone && !ci.est;
        const texto = sinEstimar
          ? <><b>{horasCortas(ci.reg, es)}</b><span className="est"> / </span><span className="noest" title={x.sinEstimarTip}>{x.sinEstimar}</span></>
          : <><b>{horasCortas(ci.reg, es)}</b><span className="est"> / {horasCortas(ci.est, es)} h</span></>;
        return (
          <td key={c} className="num">
            {!padre && onRegistrarHoras ? (
              <button type="button" className="hrs ed" tabIndex={-1} aria-label={x.editarHoras(f.wbs)} title={x.editarHoras(f.wbs)}
                onClick={(e) => { e.stopPropagation(); setActiva(t.id); setEditando(t.id); }}>{texto}</button>
            ) : <span className="hrs">{texto}</span>}
          </td>
        );
      }
      case 'cost': return <td key={c} className="num">{millones(ci.costo, es)}</td>;
    }
  };

  /* E15 · la fila donde se escribe la tarea nueva (Enter crea y deja escribir otra; Esc cancela) */
  const filaNueva = (padreF: Fila | undefined) => {
    const nivel = padreF ? padreF.nivel + 1 : 0;
    const etiqueta = padreF ? x.anadirEn(padreF.t.name) : x.anadir;
    return (
      <tr key={`nueva-${padreF?.t.id ?? 'raiz'}`} className="add-row nueva">
        <td colSpan={columnas.length + 2}>
          <div className="cell">
            {nivel > 0 && <span className="gd" style={{ ['--n' as string]: nivel }} aria-hidden="true" />}
            <span className="ind" />
            <input ref={campoNueva} autoFocus type="text" value={textoNueva} readOnly={creando} aria-busy={creando || undefined} aria-label={etiqueta} placeholder={x.nombreNueva}
              title={x.ayudaNueva} maxLength={500}
              onChange={(e) => setTextoNueva(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); void crearNueva(); }
                if (e.key === 'Escape') { e.preventDefault(); setNueva(null); if (padreF) enfocar(padreF.t.id); }
              }}
              onBlur={() => { if (!textoNueva.trim() && !creando) setNueva(null); }} />
            <span className="add-tip">{x.ayudaNueva}</span>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className={`lista-v6 lista-v4${vista.densidad === 'compacta' ? ' d32' : vista.densidad === 'comoda' ? ' d48' : ''}${filaDelPanel ? ' has-panel' : ''}`} aria-label={x.tareasDe}>
      <style>{CSS_V6 + CSS_PANEL_V6 + CSS_RECURSOS_V6 + CSS_PANEL_V4 + CSS_COSTOS_V4 + CSS_LISTA_V4}</style>
      <div className="sumline">
        <div>
          {soloVencidas && (
            <span className="fchip">{x.filtrando}<button type="button" aria-label={x.quitar} onClick={() => { setFiltro(null); if (f4.vencidas) onFiltros?.({ ...f4, vencidas: false }); }}>×</button></span>
          )}
          {f4.estados.length > 0 && (
            <span className="fchip">{x.fEstado}: {f4.estados.map((e) => x.st[e]).join(', ')}<button type="button" aria-label={`${x.quitarFiltro}: ${x.fEstado}`} onClick={() => onFiltros?.({ ...f4, estados: [] })}>×</button></span>
          )}
          {f4.responsables.length > 0 && (
            <span className="fchip">{x.resp}: {f4.responsables.length}<button type="button" aria-label={`${x.quitarFiltro}: ${x.resp}`} onClick={() => onFiltros?.({ ...f4, responsables: [] })}>×</button></span>
          )}
          {f4.conRiesgo && (
            <span className="fchip">{x.fRiesgo}<button type="button" aria-label={`${x.quitarFiltro}: ${x.fRiesgo}`} onClick={() => onFiltros?.({ ...f4, conRiesgo: false })}>×</button></span>
          )}
          <span className="mono">{nAbiertas}</span> {nAbiertas === 1 ? x.tarea : x.tareas}
          {nHechas > 0 && (
            <>
              <span className="sep" aria-hidden="true">·</span>
              <span className="mono">{nHechas}</span> {mostrarHechas ? x.aLaVista : x.ocultas}{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); cambiarVista({ ...vista, mostrarHechas: !mostrarHechas }); }}>{mostrarHechas ? x.ocultar : x.mostrar}</a>
            </>
          )}
          {nVencidas > 0 && (
            <>
              <span className="sep" aria-hidden="true">·</span>
              <span className="red"><span className="mono">{nVencidas}</span> {nVencidas === 1 ? x.vencida : x.vencidas}</span>{' '}
              <a href="#" className="red" onClick={(e) => { e.preventDefault(); setFiltro((v) => (v ? null : 'vencidas')); }}>{x.ver}</a>
            </>
          )}
        </div>
        <div className="sum-r">
          <a href="#" onClick={(e) => {
            e.preventDefault();
            setPlegadas(algoAbierto ? new Set(plegables.map((f) => f.t.id)) : new Set());
            if (!algoAbierto) setAbiertasConHechas(new Set());
          }}>{algoAbierto ? x.plegar : x.desplegar}</a>
          <button type="button" className="help-btn" aria-haspopup="dialog" aria-expanded={ayuda} aria-label={x.ayudaTit} title={x.ayudaTit}
            onClick={() => setAyuda((v) => !v)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5" /><path d="M6.4 6.4a1.7 1.7 0 1 1 2.4 1.6c-.5.3-.8.6-.8 1.2M8 11.2v.1" /></svg>
          </button>
          {ayuda && (
            <div className="lv-ayuda" role="dialog" aria-label={x.ayudaTit}>
              <h6>{x.comoLeer}</h6>
              <div className="legend">
                <span><span className="chip-red">{fechaCorta(hoy, idioma, hoy)}</span>{x.lVencida}</span>
                {(['todo', 'prog', 'blocked', 'done'] as EstadoV6[]).map((e) => <span key={e}><span className={`schip ${e}`}><i aria-hidden="true" />{x.st[e]}</span></span>)}
                <span><span aria-hidden="true"><EscudoDeRiesgo riesgos={[{ id: '_', codigo: '', titulo: '', nivel: 'alto' }]} es={es} className="rk" /></span>{x.lRiesgo}</span>
                <span><span className="noest">{x.sinEstimar}</span>{x.lSinEst}</span>
                <span><span className="gd-muestra" aria-hidden="true" />{x.lGuia}</span>
                <h6>{x.teclado}</h6>
                <span><span className="lg-keys"><kbd>↑</kbd><kbd>↓</kbd></span>{x.kFilas}</span>
                <span><span className="lg-keys"><kbd>←</kbd><kbd>→</kbd></span>{x.kAbrir}</span>
                <span><span className="lg-keys"><kbd>Enter</kbd></span>{x.kDetalle}</span>
                {onRegistrarHoras && <span><span className="lg-keys"><kbd>F2</kbd></span>{x.kHoras}</span>}
                <span><span className="lg-keys"><kbd>Esc</kbd></span>{x.kCerrar}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`lbody${filaDelPanel ? ' has-panel' : ''}`}>
      <div className="lwrap">
        <p id="lv6-ayuda" className="sr">{x.ayuda}</p>
        <table className="lt" role="treegrid" aria-label={x.tareasDe} aria-describedby="lv6-ayuda">
          <thead>
            <tr>
              <th scope="col" className="c1" aria-sort={ariaSort('wbs')}>
                <button type="button" className="sortb" onClick={() => ordenarPor('wbs')}>
                  {x.wbs}{orden.k === 'wbs' && <span aria-hidden className="ar">{orden.desc ? '↓' : '↑'}</span>}
                </button>
              </th>
              {columnas.map((c) => {
                if (c === 'who') return (
                  <th key={c} scope="col" className="col-who" title={x.resp}>
                    <span className="sr">{x.resp}</span>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ display: 'block' }}>
                      <circle cx="8" cy="5.5" r="2.6" /><path d="M3 13.5c.8-2.6 2.7-3.8 5-3.8s4.2 1.2 5 3.8" strokeLinecap="round" />
                    </svg>
                  </th>
                );
                if (c === 'st') return <th key={c} scope="col" className="col-st" title={AYUDA_COL(c, x)}>{x.estado}</th>;
                if (c === 'hrs') return <th key={c} scope="col" className="num col-hrs" title={AYUDA_COL(c, x)}>{x.horas}</th>;
                const k = ({ s: 's', e: 'e', dur: 'dur', pct: 'pct', cost: 'cost' } as Record<string, Orden['k']>)[c];
                return <Th key={c} k={k} num dur={c === 'dur'} ayuda={AYUDA_COL(c, x, monedaCodigo)}>{NOMBRE_COL(c, x)}</Th>;
              })}
              <th className="col-plus" ref={cajaCols}>
                <button type="button" className="col-plus-btn" aria-label={x.columnas} title={x.columnas} aria-expanded={menuCols}
                  onClick={() => setMenuCols((v) => !v)}>
                  +{ocultas.size > 0 && !(ocultas.size === OCULTAS_POR_DEFECTO.length && OCULTAS_POR_DEFECTO.every((c) => ocultas.has(c))) && <span className="n">{ocultas.size}</span>}
                </button>
                {menuCols && (
                  <div className="cols-menu" role="menu" onKeyDown={(e) => { if (e.key === 'Escape') setMenuCols(false); }}>
                    {COLUMNAS.filter((c) => c !== 'cost' || conCosto).map((c) => (
                      <label key={c}>
                        <input type="checkbox" checked={!ocultas.has(c)} onChange={(e) => {
                          const n = new Set(ocultas);
                          if (e.target.checked) n.delete(c); else n.add(c);
                          guardarOcultas(n);
                        }} />
                        {NOMBRE_COL(c, x)}
                      </label>
                    ))}
                    <hr />
                    <button type="button" className="mi" onClick={() => guardarOcultas(new Set())}>{x.todas}</button>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody ref={tbody}>
            {visibles.length === 0 && (
              <tr><td colSpan={columnas.length + 2} className="vacia">{x.vacia}</td></tr>
            )}
            {visibles.map((f, i) => {
              const t = f.t;
              const padre = tieneHijas(t);
              const ci = cifras.get(t.id)!;
              const abierta = padre && !plegadas.has(t.id);
              const tabActiva = (activa ?? visibles[0]?.t.id) === t.id;
              const ruta = [...f.ancestros.map((a) => porId.get(a)?.t.name ?? ''), t.name].join(' › ');
              const nivel = agrupar ? f.nivel : f.nivel - (f.ancestros.length - ancestrosVisibles(f).length);
              const fila = (
                <tr key={t.id} data-id={t.id} className={`${f.esFase ? 'grp' : padre ? 'par' : 'task'}${(enPanel ?? seleccionada) === t.id ? ' sel' : ''}`}
                  tabIndex={tabActiva ? 0 : -1} aria-level={nivel + 1} aria-expanded={padre ? abierta : undefined}
                  aria-selected={(enPanel ?? seleccionada) === t.id}
                  onClick={() => { setActiva(t.id); if (f.esFase && agrupar) alternar(f); else setEnPanel(t.id); }}
                  onFocus={() => setActiva(t.id)}
                  onContextMenu={(e) => { e.preventDefault(); setActiva(t.id); setMenu({ x: e.clientX, y: e.clientY, id: t.id }); }}
                  onKeyDown={(e) => {
                    /* E15 · el menú también con el teclado (Mayús+F10 o la tecla de menú) */
                    if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') {
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenu({ x: r.left + 40, y: r.bottom, id: t.id });
                      return;
                    }
                    alTeclear(e, f, i);
                  }}>
                  <td className="c1">
                    <div className="cell">
                      {nivel > 0 && <span className="gd" style={{ ['--n' as string]: nivel }} aria-hidden="true" />}
                      {padre ? (
                        <button type="button" className={`chev${abierta ? '' : ' closed'}`} tabIndex={-1} aria-hidden="true"
                          onClick={(e) => { e.stopPropagation(); alternar(f); }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
                        </button>
                      ) : <span className="ind" />}
                      <span className="wbs">{f.wbs}</span>
                      {/* N29 (2ª revisión de Yesid): «"Convert to milestone" no deja ninguna marca en la Lista» */}
                      {t.isMilestone && <span className="hito" role="img" aria-label={x.esHito} title={x.esHito} data-hito="">◆</span>}
                      <span className="nm" title={ruta}>{t.name}</span>
                      <EscudoDeRiesgo riesgos={t.riesgos} es={es} className="rk" />
                      {padre && <span className="cnt" title={x.hechas(ci.hechas, ci.hojas)}>{ci.hechas}/{ci.hojas}</span>}
                      {padre && ci.vencidas > 0 && <span className="od">{ci.vencidas} {ci.vencidas === 1 ? x.vencida : x.vencidas}</span>}
                      {padre && onCrearTarea && (
                        <button type="button" className="add-sub" tabIndex={-1} aria-label={x.anadirEn(t.name)} title={x.anadirEn(t.name)}
                          onClick={(e) => { e.stopPropagation(); abrirNueva(t.id); }}>+</button>
                      )}
                    </div>
                  </td>
                  {columnas.map((c) => <Fragment key={c}>{celda(c, f)}</Fragment>)}
                  <td className="col-plus" />
                </tr>
              );
              return trasDe === t.id && nueva?.padre ? <Fragment key={t.id}>{fila}{filaNueva(porId.get(nueva.padre))}</Fragment> : fila;
            })}
            {onCrearTarea && (nueva && nueva.padre === null ? filaNueva(undefined) : (
              <tr className="add-row">
                <td colSpan={columnas.length + 2}>
                  <button type="button" className="add-btn" onClick={() => abrirNueva(null)}>
                    <span aria-hidden="true">+</span> {x.anadir}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="c1"><div className="cell"><span className="ind" />{x.total}</div></td>
              {columnas.map((c) => {
                if (c === 's') return <td key={c} className="num dt">{fechasDelProyecto.ini ? fechaCorta(fechasDelProyecto.ini, idioma, hoy) : '—'}</td>;
                if (c === 'e') {
                  /* v4 · «una sola verdad»: el fin previsto de la cabecera; el del plan, en el globo si difiere */
                  const fin = finPrevisto ?? fechasDelProyecto.fin;
                  const plan = fechasDelProyecto.fin;
                  const difiere = !!finPrevisto && !!plan && fechaCorta(finPrevisto, idioma, hoy) !== fechaCorta(plan, idioma, hoy);
                  return (
                    <td key={c} className="num dt" data-fin-previsto
                      title={difiere ? x.finPrevistoTip(fechaCorta(finPrevisto!, idioma, hoy), fechaCorta(plan!, idioma, hoy)) : undefined}>
                      {fin ? fechaCorta(fin, idioma, hoy) : '—'}
                    </td>
                  );
                }
                if (c === 'pct') return <td key={c} className="num">{avanceTotal != null ? Math.round(avanceTotal) : pctTotal}%</td>;
                if (c === 'hrs') return <td key={c} className="num">{horasCortas(total.reg, es)} / {horasCortas(total.est, es)} h</td>;
                if (c === 'cost') return <td key={c} className="num">{millones(total.costo, es)}</td>;
                return <td key={c} className={c === 'dur' ? 'col-dur' : undefined} />;
              })}
              <td className="col-plus" />
            </tr>
          </tfoot>
        </table>
      </div>
      {filaDelPanel && (
        <PanelDeTareaV4 fila={filaDelPanel} es={es} cal={cal} hoy={hoy} nombreProyecto={nombreProyecto}
          cifras={cifras.get(filaDelPanel.t.id)!} estados={estados} nombreEstado={x.st} porId={porId} tarifaDe={tarifaDe} conCosto={conCosto}
          onEstado={onGuardarEstado ? (t, e) => void guardarEstado(t, e) : undefined}
          onAvance={onGuardarEstado ? (t, texto) => void guardarAvance(t, texto) : undefined}
          porConfirmar={porConfirmar.has(filaDelPanel.t.id)} errorAvance={errorAvance}
          onCambiarPadre={onCambiarPadre ? (t, padreId) => void cambiarPadre(t, padreId) : undefined}
          acciones={panel ? { ...panel, onAbrirEnLista: undefined } : undefined}
          abrirDependencias={pedirDeps}
          onCerrar={() => { const id = filaDelPanel.t.id; setEnPanel(null); setPedirDeps(0); if (visibles.some((f) => f.t.id === id)) enfocar(id); }}
          /* N23 (2ª revisión de Yesid): «"Open full task" abre el panel viejo y quedan los dos abiertos a la vez»: se cierra este */
          onAbrirFicha={onAbrir ? (t) => { setEnPanel(null); onAbrir(t); } : undefined} onIrA={irA} onVerRiesgo={onVerRiesgo} />
      )}
      </div>
      {/* guía v4 · un solo pie, «Costos del proyecto» (el mismo del Tablero); el pie de la app, solo si no manda las cifras */}
      {salud === undefined && pie}
      <div className="vfoot vfoot-fin">
        <CostosDelProyectoV4 tasks={tasks} es={es} tarifaDe={tarifaDe} tarifaDePersona={tarifaDePersona} monedaCodigo={monedaCodigo}
          salud={salud} conCosto={conCosto} onVerRecursos={onVerRecursos} />
      </div>
      {menu && filaDelMenu && (
        <div ref={cajaMenu} className="lv-menu" role="menu" aria-label={x.menuDe(filaDelMenu.t.name)}
          style={{ left: Math.max(8, Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 248)),
            top: Math.max(8, Math.min(menu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 420)) }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const bs = [...(cajaMenu.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
            const i = bs.indexOf(document.activeElement as HTMLButtonElement);
            bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length]?.focus();
          }}>
          {opcionesDelMenu(filaDelMenu).map((it) => (it.separator
            ? <div key={it.id} className="lv-menu-sep" role="separator" />
            : (
              <button key={it.id} type="button" role="menuitem" data-op={it.id} disabled={it.disabled}
                onClick={() => { const id = menu.id; setMenu(null); it.onClick(); if (it.id !== 'edit' && it.id !== 'dependencies' && it.id !== 'addSubtask') enfocar(id); }}>
                <span className="ic" aria-hidden="true">{it.icon}</span>{it.label}
              </button>
            )))}
        </div>
      )}
      <div className="toast-zona" aria-live="polite">
        {pendiente && (
          <div className="toast">
            <span>{x.guardadas(pendiente.wbs, horasCortas(pendiente.ahora, es), horasCortas(pendiente.antes, es))}</span>
            <button type="button" onClick={deshacer}>{x.deshacer}</button>
          </div>
        )}
        {avisoPadre && !pendiente && (
          <div className="toast" data-aviso-padre>
            <span>{avisoPadre.texto}</span>
            {avisoPadre.deshacer && <button type="button" onClick={avisoPadre.deshacer}>{x.deshacer}</button>}
          </div>
        )}
      </div>
    </section>
  );
}

/** F2 · la celda de horas en edición: Enter guarda (un aviso pide otro Enter), Esc cancela, salir guarda si no hay pegas. */
function EditorDeHoras({ t, antes, est, es, x, hoy, cal, idioma, onGuardar, onCancelar }: {
  t: Task; antes: number; est: number; es: boolean; x: typeof TXT.es; hoy: Date; cal: Calendario; idioma: 'es' | 'en';
  onGuardar: (v: number) => void; onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(horasCortas(antes, es));
  const [msg, setMsg] = useState<{ txt: string; error: boolean } | null>(null);
  const confirmado = useRef<string | null>(null);
  const hecho = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const mensaje = (j: ReturnType<typeof juzgarHoras>): string => {
    if (j.tipo === 'error') return j.motivo === 'numero' ? x.numero : j.motivo === 'negativas' ? x.negativas : x.menos;
    if (j.tipo !== 'aviso') return '';
    const a = j.motivo === 'doble' ? x.doble(horasCortas(est, es))
      : j.motivo === 'noEmpieza' ? x.noEmpieza(t.startDate ? fechaCorta(new Date(t.startDate), idioma, hoy) : '')
      : x.porDia(j.dias ?? 0);
    return `${a} ${x.otraVez}`;
  };
  const terminar = (f: () => void) => { hecho.current = true; f(); };
  const intentar = (alSalir: boolean) => {
    if (hecho.current) return;
    const j = juzgarHoras(texto, antes, t, hoy, cal);
    if (j.tipo === 'igual') return terminar(onCancelar);
    if (j.tipo === 'ok') return terminar(() => onGuardar(j.valor));
    if (alSalir) return terminar(onCancelar);
    if (j.tipo === 'aviso' && confirmado.current === texto.trim()) return terminar(() => onGuardar(j.valor));
    if (j.tipo === 'aviso') confirmado.current = texto.trim();
    setMsg({ txt: mensaje(j), error: j.tipo === 'error' });
  };
  return (
    <span className="hrs-edit">
      <input ref={ref} value={texto} inputMode="decimal" aria-label={x.editarHoras(t.name)}
        aria-invalid={msg?.error || undefined} aria-describedby={msg ? `lv6-h-${t.id}` : undefined}
        onChange={(e) => { setTexto(e.target.value); setMsg(null); confirmado.current = null; }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); intentar(false); }
          else if (e.key === 'Escape') { e.preventDefault(); terminar(onCancelar); }
        }}
        onBlur={() => intentar(true)} />
      <span className="est"> / {horasCortas(est, es)} h</span>
      {msg && <span id={`lv6-h-${t.id}`} role="alert" className={`hrs-msg${msg.error ? ' err' : ''}`}>{msg.txt}</span>}
    </span>
  );
}

/* Los tokens son los del Gantt v6 (`--v6-*`, en la app); las medidas, las de la maqueta. */
export const CSS_V6 = `
.lista-v6{background:var(--v6-tarjeta);border:1px solid var(--v6-borde);border-radius:16px;box-shadow:var(--v6-sombra-tarjeta);display:flex;flex-direction:column;min-height:0;position:relative;color:var(--v6-texto);font-size:13px}
.lista-v6 .mono{font-family:'Geist Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:400}
.lista-v6 .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lista-v6 .sumline{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:24px;padding:4px 14px;margin-top:4px;font-size:11px;color:var(--v6-tenue)}
.lista-v6 .sumline a{color:var(--v6-acento-texto);font-weight:500;text-decoration:underline;text-underline-offset:2px}
.lista-v6 .sumline .sep{margin:0 5px;color:var(--v6-separador)}
.lista-v6 .sumline .red,.lista-v6 .sumline a.red{color:var(--v6-rojo)}
.lista-v6 .fchip{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 2px 0 9px;border-radius:999px;background:var(--v6-fila-seleccionada);color:var(--v6-acento-texto);font-weight:500;margin-right:8px}
.lista-v6 .fchip button{width:20px;height:20px;border-radius:999px;border:0;background:transparent;color:inherit;cursor:pointer}
.lista-v6 .lwrap{flex:1;min-width:0;overflow:auto;max-height:calc(100vh - 262px);min-height:420px;border-top:1px solid var(--v6-linea);scroll-padding:34px 0 40px}
.lista-v6 table.lt{border-collapse:separate;border-spacing:0;width:100%}
.lista-v6 .lt th,.lista-v6 .lt td{height:40px;padding:0 10px;border-bottom:1px solid var(--v6-linea);white-space:nowrap;text-align:left;background:var(--v6-tarjeta)}
.lista-v6 .lt thead th{position:sticky;top:0;z-index:3;height:34px;font-size:11px;font-weight:500;color:var(--v6-tenue);user-select:none}
.lista-v6 .lt thead th.num{text-align:right;font-family:inherit;font-size:11px;font-weight:500;color:var(--v6-tenue)}
.lista-v6 .lt .sortb{display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 4px;margin:0 -4px;border-radius:6px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap}
.lista-v6 .lt .sortb:hover,.lista-v6 .lt th[aria-sort=ascending] .sortb,.lista-v6 .lt th[aria-sort=descending] .sortb{color:var(--v6-texto)}
.lista-v6 .lt .c1{position:sticky;left:0;z-index:2;width:36%;min-width:330px;max-width:540px}
.lista-v6 .lt thead .c1{z-index:4}
.lista-v6 .lt .cell{display:flex;align-items:center;gap:8px;min-width:0}
.lista-v6 .lt .wbs{font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue);min-width:28px;text-align:right;flex:none}
.lista-v6 .lt .nm{overflow:hidden;text-overflow:ellipsis;font-weight:500;min-width:0}
.lista-v6 .lt .cnt{font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue);flex:none}
.lista-v6 .lt .od{color:var(--v6-rojo);font-weight:500;font-size:11px;flex:none}
.lista-v6 .lt .num{text-align:right;font-family:'Geist Mono',monospace;font-variant-numeric:tabular-nums;font-weight:400;font-size:12px;color:var(--v6-texto-2)}
.lista-v6 .lt .dt{font-size:11px}
.lista-v6 .lt tbody tr{cursor:pointer}
.lista-v6 .lt tbody tr:hover>td{background:color-mix(in srgb,var(--v6-tarjeta),var(--v6-texto) 3%)}
.lista-v6 .lt tbody tr.sel>td{background:color-mix(in srgb,var(--v6-tarjeta),var(--v6-acento) 8%)}
.lista-v6 .lt tbody tr.sel>td.c1{box-shadow:inset 2px 0 0 var(--v6-acento)}
.lista-v6 .lt tbody tr:focus-visible{outline:none}
.lista-v6 .lt tbody tr:focus-visible>td{box-shadow:inset 0 2px 0 var(--v6-acento-texto),inset 0 -2px 0 var(--v6-acento-texto)}
.lista-v6 .lt tr.grp td,.lista-v6 .lt tr.par td,.lista-v6 .lt tr.grp .nm,.lista-v6 .lt tr.par .nm{font-weight:600}
.lista-v6 .lt tr.grp .num,.lista-v6 .lt tr.par .num{color:var(--v6-texto);font-weight:500}
.lista-v6 .lt .chev{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--v6-tenue);flex:none;margin-left:-6px;border:0;background:transparent;cursor:pointer;font-size:12px;transition:transform .15s}
.lista-v6 .lt .chev:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.lista-v6 .lt .chev.closed{transform:rotate(-90deg)}
.lista-v6 .lt .ind{width:24px;flex:none;margin-left:-6px}
.lista-v6 .lt tfoot td{position:sticky;bottom:0;z-index:2;font-weight:600;border-top:1px solid var(--v6-borde);border-bottom:0;height:38px}
.lista-v6 .lt tfoot .num{color:var(--v6-texto);font-weight:500}
.lista-v6 .lt tfoot .c1{z-index:5}
.lista-v6 .lt .vacia{text-align:center;color:var(--v6-tenue);font-size:12px}
.lista-v6 .schip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;background:var(--v6-linea);color:var(--v6-texto-2);font-size:11px;font-weight:500;white-space:nowrap}
.lista-v6 .schip i{width:6px;height:6px;border-radius:50%;background:var(--v6-tenue)}
.lista-v6 .schip.prog i{background:var(--v6-acento-texto)}
.lista-v6 .schip.blocked i{background:var(--v6-ambar)}
.lista-v6 .schip.done i{display:none}
.lista-v6 .schip.done::before{content:'✓';font-size:11px;color:var(--v6-tenue)}
.lista-v6 .chip-red{display:inline-flex;align-items:center;gap:3px;height:20px;padding:0 7px;border-radius:6px;border:1px solid var(--v6-rojo-borde);background:var(--v6-rojo-fondo);color:var(--v6-rojo);font:500 11px 'Geist Mono',monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.lista-v6 .avatar{width:22px;height:22px;border-radius:50%;background:var(--v6-linea);border:1px solid var(--v6-borde);color:var(--v6-texto-2);display:inline-grid;place-items:center;font-size:11px;font-weight:600;flex:none}
.lista-v6 .avatar.none{border-style:dashed;color:var(--v6-tenue);background:transparent}
.lista-v6 .pct{font:500 12px 'Geist Mono',monospace;font-variant-numeric:tabular-nums;color:var(--v6-acento-texto)}
.lista-v6 .pct.zero{color:var(--v6-tenue)}
.lista-v6 .hrs{display:inline-flex;align-items:center;gap:4px;justify-content:flex-end}
.lista-v6 .hrs b{font-weight:500;color:var(--v6-texto)}
.lista-v6 .hrs .est{color:var(--v6-tenue)}
.lista-v6 .hrs.ed{border:1px solid transparent;background:transparent;border-radius:6px;padding:0 5px;margin-right:-6px;height:26px;font:inherit;color:inherit;cursor:text}
.lista-v6 .hrs.ed:hover{border-color:var(--v6-borde);background:var(--v6-tarjeta)}
.lista-v6 .hrs-edit{position:relative;display:inline-flex;align-items:center;gap:4px;justify-content:flex-end}
.lista-v6 .hrs-edit input{width:64px;height:26px;box-sizing:border-box;padding:0 6px;border-radius:6px;border:1px solid var(--v6-acento);background:var(--v6-tarjeta);color:var(--v6-texto);font:500 12px 'Geist Mono',monospace;text-align:right;outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--v6-acento),transparent 82%)}
.lista-v6 .hrs-edit input[aria-invalid=true]{border-color:var(--v6-rojo);box-shadow:0 0 0 3px var(--v6-rojo-fondo)}
.lista-v6 .hrs-edit .est{color:var(--v6-tenue)}
.lista-v6 .hrs-msg{position:absolute;right:0;top:calc(100% + 6px);z-index:6;width:260px;white-space:normal;text-align:left;padding:8px 10px;border-radius:8px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);box-shadow:0 8px 24px -8px rgba(14,17,20,.2);font:400 12px/1.4 inherit;font-family:inherit;color:var(--v6-texto)}
.lista-v6 .hrs-msg.err{border-color:var(--v6-rojo-borde);color:var(--v6-rojo)}
.lista-v6.d32 .lt tbody td{height:32px}
.lista-v6.d48 .lt tbody td{height:48px}
.lista-v6 .leyenda{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:11px;color:var(--v6-tenue)}
.lista-v6 .leyenda>span{display:inline-flex;align-items:center;gap:6px}
.lista-v6 .toast-zona{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);z-index:8;pointer-events:none}
.lista-v6 .toast{pointer-events:auto;display:flex;align-items:center;gap:14px;padding:10px 12px 10px 14px;border-radius:10px;background:var(--v6-texto);color:var(--v6-tarjeta);font-size:12px;box-shadow:0 10px 30px -8px rgba(14,17,20,.35);white-space:nowrap}
.lista-v6 .toast button{border:0;background:transparent;color:inherit;font:600 12px inherit;font-family:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.lista-v6 th.col-plus,.lista-v6 td.col-plus{width:40px;min-width:40px;padding:0 8px 0 4px;text-align:right;position:relative}
.lista-v6 .col-plus-btn{height:24px;min-width:24px;padding:0 4px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;gap:3px;color:var(--v6-tenue);border:1px solid transparent;background:transparent;cursor:pointer;font-size:14px}
.lista-v6 .col-plus-btn:hover,.lista-v6 .col-plus-btn[aria-expanded=true]{background:var(--v6-fila-hover);color:var(--v6-texto);border-color:var(--v6-borde)}
.lista-v6 .col-plus-btn .n{font:500 11px 'Geist Mono',monospace;color:var(--v6-acento-texto)}
.lista-v6 .cols-menu{position:absolute;right:4px;top:30px;z-index:20;min-width:200px;padding:6px;border-radius:10px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);box-shadow:0 8px 28px -6px rgba(14,17,20,.18);display:flex;flex-direction:column;text-align:left;font-size:12px;color:var(--v6-texto);font-weight:400}
.lista-v6 .cols-menu label{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer}
.lista-v6 .cols-menu label:hover,.lista-v6 .cols-menu .mi:hover{background:var(--v6-fila-hover)}
.lista-v6 .cols-menu hr{border:0;border-top:1px solid var(--v6-linea);margin:4px 0}
.lista-v6 .cols-menu .mi{border:0;background:transparent;text-align:left;padding:6px 8px;border-radius:6px;font:inherit;color:var(--v6-acento-texto);cursor:pointer}
`;

/*
 * Guía v4 de Yesid (maqueta asakaa-lista.html). Todo cuelga de `.lista-v6.lista-v4`: la Lista; el Tablero y el Calendario
 * siguen con `CSS_V6`. Colores `--v4-*` con los `--v6-*` de respaldo; medidas de la maqueta (cifras en Geist con números
 * tabulares, Mono solo en el WBS; 20 px por nivel con una guía vertical por cada ascendiente).
 */
export const CSS_LISTA_V4 = `
.lista-v4 .cell .hito { flex: none; color: var(--v4-amber, #C27803); font-size: 11px; line-height: 1; margin-right: 2px; }
.lista-v6.lista-v4{
  --lv-text:var(--v4-text,var(--v6-texto));--lv-text2:var(--v4-text2,var(--v6-texto-2));--lv-text3:var(--v4-text3,var(--v6-tenue));
  --lv-card:var(--v4-card,var(--v6-tarjeta));--lv-border:var(--v4-border,var(--v6-borde));--lv-soft:var(--v4-soft,var(--v6-linea));
  --lv-guide:var(--v4-guide,var(--v6-separador));--lv-hover:var(--v4-hover,var(--v6-fila-hover));--lv-brand:var(--v4-brand,var(--v6-acento));
  --lv-acc:var(--v4-acc,var(--v6-acento-texto));--lv-red:var(--v4-red,var(--v6-rojo));--lv-pop:var(--v4-pop,0 8px 28px -6px rgba(14,17,20,.18));
  --rh:40px;color:var(--lv-text)
}
.lista-v6.lista-v4.d32{--rh:32px}
.lista-v6.lista-v4.d48{--rh:48px}
.lista-v6.lista-v4 .num{font-variant-numeric:tabular-nums}
/* línea de resumen y su «?» */
.lista-v6.lista-v4 .sumline{margin:0;padding:6px 14px;min-height:36px;font-size:12px;color:var(--lv-text3)}
.lista-v6.lista-v4 .sumline .mono{font-family:inherit;font-variant-numeric:tabular-nums}
.lista-v6.lista-v4 .sumline a{color:var(--lv-acc);text-decoration:none}
.lista-v6.lista-v4 .sumline a:hover{text-decoration:underline;text-underline-offset:2px}
.lista-v6.lista-v4 .sumline a.red{color:var(--lv-red)}
.lista-v6.lista-v4 .sum-r{position:relative;display:flex;align-items:center;gap:10px;flex:none}
.lista-v6.lista-v4 .help-btn{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;border:0;background:transparent;color:var(--lv-text3);cursor:pointer}
.lista-v6.lista-v4 .help-btn:hover,.lista-v6.lista-v4 .help-btn[aria-expanded=true]{background:var(--lv-hover);color:var(--lv-text)}
.lista-v6.lista-v4 .lv-ayuda{position:absolute;right:0;top:30px;z-index:40;width:320px;max-width:calc(100vw - 32px);padding:10px 12px;border-radius:8px;border:1px solid var(--lv-border);background:var(--lv-card);box-shadow:var(--lv-pop);font-size:12px;color:var(--lv-text2);text-align:left;cursor:default}
.lista-v6.lista-v4 .lv-ayuda h6{margin:2px 0 8px;font-size:12px;font-weight:500;color:var(--lv-text3)}
.lista-v6.lista-v4 .lv-ayuda .legend{display:flex;flex-direction:column;gap:8px}
.lista-v6.lista-v4 .lv-ayuda .legend>h6{margin:6px 0 0}
.lista-v6.lista-v4 .lv-ayuda .legend>span{display:flex;align-items:center;gap:8px;line-height:1.35}
.lista-v6.lista-v4 .lv-ayuda .lg-keys{display:inline-flex;gap:3px;flex:none;min-width:64px}
.lista-v6.lista-v4 .lv-ayuda kbd{font:400 11px 'Geist Mono',monospace;border:1px solid var(--lv-border);border-radius:4px;padding:1px 5px;color:var(--lv-text3)}
.lista-v6.lista-v4 .gd-muestra{width:40px;height:16px;flex:none;background:repeating-linear-gradient(90deg,transparent 0 9px,var(--lv-border) 9px 10px,transparent 10px 20px)}
/* la tabla */
.lista-v6.lista-v4 .lbody{position:relative;border-top:1px solid var(--lv-soft)}
.lista-v6.lista-v4 .lwrap{border-top:0;scroll-padding:36px 0 40px;overscroll-behavior:contain}
.lista-v6.lista-v4 .lt th,.lista-v6.lista-v4 .lt td{height:var(--rh);border-bottom:1px solid var(--lv-soft);background:var(--lv-card)}
.lista-v6.lista-v4 .lt thead th{height:36px;font-size:12px;font-weight:500;color:var(--lv-text3);box-shadow:inset 0 -1px 0 var(--lv-border);border-bottom:0}
.lista-v6.lista-v4 .lt thead th.num{font-size:12px;font-weight:500;color:var(--lv-text3)}
.lista-v6.lista-v4 .lt thead th[title]{cursor:help}
.lista-v6.lista-v4 .lt thead th[title] .sortb{cursor:pointer}
.lista-v6.lista-v4 .lt .c1{width:38%;min-width:320px;max-width:560px;padding-left:8px}
.lista-v6.lista-v4 .lt thead .c1{padding-left:14px}
.lista-v6.lista-v4 .lt .col-who{width:40px;padding:0 6px;text-align:center}
.lista-v6.lista-v4 .lt .col-hrs{min-width:126px}
.lista-v6.lista-v4 .lt .cell{display:flex;align-items:center;gap:0;min-width:0;height:calc(var(--rh) - 1px)}
.lista-v6.lista-v4 .lt .gd{flex:none;align-self:stretch;width:calc(var(--n) * 20px);background:repeating-linear-gradient(90deg,transparent 0 9px,var(--lv-border) 9px 10px,transparent 10px 20px)}
.lista-v6.lista-v4 .lt .chev,.lista-v6.lista-v4 .lt .ind{width:20px;height:24px;flex:none;margin:0}
.lista-v6.lista-v4 .lt .chev{border-radius:6px;display:grid;place-items:center;color:var(--lv-text3);transform:none}
.lista-v6.lista-v4 .lt .chev:hover{background:var(--lv-hover);color:var(--lv-text)}
.lista-v6.lista-v4 .lt .chev svg{transition:transform .15s}
.lista-v6.lista-v4 .lt .chev.closed{transform:none}
.lista-v6.lista-v4 .lt .chev.closed svg{transform:rotate(-90deg)}
.lista-v6.lista-v4 .lt .wbs{font:400 12px 'Geist Mono',monospace;color:var(--lv-text3);flex:none;margin:0 8px 0 4px;min-width:0;text-align:left}
.lista-v6.lista-v4 .lt .nm{overflow:hidden;text-overflow:ellipsis;font-weight:500;min-width:0}
.lista-v6.lista-v4 .lt .cnt{font:400 12px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;color:var(--lv-text3);flex:none;margin-left:8px}
.lista-v6.lista-v4 .lt .od{color:var(--lv-red);font-weight:500;font-size:12px;flex:none;margin-left:8px}
.lista-v6.lista-v4 .lt .num{font-family:var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;font-weight:400;font-size:13px;color:var(--lv-text2)}
.lista-v6.lista-v4 .lt .dt{font-size:13px}
.lista-v6.lista-v4 .lt tbody tr.sel>td{background:color-mix(in srgb,var(--lv-card),var(--lv-brand) 8%)}
.lista-v6.lista-v4 .lt tbody tr.sel>td.c1{box-shadow:inset 2px 0 0 var(--lv-brand)}
.lista-v6.lista-v4 .lt tr.grp td,.lista-v6.lista-v4 .lt tr.par td{font-weight:400}
.lista-v6.lista-v4 .lt tr.grp .nm,.lista-v6.lista-v4 .lt tr.par .nm{font-weight:600}
.lista-v6.lista-v4 .lt tr.grp .num,.lista-v6.lista-v4 .lt tr.par .num{color:var(--lv-text);font-weight:400}
.lista-v6.lista-v4 .lt tfoot td{font-weight:600;border-bottom:0;border-top:0;box-shadow:inset 0 1px 0 var(--lv-border);height:40px}
.lista-v6.lista-v4 .lt tfoot .num{color:var(--lv-text);font-weight:600}
.lista-v6.lista-v4 .lt tfoot .cell{padding-left:24px;height:39px}
.lista-v6.lista-v4 .lt tfoot .cell .ind{display:none}
.lista-v6.lista-v4 .noest{font-size:12px;color:var(--lv-text3);cursor:help}
.lista-v6.lista-v4 .lt .vacia{font-size:13px}
/* escudo de riesgo junto al nombre */
.lista-v6.lista-v4 .rk{display:inline-grid;place-items:center;width:20px;height:20px;flex:none;margin-left:6px;border-radius:4px;color:var(--v4-lvl-medio,#B8860B)}
.lista-v6.lista-v4 .rk svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round;fill:color-mix(in srgb,currentColor 16%,transparent)}
.lista-v6.lista-v4 .rk[data-nivel=alto]{color:var(--v4-lvl-alto,#D9730D)}
.lista-v6.lista-v4 .rk[data-nivel=critico]{color:var(--v4-lvl-critico,#D13A40)}
.lista-v6.lista-v4 .rk[data-nivel=bajo]{color:var(--v4-lvl-bajo,#8A939C)}
.lista-v6.lista-v4 .rk[data-nivel=alto] svg,.lista-v6.lista-v4 .rk[data-nivel=critico] svg{fill:color-mix(in srgb,currentColor 34%,transparent)}
/* estados: icono con forma propia, sin píldora (como en el Tablero) */
.lista-v6.lista-v4 .schip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0;border-radius:0;background:none;color:var(--lv-text2);font-size:12px;font-weight:500;white-space:nowrap}
.lista-v6.lista-v4 .schip::before,.lista-v6.lista-v4 .schip.done::before{content:none}
.lista-v6.lista-v4 .schip i{position:relative;display:inline-block;width:12px;height:12px;box-sizing:border-box;border-radius:50%;border:1.5px solid var(--v4-st-todo,#7F8891);background:none;flex:none}
.lista-v6.lista-v4 .schip.prog i{border-color:var(--v4-st-prog,#0A8073);background:linear-gradient(90deg,transparent 50%,var(--v4-st-prog,#0A8073) 50%)}
.lista-v6.lista-v4 .schip.blocked i{border-color:var(--v4-st-blocked,#B26A00);background:linear-gradient(var(--lv-card),var(--lv-card)) center/6px 2px no-repeat,var(--v4-st-blocked,#B26A00)}
.lista-v6.lista-v4 .schip.done{color:var(--lv-text3)}
.lista-v6.lista-v4 .schip.done i{display:inline-block;border-color:var(--v4-st-done,#7F8891);background:var(--v4-st-done,#7F8891)}
.lista-v6.lista-v4 .schip.done i::after{content:'';position:absolute;left:3px;top:.8px;width:3px;height:6px;border:solid var(--lv-card);border-width:0 1.5px 1.5px 0;transform:rotate(42deg)}
.lista-v6.lista-v4 .chip-red{font:500 12px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;border-color:var(--v4-red-bd,var(--v6-rojo-borde));background:var(--v4-red-bg,var(--v6-rojo-fondo));color:var(--lv-red)}
.lista-v6.lista-v4 .pct{font:400 13px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;color:var(--lv-acc)}
.lista-v6.lista-v4 .pct.zero{color:var(--lv-text2)}
.lista-v6.lista-v4 .hrs b{font-weight:400;color:var(--lv-text)}
.lista-v6.lista-v4 .hrs .est{color:var(--lv-text3);white-space:pre}
/* F2 · la celda de horas mantiene su ancho al editar */
.lista-v6.lista-v4 .hrs-edit input{width:52px;font:400 13px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums}
.lista-v6.lista-v4 .col-plus-btn .n{font:500 11px var(--v4-ff-sans,inherit)}
.lista-v6.lista-v4 .cols-menu{font-size:13px}
.lista-v6.lista-v4 .fchip{font-size:12px}
/* el panel: por debajo de 1200 px de contenido es una capa sobre la tabla; en el teléfono, toda la pantalla */
.lista-v6.lista-v4 .lv-menu{position:fixed;z-index:60;min-width:220px;padding:4px 0;background:var(--lv-card);border:1px solid var(--lv-border);border-radius:8px;box-shadow:var(--lv-pop);font:400 13px var(--v4-ff-sans,inherit)}
.lista-v6.lista-v4 .lv-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:0;background:none;color:var(--lv-text);text-align:left;font:inherit;cursor:pointer}
.lista-v6.lista-v4 .lv-menu button:hover:not([disabled]),.lista-v6.lista-v4 .lv-menu button:focus-visible{background:var(--lv-hover);outline:none}
.lista-v6.lista-v4 .lv-menu button[disabled]{color:var(--lv-text3);cursor:default}
.lista-v6.lista-v4 .lv-menu .ic{display:inline-flex;color:var(--lv-text2)}
.lista-v6.lista-v4 .lv-menu button[disabled] .ic{opacity:.5}
.lista-v6.lista-v4 .lv-menu-sep{height:1px;margin:4px 0;background:var(--lv-soft)}
.lista-v6.lista-v4 .add-row td{border-bottom:0}
.lista-v6.lista-v4 .add-btn{display:inline-flex;align-items:center;gap:6px;margin-left:28px;padding:4px 8px;border:0;border-radius:6px;background:none;color:var(--lv-text2);font:500 13px var(--v4-ff-sans,inherit);cursor:pointer}
.lista-v6.lista-v4 .add-btn:hover,.lista-v6.lista-v4 .add-btn:focus-visible{background:var(--lv-hover);color:var(--lv-acc)}
.lista-v6.lista-v4 .add-row.nueva input{flex:0 1 360px;min-width:0;padding:4px 8px;border:1px solid var(--lv-brand);border-radius:6px;background:var(--lv-card);color:var(--lv-text);font:400 13px var(--v4-ff-sans,inherit)}
.lista-v6.lista-v4 .add-tip{margin-left:10px;color:var(--lv-text3);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lista-v6.lista-v4 .add-sub{margin-left:auto;width:22px;height:22px;border:0;border-radius:6px;background:none;color:var(--lv-text2);font:500 15px/1 var(--v4-ff-sans,inherit);cursor:pointer;opacity:0}
.lista-v6.lista-v4 tr:hover .add-sub,.lista-v6.lista-v4 tr:focus-within .add-sub,.lista-v6.lista-v4 .add-sub:focus-visible{opacity:1}
.lista-v6.lista-v4 .add-sub:hover{background:var(--lv-hover);color:var(--lv-acc)}
@container lista-v6 (max-width:1199px){
  .lista-v6.lista-v4 .dp4{position:absolute;right:0;top:0;bottom:0;z-index:20;max-height:none;box-shadow:var(--lv-pop)}
}
@container lista-v6 (max-width:599px){
  .lista-v6.lista-v4 .dp4{width:100%;border-left:0}
}
`;
