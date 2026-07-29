import {
  type ChatModelAttempt,
  getChatFallbackChain,
  isGroqConfigured,
  isOpenRouterConfigured,
} from '@/lib/chat-models'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

function getProviderConfig(attempt: ChatModelAttempt): {
  apiKey?: string
  apiUrl: string
  modelId: string
  isOpenRouter: boolean
  isGroq: boolean
  ollamaBaseUrl?: string
} | null {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL

  if (attempt.provider === 'groq') {
    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) return null
    return {
      apiKey: groqApiKey,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      modelId: attempt.modelId,
      isOpenRouter: false,
      isGroq: true,
    }
  }

  if (attempt.provider === 'openrouter') {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') return null
    return {
      apiKey: openRouterApiKey,
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      modelId: attempt.modelId,
      isOpenRouter: true,
      isGroq: false,
    }
  }

  if (attempt.provider === 'ollama' && ollamaBaseUrl) {
    return {
      apiUrl: `${ollamaBaseUrl}/api/chat`,
      modelId: attempt.modelId,
      isOpenRouter: false,
      isGroq: false,
      ollamaBaseUrl,
    }
  }

  return null
}

function shouldRetry(status: number, detail: string): boolean {
  if (status === 429 || status === 402 || status === 503) return true
  const lower = detail.toLowerCase()
  return (
    lower.includes('unavailable') ||
    lower.includes('not found') ||
    lower.includes('does not exist') ||
    lower.includes('rate limit') ||
    lower.includes('no endpoints')
  )
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const errorData = await response.json()
    return errorData.error?.message || JSON.stringify(errorData.error) || 'AI provider rejected the request'
  } catch {
    return `HTTP ${response.status}`
  }
}

function createNdjsonStream(
  upstream: Response,
  parseDelta: (data: Record<string, unknown>) => { content: string; reasoning: string | null }
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      let sseBuffer = ''
      const reader = upstream.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value) continue

          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split('\n')
          sseBuffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const jsonStr = trimmed.slice(6)
            if (!jsonStr || jsonStr === '[DONE]') continue

            try {
              const data = JSON.parse(jsonStr) as Record<string, unknown>
              const { content, reasoning } = parseDelta(data)
              if (content || reasoning) {
                controller.enqueue(
                  encoder.encode(`${JSON.stringify({ message: content, reasoning })}\n`)
                )
              }
            } catch {
              /* wait for more data */
            }
          }
        }
      } catch (error) {
        console.error('Stream read error:', error)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}

export async function streamChatWithFallback(
  messages: ChatMessage[],
  requestedModel?: string | null
): Promise<Response> {
  if (!isGroqConfigured() && !isOpenRouterConfigured() && !process.env.OLLAMA_BASE_URL) {
    return new Response(
      JSON.stringify({ error: 'No AI API Key is configured correctly' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const chain = getChatFallbackChain(requestedModel)
  if (chain.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No AI API Key is configured correctly' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let lastError = 'All models failed'

  for (const attempt of chain) {
    const config = getProviderConfig(attempt)
    if (!config) continue

    console.log(`Chat attempt: ${attempt.provider}/${config.modelId}`)

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          ...(config.isOpenRouter && {
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
            'X-Title': 'DMF Premium Chat',
          }),
        },
        body: JSON.stringify({
          model: config.modelId,
          messages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        lastError = await parseErrorDetail(response)
        console.error(`Chat failed ${attempt.provider}/${config.modelId}:`, lastError)
        if (shouldRetry(response.status, lastError)) continue
        return new Response(
          JSON.stringify({ error: 'AI Provider Error', details: lastError }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const ollamaBaseUrl = config.ollamaBaseUrl
      const readableStream =
        ollamaBaseUrl && config.apiUrl.includes(ollamaBaseUrl)
          ? createNdjsonStream(response, (data) => ({
              content: String((data.message as { content?: string })?.content || ''),
              reasoning: null,
            }))
          : createNdjsonStream(response, (data) => {
              const choice = (
                data.choices as Array<{ delta?: { content?: string; reasoning?: string } }>
              )?.[0]
              return {
                content: choice?.delta?.content || '',
                reasoning: choice?.delta?.reasoning || null,
              }
            })

      return new Response(readableStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Request failed'
      console.error(`Chat error ${attempt.provider}/${attempt.modelId}:`, lastError)
    }
  }

  return new Response(
    JSON.stringify({ error: 'AI Provider Error', details: lastError }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  )
}

export async function completeChatWithFallback(
  messages: ChatMessage[],
  options?: { requestedModel?: string | null; maxTokens?: number }
): Promise<string | null> {
  const chain = getChatFallbackChain(options?.requestedModel)
  let lastError = 'All models failed'

  for (const attempt of chain) {
    const config = getProviderConfig(attempt)
    if (!config) continue

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          ...(config.isOpenRouter && {
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
            'X-Title': 'DMF Ad Studio',
          }),
        },
        body: JSON.stringify({
          model: config.modelId,
          messages,
          stream: false,
          max_tokens: options?.maxTokens ?? 300,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        lastError = await parseErrorDetail(response)
        if (shouldRetry(response.status, lastError)) continue
        return null
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) return content
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Request failed'
    }
  }

  console.error('completeChatWithFallback exhausted:', lastError)
  return null
}
