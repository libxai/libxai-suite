/**
 * Maquetas v3 de Yesid (5-nov) · R6 · EL RIESGO SE VE DONDE PEGA: el punto en la fila del Gantt, en la Lista y en la tarjeta
 * del Tablero. Los riesgos llegan en `task.riesgos` (los pone la app); el punto enseña el de mayor nivel y el título los cuenta.
 */
import type { RiesgoDeLaTarea } from '../../Gantt/types';

const ORDEN: RiesgoDeLaTarea['nivel'][] = ['critico', 'alto', 'medio', 'bajo'];
const NOMBRES = {
  es: { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' },
  en: { critico: 'Critical', alto: 'High', medio: 'Medium', bajo: 'Low' },
};

export const nombreDeNivel = (n: RiesgoDeLaTarea['nivel'], es: boolean) => (es ? NOMBRES.es : NOMBRES.en)[n];
export const riesgoMayor = (rs: RiesgoDeLaTarea[]) => [...rs].sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel))[0];

/** «Riesgo R-01 · Alto (y 1 más)» */
export function tituloDeRiesgos(rs: RiesgoDeLaTarea[], es: boolean): string {
  const r = riesgoMayor(rs);
  if (!r) return '';
  const mas = rs.length > 1 ? (es ? ` (y ${rs.length - 1} más)` : ` (and ${rs.length - 1} more)`) : '';
  return `${es ? 'Riesgo' : 'Risk'} ${r.codigo} · ${nombreDeNivel(r.nivel, es)}${mas}`;
}

export function PuntoDeNivelDeRiesgo({ nivel, tam = 8 }: { nivel: RiesgoDeLaTarea['nivel']; tam?: number }) {
  const hueco = nivel === 'bajo';
  const color = nivel === 'critico' ? 'var(--v6-rojo-punto, #D13A40)' : nivel === 'alto' ? 'var(--v6-ambar-punto, #9A5B00)' : 'var(--v6-tenue, #5F6972)';
  return (
    <i aria-hidden="true" style={{
      width: tam, height: tam, borderRadius: '50%', display: 'inline-block', flex: 'none', boxSizing: 'border-box',
      background: hueco ? 'none' : color, border: hueco ? `1.5px solid ${color}` : 0,
    }} />
  );
}

/** «Riesgo R-01 · Alto: Retraso del proveedor (y 1 más)», el globo del escudo (guía v4). */
export function tituloDelEscudo(rs: RiesgoDeLaTarea[], es: boolean): string {
  const r = riesgoMayor(rs);
  if (!r) return '';
  const mas = rs.length > 1 ? (es ? ` (y ${rs.length - 1} más)` : ` (and ${rs.length - 1} more)`) : '';
  return `${es ? 'Riesgo' : 'Risk'} ${r.codigo} · ${nombreDeNivel(r.nivel, es)}${r.titulo ? `: ${r.titulo}` : ''}${mas}`;
}

/**
 * Guía v4 · «El riesgo es un escudo con el color del nivel y un tooltip, no un punto gris» (Tablero y Lista). El color
 * lo pone el CSS de la vista por `data-nivel` (tokens `--v4-lvl-*`); aquí solo la forma.
 */
export function EscudoDeRiesgo({ riesgos, es, className = 'kc-risk' }: { riesgos?: RiesgoDeLaTarea[]; es: boolean; className?: string }) {
  const r = riesgos?.length ? riesgoMayor(riesgos) : undefined;
  if (!r) return null;
  const titulo = tituloDelEscudo(riesgos!, es);
  return (
    <span className={className} data-nivel={r.nivel} data-punto-riesgo={r.nivel} role="img" aria-label={titulo} title={titulo}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2l5 2v4c0 3-2.2 5.3-5 6-2.8-.7-5-3-5-6V4z" /></svg>
    </span>
  );
}

export function PuntoDeRiesgo({ riesgos, es }: { riesgos?: RiesgoDeLaTarea[]; es: boolean }) {
  const r = riesgos?.length ? riesgoMayor(riesgos) : undefined;
  if (!r) return null;
  const titulo = tituloDeRiesgos(riesgos!, es);
  return <span role="img" aria-label={titulo} title={titulo} data-punto-riesgo={r.nivel} style={{ display: 'inline-flex', flex: 'none' }}><PuntoDeNivelDeRiesgo nivel={r.nivel} /></span>;
}
