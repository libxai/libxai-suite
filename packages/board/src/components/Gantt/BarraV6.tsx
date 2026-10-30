/**
 * ═══ GANTT v6 (Asakaa) · LA BARRA DE HERRAMIENTAS ═══════════════════════════════
 *
 * Maqueta de Yesid «asakaa-gantt-v6». Una fila, en este orden:
 *   Filtros (con cuántos) · los filtros activos como etiquetas «Ocultar completadas ×» ·
 *   [hueco] · D/S/M · lo propio de la app (Hoy, Líneas base) · Densidad «Normal ▾» · ⋯ · Nueva tarea
 *
 * En «⋯» va lo que se toca poco: qué se ve (ruta crítica, fines de semana, dependencias), el nivel
 * de la estructura, el modo de vista, exportar, copiar el enlace y lo que añada la app (historial,
 * pantalla completa).
 *
 * Colores: los tokens --v6-* que define la app (con los valores claros de la maqueta de reserva).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Filter, ChevronDown, Plus, X, Check, Rows3, MoreHorizontal } from 'lucide-react';
import type { TimeScale, RowDensity, TaskFilterType } from './types';
import { useGanttI18n } from './GanttI18nContext';

export interface OpcionExtraV6 {
  id: string;
  etiqueta: string;
  icono?: ReactNode;
  alPulsar: () => void;
}

export interface BarraV6Props {
  timeScale: TimeScale;
  onTimeScaleChange: (s: TimeScale) => void;
  rowDensity: RowDensity;
  onRowDensityChange: (d: RowDensity) => void;
  taskFilter: TaskFilterType;
  onTaskFilterChange?: (f: TaskFilterType) => void;
  hideCompleted: boolean;
  onHideCompletedChange?: (h: boolean) => void;
  toolbarRightContent?: ReactNode;
  showCreateTaskButton?: boolean;
  createTaskLabel?: string;
  onCreateTask?: () => void;
  wbsLevel?: number | 'all';
  onWbsLevelChange?: (l: number | 'all') => void;
  maxWbsDepth?: number;
  viewMode?: 'execution' | 'oracle';
  onViewModeChange?: (m: 'execution' | 'oracle') => void;
  showCriticalPath: boolean;
  onShowCriticalPathChange?: (v: boolean) => void;
  showDependencies: boolean;
  onShowDependenciesChange?: (v: boolean) => void;
  highlightWeekends: boolean;
  onHighlightWeekendsChange?: (v: boolean) => void;
  hasDependencies?: boolean;
  onExportPNG?: () => Promise<void>;
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
  onExportMSProject?: () => void;
  onCopySnapshotLink?: () => void;
  masOpciones?: OpcionExtraV6[];
}

const V = {
  texto: 'var(--v6-texto, #0E1114)',
  texto2: 'var(--v6-texto-2, #4D5761)',
  tenue: 'var(--v6-tenue, #5F6972)',
  borde: 'var(--v6-borde, #E2E5E9)',
  tarjeta: 'var(--v6-tarjeta, #FFFFFF)',
  neutroFondo: 'var(--v6-neutro-fondo, #E1E4E8)',
  segmentado: 'var(--v6-segmentado, #E9ECEF)',
  acento: 'var(--v6-acento, #0FA392)',
  acentoTexto: 'var(--v6-acento-texto, #066A5F)',
  acentoFondo2: 'var(--v6-acento-fondo-2, rgba(15,163,146,0.14))',
  acentoBordeSuave: 'var(--v6-acento-borde-suave, rgba(8,127,114,0.55))',
  sobreAcento: 'var(--v6-sobre-acento, #03231F)',
};
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

/** Un desplegable sencillo: botón + panel en body (escapa del overflow de la cabecera). */
function Desplegable({ boton, children, alinear = 'izquierda', ancho = 220 }: {
  boton: (abrir: () => void, abierto: boolean, ref: React.RefObject<HTMLButtonElement>) => ReactNode;
  children: (cerrar: () => void) => ReactNode;
  alinear?: 'izquierda' | 'derecha';
  ancho?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!abierto || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = alinear === 'derecha' ? Math.max(8, r.right - ancho) : Math.min(r.left, window.innerWidth - ancho - 8);
    setPos({ top: r.bottom + 6, left });
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !panel.current?.contains(t)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAbierto(false); ref.current?.focus(); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto, alinear, ancho]);
  return (
    <>
      {boton(() => setAbierto((v) => !v), abierto, ref)}
      {abierto && createPortal(
        <div
          ref={panel}
          role="menu"
          data-menu-v6
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: ancho, zIndex: 99999,
            padding: 6, borderRadius: 12, background: V.tarjeta, border: `1px solid ${V.borde}`,
            boxShadow: '0 12px 32px -8px rgba(14,17,20,0.25)', color: V.texto, fontSize: 13,
          }}
        >
          {children(() => setAbierto(false))}
        </div>,
        document.body,
      )}
    </>
  );
}

function Opcion({ children, marcada, alPulsar, icono }: { children: ReactNode; marcada?: boolean; alPulsar: () => void; icono?: ReactNode }) {
  return (
    <button
      type="button"
      role={marcada === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={marcada}
      onClick={alPulsar}
      className="w-full flex items-center text-left"
      style={{ gap: 8, height: 32, padding: '0 8px', borderRadius: 8, background: 'transparent', border: 0, color: V.texto, font: 'inherit', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = V.segmentado; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icono && <span aria-hidden className="flex items-center" style={{ color: V.texto2 }}>{icono}</span>}
      <span className="flex-1">{children}</span>
      {marcada && <Check className="w-3.5 h-3.5" style={{ color: V.acentoTexto }} aria-hidden />}
    </button>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <div style={{ padding: '6px 8px 4px', fontSize: 11, fontWeight: 500, color: V.tenue }}>{children}</div>;
}
function Separador() {
  return <div aria-hidden style={{ height: 1, margin: '4px 2px', background: V.borde }} />;
}

const BOTON_BASE: React.CSSProperties = {
  height: 36, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 6,
  borderRadius: 10, font: 'inherit', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
};

export function BarraV6(p: BarraV6Props) {
  const t = useGanttI18n();
  const es = t.toolbar.today === 'Hoy';
  const tx = (a: string, b: string) => (es ? a : b);

  const filtros: Array<{ valor: TaskFilterType; etiqueta: string }> = [
    { valor: 'all', etiqueta: tx('Todas', 'All') },
    { valor: 'incomplete', etiqueta: tx('Por hacer', 'To do') },
    { valor: 'in_progress', etiqueta: tx('En progreso', 'In progress') },
    { valor: 'completed', etiqueta: tx('Completadas', 'Completed') },
  ];
  /* Gantt ronda 2 (Yesid) · P2 · «ocultar completadas» no cuenta aquí ni lleva etiqueta: su único aviso es el contador
     de la tabla («38 completadas ocultas · Mostrar»). */
  const activos = p.taskFilter !== 'all' ? 1 : 0;
  const DENSIDADES: Array<{ valor: RowDensity; etiqueta: string }> = [
    { valor: 'compact', etiqueta: tx('Compacta', 'Compact') },
    { valor: 'comfortable', etiqueta: tx('Normal', 'Normal') },
    { valor: 'spacious', etiqueta: tx('Cómoda', 'Comfortable') },
  ];
  const densidad = DENSIDADES.find((d) => d.valor === p.rowDensity) ?? DENSIDADES[1]!;
  const exportar = [
    p.onExportPNG && { id: 'png', etiqueta: tx('Exportar imagen (PNG)', 'Export image (PNG)'), f: p.onExportPNG },
    p.onExportPDF && { id: 'pdf', etiqueta: tx('Exportar PDF', 'Export PDF'), f: p.onExportPDF },
    p.onExportExcel && { id: 'xlsx', etiqueta: tx('Exportar Excel', 'Export Excel'), f: p.onExportExcel },
    p.onExportMSProject && { id: 'msp', etiqueta: tx('Exportar a MS Project', 'Export to MS Project'), f: p.onExportMSProject },
  ].filter(Boolean) as Array<{ id: string; etiqueta: string; f: () => unknown }>;

  return (
    <div data-barra-v6 className="flex flex-wrap items-center min-w-0" style={{ gap: 8, flex: '1 1 auto', fontSize: 13, color: V.texto }}>
      {p.onTaskFilterChange && (
        <Desplegable
          boton={(abrir, abierto, ref) => (
            <button
              ref={ref}
              type="button"
              aria-haspopup="menu"
              aria-expanded={abierto}
              onClick={abrir}
              style={{ ...BOTON_BASE, padding: '0 8px 0 10px', background: V.tarjeta, color: V.texto, border: `1px solid ${activos ? V.acentoBordeSuave : V.borde}` }}
            >
              <Filter className="w-[15px] h-[15px]" style={{ color: activos ? V.acentoTexto : V.texto2 }} aria-hidden />
              {tx('Filtros', 'Filters')}
              {activos > 0 && (
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: V.acentoTexto, padding: '1px 6px', borderRadius: 6, background: V.acentoFondo2 }}>{activos}</span>
              )}
            </button>
          )}
        >
          {(cerrar) => (
            <>
              <Titulo>{tx('Estado de la tarea', 'Task status')}</Titulo>
              {filtros.map((f) => (
                <Opcion key={f.valor} marcada={p.taskFilter === f.valor && !p.hideCompleted}
                  alPulsar={() => { p.onTaskFilterChange?.(f.valor); p.onHideCompletedChange?.(false); cerrar(); }}>
                  {f.etiqueta}
                </Opcion>
              ))}
              {p.onHideCompletedChange && (
                <>
                  <Separador />
                  <Opcion marcada={p.hideCompleted}
                    alPulsar={() => { const v = !p.hideCompleted; p.onHideCompletedChange?.(v); if (v) p.onTaskFilterChange?.('all'); cerrar(); }}>
                    {tx('Ocultar completadas', 'Hide completed')}
                  </Opcion>
                </>
              )}
            </>
          )}
        </Desplegable>
      )}

      {/* Los filtros activos, a la vista y con su ×. */}
      {p.taskFilter !== 'all' && (
        <EtiquetaDeFiltro
          texto={filtros.find((f) => f.valor === p.taskFilter)?.etiqueta ?? p.taskFilter}
          quitar={tx('Quitar filtro', 'Remove filter')}
          alQuitar={() => p.onTaskFilterChange?.('all')}
        />
      )}

      <div aria-hidden style={{ flex: '1 1 0', minWidth: 0 }} />

      <div role="group" aria-label={tx('Escala de tiempo', 'Time scale')}
        className="flex items-center"
        style={{ height: 36, boxSizing: 'border-box', gap: 2, padding: '0 2px', border: `1px solid ${V.borde}`, borderRadius: 10, background: V.segmentado }}>
        {([['day', tx('D', 'D'), tx('Día', 'Day')], ['week', tx('S', 'W'), tx('Semana', 'Week')], ['month', tx('M', 'M'), tx('Mes', 'Month')]] as const).map(([valor, corta, larga]) => {
          const activa = p.timeScale === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activa}
              aria-label={larga}
              title={larga}
              data-escala-v6={valor}
              onClick={() => p.onTimeScaleChange(valor)}
              style={{
                width: 32, height: 30, padding: 0, border: 0, borderRadius: 8, font: 'inherit', fontWeight: 500, cursor: 'pointer',
                background: activa ? 'var(--v6-escala-activa, #FFFFFF)' : 'transparent',
                boxShadow: activa ? 'var(--v6-escala-sombra, 0 1px 2px rgba(14,17,20,0.14))' : 'none',
                color: activa ? V.texto : V.texto2,
              }}
            >
              {corta}
            </button>
          );
        })}
      </div>

      {p.toolbarRightContent}

      <Desplegable
        alinear="derecha"
        ancho={200}
        boton={(abrir, abierto, ref) => (
          <button ref={ref} type="button" aria-haspopup="menu" aria-expanded={abierto} onClick={abrir}
            aria-label={`${tx('Densidad de filas', 'Row density')}: ${densidad.etiqueta}`}
            style={{ ...BOTON_BASE, padding: '0 8px 0 10px', border: 0, background: 'transparent', color: V.texto }}>
            <Rows3 className="w-[15px] h-[15px]" style={{ color: V.texto2 }} aria-hidden />
            {densidad.etiqueta}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: V.tenue }} aria-hidden />
          </button>
        )}
      >
        {(cerrar) => (
          <>
            <Titulo>{tx('Densidad de filas', 'Row density')}</Titulo>
            {DENSIDADES.map((d) => (
              <Opcion key={d.valor} marcada={p.rowDensity === d.valor} alPulsar={() => { p.onRowDensityChange(d.valor); cerrar(); }}>
                {d.etiqueta}
              </Opcion>
            ))}
          </>
        )}
      </Desplegable>

      <Desplegable
        alinear="derecha"
        ancho={248}
        boton={(abrir, abierto, ref) => (
          <button ref={ref} type="button" aria-haspopup="menu" aria-expanded={abierto} onClick={abrir}
            aria-label={tx('Más opciones: vista, exportar, compartir', 'More options: view, export, share')}
            title={tx('Más opciones', 'More options')}
            style={{ ...BOTON_BASE, width: 36, justifyContent: 'center', padding: 0, border: 0, background: 'transparent', color: V.texto2 }}>
            <MoreHorizontal className="w-4 h-4" aria-hidden />
          </button>
        )}
      >
        {(cerrar) => (
          <>
            <Titulo>{tx('Ver', 'Show')}</Titulo>
            {p.onShowCriticalPathChange && (
              <Opcion marcada={p.showCriticalPath} alPulsar={() => p.onShowCriticalPathChange?.(!p.showCriticalPath)}>
                {tx('Ruta crítica', 'Critical path')}
              </Opcion>
            )}
            {p.onHighlightWeekendsChange && (
              <Opcion marcada={p.highlightWeekends} alPulsar={() => p.onHighlightWeekendsChange?.(!p.highlightWeekends)}>
                {tx('Fines de semana y festivos', 'Weekends and holidays')}
              </Opcion>
            )}
            {p.onShowDependenciesChange && p.hasDependencies !== false && (
              <Opcion marcada={p.showDependencies} alPulsar={() => p.onShowDependenciesChange?.(!p.showDependencies)}>
                {tx('Dependencias', 'Dependencies')}
              </Opcion>
            )}
            {p.onWbsLevelChange && (
              <>
                <Separador />
                <Titulo>{tx('Nivel de la estructura', 'Structure level')}</Titulo>
                {(['all', ...Array.from({ length: Math.max(1, p.maxWbsDepth ?? 4) }, (_, i) => i + 1)] as Array<number | 'all'>).map((n) => (
                  <Opcion key={String(n)} marcada={(p.wbsLevel ?? 'all') === n} alPulsar={() => { p.onWbsLevelChange?.(n); cerrar(); }}>
                    {n === 'all' ? tx('Todos los niveles', 'All levels') : `${tx('Hasta el nivel', 'Up to level')} ${n}`}
                  </Opcion>
                ))}
              </>
            )}
            {p.onViewModeChange && (
              <>
                <Separador />
                <Titulo>{tx('Modo', 'Mode')}</Titulo>
                {(['execution', 'oracle'] as const).map((m) => (
                  <Opcion key={m} marcada={p.viewMode === m} alPulsar={() => { p.onViewModeChange?.(m); cerrar(); }}>
                    {m === 'execution' ? t.toolbar.viewExecution : t.toolbar.viewOracle}
                  </Opcion>
                ))}
              </>
            )}
            {(exportar.length > 0 || p.onCopySnapshotLink) && <Separador />}
            {exportar.map((x) => (
              <Opcion key={x.id} alPulsar={() => { cerrar(); void x.f(); }}>{x.etiqueta}</Opcion>
            ))}
            {p.onCopySnapshotLink && (
              <Opcion alPulsar={() => { cerrar(); p.onCopySnapshotLink?.(); }}>{tx('Copiar enlace', 'Copy link')}</Opcion>
            )}
            {(p.masOpciones?.length ?? 0) > 0 && <Separador />}
            {p.masOpciones?.map((o) => (
              <Opcion key={o.id} icono={o.icono} alPulsar={() => { cerrar(); o.alPulsar(); }}>{o.etiqueta}</Opcion>
            ))}
          </>
        )}
      </Desplegable>

      {p.showCreateTaskButton && p.onCreateTask && (
        <button
          type="button"
          data-nueva-tarea-v6
          onClick={p.onCreateTask}
          style={{ ...BOTON_BASE, padding: '0 14px 0 11px', border: 0, background: V.acento, color: V.sobreAcento, fontWeight: 600 }}
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2.2} aria-hidden />
          {p.createTaskLabel || tx('Nueva tarea', 'New task')}
        </button>
      )}
    </div>
  );
}

function EtiquetaDeFiltro({ texto, quitar, alQuitar }: { texto: string; quitar: string; alQuitar: () => void }) {
  return (
    <span
      data-filtro-activo-v6
      className="flex items-center whitespace-nowrap"
      style={{ height: 28, boxSizing: 'border-box', gap: 2, padding: '0 3px 0 10px', borderRadius: 8, background: V.neutroFondo, color: V.texto2, fontSize: 12 }}
    >
      {texto}
      <button
        type="button"
        aria-label={`${quitar} ${texto}`}
        onClick={alQuitar}
        className="flex items-center justify-center"
        style={{ width: 22, height: 22, padding: 0, border: 0, borderRadius: 6, background: 'transparent', color: V.tenue, cursor: 'pointer' }}
      >
        <X className="w-3 h-3" strokeWidth={2} aria-hidden />
      </button>
    </span>
  );
}
