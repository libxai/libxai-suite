/**
 * Vista Agenda (Calendario, Sprint 3) — lista cronológica de lo que toca
 * ejecutar, agrupada por día. Solo lectura. Complementa Mes/Semana/Lookahead
 * con una lectura lineal (útil cuando hay muchas tareas o pantallas angostas).
 */
import { useMemo } from 'react';
import type { CalTask, DayItem, MonthGrid } from './calendarLayout';
import type { MoneyMode } from './CalendarParts';

const CHIP_ICON: Record<string, string> = { hito: '◆', desembolso: '◆', deadline: '⚑', ext: '○', aus: '⊘' };

interface AgendaRow {
  serial: number;
  date: Date;
  tasks: CalTask[];
  items: DayItem[];
}

interface Props {
  grid: MonthGrid;
  tasks: CalTask[];
  items: DayItem[];
  money: MoneyMode;
  projColor: string;
  todaySerial: number;
  locale: 'es' | 'en';
  onTaskOpen?: (taskId: string) => void;
}

export function CalendarAgenda({ grid, tasks, items, money, projColor, todaySerial, locale, onTaskOpen }: Props) {
  const es = locale === 'es';

  // Agrupa por día: una tarea aparece en el día en que ARRANCA (su startSerial),
  // dentro de la ventana visible del mes. Los items en su propio serial.
  const rows = useMemo<AgendaRow[]>(() => {
    const byDay = new Map<number, AgendaRow>();
    const ensure = (serial: number): AgendaRow => {
      if (!byDay.has(serial)) byDay.set(serial, { serial, date: grid.serialToDate(serial), tasks: [], items: [] });
      return byDay.get(serial)!;
    };
    for (const t of tasks) {
      if (t.startSerial >= 1 && t.startSerial <= 42) ensure(t.startSerial).tasks.push(t);
    }
    for (const it of items) {
      if (it.serial >= 1 && it.serial <= 42) ensure(it.serial).items.push(it);
    }
    return [...byDay.values()]
      .filter((r) => r.tasks.length || r.items.length)
      .sort((a, b) => a.serial - b.serial);
  }, [tasks, items, grid]);

  if (rows.length === 0) {
    return (
      <div className="cal-empty" style={{ position: 'static', padding: '60px 24px' }}>
        <div className="glyph">◇ ◇ ◇</div>
        <h3>{es ? 'Nada programado este mes' : 'Nothing scheduled this month'}</h3>
        <p>{es ? 'Cambia de mes con las flechas o crea tareas en el Gantt.' : 'Change month with the arrows or create tasks in the Gantt.'}</p>
      </div>
    );
  }

  const fmtDay = (d: Date) => d.toLocaleDateString(es ? 'es-CO' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    // maxHeight por viewport: garantiza el scroll aunque la cadena flex del
    // contenedor no propague una altura acotada (la topbar+toolbar+legend del
    // calendario ocupan ~150px; el resto es la zona scrolleable).
    <div className="cal-agenda" style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '8px 0', maxHeight: 'calc(100vh - 150px)' }}>
      {rows.map((r) => (
        <div key={r.serial} className="cal-agenda-day">
          <div className="cal-agenda-date" style={{
            fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: r.serial === todaySerial ? 'var(--cyan)' : 'var(--txt2)', padding: '12px 20px 6px',
          }}>
            {fmtDay(r.date)}{r.serial === todaySerial ? ` · ${es ? 'HOY' : 'TODAY'}` : ''}
          </div>
          {r.tasks.map((t) => (
            <button
              key={t.uid}
              type="button"
              onClick={() => onTaskOpen?.(t.uid)}
              className="cal-agenda-item"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                padding: '8px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--txt)', fontSize: '12.5px',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: projColor, flex: 'none' }} />
              {t.critical ? <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: '#031', background: 'var(--cyan)', borderRadius: 3, padding: '1.5px 3.5px', fontWeight: 700 }}>CPM</span> : null}
              {t.id ? <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--txt2)' }}>{t.id}</span> : null}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--txt2)' }}>{money === '$' ? t.cost : `${t.hrs}h`}</span>
            </button>
          ))}
          {r.items.map((it, i) => (
            <div
              key={`it${i}`}
              className="cal-agenda-item"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', fontSize: '12.5px', color: 'var(--txt2)' }}
            >
              <span style={{ width: 8, textAlign: 'center', flex: 'none' }}>{CHIP_ICON[it.type] ?? '·'}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
