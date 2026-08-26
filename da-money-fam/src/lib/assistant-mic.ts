const MIC_KEY = 'dmf-assistant-mic'

let stream: MediaStream | null = null

export function isIosSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOS
}

export async function ensureMicStream(): Promise<MediaStream> {
  if (stream && stream.getAudioTracks().some((t) => t.readyState === 'live')) {
    return stream
  }
  stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    localStorage.setItem(MIC_KEY, '1')
  } catch {
    /* ignore */
  }
  return stream
}

export function hasSavedMicGrant(): boolean {
  try {
    return localStorage.getItem(MIC_KEY) === '1'
  } catch {
    return false
  }
}

export async function prepareMicForRecognition(): Promise<void> {
  if (isIosSafariLike()) return
  if (stream && stream.getAudioTracks().some((t) => t.readyState === 'live')) return
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (status.state === 'denied') return
    await ensureMicStream()
  } catch {
    await ensureMicStream()
  }
}
