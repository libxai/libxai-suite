/**
 * MarkdownEditor - Modern markdown editor with live preview
 *
 * Features:
 * - Dual mode: Edit + Preview
 * - Toolbar with common formatting
 * - GitHub Flavored Markdown (GFM) support
 * - Syntax highlighting for code blocks
 * - Keyboard shortcuts for formatting
 * - Sanitized HTML output for security
 *
 * Philosophy: Linear-inspired, fast and distraction-free
 */

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Bold, Italic, Code, Link, List, ListOrdered, Eye, Edit3 } from 'lucide-react'
import './markdown-editor.css'

export interface MarkdownEditorProps {
  /** Current markdown value */
  value: string

  /** Change callback */
  onChange: (value: string) => void

  /** Blur callback */
  onBlur?: () => void

  /** Placeholder text */
  placeholder?: string

  /** Minimum height in pixels */
  minHeight?: number

  /** Whether to show toolbar */
  showToolbar?: boolean

  /** Whether to start in preview mode */
  defaultMode?: 'edit' | 'preview'

  /** Auto-focus on mount */
  autoFocus?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Write something...',
  minHeight = 200,
  showToolbar = true,
  defaultMode = 'edit',
  autoFocus = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>(defaultMode)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Insert markdown syntax at cursor
  const insertMarkdown = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)
      const textToInsert = selectedText || placeholder

      const newValue =
        value.substring(0, start) +
        before +
        textToInsert +
        after +
        value.substring(end)

      onChange(newValue)

      // Set cursor position after insertion
      setTimeout(() => {
        const newCursorPos = start + before.length + textToInsert.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)
    },
    [value, onChange]
  )

  // Toolbar actions
  const handleBold = () => insertMarkdown('**', '**', 'bold text')
  const handleItalic = () => insertMarkdown('*', '*', 'italic text')
  const handleCode = () => insertMarkdown('`', '`', 'code')
  const handleLink = () => insertMarkdown('[', '](https://example.com)', 'link text')
  const handleList = () => insertMarkdown('- ', '', 'list item')
  const handleOrderedList = () => insertMarkdown('1. ', '', 'list item')

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            handleBold()
            break
          case 'i':
            e.preventDefault()
            handleItalic()
            break
          case 'k':
            e.preventDefault()
            handleLink()
            break
          case 'e':
            e.preventDefault()
            handleCode()
            break
        }
      }

      // Cmd/Ctrl + Shift + P for preview toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
      }
    },
    [handleBold, handleItalic, handleLink, handleCode]
  )

  return (
    <div className="markdown-editor">
      {showToolbar && (
        <div className="markdown-editor__toolbar">
          <div className="markdown-editor__toolbar-group">
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleBold}
              title="Bold (Cmd+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleItalic}
              title="Italic (Cmd+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleCode}
              title="Inline code (Cmd+E)"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          <div className="markdown-editor__toolbar-divider" />

          <div className="markdown-editor__toolbar-group">
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleLink}
              title="Link (Cmd+K)"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleList}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="markdown-editor__toolbar-btn"
              onClick={handleOrderedList}
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          <div className="markdown-editor__toolbar-spacer" />

          <div className="markdown-editor__toolbar-group">
            <button
              type="button"
              className={`markdown-editor__toolbar-btn ${
                mode === 'edit' ? 'markdown-editor__toolbar-btn--active' : ''
              }`}
              onClick={() => setMode('edit')}
              title="Edit mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`markdown-editor__toolbar-btn ${
                mode === 'preview' ? 'markdown-editor__toolbar-btn--active' : ''
              }`}
              onClick={() => setMode('preview')}
              title="Preview mode (Cmd+Shift+P)"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="markdown-editor__content" style={{ minHeight: `${minHeight}px` }}>
        {mode === 'edit' || mode === 'split' ? (
          <textarea
            ref={textareaRef}
            className="markdown-editor__textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            style={{ minHeight: `${minHeight}px` }}
          />
        ) : null}

        {mode === 'preview' && (
          <div className="markdown-editor__preview">
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                components={{
                  // Custom component overrides for better styling
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="markdown-editor__empty">Nothing to preview</p>
            )}
          </div>
        )}
      </div>

      {showToolbar && (
        <div className="markdown-editor__footer">
          <span className="markdown-editor__hint">
            Markdown supported • Cmd+B bold • Cmd+I italic • Cmd+K link
          </span>
        </div>
      )}
    </div>
  )
}
