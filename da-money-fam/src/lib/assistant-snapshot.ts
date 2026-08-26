export type AssistantContextPayload = {
  signedIn: boolean
  coins: number | null
  lastVideos: Array<{
    id: string
    brief: string
    thumb: string | null
    url: string | null
    mode: string
  }>
  lastImages: Array<{ id: string; url: string; prompt: string }>
  latestBlog: { slug: string; title: string } | null
}

let cached: { at: number; data: AssistantContextPayload | null } = { at: 0, data: null }

export async function fetchAssistantContext(force = false): Promise<AssistantContextPayload | null> {
  if (!force && cached.data && Date.now() - cached.at < 15_000) return cached.data
  try {
    const res = await fetch('/api/assistant/context')
    if (!res.ok) return cached.data
    const data = (await res.json()) as AssistantContextPayload
    cached = { at: Date.now(), data }
    return data
  } catch {
    return cached.data
  }
}

export function buildPageContext(opts: {
  path: string
  studioSnap: string
  account: AssistantContextPayload | null
}): string {
  const lines = [`Page: ${opts.path}`]
  if (opts.account) {
    lines.push(
      `Signed in: ${opts.account.signedIn ? 'yes' : 'no'}`,
      `Coinz: ${opts.account.coins ?? 'unknown'}`
    )
    if (opts.account.lastVideos[0]) {
      lines.push(
        `Last video: ${opts.account.lastVideos[0].id} · ${opts.account.lastVideos[0].brief.slice(0, 120)}`
      )
    }
    if (opts.account.lastImages[0]) {
      lines.push(`Last still: ${opts.account.lastImages[0].id}`)
    }
    if (opts.account.latestBlog) {
      lines.push(`Latest blog: ${opts.account.latestBlog.title} (/blog/${opts.account.latestBlog.slug})`)
    }
  }
  if (opts.studioSnap) lines.push(`Studio snapshot: ${opts.studioSnap}`)
  return lines.join('\n').slice(0, 8000)
}
