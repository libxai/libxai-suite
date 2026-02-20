/**
 * GanttAIAssistant - AI-powered natural language task editor
 * Allows users to edit Gantt tasks using natural language commands
 *
 * @version 0.14.0
 *
 * @example
 * // In GanttBoard with AI assistant
 * <GanttBoard
 *   tasks={tasks}
 *   config={{
 *     aiAssistant: {
 *       enabled: true,
 *       onCommand: async (command, tasks) => {
 *         // Call your AI API and return task updates
 *         const response = await fetch('/api/gantt-ai', {
 *           method: 'POST',
 *           body: JSON.stringify({ command, tasks })
 *         });
 *         return response.json();
 *       }
 *     }
 *   }}
 * />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../Portal';
import {
  Task,
  GanttTheme,
  AICommandResult,
  AIMessage,
  GanttAIAssistantConfig,
} from './types';

// Re-export types for backwards compatibility
export type { AICommandResult, AIMessage, GanttAIAssistantConfig } from './types';
export type { PersistHistoryConfig } from './types';

export interface GanttAIAssistantProps {
  /** All current tasks in the Gantt */
  tasks: Task[];
  /** Theme configuration */
  theme: GanttTheme;
  /** AI assistant configuration */
  config: GanttAIAssistantConfig;
  /** Callback when tasks should be updated */
  onTasksUpdate: (updatedTasks: Task[]) => void;
  /** Callback for single task update */
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  /** Callback for task creation */
  onTaskCreate?: (task: Task) => void;
  /** Callback for task deletion */
  onTaskDelete?: (taskId: string) => void;
  /** Callback for dependency creation */
  onDependencyCreate?: (fromTaskId: string, toTaskId: string) => void;
  /** Callback for dependency deletion */
  onDependencyDelete?: (taskId: string, dependencyId: string) => void;
}

// Default suggestions for the command palette
const DEFAULT_SUGGESTIONS = [
  'Move "Task Name" to next Monday',
  'Extend "Task Name" by 3 days',
  'Rename "Old Name" to "New Name"',
  'Set "Task Name" progress to 50%',
  'Link "Task A" to "Task B"',
  'Create a new task called "New Task"',
  'Delete "Task Name"',
  'Assign John to "Task Name"',
];

// Sparkle/AI icon component — compact 16px for mini FAB
const AIIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
  </svg>
);

// Send icon
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
  </svg>
);

// Close icon
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6L18 18" />
  </svg>
);

// Minimize icon
const MinimizeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" />
  </svg>
);

// Loading dots animation
const LoadingDots = () => (
  <div className="flex gap-1 items-center">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 rounded-full bg-current"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </div>
);

export function GanttAIAssistant({
  tasks,
  theme,
  config,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTasksUpdate: _onTasksUpdate, // Reserved for batch updates
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onDependencyCreate,
  onDependencyDelete,
}: GanttAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  const {
    enabled = true,
    placeholder = 'Ask AI to edit tasks... (e.g., "Move Design to next week")',
    position = 'bottom-right',
    onCommand,
    suggestions = DEFAULT_SUGGESTIONS,
    maxHistory = 50,
    persistHistory,
    mentionableUsers = [],
  } = config;

  // Theme-aware color tokens
  const isDark = theme.bgPrimary === '#050505' || theme.bgPrimary === '#0a0a0a' || theme.textPrimary === '#FFFFFF';
  const fabBg = isDark ? 'rgba(10, 10, 10, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  const fabBorder = isDark ? 'rgba(46, 148, 255, 0.15)' : 'rgba(46, 148, 255, 0.25)';
  const fabShadow = isDark
    ? '0 0 20px rgba(46, 148, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(46, 148, 255, 0.04)'
    : '0 0 20px rgba(46, 148, 255, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08)';
  const ringBorderA = isDark ? 'rgba(46, 148, 255, 0.2)' : 'rgba(46, 148, 255, 0.15)';
  const ringBorderB = isDark ? 'rgba(46, 148, 255, 0.08)' : 'rgba(46, 148, 255, 0.06)';
  const tooltipBg = isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const tooltipBorder = isDark ? 'rgba(46, 148, 255, 0.12)' : 'rgba(46, 148, 255, 0.2)';
  const tooltipColor = isDark ? 'rgba(46, 148, 255, 0.9)' : '#2E94FF';
  const panelBg = isDark ? 'rgba(10, 10, 10, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  const panelBorder = isDark ? 'rgba(46, 148, 255, 0.1)' : 'rgba(46, 148, 255, 0.15)';
  const panelShadow = isDark
    ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(46, 148, 255, 0.04), inset 0 1px 0 rgba(255,255,255,0.03)'
    : '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 20px rgba(46, 148, 255, 0.04)';
  const headerAccentBg = isDark ? 'rgba(46, 148, 255, 0.04)' : 'rgba(46, 148, 255, 0.03)';
  const headerAccentBorder = isDark ? 'rgba(46, 148, 255, 0.1)' : 'rgba(46, 148, 255, 0.08)';
  const iconCircleBg = isDark ? 'rgba(46, 148, 255, 0.08)' : 'rgba(46, 148, 255, 0.06)';
  const iconCircleBorder = isDark ? 'rgba(46, 148, 255, 0.2)' : 'rgba(46, 148, 255, 0.15)';
  const titleColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
  const btnColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const btnHoverColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const btnHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const suggHintColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const suggBg = isDark ? 'rgba(46, 148, 255, 0.04)' : 'rgba(46, 148, 255, 0.04)';
  const suggBorder = isDark ? 'rgba(46, 148, 255, 0.08)' : 'rgba(46, 148, 255, 0.12)';
  const suggColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const suggHoverBorder = isDark ? 'rgba(46, 148, 255, 0.25)' : 'rgba(46, 148, 255, 0.3)';
  const userMsgBg = isDark ? 'rgba(46, 148, 255, 0.12)' : 'rgba(46, 148, 255, 0.08)';
  const userMsgBorder = isDark ? 'rgba(46, 148, 255, 0.15)' : 'rgba(46, 148, 255, 0.12)';
  const assistMsgBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
  const assistMsgBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const assistMsgColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
  const inputAreaBorder = isDark ? 'rgba(46, 148, 255, 0.06)' : 'rgba(46, 148, 255, 0.06)';
  const inputBoxBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const inputBoxBorder = isDark ? 'rgba(46, 148, 255, 0.08)' : 'rgba(46, 148, 255, 0.1)';
  const inputColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)';
  const submitBg = isDark ? 'rgba(46, 148, 255, 0.12)' : 'rgba(46, 148, 255, 0.08)';
  const submitBorder = isDark ? 'rgba(46, 148, 255, 0.2)' : 'rgba(46, 148, 255, 0.15)';
  const submitEmptyColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  const hintColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)';
  const mentionDropBg = isDark ? 'rgba(15, 15, 15, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const mentionDropBorder = isDark ? 'rgba(46, 148, 255, 0.1)' : 'rgba(46, 148, 255, 0.15)';
  const mentionDropShadow = isDark ? '0 -4px 20px rgba(0, 0, 0, 0.4)' : '0 -4px 20px rgba(0, 0, 0, 0.08)';
  const mentionActiveBg = isDark ? 'rgba(46, 148, 255, 0.08)' : 'rgba(46, 148, 255, 0.06)';
  const mentionTextColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)';
  const mentionEmailColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const mentionAvatarBg = isDark ? 'rgba(46, 148, 255, 0.12)' : 'rgba(46, 148, 255, 0.08)';
  const mentionAvatarBorder = isDark ? 'rgba(46, 148, 255, 0.2)' : 'rgba(46, 148, 255, 0.15)';

  // Get storage key for localStorage
  const storageKey = persistHistory?.storageKey || 'gantt-ai-history';
  const persistMaxMessages = persistHistory?.maxMessages ?? 5;

  // Filter mentionable users based on current query
  const filteredMentionUsers = mentionableUsers.filter((u) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
  }).slice(0, 5);

  // Handle @mention detection on input change
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);

    if (mentionableUsers.length === 0) return;

    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      // Check there's no space before @ (or it's at the start)
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        // Show dropdown while query is reasonable length (names can have spaces)
        if (query.length <= 40) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionDropdown(true);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }

    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
  }, [mentionableUsers.length]);

  // Select a user from the mention dropdown
  const selectMention = useCallback((user: { id: string; name: string }) => {
    const before = inputValue.slice(0, mentionStartIndex);
    const after = inputValue.slice(
      mentionStartIndex + 1 + mentionQuery.length
    );
    const newValue = `${before}@${user.name} ${after}`;
    setInputValue(newValue);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    // Re-focus input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [inputValue, mentionStartIndex, mentionQuery]);

  // Handle keyboard navigation in mention dropdown
  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showMentionDropdown || filteredMentionUsers.length === 0) return false;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionSelectedIndex((prev) =>
        prev < filteredMentionUsers.length - 1 ? prev + 1 : 0
      );
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredMentionUsers.length - 1
      );
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = filteredMentionUsers[mentionSelectedIndex];
      if (selected) selectMention(selected);
      return true;
    }
    if (e.key === 'Escape') {
      setShowMentionDropdown(false);
      return true;
    }
    return false;
  }, [showMentionDropdown, filteredMentionUsers, mentionSelectedIndex, selectMention]);

  // Load persisted history on mount
  useEffect(() => {
    if (persistHistory?.enabled) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as AIMessage[];
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(messagesWithDates.slice(-persistMaxMessages));
        }
      } catch (error) {
        console.warn('[GanttAIAssistant] Failed to load persisted history:', error);
      }
    }
  }, [persistHistory?.enabled, storageKey, persistMaxMessages]);

  // Persist history when messages change
  useEffect(() => {
    if (persistHistory?.enabled && messages.length > 0) {
      try {
        // Only persist non-loading messages
        const messagesToPersist = messages
          .filter(m => !m.isLoading)
          .slice(-persistMaxMessages);
        localStorage.setItem(storageKey, JSON.stringify(messagesToPersist));
      } catch (error) {
        console.warn('[GanttAIAssistant] Failed to persist history:', error);
      }
    }
  }, [messages, persistHistory?.enabled, storageKey, persistMaxMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Apply task updates based on AI command result
  const applyCommandResult = useCallback((result: AICommandResult) => {
    if (!result.success) return;

    switch (result.type) {
      case 'move_task':
      case 'resize_task':
      case 'rename_task':
      case 'set_progress':
      case 'set_status':
      case 'assign_task':
        if (result.taskId && result.updates) {
          onTaskUpdate?.(result.taskId, result.updates);
        }
        break;

      case 'create_task':
        if (result.newTask) {
          onTaskCreate?.(result.newTask);
        }
        break;

      case 'delete_task':
        if (result.taskId) {
          onTaskDelete?.(result.taskId);
        }
        break;

      case 'link_tasks':
        if (result.dependencyFrom && result.dependencyTo) {
          onDependencyCreate?.(result.dependencyFrom, result.dependencyTo);
        }
        break;

      case 'unlink_tasks':
        if (result.taskId && result.dependencyFrom) {
          onDependencyDelete?.(result.taskId, result.dependencyFrom);
        }
        break;
    }
  }, [onTaskUpdate, onTaskCreate, onTaskDelete, onDependencyCreate, onDependencyDelete]);

  // Handle sending a command
  const handleSendCommand = useCallback(async (command: string) => {
    if (!command.trim() || isLoading) return;

    // Add user message
    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: command,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev.slice(-(maxHistory - 1)), userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);

    // Add loading message
    const loadingMessage: AIMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      if (onCommand) {
        const result = await onCommand(command, tasks);

        // Remove loading message and add response
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => !m.isLoading);
          const assistantMessage: AIMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
            command: result,
          };
          return [...withoutLoading, assistantMessage];
        });

        // Apply the command result
        applyCommandResult(result);
      } else {
        // No handler provided - show helpful message
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => !m.isLoading);
          return [
            ...withoutLoading,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: 'AI handler not configured. Please provide an onCommand handler in the aiAssistant config.',
              timestamp: new Date(),
            },
          ];
        });
      }
    } catch (error) {
      // Handle error
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading);
        return [
          ...withoutLoading,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, maxHistory, onCommand, tasks, applyCommandResult]);

  // Handle input submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendCommand(inputValue);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle chat with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setIsMinimized(false);
        }
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close when clicking outside the chat panel
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the chat container
      if (chatContainerRef.current && !chatContainerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    // Add listener with a small delay to avoid closing immediately on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!enabled) return null;

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <Portal>
      {/* Floating AI Assistant — Mini Chronos FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            className={`fixed ${positionClasses[position]} z-[99999] group`}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: fabBg,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${fabBorder}`,
              color: '#2E94FF',
              cursor: 'pointer',
              boxShadow: fabShadow,
              overflow: 'visible',
            }}
            onClick={() => setIsOpen(true)}
          >
            {/* Orbital ring animation */}
            <span
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '50%',
                border: `1px solid ${ringBorderA}`,
                animation: 'ai-fab-pulse 3s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            {/* Second orbital ring — offset phase */}
            <span
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: `1px solid ${ringBorderB}`,
                animation: 'ai-fab-pulse 3s ease-in-out infinite 1.5s',
                pointerEvents: 'none',
              }}
            />
            <AIIcon size={18} />
            {/* Tooltip on hover */}
            <span
              className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                position: 'absolute',
                right: '100%',
                marginRight: 10,
                whiteSpace: 'nowrap',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: tooltipColor,
                background: tooltipBg,
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${tooltipBorder}`,
              }}
            >
              AI · ⌘K
            </span>
            {/* Inject keyframes */}
            <style>{`
              @keyframes ai-fab-pulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.15); opacity: 0; }
              }
            `}</style>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel — Chronos dark glass */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatContainerRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : 500,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed ${positionClasses[position]} z-[99999] w-96 rounded-2xl overflow-hidden flex flex-col`}
            style={{
              background: panelBg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${panelBorder}`,
              boxShadow: panelShadow,
            }}
          >
            {/* Header — glass with cyan accent line */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: headerAccentBg,
                borderBottom: `1px solid ${headerAccentBorder}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: iconCircleBg,
                    border: `1px solid ${iconCircleBorder}`,
                    color: '#2E94FF',
                  }}
                >
                  <AIIcon size={14} />
                </div>
                <span
                  style={{
                    fontSize: 12, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: titleColor,
                  }}
                >
                  AI Assistant
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: btnColor }}
                  onMouseEnter={e => { e.currentTarget.style.background = btnHoverBg; e.currentTarget.style.color = btnHoverColor; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = btnColor; }}
                >
                  <MinimizeIcon />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: btnColor }}
                  onMouseEnter={e => { e.currentTarget.style.background = btnHoverBg; e.currentTarget.style.color = btnHoverColor; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = btnColor; }}
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {/* Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    style={{ maxHeight: 350 }}
                  >
                    {messages.length === 0 && showSuggestions && (
                      <div className="space-y-3">
                        <p
                          className="text-xs text-center"
                          style={{ color: suggHintColor, fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          Try asking me to edit your Gantt chart:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.slice(0, 4).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-full transition-all"
                              style={{
                                background: suggBg,
                                color: suggColor,
                                border: `1px solid ${suggBorder}`,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = suggHoverBorder; e.currentTarget.style.color = '#2E94FF'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = suggBorder; e.currentTarget.style.color = suggColor; }}
                            >
                              {suggestion.length > 30
                                ? suggestion.slice(0, 30) + '...'
                                : suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                            message.role === 'user'
                              ? 'rounded-br-md'
                              : 'rounded-bl-md'
                          }`}
                          style={{
                            background:
                              message.role === 'user'
                                ? userMsgBg
                                : assistMsgBg,
                            color:
                              message.role === 'user'
                                ? '#2E94FF'
                                : assistMsgColor,
                            border: message.role === 'user'
                              ? `1px solid ${userMsgBorder}`
                              : `1px solid ${assistMsgBorder}`,
                          }}
                        >
                          {message.isLoading ? (
                            <LoadingDots />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}

                          {/* Command result badge */}
                          {message.command && (
                            <div
                              className="mt-2 text-xs px-2 py-1 rounded-md inline-flex items-center gap-1"
                              style={{
                                background: message.command.success
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                                color: message.command.success
                                  ? '#10B981'
                                  : '#EF4444',
                                border: `1px solid ${message.command.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                              }}
                            >
                              {message.command.success ? '✓' : '✗'}
                              <span className="capitalize">
                                {message.command.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={(e) => {
                      if (showMentionDropdown && filteredMentionUsers.length > 0) {
                        e.preventDefault();
                        return;
                      }
                      handleSubmit(e);
                    }}
                    className="p-3 relative"
                    style={{ borderTop: `1px solid ${inputAreaBorder}` }}
                  >
                    {/* @Mention Autocomplete Dropdown */}
                    <AnimatePresence>
                      {showMentionDropdown && filteredMentionUsers.length > 0 && (
                        <motion.div
                          ref={mentionDropdownRef}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute bottom-full left-3 right-3 mb-1 rounded-lg overflow-hidden z-10"
                          style={{
                            background: mentionDropBg,
                            border: `1px solid ${mentionDropBorder}`,
                            boxShadow: mentionDropShadow,
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          {filteredMentionUsers.map((user, idx) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectMention(user)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                              style={{
                                background: idx === mentionSelectedIndex
                                  ? mentionActiveBg
                                  : 'transparent',
                                color: mentionTextColor,
                              }}
                              onMouseEnter={() => setMentionSelectedIndex(idx)}
                            >
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                  background: mentionAvatarBg,
                                  border: `1px solid ${mentionAvatarBorder}`,
                                  color: '#2E94FF',
                                }}
                              >
                                {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.name}</div>
                                {user.email && (
                                  <div className="text-xs truncate" style={{ color: mentionEmailColor }}>
                                    {user.email}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className="flex items-center gap-2 rounded-xl px-4 py-2"
                      style={{
                        background: inputBoxBg,
                        border: `1px solid ${inputBoxBorder}`,
                      }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (handleMentionKeyDown(e)) return;
                        }}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: inputColor, fontFamily: 'Inter, sans-serif' }}
                      />
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="p-2 rounded-lg transition-all disabled:opacity-30"
                        style={{
                          background: inputValue.trim()
                            ? submitBg
                            : 'transparent',
                          color: inputValue.trim() ? '#2E94FF' : submitEmptyColor,
                          border: inputValue.trim() ? `1px solid ${submitBorder}` : '1px solid transparent',
                        }}
                      >
                        <SendIcon />
                      </button>
                    </div>
                    <p
                      className="text-[10px] text-center mt-2"
                      style={{ color: hintColor, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Enter to send · Esc to close
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default GanttAIAssistant;
