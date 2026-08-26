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

let kokoroPromise: Promise<KokoroHandle | null> | null = null
let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

export function unlockAssistantAudio() {
  try {
    audioCtx = audioCtx || new AudioContext()
    void audioCtx.resume()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
    }
  } catch {
    /* ignore */
  }
}

async function loadKokoro(): Promise<KokoroHandle | null> {
  if (!kokoroPromise) {
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
        return tts as KokoroHandle
      } catch (err) {
        console.warn('Kokoro TTS failed to load', err)
        return null
      }
    })()
  }
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), 6000)
  })
  return Promise.race([kokoroPromise, timeout])
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
      if (!audioCtx) audioCtx = new AudioContext({ sampleRate })
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

function fallbackSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1.05
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
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
