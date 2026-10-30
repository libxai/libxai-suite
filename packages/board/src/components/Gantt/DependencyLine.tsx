import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DependencyLineStyle } from './types';

// v0.17.363: Simplified to single-layer rendering with correct ClickUp-style routing
// Data for hover state (delete button position tracking)
export interface DependencyHoverData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onDelete: () => void;
  lineStyle?: DependencyLineStyle;
}

// Keep old interface name for backwards compatibility
export type DependencyDeleteButtonData = DependencyHoverData;

interface DependencyLineProps {
  x1: number; // Exit X (right side of source bar)
  y1: number; // Exit Y (center of source bar)
  x2: number; // Enter X (left side of destination bar)
  y2: number; // Enter Y (center of destination bar)
  theme: any;
  onDelete?: () => void;
  // v0.17.310: Dependency line style (curved or squared)
  lineStyle?: DependencyLineStyle;
  // v0.17.363: Is this line being rendered in the hover layer?
  isHoverLayer?: boolean;
  // v0.17.451: Callback when hover state changes (for z-order management)
  onHoverChange?: (isHovered: boolean) => void;
  // v0.17.451: Only render the hover overlay (for top-layer)
  hoverOverlayOnly?: boolean;
  // v5.1.0: CPM — override line/arrow color for critical dependencies
  colorOverride?: string;
  // v5.1.0: CPM — override stroke width
  strokeWidthOverride?: number;
  // v5.1.0: CPM — glow filter for critical deps
  glowFilter?: string;
  /* QA Asakaa · mejora fuerte 5: el tipo del enlace decide los lados. FS sale por el FIN y entra
     por el INICIO (lo de siempre); SS sale por el inicio; FF entra por el fin; SF las dos cosas. */
  salidaPorInicio?: boolean;
  entradaPorFin?: boolean;
  /** «CC +2», «FF», «+1»…: el tipo (si no es FC) y el desfase (si no es 0). */
  etiqueta?: string;
  /** Gantt ronda 2 (Yesid) · P1-4 · un enlace en conflicto va DISCONTINUO (y en ámbar, por `colorOverride`). */
  discontinua?: boolean;
  /** El tooltip del conector (p. ej. el porqué del conflicto). */
  titulo?: string;
  /** Gantt ronda 2 (Yesid) · P2 · un conector largo que no toca la tarea en foco, atenuado (escala Mes). */
  atenuada?: boolean;
  /**
   * Gantt ronda 2 (Yesid) · E14 · «se marca, pero nada avisa ni propone corregir». En la capa del hover de un enlace en
   * conflicto, la píldora «Corregir → 19 oct» junto a la flecha de llegada: mueve la sucesora lo justo para cumplirlo.
   */
  corregir?: { texto: string; titulo: string; onClick: () => void };
}

/**
 * v0.17.364: TRUE ClickUp-style dependency line routing
 *
 * RULES:
 * 1. Lines ALWAYS exit from the RIGHT side of the source bar
 * 2. Lines ALWAYS enter from the LEFT side of the destination bar
 * 3. The vertical segment is ALWAYS placed to the LEFT of the destination bar
 *
 * Pattern: source(right) → horizontal → vertical → horizontal → destination(left)
 *
 * For FORWARD dependencies (x2 > x1, destination RIGHT of source):
 *   The vertical segment is just before destination: turnX = x2 - OFFSET
 *   Path: right → horizontal → down/up → right into destination
 *
 * For BACKWARD dependencies (x2 <= x1, destination LEFT of or at same X as source):
 *   The vertical segment must still be LEFT of destination: turnX = x2 - OFFSET
 *   Path: right → horizontal past source → down/up → LEFT back to destination
 */
export function DependencyLine({
  x1, y1, x2, y2,
  theme,
  onDelete,
  lineStyle = 'curved',
  isHoverLayer = false,
  onHoverChange,
  hoverOverlayOnly = false,
  colorOverride,
  strokeWidthOverride,
  glowFilter,
  salidaPorInicio = false,
  entradaPorFin = false,
  etiqueta,
  discontinua = false,
  titulo,
  atenuada = false,
  corregir,
}: DependencyLineProps) {
  // v0.17.451: Local hover state only used for tracking, actual rendering done via Timeline
  const [, setIsLocalHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const dy = y2 - y1;
  const goingDown = dy > 0;
  const isSameRow = Math.abs(dy) < 5;

  // OFFSET from bars for the vertical segment
  const OFFSET = 20;

  // v0.17.366: isBackward needs to be defined outside the else block for delete button positioning
  const isBackward = !isSameRow && x2 <= x1;

  let path: string;
  let turnX: number;

  // v0.17.440: Original elegant S-curve for curved style, squared routing for squared style
  const dx = x2 - x1;
  const midX = x1 + dx / 2;
  turnX = midX; // Default for delete button positioning

  // v5.0.0: Rounded corner radius for squared dependency lines
  const R = 8;

  // Mejora fuerte 5 · los puntos de control (curva) y los tramos (escuadra) de un enlace que no es FS.
  let cp1x = midX;
  const cp1y = y1;
  let cp2x = midX;
  const cp2y = y2;
  let tramosGenericos: [number, number, number, number][] | null = null;
  const generico = salidaPorInicio || entradaPorFin;
  const sOut = salidaPorInicio ? -1 : 1; // hacia dónde sale: +1 derecha, −1 izquierda
  const sIn = entradaPorFin ? -1 : 1;    // desde dónde llega: +1 por la izquierda, −1 por la derecha

  if (generico) {
    if (lineStyle === 'squared') {
      const px1 = x1 + sOut * 15;
      const px2 = x2 - sIn * OFFSET;
      const ym = isSameRow ? y1 - 16 : (y1 + y2) / 2;
      tramosGenericos = [[x1, y1, px1, y1], [px1, y1, px1, ym], [px1, ym, px2, ym], [px2, ym, px2, y2], [px2, y2, x2, y2]];
      path = `M ${x1} ${y1} L ${px1} ${y1} L ${px1} ${ym} L ${px2} ${ym} L ${px2} ${y2} L ${x2} ${y2}`;
      turnX = px2;
    } else {
      const k = Math.max(40, Math.abs(dx) / 2);
      cp1x = x1 + sOut * k;
      cp2x = x2 - sIn * k;
      path = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
  } else if (lineStyle === 'squared') {
    // Squared style with rounded corners (8px radius at each turn)
    if (isSameRow) {
      path = `M ${x1} ${y1} L ${x2} ${y2}`;
    } else if (isBackward) {
      const exitPadding = 15;
      const firstTurnX = x1 + exitPadding;
      const secondTurnX = x2 - OFFSET;
      /* Gantt ronda 2 · P1-4 · el tramo de vuelta va junto a la fila de DESTINO, no junto a la de origen: si el origen
         es un grupo (una raya a todo su largo), corría a lo largo de su fila y cruzaba el cronograma («6.2 Microsoft 365»). */
      const bridgeY = goingDown ? y2 - 20 : y2 + 20;
      turnX = secondTurnX;
      const dY1 = goingDown ? 1 : -1; // direction sign for vertical movement

      path = `M ${x1} ${y1} ` +
             `L ${firstTurnX - R} ${y1} ` +
             `Q ${firstTurnX} ${y1} ${firstTurnX} ${y1 + dY1 * R} ` +
             `L ${firstTurnX} ${bridgeY - dY1 * R} ` +
             `Q ${firstTurnX} ${bridgeY} ${firstTurnX - R} ${bridgeY} ` +
             `L ${secondTurnX + R} ${bridgeY} ` +
             `Q ${secondTurnX} ${bridgeY} ${secondTurnX} ${bridgeY + dY1 * R} ` +
             `L ${secondTurnX} ${y2 - dY1 * R} ` +
             `Q ${secondTurnX} ${y2} ${secondTurnX + R} ${y2} ` +
             `L ${x2} ${y2}`;
    } else {
      turnX = x2 - OFFSET;
      const dY1 = goingDown ? 1 : -1;

      path = `M ${x1} ${y1} ` +
             `L ${turnX - R} ${y1} ` +
             `Q ${turnX} ${y1} ${turnX} ${y1 + dY1 * R} ` +
             `L ${turnX} ${y2 - dY1 * R} ` +
             `Q ${turnX} ${y2} ${turnX + R} ${y2} ` +
             `L ${x2} ${y2}`;
    }
  } else {
    // v0.17.440: ORIGINAL elegant S-curve - simple Bézier, no routing logic
    // This is the exact curve from before the squared option was added
    path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  // v5.0.0: Arrow marker — filled triangle 6x5px pointing RIGHT
  const arrowW = 6;
  const arrowH = 5;
  // Mejora fuerte 5 · si entra por el FIN de la sucesora, la punta mira a la izquierda.
  const arrowPath = `M ${x2} ${y2} L ${x2 - sIn * arrowW} ${y2 - arrowH / 2} L ${x2 - sIn * arrowW} ${y2 + arrowH / 2} Z`;

  // v5.0.0: Dependencies ALWAYS neutral — never inherit task state color
  // v5.1.0: CPM can override color for critical dependencies
  const isDarkTheme = !theme.bgPrimary || theme.bgPrimary.startsWith('#0') || theme.bgPrimary.startsWith('#1');
  // QA Asakaa 2.3.6: «un gris fino casi invisible sobre el fondo oscuro». Más contraste y 1,5 px.
  const lineColor = colorOverride || (isDarkTheme ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.45)');
  const baseStrokeWidth = strokeWidthOverride || 1.5;
  const hoverColor = theme.dependencyHover || (isDarkTheme ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)');

  // Delete button colors
  const deleteColor = '#f87171';
  const deleteColorSoft = 'rgba(248, 113, 113, 0.15)';

  // Delete button position - follows cursor along the line, projected onto nearest segment
  // Default: midpoint of the line
  let deleteX = turnX;
  let deleteY = (y1 + y2) / 2;

  if (mousePos) {
    if (tramosGenericos) {
      let minDist = Infinity;
      for (const seg of tramosGenericos) {
        const point = projectPointOnSegment(mousePos.x, mousePos.y, seg[0], seg[1], seg[2], seg[3]);
        const dist = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
        if (dist < minDist) { minDist = dist; deleteX = point.x; deleteY = point.y; }
      }
    } else if (lineStyle === 'squared') {
      if (isSameRow) {
        deleteX = Math.max(x1 + 10, Math.min(x2 - 10, mousePos.x));
        deleteY = y1;
      } else if (isBackward) {
        const firstTurnX = x1 + 15;
        const secondTurnX = x2 - OFFSET;
        const bridgeY = goingDown ? y1 + 20 : y1 - 20;

        const segments: [number, number, number, number][] = [
          [x1, y1, firstTurnX, y1],
          [firstTurnX, y1, firstTurnX, bridgeY],
          [firstTurnX, bridgeY, secondTurnX, bridgeY],
          [secondTurnX, bridgeY, secondTurnX, y2],
          [secondTurnX, y2, x2, y2],
        ];

        let minDist = Infinity;
        let closestPoint = { x: deleteX, y: deleteY };

        for (const seg of segments) {
          const point = projectPointOnSegment(mousePos.x, mousePos.y, seg[0], seg[1], seg[2], seg[3]);
          const dist = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = point;
          }
        }

        deleteX = closestPoint.x;
        deleteY = closestPoint.y;
      } else {
        const segments: [number, number, number, number][] = [
          [x1, y1, turnX, y1],
          [turnX, y1, turnX, y2],
          [turnX, y2, x2, y2],
        ];

        let minDist = Infinity;
        let closestPoint = { x: deleteX, y: deleteY };

        for (const seg of segments) {
          const point = projectPointOnSegment(mousePos.x, mousePos.y, seg[0], seg[1], seg[2], seg[3]);
          const dist = Math.hypot(mousePos.x - point.x, mousePos.y - point.y);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = point;
          }
        }

        deleteX = closestPoint.x;
        deleteY = closestPoint.y;
      }
    } else {
      // Curved: sample the Bézier and find closest point
      let minDist = Infinity;
      let bestX = deleteX, bestY = deleteY;
      for (let t = 0; t <= 1; t += 0.02) {
        const it = 1 - t;
        const bx = it*it*it*x1 + 3*it*it*t*cp1x + 3*it*t*t*cp2x + t*t*t*x2;
        const by = it*it*it*y1 + 3*it*it*t*cp1y + 3*it*t*t*cp2y + t*t*t*y2;
        const d = Math.hypot(mousePos.x - bx, mousePos.y - by);
        if (d < minDist) {
          minDist = d;
          bestX = bx;
          bestY = by;
        }
      }
      deleteX = bestX;
      deleteY = bestY;
    }
  }

  // Helper function to project a point onto a line segment
  function projectPointOnSegment(px: number, py: number, sx1: number, sy1: number, sx2: number, sy2: number) {
    const sdx = sx2 - sx1;
    const sdy = sy2 - sy1;
    const lenSq = sdx * sdx + sdy * sdy;

    if (lenSq === 0) return { x: sx1, y: sy1 };

    let t = ((px - sx1) * sdx + (py - sy1) * sdy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return {
      x: sx1 + t * sdx,
      y: sy1 + t * sdy,
    };
  }

  // v1.4.27: Use SVG getScreenCTM() for accurate mouse→SVG coordinate conversion
  // This correctly handles scroll offsets, zoom, and any CSS transforms on parent elements
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;

    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const inverseCTM = ctm.inverse();
    setMousePos({
      x: inverseCTM.a * e.clientX + inverseCTM.c * e.clientY + inverseCTM.e,
      y: inverseCTM.b * e.clientX + inverseCTM.d * e.clientY + inverseCTM.f,
    });
  };

  const handleMouseLeave = () => {
    setIsLocalHovered(false);
    setMousePos(null);
    onHoverChange?.(false);
  };

  const handleMouseEnter = () => {
    setIsLocalHovered(true);
    onHoverChange?.(true);
  };

  // Render the delete button SVG elements
  const renderDeleteButton = (animInitial: Record<string, any>) => {
    if (!onDelete) return null;
    return (
      <motion.g
        initial={animInitial}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      >
        {/* Larger invisible hit area so the X is easy to click */}
        <circle
          cx={deleteX}
          cy={deleteY}
          r={16}
          fill="transparent"
          style={{ cursor: 'pointer' }}
        />
        <circle
          cx={deleteX}
          cy={deleteY}
          r={9}
          fill={deleteColorSoft}
          stroke={deleteColor}
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
        <line
          x1={deleteX - 3}
          y1={deleteY - 3}
          x2={deleteX + 3}
          y2={deleteY + 3}
          stroke={deleteColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        <line
          x1={deleteX + 3}
          y1={deleteY - 3}
          x2={deleteX - 3}
          y2={deleteY + 3}
          stroke={deleteColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      </motion.g>
    );
  };

  /* E14 · la píldora va FIJA junto a la flecha de llegada (la ✕ sigue al ratón: pegada a ella, se escaparía), encima de
     la línea; un puente invisible la une al conector para que el hover no se pierda al ir hacia ella. */
  const renderCorregir = () => {
    if (!corregir) return null;
    const ancho = Math.round(corregir.texto.length * 6.4 + 20);
    const px = entradaPorFin ? x2 + 6 : x2 - ancho - 6;
    const py = y2 - 32;
    return (
      <>
        <rect x={Math.min(px, x2)} y={py} width={ancho + 6} height={y2 + 8 - py} fill="transparent" style={{ pointerEvents: 'all' }} />
        <g
          data-corregir-conflicto=""
          role="button"
          onClick={(e) => { e.stopPropagation(); corregir.onClick(); }}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <title>{corregir.titulo}</title>
          <rect x={px} y={py} width={ancho} height={22} rx={11} strokeWidth={1}
            style={{ fill: 'var(--v6-ambar-fondo, #FDF3E1)', stroke: 'var(--v6-ambar, #F59E0B)' }} />
          <text x={px + ancho / 2} y={py + 11.5} textAnchor="middle" dominantBaseline="middle"
            style={{ fill: 'var(--v6-texto, #1F2933)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', userSelect: 'none' }}>
            {corregir.texto}
          </text>
        </g>
      </>
    );
  };

  // For hover layer, we render with glow effect
  if (isHoverLayer) {
    return (
      <g
        data-dependency-line="true"
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {/* Wider hover detection area */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          style={{ cursor: 'pointer' }}
        />

        {/* Glow effect layer */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.15}
          style={{ pointerEvents: 'none', filter: 'blur(4px)' }}
        />

        {/* Highlighted dependency line */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Arrow head — filled triangle */}
        <path
          d={arrowPath}
          fill={hoverColor}
          stroke="none"
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Endpoint dot */}
        <circle
          cx={x2}
          cy={y2}
          r={4}
          fill={hoverColor}
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />

        {/* Delete button */}
        {renderDeleteButton({ opacity: 0, scale: 0.8 })}
      </g>
    );
  }

  // v0.17.451: If hoverOverlayOnly, only render the hover overlay for top-layer
  if (hoverOverlayOnly) {
    return (
      <g
        data-dependency-hover-overlay="true"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        style={{ cursor: onDelete ? 'pointer' : 'default' }}
      >
        {/* P1-4 · esta capa TAPA al conector: sin su <title>, el porqué del conflicto no salía nunca */}
        {titulo && <title>{titulo}</title>}
        {/* Invisible wider path for hover detection */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          strokeLinecap="round"
          style={{ cursor: onDelete ? 'pointer' : 'default' }}
        />
        {/* Background cover - hide gray lines underneath */}
        <path
          d={path}
          fill="none"
          stroke={theme.bgPrimary || '#1A1D21'}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Subtle outer glow - very light */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.12}
          style={{ pointerEvents: 'none' }}
        />
        {/* Main highlighted line */}
        <path
          d={path}
          fill="none"
          stroke={hoverColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Highlighted arrow — filled triangle */}
        <path
          d={arrowPath}
          fill={hoverColor}
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
        {/* Highlighted dot - slightly larger */}
        <circle
          cx={x2}
          cy={y2}
          r={3.5}
          fill={hoverColor}
          style={{ pointerEvents: 'none' }}
        />
        {/* Delete button */}
        {renderDeleteButton({ opacity: 0, scale: 0 })}
        {renderCorregir()}
      </g>
    );
  }

  // Base layer rendering (non-hover)
  return (
    <g
      data-dependency-line="true"
      data-atenuada={atenuada ? '' : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{ cursor: onDelete ? 'pointer' : 'default', opacity: atenuada ? 0.25 : 1, transition: 'opacity .15s ease-out' }}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        strokeLinecap="round"
        style={{ cursor: onDelete ? 'pointer' : 'default' }}
      />

      {titulo && <title>{titulo}</title>}
      {/* Main dependency line - base layer */}
      {discontinua ? (
        /* sin la animación de `pathLength`: usa el mismo `stroke-dasharray` que el discontinuo */
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={baseStrokeWidth}
          strokeLinecap="round"
          strokeDasharray="4 3"
          data-enlace-en-conflicto
          style={{ pointerEvents: 'none', filter: glowFilter || 'none' }}
        />
      ) : (
        <motion.path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={baseStrokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.5, ease: 'easeInOut' },
            opacity: { duration: 0.2 },
          }}
          style={{ pointerEvents: 'none', filter: glowFilter || 'none' }}
        />
      )}

      {/* Arrow head - filled triangle */}
      <motion.path
        d={arrowPath}
        fill={lineColor}
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Mejora fuerte 5 · el tipo y el desfase del enlace, junto a la punta. */}
      {etiqueta && (
        <text
          x={x2 - sIn * 10}
          y={y2 - 7}
          textAnchor={sIn > 0 ? 'end' : 'start'}
          fontSize={9}
          fontWeight={600}
          fill={lineColor}
          style={{ pointerEvents: 'none', fontFamily: 'JetBrains Mono, monospace' }}
          data-etiqueta-de-enlace
        >
          {etiqueta}
        </text>
      )}

      {/* Endpoint dot - base layer */}
      <motion.circle
        cx={x2}
        cy={y2}
        r={3}
        fill={lineColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.15 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* v0.17.451: Hover overlay is now rendered in a separate top-layer via Timeline */}
    </g>
  );
}
