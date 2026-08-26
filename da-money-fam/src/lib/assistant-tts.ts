export function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type KokoroHandle = {
  generate: (text: string, opts: { voice: string }) => Promise<{
    audio: Float32Array | number[]
    sampling_rate?: number
    toWav?: () => Blob | ArrayBuffer
  }>
}

let kokoroPromise: Promise<KokoroHandle | null> | null = null
let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

async function loadKokoro(): Promise<KokoroHandle | null> {
  if (kokoroPromise) return kokoroPromise
  kokoroPromise = (async () => {
    try {
      const mod = await import('kokoro-js')
      const KokoroTTS = (mod as { KokoroTTS: { from_pretrained: Function } }).KokoroTTS
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
  return kokoroPromise
}

function playFloat32(samples: Float32Array, sampleRate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      audioCtx =
        audioCtx ||
        new AudioContext({ sampleRate })
      const ctx = audioCtx
      const buffer = ctx.createBuffer(1, samples.length, sampleRate)
      const copy = new Float32Array(samples.length)
      copy.set(samples)
      buffer.copyToChannel(copy, 0)
      currentSource?.stop()
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
      const samples = audio.audio instanceof Float32Array ? audio.audio : new Float32Array(audio.audio)
      await playFloat32(samples, audio.sampling_rate || 24000)
    } catch (err) {
      console.warn('Kokoro generate failed, using fallback', err)
      await fallbackSpeak(piece)
    }
  }
}
