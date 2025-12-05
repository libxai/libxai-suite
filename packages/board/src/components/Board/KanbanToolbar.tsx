import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Column as ColumnType } from '../../types';

// Theme type for toolbar styling
interface KanbanToolbarTheme {
  bgGrid: string;
  bgSecondary: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  hoverBg: string;
}

// Default themes
const darkTheme: KanbanToolbarTheme = {
  bgGrid: '#0F1117',
  bgSecondary: '#1A1D25',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#E5E7EB',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  accent: '#3B82F6',
  accentLight: 'rgba(59, 130, 246, 0.15)',
  hoverBg: 'rgba(255, 255, 255, 0.05)',
};

const lightTheme: KanbanToolbarTheme = {
  bgGrid: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  border: 'rgba(0, 0, 0, 0.1)',
  borderLight: 'rgba(0, 0, 0, 0.05)',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  accent: '#3B82F6',
  accentLight: 'rgba(59, 130, 246, 0.1)',
  hoverBg: 'rgba(0, 0, 0, 0.05)',
};

// i18n translations
interface KanbanToolbarI18n {
  newTask: string;
  selectColumn: string;
  export: string;
  exportCSV: string;
  exportJSON: string;
  exportExcel: string;
}

const defaultI18n: KanbanToolbarI18n = {
  newTask: 'Nueva Tarea',
  selectColumn: 'Seleccionar columna',
  export: 'Exportar',
  exportCSV: 'CSV',
  exportJSON: 'JSON',
  exportExcel: 'Excel',
};

const englishI18n: KanbanToolbarI18n = {
  newTask: 'New Task',
  selectColumn: 'Select column',
  export: 'Export',
  exportCSV: 'CSV',
  exportJSON: 'JSON',
  exportExcel: 'Excel',
};

export interface KanbanToolbarProps {
  columns: ColumnType[];
  onCreateTask?: (columnId: string) => void;
  createTaskLabel?: string;
  theme?: 'dark' | 'light';
  locale?: 'es' | 'en';
  // Export handlers
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onExportExcel?: () => Promise<void>;
  // Custom translations
  translations?: Partial<KanbanToolbarI18n>;
}

// Column Selector Dropdown
interface ColumnSelectorProps {
  columns: ColumnType[];
  onSelect: (columnId: string) => void;
  theme: KanbanToolbarTheme;
  t: KanbanToolbarI18n;
  createTaskLabel?: string;
}

function ColumnSelector({ columns, onSelect, theme, t, createTaskLabel }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (columnId: string) => {
    onSelect(columnId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        }}
        whileHover={{
          scale: 1.02,
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{createTaskLabel || t.newTask}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-48 rounded-lg overflow-hidden z-50"
            style={{
              backgroundColor: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="py-1">
              <div
                className="px-3 py-2 text-[10px] uppercase tracking-wider"
                style={{ color: theme.textTertiary }}
              >
                {t.selectColumn}
              </div>
              {columns
                .sort((a, b) => a.position - b.position)
                .map((column, index) => (
                  <motion.button
                    key={column.id}
                    onClick={() => handleSelect(column.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: index < columns.length - 1 ? `1px solid ${theme.borderLight}` : 'none',
                    }}
                    whileHover={{
                      backgroundColor: theme.hoverBg,
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    {/* Column color indicator */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: column.color || theme.accent,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: theme.textPrimary }}
                      >
                        {column.title}
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={{ color: theme.textTertiary }}
                      >
                        {column.cardIds.length} {column.cardIds.length === 1 ? 'tarea' : 'tareas'}
                      </div>
                    </div>
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export Dropdown Component
interface ExportDropdownProps {
  theme: KanbanToolbarTheme;
  t: KanbanToolbarI18n;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onExportExcel?: () => Promise<void>;
}

function ExportDropdown({ theme, t, onExportCSV, onExportJSON, onExportExcel }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const hasAnyExport = onExportCSV || onExportJSON || onExportExcel;

  if (!hasAnyExport) return null;

  const exportOptions = [
    {
      id: 'csv',
      label: t.exportCSV,
      description: 'Comma-separated',
      icon: <FileText className="w-4 h-4" />,
      handler: onExportCSV,
    },
    {
      id: 'json',
      label: t.exportJSON,
      description: 'Data',
      icon: <FileJson className="w-4 h-4" />,
      handler: onExportJSON,
    },
    {
      id: 'excel',
      label: t.exportExcel,
      description: 'Spreadsheet',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      handler: onExportExcel,
    },
  ].filter(opt => opt.handler);

  const handleExport = async (id: string, handler: (() => void | Promise<void>) | undefined) => {
    if (!handler) return;

    setIsExporting(id);
    try {
      await handler();
    } catch (error) {
      console.error(`Export ${id} failed:`, error);
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          backgroundColor: isOpen ? theme.accent : theme.bgSecondary,
          border: `1px solid ${isOpen ? theme.accent : theme.borderLight}`,
          color: isOpen ? '#FFFFFF' : theme.textSecondary,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        }}
        whileHover={{
          scale: 1.02,
          backgroundColor: theme.accent,
          color: '#FFFFFF',
        }}
        whileTap={{ scale: 0.98 }}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t.export}</span>
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-44 rounded-lg overflow-hidden z-50"
            style={{
              backgroundColor: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="py-1">
              {exportOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleExport(option.id, option.handler)}
                  disabled={isExporting !== null}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    borderBottom: index < exportOptions.length - 1 ? `1px solid ${theme.borderLight}` : 'none',
                  }}
                  whileHover={{
                    backgroundColor: theme.hoverBg,
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-md"
                    style={{
                      backgroundColor: theme.accentLight,
                      color: theme.accent,
                    }}
                  >
                    {isExporting === option.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Download className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-medium truncate"
                      style={{ color: theme.textPrimary }}
                    >
                      {option.label}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: theme.textTertiary }}
                    >
                      {option.description}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function KanbanToolbar({
  columns,
  onCreateTask,
  createTaskLabel,
  theme = 'dark',
  locale = 'es',
  onExportCSV,
  onExportJSON,
  onExportExcel,
  translations,
}: KanbanToolbarProps) {
  const themeStyles = theme === 'dark' ? darkTheme : lightTheme;
  const t: KanbanToolbarI18n = {
    ...(locale === 'es' ? defaultI18n : englishI18n),
    ...translations,
  };

  const hasExport = onExportCSV || onExportJSON || onExportExcel;

  // Calculate total tasks
  const totalTasks = columns.reduce((sum, col) => sum + col.cardIds.length, 0);

  return (
    <div
      className="h-12 px-4 flex items-center justify-between border-b sticky top-0 z-10"
      style={{
        backgroundColor: themeStyles.bgGrid,
        borderColor: themeStyles.border,
      }}
    >
      {/* Left Section - Task Count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: themeStyles.textPrimary }}
          >
            {totalTasks}
          </span>
          <span
            className="text-xs"
            style={{ color: themeStyles.textTertiary }}
          >
            {totalTasks === 1 ? (locale === 'es' ? 'tarea' : 'task') : (locale === 'es' ? 'tareas' : 'tasks')}
          </span>
        </div>

        {/* Column breakdown - compact badges */}
        <div className="hidden sm:flex items-center gap-1">
          {columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                style={{
                  backgroundColor: themeStyles.bgSecondary,
                  border: `1px solid ${themeStyles.borderLight}`,
                  color: themeStyles.textSecondary,
                }}
                title={column.title}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: column.color || themeStyles.accent }}
                />
                <span>{column.cardIds.length}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Right Section - Create Task + Export */}
      <div className="flex items-center gap-3">
        {hasExport && (
          <>
            <ExportDropdown
              theme={themeStyles}
              t={t}
              onExportCSV={onExportCSV}
              onExportJSON={onExportJSON}
              onExportExcel={onExportExcel}
            />
            {onCreateTask && (
              <div
                className="w-px h-6"
                style={{ backgroundColor: themeStyles.borderLight }}
              />
            )}
          </>
        )}

        {onCreateTask && (
          <ColumnSelector
            columns={columns}
            onSelect={onCreateTask}
            theme={themeStyles}
            t={t}
            createTaskLabel={createTaskLabel}
          />
        )}
      </div>
    </div>
  );
}
