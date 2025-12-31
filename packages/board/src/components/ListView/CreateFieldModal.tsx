/**
 * CreateFieldModal - Modal for creating custom fields
 * @version 0.18.0
 */

import { useState, useEffect } from 'react';
import { X, Type, Hash, Calendar, ChevronDown, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../utils';
import type { CustomFieldDefinition } from './types';

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: Omit<CustomFieldDefinition, 'id' | 'projectId'>) => void;
  isDark: boolean;
  locale: string;
}

type FieldType = CustomFieldDefinition['type'];

const FIELD_TYPES: Array<{ type: FieldType; icon: React.ReactNode }> = [
  { type: 'text', icon: <Type className="w-5 h-5" /> },
  { type: 'number', icon: <Hash className="w-5 h-5" /> },
  { type: 'date', icon: <Calendar className="w-5 h-5" /> },
  { type: 'dropdown', icon: <ChevronDown className="w-5 h-5" /> },
  { type: 'checkbox', icon: <CheckSquare className="w-5 h-5" /> },
];

export function CreateFieldModal({
  isOpen,
  onClose,
  onSave,
  isDark,
  locale,
}: CreateFieldModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState<string[]>(['']);
  const t = locale === 'es' ? translations.es : translations.en;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('text');
      setOptions(['']);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!name.trim()) return;

    const field: Omit<CustomFieldDefinition, 'id' | 'projectId'> = {
      name: name.trim(),
      type,
    };

    if (type === 'dropdown') {
      field.options = options.filter((opt) => opt.trim());
    }

    onSave(field);
    onClose();
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-xl shadow-2xl border',
          isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-gray-200'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <h2 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
            {t.title}
          </h2>
          <button
            onClick={onClose}
            className={cn('p-1 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
          >
            <X className={cn('w-5 h-5', isDark ? 'text-[#9CA3AF]' : 'text-gray-400')} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Field Name */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
              {t.fieldName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.fieldNamePlaceholder}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-[#3B82F6]/30',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-[#6B7280]'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
              )}
              autoFocus
            />
          </div>

          {/* Field Type */}
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
              {t.fieldType}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => setType(ft.type)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                    type === ft.type
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                      : isDark
                        ? 'border-white/10 hover:border-white/20'
                        : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className={type === ft.type ? 'text-[#3B82F6]' : isDark ? 'text-[#9CA3AF]' : 'text-gray-400'}>
                    {ft.icon}
                  </span>
                  <span className={cn(
                    'text-xs',
                    type === ft.type
                      ? 'text-[#3B82F6]'
                      : isDark ? 'text-[#9CA3AF]' : 'text-gray-500'
                  )}>
                    {t.types[ft.type]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown Options */}
          {type === 'dropdown' && (
            <div>
              <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                {t.options}
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`${t.option} ${index + 1}`}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-[#3B82F6]/30',
                        isDark
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-[#6B7280]'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
                      )}
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => removeOption(index)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          isDark ? 'hover:bg-white/10 text-[#9CA3AF]' : 'hover:bg-gray-100 text-gray-400'
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                    isDark
                      ? 'text-[#3B82F6] hover:bg-white/10'
                      : 'text-blue-600 hover:bg-gray-100'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  {t.addOption}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-end gap-3 px-6 py-4 border-t',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isDark
                ? 'text-[#9CA3AF] hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-[#3B82F6] text-white hover:bg-[#2563EB]',
              !name.trim() && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t.create}
          </button>
        </div>
      </div>
    </div>
  );
}

// Translations
const translations = {
  en: {
    title: 'Create Custom Field',
    fieldName: 'Field Name',
    fieldNamePlaceholder: 'Enter field name...',
    fieldType: 'Field Type',
    options: 'Options',
    option: 'Option',
    addOption: 'Add option',
    cancel: 'Cancel',
    create: 'Create Field',
    types: {
      text: 'Text',
      number: 'Number',
      date: 'Date',
      dropdown: 'Dropdown',
      checkbox: 'Checkbox',
    },
  },
  es: {
    title: 'Crear Campo Personalizado',
    fieldName: 'Nombre del Campo',
    fieldNamePlaceholder: 'Ingresa el nombre...',
    fieldType: 'Tipo de Campo',
    options: 'Opciones',
    option: 'Opción',
    addOption: 'Agregar opción',
    cancel: 'Cancelar',
    create: 'Crear Campo',
    types: {
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      dropdown: 'Lista',
      checkbox: 'Casilla',
    },
  },
};
