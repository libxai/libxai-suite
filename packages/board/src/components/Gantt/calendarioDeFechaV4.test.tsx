// Yesid (19-nov): «la v4 pide uno solo». El calendario de Start/End del Gantt pinta el marcado del selector de la v4.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarioDeFechaV4, inicialesDeLaSemana, rejillaDelMes } from './CalendarioDeFechaV4';

afterEach(cleanup);

describe('el calendario de fecha del Gantt (v4)', () => {
  it('la semana empieza en lunes, con las iniciales de la v4 en los dos idiomas', () => {
    /* noviembre de 2026 empieza en domingo: seis huecos delante, y el 1 cae en la columna del domingo */
    const nov = rejillaDelMes(2026, 10);
    expect(nov.findIndex((x) => x !== null)).toBe(6);
    expect(nov[6]).toBe('2026-11-01');
    expect(nov.filter(Boolean)).toHaveLength(30);
    expect(inicialesDeLaSemana(true).join('')).toBe('LMMJVSD');
    expect(inicialesDeLaSemana(false).join('')).toBe('MTWTFSS');
  });

  it('en inglés: mes, días y «Clear the date» en inglés; nada de «Hoy» ni «Próxima semana»', () => {
    render(<CalendarioDeFechaV4 valor={new Date(2026, 10, 10)} es={false} hoy="2026-11-12" alElegir={() => {}} alBorrar={() => {}} alCerrar={() => {}} />);
    const texto = document.body.textContent ?? '';
    expect(texto).toMatch(/November 2026/);
    expect(texto).toMatch(/Clear the date/);
    expect(texto).not.toMatch(/Hoy|Próxima semana|Borrar|noviembre/);
    expect(document.querySelector('.v4-fecha-rejilla')).toBeTruthy();
    expect(document.querySelector('[data-iso="2026-11-10"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-iso="2026-11-12"]')?.getAttribute('aria-current')).toBe('date');
    expect(document.querySelector('[data-iso="2026-11-14"]')?.hasAttribute('data-finde')).toBe(true);
  });

  it('elegir da el día local (sin correr por UTC); quitar y Escape avisan', () => {
    const alElegir = vi.fn(); const alBorrar = vi.fn(); const alCerrar = vi.fn();
    render(<CalendarioDeFechaV4 valor={null} es hoy="2026-11-12" alElegir={alElegir} alBorrar={alBorrar} alCerrar={alCerrar} />);
    fireEvent.click(document.querySelector('[data-iso="2026-11-20"]')!);
    const d = alElegir.mock.calls[0][0] as Date;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 20]);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la fecha' }));
    expect(alBorrar).toHaveBeenCalled();
    fireEvent.keyDown(document.querySelector('[data-iso="2026-11-12"]')!, { key: 'Escape' });
    expect(alCerrar).toHaveBeenCalled();
  });

  it('el teclado: → un día, ↓ una semana y cambia de mes solo', () => {
    render(<CalendarioDeFechaV4 valor={new Date(2026, 10, 30)} es hoy="2026-11-12" alElegir={() => {}} alCerrar={() => {}} />);
    act(() => { fireEvent.keyDown(document.querySelector('[data-iso="2026-11-30"]')!, { key: 'ArrowDown' }); });
    expect(document.querySelector('[data-iso="2026-12-07"]')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Diciembre 2026/);
    expect(document.querySelector('[data-iso="2026-12-07"]')?.getAttribute('tabindex')).toBe('0');
  });

  it('sin fecha, no ofrece «Quitar la fecha»', () => {
    render(<CalendarioDeFechaV4 valor={null} es alElegir={() => {}} alCerrar={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Quitar la fecha' })).toBeNull();
  });
});
