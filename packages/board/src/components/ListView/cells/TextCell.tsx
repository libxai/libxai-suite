/**
 * TextCell - Editable text cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../utils';

interface TextCellProps {
  value?: string;
  onChange?: (value: string) => void;
  isDark: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function TextCell({
  value = '',
  onChange,
  isDark,
  placeholder = '-',
  disabled = false,
}: TextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onChange?.(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (disabled || !onChange) {
    return (
      <span className={cn('text-sm truncate', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full px-2 py-1 text-sm rounded border outline-none',
          isDark
            ? 'bg-white/5 border-[#3B82F6] text-white'
            : 'bg-white border-[#3B82F6] text-gray-900'
        )}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        'text-sm truncate text-left w-full px-2 py-1 rounded transition-colors',
        isDark ? 'text-[#94A3B8] hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100',
        !value && (isDark ? 'text-[#6B7280]' : 'text-gray-400')
      )}
    >
      {value || placeholder}
    </button>
  );
}
