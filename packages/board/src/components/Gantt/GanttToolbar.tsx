import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Sun, Moon, Palette, Download, FileImage, FileSpreadsheet, FileText, FileJson, ChevronDown, FolderKanban, Plus, Rows3, Check, Filter, CheckCircle2, PlayCircle, Circle, EyeOff, Search, Eye, Share2, Sparkles, Layers } from 'lucide-react';
import { TimeScale, Theme, RowDensity, TaskFilterType, ProjectForecast } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { useGanttI18n } from './GanttI18nContext'; // v0.15.0: i18n

/**
 * v3.0.1: Hook to position dropdown menus via portal at document.body.
 * Escapes overflow:clip and stacking context issues.
 */
function useDropdownPortal(triggerRef: React.RefObject<HTMLElement | null>, isOpen: boolean, align: 'left' | 'right' = 'left') {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.bottom + 4;
    let left: number;
    if (align === 'right') {
      // Right-align: dropdown's right edge = trigger's right edge
      left = rect.right;
    } else {
      left = rect.left;
    }
    setPos({ top, left });
  }, [isOpen, align, triggerRef]);

  return pos;
}

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
  // Custom toolbar right content
  toolbarRightContent?: React.ReactNode;
  // v3.0.0: WBS Level selector
  wbsLevel?: number | 'all';
  onWbsLevelChange?: (level: number | 'all') => void;
  maxWbsDepth?: number;
  // v3.0.0: Execution/Oracle view mode toggle
  viewMode?: 'execution' | 'oracle';
  onViewModeChange?: (mode: 'execution' | 'oracle') => void;
  // v3.1.0: Forecast HUD data
  projectForecast?: ProjectForecast;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n(); // v0.15.0: i18n
  const portalPos = useDropdownPortal(triggerRef, isOpen, 'right');

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
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
    <>
      <motion.button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all"
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

      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed w-44 rounded-xl overflow-hidden"
            style={{
              top: portalPos.top,
              left: portalPos.left - 176, // w-44 = 11rem = 176px, right-aligned
              zIndex: 99999,
              backgroundColor: theme.bgPrimary === '#050505' ? 'rgba(10, 10, 10, 0.95)' : theme.bgSecondary,
              border: `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.08)' : theme.border}`,
              boxShadow: theme.bgPrimary === '#050505'
                ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 10px 40px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="py-1">
              {exportOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleExport(option.id, option.handler)}
                  disabled={isExporting !== null}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    borderBottom: index < exportOptions.length - 1 ? `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.borderLight}` : 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  whileHover={{
                    backgroundColor: theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.hoverBg,
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-md"
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
                        <Download className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[11px] font-medium truncate"
                      style={{ color: theme.textPrimary }}
                    >
                      {option.label}
                    </div>
                    <div
                      className="text-[9px] truncate"
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
      </AnimatePresence>,
      document.body
      )}
    </>
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
            className="relative px-3 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-1.5 min-w-[70px] justify-center"
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
            className="relative px-3 py-1.5 text-[11px] transition-all"
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n();
  const portalPos = useDropdownPortal(triggerRef, isOpen, 'left');

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const densityOptions = [
    { value: 'compact' as RowDensity, label: t.toolbar.compact || 'Compact' },
    { value: 'comfortable' as RowDensity, label: t.toolbar.normal || 'Normal' },
    { value: 'spacious' as RowDensity, label: t.toolbar.spacious || 'Spacious' },
  ];

  const currentLabel = densityOptions.find(opt => opt.value === value)?.label || 'Normal';

  return (
    <>
      <motion.button
        ref={triggerRef}
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

      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed w-32 rounded-xl overflow-hidden"
            style={{
              top: portalPos.top,
              left: portalPos.left,
              zIndex: 99999,
              backgroundColor: theme.bgPrimary === '#050505' ? 'rgba(10, 10, 10, 0.95)' : theme.bgSecondary,
              border: `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.08)' : theme.border}`,
              boxShadow: theme.bgPrimary === '#050505'
                ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 10px 40px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(16px)',
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
                      borderBottom: index < densityOptions.length - 1 ? `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.borderLight}` : 'none',
                    }}
                    whileHover={{
                      backgroundColor: isActive ? theme.accentLight : (theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.hoverBg),
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span
                      className="text-[11px]"
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
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

/**
 * v3.0.0: WBS Level Dropdown Component
 * Allows collapsing the task tree to a specific depth level
 */
interface WbsLevelDropdownProps {
  theme: any;
  value: number | 'all';
  onChange: (level: number | 'all') => void;
  maxDepth: number;
}

function WbsLevelDropdown({ theme, value, onChange, maxDepth }: WbsLevelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n();
  const portalPos = useDropdownPortal(triggerRef, isOpen, 'left');

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options: Array<{ value: number | 'all'; label: string }> = [
    { value: 'all', label: t.toolbar.wbsAllLevels || 'All' },
    ...Array.from({ length: Math.min(maxDepth, 5) }, (_, i) => ({
      value: i + 1,
      label: `L${i + 1}`,
    })),
  ];

  const currentLabel = value === 'all' ? (t.toolbar.wbsAllLevels || 'All') : `L${value}`;

  return (
    <>
      <motion.button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all"
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
        title={`${t.toolbar.wbsLevel || 'Level'}: ${currentLabel}`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span
          className="text-[11px] font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {currentLabel}
        </span>
      </motion.button>

      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed w-24 rounded-xl overflow-hidden"
            style={{
              top: portalPos.top,
              left: portalPos.left,
              zIndex: 99999,
              backgroundColor: theme.bgPrimary === '#050505' ? 'rgba(10, 10, 10, 0.95)' : theme.bgSecondary,
              border: `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.08)' : theme.border}`,
              boxShadow: theme.bgPrimary === '#050505'
                ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 10px 40px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="py-1">
              {options.map((option, index) => {
                const isActive = value === option.value;
                return (
                  <motion.button
                    key={String(option.value)}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left transition-all"
                    style={{
                      backgroundColor: isActive ? theme.accentLight : 'transparent',
                      borderBottom: index < options.length - 1 ? `1px solid ${theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.borderLight}` : 'none',
                    }}
                    whileHover={{
                      backgroundColor: isActive ? theme.accentLight : (theme.bgPrimary === '#050505' ? 'rgba(255,255,255,0.06)' : theme.hoverBg),
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <span
                      className="text-[11px]"
                      style={{
                        color: isActive ? theme.accent : theme.textPrimary,
                        fontFamily: "'JetBrains Mono', monospace",
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
      </AnimatePresence>,
      document.body
      )}
    </>
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useGanttI18n();
  const portalPos = useDropdownPortal(triggerRef, isOpen, 'left');

  // Close dropdown when clicking outside (with delay to prevent immediate close)
  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          triggerRef.current && !triggerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)
        ) {
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
      icon: <div className="w-3.5 h-3.5 rounded-full border-2 border-[#2E94FF] bg-[#2E94FF]" />,
      color: 'text-[#2E94FF]'
    },
    {
      value: 'completed',
      label: t.toolbar.filterCompleted || 'Completed',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-green-500'
    },
    {
      value: 'in_progress',
      label: t.toolbar.filterInProgress || 'In Progress',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
      color: 'text-blue-500'
    },
    {
      value: 'incomplete',
      label: t.toolbar.toDo || 'To Do / Pending',
      icon: <Circle className="w-3.5 h-3.5" />,
      color: 'text-gray-400'
    },
  ];

  const hasActiveFilter = value !== 'all' || hideCompleted;
  const isDark = theme.bgPrimary === '#0F1117' || theme.bgPrimary === '#0a0a0a' || theme.bgPrimary === '#050505' || theme.textPrimary === '#FFFFFF';

  return (
    <>
      {/* Filter Button */}
      <motion.button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all"
        style={{
          backgroundColor: hasActiveFilter
            ? (isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgb(239 246 255)')
            : (isOpen ? theme.hoverBg : theme.bgSecondary),
          border: `1px solid ${hasActiveFilter
            ? (isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgb(191 219 254)')
            : theme.borderLight}`,
          color: hasActiveFilter
            ? '#2E94FF'
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
            style={{ backgroundColor: '#2E94FF' }}
          />
        )}
      </motion.button>

      {/* Dropdown */}
      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed w-56 rounded-xl overflow-hidden"
            style={{
              top: portalPos.top,
              left: portalPos.left,
              zIndex: 99999,
              backgroundColor: isDark ? 'rgba(10, 10, 10, 0.95)' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgb(229 231 235)'}`,
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 10px 40px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(229 231 235)' }}
            >
              <span
                className="text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {t.toolbar.filterBy || 'FILTER BY STATUS'}
              </span>
            </div>

            {/* Status Options */}
            <div className="py-1">
              {filterOptions.map((option) => {
                // Don't show checkmark on status options when hideCompleted is active
                const isSelected = value === option.value && !hideCompleted;

                // Dynamic icon for "all" option - solid when selected, outline when not
                const getIcon = () => {
                  if (option.value === 'all') {
                    return isSelected
                      ? <div className="w-3.5 h-3.5 rounded-full border-2 border-[#2E94FF] bg-[#2E94FF]" />
                      : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400" />;
                  }
                  return option.icon;
                };

                return (
                  <motion.button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      // If selecting a specific status, disable hide completed
                      if (onHideCompletedChange) {
                        onHideCompletedChange(false);
                      }
                      // Close dropdown after selection
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgb(249 250 251)')
                        : 'transparent',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    whileHover={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(243 244 246)',
                    }}
                  >
                    <span className={`${isSelected ? option.color : 'text-gray-400'} flex-shrink-0`}>
                      {getIcon()}
                    </span>
                    <span
                      className="flex-1 text-left whitespace-nowrap font-medium"
                      style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#111827' }}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: '#2E94FF' }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Separator */}
            <div
              className="mx-3 h-px"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(229 231 235)' }}
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
                    // Close dropdown after selection
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors"
                  style={{
                    backgroundColor: hideCompleted
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgb(249 250 251)')
                      : 'transparent',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  whileHover={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgb(243 244 246)',
                  }}
                >
                  <EyeOff
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{
                      color: hideCompleted
                        ? '#2E94FF'
                        : (isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF')
                    }}
                  />
                  <span
                    className="flex-1 text-left whitespace-nowrap font-medium"
                    style={{ color: isDark ? 'rgba(255,255,255,0.85)' : '#111827' }}
                  >
                    {t.toolbar.hideCompleted || 'Hide Completed Tasks'}
                  </span>
                  {hideCompleted && (
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: '#2E94FF' }}
                    />
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

/**
 * Chronos V2: Time Capsule — pill-shaped time scale selector
 */
function TimeCapsule({ value, onChange, theme }: { value: TimeScale; onChange: (s: TimeScale) => void; theme: any }) {
  const t = useGanttI18n();
  const isDark = theme.bgPrimary === '#050505' || theme.textPrimary === '#FFFFFF';
  const scales: Array<{ value: TimeScale; label: string }> = [
    { value: 'day', label: t.toolbar.day.charAt(0).toUpperCase() },
    { value: 'week', label: t.toolbar.week.charAt(0).toUpperCase() },
    { value: 'month', label: t.toolbar.month.charAt(0).toUpperCase() },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full p-0.5"
      style={{
        backgroundColor: isDark ? '#000000' : theme.bgSecondary,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : theme.border}`,
      }}
    >
      {scales.map((s) => {
        const isActive = value === s.value;
        return (
          <motion.button
            key={s.value}
            onClick={() => onChange(s.value)}
            className="relative px-3 py-1 text-[11px] font-medium rounded-full transition-colors"
            style={{
              color: isActive ? (isDark ? '#FFFFFF' : theme.textPrimary) : theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              backgroundColor: isActive ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
            }}
            whileHover={{ color: isDark ? '#FFFFFF' : theme.textPrimary }}
            whileTap={{ scale: 0.95 }}
          >
            {s.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Chronos V2: Forecast HUD Panel — real KPIs bar (v3.1.0)
 */
function ForecastHUD({ theme, forecast }: { theme: any; forecast?: ProjectForecast }) {
  const t = useGanttI18n();
  const isDark = theme.bgPrimary === '#050505' || theme.textPrimary === '#FFFFFF';

  // Format expected finish date
  const finishLabel = forecast?.expectedFinish
    ? forecast.expectedFinish.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—';

  // Delay badge
  const delay = forecast?.delayDays;
  const hasDelay = delay != null && delay !== 0;
  const delayLabel = delay != null
    ? (delay > 0 ? `+${delay}d Delay` : delay < 0 ? `${delay}d Early` : 'On Time')
    : null;
  const delayColor = delay != null && delay > 0
    ? { bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.1)', text: isDark ? '#EF4444' : '#DC2626' }
    : delay != null && delay < 0
      ? { bg: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(22,163,74,0.1)', text: isDark ? '#22C55E' : '#16A34A' }
      : { bg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', text: theme.textTertiary };

  // Confidence color
  const conf = forecast?.confidencePercent;
  const confColor = conf != null
    ? conf >= 75 ? '#22C55E' : conf >= 40 ? '#F59E0B' : '#EF4444'
    : theme.textTertiary;

  // Format cost
  const cost = forecast?.costAtCompletion;
  const currency = forecast?.currency || '$';
  const costLabel = cost != null
    ? cost >= 1_000_000
      ? `${currency}${(cost / 1_000_000).toFixed(2)}M`
      : cost >= 1_000
        ? `${currency}${(cost / 1_000).toFixed(1)}K`
        : `${currency}${cost.toFixed(0)}`
    : '—';

  // Budget variance badge
  const variance = forecast?.budgetVariancePercent;
  const hasVariance = variance != null && variance !== 0;
  const varianceLabel = variance != null
    ? (variance > 0 ? `+${variance.toFixed(0)}% Over` : `${variance.toFixed(0)}% Under`)
    : null;
  const varianceColor = variance != null && variance > 0
    ? { bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.1)', text: isDark ? '#EF4444' : '#DC2626' }
    : variance != null && variance < 0
      ? { bg: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(22,163,74,0.1)', text: isDark ? '#22C55E' : '#16A34A' }
      : { bg: 'transparent', text: theme.textTertiary };

  return (
    <div
      className="h-12 px-4 flex items-center justify-between border-b"
      style={{
        backgroundColor: theme.forecastHud || (isDark ? 'rgba(15,15,15,0.9)' : 'rgba(248,250,252,0.95)'),
        borderColor: theme.borderLight,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Project Forecast label + Expected Finish */}
      <div className="flex items-center gap-6">
        <span
          className="text-[9px] uppercase tracking-[0.15em]"
          style={{
            color: theme.textTertiary,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
          }}
        >
          {t.toolbar.projectForecast}
        </span>

        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: theme.textPrimary, fontFamily: 'Inter, sans-serif' }}
          >
            {t.toolbar.expectedFinish}: {finishLabel}
          </span>
          {hasDelay && delayLabel && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: delayColor.bg,
                color: delayColor.text,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {delayLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: Confidence + Cost */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px]"
            style={{ color: theme.textTertiary, fontFamily: 'Inter, sans-serif' }}
          >
            {t.toolbar.confidence}:
          </span>
          <span
            className="text-[13px] font-semibold"
            style={{
              color: confColor,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {conf != null ? `${conf.toFixed(0)}%` : '—'}
          </span>
        </div>

        <div
          className="w-px h-5"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.borderLight }}
        />

        <div className="flex items-center gap-2">
          <span
            className="text-[11px]"
            style={{ color: theme.textTertiary, fontFamily: 'Inter, sans-serif' }}
          >
            {t.toolbar.costAtCompletion}:
          </span>
          <span
            className="text-[13px] font-bold"
            style={{ color: theme.textPrimary, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {costLabel}
          </span>
          {hasVariance && varianceLabel && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: varianceColor.bg,
                color: varianceColor.text,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {varianceLabel}
            </span>
          )}
        </div>
      </div>
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
  toolbarRightContent,
  // v3.0.0: WBS Level selector
  wbsLevel,
  onWbsLevelChange,
  maxWbsDepth = 4,
  // v3.0.0: Execution/Oracle view mode
  viewMode = 'execution',
  onViewModeChange,
  // v3.1.0: Forecast HUD data
  projectForecast,
  onExportPNG,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onExportJSON,
  onExportMSProject,
}: GanttToolbarProps) {
  const t = useGanttI18n(); // v0.15.0: i18n
  const hasExport = onExportPNG || onExportPDF || onExportExcel || onExportCSV || onExportJSON || onExportMSProject;
  const isChronos = !!theme.glassToolbar;
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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

  // ─── Chronos V2 Layout (all themes) ──────────────────────────────────
  const isDark = theme.bgPrimary === '#050505' || theme.textPrimary === '#FFFFFF';

  if (isChronos) {
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : theme.borderLight;
    const iconHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    return (
      <div className="flex flex-col">
        {/* Bar 1: Glass Toolbar (52px) */}
        <div
          className="h-[52px] px-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: theme.glassToolbar,
            borderColor: theme.borderLight,
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Left: Search Pill */}
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center rounded-full overflow-hidden"
              style={{
                backgroundColor: isDark ? '#1A1A1A' : theme.bgSecondary,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.border}`,
              }}
              animate={{ width: searchOpen ? 220 : 36 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <motion.button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center justify-center w-9 h-9 flex-shrink-0"
                style={{ color: theme.textTertiary }}
                whileHover={{ color: theme.textPrimary }}
              >
                <Search className="w-4 h-4" />
              </motion.button>
              {searchOpen && (
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks..."
                  className="bg-transparent border-none outline-none text-[11px] pr-3 w-full"
                  style={{
                    color: theme.textPrimary,
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onBlur={() => setSearchOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                  }}
                />
              )}
            </motion.div>

            {/* Divider */}
            <div className="w-px h-5" style={{ backgroundColor: dividerColor }} />

            {/* Segmented Control: Execution | Oracle View */}
            <div
              className="inline-flex items-center rounded-full p-0.5"
              style={{
                backgroundColor: isDark ? '#000000' : theme.bgSecondary,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.border}`,
              }}
            >
              <motion.button
                onClick={() => onViewModeChange?.('execution')}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'execution'
                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
                    : 'transparent',
                  color: viewMode === 'execution' ? theme.textPrimary : theme.textTertiary,
                  fontFamily: 'Inter, sans-serif',
                }}
                whileHover={viewMode !== 'execution' ? { color: theme.textSecondary } : {}}
              >
                {t.toolbar.viewExecution}
              </motion.button>
              <motion.button
                onClick={() => onViewModeChange?.('oracle')}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'oracle'
                    ? (isDark ? 'rgba(46,148,255,0.15)' : 'rgba(37,99,235,0.08)')
                    : 'transparent',
                  color: viewMode === 'oracle'
                    ? (isDark ? '#2E94FF' : '#2E94FF')
                    : theme.textTertiary,
                  fontFamily: 'Inter, sans-serif',
                }}
                whileHover={viewMode !== 'oracle' ? { color: theme.textSecondary } : {}}
              >
                {t.toolbar.viewOracle}
              </motion.button>
            </div>
          </div>

          {/* Center: Create Task (if enabled) */}
          {showCreateTaskButton && onCreateTask && (
            <motion.button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px]"
              style={{
                background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`,
                color: '#FFFFFF',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                boxShadow: `0 2px 8px ${isDark ? 'rgba(46,148,255,0.3)' : 'rgba(37,99,235,0.3)'}`,
              }}
              whileHover={{ scale: 1.02, boxShadow: `0 4px 12px ${isDark ? 'rgba(46,148,255,0.4)' : 'rgba(37,99,235,0.4)'}` }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{createTaskLabel || t.toolbar.createTask}</span>
            </motion.button>
          )}

          {/* Right: Time Capsule + Icons + AI Button */}
          <div className="flex items-center gap-3">
            {/* Time Capsule */}
            <TimeCapsule value={timeScale} onChange={onTimeScaleChange} theme={theme} />

            {/* Divider */}
            <div className="w-px h-5" style={{ backgroundColor: dividerColor }} />

            {/* Density */}
            <DensityDropdown theme={theme} value={rowDensity} onChange={onRowDensityChange} />

            {/* v3.0.0: WBS Level Selector */}
            {onWbsLevelChange && (
              <WbsLevelDropdown
                theme={theme}
                value={wbsLevel ?? 'all'}
                onChange={onWbsLevelChange}
                maxDepth={maxWbsDepth}
              />
            )}

            {/* Filter */}
            {onTaskFilterChange && (
              <FilterDropdown
                theme={theme}
                value={taskFilter}
                onChange={onTaskFilterChange}
                hideCompleted={hideCompleted}
                onHideCompletedChange={onHideCompletedChange}
              />
            )}

            {/* Custom right content (e.g. Hrs/$ lens toggle) */}
            {toolbarRightContent && (
              <>
                <div className="w-px h-5" style={{ backgroundColor: dividerColor }} />
                {toolbarRightContent}
              </>
            )}

            {/* Divider */}
            <div className="w-px h-5" style={{ backgroundColor: dividerColor }} />

            {/* Visibility icon */}
            <motion.button
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ color: theme.textTertiary, backgroundColor: 'transparent' }}
              whileHover={{ color: theme.textPrimary, backgroundColor: iconHoverBg }}
              title={t.toolbar.visibility}
            >
              <Eye className="w-4 h-4" />
            </motion.button>

            {/* Share icon */}
            <motion.button
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ color: theme.textTertiary, backgroundColor: 'transparent' }}
              whileHover={{ color: theme.textPrimary, backgroundColor: iconHoverBg }}
              title={t.toolbar.share}
            >
              <Share2 className="w-4 h-4" />
            </motion.button>

            {/* Export */}
            {hasExport && (
              <ExportDropdown
                theme={theme}
                onExportPNG={onExportPNG}
                onExportPDF={onExportPDF}
                onExportExcel={onExportExcel}
                onExportCSV={onExportCSV}
                onExportJSON={onExportJSON}
                onExportMSProject={onExportMSProject}
              />
            )}

            {/* AI Simulate Scenario Button */}
            <motion.button
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(168,85,247,0.4)',
                color: '#A855F7',
                fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(139,92,246,0.05) 100%)',
              }}
              whileHover={{
                borderColor: 'rgba(168,85,247,0.7)',
                boxShadow: '0 0 12px rgba(168,85,247,0.2)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.toolbar.simulateScenario}</span>
            </motion.button>
          </div>
        </div>

        {/* Bar 2: Forecast HUD Panel (48px) */}
        <ForecastHUD theme={theme} forecast={projectForecast} />
      </div>
    );
  }

  // ─── Standard Layout (light/neutral themes) ───────────────────────────
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
            className="px-2 py-0.5 rounded text-[11px] tabular-nums min-w-[42px] text-center"
            style={{
              color: theme.textSecondary,
              fontFamily: "'JetBrains Mono', monospace",
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

        {/* v3.0.0: WBS Level Selector */}
        {onWbsLevelChange && (
          <WbsLevelDropdown
            theme={theme}
            value={wbsLevel ?? 'all'}
            onChange={onWbsLevelChange}
            maxDepth={maxWbsDepth}
          />
        )}

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

      {/* Right Section - Custom content + Create Task + Export + Theme Selector */}
      <div className="flex items-center gap-3">
        {/* Custom right content (e.g. Hrs/$ lens toggle) */}
        {toolbarRightContent && (
          <>
            {toolbarRightContent}
            <div className="w-px h-5" style={{ backgroundColor: theme.borderLight }} />
          </>
        )}
        {/* v0.14.3: Create Task Button */}
        {showCreateTaskButton && onCreateTask && (
          <>
            <motion.button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all"
              style={{
                background: 'linear-gradient(135deg, #2E94FF 0%, #2E94FF 100%)',
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