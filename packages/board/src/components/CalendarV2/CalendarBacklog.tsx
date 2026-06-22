/**
 * Calendario (Asakaa Pulse) — Backlog · Sin fecha (C8) + rail colapsado. Sprint 2.
 *
 * SOLO LECTURA: la lista y el rail funcionan, pero el drag-drop con commit a la
 * tarea real es Sprint 3 (aquí solo el click abre el drawer). No inventa datos:
 * el backlog son las tareas REALES del proyecto que no tienen fecha de inicio o
 * de fin asignada (las "sin fecha"). Si no hay ninguna, estado vacío sutil.
 *
 * Usa las clases .cal-side / .cal-card / .cal-rail de calendar.css.
 */

import type React from 'react';
import type { Task as GanttTask } from '../Gantt/types';
import type { MoneyMode } from './CalendarParts';

/** Ficha de backlog ya proyectada (datos reales, no del modelo del diseño). */
export interface BacklogItem {
  /** UUID real de la tarea (para abrir el drawer). */
  taskId: string;
  /** ID visible legible (wbsCode/displayId); '' si solo hay UUID. */
  id: string;
  name: string;
  hrs: number;
  cost: string;
  /** iniciales del responsable, si hay. */
  who?: string;
  /** color del proyecto (CSS) para el punto. */
  projColor?: string;
}

/* ============================================================
   buildBacklog — tareas reales SIN fecha → fichas de backlog
   ============================================================ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_RE.test(s) || /^task-\d+/.test(s);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** "$1.9k" / "$475" — formato compacto coherente con el resto del calendario. */
function fmtCost(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(amount)}`;
}

function flatten(tasks: GanttTask[]): GanttTask[] {
  const out: GanttTask[] = [];
  const walk = (list: GanttTask[]) => {
    for (const t of list) {
      out.push(t);
      if (t.subtasks?.length) walk(t.subtasks);
    }
  };
  walk(tasks);
  return out;
}

/**
 * Filtra las tareas que NO tienen fecha de inicio o de fin (backlog "sin fecha")
 * y las mapea a fichas. Aplana subtareas. No inventa nada: si la tarea tiene
 * ambas fechas, no es backlog y se omite.
 */
export function buildBacklog(tasks: GanttTask[], hourlyRate: number): BacklogItem[] {
  const flat = flatten(tasks);
  const items: BacklogItem[] = [];
  for (const t of flat) {
    if (t.startDate && t.endDate) continue; // tiene fecha → no es backlog

    const mins = (t as { effortMinutes?: number | null }).effortMinutes ?? 0;
    const hrs = Math.round((mins / 60) * 10) / 10;
    const explicitCost = (t as { costAtCompletion?: number | null }).costAtCompletion;
    const cost = explicitCost != null ? fmtCost(explicitCost) : fmtCost(hrs * hourlyRate);
    const assignee = t.assignees?.[0];
    const who = assignee?.initials || (assignee?.name ? initials(assignee.name) : undefined);

    const shortId =
      (t as { displayId?: string }).displayId || (t as { wbsCode?: string }).wbsCode || '';
    const visibleId = isUuid(shortId || t.id) ? '' : shortId || t.id;

    items.push({
      taskId: t.id,
      id: visibleId,
      name: t.name,
      hrs,
      cost,
      who,
      projColor: (t as { color?: string }).color,
    });
  }
  return items;
}

/* ============================================================
   CalBacklogPanel — panel lateral derecho (C8), solo lectura
   ============================================================ */

export interface CalBacklogPanelProps {
  items: BacklogItem[];
  /** abre el drawer de la tarea (taskId real). */
  onItemClick: (taskId: string) => void;
  /** colapsa el panel → rail. */
  onCollapse: () => void;
  money: MoneyMode;
  /** color por defecto del proyecto (vista de un solo proyecto). */
  projColor?: string;
}

export function CalBacklogPanel({
  items,
  onItemClick,
  onCollapse,
  money,
  projColor,
}: CalBacklogPanelProps): React.ReactElement {
  return (
    <div className="cal-side">
      <div className="cal-side-head">
        <span className="t">⚡ Backlog · Sin fecha</span>
        <button type="button" className="cal-pcollapse" onClick={onCollapse} title="Colapsar panel">
          ⟩
        </button>
      </div>
      <div className="cal-side-sec">
        <span>Arrastra al calendario</span>
        <span>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.08em',
            color: 'var(--subtle)',
            textAlign: 'center',
          }}
        >
          Sin tareas en backlog
        </div>
      ) : (
        items.map((b) => {
          const val = money === '$' ? b.cost : `${b.hrs}h`;
          return (
            <div
              key={b.taskId}
              className="cal-card"
              role="button"
              tabIndex={0}
              onClick={() => onItemClick(b.taskId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onItemClick(b.taskId);
                }
              }}
            >
              <div className="row1">
                {b.id ? <span className="tk">{b.id}</span> : null}
                <span className="pdot" style={{ background: b.projColor || projColor }} />
              </div>
              <div className="nom">{b.name}</div>
              <div className="meta">
                <span>
                  <b>{b.hrs}h</b> est
                </span>
                <span>{val}</span>
                {b.who ? <span className="cal-ava">{b.who}</span> : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ============================================================
   CalPulseRail — rail colapsado (42px) con texto vertical
   ============================================================ */

export interface CalPulseRailProps {
  /** expande el rail → panel. */
  onExpand: () => void;
}

export function CalPulseRail({ onExpand }: CalPulseRailProps): React.ReactElement {
  return (
    <div
      className="cal-rail"
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      title="Expandir backlog"
    >
      <span className="pc">⟨</span>
      <span className="dot" />
      <span className="vtxt">Backlog · Estado</span>
    </div>
  );
}
