/**
 * useAI Hook - REAL Implementation
 * Full AI features using Vercel AI SDK with OpenAI/Anthropic
 * @module hooks/useAI
 */

import { useCallback, useState } from 'react'
import { z } from 'zod'
import { generateObject, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type {
  AICallbacks,
  Board,
  Card,
  GeneratedPlan,
  AssigneeSuggestion,
  Insight,
} from '../types'
import {
  generatePlanPrompt,
  suggestAssigneePrompt,
  predictRisksPrompt,
  generateSubtasksPrompt,
  estimateEffortPrompt,
  GENERATE_PLAN_SYSTEM_PROMPT,
  SUGGEST_ASSIGNEE_SYSTEM_PROMPT,
  PREDICT_RISKS_SYSTEM_PROMPT,
  GENERATE_SUBTASKS_SYSTEM_PROMPT,
  ESTIMATE_EFFORT_SYSTEM_PROMPT,
} from '../lib/ai/prompts'
import { aiUsageTracker } from '../lib/ai/costs'
import type { AIModelKey } from '../lib/ai/config'

export interface UseAIOptions {
  /** API key for AI provider */
  apiKey?: string
  /** Model to use */
  model?: AIModelKey | string
  /** Provider (openai or anthropic) */
  provider?: 'openai' | 'anthropic'
  /** Base URL (optional) */
  baseURL?: string
}

export interface UseAIReturn extends AICallbacks {
  /** Is AI available */
  isAvailable: boolean
  /** Is AI currently processing */
  isLoading: boolean
  /** Last error */
  error: Error | null
}

// Zod schemas for AI responses
const columnSchema = z.object({
  title: z.string(),
  position: z.number(),
  wipLimit: z.number().optional(),
})

const cardSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  position: z.number(),
  columnId: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  labels: z.array(z.string()).optional(),
  estimatedHours: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
})

const planSchema = z.object({
  columns: z.array(columnSchema),
  cards: z.array(cardSchema),
  explanation: z.string().optional(),
})

const assigneeSuggestionSchema = z.object({
  userId: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

const insightSchema = z.object({
  type: z.enum([
    'RISK_DELAY',
    'RISK_OVERLOAD',
    'RISK_BLOCKER',
    'OPPORTUNITY_OPTIMIZATION',
    'PATTERN_ANOMALY',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedAction: z.string().optional(),
  relatedCardIds: z.array(z.string()).optional(),
  relatedColumnIds: z.array(z.string()).optional(),
})

const subtaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  position: z.number(),
  columnId: z.string(),
  estimatedHours: z.number().optional(),
})

const effortEstimateSchema = z.object({
  hours: z.number(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
})

/**
 * Hook for AI features with REAL implementation
 */
export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { apiKey, provider = 'anthropic', model: modelName } = options

  const isAvailable = Boolean(apiKey)

  // Get AI model provider
  const getModel = useCallback(() => {
    if (!apiKey) {
      throw new Error('API key is required')
    }

    const defaultModels = {
      openai: 'gpt-4-turbo',
      anthropic: 'claude-3-5-sonnet-20241022',
    }

    const model = modelName || defaultModels[provider]

    if (provider === 'openai') {
      return openai(model, { apiKey })
    } else {
      return anthropic(model, { apiKey })
    }
  }, [apiKey, provider, modelName])

  // Feature 1: Generate Plan
  const onGeneratePlan = useCallback(
    async (prompt: string): Promise<GeneratedPlan> => {
      if (!isAvailable) {
        throw new Error('AI features require an API key')
      }

      setIsLoading(true)
      setError(null)
      const startTime = Date.now()

      try {
        const result = await generateObject({
          model: getModel(),
          system: GENERATE_PLAN_SYSTEM_PROMPT,
          prompt: generatePlanPrompt(prompt),
          schema: planSchema,
        })

        const duration = Date.now() - startTime

        // Track usage
        aiUsageTracker.record({
          feature: 'generatePlan',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          duration,
          success: true,
        })

        return result.object as GeneratedPlan
      } catch (err) {
        const duration = Date.now() - startTime
        const error = err instanceof Error ? err : new Error('Failed to generate plan')

        aiUsageTracker.record({
          feature: 'generatePlan',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: 0,
          outputTokens: 0,
          duration,
          success: false,
          error: error.message,
        })

        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, getModel, modelName]
  )

  // Feature 3: Suggest Assignee
  const onSuggestAssignee = useCallback(
    async (card: Card): Promise<AssigneeSuggestion> => {
      if (!isAvailable) {
        throw new Error('AI features not available')
      }

      setIsLoading(true)
      setError(null)
      const startTime = Date.now()

      try {
        // For now, use mock data for available users
        // In real implementation, this would come from props
        const mockUsers = [
          { id: 'user-1', name: 'Alex Chen', skills: ['frontend', 'react'] },
          { id: 'user-2', name: 'Sarah Johnson', skills: ['backend', 'node'] },
          { id: 'user-3', name: 'Mike Rodriguez', skills: ['fullstack', 'devops'] },
        ]

        const result = await generateObject({
          model: getModel(),
          system: SUGGEST_ASSIGNEE_SYSTEM_PROMPT,
          prompt: suggestAssigneePrompt(
            card.title,
            card.description,
            card.priority,
            mockUsers,
            { 'user-1': 3, 'user-2': 5, 'user-3': 2 }
          ),
          schema: assigneeSuggestionSchema,
        })

        const duration = Date.now() - startTime

        aiUsageTracker.record({
          feature: 'suggestAssignee',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          duration,
          success: true,
        })

        return result.object as AssigneeSuggestion
      } catch (err) {
        const duration = Date.now() - startTime
        const error = err instanceof Error ? err : new Error('Failed to suggest assignee')

        aiUsageTracker.record({
          feature: 'suggestAssignee',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: 0,
          outputTokens: 0,
          duration,
          success: false,
          error: error.message,
        })

        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, getModel, modelName]
  )

  // Feature 2: Predict Risks
  const onPredictRisks = useCallback(
    async (boardState: Board): Promise<Insight[]> => {
      if (!isAvailable) {
        throw new Error('AI features not available')
      }

      setIsLoading(true)
      setError(null)
      const startTime = Date.now()

      try {
        const result = await generateObject({
          model: getModel(),
          system: PREDICT_RISKS_SYSTEM_PROMPT,
          prompt: predictRisksPrompt(boardState.columns, boardState.cards),
          schema: z.object({
            insights: z.array(insightSchema),
          }),
        })

        const duration = Date.now() - startTime

        aiUsageTracker.record({
          feature: 'predictRisks',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          duration,
          success: true,
        })

        return result.object.insights as Insight[]
      } catch (err) {
        const duration = Date.now() - startTime
        const error = err instanceof Error ? err : new Error('Failed to predict risks')

        aiUsageTracker.record({
          feature: 'predictRisks',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: 0,
          outputTokens: 0,
          duration,
          success: false,
          error: error.message,
        })

        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, getModel, modelName]
  )

  // Generate Subtasks
  const onGenerateSubtasks = useCallback(
    async (card: Card): Promise<Omit<Card, 'id'>[]> => {
      if (!isAvailable) {
        throw new Error('AI features not available')
      }

      setIsLoading(true)
      setError(null)
      const startTime = Date.now()

      try {
        const result = await generateObject({
          model: getModel(),
          system: GENERATE_SUBTASKS_SYSTEM_PROMPT,
          prompt: generateSubtasksPrompt(card.title, card.description, card.estimatedTime),
          schema: z.object({
            subtasks: z.array(subtaskSchema),
          }),
        })

        const duration = Date.now() - startTime

        aiUsageTracker.record({
          feature: 'generateSubtasks',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          duration,
          success: true,
        })

        return result.object.subtasks as Omit<Card, 'id'>[]
      } catch (err) {
        const duration = Date.now() - startTime
        const error = err instanceof Error ? err : new Error('Failed to generate subtasks')

        aiUsageTracker.record({
          feature: 'generateSubtasks',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: 0,
          outputTokens: 0,
          duration,
          success: false,
          error: error.message,
        })

        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, getModel, modelName]
  )

  // Estimate Effort
  const onEstimateEffort = useCallback(
    async (card: Card): Promise<{ hours: number; confidence: number }> => {
      if (!isAvailable) {
        throw new Error('AI features not available')
      }

      setIsLoading(true)
      setError(null)
      const startTime = Date.now()

      try {
        const result = await generateObject({
          model: getModel(),
          system: ESTIMATE_EFFORT_SYSTEM_PROMPT,
          prompt: estimateEffortPrompt(
            card.title,
            card.description,
            card.priority,
            card.dependencies
          ),
          schema: effortEstimateSchema,
        })

        const duration = Date.now() - startTime

        aiUsageTracker.record({
          feature: 'estimateEffort',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          duration,
          success: true,
        })

        return result.object as { hours: number; confidence: number }
      } catch (err) {
        const duration = Date.now() - startTime
        const error = err instanceof Error ? err : new Error('Failed to estimate effort')

        aiUsageTracker.record({
          feature: 'estimateEffort',
          model: (modelName as AIModelKey) || 'claude-3-5-sonnet-20241022',
          inputTokens: 0,
          outputTokens: 0,
          duration,
          success: false,
          error: error.message,
        })

        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isAvailable, getModel, modelName]
  )

  return {
    onGeneratePlan,
    onSuggestAssignee,
    onPredictRisks,
    onGenerateSubtasks,
    onEstimateEffort,
    isAvailable,
    isLoading,
    error,
  }
}
