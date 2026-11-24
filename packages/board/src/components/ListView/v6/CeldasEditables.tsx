/**
 * David (Axon), 24-nov · «Antes de la actualización el usuario podía registrar los tiempos estimados desde la vista lista dando
 * clic sobre el dato… Lo mismo con el usuario, el % de progreso y las fechas.» Las celdas de la Lista v4 que se editan en el
 * sitio. El envoltorio no cambia con el ratón: si cambiara, React desmontaría el calendario al llevar el ratón hasta él.
 */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarioDeFechaV4 } from '../../Gantt/CalendarioDeFechaV4';

const ALTO_CALENDARIO = 340;
const ANCHO_CALENDARIO = 270;

export function CeldaFecha({ valor, es, etiqueta, onElegir, children }: {
  valor: Date | null; es: boolean; etiqueta: string; onElegir: (d: Date) => void; children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [sitio, setSitio] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const caja = useRef<HTMLSpanElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const cerrar = () => { setAbierto(false); boton.current?.focus(); };
  useLayoutEffect(() => {
    if (!abierto) { setSitio(null); return; }
    const colocar = () => {
      const r = boton.current?.getBoundingClientRect();
      if (!r) return;
      const arriba = window.innerHeight - r.bottom < ALTO_CALENDARIO && r.top > window.innerHeight - r.bottom;
      const left = Math.max(8, Math.min(r.right - ANCHO_CALENDARIO, window.innerWidth - ANCHO_CALENDARIO - 8));
      setSitio(arriba ? { bottom: window.innerHeight - r.top + 4, left } : { top: r.bottom + 4, left });
    };
    colocar();
    window.addEventListener('scroll', colocar, true);
    window.addEventListener('resize', colocar);
    return () => { window.removeEventListener('scroll', colocar, true); window.removeEventListener('resize', colocar); };
  }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: MouseEvent) => { if (!caja.current?.contains(ev.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  return (
    <span ref={caja} className="ce-caja" onClick={(ev) => ev.stopPropagation()}
      onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Escape' && abierto) { ev.preventDefault(); cerrar(); } }}>
      <button ref={boton} type="button" className="ce-btn" aria-label={etiqueta} title={etiqueta} aria-haspopup="dialog" aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}>{children}</button>
      {abierto && sitio && (
        <div className="ce-cal v4-pop v4-scope" role="dialog" aria-label={etiqueta} style={sitio}>
          <CalendarioDeFechaV4 es={es} valor={valor} alElegir={(d) => { cerrar(); onElegir(d); }} alCerrar={cerrar} />
        </div>
      )}
    </span>
  );
}

/** Un número que se escribe en la celda: Enter o salir guarda, Escape cancela. Un texto que no vale se marca y NO se pierde en
 *  silencio: con Enter se queda abierto y dice por qué. */
export function CeldaNumero({ inicial, etiqueta, error, vale, onGuardar, children }: {
  inicial: string; etiqueta: string; error: string; vale: (texto: string) => boolean; onGuardar: (texto: string) => void; children: ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [mal, setMal] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const hecho = useRef(false);
  const terminar = (foco: boolean) => { hecho.current = true; setEditando(false); setMal(false); if (foco) requestAnimationFrame(() => boton.current?.focus()); };
  const guardar = (texto: string, foco: boolean) => {
    const v = texto.trim();
    if (v === inicial) { terminar(foco); return; }
    if (!vale(v)) { if (foco) setMal(true); else terminar(false); return; }
    terminar(foco);
    onGuardar(v);
  };
  if (!editando) return (
    <button ref={boton} type="button" className="ce-btn" aria-label={etiqueta} title={etiqueta}
      onClick={(ev) => { ev.stopPropagation(); hecho.current = false; setEditando(true); }} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') ev.stopPropagation(); }}>{children}</button>
  );
  const teclas = (ev: KeyboardEvent<HTMLInputElement>) => {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); guardar(ev.currentTarget.value, true); }
    if (ev.key === 'Escape') { ev.preventDefault(); terminar(true); }
  };
  return (
    <span className="hrs-edit" onClick={(ev) => ev.stopPropagation()}>
      <input autoFocus inputMode="decimal" maxLength={7} defaultValue={inicial} aria-label={etiqueta} aria-invalid={mal || undefined}
        onFocus={(ev) => ev.currentTarget.select()} onChange={() => setMal(false)} onKeyDown={teclas}
        onBlur={(ev) => { if (!hecho.current) guardar(ev.currentTarget.value, false); }} />
      {mal && <span className="hrs-msg err" role="alert">{error}</span>}
    </span>
  );
}

export const CSS_CELDAS = `
.ce-caja{display:inline-flex}
.lista-v6 .lt .ce-btn{max-width:100%;min-height:26px;padding:0 6px;margin-right:-6px;border:1px solid transparent;border-radius:6px;background:none;font:inherit;color:inherit;text-align:inherit;cursor:pointer}
.lista-v6 .lt .ce-btn:hover,.lista-v6 .lt .ce-btn[aria-expanded=true]{border-color:var(--v6-borde)}
.ce-cal{position:fixed;z-index:80;width:max-content;text-align:left;white-space:normal}
.lista-v6 .lt td.rel{position:relative}
.lista-v6 .lt .tirador{position:absolute;right:1px;bottom:1px;width:9px;height:9px;border-radius:2px;background:var(--v6-acento);border:1px solid var(--v6-tarjeta);cursor:crosshair;opacity:0}
.lista-v6 .lt td.rel:hover .tirador{opacity:1}
.lista-v6 .lt tr.en-relleno td{background:var(--v6-fila-seleccionada)!important}
.lista-v6 .lt .hrs .est{margin-left:-4px}
.lista-v6 .uso.pasa{color:var(--v6-rojo)}
`;
