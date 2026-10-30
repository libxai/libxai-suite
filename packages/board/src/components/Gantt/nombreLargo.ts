/**
 * Gantt ronda 2 (Yesid, 30-oct) · R5 · NOMBRES LARGOS Y REPETIDOS. En P25038, 19 tareas empiezan por «Amarillado en tableros
 * MK y C&P – Bahía…» y se cortaban todas igual: lo que las distingue está al final. El nombre se parte en el COMIENZO (que
 * se encoge con «…») y la COLA (las últimas palabras, que no se cortan). Si cabe entero se ve igual que siempre.
 */
export function partirNombre(nombre: string, maxCola = 24): { comienzo: string; cola: string } {
  const n = nombre.trim();
  if (n.length <= 28) return { comienzo: n, cola: '' };
  const palabras = n.split(/(\s+)/); // conserva los espacios
  let cola = '';
  for (let i = palabras.length - 1; i > 0; i--) {
    const siguiente = palabras[i] + cola;
    if (siguiente.trim().length > maxCola && cola.trim().length >= 6) break;
    cola = siguiente;
    if (cola.trim().length >= 12 && /\s/.test(palabras[i - 1] ?? '')) {
      const conOtra = (palabras[i - 2] ?? '') + (palabras[i - 1] ?? '') + cola;
      if (conOtra.trim().length > maxCola) break;
    }
  }
  if (!cola.trim() || cola.trim().length >= n.length - 4) return { comienzo: n, cola: '' };
  /* El espacio del corte va con la COLA (que es `white-space: pre`): al final del comienzo, el navegador lo tira y salía
     «Monitoreoy Control del Proyecto» (Arcadio, P25038 30-oct). */
  const comienzo = n.slice(0, n.length - cola.length).trimEnd();
  return { comienzo, cola: n.slice(comienzo.length) };
}

/** La ruta de un nombre: «6.3 Tablero 3 › Ensamble mecánico» (con el código WBS de cada antepasado si lo tiene). */
export function rutaDelNombre(antepasados: Array<{ name: string; wbsCode?: string }>, nombre: string): string {
  return [...antepasados.map((a) => (a.wbsCode ? `${a.wbsCode} ${a.name}` : a.name)), nombre].join(' › ');
}
