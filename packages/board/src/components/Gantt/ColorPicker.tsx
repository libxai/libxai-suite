/**
 * ColorPicker Component - v0.17.187
 * Professional color selector for tasks with pastel palette
 * Fixed: All colors now clickable with pointerEvents none on inner circle
 */

import { Check } from 'lucide-react';

export interface TaskColor {
  name: string;
  value: string;
  light: string;
}

// v0.17.112: Professional vibrant color palette - all colors are eye-catching
export const TASK_COLORS: TaskColor[] = [
  { name: 'Azul', value: '#6366F1', light: '#818CF8' },
  { name: 'Púrpura', value: '#A855F7', light: '#C084FC' },
  { name: 'Rosa', value: '#EC4899', light: '#F472B6' },
  { name: 'Rojo', value: '#EF4444', light: '#F87171' },
  { name: 'Naranja', value: '#F59E0B', light: '#FBBF24' },
  { name: 'Amarillo', value: '#EAB308', light: '#FACC15' },
  { name: 'Lima', value: '#84CC16', light: '#A3E635' },
  { name: 'Verde', value: '#10B981', light: '#34D399' },
  { name: 'Esmeralda', value: '#059669', light: '#10B981' },
  { name: 'Cyan', value: '#06B6D4', light: '#22D3EE' },
  { name: 'Azul Cielo', value: '#0EA5E9', light: '#38BDF8' },
  { name: 'Índigo', value: '#4F46E5', light: '#6366F1' },
  { name: 'Violeta', value: '#8B5CF6', light: '#A78BFA' },
  { name: 'Fucsia', value: '#D946EF', light: '#E879F9' },
  { name: 'Coral', value: '#F97316', light: '#FB923C' },
  { name: 'Magenta', value: '#E11D48', light: '#FB7185' },
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value = '#6366F1', onChange, disabled = false }: ColorPickerProps) {
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
              title={color.name}
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
          {TASK_COLORS.find(c => c.value === value)?.name || 'Personalizado'}
        </div>
      )}
    </div>
  );
}
