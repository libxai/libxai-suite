import { Calendar, ZoomIn, ZoomOut, Sun, Moon, Palette, AlignJustify } from 'lucide-react';
import { TimeScale, Theme, RowDensity } from './types';
import { motion } from 'framer-motion';

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
}: GanttToolbarProps) {
  const timeScaleOptions = [
    { value: 'day', label: 'Day', icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'week', label: 'Week', icon: <Calendar className="w-3.5 h-3.5" /> },
    { value: 'month', label: 'Month', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'neutral', label: 'Zen', icon: <Palette className="w-3.5 h-3.5" /> },
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compact', icon: <AlignJustify className="w-3.5 h-3.5" /> },
    { value: 'comfortable', label: 'Comfortable', icon: <AlignJustify className="w-3.5 h-3.5" /> },
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
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              color: theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            View
          </span>
          <SegmentedControl
            options={timeScaleOptions}
            value={timeScale}
            onChange={(val) => onTimeScaleChange(val as TimeScale)}
            theme={theme}
          />
        </div>

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              color: theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            Zoom
          </span>
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
        </div>

        {/* Divider */}
        <div
          className="w-px h-6"
          style={{ backgroundColor: theme.borderLight }}
        />

        {/* Row Density Controls */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              color: theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            Density
          </span>
          <SegmentedControl
            options={densityOptions}
            value={rowDensity}
            onChange={(val) => onRowDensityChange(val as RowDensity)}
            theme={theme}
          />
        </div>
      </div>

      {/* Right Section - Theme Selector (optional) */}
      {showThemeSelector && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              color: theme.textTertiary,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            Theme
          </span>
          <SegmentedControl
            options={themeOptions}
            value={currentTheme}
            onChange={(val) => onThemeChange(val as Theme)}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}