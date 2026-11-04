/**
 * Maquetas v3 de Yesid (4-nov) · «RECURSOS E IMPACTO DE FLUJO DE CAJA», plegado al pie de la Lista v6 (y del Tablero y el
 * Calendario: el resumen de Recursos para un solo proyecto). Por persona: tareas abiertas, horas reg./est., tarifa y costo
 * real; el total es el mismo de la tabla. Debajo, lo que falta por gastar según el plan y al ritmo de costo actual.
 *
 * Una hoja cuenta para su PRIMER responsable (el que enseña la columna); sin responsable, se costea con la tarifa del espacio.
 */
import { useMemo } from 'react';
import type { Task } from '../../Gantt/types';
import { estadoDeHoja, hojasDe, horasCortas, millones } from './reglasDeLaLista';

const TXT = {
  es: {
    titulo: 'Recursos e impacto de flujo de caja', activo: 'recurso activo', activos: 'recursos activos',
    persona: 'Persona', abiertas: 'Abiertas', horas: 'Horas reg./est.', tarifa: (m: string) => (m ? `Tarifa (${m}/h)` : 'Tarifa por hora'), costo: (m: string) => (m ? `Costo real (${m})` : 'Costo real'),
    sinResp: 'Sin responsable', total: 'Total',
    porGastar: 'Por gastar según el plan:', alRitmo: ['Al ritmo de costo actual serían', 'hasta terminar.'],
    sinRespNota: (n: number) => `${n} ${n === 1 ? 'tarea sin responsable se costea' : 'tareas sin responsable se costean'} con la tarifa del espacio de trabajo.`,
    verRecursos: 'Ver la carga de cada persona en Recursos',
  },
  en: {
    titulo: 'Resources and cash-flow impact', activo: 'active resource', activos: 'active resources',
    persona: 'Person', abiertas: 'Open', horas: 'Hours logged/est.', tarifa: (m: string) => (m ? `Rate (${m}/h)` : 'Hourly rate'), costo: (m: string) => (m ? `Actual cost (${m})` : 'Actual cost'),
    sinResp: 'No owner', total: 'Total',
    porGastar: 'Left to spend according to the plan:', alRitmo: ['At the current cost pace it would be', 'until the end.'],
    sinRespNota: (n: number) => `${n} ${n === 1 ? 'task without an owner is' : 'tasks without an owner are'} costed at the workspace rate.`,
    verRecursos: 'See each person’s load in Resources',
  },
};

interface Persona { clave: string; nombre: string; iniciales: string; abiertas: number; reg: number; est: number; costo: number; tarifa: number; sinResp: boolean }

export function RecursosDeLaListaV6({ tasks, es, tarifaDe, tarifaDePersona, monedaCodigo, costoAlTerminar, onVerRecursos }: {
  tasks: Task[];
  es: boolean;
  tarifaDe: (hoja: Task) => number;
  tarifaDePersona?: (id: string) => number | undefined;
  monedaCodigo?: string;
  costoAlTerminar?: number | null;
  onVerRecursos?: () => void;
}) {
  const x = es ? TXT.es : TXT.en;
  const moneda = monedaCodigo || '';
  const { personas, total, planeado, sinRespAbiertas } = useMemo(() => {
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
        p = {
          clave, nombre: a?.name ?? x.sinResp, iniciales: a?.initials ?? '+', abiertas: 0, reg: 0, est: 0, costo: 0, sinResp: !a,
          tarifa: (a?.id ? tarifaDePersona?.(a.id) : undefined) ?? tarifa,
        };
        m.set(clave, p);
      }
      p.reg += reg; p.est += est; p.costo += reg * tarifa;
      if (abierta) { p.abiertas += 1; if (!a) sinRespAbiertas += 1; }
      planeado += est * tarifa;
    }
    /* en el orden en que aparecen; «Sin responsable», al final */
    const personas = [...m.values()].sort((a, b) => Number(a.sinResp) - Number(b.sinResp));
    const total = personas.reduce((t, p) => ({ abiertas: t.abiertas + p.abiertas, reg: t.reg + p.reg, est: t.est + p.est, costo: t.costo + p.costo }),
      { abiertas: 0, reg: 0, est: 0, costo: 0 });
    return { personas, total, planeado, sinRespAbiertas };
  }, [tasks, tarifaDe, tarifaDePersona, x.sinResp]);

  if (!personas.length) return null;
  const activos = personas.filter((p) => !p.sinResp && p.abiertas > 0).length;
  const largo = (v: number) => (v ? `${millones(v, es)}${moneda ? ` ${moneda}` : ''}` : '—');
  const entero = (v: number) => (v ? `$${Math.round(v).toLocaleString(es ? 'es-CO' : 'en-US')}` : '—');
  const porGastar = Math.max(0, planeado - total.costo);
  const alRitmo = costoAlTerminar != null && costoAlTerminar > 0 ? Math.max(0, costoAlTerminar - total.costo) : null;

  return (
    <details className="res" data-recursos-v6>
      <summary>
        <span className="flecha" aria-hidden="true">›</span>
        <b>{x.titulo}</b>
        <span>· <span className="mono">{activos}</span> {activos === 1 ? x.activo : x.activos}</span>
      </summary>
      <table className="rtab">
        <thead>
          <tr>
            <th scope="col">{x.persona}</th>
            <th scope="col" className="num">{x.abiertas}</th>
            <th scope="col" className="num">{x.horas}</th>
            <th scope="col" className="num">{x.tarifa(moneda)}</th>
            <th scope="col" className="num">{x.costo(moneda)}</th>
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <tr key={p.clave}>
              <td>
                <span className={`avatar${p.sinResp ? ' none' : ''}`} aria-hidden="true">{p.iniciales}</span> {p.nombre}
              </td>
              <td className="num">{p.abiertas}</td>
              <td className="num">{horasCortas(p.reg, es)} / {horasCortas(p.est, es)} h</td>
              <td className="num">{entero(p.tarifa)}</td>
              <td className="num">{millones(p.costo, es)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{x.total}</td>
            <td className="num">{total.abiertas}</td>
            <td className="num">{horasCortas(total.reg, es)} / {horasCortas(total.est, es)} h</td>
            <td />
            <td className="num">{millones(total.costo, es)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="rnote">
        {x.porGastar} <b>{largo(porGastar)}</b>.
        {alRitmo != null && <> {x.alRitmo[0]} <b>{largo(alRitmo)}</b> {x.alRitmo[1]}</>}
        {sinRespAbiertas > 0 && <> {x.sinRespNota(sinRespAbiertas)}</>}
        {onVerRecursos && <> <a href="#" onClick={(e) => { e.preventDefault(); onVerRecursos(); }}>{x.verRecursos}</a></>}
      </p>
    </details>
  );
}

export const CSS_RECURSOS_V6 = `
.lista-v6 .vfoot{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:0 12px;min-height:38px;padding:0 14px;border-top:1px solid var(--v6-linea);font-size:12px;color:var(--v6-tenue)}
.lista-v6 .res{flex:1 1 540px;min-width:0}
.lista-v6 .res summary{list-style:none;display:flex;align-items:center;gap:6px;min-height:38px;cursor:pointer;user-select:none}
.lista-v6 .res summary::-webkit-details-marker{display:none}
.lista-v6 .res summary b{color:var(--v6-texto-2);font-weight:500}
.lista-v6 .res .flecha{display:inline-block;font-size:10px;transition:transform .15s}
.lista-v6 .res[open] .flecha{transform:rotate(90deg)}
.lista-v6 .rtab{border-collapse:collapse;margin:0 0 12px 22px;font-size:12px;color:var(--v6-texto-2)}
.lista-v6 .rtab th{font-size:11px;font-weight:500;color:var(--v6-tenue);text-align:left;padding:4px 14px 4px 0;white-space:nowrap}
.lista-v6 .rtab td{padding:5px 14px 5px 0;border-top:1px solid var(--v6-linea);white-space:nowrap}
.lista-v6 .rtab td .avatar{width:20px;height:20px;font-size:10px;margin-right:4px;vertical-align:middle}
.lista-v6 .rtab .num{text-align:right;font-family:'Geist Mono',monospace;font-variant-numeric:tabular-nums}
.lista-v6 .rtab th.num{font-family:inherit}
.lista-v6 .rtab tfoot td{color:var(--v6-texto);font-weight:600}
.lista-v6 .rnote{margin:0 0 12px 22px;font-size:12px;color:var(--v6-texto-2);max-width:720px;line-height:1.5}
.lista-v6 .rnote b{color:var(--v6-texto);font-weight:600}
.lista-v6 .rnote a{color:var(--v6-acento-texto);font-weight:500;text-decoration:underline;text-underline-offset:2px}
.lista-v6 .vfoot .leyenda{min-height:38px;justify-content:flex-end;margin-left:auto;padding:0}
`;
