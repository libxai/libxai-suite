/**
 * CardTemplateSelector Component
 * Dropdown to select and apply card templates
 * @module components/Templates
 */

import { useState, useRef, useEffect } from 'react'
import type { CardTemplate } from '../../types'
import { cn } from '../../utils'

export interface CardTemplateSelectorProps {
  /** Available templates */
  templates: CardTemplate[]
  /** Template selection handler */
  onSelectTemplate: (template: CardTemplate) => void
  /** Custom className */
  className?: string
}

/**
 * Default card templates
 */
export const DEFAULT_TEMPLATES: CardTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Report a bug or issue',
    icon: '🐛',
    category: 'Development',
    template: {
      title: '[BUG] ',
      description: '**Steps to reproduce:**\n1. \n\n**Expected behavior:**\n\n**Actual behavior:**\n\n**Screenshots:**',
      priority: 'HIGH',
      labels: ['bug'],
    },
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    description: 'Propose a new feature',
    icon: '✨',
    category: 'Development',
    template: {
      title: '[FEATURE] ',
      description: '**Problem:**\n\n**Proposed solution:**\n\n**Alternatives considered:**\n\n**Additional context:**',
      priority: 'MEDIUM',
      labels: ['feature', 'enhancement'],
    },
  },
  {
    id: 'task',
    name: 'Task',
    description: 'General task or to-do',
    icon: '📝',
    category: 'General',
    template: {
      title: '',
      description: '**Objective:**\n\n**Acceptance criteria:**\n- [ ] \n\n**Notes:**',
      priority: 'MEDIUM',
    },
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Investigation or research task',
    icon: '🔬',
    category: 'General',
    template: {
      title: '[RESEARCH] ',
      description: '**Goal:**\n\n**Questions to answer:**\n- \n\n**Resources:**\n- \n\n**Findings:**',
      priority: 'LOW',
      labels: ['research'],
    },
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Documentation task',
    icon: '📚',
    category: 'Documentation',
    template: {
      title: '[DOCS] ',
      description: '**What needs to be documented:**\n\n**Target audience:**\n\n**Key points:**\n- ',
      priority: 'LOW',
      labels: ['documentation'],
    },
  },
  {
    id: 'meeting',
    name: 'Meeting',
    description: 'Meeting or discussion',
    icon: '💬',
    category: 'Communication',
    template: {
      title: 'Meeting: ',
      description: '**Date & Time:**\n\n**Participants:**\n- \n\n**Agenda:**\n1. \n\n**Action items:**\n- [ ] ',
      priority: 'MEDIUM',
      labels: ['meeting'],
    },
  },
]

/**
 * CardTemplateSelector Component
 */
export function CardTemplateSelector({
  templates,
  onSelectTemplate,
  className,
}: CardTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  const handleSelect = (template: CardTemplate) => {
    onSelectTemplate(template)
    setIsOpen(false)
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, CardTemplate[]>)

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium shadow-lg"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-primary)',
          color: 'var(--theme-text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
          e.currentTarget.style.borderColor = 'var(--theme-border-secondary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'
          e.currentTarget.style.borderColor = 'var(--theme-border-primary)'
        }}
        title="Create from template"
      >
        <span className="text-base leading-none">📋</span>
        <span>Templates</span>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-2 min-w-[320px] max-w-[400px] rounded-xl backdrop-blur-xl border shadow-2xl z-50 overflow-hidden max-h-[500px] overflow-y-auto"
          style={{
            backgroundColor: 'var(--theme-bg-primary)',
            borderColor: 'var(--theme-border-primary)',
          }}
        >
          <div
            className="px-4 py-3 border-b sticky top-0 backdrop-blur-sm"
            style={{
              borderColor: 'var(--theme-border-primary)',
              backgroundColor: 'var(--theme-bg-secondary)',
            }}
          >
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Card Templates
            </span>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Quick start with pre-configured cards
            </p>
          </div>

          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="py-2">
              <div className="px-4 py-2">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  {category}
                </h4>
              </div>
              <div>
                {categoryTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left transition-all active:scale-[0.98]"
                    style={{ color: 'var(--theme-text-primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <span className="text-2xl leading-none mt-0.5">
                      {template.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-sm"
                        style={{ color: 'var(--theme-text-primary)' }}
                      >
                        {template.name}
                      </div>
                      {template.description && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--theme-text-tertiary)' }}
                        >
                          {template.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div
              className="px-4 py-8 text-center"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              <p className="text-sm">No templates available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
