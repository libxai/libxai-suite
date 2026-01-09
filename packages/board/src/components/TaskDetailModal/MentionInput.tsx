/**
 * MentionInput Component
 * A textarea with @mention autocomplete functionality
 * @version 0.17.422 - Added emoji picker and file attachments
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Paperclip, X, File, Image, FileText } from 'lucide-react';
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

/** Attachment for comments */
export interface CommentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/** Pending file before upload */
export interface PendingFile {
  id: string;
  file: File;
  preview?: string;
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
  /** v0.17.422: Enable emoji picker */
  enableEmoji?: boolean;
  /** v0.17.422: Enable file attachments */
  enableAttachments?: boolean;
  /** v0.17.422: Pending files to attach */
  pendingFiles?: PendingFile[];
  /** v0.17.422: Callback when files are selected */
  onFilesSelect?: (files: File[]) => void;
  /** v0.17.422: Callback to remove a pending file */
  onRemoveFile?: (fileId: string) => void;
  /** v0.17.422: Max file size in MB */
  maxFileSizeMB?: number;
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

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Common emojis for quick picker
 */
const COMMON_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '🎉',
  '🔥', '❤️', '💯', '✅', '❌', '⚠️', '📌', '💡',
  '🚀', '⭐', '🎯', '💪', '🙏', '👀', '📝', '💬',
];

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
  enableEmoji = true,
  enableAttachments = true,
  pendingFiles = [],
  onFilesSelect,
  onRemoveFile,
  maxFileSizeMB = 10,
}: MentionInputProps) {
  const isDark = theme === 'dark';
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
      // Close emoji picker on click outside
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Insert emoji at cursor position
  const insertEmoji = useCallback((emoji: string) => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || value.length;
    const newValue = value.slice(0, cursorPos) + emoji + value.slice(cursorPos);
    onChange(newValue);
    setShowEmojiPicker(false);

    // Focus back and move cursor after emoji
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = cursorPos + emoji.length;
        inputRef.current.selectionStart = newCursorPos;
        inputRef.current.selectionEnd = newCursorPos;
        inputRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Handle file selection
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!onFilesSelect || !e.target.files) return;

    const files = Array.from(e.target.files);
    const maxBytes = maxFileSizeMB * 1024 * 1024;

    // Filter files by size
    const validFiles = files.filter(file => {
      if (file.size > maxBytes) {
        console.warn(`File ${file.name} exceeds max size of ${maxFileSizeMB}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }

    // Reset input
    e.target.value = '';
  }, [onFilesSelect, maxFileSizeMB]);

  // Get file icon based on type
  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
    return File;
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
    <div className="flex flex-col gap-2">
      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((pf) => {
            const FileIcon = getFileIcon(pf.file);
            const isImage = pf.file.type.startsWith('image/');

            return (
              <div
                key={pf.id}
                className={cn(
                  "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg",
                  isDark ? "bg-white/10" : "bg-gray-100"
                )}
              >
                {/* Thumbnail or Icon */}
                {isImage && pf.preview ? (
                  <img src={pf.preview} alt={pf.file.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <FileIcon className={cn("w-4 h-4", isDark ? "text-[#9CA3AF]" : "text-gray-500")} />
                )}
                <div className="flex-1 min-w-0 max-w-[120px]">
                  <p className={cn("text-xs truncate", isDark ? "text-white" : "text-gray-900")}>
                    {pf.file.name}
                  </p>
                  <p className={cn("text-xs", isDark ? "text-[#6B7280]" : "text-gray-400")}>
                    {formatFileSize(pf.file.size)}
                  </p>
                </div>
                {/* Remove button */}
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(pf.id)}
                    className={cn(
                      "p-0.5 rounded-full transition-colors",
                      isDark ? "hover:bg-white/10 text-[#6B7280] hover:text-white" : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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

        <div className={cn("flex-1 relative min-w-0")}>
          <div className={cn(
            "flex items-center gap-1 px-2 py-2 rounded-lg",
            isDark ? "bg-white/5" : "bg-white border border-gray-200"
          )}>
            {/* Emoji Picker Button */}
            {enableEmoji && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={disabled || isSubmitting}
                  className={cn(
                    "p-1 rounded transition-colors flex-shrink-0",
                    isDark ? "hover:bg-white/10 text-[#6B7280] hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
                    (disabled || isSubmitting) && "opacity-50"
                  )}
                  title={locale === 'es' ? 'Emojis' : 'Emojis'}
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Emoji Picker Dropdown */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      ref={emojiPickerRef}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className={cn(
                        "absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-xl z-50",
                        isDark ? "bg-[#1A1D25] border border-white/10" : "bg-white border border-gray-200"
                      )}
                    >
                      <div className="grid grid-cols-8 gap-1 w-[200px]">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className={cn(
                              "w-6 h-6 flex items-center justify-center text-lg rounded transition-colors hover:scale-110",
                              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Attachment Button */}
            {enableAttachments && onFilesSelect && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isSubmitting}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    isDark ? "hover:bg-white/10 text-[#6B7280] hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
                    (disabled || isSubmitting) && "opacity-50"
                  )}
                  title={locale === 'es' ? 'Adjuntar archivo' : 'Attach file'}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
              </>
            )}

            {/* Input */}
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
                "flex-1 bg-transparent text-sm outline-none min-w-[100px]",
                isDark ? "text-white placeholder:text-[#6B7280]" : "text-gray-900 placeholder:text-gray-400",
                (disabled || isSubmitting) && "opacity-50"
              )}
            />

            {/* Send Button */}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || (!value.trim() && pendingFiles.length === 0) || disabled}
              className={cn(
                "p-1.5 rounded transition-colors",
                (value.trim() || pendingFiles.length > 0) && !disabled
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
