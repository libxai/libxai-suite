/**
 * Guía v4 de Yesid (maqueta asakaa-tablero.html, «Panel de tarea») · EL PANEL DE LA TAREA v4.
 *
 *   · estado, tarea padre, «Bloqueada por» y restricción se eligen con selectores propios (sin <select>);
 *   · avance con barra y campo (Enter para guardar); «Vencida hace N días hábiles»;
 *   · horas con cronómetro y «Registrar» (las horas van a la hoja de horas de quien mira);
 *   · «Depende de» con el tipo de enlace y el desfase de cada una, y «Se cruzan» si la predecesora termina tarde;
 *   · historial con el origen de cada cambio (App, MCP, Odoo, Importación);
 *   · en una fase o tarea padre: su estado calculado, sus hijas y «Completar la rama».
 *
 * La librería no habla con la base: lo que escribe o lee llega en `acciones` (la app). Sin una acción, su control no sale
 * o queda de solo lectura. Tablero y Lista comparten este panel con los mismos campos y el mismo vocabulario.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import { finConDuracion, habilesEntre, sumarHabiles, type Calendario } from '../../Gantt/motorDeProgramacion';
import { CalendarioDeFechaV4 } from '../../Gantt/CalendarioDeFechaV4';
import { fechaCorta } from '../../Gantt/fechaCorta';
import { EscudoDeRiesgo, nombreDeNivel } from './PuntoDeRiesgo';
import { diasDeRetraso, duracionHabil, estaVencida, estadoDeHoja, hojasDe, horasCortas, millones, tieneHijas, type CifrasDeFila, type EstadoV6 } from './reglasDeLaLista';
import { avanceDeTarea } from '../../../utils/avanceFisico';

export type TipoDeEnlaceV4 = 'FS' | 'SS' | 'FF' | 'SF';
export type OrigenDelCambio = 'app' | 'mcp' | 'odoo' | 'importacion' | 'sistema';
export interface EntradaDelHistorialV4 { id: string; cuando: Date; quien?: string | null; texto: string; origen: OrigenDelCambio }

/** Lo que el panel hace con la app. Cada acción es opcional: sin ella, su control no se ofrece. */
export interface AccionesDelPanelV4 {
  /** sin permiso de escritura: el panel es de solo lectura */
  puedeEditar?: boolean;
  /** v4 · si quien mira puede cambiar ESTA tarea (un ejecutor, solo las suyas): sin él, todas. Las horas (cronómetro y
   *  «Registrar») van a la hoja de quien mira y siguen solo con `puedeEditar`. */
  puedeEditarTarea?: (t: Task) => boolean;
  /** guardar campos de la tarea (restricción, lista de dependencias); `false` si no se pudo (y la app ya avisó) */
  onActualizar?: (t: Task, cambios: Partial<Task>) => boolean | void | Promise<boolean | void>;
  /** el tipo y el desfase de un enlace que ya existe */
  onTipoDeEnlace?: (t: Task, predecesora: string, tipo: TipoDeEnlaceV4, desfase: number) => boolean | void | Promise<boolean | void>;
  /** los cambios de la tarea, el más reciente primero */
  cargarHistorial?: (t: Task) => Promise<EntradaDelHistorialV4[]>;
  /** el cronómetro en marcha de quien mira (uno a la vez) */
  cronometro?: { taskId: string; desde: Date } | null;
  /** iniciar o detener el cronómetro en esta tarea (al detenerlo, el tiempo va a la hoja de horas) */
  onCronometro?: (t: Task) => void | Promise<void>;
  /** registrar horas de hoy en la tarea; `false` si no se pudo (la app dice por qué) */
  onRegistrarHoras?: (t: Task, horas: number) => boolean | void | Promise<boolean | void>;
  /** «Abrir en la Lista»: la Lista abre su panel con #t=<wbs> */
  onAbrirEnLista?: (t: Task, wbs: string) => void;
  onCopiarEnlace?: (t: Task) => void;
}

export interface FilaDelPanelV4 { t: Task; wbs: string; ancestros: string[]; nivel?: number }

const TXT = {
  es: {
    cerrar: 'Cerrar panel (Escape)', mas: 'Más acciones', acciones: 'Acciones', ficha: 'Abrir ficha completa', lista: 'Abrir en la Lista',
    copiar: 'Copiar enlace', verHist: 'Ver el historial', cambiarPadre: 'Cambiar tarea padre…',
    estado: 'Estado', cambiar: 'Cambiar', vencida: (n: number) => `Vencida hace ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`,
    espera: 'Espera a', indique: 'Indique qué la bloquea', empiezaAntes: 'Empieza antes de que termine',
    avanceSr: 'Avance en porcentaje', hintAvance: 'El avance solo cambia al completarla o cuando usted lo ajusta aquí (Enter para guardar).',
    hintHecha: 'Completada: su avance es 100%. Si la reabre, recupera el avance que tenía.',
    hintPorConfirmar: 'Estaba completada y no se conoce su avance anterior: confírmelo con Enter o escriba el real.',
    resp: 'Responsable', sinResp: 'Sin responsable', fechas: 'Fechas', dur: 'Duración', hito: 'Hito',
    cambiarInicio: 'Cambiar el inicio', cambiarFin: 'Cambiar el fin', cambiarFecha: 'Cambiar la fecha', estimado: 'Estimado', cambiarEstimado: 'Cambiar el estimado',
    sinPrioridad: 'Sin prioridad', anadirDep: 'Añadir dependencia', quitarDep: (n: string) => `Quitar la dependencia de «${n}»`,
    editarDesc: 'Editar la descripción', guardarDesc: 'Se guarda al salir del campo.',
    dias: (n: number) => `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`,
    restriccion: 'Restricción', restriccionDeFecha: 'Restricción de fecha', ninguna: 'Ninguna', laMueven: 'la mueven sus dependencias',
    terminarEl: (f: string) => `Terminar el ${f}`, noAntesDel: (f: string) => `No antes del ${f}`, fijar: 'Fijar fechas', fijas: 'Fechas fijas',
    horas: 'Horas', horasTip: 'Horas registradas / estimadas', sumaHijas: 'suma de las hijas',
    iniciar: 'Iniciar el cronómetro en esta tarea', detener: 'Detener el cronómetro',
    iniciarTip: 'Cronómetro: mide el tiempo y lo lleva a su hoja de horas', detenerTip: 'Detener y guardar el tiempo en su hoja de horas',
    registrar: 'Registrar', horasHoy: 'Horas trabajadas hoy', hHoy: 'h hoy', guardar: 'Guardar', cancelar: 'Cancelar',
    errHoras: 'Escriba las horas de hoy, entre 0,1 y 24 (por ejemplo, 1,5).',
    costo: 'Costo', planeado: (v: string) => `de ${v} planeado`, costoBloqueado: 'Visible para gerente y Finanzas',
    costoBloqueadoTip: 'Los ven los administradores, Finanzas y el gerente del proyecto. Las demás personas ven horas, no dinero.',
    prio: 'Prioridad', p: { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' } as Record<string, string>,
    padre: 'Tarea padre', directa: 'Directa de la fase', bloqueadaPor: 'Bloqueada por', sinIndicar: 'Sin indicar',
    depende: 'Depende de', nada: 'Nada', tipoEnlace: 'Tipo de dependencia', desfase: 'Desfase', sinDesfase: 'Sin desfase', seCruzan: 'Se cruzan',
    cruzanTip: (a: string, b: string) => `Termina el ${a} y esta empieza el ${b}`,
    kinds: {
      FS: ['Fin a inicio', 'empieza cuando la otra termina'], SS: ['Inicio a inicio', 'empiezan a la vez'],
      FF: ['Fin a fin', 'terminan a la vez'], SF: ['Inicio a fin', 'termina cuando la otra empieza'],
    } as Record<TipoDeEnlaceV4, [string, string]>,
    riesgo: 'Riesgo vinculado', sinRiesgos: 'Sin riesgos', desc: 'Descripción', sinDesc: 'Sin descripción.',
    hist: (n: number | null) => (n == null ? 'Historial' : `Historial · ${n} ${n === 1 ? 'cambio' : 'cambios'}`), cargando: 'Cargando…', sinHist: 'Sin cambios registrados.',
    origen: { app: 'App', mcp: 'MCP', odoo: 'Odoo', importacion: 'Importación', sistema: 'Sistema' } as Record<OrigenDelCambio, string>,
    origenTip: {
      app: 'Hecho en Asakaa por una persona', mcp: 'Hecho por un asistente conectado por MCP, en nombre de esa persona',
      odoo: 'Llegó de la integración con Odoo', importacion: 'Llegó al importar un archivo', sistema: 'Lo hizo un proceso automático de Asakaa',
    } as Record<OrigenDelCambio, string>,
    comentar: 'Escriba un comentario; use @ para mencionar', fase: 'fase', tareaPadre: 'tarea padre',
    subVencidas: (n: number) => `${n} ${n === 1 ? 'subtarea vencida' : 'subtareas vencidas'}`, subtareas: 'Subtareas', hijas: 'Tareas hijas',
    notaNodo: (f: boolean) => `El estado, las fechas y el avance de una ${f ? 'fase' : 'tarea padre'} se calculan con sus hijas. Para cambiarlos, mueva sus subtareas.`,
    calculado: 'Estado calculado', panel: (n: string) => `Detalle de ${n}`,
  },
  en: {
    cerrar: 'Close panel (Escape)', mas: 'More actions', acciones: 'Actions', ficha: 'Open full task', lista: 'Open in the List',
    copiar: 'Copy link', verHist: 'See the history', cambiarPadre: 'Change parent task…',
    estado: 'Status', cambiar: 'Change', vencida: (n: number) => `Overdue by ${n} working ${n === 1 ? 'day' : 'days'}`,
    espera: 'Waiting for', indique: 'Say what blocks it', empiezaAntes: 'Starts before the end of',
    avanceSr: 'Progress in percent', hintAvance: 'Progress only changes when you complete it or adjust it here (Enter to save).',
    hintHecha: 'Completed: its progress is 100%. If you reopen it, it gets back the progress it had.',
    hintPorConfirmar: 'It was completed and its previous progress is unknown: confirm it with Enter or type the real one.',
    resp: 'Owner', sinResp: 'No owner', fechas: 'Dates', dur: 'Duration', hito: 'Milestone',
    cambiarInicio: 'Change the start', cambiarFin: 'Change the end', cambiarFecha: 'Change the date', estimado: 'Estimate', cambiarEstimado: 'Change the estimate',
    sinPrioridad: 'No priority', anadirDep: 'Add dependency', quitarDep: (n: string) => `Remove the dependency on «${n}»`,
    editarDesc: 'Edit the description', guardarDesc: 'Saved when you leave the field.',
    dias: (n: number) => `${n} working ${n === 1 ? 'day' : 'days'}`,
    restriccion: 'Constraint', restriccionDeFecha: 'Date constraint', ninguna: 'None', laMueven: 'its dependencies move it',
    terminarEl: (f: string) => `Finish on ${f}`, noAntesDel: (f: string) => `Not before ${f}`, fijar: 'Fix dates', fijas: 'Fixed dates',
    horas: 'Hours', horasTip: 'Hours logged / estimated', sumaHijas: 'sum of the subtasks',
    iniciar: 'Start the timer on this task', detener: 'Stop the timer',
    iniciarTip: 'Timer: measures the time and takes it to your timesheet', detenerTip: 'Stop and save the time in your timesheet',
    registrar: 'Log', horasHoy: 'Hours worked today', hHoy: 'h today', guardar: 'Save', cancelar: 'Cancel',
    errHoras: 'Type today’s hours, between 0.1 and 24 (for example, 1.5).',
    costo: 'Cost', planeado: (v: string) => `of ${v} planned`, costoBloqueado: 'Visible to the manager and Finance',
    costoBloqueadoTip: 'Admins, Finance and the project manager see them. Everyone else sees hours, not money.',
    prio: 'Priority', p: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as Record<string, string>,
    padre: 'Parent task', directa: 'Directly under the phase', bloqueadaPor: 'Blocked by', sinIndicar: 'Not stated',
    depende: 'Depends on', nada: 'Nothing', tipoEnlace: 'Dependency type', desfase: 'Lag', sinDesfase: 'No lag', seCruzan: 'They overlap',
    cruzanTip: (a: string, b: string) => `It finishes on ${a} and this one starts on ${b}`,
    kinds: {
      FS: ['Finish to start', 'starts when the other finishes'], SS: ['Start to start', 'they start together'],
      FF: ['Finish to finish', 'they finish together'], SF: ['Start to finish', 'finishes when the other starts'],
    } as Record<TipoDeEnlaceV4, [string, string]>,
    riesgo: 'Linked risk', sinRiesgos: 'No risks', desc: 'Description', sinDesc: 'No description.',
    hist: (n: number | null) => (n == null ? 'History' : `History · ${n} ${n === 1 ? 'change' : 'changes'}`), cargando: 'Loading…', sinHist: 'No changes logged.',
    origen: { app: 'App', mcp: 'MCP', odoo: 'Odoo', importacion: 'Import', sistema: 'System' } as Record<OrigenDelCambio, string>,
    origenTip: {
      app: 'Done in Asakaa by a person', mcp: 'Done by an assistant connected through MCP, on behalf of that person',
      odoo: 'Came from the Odoo integration', importacion: 'Came from importing a file', sistema: 'Done by an automatic Asakaa process',
    } as Record<OrigenDelCambio, string>,
    comentar: 'Write a comment; use @ to mention', fase: 'phase', tareaPadre: 'parent task',
    subVencidas: (n: number) => `${n} overdue ${n === 1 ? 'subtask' : 'subtasks'}`, subtareas: 'Subtasks', hijas: 'Subtasks',
    notaNodo: (f: boolean) => `The status, dates and progress of a ${f ? 'phase' : 'parent task'} come from its subtasks. To change them, move its subtasks.`,
    calculado: 'Calculated status', panel: (n: string) => `Details of ${n}`,
  },
};
type Textos = typeof TXT.es | typeof TXT.en;

const DESFASES = [-2, -1, 0, 1, 2, 3, 5];
const ORDEN: EstadoV6[] = ['todo', 'prog', 'blocked', 'done'];

/** El texto de la restricción de una tarea («Ninguna», «Terminar el 23 oct», «No antes del 3 nov», «Fechas fijas»). */
export function textoDeRestriccion(t: Task, x: Textos, f: (d: Date) => string): string {
  if (t.fijada) return x.fijas;
  const partes = [t.noAntesDe ? x.noAntesDel(f(new Date(t.noAntesDe))) : null, t.terminarEl ? x.terminarEl(f(new Date(t.terminarEl))) : null].filter(Boolean);
  return partes.length ? partes.join(' · ') : x.ninguna;
}

/** La restricción que pide cada opción del selector (con `null` para borrar lo que había). */
export function cambiosDeRestriccion(t: Task, v: 'none' | 'fin' | 'ini' | 'fix'): Partial<Task> {
  const nada = null as unknown as undefined;
  if (v === 'fin') return { fijada: false, noAntesDe: nada, terminarEl: t.endDate };
  if (v === 'ini') return { fijada: false, noAntesDe: t.startDate, terminarEl: nada };
  if (v === 'fix') return { fijada: true, noAntesDe: nada, terminarEl: nada };
  return { fijada: false, noAntesDe: nada, terminarEl: nada };
}

/** «Sin desfase», «+2 días hábiles», «−1 día hábil». */
export function textoDeDesfase(n: number, x: Textos): string {
  if (!n) return x.sinDesfase;
  return `${n > 0 ? '+' : '−'}${x.dias(Math.abs(n))}`;
}

/** Horas escritas por una persona: «1,5», «2», «0.5». `null` si no es un número entre 0,1 y 24 con un decimal como mucho. */
export function leerHoras(texto: string): number | null {
  const v = texto.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d)?$/.test(v)) return null;
  const n = Number(v);
  return n > 0 && n <= 24 ? n : null;
}

interface Opcion { v: string; etiqueta: string; codigo?: string; pista?: string; actual?: boolean; pre?: ReactNode; sangria?: number }

/** Un selector propio (sin <select>): botón y menú con las opciones; flechas, Enter y Escape. */
function Selector({ id, etiqueta, titulo, contenido, opciones, onElegir, deshabilitado, clase = '', abrirAhora, onAbierto }: {
  id?: string; etiqueta: string; titulo: string; contenido: ReactNode; opciones: Opcion[]; onElegir: (v: string) => void;
  deshabilitado?: boolean; clase?: string; abrirAhora?: number; onAbierto?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (abrirAhora && !deshabilitado) { setAbierto(true); boton.current?.focus(); onAbierto?.(); } }, [abrirAhora]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: MouseEvent) => { if (!caja.current?.contains(ev.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    requestAnimationFrame(() => {
      const items = caja.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]');
      (caja.current?.querySelector<HTMLElement>('[aria-checked=true]') ?? items?.[0])?.focus();
    });
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  const teclas = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp' && ev.key !== 'Home' && ev.key !== 'End') return;
    ev.preventDefault();
    const ls = [...ev.currentTarget.querySelectorAll<HTMLElement>('[role=menuitemradio]')];
    const i = ls.indexOf(document.activeElement as HTMLElement);
    const j = ev.key === 'Home' ? 0 : ev.key === 'End' ? ls.length - 1 : (i + (ev.key === 'ArrowDown' ? 1 : ls.length - 1)) % ls.length;
    ls[j]?.focus();
  };
  /* con el menú abierto, Escape lo cierra a él (no al panel) aunque el foco siga en el botón; ↓ entra al menú */
  const alTeclear = (ev: KeyboardEvent<HTMLSpanElement>) => {
    if (!abierto) return;
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setAbierto(false); boton.current?.focus(); return; }
    if (ev.target === boton.current && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      ev.preventDefault();
      (caja.current?.querySelector<HTMLElement>('[aria-checked=true]') ?? caja.current?.querySelector<HTMLElement>('[role=menuitemradio]'))?.focus();
    }
  };
  return (
    <span className={`dp-sel${clase.split(' ').some((c) => c === 'sm' || c === 'dp-stbtn') ? '' : ' dp-sel-x'}`} ref={caja} onKeyDown={alTeclear}>
      <button ref={boton} id={id} type="button" className={`dp-pick ${clase}`.trim()} aria-haspopup="menu" aria-expanded={abierto}
        aria-label={etiqueta} disabled={deshabilitado} onClick={() => setAbierto((v) => !v)}>
        {contenido}
        {!deshabilitado && <Chevron />}
      </button>
      {abierto && (
        <div className="dp-menu" role="menu" aria-label={titulo} onKeyDown={teclas}>
          <h6 role="presentation">{titulo}</h6>
          {opciones.map((o) => (
            <button key={o.v} type="button" role="menuitemradio" tabIndex={-1} aria-checked={!!o.actual}
              onClick={() => { setAbierto(false); boton.current?.focus(); if (!o.actual) onElegir(o.v); }}>
              <span className="pk-c" aria-hidden="true">{o.actual ? <Visto /> : null}</span>
              {o.sangria ? <span style={{ width: o.sangria * 10, flex: 'none' }} /> : null}
              {o.pre}
              {o.codigo && <span className="code">{o.codigo}</span>}
              <span className="pk-l">{o.etiqueta}</span>
              {o.pista && <small>{o.pista}</small>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export interface PanelDeTareaV4Props {
  fila: FilaDelPanelV4;
  es: boolean;
  cal: Calendario;
  hoy: Date;
  nombreProyecto?: string;
  cifras: CifrasDeFila;
  estados: Map<string, EstadoV6>;
  nombreEstado: Record<EstadoV6, string>;
  porId: Map<string, FilaDelPanelV4>;
  tarifaDe: (hoja: Task) => number;
  /** costo y tarifa: solo administradores, Finanzas y el gerente del proyecto */
  conCosto?: boolean;
  onCerrar: () => void;
  onAbrirFicha?: (t: Task) => void;
  onIrA: (id: string) => void;
  onVerRiesgo?: (id: string) => void;
  /** cambiar el estado de una hoja (con la regla del % y «Deshacer» de la vista) */
  onEstado?: (t: Task, e: EstadoV6) => void;
  /** guardar el avance escrito (la vista valida y avisa) */
  onAvance?: (t: Task, texto: string) => void;
  porConfirmar?: boolean;
  errorAvance?: string | null;
  /** mover la hoja a otra tarea padre de su fase (o directa de la fase) */
  onCambiarPadre?: (t: Task, padreId: string) => void;
  /** lo que la vista añade en una fase o tarea padre («Completar la rama») */
  rama?: ReactNode;
  /** N24 · «Dependencias…» de la Lista: abre el panel con «Añadir dependencia» desplegado (cambia el número para abrirlo) */
  abrirDependencias?: number;
  acciones?: AccionesDelPanelV4;
}

export function PanelDeTareaV4({
  fila, es, cal, hoy, nombreProyecto, cifras, estados, nombreEstado, porId, tarifaDe, conCosto = true, onCerrar, onAbrirFicha, onIrA, onVerRiesgo,
  onEstado, onAvance, porConfirmar = false, errorAvance, onCambiarPadre, rama, acciones = {}, abrirDependencias: abrirDependencia = 0,
}: PanelDeTareaV4Props) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  const { t, wbs } = fila;
  const uid = useId();
  const esNodo = tieneHijas(t);
  const nivel = fila.nivel ?? fila.ancestros.length;
  const esFase = esNodo && nivel === 0;
  const e = estados.get(t.id) ?? (esNodo ? 'todo' : estadoDeHoja(t));
  const hecha = e === 'done';
  const puede = acciones.puedeEditar !== false;
  /* lo que cambia la tarea (estado, avance, restricción, padre, «Bloqueada por», enlaces) mira el permiso de esta tarea */
  const puedeTarea = puede && (acciones.puedeEditarTarea ? acciones.puedeEditarTarea(t) : true);
  const caja = useRef<HTMLElement>(null);
  const [menuMas, setMenuMas] = useState(false);
  const [abrirPadre, setAbrirPadre] = useState(0);
  const [registrando, setRegistrando] = useState(false);
  /* N23 (2ª revisión de Yesid, 19-nov): «El panel nuevo solo deja cambiar estado, avance, responsable y restricción. Fechas,
     estimado, prioridad, tarea padre, dependencias y descripción no se pueden editar ahí.» Ahora sí, en el sitio. */
  const [fechaAbierta, setFechaAbierta] = useState<'inicio' | 'fin' | null>(null);
  const [editandoEstimado, setEditandoEstimado] = useState(false);
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [errHoras, setErrHoras] = useState<string | null>(null);
  const [histAbierto, setHistAbierto] = useState(false);
  const [historial, setHistorial] = useState<EntradaDelHistorialV4[] | null>(null);
  const [, setTic] = useState(0);
  const f = (d?: Date) => (d ? fechaCorta(new Date(d), idioma, hoy) : '—');

  /* al abrir otra tarea: arriba, sin formularios abiertos, y su historial */
  useEffect(() => {
    caja.current?.scrollTo?.({ top: 0 });
    setRegistrando(false); setErrHoras(null); setHistAbierto(false); setMenuMas(false); setHistorial(null);
    setFechaAbierta(null); setEditandoEstimado(false); setEditandoDesc(false);
    let vivo = true;
    if (acciones.cargarHistorial) {
      acciones.cargarHistorial(t).then((h) => { if (vivo) setHistorial(h); }).catch(() => { if (vivo) setHistorial([]); });
    }
    return () => { vivo = false; };
  }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* el reloj del cronómetro */
  const enMarcha = acciones.cronometro?.taskId === t.id;
  useEffect(() => {
    if (!enMarcha) return;
    const i = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [enMarcha]);
  useEffect(() => {
    if (!menuMas) return;
    const fuera = (ev: MouseEvent) => { if (!(ev.target as HTMLElement).closest?.('.dp-mas')) setMenuMas(false); };
    document.addEventListener('mousedown', fuera);
    requestAnimationFrame(() => caja.current?.querySelector<HTMLElement>('.dp-mas [role=menuitem]')?.focus());
    return () => document.removeEventListener('mousedown', fuera);
  }, [menuMas]);

  const migas = [nombreProyecto, ...fila.ancestros.map((a) => {
    const n = porId.get(a);
    if (!n) return undefined;
    return (n.nivel ?? n.ancestros.length) === 0 ? `${es ? 'Fase' : 'Phase'} ${n.wbs} · ${n.t.name}` : n.t.name;
  })].filter(Boolean).join(' › ');
  const vencida = estaVencida(t, hoy);
  const retraso = vencida ? diasDeRetraso(t, hoy, cal) : 0;
  const deps = (t.dependencies ?? []).map((id) => porId.get(id)).filter((d): d is FilaDelPanelV4 => !!d);
  const finDe = (d: FilaDelPanelV4) => {
    const fin = tieneHijas(d.t) ? Math.max(...hojasDe(d.t).map((h) => (h.endDate ? new Date(h.endDate).getTime() : -Infinity))) : (d.t.endDate ? new Date(d.t.endDate).getTime() : -Infinity);
    return fin;
  };
  const inicio = t.startDate ? new Date(t.startDate).getTime() : Infinity;
  const abiertas = deps.filter((d) => estados.get(d.t.id) !== 'done');
  const espera = e === 'blocked' ? abiertas[0] : undefined;
  const choque = e !== 'blocked' && !hecha ? abiertas.find((d) => finDe(d) >= inicio) : undefined;
  const pct = avanceDeTarea(t);
  const dur = duracionHabil(t, cal);
  const planeado = hojasDe(t).reduce((a, h) => a + (((h as { effortMinutes?: number }).effortMinutes ?? 0) / 60) * (tarifaDe(h) || 0), 0);
  const persona = (t.assignees ?? [])[0];
  const descripcion = String((t as { description?: string }).description ?? '').trim();
  const prioridad = t.priority ? x.p[t.priority] ?? t.priority : '—';
  const riesgos = t.riesgos ?? [];

  const avatar = (p?: { name?: string; initials?: string }) => (p
    ? <span className="avatar" aria-hidden="true">{p.initials || (p.name ?? '?').slice(0, 2).toUpperCase()}</span>
    : <span className="avatar none" aria-hidden="true">+</span>);

  /* la tarea padre: la fase (directa) o un padre de la misma fase */
  const fase = fila.ancestros[0];
  const padreActual = fila.ancestros[fila.ancestros.length - 1];
  const opcionesDePadre: Opcion[] = !esNodo && fase ? [
    { v: fase, etiqueta: x.directa, actual: padreActual === fase },
    ...[...porId.values()]
      .filter((n) => n.t.id !== fase && tieneHijas(n.t) && n.ancestros[0] === fase)
      .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
      .map((n) => ({ v: n.t.id, codigo: n.wbs, etiqueta: n.t.name, actual: n.t.id === padreActual, sangria: Math.max(0, n.ancestros.length - 1) })),
  ] : [];

  const guardar = async (cambios: Partial<Task>) => { await acciones.onActualizar?.(t, cambios); };
  const editaCampos = !!acciones.onActualizar && puedeTarea;
  /* N23 · una fecha nueva con la regla de N25: un inicio después del fin corre el fin (y al revés), con los mismos días
     hábiles; un hito tiene una sola fecha (N29) */
  const elegirFecha = (campo: 'inicio' | 'fin', d: Date) => {
    setFechaAbierta(null);
    if (t.isMilestone) { void guardar({ startDate: d, endDate: d }); return; }
    const ini = t.startDate ? new Date(t.startDate) : d;
    const fin = t.endDate ? new Date(t.endDate) : d;
    const dias = habilesEntre(ini, fin, cal);
    const soloDia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    if (campo === 'inicio') void guardar(soloDia(d) > soloDia(fin) ? { startDate: d, endDate: finConDuracion(d, dias, cal) } : { startDate: d });
    else void guardar(soloDia(d) < soloDia(ini) ? { endDate: d, startDate: sumarHabiles(d, -(dias - 1), cal) } : { endDate: d });
  };
  const guardarEstimado = (texto: string) => {
    setEditandoEstimado(false);
    if (!texto.trim()) { void guardar({ effortMinutes: 0 } as Partial<Task>); return; }
    const h = leerHoras(texto);
    if (h != null) void guardar({ effortMinutes: Math.round(h * 60) } as Partial<Task>);
  };
  /* dependencias que se pueden añadir: ni ella, ni sus fases o padres, ni sus hijas, ni las que ya tiene */
  const opcionesDeDependencia: Opcion[] = [...porId.values()]
    .filter((n) => n.t.id !== t.id && !fila.ancestros.includes(n.t.id) && !n.ancestros.includes(t.id) && !(t.dependencies ?? []).includes(n.t.id))
    .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
    .map((n) => ({ v: n.t.id, codigo: n.wbs, etiqueta: n.t.name, sangria: Math.max(0, n.ancestros.length) }));
  const tipoDe = (id: string) => (t.dependencyLinks ?? []).find((l) => l.id === id) ?? { id, type: 'FS' as TipoDeEnlaceV4, lag: 0 };

  const registrar = async (texto: string) => {
    const h = leerHoras(texto);
    if (h == null) { setErrHoras(x.errHoras); return; }
    setErrHoras(null);
    const ok = await acciones.onRegistrarHoras?.(t, h);
    if (ok !== false) setRegistrando(false);
  };
  const reloj = () => {
    if (!acciones.cronometro || !enMarcha) return '0:00:00';
    const s = Math.max(0, Math.floor((Date.now() - new Date(acciones.cronometro.desde).getTime()) / 1000));
    const p = (n: number) => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };

  const historialEn = (
    <details className="dp-hist" open={histAbierto} onToggle={(ev) => setHistAbierto((ev.currentTarget as HTMLDetailsElement).open)}>
      <summary><ChevronDer />{x.hist(historial ? historial.length : null)}</summary>
      {historial == null ? <p className="dp-hint">{x.cargando}</p>
        : historial.length === 0 ? <p className="dp-hint">{x.sinHist}</p>
          : (
            <ul className="hl">
              {historial.map((h) => (
                <li key={h.id}>
                  <span className="hw">{fechaCorta(new Date(h.cuando), idioma, hoy)}</span>
                  <span className="ht">{h.quien ? <><b>{h.quien}</b> · </> : null}{h.texto}</span>
                  <span className="horg" data-origen={h.origen} title={x.origenTip[h.origen]}>{x.origen[h.origen]}</span>
                </li>
              ))}
            </ul>
          )}
    </details>
  );

  const masAcciones = (
    <span className="dp-mas" onKeyDown={(ev) => {
      if (!menuMas || ev.key !== 'Escape') return;
      ev.preventDefault(); ev.stopPropagation(); setMenuMas(false);
      caja.current?.querySelector<HTMLElement>('.dp-mas > button')?.focus();
    }}>
      <button type="button" className="icon-btn" aria-label={x.mas} title={x.mas} aria-haspopup="menu" aria-expanded={menuMas} onClick={() => setMenuMas((v) => !v)}><Puntos /></button>
      {menuMas && (
        <div className="dp-menu dp-menu-r" role="menu" aria-label={x.acciones}
          onKeyDown={(ev) => {
            if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
            ev.preventDefault();
            const ls = [...ev.currentTarget.querySelectorAll<HTMLElement>('[role=menuitem]')];
            const i = ls.indexOf(document.activeElement as HTMLElement);
            ls[(i + (ev.key === 'ArrowDown' ? 1 : ls.length - 1)) % ls.length]?.focus();
          }}>
          <h6 role="presentation">{x.acciones}</h6>
          {!esNodo && onCambiarPadre && puedeTarea && opcionesDePadre.length > 1 && (
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setMenuMas(false); setAbrirPadre((n) => n + 1); }}><Enlace />{x.cambiarPadre}</button>
          )}
          {acciones.cargarHistorial && (
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => {
              setMenuMas(false); setHistAbierto(true);
              requestAnimationFrame(() => { const s = caja.current?.querySelector<HTMLElement>('.dp-hist summary'); s?.scrollIntoView({ block: 'nearest' }); s?.focus(); });
            }}><Reloj />{x.verHist}</button>
          )}
          {acciones.onCopiarEnlace && <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setMenuMas(false); acciones.onCopiarEnlace?.(t); }}><Copiar />{x.copiar}</button>}
          {acciones.onAbrirEnLista && <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setMenuMas(false); acciones.onAbrirEnLista?.(t, wbs); }}><Lista />{x.lista}</button>}
          {onAbrirFicha && <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setMenuMas(false); onAbrirFicha(t); }}><Externo />{x.ficha}</button>}
        </div>
      )}
    </span>
  );

  const cabecera = (
    <div className="dp-top">
      <span className="crumb" title={migas}>{migas}</span>
      {masAcciones}
      <button type="button" className="icon-btn" aria-label={x.cerrar} title={x.cerrar} onClick={onCerrar}><Cruz /></button>
    </div>
  );

  const costo = (
    <>
      <dt>{x.costo}</dt>
      <dd>
        {conCosto
          ? (planeado ? <><span className="num">{millones(cifras.costo, es)}</span><span className="dp-none">{x.planeado(millones(planeado, es))}</span></> : <span className="num">—</span>)
          : <span className="locked" tabIndex={0} role="note" title={x.costoBloqueadoTip}><Candado />{x.costoBloqueado}</span>}
      </dd>
    </>
  );

  return (
    <aside ref={caja} className="dpanel dp4" aria-label={x.panel(`${wbs} ${t.name}`)} aria-labelledby={`${uid}-t`}
      onKeyDown={(ev) => { if (ev.key === 'Escape' && !ev.defaultPrevented) { ev.stopPropagation(); onCerrar(); } }}>
      {cabecera}
      {esNodo ? (
        <div className="dp-in">
          <div>
            {/* N27 (2ª revisión de Yesid): el código TK que encuentra Ctrl K, visible también en la tarea */}
            <div className="dp-w"><span className="code">{wbs}</span><span className="t"> · {esFase ? x.fase : x.tareaPadre}</span>{t.taskCode && <span className="code" data-codigo-tk> · {t.taskCode}</span>}</div>
            <h2 className="dp-title" id={`${uid}-t`} tabIndex={-1}>{t.name}</h2>
          </div>
          <div className="dp-state">
            <span className={`schip ${e}`} role="note" title={x.calculado}><i aria-hidden="true" />{nombreEstado[e]}</span>
            {cifras.vencidas > 0 && <span className="dp-late">{x.subVencidas(cifras.vencidas)}</span>}
          </div>
          <div className="dp-prog"><span className="pbar" aria-hidden="true"><b style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></span><span className={`pct${pct ? ' on' : ' zero'}`}>{pct}%</span></div>
          <dl className="dp-f">
            <dt>{x.resp}</dt><dd>{avatar(persona)}<span>{persona?.name ?? x.sinResp}</span></dd>
            <dt>{x.fechas}</dt><dd><span className="num">{f(t.startDate)} – {f(t.endDate)}</span></dd>
            <dt>{x.horas}</dt><dd><span className="num">{horasCortas(cifras.reg, es)} / {horasCortas(cifras.est, es)} h</span><span className="dp-none">{x.sumaHijas}</span></dd>
            {costo}
            <dt>{x.subtareas}</dt><dd><span className="num">{cifras.hechas}/{cifras.hojas}</span></dd>
          </dl>
          <div>
            <h3 className="dp-h">{x.hijas}</h3>
            {(t.subtasks ?? []).map((s) => porId.get(s.id)).filter((h): h is FilaDelPanelV4 => !!h).map((h) => {
              const ph = avanceDeTarea(h.t);
              const eh = estados.get(h.t.id) ?? 'todo';
              return (
                <button key={h.t.id} type="button" className="dp-link" onClick={() => onIrA(h.t.id)}>
                  <span className="code">{h.wbs}</span>
                  <span className="nm">{h.t.name}</span>
                  <span className="end"><span className={`pct${ph ? ' on' : ' zero'}`}>{ph}%</span><span className={`schip ${eh}`}><i aria-hidden="true" />{nombreEstado[eh]}</span></span>
                </button>
              );
            })}
            <p className="dp-hint" style={{ marginTop: 6 }}>{x.notaNodo(esFase)}</p>
          </div>
          {rama}
          {descripcion && <div><h3 className="dp-h">{x.desc}</h3><p className="dp-desc">{descripcion}</p></div>}
          {acciones.cargarHistorial && historialEn}
          {acciones.onAbrirEnLista && <button type="button" className="dp-link" onClick={() => acciones.onAbrirEnLista?.(t, wbs)}><Lista />{x.lista}</button>}
        </div>
      ) : (
        <div className="dp-in">
          <div>
            <div className="code dp-w">{wbs}{t.taskCode && <span data-codigo-tk> · {t.taskCode}</span>}</div>
            <h2 className="dp-title" id={`${uid}-t`} tabIndex={-1}>{t.name}</h2>
          </div>
          <div className="dp-state">
            {onEstado && puedeTarea ? (
              <Selector etiqueta={`${x.estado}: ${nombreEstado[e]}. ${x.cambiar}`} titulo={x.estado} clase="dp-stbtn"
                contenido={<span className={`schip ${e}`}><i aria-hidden="true" />{nombreEstado[e]}</span>}
                opciones={ORDEN.map((s) => ({ v: s, etiqueta: nombreEstado[s], actual: s === e, pre: <span className={`schip ${s}`}><i aria-hidden="true" /></span> }))}
                onElegir={(v) => onEstado(t, v as EstadoV6)} />
            ) : <span className={`schip ${e}`}><i aria-hidden="true" />{nombreEstado[e]}</span>}
            {vencida && retraso > 0 && <span className="dp-late">{x.vencida(retraso)}</span>}
            {e === 'blocked' && <span className="warn"><Advertencia />{espera ? `${x.espera} ${espera.wbs}` : x.indique}</span>}
            {choque && <span className="warn"><Advertencia />{x.empiezaAntes} {choque.wbs}</span>}
          </div>
          {!t.isMilestone && (
            <div className="dp-pgw">
              <div className="dp-prog">
                <span className="pbar" aria-hidden="true"><b style={{ width: `${hecha ? 100 : Math.min(100, Math.max(0, pct))}%` }} /></span>
                {hecha || !onAvance || !puedeTarea ? <span className={`pct${(hecha || pct) ? ' on' : ' zero'}`}>{hecha ? 100 : pct}%</span> : (
                  <label className="dp-pin">
                    <span className="sr">{x.avanceSr}</span>
                    <input key={`${t.id}-${pct}`} inputMode="numeric" maxLength={3} defaultValue={pct} aria-label={x.avanceSr} aria-invalid={!!errorAvance || undefined}
                      aria-describedby={`${uid}-pct`} className={errorAvance ? 'bad' : undefined}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); onAvance(t, ev.currentTarget.value); } }}
                      onBlur={(ev) => { if (ev.currentTarget.value.trim() !== String(pct) || porConfirmar) onAvance(t, ev.currentTarget.value); }} />%
                  </label>
                )}
              </div>
              <div id={`${uid}-pct`} role={errorAvance ? 'alert' : undefined} className={errorAvance ? 'dp-err' : porConfirmar ? 'dp-unc' : 'dp-hint'}>
                {errorAvance ?? (hecha ? x.hintHecha : porConfirmar ? x.hintPorConfirmar : x.hintAvance)}
              </div>
            </div>
          )}
          <dl className="dp-f">
            <dt>{x.resp}</dt>
            <dd>{avatar(persona)}<span className={persona ? undefined : 'dp-none'}>{persona?.name ?? x.sinResp}</span></dd>
            <dt>{x.fechas}</dt>
            <dd data-fechas-del-panel="">
              {editaCampos ? (
                <>
                  {!t.isMilestone && (
                    <button type="button" className="dp-ib num" aria-label={`${x.cambiarInicio}: ${f(t.startDate)}`} aria-expanded={fechaAbierta === 'inicio'}
                      data-fecha="inicio" onClick={() => setFechaAbierta((v) => (v === 'inicio' ? null : 'inicio'))}>{f(t.startDate)}</button>
                  )}
                  {!t.isMilestone && <span aria-hidden="true">–</span>}
                  <button type="button" className={`dp-ib num${vencida ? ' chip-red' : ''}`} aria-label={`${t.isMilestone ? x.cambiarFecha : x.cambiarFin}: ${f(t.endDate)}`}
                    aria-expanded={fechaAbierta === 'fin'} data-fecha="fin" onClick={() => setFechaAbierta((v) => (v === 'fin' ? null : 'fin'))}>{f(t.endDate)}</button>
                  {fechaAbierta && (
                    <div className="dp-cal v4-pop v4-scope" role="dialog" aria-label={fechaAbierta === 'inicio' ? x.cambiarInicio : x.cambiarFin}>
                      <CalendarioDeFechaV4 key={fechaAbierta} es={es}
                        valor={(fechaAbierta === 'inicio' ? t.startDate : t.endDate) ? new Date((fechaAbierta === 'inicio' ? t.startDate : t.endDate) as Date) : null}
                        alElegir={(d) => elegirFecha(fechaAbierta, d)} alCerrar={() => setFechaAbierta(null)} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {t.isMilestone ? null : <span className="num">{f(t.startDate)} –</span>}
                  {vencida ? <span className="chip-red">{f(t.endDate)}</span> : <span className="num">{f(t.endDate)}</span>}
                </>
              )}
            </dd>
            <dt>{x.dur}</dt>
            <dd><span className="num">{t.isMilestone ? x.hito : dur == null ? '—' : x.dias(dur)}</span></dd>
            <dt>{x.restriccion}</dt>
            <dd>
              {acciones.onActualizar && puedeTarea ? (
                <Selector etiqueta={`${x.restriccionDeFecha}: ${textoDeRestriccion(t, x, (d) => f(d))}. ${x.cambiar}`} titulo={x.restriccionDeFecha}
                  clase={t.fijada || t.noAntesDe || t.terminarEl ? '' : 'mut'}
                  contenido={<span className="pk-l">{textoDeRestriccion(t, x, (d) => f(d))}</span>}
                  opciones={[
                    { v: 'none', etiqueta: x.ninguna, pista: x.laMueven, actual: !t.fijada && !t.noAntesDe && !t.terminarEl },
                    { v: 'fin', etiqueta: x.terminarEl(f(t.endDate)), actual: !t.fijada && !!t.terminarEl && !t.noAntesDe },
                    { v: 'ini', etiqueta: x.noAntesDel(f(t.startDate)), actual: !t.fijada && !!t.noAntesDe && !t.terminarEl },
                    { v: 'fix', etiqueta: x.fijar, pista: `${f(t.startDate)} – ${f(t.endDate)}`, actual: !!t.fijada },
                  ]}
                  onElegir={(v) => void guardar(cambiosDeRestriccion(t, v as 'none' | 'fin' | 'ini' | 'fix'))} />
              ) : <span className={t.fijada || t.noAntesDe || t.terminarEl ? undefined : 'dp-none'}>{textoDeRestriccion(t, x, (d) => f(d))}</span>}
            </dd>
            {!t.isMilestone && (
              <>
                <dt>{x.horas}</dt>
                <dd>
                  {editaCampos && editandoEstimado ? (
                    <span className="dp-log">
                      <span className="num">{horasCortas(cifras.reg, es)} /</span>
                      <input autoFocus className="input" inputMode="decimal" maxLength={6} aria-label={x.cambiarEstimado} data-estimado=""
                        defaultValue={cifras.est ? horasCortas(cifras.est, es) : ''} placeholder={es ? '0,0' : '0.0'}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') { ev.preventDefault(); guardarEstimado(ev.currentTarget.value); }
                          if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setEditandoEstimado(false); }
                        }}
                        onBlur={(ev) => guardarEstimado(ev.currentTarget.value)} />
                      <span>h</span>
                    </span>
                  ) : editaCampos ? (
                    <button type="button" className="dp-ib num dp-hrs" title={x.horasTip} aria-label={`${x.cambiarEstimado}: ${cifras.est ? horasCortas(cifras.est, es) : '—'} h`}
                      onClick={() => setEditandoEstimado(true)}>{horasCortas(cifras.reg, es)} / {cifras.est ? horasCortas(cifras.est, es) : '—'} h</button>
                  ) : (
                    <span className="num dp-hrs" title={x.horasTip}>{horasCortas(cifras.reg, es)} / {cifras.est ? horasCortas(cifras.est, es) : '—'} h</span>
                  )}
                  {acciones.onCronometro && puede && (
                    <button type="button" className={`dp-ib${enMarcha ? ' on' : ''}`} aria-pressed={enMarcha}
                      aria-label={enMarcha ? x.detener : x.iniciar} title={enMarcha ? x.detenerTip : x.iniciarTip}
                      onClick={() => void acciones.onCronometro?.(t)}>
                      {enMarcha ? <><Pausa /><span className="num" data-reloj>{reloj()}</span></> : <Play />}
                    </button>
                  )}
                  {acciones.onRegistrarHoras && puede && !registrando && (
                    <button type="button" className="dp-ib" onClick={() => { setRegistrando(true); requestAnimationFrame(() => caja.current?.querySelector<HTMLInputElement>('.dp-log input')?.focus()); }}>
                      <Mas />{x.registrar}
                    </button>
                  )}
                  {registrando && (
                    <div className="dp-log">
                      <label className="sr" htmlFor={`${uid}-h`}>{x.horasHoy}</label>
                      <input id={`${uid}-h`} className={`input${errHoras ? ' bad' : ''}`} inputMode="decimal" maxLength={4} placeholder={es ? '0,0' : '0.0'}
                        aria-invalid={!!errHoras || undefined} aria-describedby={errHoras ? `${uid}-herr` : undefined}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') { ev.preventDefault(); void registrar(ev.currentTarget.value); }
                          if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setRegistrando(false); setErrHoras(null); }
                        }} />
                      <span>{x.hHoy}</span>
                      <button type="button" className="dp-btn primary" onClick={(ev) => void registrar((ev.currentTarget.parentElement?.querySelector('input') as HTMLInputElement | null)?.value ?? '')}>{x.guardar}</button>
                      <button type="button" className="icon-btn" aria-label={x.cancelar} title={x.cancelar} onClick={() => { setRegistrando(false); setErrHoras(null); }}><Cruz /></button>
                      {errHoras && <span className="dp-err" id={`${uid}-herr`} role="alert">{errHoras}</span>}
                    </div>
                  )}
                </dd>
              </>
            )}
            {costo}
            <dt>{x.prio}</dt>
            <dd>
              {editaCampos ? (
                <Selector etiqueta={`${x.prio}: ${t.priority ? prioridad : x.sinPrioridad}. ${x.cambiar}`} titulo={x.prio} clase={t.priority ? '' : 'mut'}
                  contenido={<span className="pk-l">{t.priority ? prioridad : x.sinPrioridad}</span>}
                  opciones={(['urgent', 'high', 'medium', 'low'] as const).map((v) => ({ v, etiqueta: x.p[v] ?? v, actual: t.priority === v }))}
                  onElegir={(v) => void guardar({ priority: v as Task['priority'] })} />
              ) : prioridad}
            </dd>
            <dt>{x.padre}</dt>
            <dd>
              {onCambiarPadre && puedeTarea && opcionesDePadre.length > 1 ? (
                <Selector etiqueta={`${x.padre}: ${padreActual === fase ? x.directa : porId.get(padreActual!)?.t.name ?? ''}. ${x.cambiar}`} titulo={x.padre}
                  abrirAhora={abrirPadre}
                  contenido={padreActual === fase ? <span className="pk-l">{x.directa}</span>
                    : <><span className="code">{porId.get(padreActual!)?.wbs}</span><span className="pk-l">{porId.get(padreActual!)?.t.name}</span></>}
                  opciones={opcionesDePadre} onElegir={(v) => onCambiarPadre(t, v)} />
              ) : <span>{padreActual === fase ? x.directa : porId.get(padreActual!)?.t.name ?? '—'}</span>}
            </dd>
            {e === 'blocked' && (
              <>
                <dt>{x.bloqueadaPor}</dt>
                <dd>
                  {acciones.onActualizar && puedeTarea ? (
                    <Selector etiqueta={`${x.bloqueadaPor}: ${espera ? `${espera.wbs} ${espera.t.name}` : x.sinIndicar}. ${x.cambiar}`} titulo={x.bloqueadaPor}
                      clase={espera ? '' : 'mut'}
                      contenido={espera ? <><span className="code">{espera.wbs}</span><span className="pk-l">{espera.t.name}</span></> : <span className="pk-l">{x.sinIndicar}</span>}
                      opciones={[...porId.values()]
                        .filter((n) => n.t.id !== t.id && !tieneHijas(n.t) && estados.get(n.t.id) !== 'done')
                        .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
                        .map((n) => ({ v: n.t.id, codigo: n.wbs, etiqueta: n.t.name, actual: espera?.t.id === n.t.id }))}
                      onElegir={(v) => void guardar({ dependencies: [v, ...(t.dependencies ?? []).filter((d) => d !== v)] })} />
                  ) : <span className={espera ? undefined : 'dp-none'}>{espera ? `${espera.wbs} ${espera.t.name}` : x.sinIndicar}</span>}
                </dd>
              </>
            )}
            <dt>{x.depende}</dt>
            <dd>
              {deps.length ? deps.map((d) => {
                const k = tipoDe(d.t.id);
                const ed = estados.get(d.t.id) ?? 'todo';
                const cruza = !hecha && ed !== 'done' && finDe(d) >= inicio;
                const editable = !!acciones.onTipoDeEnlace && puedeTarea;
                return (
                  <div key={d.t.id} className="dp-dep">
                    <div className="l1"><span className="code">{d.wbs}</span><span>{d.t.name} <span className="st">· {nombreEstado[ed]}</span></span></div>
                    <div className="l2">
                      {editable ? (
                        <>
                          <Selector etiqueta={`${x.tipoEnlace}: ${x.kinds[k.type][0]}. ${x.cambiar}`} titulo={x.tipoEnlace} clase="sm"
                            contenido={<span className="pk-l">{x.kinds[k.type][0]}</span>}
                            opciones={(Object.keys(x.kinds) as TipoDeEnlaceV4[]).map((v) => ({ v, etiqueta: x.kinds[v][0], pista: x.kinds[v][1], actual: v === k.type }))}
                            onElegir={(v) => void acciones.onTipoDeEnlace?.(t, d.t.id, v as TipoDeEnlaceV4, k.lag)} />
                          <Selector etiqueta={`${x.desfase}: ${textoDeDesfase(k.lag, x)}. ${x.cambiar}`} titulo={x.desfase} clase="sm"
                            contenido={<span className="pk-l">{textoDeDesfase(k.lag, x)}</span>}
                            opciones={DESFASES.map((n) => ({ v: String(n), etiqueta: textoDeDesfase(n, x), actual: n === k.lag }))}
                            onElegir={(v) => void acciones.onTipoDeEnlace?.(t, d.t.id, k.type as TipoDeEnlaceV4, Number(v))} />
                        </>
                      ) : <span className="st">{x.kinds[k.type][0]} · {textoDeDesfase(k.lag, x)}</span>}
                      {cruza && <span className="warn" title={x.cruzanTip(f(new Date(finDe(d))), f(t.startDate))}><Advertencia />{x.seCruzan}</span>}
                      {editaCampos && (
                        <button type="button" className="icon-btn" aria-label={x.quitarDep(d.t.name)} title={x.quitarDep(d.t.name)} data-quitar-dependencia={d.t.id}
                          onClick={() => void guardar({ dependencies: (t.dependencies ?? []).filter((id) => id !== d.t.id) })}><Cruz /></button>
                      )}
                    </div>
                  </div>
                );
              }) : <span className="dp-none">{x.nada}</span>}
              {/* N24 (2ª revisión de Yesid): «"Dependencies…" solo abre el panel, donde "Depends on: Nothing" no se puede tocar» */}
              {editaCampos && opcionesDeDependencia.length > 0 && (
                <Selector etiqueta={x.anadirDep} titulo={x.anadirDep} clase="mut" abrirAhora={abrirDependencia}
                  contenido={<span className="pk-l" data-anadir-dependencia="">+ {x.anadirDep}</span>}
                  opciones={opcionesDeDependencia}
                  onElegir={(v) => void guardar({ dependencies: [...(t.dependencies ?? []), v] })} />
              )}
            </dd>
          </dl>
          <div>
            <h3 className="dp-h">{x.riesgo}</h3>
            {riesgos.length ? riesgos.map((r) => (
              <button key={r.id} type="button" className="dp-link" disabled={!onVerRiesgo} onClick={() => onVerRiesgo?.(r.id)}>
                <span className="code">{r.codigo}</span>
                <span className="nm" title={r.titulo}>{r.titulo}</span>
                <span className="end"><EscudoDeRiesgo riesgos={[r]} es={es} className="dp-risk" />{nombreDeNivel(r.nivel, es)}</span>
              </button>
            )) : <span className="dp-none">{x.sinRiesgos}</span>}
          </div>
          <div>
            <h3 className="dp-h">{x.desc}</h3>
            {editaCampos && editandoDesc ? (
              <textarea autoFocus className="input dp-desc-edit" rows={4} aria-label={x.editarDesc} title={x.guardarDesc} defaultValue={descripcion} data-descripcion=""
                onKeyDown={(ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setEditandoDesc(false); } }}
                onBlur={(ev) => { setEditandoDesc(false); if (ev.currentTarget.value.trim() !== descripcion) void guardar({ description: ev.currentTarget.value.trim() } as Partial<Task>); }} />
            ) : editaCampos ? (
              <button type="button" className="dp-desc dp-desc-btn" aria-label={x.editarDesc} onClick={() => setEditandoDesc(true)}>{descripcion || x.sinDesc}</button>
            ) : (
              <p className="dp-desc">{descripcion || x.sinDesc}</p>
            )}
          </div>
          {acciones.cargarHistorial && historialEn}
          <div className="dp-foot">
            {onAbrirFicha && <button type="button" className="cbox" onClick={() => onAbrirFicha(t)}>{x.comentar}</button>}
            {acciones.onAbrirEnLista && <button type="button" className="dp-link" onClick={() => acciones.onAbrirEnLista?.(t, wbs)}><Lista />{x.lista}</button>}
          </div>
        </div>
      )}
    </aside>
  );
}

const svg = (hijos: ReactNode, extra?: object) => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...extra}>{hijos}</svg>
);
function Chevron() { return svg(<path d="M4 6l4 4 4-4" />, { width: 14, height: 14 }); }
function ChevronDer() { return svg(<path d="M6 4l4 4-4 4" />, { width: 14, height: 14 }); }
function Visto() { return svg(<path d="M3.5 8.5l3 3 6-7" />, { width: 14, height: 14 }); }
function Cruz() { return svg(<path d="M4 4l8 8M12 4l-8 8" />, { width: 15, height: 15 }); }
function Puntos() { return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>; }
function Advertencia() { return svg(<><path d="M8 2.5 14 13H2L8 2.5Z" /><path d="M8 6.5v3M8 11.2v.1" /></>, { width: 14, height: 14 }); }
function Play() { return svg(<path d="M5 3.5l7 4.5-7 4.5z" />, { width: 14, height: 14 }); }
function Pausa() { return svg(<path d="M5.5 3.5v9M10.5 3.5v9" />, { width: 14, height: 14 }); }
function Mas() { return svg(<path d="M8 3.5v9M3.5 8h9" />, { width: 14, height: 14 }); }
function Lista() { return svg(<path d="M6 4.5h7M6 8h7M6 11.5h7M3 4.5h.01M3 8h.01M3 11.5h.01" />); }
function Reloj() { return svg(<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></>); }
function Copiar() { return svg(<><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></>); }
function Enlace() { return svg(<path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" />); }
function Externo() { return svg(<path d="M9.5 2.5h4v4M13.5 2.5 8 8M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />); }
function Candado() { return svg(<><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>, { width: 14, height: 14 }); }

/*
 * Los colores son los tokens `--v4-*` de la app (Asakaa), con los `--v6-*` de respaldo; las medidas, las de la maqueta.
 * Todo cuelga de `.lista-v6 .dp4`: pisa al panel de la v3 (CSS_PANEL_V6), que sigue para lo que aún lo usa.
 */
export const CSS_PANEL_V4 = `
/* N23 · lo que ahora se edita en el sitio */
.dp-cal { display: block; width: max-content; margin-top: 6px; flex-basis: 100%; }
.dp-desc-btn { display: block; width: 100%; text-align: left; background: none; border: 1px dashed transparent; border-radius: 6px; padding: 4px 6px; margin: 0 -6px; cursor: text; color: inherit; font: inherit; }
.dp-desc-btn:hover { border-color: var(--v4-border, #E1E5E8); }
.dp-desc-edit { width: 100%; resize: vertical; min-height: 72px; font: inherit; }
.lista-v6 .dp4{
  --dp-text:var(--v4-text,var(--v6-texto));--dp-text2:var(--v4-text2,var(--v6-texto-2));--dp-text3:var(--v4-text3,var(--v6-tenue));
  --dp-card:var(--v4-card,var(--v6-tarjeta));--dp-border:var(--v4-border,var(--v6-borde));--dp-soft:var(--v4-soft,var(--v6-linea));
  --dp-hover:var(--v4-hover,var(--v6-fila-hover));--dp-ctl-bd:var(--v4-ctl-bd,var(--v6-tenue-borde));--dp-btn-bd:var(--v4-btn-bd,var(--v6-borde));
  --dp-brand:var(--v4-brand,var(--v6-acento));--dp-acc:var(--v4-acc,var(--v6-acento-texto));--dp-sel:var(--v4-sel-bg,var(--v6-fila-seleccionada));
  --dp-red:var(--v4-red,var(--v6-rojo));--dp-red-bd:var(--v4-red-bd,var(--v6-rojo-borde));--dp-red-bg:var(--v4-red-bg,var(--v6-rojo-fondo));
  --dp-amber:var(--v4-amber,var(--v6-ambar));--dp-fill:var(--v4-fill,var(--v6-acento));--dp-track:var(--v4-track,var(--v6-pista));
  --dp-pop:var(--v4-pop,0 8px 28px -6px rgba(14,17,20,.18),0 1px 2px rgba(14,17,20,.06));
  width:clamp(340px,26vw,420px);flex:none;border-left:1px solid var(--dp-border);background:var(--dp-card);overflow:auto;
  max-height:calc(100vh - 262px);min-height:420px;color:var(--dp-text);font-size:13px
}
.lista-v6 .dp4 .num{font-variant-numeric:tabular-nums}
.lista-v6 .dp4 .code{font-family:var(--v4-ff-mono,'Geist Mono',monospace);font-size:12px;color:var(--dp-text3);flex:none}
.lista-v6 .dp4 .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lista-v6 .dp4 .dp-top{position:sticky;top:0;background:var(--dp-card);z-index:3;display:flex;align-items:center;gap:6px;padding:6px 8px 6px 16px;border-bottom:1px solid var(--dp-soft);font-size:12px;color:var(--dp-text3)}
.lista-v6 .dp4 .dp-top .crumb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .dp4 .icon-btn{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;color:var(--dp-text2);border:0;background:transparent;cursor:pointer;flex:none}
.lista-v6 .dp4 .icon-btn:hover,.lista-v6 .dp4 .icon-btn[aria-expanded=true]{background:var(--dp-hover);color:var(--dp-text)}
.lista-v6 .dp4 .dp-in{padding:14px 16px 18px;display:flex;flex-direction:column;gap:16px}
.lista-v6 .dp4 .dp-w{font-size:12px;color:var(--dp-text3);margin-bottom:4px;font-family:var(--v4-ff-mono,'Geist Mono',monospace)}
.lista-v6 .dp4 .dp-w .t{font-family:var(--v4-ff-sans,inherit)}
.lista-v6 .dp4 .dp-title{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em;line-height:1.3;color:var(--dp-text)}
.lista-v6 .dp4 .dp-title:focus{outline:none}
.lista-v6 .dp4 .dp-state{display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap}
.lista-v6 .dp4 .dp-late{color:var(--dp-red);font-size:12px;font-weight:500}
.lista-v6 .dp4 .warn{color:var(--dp-amber);font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:5px}
.lista-v6 .dp4 .schip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0;border-radius:0;background:none;color:var(--dp-text2);font-size:12px;font-weight:500;white-space:nowrap}
.lista-v6 .dp4 .schip::before,.lista-v6 .dp4 .schip.done::before{content:none}
.lista-v6 .dp4 .schip i{position:relative;display:inline-block;width:12px;height:12px;box-sizing:border-box;border-radius:50%;border:1.5px solid var(--v4-st-todo,#7F8891);background:none;flex:none}
.lista-v6 .dp4 .schip.prog i{border-color:var(--v4-st-prog,#0A8073);background:linear-gradient(90deg,transparent 50%,var(--v4-st-prog,#0A8073) 50%)}
.lista-v6 .dp4 .schip.blocked i{border-color:var(--v4-st-blocked,#B26A00);background:linear-gradient(var(--dp-card),var(--dp-card)) center/6px 2px no-repeat,var(--v4-st-blocked,#B26A00)}
.lista-v6 .dp4 .schip.done{color:var(--dp-text3)}
.lista-v6 .dp4 .schip.done i{display:inline-block;border-color:var(--v4-st-done,#7F8891);background:var(--v4-st-done,#7F8891)}
.lista-v6 .dp4 .schip.done i::after{content:'';position:absolute;left:3px;top:.8px;width:3px;height:6px;border:solid var(--dp-card);border-width:0 1.5px 1.5px 0;transform:rotate(42deg)}
.lista-v6 .dp4 .schip[role=note]{cursor:help}
.lista-v6 .dp4 .dp-prog{display:flex;align-items:center;gap:10px}
.lista-v6 .dp4 .pbar{flex:1;height:4px;border-radius:2px;background:var(--dp-track);overflow:hidden;display:block}
.lista-v6 .dp4 .pbar b{display:block;height:100%;background:var(--dp-fill);border-radius:2px}
.lista-v6 .dp4 .pct{font:500 12px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;color:var(--dp-text3)}
.lista-v6 .dp4 .pct.on{color:var(--dp-acc)}
.lista-v6 .dp4 .dp-pgw{display:flex;flex-direction:column;gap:6px}
.lista-v6 .dp4 .dp-pin{display:inline-flex;align-items:center;gap:4px;font-size:13px;color:var(--dp-text2)}
.lista-v6 .dp4 .dp-pin input{width:56px;height:28px;box-sizing:border-box;border:1px solid var(--dp-ctl-bd);border-radius:6px;background:var(--dp-card);color:var(--dp-text);font:400 13px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;text-align:right;padding:0 6px}
.lista-v6 .dp4 .dp-pin input:focus{border-color:var(--dp-brand);outline:none;box-shadow:0 0 0 2px var(--dp-sel)}
.lista-v6 .dp4 .dp-pin input.bad,.lista-v6 .dp4 .dp-log .input.bad{border-color:var(--dp-red)}
.lista-v6 .dp4 .dp-hint{margin:0;font-size:12px;color:var(--dp-text3);line-height:1.45}
.lista-v6 .dp4 .dp-unc{font-size:12px;color:var(--dp-text2);line-height:1.45}
.lista-v6 .dp4 .dp-err{margin:0;font-size:12px;color:var(--dp-red)}
.lista-v6 .dp4 .dp-f{display:grid;grid-template-columns:96px minmax(0,1fr);row-gap:2px;margin:0}
.lista-v6 .dp4 .dp-f dt{font-size:12px;font-weight:400;color:var(--dp-text3);min-height:32px;display:flex;align-items:flex-start;padding-top:8px;box-sizing:border-box}
.lista-v6 .dp4 .dp-f dd{margin:0;min-height:32px;display:flex;align-items:center;gap:6px 8px;flex-wrap:wrap;min-width:0;color:var(--dp-text);font-size:13px}
.lista-v6 .dp4 .dp-f .num{color:var(--dp-text)}
.lista-v6 .dp4 .dp-none{color:var(--dp-text3)}
.lista-v6 .dp4 .avatar{width:22px;height:22px;border-radius:50%;background:var(--dp-soft);border:1px solid var(--dp-border);color:var(--dp-text2);display:inline-grid;place-items:center;font-size:11px;font-weight:600;flex:none}
.lista-v6 .dp4 .avatar.none{border:1px dashed var(--dp-ctl-bd);background:none;color:var(--dp-text3)}
.lista-v6 .dp4 .chip-red{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;border:1px solid var(--dp-red-bd);background:var(--dp-red-bg);color:var(--dp-red);font:500 12px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;white-space:nowrap}
.lista-v6 .dp4 .locked{display:inline-flex;align-items:center;gap:5px;color:var(--dp-text3);font-size:12px;white-space:nowrap;cursor:help}
.lista-v6 .dp4 .dp-sel{position:relative;display:inline-flex;max-width:100%;min-width:0}
/* el texto del selector se alinea con el de las demás filas: el corrimiento va en el contenedor, no en el botón (si no, lo encoge) */
.lista-v6 .dp4 .dp-sel-x{margin-left:-8px;max-width:calc(100% + 8px)}
.lista-v6 .dp4 .dp-pick{height:28px;max-width:100%;display:inline-flex;align-items:center;gap:6px;padding:0 4px 0 8px;border-radius:6px;border:0;background:transparent;color:var(--dp-text);font:inherit;font-size:13px;text-align:left;min-width:0;cursor:pointer;margin-left:0}
.lista-v6 .dp4 .dp-pick:hover,.lista-v6 .dp4 .dp-pick[aria-expanded=true]{background:var(--dp-hover)}
.lista-v6 .dp4 .dp-pick:disabled{cursor:default}
.lista-v6 .dp4 .dp-pick>svg{color:var(--dp-text3);flex:none}
.lista-v6 .dp4 .dp-pick .pk-l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .dp4 .dp-pick.sm{height:24px;font-size:12px;color:var(--dp-text2);margin-left:0;padding:0 2px 0 6px;border:1px solid var(--dp-btn-bd)}
.lista-v6 .dp4 .dp-pick.mut{color:var(--dp-text3)}
.lista-v6 .dp4 .dp-stbtn{height:28px;padding:0 6px 0 8px;margin-left:0;border:1px solid var(--dp-btn-bd);border-radius:8px;background:var(--dp-card)}
.lista-v6 .dp4 .dp-stbtn:hover,.lista-v6 .dp4 .dp-stbtn[aria-expanded=true]{border-color:var(--dp-ctl-bd);background:var(--dp-hover)}
.lista-v6 .dp4 .dp-stbtn .schip{color:var(--dp-text)}
.lista-v6 .dp4 .dp-menu{position:absolute;left:-8px;top:calc(100% + 4px);z-index:40;min-width:220px;max-width:min(320px,90vw);max-height:300px;overflow:auto;padding:6px;border-radius:8px;border:1px solid var(--dp-border);background:var(--dp-card);box-shadow:var(--dp-pop);display:flex;flex-direction:column}
.lista-v6 .dp4 .dp-menu-r{left:auto;right:0}
.lista-v6 .dp4 .dp-mas{position:relative;display:inline-flex}
.lista-v6 .dp4 .dp-menu h6{margin:4px 8px 4px;font-size:12px;font-weight:500;color:var(--dp-text3)}
.lista-v6 .dp4 .dp-menu button{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dp-text);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.lista-v6 .dp4 .dp-menu button:hover,.lista-v6 .dp4 .dp-menu button:focus-visible{background:var(--dp-hover);outline:none}
.lista-v6 .dp4 .dp-menu button>svg{color:var(--dp-text3);flex:none}
.lista-v6 .dp4 .dp-menu .pk-c{width:14px;height:14px;flex:none;display:inline-grid;place-items:center;color:var(--dp-acc)}
.lista-v6 .dp4 .dp-menu .pk-l{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .dp4 .dp-menu small{margin-left:auto;padding-left:14px;font-size:12px;color:var(--dp-text3);white-space:nowrap}
.lista-v6 .dp4 .dp-ib{height:26px;display:inline-flex;align-items:center;gap:5px;padding:0 8px;border:1px solid var(--dp-btn-bd);border-radius:6px;background:var(--dp-card);font:inherit;font-size:12px;font-weight:500;color:var(--dp-text2);white-space:nowrap;cursor:pointer}
.lista-v6 .dp4 .dp-ib:hover{background:var(--dp-hover);color:var(--dp-text);border-color:var(--dp-ctl-bd)}
.lista-v6 .dp4 .dp-ib.on{border-color:var(--dp-brand);background:var(--dp-sel);color:var(--dp-acc)}
.lista-v6 .dp4 .dp-hrs{margin-right:auto}
.lista-v6 .dp4 .dp-log{flex-basis:100%;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:2px 0 6px;font-size:12px;color:var(--dp-text2)}
.lista-v6 .dp4 .dp-log .input{width:60px;height:28px;box-sizing:border-box;border:1px solid var(--dp-ctl-bd);border-radius:6px;background:var(--dp-card);color:var(--dp-text);font:400 13px var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums;text-align:right;padding:0 6px}
.lista-v6 .dp4 .dp-log .dp-err{flex-basis:100%}
.lista-v6 .dp4 .dp-btn{height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--dp-btn-bd);background:var(--dp-card);color:var(--dp-text);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.lista-v6 .dp4 .dp-btn.primary{border-color:var(--dp-brand);background:var(--dp-brand);color:var(--v4-on-brand,var(--v6-sobre-acento))}
.lista-v6 .dp4 .dp-dep{width:100%;display:flex;flex-direction:column;gap:4px;padding:5px 0}
.lista-v6 .dp4 .dp-dep .l1{display:flex;align-items:baseline;gap:6px;min-width:0;line-height:1.45}
.lista-v6 .dp4 .dp-dep .st{font-size:12px;color:var(--dp-text3);white-space:nowrap}
.lista-v6 .dp4 .dp-dep .l2{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.lista-v6 .dp4 .dp-h{font-size:12px;font-weight:500;color:var(--dp-text3);margin:0 0 6px}
.lista-v6 .dp4 .dp-desc{margin:0;color:var(--dp-text2);font-weight:400;line-height:1.5;white-space:pre-line}
.lista-v6 .dp4 .dp-link{display:flex;align-items:center;gap:8px;width:100%;min-height:30px;padding:0 6px;margin:0 -6px;box-sizing:content-box;color:var(--dp-text);border-radius:6px;border:0;background:transparent;font:inherit;font-size:13px;text-align:left;cursor:pointer}
.lista-v6 .dp4 .dp-link:hover:not(:disabled){background:var(--dp-hover)}
.lista-v6 .dp4 .dp-link:disabled{cursor:default}
.lista-v6 .dp4 .dp-link>svg{color:var(--dp-text3);flex:none}
.lista-v6 .dp4 .dp-link .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .dp4 .dp-link .end{margin-left:auto;display:flex;gap:8px;align-items:center;flex:none;font-size:12px;color:var(--dp-text2)}
.lista-v6 .dp4 .dp-risk{display:inline-grid;place-items:center;width:16px;height:16px;flex:none;color:var(--v4-lvl-medio,#B8860B)}
.lista-v6 .dp4 .dp-risk svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;fill:color-mix(in srgb,currentColor 18%,transparent)}
.lista-v6 .dp4 .dp-risk[data-nivel=critico]{color:var(--v4-lvl-critico,#D13A40)}
.lista-v6 .dp4 .dp-risk[data-nivel=alto]{color:var(--v4-lvl-alto,#D9730D)}
.lista-v6 .dp4 .dp-risk[data-nivel=bajo]{color:var(--v4-lvl-bajo,#8A939C)}
.lista-v6 .dp4 details.dp-hist summary{list-style:none;display:flex;align-items:center;gap:6px;cursor:pointer;min-height:28px;font-size:12px;font-weight:500;color:var(--dp-text3)}
.lista-v6 .dp4 details.dp-hist summary::-webkit-details-marker{display:none}
.lista-v6 .dp4 details.dp-hist summary svg{transition:transform .15s}
.lista-v6 .dp4 details.dp-hist[open] summary svg{transform:rotate(90deg)}
.lista-v6 .dp4 .hl{list-style:none;margin:0;padding:0}
.lista-v6 .dp4 .hl li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:2px 8px;align-items:baseline;padding:5px 0;font-size:12px;line-height:1.4}
.lista-v6 .dp4 .hl .hw{color:var(--dp-text3);font-variant-numeric:tabular-nums;white-space:nowrap}
.lista-v6 .dp4 .hl .ht{color:var(--dp-text2);min-width:0}
.lista-v6 .dp4 .hl .ht b{color:var(--dp-text);font-weight:500}
.lista-v6 .dp4 .hl .horg{height:18px;display:inline-flex;align-items:center;padding:0 7px;border-radius:999px;background:var(--dp-soft);color:var(--dp-text2);font-size:11px;font-weight:500;white-space:nowrap;cursor:help}
.lista-v6 .dp4 .dp-foot{display:flex;flex-direction:column;gap:6px}
.lista-v6 .dp4 .cbox{height:36px;border:1px solid var(--dp-ctl-bd);border-radius:8px;display:flex;align-items:center;padding:0 10px;color:var(--dp-text3);font:inherit;font-size:13px;width:100%;text-align:left;background:var(--dp-card);cursor:text}
@container lista-v6 (max-width:1479px){.lista-v6 .dp4{width:340px}}
`;
