/**
 * ColorPicker Component - v0.11.0
 * Professional color selector for tasks with pastel palette
 */

import { motion } from 'framer-motion';
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
      <div className="flex flex-wrap gap-2">
        {TASK_COLORS.map((color) => {
          const isSelected = value === color.value;

          return (
            <motion.button
              key={color.value}
              type="button"
              onClick={() => !disabled && onChange(color.value)}
              className="relative rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: color.value,
                boxShadow: isSelected
                  ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${color.value}`
                  : '0 1px 3px rgba(0, 0, 0, 0.12)',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              whileHover={disabled ? {} : { scale: 1.1 }}
              whileTap={disabled ? {} : { scale: 0.95 }}
              title={color.name}
              disabled={disabled}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
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
