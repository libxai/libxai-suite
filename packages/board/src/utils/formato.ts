/**
 * ═══ UN SOLO FORMATO PARA NÚMEROS, DINERO, HORAS, PORCENTAJES Y FECHAS ═══
 * QA Asakaa, mejora 2.2 (decisiones de Arcadio, 15-oct). Copia de las reglas de
 * la app (src/lib/formato.ts): la librería NO importa de la app, así que las
 * funciones se replican aquí con las MISMAS salidas.
 *
 *  - Números: en español punto de miles y coma decimal (20.122.500 · 12,5);
 *    en inglés al revés.
 *  - Moneda: el CÓDIGO tras la cifra («$20.122.500 COP»). El código lo da quien
 *    consume la librería (la moneda del espacio); sin código, la cifra va sola.
 *  - Horas: «12 h 30 min», «45 min», «0 h».
 *  - Porcentaje: «77%» (sin espacio).
 *  - Fechas: «6 jul» (sin cero delante); con el año cuando no es el actual.
 *    Horas del día en hora LOCAL («14:42»).
 */

export type Idioma = 'es' | 'en' | string;

const esEs = (l: Idioma) => !String(l || 'es').toLowerCase().startsWith('en');
const loc = (l: Idioma) => (esEs(l) ? 'es-CO' : 'en-US');

export function numero(n: number, idioma: Idioma = 'es', decimales = 0): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(loc(idioma), { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(n);
}

/** «$20.122.500 COP»; compacto: «$725,3 mil COP», «$20,1 M COP». Sin código si no se conoce. */
export function moneda(
  n: number,
  codigo: string | null | undefined,
  idioma: Idioma = 'es',
  opciones: { compacto?: boolean; decimales?: number } = {},
): string {
  if (!Number.isFinite(n)) return '—';
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  let cifra: string;
  if (opciones.compacto && abs >= 1000) {
    const es = esEs(idioma);
    const [div, suf] = abs >= 1e9 ? [1e9, es ? ' mil M' : 'B'] : abs >= 1e6 ? [1e6, es ? ' M' : 'M'] : [1e3, es ? ' mil' : 'K'];
    cifra = numero(abs / div, idioma, 1) + suf;
  } else {
    cifra = numero(abs, idioma, opciones.decimales ?? 0);
  }
  return `${signo}$${cifra}${codigo ? ` ${codigo}` : ''}`;
}

/** Minutos → «12 h 30 min», «45 min», «0 h». */
export function horas(minutos: number, _idioma: Idioma = 'es'): string {
  if (!Number.isFinite(minutos)) return '—';
  const signo = minutos < 0 ? '-' : '';
  const total = Math.round(Math.abs(minutos));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0 && m === 0) return '0 h';
  if (h === 0) return `${signo}${m} min`;
  return `${signo}${numero(h, _idioma)} h${m ? ` ${m} min` : ''}`;
}

/** «77%». `decimales` para casos como 98,5%. */
export function porcentaje(n: number, idioma: Idioma = 'es', decimales = 0): string {
  if (!Number.isFinite(n)) return '—';
  return `${numero(n, idioma, decimales)}%`;
}

const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * «6 jul» / «Jul 6». El año va si no es el de `hoy`, o si `anio: 'siempre'`
 * (para períodos que cruzan de año). Acepta Date o «AAAA-MM-DD» (día local).
 */
export function fecha(
  valor: Date | string | null | undefined,
  idioma: Idioma = 'es',
  opciones: { anio?: 'auto' | 'siempre' | 'nunca'; hoy?: Date } = {},
): string {
  const d = aFecha(valor);
  if (!d) return '—';
  const hoy = opciones.hoy ?? new Date();
  const conAnio = opciones.anio === 'siempre' || (opciones.anio !== 'nunca' && d.getFullYear() !== hoy.getFullYear());
  if (esEs(idioma)) return `${d.getDate()} ${MESES_ES[d.getMonth()]}${conAnio ? ` ${d.getFullYear()}` : ''}`;
  return `${MESES_EN[d.getMonth()]} ${d.getDate()}${conAnio ? `, ${d.getFullYear()}` : ''}`;
}

/** Hora del día, local: «14:42» / «2:42 PM». */
export function hora(valor: Date | string | null | undefined, idioma: Idioma = 'es'): string {
  const d = valor instanceof Date ? valor : valor ? new Date(valor) : null;
  if (!d || isNaN(d.getTime())) return '—';
  if (esEs(idioma)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** «8 oct, 14:40» (con año si no es el actual). */
export function fechaYHora(valor: Date | string | null | undefined, idioma: Idioma = 'es'): string {
  const d = valor instanceof Date ? valor : valor ? new Date(valor) : null;
  if (!d || isNaN(d.getTime())) return '—';
  return `${fecha(d, idioma)}, ${hora(d, idioma)}`;
}

function aFecha(valor: Date | string | null | undefined): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (valor.length === 10 && valor[4] === '-' && valor[7] === '-') {
    const [y = NaN, m = NaN, d = NaN] = valor.split('-').map(Number);
    const local = new Date(y, m - 1, d);
    return isNaN(local.getTime()) ? null : local;
  }
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}
