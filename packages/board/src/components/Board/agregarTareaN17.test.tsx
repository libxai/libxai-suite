/**
 * QA Latty R3 · N-17 / N-11 (Respuesta_Divar_R3 §2.5) · «+ Agregar tarea» dentro de la columna; el formulario en línea
 * ocupa su lugar y, al guardar, sigue abierto y vacío para crear varias seguidas (se cierra con Escape); la columna vacía
 * dice «Sin tareas» y la zona punteada sólo aparece al arrastrar.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { AddCardButton } from './AddCardButton';
import { Column } from '../Column/Column';

afterEach(() => cleanup());

const columna = { id: 'todo', title: 'Por hacer', position: 1, cardIds: [] } as never;

describe('N-17 · la columna', () => {
  it('vacía y en reposo: «Sin tareas», sin zona punteada; el pie, dentro de la columna', () => {
    const { container } = render(<DndContext><Column column={columna} cards={[]} locale="es" footer={<span data-pie="">pie</span>} /></DndContext>);
    expect(container.querySelector('.asakaa-column-vacia')?.textContent).toBe('Sin tareas');
    expect(container.querySelector('.asakaa-drop-zone')).toBeNull();
    expect(container.querySelector('.asakaa-column .asakaa-column-footer [data-pie]')).not.toBeNull();
  });
  it('mientras se arrastra: la zona punteada «Suelta aquí las tarjetas»', () => {
    const { container } = render(<DndContext><Column column={columna} cards={[]} locale="es" arrastrando /></DndContext>);
    expect(container.querySelector('.asakaa-drop-zone')?.textContent).toContain('Suelta aquí las tarjetas');
    expect(container.querySelector('.asakaa-column-vacia')).toBeNull();
  });
});

describe('N-17 / N-11 · «Agregar tarea»', () => {
  it('el formulario ocupa el lugar del botón; al guardar sigue abierto y vacío; Escape lo cierra', () => {
    const onAddCard = vi.fn();
    const { container } = render(<AddCardButton columnId="todo" onAddCard={onAddCard} theme="light" locale="es" />);
    const boton = container.querySelector<HTMLButtonElement>('.asakaa-add-card__button')!;
    expect(boton.textContent).toContain('Agregar tarea');
    fireEvent.click(boton);
    /* en línea, dentro del mismo contenedor (no en un portal del body) y sin el botón */
    const input = container.querySelector<HTMLInputElement>('.asakaa-add-card input[type="text"]')!;
    expect(input).not.toBeNull();
    expect(container.querySelector('.asakaa-add-card__button')).toBeNull();
    fireEvent.change(input, { target: { value: 'Primera' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddCard).toHaveBeenCalledWith(expect.objectContaining({ name: 'Primera', columnId: 'todo' }));
    const sigue = container.querySelector<HTMLInputElement>('.asakaa-add-card input[type="text"]')!;
    expect(sigue).not.toBeNull();
    expect(sigue.value).toBe('');
    fireEvent.keyDown(sigue, { key: 'Escape' });
    expect(container.querySelector('.asakaa-add-card__button')).not.toBeNull();
  });
});
