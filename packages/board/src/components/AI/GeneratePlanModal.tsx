/**
 * Generate Plan Modal
 * AI-powered project plan generation
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'
import type { GeneratedPlan } from '../../types'

export interface GeneratePlanModalProps {
  /** Is modal open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Plan generated callback */
  onPlanGenerated: (plan: GeneratedPlan) => void
  /** Generate plan function (from useAI hook) */
  onGeneratePlan: (prompt: string) => Promise<GeneratedPlan>
  /** Is AI loading */
  isLoading?: boolean
}

export function GeneratePlanModal({
  isOpen,
  onClose,
  onPlanGenerated,
  onGeneratePlan,
  isLoading: externalLoading,
}: GeneratePlanModalProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = isGenerating || externalLoading

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, isLoading])

  const handleClose = () => {
    if (!isLoading) {
      setPrompt('')
      setError(null)
      setGeneratedPlan(null)
      onClose()
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return

    setIsGenerating(true)
    setError(null)
    setGeneratedPlan(null)

    try {
      const plan = await onGeneratePlan(prompt.trim())
      setGeneratedPlan(plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyPlan = () => {
    if (generatedPlan) {
      onPlanGenerated(generatedPlan)
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[100001] p-4">
        <div
          className="w-full max-w-2xl rounded-2xl shadow-2xl border max-h-[90vh] overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(135deg, #1f1f1f 0%, #1a1a1a 100%)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-blue-400"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Generate Project Plan with AI
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Describe your project and let AI create a complete Kanban board
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!generatedPlan ? (
              <>
                {/* Input */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Project Description
                  </label>
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: Build a mobile app for tracking fitness goals with user authentication, workout logging, progress charts, and social features..."
                    className="w-full h-32 px-4 py-3 rounded-lg text-sm bg-white/5 border border-white/20 text-white placeholder-white/40 outline-none focus:border-blue-500/50 transition-all resize-none"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-white/50 mt-2">
                    Be as specific as possible. Include features, technologies, and any special requirements.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Examples */}
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Example Prompts
                  </p>
                  <div className="space-y-2">
                    {[
                      'Build an e-commerce platform with product catalog, shopping cart, payment integration, and order tracking',
                      'Create a task management app with team collaboration, real-time updates, file attachments, and notifications',
                      'Develop a blog platform with markdown editor, SEO optimization, comments system, and analytics dashboard',
                    ].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(example)}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/5 transition-all border border-white/10 hover:border-white/20 disabled:opacity-50"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Generated Plan Preview */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M4 10L8 14L16 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="font-semibold">Plan Generated Successfully!</span>
                  </div>

                  {/* Explanation */}
                  {generatedPlan.explanation && (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-sm text-white/90">{generatedPlan.explanation}</p>
                    </div>
                  )}

                  {/* Columns */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-2">
                      Columns ({generatedPlan.columns.length})
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {generatedPlan.columns.map((col, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/20 text-sm text-white/80"
                        >
                          {col.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cards */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-2">
                      Tasks ({generatedPlan.cards.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {generatedPlan.cards.slice(0, 10).map((card, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white/90">{card.title}</p>
                              {card.description && (
                                <p className="text-xs text-white/60 mt-1 line-clamp-2">
                                  {card.description}
                                </p>
                              )}
                            </div>
                            {card.priority && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  card.priority === 'URGENT'
                                    ? 'bg-red-500/20 text-red-400'
                                    : card.priority === 'HIGH'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : card.priority === 'MEDIUM'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {card.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {generatedPlan.cards.length > 10 && (
                        <p className="text-xs text-white/50 text-center py-2">
                          +{generatedPlan.cards.length - 10} more tasks...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div>
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Generating with AI...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-white/10 text-white/80 disabled:opacity-50"
              >
                Cancel
              </button>
              {!generatedPlan ? (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isLoading}
                  className="px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: '#ffffff',
                  }}
                >
                  {isLoading ? 'Generating...' : 'Generate Plan'}
                </button>
              ) : (
                <button
                  onClick={handleApplyPlan}
                  className="px-6 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#ffffff',
                  }}
                >
                  Apply Plan to Board
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
