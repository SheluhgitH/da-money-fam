import { isHomepageTabId, navigateHomepageSection } from '@/lib/homepage-tabs'

export type AssistantAction =
  | { type: 'navigate'; target: string }
  | { type: 'open'; path: string }
  | { type: 'link'; href: string }
  | { type: 'setBrief'; text: string }
  | { type: 'setScenes'; scenes: string[] }
  | { type: 'appendBrief'; text: string }

const OPEN_ALLOW = new Set([
  '/ad-studio',
  '/login',
  '/coin-wallet',
  '/blog',
  '/library',
  '/account/profile',
])

const LINK_ALLOW = [
  'https://www.instagram.com/damoneyfam/',
  'https://kick.com/jackpotwrld',
  'mailto:contact@damoneyfam.com',
]

function isAllowedOpen(path: string): boolean {
  const url = path.startsWith('/') ? path : `/${path}`
  const base = url.split('?')[0].replace(/\/$/, '') || '/'
  if (OPEN_ALLOW.has(base) || OPEN_ALLOW.has(url.split('?')[0])) return true
  if (base === '/ad-studio') return true
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

function isAction(value: unknown): value is AssistantAction {
  if (!value || typeof value !== 'object') return false
  const rec = value as {
    type?: unknown
    target?: unknown
    path?: unknown
    href?: unknown
    text?: unknown
    scenes?: unknown
  }
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
  return false
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
    }
  }
}
