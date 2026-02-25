/**
 * HoursBarCell - Visual hours bar with 3-action menu + inline popovers
 * Chronos V2.0 Interactive Time Manager
 *
 * Shows: Registered / Estimated + progress bar + T. Ofertado (if exists)
 * "+ Log" button opens 3-option menu: Registrar, Estimación, T. Ofertado
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Clock, Target, DollarSign } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../../utils';
import { TimeInputPopover } from '../../TimeTracking/TimeInputPopover';
import type { Task } from '../../Gantt/types';

type PopoverMode = 'log' | 'estimate' | 'quoted' | null;

interface HoursBarCellProps {
  task: Task;
  isDark: boolean;
  locale?: string;
  onLogTime?: (task: Task, minutes: number | null, note?: string) => void;
  onEstimateUpdate?: (task: Task, minutes: number | null) => void;
  onSoldEffortUpdate?: (task: Task, minutes: number | null) => void;
  /** Show the "Ofertado: Xh" line even without edit callback (read-only visibility) */
  showSoldEffort?: boolean;
  /** @deprecated Use onLogTime instead */
  onOpenTimeLog?: (task: Task) => void;
  /** Display mode: 'hours' shows Xh, 'financial' shows $X (hours × hourlyRate) */
  lens?: 'hours' | 'financial';
  /** Rate used to convert hours → dollars when lens='financial' */
  hourlyRate?: number;
}

export function HoursBarCell({
  task,
  isDark,
  locale = 'en',
  onLogTime,
  onEstimateUpdate,
  onSoldEffortUpdate,
  showSoldEffort,
  onOpenTimeLog,
  lens = 'hours',
  hourlyRate = 0,
}: HoursBarCellProps) {
  const isEs = locale === 'es';
  const isFin = lens === 'financial' && hourlyRate > 0;
  /** Format a value as hours or dollars depending on lens */
  const fmt = (hours: number) => isFin
    ? `$${Math.round(hours * hourlyRate).toLocaleString('en-US')}`
    : `${hours}h`;
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverMode, setPopoverMode] = useState<PopoverMode>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const spentMinutes = task.timeLoggedMinutes || 0;
  const allocatedMinutes = task.effortMinutes || 0;
  const soldMinutes = (task as any).soldEffortMinutes || 0;
  const spentHours = Math.round((spentMinutes / 60) * 10) / 10;
  const allocatedHours = Math.round((allocatedMinutes / 60) * 10) / 10;
  const soldHours = Math.round((soldMinutes / 60) * 10) / 10;

  const percentage = allocatedMinutes > 0 ? (spentMinutes / allocatedMinutes) * 100 : 0;
  const overHours = percentage > 100 ? Math.round(((spentMinutes - allocatedMinutes) / 60) * 10) / 10 : 0;

  const barColor = percentage > 100
    ? '#FF453A'
    : percentage >= 80
      ? '#FFD60A'
      : '#32D74B';

  // Close menu/popover on click outside
  useEffect(() => {
    if (!menuOpen && !popoverMode) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPopoverMode(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, popoverMode]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If only onLogTime exists (no estimate/quoted), open log directly
    if (onLogTime && !onEstimateUpdate && !onSoldEffortUpdate) {
      setPopoverMode('log');
      return;
    }
    // If has multiple actions, show menu
    if (onLogTime || onEstimateUpdate || onSoldEffortUpdate) {
      setMenuOpen(prev => !prev);
      setPopoverMode(null);
      return;
    }
    // Legacy fallback
    if (onOpenTimeLog) {
      onOpenTimeLog(task);
    }
  };

  const handleMenuOption = (mode: PopoverMode) => {
    setMenuOpen(false);
    setPopoverMode(mode);
  };

  const handleSave = async (minutes: number | null, note?: string) => {
    if (popoverMode === 'log' && onLogTime && minutes) {
      onLogTime(task, minutes, note);
    } else if (popoverMode === 'estimate' && onEstimateUpdate) {
      onEstimateUpdate(task, minutes);
    } else if (popoverMode === 'quoted' && onSoldEffortUpdate) {
      onSoldEffortUpdate(task, minutes);
    }
    setPopoverMode(null);
  };

  const hasAnyAction = onLogTime || onEstimateUpdate || onSoldEffortUpdate || onOpenTimeLog;

  // Menu items config
  const menuItems = [
    { mode: 'log' as const, icon: Clock, label: isEs ? 'Registrar tiempo' : 'Log time', show: !!onLogTime },
    { mode: 'estimate' as const, icon: Target, label: isEs ? 'Estimación' : 'Estimate', show: !!onEstimateUpdate },
    { mode: 'quoted' as const, icon: DollarSign, label: isEs ? 'T. Ofertado' : 'Quoted time', show: !!onSoldEffortUpdate },
  ].filter(item => item.show);

  // Current value for popover (estimate/quoted show current, log starts empty)
  const currentPopoverValue = popoverMode === 'estimate' ? allocatedMinutes
    : popoverMode === 'quoted' ? soldMinutes
    : undefined;

  // ── Empty state ──
  if (allocatedMinutes === 0 && spentMinutes === 0 && soldMinutes === 0) {
    return (
      <div
        ref={containerRef}
        className="relative flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className={cn('text-[11px] font-mono', isDark ? 'text-white/30' : 'text-gray-400')}>
          —
        </span>
        {isHovered && hasAnyAction && (
          <button
            onClick={handleButtonClick}
            className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-[#007BFF]/15 text-[#007BFF] hover:bg-[#007BFF]/25 transition-colors"
          >
            {isEs ? 'Tiempo' : 'Time'}
          </button>
        )}

        {/* Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50"
              style={{
                background: isDark ? 'rgba(10,10,10,0.95)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E5E7EB',
                borderRadius: 8,
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
                backdropFilter: 'blur(16px)',
                overflow: 'hidden',
                minWidth: 160,
              }}
            >
              {menuItems.map(item => (
                <button
                  key={item.mode}
                  onClick={(e) => { e.stopPropagation(); handleMenuOption(item.mode); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  <item.icon style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popover */}
        <AnimatePresence>
          {popoverMode && (
            <div className="absolute right-0 top-full mt-1 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <TimeInputPopover
                  mode={popoverMode}
                  locale={locale as 'en' | 'es'}
                  isDark={isDark}
                  currentValue={currentPopoverValue || undefined}
                  onSave={handleSave}
                  onClose={() => setPopoverMode(null)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Normal state with data ──
  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-2 w-full"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chronos card container */}
      <div
        className="flex flex-col gap-1 flex-1 min-w-0"
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
          backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
        }}
      >
        {/* Main line: Registered / Estimated */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#FFFFFF' : '#111827' }}>
            {fmt(spentHours)}
          </span>
          {allocatedMinutes > 0 && (
            <span className="font-mono" style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>
              / {fmt(allocatedHours)}
            </span>
          )}
          {overHours > 0 && (
            <span className="font-mono" style={{ fontSize: 10, color: '#FF453A' }}>
              +{fmt(overHours)} {isEs ? 'Exceso' : 'Over'}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {allocatedMinutes > 0 && (
          <div className="w-full overflow-hidden" style={{ height: 3, backgroundColor: isDark ? '#333' : '#E5E7EB', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        )}

        {/* T. Ofertado line (if exists + user has financial access via callback or showSoldEffort) */}
        {soldMinutes > 0 && (onSoldEffortUpdate || showSoldEffort) && (
          <div className="flex items-center gap-1" style={{ marginTop: 1 }}>
            <span className="font-mono" style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.25)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isEs ? 'Ofertado' : 'Quoted'}:
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#6B7280' }}>
              {fmt(soldHours)}
            </span>
          </div>
        )}
      </div>

      {/* + Log button → opens 3-option menu */}
      {hasAnyAction && (
        <button
          onClick={handleButtonClick}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-colors"
          style={{
            border: isDark ? '1px solid #333' : '1px solid #E5E7EB',
            backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB',
            color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
          }}
        >
          <Plus className="w-3 h-3" />
          {isEs ? 'Tiempo' : 'Time'}
        </button>
      )}

      {/* 3-option Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 z-50"
            style={{
              background: isDark ? 'rgba(10,10,10,0.95)' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E5E7EB',
              borderRadius: 8,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(16px)',
              overflow: 'hidden',
              minWidth: 160,
            }}
          >
            {menuItems.map(item => (
              <button
                key={item.mode}
                onClick={(e) => { e.stopPropagation(); handleMenuOption(item.mode); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isDark ? 'rgba(255,255,255,0.7)' : '#374151',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <item.icon style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Input Popover (for whichever mode was selected) */}
      <AnimatePresence>
        {popoverMode && (
          <div className="absolute right-0 top-full mt-1 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <TimeInputPopover
                mode={popoverMode}
                locale={locale as 'en' | 'es'}
                isDark={isDark}
                currentValue={currentPopoverValue || undefined}
                onSave={handleSave}
                onClose={() => setPopoverMode(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
