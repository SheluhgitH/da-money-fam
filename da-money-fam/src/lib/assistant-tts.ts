import { isIosSafariLike } from '@/lib/assistant-mic'

export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type KokoroHandle = {
  generate: (text: string, opts: { voice: string }) => Promise<{
    audio: unknown
    sampling_rate?: number
  }>
}

type LoadState = 'idle' | 'loading' | 'ready' | 'failed'

let kokoroPromise: Promise<KokoroHandle | null> | null = null
let loadState: LoadState = 'idle'
let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

const LOAD_MS = 90_000

function AudioCtxCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  )
}

export function unlockAssistantAudio() {
  try {
    const Ctor = AudioCtxCtor()
    if (Ctor) {
      audioCtx = audioCtx || new Ctor()
      void audioCtx.resume()
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      void window.speechSynthesis.getVoices()
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
    }
  } catch {
    /* ignore */
  }
}

function beginKokoroLoad(): Promise<KokoroHandle | null> {
  if (isIosSafariLike()) {
    loadState = 'failed'
    return Promise.resolve(null)
  }
  if (loadState === 'failed') return Promise.resolve(null)
  if (kokoroPromise) return kokoroPromise

  loadState = 'loading'
  kokoroPromise = (async () => {
    try {
      const loadWeb = new Function(
        'return import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js")'
      ) as () => Promise<{ KokoroTTS: { from_pretrained: Function } }>
      const { KokoroTTS } = await loadWeb()
      const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator
      const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: webgpu ? 'fp32' : 'q8',
        device: webgpu ? 'webgpu' : 'wasm',
      })
      loadState = 'ready'
      return tts as KokoroHandle
    } catch (err) {
      console.warn('Kokoro TTS failed to load', err)
      loadState = 'failed'
      return null
    }
  })()
  return kokoroPromise
}

/** Desktop only — never call on iOS (OOM from ~80MB ONNX). */
export function warmupAssistantVoice() {
  if (typeof window === 'undefined') return
  if (isIosSafariLike()) return
  void beginKokoroLoad()
}

async function loadKokoro(): Promise<KokoroHandle | null> {
  if (isIosSafariLike() || loadState === 'failed') return null
  const pending = beginKokoroLoad()
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), LOAD_MS)
  })
  return Promise.race([pending, timeout])
}

function toFloat32(audio: unknown): Float32Array {
  if (audio instanceof Float32Array) return audio
  if (Array.isArray(audio)) return new Float32Array(audio)
  if (audio && typeof audio === 'object' && 'data' in audio) {
    const d = (audio as { data: unknown }).data
    if (d instanceof Float32Array) return d
    if (ArrayBuffer.isView(d)) return new Float32Array(d as unknown as ArrayLike<number>)
    if (Array.isArray(d)) return new Float32Array(d)
  }
  return new Float32Array(0)
}

function playFloat32(samples: Float32Array, sampleRate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const Ctor = AudioCtxCtor()
      if (!Ctor) {
        reject(new Error('No AudioContext'))
        return
      }
      if (!audioCtx) audioCtx = new Ctor({ sampleRate })
      const ctx = audioCtx
      const rate = ctx.sampleRate || sampleRate
      const buffer = ctx.createBuffer(1, samples.length, rate)
      const copy = new Float32Array(samples.length)
      copy.set(samples)
      buffer.copyToChannel(copy, 0)
      try {
        currentSource?.stop()
      } catch {
        /* ignore */
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => resolve()
      currentSource = source
      void ctx.resume()
      source.start()
    } catch (err) {
      reject(err)
    }
  })
}

function pickFallbackVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const preferred = [
    /samantha/i,
    /google us english/i,
    /google uk english female/i,
    /karen/i,
    /moira/i,
    /aria/i,
    /jenny/i,
    /natural/i,
  ]
  for (const re of preferred) {
    const match = voices.find((v) => re.test(v.name) && v.lang.startsWith('en'))
    if (match) return match
  }
  const localEn = voices.find((v) => v.localService && v.lang.startsWith('en'))
  if (localEn) return localEn
  return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null
}

function waitForVoices(ms = 800): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve()
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) {
      resolve()
      return
    }
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done)
      resolve()
    }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    window.setTimeout(done, ms)
  })
}

async function fallbackSpeak(text: string): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  await waitForVoices()
  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.98
      utterance.pitch = 1
      const voice = pickFallbackVoice()
      if (voice) utterance.voice = voice
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
      // iOS sometimes never fires onend for short clips
      window.setTimeout(() => resolve(), Math.min(60_000, Math.max(4000, text.length * 80)))
    } catch {
      resolve()
    }
  })
}

export function stopAssistantSpeech() {
  try {
    currentSource?.stop()
  } catch {
    /* ignore */
  }
  currentSource = null
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}

export async function speakAssistantText(
  raw: string,
  opts: { muted?: boolean; onWarmup?: (warming: boolean) => void } = {}
): Promise<void> {
  if (opts.muted) return
  const text = stripForSpeech(raw)
  if (!text) return

  // iOS: never touch Kokoro — system TTS only, immediately after gesture unlock
  if (isIosSafariLike()) {
    opts.onWarmup?.(false)
    await fallbackSpeak(text)
    return
  }

  try {
    opts.onWarmup?.(true)
    const tts = await loadKokoro()
    opts.onWarmup?.(false)

    if (!tts) {
      await fallbackSpeak(text)
      return
    }

    const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
    for (const chunk of chunks) {
      const piece = chunk.trim()
      if (!piece) continue
      try {
        const audio = await tts.generate(piece, { voice: 'af_heart' })
        const samples = toFloat32(audio.audio)
        if (!samples.length) {
          await fallbackSpeak(piece)
          continue
        }
        await playFloat32(samples, audio.sampling_rate || 24000)
      } catch (err) {
        console.warn('Kokoro generate failed, using fallback', err)
        await fallbackSpeak(piece)
      }
    }
  } catch (err) {
    console.warn('speakAssistantText failed', err)
    opts.onWarmup?.(false)
    await fallbackSpeak(text)
  }
}
