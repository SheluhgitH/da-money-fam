import type { ChatMessage } from '@/lib/chat-completion'
import { isGroqConfigured, isOpenRouterConfigured } from '@/lib/chat-models'

const AD_PROMPT_GEMINI = 'google/gemini-3.1-flash-lite'
const AD_PROMPT_GEMMA = 'google/gemma-4-31b-it'
const AD_PROMPT_GROQ = 'llama-3.3-70b-versatile'

type Attempt = { provider: 'openrouter' | 'groq'; modelId: string }

function getChain(): Attempt[] {
  const chain: Attempt[] = []
  if (isOpenRouterConfigured()) {
    chain.push({ provider: 'openrouter', modelId: AD_PROMPT_GEMINI })
    chain.push({ provider: 'openrouter', modelId: AD_PROMPT_GEMMA })
  }
  if (isGroqConfigured()) {
    chain.push({ provider: 'groq', modelId: AD_PROMPT_GROQ })
  }
  return chain
}

async function callChat(
  attempt: Attempt,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (attempt.provider === 'openrouter') {
    if (!openRouterKey || openRouterKey === 'your_openrouter_key_here') return null
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
        'X-Title': 'DMF Ad Studio',
      },
      body: JSON.stringify({
        model: attempt.modelId,
        messages,
        stream: false,
        max_tokens: maxTokens,
        temperature: 0.6,
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  }

  if (!groqKey) return null
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: attempt.modelId,
      messages,
      stream: false,
      max_tokens: maxTokens,
      temperature: 0.6,
    }),
  })
  if (!response.ok) return null
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

export async function completeAdPromptChat(
  messages: ChatMessage[],
  options?: { maxTokens?: number }
): Promise<string | null> {
  const maxTokens = options?.maxTokens ?? 400
  for (const attempt of getChain()) {
    try {
      const result = await callChat(attempt, messages, maxTokens)
      if (result) return result
    } catch (err) {
      console.error(`ad-prompt-llm ${attempt.provider}/${attempt.modelId}:`, err)
    }
  }
  return null
}

export function parseEnhancedPromptJson(raw: string): { prompt: string; negative?: string } | null {
  const trimmed = raw.trim()
  try {
    const parsed = JSON.parse(trimmed) as { prompt?: unknown; negative?: unknown }
    if (typeof parsed.prompt === 'string' && parsed.prompt.trim()) {
      return {
        prompt: parsed.prompt.trim(),
        negative: typeof parsed.negative === 'string' ? parsed.negative.trim() : undefined,
      }
    }
  } catch {
    /* try extract */
  }

  const match = trimmed.match(/\{[\s\S]*"prompt"[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { prompt?: unknown; negative?: unknown }
      if (typeof parsed.prompt === 'string' && parsed.prompt.trim()) {
        return {
          prompt: parsed.prompt.trim(),
          negative: typeof parsed.negative === 'string' ? parsed.negative.trim() : undefined,
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (trimmed.length > 20 && !trimmed.startsWith('{')) {
    return { prompt: trimmed.replace(/^["']|["']$/g, '') }
  }
  return null
}

const enhanceCache = new Map<string, { prompt: string; at: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

export function enhanceCacheKey(brief: string, creativeJson: string, refUrls: string[]): string {
  return `${brief.trim()}|${creativeJson}|${refUrls.join(',')}`
}

export function getCachedEnhance(key: string): string | null {
  const hit = enhanceCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    enhanceCache.delete(key)
    return null
  }
  return hit.prompt
}

export function setCachedEnhance(key: string, prompt: string): void {
  enhanceCache.set(key, { prompt, at: Date.now() })
  if (enhanceCache.size > 200) {
    const oldest = enhanceCache.keys().next().value
    if (oldest) enhanceCache.delete(oldest)
  }
}
