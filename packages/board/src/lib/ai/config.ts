/**
 * AI Configuration
 * Central configuration for AI providers and models
 */

export interface AIConfig {
  /** Provider (OpenAI or Anthropic) */
  provider: 'openai' | 'anthropic'
  /** API Key */
  apiKey: string
  /** Model to use */
  model: string
  /** Base URL (optional) */
  baseURL?: string
  /** Max tokens per request */
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
}

/**
 * Supported AI Models
 */
export const AI_MODELS = {
  // OpenAI Models
  'gpt-4-turbo': {
    provider: 'openai' as const,
    name: 'GPT-4 Turbo',
    contextWindow: 128000,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    supportsVision: true,
    supportsJSON: true,
  },
  'gpt-4': {
    provider: 'openai' as const,
    name: 'GPT-4',
    contextWindow: 8192,
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
    supportsVision: false,
    supportsJSON: true,
  },
  'gpt-3.5-turbo': {
    provider: 'openai' as const,
    name: 'GPT-3.5 Turbo',
    contextWindow: 16385,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    supportsVision: false,
    supportsJSON: true,
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic' as const,
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    supportsVision: true,
    supportsJSON: true,
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic' as const,
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    supportsVision: true,
    supportsJSON: true,
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic' as const,
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    supportsVision: true,
    supportsJSON: true,
  },
} as const

export type AIModelKey = keyof typeof AI_MODELS

/**
 * Default AI Configuration
 */
export const DEFAULT_AI_CONFIG: Partial<AIConfig> = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.7,
}

/**
 * Rate Limits by Plan
 */
export const RATE_LIMITS = {
  hobby: {
    requestsPerMonth: 50,
    maxConcurrent: 1,
    maxTokensPerRequest: 4096,
  },
  pro: {
    requestsPerMonth: 500,
    maxConcurrent: 3,
    maxTokensPerRequest: 8192,
  },
  enterprise: {
    requestsPerMonth: 2000,
    maxConcurrent: 10,
    maxTokensPerRequest: 16384,
  },
} as const

/**
 * Feature Flags for AI
 */
export const AI_FEATURES = {
  generatePlan: {
    enabled: true,
    minPlanTier: 'hobby' as const,
    estimatedTokens: 2000,
  },
  predictRisks: {
    enabled: true,
    minPlanTier: 'pro' as const,
    estimatedTokens: 1500,
  },
  suggestAssignee: {
    enabled: true,
    minPlanTier: 'hobby' as const,
    estimatedTokens: 800,
  },
  generateReport: {
    enabled: true,
    minPlanTier: 'enterprise' as const,
    estimatedTokens: 3000,
  },
  generateSubtasks: {
    enabled: true,
    minPlanTier: 'hobby' as const,
    estimatedTokens: 1000,
  },
} as const
