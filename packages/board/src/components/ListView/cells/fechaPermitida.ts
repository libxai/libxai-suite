/**
 * ¿Se puede elegir este día? · QA Asakaa E21
 *
 * «Si se elige un fin anterior al inicio, mueve el inicio (14 oct pasa a "9 oct →
 * 9 oct"). También permite fechas anteriores al inicio del proyecto.» El selector
 * corría el inicio EN SILENCIO. Ahora ese día no se puede elegir y dice por qué.
 *
 * Devuelve `null` si el día vale, o el motivo (para el `title` del día).
 */
const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export interface ReglasDeFecha {
  /** Qué fecha se está eligiendo. */
  campo: 'start' | 'end';
  inicio?: Date | null;
  fin?: Date | null;
  /** El inicio del proyecto: ninguna fecha antes. */
  minimo?: Date | null;
  locale: string;
}

export function motivoDeBloqueo(fecha: Date, r: ReglasDeFecha): string | null {
  const es = r.locale === 'es';
  const f = (d: Date) => d.toLocaleDateString(es ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
  if (r.minimo && dia(fecha) < dia(r.minimo)) {
    return es ? `Antes del inicio del proyecto (${f(r.minimo)})` : `Before the project start (${f(r.minimo)})`;
  }
  if (r.campo === 'end' && r.inicio && dia(fecha) < dia(r.inicio)) {
    return es ? `El fin no puede ser anterior al inicio (${f(r.inicio)})` : `The end can't be before the start (${f(r.inicio)})`;
  }
  if (r.campo === 'start' && r.fin && dia(fecha) > dia(r.fin)) {
    return es ? `El inicio no puede ser posterior al fin (${f(r.fin)})` : `The start can't be after the end (${f(r.fin)})`;
  }
  return null;
}
