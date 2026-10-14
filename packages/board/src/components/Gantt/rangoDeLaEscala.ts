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

/**
 * QA Asakaa E16: «"Hoy" no lleva a hoy. En Roadmap Asakaa el botón no hace
 * nada porque hoy cae fuera del rango dibujado […] El Gantt abre en una zona
 * casi vacía, no en hoy ni donde están las barras.»
 *
 * El rango siempre incluye hoy (si no, «Hoy» no tiene adónde ir) y al abrir se
 * centra en hoy si cae dentro de las tareas; si no, en el borde de las tareas
 * más cercano a hoy: se ven barras y la píldora indica hacia dónde queda hoy.
 */
export function conHoy(inicio: Date, fin: Date, hoy: Date): { inicio: Date; fin: Date } {
  return {
    inicio: hoy < inicio ? new Date(hoy) : inicio,
    fin: hoy > fin ? new Date(hoy) : fin,
  };
}

export function fechaAlAbrir(primeraTarea: Date | null, ultimaTarea: Date | null, hoy: Date): Date {
  if (!primeraTarea || !ultimaTarea) return hoy;
  if (hoy < primeraTarea) return primeraTarea;
  if (hoy > ultimaTarea) return ultimaTarea;
  return hoy;
}

/** De qué lado de la vista queda hoy (para la flecha de la píldora «Hoy»). */
export function ladoDeHoy(hoyX: number, izquierda: number, derecha: number): 'left' | 'right' | null {
  if (hoyX < izquierda) return 'left';
  if (hoyX > derecha) return 'right';
  return null;
}
