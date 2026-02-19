/**
 * ColumnSelector - Chronos V2 glass panel for column visibility
 * @version 2.3.0
 */

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  X,
  Search,
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
  FileText,
  CalendarClock,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
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
  // v1.1.0: Quoted time column
  quotedTime: <FileText className="w-4 h-4" />,
  elapsedTime: <Timer className="w-4 h-4" />,
  // v1.2.0: Three-tier time tracking columns
  effortMinutes: <Clock className="w-4 h-4" />,
  timeLoggedMinutes: <Timer className="w-4 h-4" />,
  soldEffortMinutes: <FileText className="w-4 h-4" />,
  // v2.0.0: Chronos Interactive Time Manager columns
  scheduleVariance: <CalendarClock className="w-4 h-4" />,
  hoursBar: <BarChart3 className="w-4 h-4" />,
  teamLoad: <Users className="w-4 h-4" />,
  blockers: <AlertTriangle className="w-4 h-4" />,
  // Custom field types
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  dropdown: <ChevronDown className="w-4 h-4" />,
  checkbox: <CheckSquare className="w-4 h-4" />,
};

// Standard fields that are always available
const STANDARD_COLUMNS: ColumnType[] = ['name', 'status', 'priority', 'assignees', 'startDate', 'endDate', 'progress', 'tags', 'effortMinutes', 'timeLoggedMinutes', 'soldEffortMinutes'];

export function ColumnSelector({
  isOpen,
  onClose,
  columns,
  customFields = [],
  onColumnsChange,
  onCreateCustomField: _onCreateCustomField, // Disabled - custom fields feature not active
  isDark,
  locale,
}: ColumnSelectorProps) {
  const [search, setSearch] = useState('');
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const t = locale === 'es' ? translations.es : translations.en;

  // Calculate max height based on panel position in viewport
  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const updateMaxHeight = () => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Leave 20px padding from bottom of viewport
      const availableHeight = viewportHeight - rect.top - 20;
      // Minimum height of 300px, maximum of available space
      setMaxHeight(Math.max(300, availableHeight));
    };

    // Initial calculation after render
    requestAnimationFrame(updateMaxHeight);

    // Recalculate on resize
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, [isOpen]);

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

  // Chronos accent color
  const accent = isDark ? '#00E5FF' : '#3B82F6';

  return (
    <div
      ref={panelRef}
      style={{
        ...(maxHeight ? { maxHeight: `${maxHeight}px` } : {}),
        background: isDark ? '#111114' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.7)'
          : '0 8px 32px rgba(0,0,0,0.12)',
      }}
      className="absolute right-0 top-full mt-1 w-64 rounded-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {t.title.toUpperCase()}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
            e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              fontSize: 12,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)',
            }}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg outline-none placeholder:opacity-40 transition-colors focus:border-[var(--focus-border)]"
            ref={(el) => {
              if (el) el.style.setProperty('--focus-border', accent);
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
            }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto flex-1 min-h-0 overscroll-contain px-2 pb-2"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Standard Fields */}
        <div className="mb-1">
          <div
            className="px-1.5 py-1.5"
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {t.standardFields.toUpperCase()}
          </div>
          <div className="space-y-px">
            {filteredStandardColumns.map((type) => {
              const column = columns.find((c) => c.type === type && !c.customFieldId);
              const isVisible = column?.visible ?? false;
              const isName = type === 'name';

              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isName) return;
                    if (column) {
                      toggleColumnVisibility(column.id);
                    } else {
                      addColumn(type);
                    }
                  }}
                  disabled={isName}
                  className="w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md transition-colors"
                  style={{
                    opacity: isName ? 0.4 : 1,
                    cursor: isName ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isName) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Checkbox — Chronos style */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: isVisible ? accent : 'transparent',
                      border: isVisible ? `1.5px solid ${accent}` : `1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                      boxShadow: isVisible ? `0 0 6px ${accent}40` : 'none',
                    }}
                  >
                    {isVisible && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  {/* Icon */}
                  <span
                    className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
                    style={{ color: isVisible ? accent : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                  >
                    {COLUMN_ICONS[type]}
                  </span>
                  {/* Label */}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isVisible ? 500 : 400,
                      color: isVisible
                        ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)')
                        : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'),
                    }}
                  >
                    {getColumnLabel(type)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Fields */}
        {filteredCustomFields.length > 0 && (
          <div className="mt-1">
            <div
              className="px-1.5 py-1.5"
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                fontFamily: 'JetBrains Mono, monospace',
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                paddingTop: 8,
                marginTop: 4,
              }}
            >
              {t.customFields.toUpperCase()}
            </div>
            <div className="space-y-px">
              {filteredCustomFields.map((field) => {
                const column = columns.find((c) => c.customFieldId === field.id);
                const isVisible = column?.visible ?? false;

                return (
                  <button
                    key={field.id}
                    onClick={() => addColumn(field.type as ColumnType, field.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md transition-colors"
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: isVisible ? accent : 'transparent',
                        border: isVisible ? `1.5px solid ${accent}` : `1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                        boxShadow: isVisible ? `0 0 6px ${accent}40` : 'none',
                      }}
                    >
                      {isVisible && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span
                      className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5"
                      style={{ color: isVisible ? accent : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                    >
                      {COLUMN_ICONS[field.type as ColumnType] || <Type className="w-4 h-4" />}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isVisible ? 500 : 400,
                        color: isVisible
                          ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)')
                          : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'),
                      }}
                    >
                      {field.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
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
      quotedTime: 'Quoted',
      elapsedTime: 'Time Spent',
      // v1.2.0: Three-tier time tracking
      effortMinutes: 'Estimated',
      timeLoggedMinutes: 'Time Logged',
      soldEffortMinutes: 'Quoted',
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
      quotedTime: 'Ofertado',
      elapsedTime: 'Tiempo',
      // v1.2.0: Three-tier time tracking
      effortMinutes: 'Estimado',
      timeLoggedMinutes: 'Tiempo Registrado',
      soldEffortMinutes: 'Ofertado',
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      dropdown: 'Lista',
      checkbox: 'Casilla',
    } as Record<ColumnType, string>,
  },
};
