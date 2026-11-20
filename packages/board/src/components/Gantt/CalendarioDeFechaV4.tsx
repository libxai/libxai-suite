/**
 * El calendario de «Start»/«End» en la tabla del Gantt, con el aspecto del selector de la v4.
 *
 * Yesid (19-nov): «hoy hay tres selectores de fecha distintos (el del Gantt, el de crear proyecto y los del panel de
 * tarea); la v4 pide uno solo». En la app ese uno es `CalendarioV4` (maqueta `dpHtml`). La librería no puede importar
 * la app, así que pinta el MISMO marcado con las MISMAS clases (`v4-pop`, `v4-fecha`, `v4-fecha-dia`…): las reglas
 * viven en un solo sitio, el `v4.css` de la app, y aquí no se repite ningún color.
 *
 * Semana de lunes a domingo, fines de semana atenuados, hoy con aro, la elegida en la marca. ←/→ un día, ↑/↓ una
 * semana (cambia de mes sola), Enter/Espacio elige, Escape y Tab cierran. «Quitar la fecha» en el pie.
 */
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as KeyboardEventReact } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const dos = (n: number) => String(n).padStart(2, '0');
export const isoLocal = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const deIso = (iso: string) => { const [a = 0, m = 1, d = 1] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const moverDias = (iso: string, n: number) => { const d = deIso(iso); d.setDate(d.getDate() + n); return isoLocal(d); };

/** Las celdas del mes, de lunes a domingo, con huecos (`null`) delante. */
export function rejillaDelMes(anio: number, mes: number): Array<string | null> {
  const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const dias = new Date(anio, mes + 1, 0).getDate();
  return [...Array.from({ length: huecos }, () => null), ...Array.from({ length: dias }, (_, i) => isoLocal(new Date(anio, mes, i + 1)))];
}

/** Las iniciales de la semana, como la v4: la primera letra del nombre del día. */
export const inicialesDeLaSemana = (es: boolean) => (es ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']);

export interface CalendarioDeFechaV4Props {
  valor: Date | null;
  alElegir: (d: Date) => void;
  alBorrar?: () => void;
  alCerrar: () => void;
  es: boolean;
  /** Para pruebas: el día de hoy («AAAA-MM-DD»). */
  hoy?: string;
}

export function CalendarioDeFechaV4({ valor, alElegir, alBorrar, alCerrar, es, hoy }: CalendarioDeFechaV4Props) {
  const hoyIso = hoy ?? isoLocal(new Date());
  const valorIso = valor && !isNaN(valor.getTime()) ? isoLocal(valor) : null;
  const [foco, setFoco] = useState<string>(valorIso ?? hoyIso);
  const rejilla = useRef<HTMLDivElement>(null);
  const loc = es ? 'es-ES' : 'en-US';

  useEffect(() => {
    rejilla.current?.querySelector<HTMLButtonElement>(`[data-iso="${foco}"]`)?.focus();
  }, [foco]);

  const d = deIso(foco);
  const celdas = rejillaDelMes(d.getFullYear(), d.getMonth());
  /* como el formato de la app: «Octubre 2026» (sin el «de» de Intl en español) */
  const mesYAnio = `${d.toLocaleDateString(loc, { month: 'long' })} ${d.getFullYear()}`;
  const etiqueta = (iso: string) => deIso(iso).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const mes = (delta: number) => setFoco(f => { const x = deIso(f); x.setDate(1); x.setMonth(x.getMonth() + delta); return isoLocal(x); });

  const alTeclear = (e: KeyboardEventReact) => {
    const paso = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (paso) { e.preventDefault(); setFoco(f => moverDias(f, paso)); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); alCerrar(); }
    else if (e.key === 'Tab') alCerrar();
  };

  return (
    <div className="v4-fecha" data-calendario-v4="" onKeyDown={alTeclear}>
      <div className="v4-fecha-cab">
        <button type="button" className="v4-icono-btn" aria-label={es ? 'Mes anterior' : 'Previous month'} onClick={() => mes(-1)}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <b aria-live="polite">{mesYAnio.charAt(0).toUpperCase() + mesYAnio.slice(1)}</b>
        <button type="button" className="v4-icono-btn" aria-label={es ? 'Mes siguiente' : 'Next month'} onClick={() => mes(1)}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <div className="v4-fecha-rejilla" ref={rejilla} role="grid" aria-label={mesYAnio}>
        {inicialesDeLaSemana(es).map((c, i) => <span key={`c${i}`} className="v4-fecha-dia-sem" aria-hidden>{c}</span>)}
        {celdas.map((iso, i) => iso === null
          ? <span key={`h${i}`} aria-hidden />
          : (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              className="v4-fecha-dia v4-num"
              tabIndex={iso === foco ? 0 : -1}
              aria-pressed={iso === valorIso}
              aria-current={iso === hoyIso ? 'date' : undefined}
              data-finde={[0, 6].includes(deIso(iso).getDay()) ? '' : undefined}
              aria-label={etiqueta(iso)}
              onClick={() => alElegir(deIso(iso))}
              onFocus={() => setFoco(iso)}
            >
              {deIso(iso).getDate()}
            </button>
          ))}
      </div>
      {alBorrar && (
        <div className="v4-fecha-pie">
          <button type="button" className="v4-fecha-borrar" data-quitar-fecha="" onClick={alBorrar}>
            {es ? 'Quitar la fecha' : 'Clear the date'}
          </button>
        </div>
      )}
    </div>
  );
}
