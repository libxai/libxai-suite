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

// Sparkle/AI icon component
const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    <circle cx="12" cy="12" r="4" />
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

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    enabled = true,
    placeholder = 'Ask AI to edit tasks... (e.g., "Move Design to next week")',
    position = 'bottom-right',
    onCommand,
    suggestions = DEFAULT_SUGGESTIONS,
    maxHistory = 50,
    persistHistory,
  } = config;

  // Get storage key for localStorage
  const storageKey = persistHistory?.storageKey || 'gantt-ai-history';
  const persistMaxMessages = persistHistory?.maxMessages ?? 5;

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
      {/* Floating AI Assistant Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`fixed ${positionClasses[position]} z-[99999] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-colors`}
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            }}
            onClick={() => setIsOpen(true)}
          >
            <AIIcon />
            <span className="text-sm font-medium">AI Assistant</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/20">
              ⌘K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
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
            className={`fixed ${positionClasses[position]} z-[99999] w-96 rounded-2xl overflow-hidden shadow-2xl flex flex-col`}
            style={{
              background: theme.bgPrimary,
              border: `1px solid ${theme.border}`,
              boxShadow: `0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px ${theme.border}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              }}
            >
              <div className="flex items-center gap-2 text-white">
                <AIIcon />
                <span className="font-semibold">Gantt AI Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized((prev) => !prev)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <MinimizeIcon />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
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
                          className="text-sm text-center"
                          style={{ color: theme.textSecondary }}
                        >
                          Try asking me to edit your Gantt chart:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestions.slice(0, 4).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-full transition-colors"
                              style={{
                                background: theme.bgSecondary,
                                color: theme.textSecondary,
                                border: `1px solid ${theme.border}`,
                              }}
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
                                ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                                : theme.bgSecondary,
                            color:
                              message.role === 'user'
                                ? 'white'
                                : theme.textPrimary,
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
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(239, 68, 68, 0.2)',
                                color: message.command.success
                                  ? '#10B981'
                                  : '#EF4444',
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
                    onSubmit={handleSubmit}
                    className="p-3 border-t"
                    style={{ borderColor: theme.border }}
                  >
                    <div
                      className="flex items-center gap-2 rounded-xl px-4 py-2"
                      style={{
                        background: theme.bgSecondary,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: theme.textPrimary }}
                      />
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="p-2 rounded-lg transition-all disabled:opacity-50"
                        style={{
                          background: inputValue.trim()
                            ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                            : 'transparent',
                          color: inputValue.trim() ? 'white' : theme.textSecondary,
                        }}
                      >
                        <SendIcon />
                      </button>
                    </div>
                    <p
                      className="text-[10px] text-center mt-2"
                      style={{ color: theme.textTertiary }}
                    >
                      Press Enter to send • Esc to close
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
