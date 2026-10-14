/**
 * Anchos mínimos de las columnas de la Lista (QA Asakaa E39).
 *
 * «Con el panel de Salud financiera abierto, las cabeceras Estimado, Ejecutado
 * y Progreso se montan.» Las columnas iban en PORCENTAJE sin mínimo: al abrir el
 * panel (o añadir columnas) la tabla se estrechaba y cada una encogía hasta que
 * su cabecera no cabía y pisaba a la vecina. Ahora ninguna baja de su ancho de
 * diseño (la de Nombre, de NOMBRE_MINIMO) y, si no caben, la tabla se desplaza
 * en horizontal.
 */
export const NOMBRE_MINIMO = 220;

export interface ColumnaConAncho {
  id: string;
  type?: string;
  width: number;
  minWidth?: number;
}

export function anchoMinimoDeColumna(c: ColumnaConAncho): number {
  if (c.minWidth != null) return c.minWidth;
  return c.type === 'name' ? Math.min(c.width, NOMBRE_MINIMO) : c.width;
}

/** El ancho por debajo del cual la tabla se desplaza, con los huecos fijos de la fila. */
export function anchoMinimoDeLaTabla(columnas: ColumnaConAncho[], extrasPx: number): number {
  return columnas.reduce((s, c) => s + anchoMinimoDeColumna(c), 0) + extrasPx;
}
