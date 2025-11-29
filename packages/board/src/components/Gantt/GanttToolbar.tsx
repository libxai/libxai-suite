import { useState, useRef, useEffect } from 'react';
import { Calendar, ZoomIn, ZoomOut, Sun, Moon, Palette, AlignJustify, Download, FileImage, FileSpreadsheet, FileText, FileJson, ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { TimeScale, Theme, RowDensity } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { useGanttI18n } from './GanttI18nContext'; // v0.15.0: i18n

// Export options configuration
export interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
}

interface GanttToolbarProps {
  theme: any;
  timeScale: TimeScale;
  onTimeScaleChange: (scale: TimeScale) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  rowDensity: RowDensity;
  onRowDensityChange: (density: RowDensity) => void;
  showThemeSelector?: boolean;
  // v0.14.3: Create task button
  showCreateTaskButton?: boolean;
  createTaskLabel?: string;
  onCreateTask?: () => void;
  // Export handlers
  onExportPNG?: () => Promise<void>;
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onExportMSProject?: () => void;
}

// Export Dropdown Component
interface ExportDropdownProps {
  theme: any;
  onExportPNG?: () => Promise<void>;
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onExportMSProject?: () => void;
}

function ExportDropdown({ theme, onExportPNG, onExportPDF, onExportExcel, onExportCSV, onExportJSON, onExportMSProject }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n(); // v0.15.0: i18n

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

  const hasAnyExport = onExportPNG || onExportPDF || onExportExcel || onExportCSV || onExportJSON || onExportMSProject;

  if (!hasAnyExport) return null;

  const exportOptions = [
    {
      id: 'png',
      label: 'PNG',
      description: 'Image',
      icon: <FileImage className="w-4 h-4" />,
      handler: onExportPNG,
    },
    {
      id: 'pdf',
      label: 'PDF',
      description: 'Document',
      icon: <FileText className="w-4 h-4" />,
      handler: onExportPDF,
    },
    {
      id: 'excel',
      label: 'Excel',
      description: 'Spreadsheet',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      handler: onExportExcel,
    },
    {
      id: 'csv',
      label: 'CSV',
      description: 'Comma-separated',
      icon: <FileText className="w-4 h-4" />,
      handler: onExportCSV,
    },
    {
      id: 'json',
      label: 'JSON',
      description: 'Data',
      icon: <FileJson className="w-4 h-4" />,
      handler: onExportJSON,
    },
    {
      id: 'msproject',
      label: 'MS Project',
      description: 'XML',
      icon: <FolderKanban className="w-4 h-4" />,
      handler: onExportMSProject,
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
        <span>{t.toolbar.export}</span>
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

// Segmented Control Component
interface SegmentedControlProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  theme: any;
}

function SegmentedControl({ options, value, onChange, theme }: SegmentedControlProps) {
  return (
    <div
      className="inline-flex p-1 rounded-lg relative"
      style={{
        backgroundColor: theme.bgSecondary,
        border: `1px solid ${theme.borderLight}`,
      }}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 min-w-[70px] justify-center"
            style={{
              color: isActive ? theme.textPrimary : theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: isActive ? 600 : 500,
              zIndex: isActive ? 2 : 1,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isActive && (
              <motion.div
                layoutId="activeSegment"
                className="absolute inset-0 rounded-md"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            {option.icon && (
              <span className="relative z-10" style={{ color: isActive ? '#FFFFFF' : theme.textTertiary }}>
                {option.icon}
              </span>
            )}
            <span className="relative z-10" style={{ color: isActive ? '#FFFFFF' : theme.textTertiary }}>
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function GanttToolbar({
  theme,
  timeScale,
  onTimeScaleChange,
  zoom,
  onZoomChange,
  currentTheme,
  onThemeChange,
  rowDensity,
  onRowDensityChange,
  showThemeSelector = true,
  showCreateTaskButton = false,
  createTaskLabel, // v0.15.0: Will use translations if not provided
  onCreateTask,
  onExportPNG,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onExportJSON,
  onExportMSProject,
}: GanttToolbarProps) {
  const t = useGanttI18n(); // v0.15.0: i18n
  const hasExport = onExportPNG || onExportPDF || onExportExcel || onExportCSV || onExportJSON || onExportMSProject;

  // v0.15.0: Use translations for labels
  const timeScaleOptions = [
    { value: 'day', label: t.toolbar.day, icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'week', label: t.toolbar.week, icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'month', label: t.toolbar.month, icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'neutral', label: 'Zen', icon: <Palette className="w-3.5 h-3.5" /> },
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compact', icon: <AlignJustify className="w-3.5 h-3.5" /> },
    { value: 'comfortable', label: 'Normal', icon: <AlignJustify className="w-3.5 h-3.5" /> },
    { value: 'spacious', label: 'Spacious', icon: <AlignJustify className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="h-14 px-6 flex items-center justify-between border-b"
      style={{
        backgroundColor: theme.bgGrid,
        borderColor: theme.border,
      }}
    >
      {/* Left Section - Time Scale Controls */}
      <div className="flex items-center gap-4">
        <SegmentedControl
          options={timeScaleOptions}
          value={timeScale}
          onChange={(val) => onTimeScaleChange(val as TimeScale)}
          theme={theme}
        />

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
            <motion.button
              onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
              className="p-1.5 rounded-md transition-all"
              style={{
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.borderLight}`,
              }}
              whileHover={{
                backgroundColor: theme.hoverBg,
                scale: 1.05,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ZoomOut className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            </motion.button>

            <div
              className="px-3 py-1 rounded-md text-xs tabular-nums min-w-[50px] text-center"
              style={{
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.borderLight}`,
                color: theme.textPrimary,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
              }}
            >
              {Math.round(zoom * 100)}%
            </div>

            <motion.button
              onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
              className="p-1.5 rounded-md transition-all"
              style={{
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.borderLight}`,
              }}
              whileHover={{
                backgroundColor: theme.hoverBg,
                scale: 1.05,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <ZoomIn className="w-3.5 h-3.5" style={{ color: theme.textSecondary }} />
            </motion.button>
        </div>

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* Row Density Controls */}
        <SegmentedControl
          options={densityOptions}
          value={rowDensity}
          onChange={(val) => onRowDensityChange(val as RowDensity)}
          theme={theme}
        />
      </div>

      {/* Right Section - Create Task + Export + Theme Selector */}
      <div className="flex items-center gap-3">
        {/* v0.14.3: Create Task Button */}
        {showCreateTaskButton && onCreateTask && (
          <>
            <motion.button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{createTaskLabel || t.toolbar.createTask}</span>
            </motion.button>
            {(hasExport || showThemeSelector) && (
              <div
                className="w-px h-6"
                style={{ backgroundColor: theme.borderLight }}
              />
            )}
          </>
        )}

        {hasExport && (
          <>
            <ExportDropdown
              theme={theme}
              onExportPNG={onExportPNG}
              onExportPDF={onExportPDF}
              onExportExcel={onExportExcel}
              onExportCSV={onExportCSV}
              onExportJSON={onExportJSON}
              onExportMSProject={onExportMSProject}
            />
            {showThemeSelector && (
              <div
                className="w-px h-6"
                style={{ backgroundColor: theme.borderLight }}
              />
            )}
          </>
        )}
        {showThemeSelector && (
          <SegmentedControl
            options={themeOptions}
            value={currentTheme}
            onChange={(val) => onThemeChange(val as Theme)}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}