/**
 * ColorPicker Component - v0.17.187
 * Professional color selector for tasks with pastel palette
 * Fixed: All colors now clickable with pointerEvents none on inner circle
 */

import { Check } from 'lucide-react';
import { useGanttEnEspanol } from './GanttI18nContext';

export interface TaskColor {
  name: string;
  /** QA Asakaa E19 (17-nov): el nombre en inglés */
  nameEn: string;
  value: string;
  light: string;
}

/** E19 · el nombre del color en el idioma de la pantalla */
export const nombreDelColorDeTarea = (c: TaskColor, es: boolean): string => (es ? c.name : c.nameEn);

// v0.17.112: Professional vibrant color palette - all colors are eye-catching
export const TASK_COLORS: TaskColor[] = [
  { name: 'Azul', nameEn: 'Blue', value: '#00E5CC', light: '#5AADFF' },
  { name: 'Púrpura', nameEn: 'Purple', value: '#A855F7', light: '#C084FC' },
  { name: 'Rosa', nameEn: 'Pink', value: '#EC4899', light: '#F472B6' },
  { name: 'Rojo', nameEn: 'Red', value: '#EF4444', light: '#F87171' },
  { name: 'Naranja', nameEn: 'Orange', value: '#F59E0B', light: '#FBBF24' },
  { name: 'Amarillo', nameEn: 'Yellow', value: '#EAB308', light: '#FACC15' },
  { name: 'Lima', nameEn: 'Lime', value: '#84CC16', light: '#A3E635' },
  { name: 'Verde', nameEn: 'Green', value: '#10B981', light: '#34D399' },
  { name: 'Esmeralda', nameEn: 'Emerald', value: '#059669', light: '#10B981' },
  { name: 'Cyan', nameEn: 'Cyan', value: '#06B6D4', light: '#22D3EE' }, // QA Asakaa E19: antes repetía #00E5CC (el de «Azul»)
  { name: 'Azul Cielo', nameEn: 'Sky blue', value: '#0EA5E9', light: '#38BDF8' },
  { name: 'Índigo', nameEn: 'Indigo', value: '#4F46E5', light: '#6366F1' },
  { name: 'Violeta', nameEn: 'Violet', value: '#8B5CF6', light: '#A78BFA' },
  { name: 'Fucsia', nameEn: 'Fuchsia', value: '#D946EF', light: '#E879F9' },
  { name: 'Coral', nameEn: 'Coral', value: '#F97316', light: '#FB923C' },
  { name: 'Magenta', nameEn: 'Magenta', value: '#E11D48', light: '#FB7185' },
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value = '#00E5CC', onChange, disabled = false }: ColorPickerProps) {
  const es = useGanttEnEspanol(); // QA Asakaa E19
  return (
    <div className="space-y-2">
      {/* v0.17.187: Grid with larger click area (28px) and small visual circle (16px) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 28px)', gap: '2px' }}>
        {TASK_COLORS.map((color) => {
          const isSelected = value === color.value;

          return (
            <button
              key={color.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) onChange(color.value);
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: disabled ? 0.5 : 1,
              }}
              title={nombreDelColorDeTarea(color, es)}
              disabled={disabled}
            >
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: color.value,
                  outline: isSelected ? `2px solid ${color.value}` : 'none',
                  outlineOffset: '2px',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white drop-shadow-md" strokeWidth={3} style={{ pointerEvents: 'none' }} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Color name label */}
      {value && (
        <div className="text-xs text-center font-medium" style={{ color: value }}>
          {(() => { const c = TASK_COLORS.find(x => x.value === value); return c ? nombreDelColorDeTarea(c, es) : (es ? 'Personalizado' : 'Custom'); })()}
        </div>
      )}
    </div>
  );
}
