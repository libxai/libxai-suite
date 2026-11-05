/**
 * Maquetas v3 de Yesid (4-nov) · EL TABLERO v6 (sólo Asakaa). La maqueta `asakaa-tablero.html` y la revisión B1-B17:
 *
 *   · columnas por estado —Por hacer · En progreso · Bloqueada— de 280–340 px, y «Completadas · N» plegada en vertical (B1);
 *     los estados propios de un proyecto caen en uno de los cuatro (B5);
 *   · tarjeta = hoja: arriba el padre inmediato (la ruta en el tooltip) y el WBS; nombre 13/500 en dos líneas; fechas en
 *     Mono con chip rojo si vence (B2); barrita de 4 px si avanza; avatar de 22 px (B7, B12);
 *   · carriles por Fase, por Tarea padre o Sin agrupar, y ninguno esconde nada: lo que cuelga directo de una fase va en su
 *     carril «· tareas directas» (B11); el carril resume a su padre (estado calculado con su regla, %, barra apilada,
 *     «1 de 9 terminadas», vencidas, bloqueadas) y, por fase, chips de sus tareas padre que filtran (B4);
 *   · «Sin fase» antes de lo terminado; las fases terminadas, juntas al final y plegadas (B13); vencidas primero;
 *   · dependencias: ámbar sólo si está bloqueada o empieza antes de que termine su predecesora; si no, «Después de …» en
 *     gris; nada si la predecesora ya terminó (B14), y siempre con su WBS y nombre, nunca un id (B17);
 *   · los contadores de columna cuentan lo que se ve (B16);
 *   · mover: arrastrar dentro del carril, Alt+←/→ o «Mover a…» en el panel. El aviso dice qué padres cambian y ofrece
 *     «Deshacer». El % sólo cambia al completar (100 %, y se recuerda el anterior para reabrir).
 *
 * Las reglas son las de la Lista (`reglasDeLaLista.ts`), el panel es el de la Lista y el pie de Recursos también.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import type { Calendario } from '../../Gantt/motorDeProgramacion';
import { fechaCorta } from '../../Gantt/fechaCorta';
import {
  cifrasDe, diasDeRetraso, estadoDe, estadoDeHoja, estaVencida, hojasDe, horasCortas, tieneHijas, type CifrasDeFila, type EstadoV6,
} from '../../ListView/v6/reglasDeLaLista';
import { CSS_V6 } from '../../ListView/v6/ListaV6';
import { CSS_PANEL_V6, PanelDeTareaV6, type FilaDelPanel } from '../../ListView/v6/PanelDeTareaV6';
import { PuntoDeRiesgo } from '../../ListView/v6/PuntoDeRiesgo';
import { CSS_RECURSOS_V6, RecursosDeLaListaV6 } from '../../ListView/v6/RecursosDeLaListaV6';

export type AgruparTableroV6 = 'fase' | 'padre' | 'todo';
/** Subtareas: separadas (cada hoja, su tarjeta), bajo su padre (la tarjeta del padre las lista) u ocultas (sólo el padre). */
export type SubtareasTableroV6 = 'separadas' | 'bajo' | 'ocultas';
/** El menú Vista del Tablero (lo lleva la app y lo recuerda). */
export interface VistaTableroV6 {
  densidad: 'compacta' | 'normal' | 'comoda';
  mostrarHechas: boolean;
  horas: boolean;
  leyenda: boolean;
  agrupar: AgruparTableroV6;
  subtareas: SubtareasTableroV6;
}
export const VISTA_TABLERO_V6_POR_DEFECTO: VistaTableroV6 = { densidad: 'normal', mostrarHechas: false, horas: false, leyenda: false, agrupar: 'fase', subtareas: 'separadas' };
/** Filtros («Mostrar solo»): `responsables` lleva la clave de cada uno ('' = sin responsable). */
export interface FiltrosTableroV6 { vencidas: boolean; bloqueadas: boolean; responsables: string[] }
export const FILTROS_TABLERO_V6_VACIOS: FiltrosTableroV6 = { vencidas: false, bloqueadas: false, responsables: [] };
/** El estado que se guarda para cada columna (los ids de las columnas de siempre). */
export const STATUS_DE_ESTADO_V6: Record<EstadoV6, string> = { todo: 'todo', prog: 'in-progress', blocked: 'blocked', done: 'completed' };

const ORDEN: EstadoV6[] = ['todo', 'prog', 'blocked', 'done'];

type Persona = { id?: string; name?: string; initials?: string };
const responsableDe = (t: Task) => (t.assignees ?? [])[0] as Persona | undefined;
const claveDe = (p?: Persona) => (p ? p.id || p.name || '?' : '');

/** Las personas de las hojas, para el menú de filtros («Sin responsable» al final si hay hojas sin nadie). */
export function responsablesDelTablero(tasks: Task[]): { clave: string; nombre: string }[] {
  const m = new Map<string, string>();
  let sinNadie = false;
  for (const r of tasks) for (const h of hojasDe(r)) {
    const p = responsableDe(h);
    if (p) { if (!m.has(claveDe(p))) m.set(claveDe(p), p.name ?? '?'); } else sinNadie = true;
  }
  const l = [...m].map(([clave, nombre]) => ({ clave, nombre }));
  return sinNadie ? [...l, { clave: '', nombre: '' }] : l;
}

const TXT = {
  es: {
    st: { todo: 'Por hacer', prog: 'En progreso', blocked: 'Bloqueada', done: 'Completada' } as Record<EstadoV6, string>,
    completadas: 'Completadas', fase: 'Fase', directas: '· tareas directas', sinFase: 'Sin fase', todas: 'Todas las tareas',
    tarea: 'tarea', tareas: 'tareas', en: 'en', fasesN: (n: number) => (n === 1 ? 'fase' : 'fases'), carriles: (n: number) => (n === 1 ? 'carril' : 'carriles'),
    de: 'de', completadaN: (n: number) => (n === 1 ? 'completada' : 'completadas'), ocultas: (n: number) => (n === 1 ? 'oculta' : 'ocultas'),
    aLaVista: 'a la vista', mostrar: 'Mostrar', ocultar: 'Ocultar', vencidaN: (n: number) => (n === 1 ? 'vencida' : 'vencidas'), ver: 'Ver',
    ningunaVencida: 'Ninguna vencida', plegar: 'Plegar todo', desplegar: 'Desplegar todo', filtrando: 'Filtrando:', quitar: 'Quitar el filtro',
    soloVencidas: 'Solo vencidas', soloBloqueadas: 'Solo bloqueadas', responsable: 'Responsable', sinResp: 'sin responsable',
    terminadas: (h: number, n: number) => `${h} de ${n} ${n === 1 ? 'terminada' : 'terminadas'}`,
    bloqueadaN: (n: number) => (n === 1 ? 'bloqueada' : 'bloqueadas'),
    enCarril: (a: number, b: number, donde: string) => `${a} en este carril · ${b} ${donde}`, enLaFase: 'en la fase',
    sinTareas: 'Sin tareas', suelte: 'Suelte aquí',
    regla: 'Regla: Completada si todas lo están; Bloqueada si todas las abiertas lo están; En progreso si alguna avanza o ya terminó; si no, Por hacer.',
    porque: {
      done: 'todas sus tareas están completadas', blocked: 'todas sus tareas abiertas están bloqueadas',
      prog: (p: number, h: number, n: number) => (p ? `${p} ${p === 1 ? 'tarea está' : 'tareas están'} en curso` : `ninguna está en curso, pero ${h} de ${n} ya ${h === 1 ? 'terminó' : 'terminaron'}`),
      todo: 'ninguna tarea ha empezado',
    },
    calculado: 'Estado calculado',
    sbar: (c: Record<EstadoV6, number>) => `${c.done} terminadas, ${c.prog} en curso, ${c.blocked} bloqueadas y ${c.todo} por hacer`,
    espera: 'Espera a', bloqueadaSinCausa: 'Bloqueada · indique la causa en el panel', empiezaAntes: 'Empieza antes de que termine',
    despues: 'Después de', yMas: (n: number) => ` y ${n} más`, hito: 'Hito',
    vencidaHace: (n: number) => `Vencida hace ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`,
    sinRespAvatar: 'Sin responsable', horasTit: 'Horas registradas / estimadas',
    ningunaCoincide: 'Ninguna tarea coincide con los filtros', ningunaTexto: 'Quite un filtro o elija otro responsable para volver a ver el tablero.',
    quitarFiltros: 'Quitar filtros', mostrarColumna: (n: number) => `Completadas · ${n}. Mostrar la columna`, plegarColumna: 'Plegar la columna Completada',
    moverA: 'Mover a', padreNoSeMueve: (n: number) => `Su estado sale de sus ${n} ${n === 1 ? 'subtarea' : 'subtareas'}: mueva sus subtareas.`,
    pasoA: (n: string, e: string) => `«${n}» pasó a ${e}.`, alCien: (n: string) => `«${n}» pasó a Completada (100%).`,
    volvioCon: (n: string, e: string, p: number) => `«${n}» volvió a ${e} con el avance que tenía (${p}%).`,
    volvioSin: (n: string, e: string) => `«${n}» volvió a ${e}. No se conoce su avance anterior: sigue en 100% hasta que lo confirme.`,
    conserva: (p: number) => ` Conserva su avance (${p}%).`, quedaVencida: (n: number) => ` Queda vencida: ${n} ${n === 1 ? 'día hábil' : 'días hábiles'} de retraso.`,
    yaNoVencida: ' Ya no cuenta como vencida.', indique: ' Indique qué la bloquea en el panel.',
    pasa: (ns: string[], e: string) => (ns.length > 1 ? `${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]} pasan a ${e}` : `${ns[0]} pasa a ${e}`),
    deshacer: 'Deshacer', deshecho: (n: string, e: string) => `Cambio deshecho: «${n}» vuelve a ${e}.`,
    otraFase: (n: string, f: string) => `«${n}» sigue en ${f}: desde el tablero no se cambia la fase. Se cambia en la Lista o el Gantt.`,
    otroPadre: (n: string) => `«${n}» sigue con su tarea padre: para cambiarla, use la Lista o el Gantt.`,
    esPadre: 'El estado de una tarea padre se calcula con sus subtareas: mueva sus subtareas.',
    primera: 'Ya está en la primera columna, Por hacer.', ultima: 'Ya está en la última columna, Completada.',
    noSePudo: 'No se pudo mover la tarea.',
    ayuda: 'Enter o Espacio: abrir el panel. Alt + flecha izquierda o derecha: cambiar de columna. Flechas: moverse entre tarjetas.',
    leyenda: 'Leyenda', lVenc: 'Vencida', lBarra: 'Avance de una tarea en curso', lAlt: 'cambia de columna', tablero: 'Tablero del proyecto',
    verSubs: (n: number) => `Ver ${n} ${n === 1 ? 'subtarea' : 'subtareas'}`, ocultarSubs: (n: number) => `Ocultar ${n} ${n === 1 ? 'subtarea' : 'subtareas'}`,
    padreArrastre: (w: string, n: string, k: number) => `${w} ${n} es una tarea padre: su estado sale de sus ${k} ${k === 1 ? 'subtarea' : 'subtareas'}. Mueva sus subtareas, o complete toda la rama desde su panel.`,
    abrirPanel: 'Abrir panel', abrirDetalle: 'Abrir detalle', acciones: (n: string) => `Acciones de ${n}`, tareaPadre: 'tarea padre',
    ahoraDentro: (n: string, w: string, p: string) => `«${n}» ahora es ${w}, dentro de ${p}.`,
    ahoraDirecta: (n: string, w: string, f: string) => `«${n}» ahora es ${w}, tarea directa de la ${f}.`,
    devuelta: (n: string) => `Cambio deshecho: «${n}» vuelve a su tarea padre.`,
    completarRama: (n: number) => `Completar la rama (${n} ${n === 1 ? 'abierta' : 'abiertas'})`,
    confirmarRama: (n: number) => `Se completarán ${n} ${n === 1 ? 'tarea' : 'tareas'} (100%).`, completar: 'Completar', cancelar: 'Cancelar',
    ramaCompleta: (p: string, n: number) => `«${p}»: ${n} ${n === 1 ? 'tarea completada' : 'tareas completadas'}.`,
    ramaDeshecha: (p: string) => `Cambio deshecho: la rama «${p}» vuelve a como estaba.`,
    faseNoSeCierra: 'Una fase se completa con su última tarea; para cerrarla de una vez, use la Lista o el Gantt.',
    avance: 'Avance', porConfirmar: 'por confirmar', numeroAvance: 'Escriba un número entero entre 0 y 100.',
    avanceCambio: (n: string, a: number, b: number) => `Avance de «${n}»: ${a}% → ${b}%.`, avanceConfirmado: (p: number) => `Avance confirmado: ${p}%.`,
  },
  en: {
    st: { todo: 'To do', prog: 'In progress', blocked: 'Blocked', done: 'Completed' } as Record<EstadoV6, string>,
    completadas: 'Completed', fase: 'Phase', directas: '· direct tasks', sinFase: 'No phase', todas: 'All tasks',
    tarea: 'task', tareas: 'tasks', en: 'in', fasesN: (n: number) => (n === 1 ? 'phase' : 'phases'), carriles: (n: number) => (n === 1 ? 'lane' : 'lanes'),
    de: 'of', completadaN: () => 'completed', ocultas: () => 'hidden',
    aLaVista: 'shown', mostrar: 'Show', ocultar: 'Hide', vencidaN: () => 'overdue', ver: 'View',
    ningunaVencida: 'None overdue', plegar: 'Collapse all', desplegar: 'Expand all', filtrando: 'Filtering:', quitar: 'Remove the filter',
    soloVencidas: 'Overdue only', soloBloqueadas: 'Blocked only', responsable: 'Owner', sinResp: 'no owner',
    terminadas: (h: number, n: number) => `${h} of ${n} finished`,
    bloqueadaN: () => 'blocked',
    enCarril: (a: number, b: number, donde: string) => `${a} in this lane · ${b} ${donde}`, enLaFase: 'in the phase',
    sinTareas: 'No tasks', suelte: 'Drop here',
    regla: 'Rule: Completed if all are; Blocked if all open ones are; In progress if any moves or has finished; otherwise To do.',
    porque: {
      done: 'all its tasks are completed', blocked: 'all its open tasks are blocked',
      prog: (p: number, h: number, n: number) => (p ? `${p} ${p === 1 ? 'task is' : 'tasks are'} in progress` : `none is in progress, but ${h} of ${n} already finished`),
      todo: 'no task has started',
    },
    calculado: 'Calculated status',
    sbar: (c: Record<EstadoV6, number>) => `${c.done} finished, ${c.prog} in progress, ${c.blocked} blocked and ${c.todo} to do`,
    espera: 'Waiting for', bloqueadaSinCausa: 'Blocked · say why in the panel', empiezaAntes: 'Starts before the end of',
    despues: 'After', yMas: (n: number) => ` and ${n} more`, hito: 'Milestone',
    vencidaHace: (n: number) => `Overdue by ${n} working ${n === 1 ? 'day' : 'days'}`,
    sinRespAvatar: 'No owner', horasTit: 'Hours logged / estimated',
    ningunaCoincide: 'No task matches the filters', ningunaTexto: 'Remove a filter or pick another owner to see the board again.',
    quitarFiltros: 'Remove filters', mostrarColumna: (n: number) => `Completed · ${n}. Show the column`, plegarColumna: 'Collapse the Completed column',
    moverA: 'Move to', padreNoSeMueve: (n: number) => `Its status comes from its ${n} ${n === 1 ? 'subtask' : 'subtasks'}: move the subtasks.`,
    pasoA: (n: string, e: string) => `“${n}” moved to ${e}.`, alCien: (n: string) => `“${n}” moved to Completed (100%).`,
    volvioCon: (n: string, e: string, p: number) => `“${n}” went back to ${e} with the progress it had (${p}%).`,
    volvioSin: (n: string, e: string) => `“${n}” went back to ${e}. Its previous progress is unknown: it stays at 100% until you confirm it.`,
    conserva: (p: number) => ` It keeps its progress (${p}%).`, quedaVencida: (n: number) => ` It is now overdue: ${n} working ${n === 1 ? 'day' : 'days'} late.`,
    yaNoVencida: ' It no longer counts as overdue.', indique: ' Say what blocks it in the panel.',
    pasa: (ns: string[], e: string) => `${ns.join(', ')} ${ns.length > 1 ? 'move' : 'moves'} to ${e}`,
    deshacer: 'Undo', deshecho: (n: string, e: string) => `Change undone: “${n}” is back in ${e}.`,
    otraFase: (n: string, f: string) => `“${n}” stays in ${f}: the board does not change the phase. Change it in the List or the Gantt.`,
    otroPadre: (n: string) => `“${n}” keeps its parent task: to change it, use the List or the Gantt.`,
    esPadre: 'A parent task’s status comes from its subtasks: move its subtasks.',
    primera: 'It is already in the first column, To do.', ultima: 'It is already in the last column, Completed.',
    noSePudo: 'The task could not be moved.',
    ayuda: 'Enter or Space: open the panel. Alt + left or right arrow: change column. Arrows: move between cards.',
    leyenda: 'Legend', lVenc: 'Overdue', lBarra: 'Progress of a task in progress', lAlt: 'changes column', tablero: 'Project board',
    verSubs: (n: number) => `Show ${n} ${n === 1 ? 'subtask' : 'subtasks'}`, ocultarSubs: (n: number) => `Hide ${n} ${n === 1 ? 'subtask' : 'subtasks'}`,
    padreArrastre: (w: string, n: string, k: number) => `${w} ${n} is a parent task: its status comes from its ${k} ${k === 1 ? 'subtask' : 'subtasks'}. Move its subtasks, or complete the whole branch from its panel.`,
    abrirPanel: 'Open panel', abrirDetalle: 'Open details', acciones: (n: string) => `Actions for ${n}`, tareaPadre: 'parent task',
    ahoraDentro: (n: string, w: string, p: string) => `“${n}” is now ${w}, inside ${p}.`,
    ahoraDirecta: (n: string, w: string, f: string) => `“${n}” is now ${w}, a direct task of ${f}.`,
    devuelta: (n: string) => `Change undone: “${n}” is back under its parent task.`,
    completarRama: (n: number) => `Complete the branch (${n} open)`,
    confirmarRama: (n: number) => `${n} ${n === 1 ? 'task' : 'tasks'} will be completed (100%).`, completar: 'Complete', cancelar: 'Cancel',
    ramaCompleta: (p: string, n: number) => `“${p}”: ${n} ${n === 1 ? 'task' : 'tasks'} completed.`,
    ramaDeshecha: (p: string) => `Change undone: the branch “${p}” is back as it was.`,
    faseNoSeCierra: 'A phase completes with its last task; to close it at once, use the List or the Gantt.',
    avance: 'Progress', porConfirmar: 'to confirm', numeroAvance: 'Type a whole number between 0 and 100.',
    avanceCambio: (n: string, a: number, b: number) => `Progress of “${n}”: ${a}% → ${b}%.`, avanceConfirmado: (p: number) => `Progress confirmed: ${p}%.`,
  },
};
type Textos = typeof TXT.es | typeof TXT.en;

interface Nodo extends FilaDelPanel { nivel: number; padre: string | null; esFase: boolean }
interface Carril { clave: string; nodo: Nodo | null; propias: Task[]; todas: Task[]; hecho: boolean }
interface Cambio { status: string; progress: number }
interface Aviso { texto: string; deshacer?: () => void; accion?: { etiqueta: string; fn: () => void } }
type Item = { tipo: 'hoja'; t: Task } | { tipo: 'padre'; n: Nodo };

const pesoDe = (t: Task) => Math.max(1, ((t as { effortMinutes?: number }).effortMinutes ?? 0) / 60);
const avanceDe = (hs: Task[]) => {
  let w = 0; let s = 0;
  for (const h of hs) { const p = pesoDe(h); w += p; s += p * (estadoDeHoja(h) === 'done' ? 100 : h.progress ?? 0); }
  return w ? Math.round(s / w) : 0;
};
const contar = (hs: Task[], hoy: Date) => {
  const c: Record<EstadoV6, number> & { vencidas: number } = { todo: 0, prog: 0, blocked: 0, done: 0, vencidas: 0 };
  for (const h of hs) { c[estadoDeHoja(h)] += 1; if (estaVencida(h, hoy)) c.vencidas += 1; }
  return c;
};
const fechaDia = (d?: Date) => (d ? new Date(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate(), 12).getTime() : NaN);

export interface TableroV6Props {
  tasks: Task[];
  es: boolean;
  cal: Calendario;
  tarifaDe: (hoja: Task) => number;
  tarifaDePersona?: (id: string) => number | undefined;
  monedaCodigo?: string;
  conCosto?: boolean;
  costoAlTerminar?: number | null;
  onVerRecursos?: () => void;
  nombreProyecto?: string;
  vista: VistaTableroV6;
  onVista: (v: VistaTableroV6) => void;
  filtros: FiltrosTableroV6;
  onFiltros: (f: FiltrosTableroV6) => void;
  /** guardar el estado y el avance de una hoja; `false` si la app no lo permite (y ya lo dijo) */
  onMover: (t: Task, status: string, progreso: number) => boolean | void | Promise<boolean | void>;
  /** cambiar de tarea padre (con «Tarea padre», a otro carril de la misma fase); sin él, no se permite */
  onCambiarPadre?: (t: Task, padre: string | null, posicion: number) => boolean | void | Promise<boolean | void>;
  /** la ficha completa de siempre */
  onAbrir?: (t: Task) => void;
  /** R6 · abrir un riesgo desde el panel de la tarea */
  onVerRiesgo?: (id: string) => void;
  hoy?: Date;
}

export function TableroV6({
  tasks: tasksProp, es, cal, tarifaDe, tarifaDePersona, monedaCodigo, conCosto = true, costoAlTerminar, onVerRecursos, nombreProyecto,
  vista, onVista, filtros, onFiltros, onMover, onCambiarPadre, onAbrir, onVerRiesgo, hoy: hoyProp,
}: TableroV6Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  const hoy = useMemo(() => hoyProp ?? new Date(), [hoyProp]);

  /* los cambios recién hechos, a la vista antes de que vuelvan en `tasks` */
  const [cambios, setCambios] = useState<Map<string, Cambio>>(new Map());
  const enviados = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!enviados.current.size) return;
    setCambios((m) => { const n = new Map(m); enviados.current.forEach((id) => n.delete(id)); return n; });
    enviados.current = new Set();
  }, [tasksProp]);
  const tasks = useMemo(() => {
    if (!cambios.size) return tasksProp;
    const con = (ts: Task[]): Task[] => ts.map((t) => {
      const c = cambios.get(t.id);
      const sub = t.subtasks?.length ? con(t.subtasks) : t.subtasks;
      if (c) return { ...t, status: c.status, progress: c.progress, subtasks: sub };
      return sub !== t.subtasks ? { ...t, subtasks: sub } : t;
    });
    return con(tasksProp);
  }, [tasksProp, cambios]);
  /* el % que tenía una hoja antes de completarla, para devolvérselo si se reabre */
  const avanceAnterior = useRef<Map<string, number>>(new Map());

  /* el árbol */
  const { nodos, hojas } = useMemo(() => {
    const nodos = new Map<string, Nodo>();
    const hojas: Task[] = [];
    const recorrer = (ts: Task[], prefijo: string, nivel: number, padre: string | null, ancestros: string[]) => {
      ts.forEach((t, i) => {
        const wbs = (t as { wbsCode?: string }).wbsCode || (prefijo ? `${prefijo}.${i + 1}` : String(i + 1));
        nodos.set(t.id, { t, wbs, nivel, padre, ancestros, esFase: nivel === 0 && tieneHijas(t) });
        if (tieneHijas(t)) recorrer(t.subtasks!, wbs, nivel + 1, t.id, [...ancestros, t.id]);
        else hojas.push(t);
      });
    };
    recorrer(tasks, '', 0, null, []);
    return { nodos, hojas };
  }, [tasks]);
  const estados = useMemo(() => new Map([...nodos].map(([id, n]) => [id, estadoDe(n.t)])), [nodos]);
  const faseDe = (h: Task) => { const n = nodos.get(h.id); return n && n.ancestros.length ? n.ancestros[0]! : null; };
  const nombreNodo = useCallback((id: string | null) => {
    if (!id) return x.sinFase;
    const n = nodos.get(id);
    if (!n) return '';
    return n.nivel === 0 ? `${x.fase} ${n.wbs} · ${n.t.name}` : n.t.name;
  }, [nodos, x]);
  const rutaDe = (h: Task) => { const n = nodos.get(h.id); return n ? n.ancestros.map(nombreNodo).join(' › ') : ''; };

  /* filtros */
  const [nodoFiltro, setNodoFiltro] = useState<string | null>(null);
  useEffect(() => { if (nodoFiltro && !nodos.has(nodoFiltro)) setNodoFiltro(null); }, [nodoFiltro, nodos]);
  const pasa = useCallback((h: Task) => {
    if (filtros.vencidas && !estaVencida(h, hoy)) return false;
    if (filtros.bloqueadas && estadoDeHoja(h) !== 'blocked') return false;
    if (filtros.responsables.length && !filtros.responsables.includes(claveDe(responsableDe(h)))) return false;
    if (nodoFiltro && !nodos.get(h.id)?.ancestros.includes(nodoFiltro)) return false;
    return true;
  }, [filtros, nodoFiltro, nodos, hoy]);
  const nFiltros = (filtros.vencidas ? 1 : 0) + (filtros.bloqueadas ? 1 : 0) + (filtros.responsables.length ? 1 : 0) + (nodoFiltro ? 1 : 0);
  const filtradas = useMemo(() => hojas.filter(pasa), [hojas, pasa]);
  const mostrarHechas = vista.mostrarHechas;
  const visibles = useMemo(() => filtradas.filter((h) => mostrarHechas || estadoDeHoja(h) !== 'done'), [filtradas, mostrarHechas]);

  /* carriles */
  const [plegados, setPlegados] = useState<Map<string, boolean>>(new Map());
  const carriles = useMemo((): Carril[] => {
    if (vista.agrupar === 'todo') return [{ clave: 'todo', nodo: null, propias: filtradas, todas: hojas, hecho: false }];
    const out: Carril[] = [];
    const claveDeHoja = (h: Task) => (vista.agrupar === 'fase' ? faseDe(h) : nodos.get(h.id)?.padre ?? null) ?? '';
    const candidatos = [...nodos.values()].filter((n) => tieneHijas(n.t) && (vista.agrupar === 'padre' || n.nivel === 0));
    for (const n of candidatos) {
      const todas = hojasDe(n.t);
      if (!todas.length) continue;
      const propias = filtradas.filter((h) => claveDeHoja(h) === n.t.id);
      const debajo = vista.agrupar === 'fase' ? propias : filtradas.filter((h) => nodos.get(h.id)?.ancestros.includes(n.t.id));
      const vis = debajo.filter((h) => mostrarHechas || estadoDeHoja(h) !== 'done');
      const hecho = todas.every((h) => estadoDeHoja(h) === 'done');
      if (hecho && !mostrarHechas) continue;
      if (!vis.length && (nFiltros || !hecho)) continue;
      out.push({ clave: n.t.id, nodo: n, propias, todas, hecho });
    }
    /* las hojas sueltas (sin fase): antes de lo terminado */
    const sueltas = hojas.filter((h) => !nodos.get(h.id)?.padre);
    const sueltasVis = filtradas.filter((h) => !nodos.get(h.id)?.padre);
    const abiertos = out.filter((c) => !c.hecho);
    const hechos = out.filter((c) => c.hecho);
    const sinFase: Carril[] = sueltasVis.some((h) => mostrarHechas || estadoDeHoja(h) !== 'done')
      ? [{ clave: '', nodo: null, propias: sueltasVis, todas: sueltas, hecho: false }] : [];
    return [...abiertos, ...sinFase, ...hechos];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista.agrupar, nodos, hojas, filtradas, mostrarHechas, nFiltros]);
  const estaPlegado = (c: Carril) => plegados.get(c.clave) ?? c.hecho;
  /* con «Tarea padre», un carril plegado pliega también los de debajo */
  const carrilesVisibles = useMemo(() => {
    if (vista.agrupar !== 'padre') return carriles;
    const cerrados = new Set(carriles.filter((c) => plegados.get(c.clave) ?? c.hecho).map((c) => c.clave));
    return carriles.filter((c) => !c.nodo?.ancestros.some((a) => cerrados.has(a)));
  }, [carriles, plegados, vista.agrupar]);

  const ordenar = (a: Task, b: Task) => {
    const va = estaVencida(a, hoy); const vb = estaVencida(b, hoy);
    if (va !== vb) return va ? -1 : 1;
    const fa = estadoDeHoja(a) === 'todo' ? fechaDia(a.startDate) : fechaDia(a.endDate);
    const fb = estadoDeHoja(b) === 'todo' ? fechaDia(b.startDate) : fechaDia(b.endDate);
    if (fa !== fb) return (Number.isNaN(fa) ? Infinity : fa) - (Number.isNaN(fb) ? Infinity : fb);
    return (nodos.get(a.id)?.wbs ?? '').localeCompare(nodos.get(b.id)?.wbs ?? '', undefined, { numeric: true });
  };
  const conPadres = vista.agrupar !== 'padre' && vista.subtareas !== 'separadas';
  const deCelda = (c: Carril, e: EstadoV6): Item[] => {
    const hs = c.propias.filter((h) => estadoDeHoja(h) === e);
    if (!conPadres) return hs.sort(ordenar).map((t) => ({ tipo: 'hoja' as const, t }));
    /* las que cuelgan directo de la fase (o de nada) son tarjetas; las demás van en la de su padre de primer nivel */
    const sueltas = hs.filter((h) => (nodos.get(h.id)?.ancestros.length ?? 0) <= 1).sort(ordenar).map((t) => ({ tipo: 'hoja' as const, t }));
    const tops = new Set<string>();
    for (const h of c.propias) { const a = nodos.get(h.id)?.ancestros; if (a && a.length > 1) tops.add(a[1]!); }
    const padres = [...tops].map((id) => nodos.get(id)!).filter((n) => estados.get(n.t.id) === e)
      .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true })).map((n) => ({ tipo: 'padre' as const, n }));
    return [...sueltas, ...padres];
  };
  const columnas = ORDEN.filter((e) => e !== 'done' || mostrarHechas);
  /* B16 · lo que se cuenta es lo que se ve */
  const cuenta = (e: EstadoV6) => carrilesVisibles.filter((c) => !estaPlegado(c)).reduce((n, c) => n + deCelda(c, e).length, 0);
  const nHechas = filtradas.filter((h) => estadoDeHoja(h) === 'done').length;

  /* panel */
  const [enPanel, setEnPanel] = useState<string | null>(null);
  useEffect(() => { if (enPanel && !nodos.has(enPanel)) setEnPanel(null); }, [enPanel, nodos]);
  const cifras = useMemo(() => {
    const m = new Map<string, CifrasDeFila>();
    if (enPanel) { const n = nodos.get(enPanel); if (n) m.set(enPanel, cifrasDe(n.t, tarifaDe, hoy)); }
    return m;
  }, [enPanel, nodos, tarifaDe, hoy]);

  /* avisos */
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = (a: Aviso) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso(a);
    temporizador.current = setTimeout(() => setAviso(null), a.deshacer ? 9000 : 6000);
  };
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  const raiz = useRef<HTMLDivElement>(null);
  const enfocar = (id: string) => requestAnimationFrame(() => raiz.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`)?.focus());

  /* lo que cambia arriba (estado y % de cada ancestro) si se aplica `cambio` a sus hojas */
  const resumenArriba = (ids: string[], cambio: (t: Task) => Task) => {
    const aplicar = (t: Task): Task => { const c = cambio(t); return tieneHijas(c) ? { ...c, subtasks: c.subtasks!.map(aplicar) } : c; };
    const porEstado = new Map<EstadoV6, string[]>();
    const avances: string[] = [];
    for (const id of ids) {
      const nodo = nodos.get(id);
      if (!nodo) continue;
      const e0 = estados.get(id); const e1 = estadoDe(aplicar(nodo.t));
      if (e0 !== e1) porEstado.set(e1, [...(porEstado.get(e1) ?? []), nombreNodo(id)]);
      const p0 = avanceDe(hojasDe(nodo.t)); const p1 = avanceDe(hojasDe(aplicar(nodo.t)));
      if (p0 !== p1) avances.push(`${nombreNodo(id)}: ${p0}% → ${p1}%`);
    }
    return (porEstado.size ? ` ${[...porEstado].map(([e, ns]) => x.pasa(ns, x.st[e])).join('; ')}.` : '')
      + (avances.length ? ` ${avances.join(' · ')}.` : '');
  };
  /* guardar varias hojas a la vez (a la vista antes de que vuelvan en `tasks`) */
  const guardarVarias = async (pares: { h: Task; c: Cambio }[]) => {
    setCambios((m) => { const n = new Map(m); pares.forEach(({ h, c }) => n.set(h.id, c)); return n; });
    const res = await Promise.all(pares.map(async ({ h, c }) => { enviados.current.add(h.id); return onMover(h, c.status, c.progress); }));
    const fallidas = pares.filter((_, i) => res[i] === false).map(({ h }) => h.id);
    const quitar = (ids: string[]) => setCambios((m) => { const n = new Map(m); ids.forEach((id) => { n.delete(id); enviados.current.delete(id); }); return n; });
    if (fallidas.length) quitar(fallidas);
    setTimeout(() => quitar(pares.map(({ h }) => h.id).filter((id) => enviados.current.has(id))), 8000);
    return fallidas.length === 0;
  };
  /* el % que hay que confirmar: una hoja reabierta sin conocer su avance anterior (sigue en 100 %) */
  const [porConfirmar, setPorConfirmar] = useState<Set<string>>(new Set());

  /* mover una hoja: el estado nuevo, el % según la regla, el aviso con lo que cambia arriba y «Deshacer» */
  const mover = async (h: Task, a: EstadoV6, silencioso = false): Promise<Aviso | null> => {
    const de = estadoDeHoja(h);
    if (de === a) return null;
    const nombre = h.name;
    const antes: Cambio = { status: String(h.status ?? STATUS_DE_ESTADO_V6[de]), progress: h.progress ?? 0 };
    let progreso = h.progress ?? 0;
    let nota = '';
    if (a === 'done') {
      if (!porConfirmar.has(h.id)) avanceAnterior.current.set(h.id, progreso);
      setPorConfirmar((s) => { const n = new Set(s); n.delete(h.id); return n; });
      progreso = 100; nota = x.alCien(nombre);
    }
    else if (de === 'done') {
      const p = avanceAnterior.current.get(h.id);
      if (p != null) { progreso = p; avanceAnterior.current.delete(h.id); nota = x.volvioCon(nombre, x.st[a], p); }
      else { nota = x.volvioSin(nombre, x.st[a]); setPorConfirmar((s) => new Set(s).add(h.id)); }
    } else {
      nota = x.pasoA(nombre, x.st[a]);
      if (progreso > 0 && a !== 'prog') nota += x.conserva(Math.round(progreso));
    }
    const nuevo: Cambio = { status: STATUS_DE_ESTADO_V6[a], progress: progreso };
    /* lo que cambia arriba: el estado y el % de cada ancestro (y las vencidas) */
    const n = nodos.get(h.id);
    const despues = { ...h, status: nuevo.status, progress: nuevo.progress } as Task;
    let texto = nota;
    if (estaVencida(despues, hoy) && !estaVencida(h, hoy)) texto += x.quedaVencida(diasDeRetraso(despues, hoy, cal));
    if (!estaVencida(despues, hoy) && estaVencida(h, hoy)) texto += x.yaNoVencida;
    texto += resumenArriba(n?.ancestros ?? [], (t) => (t.id === h.id ? despues : t));
    if (a === 'blocked' && !(h.dependencies ?? []).length) texto += x.indique;

    if (a === 'done' && !mostrarHechas) { /* la tarjeta se va a la columna plegada: el aviso lo cuenta */ }
    setCambios((m) => new Map(m).set(h.id, nuevo));
    const guardar = async (c: Cambio) => {
      enviados.current.add(h.id);
      const ok = await onMover(h, c.status, c.progress);
      if (ok === false) {
        enviados.current.delete(h.id);
        setCambios((m) => { const nn = new Map(m); nn.delete(h.id); return nn; });
        return false;
      }
      /* si la app no devuelve nada nuevo (falló sin decirlo), la cifra vuelve sola */
      setTimeout(() => {
        if (!enviados.current.has(h.id)) return;
        enviados.current.delete(h.id);
        setCambios((m) => { const nn = new Map(m); nn.delete(h.id); return nn; });
      }, 8000);
      return true;
    };
    const ok = await guardar(nuevo);
    if (!ok) return null;
    const av: Aviso = {
      texto,
      deshacer: () => {
        setCambios((m) => new Map(m).set(h.id, antes));
        if (a === 'done') avanceAnterior.current.delete(h.id);
        setPorConfirmar((s) => { const ns = new Set(s); ns.delete(h.id); return ns; });
        void guardar(antes).then((bien) => { if (bien && !silencioso) avisar({ texto: x.deshecho(nombre, x.st[de]) }); });
        enfocar(h.id);
      },
    };
    if (!silencioso) avisar(av);
    return av;
  };

  /* cambiar de tarea padre dentro de la fase (con «Tarea padre»): renumera y, si se soltó en otra columna, también el estado */
  const cambiarPadre = async (h: Task, destino: Nodo, e: EstadoV6) => {
    if (!onCambiarPadre) return;
    const n = nodos.get(h.id)!;
    const viejo = n.padre;
    const hermanos = viejo ? nodos.get(viejo)?.t.subtasks ?? [] : tasks;
    const posVieja = Math.max(0, hermanos.findIndex((s) => s.id === h.id));
    const hijos = destino.t.subtasks ?? [];
    const numero = Math.max(0, ...hijos.map((s) => Number((nodos.get(s.id)?.wbs ?? '').split('.').pop()) || 0)) + 1;
    const wbsNuevo = `${destino.wbs}.${numero}`;
    const avances: string[] = [];
    const viejoNodo = viejo ? nodos.get(viejo) : undefined;
    if (viejoNodo && viejoNodo.nivel > 0) {
      const restantes = hojasDe(viejoNodo.t).filter((l) => l.id !== h.id);
      const p0 = avanceDe(hojasDe(viejoNodo.t)); const p1 = avanceDe(restantes);
      if (restantes.length && p0 !== p1) avances.push(`${viejoNodo.t.name}: ${p0}% → ${p1}%`);
    }
    if (destino.nivel > 0) {
      const p0 = avanceDe(hojasDe(destino.t)); const p1 = avanceDe([...hojasDe(destino.t), h]);
      if (p0 !== p1) avances.push(`${destino.t.name}: ${p0}% → ${p1}%`);
    }
    const ok = await onCambiarPadre(h, destino.t.id, hijos.length);
    if (ok === false) return;
    let texto = destino.nivel === 0 ? x.ahoraDirecta(h.name, wbsNuevo, nombreNodo(destino.t.id)) : x.ahoraDentro(h.name, wbsNuevo, destino.t.name);
    const estado = e !== estadoDeHoja(h) ? await mover(h, e, true) : null;
    if (estado) texto += ` ${estado.texto}`;
    if (avances.length) texto += ` ${avances.join(' · ')}.`;
    avisar({
      texto,
      deshacer: () => {
        estado?.deshacer?.();
        void Promise.resolve(onCambiarPadre(h, viejo, posVieja)).then((bien) => { if (bien !== false) avisar({ texto: x.devuelta(h.name) }); });
      },
    });
  };

  /* «Completar la rama»: todas las hojas abiertas de un padre a Completada (100 %), con «Deshacer» */
  const [confirmarRama, setConfirmarRama] = useState<string | null>(null);
  const completarRama = async (n: Nodo) => {
    setConfirmarRama(null);
    const abiertasR = hojasDe(n.t).filter((h) => estadoDeHoja(h) !== 'done');
    if (!abiertasR.length) return;
    const antes = abiertasR.map((h) => ({ h, c: { status: String(h.status ?? 'todo'), progress: h.progress ?? 0 } }));
    const ids = new Set(abiertasR.map((h) => h.id));
    const arriba = resumenArriba([...n.ancestros, n.t.id], (t) => (ids.has(t.id) ? { ...t, status: 'completed', progress: 100 } : t));
    abiertasR.forEach((h) => avanceAnterior.current.set(h.id, h.progress ?? 0));
    const ok = await guardarVarias(abiertasR.map((h) => ({ h, c: { status: 'completed', progress: 100 } })));
    if (!ok) return;
    avisar({
      texto: x.ramaCompleta(n.t.name, abiertasR.length) + arriba,
      deshacer: () => {
        abiertasR.forEach((h) => avanceAnterior.current.delete(h.id));
        void guardarVarias(antes).then((bien) => { if (bien) avisar({ texto: x.ramaDeshecha(n.t.name) }); });
      },
    });
  };

  /* el % de una hoja, desde el panel (y confirmar el que quedó «por confirmar») */
  const [errorAvance, setErrorAvance] = useState<string | null>(null);
  const fijarAvance = async (h: Task, texto: string) => {
    const s = texto.trim();
    if (!/^\d{1,3}$/.test(s) || Number(s) > 100) { setErrorAvance(x.numeroAvance); return; }
    setErrorAvance(null);
    const v = Number(s);
    const viejo = Math.round(h.progress ?? 0);
    const estabaPorConfirmar = porConfirmar.has(h.id);
    setPorConfirmar((p) => { const n = new Set(p); n.delete(h.id); return n; });
    if (v === viejo) { if (estabaPorConfirmar) avisar({ texto: x.avanceConfirmado(v) }); return; }
    const status = String(h.status ?? STATUS_DE_ESTADO_V6[estadoDeHoja(h)]);
    const arriba = resumenArriba(nodos.get(h.id)?.ancestros ?? [], (t) => (t.id === h.id ? { ...t, progress: v } : t));
    const ok = await guardarVarias([{ h, c: { status, progress: v } }]);
    if (!ok) return;
    avisar({
      texto: x.avanceCambio(h.name, viejo, v) + arriba,
      deshacer: () => { void guardarVarias([{ h, c: { status, progress: h.progress ?? 0 } }]); },
    });
  };

  const moverConTeclado = (h: Task, paso: 1 | -1) => {
    const i = ORDEN.indexOf(estadoDeHoja(h)) + paso;
    if (i < 0) return avisar({ texto: x.primera });
    if (i >= ORDEN.length) return avisar({ texto: x.ultima });
    if (ORDEN[i] === 'done' && !mostrarHechas) onVista({ ...vista, mostrarHechas: true });
    void mover(h, ORDEN[i]!).then(() => { enfocar(h.id); });
  };

  /* arrastre: dentro de su carril; en otro se atenúa y, al soltar, el aviso dice por qué no (con `dropEffect = 'none'` el
   * navegador ni siquiera avisaría del soltar) */
  const [arrastre, setArrastre] = useState<{ id: string; carril: string; padre?: boolean } | null>(null);
  const avisoDePadre = (id: string) => {
    const n = nodos.get(id);
    if (!n) return;
    avisar({ texto: x.padreArrastre(n.wbs, n.t.name, hojasDe(n.t).length), accion: { etiqueta: x.abrirPanel, fn: () => setEnPanel(id) } });
  };
  const [sobre, setSobre] = useState<string | null>(null);
  const soltar = (c: Carril | null, e: EstadoV6, ev: DragEvent) => {
    ev.preventDefault();
    const a = arrastre;
    setArrastre(null); setSobre(null);
    if (!a) return;
    if (a.padre) return avisoDePadre(a.id);
    const h = nodos.get(a.id)?.t;
    if (!h) return;
    if (c && c.clave !== a.carril) {
      const f = faseDe(h);
      const faseDestino = c.nodo ? (c.nodo.nivel === 0 ? c.nodo.t.id : c.nodo.ancestros[0] ?? null) : null;
      if (vista.agrupar === 'padre' && c.nodo && faseDestino === f) {
        if (onCambiarPadre) return void cambiarPadre(h, c.nodo, e);
        return avisar({ texto: x.otroPadre(h.name) });
      }
      return avisar({ texto: x.otraFase(h.name, nombreNodo(f)) });
    }
    void mover(h, e);
  };

  const alternarCarril = (c: Carril) => setPlegados((m) => new Map(m).set(c.clave, !estaPlegado(c)));
  const algoAbierto = carrilesVisibles.some((c) => c.nodo && !estaPlegado(c));
  const plegarTodo = () => {
    const m = new Map<string, boolean>();
    carriles.forEach((c) => m.set(c.clave, algoAbierto ? true : c.hecho));
    setPlegados(m);
  };

  /* teclado entre tarjetas: ↑ ↓ en la celda, ← → a la celda vecina */
  const alTeclear = (ev: KeyboardEvent<HTMLElement>, h: Task, esPadre = false) => {
    if (ev.target !== ev.currentTarget) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEnPanel(h.id); return; }
    if (ev.key === 'Escape' && enPanel) { ev.preventDefault(); setEnPanel(null); return; }
    if (!esPadre && ((ev.shiftKey && ev.key === 'F10') || ev.key === 'ContextMenu')) { ev.preventDefault(); setMenuDe(h.id); return; }
    if (ev.altKey && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
      ev.preventDefault();
      if (esPadre) avisoDePadre(h.id); else moverConTeclado(h, ev.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || !ev.key.startsWith('Arrow')) return;
    ev.preventDefault();
    const tarjeta = ev.currentTarget;
    const celda = tarjeta.closest('.kb-cell');
    const fila = tarjeta.closest('.kb-row');
    if (!celda || !fila) return;
    const enCelda = [...celda.querySelectorAll<HTMLElement>(':scope > .kcard')];
    const i = enCelda.indexOf(tarjeta);
    if (ev.key === 'ArrowDown') enCelda[i + 1]?.focus();
    else if (ev.key === 'ArrowUp') enCelda[i - 1]?.focus();
    else {
      const celdas = [...fila.querySelectorAll<HTMLElement>(':scope > .kb-cell')];
      const d = ev.key === 'ArrowRight' ? 1 : -1;
      for (let j = celdas.indexOf(celda as HTMLElement) + d; j >= 0 && j < celdas.length; j += d) {
        const ks = celdas[j]!.querySelectorAll<HTMLElement>(':scope > .kcard');
        if (ks.length) { ks[Math.min(i, ks.length - 1)]!.focus(); break; }
      }
    }
  };

  /* ── piezas ── */
  const avatar = (p?: Persona) => (p
    ? <span className="avatar" role="img" title={p.name} aria-label={p.name}>{p.initials || (p.name ?? '?').slice(0, 2).toUpperCase()}</span>
    : <span className="avatar none" role="img" title={x.sinRespAvatar} aria-label={x.sinRespAvatar}>+</span>);

  const porQue = (hs: Task[]) => {
    const e = estadoDe({ id: '_', name: '', progress: 0, subtasks: hs } as Task);
    const c = contar(hs, hoy);
    return e === 'prog' ? x.porque.prog(c.prog, c.done, hs.length) : x.porque[e];
  };
  const chipCalculado = (hs: Task[]) => {
    const e = estadoDe({ id: '_', name: '', progress: 0, subtasks: hs } as Task);
    const tip = `${x.calculado}: ${porQue(hs)}.\n${x.regla}`;
    return <span className={`schip ${e}`} tabIndex={0} role="note" aria-label={`${x.calculado}: ${x.st[e]}. ${porQue(hs)}.`} title={tip}><i aria-hidden="true" />{x.st[e]}</span>;
  };
  const barraApilada = (hs: Task[]) => {
    const c = contar(hs, hoy); const n = hs.length || 1;
    return (
      <span className="sbar" role="img" aria-label={x.sbar(c)} title={x.sbar(c)}>
        {(['done', 'prog', 'blocked', 'todo'] as EstadoV6[]).map((k) => (c[k] ? <b key={k} className={k} style={{ width: `${(100 * c[k]) / n}%` }} /> : null))}
      </span>
    );
  };

  /* dependencias: la abierta que manda */
  const predecesoras = (h: Task) => (h.dependencies ?? []).map((id) => nodos.get(id)).filter((d): d is Nodo => !!d && estados.get(d.t.id) !== 'done');
  const finDe = (n: Nodo) => (tieneHijas(n.t) ? Math.max(...hojasDe(n.t).map((l) => fechaDia(l.endDate)).filter((v) => !Number.isNaN(v))) : fechaDia(n.t.endDate));
  const espera = (h: Task): ReactNode => {
    if (estadoDeHoja(h) === 'done') return null;
    const ds = predecesoras(h);
    const nombreDe = (d: Nodo) => `${d.wbs} · ${d.t.name}`;
    if (estadoDeHoja(h) === 'blocked') {
      const d = ds[0];
      return (
        <div className="warn" title={d ? `${x.espera} ${d.wbs} ${d.t.name} (${x.st[estados.get(d.t.id) ?? 'todo']})` : undefined}>
          <Advertencia /><span>{d ? `${x.espera} ${nombreDe(d)}` : x.bloqueadaSinCausa}</span>
        </div>
      );
    }
    const choque = ds.find((d) => finDe(d) >= fechaDia(h.startDate));
    if (choque) return <div className="warn" title={`${choque.wbs} ${choque.t.name}`}><Advertencia /><span>{x.empiezaAntes} {choque.wbs}</span></div>;
    if (!ds.length) return null;
    return <div className="after" title={ds.map((d) => `${d.wbs} ${d.t.name}`).join(', ')}>{x.despues} {ds[0]!.wbs}{ds.length > 1 ? x.yMas(ds.length - 1) : ''}</div>;
  };

  const fechas = (h: Task) => {
    const venc = estaVencida(h, hoy);
    const fin = h.endDate ? fechaCorta(new Date(h.endDate), idioma, hoy) : '—';
    const ini = h.startDate ? fechaCorta(new Date(h.startDate), idioma, hoy) : '—';
    const chip = venc ? <span className="chip-red" title={x.vencidaHace(diasDeRetraso(h, hoy, cal))}>{fin}</span> : null;
    if (h.isMilestone) return <span className="kc-dates"><i className="diamond" aria-hidden="true" />{x.hito} · {chip ?? fin}</span>;
    if (venc) return <span className="kc-dates"><span className="start">{ini} –</span>{chip}</span>;
    return <span className="kc-dates plain">{ini} – {fin}</span>;
  };

  const tarjeta = (h: Task, c: Carril) => {
    const n = nodos.get(h.id)!;
    const e = estadoDeHoja(h);
    const hecha = e === 'done';
    const pct = Math.round(h.progress ?? 0);
    const reg = ((h as { timeLoggedMinutes?: number }).timeLoggedMinutes ?? 0) / 60;
    const est = ((h as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
    const desc = String((h as { description?: string }).description ?? '').trim();
    const etiqueta = [`${n.wbs} ${h.name}`, x.st[e], estaVencida(h, hoy) ? x.vencidaHace(diasDeRetraso(h, hoy, cal)) : null, `${nombreNodo(n.padre)}`].filter(Boolean).join('. ');
    return (
      <article key={h.id} className={`kcard${hecha ? ' isdone' : ''}${enPanel === h.id ? ' sel' : ''}${arrastre?.id === h.id ? ' dragging' : ''}`}
        tabIndex={0} draggable data-card={h.id} aria-label={etiqueta} aria-describedby="kb-v6-ayuda" aria-keyshortcuts="Enter Alt+ArrowLeft Alt+ArrowRight"
        onClick={() => setEnPanel(h.id)} onKeyDown={(ev) => alTeclear(ev, h)}
        onContextMenu={(ev) => { ev.preventDefault(); setMenuDe(h.id); }}
        onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', h.id); setArrastre({ id: h.id, carril: c.clave }); }}
        onDragEnd={() => { setArrastre(null); setSobre(null); }}>
        <div className="kc-top">
          <span className="kc-path" title={rutaDe(h)}>{nombreNodo(n.padre)}</span>
          <PuntoDeRiesgo riesgos={h.riesgos} es={es} />
          <span className="mono">{n.wbs}</span>
          <button type="button" className="kc-more" tabIndex={-1} aria-haspopup="menu" aria-expanded={menuDe === h.id} aria-label={x.acciones(`${n.wbs} ${h.name}`)}
            onClick={(ev) => { ev.stopPropagation(); setMenuDe(menuDe === h.id ? null : h.id); }}><Puntos /></button>
        </div>
        {menuDe === h.id && menuDeTarjeta(h)}
        <div className="kc-name">{h.name}</div>
        {desc && <div className="kc-desc">{desc}</div>}
        {espera(h)}
        {!hecha && !h.isMilestone && (pct > 0 || e === 'prog') && (
          <div className="kc-prog"><span className="pbar" aria-hidden="true"><b style={{ width: `${Math.min(100, pct)}%` }} /></span><span className={`pct${pct ? ' on' : ' zero'}`}>{pct}%</span>{porConfirmar.has(h.id) && <span className="unc">{x.porConfirmar}</span>}</div>
        )}
        <div className="kc-bot">
          {fechas(h)}
          <span className="kc-r">
            {vista.horas && !h.isMilestone && est > 0 && <span className="kc-hrs" title={x.horasTit}>{horasCortas(reg, es)}/{horasCortas(est, es)} h</span>}
            {avatar(responsableDe(h))}
          </span>
        </div>
      </article>
    );
  };

  const [subsAbiertas, setSubsAbiertas] = useState<Set<string>>(new Set());
  const filasHijas = (t: Task, nivel: number, c: Carril): ReactNode[] => [...(t.subtasks ?? [])]
    .sort((a, b) => (nodos.get(a.id)?.wbs ?? '').localeCompare(nodos.get(b.id)?.wbs ?? '', undefined, { numeric: true }))
    .flatMap((s) => {
      const ns = nodos.get(s.id)!;
      const pad = { paddingLeft: 4 + nivel * 12 };
      if (tieneHijas(s)) {
        const hs = hojasDe(s); const hechas = hs.filter((l) => estadoDeHoja(l) === 'done').length; const e = estados.get(s.id) ?? 'todo';
        return [
          <li key={s.id}><button type="button" style={pad} onClick={(ev) => { ev.stopPropagation(); setEnPanel(s.id); }}>
            <span className="mono">{ns.wbs}</span><span className="nm sub-par">{s.name}</span><i className={`sdot ${e}`} aria-hidden="true" /><span className="sr">{x.st[e]},</span><span className="mono">{hechas}/{hs.length}</span>
          </button></li>,
          ...filasHijas(s, nivel + 1, c),
        ];
      }
      const e = estadoDeHoja(s);
      return [
        <li key={s.id}><button type="button" style={pad} draggable data-card={s.id} aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
          onClick={(ev) => { ev.stopPropagation(); setEnPanel(s.id); }}
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if (ev.altKey && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { ev.preventDefault(); moverConTeclado(s, ev.key === 'ArrowRight' ? 1 : -1); }
          }}
          onDragStart={(ev) => { ev.stopPropagation(); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', s.id); setArrastre({ id: s.id, carril: c.clave }); }}
          onDragEnd={() => { setArrastre(null); setSobre(null); }}>
          <span className="mono">{ns.wbs}</span><span className="nm">{s.name}</span>
          {estaVencida(s, hoy) && <span className="chip-red" title={x.vencidaHace(diasDeRetraso(s, hoy, cal))}>{s.endDate ? fechaCorta(new Date(s.endDate), idioma, hoy) : ''}</span>}
          <i className={`sdot ${e}`} title={x.st[e]} aria-hidden="true" /><span className="sr">{x.st[e]}</span>
        </button></li>,
      ];
    });

  const tarjetaPadre = (n: Nodo, c: Carril) => {
    const hs = hojasDe(n.t);
    const cc = contar(hs, hoy);
    const e = estados.get(n.t.id) ?? 'todo';
    const abierto = subsAbiertas.has(n.t.id);
    const ini = Math.min(...hs.map((l) => fechaDia(l.startDate)).filter((v) => !Number.isNaN(v)));
    const fin = Math.max(...hs.map((l) => fechaDia(l.endDate)).filter((v) => !Number.isNaN(v)));
    const fecha = (v: number) => (Number.isFinite(v) ? fechaCorta(new Date(v), idioma, hoy) : '—');
    return (
      <article key={n.t.id} className={`kcard kpar${enPanel === n.t.id ? ' sel' : ''}${arrastre?.id === n.t.id ? ' dragging' : ''}`}
        tabIndex={0} draggable data-card={n.t.id} aria-describedby="kb-v6-ayuda"
        aria-label={`${n.wbs} ${n.t.name}, ${x.tareaPadre}. ${x.st[e]}, ${x.terminadas(cc.done, hs.length)}${cc.vencidas ? `, ${cc.vencidas} ${x.vencidaN(cc.vencidas)}` : ''}`}
        onClick={() => setEnPanel(n.t.id)} onKeyDown={(ev) => alTeclear(ev, n.t, true)}
        onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', n.t.id); setArrastre({ id: n.t.id, carril: c.clave, padre: true }); }}
        onDragEnd={() => { setArrastre(null); setSobre(null); }}>
        <div className="kc-top">
          <span className="kc-path" title={n.ancestros.map(nombreNodo).join(' › ')}>{nombreNodo(n.padre)}</span>
          <span className="mono">{n.wbs}</span>
        </div>
        <div className="kc-name">{n.t.name}</div>
        <div className="kc-sum">{barraApilada(hs)}<span className="mono">{cc.done}/{hs.length}</span></div>
        {vista.subtareas === 'bajo' && (
          <button type="button" className="kc-kids" aria-expanded={abierto}
            onClick={(ev) => { ev.stopPropagation(); setSubsAbiertas((s) => { const nn = new Set(s); if (nn.has(n.t.id)) nn.delete(n.t.id); else nn.add(n.t.id); return nn; }); }}>
            <Chevron />{abierto ? x.ocultarSubs(hs.length) : x.verSubs(hs.length)}
          </button>
        )}
        {vista.subtareas === 'bajo' && abierto && <ul className="kc-kl">{filasHijas(n.t, 0, c)}</ul>}
        <div className="kc-bot">
          {cc.vencidas ? <span className="chip-red">{cc.vencidas} {x.vencidaN(cc.vencidas)}</span>
            : <span className="kc-dates plain">{fecha(ini)} – {fecha(fin)}</span>}
          <span className="kc-r">{avatar(responsableDe(n.t))}</span>
        </div>
      </article>
    );
  };

  /* el menú ⋯ de una tarjeta (también Mayús+F10 o el botón derecho): abrir el detalle y mover */
  const [menuDe, setMenuDe] = useState<string | null>(null);
  useEffect(() => {
    if (!menuDe) return;
    const fuera = (ev: MouseEvent) => { if (!(ev.target as HTMLElement).closest?.('.kc-menu, .kc-more')) setMenuDe(null); };
    const esc = (ev: globalThis.KeyboardEvent) => { if (ev.key === 'Escape') { const id = menuDe; setMenuDe(null); enfocar(id); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    requestAnimationFrame(() => raiz.current?.querySelector<HTMLElement>('.kc-menu [role^=menuitem]:not([aria-disabled=true])')?.focus());
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuDe]);
  const menuDeTarjeta = (h: Task) => {
    const actual = estadoDeHoja(h);
    return (
      <div className="kc-menu" role="menu" aria-label={x.acciones(h.name)} onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => {
          ev.stopPropagation();
          if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
          ev.preventDefault();
          const ls = [...ev.currentTarget.querySelectorAll<HTMLElement>('[role^=menuitem]:not([aria-disabled=true])')];
          const i = ls.indexOf(document.activeElement as HTMLElement);
          ls[(i + (ev.key === 'ArrowDown' ? 1 : ls.length - 1)) % ls.length]?.focus();
        }}>
        <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setMenuDe(null); setEnPanel(h.id); }}>{x.abrirDetalle}<span className="hint">Enter</span></button>
        <hr />
        <h6>{x.moverA}</h6>
        {ORDEN.map((e) => (
          <button key={e} type="button" role="menuitemradio" tabIndex={-1} aria-checked={e === actual} aria-disabled={e === actual || undefined}
            onClick={() => {
              if (e === actual) return;
              setMenuDe(null);
              if (e === 'done' && !mostrarHechas) onVista({ ...vista, mostrarHechas: true });
              void mover(h, e).then(() => { enfocar(h.id); });
            }}>
            <span className={`sdot ${e}`} aria-hidden="true" />{x.st[e]}
          </button>
        ))}
      </div>
    );
  };

  const fila = (c: Carril) => (
    <div className="kb-grid kb-row">
      {columnas.map((e) => {
        const items = deCelda(c, e);
        const clave = `${c.clave}|${e}`;
        const ajena = !!arrastre && vista.agrupar !== 'todo' && arrastre.carril !== c.clave;
        return (
          <div key={e} className={`kb-cell${items.length ? '' : ' empty'}${sobre === clave && !ajena ? ' over' : ''}${ajena ? ' off' : ''}`}
            role="group" aria-label={`${x.st[e]} · ${c.nodo ? nombreNodo(c.nodo.t.id) : c.clave === 'todo' ? x.todas : x.sinFase}`}
            onDragOver={(ev) => { if (!arrastre) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; if (sobre !== clave) setSobre(clave); }}
            onDragLeave={() => setSobre((s) => (s === clave ? null : s))}
            onDrop={(ev) => soltar(c, e, ev)}>
            {items.length ? items.map((it) => (it.tipo === 'hoja' ? tarjeta(it.t, c) : tarjetaPadre(it.n, c)))
              : <span className="empty-t">{arrastre && !ajena ? x.suelte : x.sinTareas}</span>}
          </div>
        );
      })}
    </div>
  );

  const chipsDePadres = (fase: Nodo) => {
    const hijosPadre = (t: Task): Task[] => (t.subtasks ?? []).filter((s) => tieneHijas(s));
    const chip = (t: Task): ReactNode => {
      const n = nodos.get(t.id)!;
      const hs = hojasDe(t);
      const hechas = hs.filter((h) => estadoDeHoja(h) === 'done').length;
      const e = estados.get(t.id) ?? 'todo';
      const on = nodoFiltro === t.id;
      return (
        <Fragment key={t.id}>
          <button type="button" className="sub" aria-pressed={on} onClick={() => setNodoFiltro(on ? null : t.id)}
            title={`${on ? x.quitar : `${x.ver} ${n.wbs} ${t.name}`} · ${x.st[e]}, ${x.terminadas(hechas, hs.length)}`}>
            <span className="mono">{n.wbs}</span>{t.name}<i className={`sdot ${e}`} aria-hidden="true" /><span className="mono">{hechas}/{hs.length}</span>
          </button>
          {hijosPadre(t).map((s) => <Fragment key={s.id}><span className="sep" aria-hidden="true">›</span>{chip(s)}</Fragment>)}
        </Fragment>
      );
    };
    const tops = hijosPadre(fase.t);
    if (!tops.length) return null;
    return <div className="subs" role="group">{tops.map((t) => <span key={t.id} className="sgrp">{chip(t)}</span>)}</div>;
  };

  const cabecera = (c: Carril) => {
    const n = c.nodo;
    const plegado = estaPlegado(c);
    const cc = contar(c.todas, hoy);
    const porPadre = vista.agrupar === 'padre';
    const titulo = !n ? x.sinFase
      : n.nivel === 0 ? <>{`${x.fase} ${n.wbs} · ${n.t.name}`}{porPadre && <span className="path"> {x.directas}</span>}</>
        : <><span className="w">{n.wbs}</span>{n.t.name}</>;
    return (
      <header className="lane-h">
        {porPadre && n && n.nivel > 0 && <span className="tree" style={{ width: n.nivel * 12 }} aria-hidden="true" />}
        <button type="button" className="tg" aria-expanded={!plegado} onClick={() => alternarCarril(c)}
          aria-label={`${plegado ? x.desplegar : x.plegar} · ${n ? nombreNodo(n.t.id) : x.sinFase}`}><Chevron /></button>
        <h3>{titulo}</h3>
        {chipCalculado(c.todas)}
        <span className="meta">
          <span className="mono">{avanceDe(c.todas)}%</span>
          {barraApilada(c.todas)}
          <span>{x.terminadas(cc.done, c.todas.length)}</span>
          {cc.vencidas > 0 && <span className="red"><span className="mono">{cc.vencidas}</span> {x.vencidaN(cc.vencidas)}</span>}
          {cc.blocked > 0 && <span className="bl"><i aria-hidden="true" /><span className="mono">{cc.blocked}</span> {x.bloqueadaN(cc.blocked)}</span>}
          {porPadre && n && <span>{x.enCarril(c.propias.length, hojasDe(n.t).length, n.nivel === 0 ? x.enLaFase : `${x.en} ${n.t.name}`)}</span>}
        </span>
      </header>
    );
  };

  /* línea de resumen */
  const abiertas = filtradas.filter((h) => estadoDeHoja(h) !== 'done');
  const nVencidas = filtradas.filter((h) => estaVencida(h, hoy)).length;
  const nCarriles = new Set(abiertas.map((h) => (vista.agrupar === 'fase' ? faseDe(h) : nodos.get(h.id)?.padre) ?? '')).size;
  const chipsDeFiltro: [string, string, () => void][] = [];
  if (filtros.vencidas) chipsDeFiltro.push(['v', x.soloVencidas, () => onFiltros({ ...filtros, vencidas: false })]);
  if (filtros.bloqueadas) chipsDeFiltro.push(['b', x.soloBloqueadas, () => onFiltros({ ...filtros, bloqueadas: false })]);
  if (filtros.responsables.length) {
    const nombres = responsablesDelTablero(tasks);
    chipsDeFiltro.push(['r', `${x.responsable}: ${filtros.responsables.map((k) => (k ? nombres.find((p) => p.clave === k)?.nombre ?? k : x.sinResp)).join(', ')}`,
      () => onFiltros({ ...filtros, responsables: [] })]);
  }
  if (nodoFiltro) { const n = nodos.get(nodoFiltro); if (n) chipsDeFiltro.push(['n', `${n.wbs} ${n.t.name}`, () => setNodoFiltro(null)]); }

  const filaPanel = enPanel ? nodos.get(enPanel) ?? null : null;
  const abiertasDelPanel = filaPanel && tieneHijas(filaPanel.t) ? hojasDe(filaPanel.t).filter((h) => estadoDeHoja(h) !== 'done').length : 0;
  const accionesDelPanel = filaPanel && (tieneHijas(filaPanel.t)
    ? (
      <div className="dp-rama">
        <p className="dp-nota" style={{ margin: 0 }}>{x.padreNoSeMueve(hojasDe(filaPanel.t).length)}</p>
        {filaPanel.nivel === 0 ? <p className="dp-nota" style={{ margin: 0 }}>{x.faseNoSeCierra}</p>
          : abiertasDelPanel > 0 && (confirmarRama === filaPanel.t.id ? (
            <div className="dp-confirma" role="group">
              <span>{x.confirmarRama(abiertasDelPanel)}</span>
              <button type="button" className="kb-btn" onClick={() => void completarRama(filaPanel)}>{x.completar}</button>
              <button type="button" className="kb-btn2" onClick={() => setConfirmarRama(null)}>{x.cancelar}</button>
            </div>
          ) : (
            <button type="button" className="kb-btn2" onClick={() => setConfirmarRama(filaPanel.t.id)}>{x.completarRama(abiertasDelPanel)}</button>
          ))}
      </div>
    )
    : (
      <div className="dp-rama">
        <label className="dp-mover">
          <span>{x.moverA}</span>
          <select value={estadoDeHoja(filaPanel.t)} onChange={(ev) => {
            const a = ev.target.value as EstadoV6;
            if (a === 'done' && !mostrarHechas) onVista({ ...vista, mostrarHechas: true });
            void mover(filaPanel.t, a);
          }}>
            {ORDEN.map((e) => <option key={e} value={e}>{x.st[e]}</option>)}
          </select>
        </label>
        {!filaPanel.t.isMilestone && (
          <label className="dp-mover">
            <span>{x.avance}</span>
            <input key={`${filaPanel.t.id}-${Math.round(filaPanel.t.progress ?? 0)}`} inputMode="numeric" defaultValue={Math.round(filaPanel.t.progress ?? 0)}
              aria-invalid={!!errorAvance || undefined} aria-describedby={errorAvance ? 'kb-v6-avance' : undefined}
              onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); void fijarAvance(filaPanel.t, ev.currentTarget.value); } }}
              onBlur={(ev) => { if (ev.currentTarget.value.trim() !== String(Math.round(filaPanel.t.progress ?? 0)) || porConfirmar.has(filaPanel.t.id)) void fijarAvance(filaPanel.t, ev.currentTarget.value); }} />
            <span>%</span>
            {porConfirmar.has(filaPanel.t.id) && <span className="unc">{x.porConfirmar}</span>}
          </label>
        )}
        {errorAvance && <p id="kb-v6-avance" role="alert" className="dp-err">{errorAvance}</p>}
      </div>
    ));

  return (
    <section className={`lista-v6 tablero-v6${mostrarHechas ? ' show-done' : ''}${vista.densidad === 'compacta' ? ' dens-compact' : vista.densidad === 'comoda' ? ' dens-comfy' : ''}`}
      aria-label={x.tablero}>
      <style>{CSS_V6 + CSS_PANEL_V6 + CSS_RECURSOS_V6 + CSS_TABLERO_V6}</style>
      <p id="kb-v6-ayuda" className="sr">{x.ayuda}</p>
      <div className="sumline">
        <div>
          <span className="mono">{abiertas.length}</span>{nFiltros ? <> {x.de} <span className="mono">{hojas.filter((h) => estadoDeHoja(h) !== 'done').length}</span></> : null} {abiertas.length === 1 ? x.tarea : x.tareas}
          {vista.agrupar !== 'todo' && nCarriles > 0 && <> {x.en} <span className="mono">{nCarriles}</span> {vista.agrupar === 'fase' ? x.fasesN(nCarriles) : x.carriles(nCarriles)}</>}
          <span className="sep" aria-hidden="true">·</span>
          <span className="mono">{nHechas}</span> {x.completadaN(nHechas)} {mostrarHechas ? x.aLaVista : x.ocultas(nHechas)}{' '}
          <a href="#" onClick={(ev) => { ev.preventDefault(); onVista({ ...vista, mostrarHechas: !mostrarHechas }); }}>{mostrarHechas ? x.ocultar : x.mostrar}</a>
          <span className="sep" aria-hidden="true">·</span>
          {nVencidas ? (
            <>
              <span className="red"><span className="mono">{nVencidas}</span> {x.vencidaN(nVencidas)}</span>{' '}
              {!filtros.vencidas && <a href="#" className="red" onClick={(ev) => { ev.preventDefault(); onFiltros({ ...filtros, vencidas: true }); }}>{x.ver}</a>}
            </>
          ) : x.ningunaVencida}
          {chipsDeFiltro.map(([k, txt, quitar]) => (
            <button key={k} type="button" className="fchip" aria-label={`${x.quitar}: ${txt}`} onClick={quitar}>
              {x.filtrando} {txt}<span className="x" aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <div>
          {vista.agrupar !== 'todo' && carrilesVisibles.some((c) => c.nodo) && (
            <a href="#" onClick={(ev) => { ev.preventDefault(); plegarTodo(); }}>{algoAbierto ? x.plegar : x.desplegar}</a>
          )}
        </div>
      </div>

      <div className={`lbody${filaPanel ? ' has-panel' : ''}`}>
        <div className="kb-scroll" ref={raiz}>
          <div className="kb-in">
            <div className="kb-main">
              <div className="kb-grid kb-head">
                {columnas.map((e) => (
                  <div key={e} className="colh">
                    {x.st[e]}<span className="n">{cuenta(e)}</span>
                    {e === 'done' && (
                      <button type="button" className="colh-fold" aria-label={x.plegarColumna} onClick={() => onVista({ ...vista, mostrarHechas: false })}><Chevron /></button>
                    )}
                  </div>
                ))}
              </div>
              {visibles.length === 0 && nFiltros > 0 ? (
                <div className="kb-empty" role="status">
                  <h3>{x.ningunaCoincide}</h3>
                  <p>{x.ningunaTexto}</p>
                  <button type="button" className="kb-btn" onClick={() => { onFiltros(FILTROS_TABLERO_V6_VACIOS); setNodoFiltro(null); }}>{x.quitarFiltros}</button>
                </div>
              ) : carrilesVisibles.map((c) => (
                vista.agrupar === 'todo'
                  ? <section key="todo" className="lane" aria-label={x.todas}>{fila(c)}</section>
                  : (
                    <section key={c.clave || 'sin-fase'} className={`lane${estaPlegado(c) ? ' closed' : ''}`} aria-label={c.nodo ? nombreNodo(c.nodo.t.id) : x.sinFase}>
                      {cabecera(c)}
                      {vista.agrupar === 'fase' && c.nodo && !estaPlegado(c) && chipsDePadres(c.nodo)}
                      {!estaPlegado(c) && fila(c)}
                    </section>
                  )
              ))}
            </div>
            {!mostrarHechas && (
              <div className={`done-rail${sobre === 'rail' ? ' over' : ''}`}
                onDragOver={(ev) => { if (!arrastre) return; ev.preventDefault(); setSobre('rail'); }}
                onDragLeave={() => setSobre((s) => (s === 'rail' ? null : s))}
                onDrop={(ev) => soltar(null, 'done', ev)}>
                <button type="button" className="rail-btn" aria-expanded={false} aria-label={x.mostrarColumna(nHechas)}
                  onClick={() => onVista({ ...vista, mostrarHechas: true })}>
                  <span aria-hidden="true" className="ck">✓</span>
                  <span className="rail-t">{x.completadas} · <span className="mono">{nHechas}</span></span>
                </button>
              </div>
            )}
          </div>
        </div>
        {filaPanel && (
          <PanelDeTareaV6 fila={filaPanel} es={es} cal={cal} hoy={hoy} nombreProyecto={nombreProyecto}
            cifras={cifras.get(filaPanel.t.id) ?? cifrasDe(filaPanel.t, tarifaDe, hoy)} estados={estados} nombreEstado={x.st} porId={nodos}
            tarifaDe={tarifaDe} acciones={accionesDelPanel}
            onCerrar={() => { const id = filaPanel.t.id; setEnPanel(null); enfocar(id); }}
            onAbrirFicha={onAbrir} onVerRiesgo={onVerRiesgo} onIrA={(id) => { setEnPanel(id); enfocar(id); }} />
        )}
      </div>

      {(conCosto || vista.leyenda) && (
        <div className="vfoot">
          {conCosto && (
            <RecursosDeLaListaV6 tasks={tasks} es={es} tarifaDe={tarifaDe} tarifaDePersona={tarifaDePersona}
              monedaCodigo={monedaCodigo} costoAlTerminar={costoAlTerminar} onVerRecursos={onVerRecursos} />
          )}
          {vista.leyenda && <Leyenda x={x} hoy={hoy} idioma={idioma} />}
        </div>
      )}
      <div className="toast-zona" aria-live="polite">
        {aviso && (
          <div className="toast">
            <span className="toast-t">{aviso.texto}</span>
            {aviso.accion && <button type="button" onClick={() => { const f = aviso.accion?.fn; setAviso(null); f?.(); }}>{aviso.accion.etiqueta}</button>}
            {aviso.deshacer && <button type="button" onClick={() => { const d = aviso.deshacer; setAviso(null); d?.(); }}>{x.deshacer}</button>}
          </div>
        )}
      </div>
    </section>
  );
}

function Leyenda({ x, hoy, idioma }: { x: Textos; hoy: Date; idioma: 'es' | 'en' }) {
  return (
    <div className="leyenda" role="note" aria-label={x.leyenda}>
      {(['todo', 'prog', 'blocked', 'done'] as EstadoV6[]).map((e) => (
        <span key={e}><span className={`schip ${e}`}><i aria-hidden="true" />{x.st[e]}</span></span>
      ))}
      <span><span className="chip-red">{fechaCorta(hoy, idioma, hoy)}</span> {x.lVenc}</span>
      <span><span className="lg-bar" aria-hidden="true" /> {x.lBarra}</span>
      <span><kbd>Alt</kbd>+<kbd>←</kbd>/<kbd>→</kbd> {x.lAlt}</span>
    </div>
  );
}

function Chevron() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>;
}
function Puntos() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>;
}
function Advertencia() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 2.5 14 13H2L8 2.5Z" /><path d="M8 6.5v3M8 11.2v.1" strokeLinecap="round" /></svg>;
}

/* Las medidas son las de la maqueta; los tokens, los del Gantt v6 (`--v6-*`). */
export const CSS_TABLERO_V6 = `
.tablero-v6 .lbody{border-top:1px solid var(--v6-linea)}
.tablero-v6 .kb-scroll{flex:1;min-width:0;overflow:auto;max-height:calc(100vh - 262px);min-height:420px;container-type:inline-size;padding:0 14px}
.tablero-v6 .kb-in{display:flex;gap:12px;align-items:flex-start;width:max-content;min-width:100%}
/* el ancho es el de sus columnas: una cabecera de carril larga envuelve, no empuja la columna Completadas */
.tablero-v6 .kb-main{flex:none;--cw:clamp(256px,calc((100cqw - 80px) / 3),340px);width:calc(var(--cw) * 3 + 24px)}
.tablero-v6.show-done .kb-main{--cw:clamp(256px,calc((100cqw - 36px) / 4),340px);width:calc(var(--cw) * 4 + 36px)}
.tablero-v6 .kb-grid{display:grid;grid-template-columns:repeat(3,var(--cw));column-gap:12px;align-items:start}
.tablero-v6.show-done .kb-grid{grid-template-columns:repeat(4,var(--cw))}
.tablero-v6 .kb-head{position:sticky;top:0;z-index:6;background:var(--v6-tarjeta);padding:8px 0 6px}
.tablero-v6 .colh{height:32px;display:flex;align-items:center;gap:8px;padding:0 4px 0 10px;border-radius:10px;background:var(--v6-linea);font-size:12px;font-weight:600;color:var(--v6-texto)}
.tablero-v6 .colh .n{font:400 11px 'Geist Mono',monospace;font-variant-numeric:tabular-nums;color:var(--v6-tenue)}
.tablero-v6 .colh-fold{margin-left:auto;width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--v6-texto-2);border:0;background:transparent;cursor:pointer}
.tablero-v6 .colh-fold:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.tablero-v6 .colh-fold svg{transform:rotate(90deg)}
.tablero-v6 .done-rail{flex:none;width:44px;margin-top:8px;background:var(--v6-linea);border-radius:12px;align-self:stretch}
.tablero-v6 .done-rail.over{box-shadow:inset 0 0 0 1.5px var(--v6-tenue)}
.tablero-v6 .rail-btn{position:sticky;top:8px;width:44px;min-height:170px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;border-radius:12px;border:0;background:transparent;color:var(--v6-texto);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.tablero-v6 .rail-btn:hover{background:var(--v6-fila-hover)}
.tablero-v6 .rail-btn .ck{color:var(--v6-tenue);font-size:12px}
.tablero-v6 .rail-t{writing-mode:vertical-rl;white-space:nowrap}
.tablero-v6 .rail-t .mono{font-size:11px;color:var(--v6-tenue)}
.tablero-v6 .lane{border-top:1px solid var(--v6-linea)}
.tablero-v6 .lane-h{position:sticky;top:46px;z-index:4;background:var(--v6-tarjeta);display:flex;align-items:center;gap:6px 10px;min-height:44px;padding:6px 0;flex-wrap:wrap}
.tablero-v6 .lane-h .tg{width:24px;height:24px;border-radius:6px;display:grid;place-items:center;color:var(--v6-tenue);flex:none;border:0;background:transparent;cursor:pointer}
.tablero-v6 .lane-h .tg:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.tablero-v6 .lane.closed .lane-h .tg svg{transform:rotate(-90deg)}
.tablero-v6 .lane-h h3{margin:0;font-size:13px;font-weight:600;white-space:nowrap;display:flex;align-items:baseline;gap:6px;color:var(--v6-texto)}
.tablero-v6 .lane-h h3 .w{font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue)}
.tablero-v6 .lane-h h3 .path{color:var(--v6-tenue);font-weight:500}
.tablero-v6 .tree{flex:none;align-self:stretch;position:relative}
.tablero-v6 .tree::before{content:'';position:absolute;right:2px;top:-6px;height:calc(50% + 6px);width:9px;border-left:1px solid var(--v6-separador);border-bottom:1px solid var(--v6-separador);border-bottom-left-radius:5px}
.tablero-v6 .lane-h .meta{display:flex;align-items:center;gap:6px 10px;font-size:11px;color:var(--v6-tenue);font-weight:500;flex-wrap:wrap}
.tablero-v6 .meta .red{color:var(--v6-rojo)}
.tablero-v6 .meta .bl{display:inline-flex;align-items:center;gap:5px;color:var(--v6-texto-2)}
.tablero-v6 .meta .bl i,.tablero-v6 .sdot{width:6px;height:6px;border-radius:50%;background:var(--v6-tenue);flex:none;display:inline-block}
.tablero-v6 .meta .bl i,.tablero-v6 .sdot.blocked{background:var(--v6-ambar)}
.tablero-v6 .sdot.prog{background:var(--v6-acento-texto)}
.tablero-v6 .sdot.done{width:auto;height:auto;background:none;line-height:1}
.tablero-v6 .sdot.done::before{content:'✓';font-size:11px;font-style:normal;color:var(--v6-tenue)}
.tablero-v6 .schip[role=note]{cursor:help}
.tablero-v6 .sbar{display:inline-flex;gap:1px;width:64px;height:4px;border-radius:2px;background:var(--v6-pista);overflow:hidden;flex:none}
.tablero-v6 .sbar b{display:block;height:100%}
.tablero-v6 .sbar .done{background:var(--v6-acento)}
.tablero-v6 .sbar .prog{background:color-mix(in srgb,var(--v6-acento) 45%,var(--v6-tarjeta))}
.tablero-v6 .sbar .blocked{background:var(--v6-ambar)}
.tablero-v6 .sbar .todo{background:var(--v6-separador)}
.tablero-v6 .subs{display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center;padding:0 0 10px 34px}
.tablero-v6 .sgrp{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap}
.tablero-v6 .sgrp .sep{color:var(--v6-tenue);font-size:12px}
.tablero-v6 .sub{height:24px;display:inline-flex;align-items:center;gap:6px;padding:0 8px;border-radius:999px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);font:inherit;font-size:11px;font-weight:500;color:var(--v6-texto-2);white-space:nowrap;cursor:pointer}
.tablero-v6 .sub:hover{border-color:var(--v6-separador);color:var(--v6-texto)}
.tablero-v6 .sub .mono{font-size:11px;color:var(--v6-tenue)}
.tablero-v6 .sub[aria-pressed=true]{border-color:var(--v6-acento);background:var(--v6-fila-seleccionada);color:var(--v6-texto)}
.tablero-v6 .kb-row{padding-bottom:12px}
.tablero-v6 .kb-cell{background:var(--v6-linea);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:8px;min-height:40px;position:relative;transition:background .12s}
.tablero-v6 .kb-cell.empty{height:40px;padding:0 8px;justify-content:center;align-items:center;box-sizing:border-box}
.tablero-v6 .kb-cell.over{background:color-mix(in srgb,var(--v6-linea),var(--v6-acento) 10%)}
.tablero-v6 .kb-cell.off{opacity:.45}
.tablero-v6 .empty-t{font-size:11px;font-weight:500;color:var(--v6-tenue)}
.tablero-v6 .kcard{position:relative;background:var(--v6-tarjeta);border:1px solid var(--v6-borde);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;cursor:grab;user-select:none;outline:none}
.tablero-v6 .kcard:hover{border-color:var(--v6-separador)}
.tablero-v6 .kcard:focus-visible{box-shadow:0 0 0 2px var(--v6-acento-texto)}
.tablero-v6 .kcard.sel{border-color:var(--v6-acento);background:color-mix(in srgb,var(--v6-tarjeta),var(--v6-acento) 7%)}
.tablero-v6 .kcard.dragging{opacity:.4}
.tablero-v6 .kc-top{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--v6-tenue);min-height:16px}
.tablero-v6 .kc-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.tablero-v6 .kc-top .mono{font-size:11px;flex:none}
.tablero-v6 .kc-name{font-size:13px;font-weight:500;line-height:1.4;color:var(--v6-texto);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tablero-v6 .kcard.isdone .kc-name{color:var(--v6-texto-2)}
.tablero-v6 .warn{color:var(--v6-ambar);font-size:11px;font-weight:500;display:flex;align-items:flex-start;gap:5px;line-height:1.4}
.tablero-v6 .warn svg{flex:none;margin-top:1px}
.tablero-v6 .after{font-size:11px;font-weight:500;color:var(--v6-tenue)}
.tablero-v6 .kc-prog{display:flex;align-items:center;gap:8px}
.tablero-v6 .kc-prog .pbar{flex:1}
.tablero-v6 .pct.on{color:var(--v6-acento-texto)}
.tablero-v6 .kc-bot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}
.tablero-v6 .kc-r{display:flex;align-items:center;gap:8px}
.tablero-v6 .kc-dates{display:flex;align-items:center;gap:6px;font:400 11px 'Geist Mono',monospace;font-variant-numeric:tabular-nums;color:var(--v6-texto-2);white-space:nowrap}
.tablero-v6 .kc-hrs{font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue)}
.tablero-v6 .kc-desc{display:none;color:var(--v6-tenue);font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tablero-v6 .diamond{width:9px;height:9px;background:var(--v6-texto-2);transform:rotate(45deg);border-radius:1.5px;display:inline-block;flex:none}
.tablero-v6.dens-comfy .kc-desc{display:block}
.tablero-v6.dens-compact .kcard{gap:4px;padding:8px 10px}
.tablero-v6.dens-compact .kc-bot .avatar,.tablero-v6.dens-compact .kc-dates.plain,.tablero-v6.dens-compact .kc-dates .start{display:none}
.tablero-v6.dens-compact .kc-bot{min-height:0}
.tablero-v6.dens-compact .kc-bot:not(:has(.chip-red,.diamond,.kc-hrs)){display:none}
.tablero-v6 .kb-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:64px 16px;text-align:center}
.tablero-v6 .kb-empty h3{margin:4px 0 0;font-size:15px;font-weight:600;color:var(--v6-texto)}
.tablero-v6 .kb-empty p{margin:0 0 6px;color:var(--v6-texto-2)}
.tablero-v6 .kb-btn{height:32px;padding:0 12px;border-radius:8px;border:0;background:var(--v6-acento);color:var(--v6-sobre-acento);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.tablero-v6 .fchip{height:20px;display:inline-flex;align-items:center;gap:4px;padding:0 3px 0 8px;margin-left:6px;border-radius:999px;border:1px solid var(--v6-acento);background:var(--v6-fila-seleccionada);color:var(--v6-texto);font:inherit;font-size:11px;font-weight:500;vertical-align:middle;cursor:pointer}
.tablero-v6 .fchip .x{width:16px;height:16px;border-radius:50%;display:grid;place-items:center;color:var(--v6-texto-2)}
.tablero-v6 .fchip:hover .x{background:var(--v6-fila-hover);color:var(--v6-texto)}
.tablero-v6 .leyenda .lg-bar{display:inline-block;width:22px;height:4px;border-radius:2px;background:var(--v6-acento)}
.tablero-v6 .leyenda kbd{font:400 11px 'Geist Mono',monospace;border:1px solid var(--v6-borde);border-radius:4px;padding:0 4px;color:var(--v6-texto-2)}
.tablero-v6 .dp-mover{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:500;color:var(--v6-tenue)}
.tablero-v6 .dp-mover select{height:30px;padding:0 8px;border-radius:8px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);color:var(--v6-texto);font:inherit;font-size:12px}
.tablero-v6 .kc-more{width:24px;height:24px;margin:-5px -7px -5px -2px;border-radius:6px;display:grid;place-items:center;color:var(--v6-texto-2);opacity:0;flex:none;border:0;background:transparent;cursor:pointer}
.tablero-v6 .kcard:hover .kc-more,.tablero-v6 .kcard:focus .kc-more,.tablero-v6 .kcard:focus-within .kc-more,.tablero-v6 .kc-more[aria-expanded=true]{opacity:1}
.tablero-v6 .kc-more:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.tablero-v6 .kc-menu{position:absolute;right:6px;top:30px;z-index:30;min-width:200px;padding:6px;border-radius:10px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);box-shadow:0 8px 28px -6px rgba(14,17,20,.18);display:flex;flex-direction:column;cursor:default}
.tablero-v6 .kc-menu button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border:0;border-radius:6px;background:transparent;font:inherit;font-size:12px;color:var(--v6-texto);text-align:left;cursor:pointer}
.tablero-v6 .kc-menu button:hover,.tablero-v6 .kc-menu button:focus-visible{background:var(--v6-fila-hover);outline:none}
.tablero-v6 .kc-menu button[aria-disabled=true]{color:var(--v6-tenue);cursor:default}
.tablero-v6 .kc-menu .hint{margin-left:auto;font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue)}
.tablero-v6 .kc-menu hr{border:0;border-top:1px solid var(--v6-linea);margin:4px 0}
.tablero-v6 .kc-menu h6{margin:4px 8px 2px;font-size:11px;font-weight:500;color:var(--v6-tenue)}
.tablero-v6 .kpar{cursor:pointer}
.tablero-v6 .kc-sum{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--v6-tenue)}
.tablero-v6 .kc-sum .sbar{flex:1;width:auto}
.tablero-v6 .kc-kids{align-self:flex-start;height:24px;padding:0 6px;margin:-2px 0 -2px -6px;border-radius:6px;border:0;background:transparent;font:inherit;font-size:11px;font-weight:500;color:var(--v6-acento-texto);display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.tablero-v6 .kc-kids:hover{background:var(--v6-fila-hover)}
.tablero-v6 .kc-kids svg{transition:transform .15s}
.tablero-v6 .kc-kids[aria-expanded=false] svg{transform:rotate(-90deg)}
.tablero-v6 .kc-kl{list-style:none;margin:0;padding:4px 0 0;border-top:1px solid var(--v6-linea);display:flex;flex-direction:column}
.tablero-v6 .kc-kl button{display:flex;align-items:center;gap:6px;width:100%;min-height:28px;border:0;background:transparent;color:var(--v6-texto);font:inherit;font-size:12px;border-radius:6px;padding:0 4px;text-align:left;cursor:pointer}
.tablero-v6 .kc-kl button[draggable=true]{cursor:grab}
.tablero-v6 .kc-kl button:hover{background:var(--v6-fila-hover)}
.tablero-v6 .kc-kl .mono{font-size:11px;color:var(--v6-tenue);flex:none}
.tablero-v6 .kc-kl .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tablero-v6 .kc-kl .sub-par{color:var(--v6-texto-2);font-weight:600}
.tablero-v6 .kc-kl .chip-red{height:18px;padding:0 5px}
.tablero-v6 .unc{font-size:11px;color:var(--v6-tenue);white-space:nowrap}
.tablero-v6 .dp-rama{display:flex;flex-direction:column;gap:8px}
.tablero-v6 .dp-mover input{width:56px;height:30px;box-sizing:border-box;padding:0 8px;border-radius:8px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);color:var(--v6-texto);font:500 12px 'Geist Mono',monospace;text-align:right}
.tablero-v6 .dp-mover input[aria-invalid=true]{border-color:var(--v6-rojo)}
.tablero-v6 .dp-err{margin:0;font-size:12px;color:var(--v6-rojo)}
.tablero-v6 .dp-confirma{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--v6-texto-2)}
.tablero-v6 .kb-btn2{align-self:flex-start;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);color:var(--v6-texto);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.tablero-v6 .kb-btn2:hover{background:var(--v6-fila-hover)}
.tablero-v6 .toast-t{white-space:normal;max-width:560px}
.tablero-v6 .toast{white-space:normal}
`;
