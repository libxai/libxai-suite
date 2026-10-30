/**
 * Gantt ronda 2 (Yesid, 30-oct) · R6 · EL AÑO CUANDO NO ES EL ACTUAL. «30 jul» era ambiguo en un proyecto que cruza el
 * año (Axon P25038 acaba en 2027): ahora «30 jul 2027». Del año en curso, sin año, como siempre.
 *
 * A mano y no con toLocaleDateString: cada navegador lo escribe distinto («30 de jul», «6 sept», «jul.»). Los meses son
 * los de la app (src/lib/formato.ts), para que el Gantt y la cabecera digan lo mismo.
 */
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** «30 jul» / «30 jul 2027» · «Jul 30» / «Jul 30, 2027». */
export function fechaCorta(d: Date, locale: string | undefined, hoy: Date = new Date()): string {
  const conAnio = d.getFullYear() !== hoy.getFullYear();
  if (!locale || locale.toLowerCase().startsWith('es')) {
    return `${d.getDate()} ${MESES_ES[d.getMonth()]}${conAnio ? ` ${d.getFullYear()}` : ''}`;
  }
  return `${MESES_EN[d.getMonth()]} ${d.getDate()}${conAnio ? `, ${d.getFullYear()}` : ''}`;
}
