/**
 * Generate Gantt Tasks Dialog
 * AI-powered Gantt task generation with cost control
 */

import { useState, useRef, useEffect } from 'react'
import { Portal } from '../Portal'

export interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  duration: number
  progress: number
  dependencies: string[]
  type: string
  priority: 'high' | 'medium' | 'low'
}

export interface GeneratedTasksResponse {
  tasks: {
    tasks: GanttTask[]
  }
  from_cache: boolean
  tokens_used: number
  mock_mode?: boolean
  similarity?: number
  tokens_saved?: number
}

export interface GenerateGanttTasksDialogProps {
  /** Is dialog open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Tasks generated callback */
  onTasksGenerated: (tasks: GanttTask[]) => void
  /** Generate tasks function (calls Supabase Edge Function) */
  onGenerateTasks: (params: {
    prompt: string
    projectName?: string
    startDate?: string
    endDate?: string
  }) => Promise<GeneratedTasksResponse>
  /** Is AI loading */
  isLoading?: boolean
  /** Project ID (optional) */
  projectId?: string
  /** Project name (optional) */
  projectName?: string
}

export function GenerateGanttTasksDialog({
  isOpen,
  onClose,
  onTasksGenerated,
  onGenerateTasks,
  isLoading: externalLoading,
  projectName,
}: GenerateGanttTasksDialogProps) {
  const [prompt, setPrompt] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedTasks, setGeneratedTasks] = useState<GanttTask[] | null>(null)
  const [responseMetadata, setResponseMetadata] = useState<{
    from_cache: boolean
    tokens_used: number
    mock_mode?: boolean
    similarity?: number
    tokens_saved?: number
  } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = isGenerating || externalLoading

  // Focus input when dialog opens
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
      setStartDate('')
      setEndDate('')
      setError(null)
      setGeneratedTasks(null)
      setResponseMetadata(null)
      onClose()
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return

    setIsGenerating(true)
    setError(null)
    setGeneratedTasks(null)
    setResponseMetadata(null)

    try {
      const response = await onGenerateTasks({
        prompt: prompt.trim(),
        projectName: projectName || 'Mi Proyecto',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })

      setGeneratedTasks(response.tasks.tasks)
      setResponseMetadata({
        from_cache: response.from_cache,
        tokens_used: response.tokens_used,
        mock_mode: response.mock_mode,
        similarity: response.similarity,
        tokens_saved: response.tokens_saved,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyTasks = () => {
    if (generatedTasks) {
      onTasksGenerated(generatedTasks)
      handleClose()
    }
  }

  if (!isOpen) return null

  const similarity = responseMetadata?.similarity
    ? ((responseMetadata.similarity || 0) * 100).toFixed(0)
    : '0'

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-[100001] p-4">
        <div
          className="w-full max-w-3xl rounded-2xl shadow-2xl border max-h-[90vh] overflow-hidden flex flex-col"
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
                  <rect x="3" y="4" width="18" height="2" rx="1" fill="currentColor" />
                  <rect x="3" y="9" width="18" height="2" rx="1" fill="currentColor" />
                  <rect x="3" y="14" width="18" height="2" rx="1" fill="currentColor" />
                  <rect x="3" y="19" width="18" height="2" rx="1" fill="currentColor" />
                </svg>
                Generate Gantt Tasks with AI
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Describe your project and let AI create a complete task timeline
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
            {!generatedTasks ? (
              <>
                {/* Input Form */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Project Description *
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
                    Be as specific as possible. Include features, technologies, and any special
                    requirements.
                  </p>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/20 text-white outline-none focus:border-blue-500/50 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/20 text-white outline-none focus:border-blue-500/50 transition-all"
                      disabled={isLoading}
                    />
                  </div>
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
                {/* Generated Tasks Preview */}
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
                    <span className="font-semibold">Tasks Generated Successfully!</span>
                  </div>

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2">
                    {responseMetadata?.mock_mode && (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Mock Mode
                      </span>
                    )}
                    {responseMetadata?.from_cache ? (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        From Cache ({similarity}% similar)
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                        AI Generated
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {responseMetadata?.tokens_used || 0} tokens
                    </span>
                    {responseMetadata?.tokens_saved && (
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {responseMetadata.tokens_saved} tokens saved
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                      {generatedTasks.length} tasks
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {generatedTasks.map((task, i) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-white/50">#{i + 1}</span>
                              <p className="text-sm font-medium text-white/90">{task.name}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/60">
                              <span className="flex items-center gap-1">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  className="text-white/40"
                                >
                                  <rect
                                    x="1"
                                    y="2"
                                    width="10"
                                    height="8"
                                    rx="1"
                                    stroke="currentColor"
                                  />
                                  <path d="M1 4h10" stroke="currentColor" />
                                </svg>
                                {task.start} → {task.end}
                              </span>
                              <span>{task.duration} days</span>
                              {task.dependencies.length > 0 && (
                                <span className="text-blue-400">
                                  Depends: {task.dependencies.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              task.priority === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : task.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
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
              {!generatedTasks ? (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isLoading}
                  className="px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: '#ffffff',
                  }}
                >
                  {isLoading ? 'Generating...' : 'Generate Tasks'}
                </button>
              ) : (
                <button
                  onClick={handleApplyTasks}
                  className="px-6 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#ffffff',
                  }}
                >
                  Apply Tasks to Gantt
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
