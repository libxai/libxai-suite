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

/**
 * QA Asakaa · mejora fuerte 6 («falta la lógica de escalas»): el ancho de UN día en cada escala,
 * en un solo sitio. Estaba copiado en siete; una copia distinta es justo el tipo de fallo de E13.
 */
export function anchoDelDia(escala: EscalaDelGantt): number {
  return escala === 'day' ? 60 : escala === 'week' ? 20 : 8;
}

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

/**
 * Mejora fuerte 6 · «apertura en hoy o en la primera tarea pendiente»: hoy si cae dentro de las
 * tareas; si no, la primera tarea sin terminar; si no queda ninguna, el borde más cercano a hoy.
 */
export function fechaAlAbrir(primeraTarea: Date | null, ultimaTarea: Date | null, hoy: Date, primeraPendiente?: Date | null): Date {
  if (!primeraTarea || !ultimaTarea) return hoy;
  if (hoy >= primeraTarea && hoy <= ultimaTarea) return hoy;
  if (primeraPendiente) return primeraPendiente;
  return hoy < primeraTarea ? primeraTarea : ultimaTarea;
}

/** Mejora fuerte 6 · ¿la barra [xInicio, xFin] queda fuera de la vista? ¿De qué lado? */
export function ladoFueraDeVista(xInicio: number, xFin: number, izquierda: number, derecha: number): 'left' | 'right' | null {
  if (xFin < izquierda) return 'left';
  if (xInicio > derecha) return 'right';
  return null;
}

/** De qué lado de la vista queda hoy (para la flecha de la píldora «Hoy»). */
export function ladoDeHoy(hoyX: number, izquierda: number, derecha: number): 'left' | 'right' | null {
  if (hoyX < izquierda) return 'left';
  if (hoyX > derecha) return 'right';
  return null;
}
