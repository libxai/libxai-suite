import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  Link2,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Eye,
  EyeOff,
  Settings,
  Scissors, // v0.8.0: For Split task
  Circle, // v0.16.0: For Mark Incomplete
  PlayCircle, // v0.16.0: For Set In Progress
  CheckCircle2, // v0.16.0: For Mark Complete
  Pencil, // v0.16.0: Alias for Edit
} from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  theme: any;
}

export function ContextMenu({ isOpen, x, y, items, onClose, theme }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // v0.17.32: Adaptive positioning to prevent menu from being cut off at edges
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // v0.17.32: Calculate adjusted position when menu opens or position changes
  useEffect(() => {
    if (!isOpen) return;

    // Menu dimensions (approximate - will be refined after render)
    const menuWidth = 200; // min-w-[200px]
    const menuHeight = items.length * 36 + 8; // ~36px per item + padding
    const padding = 8; // Distance from edge

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust X if menu would overflow right edge
    if (x + menuWidth + padding > viewportWidth) {
      adjustedX = x - menuWidth; // Show to the left of cursor
      // Ensure it doesn't go off left edge
      if (adjustedX < padding) {
        adjustedX = padding;
      }
    }

    // Adjust Y if menu would overflow bottom edge
    if (y + menuHeight + padding > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - padding;
      // Ensure it doesn't go off top edge
      if (adjustedY < padding) {
        adjustedY = padding;
      }
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [isOpen, x, y, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="fixed z-[9999] min-w-[200px] rounded-lg shadow-xl"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
          backgroundColor: theme.bgSecondary,
          border: `1px solid ${theme.border}`,
        }}
      >
        <div className="py-1">
          {items.map((item) => (
            <div key={item.id}>
              {item.separator && (
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: theme.borderLight }}
                />
              )}
              <button
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors text-sm"
                style={{
                  color: item.disabled ? theme.textTertiary : theme.textPrimary,
                  backgroundColor: 'transparent',
                  fontFamily: 'Inter, sans-serif',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.backgroundColor = theme.hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.icon && (
                  <span style={{ color: theme.textSecondary }}>
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.submenu && (
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: theme.textTertiary }} />
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Icon components for menu items
export const MenuIcons = {
  Edit: <Edit3 className="w-4 h-4" />,
  Pencil: <Pencil className="w-4 h-4" />, // v0.16.0: Alias for Edit
  Delete: <Trash2 className="w-4 h-4" />,
  Add: <Plus className="w-4 h-4" />,
  AddSubtask: <Plus className="w-4 h-4" />, // v0.16.0: Add subtask
  Remove: <Minus className="w-4 h-4" />,
  Link: <Link2 className="w-4 h-4" />,
  Progress: <BarChart3 className="w-4 h-4" />,
  Sort: <ArrowUpDown className="w-4 h-4" />,
  SortAsc: <ArrowUp className="w-4 h-4" />,
  SortDesc: <ArrowDown className="w-4 h-4" />,
  Hide: <EyeOff className="w-4 h-4" />,
  Show: <Eye className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Split: <Scissors className="w-4 h-4" />, // v0.8.0: Split task
  // v0.16.0: Task status icons
  MarkIncomplete: <Circle className="w-4 h-4" />,
  SetInProgress: <PlayCircle className="w-4 h-4" />,
  MarkComplete: <CheckCircle2 className="w-4 h-4" />,
};
