import {
  buildAdPromptFromBrief,
  type CreativeSelections,
  getCreativeFragments,
  normalizeCreativeSelections,
} from '@/lib/ad-creative-presets'
import {
  completeAdPromptChat,
  enhanceCacheKey,
  getCachedEnhance,
  parseEnhancedPromptJson,
  setCachedEnhance,
} from '@/lib/ad-prompt-llm'
import type { ChatMessage } from '@/lib/chat-completion'

export function buildBaseAdPrompt(
  brief: string,
  creative?: Partial<CreativeSelections> | null
): string {
  const selections = normalizeCreativeSelections(creative)
  return buildAdPromptFromBrief(brief, selections)
}

function buildSystemPrompt(fragments: string[], hasRefs: boolean): string {
  return `You rewrite ad briefs into Seedance video generation prompts.
Return ONLY valid JSON: {"prompt":"...","negative":"..."}
Rules:
- "prompt" is ONE paragraph, no markdown, no bullet points, max 120 words.
- Keep the user's core message and all creative direction.
- Preserve these creative choices in meaning: ${fragments.join('; ')}
- Include camera, lighting, mood, pacing, and subject motion naturally.
- DMF brand: luxury hip-hop, gold and black, premium commercial polish.
- Do not add dialogue unless the brief asks for it.
${
  hasRefs
    ? '- Reference images are provided: preserve subject identity and style from them; do not invent new subjects unless the brief asks.'
    : ''
}`
}

function buildUserText(brief: string, basePrompt: string, referenceUrls: string[]): string {
  let text = `Brief: ${brief.trim()}\n\nBase prompt to polish:\n${basePrompt}`
  const httpsRefs = referenceUrls.filter((u) => u.startsWith('http://') || u.startsWith('https://'))
  if (httpsRefs.length > 0) {
    text += `\n\nReference image URLs (preserve identity/style from these):\n${httpsRefs
      .slice(0, 3)
      .map((u, i) => `${i + 1}. ${u}`)
      .join('\n')}`
  }
  return text
}

export async function enhanceAdPrompt(
  brief: string,
  creative?: Partial<CreativeSelections> | null,
  referenceUrls: string[] = []
): Promise<string> {
  const selections = normalizeCreativeSelections(creative)
  const basePrompt = buildAdPromptFromBrief(brief, selections)
  const fragments = getCreativeFragments(selections)
  const refs = referenceUrls.filter(Boolean)
  const cacheKey = enhanceCacheKey(brief, JSON.stringify(selections), refs)
  const cached = getCachedEnhance(cacheKey)
  if (cached) return cached

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(fragments, refs.length > 0) },
    { role: 'user', content: buildUserText(brief, basePrompt, refs) },
  ]

  const raw = await completeAdPromptChat(messages, { maxTokens: 400 })
  if (!raw) return basePrompt

  const parsed = parseEnhancedPromptJson(raw)
  const prompt = parsed?.prompt || basePrompt
  setCachedEnhance(cacheKey, prompt)
  return prompt
}

export async function enhanceStoryboardScenes(
  sceneBriefs: string[],
  creative?: Partial<CreativeSelections> | null,
  referenceUrls: string[] = []
): Promise<string[]> {
  const selections = normalizeCreativeSelections(creative)
  const fragments = getCreativeFragments(selections)
  const briefs = sceneBriefs.map((b) => b.trim()).filter(Boolean)
  if (briefs.length === 0) return []

  const systemPrompt = `You rewrite storyboard scene briefs into Seedance video prompts.
Return ONLY valid JSON: {"scenes":[{"prompt":"..."},...]} with the same number of scenes.
Rules:
- Each prompt is ONE paragraph, max 80 words, no markdown.
- Keep continuity across scenes (same subject/look unless a scene says otherwise).
- Preserve creative choices: ${fragments.join('; ')}
- DMF brand: luxury hip-hop, gold and black, premium commercial polish.
${referenceUrls.length ? '- Preserve identity from reference images.' : ''}`

  const raw = await completeAdPromptChat(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Scenes:\n${briefs.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
      },
    ],
    { maxTokens: 800 }
  )

  if (!raw) {
    return briefs.map((b) => buildBaseAdPrompt(b, selections))
  }

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] || raw) as {
      scenes?: Array<{ prompt?: string }>
    }
    if (Array.isArray(parsed.scenes) && parsed.scenes.length === briefs.length) {
      return parsed.scenes.map((s, i) =>
        typeof s.prompt === 'string' && s.prompt.trim()
          ? s.prompt.trim()
          : buildBaseAdPrompt(briefs[i], selections)
      )
    }
  } catch {
    /* fall through */
  }

  return briefs.map((b) => buildBaseAdPrompt(b, selections))
}

export async function resolveAdPrompt(input: {
  brief: string
  creative?: Partial<CreativeSelections> | null
  enhance?: boolean
  referenceUrls?: string[]
  /** Skip LLM if preview already produced this prompt */
  enhancedPrompt?: string | null
}): Promise<string> {
  const { brief, creative, enhance, referenceUrls, enhancedPrompt } = input
  if (enhance && typeof enhancedPrompt === 'string' && enhancedPrompt.trim()) {
    return enhancedPrompt.trim()
  }
  if (enhance) {
    return enhanceAdPrompt(brief, creative, referenceUrls || [])
  }
  return buildBaseAdPrompt(brief, creative)
}
