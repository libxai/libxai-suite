/**
 * Editable Column Title Component
 * Allows inline editing of column names
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils'

export interface EditableColumnTitleProps {
  title: string
  onSave: (newTitle: string) => void
  className?: string
}

export function EditableColumnTitle({
  title,
  onSave,
  className,
}: EditableColumnTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== title) {
      onSave(trimmed)
    } else {
      setEditValue(title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(title)
      setIsEditing(false)
    }
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
        className={cn(
          'asakaa-column-title bg-transparent border-b-2 border-blue-500',
          'outline-none px-1 -ml-1',
          className
        )}
        maxLength={50}
      />
    )
  }

  return (
    <h2
      className={cn('asakaa-column-title cursor-pointer', className)}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {title}
    </h2>
  )
}
