/**
 * TagPicker - ClickUp-style tag selector for tasks
 * v0.17.158: Initial implementation
 *
 * Features:
 * - Search existing tags
 * - Create new tags inline
 * - Color picker for new tags
 * - Multiple selection
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, X, Check, ChevronDown } from 'lucide-react';
import { TaskTag } from './types';

// Predefined tag colors (ClickUp-style palette)
const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
];

interface TagPickerProps {
  /** Currently selected tags on the task */
  selectedTags: TaskTag[];
  /** All available tags in the workspace */
  availableTags: TaskTag[];
  /** Callback when tags change */
  onChange: (tags: TaskTag[]) => void;
  /** Callback to create a new tag */
  onCreateTag?: (name: string, color: string) => Promise<TaskTag | null>;
  /** Theme colors */
  theme: any;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode (pill style) */
  compact?: boolean;
}

export function TagPicker({
  selectedTags,
  availableTags,
  onChange,
  onCreateTag,
  theme,
  disabled = false,
  compact: _compact = true,
}: TagPickerProps) {
  void _compact; // Suppress unused variable warning
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[10] || '#3B82F6'); // Default blue
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags based on search
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches an existing tag
  const exactMatch = availableTags.some(
    tag => tag.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 6,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
        setSearchQuery('');
        setIsCreating(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleTag = (tag: TaskTag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      onChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleCreateTag = async () => {
    if (!onCreateTag || !searchQuery.trim()) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchQuery.trim(), newTagColor);
      if (newTag) {
        onChange([...selectedTags, newTag]);
        setSearchQuery('');
        setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)] || '#3B82F6');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  const pillStyle = {
    backgroundColor: `${theme.textTertiary}15`,
    border: `1px solid ${theme.borderLight}`,
    color: theme.textSecondary,
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80"
        style={pillStyle}
        disabled={disabled}
      >
        <Tag className="w-3.5 h-3.5" />
        {selectedTags.length > 0 ? (
          <div className="flex items-center gap-1">
            {selectedTags.slice(0, 2).map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {selectedTags.length > 2 && (
              <span className="text-xs" style={{ color: theme.textTertiary }}>
                +{selectedTags.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span>Agregar</span>
        )}
        <ChevronDown className="w-3 h-3" style={{ color: theme.textTertiary }} />
      </button>

      {/* Dropdown - rendered via Portal to escape overflow:hidden containers */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.12 }}
              className="rounded-lg min-w-[240px]"
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: 99999,
                backgroundColor: theme.bgPrimary,
                border: `1px solid ${theme.border}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
            {/* Search Input */}
            <div className="p-2 border-b" style={{ borderColor: theme.border }}>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar o crear etiqueta..."
                className="w-full px-3 py-1.5 text-sm rounded-md outline-none"
                style={{
                  backgroundColor: theme.bgSecondary,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.borderLight}`,
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim() && !exactMatch && onCreateTag) {
                    handleCreateTag();
                  }
                }}
              />
            </div>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="p-2 border-b" style={{ borderColor: theme.border }}>
                <p className="text-xs mb-1.5" style={{ color: theme.textTertiary }}>
                  Seleccionadas
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      onClick={(e) => handleRemoveTag(tag.id, e)}
                    >
                      {tag.name}
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Available Tags List */}
            <div className="max-h-[200px] overflow-y-auto p-1">
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
                      style={{
                        backgroundColor: isSelected ? `${tag.color}15` : 'transparent',
                        color: theme.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = theme.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-left">{tag.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: tag.color }} />
                      )}
                    </button>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="p-2 text-center text-sm" style={{ color: theme.textTertiary }}>
                  No se encontraron etiquetas
                </div>
              ) : (
                <div className="p-2 text-center text-sm" style={{ color: theme.textTertiary }}>
                  No hay etiquetas disponibles
                </div>
              )}
            </div>

            {/* Create New Tag */}
            {searchQuery.trim() && !exactMatch && onCreateTag && (
              <div className="p-2 border-t" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs" style={{ color: theme.textTertiary }}>
                    Crear nueva etiqueta
                  </p>
                </div>

                {/* Color Picker */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        outline: newTagColor === color ? `2px solid ${color}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>

                {/* Create Button */}
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: newTagColor,
                    color: '#FFFFFF',
                    opacity: isCreating ? 0.7 : 1,
                  }}
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Crear "{searchQuery.trim()}"
                </button>
              </div>
            )}
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/**
 * TagBadge - Small tag badge for displaying in cards/lists
 */
export function TagBadge({ tag, onRemove, size = 'sm' }: {
  tag: TaskTag;
  onRemove?: () => void;
  size?: 'xs' | 'sm';
}) {
  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

/**
 * TagList - Display list of tags (for cards)
 */
export function TagList({
  tags,
  maxVisible = 3,
  size = 'sm',
}: {
  tags: TaskTag[];
  maxVisible?: number;
  size?: 'xs' | 'sm';
}) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} size={size} />
      ))}
      {hiddenCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full font-medium ${
            size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          style={{ backgroundColor: 'rgba(100,100,100,0.2)', color: '#9CA3AF' }}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
