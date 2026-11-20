/**
 * Guía v4 de Yesid · «Hay un solo pie, «Costos del proyecto». Muestra la salud financiera y el costo por persona, y cada
 * uno tiene tres caras: valor, «No evaluable» y «Visible para gerente y Finanzas».» El mismo en la Lista y el Tablero.
 *
 *   · resumen plegado: «real $29,1 M COP de $60,6 M COP planeado · margen previsto 34% (planeado 36%) · 5 personas con
 *     tareas abiertas»;
 *   · al abrirlo: las seis cifras de la salud financiera y la tabla de costo por persona (con su total, lo que falta por
 *     gastar y por qué quien mira ve las tarifas);
 *   · sin permiso de dinero: la desviación de horas y las horas por persona; lo demás, «Visible para gerente y Finanzas»;
 *   · «No evaluable» (tarifas en escalas distintas): costos, márgenes y tarifas no se calculan; el motivo en el globo.
 *
 * Las cifras de la salud las pone la app (las mismas de la cabecera: `indicadores_de_proyectos`); las de cada persona salen
 * de las tareas: una hoja cuenta para su PRIMER responsable; sin responsable, se costea con la tarifa del espacio.
 */
import { useMemo, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import { estadoDeHoja, hojasDe, horasCortas, millones } from './reglasDeLaLista';

export interface SaludDelPieV4 {
  /** sql/481 · quien mira ve dinero (administrador, Finanzas o gerente del proyecto) */
  veDinero: boolean;
  /** contrato + adicionales; null si no hay contrato */
  ofertado: number | null;
  planeado: number;
  real: number;
  /** costo estimado al terminar al ritmo actual (EAC) */
  alTerminar: number | null;
  /** horas registradas y las que vale el avance logrado (solo hojas) */
  horasRegistradas: number;
  horasGanadas: number;
  /** «No evaluable»: el motivo (costos, márgenes y tarifas no se calculan) */
  noEvaluable?: string | null;
  /** v4 · el motivo corto que sigue a «No evaluable» en el pie («por horas sin registrar»); sin él, el de las escalas */
  noEvaluableCorto?: string | null;
  /** por qué quien mira ve la tarifa de cada persona («porque gerencia este proyecto») */
  porQueVe?: string | null;
}

const TXT = {
  es: {
    titulo: 'Costos del proyecto', salud: 'Salud financiera', porPersona: 'Costo por persona', horasPorPersona: 'Horas por persona', en: 'en',
    real: 'real', de: 'de', planeado: 'planeado', margenPrevisto: 'margen previsto',
    personas: (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'} con tareas abiertas`,
    bloqueado: 'Visible para gerente y Finanzas', ne: 'No evaluable', porEscalas: 'por tarifas en escalas distintas',
    ofertado: 'Valor ofertado', costoPlaneado: 'Costo planeado', costoReal: 'Costo real', delPlaneado: (p: number) => `${p}% del planeado`,
    margenPlaneado: 'Margen planeado', margenPrev: 'Margen previsto', desviacion: 'Desviación de horas',
    masHoras: 'más horas que las ganadas', menosHoras: 'menos horas que las ganadas',
    ayudas: {
      ofertado: 'Valor del contrato con el cliente.', planeado: 'Horas estimadas × tarifa de cada persona.',
      real: 'Horas registradas × tarifa de cada persona. Es la misma cifra que «Costo» en la cabecera.',
      margenPlaneado: 'Lo que queda si el proyecto cuesta lo planeado: valor ofertado − costo planeado.',
      margenPrevisto: 'Valor ofertado − costo estimado al terminar, si el costo sigue al ritmo actual.',
      desviacion: (r: string, g: string) => `Solo tareas hoja: ${r} h registradas frente a ${g} h que vale el avance logrado.`,
    },
    sinDineroNota: 'El valor ofertado, los costos y los márgenes los ven los administradores, Finanzas y el gerente del proyecto. Usted ve las horas.',
    persona: 'Persona', abiertas: 'Tareas abiertas', horas: 'Horas', tarifa: 'Tarifa', costo: 'Costo real', porHora: 'por hora',
    sinResp: 'Sin responsable', total: 'Total',
    porGastar: 'Por gastar según el plan:', alRitmo: ['Al ritmo de costo actual serían', 'hasta terminar.'],
    sinRespNota: (n: number) => `${n === 1 ? 'La tarea sin responsable se costea' : `Las ${n} tareas sin responsable se costean`} con la tarifa del espacio de trabajo.`,
    verRecursos: 'Ver la carga de cada persona en Recursos',
    tarifasBloqueadas: 'La tarifa y el costo de cada persona los ven los administradores, Finanzas y el gerente del proyecto.',
    veTarifas: (porQue: string) => `Usted ve la tarifa y el costo de cada persona ${porQue}. También los ven los administradores y Finanzas; el resto del equipo ve solo las horas.`,
  },
  en: {
    titulo: 'Project costs', salud: 'Financial health', porPersona: 'Cost per person', horasPorPersona: 'Hours per person', en: 'in',
    real: 'actual', de: 'of', planeado: 'planned', margenPrevisto: 'forecast margin',
    personas: (n: number) => `${n} ${n === 1 ? 'person' : 'people'} with open tasks`,
    bloqueado: 'Visible to the manager and Finance', ne: 'Not assessable', /* N14: la misma palabra que la cabecera */ porEscalas: 'because rates are on different scales',
    ofertado: 'Offered value', costoPlaneado: 'Planned cost', costoReal: 'Actual cost', delPlaneado: (p: number) => `${p}% of planned`,
    margenPlaneado: 'Planned margin', margenPrev: 'Forecast margin', desviacion: 'Hours variance',
    masHoras: 'more hours than earned', menosHoras: 'fewer hours than earned',
    ayudas: {
      ofertado: 'Contract value with the client.', planeado: 'Estimated hours × each person’s rate.',
      real: 'Logged hours × each person’s rate. It is the same figure as «Cost» in the header.',
      margenPlaneado: 'What is left if the project costs what was planned: offered value − planned cost.',
      margenPrevisto: 'Offered value − estimated cost at completion, if cost keeps the current pace.',
      desviacion: (r: string, g: string) => `Leaf tasks only: ${r} h logged against ${g} h earned by the progress made.`,
    },
    sinDineroNota: 'Admins, Finance and the project manager see the offered value, costs and margins. You see the hours.',
    persona: 'Person', abiertas: 'Open tasks', horas: 'Hours', tarifa: 'Rate', costo: 'Actual cost', porHora: 'per hour',
    sinResp: 'No owner', total: 'Total',
    porGastar: 'Left to spend according to the plan:', alRitmo: ['At the current cost pace it would be', 'until the end.'],
    sinRespNota: (n: number) => `${n === 1 ? 'The task without an owner is' : `The ${n} tasks without an owner are`} costed at the workspace rate.`,
    verRecursos: 'See each person’s load in Resources',
    tarifasBloqueadas: 'Admins, Finance and the project manager see each person’s rate and cost.',
    veTarifas: (porQue: string) => `You see each person’s rate and cost ${porQue}. Admins and Finance see them too; the rest of the team only sees hours.`,
  },
};

interface Persona { clave: string; nombre: string; iniciales: string; abiertas: number; reg: number; est: number; costo: number; tarifa: number; sinResp: boolean }

/** Por persona: tareas abiertas, horas y costo real; una hoja cuenta para su primer responsable. */
export function personasDelProyecto(tasks: Task[], tarifaDe: (h: Task) => number, tarifaDePersona?: (id: string) => number | undefined, sinResp = 'Sin responsable') {
  const m = new Map<string, Persona>();
  let planeado = 0;
  let sinRespAbiertas = 0;
  for (const raiz of tasks) for (const h of hojasDe(raiz)) {
    const a = (h.assignees ?? [])[0] as { id?: string; name?: string; initials?: string } | undefined;
    const clave = a ? a.id || a.name || '?' : '';
    const reg = ((h as { timeLoggedMinutes?: number }).timeLoggedMinutes ?? 0) / 60;
    const est = ((h as { effortMinutes?: number }).effortMinutes ?? 0) / 60;
    const tarifa = tarifaDe(h) || 0;
    const abierta = estadoDeHoja(h) !== 'done';
    let p = m.get(clave);
    if (!p) {
      p = { clave, nombre: a?.name ?? sinResp, iniciales: a?.initials ?? '+', abiertas: 0, reg: 0, est: 0, costo: 0, sinResp: !a, tarifa: (a?.id ? tarifaDePersona?.(a.id) : undefined) ?? tarifa };
      m.set(clave, p);
    }
    p.reg += reg; p.est += est; p.costo += reg * tarifa;
    if (abierta) { p.abiertas += 1; if (!a) sinRespAbiertas += 1; }
    planeado += est * tarifa;
  }
  const personas = [...m.values()].sort((a, b) => Number(a.sinResp) - Number(b.sinResp));
  const total = personas.reduce((t, p) => ({ abiertas: t.abiertas + p.abiertas, reg: t.reg + p.reg, est: t.est + p.est, costo: t.costo + p.costo }),
    { abiertas: 0, reg: 0, est: 0, costo: 0 });
  return { personas, total, planeado, sinRespAbiertas };
}

export function CostosDelProyectoV4({ tasks, es, tarifaDe, tarifaDePersona, monedaCodigo, salud, conCosto = true, onVerRecursos }: {
  tasks: Task[];
  es: boolean;
  tarifaDe: (hoja: Task) => number;
  tarifaDePersona?: (id: string) => number | undefined;
  monedaCodigo?: string | null;
  /** las cifras de la cabecera; sin ellas, el pie suma las de las tareas */
  salud?: SaludDelPieV4 | null;
  /** sin `salud`: ¿quien mira ve dinero? */
  conCosto?: boolean;
  onVerRecursos?: () => void;
}) {
  const x = es ? TXT.es : TXT.en;
  const moneda = monedaCodigo || '';
  const { personas, total, planeado: planeadoDeTareas, sinRespAbiertas } = useMemo(
    () => personasDelProyecto(tasks, tarifaDe, tarifaDePersona, x.sinResp), [tasks, tarifaDe, tarifaDePersona, x.sinResp]);
  if (!personas.length) return null;

  const veDinero = salud ? salud.veDinero : conCosto;
  const ne = salud?.noEvaluable ?? null;
  const real = salud ? salud.real : total.costo;
  const planeado = salud ? salud.planeado : planeadoDeTareas;
  const ofertado = salud?.ofertado ?? null;
  const alTerminar = salud?.alTerminar ?? null;
  const largo = (v: number) => `${millones(v, es)}${moneda ? ` ${moneda}` : ''}`;
  const pct = (v: number) => (ofertado ? Math.round((100 * v) / ofertado) : 0);
  const margenPlaneado = ofertado ? ofertado - planeado : null;
  const margenPrevisto = ofertado && alTerminar ? ofertado - alTerminar : null;
  const horasReg = salud?.horasRegistradas ?? 0;
  const horasGan = salud?.horasGanadas ?? 0;
  const desviacion = salud && horasGan > 0 ? Math.round((100 * (horasReg - horasGan)) / horasGan) : null;
  const activos = personas.filter((p) => !p.sinResp && p.abiertas > 0).length;
  const entero = (v: number) => `$${Math.round(v).toLocaleString(es ? 'es-CO' : 'en-US')}`;
  const porGastar = Math.max(0, planeado - real);
  const alRitmo = alTerminar != null && alTerminar > 0 ? Math.max(0, alTerminar - real) : null;

  const marcaNe = <span className="ne" tabIndex={0} role="note" title={ne ?? undefined}><Info />{x.ne}</span>;
  const candado = (texto: string) => <span className="locked"><Candado />{texto}</span>;

  const resumen = !veDinero ? <>{candado(x.bloqueado)}<span>· {x.personas(activos)}</span></>
    : ne ? <><span className="ne plain" title={ne}>{x.ne}</span><span>{salud?.noEvaluableCorto ?? x.porEscalas} · {x.personas(activos)}</span></>
      : (
        <span>
          {x.real} <span className="num">{largo(real)}</span> {x.de} <span className="num">{largo(planeado)}</span> {x.planeado}
          {margenPrevisto != null && <> · {x.margenPrevisto} <span className="num">{pct(margenPrevisto)}%</span>{margenPlaneado != null && <> ({x.planeado} <span className="num">{pct(margenPlaneado)}%</span>)</>}</>}
          {' · '}{x.personas(activos)}
        </span>
      );

  const cifra = (etiqueta: string, ayuda: string, valor: ReactNode, detalle?: string, rojo?: boolean) => (
    <div className="fk" key={etiqueta}>
      <dt title={ayuda}>{etiqueta}</dt>
      <dd className={rojo ? 'rojo' : undefined}>{valor}{detalle && <small>{detalle}</small>}</dd>
    </div>
  );
  const desv = cifra(x.desviacion, salud ? x.ayudas.desviacion(horasCortas(horasReg, es), horasCortas(horasGan, es)) : '',
    desviacion != null ? `${desviacion > 0 ? '+' : ''}${desviacion}%` : '—',
    desviacion ? (desviacion > 0 ? x.masHoras : x.menosHoras) : undefined, desviacion != null && desviacion > 10);

  return (
    <details className="fin" data-costos-v4>
      <summary><Chevron /><b>{x.titulo}</b><span className="fin-sum">{resumen}</span></summary>
      <div className="fin-body">
        <section className="fin-col">
          <h3>{x.salud}</h3>
          {veDinero ? (
            <dl className="fgrid">
              {cifra(x.ofertado, x.ayudas.ofertado, ofertado ? largo(ofertado) : '—')}
              {cifra(x.costoPlaneado, x.ayudas.planeado, ne ? marcaNe : largo(planeado))}
              {cifra(x.costoReal, x.ayudas.real, ne ? marcaNe : largo(real), !ne && planeado ? x.delPlaneado(Math.round((100 * real) / planeado)) : undefined)}
              {cifra(x.margenPlaneado, x.ayudas.margenPlaneado, ne ? marcaNe : margenPlaneado != null ? `${pct(margenPlaneado)}%` : '—',
                !ne && margenPlaneado != null ? largo(margenPlaneado) : undefined, !ne && margenPlaneado != null && margenPlaneado < 0)}
              {cifra(x.margenPrev, x.ayudas.margenPrevisto, ne ? marcaNe : margenPrevisto != null ? `${pct(margenPrevisto)}%` : '—',
                !ne && margenPrevisto != null ? largo(margenPrevisto) : undefined, !ne && margenPrevisto != null && margenPrevisto < 0)}
              {desv}
            </dl>
          ) : (
            <>
              <dl className="fgrid">{desv}</dl>
              <p className="perm"><Candado />{x.sinDineroNota}</p>
            </>
          )}
        </section>
        <section className="fin-col">
          <h3>{veDinero ? <>{x.porPersona}{moneda && <span>{x.en} {moneda}</span>}</> : x.horasPorPersona}</h3>
          <table className="rtab">
            <thead>
              <tr>
                <th scope="col">{x.persona}</th>
                <th scope="col" className="num">{x.abiertas}</th>
                <th scope="col" className="num">{x.horas}</th>
                {veDinero && <th scope="col" className="num">{x.tarifa}</th>}
                {veDinero && <th scope="col" className="num">{x.costo}</th>}
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => (
                <tr key={p.clave}>
                  <td><span className="who"><span className={`avatar${p.sinResp ? ' none' : ''}`} aria-hidden="true">{p.iniciales}</span>{p.nombre}</span></td>
                  <td className="num">{p.abiertas}</td>
                  <td className="num">{horasCortas(p.reg, es)} / {horasCortas(p.est, es)} h</td>
                  {veDinero && <td className="num">{ne ? marcaNe : p.tarifa ? <>{entero(p.tarifa)} <span className="unit">{x.porHora}</span></> : '—'}</td>}
                  {veDinero && <td className="num">{ne ? '—' : p.costo ? millones(p.costo, es) : '—'}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{x.total}</td>
                <td className="num">{total.abiertas}</td>
                <td className="num">{horasCortas(total.reg, es)} / {horasCortas(total.est, es)} h</td>
                {veDinero && <td />}
                {veDinero && <td className="num">{ne ? '—' : millones(total.costo, es)}</td>}
              </tr>
            </tfoot>
          </table>
          {veDinero && !ne && (
            <p className="rnote">
              {x.porGastar} <b>{largo(porGastar)}</b>.
              {alRitmo != null && <> {x.alRitmo[0]} <b>{largo(alRitmo)}</b> {x.alRitmo[1]}</>}
              {sinRespAbiertas > 0 && <> {x.sinRespNota(sinRespAbiertas)}</>}
              {onVerRecursos && <> <a href="#" onClick={(e) => { e.preventDefault(); onVerRecursos(); }}>{x.verRecursos}</a></>}
            </p>
          )}
          <p className="perm">
            <Candado />
            <span>
              {veDinero ? (salud?.porQueVe ? x.veTarifas(salud.porQueVe) : x.tarifasBloqueadas) : x.tarifasBloqueadas}
              {!veDinero && onVerRecursos && <> <a href="#" onClick={(e) => { e.preventDefault(); onVerRecursos(); }}>{x.verRecursos}</a></>}
            </span>
          </p>
        </section>
      </div>
    </details>
  );
}

function Chevron() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4" /></svg>;
}
function Candado() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
}
function Info() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="5.5" /><path d="M8 7.5v3.5M8 5.2v.1" /></svg>;
}

/* Las medidas son las de la maqueta (`details.fin`); los colores, `--v4-*` con los `--v6-*` de respaldo. */
export const CSS_COSTOS_V4 = `
.lista-v6 .vfoot.vfoot-fin{display:block;padding:0;min-height:0;border-top:0}
.lista-v6 details.fin{--fn-text:var(--v4-text,var(--v6-texto));--fn-text2:var(--v4-text2,var(--v6-texto-2));--fn-text3:var(--v4-text3,var(--v6-tenue));--fn-soft:var(--v4-soft,var(--v6-linea));--fn-border:var(--v4-border,var(--v6-borde));
  border-top:1px solid var(--fn-soft);background:var(--v4-card,var(--v6-tarjeta));border-radius:0 0 16px 16px;color:var(--fn-text2);font-size:12px}
.lista-v6 details.fin summary{list-style:none;display:flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;cursor:pointer;font-size:12px;color:var(--fn-text3);user-select:none}
.lista-v6 details.fin summary::-webkit-details-marker{display:none}
.lista-v6 details.fin summary b{color:var(--fn-text);font-weight:600;flex:none}
.lista-v6 details.fin summary>svg{transition:transform .15s;color:var(--fn-text3);flex:none}
.lista-v6 details.fin[open] summary>svg{transform:rotate(90deg)}
.lista-v6 .fin-sum{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.lista-v6 .fin-sum .num{color:var(--fn-text2)}
.lista-v6 .fin-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);border-top:1px solid var(--fn-soft)}
.lista-v6 .fin-col{padding:14px 16px 16px;min-width:0}
.lista-v6 .fin-col+.fin-col{border-left:1px solid var(--fn-soft)}
.lista-v6 .fin-col h3{margin:0 0 12px;font-size:12px;font-weight:600;color:var(--fn-text)}
.lista-v6 .fin-col h3 span{font-weight:400;color:var(--fn-text3);margin-left:4px}
.lista-v6 .fgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 20px;margin:0}
.lista-v6 .fk{min-width:0}
.lista-v6 .fk dt{font-size:12px;color:var(--fn-text3);cursor:help}
.lista-v6 .fk dd{margin:3px 0 0;font-size:16px;font-weight:600;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--fn-text)}
.lista-v6 .fk dd.rojo{color:var(--v4-red,var(--v6-rojo))}
.lista-v6 .fk dd small{display:block;margin-top:1px;font-size:12px;font-weight:400;color:var(--fn-text3);letter-spacing:0;white-space:normal}
.lista-v6 details.fin .ne{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px 0 6px;border-radius:6px;background:var(--v4-ne-bg,var(--v6-linea));color:var(--v4-ne,var(--v6-texto-2));font:500 12px var(--v4-ff-sans,inherit);letter-spacing:0;white-space:nowrap;cursor:help;vertical-align:middle}
.lista-v6 details.fin .ne.plain{background:none;padding:0;height:auto}
.lista-v6 details.fin .locked{display:inline-flex;align-items:center;gap:5px;color:var(--fn-text3);font-size:12px;white-space:nowrap}
.lista-v6 details.fin .rtab{border-collapse:collapse;width:100%;max-width:760px;margin:0;font-size:12px;color:var(--fn-text2)}
.lista-v6 details.fin .rtab th{font-size:12px;font-weight:500;color:var(--fn-text3);text-align:left;padding:0 12px 6px 0;white-space:nowrap}
.lista-v6 details.fin .rtab td{height:32px;padding:0 12px 0 0;border-top:1px solid var(--fn-soft);white-space:nowrap}
.lista-v6 details.fin .rtab th:last-child,.lista-v6 details.fin .rtab td:last-child{padding-right:0}
.lista-v6 details.fin .rtab .who{display:flex;align-items:center;gap:8px;color:var(--fn-text)}
.lista-v6 details.fin .rtab .avatar{width:22px;height:22px;margin:0;font-size:11px}
.lista-v6 details.fin .rtab .num{text-align:right;font-family:var(--v4-ff-sans,inherit);font-variant-numeric:tabular-nums}
.lista-v6 details.fin .rtab .unit{color:var(--fn-text3)}
.lista-v6 details.fin .rtab tfoot td{color:var(--fn-text);font-weight:600;border-top-color:var(--fn-border)}
.lista-v6 details.fin .rnote{margin:12px 0 0;font-size:12px;color:var(--fn-text2);line-height:1.5;max-width:76ch}
.lista-v6 details.fin .rnote b{color:var(--fn-text);font-weight:600}
.lista-v6 details.fin a{color:var(--v4-acc,var(--v6-acento-texto));font-weight:500;text-decoration:none}
.lista-v6 details.fin a:hover{text-decoration:underline}
.lista-v6 details.fin .perm{display:flex;align-items:flex-start;gap:8px;margin:10px 0 0;font-size:12px;color:var(--fn-text3);line-height:1.5;max-width:76ch}
.lista-v6 details.fin .perm svg{margin-top:2px;flex:none}
@container lista-v6 (max-width:1099px){
  .lista-v6 .fin-body{grid-template-columns:minmax(0,1fr)}
  .lista-v6 .fin-col+.fin-col{border-left:0;border-top:1px solid var(--fn-soft)}
  .lista-v6 .fin-col{overflow-x:auto}
}
@container lista-v6 (max-width:719px){
  .lista-v6 .fin-sum{white-space:normal}
  .lista-v6 details.fin summary{padding-top:8px;padding-bottom:8px;align-items:flex-start}
  .lista-v6 .fgrid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
`;
