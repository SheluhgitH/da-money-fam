'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'
import AssistantVoiceOverlay, { type VoicePhase } from './AssistantVoiceOverlay'
import {
  parseAssistantActions,
  normalizeActions,
  runAssistantActions,
  startStudioGenerate,
  type AssistantAction,
} from '@/lib/assistant-actions'
import {
  speakAssistantText,
  stopAssistantSpeech,
  unlockAssistantAudio,
  warmupAssistantVoice,
} from '@/lib/assistant-tts'
import { isIosSafariLike, prepareMicForRecognition } from '@/lib/assistant-mic'
import { buildPageContext, fetchAssistantContext } from '@/lib/assistant-snapshot'
import {
  ASSISTANT_MUTE_KEY,
  ASSISTANT_OPEN_EVENT,
  isAssistantFabVisible,
  readAssistantVisibility,
  writeAssistantVisibility,
  type AssistantVisibility,
} from '@/lib/assistant-visibility'

interface Message {
  sender: 'user' | 'bot'
  text: string
  reasoning?: string
  timestamp: number
  imageUrl?: string
  /** User-uploaded stills for this turn (chat vision). */
  imageUrls?: string[]
  videoUrl?: string
  assets?: Array<{
    id: string
    kind: 'video' | 'image'
    title: string
    thumb?: string
    url?: string
  }>
  spend?: {
    kind: 'image' | 'video'
    priceCoins: number
    canAfford: boolean
    quoteId?: string
    prompt?: string
    brief?: string
    scenes?: string[]
    tier?: 'fast' | 'smart'
    done?: boolean
  }
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

type Recog = {
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  start: () => void
  stop: () => void
}

const MarkdownText = ({ text, onPreview }: { text: string; onPreview: (code: string) => void }) => {
  const lines = text.split('\n')
  let inCodeBlock = false
  let currentCode = ''

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith('```')) {
          if (inCodeBlock) {
            const codeToPass = currentCode
            inCodeBlock = false
            currentCode = ''
            return (
              <div key={idx} className="relative group my-2">
                <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-xs text-gold/80 border border-gold/20">
                  <code>{codeToPass.trim()}</code>
                </pre>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(codeToPass)}
                    className="bg-zinc-800 text-gold px-2 py-1 rounded text-[10px] font-bold border border-gold/20 hover:bg-gold hover:text-black"
                  >
                    COPY
                  </button>
                  <button
                    onClick={() => onPreview(codeToPass)}
                    className="bg-gold text-black px-2 py-1 rounded text-[10px] font-bold hover:bg-white"
                  >
                    PREVIEW
                  </button>
                </div>
              </div>
            )
          }
          inCodeBlock = true
          return null
        }

        if (inCodeBlock) {
          currentCode += line + '\n'
          return null
        }

        const parts = line.split(/(\*\*.*?\*\*)/g)
        return (
          <p key={idx} className="m-0 min-h-[1em]">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={i} className="text-gold font-bold">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return part
            })}
          </p>
        )
      })}
    </div>
  )
}

export default function PremiumChat() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [visibility, setVisibility] = useState<AssistantVisibility>('all')
  const [muted, setMuted] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const chatFileRef = useRef<HTMLInputElement>(null)
  const [selectedModel, setSelectedModel] = useState('google/gemma-4-31b-it')
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([])

  const [chats, setChats] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  const [isTyping, setIsTyping] = useState(false)
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceAnswer, setVoiceAnswer] = useState('')
  const [voiceSpend, setVoiceSpend] = useState<Message['spend'] | null>(null)
  const [askBarOpen, setAskBarOpen] = useState(false)

  const chatAreaRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<number | null>(null)
  const holding = useRef(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const voiceSend = useRef(false)
  const transcriptRef = useRef('')
  const pointerHandled = useRef(false)
  const recogInstance = useRef<Recog | null>(null)
  const voiceHoldEnding = useRef(false)
  const voicePhaseRef = useRef<VoicePhase>(null)
  const handleSendRef = useRef<(customMessage?: string) => Promise<void>>(async () => {})
  const capturedPointerId = useRef<number | null>(null)
  const fabEl = useRef<HTMLElement | null>(null)
  const pendingVoiceSpend = useRef<Message['spend'] | null>(null)
  const confirmListening = useRef(false)

  const suggestedQuestions = [
    'What services do you offer?',
    'Tell me about the artists',
    'Explain your pricing',
    'How can I book a session?',
  ]

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/chat')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.models?.length) setAvailableModels(data.models)
        if (data?.defaultModel) setSelectedModel(data.defaultModel)
      })
      .catch(() => {})
  }, [isOpen])

  const speak = async (text: string) => {
    stopAssistantSpeech()
    setIsSpeaking(true)
    try {
      await speakAssistantText(text, {
        muted,
        onWarmup: (warming) => {
          if (voiceSend.current) {
            const next: VoicePhase = warming ? 'warmup' : 'speaking'
            voicePhaseRef.current = next
            setVoicePhase(next)
          }
        },
      })
    } catch (err) {
      console.warn('speak failed', err)
    } finally {
      setIsSpeaking(false)
    }
  }

  const stopSpeaking = () => {
    stopAssistantSpeech()
    setIsSpeaking(false)
  }

  const completeVoiceHold = () => {
    if (!voiceHoldEnding.current) return
    voiceHoldEnding.current = false
    window.setTimeout(() => {
      const text = transcriptRef.current.trim()
      if (text) {
        voicePhaseRef.current = 'thinking'
        setVoicePhase('thinking')
        void handleSendRef.current(text)
      } else {
        setVoiceAnswer("Didn't catch that. Hold the button and try again.")
        voicePhaseRef.current = 'done'
        setVoicePhase('done')
        voiceSend.current = false
      }
    }, 220)
  }

  const startRecognition = async () => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition
    if (!Ctor) {
      alert('Voice needs Chrome or Safari with mic permission.')
      return
    }
    try {
      await prepareMicForRecognition()
    } catch {
      alert('Microphone permission is needed to talk.')
      return
    }
    if (!recogInstance.current) {
      const recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onstart = () => setIsRecording(true)
      recognition.onend = () => {
        setIsRecording(false)
        completeVoiceHold()
      }
      recognition.onresult = (event: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
      }) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript
          if (event.results[i].isFinal) final += piece
          else interim += piece
        }
        const shown = (final || interim).trim()
        transcriptRef.current = shown
        setVoiceTranscript(shown)
        setMessageInput(shown)
      }
      recogInstance.current = recognition
      recognitionRef.current = recognition
    }
    try {
      recogInstance.current.start()
    } catch {
      /* already started */
    }
  }

  const createNewChat = useCallback(() => {
    const newId = Date.now().toString()
    const newChat: ChatSession = {
      id: newId,
      title: 'New Session',
      messages: [
        {
          sender: 'bot',
          text: 'Welcome to DMF Premium. How can I assist you today?',
          timestamp: Date.now(),
        },
      ],
      timestamp: Date.now(),
    }
    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newId)
    setShowHistory(false)
  }, [])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    const savedChats = localStorage.getItem('dmf_multi_chats')
    setVisibility(readAssistantVisibility())
    setMuted(localStorage.getItem(ASSISTANT_MUTE_KEY) === '1')

    if (savedChats) {
      const parsed = JSON.parse(savedChats) as ChatSession[]
      if (parsed.length > 0) {
        setChats(parsed)
        setCurrentChatId(parsed[0].id)
      } else {
        createNewChat()
      }
    } else {
      createNewChat()
    }

    return () => window.removeEventListener('resize', handleResize)
  }, [createNewChat])

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('dmf_multi_chats', JSON.stringify(chats))
    }
  }, [chats])

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [currentChatId, chats, isTyping])

  const currentChat = chats.find((c) => c.id === currentChatId) || chats[0]

  const updateCurrentChatMessages = (updater: (msgs: Message[]) => Message[]) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === currentChatId) {
          const newMsgs = updater(c.messages)
          let newTitle = c.title
          const firstUserMsg = newMsgs.find((m) => m.sender === 'user')
          if (firstUserMsg && c.title === 'New Session') {
            newTitle =
              firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '')
          }
          return { ...c, messages: newMsgs, title: newTitle }
        }
        return c
      })
    )
  }

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (currentChatId === id) {
        setCurrentChatId(filtered.length > 0 ? filtered[0].id : null)
        if (filtered.length === 0) setTimeout(createNewChat, 0)
      }
      return filtered
    })
  }

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || messageInput
    const imagesToSend = [...pendingImages]
    if ((!textToSend.trim() && imagesToSend.length === 0) || isTyping || uploadingImages) return

    const caption =
      textToSend.trim() ||
      (imagesToSend.length
        ? 'Use these images for an Ad Studio video — detect who opens vs what appears later.'
        : '')

    const userMsg: Message = {
      sender: 'user',
      text: caption,
      timestamp: Date.now(),
      imageUrls: imagesToSend.length ? imagesToSend : undefined,
    }
    updateCurrentChatMessages((prev) => [...prev, userMsg])
    setMessageInput('')
    setPendingImages([])
    setIsTyping(true)

    try {
      const prior = (currentChat?.messages || [])
        .filter((m) => m.text !== 'Welcome to DMF Premium. How can I assist you today?')
        .map((m) => {
          if (m.imageUrls?.length) {
            return {
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: [
                { type: 'text' as const, text: m.text },
                ...m.imageUrls.map((url) => ({
                  type: 'image_url' as const,
                  image_url: { url },
                })),
              ],
            }
          }
          return {
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          }
        })

      const userContent =
        imagesToSend.length > 0
          ? [
              { type: 'text' as const, text: caption },
              ...imagesToSend.map((url) => ({
                type: 'image_url' as const,
                image_url: { url },
              })),
            ]
          : caption

      const path = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      let studioSnap = ''
      try {
        studioSnap = sessionStorage.getItem('dmf-studio-snapshot') || ''
      } catch {
        /* ignore */
      }
      const account = await fetchAssistantContext()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...prior, { role: 'user', content: userContent }],
          model: selectedModel,
          pageContext: buildPageContext({ path, studioSnap, account }),
        }),
      })

      if (!response.ok || !response.body) {
        setIsTyping(false)
        let details = 'Connection Lost: Unable to reach the DMF AI Hub.'
        try {
          const errorData = await response.json()
          details = errorData.details || errorData.error || details
        } catch {
          /* ignore */
        }
        updateCurrentChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: `Error: ${details}`, timestamp: Date.now() },
        ])
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let botResponseText = ''
      let botReasoning = ''
      let botMsgStarted = false
      let lineBuffer = ''
      let streamedActions: AssistantAction[] = []

      const ensureBotMsg = () => {
        if (!botMsgStarted) {
          botMsgStarted = true
          updateCurrentChatMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: '',
              reasoning: undefined,
              timestamp: Date.now(),
            },
          ])
        }
      }

      const patchBotMsg = () => {
        updateCurrentChatMessages((prev) =>
          prev.map((msg, i) =>
            i === prev.length - 1 && msg.sender === 'bot'
              ? {
                  ...msg,
                  text: botResponseText,
                  reasoning: botReasoning || undefined,
                }
              : msg
          )
        )
      }

      const ingestLine = (jsonStr: string) => {
        try {
          const data = JSON.parse(jsonStr) as {
            message?: string
            reasoning?: string
            actions?: unknown[]
          }
          if (Array.isArray(data.actions)) {
            streamedActions = normalizeActions(data.actions)
            return
          }
          if (data.message) botResponseText += data.message
          if (data.reasoning) botReasoning += data.reasoning
          ensureBotMsg()
          patchBotMsg()
        } catch {
          /* incomplete */
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        for (const line of lines) {
          const jsonStr = line.trim()
          if (!jsonStr || jsonStr === '[DONE]') continue
          ingestLine(jsonStr)
        }
      }

      if (lineBuffer.trim()) ingestLine(lineBuffer.trim())

      setIsTyping(false)
      if (botMsgStarted) patchBotMsg()

      const parsed = parseAssistantActions(botResponseText)
      if (parsed.clean !== botResponseText) {
        botResponseText = parsed.clean
        patchBotMsg()
      }

      const mergedActions =
        streamedActions.length > 0 ? streamedActions : parsed.actions

      setVoiceAnswer(parsed.clean)
      const hasSpend = mergedActions.some(
        (a) => a.type === 'generateImage' || a.type === 'generateVideo'
      )
      if (voiceSend.current) {
        if (!muted && parsed.clean) {
          voicePhaseRef.current = 'speaking'
          setVoicePhase('speaking')
          await speak(parsed.clean)
        }
        if (!hasSpend) {
          voicePhaseRef.current = 'done'
          setVoicePhase('done')
          voiceSend.current = false
        }
      }

      await runParsedActions(mergedActions)
    } catch (error) {
      console.error('Chat API Error:', error)
      setIsTyping(false)
      updateCurrentChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Connection Lost: Unable to reach the DMF AI Hub.',
          timestamp: Date.now(),
        },
      ])
    }
  }
  handleSendRef.current = handleSend

  const MAX_CHAT_IMAGES = 4

  const attachChatImages = (files: FileList | File[] | null) => {
    if (!files?.length || uploadingImages) return
    const list = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)
    )
    if (!list.length) return

    void (async () => {
      setUploadingImages(true)
      try {
        const { compressImageForUpload } = await import('@/lib/compress-image')
        const room = Math.max(0, MAX_CHAT_IMAGES - pendingImages.length)
        for (const file of list.slice(0, room)) {
          const compressed = await compressImageForUpload(file)
          const res = await fetch('/api/ad-studio/upload-ref', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: compressed.dataUrl,
              contentType: compressed.contentType,
            }),
          })
          const data = await res.json()
          if (!res.ok || typeof data.url !== 'string') {
            throw new Error(data.error || 'Upload failed')
          }
          setPendingImages((prev) =>
            prev.length >= MAX_CHAT_IMAGES ? prev : [...prev, data.url as string]
          )
        }
      } catch (err) {
        updateCurrentChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: err instanceof Error ? err.message : 'Could not attach that image.',
            timestamp: Date.now(),
          },
        ])
      } finally {
        setUploadingImages(false)
        if (chatFileRef.current) chatFileRef.current.value = ''
      }
    })()
  }

  const runParsedActions = async (actions: AssistantAction[]) => {
    const seen = new Set<string>()
    const unique = actions.filter((a) => {
      const key =
        a.type === 'generateImage'
          ? `img:${a.prompt}`
          : a.type === 'generateVideo'
            ? `vid:${a.brief}`
            : a.type === 'searchBlog'
              ? `blog:${a.query}`
              : a.type
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const spendLater = unique.filter(
      (a) => a.type === 'generateImage' || a.type === 'generateVideo'
    )
    const listLib = unique.some((a) => a.type === 'listLibrary')
    const blogQ = unique.find((a) => a.type === 'searchBlog')
    runAssistantActions(
      unique.filter(
        (a) =>
          a.type !== 'generateImage' &&
          a.type !== 'generateVideo' &&
          a.type !== 'listLibrary' &&
          a.type !== 'searchBlog'
      )
    )
    if (listLib) await showLibraryCards()
    if (blogQ && blogQ.type === 'searchBlog') await showBlogResults(blogQ.query)
    for (const action of spendLater) {
      if (action.type === 'generateVideo') await quoteVideoSpend(action.brief, action.scenes)
      if (action.type === 'generateImage') await quoteImageSpend(action.prompt, action.tier)
    }
  }

  const showLibraryCards = async () => {
    const ctx = await fetchAssistantContext(true)
    const assets = [
      ...(ctx?.lastVideos || []).map((v) => ({
        id: v.id,
        kind: 'video' as const,
        title: v.brief,
        thumb: v.thumb || undefined,
        url: v.url || v.thumb || undefined,
      })),
      ...(ctx?.lastImages || []).map((img) => ({
        id: img.id,
        kind: 'image' as const,
        title: img.prompt || 'Still',
        thumb: img.url,
        url: img.url,
      })),
    ].slice(0, 6)
    updateCurrentChatMessages((prev) => [
      ...prev,
      {
        sender: 'bot',
        text: assets.length ? 'Recent library' : 'No library items yet. Generate in Ad Studio first.',
        assets,
        timestamp: Date.now(),
      },
    ])
  }

  const showBlogResults = async (query: string) => {
    try {
      const res = await fetch(`/api/blog/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      const posts = Array.isArray(data.posts) ? data.posts : []
      const lines = posts.length
        ? posts
            .map((p: { title: string; slug: string; excerpt?: string }) => `**${p.title}** — /blog/${p.slug}`)
            .join('\n')
        : 'No matching posts.'
      updateCurrentChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: lines, timestamp: Date.now() },
      ])
    } catch {
      updateCurrentChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Could not search the blog.', timestamp: Date.now() },
      ])
    }
  }

  const presentSpend = async (spend: NonNullable<Message['spend']>, text: string) => {
    updateCurrentChatMessages((prev) => [
      ...prev,
      { sender: 'bot', text, spend, timestamp: Date.now() },
    ])
    if (voiceSend.current) {
      pendingVoiceSpend.current = spend
      setVoiceSpend(spend)
      voicePhaseRef.current = 'confirm'
      setVoicePhase('confirm')
      const spoken = spend.canAfford
        ? `That's ${spend.priceCoins} Coinz. Want me to run it?`
        : `You need ${spend.priceCoins} Coinz. Open Coin Wallet to top up.`
      setVoiceAnswer(spoken)
      if (!muted) await speak(spoken)
      void listenForConfirmReply()
    }
  }

  const quoteVideoSpend = async (brief: string, scenes?: string[]) => {
    try {
      const scenesN = scenes && scenes.length >= 2 ? scenes.length : 1
      const qRes = await fetch(`/api/video/quote?scenes=${scenesN}`)
      if (qRes.status === 401) {
        updateCurrentChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Sign in to generate video.', timestamp: Date.now() },
        ])
        voiceSend.current = false
        return
      }
      const quote = await qRes.json()
      if (!qRes.ok) throw new Error(quote.error || 'Quote failed')
      const price = Number(quote.totalPriceCoins || quote.priceCoins || 0)
      const spend: NonNullable<Message['spend']> = {
        kind: 'video',
        priceCoins: price,
        canAfford: Boolean(quote.canAfford),
        brief,
        scenes,
      }
      await presentSpend(
        spend,
        quote.canAfford
          ? `Video is ${price} Coinz. Confirm to generate.`
          : `Need ${price} Coinz (you have ${quote.balance ?? 0}). Open Coin Wallet to top up.`
      )
    } catch (err) {
      updateCurrentChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: err instanceof Error ? err.message : 'Could not quote video.',
          timestamp: Date.now(),
        },
      ])
      voiceSend.current = false
    }
  }

  const quoteImageSpend = async (prompt: string, tier: 'fast' | 'smart' = 'fast') => {
    try {
      const qRes = await fetch(`/api/images/quote?tier=${tier === 'smart' ? 'smart' : 'fast'}`)
      if (qRes.status === 401) {
        updateCurrentChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Sign in to generate images.', timestamp: Date.now() },
        ])
        voiceSend.current = false
        return
      }
      const quote = await qRes.json()
      if (!qRes.ok) throw new Error(quote.error || 'Quote failed')
      const spend: NonNullable<Message['spend']> = {
        kind: 'image',
        priceCoins: Number(quote.priceCoins || 0),
        canAfford: Boolean(quote.canAfford),
        quoteId: quote.quoteId,
        prompt,
        tier,
      }
      await presentSpend(
        spend,
        quote.canAfford
          ? `Still is ${quote.priceCoins} Coinz. Confirm to generate.`
          : `Need ${quote.priceCoins} Coinz (you have ${quote.balance ?? 0}). Open Coin Wallet to top up.`
      )
    } catch (err) {
      updateCurrentChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: err instanceof Error ? err.message : 'Could not quote image.',
          timestamp: Date.now(),
        },
      ])
      voiceSend.current = false
    }
  }

  const declineVoiceSpend = () => {
    confirmListening.current = false
    pendingVoiceSpend.current = null
    setVoiceSpend(null)
    voiceSend.current = false
    voicePhaseRef.current = 'done'
    setVoicePhase('done')
    recognitionRef.current?.stop()
  }

  const confirmVoiceSpend = async () => {
    const spend = pendingVoiceSpend.current
    if (!spend) return
    confirmListening.current = false
    pendingVoiceSpend.current = null
    setVoiceSpend(null)
    recognitionRef.current?.stop()
    updateCurrentChatMessages((prev) =>
      prev.map((m) =>
        m.spend && !m.spend.done && m.spend.kind === spend.kind
          ? { ...m, spend: { ...m.spend, done: true } }
          : m
      )
    )
    voicePhaseRef.current = 'thinking'
    setVoicePhase('thinking')
    voiceSend.current = false
    if (spend.kind === 'video') {
      if (spend.brief) {
        const { applyStudioBrief } = await import('@/lib/assistant-actions')
        applyStudioBrief(spend.brief, spend.scenes)
      }
      window.setTimeout(() => startStudioGenerate({ brief: spend.brief }), 120)
      setVoiceAnswer('Starting your video in Ad Studio.')
      voicePhaseRef.current = 'done'
      setVoicePhase('done')
      return
    }
    if (spend.prompt) {
      await runChatImageGen(spend.prompt, spend.tier, spend.quoteId)
      voicePhaseRef.current = 'done'
      setVoicePhase('done')
    }
  }

  const listenForConfirmReply = async () => {
    confirmListening.current = true
    transcriptRef.current = ''
    try {
      await startRecognition()
    } catch {
      return
    }
    window.setTimeout(() => {
      if (!confirmListening.current) return
      recognitionRef.current?.stop()
      const said = transcriptRef.current.trim().toLowerCase()
      confirmListening.current = false
      if (!said) return
      if (/\b(yes|yeah|yep|ok|okay|sure|do it|generate|go|confirm|run it)\b/.test(said)) {
        void confirmVoiceSpend()
      } else if (/\b(no|nope|cancel|stop|not now|never)\b/.test(said)) {
        declineVoiceSpend()
      }
    }, 3500)
  }

  const confirmSpend = async (msg: Message) => {
    if (!msg.spend || msg.spend.done) return
    const stamp = msg.timestamp
    updateCurrentChatMessages((prev) =>
      prev.map((m) =>
        m.timestamp === stamp && m.spend ? { ...m, spend: { ...m.spend, done: true } } : m
      )
    )
    if (pendingVoiceSpend.current) {
      pendingVoiceSpend.current = null
      setVoiceSpend(null)
    }
    if (msg.spend.kind === 'video') {
      if (msg.spend.brief) {
        const { applyStudioBrief } = await import('@/lib/assistant-actions')
        applyStudioBrief(msg.spend.brief, msg.spend.scenes)
      }
      window.setTimeout(() => startStudioGenerate({ brief: msg.spend?.brief }), 120)
      return
    }
    if (msg.spend.prompt) {
      await runChatImageGen(msg.spend.prompt, msg.spend.tier, msg.spend.quoteId)
    }
  }

  const attachAssetToStudio = (asset: { url?: string; title: string; kind: string }) => {
    if (!asset.url) return
    try {
      const pending = JSON.parse(sessionStorage.getItem('dmf-studio-pending-refs') || '[]') as string[]
      if (!pending.includes(asset.url)) pending.push(asset.url)
      sessionStorage.setItem('dmf-studio-pending-refs', JSON.stringify(pending.slice(-6)))
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent('dmf-studio-apply', {
        detail: { refUrl: asset.url, asFirstFrame: false },
      })
    )
    if (!window.location.pathname.startsWith('/ad-studio')) {
      const q = new URLSearchParams()
      q.set('brief', `Use attached stills with smart timing for: ${asset.title || 'this look'}`)
      window.location.href = `/ad-studio?${q.toString()}`
    }
  }

  const runChatImageGen = async (
    prompt: string,
    tier: 'fast' | 'smart' = 'fast',
    quoteId?: string
  ) => {
    updateCurrentChatMessages((prev) => [
      ...prev,
      { sender: 'bot', text: 'Generating still…', timestamp: Date.now() },
    ])
    try {
      let activeQuoteId = quoteId || ''
      let activeTier = tier
      if (!activeQuoteId) {
        const qRes = await fetch(`/api/images/quote?tier=${tier === 'smart' ? 'smart' : 'fast'}`)
        if (qRes.status === 401) {
          updateCurrentChatMessages((prev) => [
            ...prev.slice(0, -1),
            { sender: 'bot', text: 'Sign in to generate images.', timestamp: Date.now() },
          ])
          return
        }
        const quote = await qRes.json()
        if (!qRes.ok) throw new Error(quote.error || 'Quote failed')
        if (!quote.canAfford) {
          updateCurrentChatMessages((prev) => [
            ...prev.slice(0, -1),
            {
              sender: 'bot',
              text: 'Need more Coinz. Open /coin-wallet to top up, then ask again.',
              timestamp: Date.now(),
            },
          ])
          return
        }
        activeQuoteId = quote.quoteId
        activeTier = quote.tier || tier
      }
      const gRes = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: activeQuoteId,
          prompt,
          tier: activeTier,
          mode: 'generate',
          aspect_ratio: '1:1',
        }),
      })
      const data = await gRes.json()
      if (gRes.status === 401) {
        updateCurrentChatMessages((prev) => [
          ...prev.slice(0, -1),
          { sender: 'bot', text: 'Sign in to generate images.', timestamp: Date.now() },
        ])
        return
      }
      if (gRes.status === 402) {
        updateCurrentChatMessages((prev) => [
          ...prev.slice(0, -1),
          {
            sender: 'bot',
            text: 'Need more Coinz. Open /coin-wallet to top up.',
            timestamp: Date.now(),
          },
        ])
        return
      }
      if (!gRes.ok) throw new Error(data.error || 'Generation failed')
      updateCurrentChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: 'bot',
          text: prompt.slice(0, 120),
          imageUrl: data.url as string,
          timestamp: Date.now(),
        },
      ])
    } catch (err) {
      updateCurrentChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          sender: 'bot',
          text: err instanceof Error ? err.message : 'Could not generate the image.',
          timestamp: Date.now(),
        },
      ])
    }
  }

  const homepageTab = searchParams.get('tab')
  const fabVisible = isAssistantFabVisible(visibility, pathname, homepageTab)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeVoice()
    }
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ askBar?: boolean; seed?: string }>).detail
      setVisibility('all')
      writeAssistantVisibility('all')
      if (detail?.seed) setMessageInput(detail.seed)
      if (detail?.askBar && pathname.startsWith('/ad-studio')) {
        setAskBarOpen(true)
        setIsOpen(false)
      } else {
        setIsOpen(true)
        setAskBarOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen)
    }
  }, [pathname])

  const applyVisibility = (next: AssistantVisibility) => {
    setVisibility(next)
    writeAssistantVisibility(next)
    setShowSettings(false)
    if (next === 'off') setIsOpen(false)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem(ASSISTANT_MUTE_KEY, next ? '1' : '0')
    if (next) stopSpeaking()
  }

  const closeVoice = () => {
    voiceHoldEnding.current = false
    voiceSend.current = false
    confirmListening.current = false
    pendingVoiceSpend.current = null
    setVoiceSpend(null)
    voicePhaseRef.current = null
    recognitionRef.current?.stop()
    stopSpeaking()
    setVoicePhase(null)
  }

  const releaseFabCapture = () => {
    const el = fabEl.current
    const id = capturedPointerId.current
    if (el && id != null) {
      try {
        el.releasePointerCapture(id)
      } catch {
        /* ignore */
      }
    }
    capturedPointerId.current = null
  }

  const onFabPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    try {
      pointerHandled.current = false
      fabEl.current = e.currentTarget as HTMLElement
      capturedPointerId.current = e.pointerId
      try {
        fabEl.current.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      unlockAssistantAudio()
      if (!isIosSafariLike()) warmupAssistantVoice()
      void fetchAssistantContext()
      holdTimer.current = window.setTimeout(() => {
        holding.current = true
        voiceSend.current = true
        transcriptRef.current = ''
        setVoiceTranscript('')
        setVoiceAnswer('')
        setVoiceSpend(null)
        pendingVoiceSpend.current = null
        voicePhaseRef.current = 'listening'
        setVoicePhase('listening')
        setIsOpen(false)
        setAskBarOpen(false)
        void startRecognition()
      }, 220)
    } catch (err) {
      console.warn('FAB pointerdown', err)
    }
  }

  const finishPointer = (asCancel: boolean) => {
    if (pointerHandled.current) return
    pointerHandled.current = true
    releaseFabCapture()
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (holding.current) {
      holding.current = false
      voiceHoldEnding.current = true
      unlockAssistantAudio()
      recognitionRef.current?.stop()
      window.setTimeout(() => completeVoiceHold(), 1400)
      return
    }
    if (asCancel) return
    if (voicePhaseRef.current || voiceSend.current || voiceHoldEnding.current) return
    if (pathname.startsWith('/ad-studio')) {
      setAskBarOpen((bar) => !bar)
      setIsOpen(false)
      return
    }
    setAskBarOpen(false)
    setIsOpen((open) => !open)
  }

  const onFabPointerUp = () => finishPointer(false)
  const onFabPointerCancel = () => finishPointer(true)
  const onFabLostPointerCapture = () => {
    if (holding.current || holdTimer.current) finishPointer(true)
  }

  if (!fabVisible && !isOpen && !voicePhase && !askBarOpen) return null

  return (
    <>
      <motion.button
        id="chat-trigger"
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerCancel}
        onLostPointerCapture={onFabLostPointerCapture}
        onContextMenu={(e) => e.preventDefault()}
        className={`fixed left-[20px] md:bottom-[30px] md:left-[30px] w-[60px] h-[60px] md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(255,215,0,0.25)] border border-gold/30 touch-none ${
          pathname.startsWith('/ad-studio') ? 'z-[50]' : 'z-[1000]'
        }`}
        style={{
          background: 'linear-gradient(135deg, #FFD700, #B8860B)',
          bottom: 'calc(var(--dmf-safe-bottom) + 1.25rem)',
        }}
        animate={{
          scale: holding.current || isRecording ? 1.08 : 1,
          boxShadow: [
            '0 0 0 0px rgba(255, 215, 0, 0.35)',
            '0 0 0 12px rgba(255, 215, 0, 0)',
            '0 0 0 0px rgba(255, 215, 0, 0)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
        whileHover={{ scale: 1.06 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {askBarOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed z-[999] left-[88px] right-3 md:left-[110px] md:right-auto md:w-[min(420px,calc(100vw-140px))] max-w-[calc(100vw-5.75rem)] rounded-2xl border border-gold/35 bg-black/80 backdrop-blur-xl p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
            style={{
              bottom: 'calc(var(--dmf-safe-bottom) + 1.25rem)',
            }}
          >
            {(() => {
              const lastBot = [...(currentChat?.messages || [])]
                .reverse()
                .find((m) => m.sender === 'bot' && m.text && !m.text.startsWith('Welcome to DMF'))
              if (!lastBot) return null
              return (
                <div className="mb-2 px-1">
                  <p className="text-[11px] text-white/70 line-clamp-3">{lastBot.text}</p>
                  {pathname.startsWith('/ad-studio') && (
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('dmf-studio-apply', { detail: { brief: lastBot.text } })
                        )
                      }
                      className="mt-1 text-[9px] uppercase tracking-wider text-gold"
                    >
                      Use in prompt
                    </button>
                  )}
                </div>
              )
            })()}
            <div className="flex flex-col gap-2">
              {pendingImages.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {pendingImages.map((url) => (
                    <div key={url} className="relative h-10 w-10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-10 w-10 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => setPendingImages((prev) => prev.filter((u) => u !== url))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-white text-[8px]"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => chatFileRef.current?.click()}
                className="shrink-0 h-10 px-2 rounded-xl border border-gold/30 text-gold text-[9px] uppercase"
                title="Attach images"
              >
                Img
              </button>
              <textarea
                rows={2}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder="Ask about this look, character, or scenes…"
                className="flex-1 min-w-0 bg-white/5 border border-gold/20 rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
              />
              <button
                type="button"
                onClick={() => startRecognition()}
                className="shrink-0 h-10 w-10 rounded-xl border border-gold/30 text-gold"
                title="Mic"
              >
                Mic
              </button>
              <button
                type="button"
                disabled={
                  isTyping ||
                  uploadingImages ||
                  (!messageInput.trim() && pendingImages.length === 0)
                }
                onClick={() => void handleSend()}
                className="shrink-0 h-10 px-3 rounded-xl bg-gold text-black text-[10px] uppercase tracking-wider font-bold disabled:opacity-40"
              >
                Send
              </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAskBarOpen(false)
                  setIsOpen(true)
                }}
                className="text-[9px] uppercase tracking-wider text-gold/70"
              >
                Full chat
              </button>
              <button
                type="button"
                onClick={() => setAskBarOpen(false)}
                className="text-[9px] uppercase tracking-wider text-white/40"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`fixed z-[999] overflow-hidden flex flex-row shadow-[0_30px_60px_rgba(0,0,0,0.55)] transition-all duration-300 ${
              isFullscreen
                ? 'inset-0 w-full h-full rounded-none pt-[var(--dmf-safe-top)] pb-[var(--dmf-safe-bottom)]'
                : 'right-4 left-4 md:right-auto md:left-[30px] md:w-[520px] w-auto rounded-[24px] border border-gold/25'
            }`}
            style={{
              background: 'rgba(8, 8, 10, 0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
                  ...(isFullscreen
                ? {}
                : {
                    bottom: 'calc(5.75rem + var(--dmf-safe-bottom))',
                    height: 'min(700px, calc(100svh - 8rem - var(--dmf-safe-bottom)))',
                    maxHeight: 'calc(100svh - 8rem - var(--dmf-safe-bottom))',
                  }),
            }}
          >
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: windowWidth < 768 ? 160 : 200, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="h-full bg-black/50 border-r border-gold/10 flex flex-col overflow-hidden shrink-0"
                >
                  <div className="p-4 flex gap-2 border-b border-gold/10">
                    <button
                      onClick={createNewChat}
                      className="grow bg-gold text-black text-[10px] font-bold py-2 rounded-lg hover:bg-white transition-all uppercase tracking-widest"
                    >
                      + New Chat
                    </button>
                  </div>
                  <div className="grow overflow-y-auto p-2 flex flex-col gap-1">
                    {chats.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCurrentChatId(c.id)
                          setShowHistory(false)
                        }}
                        className={`p-3 rounded-lg cursor-pointer text-[10px] transition-all flex justify-between items-center group ${
                          currentChatId === c.id
                            ? 'bg-gold/10 text-gold border border-gold/20'
                            : 'text-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate pr-2">{c.title}</span>
                        <button
                          onClick={(e) => deleteChat(e, c.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              <div className="p-5 flex flex-col gap-3 bg-black/40 border-b border-gold/15 z-20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={`p-2 rounded-lg transition-all ${
                        showHistory ? 'bg-gold text-black' : 'text-gold hover:bg-gold/10'
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {isSpeaking && (
                      <button
                        onClick={stopSpeaking}
                        className="bg-red-500/20 border border-red-500/50 text-red-500 text-[8px] px-2 py-1 rounded-full animate-pulse font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                      >
                        Mute AI
                      </button>
                    )}
                    <h1 className="text-gold text-sm md:text-base font-serif tracking-[0.12em] m-0 uppercase flex-shrink-0">
                      DMF
                    </h1>
                  </div>
                  {showSettings && (
                    <div className="flex gap-2 pt-2">
                      {(['all', 'home', 'off'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => applyVisibility(opt)}
                          className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border ${
                            visibility === opt
                              ? 'bg-gold text-black border-gold'
                              : 'border-gold/25 text-gold/70'
                          }`}
                        >
                          {opt === 'all' ? 'Everywhere' : opt === 'home' ? 'Home only' : 'Off'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSettings((s) => !s)}
                      className="bg-none border-none text-white/40 hover:text-gold transition-all p-1 text-[10px] uppercase tracking-widest"
                      title="Assistant settings"
                    >
                      Show
                    </button>
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="bg-none border-none text-white/40 hover:text-gold transition-all p-1"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="bg-none border-none text-white text-2xl cursor-pointer opacity-40 hover:opacity-100 hover:text-gold transition-all p-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gold/50 font-bold uppercase tracking-widest shrink-0">
                        Model
                      </span>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-black border border-gold/20 rounded-[8px] px-2 py-1.5 text-gold text-[9px] outline-none focus:border-gold cursor-pointer grow transition-all font-mono"
                      >
                        {(availableModels.length > 0
                          ? availableModels
                          : [{ id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B' }]
                        ).map((m) => (
                          <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[8px] text-white/30 pl-1">
                      Auto-fallback: Groq → Gemma → OpenRouter Free → others
                    </p>
                  </div>
              </div>

              <>
                  <div
                    ref={chatAreaRef}
                    className="grow p-4 md:p-6 overflow-y-auto flex flex-col gap-5 scrollbar-thin scrollbar-thumb-gold/20"
                  >
                    {currentChat?.messages.map((msg, i) => (
                      <motion.div
                        key={`${msg.timestamp}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col gap-2 ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        {msg.reasoning && (
                          <details className="w-full max-w-[85%] group mb-1">
                            <summary className="text-[9px] text-gold/40 font-bold uppercase tracking-widest cursor-pointer hover:text-gold transition-colors list-none flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold/20" />
                              Engineer Thought Process
                            </summary>
                            <div className="mt-3 p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-white/50 leading-relaxed italic">
                              {msg.reasoning}
                            </div>
                          </details>
                        )}

                        <div
                          className={`max-w-[85%] p-4 rounded-[18px] text-[13px] leading-relaxed relative ${
                            msg.sender === 'bot'
                              ? 'bg-white/[0.04] text-white/90 border border-white/10 rounded-bl-[6px]'
                              : 'bg-gold/90 text-black font-medium rounded-br-[6px]'
                          }`}
                        >
                          {msg.sender === 'bot' ? (
                            <div className="flex flex-col gap-2">
                              {msg.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={msg.imageUrl}
                                  alt=""
                                  className="w-full max-h-64 object-contain rounded-lg border border-gold/20"
                                />
                              )}
                              {msg.assets && msg.assets.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {msg.assets.map((asset) => (
                                    <button
                                      key={asset.id}
                                      type="button"
                                      onClick={() => attachAssetToStudio(asset)}
                                      className="overflow-hidden rounded-lg border border-gold/20 text-left"
                                    >
                                      {asset.thumb || asset.url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={asset.thumb || asset.url}
                                          alt=""
                                          className="h-24 w-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-24 bg-white/5" />
                                      )}
                                      <p className="p-1.5 text-[10px] text-white/70 line-clamp-2">
                                        {asset.title}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <MarkdownText text={msg.text} onPreview={(code) => setPreviewCode(code)} />
                              {msg.spend && !msg.spend.done && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {msg.spend.canAfford ? (
                                    <button
                                      type="button"
                                      onClick={() => void confirmSpend(msg)}
                                      className="rounded-full bg-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black"
                                    >
                                      Generate · {msg.spend.priceCoins}c
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.location.href = '/coin-wallet'
                                      }}
                                      className="rounded-full border border-gold/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-gold"
                                    >
                                      Get Coinz
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-end gap-2">
                                {msg.imageUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      attachAssetToStudio({
                                        url: msg.imageUrl,
                                        title: msg.text,
                                        kind: 'image',
                                      })
                                    }
                                    className="text-[9px] uppercase tracking-widest text-gold/70 hover:text-gold"
                                  >
                                    Use in studio
                                  </button>
                                )}
                                <button
                                  onClick={() => speak(msg.text)}
                                  className="opacity-20 hover:opacity-100 transition-opacity p-1"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {msg.imageUrls && msg.imageUrls.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.imageUrls.map((url) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={url}
                                      src={url}
                                      alt=""
                                      className="h-16 w-16 rounded-lg object-cover border border-black/20"
                                    />
                                  ))}
                                </div>
                              )}
                              {msg.text}
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] text-white/20 uppercase tracking-tighter">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <div className="self-start flex flex-col gap-2 w-full">
                        <div className="bg-white/[0.04] border border-gold/20 rounded-[15px] p-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 w-fit text-gold/60">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                          Processing Query...
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col border-t border-gold/10 bg-black/40">
                    { currentChat?.messages.length === 1 && (
                      <div className="p-4 pb-0 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {suggestedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(q)}
                            className="whitespace-nowrap bg-gold/5 border border-gold/10 text-gold text-[9px] px-4 py-2 rounded-full hover:bg-gold hover:text-black transition-all font-bold uppercase tracking-widest"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="p-4 md:p-6 flex flex-col gap-2">
                      <input
                        ref={chatFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.heic"
                        multiple
                        className="hidden"
                        onChange={(e) => attachChatImages(e.target.files)}
                      />
                      {pendingImages.length > 0 && (
                        <div className="flex gap-2 flex-wrap px-1">
                          {pendingImages.map((url) => (
                            <div key={url} className="relative h-14 w-14">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                className="h-14 w-14 rounded-lg object-cover border border-gold/30"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingImages((prev) => prev.filter((u) => u !== url))
                                }
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white text-[10px]"
                              >
                                x
                              </button>
                            </div>
                          ))}
                          {uploadingImages && (
                            <span className="text-[9px] text-gold/60 self-center uppercase tracking-wider">
                              Uploading…
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3 items-end">
                      <button
                        type="button"
                        onClick={() => chatFileRef.current?.click()}
                        disabled={uploadingImages || pendingImages.length >= MAX_CHAT_IMAGES}
                        className="shrink-0 h-[52px] w-[52px] rounded-[18px] border border-gold/30 text-gold text-[10px] uppercase tracking-wider font-bold disabled:opacity-40"
                        title="Attach images"
                      >
                        Img
                      </button>
                      <div className="grow relative bg-white/5 border border-white/10 rounded-[18px] transition-all focus-within:border-gold">
                        <textarea
                          placeholder="Ask DMF anything… or attach stills"
                          rows={1}
                          className="w-full bg-transparent p-4 pr-12 text-white text-[13px] outline-none resize-none no-scrollbar"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              void handleSend()
                            }
                          }}
                        />
                        <button
                          onClick={() => startRecognition()}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-all ${
                            isRecording
                              ? 'text-red-500 animate-pulse'
                              : 'text-white/20 hover:text-gold'
                          }`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => void handleSend()}
                        disabled={
                          (!messageInput.trim() && pendingImages.length === 0) || uploadingImages
                        }
                        className="bg-gold border-none w-[52px] h-[52px] rounded-[18px] flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-white transition-all disabled:opacity-10 shadow-xl shadow-gold/10 group"
                      >
                        <svg
                          className="group-hover:rotate-12 transition-transform"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#000"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                      </button>
                      </div>
                    </div>
                  </div>
                </>

              <AnimatePresence>
                {previewCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 bg-black/98 z-[1001] flex flex-col"
                  >
                    <div className="p-5 bg-zinc-900 border-b border-gold/10 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                        <span className="text-gold font-bold text-[10px] tracking-[4px] uppercase">
                          Senior Preview Env
                        </span>
                      </div>
                      <button
                        onClick={() => setPreviewCode(null)}
                        className="text-white hover:text-gold transition-colors text-3xl font-light"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="grow bg-white relative">
                      <iframe
                        srcDoc={previewCode}
                        className="w-full h-full border-none"
                        title="Code Preview"
                      />
                    </div>
                    <div className="p-4 bg-black/80 text-white/30 text-[9px] text-center uppercase tracking-widest font-mono">
                      [Sandbox Mode Active] :: Virtualized Rendering
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AssistantVoiceOverlay
        phase={voicePhase}
        transcript={voiceTranscript}
        answer={voiceAnswer}
        muted={muted}
        showStudioActions={pathname.startsWith('/ad-studio')}
        spendLabel={
          voiceSpend
            ? voiceSpend.canAfford
              ? `Generate · ${voiceSpend.priceCoins}c`
              : null
            : null
        }
        spendCanAfford={voiceSpend?.canAfford}
        onConfirmSpend={() => void confirmVoiceSpend()}
        onDeclineSpend={declineVoiceSpend}
        onUseInPrompt={() => {
          if (!voiceAnswer.trim()) return
          window.dispatchEvent(
            new CustomEvent('dmf-studio-apply', { detail: { brief: voiceAnswer } })
          )
        }}
        onCopy={() => {
          void navigator.clipboard.writeText(voiceAnswer).catch(() => {})
        }}
        onMuteToggle={toggleMute}
        onClose={closeVoice}
      />
    </>
  )
}
