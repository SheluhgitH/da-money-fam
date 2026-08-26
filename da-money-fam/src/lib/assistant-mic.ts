const MIC_KEY = 'dmf-assistant-mic'

let stream: MediaStream | null = null

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
