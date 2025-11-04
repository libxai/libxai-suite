import { useTheme } from '../../theme/ThemeProvider'
import { themes } from '../../theme/themes'
import { cn } from '../../utils'

export interface ThemeModalProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ThemeModal({ isOpen, onClose, className }: ThemeModalProps) {
  const { theme, setTheme } = useTheme()

  if (!isOpen) return null

  return (
    <div className={cn('fixed inset-0 z-[9999] flex items-center justify-center', className)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative rounded-2xl border shadow-2xl max-w-md w-full mx-4"
        style={{
          backgroundColor: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-primary)',
        }}
      >
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-border-primary)' }}>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Select Theme
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none p-2 hover:bg-white/10 rounded-lg transition-colors"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-3">
          {Object.entries(themes).map(([key, themeData]) => (
            <button
              key={key}
              onClick={() => {
                setTheme(key as any)
                onClose()
              }}
              className={cn(
                'w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4',
                theme === key
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/20 hover:border-white/40'
              )}
              style={{
                backgroundColor: theme === key ? 'var(--theme-accent-primary)20' : 'transparent',
              }}
            >
              <div className="text-3xl">{themeData.emoji}</div>
              <div className="text-left flex-1">
                <div className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {themeData.displayName}
                </div>
                <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  {key === 'dark' && 'Default dark theme with Linear-inspired colors'}
                  {key === 'light' && 'Clean light theme with high contrast'}
                  {key === 'neutral' && 'Monochrome zen theme'}
                </div>
              </div>
              {theme === key && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
