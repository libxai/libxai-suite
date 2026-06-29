/**
 * CalendarV2 — el calendario "proyección operativa CPM" (Asakaa Pulse).
 * Componente presentacional: el consumidor inyecta tareas, capacidad (members),
 * festivos y los callbacks de drawer/reprogramación. La librería no toca Supabase.
 */
export { CalendarView } from './CalendarView';
export { simulateReschedule } from './calendarReschedule';
export type { RescheduleSimulation } from './calendarReschedule';
export type { TeamMember, DailyLog } from './CalendarCapacity';
export type { CalView, CalMoney, CalLayerId } from './CalendarChrome';
export type { MoneyMode } from './CalendarParts';
export { buildCalendar } from './calendarData';
