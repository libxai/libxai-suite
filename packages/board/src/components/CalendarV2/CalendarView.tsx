/**
 * CalendarView — rediseño del Calendario (Asakaa Pulse, Sprint 1, SOLO LECTURA).
 *
 * Reemplaza el CalendarBoard plano por la proyección operativa del plan: barras
 * de tareas con color por proyecto, ruta crítica (CPM) con glow, festivos/fines
 * de semana sombreados, "+N más" sin recorte mudo, capas conmutables, filtros,
 * toggle $/Hrs y estado vacío premium. Las vistas Semana/Lookahead/Agenda y la
 * reprogramación con CPM llegan en S2/S3 (el chrome ya las ofrece).
 *
 * Consume las tareas reales que ProjectCalendar ya carga — no duplica el motor
 * de datos del Gantt (regla de la spec).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task as LibXAITask } from '../Gantt/types';
import {
  buildMonthGrid, layoutWeek, isWeekendSerial,
  type CalTask, type DayItem,
} from './calendarLayout';
import { buildCalendar, monthLabel } from './calendarData';
import { CalDow, CalBar, CalChip, CalMoreChip, CalLegend, type MoneyMode } from './CalendarParts';
import { CalTopBar, CalToolbar, CalLayersPop, type CalView, type CalLayerId } from './CalendarChrome';
import { CalMorePopover, CalEmptyState } from './CalendarPopovers';
import { WeekGridView, type CapRowsByWeek } from './CalendarWeekViews';
import { CalBreakdownPopover, buildCapacityByDay, type CapDay, type DayCapacity, type PersonLoad } from './CalendarCapacity';
import { CalBacklogPanel, CalPulseRail, buildBacklog } from './CalendarBacklog';
import { CalendarReschedulePopover } from './CalendarReschedulePopover';
import { CalendarAgenda } from './CalendarAgenda';
import { simulateReschedule, type RescheduleSimulation } from './calendarReschedule';
import type { TeamMember } from './CalendarCapacity';

/** 'YYYY-MM-DD' en calendario local (no UTC). */
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEK_MIN_H = 132; // alto mínimo por semana (5 slots × 26 + cabecera)
const SLOT_H = 26;

interface Props {
  tasks: LibXAITask[];
  projectName: string;
  projectId: string;
  projectColor?: string;
  workspaceId?: string;
  locale: 'es' | 'en';
  /** 'light' aplica la paleta clara; cualquier otro = oscuro. */
  themeMode?: 'dark' | 'light';
  hourlyRate: number;
  /** money compartido con Gantt/Lista (lens global). */
  money: MoneyMode;
  onMoneyChange: (m: MoneyMode) => void;
  /** abrir el drawer global de tarea. */
  onTaskOpen?: (taskId: string) => void;
  /** contenido extra a la derecha de la topbar (historial, etc.). */
  rightContent?: React.ReactNode;
  /** S3 (C5): ¿el usuario puede reprogramar? Si no, el calendario es solo lectura. */
  canReschedule?: boolean;
  /** S3 (C5): commit del movimiento (la tarea + sus sucesoras). Devuelve éxito. */
  onReschedule?: (changes: Array<{ id: string; startDate: Date; endDate: Date }>) => Promise<boolean>;
  // ── Datos resueltos por el consumidor (la librería es agnóstica de Supabase) ──
  /** miembros con su carga diaria (de useTeamCapacity en el SaaS). */
  members?: TeamMember[];
  /** festivos del workspace como 'YYYY-MM-DD' (de useHolidays en el SaaS). */
  holidayDates?: string[];
  /** jornada del workspace (de timesheetSettings) — capacidad diaria por persona. */
  timesheetSettings?: { hoursPerDay?: Record<string, number> };
  /** se llama cuando cambia el rango visible (mes) para que el consumidor
   *  recargue la capacidad de ese rango. */
  onVisibleRangeChange?: (range: { start: string; end: string }) => void;
}

// Color por defecto si el proyecto no define uno (paleta del diseño).
const DEFAULT_PROJECT_COLOR = '#5B7FD4';

export function CalendarView({
  tasks, projectName, projectId, projectColor, locale, themeMode, hourlyRate, money, onMoneyChange, onTaskOpen,
  canReschedule, onReschedule,
  members = [], holidayDates = [], timesheetSettings, onVisibleRangeChange,
}: Props) {
  const [view, setView] = useState<CalView>('mes');
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [layersOpen, setLayersOpen] = useState(false);
  const [layersOff, setLayersOff] = useState<CalLayerId[]>([]);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [morePopover, setMorePopover] = useState<{ day: number; items: DayItem[]; tasks: CalTask[] } | null>(null);
  const [breakdown, setBreakdown] = useState<{ dayLabel: string; perPerson: PersonLoad[]; anchor: DOMRect } | null>(null);
  const [backlogOpen, setBacklogOpen] = useState(false);
  // S3 (C5): reprogramación. pending = simulación pendiente de confirmar.
  const [reschedule, setReschedule] = useState<{
    uid: string; taskId: string; taskName: string; sim: RescheduleSimulation; anchor: DOMRect;
  } | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor.y, cursor.m]);
  const projColor = projectColor || DEFAULT_PROJECT_COLOR;

  // Festivos (los pasa el consumidor) como Set de serial visible para sombrear.
  const holidaySerials = useMemo(() => {
    const set = new Set<number>();
    for (const iso of holidayDates) {
      const d = new Date(`${iso}T12:00:00`);
      const s = grid.dateToSerial(d);
      if (s >= 1 && s <= 42) set.add(s);
    }
    return set;
  }, [holidayDates, grid]);

  // Avisa al consumidor del rango visible para que recargue la capacidad.
  useEffect(() => {
    onVisibleRangeChange?.({
      start: toLocalISODate(grid.serialToDate(1)),
      end: toLocalISODate(grid.serialToDate(42)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.y, cursor.m]);

  const teamSize = members.length;
  // Capacidad-techo de UNA persona por día hábil, desde timesheetSettings
  // (fuente: jornada del workspace). buildCapacityByDay la multiplica por el nº
  // de personas. OJO: NO usar members.weeklyCapacity — el hook lo escala al
  // rango de fechas (×nº de semanas), no es por día.
  const perPersonDailyCapacity = useMemo(() => {
    const hpd = (timesheetSettings as unknown as { hoursPerDay?: Record<string, number> } | undefined)?.hoursPerDay;
    if (!hpd) return 8; // fallback jornada estándar
    const wd = [hpd.monday, hpd.tuesday, hpd.wednesday, hpd.thursday, hpd.friday]
      .map((x) => x || 0).filter((x) => x > 0);
    return wd.length ? Math.round((wd.reduce((a, b) => a + b, 0) / wd.length) * 10) / 10 : 8;
  }, [timesheetSettings]);

  const built = useMemo(
    () => buildCalendar({ tasks, grid, projectColor: () => projColor, hourlyRate, projectId }),
    [tasks, grid, projColor, hourlyRate, projectId],
  );

  // Fases disponibles (tareas-padre raíz) para el filtro de la toolbar.
  const phases = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of built.calTasks) {
      if (t.phaseId && t.phaseName) map.set(t.phaseId, t.phaseName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [built.calTasks]);

  // Capas apagadas + filtro de fase determinan qué se muestra.
  const showTasks = !layersOff.includes('tareas');
  const showCpm = !layersOff.includes('cpm');
  const visibleTasks = useMemo(() => {
    let list = showTasks ? built.calTasks : [];
    if (phaseFilter !== 'all') list = list.filter((t) => t.phaseId === phaseFilter);
    if (!showCpm) list = list.map((t) => (t.critical ? { ...t, critical: false } : t));
    return list;
  }, [built.calTasks, showTasks, showCpm, phaseFilter]);

  const visibleItems = useMemo(() => {
    const offTypes = new Set<string>();
    if (layersOff.includes('hitos')) { offTypes.add('hito'); offTypes.add('desembolso'); }
    if (layersOff.includes('ext')) offTypes.add('ext');
    if (layersOff.includes('aus')) offTypes.add('aus');
    return built.dayItems.filter((i) => !offTypes.has(i.type));
  }, [built.dayItems, layersOff]);

  const showFestivos = !layersOff.includes('festivos');
  const today = new Date();
  const todaySerial = grid.dateToSerial(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const toggleLayer = (id: CalLayerId) =>
    setLayersOff((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const goPrev = () => setCursor((c) => { const d = new Date(c.y, c.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goNext = () => setCursor((c) => { const d = new Date(c.y, c.m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { const n = new Date(); setCursor({ y: n.getFullYear(), m: n.getMonth() }); };

  // S3 (C5): al soltar una barra movida `deltaDays` días → simula y pide confirmar.
  const beginReschedule = (uid: string, deltaDays: number, anchor: DOMRect) => {
    if (!canReschedule || deltaDays === 0) return;
    const ct = built.calTasks.find((t) => t.uid === uid);
    if (!ct) return;
    const ms = deltaDays * 86400000;
    const newStart = new Date(ct.realStart.getTime() + ms);
    const newEnd = new Date(ct.realEnd.getTime() + ms);
    const sim = simulateReschedule(tasks, uid, newStart, newEnd);
    if (!sim) return;
    setReschedule({ uid, taskId: ct.id, taskName: ct.name, sim, anchor });
  };

  const confirmReschedule = async () => {
    if (!reschedule || !onReschedule) return;
    setRescheduleBusy(true);
    const changes = [
      { id: reschedule.uid, startDate: reschedule.sim.newStart, endDate: reschedule.sim.newEnd },
      ...reschedule.sim.movedSuccessors.map((s) => ({ id: s.id, startDate: s.newStart, endDate: s.newEnd })),
    ];
    const ok = await onReschedule(changes);
    setRescheduleBusy(false);
    if (ok) setReschedule(null);
  };

  const mLabel = monthLabel(cursor.y, cursor.m, locale);
  // id vacío en la leyenda: el código corto por proyecto (C11) es de S3; por
  // ahora solo el nombre, nunca el UUID.
  const projects = [{ id: '', name: projectName, color: projColor }];

  // Backlog: tareas reales sin fecha (C8). Solo lista en S2 (drag → S3).
  const backlog = useMemo(() => buildBacklog(tasks, hourlyRate), [tasks, hourlyRate]);

  // ── Vistas Semana / Lookahead: rangos de semana + capacidad por día ──
  // Semana: la semana de la grilla que contiene HOY (o la primera). Lookahead: 2.
  const weekRanges = useMemo(() => {
    if (view === 'lookahead') {
      // 2 semanas desde la que contiene hoy.
      const startW = grid.weeks.find((w) => todaySerial >= w.ws && todaySerial <= w.we) ?? grid.weeks[0]!;
      const idx = grid.weeks.indexOf(startW);
      return grid.weeks.slice(idx, idx + 2);
    }
    if (view === 'semana') {
      const w = grid.weeks.find((x) => todaySerial >= x.ws && todaySerial <= x.we) ?? grid.weeks[0]!;
      return [w];
    }
    return [];
  }, [view, grid.weeks, todaySerial]);

  // Capacidad por semana (CapDay[] + Map) para las franjas de Semana/Lookahead.
  const capRows: CapRowsByWeek = useMemo(() => {
    const out: CapRowsByWeek = {};
    weekRanges.forEach((w, wi) => {
      const days: CapDay[] = [];
      for (let d = w.ws; d <= w.we; d++) {
        days.push({
          serial: d,
          date: grid.serialToDate(d),
          isWeekend: isWeekendSerial(grid, d),
          isHoliday: holidaySerials.has(d),
        });
      }
      const capByDay: Map<string, DayCapacity> = buildCapacityByDay(members, days, perPersonDailyCapacity);
      out[wi] = { days, capByDay };
    });
    return out;
  }, [weekRanges, grid, holidaySerials, members, perPersonDailyCapacity]);

  const isWeekView = view === 'semana' || view === 'lookahead';
  const isAgenda = view === 'agenda';

  return (
    <div className={`cal-app${themeMode === 'light' ? ' cal-light' : ''}`}>
      <CalTopBar
        view={view}
        onViewChange={setView}
        money={money === '$' ? '$' : 'hrs'}
        onMoneyChange={(m) => onMoneyChange(m === '$' ? '$' : 'Hrs')}
        projectLabel={projectName}
        locale={locale}
      />
      <CalToolbar
        monthLabel={mLabel}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((o) => !o)}
        layersOff={layersOff}
        phases={phases}
        phaseFilter={phaseFilter}
        onPhaseChange={setPhaseFilter}
        locale={locale}
      >
        {layersOpen ? <CalLayersPop off={layersOff} onToggle={toggleLayer} /> : null}
      </CalToolbar>

      <div className="cal-body">
        <div className="cal-grid-zone" style={{ position: 'relative', overflow: isAgenda ? 'hidden' : undefined }}>
          {isAgenda ? (
            <CalendarAgenda
              grid={grid}
              tasks={visibleTasks}
              items={visibleItems}
              money={money}
              projColor={projColor}
              todaySerial={todaySerial}
              locale={locale}
              onTaskOpen={onTaskOpen}
            />
          ) : isWeekView ? (
            <>
              <CalDow locale={locale} />
              <WeekGridView
                grid={grid}
                weeks={weekRanges}
                tasks={visibleTasks}
                items={visibleItems}
                money={money}
                projColor={projColor}
                todaySerial={todaySerial}
                locale={locale}
                capRows={capRows}
                teamSize={teamSize}
                onTaskOpen={onTaskOpen}
                onMore={(day, items, tasksOfDay) => setMorePopover({ day, items, tasks: tasksOfDay })}
                onCapDay={(key, dayLabel, anchor) => {
                  // localizar el día y su desglose por persona.
                  for (const wi of Object.keys(capRows)) {
                    const cap = capRows[+wi]!.capByDay.get(key);
                    if (cap) { setBreakdown({ dayLabel, perPerson: cap.perPerson, anchor: anchor.getBoundingClientRect() }); break; }
                  }
                }}
              />
            </>
          ) : built.isEmpty ? (
            <>
              <CalDow locale={locale} />
              <div className="cal-weeks">
                {grid.weeks.map((w) => (
                  <WeekBg key={w.ws} grid={grid} ws={w.ws} we={w.we} todaySerial={todaySerial}
                    showFestivos={showFestivos} holidaySerials={holidaySerials} locale={locale} deadlineDays={new Set()} />
                ))}
              </div>
              <CalEmptyState monthLabel={mLabel} locale={locale} />
            </>
          ) : (
            <>
              <CalDow locale={locale} />
              <div className="cal-weeks">
                {grid.weeks.map((w) => (
                  <WeekRow
                    key={w.ws}
                    grid={grid}
                    ws={w.ws}
                    we={w.we}
                    tasks={visibleTasks}
                    items={visibleItems}
                    money={money}
                    projColor={projColor}
                    todaySerial={todaySerial}
                    showFestivos={showFestivos}
                    holidaySerials={holidaySerials}
                    locale={locale}
                    onTaskOpen={onTaskOpen}
                    onMore={(day, items, tasksOfDay) => setMorePopover({ day, items, tasks: tasksOfDay })}
                    canReschedule={canReschedule}
                    onDragReschedule={beginReschedule}
                    pendingGhost={reschedule ? { uid: reschedule.uid, days: Math.round((reschedule.sim.newStart.getTime() - reschedule.sim.oldStart.getTime()) / 86400000) } : null}
                  />
                ))}
              </div>
            </>
          )}

          {morePopover ? (
            <CalMorePopover
              dayLabel={`${grid.serialToDate(morePopover.day).getDate()}`}
              items={morePopover.items}
              tasks={morePopover.tasks.map((t) => ({ swatch: projColor, taskId: t.id, label: t.name, critical: t.critical, value: money === '$' ? t.cost : `${t.hrs}h` }))}
              onClose={() => setMorePopover(null)}
              style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}
            />
          ) : null}

          {breakdown ? (
            <CalBreakdownPopover
              dayLabel={breakdown.dayLabel}
              perPerson={breakdown.perPerson}
              onClose={() => setBreakdown(null)}
              style={{ position: 'fixed', top: `${breakdown.anchor.top - 8}px`, left: `${breakdown.anchor.left}px`, transform: 'translateY(-100%)', zIndex: 50 }}
            />
          ) : null}

          {reschedule ? (
            <CalendarReschedulePopover
              taskName={reschedule.taskName}
              taskId={reschedule.sim.taskId}
              sim={reschedule.sim}
              busy={rescheduleBusy}
              locale={locale}
              onConfirm={confirmReschedule}
              onCancel={() => setReschedule(null)}
              style={{ position: 'fixed', top: `${reschedule.anchor.top + 12}px`, left: `${Math.min(reschedule.anchor.left, window.innerWidth - 340)}px`, zIndex: 60 }}
            />
          ) : null}
        </div>

        {/* Panel Backlog "Sin fecha" (C8) — lista en S2, drag en S3. */}
        {backlogOpen ? (
          <CalBacklogPanel
            items={backlog}
            money={money}
            projColor={projColor}
            onItemClick={(id) => onTaskOpen?.(id)}
            onCollapse={() => setBacklogOpen(false)}
          />
        ) : (
          <CalPulseRail onExpand={() => setBacklogOpen(true)} />
        )}
      </div>

      <CalLegend projects={projects} />
    </div>
  );
}

// ── Fondo de una semana (celdas: festivo/finde/hoy/fuera-de-mes) ─────────────
interface WeekBgProps {
  grid: ReturnType<typeof buildMonthGrid>;
  ws: number; we: number;
  todaySerial: number;
  showFestivos: boolean;
  holidaySerials: Set<number>;
  locale: 'es' | 'en';
  deadlineDays: Set<number>;
}
function WeekBg({ grid, ws, we, todaySerial, showFestivos, holidaySerials, deadlineDays }: WeekBgProps) {
  const days: number[] = [];
  for (let d = ws; d <= we; d++) days.push(d);
  return (
    <div className="cal-week-bg">
      {days.map((d) => {
        const date = grid.serialToDate(d);
        const inMonth = d >= grid.monthStartSerial && d <= grid.monthEndSerial;
        const isHoliday = showFestivos && holidaySerials.has(d);
        let cls = 'cal-day';
        if (isWeekendSerial(grid, d)) cls += ' wknd';
        if (isHoliday) cls += ' festivo';
        if (!inMonth) cls += ' out';
        if (d === todaySerial) cls += ' today';
        if (deadlineDays.has(d)) cls += ' deadline-day';
        return (
          <div key={d} className={cls}>
            <span className="cal-day-num">{date.getDate()}</span>
            {isHoliday ? <span className="cal-day-tag">Festivo</span> : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Una semana con barras + chips + "+N más" ─────────────────────────────────
interface WeekRowProps {
  grid: ReturnType<typeof buildMonthGrid>;
  ws: number; we: number;
  tasks: CalTask[];
  items: DayItem[];
  money: MoneyMode;
  projColor: string;
  todaySerial: number;
  showFestivos: boolean;
  holidaySerials: Set<number>;
  locale: 'es' | 'en';
  onTaskOpen?: (taskId: string) => void;
  onMore: (day: number, items: DayItem[], tasksOfDay: CalTask[]) => void;
  canReschedule?: boolean;
  /** soltar una barra movida `deltaDays` columnas → abre confirmación CPM. */
  onDragReschedule?: (taskId: string, deltaDays: number, anchor: DOMRect) => void;
  /** tarea con reprogramación pendiente de confirmar: se queda como fantasma
   *  en la posición destino (no vuelve al origen hasta confirmar/cancelar). */
  pendingGhost?: { uid: string; days: number } | null;
}
function WeekRow({ grid, ws, we, tasks, items, money, projColor, todaySerial, showFestivos, holidaySerials, locale, onTaskOpen, onMore, canReschedule, onDragReschedule, pendingGhost }: WeekRowProps) {
  const lay = useMemo(() => layoutWeek(tasks, items, ws, we), [tasks, items, ws, we]);
  const deadlineDays = useMemo(() => new Set(items.filter((i) => i.type === 'deadline').map((i) => i.serial)), [items]);
  const minH = Math.max(WEEK_MIN_H, lay.laneCount * SLOT_H + 36);
  const rowRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ id: string; days: number } | null>(null);

  // Drag de una barra: arrastrar horizontalmente la mueve en pasos de 1 día
  // (ancho de columna = anchoFila/7). Al soltar, si se movió, dispara la
  // confirmación CPM. Si no se movió (click puro), abre el drawer.
  const onBarPointerDown = (e: React.PointerEvent, taskId: string) => {
    if (!canReschedule || !onDragReschedule) { onTaskOpen?.(taskId); return; }
    e.preventDefault();
    const row = rowRef.current;
    if (!row) return;
    const colW = row.getBoundingClientRect().width / 7;
    const startX = e.clientX;
    let lastDays = 0;
    const move = (ev: PointerEvent) => {
      const days = Math.round((ev.clientX - startX) / colW);
      lastDays = days;
      setDragOffset({ id: taskId, days });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragOffset(null);
      if (lastDays === 0) { onTaskOpen?.(taskId); return; }
      const anchor = new DOMRect(ev.clientX, ev.clientY, 0, 0);
      onDragReschedule(taskId, lastDays, anchor);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={rowRef} className="cal-week" style={{ minHeight: `${minH}px` }}>
      <WeekBg grid={grid} ws={ws} we={we} todaySerial={todaySerial} showFestivos={showFestivos} holidaySerials={holidaySerials} locale={locale} deadlineDays={deadlineDays} />
      <div className="cal-items">
        {lay.bars.map((b, i) => {
          // Offset visual: durante el drag activo, o mientras hay confirmación
          // pendiente para esta tarea (queda como fantasma en el destino).
          const dragDays = dragOffset?.id === b.t.uid ? dragOffset.days : null;
          const ghostDays = pendingGhost?.uid === b.t.uid ? pendingGhost.days : null;
          const off = dragDays ?? ghostDays ?? 0;
          const isGhost = dragDays == null && ghostDays != null;
          const shifted = off !== 0 ? { ...b, s: b.s + off, e: b.e + off } : b;
          return (
            <div
              key={`b${i}`}
              onPointerDown={(e) => onBarPointerDown(e, b.t.uid)}
              style={{ cursor: canReschedule ? 'grab' : (onTaskOpen ? 'pointer' : 'default'), display: 'contents', opacity: isGhost ? 0.6 : 1 }}
            >
              <CalBar bar={shifted} ws={ws} money={money} projColor={projColor} slotH={SLOT_H} />
            </div>
          );
        })}
        {lay.chips.map((c, i) => (
          <CalChip key={`c${i}`} chip={c} ws={ws} slotH={SLOT_H} />
        ))}
        {lay.more.map((m, i) => (
          <CalMoreChip
            key={`m${i}`}
            more={m}
            ws={ws}
            slotH={SLOT_H}
            onClick={() => onMore(
              m.day,
              m.items,
              tasks.filter((t) => t.startSerial <= m.day && t.endSerial >= m.day),
            )}
          />
        ))}
      </div>
    </div>
  );
}
