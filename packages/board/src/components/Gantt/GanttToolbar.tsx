import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Sun, Moon, Palette, Download, FileImage, FileSpreadsheet, FileText, FileJson, ChevronDown, FolderKanban, Plus, Rows3, Check, Filter, CheckCircle2, PlayCircle, Circle, EyeOff } from 'lucide-react';
import { TimeScale, Theme, RowDensity, TaskFilterType } from './types';
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
  // v0.17.300: Task filter
  taskFilter?: TaskFilterType;
  onTaskFilterChange?: (filter: TaskFilterType) => void;
  // v0.18.0: Hide completed toggle
  hideCompleted?: boolean;
  onHideCompletedChange?: (hide: boolean) => void;
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

// Segmented Control Component (kept for theme selector)
interface SegmentedControlProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  theme: any;
  layoutId?: string;
}

function SegmentedControl({ options, value, onChange, theme, layoutId = 'activeSegment' }: SegmentedControlProps) {
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
                layoutId={layoutId}
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

/**
 * v0.16.0: Minimal Tabs Component - Linear/Notion style
 * Minimalist tab selector with underline indicator
 */
interface MinimalTabsProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  theme: any;
}

function MinimalTabs({ options, value, onChange, theme }: MinimalTabsProps) {
  return (
    <div className="inline-flex items-center gap-1">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative px-3 py-1.5 text-xs transition-all"
            style={{
              color: isActive ? theme.accent : theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: isActive ? 600 : 500,
            }}
            whileHover={{ color: isActive ? theme.accent : theme.textSecondary }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{option.label}</span>
            {/* Underline indicator */}
            {isActive && (
              <motion.div
                layoutId="timeScaleUnderline"
                className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full"
                style={{ backgroundColor: theme.accent }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * v0.16.0: Density Dropdown Component
 * Consolidated density selector as a compact dropdown
 */
interface DensityDropdownProps {
  theme: any;
  value: RowDensity;
  onChange: (density: RowDensity) => void;
}

function DensityDropdown({ theme, value, onChange }: DensityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n();

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

  const densityOptions = [
    { value: 'compact' as RowDensity, label: t.toolbar.compact || 'Compact' },
    { value: 'comfortable' as RowDensity, label: t.toolbar.normal || 'Normal' },
    { value: 'spacious' as RowDensity, label: t.toolbar.spacious || 'Spacious' },
  ];

  const currentLabel = densityOptions.find(opt => opt.value === value)?.label || 'Normal';

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-lg transition-all"
        style={{
          backgroundColor: isOpen ? theme.accentLight : theme.bgSecondary,
          border: `1px solid ${isOpen ? theme.accent : theme.borderLight}`,
          color: isOpen ? theme.accent : theme.textSecondary,
        }}
        whileHover={{
          backgroundColor: theme.hoverBg,
          scale: 1.02,
        }}
        whileTap={{ scale: 0.98 }}
        title={`${t.toolbar.density || 'Density'}: ${currentLabel}`}
      >
        <Rows3 className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 w-36 rounded-lg overflow-hidden z-50"
            style={{
              backgroundColor: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="py-1">
              {densityOptions.map((option, index) => {
                const isActive = value === option.value;
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left transition-all"
                    style={{
                      backgroundColor: isActive ? theme.accentLight : 'transparent',
                      borderBottom: index < densityOptions.length - 1 ? `1px solid ${theme.borderLight}` : 'none',
                    }}
                    whileHover={{
                      backgroundColor: isActive ? theme.accentLight : theme.hoverBg,
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span
                      className="text-xs"
                      style={{
                        color: isActive ? theme.accent : theme.textPrimary,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {option.label}
                    </span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * v0.18.0: ClickUp-style Filter Dropdown Component
 * Shows status filter options with icons and "Hide Completed" toggle
 */
interface FilterDropdownProps {
  theme: any;
  value: TaskFilterType;
  onChange: (filter: TaskFilterType) => void;
  hideCompleted?: boolean;
  onHideCompletedChange?: (hide: boolean) => void;
}

function FilterDropdown({ theme, value, onChange, hideCompleted = false, onHideCompletedChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n();

  // Close dropdown when clicking outside (with delay to prevent immediate close)
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      (dropdownRef as any)._cleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if ((dropdownRef as any)._cleanup) {
        (dropdownRef as any)._cleanup();
      }
    };
  }, [isOpen]);

  // Status filter options with icons (ClickUp-style)
  const filterOptions: Array<{ value: TaskFilterType; label: string; icon: React.ReactNode; color: string }> = [
    {
      value: 'all',
      label: t.toolbar.filterAll || 'Show All',
      icon: <div className="w-4 h-4 rounded-full border-2 border-[#3B82F6] bg-[#3B82F6]" />,
      color: 'text-[#3B82F6]'
    },
    {
      value: 'completed',
      label: t.toolbar.filterCompleted || 'Completed',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-green-500'
    },
    {
      value: 'in_progress',
      label: t.toolbar.filterInProgress || 'In Progress',
      icon: <PlayCircle className="w-4 h-4" />,
      color: 'text-blue-500'
    },
    {
      value: 'incomplete',
      label: t.toolbar.toDo || 'To Do / Pending',
      icon: <Circle className="w-4 h-4" />,
      color: 'text-gray-400'
    },
  ];

  const hasActiveFilter = value !== 'all' || hideCompleted;
  const isDark = theme.bgPrimary === '#0F1117' || theme.bgPrimary === '#0a0a0a' || theme.textPrimary === '#FFFFFF';

  return (
    <div ref={dropdownRef} className="relative">
      {/* Filter Button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          backgroundColor: hasActiveFilter
            ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgb(239 246 255)')
            : (isOpen ? theme.hoverBg : theme.bgSecondary),
          border: `1px solid ${hasActiveFilter
            ? (isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgb(191 219 254)')
            : theme.borderLight}`,
          color: hasActiveFilter
            ? '#3B82F6'
            : theme.textSecondary,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        }}
        whileHover={{
          backgroundColor: theme.hoverBg,
          scale: 1.02,
        }}
        whileTap={{ scale: 0.98 }}
      >
        <Filter className="w-4 h-4" />
        <span>{t.toolbar.filter || 'Filters'}</span>
        {hasActiveFilter && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#3B82F6' }}
          />
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 w-64 rounded-lg overflow-hidden z-50"
            style={{
              backgroundColor: isDark ? '#0F1117' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgb(229 231 235)'}`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgb(229 231 235)' }}
            >
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
              >
                {t.toolbar.filterBy || 'FILTER BY STATUS'}
              </span>
            </div>

            {/* Status Options */}
            <div className="py-2">
              {filterOptions.map((option) => {
                // Don't show checkmark on status options when hideCompleted is active
                const isSelected = value === option.value && !hideCompleted;
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      // If selecting a specific status, disable hide completed
                      if (onHideCompletedChange) {
                        onHideCompletedChange(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgb(249 250 251)')
                        : 'transparent',
                    }}
                    whileHover={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgb(243 244 246)',
                    }}
                  >
                    <span className={option.color}>
                      {option.icon}
                    </span>
                    <span
                      className="flex-1 text-left"
                      style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check
                        className="w-4 h-4"
                        style={{ color: isDark ? '#3B82F6' : '#2563EB' }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Separator */}
            <div
              className="my-2 mx-4 h-px"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgb(229 231 235)' }}
            />

            {/* Hide Completed Toggle */}
            {onHideCompletedChange && (
              <div className="py-1">
                <motion.button
                  onClick={() => {
                    onHideCompletedChange(!hideCompleted);
                    // If enabling hide completed, reset to show all
                    if (!hideCompleted) {
                      onChange('all');
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{
                    backgroundColor: hideCompleted
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgb(249 250 251)')
                      : 'transparent',
                  }}
                  whileHover={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgb(243 244 246)',
                  }}
                >
                  <EyeOff
                    className="w-4 h-4"
                    style={{
                      color: hideCompleted
                        ? (isDark ? '#3B82F6' : '#2563EB')
                        : (isDark ? '#6B7280' : '#9CA3AF')
                    }}
                  />
                  <span
                    className="flex-1 text-left"
                    style={{ color: isDark ? '#FFFFFF' : '#111827' }}
                  >
                    {t.toolbar.hideCompleted || 'Hide Completed Tasks'}
                  </span>
                  {hideCompleted && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: isDark ? '#3B82F6' : '#2563EB' }}
                    />
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
  showThemeSelector = false, // v0.17.29: Default to false - themes should be in app settings
  showCreateTaskButton = false,
  createTaskLabel, // v0.15.0: Will use translations if not provided
  onCreateTask,
  taskFilter = 'all', // v0.17.300: Task filter
  onTaskFilterChange,
  hideCompleted = false, // v0.18.0: Hide completed toggle
  onHideCompletedChange,
  onExportPNG,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onExportJSON,
  onExportMSProject,
}: GanttToolbarProps) {
  const t = useGanttI18n(); // v0.15.0: i18n
  const hasExport = onExportPNG || onExportPDF || onExportExcel || onExportCSV || onExportJSON || onExportMSProject;

  // v0.16.0: Use minimal tabs for time scale (Linear/Notion style)
  const timeScaleOptions = [
    { value: 'day', label: t.toolbar.day },
    { value: 'week', label: t.toolbar.week },
    { value: 'month', label: t.toolbar.month },
  ];

  // v0.17.320: Task filter options moved to FilterDropdown component

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'neutral', label: 'Zen', icon: <Palette className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="h-12 px-4 flex items-center justify-between border-b"
      style={{
        backgroundColor: theme.bgGrid,
        borderColor: theme.border,
      }}
    >
      {/* Left Section - Time Scale as Minimal Tabs */}
      <div className="flex items-center gap-3">
        {/* v0.16.0: Minimal tabs for time scale */}
        <MinimalTabs
          options={timeScaleOptions}
          value={timeScale}
          onChange={(val) => onTimeScaleChange(val as TimeScale)}
          theme={theme}
        />

        {/* Divider */}
        <div
          className="w-px h-5"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* Zoom Controls - Compact */}
        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
            className="p-1.5 rounded-md transition-all"
            style={{
              backgroundColor: 'transparent',
              color: theme.textSecondary,
            }}
            whileHover={{
              backgroundColor: theme.hoverBg,
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </motion.button>

          <div
            className="px-2 py-0.5 rounded text-xs tabular-nums min-w-[42px] text-center"
            style={{
              color: theme.textSecondary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
          >
            {Math.round(zoom * 100)}%
          </div>

          <motion.button
            onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
            className="p-1.5 rounded-md transition-all"
            style={{
              backgroundColor: 'transparent',
              color: theme.textSecondary,
            }}
            whileHover={{
              backgroundColor: theme.hoverBg,
              scale: 1.05,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Divider */}
        <div
          className="w-px h-5"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* v0.16.0: Row Density as Dropdown Icon */}
        <DensityDropdown
          theme={theme}
          value={rowDensity}
          onChange={onRowDensityChange}
        />

        {/* v0.17.320: Professional Filter Dropdown */}
        {onTaskFilterChange && (
          <>
            {/* Divider */}
            <div
              className="w-px h-5"
              style={{ backgroundColor: theme.borderLight }}
            />

            {/* Filter Dropdown */}
            <FilterDropdown
              theme={theme}
              value={taskFilter}
              onChange={onTaskFilterChange}
              hideCompleted={hideCompleted}
              onHideCompletedChange={onHideCompletedChange}
            />
          </>
        )}
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