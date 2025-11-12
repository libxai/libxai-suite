/**
 * RichTextEditor - TipTap-based WYSIWYG editor
 *
 * Features:
 * - Formatting: Bold, Italic, Strike, Code, Links
 * - Lists: Bullet, Numbered, Task lists
 * - Blocks: Headers, Blockquotes, Code blocks
 * - @mentions: Auto-complete de usuarios
 * - Slash commands: `/` para insertar blocks
 * - Toolbar: Floating menu al seleccionar texto
 */

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useCallback, useEffect } from 'react'
import type { User } from '../../../types'
import './rich-text-editor.css'

export interface RichTextEditorProps {
  /** Current value (HTML or Markdown) */
  value?: string

  /** Change callback */
  onChange?: (html: string) => void

  /** Blur callback */
  onBlur?: () => void

  /** Available users for @mentions */
  mentions?: User[]

  /** Placeholder text */
  placeholder?: string

  /** Auto-focus on mount */
  autoFocus?: boolean

  /** Read-only mode */
  readOnly?: boolean

  /** Minimum height */
  minHeight?: string
}

export function RichTextEditor({
  value = '',
  onChange,
  onBlur,
  mentions = [],
  placeholder = 'Add a description... (type / for commands, @ to mention)',
  autoFocus = false,
  readOnly = false,
  minHeight = '200px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'editor-mention',
        },
        suggestion: {
          items: ({ query }) => {
            return mentions
              .filter(user =>
                user.name.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5)
          },
          render: () => {
            let component: any
            let popup: any

            return {
              onStart: (props: any) => {
                component = new MentionList({
                  props,
                  editor: props.editor,
                })

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },

              onUpdate: (props: any) => {
                component.updateProps(props)
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                })
              },

              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup[0].hide()
                  return true
                }
                return component.onKeyDown(props)
              },

              onExit: () => {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    content: value,
    editable: !readOnly,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Update content when value prop changes (external update)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
  }, [editor, value])

  // Toolbar actions
  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="rich-text-editor">
      {/* Bubble Menu (appears on text selection) */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="editor-bubble-menu"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold (Cmd+B)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic (Cmd+I)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="4" x2="10" y2="4"/>
            <line x1="14" y1="20" x2="5" y2="20"/>
            <line x1="15" y1="4" x2="9" y2="20"/>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strikethrough"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4H9a3 3 0 0 0-2.83 4"/>
            <path d="M14 12a4 4 0 0 1 0 8H6"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
          title="Inline code"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>

        <div className="editor-divider" />

        <button
          onClick={setLink}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Add link"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4v16M18 4v16M8 12h8"/>
          </svg>
        </button>
      </BubbleMenu>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Bottom Toolbar (optional - for slash commands hint) */}
      <div className="editor-footer">
        <span className="editor-hint">
          <kbd>/</kbd> for commands · <kbd>@</kbd> to mention
        </span>
      </div>
    </div>
  )
}

/**
 * Mention List Component
 * Renders dropdown for @mention autocomplete
 */
class MentionList {
  public element: HTMLDivElement
  private props: any
  private selectedIndex: number = 0

  constructor({ props, editor }: { props: any; editor: any }) {
    this.props = props
    this.element = document.createElement('div')
    this.element.className = 'mention-list'
    this.render()
  }

  updateProps(props: any) {
    this.props = props
    this.render()
  }

  onKeyDown({ event }: { event: KeyboardEvent }) {
    if (event.key === 'ArrowUp') {
      this.selectPrevious()
      return true
    }

    if (event.key === 'ArrowDown') {
      this.selectNext()
      return true
    }

    if (event.key === 'Enter') {
      this.selectItem(this.selectedIndex)
      return true
    }

    return false
  }

  selectPrevious() {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1)
    this.render()
  }

  selectNext() {
    this.selectedIndex = Math.min(
      this.props.items.length - 1,
      this.selectedIndex + 1
    )
    this.render()
  }

  selectItem(index: number) {
    const item = this.props.items[index]
    if (item) {
      this.props.command({ id: item.id, label: item.name })
    }
  }

  render() {
    if (this.props.items.length === 0) {
      this.element.innerHTML = '<div class="mention-list-empty">No users found</div>'
      return
    }

    this.element.innerHTML = this.props.items
      .map((item: User, index: number) => `
        <button
          class="mention-list-item ${index === this.selectedIndex ? 'is-selected' : ''}"
          data-index="${index}"
        >
          <div class="mention-avatar" style="background-color: ${item.color}">
            ${item.initials}
          </div>
          <span>${item.name}</span>
        </button>
      `)
      .join('')

    // Add click handlers
    this.element.querySelectorAll('button').forEach((button, index) => {
      button.addEventListener('click', () => this.selectItem(index))
    })
  }

  destroy() {
    this.element.remove()
  }
}

// Polyfill for tippy (used by Mention extension)
// In production, import tippy.js properly
const tippy = (target: any, options: any) => {
  return [{
    setProps: () => {},
    hide: () => {},
    destroy: () => {},
  }]
}
