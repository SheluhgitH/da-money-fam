import {
  type ChatModelAttempt,
  getChatFallbackChain,
  isGroqConfigured,
  isOpenRouterConfigured,
} from '@/lib/chat-models'
import {
  ASSISTANT_TOOLS,
  clientToolToAction,
  executeServerTool,
  isServerTool,
  type ToolCallMessage,
} from '@/lib/assistant-tools'
import type { AssistantAction } from '@/lib/assistant-actions'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: ToolCallMessage[]
  tool_call_id?: string
  name?: string
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
    lower.includes('no endpoints') ||
    lower.includes('tool') ||
    lower.includes('function')
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

function streamTextAndActions(text: string, actions: AssistantAction[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const chunkSize = 48
      for (let i = 0; i < text.length; i += chunkSize) {
        const piece = text.slice(i, i + chunkSize)
        controller.enqueue(encoder.encode(`${JSON.stringify({ message: piece })}\n`))
      }
      if (actions.length) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ actions })}\n`))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

type ProviderConfig = NonNullable<ReturnType<typeof getProviderConfig>>

async function completeOnce(
  config: ProviderConfig,
  messages: ChatMessage[],
  withTools: boolean
): Promise<{
  content: string
  tool_calls: ToolCallMessage[]
  status: number
  error?: string
}> {
  const body: Record<string, unknown> = {
    model: config.modelId,
    messages,
    stream: false,
    max_tokens: 1024,
    temperature: 0.7,
  }
  if (withTools && !config.ollamaBaseUrl) {
    body.tools = ASSISTANT_TOOLS
    body.tool_choice = 'auto'
  }

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
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return {
      content: '',
      tool_calls: [],
      status: response.status,
      error: await parseErrorDetail(response),
    }
  }

  const data = await response.json()
  const msg = data.choices?.[0]?.message as
    | { content?: string | null; tool_calls?: ToolCallMessage[] }
    | undefined
  return {
    content: (msg?.content || '').trim(),
    tool_calls: Array.isArray(msg?.tool_calls) ? msg.tool_calls : [],
    status: 200,
  }
}

/**
 * Tool loop (max 4 rounds) then stream final assistant text + `{ actions }` line.
 * Falls back to plain streaming if tools are rejected.
 */
export async function streamChatWithTools(
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
  const clientActions: AssistantAction[] = []

  for (const attempt of chain) {
    const config = getProviderConfig(attempt)
    if (!config) continue
    if (config.ollamaBaseUrl) {
      // Ollama path: no tools — plain stream
      return streamChatWithFallback(messages, requestedModel)
    }

    console.log(`Chat tools attempt: ${attempt.provider}/${config.modelId}`)

    try {
      const working: ChatMessage[] = [...messages]
      let toolsSupported = true

      for (let round = 0; round < 4; round++) {
        const result = await completeOnce(config, working, toolsSupported)

        if (result.status !== 200) {
          lastError = result.error || `HTTP ${result.status}`
          if (shouldRetry(result.status, lastError)) {
            // If tools rejected, retry without tools then fall back to stream
            if (toolsSupported && /tool|function/i.test(lastError)) {
              toolsSupported = false
              continue
            }
            break
          }
          break
        }

        if (!result.tool_calls.length) {
          return streamTextAndActions(result.content || '…', clientActions)
        }

        working.push({
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.tool_calls,
        })

        for (const call of result.tool_calls) {
          const name = call.function?.name || ''
          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(call.function?.arguments || '{}') as Record<string, unknown>
          } catch {
            args = {}
          }

          if (isServerTool(name)) {
            const toolResult = await executeServerTool(name, args)
            working.push({
              role: 'tool',
              tool_call_id: call.id,
              name,
              content: toolResult,
            })
            // After quote, also stage propose action if prompt/brief present
            if (name === 'quoteImage' && typeof args.prompt === 'string') {
              try {
                const parsed = JSON.parse(toolResult) as {
                  quoteId?: string
                  priceCoins?: number
                  canAfford?: boolean
                }
                const action = clientToolToAction('proposeImageGenerate', {
                  prompt: args.prompt,
                  tier: args.tier,
                  quoteId: parsed.quoteId,
                  priceCoins: parsed.priceCoins,
                  canAfford: parsed.canAfford,
                })
                if (action) clientActions.push(action)
              } catch {
                /* ignore */
              }
            }
            if (name === 'quoteVideo' && typeof args.brief === 'string') {
              try {
                const parsed = JSON.parse(toolResult) as {
                  totalPriceCoins?: number
                  canAfford?: boolean
                  sceneBriefs?: string[]
                }
                const action = clientToolToAction('proposeVideoGenerate', {
                  brief: args.brief,
                  scenes: parsed.sceneBriefs || args.sceneBriefs,
                  priceCoins: parsed.totalPriceCoins,
                  canAfford: parsed.canAfford,
                })
                if (action) clientActions.push(action)
              } catch {
                /* ignore */
              }
            }
            if (name === 'listLibrary') {
              const action = clientToolToAction('listLibrary', {})
              if (action) clientActions.push(action)
            }
            if (name === 'searchBlog' && typeof args.query === 'string') {
              const action = clientToolToAction('searchBlog', { query: args.query })
              if (action) clientActions.push(action)
            }
          } else {
            const action = clientToolToAction(name, args)
            if (action) clientActions.push(action)
            working.push({
              role: 'tool',
              tool_call_id: call.id,
              name,
              content: JSON.stringify({ ok: true, queued: true }),
            })
          }
        }
      }

      // Exhausted rounds with leftover — ask once more without tools for a final reply
      const final = await completeOnce(config, working, false)
      if (final.status === 200 && (final.content || clientActions.length)) {
        return streamTextAndActions(final.content || 'Ready when you are.', clientActions)
      }
      lastError = final.error || lastError
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Request failed'
      console.error(`Chat tools error ${attempt.provider}/${attempt.modelId}:`, lastError)
    }
  }

  // Full fallback: classic streaming (fence parsing on client)
  console.warn('Tools path exhausted, falling back to stream:', lastError)
  return streamChatWithFallback(messages, requestedModel)
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
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content ?? '',
          })),
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
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content ?? '',
          })),
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
