/**
 * Calendario Asakaa Pulse — Chrome (barra superior + toolbar + panel de capas).
 * Sprint 1, solo lectura. Traducción TSX de CalTopBar + CalToolbar + CalLayersPop
 * (cal-components.jsx). Usa las clases .cal-* de calendar.css tal cual.
 *
 * Todo el texto en español. Componentes totalmente controlados por props
 * (sin estado interno salvo lo trivial).
 */
import { useEffect, useRef, useState } from 'react';

export type CalView = 'mes' | 'semana' | 'lookahead' | 'agenda';
export type CalMoney = 'hrs' | '$';
export type CalLayerId = 'tareas' | 'cpm' | 'hitos' | 'ext' | 'festivos' | 'aus';

/* ---------- Top bar (header del tablero) ---------- */
export interface CalTopBarProps {
  view: CalView;
  onViewChange: (view: CalView) => void;
  money: CalMoney;
  onMoneyChange: (money: CalMoney) => void;
  /** Etiqueta del proyecto seleccionado (sin dropdown funcional en S1). */
  projectLabel: string;
  locale?: string;
}

const VISTAS: { id: CalView; lbl: string; key: string }[] = [
  { id: 'mes', lbl: 'Mes', key: 'M' },
  { id: 'semana', lbl: 'Semana', key: 'W' },
  { id: 'lookahead', lbl: 'Lookahead', key: '2' },
  { id: 'agenda', lbl: 'Agenda', key: 'A' },
];

export function CalTopBar({
  view,
  onViewChange,
  money,
  onMoneyChange,
  projectLabel,
}: CalTopBarProps) {
  return (
    // El logo/marca "Asakaa Pulse" se omite aquí: ya está en el header global y
    // en el selector de workspace — sería redundante repetirlo en el calendario.
    <div className="cal-topbar">
      <div className="cal-projsel">
        {projectLabel}
        <span className="caret">▾</span>
      </div>
      <div className="cal-spacer" />
      <div className="cal-seg">
        {VISTAS.map((v) => (
          <button
            type="button"
            key={v.id}
            className={view === v.id ? 'on' : ''}
            onClick={() => onViewChange(v.id)}
          >
            {v.lbl}
            <span className="key">{v.key}</span>
          </button>
        ))}
      </div>
      <div className="cal-seg">
        <button
          type="button"
          className={money === '$' ? '' : 'on'}
          onClick={() => onMoneyChange('hrs')}
        >
          Hrs
        </button>
        <button
          type="button"
          className={money === '$' ? 'on' : ''}
          onClick={() => onMoneyChange('$')}
        >
          $
        </button>
      </div>
    </div>
  );
}

/* ---------- Toolbar: nav del periodo + filtros persistentes ---------- */
export interface PhaseOption { id: string; name: string }

export interface CalToolbarProps {
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  /** Capas apagadas (para el contador del botón). */
  layersOff: string[];
  /** Fases (tareas-padre raíz) disponibles para filtrar. */
  phases?: PhaseOption[];
  /** fase seleccionada ('all' = todas). */
  phaseFilter?: string;
  onPhaseChange?: (id: string) => void;
  locale?: 'es' | 'en';
  /** Chips de responsables u otros controles que se inyectan en la toolbar. */
  children?: React.ReactNode;
}

export function CalToolbar({
  monthLabel,
  onPrev,
  onNext,
  onToday,
  layersOpen,
  onToggleLayers,
  layersOff,
  phases,
  phaseFilter = 'all',
  onPhaseChange,
  locale = 'es',
  children,
}: CalToolbarProps) {
  const offCount = layersOff ? layersOff.length : 0;
  const [phaseOpen, setPhaseOpen] = useState(false);
  const phaseRef = useRef<HTMLDivElement>(null);
  const es = locale === 'es';

  useEffect(() => {
    if (!phaseOpen) return;
    const onDown = (e: MouseEvent) => {
      if (phaseRef.current && !phaseRef.current.contains(e.target as Node)) setPhaseOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [phaseOpen]);

  const selectedName = phaseFilter === 'all'
    ? (es ? 'Todas' : 'All')
    : (phases?.find((p) => p.id === phaseFilter)?.name ?? (es ? 'Todas' : 'All'));

  return (
    <div className="cal-toolbar">
      <div className="cal-nav-arrows">
        <button type="button" onClick={onPrev} aria-label="Periodo anterior">‹</button>
        <button type="button" onClick={onNext} aria-label="Periodo siguiente">›</button>
      </div>
      <div className="cal-month-label">{monthLabel}</div>
      <button type="button" className="cal-hoy" onClick={onToday}>{es ? 'Hoy' : 'Today'}</button>
      <div className="cal-vsep" />

      {/* Filtro de Fase (tarea-padre raíz). Solo si hay fases que filtrar. */}
      {phases && phases.length > 0 && onPhaseChange ? (
        <div className="relative" ref={phaseRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="cal-ftog"
            onClick={() => setPhaseOpen((o) => !o)}
            style={phaseFilter !== 'all' ? { borderColor: 'var(--cyan)', color: 'var(--cyan)' } : undefined}
          >
            <b>{es ? 'Fase' : 'Phase'}</b> {selectedName} ▾
          </button>
          {phaseOpen ? (
            <div
              className="cal-pop"
              style={{ position: 'absolute', top: '36px', left: 0, zIndex: 40, width: 240, maxHeight: 320, overflowY: 'auto' }}
            >
              <button
                type="button"
                className="cal-layer-row"
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer', color: phaseFilter === 'all' ? 'var(--cyan)' : 'var(--txt)' }}
                onClick={() => { onPhaseChange('all'); setPhaseOpen(false); }}
              >
                <span className="nm">{es ? 'Todas las fases' : 'All phases'}</span>
              </button>
              {phases.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="cal-layer-row"
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer', color: phaseFilter === p.id ? 'var(--cyan)' : 'var(--txt)' }}
                  onClick={() => { onPhaseChange(p.id); setPhaseOpen(false); }}
                >
                  <span className="nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
      <div className="cal-toolbar-right">
        <button
          type="button"
          className={'cal-layers-btn' + (layersOpen ? ' open' : '')}
          onClick={onToggleLayers}
        >
          ◧ {es ? 'Capas' : 'Layers'} <span className="n">{6 - offCount}/6</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- Panel de capas ---------- */
export interface CalLayersPopProps {
  /** IDs de capas apagadas. */
  off: string[];
  onToggle: (layerId: CalLayerId) => void;
}

const LAYERS: { id: CalLayerId; nm: string; sub: string; sw: string }[] = [
  { id: 'tareas', nm: 'Tareas', sub: 'Barras del Gantt', sw: 'var(--p26011)' },
  { id: 'cpm', nm: 'Ruta crítica', sub: 'CPM · borde cian', sw: 'var(--cyan)' },
  { id: 'hitos', nm: 'Milestones / Desembolsos', sub: 'Rombo cian', sw: 'var(--cyan)' },
  { id: 'ext', nm: 'Eventos externos', sub: 'Google / Outlook · lectura', sw: 'var(--subtle)' },
  { id: 'festivos', nm: 'Festivos', sub: 'Calendario Colombia', sw: 'var(--subtle)' },
  { id: 'aus', nm: 'Ausencias del equipo', sub: 'Vacaciones · permisos', sw: 'var(--orange)' },
];

export function CalLayersPop({ off, onToggle }: CalLayersPopProps) {
  const offList = off || [];
  return (
    <div
      className="cal-pop cal-layers-pop"
      style={{ position: 'absolute', top: '42px', right: '20px', zIndex: 30 }}
    >
      {LAYERS.map((l) => {
        const isOff = offList.includes(l.id);
        return (
          <div
            key={l.id}
            className={'cal-layer-row' + (isOff ? ' off' : '')}
            onClick={() => onToggle(l.id)}
          >
            <span className="sw" style={{ background: l.sw, opacity: isOff ? 0.3 : 1 }} />
            <div>
              <div className="nm">{l.nm}</div>
              <div className="sub">{l.sub}</div>
            </div>
            <span className={'cal-switch' + (isOff ? '' : ' on')} />
          </div>
        );
      })}
    </div>
  );
}
