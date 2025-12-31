/**
 * MentionInput Component
 * A textarea with @mention autocomplete functionality
 * @version 0.17.401
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { cn } from '../../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MentionUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  color?: string;
}

export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  users: MentionUser[];
  placeholder?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  theme?: 'dark' | 'light';
  locale?: 'en' | 'es';
  currentUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
  };
}

interface MentionMatch {
  start: number;
  end: number;
  query: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find the current @mention being typed
 */
function findMentionMatch(text: string, cursorPosition: number): MentionMatch | null {
  const beforeCursor = text.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf('@');

  if (atIndex === -1) return null;

  // Check if @ is at start or preceded by whitespace
  const charBefore = beforeCursor[atIndex - 1];
  if (atIndex > 0 && charBefore && !/\s/.test(charBefore)) {
    return null;
  }

  const afterAt = beforeCursor.slice(atIndex + 1);

  // If there's a space after @, the mention is complete
  if (/\s/.test(afterAt)) return null;

  return {
    start: atIndex,
    end: cursorPosition,
    query: afterAt.toLowerCase(),
  };
}

/**
 * Extract all @mentions from text and return mentioned user IDs
 */
export function extractMentionedUserIds(text: string, users: MentionUser[]): string[] {
  const mentionedIds: string[] = [];
  const mentionRegex = /@(\S+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionName = match[1]?.toLowerCase() ?? '';
    if (!mentionName) continue;
    const user = users.find(u =>
      u.name.toLowerCase().replace(/\s+/g, '') === mentionName ||
      u.name.toLowerCase() === mentionName
    );
    if (user && !mentionedIds.includes(user.id)) {
      mentionedIds.push(user.id);
    }
  }

  return mentionedIds;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MentionInput({
  value,
  onChange,
  onSubmit,
  users,
  placeholder,
  disabled = false,
  isSubmitting = false,
  theme = 'dark',
  locale = 'es',
  currentUser,
}: MentionInputProps) {
  const isDark = theme === 'dark';
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter users based on mention query
  const updateMentionState = useCallback((text: string, cursorPos: number) => {
    const match = findMentionMatch(text, cursorPos);
    setMentionMatch(match);

    if (match) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(match.query) ||
        (user.email && user.email.toLowerCase().includes(match.query))
      ).slice(0, 5);

      setFilteredUsers(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
      setFilteredUsers([]);
    }
  }, [users]);

  // Handle text change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    updateMentionState(newValue, e.target.selectionStart || 0);
  };

  // Handle cursor position changes
  const handleSelect = () => {
    if (inputRef.current) {
      updateMentionState(value, inputRef.current.selectionStart || 0);
    }
  };

  // Insert mention into text
  const insertMention = useCallback((user: MentionUser) => {
    if (!mentionMatch || !inputRef.current) return;

    const beforeMention = value.slice(0, mentionMatch.start);
    const afterMention = value.slice(mentionMatch.end);
    const mentionText = `@${user.name.replace(/\s+/g, '')} `;

    const newValue = beforeMention + mentionText + afterMention;
    onChange(newValue);

    setShowDropdown(false);
    setMentionMatch(null);

    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = mentionMatch.start + mentionText.length;
        inputRef.current.selectionStart = newCursorPos;
        inputRef.current.selectionEnd = newCursorPos;
        inputRef.current.focus();
      }
    }, 0);
  }, [mentionMatch, value, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter': {
          e.preventDefault();
          const selectedUser = filteredUsers[selectedIndex];
          if (selectedUser) insertMention(selectedUser);
          break;
        }
        case 'Tab': {
          e.preventDefault();
          const tabSelectedUser = filteredUsers[selectedIndex];
          if (tabSelectedUser) insertMention(tabSelectedUser);
          break;
        }
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showDropdown]);

  return (
    <div className="flex items-start gap-2">
      {/* Current User Avatar */}
      {currentUser && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: currentUser.color || '#8B5CF6' }}
        >
          {currentUser.name?.slice(0, 2).toUpperCase() || 'U'}
        </div>
      )}

      <div className={cn(
        "flex-1 relative",
      )}>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          isDark ? "bg-white/5" : "bg-white border border-gray-200"
        )}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (locale === 'es' ? 'Escribe un comentario...' : 'Write a comment...')}
            disabled={disabled || isSubmitting}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none",
              isDark ? "text-white placeholder:text-[#6B7280]" : "text-gray-900 placeholder:text-gray-400",
              (disabled || isSubmitting) && "opacity-50"
            )}
          />
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !value.trim() || disabled}
            className={cn(
              "p-1.5 rounded transition-colors",
              value.trim() && !disabled
                ? (isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-500 text-white hover:bg-blue-600")
                : (isDark ? "text-[#6B7280]" : "text-gray-400"),
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showDropdown && filteredUsers.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={cn(
                "absolute bottom-full left-0 right-0 mb-1 py-1 rounded-lg shadow-xl z-50",
                "max-h-[200px] overflow-y-auto",
                isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
              )}
            >
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    index === selectedIndex
                      ? (isDark ? "bg-white/10" : "bg-gray-100")
                      : (isDark ? "hover:bg-white/5" : "hover:bg-gray-50")
                  )}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: user.color || '#8B5CF6' }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {user.name}
                    </p>
                    {user.email && (
                      <p className={cn(
                        "text-xs truncate",
                        isDark ? "text-[#6B7280]" : "text-gray-500"
                      )}>
                        {user.email}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Render comment content with highlighted mentions
 */
export function CommentContent({
  content,
  theme = 'dark'
}: {
  content: string;
  theme?: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const parts: { type: 'text' | 'mention'; value: string }[] = [];
  const mentionRegex = /@(\S+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'mention',
      value: match[0],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex),
    });
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className={cn(
                "inline-flex items-center px-1 py-0.5 rounded",
                "font-medium text-sm",
                isDark
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-blue-100 text-blue-700"
              )}
            >
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </span>
  );
}

export default MentionInput;
