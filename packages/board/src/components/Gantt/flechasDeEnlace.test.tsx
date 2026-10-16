/**
 * QA Asakaa · mejora fuerte 5 · las flechas de los cuatro tipos, MONTADAS: por qué lado entran,
 * hacia dónde mira la punta y su etiqueta. FS sin desfase se dibuja igual que siempre.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DependencyLine } from './DependencyLine';

const theme = { bgPrimary: '#0F1115' };
const montar = (props: Record<string, unknown>) => render(
  <svg>
    <DependencyLine x1={100} y1={20} x2={300} y2={60} theme={theme} lineStyle="squared" {...props} />
  </svg>,
);
/** La punta: el primer punto es (x2, y2); el segundo dice hacia dónde mira. */
const punta = (c: HTMLElement) => {
  const d = [...c.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '').find((x) => x.endsWith('Z'))!;
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return { x: n[0], xBase: n[2] };
};

describe('flechas de enlace (mejora fuerte 5)', () => {
  it('FS: la punta mira a la DERECHA (entra por el inicio de la sucesora), sin etiqueta', () => {
    const { container } = montar({});
    const p = punta(container);
    expect(p.xBase).toBeLessThan(p.x);
    expect(container.querySelector('[data-etiqueta-de-enlace]')).toBeNull();
  });
  it('FF / CF: entra por el FIN: la punta mira a la IZQUIERDA', () => {
    const { container } = montar({ entradaPorFin: true });
    const p = punta(container);
    expect(p.xBase).toBeGreaterThan(p.x);
  });
  it('SS: sale por el inicio: el primer tramo va hacia la IZQUIERDA', () => {
    const { container } = montar({ salidaPorInicio: true });
    const d = container.querySelector('path')!.getAttribute('d')!;
    const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(n[0]).toBe(100);
    expect(n[2]).toBeLessThan(100);
  });
  it('la etiqueta con tipo y desfase se pinta junto a la punta', () => {
    const { container } = montar({ salidaPorInicio: true, etiqueta: 'CC +2' });
    expect(container.querySelector('[data-etiqueta-de-enlace]')?.textContent).toBe('CC +2');
  });
});
