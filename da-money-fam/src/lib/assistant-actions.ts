import { isHomepageTabId, navigateHomepageSection } from '@/lib/homepage-tabs'

export type AssistantAction =
  | { type: 'navigate'; target: string }
  | { type: 'open'; path: string }
  | { type: 'link'; href: string }
  | { type: 'setBrief'; text: string }
  | { type: 'setScenes'; scenes: string[] }
  | { type: 'appendBrief'; text: string }
  | { type: 'setAspect'; aspect: string }
  | { type: 'generateVideo'; brief: string; scenes?: string[] }
  | { type: 'generateImage'; prompt: string; tier?: 'fast' | 'smart' }
  | { type: 'attachLibraryRef'; url: string; asFirstFrame?: boolean }
  | { type: 'continueStoryboard'; libraryId?: string }
  | { type: 'cancelJob' }
  | { type: 'listLibrary' }
  | { type: 'searchBlog'; query: string }
  | { type: 'playTrack'; query: string }
  | { type: 'startCoinCheckout'; packageId?: string }
  | { type: 'openProduct' }

const OPEN_ALLOW = new Set([
  '/ad-studio',
  '/login',
  '/signup',
  '/coin-wallet',
  '/blog',
  '/library',
  '/account/profile',
  '/wallpapers',
])

const LINK_ALLOW = [
  'https://www.instagram.com/damoneyfam/',
  'https://kick.com/jackpotwrld',
  'mailto:contact@damoneyfam.com',
]

const COIN_PACKS = new Set(['starter', 'creator', 'studio'])
const ASPECTS = new Set(['9:16', '16:9', '1:1', '4:5'])

function isAllowedOpen(path: string): boolean {
  const url = path.startsWith('/') ? path : `/${path}`
  const base = url.split('?')[0].replace(/\/$/, '') || '/'
  if (OPEN_ALLOW.has(base) || OPEN_ALLOW.has(url.split('?')[0])) return true
  if (base === '/ad-studio' || base.startsWith('/blog/')) return true
  return false
}

function isAllowedLink(href: string): boolean {
  const lower = href.toLowerCase()
  return LINK_ALLOW.some((allowed) => lower.startsWith(allowed.toLowerCase()))
}

export function parseAssistantActions(text: string): { clean: string; actions: AssistantAction[] } {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  let actions: AssistantAction[] = []
  let clean = text
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1]) as { actions?: unknown }
      if (Array.isArray(parsed.actions)) {
        actions = parsed.actions.filter(isAction)
      }
      clean = text.replace(fence[0], '').trim()
    } catch {
      /* keep original */
    }
  }
  return { clean, actions }
}

export function normalizeActions(raw: unknown[]): AssistantAction[] {
  return raw.filter(isAction)
}

function isAction(value: unknown): value is AssistantAction {
  if (!value || typeof value !== 'object') return false
  const rec = value as Record<string, unknown>
  if (rec.type === 'navigate' && typeof rec.target === 'string') return true
  if (rec.type === 'open' && typeof rec.path === 'string') return true
  if (rec.type === 'link' && typeof rec.href === 'string') return true
  if (rec.type === 'setBrief' && typeof rec.text === 'string') return true
  if (rec.type === 'appendBrief' && typeof rec.text === 'string') return true
  if (
    rec.type === 'setScenes' &&
    Array.isArray(rec.scenes) &&
    rec.scenes.every((s) => typeof s === 'string')
  ) {
    return true
  }
  if (rec.type === 'setAspect' && typeof rec.aspect === 'string') return true
  if (rec.type === 'generateVideo' && typeof rec.brief === 'string') return true
  if (rec.type === 'generateImage' && typeof rec.prompt === 'string') return true
  if (rec.type === 'attachLibraryRef' && typeof rec.url === 'string') return true
  if (rec.type === 'continueStoryboard') return true
  if (rec.type === 'cancelJob') return true
  if (rec.type === 'listLibrary') return true
  if (rec.type === 'searchBlog' && typeof rec.query === 'string') return true
  if (rec.type === 'playTrack' && typeof rec.query === 'string') return true
  if (rec.type === 'startCoinCheckout') return true
  if (rec.type === 'openProduct') return true
  return false
}

export function applyStudioBrief(brief: string, scenes?: string[]) {
  if (scenes && scenes.length >= 2) {
    window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { scenes } }))
  } else {
    window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { brief } }))
  }
}

export function startStudioGenerate(opts?: { brief?: string }) {
  if (window.location.pathname.startsWith('/ad-studio')) {
    window.dispatchEvent(new CustomEvent('dmf-studio-generate'))
    return
  }
  const q = new URLSearchParams({ autogen: '1' })
  if (opts?.brief) q.set('brief', opts.brief.slice(0, 2000))
  window.location.href = `/ad-studio?${q.toString()}`
}

export function runAssistantActions(actions: AssistantAction[]) {
  for (const action of actions) {
    if (action.type === 'navigate') {
      const target = action.target.replace(/^#/, '').trim()
      if (isHomepageTabId(target) || target.length > 0) {
        if (window.location.pathname !== '/') {
          window.location.href = `/#${target}`
        } else {
          navigateHomepageSection(target)
        }
      }
    } else if (action.type === 'open') {
      const path = action.path.startsWith('/') ? action.path : `/${action.path}`
      if (isAllowedOpen(path)) window.location.href = path
    } else if (action.type === 'link' && isAllowedLink(action.href)) {
      window.open(action.href, '_blank', 'noopener,noreferrer')
    } else if (action.type === 'setBrief') {
      window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { brief: action.text } }))
    } else if (action.type === 'appendBrief') {
      window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { append: action.text } }))
    } else if (action.type === 'setScenes') {
      window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { scenes: action.scenes } }))
    } else if (action.type === 'setAspect' && ASPECTS.has(action.aspect)) {
      window.dispatchEvent(new CustomEvent('dmf-studio-apply', { detail: { aspect: action.aspect } }))
    } else if (action.type === 'generateVideo') {
      applyStudioBrief(action.brief, action.scenes)
    } else if (action.type === 'attachLibraryRef') {
      if (!window.location.pathname.startsWith('/ad-studio')) {
        window.location.href = '/ad-studio'
      }
      window.dispatchEvent(
        new CustomEvent('dmf-studio-apply', {
          detail: { refUrl: action.url, asFirstFrame: action.asFirstFrame === true },
        })
      )
    } else if (action.type === 'continueStoryboard') {
      if (!window.location.pathname.startsWith('/ad-studio')) {
        window.location.href = '/ad-studio'
        return
      }
      window.dispatchEvent(
        new CustomEvent('dmf-studio-continue', { detail: { libraryId: action.libraryId } })
      )
    } else if (action.type === 'cancelJob') {
      window.dispatchEvent(new CustomEvent('dmf-studio-cancel'))
    } else if (action.type === 'openProduct') {
      if (window.location.pathname !== '/') {
        window.location.href = '/#merch'
      } else {
        navigateHomepageSection('merch')
      }
    } else if (action.type === 'startCoinCheckout') {
      const pack = action.packageId && COIN_PACKS.has(action.packageId) ? action.packageId : 'starter'
      void fetch('/api/coinz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pack, return_path: '/coin-wallet' }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.url) window.location.href = data.url
          else window.location.href = '/coin-wallet'
        })
        .catch(() => {
          window.location.href = '/coin-wallet'
        })
    } else if (action.type === 'playTrack') {
      window.dispatchEvent(new CustomEvent('dmf-play-song', { detail: { query: action.query } }))
    }
  }
}
