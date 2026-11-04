/**
 * Maquetas v3 de Yesid (4-nov) · G4 · EL PANEL DE LA TAREA en la Lista v6: acoplado a la derecha de la tabla (400 px;
 * 340 px y sin «Duración» si la tarjeta mide menos de 1480: la tabla pide unos 1040), sin oscurecer nada, para ver la fila mientras se lee. Lo de la maqueta:
 *
 *   · migas «Proyecto › fase › padre», WBS, nombre;
 *   · chip de estado, «Retraso: N días hábiles» en rojo y «Espera a 2.1» si está bloqueada por una predecesora;
 *   · barrita de avance de 4 px;
 *   · Responsable · Fechas · Duración · Horas · Costo (real de planeado) · Prioridad · Depende de, con etiquetas 11/500;
 *   · Descripción y, en un padre, sus hijas (cada una abre su panel).
 *
 * Lo que vive en la ficha de siempre (comentarios, documentos, riesgos, edición) se abre con «Abrir ficha completa».
 */
import { useEffect, useRef } from 'react';
import type { Task } from '../../Gantt/types';
import type { Calendario } from '../../Gantt/motorDeProgramacion';
import { fechaCorta } from '../../Gantt/fechaCorta';
import { diasDeRetraso, duracionHabil, estaVencida, hojasDe, horasCortas, millones, tieneHijas, type CifrasDeFila, type EstadoV6 } from './reglasDeLaLista';

const TXT = {
  es: {
    panel: 'Detalle de la tarea', cerrar: 'Cerrar panel', ficha: 'Abrir ficha completa',
    retraso: (n: number) => `Retraso: ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`, espera: 'Espera a',
    resp: 'Responsable', asignar: 'Sin responsable', fechas: 'Fechas', dur: 'Duración', horas: 'Horas', costo: 'Costo',
    prio: 'Prioridad', dep: 'Depende de', nada: 'Nada', desc: 'Descripción', sinDesc: 'Sin descripción.',
    dias: (n: number) => `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`, hito: 'Hito', sumaHijas: 'suma de las hijas',
    planeado: (v: string) => `de ${v} planeado`,
    hijas: (h: number, n: number) => `Tareas hijas · ${h} de ${n} tareas terminadas en total`,
    nota: 'El estado, las fechas y el avance de una tarea padre se calculan con sus hijas.',
    comentar: 'Escriba un comentario; use @ para mencionar',
    p: { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' } as Record<string, string>,
  },
  en: {
    panel: 'Task detail', cerrar: 'Close panel', ficha: 'Open full task',
    retraso: (n: number) => `Delay: ${n} working ${n === 1 ? 'day' : 'days'}`, espera: 'Waiting for',
    resp: 'Owner', asignar: 'No owner', fechas: 'Dates', dur: 'Duration', horas: 'Hours', costo: 'Cost',
    prio: 'Priority', dep: 'Depends on', nada: 'Nothing', desc: 'Description', sinDesc: 'No description.',
    dias: (n: number) => `${n} working ${n === 1 ? 'day' : 'days'}`, hito: 'Milestone', sumaHijas: 'sum of the subtasks',
    planeado: (v: string) => `of ${v} planned`,
    hijas: (h: number, n: number) => `Subtasks · ${h} of ${n} tasks finished in total`,
    nota: 'The status, dates and progress of a parent task come from its subtasks.',
    comentar: 'Write a comment; use @ to mention',
    p: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as Record<string, string>,
  },
};

export interface FilaDelPanel { t: Task; wbs: string; ancestros: string[] }

export function PanelDeTareaV6({
  fila, es, cal, hoy, nombreProyecto, cifras, estados, nombreEstado, porId, tarifaDe, onCerrar, onAbrirFicha, onIrA,
}: {
  fila: FilaDelPanel;
  es: boolean;
  cal: Calendario;
  hoy: Date;
  nombreProyecto?: string;
  cifras: CifrasDeFila;
  estados: Map<string, EstadoV6>;
  nombreEstado: Record<EstadoV6, string>;
  porId: Map<string, FilaDelPanel>;
  tarifaDe: (hoja: Task) => number;
  onCerrar: () => void;
  onAbrirFicha?: (t: Task) => void;
  onIrA: (id: string) => void;
}) {
  const x = es ? TXT.es : TXT.en;
  const idioma = es ? 'es' : 'en';
  const { t, wbs } = fila;
  const padre = tieneHijas(t);
  const e = estados.get(t.id) ?? 'todo';
  const caja = useRef<HTMLElement>(null);
  /* al abrir otra tarea, el panel vuelve arriba */
  useEffect(() => { caja.current?.scrollTo?.({ top: 0 }); }, [t.id]);

  const migas = [nombreProyecto, ...fila.ancestros.map((a) => porId.get(a)?.t.name)].filter(Boolean).join(' › ');
  const vencida = estaVencida(t, hoy);
  const retraso = vencida ? diasDeRetraso(t, hoy, cal) : 0;
  const deps = (t.dependencies ?? []).map((id) => porId.get(id)).filter((f): f is FilaDelPanel => !!f);
  const espera = e === 'blocked' ? deps.find((d) => estados.get(d.t.id) !== 'done') : undefined;
  const pct = Math.round(t.progress ?? 0);
  const fecha = (d?: Date) => (d ? fechaCorta(new Date(d), idioma, hoy) : '—');
  const dur = duracionHabil(t, cal);
  const planeado = hojasDe(t).reduce((a, h) => a + (((h as { effortMinutes?: number }).effortMinutes ?? 0) / 60) * (tarifaDe(h) || 0), 0);
  const a = (t.assignees ?? [])[0];
  const descripcion = String((t as { description?: string }).description ?? '').trim();
  const prioridad = t.priority ? x.p[t.priority] ?? t.priority : '—';
  const hijas = (t.subtasks ?? []).map((h) => porId.get(h.id)).filter((f): f is FilaDelPanel => !!f);

  return (
    <aside ref={caja} className="dpanel" aria-labelledby={`dp-t-${t.id}`}
      onKeyDown={(ev) => { if (ev.key === 'Escape' && !ev.defaultPrevented) { ev.stopPropagation(); onCerrar(); } }}>
      <div className="dp-top">
        <span className="crumb" title={migas}>{migas}</span>
        {onAbrirFicha && (
          <button type="button" className="icon-btn" aria-label={x.ficha} title={x.ficha} onClick={() => onAbrirFicha(t)}>
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2.5h4v4M13.5 2.5 8 8M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />
            </svg>
          </button>
        )}
        <button type="button" className="icon-btn" aria-label={x.cerrar} title={x.cerrar} onClick={onCerrar}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>
      <div className="dp-in">
        <div>
          <div className="mono dp-wbs">{wbs}</div>
          <h2 className="dp-title" id={`dp-t-${t.id}`}>{t.name}</h2>
        </div>
        <div className="dp-state">
          <span className={`schip ${e}`}><i aria-hidden="true" />{nombreEstado[e]}</span>
          {vencida && retraso > 0 && <span className="dp-late">{x.retraso(retraso)}</span>}
          {espera && <span className="dp-warn">{x.espera} <span className="mono">{espera.wbs}</span></span>}
        </div>
        {!t.isMilestone && (
          <div className="dp-prog">
            <span className="pbar" aria-hidden="true"><b style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></span>
            <span className={`pct${pct === 0 ? ' zero' : ''}`}>{pct}%</span>
          </div>
        )}
        <dl className="dp-f">
          <dt>{x.resp}</dt>
          <dd>
            {a ? <><span className="avatar" aria-hidden="true">{a.initials}</span><span>{a.name}</span></>
              : <><span className="avatar none" aria-hidden="true">+</span><span className="muted">{x.asignar}</span></>}
          </dd>
          <dt>{x.fechas}</dt>
          <dd>
            {!t.isMilestone && <span className="mono">{fecha(t.startDate)} –</span>}
            {vencida ? <span className="chip-red">{fecha(t.endDate)}</span> : <span className="mono">{fecha(t.endDate)}</span>}
          </dd>
          <dt>{x.dur}</dt>
          <dd><span className="mono">{t.isMilestone ? x.hito : dur == null ? '—' : x.dias(dur)}</span></dd>
          <dt>{x.horas}</dt>
          <dd>
            <span className="mono">{t.isMilestone ? '—' : `${horasCortas(cifras.reg, es)} / ${horasCortas(cifras.est, es)} h`}</span>
            {padre && <span className="muted">{x.sumaHijas}</span>}
          </dd>
          <dt>{x.costo}</dt>
          <dd>
            {planeado ? <><span className="mono">{millones(cifras.costo, es)}</span><span className="muted">{x.planeado(millones(planeado, es))}</span></>
              : <span className="mono">—</span>}
          </dd>
          <dt>{x.prio}</dt>
          <dd>{prioridad}</dd>
          <dt>{x.dep}</dt>
          <dd className="dp-deps">
            {deps.length ? deps.map((d) => (
              <span key={d.t.id}>
                <span className="mono tenue">{d.wbs}</span> {d.t.name} <span className="muted">· {nombreEstado[estados.get(d.t.id) ?? 'todo']}</span>
              </span>
            )) : <span className="muted">{x.nada}</span>}
          </dd>
        </dl>
        <div>
          <h3 className="dp-h">{x.desc}</h3>
          <p className="dp-desc">{descripcion || x.sinDesc}</p>
        </div>
        {padre && (
          <div>
            <h3 className="dp-h">{x.hijas(cifras.hechas, cifras.hojas)}</h3>
            {hijas.map((h) => {
              const ph = Math.round(h.t.progress ?? 0);
              const eh = estados.get(h.t.id) ?? 'todo';
              return (
                <button key={h.t.id} type="button" className="dp-link" onClick={() => onIrA(h.t.id)}>
                  <span className="mono tenue">{h.wbs}</span>
                  <span className="nm">{h.t.name}</span>
                  <span className="end">
                    <span className={`pct${ph === 0 ? ' zero' : ''}`}>{ph}%</span>
                    <span className={`schip ${eh}`}><i aria-hidden="true" />{nombreEstado[eh]}</span>
                  </span>
                </button>
              );
            })}
            <p className="dp-nota">{x.nota}</p>
          </div>
        )}
        {onAbrirFicha && (
          <button type="button" className="cbox" onClick={() => onAbrirFicha(t)}>{x.comentar}</button>
        )}
      </div>
    </aside>
  );
}

export const CSS_PANEL_V6 = `
.lista-v6{container:lista-v6/inline-size}
.lista-v6 .lbody{display:flex;min-height:0;flex:1;border-top:1px solid var(--v6-linea)}
.lista-v6 .lbody .lwrap{border-top:0}
.lista-v6 .dpanel{width:400px;flex:none;border-left:1px solid var(--v6-borde);background:var(--v6-tarjeta);overflow:auto;max-height:calc(100vh - 262px);min-height:420px}
.lista-v6 .dp-top{position:sticky;top:0;background:var(--v6-tarjeta);z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px 8px 16px;border-bottom:1px solid var(--v6-linea);font-size:11px;color:var(--v6-tenue)}
.lista-v6 .dp-top .crumb{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .icon-btn{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--v6-texto-2);border:0;background:transparent;cursor:pointer;flex:none}
.lista-v6 .icon-btn:hover{background:var(--v6-fila-hover);color:var(--v6-texto)}
.lista-v6 .dp-in{padding:14px 16px 18px;display:flex;flex-direction:column;gap:14px}
.lista-v6 .dp-wbs{font-size:11px;color:var(--v6-tenue);margin-bottom:4px}
.lista-v6 .dp-title{margin:0;font-size:18px;font-weight:600;letter-spacing:-.01em;line-height:1.3;color:var(--v6-texto)}
.lista-v6 .dp-state{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lista-v6 .dp-late{color:var(--v6-rojo);font-size:12px;font-weight:500}
.lista-v6 .dp-warn{color:var(--v6-ambar);font-size:11px;font-weight:500}
.lista-v6 .dp-prog{display:flex;align-items:center;gap:10px}
.lista-v6 .pbar{flex:1;height:4px;border-radius:2px;background:var(--v6-pista);overflow:hidden;display:block}
.lista-v6 .pbar b{display:block;height:100%;background:var(--v6-acento);border-radius:2px}
.lista-v6 .dp-f{display:grid;grid-template-columns:104px 1fr;row-gap:2px;margin:0}
.lista-v6 .dp-f dt{font-size:11px;font-weight:500;color:var(--v6-tenue);min-height:32px;display:flex;align-items:center}
.lista-v6 .dp-f dd{margin:0;min-height:32px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--v6-texto)}
.lista-v6 .dp-f .mono{font-size:12px;color:var(--v6-texto-2)}
.lista-v6 .dp-f .muted,.lista-v6 .dp-in .muted{font-size:12px;color:var(--v6-tenue);font-weight:500}
.lista-v6 .dp-f .dp-deps{flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;padding:6px 0}
.lista-v6 .tenue{color:var(--v6-tenue)!important}
.lista-v6 .dp-h{font-size:11px;font-weight:500;color:var(--v6-tenue);margin:0 0 6px}
.lista-v6 .dp-desc{margin:0;color:var(--v6-texto-2);font-weight:400;line-height:1.5;white-space:pre-line}
.lista-v6 .dp-nota{margin:6px 0 0;font-size:12px;color:var(--v6-tenue);line-height:1.5}
.lista-v6 .dp-link{display:flex;align-items:center;gap:8px;width:100%;min-height:30px;padding:0 6px;margin:0 -6px;box-sizing:content-box;color:var(--v6-texto);border-radius:6px;border:0;background:transparent;font:inherit;text-align:left;cursor:pointer}
.lista-v6 .dp-link:hover{background:var(--v6-fila-hover)}
.lista-v6 .dp-link .mono{font-size:11px;flex:none;white-space:nowrap}
.lista-v6 .dp-link .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lista-v6 .dp-link .end{margin-left:auto;display:flex;gap:8px;align-items:center;flex:none}
.lista-v6 .cbox{width:100%;height:36px;border:1px solid var(--v6-borde);border-radius:10px;display:flex;align-items:center;padding:0 10px;color:var(--v6-tenue);font:inherit;font-size:12px;text-align:left;cursor:text;background:transparent}
/* la maqueta dice «por debajo de 1440 px» con su página entera; aquí manda el ancho de la tarjeta (sin el menú lateral) */
@container lista-v6 (max-width:1479px){
  .lista-v6 .dpanel{width:340px}
  .lista-v6 .lbody.has-panel .col-dur{display:none}
  .lista-v6 .lt .c1{min-width:300px}
}
`;
