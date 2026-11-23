/**
 * EL CALENDARIO (sólo Asakaa) · guía v4 de Yesid (12-nov) y su maqueta `asakaa-calendario.html`:
 *
 *   · Mes: semanas de lunes a domingo; las barras van sin borde y se distinguen por estado (o por fase o responsable,
 *     desde «Vista»); el avance es el tramo más intenso; el rótulo completo va en el primer tramo de la barra y en los que
 *     siguen de la semana anterior va el nombre atenuado. Hasta 4 carriles por semana, alto según el contenido (mínimo
 *     dos); si un día tiene más tareas se ven 3 y «+N más».
 *   · Semana: barras continuas de dos renglones, una por tarea, con las horas de cada día en la cabecera.
 *   · La franja de vencidas es una línea de texto (código y nombre, tope de 3, «+N más» o «Ver en la Lista»).
 *   · Los festivos se sombrean con su nombre; el pie dice «Calendario del proyecto: lunes a viernes, sin sus festivos
 *     (2 este mes) · Ver en la Ficha». Ningún texto nombra un país.
 *   · Filtros por responsable, estado y fase. «Horas y costo planeados por persona», en un pie plegado. La leyenda, en el «?».
 *   · Clic en una barra: su ficha («Abrir en la Lista»); arrastrarla, reprogramarla (si se puede), con «Deshacer».
 */
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import type { Calendario } from '../../Gantt/motorDeProgramacion';
import {
  diasDeRetraso, duracionHabil, estadoDe, estadoDeHoja, estaVencida, horasCortas, millones, tieneHijas, type EstadoV6,
} from '../../ListView/v6/reglasDeLaLista';
import { CSS_V6 } from '../../ListView/v6/ListaV6';
import { nombreDeNivel, riesgoMayor } from '../../ListView/v6/PuntoDeRiesgo';

export type EscalaCalendarioV6 = 'mes' | 'semana';
/** «Vista › Color de las barras» */
export type ColorDelCalendarioV4 = 'estado' | 'fase' | 'responsable';
/** El menú Vista del Calendario (lo lleva la app y lo recuerda). */
export interface VistaCalendarioV6 {
  escala: EscalaCalendarioV6;
  /** `null`: las completadas se ven en los periodos que ya pasaron y se ocultan en los demás */
  mostrarHechas: boolean | null;
  finesDeSemana: boolean;
  festivos: boolean;
  color: ColorDelCalendarioV4;
}
export const VISTA_CALENDARIO_V6_POR_DEFECTO: VistaCalendarioV6 = { escala: 'mes', mostrarHechas: null, finesDeSemana: true, festivos: true, color: 'estado' };

/** «Filtros» del Calendario: responsable, estado y fase. Las completadas no se filtran por estado (las gobierna «Vista»). */
export interface FiltrosDelCalendarioV4 {
  /** claves de responsable; '' = sin responsable */
  responsables: string[];
  estados: EstadoV6[];
  /** id de la tarea raíz de cada fase */
  fases: string[];
}
export const FILTROS_CALENDARIO_V4_VACIOS: FiltrosDelCalendarioV4 = { responsables: [], estados: [], fases: [] };

/* ── días como enteros (sin husos): el número de días desde 1970 de una fecha local ── */
const DIA = 864e5;
const dn = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA;
const deDn = (n: number) => { const u = new Date(n * DIA); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12); };
const claveDn = (n: number) => new Date(n * DIA).toISOString().slice(0, 10);
/** 0 = lunes … 6 = domingo */
const dowL = (n: number) => (new Date(n * DIA).getUTCDay() + 6) % 7;
const lunesDe = (n: number) => n - dowL(n);
/** La semana ISO (la del jueves de esa semana). */
export function semanaIsoDe(d: Date): number {
  const jueves = lunesDe(dn(d)) + 3;
  const anio = new Date(jueves * DIA).getUTCFullYear();
  const primerJueves = lunesDe(Date.UTC(anio, 0, 4) / DIA) + 3;
  return 1 + Math.round((jueves - primerJueves) / 7);
}

/** Si las completadas se ven: lo que diga «Vista», o (sin elegir) sólo en los periodos que ya pasaron. */
export function completadasALaVista(vista: VistaCalendarioV6, ancla: Date, hoy: Date = new Date()): boolean {
  if (vista.mostrarHechas !== null) return vista.mostrarHechas;
  const ultimo = vista.escala === 'mes' ? dn(new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0)) : lunesDe(dn(ancla)) + 6;
  return ultimo < dn(hoy);
}

/** Mover un periodo: un mes o una semana desde la fecha que lo ancla. */
export function pasoDelCalendarioV6(ancla: Date, escala: EscalaCalendarioV6, paso: number): Date {
  if (escala === 'mes') return new Date(ancla.getFullYear(), ancla.getMonth() + paso, 1, 12);
  return deDn(lunesDe(dn(ancla)) + paso * 7);
}

const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MES3 = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DIAS = { es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const DIAS_LARGOS = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const pl = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
const TXT = {
  es: {
    st: { todo: 'Por hacer', prog: 'En progreso', blocked: 'Bloqueada', done: 'Completada' } as Record<EstadoV6, string>,
    abiertas: (n: number, mes: boolean) => `${n} ${pl(n, 'tarea abierta', 'tareas abiertas')} ${mes ? 'en el mes' : 'en la semana'}`,
    hechas: (n: number, aLaVista: boolean) => `${n} ${aLaVista ? pl(n, 'completada a la vista', 'completadas a la vista') : pl(n, 'completada oculta', 'completadas ocultas')}`,
    mostrar: 'Mostrar', ocultar: 'Ocultar',
    filtrosActivos: (n: number) => `${n} ${pl(n, 'filtro activo', 'filtros activos')}`, quitar: 'Quitar',
    vencidasN: (n: number) => `${n} ${pl(n, 'vencida', 'vencidas')}`,
    vencidasAria: (n: number) => `Vencidas: ${n} ${pl(n, 'tarea vencida sin terminar', 'tareas vencidas sin terminar')}`,
    vencio: (f: string, n: number, quien: string) => `Venció el ${f}, hace ${n} ${pl(n, 'día hábil', 'días hábiles')} · ${quien}`,
    masVencidas: (n: number) => `+${n} más`, masVencidasAria: (n: number) => (n === 1 ? 'Ver la otra vencida en la Lista' : `Ver las otras ${n} vencidas en la Lista`),
    abreLaLista: (n: number) => (n === 1 ? 'Abre la Lista con la vencida' : `Abre la Lista con las ${n} vencidas`), verEnLaLista: 'Ver en la Lista',
    vencidaHace: (n: number) => `vencida hace ${n} ${pl(n, 'día hábil', 'días hábiles')}`, esperaA: 'espera a', esperaA2: 'Espera a',
    avanceN: (n: number) => `avance ${n}%`, conRiesgo: 'con riesgo abierto', sinResp: 'Sin responsable', sinRespMin: 'sin responsable',
    hito: 'Hito', hitoMin: 'hito', mas: (n: number) => `+${n} más`, verLasDelDia: (n: number, d: string) => `Ver las ${n} tareas del ${d}`,
    tareasDel: (d: string) => `Tareas del ${d}`, semanaN: (n: number) => `Semana ${n}`,
    horasDia: 'Horas planeadas este día: estimado de cada tarea ÷ sus días hábiles', alDia: (h: string) => `${h} h al día`,
    alDiaAria: (h: string) => `${h} horas planeadas al día`,
    festivoDelCal: 'Festivo del calendario del proyecto', festivo: 'festivo', hoy: 'hoy',
    semanaVacia: (filtros: boolean, hechas: boolean) => (filtros ? 'Ninguna tarea de esta semana coincide con los filtros.' : hechas ? 'Sin tareas esta semana.' : 'Sin tareas abiertas esta semana.'),
    cerrarFicha: 'Cerrar ficha', fechas: 'Fechas', dur: 'Duración', dias: (n: number) => `${n} ${pl(n, 'día hábil', 'días hábiles')}`,
    avance: 'Avance', resp: 'Responsable', horas: 'Horas', registradas: 'registradas', dep: 'Depende de', riesgo: 'Riesgo',
    abrirEnLista: 'Abrir en la Lista', abrirFicha: 'Abrir ficha completa', calendario: 'Calendario',
    reprogramada: (n: string, a: string, b: string) => `«${n}»: ${a} → ${b}.`, deshacer: 'Deshacer', deshecho: (n: string) => `Cambio deshecho: «${n}» vuelve a sus fechas.`,
    recursos: 'Horas y costo planeados por persona',
    personas: (n: number, mes: boolean, h: string) => `· ${n} ${pl(n, 'persona', 'personas')} ${mes ? 'este mes' : 'esta semana'} · ${h} h`,
    persona: 'Persona', tareas: 'Tareas', horasPlan: 'Horas planeadas', costoPlan: 'Costo planeado', sinPeriodo: 'Sin tareas en el periodo', total: 'Total',
    notaRecursos: 'Horas del plan que caen en el periodo (el estimado de cada tarea repartido en sus días hábiles), con las completadas. El costo usa la tarifa de cada persona; lo ven los administradores, Finanzas y el gerente del proyecto.',
    verRecursos: 'Ver la carga de cada persona en Recursos',
    candado: 'Costo por persona: visible para gerente y Finanzas',
    candadoTip: 'La tarifa y el costo de cada persona los ven los administradores, Finanzas y el gerente del proyecto. Usted ve las horas.',
    noEvaluable: 'No evaluable',
    calDelProyecto: 'Calendario del proyecto:', sinFestivos: (n: number, mes: boolean) => `sin sus festivos (${n ? `${n} ${mes ? 'este mes' : 'esta semana'}` : `ninguno ${mes ? 'este mes' : 'esta semana'}`})`,
    verEnLaFicha: 'Ver en la Ficha', fichaTip: 'Los días hábiles y los festivos se cambian en la ficha del proyecto.',
    diasLab: (l: boolean[]) => {
      const n = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
      if (l.every(Boolean)) return 'todos los días';
      if (l.slice(0, 5).every(Boolean) && !l[5] && !l[6]) return 'lunes a viernes';
      if (l.slice(0, 6).every(Boolean) && !l[6]) return 'lunes a sábado';
      const s = n.filter((_, i) => l[i]);
      return s.length > 1 ? `${s.slice(0, -1).join(', ')} y ${s[s.length - 1]}` : (s[0] ?? '');
    },
    comoLeer: 'Cómo leer el calendario',
    ayuda: [
      'El tramo más intenso de una barra es su avance.',
      'Fecha de fin vencida y tarea sin terminar.',
      'Hito.',
      'Día no laborable: fin de semana o festivo del calendario del proyecto.',
      'Rótulo atenuado: la barra continúa de la semana anterior.',
      'Horas al día: el estimado de la tarea entre sus días hábiles.',
    ],
    ayudaTeclado: 'Clic o Enter en una barra: su ficha. Arrastrar una barra: cambiar sus fechas.',
  },
  en: {
    st: { todo: 'To do', prog: 'In progress', blocked: 'Blocked', done: 'Completed' } as Record<EstadoV6, string>,
    abiertas: (n: number, mes: boolean) => `${n} open ${pl(n, 'task', 'tasks')} ${mes ? 'this month' : 'this week'}`,
    hechas: (n: number, aLaVista: boolean) => `${n} completed ${aLaVista ? 'shown' : 'hidden'}`,
    mostrar: 'Show', ocultar: 'Hide',
    filtrosActivos: (n: number) => `${n} active ${pl(n, 'filter', 'filters')}`, quitar: 'Clear',
    vencidasN: (n: number) => `${n} overdue`,
    vencidasAria: (n: number) => `Overdue: ${n} unfinished ${pl(n, 'task', 'tasks')} past due`,
    vencio: (f: string, n: number, quien: string) => `Due ${f}, ${n} working ${pl(n, 'day', 'days')} ago · ${quien}`,
    masVencidas: (n: number) => `+${n} more`, masVencidasAria: (n: number) => `See the other ${n} overdue tasks in the List`,
    abreLaLista: (n: number) => `Opens the List with the ${n} overdue tasks`, verEnLaLista: 'See in the List',
    vencidaHace: (n: number) => `overdue by ${n} working ${pl(n, 'day', 'days')}`, esperaA: 'waiting for', esperaA2: 'Waiting for',
    avanceN: (n: number) => `progress ${n}%`, conRiesgo: 'with an open risk', sinResp: 'No owner', sinRespMin: 'no owner',
    hito: 'Milestone', hitoMin: 'milestone', mas: (n: number) => `+${n} more`, verLasDelDia: (n: number, d: string) => `See the ${n} tasks on ${d}`,
    tareasDel: (d: string) => `Tasks on ${d}`, semanaN: (n: number) => `Week ${n}`,
    horasDia: 'Hours planned this day: each task’s estimate ÷ its working days', alDia: (h: string) => `${h} h a day`,
    alDiaAria: (h: string) => `${h} hours planned a day`,
    festivoDelCal: 'Holiday in the project calendar', festivo: 'holiday', hoy: 'today',
    semanaVacia: (filtros: boolean, hechas: boolean) => (filtros ? 'No task this week matches the filters.' : hechas ? 'No tasks this week.' : 'No open tasks this week.'),
    cerrarFicha: 'Close card', fechas: 'Dates', dur: 'Duration', dias: (n: number) => `${n} working ${pl(n, 'day', 'days')}`,
    avance: 'Progress', resp: 'Owner', horas: 'Hours', registradas: 'logged', dep: 'Depends on', riesgo: 'Risk',
    abrirEnLista: 'Open in the List', abrirFicha: 'Open full task', calendario: 'Calendar',
    reprogramada: (n: string, a: string, b: string) => `“${n}”: ${a} → ${b}.`, deshacer: 'Undo', deshecho: (n: string) => `Change undone: “${n}” is back on its dates.`,
    recursos: 'Planned hours and cost per person',
    personas: (n: number, mes: boolean, h: string) => `· ${n} ${pl(n, 'person', 'people')} ${mes ? 'this month' : 'this week'} · ${h} h`,
    persona: 'Person', tareas: 'Tasks', horasPlan: 'Planned hours', costoPlan: 'Planned cost', sinPeriodo: 'No tasks in the period', total: 'Total',
    notaRecursos: 'Planned hours that fall in the period (each task’s estimate spread over its working days), completed tasks included. The cost uses each person’s rate; admins, Finance and the project manager see it.',
    verRecursos: 'See each person’s load in Resources',
    candado: 'Cost per person: visible to the manager and Finance',
    candadoTip: 'Admins, Finance and the project manager see each person’s rate and cost. You see the hours.',
    noEvaluable: 'Not assessable',
    calDelProyecto: 'Project calendar:', sinFestivos: (n: number, mes: boolean) => `without its holidays (${n ? `${n} ${mes ? 'this month' : 'this week'}` : `none ${mes ? 'this month' : 'this week'}`})`,
    verEnLaFicha: 'See in the project sheet', fichaTip: 'Working days and holidays are changed in the project sheet.',
    diasLab: (l: boolean[]) => {
      const n = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (l.every(Boolean)) return 'every day';
      if (l.slice(0, 5).every(Boolean) && !l[5] && !l[6]) return 'Monday to Friday';
      if (l.slice(0, 6).every(Boolean) && !l[6]) return 'Monday to Saturday';
      const s = n.filter((_, i) => l[i]);
      return s.length > 1 ? `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}` : (s[0] ?? '');
    },
    comoLeer: 'How to read the calendar',
    ayuda: [
      'The darker part of a bar is its progress.',
      'Past end date and unfinished task.',
      'Milestone.',
      'Non-working day: weekend or holiday in the project calendar.',
      'Dimmed label: the bar continues from the previous week.',
      'Hours a day: the task’s estimate over its working days.',
    ],
    ayudaTeclado: 'Click or Enter on a bar: its card. Drag a bar: change its dates.',
  },
};

type Persona = { id?: string; name?: string; initials?: string };
const responsableDe = (t: Task) => (t.assignees ?? [])[0] as Persona | undefined;
const claveDe = (p?: Persona) => (p ? p.id || p.name || '?' : '');
const iniciales = (p: Persona) => p.initials || (p.name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

/** Las fases del calendario: las tareas raíz, en orden («Fase 3 · Desarrollo»). */
export function fasesDelCalendario(tasks: Task[]): { clave: string; nombre: string; corto: string; n: number }[] {
  return tasks.map((t, i) => ({
    clave: t.id, n: i + 1, corto: t.name,
    nombre: /^fase\b/i.test(t.name.trim()) ? t.name : `Fase ${i + 1} · ${t.name}`,
  }));
}

interface Hoja {
  t: Task; wbs: string; s: number; e: number; estado: EstadoV6; od: boolean;
  fase: string; nFase: number; uPersona: number; crumb: string; quien: string;
}
interface Aviso { texto: string; deshacer?: () => void }

export interface CalendarioV6Props {
  tasks: Task[];
  es: boolean;
  cal: Calendario;
  festivos?: { date: string; name: string }[];
  /** los días laborables del calendario del proyecto, de domingo (0) a sábado (6); por omisión, lunes a viernes */
  diasLaborables?: boolean[];
  /** una fecha del periodo a la vista (la lleva la app) */
  ancla: Date;
  onAncla: (d: Date) => void;
  vista: VistaCalendarioV6;
  onVista: (v: VistaCalendarioV6) => void;
  filtros: FiltrosDelCalendarioV4;
  onFiltros: (f: FiltrosDelCalendarioV4) => void;
  tarifaDe: (hoja: Task) => number;
  /** quien mira ve dinero (el costo planeado por persona); si no, el candado «visible para gerente y Finanzas» */
  conCosto?: boolean;
  /** las tarifas no se pueden comparar: el costo dice «No evaluable» con este motivo */
  noEvaluable?: string | null;
  monedaCodigo?: string;
  nombreProyecto?: string;
  /** la ficha: «Abrir en la Lista» (la Lista abre su panel con #t=<wbs>) */
  onAbrirEnLista?: (t: Task, wbs: string) => void;
  /** la ficha, sin Lista: «Abrir ficha completa» */
  onAbrir?: (t: Task) => void;
  /** la franja de vencidas: «Ver en la Lista» / «+N más» (la Lista con #vencidas) */
  onVerVencidas?: () => void;
  /** el pie: «Ver en la Ficha» (su calendario) */
  onVerCalendarioDelProyecto?: () => void;
  /** el pie de recursos: «Ver la carga de cada persona en Recursos» */
  onVerRecursos?: () => void;
  onVerRiesgo?: (id: string) => void;
  /** reprogramar arrastrando una barra; `false` si no se pudo */
  onReprogramar?: (t: Task, inicio: Date, fin: Date) => boolean | void | Promise<boolean | void>;
  hoy?: Date;
}

const CAP = 4;
const TOPE_VENCIDAS = 3;

export function CalendarioV6({
  tasks, es, cal, festivos = [], diasLaborables, ancla, onAncla, vista, onVista, filtros, onFiltros, tarifaDe, conCosto = true,
  noEvaluable, monedaCodigo, onAbrirEnLista, onAbrir, onVerVencidas, onVerCalendarioDelProyecto, onVerRecursos, onVerRiesgo,
  onReprogramar, hoy: hoyProp,
}: CalendarioV6Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  const hoy = useMemo(() => hoyProp ?? new Date(), [hoyProp]);
  const hoyN = dn(hoy);
  const festivoDe = useMemo(() => new Map(festivos.map((f) => [f.date, f.name])), [festivos]);
  /* laborables de lunes (0) a domingo (6) */
  const lab = useMemo(() => {
    const d = diasLaborables && diasLaborables.length === 7 ? diasLaborables : [false, true, true, true, true, true, false];
    return [d[1], d[2], d[3], d[4], d[5], d[6], d[0]].map(Boolean);
  }, [diasLaborables]);
  const habil = (n: number) => cal.esHabil(deDn(n));
  const fd = (n: number) => {
    const f = deDn(n);
    const anio = f.getFullYear() !== hoy.getFullYear() ? ` ${f.getFullYear()}` : '';
    return es ? `${f.getDate()} ${MES3.es[f.getMonth()]}${anio}` : `${MES3.en[f.getMonth()]} ${f.getDate()}${anio}`;
  };
  const rango = (a: number, b: number) => {
    if (a === b) return fd(a);
    const p = deDn(a); const q = deDn(b);
    if (p.getMonth() === q.getMonth() && p.getFullYear() === q.getFullYear()) {
      return es ? `${p.getDate()}–${fd(b)}` : `${MES3.en[p.getMonth()]} ${p.getDate()}–${q.getDate()}${q.getFullYear() !== hoy.getFullYear() ? ` ${q.getFullYear()}` : ''}`;
    }
    return `${fd(a)}–${fd(b)}`;
  };

  /* las fases (tareas raíz) y las personas, con su número para el color */
  const fases = useMemo(() => fasesDelCalendario(tasks), [tasks]);
  const { hojas, porId, personas } = useMemo(() => {
    const hojas: Hoja[] = [];
    const porId = new Map<string, { t: Task; wbs: string }>();
    const personas: { clave: string; p: Persona }[] = [];
    const nPersona = (p?: Persona) => {
      if (!p) return 0;
      const k = claveDe(p);
      let i = personas.findIndex((q) => q.clave === k);
      if (i < 0) { personas.push({ clave: k, p }); i = personas.length - 1; }
      return i + 1;
    };
    const recorrer = (ts: Task[], prefijo: string, raiz: { id: string; n: number; nombre: string } | null, ruta: string[]) => {
      ts.forEach((t, i) => {
        const wbs = (t as { wbsCode?: string }).wbsCode || (prefijo ? `${prefijo}.${i + 1}` : String(i + 1));
        porId.set(t.id, { t, wbs });
        const fase = raiz ?? { id: t.id, n: i + 1, nombre: fases[i]?.nombre ?? t.name };
        if (tieneHijas(t)) { recorrer(t.subtasks!, wbs, fase, raiz ? [...ruta, t.name] : []); return; }
        const ini = t.startDate ?? t.endDate; const fin = t.endDate ?? t.startDate;
        if (!ini || !fin) return;
        const s = dn(new Date(ini)); const e = Math.max(s, dn(new Date(fin)));
        const p = responsableDe(t);
        hojas.push({
          t, wbs, s, e, estado: estadoDeHoja(t), od: estaVencida(t, hoy), fase: fase.id, nFase: fase.n, uPersona: nPersona(p),
          crumb: [fase.nombre, ...ruta].join(' › '), quien: p?.name ?? '',
        });
      });
    };
    recorrer(tasks, '', null, []);
    return { hojas, porId, personas };
  }, [tasks, fases, hoy]);

  /* filtros: responsable y fase filtran todo; el estado, sólo las abiertas */
  const pasaQF = (h: Hoja) => (!filtros.responsables.length || filtros.responsables.includes(claveDe(responsableDe(h.t))))
    && (!filtros.fases.length || filtros.fases.includes(h.fase));
  const pasa = (h: Hoja) => pasaQF(h) && (!filtros.estados.length || h.estado === 'done' || filtros.estados.includes(h.estado));
  const nFiltros = (filtros.responsables.length ? 1 : 0) + (filtros.estados.length ? 1 : 0) + (filtros.fases.length ? 1 : 0);

  /* el periodo */
  const mes = vista.escala === 'mes';
  const anclaN = dn(ancla);
  const primero = mes ? dn(new Date(ancla.getFullYear(), ancla.getMonth(), 1)) : lunesDe(anclaN);
  const ultimo = mes ? dn(new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0)) : lunesDe(anclaN) + 6;
  const desde = lunesDe(primero);
  const hasta = lunesDe(ultimo) + 6;
  const semanas: number[] = [];
  for (let w = desde; w <= hasta; w += 7) semanas.push(w);
  const verHechas = completadasALaVista(vista, ancla, hoy);
  const aLaVista = hojas.filter((h) => pasa(h) && (h.estado !== 'done' || verHechas));

  /* el peso de cada columna (para el relleno del avance): fines de semana a media columna en «Semana» */
  const peso = (i: number) => (i < 5 ? 1 : !vista.finesDeSemana ? 0 : mes || lab[i] ? 1 : 0.5);
  const columnas = (semana: boolean) => Array.from({ length: 7 }, (_, i) => {
    if (i < 5) return 'minmax(0,1fr)';
    if (!vista.finesDeSemana) return '0px';
    return !semana || lab[i] ? 'minmax(0,1fr)' : 'minmax(0,.5fr)';
  }).join(' ');
  const habilesEntre = (a: number, b: number) => { let c = 0; for (let d = a; d <= b; d += 1) if (habil(d)) c += 1; return c; };
  const durDe = (h: Hoja) => (h.t.isMilestone ? 0 : (duracionHabil(h.t, cal) ?? 0));
  const estDe = (h: Hoja) => ((h.t as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
  const hdDe = (h: Hoja) => { const d = durDe(h); return d ? estDe(h) / d : 0; };
  const relleno = (h: Hoja, a: number, i0: number, i1: number) => {
    const pct = Math.round(h.t.progress ?? 0);
    const dur = durDe(h);
    if (h.estado !== 'prog' || !pct || !dur) return 0;
    const necesita = (dur * pct) / 100;
    let hechos = habilesEntre(h.s, a + i0 - 1); let c = 0; let tot = 0;
    for (let i = i0; i <= i1; i += 1) {
      const k = peso(i); tot += k;
      if (hechos >= necesita) continue;
      if (habil(a + i)) { if (hechos + 1 <= necesita) { c += k; hechos += 1; } else { c += (necesita - hechos) * k; hechos = necesita; } } else c += k;
    }
    return c > 0 && tot > 0 ? c / tot : 0;
  };

  /* tramos de una semana con su carril (las completadas al final; luego vencidas, bloqueadas, en progreso, por hacer) */
  const prio = (h: Hoja) => (h.od ? 0 : { blocked: 1, prog: 2, todo: 3, done: 4 }[h.estado]);
  const tramos = (a: number, ts: Hoja[]) => {
    const b = a + 6;
    const out = ts.filter((h) => !(h.e < a || h.s > b)).map((h) => ({ h, i0: Math.max(h.s, a) - a, i1: Math.min(h.e, b) - a, cl: h.s < a, cr: h.e > b, lane: 0 }));
    out.sort((p, q) => (Number(p.h.estado === 'done') - Number(q.h.estado === 'done')) || prio(p.h) - prio(q.h) || p.i0 - q.i0
      || (q.i1 - q.i0) - (p.i1 - p.i0) || p.h.wbs.localeCompare(q.h.wbs, undefined, { numeric: true }));
    const occ: Record<number, true>[] = [];
    for (const g of out) {
      for (let l = 0; ; l += 1) {
        occ[l] ??= {};
        let libre = true;
        for (let i = g.i0; i <= g.i1; i += 1) if (occ[l]![i]) { libre = false; break; }
        if (libre) { for (let i = g.i0; i <= g.i1; i += 1) occ[l]![i] = true; g.lane = l; break; }
      }
    }
    return out;
  };

  /* fichas y listas que flotan */
  const raiz = useRef<HTMLElement>(null);
  const [ficha, setFicha] = useState<{ id: string; x: number; y: number } | null>(null);
  const [lista, setLista] = useState<{ d: number; ids: string[]; x: number; y: number } | null>(null);
  const [ayuda, setAyuda] = useState(false);
  const [resaltada, setResaltada] = useState<string | null>(null);
  const abridor = useRef<HTMLElement | null>(null);
  const junto = (el: HTMLElement, cx?: number | null) => {
    const r = el.getBoundingClientRect(); const c = raiz.current?.getBoundingClientRect();
    return { x: (cx != null ? cx - 24 : r.left) - (c?.left ?? 0), y: r.bottom - (c?.top ?? 0) + 6 };
  };
  const abrirFicha = (id: string, el: HTMLElement, cx?: number | null) => {
    const j = junto(el, cx);
    abridor.current = el;
    setLista(null);
    setFicha({ id, x: j.x, y: j.y });
  };
  const cerrar = (volver = false) => { setFicha(null); setLista(null); if (volver) abridor.current?.focus(); };
  useEffect(() => {
    if (!ficha && !lista && !ayuda) return;
    const fuera = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      if (!t.closest?.('.cv-ficha, .cv-pop, .cv-ayuda, .cv-ayuda-btn, .cb, .wb, .cmore, .lr-it')) { cerrar(); setAyuda(false); }
    };
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); if (ayuda) setAyuda(false); else cerrar(true); } };
    const mover = () => cerrar();
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', mover);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); window.removeEventListener('resize', mover); };
  }, [ficha, lista, ayuda]);
  useEffect(() => { cerrar(); }, [primero, vista.escala]); // eslint-disable-line react-hooks/exhaustive-deps

  /* guía v4 · #t=3.4 abre el mes de la tarea y su ficha */
  const pendiente = useRef<string | null>(null);
  const conHojas = hojas.length > 0;
  useEffect(() => {
    if (!conHojas || typeof window === 'undefined') return;
    const leer = () => {
      const m = /^#t=([\d.]+)$/.exec(decodeURIComponent(window.location.hash));
      const h = m ? hojas.find((k) => k.wbs === m[1]) : undefined;
      if (!h) return;
      const dia = h.s <= hoyN && hoyN <= h.e ? hoyN : h.e < hoyN ? h.e : h.s;
      if (vista.escala !== 'mes' || (h.estado === 'done' && !vista.mostrarHechas)) onVista({ ...vista, escala: 'mes', mostrarHechas: h.estado === 'done' ? true : vista.mostrarHechas });
      if (nFiltros) onFiltros(FILTROS_CALENDARIO_V4_VACIOS);
      onAncla(deDn(dia));
      pendiente.current = h.t.id;
    };
    leer();
    window.addEventListener('hashchange', leer);
    return () => window.removeEventListener('hashchange', leer);
  }, [conHojas]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = pendiente.current;
    if (!id) return;
    const el = [...(raiz.current?.querySelectorAll<HTMLElement>('.cb') ?? [])].find((b) => b.dataset.id === id);
    if (!el) return;
    pendiente.current = null;
    el.scrollIntoView?.({ block: 'center' });
    abrirFicha(id, el);
  });

  /* avisos */
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = (a: Aviso) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso(a);
    temporizador.current = setTimeout(() => setAviso(null), a.deshacer ? 9000 : 6000);
  };
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  /* reprogramar arrastrando: el día bajo el puntero (por las celdas, que pueden medir distinto) */
  const arrastre = useRef<{ h: Hoja; dia: number } | null>(null);
  const diaBajo = (ev: DragEvent, semana: number, el: HTMLElement) => {
    const celdas = [...el.querySelectorAll<HTMLElement>(':scope > .day, :scope > .wcol')];
    let mejor = 0; let dist = Infinity;
    celdas.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      if (r.width === 0) return;
      const d = ev.clientX < r.left ? r.left - ev.clientX : ev.clientX > r.right ? ev.clientX - r.right : 0;
      if (d < dist) { dist = d; mejor = i; }
    });
    return semana + mejor;
  };
  const reprogramar = async (h: Hoja, delta: number) => {
    if (!onReprogramar || !delta) return;
    const antes = rango(h.s, h.e); const despues = rango(h.s + delta, h.e + delta);
    const ok = await onReprogramar(h.t, deDn(h.s + delta), deDn(h.e + delta));
    if (ok === false) return;
    avisar({
      texto: x.reprogramada(h.t.name, antes, despues),
      deshacer: () => { void Promise.resolve(onReprogramar(h.t, deDn(h.s), deDn(h.e))).then((b) => { if (b !== false) avisar({ texto: x.deshecho(h.t.name) }); }); },
    });
  };
  const arrastrable = (h: Hoja, semana: number) => ({
    draggable: !!onReprogramar,
    onDragStart: (ev: DragEvent<HTMLButtonElement>) => {
      const cont = (ev.currentTarget as HTMLElement).parentElement;
      if (!cont) return;
      ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', h.t.id);
      arrastre.current = { h, dia: diaBajo(ev, semana, cont) };
    },
    onDragEnd: () => { arrastre.current = null; },
  });
  const soltar = (semana: number) => ({
    onDragOver: (ev: DragEvent<HTMLDivElement>) => { if (arrastre.current) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } },
    onDrop: (ev: DragEvent<HTMLDivElement>) => {
      const a = arrastre.current;
      arrastre.current = null;
      if (!a) return;
      ev.preventDefault();
      void reprogramar(a.h, diaBajo(ev, semana, ev.currentTarget) - a.dia);
    },
  });

  /* ── piezas ── */
  const icono = (e: EstadoV6) => <span className={`schip${e === 'todo' ? '' : ` ${e}`}`} aria-hidden="true"><i /></span>;
  const avatar = (p?: Persona) => (p
    ? <span className="avatar" aria-hidden="true">{iniciales(p)}</span>
    : <span className="avatar none" aria-hidden="true">+</span>);
  const esperaDe = (h: Hoja) => {
    if (h.estado !== 'blocked') return undefined;
    const deps = (h.t.dependencies ?? []).map((d) => porId.get(d)).filter((d): d is { t: Task; wbs: string } => !!d);
    return deps.find((d) => estadoDe(d.t) !== 'done') ?? deps[0];
  };
  const etiqueta = (h: Hoja) => {
    const p = [`${h.wbs} ${h.t.name}`, h.t.isMilestone ? `${x.hitoMin}, ${fd(h.e)}` : rango(h.s, h.e), x.st[h.estado]];
    if (h.od) p.push(x.vencidaHace(diasDeRetraso(h.t, hoy, cal)));
    const espera = esperaDe(h);
    if (espera) p.push(`${x.esperaA} ${espera.wbs}`);
    if (h.estado === 'prog') p.push(x.avanceN(Math.round(h.t.progress ?? 0)));
    if (h.t.riesgos?.length) p.push(x.conRiesgo);
    p.push(h.quien || x.sinRespMin);
    return p.join(', ');
  };
  const clases = (h: Hoja) => `s-${h.estado} p${((h.nFase - 1) % 5) + 1} u${h.uPersona ? ((h.uPersona - 1) % 5) + 1 : 0}${h.t.isMilestone ? ' ms' : ''}${h.od ? ' od' : ''}`
    + `${ficha?.id === h.t.id ? ' sel' : ''}${resaltada === h.t.id ? ' hl' : ''}`;
  const avance = (h: Hoja, a: number, i0: number, i1: number) => {
    const r = relleno(h, a, i0, i1);
    return r > 0 ? <span className="pf" style={{ width: `${(r * 100).toFixed(1)}%` }} aria-hidden="true" /> : null;
  };
  const sufijo = (h: Hoja) => (h.od ? <span className="chip-red" aria-hidden="true">{fd(h.e)}</span>
    : h.estado === 'prog' ? <span className="pct num">{Math.round(h.t.progress ?? 0)}%</span> : null);
  const pulsar = (h: Hoja) => (ev: React.MouseEvent<HTMLButtonElement>) => abrirFicha(h.t.id, ev.currentTarget, ev.detail ? ev.clientX : null);

  const diaCelda = (d: number, i: number, enMes: boolean) => {
    const f = deDn(d);
    const fuera = enMes && (d < primero || d > ultimo);
    const fest = festivoDe.get(claveDn(d));
    const clase = `day${fuera ? ' other' : ''}${!lab[i] ? ' we' : ''}${fest ? ' hol' : ''}${d === hoyN ? ' today' : ''}`;
    return (
      <div key={d} className={clase} style={{ gridColumn: i + 1 }}>
        <span className="n" aria-hidden="true">{f.getDate()}{f.getDate() === 1 ? ` ${MES3[idioma][f.getMonth()]}` : ''}</span>
        {fest && vista.festivos && <span className="hn" aria-hidden="true" title={x.festivoDelCal}>{fest}</span>}
        <span className="sr">{`${DIAS_LARGOS[idioma][i]} ${f.getDate()} ${es ? 'de ' : ''}${MESES[idioma][f.getMonth()]}`}{d === hoyN ? `, ${x.hoy}` : ''}{fest ? `, ${x.festivo}: ${fest}` : ''}</span>
      </div>
    );
  };

  /* ── Mes ── */
  const vistos = new Set<string>();
  const semanaDelMes = (a: number) => {
    const G = tramos(a, aLaVista);
    const cnt = [0, 0, 0, 0, 0, 0, 0];
    for (const g of G) for (let i = g.i0; i <= g.i1; i += 1) cnt[i]! += 1;
    const lim = cnt.map((c) => (c > CAP ? CAP - 1 : CAP));
    const occ: Record<number, true>[] = Array.from({ length: CAP }, () => ({}));
    const en = G.map(() => ({} as Record<number, number>));
    G.forEach((g, k) => { for (let i = g.i0; i <= g.i1; i += 1) if (g.lane < lim[i]! && !occ[g.lane]![i]) { occ[g.lane]![i] = true; en[k]![i] = g.lane; } });
    G.forEach((g, k) => {
      for (let i = g.i0; i <= g.i1; i += 1) {
        if (en[k]![i] !== undefined) continue;
        const pv = en[k]![i - 1];
        if (pv !== undefined && pv < lim[i]! && !occ[pv]![i]) { occ[pv]![i] = true; en[k]![i] = pv; continue; }
        const nx = en[k]![i + 1];
        if (nx !== undefined && nx < lim[i]! && !occ[nx]![i]) { occ[nx]![i] = true; en[k]![i] = nx; continue; }
        for (let l = 0; l < lim[i]!; l += 1) if (!occ[l]![i]) { occ[l]![i] = true; en[k]![i] = l; break; }
      }
    });
    let usados = 0;
    const mostradas = [0, 0, 0, 0, 0, 0, 0];
    const barras: ReactNode[] = [];
    G.forEach((g, k) => {
      const { h } = g;
      let run: [number, number, number] | null = null;
      const volcar = () => {
        if (!run) return;
        const [lane, i0, i1] = run;
        usados = Math.max(usados, lane + 1);
        const rotulo = !vistos.has(h.t.id) || !!h.t.isMilestone;
        vistos.add(h.t.id);
        const cl = g.cl || i0 > g.i0; const cr = g.cr || i1 < g.i1;
        barras.push(
          <button key={`${h.t.id}-${i0}`} type="button" className={`cb ${clases(h)}${cl ? ' cl' : ''}${cr ? ' cr' : ''}${rotulo ? '' : ' cont'}`}
            style={{ gridColumn: `${i0 + 1} / ${i1 + 2}`, gridRow: lane + 2 }} data-id={h.t.id} aria-label={etiqueta(h)}
            title={rotulo ? undefined : `${h.wbs} ${h.t.name} · ${rango(h.s, h.e)}`} {...arrastrable(h, a)} onClick={pulsar(h)}>
            {h.t.isMilestone
              ? <><i className="diamond" aria-hidden="true" /><span className="nm">{h.t.name}</span></>
              : <>{avance(h, a, i0, i1)}{rotulo && icono(h.estado)}<span className="w">{h.wbs}</span><span className="nm">{h.t.name}</span>{rotulo && sufijo(h)}</>}
          </button>,
        );
        run = null;
      };
      for (let i = g.i0; i <= g.i1; i += 1) {
        const ln = en[k]![i];
        if (ln === undefined) { volcar(); continue; }
        mostradas[i]! += 1;
        if (run && run[0] === ln && run[2] === i - 1) run[2] = i;
        else { volcar(); run = [ln, i, i]; }
      }
      volcar();
    });
    const mas: ReactNode[] = [];
    for (let i = 0; i < 7; i += 1) {
      if (cnt[i]! <= mostradas[i]!) continue;
      usados = CAP;
      const d = a + i;
      const ids = G.filter((g) => g.i0 <= i && i <= g.i1).map((g) => g.h.t.id);
      mas.push(
        <button key={`m${d}`} type="button" className="cmore" style={{ gridColumn: i + 1, gridRow: CAP + 1 }}
          aria-label={x.verLasDelDia(ids.length, fd(d))}
          onClick={(ev) => { const j = junto(ev.currentTarget); abridor.current = ev.currentTarget; setFicha(null); setLista({ d, ids, x: j.x, y: j.y }); }}>
          {x.mas(cnt[i]! - mostradas[i]!)}
        </button>,
      );
    }
    return (
      <div key={a} className="wk" style={{ gridTemplateColumns: columnas(false), gridTemplateRows: `25px repeat(${Math.max(2, usados)},22px) 7px` }} {...soltar(a)}>
        {Array.from({ length: 7 }, (_, i) => diaCelda(a + i, i, true))}
        {barras}
        {mas}
      </div>
    );
  };

  /* ── Semana ── */
  const laSemana = () => {
    const a = primero;
    const G = tramos(a, aLaVista);
    const filas = Math.max(3, G.reduce((m, g) => Math.max(m, g.lane + 1), 0));
    return (
      <div className="wv">
        <div className="wv-h" style={{ gridTemplateColumns: columnas(true) }}>
          {Array.from({ length: 7 }, (_, i) => {
            const n = a + i; const f = deDn(n); const fest = festivoDe.get(claveDn(n));
            const tot = habil(n) ? G.reduce((s, g) => (g.i0 <= i && i <= g.i1 ? s + hdDe(g.h) : s), 0) : 0;
            return (
              <div key={n} className={`wh${!lab[i] ? ' we' : ''}${fest ? ' hol' : ''}${n === hoyN ? ' today' : ''}`}>
                <span className="dn" aria-hidden="true">{DIAS[idioma][i]}</span>
                <span className="n" aria-hidden="true">{f.getDate()}</span>
                <span className="sr">{`${DIAS_LARGOS[idioma][i]} ${f.getDate()} ${es ? 'de ' : ''}${MESES[idioma][f.getMonth()]}`}{n === hoyN ? `, ${x.hoy}` : ''}{fest ? `, ${x.festivo}: ${fest}` : ''}</span>
                {fest && vista.festivos && <span className="hn" title={x.festivoDelCal}>{fest}</span>}
                {tot > 0 && <span className="tot" title={x.horasDia}>{horasCortas(tot, es)} h</span>}
              </div>
            );
          })}
        </div>
        <div className="wv-b" style={{ gridTemplateColumns: columnas(true), gridTemplateRows: `6px repeat(${filas},52px) 8px` }} {...soltar(a)}>
          {Array.from({ length: 7 }, (_, i) => {
            const n = a + i; const fest = festivoDe.get(claveDn(n));
            return <div key={n} className={`wcol${!lab[i] ? ' we' : ''}${fest ? ' hol' : ''}`} style={{ gridColumn: i + 1 }} />;
          })}
          {G.length ? G.map((g) => {
            const { h } = g;
            const p = responsableDe(h.t);
            const espera = esperaDe(h);
            return (
              <button key={h.t.id} type="button" className={`wb ${clases(h)}${g.cl ? ' cl' : ''}${g.cr ? ' cr' : ''}${g.i0 === g.i1 ? ' one' : ''}`}
                style={{ gridColumn: `${g.i0 + 1} / ${g.i1 + 2}`, gridRow: g.lane + 2 }} data-id={h.t.id}
                aria-label={`${etiqueta(h)}${h.t.isMilestone ? '' : `, ${x.alDiaAria(horasCortas(hdDe(h), es))}`}`} {...arrastrable(h, a)} onClick={pulsar(h)}>
                {avance(h, a, g.i0, g.i1)}
                {h.t.isMilestone ? <>
                  <span className="l1"><i className="diamond" aria-hidden="true" /><span className="nm">{h.t.name}</span></span>
                  <span className="l2">{avatar(p)}<span className="who">{h.quien || x.sinResp}</span><span className="dotsep">·</span><span className="fx">{x.hito}</span></span>
                </> : <>
                  <span className="l1">{icono(h.estado)}<span className="w">{h.wbs}</span><span className="nm">{h.t.name}</span>{sufijo(h)}</span>
                  <span className="l2">
                    {avatar(p)}<span className="who">{h.quien || x.sinResp}</span>
                    <span className="dotsep">·</span><span className="fx num">{x.alDia(horasCortas(hdDe(h), es))}</span>
                    <span className="dotsep">·</span><span className="fx num">{rango(h.s, h.e)}</span>
                    {espera && <><span className="dotsep">·</span><span className="wait">{x.esperaA2} <span className="w">{espera.wbs}</span></span></>}
                  </span>
                </>}
              </button>
            );
          }) : <p className="wv-none">{x.semanaVacia(nFiltros > 0, verHechas)}</p>}
        </div>
      </div>
    );
  };

  /* ── la ficha ── */
  const fichaDe = (id: string) => {
    const h = hojas.find((k) => k.t.id === id);
    if (!h) return null;
    const p = responsableDe(h.t);
    const pct = Math.round(h.t.progress ?? 0);
    const dur = durDe(h);
    const reg = ((h.t as { timeLoggedMinutes?: number }).timeLoggedMinutes ?? 0) / 60;
    const deps = (h.t.dependencies ?? []).map((d) => porId.get(d)).filter((d): d is { t: Task; wbs: string } => !!d);
    const espera = esperaDe(h);
    const riesgo = h.t.riesgos?.length ? riesgoMayor(h.t.riesgos) : undefined;
    return (
      <div className="cv-ficha" role="dialog" aria-labelledby={`cv-f-${id}`}>
        <div className="fi-top">
          <span className="code">{h.wbs}</span>
          <button type="button" className="icon-btn" aria-label={x.cerrarFicha} onClick={() => cerrar(true)}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        <h3 id={`cv-f-${id}`}>{h.t.name}</h3>
        <div className="fi-crumb">{h.crumb}</div>
        <div className="fi-state">
          <span className={`schip${h.estado === 'todo' ? '' : ` ${h.estado}`}`}><i aria-hidden="true" />{x.st[h.estado]}</span>
          {h.od && <span className="fi-late">{(() => { const s = x.vencidaHace(diasDeRetraso(h.t, hoy, cal)); return s[0]!.toUpperCase() + s.slice(1); })()}</span>}
          {espera && <span className="warn">{x.esperaA2} <span className="code">{espera.wbs}</span></span>}
        </div>
        <dl className="fi-f">
          <dt>{x.fechas}</dt>
          <dd>{h.t.isMilestone ? <span className="num">{x.hito} · {fd(h.e)}</span> : <>
            <span className="num">{fd(h.s)} –</span>{h.od ? <span className="chip-red">{fd(h.e)}</span> : <span className="num">{fd(h.e)}</span>}
          </>}</dd>
          {!h.t.isMilestone && <>
            <dt>{x.dur}</dt>
            <dd><span className="num">{dur ? x.dias(dur) : '—'}</span>{dur > 0 && estDe(h) > 0 && <span className="muted num">· {x.alDia(horasCortas(hdDe(h), es))}</span>}</dd>
            <dt>{x.avance}</dt>
            <dd><span className="pbar" aria-hidden="true"><b style={{ width: `${Math.min(100, pct)}%` }} /></span><span className={`pct${pct ? ' on' : ' zero'}`}>{pct}%</span></dd>
          </>}
          <dt>{x.resp}</dt>
          <dd>{avatar(p)}{p?.name ? <span>{p.name}</span> : <span className="muted">{x.sinResp}</span>}</dd>
          {!h.t.isMilestone && <>
            <dt>{x.horas}</dt>
            <dd><span className="num">{horasCortas(reg, es)} / {horasCortas(estDe(h), es)} h</span><span className="muted">{x.registradas}</span></dd>
          </>}
          {deps.length > 0 && <>
            <dt>{x.dep}</dt>
            <dd><span className="code dep">{deps[0]!.wbs}</span>{deps[0]!.t.name}</dd>
          </>}
          {riesgo && <>
            <dt>{x.riesgo}</dt>
            <dd>
              <button type="button" className="fi-risk" disabled={!onVerRiesgo} onClick={() => { cerrar(); onVerRiesgo?.(riesgo.id); }}>
                <i className={`lvl-dot lvl-${riesgo.nivel}`} aria-hidden="true" /><span className="code">{riesgo.codigo}</span>{nombreDeNivel(riesgo.nivel, es)}
              </button>
            </dd>
          </>}
        </dl>
        {(onAbrirEnLista || onAbrir) && (
          <div className="fi-act">
            <button type="button" className="cv-btn" onClick={() => { cerrar(); if (onAbrirEnLista) onAbrirEnLista(h.t, h.wbs); else onAbrir?.(h.t); }}>
              {onAbrirEnLista ? x.abrirEnLista : x.abrirFicha}
              {onAbrirEnLista && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>}
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ── la franja de vencidas (las de quien y fase a la vista, en todo el proyecto) ── */
  const vencidas = hojas.filter((h) => h.od && pasaQF(h))
    .sort((a, b) => a.e - b.e || a.wbs.localeCompare(b.wbs, undefined, { numeric: true }));

  /* ── horas y costo planeados por persona (las del periodo a la vista, con las completadas) ── */
  const recursos = useMemo(() => {
    const m = new Map<string, { p?: Persona; n: number; h: number; c: number }>();
    for (const h of hojas) {
      if (h.t.isMilestone || h.e < desde || h.s > hasta || !pasaQF(h)) continue;
      const k = claveDe(responsableDe(h.t));
      const dur = durDe(h);
      const s = Math.max(h.s, desde); const e = Math.min(h.e, hasta);
      const horas = dur && s <= e ? (estDe(h) * habilesEntre(s, e)) / dur : 0;
      const r = m.get(k) ?? { p: responsableDe(h.t), n: 0, h: 0, c: 0 };
      r.n += 1; r.h += horas; r.c += horas * (tarifaDe(h.t) || 0);
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => Number(!a.p) - Number(!b.p) || (a.p?.name ?? '').localeCompare(b.p?.name ?? '', idioma));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hojas, desde, hasta, tarifaDe, filtros, cal]);
  const totHoras = recursos.reduce((a, r) => a + r.h, 0);
  const totCosto = recursos.reduce((a, r) => a + r.c, 0);
  const moneda = monedaCodigo ? ` ${monedaCodigo}` : '';
  const dinero = (v: number) => (v ? `${millones(v, es)}${moneda}` : '—');

  /* ── resumen ── */
  const delPeriodo = hojas.filter((h) => pasa(h) && h.e >= desde && h.s <= hasta);
  const abiertas = delPeriodo.filter((h) => h.estado !== 'done').length;
  const hechas = delPeriodo.length - abiertas;
  let nFestivos = 0;
  for (let d = primero; d <= ultimo; d += 1) if (festivoDe.has(claveDn(d))) nFestivos += 1;
  const titulo = mes
    ? `${MESES[idioma][ancla.getMonth()]!.replace(/^./, (c) => c.toUpperCase())} ${ancla.getFullYear()}`
    : (() => {
      const p = deDn(primero); const q = deDn(ultimo);
      if (es) {
        return p.getMonth() === q.getMonth()
          ? `${p.getDate()}–${q.getDate()} ${MES3.es[q.getMonth()]} ${q.getFullYear()}`
          : `${p.getDate()} ${MES3.es[p.getMonth()]} – ${q.getDate()} ${MES3.es[q.getMonth()]} ${q.getFullYear()}`;
      }
      return p.getMonth() === q.getMonth()
        ? `${MES3.en[p.getMonth()]} ${p.getDate()}–${q.getDate()}, ${q.getFullYear()}`
        : `${MES3.en[p.getMonth()]} ${p.getDate()} – ${MES3.en[q.getMonth()]} ${q.getDate()}, ${q.getFullYear()}`;
    })();

  /* ── leyenda (cambia con «Color de las barras») ── */
  const leyenda = vista.color === 'estado'
    ? (['todo', 'prog', 'blocked', ...(verHechas ? ['done'] as EstadoV6[] : [])] as EstadoV6[]).map((e) => <span key={e}>{icono(e)}{x.st[e]}</span>)
    : vista.color === 'fase'
      ? fases.map((f) => <span key={f.clave}><i className={`sw k${((f.n - 1) % 5) + 1}`} aria-hidden="true" />{f.corto}</span>)
      : [...personas.map((q, i) => <span key={q.clave}><i className={`sw k${(i % 5) + 1}`} aria-hidden="true" />{(q.p.name ?? '?').split(' ')[0]}</span>),
        <span key="nadie"><i className="sw k0" aria-hidden="true" />{x.sinResp}</span>];

  const popPos = (px: number, py: number, ancho: number): React.CSSProperties => ({
    position: 'absolute', zIndex: 60, top: py,
    left: Math.max(8, Math.min(px, (raiz.current?.clientWidth ?? 1200) - ancho - 12)),
  });

  return (
    <section ref={raiz} className={`lista-v6 calendario-v6 cal by-${vista.color}${vista.festivos ? '' : ' nohol'}${vista.finesDeSemana ? '' : ' nowe'}`} aria-label={x.calendario}>
      <style>{CSS_V6 + CSS_CALENDARIO_V6}</style>
      <p id="cv-teclado" className="sr">{x.ayudaTeclado}</p>
      <div className="cal-head">
        <h2 className="cal-title" aria-live="polite">{titulo}{!mes && <small>{x.semanaN(semanaIsoDe(deDn(primero)))}</small>}</h2>
        <div className="cal-sum">
          <span>{x.abiertas(abiertas, mes)}</span>
          {hechas > 0 && <>
            <span className="sep" aria-hidden="true">·</span>
            <span>{x.hechas(hechas, verHechas)}{' '}
              <a href="#" onClick={(ev) => { ev.preventDefault(); onVista({ ...vista, mostrarHechas: !verHechas }); }}>{verHechas ? x.ocultar : x.mostrar}</a>
            </span>
          </>}
          {nFiltros > 0 && <>
            <span className="sep" aria-hidden="true">·</span>
            <span>{x.filtrosActivos(nFiltros)}{' '}
              <a href="#" onClick={(ev) => { ev.preventDefault(); onFiltros(FILTROS_CALENDARIO_V4_VACIOS); }}>{x.quitar}</a>
            </span>
          </>}
        </div>
      </div>

      {vencidas.length > 0 && (
        <div className="late-row" role="group" aria-label={x.vencidasAria(vencidas.length)}>
          <span className="lr-h" aria-hidden="true">{x.vencidasN(vencidas.length)}</span>
          {vencidas.slice(0, TOPE_VENCIDAS).map((h) => (
            <button key={h.t.id} type="button" className={`lr-it${ficha?.id === h.t.id ? ' sel' : ''}`} data-id={h.t.id} aria-label={etiqueta(h)}
              title={x.vencio(fd(h.e), diasDeRetraso(h.t, hoy, cal), h.quien || x.sinRespMin)} onClick={(ev) => abrirFicha(h.t.id, ev.currentTarget)}>
              <span className="w">{h.wbs}</span><span className="nm">{h.t.name}</span>
            </button>
          ))}
          {onVerVencidas && (vencidas.length > TOPE_VENCIDAS
            ? <a className="lr-more" href="#vencidas" aria-label={x.masVencidasAria(vencidas.length - TOPE_VENCIDAS)} title={x.abreLaLista(vencidas.length)}
              onClick={(ev) => { ev.preventDefault(); onVerVencidas(); }}>{x.masVencidas(vencidas.length - TOPE_VENCIDAS)}</a>
            : <a className="lr-all" href="#vencidas" onClick={(ev) => { ev.preventDefault(); onVerVencidas(); }}>{x.verEnLaLista}</a>)}
          {!onVerVencidas && vencidas.length > TOPE_VENCIDAS && <span className="lr-more">{x.masVencidas(vencidas.length - TOPE_VENCIDAS)}</span>}
        </div>
      )}

      <div className="cv-body" aria-describedby="cv-teclado"
        onMouseOver={(ev) => { const b = (ev.target as HTMLElement).closest?.('.cb') as HTMLElement | null; setResaltada(b?.dataset.id ?? null); }}
        onMouseLeave={() => setResaltada(null)}>
        {mes ? (
          <>
            <div className="dow" aria-hidden="true" style={{ gridTemplateColumns: columnas(false) }}>
              {DIAS[idioma].map((d, i) => <div key={d} className={!lab[i] ? 'we' : undefined}>{d}</div>)}
            </div>
            {semanas.map(semanaDelMes)}
          </>
        ) : laSemana()}
      </div>

      <details className="res">
        <summary>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>
          {/* N14 (2ª revisión de Yesid): «Sin responsable» no es una persona; contaba como «1 person» y la Lista decía «0 people» */}
          <b>{x.recursos}</b><span>{x.personas(recursos.filter((r) => r.p).length, mes, horasCortas(totHoras, es))}</span>
        </summary>
        <div className="hscroll-r">
          <table className="rtab">
            <thead><tr>
              <th scope="col">{x.persona}</th><th scope="col" className="num">{x.tareas}</th><th scope="col" className="num">{x.horasPlan}</th>
              {conCosto && <th scope="col" className="num">{x.costoPlan}</th>}
            </tr></thead>
            <tbody>
              {recursos.length ? recursos.map((r, i) => (
                <tr key={i}>
                  <td>{avatar(r.p)}{r.p?.name ?? x.sinResp}</td><td className="num">{r.n}</td><td className="num">{horasCortas(r.h, es)} h</td>
                  {conCosto && <td className="num">{noEvaluable ? '—' : r.h ? dinero(r.c) : '—'}</td>}
                </tr>
              )) : <tr><td colSpan={conCosto ? 4 : 3}>{x.sinPeriodo}</td></tr>}
            </tbody>
            {recursos.length > 0 && (
              <tfoot><tr>
                <td>{x.total}</td><td /><td className="num">{horasCortas(totHoras, es)} h</td>
                {conCosto && <td className="num">{noEvaluable
                  ? <span className="ne" tabIndex={0} role="note" title={noEvaluable} aria-label={`${x.noEvaluable}: ${noEvaluable}`}><Info />{x.noEvaluable}</span>
                  : dinero(totCosto)}</td>}
              </tr></tfoot>
            )}
          </table>
        </div>
        {!conCosto && <p className="rnote"><span className="locked" tabIndex={0} role="note" title={x.candadoTip}><Candado />{x.candado}</span></p>}
        {conCosto && !noEvaluable && (
          <p className="rnote">{x.notaRecursos}{onVerRecursos && <>{' '}<a href="#" onClick={(ev) => { ev.preventDefault(); onVerRecursos(); }}>{x.verRecursos}</a></>}</p>
        )}
      </details>

      <div className="vfoot">
        <div className="fl">
          <span>{x.calDelProyecto} {x.diasLab(lab)}, {x.sinFestivos(nFestivos, mes)}</span>
          {onVerCalendarioDelProyecto && <a href="#" title={x.fichaTip} onClick={(ev) => { ev.preventDefault(); onVerCalendarioDelProyecto(); }}>{x.verEnLaFicha}</a>}
        </div>
        <div className="legend">
          <span className="legend-it">{leyenda}</span>
          <span className="cv-ayuda-zona">
            <button type="button" className="help-btn cv-ayuda-btn" aria-label={x.comoLeer} aria-expanded={ayuda} onClick={() => setAyuda((v) => !v)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="5.5" /><path d="M6.4 6.4a1.7 1.7 0 1 1 2.4 1.6c-.5.3-.8.6-.8 1.2M8 11.2v.1" /></svg>
            </button>
            {ayuda && (
              <div className="cv-ayuda" role="dialog" aria-label={x.comoLeer}>
                <h6>{x.comoLeer}</h6>
                <div className="ay-l">
                  <span><i className="lpf" aria-hidden="true" /><span>{x.ayuda[0]}</span></span>
                  <span><span className="chip-red">{fd(hoyN - 3)}</span><span>{x.ayuda[1]}</span></span>
                  <span><i className="diamond" aria-hidden="true" /><span>{x.ayuda[2]}</span></span>
                  <span><i className="lh" aria-hidden="true" /><span>{x.ayuda[3]}</span></span>
                  <span><span className="ay-cont"><span className="code">3.2</span> {es ? 'Pantallas…' : 'Screens…'}</span><span>{x.ayuda[4]}</span></span>
                  <span><span className="ay-h num">4 h</span><span>{x.ayuda[5]}</span></span>
                </div>
              </div>
            )}
          </span>
        </div>
      </div>

      {ficha && <div style={popPos(ficha.x, ficha.y, 344)}>{fichaDe(ficha.id)}</div>}
      {lista && (
        <div className="cv-pop" role="dialog" aria-label={x.tareasDel(fd(lista.d))} style={popPos(lista.x, lista.y, 336)}>
          <h4>{x.tareasDel(fd(lista.d))} · <span className="num">{lista.ids.length}</span></h4>
          {lista.ids.map((id) => {
            const h = hojas.find((k) => k.t.id === id);
            if (!h) return null;
            return (
              <button key={id} type="button" className="it" onClick={(ev) => abrirFicha(h.t.id, ev.currentTarget)}>
                {icono(h.estado)}<span className="code">{h.wbs}</span><span className="nm">{h.t.name}</span>
                {h.od ? <span className="chip-red">{fd(h.e)}</span> : <span className="num">{fd(h.e)}</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="toast-zona" aria-live="polite">
        {aviso && (
          <div className="toast">
            <span className="toast-t">{aviso.texto}</span>
            {aviso.deshacer && <button type="button" onClick={() => { const d = aviso.deshacer; setAviso(null); d?.(); }}>{x.deshacer}</button>}
          </div>
        )}
      </div>
    </section>
  );
}

function Candado(): ReactNode {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
}
function Info(): ReactNode {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5" /><path d="M8 7.3v3.4M8 5.2v.1" /></svg>;
}

/* Las medidas son las de la maqueta; los tokens, los de la v4 (`--v4-*`) con los del Gantt v6 de reserva. */
export const CSS_CALENDARIO_V6 = `
.calendario-v6{
  --cv-text:var(--v4-text,var(--v6-texto));--cv-text2:var(--v4-text2,var(--v6-texto-2));--cv-text3:var(--v4-text3,var(--v6-tenue));
  --cv-card:var(--v4-card,var(--v6-tarjeta));--cv-border:var(--v4-border,var(--v6-borde));--cv-soft:var(--v4-soft,var(--v6-linea));
  --cv-guide:var(--v4-guide,var(--v6-separador));--cv-hover:var(--v4-hover,var(--v6-fila-hover));--cv-acc:var(--v4-acc,var(--v6-acento-texto));
  --cv-red:var(--v4-red,var(--v6-rojo));--cv-red-bd:var(--v4-red-bd,var(--v6-rojo-borde));--cv-red-bg:var(--v4-red-bg,var(--v6-rojo-fondo));
  --cv-amber:var(--v4-amber,var(--v6-ambar));--cv-weekend:var(--v4-weekend,var(--v6-finde));--cv-hatch:var(--v4-hatch,var(--v6-festivo-trama));
  --cv-today-bg:var(--v4-today-bg,var(--v6-hoy-fondo));--cv-today-fg:var(--v4-today-fg,var(--v6-hoy-texto));
  --cv-fill:var(--v4-fill,var(--v6-acento));--cv-track:var(--v4-track,var(--v6-pista));--cv-pop:var(--v4-pop,0 12px 32px -8px rgba(14,17,20,.22));
  --cv-btn-bd:var(--v4-btn-bd,var(--v6-borde));--cv-mono:var(--v4-ff-mono,'Geist Mono',monospace);
  --cv-st-todo:var(--v4-st-todo,#7F8891);--cv-st-prog:var(--v4-st-prog,#0A8073);--cv-st-blocked:var(--v4-st-blocked,#B26A00);--cv-st-done:var(--v4-st-done,#7F8891);
  --cv-lvl-critico:var(--v4-lvl-critico,#D13A40);--cv-lvl-alto:var(--v4-lvl-alto,#D9730D);--cv-lvl-medio:var(--v4-lvl-medio,#B8860B);--cv-lvl-bajo:var(--v4-lvl-bajo,#8A939C);
  --cv-milestone:var(--v4-milestone,#C2410C);
  --mb:15%;--mf:32%;--k1:#3B76D4;--k2:#8A63D2;--k3:#C4558F;--k4:#5E8C31;--k5:#2A93B8;--k0:var(--cv-st-todo);
  color:var(--cv-text);font-size:13px
}
:is(html.dark,[data-theme=dark]) .calendario-v6{--mb:13%;--mf:26%;--k1:#6FA0F0;--k2:#A98BEA;--k3:#E07FB2;--k4:#8FBF5A;--k5:#55B8DA}
.calendario-v6 .num{font-variant-numeric:tabular-nums}
.calendario-v6 .code,.calendario-v6 .w{font-family:var(--cv-mono);font-weight:400}
.calendario-v6 a{color:var(--cv-acc);text-decoration:none;font-weight:500}
.calendario-v6 a:hover{text-decoration:underline}
/* iconos de estado (los de la Lista v4) */
.lista-v6.calendario-v6 .schip{display:inline-flex;align-items:center;gap:6px;height:auto;padding:0;border-radius:0;background:none;color:var(--cv-text2);font-size:12px;font-weight:500;white-space:nowrap;flex:none}
.lista-v6.calendario-v6 .schip::before,.lista-v6.calendario-v6 .schip.done::before{content:none}
.lista-v6.calendario-v6 .schip i{position:relative;display:inline-block;width:12px;height:12px;box-sizing:border-box;border-radius:50%;border:1.5px solid var(--cv-st-todo);background:none;flex:none}
.lista-v6.calendario-v6 .schip.prog i{border-color:var(--cv-st-prog);background:linear-gradient(90deg,transparent 50%,var(--cv-st-prog) 50%)}
.lista-v6.calendario-v6 .schip.blocked i{border-color:var(--cv-st-blocked);background:linear-gradient(var(--cv-card),var(--cv-card)) center/6px 2px no-repeat,var(--cv-st-blocked)}
.lista-v6.calendario-v6 .schip.done{color:var(--cv-text3)}
.lista-v6.calendario-v6 .schip.done i{display:inline-block;border-color:var(--cv-st-done);background:var(--cv-st-done)}
.lista-v6.calendario-v6 .schip.done i::after{content:'';position:absolute;left:3px;top:.8px;width:3px;height:6px;border:solid var(--cv-card);border-width:0 1.5px 1.5px 0;transform:rotate(42deg)}
.lista-v6.calendario-v6 .chip-red{display:inline-flex;align-items:center;height:18px;padding:0 5px;border-radius:4px;border:1px solid var(--cv-red-bd);background-color:var(--cv-card);background-image:linear-gradient(var(--cv-red-bg),var(--cv-red-bg));color:var(--cv-red);font:500 12px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}
.lista-v6.calendario-v6 .avatar{width:20px;height:20px;font-size:11px;font-weight:600;background:var(--cv-soft);border:0;color:var(--cv-text2)}
.lista-v6.calendario-v6 .avatar.none{border:1px dashed var(--cv-guide);background:transparent;color:var(--cv-text3)}
/* cabecera y resumen */
.calendario-v6 .cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;padding:12px 16px 10px;flex-wrap:wrap}
.calendario-v6 .cal-title{margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:baseline;gap:8px;white-space:nowrap;color:var(--cv-text)}
.calendario-v6 .cal-title small{font:400 12px var(--v4-ff-sans,inherit);color:var(--cv-text3);letter-spacing:0;font-variant-numeric:tabular-nums}
.calendario-v6 .cal-sum{display:flex;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--cv-text3);min-height:24px}
.calendario-v6 .cal-sum .sep{margin:0 8px;color:var(--cv-guide)}
.calendario-v6 .cal-sum a{padding:5px 6px;margin:-5px -2px -5px 0;border-radius:4px}
/* franja de vencidas */
.calendario-v6 .late-row{display:flex;align-items:center;gap:2px;padding:4px 16px;border-top:1px solid var(--cv-soft);min-width:0;min-height:36px;box-sizing:border-box}
.calendario-v6 .lr-h{font-size:12px;font-weight:500;color:var(--cv-red);margin-right:6px;white-space:nowrap;flex:none;display:inline-flex;align-items:center;gap:6px}
.calendario-v6 .lr-h::before{content:'';width:6px;height:6px;border-radius:999px;background:var(--cv-red)}
.calendario-v6 .lr-it{flex:0 1 auto;text-align:left;height:26px;display:inline-flex;align-items:center;gap:6px;padding:0 6px;border-radius:6px;font:inherit;font-size:12px;min-width:0;color:var(--cv-text2);border:0;background:none;cursor:pointer}
.calendario-v6 .lr-it+.lr-it::before{content:'·';color:var(--cv-text3);margin:0 6px 0 -6px}
.calendario-v6 .lr-it:hover,.calendario-v6 .lr-it.sel{background:var(--cv-hover);color:var(--cv-text)}
.calendario-v6 .lr-it .w{font-size:12px;color:var(--cv-text3);flex:none}
.calendario-v6 .lr-it .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:32px}
.calendario-v6 .lr-more{flex:none;height:26px;display:inline-flex;align-items:center;padding:0 6px;border-radius:6px;color:var(--cv-red);font-size:12px;font-weight:500;white-space:nowrap}
.calendario-v6 a.lr-more:hover{background:var(--cv-hover);text-decoration:none}
.calendario-v6 .lr-all{flex:none;margin-left:auto;padding:5px 6px;border-radius:4px;font-size:12px;font-weight:500;color:var(--cv-text2);white-space:nowrap}
.calendario-v6 .lr-all:hover{color:var(--cv-text)}
/* el mes */
.calendario-v6 .cv-body{min-width:0}
.calendario-v6 .dow{display:grid;border-top:1px solid var(--cv-soft)}
.calendario-v6 .dow div{height:28px;display:flex;align-items:center;padding:0 10px;font-size:12px;color:var(--cv-text3);min-width:0;overflow:hidden}
.calendario-v6 .wk{display:grid;border-top:1px solid var(--cv-soft)}
.calendario-v6 .day{grid-row:1/-1;border-left:1px solid var(--cv-soft);padding:5px 8px 0;display:flex;align-items:flex-start;gap:6px;min-width:0;overflow:hidden}
.calendario-v6 .day:first-child,.calendario-v6 .wh:first-child,.calendario-v6 .wcol:first-child{border-left:0}
.calendario-v6 .day .n,.calendario-v6 .wh .n{font-size:12px;font-weight:500;min-width:22px;height:20px;padding:0 4px;box-sizing:border-box;display:grid;place-items:center;border-radius:999px;margin:-1px 0 0 -4px;flex:none;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--cv-text)}
.calendario-v6 .day.other .n{color:var(--cv-text3);font-weight:400}
.calendario-v6 :is(.day,.wcol,.wh).we{background:var(--cv-weekend)}
.calendario-v6 :is(.day,.wcol,.wh).hol{background-color:var(--cv-weekend);background-image:repeating-linear-gradient(135deg,var(--cv-hatch) 0 1px,transparent 1px 6px)}
.calendario-v6.nohol :is(.day,.wcol,.wh).hol{background-image:none}
.calendario-v6.nohol :is(.day,.wcol,.wh).hol:not(.we){background-color:transparent}
.calendario-v6 .hn{font-size:12px;color:var(--cv-text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;line-height:18px}
.calendario-v6 .day.today .n,.calendario-v6 .wh.today .n{background:var(--cv-today-bg);color:var(--cv-today-fg);font-weight:600}
.calendario-v6.nowe :is(.day,.wh,.wcol):nth-child(n+6):nth-child(-n+7),.calendario-v6.nowe .dow div:nth-child(n+6){padding:0;border:0;visibility:hidden}
/* el color de las barras */
.calendario-v6.by-estado .s-todo{--c:var(--cv-st-todo)}
.calendario-v6.by-estado .s-prog{--c:var(--cv-st-prog)}
.calendario-v6.by-estado .s-blocked{--c:var(--cv-st-blocked)}
.calendario-v6.by-estado .s-done{--c:var(--cv-st-done)}
.calendario-v6.by-fase .p1,.calendario-v6.by-responsable .u1,.calendario-v6 .sw.k1{--c:var(--k1)}
.calendario-v6.by-fase .p2,.calendario-v6.by-responsable .u2,.calendario-v6 .sw.k2{--c:var(--k2)}
.calendario-v6.by-fase .p3,.calendario-v6.by-responsable .u3,.calendario-v6 .sw.k3{--c:var(--k3)}
.calendario-v6.by-fase .p4,.calendario-v6.by-responsable .u4,.calendario-v6 .sw.k4{--c:var(--k4)}
.calendario-v6.by-fase .p5,.calendario-v6.by-responsable .u5,.calendario-v6 .sw.k5{--c:var(--k5)}
.calendario-v6.by-responsable .u0,.calendario-v6 .sw.k0{--c:var(--k0)}
.calendario-v6 :is(.cb,.wb){--c:var(--cv-st-todo);position:relative;z-index:1;display:flex;min-width:0;overflow:hidden;text-align:left;color:var(--cv-text);background:color-mix(in srgb,var(--c) var(--mb),var(--cv-card));border:0;cursor:pointer;box-sizing:border-box}
.calendario-v6 .cb{height:20px;margin:1px 4px;border-radius:6px;align-items:center;gap:6px;padding:0 7px;font:500 12px/1 var(--v4-ff-sans,inherit)}
.calendario-v6 :is(.cb,.wb).cl{margin-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
.calendario-v6 :is(.cb,.wb).cr{margin-right:0;border-top-right-radius:0;border-bottom-right-radius:0}
.calendario-v6 .cb:hover,.calendario-v6 .cb.hl,.calendario-v6 .wb:hover{background:color-mix(in srgb,var(--c) 22%,var(--cv-card))}
.calendario-v6 :is(.cb,.wb).sel{background:color-mix(in srgb,var(--c) 22%,var(--cv-card));outline:1.5px solid color-mix(in srgb,var(--c) 85%,var(--cv-text));outline-offset:-1.5px}
.calendario-v6 :is(.cb,.wb):focus-visible{outline:2px solid var(--cv-acc);outline-offset:-2px}
.calendario-v6 :is(.cb,.wb) .pf{position:absolute;left:0;top:0;bottom:0;z-index:-1;background:color-mix(in srgb,var(--c) var(--mf),var(--cv-card))}
.calendario-v6 :is(.cb,.wb) .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.calendario-v6 :is(.cb,.wb) .w{font-size:12px;color:var(--cv-text2);flex:none}
.calendario-v6 :is(.cb,.wb) .pct{flex:none;color:var(--cv-text2);font-weight:400;font-size:12px}
.calendario-v6 .cb .chip-red{height:16px}
.calendario-v6 .cb:not(.cont):not(.s-done) .w,.calendario-v6 .wb:not(.s-done) .w{color:var(--cv-text)}
.calendario-v6 .cb.cont{color:var(--cv-text2);font-weight:400}
.calendario-v6 .cb.cont:hover,.calendario-v6 .cb.cont.hl,.calendario-v6 .cb.cont.sel{color:var(--cv-text)}
.calendario-v6 :is(.cb,.wb).s-done{background:color-mix(in srgb,var(--c) 7%,var(--cv-card));color:var(--cv-text3)}
.calendario-v6 :is(.cb,.wb).s-done .w,.calendario-v6 .wb.s-done .l2{color:var(--cv-text3)}
.calendario-v6 :is(.cb,.wb).s-done:hover,.calendario-v6 :is(.cb,.wb).s-done.sel,.calendario-v6 .cb.s-done.hl{background:color-mix(in srgb,var(--c) 16%,var(--cv-card))}
.calendario-v6 :is(.cb,.wb).ms{background:none}
.calendario-v6 :is(.cb,.wb).ms:hover,.calendario-v6 :is(.cb,.wb).ms.sel{background:var(--cv-hover);outline:0}
.calendario-v6 .diamond{width:9px;height:9px;background:var(--cv-milestone);transform:rotate(45deg);border-radius:1.5px;display:inline-block;flex:none}
.calendario-v6 .cmore{height:20px;margin:1px 4px;place-self:center start;font:inherit;font-size:12px;font-weight:500;color:var(--cv-text2);padding:0 7px;border-radius:6px;z-index:1;white-space:nowrap;border:0;background:none;cursor:pointer}
.calendario-v6 .cmore:hover{background:var(--cv-hover);color:var(--cv-text)}
/* la semana */
.calendario-v6 .wv-h,.calendario-v6 .wv-b{display:grid}
.calendario-v6 .wv-h{border-top:1px solid var(--cv-soft)}
.calendario-v6 .wh{height:40px;display:flex;align-items:center;gap:6px;padding:0 10px;border-left:1px solid var(--cv-soft);min-width:0;font-size:12px;overflow:hidden;box-sizing:border-box}
.calendario-v6 .wh .dn{color:var(--cv-text2);font-weight:500}
.calendario-v6 .wh .n{margin:0 0 0 -2px}
.calendario-v6 .wh .tot{margin-left:auto;color:var(--cv-text3);white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}
.calendario-v6 .wv-b{border-top:1px solid var(--cv-soft);position:relative}
.calendario-v6 .wcol{grid-row:1/-1;border-left:1px solid var(--cv-soft);min-width:0}
.calendario-v6 .wb{margin:3px 4px;border-radius:8px;flex-direction:column;justify-content:center;gap:5px;padding:0 10px;font:400 13px/1.2 var(--v4-ff-sans,inherit)}
.calendario-v6 .wb .l1{display:flex;align-items:center;gap:6px;min-width:0;font-weight:500}
.calendario-v6 .wb .l2{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;color:var(--cv-text2);white-space:nowrap}
.calendario-v6 .wb .l2 .who{overflow:hidden;text-overflow:ellipsis;min-width:0}
.calendario-v6 .wb .l2 .dotsep{color:var(--cv-text3);flex:none}
.calendario-v6 .wb .l2 .fx{flex:none}
.calendario-v6 .wb .l2 .wait{color:var(--cv-amber);font-weight:500;flex:none;display:inline-flex;gap:4px}
.calendario-v6 .wb .l2 .wait .w{color:var(--cv-amber)}
.calendario-v6 .wb.one .who{display:none}
.calendario-v6 .wv-none{grid-area:2/1/-2/-1;place-self:center;z-index:1;color:var(--cv-text3);font-size:13px;text-align:center;padding:0 16px;margin:0}
/* la ficha y la lista del día */
.calendario-v6 .cv-ficha,.calendario-v6 .cv-pop{background:var(--cv-card);border:1px solid var(--cv-border);border-radius:12px;box-shadow:var(--cv-pop);color:var(--cv-text)}
.calendario-v6 .cv-ficha{width:344px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:10px 14px 12px}
.calendario-v6 .fi-top{display:flex;align-items:center;gap:8px;min-height:28px}
.calendario-v6 .fi-top .code{font-size:12px;color:var(--cv-text3)}
.calendario-v6 .icon-btn{margin-left:auto;margin-right:-6px;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--cv-text2);border:0;background:transparent;cursor:pointer}
.calendario-v6 .icon-btn:hover{background:var(--cv-hover);color:var(--cv-text)}
.calendario-v6 .cv-ficha h3{margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em;line-height:1.3}
.calendario-v6 .fi-crumb{font-size:12px;color:var(--cv-text3);margin:3px 0 10px}
.calendario-v6 .fi-state{display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;margin-bottom:6px}
.calendario-v6 .fi-late{color:var(--cv-red);font-size:12px;font-weight:500}
.calendario-v6 .fi-state .warn{color:var(--cv-amber);font-size:12px;font-weight:500}
.calendario-v6 .fi-f{display:grid;grid-template-columns:96px 1fr;margin:0}
.calendario-v6 .fi-f dt{font-size:12px;color:var(--cv-text3);min-height:28px;display:flex;align-items:center}
.calendario-v6 .fi-f dd{margin:0;min-height:28px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px}
.calendario-v6 .fi-f .muted{font-size:12px;color:var(--cv-text3)}
.calendario-v6 .fi-f .code.dep{font-size:12px;color:var(--cv-text3)}
.calendario-v6 .pbar{width:96px;height:4px;border-radius:2px;background:var(--cv-track);overflow:hidden;display:block}
.calendario-v6 .pbar b{display:block;height:100%;background:var(--cv-fill);border-radius:2px}
.calendario-v6 .fi-f .pct.on{color:var(--cv-acc)}
.calendario-v6 .fi-risk{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;padding:0;font:inherit;font-size:13px;color:var(--cv-text);cursor:pointer}
.calendario-v6 .fi-risk:hover:not(:disabled){text-decoration:underline}
.calendario-v6 .fi-risk .code{font-size:12px;color:var(--cv-text3)}
.calendario-v6 .lvl-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--cv-lvl-bajo)}
.calendario-v6 .lvl-dot.lvl-critico{background:var(--cv-lvl-critico)}
.calendario-v6 .lvl-dot.lvl-alto{background:var(--cv-lvl-alto)}
.calendario-v6 .lvl-dot.lvl-medio{background:var(--cv-lvl-medio)}
.calendario-v6 .fi-act{display:flex;justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px solid var(--cv-soft)}
.calendario-v6 .cv-btn{height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 10px 0 12px;border-radius:8px;border:1px solid var(--cv-btn-bd);background:var(--cv-card);color:var(--cv-text);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.calendario-v6 .cv-btn:hover{background:var(--cv-hover)}
.calendario-v6 .cv-pop{width:336px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:8px}
.calendario-v6 .cv-pop h4{margin:4px 6px 6px;font-size:12px;font-weight:600}
.calendario-v6 .cv-pop .it{width:100%;display:flex;align-items:center;gap:8px;height:32px;padding:0 6px;border-radius:6px;text-align:left;color:var(--cv-text);border:0;background:transparent;font:inherit;font-size:13px;cursor:pointer}
.calendario-v6 .cv-pop .it:hover{background:var(--cv-hover)}
.calendario-v6 .cv-pop .it .code{font-size:12px;color:var(--cv-text3)}
.calendario-v6 .cv-pop .it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calendario-v6 .cv-pop .it .num{font-size:12px;color:var(--cv-text3)}
/* el pie plegado: horas y costo por persona */
.calendario-v6 details.res{border-top:1px solid var(--cv-soft);padding:0 16px;font-size:12px;color:var(--cv-text3)}
.calendario-v6 details.res summary{list-style:none;display:flex;align-items:center;gap:6px;min-height:38px;cursor:pointer}
.calendario-v6 details.res summary::-webkit-details-marker{display:none}
.calendario-v6 details.res summary b{color:var(--cv-text2);font-weight:500}
.calendario-v6 details.res summary svg{transition:transform .15s;flex:none}
.calendario-v6 details.res[open] summary>svg{transform:rotate(90deg)}
.calendario-v6 .rtab{border-collapse:collapse;margin:0 0 8px 22px;font-size:12px;color:var(--cv-text2)}
.calendario-v6 .rtab th{font-size:12px;font-weight:500;color:var(--cv-text3);text-align:left;padding:4px 20px 4px 0;white-space:nowrap}
.calendario-v6 .rtab td{padding:5px 20px 5px 0;border-top:1px solid var(--cv-soft);white-space:nowrap}
.calendario-v6 .rtab td .avatar{margin-right:6px;vertical-align:middle}
.calendario-v6 .rtab .num{text-align:right;font-variant-numeric:tabular-nums}
.calendario-v6 .rtab tfoot td{color:var(--cv-text);font-weight:600}
.calendario-v6 .rnote{margin:0 0 12px 22px;font-size:12px;color:var(--cv-text3);max-width:720px;line-height:1.45}
.calendario-v6 .ne,.calendario-v6 .locked{display:inline-flex;align-items:center;gap:5px;color:var(--v4-ne,var(--cv-text2));font-weight:500;cursor:help}
/* pie: el calendario del proyecto, la leyenda y el «?» */
.calendario-v6 .vfoot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;row-gap:0;column-gap:12px;padding:0 16px;border-top:1px solid var(--cv-soft);font-size:12px;color:var(--cv-text2)}
.calendario-v6 .vfoot .fl{display:flex;align-items:center;gap:6px;min-height:38px;flex-wrap:wrap}
.calendario-v6 .vfoot .fl a{font-weight:500}
.calendario-v6 .legend{display:flex;align-items:center;flex-wrap:wrap;min-height:38px;justify-content:flex-end;margin-left:auto;color:var(--cv-text2);gap:6px 14px}
.calendario-v6 .legend-it{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px}
.calendario-v6 .legend-it>span{display:inline-flex;align-items:center;gap:6px}
.calendario-v6 .legend .schip{font-weight:400}
.calendario-v6 .sw{display:inline-block;width:14px;height:10px;border-radius:3px;background:color-mix(in srgb,var(--c) 34%,var(--cv-card))}
.calendario-v6 .cv-ayuda-zona{position:relative;display:inline-flex}
.calendario-v6 .help-btn{width:28px;height:28px;border-radius:999px;border:0;background:none;color:var(--cv-text2);display:grid;place-items:center;cursor:pointer}
.calendario-v6 .help-btn:hover,.calendario-v6 .help-btn[aria-expanded=true]{background:var(--cv-hover);color:var(--cv-text)}
.calendario-v6 .cv-ayuda{position:absolute;right:-8px;bottom:calc(100% + 6px);z-index:60;width:320px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px;background:var(--cv-card);border:1px solid var(--cv-border);border-radius:12px;box-shadow:var(--cv-pop);color:var(--cv-text)}
.calendario-v6 .cv-ayuda h6{margin:0 0 8px;font-size:12px;font-weight:500;color:var(--cv-text2)}
.calendario-v6 .ay-l{display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--cv-text2)}
.calendario-v6 .ay-l>span{display:flex;align-items:flex-start;gap:8px;line-height:1.4}
.calendario-v6 .ay-l>span>:first-child{margin-top:2px;flex:none}
.calendario-v6 .ay-l .chip-red{height:16px}
.calendario-v6 .ay-l .diamond{margin:3px 6px 0}
.calendario-v6 .lpf{display:inline-block;width:22px;height:12px;border-radius:4px;background:linear-gradient(90deg,color-mix(in srgb,var(--cv-st-prog) 34%,var(--cv-card)) 55%,color-mix(in srgb,var(--cv-st-prog) 14%,var(--cv-card)) 55%)}
.calendario-v6 .lh{display:inline-block;width:22px;height:12px;border-radius:4px;background-color:var(--cv-weekend);background-image:repeating-linear-gradient(135deg,var(--cv-hatch) 0 1px,transparent 1px 5px);box-shadow:inset 0 0 0 1px var(--cv-soft)}
.calendario-v6 .ay-cont{color:var(--cv-text2);white-space:nowrap}
.calendario-v6 .ay-h{color:var(--cv-text3)}
.calendario-v6 .toast-t{white-space:normal;max-width:560px}
.calendario-v6 .toast{white-space:normal}
@media (max-width:640px){
  .calendario-v6 .cal-head{padding:12px 12px 8px}
  .calendario-v6 .late-row{flex-wrap:wrap;padding:4px 12px 6px}
  .calendario-v6 .lr-h{flex:1 1 100%;min-height:26px}
  .calendario-v6 .lr-it{flex:1 1 100%}
  .calendario-v6 .lr-it+.lr-it::before{content:none}
  .calendario-v6 .lr-it .nm{flex:1 1 0%}
  .calendario-v6 .lr-all{margin-left:0}
  .calendario-v6 .dow div{padding:0 4px;justify-content:center}
  .calendario-v6 .day{padding:5px 3px 0;justify-content:center}
  .calendario-v6 .day .n{margin:-1px 0 0}
  .calendario-v6 .day .hn{display:none}
  .calendario-v6 .cb{margin:2px 1px;padding:0 3px;gap:3px;justify-content:center}
  .calendario-v6 .cb .nm,.calendario-v6 .cb .pct,.calendario-v6 .cb .chip-red,.calendario-v6 .cb .schip{display:none}
  .calendario-v6 .cb.ms .diamond{margin:0 auto}
  .calendario-v6 .cb.od{box-shadow:inset 0 -2px 0 var(--cv-red)}
  .calendario-v6 .cmore{margin:2px 0;padding:0 2px}
  .calendario-v6 .wv{overflow-x:auto;overscroll-behavior-x:contain}
  .calendario-v6 .wv-h,.calendario-v6 .wv-b{min-width:820px}
  .calendario-v6 details.res{padding:0 12px}
  .calendario-v6 .rtab,.calendario-v6 .rnote{margin-left:0}
  .calendario-v6 .hscroll-r{overflow-x:auto}
  .calendario-v6 .legend{margin-left:0;justify-content:flex-start;padding-bottom:8px}
}
`;
