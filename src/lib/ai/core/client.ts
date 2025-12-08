import Anthropic from '@anthropic-ai/sdk'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import {
  AIFeature,
  AIModel,
  AILogEntry,
  calculateCost,
} from './types'

// Initialize Anthropic client lazily
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// Default model for different features
const DEFAULT_MODELS: Record<AIFeature, AIModel> = {
  rate_quote: 'claude-3-5-sonnet-20241022',
  document_extraction: 'claude-sonnet-4-20250514', // Vision capability
  carrier_matching: 'claude-3-5-sonnet-20241022',
  email_drafting: 'claude-3-haiku-20240307', // Fast for simple text
  search: 'claude-3-haiku-20240307',
  alerts: 'claude-3-haiku-20240307',
}

interface AIRequestOptions {
  feature: AIFeature
  organizationId: string
  userId?: string
  model?: AIModel
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

interface TextCompletionRequest extends AIRequestOptions {
  systemPrompt: string
  userMessage: string
}

interface VisionCompletionRequest extends AIRequestOptions {
  systemPrompt: string
  imageBase64: string
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  userMessage?: string
}

interface AIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    cost: number
    latencyMs: number
  }
}

// Log AI interaction to database
async function logAIInteraction(entry: AILogEntry): Promise<void> {
  try {
    const supabase = await createSupabaseClient()
    await supabase.from('ai_logs').insert(entry)
  } catch (error) {
    console.error('Failed to log AI interaction:', error)
    // Don't throw - logging failures shouldn't break functionality
  }
}

// Text completion (no images)
export async function textCompletion<T = string>(
  options: TextCompletionRequest
): Promise<AIResponse<T>> {
  const {
    feature,
    organizationId,
    userId,
    systemPrompt,
    userMessage,
    model = DEFAULT_MODELS[feature],
    maxTokens = 4096,
    temperature = 0.7,
    timeoutMs = 30000,
  } = options

  const startTime = Date.now()
  const client = getAnthropicClient()

  const logEntry: AILogEntry = {
    organization_id: organizationId,
    user_id: userId,
    feature,
    model,
    request: { systemPrompt, userMessage },
    status: 'success',
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const latencyMs = Date.now() - startTime
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const cost = calculateCost(model, inputTokens, outputTokens)

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    const rawText = textContent?.type === 'text' ? textContent.text : ''

    // Try to parse as JSON if it looks like JSON
    let data: T
    const trimmed = rawText.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        data = JSON.parse(trimmed) as T
      } catch {
        data = rawText as T
      }
    } else {
      data = rawText as T
    }

    // Update log entry
    logEntry.response = { content: rawText }
    logEntry.latency_ms = latencyMs
    logEntry.tokens_input = inputTokens
    logEntry.tokens_output = outputTokens
    logEntry.cost_usd = cost

    await logAIInteraction(logEntry)

    return {
      success: true,
      data,
      usage: { inputTokens, outputTokens, cost, latencyMs },
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logEntry.status = errorMessage.includes('abort') ? 'timeout' : 'error'
    logEntry.error_message = errorMessage
    logEntry.latency_ms = latencyMs

    await logAIInteraction(logEntry)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Vision completion (with image)
export async function visionCompletion<T = unknown>(
  options: VisionCompletionRequest
): Promise<AIResponse<T>> {
  const {
    feature,
    organizationId,
    userId,
    systemPrompt,
    imageBase64,
    imageMediaType,
    userMessage = 'Please analyze this image.',
    model = DEFAULT_MODELS[feature],
    maxTokens = 4096,
    temperature = 0.3, // Lower for more consistent extraction
    timeoutMs = 60000, // Longer timeout for vision
  } = options

  const startTime = Date.now()
  const client = getAnthropicClient()

  const logEntry: AILogEntry = {
    organization_id: organizationId,
    user_id: userId,
    feature,
    model,
    request: { systemPrompt, userMessage, hasImage: true },
    status: 'success',
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: userMessage,
              },
            ],
          },
        ],
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const latencyMs = Date.now() - startTime
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const cost = calculateCost(model, inputTokens, outputTokens)

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    const rawText = textContent?.type === 'text' ? textContent.text : ''

    // Try to parse as JSON
    let data: T
    const trimmed = rawText.trim()
    // Handle markdown code blocks
    let jsonStr = trimmed
    if (trimmed.startsWith('```')) {
      const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) {
        jsonStr = match[1].trim()
      }
    }

    if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
      try {
        data = JSON.parse(jsonStr) as T
      } catch {
        data = rawText as T
      }
    } else {
      data = rawText as T
    }

    // Update log entry
    logEntry.response = { content: rawText }
    logEntry.latency_ms = latencyMs
    logEntry.tokens_input = inputTokens
    logEntry.tokens_output = outputTokens
    logEntry.cost_usd = cost

    await logAIInteraction(logEntry)

    return {
      success: true,
      data,
      usage: { inputTokens, outputTokens, cost, latencyMs },
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logEntry.status = errorMessage.includes('abort') ? 'timeout' : 'error'
    logEntry.error_message = errorMessage
    logEntry.latency_ms = latencyMs

    await logAIInteraction(logEntry)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Structured JSON completion with schema validation
export async function structuredCompletion<T>(
  options: TextCompletionRequest & { schema?: string }
): Promise<AIResponse<T>> {
  const { schema, systemPrompt, ...rest } = options

  // Enhance system prompt with JSON instructions
  const enhancedPrompt = schema
    ? `${systemPrompt}

You must respond with valid JSON matching this schema:
${schema}

Respond ONLY with the JSON object, no markdown formatting or explanation.`
    : systemPrompt

  return textCompletion<T>({
    ...rest,
    systemPrompt: enhancedPrompt,
    temperature: 0.3, // Lower temperature for structured output
  })
}

// Export client getter for advanced use cases
export { getAnthropicClient }
