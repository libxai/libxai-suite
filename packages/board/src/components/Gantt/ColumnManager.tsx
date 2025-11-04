import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { Portal } from '../Portal';
import { GanttColumn, ColumnType } from './types';

interface ColumnManagerProps {
  columns: GanttColumn[];
  onToggleColumn: (columnId: ColumnType) => void;
  theme: any;
}

export function ColumnManager({ columns, onToggleColumn, theme }: ColumnManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const availableColumns = columns.filter(col => col.id !== 'name');

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={() => {
          if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
          }
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-md transition-colors flex items-center gap-1"
        style={{
          backgroundColor: theme.bgSecondary,
          border: `1px solid ${theme.borderLight}`,
          color: theme.textSecondary,
        }}
        whileHover={{
          backgroundColor: theme.hoverBg,
          scale: 1.05,
        }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="column-manager-menu fixed min-w-[180px] rounded-lg shadow-xl z-[9999]"
              style={{
                left: `${menuPosition.x}px`,
                top: `${menuPosition.y}px`,
                backgroundColor: theme.bgSecondary,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div className="py-1">
                <div
                  className="px-3 py-2 text-xs uppercase tracking-wider"
                  style={{
                    color: theme.textTertiary,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  Add Column
                </div>
                {availableColumns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => {
                      onToggleColumn(column.id);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center justify-between transition-colors text-sm"
                    style={{
                      color: theme.textPrimary,
                      backgroundColor: 'transparent',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{column.label}</span>
                    {column.visible && (
                      <Check className="w-4 h-4" style={{ color: theme.accent }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}
