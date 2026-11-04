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
  cifrasDe, diasDeRetraso, duracionHabil, estadoDe, estaVencida, horasCortas, juzgarHoras, millones, tieneHijas, type EstadoV6,
} from './reglasDeLaLista';
import { CSS_PANEL_V6, PanelDeTareaV6 } from './PanelDeTareaV6';
import { CSS_RECURSOS_V6, RecursosDeLaListaV6 } from './RecursosDeLaListaV6';

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
  onVerRecursos?: () => void;
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
    plegar: 'Plegar todo', desplegar: 'Desplegar todo', wbs: 'WBS y tarea', resp: 'Responsable', estado: 'Estado', inicio: 'Inicio', fin: 'Fin',
    dur: 'Duración (d háb.)', horas: 'Horas reg./est.', costo: 'Costo', total: 'Total del proyecto', columnas: 'Ver u ocultar columnas',
    todas: 'Mostrar todas', ayuda: 'Flechas arriba y abajo: cambiar de fila. Flecha derecha: desplegar; flecha izquierda: plegar o ir a la fila padre. Enter: abrir el detalle. F2: editar las horas.',
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
    leyenda: 'Leyenda', lVenc: 'Vencida', lDur: 'Duración en días hábiles',
  },
  en: {
    tareas: 'tasks', tarea: 'task', ocultas: 'completed hidden', aLaVista: 'completed shown', mostrar: 'Show', ocultar: 'Hide',
    vencidas: 'overdue', vencida: 'overdue', ver: 'View', filtrando: 'Filtering: overdue', quitar: 'Clear the overdue filter',
    plegar: 'Collapse all', desplegar: 'Expand all', wbs: 'WBS and task', resp: 'Owner', estado: 'Status', inicio: 'Start', fin: 'End',
    dur: 'Duration (work d)', horas: 'Hours logged/est.', costo: 'Cost', total: 'Project total', columnas: 'Show or hide columns',
    todas: 'Show all', ayuda: 'Up and down arrows: change row. Right arrow: expand; left arrow: collapse or go to the parent row. Enter: open the details. F2: edit the hours.',
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
    leyenda: 'Legend', lVenc: 'Overdue', lDur: 'Duration in working days',
  },
};

const NOMBRE_COL = (c: Columna, x: typeof TXT.es, moneda?: string | null): string => ({
  who: x.resp, st: x.estado, s: x.inicio, e: x.fin, dur: x.dur, pct: '%', hrs: x.horas, cost: moneda ? `${x.costo} (${moneda})` : x.costo,
}[c]);

function leerOcultas(clave?: string): Set<Columna> {
  if (!clave) return new Set();
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? '[]');
    return new Set((Array.isArray(v) ? v : []).filter((c): c is Columna => COLUMNAS.includes(c)));
  } catch { return new Set(); }
}

const iniciales = (n?: string) => (n ?? '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();

export function ListaV6({
  tasks: tasksProp, es, cal, tarifaDe, monedaCodigo, conCosto = true, onAbrir, seleccionada = null, claveColumnas, pie, hoy: hoyProp,
  avanceTotal, vista: vistaProp, onVista, onRegistrarHoras, peticionColumnas, nombreProyecto,
  tarifaDePersona, costoAlTerminar, onVerRecursos,
}: ListaV6Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
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
  const enElFiltro = useMemo(() => {
    if (filtro !== 'vencidas') return null;
    const ok = new Set<string>();
    for (const f of todas) if (estaVencida(f.t, hoy)) { ok.add(f.t.id); f.ancestros.forEach((a) => ok.add(a)); }
    return ok;
  }, [filtro, todas, hoy]);

  /* el orden: por WBS, o por la columna, entre hermanas */
  const ordenadas = useMemo(() => {
    if (orden.k === 'wbs' && !orden.desc) return agrupar ? todas : todas.filter((f) => !f.esFase);
    const valor = (f: Fila): number => {
      const c = cifras.get(f.t.id)!;
      switch (orden.k) {
        case 's': return f.t.startDate ? new Date(f.t.startDate).getTime() : Infinity;
        case 'e': return f.t.endDate ? new Date(f.t.endDate).getTime() : Infinity;
        case 'dur': return duracionHabil(f.t, cal) ?? -1;
        case 'pct': return f.t.progress ?? 0;
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
    if (!mostrarHechas && estados.get(f.t.id) === 'done' && !f.ancestros.some((a) => abiertasConHechas.has(a))) return false;
    return true;
  }), [ordenadas, plegadas, enElFiltro, mostrarHechas, estados, abiertasConHechas, agrupar, ancestrosVisibles]);

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
  const pctTotal = useMemo(() => {
    let peso = 0; let suma = 0;
    for (const t of tasks) { const w = Math.max(1, cifrasDe(t, tarifaDe, hoy).est); peso += w; suma += w * (t.progress ?? 0); }
    return peso ? Math.round(suma / peso) : 0;
  }, [tasks, tarifaDe, hoy]);

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

  const ordenarPor = (k: Orden['k']) => setOrden((o) => (o.k === k ? { k, desc: !o.desc } : { k, desc: false }));
  const ariaSort = (k: Orden['k']) => (orden.k === k ? (orden.desc ? 'descending' : 'ascending') : 'none') as 'ascending' | 'descending' | 'none';
  const Th = ({ k, children, num, dur }: { k?: Orden['k']; children: ReactNode; num?: boolean; dur?: boolean }) => (
    <th scope="col" className={[num && 'num', dur && 'col-dur'].filter(Boolean).join(' ') || undefined} aria-sort={k ? ariaSort(k) : undefined}>
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
          return <td key={c} className="num dt"><span className="chip-red" title={x.venceHace(n)}>{txt}<span className="sr">, {x.venceHace(n)}</span></span></td>;
        }
        return <td key={c} className="num dt">{txt}</td>;
      }
      case 'dur': { const d = duracionHabil(t, cal); return <td key={c} className="num col-dur">{d == null ? '—' : `${d} d`}</td>; }
      case 'pct': { const p = Math.round(t.progress ?? 0); return <td key={c} className="num"><span className={`pct${p === 0 ? ' zero' : ''}`}>{p}%</span></td>; }
      case 'hrs': {
        if (editando === t.id) return (
          <td key={c} className="num" onClick={(e) => e.stopPropagation()}>
            <EditorDeHoras t={t} antes={ci.reg} est={ci.est} es={es} x={x} hoy={hoy} cal={cal} idioma={idioma}
              onGuardar={(v) => guardarHoras(t, f.wbs, ci.reg, v)} onCancelar={() => { setEditando(null); enfocar(t.id); }} />
          </td>
        );
        const texto = <><b>{horasCortas(ci.reg, es)}</b><span className="est"> / {horasCortas(ci.est, es)} h</span></>;
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

  return (
    <section className={`lista-v6${vista.densidad === 'compacta' ? ' d32' : vista.densidad === 'comoda' ? ' d48' : ''}`} aria-label={x.tareasDe}>
      <style>{CSS_V6 + CSS_PANEL_V6 + CSS_RECURSOS_V6}</style>
      <div className="sumline">
        <div>
          {filtro === 'vencidas' && (
            <span className="fchip">{x.filtrando}<button type="button" aria-label={x.quitar} onClick={() => setFiltro(null)}>×</button></span>
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
        <div>
          <a href="#" onClick={(e) => {
            e.preventDefault();
            setPlegadas(algoAbierto ? new Set(plegables.map((f) => f.t.id)) : new Set());
            if (!algoAbierto) setAbiertasConHechas(new Set());
          }}>{algoAbierto ? x.plegar : x.desplegar}</a>
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
                if (c === 'st') return <th key={c} scope="col">{x.estado}</th>;
                if (c === 'hrs') return <th key={c} scope="col" className="num">{x.horas}</th>;
                const k = ({ s: 's', e: 'e', dur: 'dur', pct: 'pct', cost: 'cost' } as Record<string, Orden['k']>)[c];
                return <Th key={c} k={k} num dur={c === 'dur'}>{NOMBRE_COL(c, x, monedaCodigo)}</Th>;
              })}
              <th className="col-plus" ref={cajaCols}>
                <button type="button" className="col-plus-btn" aria-label={x.columnas} title={x.columnas} aria-expanded={menuCols}
                  onClick={() => setMenuCols((v) => !v)}>
                  +{ocultas.size > 0 && <span className="n">{ocultas.size}</span>}
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
                        {NOMBRE_COL(c, x, monedaCodigo)}
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
              return (
                <tr key={t.id} data-id={t.id} className={`${f.esFase ? 'grp' : padre ? 'par' : 'task'}${(enPanel ?? seleccionada) === t.id ? ' sel' : ''}`}
                  tabIndex={tabActiva ? 0 : -1} aria-level={nivel + 1} aria-expanded={padre ? abierta : undefined}
                  aria-selected={(enPanel ?? seleccionada) === t.id}
                  onClick={() => { setActiva(t.id); if (f.esFase && agrupar) alternar(f); else setEnPanel(t.id); }}
                  onFocus={() => setActiva(t.id)}
                  onKeyDown={(e) => alTeclear(e, f, i)}>
                  <td className="c1">
                    <div className="cell" style={{ paddingLeft: Math.min(nivel, 4) * 14 }}>
                      {padre ? (
                        <button type="button" className={`chev${abierta ? '' : ' closed'}`} tabIndex={-1} aria-hidden="true"
                          onClick={(e) => { e.stopPropagation(); alternar(f); }}>▾</button>
                      ) : <span className="ind" />}
                      <span className="wbs">{f.wbs}</span>
                      <span className="nm" title={ruta}>{t.name}</span>
                      {padre && <span className="cnt" title={x.hechas(ci.hechas, ci.hojas)}>{ci.hechas}/{ci.hojas}</span>}
                      {padre && ci.vencidas > 0 && <span className="od">{ci.vencidas} {ci.vencidas === 1 ? x.vencida : x.vencidas}</span>}
                    </div>
                  </td>
                  {columnas.map((c) => <Fragment key={c}>{celda(c, f)}</Fragment>)}
                  <td className="col-plus" />
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="c1"><div className="cell"><span className="ind" />{x.total}</div></td>
              {columnas.map((c) => {
                if (c === 's') return <td key={c} className="num dt">{fechasDelProyecto.ini ? fechaCorta(fechasDelProyecto.ini, idioma, hoy) : '—'}</td>;
                if (c === 'e') return <td key={c} className="num dt">{fechasDelProyecto.fin ? fechaCorta(fechasDelProyecto.fin, idioma, hoy) : '—'}</td>;
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
        <PanelDeTareaV6 fila={filaDelPanel} es={es} cal={cal} hoy={hoy} nombreProyecto={nombreProyecto}
          cifras={cifras.get(filaDelPanel.t.id)!} estados={estados} nombreEstado={x.st} porId={porId} tarifaDe={tarifaDe}
          onCerrar={() => { const id = filaDelPanel.t.id; setEnPanel(null); if (visibles.some((f) => f.t.id === id)) enfocar(id); }}
          onAbrirFicha={onAbrir} onIrA={irA} />
      )}
      </div>
      {pie}
      {/* el pie de la maqueta: Recursos a la izquierda (plegado) y la leyenda, si se pidió en Vista, a la derecha */}
      {(conCosto || vista.leyenda) && (
        <div className="vfoot">
          {conCosto && (
            <RecursosDeLaListaV6 tasks={tasks} es={es} tarifaDe={tarifaDe} tarifaDePersona={tarifaDePersona}
              monedaCodigo={monedaCodigo ?? undefined} costoAlTerminar={costoAlTerminar} onVerRecursos={onVerRecursos} />
          )}
          {vista.leyenda && (
            <div className="leyenda" role="note" aria-label={x.leyenda}>
              {(['todo', 'prog', 'blocked', 'done'] as EstadoV6[]).map((e) => (
                <span key={e}><span className={`schip ${e}`}><i aria-hidden="true" />{x.st[e]}</span></span>
              ))}
              <span><span className="chip-red">{fechaCorta(hoy, idioma, hoy)}</span> {x.lVenc}</span>
              <span><span className="mono">12 d</span> {x.lDur}</span>
            </div>
          )}
        </div>
      )}
      <div className="toast-zona" aria-live="polite">
        {pendiente && (
          <div className="toast">
            <span>{x.guardadas(pendiente.wbs, horasCortas(pendiente.ahora, es), horasCortas(pendiente.antes, es))}</span>
            <button type="button" onClick={deshacer}>{x.deshacer}</button>
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
const CSS_V6 = `
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
