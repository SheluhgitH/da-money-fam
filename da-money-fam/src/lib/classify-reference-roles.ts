import { completeAdPromptChat } from '@/lib/ad-prompt-llm'
import type { ChatMessage } from '@/lib/chat-completion'
import { isOpenRouterConfigured } from '@/lib/chat-models'

export type ReferenceRoleKind = 'opening_subject' | 'appears_later' | 'identity'

export interface ClassifiedReferenceRole {
  url: string
  role: ReferenceRoleKind
  label: string
  when?: 'open' | 'mid' | 'end'
}

export interface ClassifyReferenceRolesResult {
  roles: ClassifiedReferenceRole[]
  shotPlan: string
}

const cache = new Map<string, ClassifyReferenceRolesResult>()

function cacheKey(brief: string, urls: string[]): string {
  return `${brief.trim().slice(0, 400)}|${urls.slice().sort().join(',')}`
}

function heuristicRoles(
  urls: string[],
  names?: Array<string | undefined>
): ClassifyReferenceRolesResult {
  const roles: ClassifiedReferenceRole[] = urls.map((url, i) => {
    const name = (names?.[i] || '').toLowerCase()
    const productHint =
      /product|bottle|can|box|merch|logo|pack|shoe|sneaker|watch|jewelry|bag/.test(name)
    if (productHint) {
      return { url, role: 'appears_later' as const, label: 'product', when: 'end' as const }
    }
    if (i === 0) {
      return { url, role: 'opening_subject' as const, label: 'main subject', when: 'open' as const }
    }
    if (urls.length === 2 && i === 1) {
      return { url, role: 'appears_later' as const, label: 'secondary subject', when: 'end' as const }
    }
    return { url, role: 'identity' as const, label: 'identity', when: 'mid' as const }
  })

  if (!roles.some((r) => r.role === 'opening_subject') && roles.length) {
    roles[0] = { ...roles[0], role: 'opening_subject', label: 'main subject', when: 'open' }
  }

  return { roles, shotPlan: buildShotPlan(roles) }
}

export function buildShotPlan(roles: ClassifiedReferenceRole[]): string {
  const open = roles.filter((r) => r.role === 'opening_subject')
  const later = roles.filter((r) => r.role === 'appears_later')
  const parts: string[] = []
  if (open.length) {
    parts.push(
      `Open on ${open.map((r) => r.label).join(' and ')} only (identity from refs). Do not show later subjects in the first second.`
    )
  }
  if (later.length) {
    const endish = later.filter((r) => r.when === 'end' || !r.when)
    const mid = later.filter((r) => r.when === 'mid')
    if (mid.length) {
      parts.push(`Introduce ${mid.map((r) => r.label).join(' and ')} mid-clip as living subjects.`)
    }
    if (endish.length) {
      parts.push(
        `Reveal ${endish.map((r) => r.label).join(' and ')} toward the end; keep them out of the opening frame.`
      )
    }
  }
  if (!parts.length) {
    parts.push('Use reference stills for identity and wardrobe only; start on a new cinematic shot.')
  }
  return parts.join(' ')
}

export function openingSubjectUrls(roles: ClassifiedReferenceRole[]): string[] {
  const opens = roles.filter((r) => r.role === 'opening_subject').map((r) => r.url)
  if (opens.length) return opens
  return roles[0] ? [roles[0].url] : []
}

export function appearsLaterUrls(roles: ClassifiedReferenceRole[]): string[] {
  return roles.filter((r) => r.role === 'appears_later').map((r) => r.url)
}

async function classifyWithVision(
  brief: string,
  urls: string[]
): Promise<ClassifyReferenceRolesResult | null> {
  if (!isOpenRouterConfigured() || urls.length === 0) return null

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [
    {
      type: 'text',
      text: `Brief: ${brief.trim() || '(no brief)'}

Classify each attached still for a video ad. Return ONLY JSON:
{"roles":[{"url":"...","role":"opening_subject"|"appears_later"|"identity","label":"short name","when":"open"|"mid"|"end"}],"shotPlan":"one sentence timing plan"}

Rules:
- opening_subject: should dominate the first second / opening shot (usually main person).
- appears_later: product or secondary cast that should NOT appear in the opening frame.
- identity: supporting wardrobe/face refs with no strong timing.
- Prefer exactly one opening_subject when there is a clear hero.
- Use the exact image URLs provided below for "url".
URLs in order:
${urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`,
    },
    ...urls.slice(0, 4).map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
  ]

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You classify reference images for video generation. Return only valid JSON. Never treat stills as frozen first/last frames.',
    },
    { role: 'user', content },
  ]

  const raw = await completeAdPromptChat(messages, { maxTokens: 500 })
  if (!raw) return null

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] || raw) as {
      roles?: Array<{
        url?: string
        role?: string
        label?: string
        when?: string
      }>
      shotPlan?: string
    }
    if (!Array.isArray(parsed.roles) || !parsed.roles.length) return null

    const byUrl = new Map(urls.map((u) => [u, u]))
    const roles: ClassifiedReferenceRole[] = []
    for (const row of parsed.roles) {
      const url =
        typeof row.url === 'string' && byUrl.has(row.url)
          ? row.url
          : urls[roles.length] || urls[0]
      if (!url || roles.some((r) => r.url === url)) continue
      const role: ReferenceRoleKind =
        row.role === 'appears_later' || row.role === 'identity' || row.role === 'opening_subject'
          ? row.role
          : 'identity'
      const when =
        row.when === 'open' || row.when === 'mid' || row.when === 'end' ? row.when : undefined
      roles.push({
        url,
        role,
        label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : role,
        when,
      })
    }
    for (const url of urls) {
      if (!roles.some((r) => r.url === url)) {
        roles.push({ url, role: 'identity', label: 'identity' })
      }
    }
    if (!roles.some((r) => r.role === 'opening_subject') && roles.length) {
      roles[0] = { ...roles[0], role: 'opening_subject', when: 'open' }
    }
    const shotPlan =
      typeof parsed.shotPlan === 'string' && parsed.shotPlan.trim()
        ? parsed.shotPlan.trim()
        : buildShotPlan(roles)
    return { roles, shotPlan }
  } catch {
    return null
  }
}

export async function classifyReferenceRoles(input: {
  brief: string
  urls: string[]
  names?: Array<string | undefined>
  /** Client/user overrides keyed by URL. */
  overrides?: Record<string, ReferenceRoleKind>
}): Promise<ClassifyReferenceRolesResult> {
  const urls = Array.from(
    new Set(input.urls.filter((u) => typeof u === 'string' && u.startsWith('http')))
  ).slice(0, 4)
  if (urls.length === 0) {
    return { roles: [], shotPlan: '' }
  }

  const key = cacheKey(input.brief, urls)
  const cached = cache.get(key)
  let result = cached
  if (!result) {
    const vision = await classifyWithVision(input.brief, urls)
    result = vision || heuristicRoles(urls, input.names)
    cache.set(key, result)
  }

  if (input.overrides && Object.keys(input.overrides).length) {
    const roles = result.roles.map((r) => {
      const over = input.overrides![r.url]
      if (!over) return r
      return {
        ...r,
        role: over,
        when: over === 'opening_subject' ? 'open' : over === 'appears_later' ? 'end' : r.when,
      }
    })
    return { roles, shotPlan: buildShotPlan(roles) }
  }

  return result
}

/** Optimistic client-side heuristic (no network). */
export function classifyReferenceRolesHeuristic(
  urls: string[],
  names?: Array<string | undefined>
): ClassifyReferenceRolesResult {
  return heuristicRoles(
    urls.filter((u) => typeof u === 'string' && u.length > 0).slice(0, 4),
    names
  )
}
