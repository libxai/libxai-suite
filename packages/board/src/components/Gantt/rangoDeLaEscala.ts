/**
 * ═══ DÓNDE EMPIEZA LO QUE SE DIBUJA · según la escala ═══════════════════════
 *
 * QA de Asakaa (8-oct), E13: «En Mes, las tareas del 14 al 20 de octubre
 * aparecen entre el 1 y el 7, y la línea de hoy queda antes del inicio de
 * "oct 2026". En Semana, las columnas no empiezan en lunes.»
 *
 * Las barras estaban bien: lo que se corría era la cabecera. El rango empezaba
 * en «primera tarea − margen» (p. ej. 18 sep) y las columnas se contaban desde
 * ahí, así que la columna rotulada «oct 2026» empezaba el 18 de octubre y la
 * de una semana, en sábado. Ahora el rango empieza en un lunes (Semana) o en
 * un día 1 (Mes); cabecera, barras y línea de hoy comparten ese origen.
 */
export type EscalaDelGantt = 'day' | 'week' | 'month';

export function inicioDeLaEscala(fecha: Date, escala: EscalaDelGantt): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  if (escala === 'week') {
    const desdeLunes = (d.getDay() + 6) % 7; // lunes = 0 … domingo = 6
    d.setDate(d.getDate() - desdeLunes);
  } else if (escala === 'month') {
    d.setDate(1);
  }
  return d;
}
