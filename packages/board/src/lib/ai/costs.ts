/**
 * AI Cost Tracking
 * Calculate and track AI API usage costs
 */

import { AI_MODELS, type AIModelKey } from './config'

export interface AIOperation {
  id: string
  feature: 'generatePlan' | 'predictRisks' | 'suggestAssignee' | 'generateSubtasks' | 'estimateEffort'
  model: AIModelKey
  inputTokens: number
  outputTokens: number
  cost: number
  duration: number
  timestamp: Date
  success: boolean
  error?: string
}

export interface UsageStats {
  totalOperations: number
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  operationsByFeature: Record<string, number>
  costsByFeature: Record<string, number>
  averageDuration: number
  successRate: number
}

/**
 * Calculate cost for an AI operation
 */
export function calculateCost(
  model: AIModelKey,
  inputTokens: number,
  outputTokens: number
): number {
  const modelInfo = AI_MODELS[model]
  if (!modelInfo) {
    throw new Error(`Unknown model: ${model}`)
  }

  const inputCost = (inputTokens / 1000) * modelInfo.costPer1kInput
  const outputCost = (outputTokens / 1000) * modelInfo.costPer1kOutput

  return inputCost + outputCost
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

/**
 * AI Usage Tracker
 * In-memory tracking of AI operations
 * In production, this would persist to a database
 */
export class AIUsageTracker {
  private operations: AIOperation[] = []
  private listeners: Array<(operation: AIOperation) => void> = []

  /**
   * Record a new AI operation
   */
  record(operation: Omit<AIOperation, 'id' | 'timestamp' | 'cost'>): AIOperation {
    const cost = calculateCost(operation.model, operation.inputTokens, operation.outputTokens)

    const fullOperation: AIOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      cost,
    }

    this.operations.push(fullOperation)

    // Notify listeners
    this.listeners.forEach((listener) => listener(fullOperation))

    // Keep only last 1000 operations in memory
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000)
    }

    return fullOperation
  }

  /**
   * Get usage statistics
   */
  getStats(timeRange?: { start: Date; end: Date }): UsageStats {
    let operations = this.operations

    // Filter by time range if provided
    if (timeRange) {
      operations = operations.filter(
        (op) => op.timestamp >= timeRange.start && op.timestamp <= timeRange.end
      )
    }

    const totalOperations = operations.length
    const totalCost = operations.reduce((sum, op) => sum + op.cost, 0)
    const totalInputTokens = operations.reduce((sum, op) => sum + op.inputTokens, 0)
    const totalOutputTokens = operations.reduce((sum, op) => sum + op.outputTokens, 0)
    const successfulOps = operations.filter((op) => op.success)
    const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0)

    // Operations by feature
    const operationsByFeature: Record<string, number> = {}
    const costsByFeature: Record<string, number> = {}

    operations.forEach((op) => {
      operationsByFeature[op.feature] = (operationsByFeature[op.feature] || 0) + 1
      costsByFeature[op.feature] = (costsByFeature[op.feature] || 0) + op.cost
    })

    return {
      totalOperations,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      operationsByFeature,
      costsByFeature,
      averageDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
      successRate: totalOperations > 0 ? successfulOps.length / totalOperations : 0,
    }
  }

  /**
   * Get recent operations
   */
  getRecentOperations(limit = 10): AIOperation[] {
    return this.operations.slice(-limit).reverse()
  }

  /**
   * Check if usage is within limits
   */
  checkLimit(planTier: 'hobby' | 'pro' | 'enterprise', period: 'month' | 'day' = 'month'): {
    used: number
    limit: number
    remaining: number
    percentUsed: number
    isExceeded: boolean
  } {
    const limits = {
      hobby: { month: 50, day: 5 },
      pro: { month: 500, day: 50 },
      enterprise: { month: 2000, day: 200 },
    }

    const limit = limits[planTier][period]

    // Calculate operations in the period
    const now = new Date()
    const start = new Date()
    if (period === 'month') {
      start.setMonth(now.getMonth() - 1)
    } else {
      start.setDate(now.getDate() - 1)
    }

    const periodOperations = this.operations.filter((op) => op.timestamp >= start).length

    const remaining = Math.max(0, limit - periodOperations)
    const percentUsed = (periodOperations / limit) * 100

    return {
      used: periodOperations,
      limit,
      remaining,
      percentUsed,
      isExceeded: periodOperations >= limit,
    }
  }

  /**
   * Subscribe to operation events
   */
  subscribe(listener: (operation: AIOperation) => void): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Clear all tracked operations
   */
  clear(): void {
    this.operations = []
  }

  /**
   * Export operations as JSON
   */
  export(): string {
    return JSON.stringify(this.operations, null, 2)
  }
}

/**
 * Global usage tracker instance
 */
export const aiUsageTracker = new AIUsageTracker()

/**
 * Estimate cost for a feature before execution
 */
export function estimateFeatureCost(
  feature: AIOperation['feature'],
  model: AIModelKey = 'claude-3-5-sonnet-20241022'
): { estimatedCost: string; estimatedTokens: number } {
  // Rough estimates based on typical usage
  const tokenEstimates = {
    generatePlan: 2500,
    predictRisks: 1800,
    suggestAssignee: 1000,
    generateSubtasks: 1200,
    estimateEffort: 800,
  }

  const tokens = tokenEstimates[feature]
  // Assume 60/40 split between input/output
  const inputTokens = Math.floor(tokens * 0.6)
  const outputTokens = Math.floor(tokens * 0.4)

  const cost = calculateCost(model, inputTokens, outputTokens)

  return {
    estimatedCost: formatCost(cost),
    estimatedTokens: tokens,
  }
}
