/**
 * AI Usage Dashboard
 * Display AI usage statistics and costs
 */

import { useState, useEffect } from 'react'
import { aiUsageTracker, formatCost, type UsageStats } from '../../lib/ai/costs'
import { Portal } from '../Portal'

export interface AIUsageDashboardProps {
  /** Is dashboard open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Current plan tier */
  planTier?: 'hobby' | 'pro' | 'enterprise'
}

export function AIUsageDashboard({
  isOpen,
  onClose,
  planTier = 'hobby',
}: AIUsageDashboardProps) {
  const [stats, setStats] = useState<UsageStats>(aiUsageTracker.getStats())
  const [limit, setLimit] = useState(aiUsageTracker.checkLimit(planTier))

  // Update stats every second when open
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setStats(aiUsageTracker.getStats())
      setLimit(aiUsageTracker.checkLimit(planTier))
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, planTier])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isOpen) return null

  const recentOps = aiUsageTracker.getRecentOperations(5)

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000]"
        onClick={onClose}
      />

      {/* Dashboard */}
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
              <h2 className="text-xl font-bold text-white">AI Usage Dashboard</h2>
              <p className="text-sm text-white/60 mt-1">
                Monitor your AI consumption and costs
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Usage Limit */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white/90">
                  Monthly Usage ({planTier.toUpperCase()})
                </span>
                <span className="text-sm font-bold text-white">
                  {limit.used} / {limit.limit}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, limit.percentUsed)}%`,
                    background:
                      limit.percentUsed > 90
                        ? '#EF4444'
                        : limit.percentUsed > 70
                        ? '#F59E0B'
                        : '#10B981',
                  }}
                />
              </div>
              <p className="text-xs text-white/60 mt-2">
                {limit.remaining} operations remaining this month
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Cost */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Total Cost
                </p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {formatCost(stats.totalCost)}
                </p>
              </div>

              {/* Total Operations */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Operations
                </p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {stats.totalOperations}
                </p>
              </div>

              {/* Total Tokens */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Tokens Used
                </p>
                <p className="text-2xl font-bold text-purple-400 mt-1">
                  {(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {stats.totalInputTokens.toLocaleString()} in /{' '}
                  {stats.totalOutputTokens.toLocaleString()} out
                </p>
              </div>

              {/* Success Rate */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {(stats.successRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Avg: {stats.averageDuration.toFixed(0)}ms
                </p>
              </div>
            </div>

            {/* Operations by Feature */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Usage by Feature</h3>
              <div className="space-y-2">
                {Object.entries(stats.operationsByFeature).map(([feature, count]) => {
                  const cost = stats.costsByFeature[feature] || 0
                  const percent =
                    stats.totalOperations > 0
                      ? (count / stats.totalOperations) * 100
                      : 0

                  return (
                    <div key={feature} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white/90 capitalize">
                          {feature.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/60">{count} ops</span>
                          <span className="text-xs font-semibold text-green-400">
                            {formatCost(cost)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Operations */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">Recent Operations</h3>
              {recentOps.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-8">
                  No operations yet. Start using AI features!
                </p>
              ) : (
                <div className="space-y-2">
                  {recentOps.map((op) => (
                    <div
                      key={op.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white/90 capitalize">
                          {op.feature.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {new Date(op.timestamp).toLocaleTimeString()} •{' '}
                          {op.duration}ms
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/60">
                          {op.inputTokens + op.outputTokens} tokens
                        </span>
                        <span className="text-xs font-semibold text-green-400">
                          {formatCost(op.cost)}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            op.success ? 'bg-green-400' : 'bg-red-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-white/50">
              Costs are estimates. Actual API charges may vary.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-white/10 text-white/80"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
