export type ChatProvider = 'groq' | 'openrouter' | 'ollama'

export interface ChatModelOption {
  id: string
  name: string
  provider: ChatProvider
}

export interface ChatModelAttempt {
  provider: ChatProvider
  modelId: string
}

export const GROQ_CHAT_MODELS: ChatModelOption[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', provider: 'groq' },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout (Groq)',
    provider: 'groq',
  },
]

export const OPENROUTER_CHAT_MODELS: ChatModelOption[] = [
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', provider: 'openrouter' },
  { id: 'openrouter/free', name: 'OpenRouter Free (auto)', provider: 'openrouter' },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'openrouter' },
  { id: 'inclusionai/ling-3.0-flash', name: 'Ling 3.0 Flash', provider: 'openrouter' },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b',
    name: 'Nemotron 3 Super',
    provider: 'openrouter',
  },
]

/** Vision-capable OpenRouter models for multimodal chat (images attached). */
export const OPENROUTER_VISION_MODELS: ChatModelOption[] = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Vision)', provider: 'openrouter' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Vision)', provider: 'openrouter' },
]

export const DEFAULT_VISION_MODEL = 'google/gemini-2.5-flash'

/** Picker list for UI — Groq entries shown when server reports Groq configured */
export const ALL_CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  ...GROQ_CHAT_MODELS,
  ...OPENROUTER_CHAT_MODELS,
]

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
export const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-31b-it'

const GROQ_MODEL_IDS = new Set(GROQ_CHAT_MODELS.map((m) => m.id))
const OPENROUTER_MODEL_IDS = new Set([
  ...OPENROUTER_CHAT_MODELS.map((m) => m.id),
  ...OPENROUTER_VISION_MODELS.map((m) => m.id),
])

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY
  return Boolean(key && key.trim())
}

export function isOpenRouterConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY
  return Boolean(key && key !== 'your_openrouter_key_here')
}

export function getDefaultChatModel(): string {
  if (isGroqConfigured()) return DEFAULT_GROQ_MODEL
  return DEFAULT_OPENROUTER_MODEL
}

export function getPickerModels(): ChatModelOption[] {
  if (isGroqConfigured()) return ALL_CHAT_MODEL_OPTIONS
  return OPENROUTER_CHAT_MODELS
}

/**
 * Cascade: Groq → Gemma → openrouter/free → other OpenRouter models.
 * If the user picked a model in the UI, that attempt is tried first.
 * When `requiresVision` is true, only OpenRouter vision models are used.
 */
export function getChatFallbackChain(
  requestedModel?: string | null,
  options?: { requiresVision?: boolean }
): ChatModelAttempt[] {
  const chain: ChatModelAttempt[] = []
  const seen = new Set<string>()

  const add = (provider: ChatProvider, modelId: string) => {
    const key = `${provider}:${modelId}`
    if (seen.has(key)) return
    seen.add(key)
    chain.push({ provider, modelId })
  }

  if (options?.requiresVision) {
    if (isOpenRouterConfigured()) {
      if (requestedModel && OPENROUTER_VISION_MODELS.some((m) => m.id === requestedModel)) {
        add('openrouter', requestedModel)
      }
      for (const m of OPENROUTER_VISION_MODELS) add('openrouter', m.id)
      add('openrouter', 'google/gemini-2.5-flash-lite')
      add('openrouter', DEFAULT_OPENROUTER_MODEL)
    }
    return chain
  }

  if (requestedModel && requestedModel !== 'ollama') {
    if (GROQ_MODEL_IDS.has(requestedModel) && isGroqConfigured()) {
      add('groq', requestedModel)
    } else if (OPENROUTER_MODEL_IDS.has(requestedModel) && isOpenRouterConfigured()) {
      add('openrouter', requestedModel)
    }
  }

  if (isGroqConfigured()) add('groq', DEFAULT_GROQ_MODEL)
  if (isOpenRouterConfigured()) {
    add('openrouter', DEFAULT_OPENROUTER_MODEL)
    add('openrouter', 'openrouter/free')
    add('openrouter', 'openai/gpt-oss-20b')
    add('openrouter', 'inclusionai/ling-3.0-flash')
    add('openrouter', 'nvidia/nemotron-3-super-120b-a12b')
  }

  return chain
}

export function resolveProviderForModel(modelId: string): ChatProvider | null {
  if (GROQ_MODEL_IDS.has(modelId)) return 'groq'
  if (OPENROUTER_MODEL_IDS.has(modelId)) return 'openrouter'
  return null
}

export function messageHasImages(
  messages: Array<{ content?: unknown }> | null | undefined
): boolean {
  if (!Array.isArray(messages)) return false
  for (const m of messages) {
    const c = m?.content
    if (Array.isArray(c)) {
      for (const part of c) {
        if (
          part &&
          typeof part === 'object' &&
          (part as { type?: string }).type === 'image_url'
        ) {
          return true
        }
      }
    }
  }
  return false
}
