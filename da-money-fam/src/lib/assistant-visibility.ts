export type AssistantVisibility = 'off' | 'home' | 'all'

export const ASSISTANT_VISIBILITY_KEY = 'dmf-assistant-visibility'
export const ASSISTANT_MUTE_KEY = 'dmf-assistant-mute'
export const ASSISTANT_OPEN_EVENT = 'dmf-assistant-open'

export function readAssistantVisibility(): AssistantVisibility {
  if (typeof window === 'undefined') return 'all'
  const raw = localStorage.getItem(ASSISTANT_VISIBILITY_KEY)
  if (raw === 'off' || raw === 'home' || raw === 'all') return raw
  return 'all'
}

export function writeAssistantVisibility(value: AssistantVisibility) {
  localStorage.setItem(ASSISTANT_VISIBILITY_KEY, value)
}

export function openAssistant(opts?: { setAll?: boolean }) {
  if (typeof window === 'undefined') return
  if (opts?.setAll) writeAssistantVisibility('all')
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT))
}

export function isAssistantFabVisible(
  visibility: AssistantVisibility,
  pathname: string,
  homepageTab: string | null
): boolean {
  if (visibility === 'off') return false
  if (visibility === 'all') return true
  const onHome = pathname === '/'
  const tab = homepageTab || 'discover'
  return onHome && tab === 'discover'
}
