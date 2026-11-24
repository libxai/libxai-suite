/**
 * David (Axon), 24-nov · en la Lista v4 no se podía asignar: el «+» de la tabla era un dibujo y el responsable del panel,
 * un texto. Este selector es el mismo en los dos sitios: busca por nombre y marca o desmarca personas.
 *
 * Va en `position: fixed` (la tabla y el panel desplazan y recortan) y dentro del árbol, para heredar los colores del tema.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Task } from '../../Gantt/types';
import { inicialesDe } from '../../../utils/iniciales';

export interface PersonaAsignable { id: string; name: string; avatar?: string; initials?: string; color?: string }
type Asignado = NonNullable<Task['assignees']>[number] & { id?: string };

/** sin tildes ni mayúsculas, para buscar «andres» y encontrar «Andrés» */
const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** por id; solo si al asignado le falta, por nombre (hay homónimos) */
const esLaMisma = (a: Asignado, p: PersonaAsignable) => (a.id ? a.id === p.id : a.name === p.name);

/** Marca o desmarca a una persona; quien ya estaba se conserva tal cual (sus horas por persona van en ese objeto). */
export function alternarResponsable(actuales: Asignado[], p: PersonaAsignable): Asignado[] {
  if (actuales.some((a) => esLaMisma(a, p))) return actuales.filter((a) => !esLaMisma(a, p));
  return [...actuales, { id: p.id, name: p.name, avatar: p.avatar, initials: p.initials || inicialesDe(p.name), color: p.color ?? '#00BFA8' } as Asignado];
}

const ANCHO = 260;
const ALTO = 300;

export function SelectorDeResponsables({ valor, personas, es, onCambiar, children, clase = '' }: {
  valor: Asignado[]; personas: PersonaAsignable[]; es: boolean; onCambiar: (v: Asignado[]) => void; children: ReactNode; clase?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState('');
  const [sitio, setSitio] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const caja = useRef<HTMLSpanElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const cerrar = (devolverFoco = true) => { setAbierto(false); setBusca(''); if (devolverFoco) boton.current?.focus(); };

  useLayoutEffect(() => {
    if (!abierto) { setSitio(null); return; }
    const colocar = () => {
      const r = boton.current?.getBoundingClientRect();
      if (!r) return;
      const arriba = window.innerHeight - r.bottom < ALTO && r.top > window.innerHeight - r.bottom;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - ANCHO - 8));
      setSitio(arriba ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
    };
    colocar();
    window.addEventListener('scroll', colocar, true);
    window.addEventListener('resize', colocar);
    return () => { window.removeEventListener('scroll', colocar, true); window.removeEventListener('resize', colocar); };
  }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: MouseEvent) => { if (!caja.current?.contains(ev.target as Node)) cerrar(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const visibles = personas.filter((p) => plano(p.name).includes(plano(busca.trim())));
  /* las teclas son del selector: la fila de la tabla usa flechas y Enter, y el panel se cierra con Escape */
  const teclas = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!abierto) return;
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    const ls = [...(caja.current?.querySelectorAll<HTMLElement>('.sr-b, [role=option]') ?? [])];
    const i = ls.indexOf(document.activeElement as HTMLElement);
    ls[(i + (ev.key === 'ArrowDown' ? 1 : ls.length - 1) + ls.length) % ls.length]?.focus();
  };
  const nombres = valor.map((a) => a.name).join(', ');
  return (
    <span ref={caja} className="sr-caja" onClick={(ev) => ev.stopPropagation()} onKeyDown={teclas}>
      <button ref={boton} type="button" className={`sr-btn ${clase}`.trim()} aria-haspopup="listbox" aria-expanded={abierto} data-asignar=""
        title={nombres || (es ? 'Asignar responsable' : 'Assign')}
        aria-label={nombres ? `${es ? 'Responsables' : 'Owners'}: ${nombres}. ${es ? 'Cambiar' : 'Change'}` : (es ? 'Asignar responsable' : 'Assign an owner')}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}>{children}</button>
      {abierto && sitio && (
        <div className="sr-menu" style={{ ...sitio, width: ANCHO, maxHeight: ALTO }}>
          <input className="sr-b" autoFocus value={busca} onChange={(ev) => setBusca(ev.target.value)}
            placeholder={es ? 'Buscar persona…' : 'Search people…'} aria-label={es ? 'Buscar persona' : 'Search people'} />
          <div className="sr-l" role="listbox" aria-multiselectable="true" aria-label={es ? 'Responsables' : 'Owners'}>
            {visibles.map((p) => {
              const si = valor.some((a) => esLaMisma(a, p));
              return (
                <button key={p.id} type="button" role="option" aria-selected={si} data-persona={p.id} onClick={() => onCambiar(alternarResponsable(valor, p))}>
                  <span className="sr-c" aria-hidden="true">{si ? '✓' : ''}</span><span className="sr-n">{p.name}</span>
                </button>
              );
            })}
            {!visibles.length && <p>{es ? 'Nadie con ese nombre.' : 'Nobody by that name.'}</p>}
          </div>
        </div>
      )}
    </span>
  );
}

export const CSS_RESPONSABLES = `
.sr-caja{display:inline-flex;min-width:0;max-width:100%}
.sr-btn{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:100%;padding:2px;border:0;border-radius:6px;background:none;font:inherit;color:inherit;cursor:pointer}
.sr-btn:hover{background:var(--v6-linea)}
.sr-menu{position:fixed;z-index:80;display:flex;flex-direction:column;text-align:left;border:1px solid var(--v6-borde);border-radius:8px;background:var(--v6-pagina,#fff);color:var(--v6-texto);box-shadow:0 8px 28px -6px rgba(14,17,20,.35);font-size:12px;font-weight:400;overflow:hidden}
.sr-menu .sr-b{height:34px;flex:none;padding:0 10px;border:0;border-bottom:1px solid var(--v6-linea);background:none;color:inherit;font:inherit;outline-offset:-2px}
.sr-menu .sr-l{overflow-y:auto;padding:4px}
.sr-menu .sr-l p{margin:8px;color:var(--v6-tenue)}
.sr-menu [role=option]{display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:0;border-radius:6px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.sr-menu [role=option]:hover,.sr-menu [role=option]:focus-visible{background:var(--v6-linea)}
.sr-menu .sr-c{width:12px;flex:none;color:var(--v6-acento-texto)}
.sr-menu .sr-n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;
