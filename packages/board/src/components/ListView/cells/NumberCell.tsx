/**
 * NumberCell - Editable number cell for ListView
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../utils';

interface NumberCellProps {
  value?: number;
  onChange?: (value: number) => void;
  isDark: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function NumberCell({
  value,
  onChange,
  isDark,
  placeholder = '-',
  min,
  max,
  disabled = false,
}: NumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue)) {
      let finalValue = numValue;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);
      if (finalValue !== value) {
        onChange?.(finalValue);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value?.toString() || '');
      setIsEditing(false);
    }
  };

  if (disabled || !onChange) {
    return (
      <span className={cn('text-sm', isDark ? 'text-[#94A3B8]' : 'text-gray-500')}>
        {value !== undefined ? value : placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        min={min}
        max={max}
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
        'text-sm text-left w-full px-2 py-1 rounded transition-colors',
        isDark ? 'text-[#94A3B8] hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100',
        value === undefined && (isDark ? 'text-[#6B7280]' : 'text-gray-400')
      )}
    >
      {value !== undefined ? value : placeholder}
    </button>
  );
}
