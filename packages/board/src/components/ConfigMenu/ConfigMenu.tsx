import { useState, useRef, useEffect } from 'react'
import { cn } from '../../utils'

export interface ConfigMenuProps {
  onOpenExport: () => void
  onOpenThemes: () => void
  onOpenShortcuts: () => void
  className?: string
  // v0.8.1: Gantt-specific exports
  viewMode?: 'kanban' | 'gantt'
  onExportGanttPDF?: () => Promise<void>
  onExportGanttExcel?: () => Promise<void>
  onExportGanttPNG?: () => Promise<void>
  onExportGanttCSV?: () => void
}

export function ConfigMenu({
  onOpenExport,
  onOpenThemes,
  onOpenShortcuts,
  className,
  viewMode = 'kanban',
  onExportGanttPDF,
  onExportGanttExcel,
  onExportGanttPNG,
  onExportGanttCSV,
}: ConfigMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleItemClick = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-primary)',
          color: 'var(--theme-text-secondary)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
          e.currentTarget.style.color = 'var(--theme-text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'
          e.currentTarget.style.color = 'var(--theme-text-secondary)'
        }}
        aria-label="Configuration Menu"
        aria-expanded={isOpen}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" />
        </svg>
        <span>Config</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-primary)',
          }}
        >
          {/* v0.8.1: Show different export options based on view mode */}
          {viewMode === 'kanban' ? (
            <button
              onClick={() => handleItemClick(onOpenExport)}
              className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
              style={{ color: 'var(--theme-text-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export
            </button>
          ) : (
            <>
              <button
                onClick={() => handleItemClick(async () => await onExportGanttPDF?.())}
                className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                style={{ color: 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => handleItemClick(async () => await onExportGanttExcel?.())}
                className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                style={{ color: 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Export Excel
              </button>
              <button
                onClick={() => handleItemClick(async () => await onExportGanttPNG?.())}
                className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                style={{ color: 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Export PNG
              </button>
              <button
                onClick={() => handleItemClick(() => onExportGanttCSV?.())}
                className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                style={{ color: 'var(--theme-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
                Export CSV
              </button>
            </>
          )}

          <button
            onClick={() => handleItemClick(onOpenThemes)}
            className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
            style={{ color: 'var(--theme-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v6m0 6v6m8.5-8.5L17 15M7 9L3.5 5.5M7 15l-3.5 3.5M20.5 5.5L17 9m3.5 11.5L17 17" />
            </svg>
            Themes
          </button>

          <button
            onClick={() => handleItemClick(onOpenShortcuts)}
            className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
            style={{ color: 'var(--theme-text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            Shortcuts
          </button>
        </div>
      )}
    </div>
  )
}
