import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * ═══ UN MENÚ SE ABRE HACIA DONDE CABE ══════════════════════════════════════
 *
 * Reportado con captura: en la ÚLTIMA fila de la Lista, el selector de
 * miembros se salía por debajo y lo tapaba la barra de totales. El menú
 * existía, pero para el usuario no.
 *
 * LA CAUSA, y la comparten NUEVE desplegables de las celdas: `top-full` ancla
 * el menú al borde inferior de la celda y lo extiende hacia abajo SIEMPRE, sin
 * mirar si cabe. En las filas de arriba no se nota; en la última, sí.
 *
 * ── POR QUÉ UN HOOK Y NO EL ARREGLO EN CADA CELDA ─────────────────────────
 *
 * Son nueve sitios. Copiar la medición nueve veces significa que la décima
 * celda que alguien escriba mañana volverá a nacer rota, y que corregir un
 * matiz obliga a tocar nueve ficheros. La causa es UNA.
 *
 * ── LO QUE DECIDE, Y LO QUE NO ────────────────────────────────────────────
 *
 * Devuelve `true` si el menú debe abrirse HACIA ARRIBA. Se prefiere abajo —es
 * el lado natural de un desplegable, y el que la gente espera— y sólo se
 * cambia cuando abajo NO cabe y arriba SÍ.
 *
 * Si no cabe por ninguno de los dos (una ventana muy baja), se queda abajo: al
 * menos la cabecera y el buscador quedan a la vista, y el scroll alcanza el
 * resto. Abrirlo arriba en ese caso lo dejaría igual de cortado, pero por el
 * otro extremo y sin su parte útil.
 *
 * ── POR QUÉ `useLayoutEffect` ─────────────────────────────────────────────
 *
 * Se mide sobre el layout ya hecho. Con `useEffect` se pintaría un fotograma
 * en el lado equivocado y se vería el salto.
 *
 * @param ancla   el elemento del que cuelga el menú (la celda o su botón)
 * @param abierto si el menú está abierto — sólo se mide al abrir
 * @param alto    la cota PEOR del menú, en px. No se mide el alto real: para
 *                medirlo habría que pintarlo antes, que es el fotograma que
 *                se quiere evitar.
 */
export function useLadoDelMenu(
  ancla: RefObject<HTMLElement | null>,
  abierto: boolean,
  alto = 320,
): boolean {
  const [arriba, setArriba] = useState(false);

  useLayoutEffect(() => {
    if (!abierto) return;
    const caja = ancla.current?.getBoundingClientRect();
    if (!caja) return;

    const AIRE = 12;
    const cabeAbajo = caja.bottom + alto + AIRE <= window.innerHeight;
    const cabeArriba = caja.top - alto - AIRE >= 0;

    setArriba(!cabeAbajo && cabeArriba);
  }, [abierto, alto, ancla]);

  return arriba;
}
