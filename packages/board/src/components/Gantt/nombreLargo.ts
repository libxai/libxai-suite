/**
 * Gantt ronda 2 (Yesid, 30-oct) · R5 · NOMBRES LARGOS Y REPETIDOS. En P25038, 19 tareas empiezan por «Amarillado en tableros
 * MK y C&P – Bahía…» y se cortaban todas igual: lo que las distingue está al final.
 *
 * Ronda 3 (Yesid, 2-nov) · A1 · cortar SIEMPRE por el medio se comía el verbo: «Su… a App Store y Play Store», «Prep… de
 * Assets para Stores». Ahora:
 *   · por defecto el corte va AL FINAL («Submit a App Store y Pl…»): `comienzo` es el nombre entero y `cola`, vacía;
 *   · por el medio SÓLO cuando hermanas comparten el inicio (`prefijoComun` ≥ 12): la cola empieza en la palabra donde se
 *     separan, y el comienzo conserva al menos sus 12 primeros caracteres (lo asegura quien lo pinta, `MIN_COMIENZO`).
 */
export const MIN_COMIENZO = 12;

export function partirNombre(nombre: string, prefijoComun = 0): { comienzo: string; cola: string } {
  const n = nombre.trim();
  if (prefijoComun < MIN_COMIENZO || prefijoComun >= n.length) return { comienzo: n, cola: '' };
  /* la cola arranca en la palabra donde las hermanas se separan («– Bahía GENSA U2» → «GENSA U2») */
  let i = prefijoComun;
  while (i > 0 && !/\s/.test(n[i - 1] ?? '')) i--;
  const comienzo = n.slice(0, i).trimEnd();
  if (!comienzo) return { comienzo: n, cola: '' };
  /* El espacio del corte va con la COLA (que es `white-space: pre`): al final del comienzo, el navegador lo tira y salía
     «Monitoreoy Control del Proyecto» (Arcadio, P25038 30-oct). */
  return { comienzo, cola: n.slice(comienzo.length) };
}

/** Lo que dos nombres tienen en común desde el principio, en caracteres. */
function comun(a: string, b: string): number {
  const m = Math.min(a.length, b.length);
  let i = 0;
  while (i < m && a[i] === b[i]) i++;
  return i;
}

/**
 * Para cada nombre de un grupo de hermanas, el inicio más largo que comparte con alguna otra (0 si ninguna): es lo que
 * decide si su nombre se corta por el medio (`partirNombre`).
 */
export function prefijosConHermanas(nombres: readonly string[]): number[] {
  const t = nombres.map((s) => s.trim());
  return t.map((a, i) => {
    let max = 0;
    for (let j = 0; j < t.length; j++) if (j !== i) max = Math.max(max, comun(a, t[j] ?? ''));
    return max;
  });
}

/** La ruta de un nombre: «6.3 Tablero 3 › Ensamble mecánico» (con el código WBS de cada antepasado si lo tiene). */
export function rutaDelNombre(antepasados: Array<{ name: string; wbsCode?: string }>, nombre: string): string {
  return [...antepasados.map((a) => (a.wbsCode ? `${a.wbsCode} ${a.name}` : a.name)), nombre].join(' › ');
}
