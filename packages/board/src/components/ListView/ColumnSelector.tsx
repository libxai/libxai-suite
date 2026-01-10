/**
 * ColumnSelector - Panel for adding/removing columns in ListView
 * @version 0.18.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Type,
  Hash,
  Calendar,
  ChevronDown,
  CheckSquare,
  CircleDot,
  Flag,
  Users,
  CalendarCheck,
  BarChart,
  Tag,
  Clock,
  Timer,
} from 'lucide-react';
import { cn } from '../../utils';
import type { TableColumn, CustomFieldDefinition, ColumnType } from './types';

interface ColumnSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TableColumn[];
  customFields?: CustomFieldDefinition[];
  onColumnsChange: (columns: TableColumn[]) => void;
  /** Callback to open create custom field modal */
  onCreateCustomField?: () => void;
  isDark: boolean;
  locale: string;
}

// Icon mapping for column types
const COLUMN_ICONS: Record<ColumnType, React.ReactNode> = {
  name: <Type className="w-4 h-4" />,
  status: <CircleDot className="w-4 h-4" />,
  priority: <Flag className="w-4 h-4" />,
  assignees: <Users className="w-4 h-4" />,
  startDate: <Calendar className="w-4 h-4" />,
  endDate: <CalendarCheck className="w-4 h-4" />,
  progress: <BarChart className="w-4 h-4" />,
  tags: <Tag className="w-4 h-4" />,
  // v0.18.3: Time tracking columns
  estimatedTime: <Clock className="w-4 h-4" />,
  elapsedTime: <Timer className="w-4 h-4" />,
  // Custom field types
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  dropdown: <ChevronDown className="w-4 h-4" />,
  checkbox: <CheckSquare className="w-4 h-4" />,
};

// Standard fields that are always available
const STANDARD_COLUMNS: ColumnType[] = ['name', 'status', 'priority', 'assignees', 'startDate', 'endDate', 'progress', 'tags', 'estimatedTime', 'elapsedTime'];

export function ColumnSelector({
  isOpen,
  onClose,
  columns,
  customFields = [],
  onColumnsChange,
  onCreateCustomField,
  isDark,
  locale,
}: ColumnSelectorProps) {
  const [search, setSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const t = locale === 'es' ? translations.es : translations.en;

  // Close on click outside (with delay to prevent immediate close)
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to prevent immediate close from the same click that opened it
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          onClose();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      // Store cleanup in ref for effect cleanup
      (panelRef as any)._cleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if ((panelRef as any)._cleanup) {
        (panelRef as any)._cleanup();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getColumnLabel = (type: ColumnType): string => {
    return t.columns[type] || type;
  };

  const toggleColumnVisibility = (columnId: string) => {
    // Don't allow hiding the name column
    if (columnId === 'name') return;

    const newColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(newColumns);
  };

  const addColumn = (type: ColumnType, customFieldId?: string) => {
    // Check if column already exists
    const existingColumn = columns.find(
      (col) => col.type === type && (!customFieldId || col.customFieldId === customFieldId)
    );

    if (existingColumn) {
      // Just make it visible
      toggleColumnVisibility(existingColumn.id);
      return;
    }

    // Create new column
    const newColumn: TableColumn = {
      id: customFieldId || type,
      type,
      label: customFieldId
        ? customFields.find((f) => f.id === customFieldId)?.name || type
        : getColumnLabel(type),
      width: 120,
      visible: true,
      sortable: true,
      resizable: true,
      customFieldId,
    };

    onColumnsChange([...columns, newColumn]);
  };

  // Filter columns by search
  const filteredStandardColumns = STANDARD_COLUMNS.filter((type) =>
    getColumnLabel(type).toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomFields = customFields.filter((field) =>
    field.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute right-0 top-full mt-1 w-72 rounded-lg shadow-xl border z-50',
        isDark ? 'bg-[#0F1117] border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        isDark ? 'border-white/10' : 'border-gray-200'
      )}>
        <h3 className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
          {t.title}
        </h3>
        <button
          onClick={onClose}
          className={cn('p-1 rounded', isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100')}
        >
          <X className={cn('w-4 h-4', isDark ? 'text-[#9CA3AF]' : 'text-gray-400')} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            isDark ? 'text-[#6B7280]' : 'text-gray-400'
          )} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={cn(
              'w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none',
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder:text-[#6B7280]'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'
            )}
          />
        </div>
      </div>

      {/* Standard Fields */}
      <div className="px-3 pb-2">
        <h4 className={cn('text-xs font-medium uppercase tracking-wider mb-2', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
          {t.standardFields}
        </h4>
        <div className="space-y-1">
          {filteredStandardColumns.map((type) => {
            const column = columns.find((c) => c.type === type && !c.customFieldId);
            const isVisible = column?.visible ?? false;
            const isName = type === 'name';

            return (
              <button
                key={type}
                onClick={() => {
                  if (isName) return;
                  // If column exists, toggle visibility. If not, add it.
                  if (column) {
                    toggleColumnVisibility(column.id);
                  } else {
                    addColumn(type);
                  }
                }}
                disabled={isName}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                  isName && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center',
                  isVisible
                    ? 'bg-[#3B82F6] border-[#3B82F6]'
                    : isDark ? 'border-[#4B5563]' : 'border-gray-300'
                )}>
                  {isVisible && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-400'}>
                  {COLUMN_ICONS[type]}
                </span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  {getColumnLabel(type)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Fields */}
      {filteredCustomFields.length > 0 && (
        <div className="px-3 pb-2">
          <h4 className={cn('text-xs font-medium uppercase tracking-wider mb-2', isDark ? 'text-[#6B7280]' : 'text-gray-400')}>
            {t.customFields}
          </h4>
          <div className="space-y-1">
            {filteredCustomFields.map((field) => {
              const column = columns.find((c) => c.customFieldId === field.id);
              const isVisible = column?.visible ?? false;

              return (
                <button
                  key={field.id}
                  onClick={() => addColumn(field.type as ColumnType, field.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    isVisible
                      ? 'bg-[#3B82F6] border-[#3B82F6]'
                      : isDark ? 'border-[#4B5563]' : 'border-gray-300'
                  )}>
                    {isVisible && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={isDark ? 'text-[#9CA3AF]' : 'text-gray-400'}>
                    {COLUMN_ICONS[field.type as ColumnType] || <Type className="w-4 h-4" />}
                  </span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {field.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Custom Field Button */}
      {onCreateCustomField && (
        <div className={cn('p-3 border-t', isDark ? 'border-white/10' : 'border-gray-200')}>
          <button
            onClick={onCreateCustomField}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'bg-[#3B82F6]/20 text-[#3B82F6] hover:bg-[#3B82F6]/30'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            )}
          >
            <Plus className="w-4 h-4" />
            {t.createField}
          </button>
        </div>
      )}
    </div>
  );
}

// Translations
const translations = {
  en: {
    title: 'Columns',
    searchPlaceholder: 'Search fields...',
    standardFields: 'Standard Fields',
    customFields: 'Custom Fields',
    createField: 'Create custom field',
    columns: {
      name: 'Name',
      status: 'Status',
      priority: 'Priority',
      assignees: 'Assignees',
      startDate: 'Start Date',
      endDate: 'End Date',
      progress: 'Progress',
      tags: 'Tags',
      estimatedTime: 'Estimated',
      elapsedTime: 'Time Spent',
      text: 'Text',
      number: 'Number',
      date: 'Date',
      dropdown: 'Dropdown',
      checkbox: 'Checkbox',
    } as Record<ColumnType, string>,
  },
  es: {
    title: 'Columnas',
    searchPlaceholder: 'Buscar campos...',
    standardFields: 'Campos Estándar',
    customFields: 'Campos Personalizados',
    createField: 'Crear campo personalizado',
    columns: {
      name: 'Nombre',
      status: 'Estado',
      priority: 'Prioridad',
      assignees: 'Asignados',
      startDate: 'Fecha Inicio',
      endDate: 'Fecha Fin',
      progress: 'Progreso',
      tags: 'Etiquetas',
      estimatedTime: 'Estimado',
      elapsedTime: 'Tiempo',
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      dropdown: 'Lista',
      checkbox: 'Casilla',
    } as Record<ColumnType, string>,
  },
};
