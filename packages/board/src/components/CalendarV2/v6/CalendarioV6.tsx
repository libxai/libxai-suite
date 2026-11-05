/**
 * Maquetas v3 de Yesid (4-nov) · EL CALENDARIO v6 (sólo Asakaa). La maqueta `asakaa-calendario.html` y la revisión C1-C6:
 *
 *   · Mes (semanas de lunes a domingo, las barras siguen de una semana a otra) y Semana (lista por día con las horas
 *     planeadas); el periodo lo lleva la app (‹ › y Hoy en su barra);
 *   · sólo las hojas, con los tokens del Gantt: por hacer, en progreso (con su avance abajo), completadas atenuadas y
 *     ocultas por defecto; chip rojo con el fin en la vencida y ⚠ en la bloqueada (C2);
 *   · tres carriles por semana y «+N más», que abre la lista del día (si un cuarto basta, se ve entero); las vencidas
 *     van primero, nunca dentro de «+N más» (C3);
 *   · hoy en un círculo, fines de semana sombreados y festivos rayados con su nombre (C4);
 *   · la fila «Atrasadas» y la línea de resumen «11 tareas en el mes · 1 completada oculta · 3 vencidas · Ver» (C1);
 *   · Geist y Geist Mono, 11 px como mínimo, título 15/600 (C5, C6);
 *   · clic en una barra: la ficha de la tarea; arrastrarla, reprogramarla (si se puede), con «Deshacer».
 */
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import type { Calendario } from '../../Gantt/motorDeProgramacion';
import { fechaCorta } from '../../Gantt/fechaCorta';
import {
  diasDeRetraso, duracionHabil, estadoDe, estadoDeHoja, estaVencida, horasCortas, millones, tieneHijas, type EstadoV6,
} from '../../ListView/v6/reglasDeLaLista';
import { CSS_V6 } from '../../ListView/v6/ListaV6';
import { FILTROS_TABLERO_V6_VACIOS, type FiltrosTableroV6 } from '../../Board/v6/TableroV6';
import { PuntoDeNivelDeRiesgo, nombreDeNivel, riesgoMayor } from '../../ListView/v6/PuntoDeRiesgo';

export type EscalaCalendarioV6 = 'mes' | 'semana';
/** El menú Vista del Calendario (lo lleva la app y lo recuerda). */
export interface VistaCalendarioV6 {
  escala: EscalaCalendarioV6;
  mostrarHechas: boolean;
  finesDeSemana: boolean;
  festivos: boolean;
  leyenda: boolean;
}
export const VISTA_CALENDARIO_V6_POR_DEFECTO: VistaCalendarioV6 = { escala: 'mes', mostrarHechas: false, finesDeSemana: true, festivos: true, leyenda: false };

/* ── días como enteros (sin husos): el número de días desde 1970 de una fecha local ── */
const DIA = 864e5;
const dn = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA;
const deDn = (n: number) => { const u = new Date(n * DIA); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12); };
const claveDn = (n: number) => new Date(n * DIA).toISOString().slice(0, 10);
/** 0 = lunes … 6 = domingo */
const dowL = (n: number) => (new Date(n * DIA).getUTCDay() + 6) % 7;
const lunesDe = (n: number) => n - dowL(n);

/** Mover un periodo: un mes o una semana desde la fecha que lo ancla. */
export function pasoDelCalendarioV6(ancla: Date, escala: EscalaCalendarioV6, paso: number): Date {
  if (escala === 'mes') return new Date(ancla.getFullYear(), ancla.getMonth() + paso, 1, 12);
  return deDn(lunesDe(dn(ancla)) + paso * 7);
}

const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DIAS = {
  es: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const DIAS_LARGOS = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const TXT = {
  es: {
    st: { todo: 'Por hacer', prog: 'En progreso', blocked: 'Bloqueada', done: 'Completada' } as Record<EstadoV6, string>,
    tareas: (n: number) => (n === 1 ? 'tarea' : 'tareas'), enElMes: 'en el mes', enLaSemana: 'en la semana',
    completadaN: (n: number) => (n === 1 ? 'completada' : 'completadas'), oculta: (n: number) => (n === 1 ? 'oculta' : 'ocultas'),
    aLaVista: 'a la vista', ningunaHecha: 'ninguna completada en el periodo', mostrar: 'Mostrar', ocultar: 'Ocultar',
    vencidaN: (n: number) => (n === 1 ? 'vencida' : 'vencidas'), ver: 'Ver', ningunaVencida: 'Ninguna vencida',
    filtrando: 'Filtrando:', quitar: 'Quitar el filtro', soloVencidas: 'Solo vencidas', soloBloqueadas: 'Solo bloqueadas', responsable: 'Responsable',
    atrasadas: 'Atrasadas', haceHab: (n: number) => `hace ${n} d háb.`, mas: (n: number) => `+${n} más`, tareasDel: (d: string) => `Tareas del ${d}`,
    sinAbiertas: 'Sin tareas abiertas', sinTareas: 'Sin tareas', horasDia: 'Horas planeadas este día', hito: 'Hito',
    cerrar: 'Cerrar', retraso: (n: number) => `Retraso: ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`, espera: 'Espera a',
    fechas: 'Fechas', dur: 'Duración', dias: (n: number) => `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`, alDia: (h: string) => `· ${h} h al día`,
    avance: 'Avance', resp: 'Responsable', sinResp: 'Sin responsable', horas: 'Horas', registradas: 'registradas', dep: 'Depende de',
    abrirFicha: 'Abrir ficha completa', calendario: 'Calendario del proyecto', riesgo: 'Riesgo',
    reprogramada: (n: string, a: string, b: string) => `«${n}»: ${a} → ${b}.`, deshacer: 'Deshacer', deshecho: (n: string) => `Cambio deshecho: «${n}» vuelve a sus fechas.`,
    recursos: 'Recursos e impacto de flujo de caja', personas: (n: number, mes: boolean) => `${n} ${n === 1 ? 'persona' : 'personas'} ${mes ? 'este mes' : 'esta semana'}`,
    persona: 'Persona', costo: (m: string) => (m ? `Costo (${m})` : 'Costo'), sinPeriodo: 'Sin tareas en el periodo', total: 'Total',
    leyenda: 'Leyenda', lFestivo: 'Festivo', lHoy: 'Hoy', ayuda: 'Clic o Enter en una barra: la ficha de la tarea. Arrastrar una barra: cambiar sus fechas.',
  },
  en: {
    st: { todo: 'To do', prog: 'In progress', blocked: 'Blocked', done: 'Completed' } as Record<EstadoV6, string>,
    tareas: (n: number) => (n === 1 ? 'task' : 'tasks'), enElMes: 'this month', enLaSemana: 'this week',
    completadaN: () => 'completed', oculta: () => 'hidden',
    aLaVista: 'shown', ningunaHecha: 'none completed in the period', mostrar: 'Show', ocultar: 'Hide',
    vencidaN: () => 'overdue', ver: 'View', ningunaVencida: 'None overdue',
    filtrando: 'Filtering:', quitar: 'Remove the filter', soloVencidas: 'Overdue only', soloBloqueadas: 'Blocked only', responsable: 'Owner',
    atrasadas: 'Overdue', haceHab: (n: number) => `${n} wd ago`, mas: (n: number) => `+${n} more`, tareasDel: (d: string) => `Tasks on ${d}`,
    sinAbiertas: 'No open tasks', sinTareas: 'No tasks', horasDia: 'Hours planned this day', hito: 'Milestone',
    cerrar: 'Close', retraso: (n: number) => `Delay: ${n} working ${n === 1 ? 'day' : 'days'}`, espera: 'Waiting for',
    fechas: 'Dates', dur: 'Duration', dias: (n: number) => `${n} working ${n === 1 ? 'day' : 'days'}`, alDia: (h: string) => `· ${h} h a day`,
    avance: 'Progress', resp: 'Owner', sinResp: 'No owner', horas: 'Hours', registradas: 'logged', dep: 'Depends on',
    abrirFicha: 'Open full task', calendario: 'Project calendar', riesgo: 'Risk',
    reprogramada: (n: string, a: string, b: string) => `“${n}”: ${a} → ${b}.`, deshacer: 'Undo', deshecho: (n: string) => `Change undone: “${n}” is back on its dates.`,
    recursos: 'Resources and cash-flow impact', personas: (n: number, mes: boolean) => `${n} ${n === 1 ? 'person' : 'people'} ${mes ? 'this month' : 'this week'}`,
    persona: 'Person', costo: (m: string) => (m ? `Cost (${m})` : 'Cost'), sinPeriodo: 'No tasks in the period', total: 'Total',
    leyenda: 'Legend', lFestivo: 'Holiday', lHoy: 'Today', ayuda: 'Click or Enter on a bar: the task card. Drag a bar: change its dates.',
  },
};

type Persona = { id?: string; name?: string; initials?: string };
const responsableDe = (t: Task) => (t.assignees ?? [])[0] as Persona | undefined;
const claveDe = (p?: Persona) => (p ? p.id || p.name || '?' : '');

interface Hoja { t: Task; wbs: string; ruta: string; s: number; e: number; estado: EstadoV6 }
interface Seg { h: Hoja; a: number; b: number; cl: boolean; cr: boolean; carril: number }
interface Aviso { texto: string; deshacer?: () => void }

export interface CalendarioV6Props {
  tasks: Task[];
  es: boolean;
  cal: Calendario;
  festivos?: { date: string; name: string }[];
  /** una fecha del periodo a la vista (la lleva la app) */
  ancla: Date;
  onAncla: (d: Date) => void;
  vista: VistaCalendarioV6;
  onVista: (v: VistaCalendarioV6) => void;
  filtros: FiltrosTableroV6;
  onFiltros: (f: FiltrosTableroV6) => void;
  tarifaDe: (hoja: Task) => number;
  conCosto?: boolean;
  monedaCodigo?: string;
  nombreProyecto?: string;
  onAbrir?: (t: Task) => void;
  /** R6 · abrir un riesgo desde la ficha de la tarea */
  onVerRiesgo?: (id: string) => void;
  /** reprogramar arrastrando una barra; `false` si no se pudo */
  onReprogramar?: (t: Task, inicio: Date, fin: Date) => boolean | void | Promise<boolean | void>;
  hoy?: Date;
}

export function CalendarioV6({
  tasks, es, cal, festivos = [], ancla, onAncla, vista, onVista, filtros, onFiltros, tarifaDe, conCosto = true, monedaCodigo,
  nombreProyecto, onAbrir, onVerRiesgo, onReprogramar, hoy: hoyProp,
}: CalendarioV6Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  const hoy = useMemo(() => hoyProp ?? new Date(), [hoyProp]);
  const hoyN = dn(hoy);
  const festivoDe = useMemo(() => new Map(festivos.map((f) => [f.date, f.name])), [festivos]);
  const fecha = (n: number) => fechaCorta(deDn(n), idioma, hoy);

  /* las hojas con sus fechas (sólo fin o sólo inicio: un día) */
  const { hojas, porId } = useMemo(() => {
    const hojas: Hoja[] = [];
    const porId = new Map<string, { t: Task; wbs: string }>();
    const recorrer = (ts: Task[], prefijo: string, ruta: string[]) => {
      ts.forEach((t, i) => {
        const wbs = (t as { wbsCode?: string }).wbsCode || (prefijo ? `${prefijo}.${i + 1}` : String(i + 1));
        porId.set(t.id, { t, wbs });
        if (tieneHijas(t)) { recorrer(t.subtasks!, wbs, [...ruta, t.name]); return; }
        const ini = t.startDate ?? t.endDate; const fin = t.endDate ?? t.startDate;
        if (!ini || !fin) return;
        const s = dn(new Date(ini)); const e = Math.max(s, dn(new Date(fin)));
        hojas.push({ t, wbs, ruta: [nombreProyecto, ...ruta].filter(Boolean).join(' › '), s, e, estado: estadoDeHoja(t) });
      });
    };
    recorrer(tasks, '', []);
    return { hojas, porId };
  }, [tasks, nombreProyecto]);

  const pasa = (h: Hoja) => {
    if (filtros.vencidas && !estaVencida(h.t, hoy)) return false;
    if (filtros.bloqueadas && h.estado !== 'blocked') return false;
    if (filtros.responsables.length && !filtros.responsables.includes(claveDe(responsableDe(h.t)))) return false;
    return true;
  };
  const filtradas = hojas.filter(pasa);
  const aLaVista = filtradas.filter((h) => vista.mostrarHechas || h.estado !== 'done');
  const vencida = (h: Hoja) => estaVencida(h.t, hoy);
  /* vencidas primero; luego las que terminan más tarde: así una barra conserva su carril de una semana a otra */
  const ordenar = (a: Hoja, b: Hoja) => (Number(vencida(b)) - Number(vencida(a))) || b.e - a.e || a.s - b.s
    || a.wbs.localeCompare(b.wbs, undefined, { numeric: true });

  /* el periodo */
  const mes = vista.escala === 'mes';
  const anclaN = dn(ancla);
  const primero = mes ? dn(new Date(ancla.getFullYear(), ancla.getMonth(), 1)) : lunesDe(anclaN);
  const ultimo = mes ? dn(new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0)) : lunesDe(anclaN) + 6;
  const semanas: number[] = [];
  for (let w = lunesDe(primero); w <= ultimo; w += 7) semanas.push(w);
  const cols = vista.finesDeSemana ? 7 : 5;
  const titulo = mes
    ? `${MESES[idioma][ancla.getMonth()]} ${ancla.getFullYear()}`
    : (() => {
      const a = deDn(primero); const b = deDn(ultimo);
      return a.getMonth() === b.getMonth()
        ? `${a.getDate()} – ${b.getDate()} ${MESES[idioma][b.getMonth()]!.slice(0, 3)} ${b.getFullYear()}`
        : `${a.getDate()} ${MESES[idioma][a.getMonth()]!.slice(0, 3)} – ${b.getDate()} ${MESES[idioma][b.getMonth()]!.slice(0, 3)} ${b.getFullYear()}`;
    })();
  const desde = mes ? lunesDe(primero) : primero;
  const hasta = mes ? lunesDe(ultimo) + 6 : ultimo;
  const enPeriodo = (h: Hoja) => h.e >= desde && h.s <= hasta;
  const delPeriodo = filtradas.filter(enPeriodo);
  const abiertasPeriodo = delPeriodo.filter((h) => h.estado !== 'done').length;
  const hechasPeriodo = delPeriodo.length - abiertasPeriodo;
  const vencidas = filtradas.filter(vencida).sort((a, b) => a.e - b.e);
  const todasVencidas = hojas.filter(vencida);

  /* horas planeadas de una hoja en un día (las estimadas repartidas en sus días hábiles) */
  const horasDelDia = (h: Hoja, d: number) => {
    if (d < h.s || d > h.e || !cal.esHabil(deDn(d))) return 0;
    const est = ((h.t as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
    return est / Math.max(1, duracionHabil(h.t, cal) ?? 1);
  };

  /* fichas y listas que flotan */
  const raiz = useRef<HTMLElement>(null);
  const [ficha, setFicha] = useState<{ id: string; x: number; y: number; abajo: number } | null>(null);
  const [lista, setLista] = useState<{ d: number; ids: string[]; x: number; y: number } | null>(null);
  const abridor = useRef<HTMLElement | null>(null);
  /* las coordenadas, respecto a la tarjeta del calendario (que es `position: relative`) */
  const junto = (el: HTMLElement) => {
    const r = el.getBoundingClientRect(); const c = raiz.current?.getBoundingClientRect();
    return { x: r.left - (c?.left ?? 0), y: r.bottom - (c?.top ?? 0) + 6, ancho: c?.width ?? 1200 };
  };
  const abrirFicha = (h: Hoja, el: HTMLElement) => {
    const j = junto(el);
    abridor.current = el;
    setLista(null);
    setFicha({ id: h.t.id, x: j.x, y: j.y, abajo: j.ancho });
  };
  const cerrar = (volver = false) => { setFicha(null); setLista(null); if (volver) abridor.current?.focus(); };
  useEffect(() => {
    if (!ficha && !lista) return;
    const fuera = (ev: MouseEvent) => { if (!(ev.target as HTMLElement).closest?.('.cv-ficha, .cv-pop, .cbar, .cmore, .lr-it, .witem')) cerrar(); };
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.preventDefault(); cerrar(true); } };
    const mover = () => cerrar();
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', mover);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); window.removeEventListener('resize', mover); };
  }, [ficha, lista]);
  useEffect(() => { cerrar(); }, [primero, vista.escala]); // eslint-disable-line react-hooks/exhaustive-deps

  /* avisos */
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisar = (a: Aviso) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso(a);
    temporizador.current = setTimeout(() => setAviso(null), a.deshacer ? 9000 : 6000);
  };
  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  /* reprogramar arrastrando: se cuenta el día de la semana donde se tomó y donde se soltó */
  const arrastre = useRef<{ h: Hoja; dia: number } | null>(null);
  const diaBajo = (ev: DragEvent, semana: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((ev.clientX - r.left) / r.width) * cols)));
    return semana + col;
  };
  const reprogramar = async (h: Hoja, delta: number) => {
    if (!onReprogramar || !delta) return;
    const ini = deDn(h.s + delta); const fin = deDn(h.e + delta);
    const antes = `${fecha(h.s)} – ${fecha(h.e)}`; const despues = `${fecha(h.s + delta)} – ${fecha(h.e + delta)}`;
    const ok = await onReprogramar(h.t, ini, fin);
    if (ok === false) return;
    avisar({
      texto: x.reprogramada(h.t.name, antes, despues),
      deshacer: () => { void Promise.resolve(onReprogramar(h.t, deDn(h.s), deDn(h.e))).then((b) => { if (b !== false) avisar({ texto: x.deshecho(h.t.name) }); }); },
    });
  };

  /* ── piezas ── */
  const avatar = (p?: Persona) => (p
    ? <span className="avatar" role="img" title={p.name} aria-label={p.name}>{p.initials || (p.name ?? '?').slice(0, 2).toUpperCase()}</span>
    : <span className="avatar none" role="img" title={x.sinResp} aria-label={x.sinResp}>+</span>);
  const etiqueta = (h: Hoja) => `${h.wbs} ${h.t.name}, ${fecha(h.s)}–${fecha(h.e)}, ${x.st[h.estado]}${vencida(h) ? `, ${x.retraso(diasDeRetraso(h.t, hoy, cal))}` : ''}`;

  const diaCelda = (d: number, i: number) => {
    const fuera = mes && (d < primero || d > ultimo);
    const finde = dowL(d) >= 5;
    const fest = vista.festivos ? festivoDe.get(claveDn(d)) : undefined;
    const fecha_ = deDn(d);
    return (
      <div key={d} className={`day${fuera ? ' other' : ''}${finde ? ' we' : ''}${fest ? ' hol' : ''}${d === hoyN ? ' today' : ''}`} style={{ gridColumn: i + 1 }}>
        <span className="n" aria-hidden="true">{fecha_.getDate()}</span>
        <span className="sr">{`${DIAS_LARGOS[idioma][dowL(d)]} ${fecha_.getDate()} ${MESES[idioma][fecha_.getMonth()]}`}{d === hoyN ? ` · ${x.lHoy}` : ''}</span>
        {fest && <span className="hn" title={fest}>{fest}</span>}
      </div>
    );
  };

  const barra = (sg: Seg, semana: number) => {
    const { h } = sg;
    const pct = Math.round(h.t.progress ?? 0);
    const venc = vencida(h);
    let relleno = 0;
    if (h.estado !== 'done' && pct > 0 && !h.t.isMilestone) {
      const total = h.e - h.s + 1;
      const hasta = h.s + (total * pct) / 100;
      relleno = Math.min(1, Math.max(0, (hasta - sg.a) / (sg.b - sg.a + 1)));
    }
    return (
      <button key={`${h.t.id}-${semana}`} type="button" className={`cbar ${h.estado}${sg.cl ? ' cl' : ''}${sg.cr ? ' cr' : ''}${h.t.isMilestone ? ' ms' : ''}`}
        style={{ gridColumn: `${sg.a - semana + 1} / ${sg.b - semana + 2}`, gridRow: sg.carril + 2 }}
        data-id={h.t.id} aria-label={etiqueta(h)} title={`${h.wbs} ${h.t.name} · ${fecha(h.s)}–${fecha(h.e)} · ${x.st[h.estado]}`}
        draggable={!!onReprogramar}
        onDragStart={(ev) => {
          const wk = (ev.currentTarget as HTMLElement).closest('.wk') as HTMLElement | null;
          if (!wk) return;
          ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', h.t.id);
          arrastre.current = { h, dia: diaBajo(ev, semana, wk) };
        }}
        onDragEnd={() => { arrastre.current = null; }}
        onClick={(ev) => abrirFicha(h, ev.currentTarget)}>
        {h.estado === 'done' && <span className="ok" aria-hidden="true">✓</span>}
        {h.t.isMilestone && <i className="diamond" aria-hidden="true" />}
        <span className="w">{h.wbs}</span>
        <span className="nm">{h.t.name}</span>
        {h.estado === 'blocked' && <span className="warn" aria-hidden="true"><Advertencia /></span>}
        {!sg.cr && venc && <span className="chip-red">{fecha(h.e)}</span>}
        {relleno > 0 && <span className="pf" style={{ width: `${relleno * 100}%` }} aria-hidden="true" />}
      </button>
    );
  };

  const semanaDelMes = (semana: number) => {
    const fin = semana + cols - 1;
    const segs: Seg[] = aLaVista.filter((h) => h.e >= semana && h.s <= fin)
      .sort((a, b) => (Number(vencida(b)) - Number(vencida(a))) || Math.max(a.s, semana) - Math.max(b.s, semana) || ordenar(a, b)).map((h) => ({
      h, a: Math.max(h.s, semana), b: Math.min(h.e, fin), cl: h.s < semana, cr: h.e > fin, carril: 0,
    })).filter((sg) => sg.a <= sg.b);
    /* carriles: cada barra en el primero que tenga libres sus días */
    const ocupado: number[][] = [];
    for (const sg of segs) {
      let c = 0;
      while (ocupado[c]?.some((d) => d >= sg.a && d <= sg.b)) c += 1;
      (ocupado[c] ??= []).push(...Array.from({ length: sg.b - sg.a + 1 }, (_, k) => sg.a + k));
      sg.carril = c;
    }
    const MAX = 3;
    const visibles = ocupado.length <= MAX + 1 ? ocupado.length : MAX;
    const escondidas = new Map<number, string[]>();
    for (const sg of segs) if (sg.carril >= visibles) for (let d = sg.a; d <= sg.b; d += 1) escondidas.set(d, [...(escondidas.get(d) ?? []), sg.h.t.id]);
    const filas = Math.max(3, visibles);
    const dias = Array.from({ length: cols }, (_, i) => semana + i);
    return (
      <div key={semana} className="wk" style={{ gridTemplateRows: `28px repeat(${filas}, 24px) ${escondidas.size ? 24 : 0}px 6px`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        onDragOver={(ev) => { if (arrastre.current) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } }}
        onDrop={(ev) => {
          const a = arrastre.current;
          arrastre.current = null;
          if (!a) return;
          ev.preventDefault();
          void reprogramar(a.h, diaBajo(ev, semana, ev.currentTarget) - a.dia);
        }}>
        {dias.map(diaCelda)}
        {segs.filter((sg) => sg.carril < visibles).map((sg) => barra(sg, semana))}
        {[...escondidas].map(([d, ids]) => {
          const etiquetaDia = `${deDn(d).getDate()} ${MESES[idioma][deDn(d).getMonth()]!.slice(0, 3)}`;
          return (
            <button key={`m${d}`} type="button" className="cmore" style={{ gridColumn: d - semana + 1, gridRow: visibles + 2 }}
              onClick={(ev) => {
                const j = junto(ev.currentTarget);
                abridor.current = ev.currentTarget;
                setFicha(null);
                setLista({ d, ids: aLaVista.filter((h) => h.s <= d && h.e >= d).sort(ordenar).map((h) => h.t.id), x: j.x, y: j.y });
              }}
              aria-label={`${x.mas(ids.length)} · ${x.tareasDel(etiquetaDia)}`}>{x.mas(ids.length)}</button>
          );
        })}
      </div>
    );
  };

  const diaDeLaSemana = (d: number) => {
    const finde = dowL(d) >= 5;
    const fest = vista.festivos ? festivoDe.get(claveDn(d)) : undefined;
    const del = aLaVista.filter((h) => h.s <= d && h.e >= d).sort(ordenar);
    const tot = del.reduce((a, h) => a + horasDelDia(h, d), 0);
    const f = deDn(d);
    return (
      <div key={d} className={`wday${finde ? ' we' : ''}${fest ? ' hol' : ''}${d === hoyN ? ' today' : ''}`}>
        <h3 className="wd-h">
          <span className="dn" aria-hidden="true">{DIAS[idioma][dowL(d)]}</span>
          <span className="n" aria-hidden="true">{f.getDate()}</span>
          <span className="sr">{`${DIAS_LARGOS[idioma][dowL(d)]} ${f.getDate()} ${MESES[idioma][f.getMonth()]}`}</span>
          {fest && <span className="hn" title={fest}>{fest}</span>}
          {tot > 0 && <span className="tot" title={x.horasDia}>{horasCortas(tot, es)} h</span>}
        </h3>
        {del.length ? (
          <ul className="wlist">
            {del.map((h) => {
              const p = responsableDe(h.t);
              const hd = horasDelDia(h, d);
              const pct = Math.round(h.t.progress ?? 0);
              return (
                <li key={h.t.id}>
                  <button type="button" className={`witem ${h.estado}${h.t.isMilestone ? ' ms' : ''}`} data-id={h.t.id} aria-label={etiqueta(h)}
                    onClick={(ev) => abrirFicha(h, ev.currentTarget)}>
                    <span className="top">
                      {h.estado === 'done' && <span className="ok" aria-hidden="true">✓</span>}
                      {h.estado === 'blocked' && <span className="warn" aria-hidden="true"><Advertencia /></span>}
                      <span className="w">{h.wbs}</span><span className="nm">{h.t.name}</span>
                    </span>
                    <span className="bot">
                      {avatar(p)}<span className="who">{p?.name ?? x.sinResp}</span>
                      {vencida(h) && <span className="chip-red">{fecha(h.e)}</span>}
                      {h.estado === 'prog' && <span className="pct on">{pct}%</span>}
                      {hd > 0 && <span className="h">{horasCortas(hd, es)} h</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="wnone">{vista.mostrarHechas ? x.sinTareas : x.sinAbiertas}</p>}
      </div>
    );
  };

  /* la ficha */
  const fichaDe = (id: string) => {
    const h = hojas.find((k) => k.t.id === id);
    if (!h) return null;
    const p = responsableDe(h.t);
    const pct = Math.round(h.t.progress ?? 0);
    const dur = duracionHabil(h.t, cal);
    const est = ((h.t as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
    const reg = ((h.t as { timeLoggedMinutes?: number }).timeLoggedMinutes ?? 0) / 60;
    const deps = (h.t.dependencies ?? []).map((d) => porId.get(d)).filter((d): d is { t: Task; wbs: string } => !!d);
    const espera = h.estado === 'blocked' ? deps.find((d) => estadoDe(d.t) !== 'done') : undefined;
    const riesgo = h.t.riesgos?.length ? riesgoMayor(h.t.riesgos) : undefined;
    return (
      <div className="cv-ficha" role="dialog" aria-labelledby={`cv-f-${id}`}>
        <div className="fi-top">
          <span className="mono">{h.wbs}</span>
          <button type="button" className="icon-btn" aria-label={x.cerrar} onClick={() => cerrar(true)}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        <h3 id={`cv-f-${id}`}>{h.t.name}</h3>
        <div className="fi-crumb">{h.ruta}</div>
        <div className="fi-state">
          <span className={`schip ${h.estado}`}><i aria-hidden="true" />{x.st[h.estado]}</span>
          {vencida(h) && <span className="fi-late">{x.retraso(diasDeRetraso(h.t, hoy, cal))}</span>}
          {espera && <span className="fi-warn"><Advertencia />{x.espera} <span className="mono">{espera.wbs}</span></span>}
          {riesgo && (
            <button type="button" className="fi-risk" disabled={!onVerRiesgo} onClick={() => { cerrar(); onVerRiesgo?.(riesgo.id); }}>
              <PuntoDeNivelDeRiesgo nivel={riesgo.nivel} />{x.riesgo} {nombreDeNivel(riesgo.nivel, es).toLowerCase()} · {riesgo.codigo}
            </button>
          )}
        </div>
        <dl className="fi-f">
          <dt>{x.fechas}</dt>
          <dd>{h.t.isMilestone ? <span className="mono">{x.hito} · {fecha(h.e)}</span> : <>
            <span className="mono">{fecha(h.s)} –</span>{vencida(h) ? <span className="chip-red">{fecha(h.e)}</span> : <span className="mono">{fecha(h.e)}</span>}
          </>}</dd>
          {!h.t.isMilestone && <>
            <dt>{x.dur}</dt>
            <dd><span className="mono">{dur == null ? '—' : x.dias(dur)}</span>{est > 0 && dur ? <span className="muted">{x.alDia(horasCortas(est / dur, es))}</span> : null}</dd>
            <dt>{x.avance}</dt>
            <dd><span className="pbar" aria-hidden="true"><b style={{ width: `${Math.min(100, pct)}%` }} /></span><span className={`pct${pct ? ' on' : ' zero'}`}>{pct}%</span></dd>
          </>}
          <dt>{x.resp}</dt>
          <dd>{avatar(p)}{p?.name ? <span>{p.name}</span> : <span className="muted">{x.sinResp}</span>}</dd>
          {!h.t.isMilestone && <>
            <dt>{x.horas}</dt>
            <dd><span className="mono">{horasCortas(reg, es)} / {horasCortas(est, es)} h</span><span className="muted">{x.registradas}</span></dd>
          </>}
          {deps.length > 0 && <>
            <dt>{x.dep}</dt>
            <dd><span className="mono">{deps[0]!.wbs}</span>{deps[0]!.t.name}</dd>
          </>}
        </dl>
        {onAbrir && (
          <div className="fi-act">
            <button type="button" className="cv-btn" onClick={() => { cerrar(); onAbrir(h.t); }}>{x.abrirFicha}</button>
          </div>
        )}
      </div>
    );
  };

  /* resumen y filtros */
  const chips: [string, string, () => void][] = [];
  if (filtros.vencidas) chips.push(['v', x.soloVencidas, () => onFiltros({ ...filtros, vencidas: false })]);
  if (filtros.bloqueadas) chips.push(['b', x.soloBloqueadas, () => onFiltros({ ...filtros, bloqueadas: false })]);
  if (filtros.responsables.length) {
    const nombres = new Map(hojas.map((h) => [claveDe(responsableDe(h.t)), responsableDe(h.t)?.name ?? x.sinResp]));
    chips.push(['r', `${x.responsable}: ${filtros.responsables.map((k) => nombres.get(k) ?? x.sinResp).join(', ')}`, () => onFiltros({ ...filtros, responsables: [] })]);
  }
  /* C1 · «Ver» lleva al mes de la vencida más reciente si en este periodo no hay ninguna */
  const verVencidas = () => {
    onFiltros({ ...filtros, vencidas: true });
    if (!todasVencidas.some(enPeriodo) && todasVencidas.length) {
      const ultima = Math.max(...todasVencidas.map((h) => h.e));
      onAncla(deDn(ultima));
    }
  };

  /* recursos del periodo */
  const recursos = useMemo(() => {
    const m = new Map<string, { p?: Persona; n: number; h: number; c: number }>();
    for (const h of aLaVista) {
      if (!(h.e >= primero && h.s <= ultimo)) continue;
      const k = claveDe(responsableDe(h.t));
      let horas = 0;
      for (let d = Math.max(h.s, primero); d <= Math.min(h.e, ultimo); d += 1) horas += horasDelDia(h, d);
      const r = m.get(k) ?? { p: responsableDe(h.t), n: 0, h: 0, c: 0 };
      r.n += 1; r.h += horas; r.c += horas * (tarifaDe(h.t) || 0);
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => Number(!a.p) - Number(!b.p) || b.h - a.h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aLaVista, primero, ultimo, tarifaDe]);

  const popPos = (px: number, py: number, ancho: number): React.CSSProperties => ({
    position: 'absolute', zIndex: 60, top: py,
    left: Math.max(8, Math.min(px, (raiz.current?.clientWidth ?? 1200) - ancho - 12)),
  });

  return (
    <section ref={raiz} className={`lista-v6 calendario-v6${vista.festivos ? '' : ' nohol'}`} aria-label={x.calendario}>
      <style>{CSS_V6 + CSS_CALENDARIO_V6}</style>
      <p id="cv-ayuda" className="sr">{x.ayuda}</p>
      <div className="cv-head">
        <h2 className="cv-title">{titulo}</h2>
        <div className="cv-sum">
          <span className="mono">{abiertasPeriodo}</span> {x.tareas(abiertasPeriodo)} {mes ? x.enElMes : x.enLaSemana}
          <span className="sep" aria-hidden="true">·</span>
          {hechasPeriodo ? <>
            <span className="mono">{hechasPeriodo}</span> {x.completadaN(hechasPeriodo)} {vista.mostrarHechas ? x.aLaVista : x.oculta(hechasPeriodo)}{' '}
            <a href="#" onClick={(ev) => { ev.preventDefault(); onVista({ ...vista, mostrarHechas: !vista.mostrarHechas }); }}>{vista.mostrarHechas ? x.ocultar : x.mostrar}</a>
          </> : x.ningunaHecha}
          <span className="sep" aria-hidden="true">·</span>
          {todasVencidas.length ? <>
            <span className="red"><span className="mono">{todasVencidas.length}</span> {x.vencidaN(todasVencidas.length)}</span>{' '}
            {!filtros.vencidas && <a href="#" className="red" onClick={(ev) => { ev.preventDefault(); verVencidas(); }}>{x.ver}</a>}
          </> : x.ningunaVencida}
          {chips.map(([k, txt, quitar]) => (
            <button key={k} type="button" className="fchip" aria-label={`${x.quitar}: ${txt}`} onClick={quitar}>{x.filtrando} {txt}<span className="x" aria-hidden="true">×</span></button>
          ))}
        </div>
      </div>

      {vencidas.length > 0 && (
        <div className="late-row" role="group" aria-label={`${x.atrasadas}: ${vencidas.length}`}>
          <span className="lr-h" aria-hidden="true">{x.atrasadas} · <span className="mono">{vencidas.length}</span></span>
          {vencidas.map((h) => (
            <button key={h.t.id} type="button" className="lr-it" data-id={h.t.id} aria-label={etiqueta(h)} onClick={(ev) => abrirFicha(h, ev.currentTarget)}>
              <span className="w">{h.wbs}</span><span className="nm">{h.t.name}</span>
              <span className="chip-red">{fecha(h.e)}</span>
              <span className="late">{x.haceHab(diasDeRetraso(h.t, hoy, cal))}</span>
              {avatar(responsableDe(h.t))}
            </button>
          ))}
        </div>
      )}

      <div className="cv-body" aria-describedby="cv-ayuda">
        {mes ? (
          <>
            <div className="dow" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {DIAS[idioma].slice(0, cols).map((d, i) => <div key={d} className={i >= 5 ? 'we' : undefined}>{d}</div>)}
            </div>
            {semanas.map(semanaDelMes)}
          </>
        ) : (
          <div className="wgrid" style={{ gridTemplateColumns: vista.finesDeSemana ? 'repeat(5, minmax(0, 1fr)) repeat(2, minmax(0, .62fr))' : 'repeat(5, minmax(0, 1fr))' }}>
            {Array.from({ length: cols }, (_, i) => primero + i).map(diaDeLaSemana)}
          </div>
        )}
      </div>

      {(conCosto || vista.leyenda) && (
        <div className="vfoot">
          {conCosto && (
            <details className="res">
              <summary><span className="flecha" aria-hidden="true">›</span><b>{x.recursos}</b><span>· {x.personas(recursos.length, mes)}</span></summary>
              <table className="rtab">
                <thead><tr><th scope="col">{x.persona}</th><th scope="col" className="num">{x.tareas(2).replace(/^./, (c) => c.toUpperCase())}</th><th scope="col" className="num">{x.horas}</th><th scope="col" className="num">{x.costo(monedaCodigo ?? '')}</th></tr></thead>
                <tbody>
                  {recursos.length ? recursos.map((r, i) => (
                    <tr key={i}><td>{avatar(r.p)} {r.p?.name ?? x.sinResp}</td><td className="num">{r.n}</td><td className="num">{horasCortas(r.h, es)} h</td><td className="num">{millones(r.c, es)}</td></tr>
                  )) : <tr><td colSpan={4}>{x.sinPeriodo}</td></tr>}
                </tbody>
                {recursos.length > 0 && (
                  <tfoot><tr><td>{x.total}</td><td className="num">{recursos.reduce((a, r) => a + r.n, 0)}</td>
                    <td className="num">{horasCortas(recursos.reduce((a, r) => a + r.h, 0), es)} h</td><td className="num">{millones(recursos.reduce((a, r) => a + r.c, 0), es)}</td></tr></tfoot>
                )}
              </table>
            </details>
          )}
          {vista.leyenda && (
            <div className="leyenda" role="note" aria-label={x.leyenda}>
              <span><span className="lb" aria-hidden="true" /> {x.st.todo}</span>
              <span><span className="lb p" aria-hidden="true" /> {x.st.prog}</span>
              <span><span className="lb d" aria-hidden="true" /> {x.st.done}</span>
              <span><span className="chip-red">{fecha(hoyN)}</span> {x.vencidaN(1)}</span>
              <span className="lw"><Advertencia /> {x.st.blocked}</span>
              <span><span className="lh" aria-hidden="true" /> {x.lFestivo}</span>
              <span><span className="lt" aria-hidden="true">{hoy.getDate()}</span> {x.lHoy}</span>
            </div>
          )}
        </div>
      )}

      {ficha && <div style={popPos(ficha.x, ficha.y, 344)}>{fichaDe(ficha.id)}</div>}
      {lista && (
        <div className="cv-pop" role="dialog" aria-label={x.tareasDel(fecha(lista.d))} style={popPos(lista.x, lista.y, 320)}>
          <h4>{x.tareasDel(fecha(lista.d))} · <span className="mono">{lista.ids.length}</span></h4>
          {lista.ids.map((id) => {
            const h = hojas.find((k) => k.t.id === id);
            if (!h) return null;
            return (
              <button key={id} type="button" className="it" onClick={(ev) => abrirFicha(h, ev.currentTarget)}>
                <span className="mono">{h.wbs}</span><span className="nm">{h.t.name}</span>
                {vencida(h) ? <span className="chip-red">{fecha(h.e)}</span> : <span className="mono">{fecha(h.e)}</span>}
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

export { FILTROS_TABLERO_V6_VACIOS as FILTROS_CALENDARIO_V6_VACIOS };

function Advertencia(): ReactNode {
  return <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M8 2.5 14 13H2L8 2.5Z" /><path d="M8 6.5v3M8 11.2v.1" strokeLinecap="round" /></svg>;
}

/* Las medidas son las de la maqueta; los tokens, los del Gantt v6 (`--v6-*`). */
export const CSS_CALENDARIO_V6 = `
.calendario-v6 .cv-head{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;padding:12px 14px 10px}
.calendario-v6 .cv-title{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--v6-texto);text-wrap:balance}
.calendario-v6 .cv-sum{font-size:11px;color:var(--v6-tenue)}
.calendario-v6 .cv-sum a{color:var(--v6-acento-texto);font-weight:500;text-decoration:underline;text-underline-offset:2px}
.calendario-v6 .cv-sum .sep{margin:0 5px;color:var(--v6-separador)}
.calendario-v6 .cv-sum .red,.calendario-v6 .cv-sum a.red{color:var(--v6-rojo)}
.calendario-v6 .fchip{height:20px;display:inline-flex;align-items:center;gap:4px;padding:0 3px 0 8px;margin-left:6px;border-radius:999px;border:1px solid var(--v6-acento);background:var(--v6-fila-seleccionada);color:var(--v6-texto);font:inherit;font-size:11px;font-weight:500;cursor:pointer}
.calendario-v6 .fchip .x{width:16px;height:16px;border-radius:50%;display:grid;place-items:center;color:var(--v6-texto-2)}
.calendario-v6 .late-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--v6-linea)}
.calendario-v6 .lr-h{font-size:11px;font-weight:500;color:var(--v6-rojo);margin-right:2px;white-space:nowrap}
.calendario-v6 .lr-it{height:30px;display:inline-flex;align-items:center;gap:6px;padding:0 6px 0 8px;border:1px solid var(--v6-borde);border-radius:8px;background:var(--v6-tarjeta);font:inherit;font-size:12px;color:var(--v6-texto);max-width:380px;min-width:0;cursor:pointer}
.calendario-v6 .lr-it:hover{background:var(--v6-fila-hover)}
.calendario-v6 .lr-it .w{font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue);flex:none}
.calendario-v6 .lr-it .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.calendario-v6 .lr-it .late{font-size:11px;color:var(--v6-tenue);white-space:nowrap;flex:none}
.calendario-v6 .lr-it .chip-red,.calendario-v6 .lr-it .avatar{flex:none}
.calendario-v6 .cv-body{overflow:auto;max-height:calc(100vh - 300px);min-height:420px}
.calendario-v6 .dow{display:grid;border-top:1px solid var(--v6-linea);position:sticky;top:0;z-index:3;background:var(--v6-tarjeta)}
.calendario-v6 .dow div{height:28px;display:flex;align-items:center;padding:0 10px;font-size:11px;font-weight:500;color:var(--v6-tenue);min-width:0;overflow:hidden}
.calendario-v6 .wk{display:grid;border-top:1px solid var(--v6-linea)}
.calendario-v6 .day{grid-row:1/-1;border-left:1px solid var(--v6-linea);padding:6px 8px 0;display:flex;align-items:flex-start;gap:6px;min-width:0;overflow:hidden}
.calendario-v6 .day:first-child{border-left:0}
.calendario-v6 .day .n,.calendario-v6 .wd-h .n{font-size:12px;font-weight:500;min-width:22px;height:20px;padding:0 4px;box-sizing:border-box;display:grid;place-items:center;border-radius:999px;margin:-2px 0 0 -4px;flex:none;color:var(--v6-texto)}
.calendario-v6 .day.other .n{color:var(--v6-tenue)}
.calendario-v6 .day.we,.calendario-v6 .wday.we{background:var(--v6-finde)}
.calendario-v6 .day.hol,.calendario-v6 .wday.hol{background-color:var(--v6-finde);background-image:repeating-linear-gradient(135deg,var(--v6-festivo-trama) 0 1px,transparent 1px 6px)}
.calendario-v6.nohol .day.hol,.calendario-v6.nohol .wday.hol{background-image:none}
.calendario-v6 .hn{font-size:11px;color:var(--v6-tenue);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.calendario-v6 .day.today .n,.calendario-v6 .wday.today .wd-h .n{background:var(--v6-hoy-fondo);color:var(--v6-hoy-texto);font-weight:600}
.calendario-v6 .cbar{position:relative;height:20px;margin:2px 3px;border:1px solid var(--v6-acento-borde);background:var(--v6-acento-fondo);border-radius:6px;display:flex;align-items:center;gap:6px;padding:0 6px;font:500 12px/1 inherit;font-family:inherit;color:var(--v6-texto);text-align:left;min-width:0;overflow:hidden;cursor:pointer;z-index:1;box-sizing:border-box}
.calendario-v6 .cbar:hover,.calendario-v6 .cbar:focus-visible{border-color:var(--v6-acento-texto);outline:none}
.calendario-v6 .cbar:focus-visible{box-shadow:0 0 0 2px var(--v6-acento-texto)}
.calendario-v6 .cbar.prog{background:var(--v6-acento-fondo-2)}
.calendario-v6 .cbar .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.calendario-v6 .cbar .w{font:400 11px 'Geist Mono',monospace;color:var(--v6-texto-2);flex:none}
.calendario-v6 .cbar .pf{position:absolute;left:0;bottom:0;height:3px;background:var(--v6-acento)}
.calendario-v6 .cbar.cl{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0;margin-left:0}
.calendario-v6 .cbar.cr{border-right:0;border-top-right-radius:0;border-bottom-right-radius:0;margin-right:0}
.calendario-v6 .cbar.done{background:var(--v6-linea);border-color:var(--v6-separador);color:var(--v6-texto-2)}
.calendario-v6 .cbar .ok{color:var(--v6-tenue);flex:none;font-size:11px}
.calendario-v6 .cbar .chip-red{height:16px;padding:0 5px;font-size:11px;flex:none;border-radius:6px;background-color:var(--v6-tarjeta);background-image:linear-gradient(var(--v6-rojo-fondo),var(--v6-rojo-fondo))}
.calendario-v6 .warn{color:var(--v6-ambar);flex:none;display:inline-flex}
.calendario-v6 .cbar.ms{border:0;background:none;padding:0 4px}
.calendario-v6 .diamond{width:9px;height:9px;background:var(--v6-texto-2);transform:rotate(45deg);border-radius:1.5px;display:inline-block;flex:none}
.calendario-v6 .cmore{height:24px;align-self:center;justify-self:start;font:inherit;font-size:11px;font-weight:500;color:var(--v6-acento-texto);padding:0 8px;margin-left:3px;border-radius:6px;z-index:1;white-space:nowrap;border:0;background:transparent;cursor:pointer}
.calendario-v6 .cmore:hover{background:var(--v6-fila-hover);text-decoration:underline}
.calendario-v6 .wgrid{display:grid;border-top:1px solid var(--v6-linea)}
.calendario-v6 .wday{border-left:1px solid var(--v6-linea);min-height:380px;padding:8px 8px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.calendario-v6 .wday:first-child{border-left:0}
.calendario-v6 .wd-h{margin:0;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;min-height:24px;flex-wrap:wrap;color:var(--v6-texto)}
.calendario-v6 .wd-h .dn{font-size:11px;color:var(--v6-tenue);font-weight:500}
.calendario-v6 .wd-h .tot{margin-left:auto;font:400 11px 'Geist Mono',monospace;color:var(--v6-tenue);white-space:nowrap}
.calendario-v6 .wlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.calendario-v6 .witem{width:100%;box-sizing:border-box;text-align:left;border:1px solid var(--v6-acento-borde);background:var(--v6-acento-fondo);border-radius:8px;padding:6px 8px 7px;display:flex;flex-direction:column;gap:5px;color:var(--v6-texto);font:inherit;cursor:pointer}
.calendario-v6 .witem:hover{border-color:var(--v6-acento-texto)}
.calendario-v6 .witem.prog{background:var(--v6-acento-fondo-2)}
.calendario-v6 .witem.done{background:var(--v6-linea);border-color:var(--v6-separador);color:var(--v6-texto-2)}
.calendario-v6 .witem.ms{background:var(--v6-tarjeta);border-color:var(--v6-borde)}
.calendario-v6 .witem .top{display:flex;gap:6px;align-items:baseline;min-width:0}
.calendario-v6 .witem .w{font:400 11px 'Geist Mono',monospace;color:var(--v6-texto-2);flex:none}
.calendario-v6 .witem .ok{color:var(--v6-tenue);font-size:11px}
.calendario-v6 .witem .nm{font-size:12px;font-weight:500;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-width:0}
.calendario-v6 .witem .bot{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--v6-texto-2);min-width:0;flex-wrap:wrap}
.calendario-v6 .witem .who{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.calendario-v6 .witem .h{margin-left:auto;font:400 11px 'Geist Mono',monospace;color:var(--v6-texto-2);white-space:nowrap}
.calendario-v6 .witem .chip-red{height:18px;padding:0 5px}
.calendario-v6 .witem .pct{font-size:11px}
.calendario-v6 .wnone{font-size:11px;color:var(--v6-tenue);margin:2px 0 0;font-weight:500}
.calendario-v6 .cv-ficha,.calendario-v6 .cv-pop{z-index:60;background:var(--v6-tarjeta);border:1px solid var(--v6-borde);border-radius:12px;box-shadow:0 12px 32px -8px rgba(14,17,20,.22);color:var(--v6-texto)}
.calendario-v6 .cv-ficha{width:344px;box-sizing:border-box;padding:10px 14px 12px}
.calendario-v6 .fi-top{display:flex;align-items:center;gap:8px;min-height:28px}
.calendario-v6 .fi-top .mono{font-size:11px;color:var(--v6-tenue)}
.calendario-v6 .icon-btn{margin-left:auto;margin-right:-6px;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--v6-texto-2);border:0;background:transparent;cursor:pointer}
.calendario-v6 .icon-btn:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.calendario-v6 .cv-ficha h3{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;line-height:1.3}
.calendario-v6 .fi-crumb{font-size:11px;color:var(--v6-tenue);margin:3px 0 10px}
.calendario-v6 .fi-state{display:flex;gap:8px 10px;flex-wrap:wrap;align-items:center;margin-bottom:6px}
.calendario-v6 .fi-late{color:var(--v6-rojo);font-size:12px;font-weight:500}
.calendario-v6 .fi-risk{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;padding:0;font:inherit;font-size:12px;color:var(--v6-texto-2);cursor:pointer}
.calendario-v6 .fi-risk:hover:not(:disabled){color:var(--v6-texto);text-decoration:underline}
.calendario-v6 .fi-warn{display:inline-flex;align-items:center;gap:5px;color:var(--v6-ambar);font-size:11px;font-weight:500}
.calendario-v6 .fi-f{display:grid;grid-template-columns:92px 1fr;margin:0}
.calendario-v6 .fi-f dt{font-size:11px;font-weight:500;color:var(--v6-tenue);min-height:28px;display:flex;align-items:center}
.calendario-v6 .fi-f dd{margin:0;min-height:28px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px}
.calendario-v6 .fi-f .mono{font-size:12px;color:var(--v6-texto-2)}
.calendario-v6 .fi-f .muted{font-size:12px;color:var(--v6-tenue)}
.calendario-v6 .pbar{width:96px;height:4px;border-radius:2px;background:var(--v6-pista);overflow:hidden;display:block}
.calendario-v6 .pbar b{display:block;height:100%;background:var(--v6-acento);border-radius:2px}
.calendario-v6 .fi-act{display:flex;justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px solid var(--v6-linea)}
.calendario-v6 .cv-btn{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--v6-borde);background:var(--v6-tarjeta);color:var(--v6-texto);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.calendario-v6 .cv-btn:hover{background:var(--v6-fila-hover)}
.calendario-v6 .cv-pop{width:320px;box-sizing:border-box;padding:8px}
.calendario-v6 .cv-pop h4{margin:4px 6px 6px;font-size:12px;font-weight:600}
.calendario-v6 .cv-pop .it{width:100%;display:flex;align-items:center;gap:8px;height:32px;padding:0 6px;border-radius:6px;text-align:left;color:var(--v6-texto);border:0;background:transparent;font:inherit;font-size:12px;cursor:pointer}
.calendario-v6 .cv-pop .it:hover{background:var(--v6-fila-hover)}
.calendario-v6 .cv-pop .it .mono{font-size:11px;color:var(--v6-tenue)}
.calendario-v6 .cv-pop .it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calendario-v6 .vfoot{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0 12px;min-height:38px;padding:0 14px;border-top:1px solid var(--v6-linea);font-size:12px;color:var(--v6-tenue)}
.calendario-v6 .res{flex:1 1 540px;min-width:0}
.calendario-v6 .res summary{list-style:none;display:flex;align-items:center;gap:6px;min-height:38px;cursor:pointer;user-select:none}
.calendario-v6 .res summary::-webkit-details-marker{display:none}
.calendario-v6 .res summary b{color:var(--v6-texto-2);font-weight:500}
.calendario-v6 .res .flecha{display:inline-block;font-size:10px;transition:transform .15s}
.calendario-v6 .res[open] .flecha{transform:rotate(90deg)}
.calendario-v6 .rtab{border-collapse:collapse;margin:0 0 12px 22px;font-size:12px;color:var(--v6-texto-2)}
.calendario-v6 .rtab th{font-size:11px;font-weight:500;color:var(--v6-tenue);text-align:left;padding:4px 14px 4px 0;white-space:nowrap}
.calendario-v6 .rtab td{padding:5px 14px 5px 0;border-top:1px solid var(--v6-linea);white-space:nowrap}
.calendario-v6 .rtab td .avatar{width:20px;height:20px;font-size:10px;margin-right:4px;vertical-align:middle}
.calendario-v6 .rtab .num{text-align:right;font-family:'Geist Mono',monospace;font-variant-numeric:tabular-nums}
.calendario-v6 .rtab th.num{font-family:inherit}
.calendario-v6 .rtab tfoot td{color:var(--v6-texto);font-weight:600}
.calendario-v6 .leyenda{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:11px;color:var(--v6-tenue);min-height:38px;justify-content:flex-end;margin-left:auto}
.calendario-v6 .leyenda>span{display:inline-flex;align-items:center;gap:6px}
.calendario-v6 .leyenda .lb{display:inline-block;width:22px;height:12px;border-radius:4px;border:1px solid var(--v6-acento-borde);background:var(--v6-acento-fondo)}
.calendario-v6 .leyenda .lb.p{background:var(--v6-acento-fondo-2);box-shadow:inset 0 -3px 0 var(--v6-acento)}
.calendario-v6 .leyenda .lb.d{background:var(--v6-linea);border-color:var(--v6-separador)}
.calendario-v6 .leyenda .lh{display:inline-block;width:14px;height:12px;border-radius:3px;background-color:var(--v6-finde);background-image:repeating-linear-gradient(135deg,var(--v6-festivo-trama) 0 1px,transparent 1px 5px);border:1px solid var(--v6-linea)}
.calendario-v6 .leyenda .lw{color:var(--v6-ambar)}
.calendario-v6 .leyenda .lt{min-width:20px;height:20px;border-radius:999px;display:inline-grid;place-items:center;background:var(--v6-hoy-fondo);color:var(--v6-hoy-texto);font-size:11px;font-weight:600}
.calendario-v6 .leyenda .chip-red{height:18px;padding:0 5px}
.calendario-v6 .toast-t{white-space:normal;max-width:560px}
.calendario-v6 .toast{white-space:normal}
`;
