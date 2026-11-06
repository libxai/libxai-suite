/**
 * A20 (revisión de Yesid) · sobreasignación en el Gantt: las horas estimadas de cada tarea se reparten por igual entre sus días
 * hábiles y entre sus responsables. Si en algún día una persona pasa de su jornada, sus tareas de ese día salen en ámbar.
 *
 * Es la lectura de un vistazo: el cálculo fino por persona, con ausencias y reservas, es el de Recursos.
 */
import type { Task } from './types';
import { habilesEntre, sumarHabiles, type Calendario } from './motorDeProgramacion';

const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** El Timeline recibe la lista ya aplanada, con las hijas también sueltas: cada tarea cuenta una vez. */
function hojas(lista: Task[], fuera = new Map<string, Task>()): Task[] {
  for (const t of lista) {
    if (t.subtasks?.length) hojas(t.subtasks, fuera);
    else fuera.set(t.id, t);
  }
  return [...fuera.values()];
}

export function tareasSobreasignadas(tareas: Task[], cal: Calendario, minutosPorDia: number): Set<string> {
  /* persona → día → minutos y las tareas de ese día */
  const carga = new Map<string, Map<string, { minutos: number; tareas: string[] }>>();
  for (const t of hojas(tareas)) {
    if (!t.startDate || !t.endDate || !t.effortMinutes || !t.assignees?.length || t.status === 'completed' || t.progress >= 100) continue;
    const inicio = new Date(t.startDate);
    const dias = habilesEntre(inicio, new Date(t.endDate), cal);
    const porDia = t.effortMinutes / dias / t.assignees.length;
    for (const a of t.assignees) {
      const quien = (a as unknown as { id?: string }).id ?? a.name;
      let suya = carga.get(quien);
      if (!suya) { suya = new Map(); carga.set(quien, suya); }
      for (let i = 0; i < dias; i++) {
        const k = clave(sumarHabiles(inicio, i, cal));
        const dia = suya.get(k);
        if (dia) { dia.minutos += porDia; dia.tareas.push(t.id); } else suya.set(k, { minutos: porDia, tareas: [t.id] });
      }
    }
  }
  const fuera = new Set<string>();
  for (const dias of carga.values()) {
    for (const d of dias.values()) if (d.minutos > minutosPorDia + 0.5) d.tareas.forEach((id) => fuera.add(id));
  }
  return fuera;
}

/** «AR», «AR +1»: el responsable en la etiqueta de la barra. */
export function inicialesDeLaBarra(t: Pick<Task, 'assignees'>): string {
  const [primero, ...resto] = t.assignees ?? [];
  if (!primero) return '';
  return resto.length ? `${primero.initials} +${resto.length}` : primero.initials;
}
