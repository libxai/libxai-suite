/**
 * David (Axon), 13-nov: en la Lista, la fecha de una SUBTAREA no se deja
 * elegir; la de una tarea padre sí.
 *
 * Causa: en las filas sin hijas (las únicas con «arrastrar para rellenar»), la
 * celda se envolvía en otro elemento SOLO mientras el ratón estaba encima de la
 * fila. El calendario se pinta fuera de la tabla (portal a body): al llevar el
 * ratón hasta él, la fila pierde el hover, la celda cambia de envoltorio, React
 * desmonta el selector y el calendario se cierra antes del clic. Las filas
 * padre no tienen tirador de relleno, por eso a ellas no les pasaba.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListView } from './ListView';
import type { Task } from '../../types';

const hoja: Task = {
  id: 't-hoja',
  name: 'Descargue e instalación gabinetes',
  startDate: new Date(2026, 5, 30),
  endDate: new Date(2026, 6, 1),
  progress: 0,
  status: 'todo',
} as unknown as Task;

function montar() {
  const onTaskUpdate = vi.fn();
  render(
    <ListView
      tasks={[hoja]}
      config={{ locale: 'es' } as never}
      callbacks={{ onTaskUpdate, onBulkFill: vi.fn() } as never}
    />,
  );
  return { onTaskUpdate };
}

/** Celda de la fila: el primer botón de fecha que muestra «30 jun». */
function abrirInicio() {
  const fila = screen.getByText(hoja.name).closest('[data-seleccionada], .group, div[style]') as HTMLElement;
  fireEvent.mouseEnter(fila);
  const disparador = screen.getAllByRole('button').find((b) => /30 jun/i.test(b.textContent ?? ''));
  if (!disparador) throw new Error('no encontré la celda de fecha de inicio');
  fireEvent.click(disparador);
  return fila;
}

describe('Lista · fecha de una fila con «arrastrar para rellenar»', () => {
  it('el calendario sigue abierto cuando el ratón sale de la fila hacia él', () => {
    montar();
    const fila = abrirInicio();
    expect(screen.getByText(/junio de 2026/i)).toBeTruthy();

    fireEvent.mouseLeave(fila);

    expect(screen.queryByText(/junio de 2026/i)).not.toBeNull();
  });

  it('elegir un día con el ratón ya fuera de la fila guarda la fecha', () => {
    const { onTaskUpdate } = montar();
    const fila = abrirInicio();
    fireEvent.mouseLeave(fila);

    const dia = screen.getAllByRole('button').find((b) => b.textContent?.trim() === '15');
    if (!dia) throw new Error('no encontré el día 15');
    fireEvent.click(dia);

    expect(onTaskUpdate).toHaveBeenCalled();
    const actualizada = onTaskUpdate.mock.calls.at(-1)?.[0] as Task;
    expect(new Date(actualizada.startDate as Date).getDate()).toBe(15);
  });
});
