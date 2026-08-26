'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useSearchParams } from 'next/navigation'
import AssistantVoiceOverlay, { type VoicePhase } from './AssistantVoiceOverlay'
import { parseAssistantActions, runAssistantActions } from '@/lib/assistant-actions'
import { speakAssistantText, stopAssistantSpeech } from '@/lib/assistant-tts'
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
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

interface AdVideoPricingResponse {
  priceCoins: number
  balance: number
  canAfford: boolean
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
  fanClub?: boolean
  canEnhance?: boolean
}

type ChatMode = 'chat' | 'ads'

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
  const [askBarOpen, setAskBarOpen] = useState(false)

  const chatAreaRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<number | null>(null)
  const holding = useRef(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const voiceSend = useRef(false)
  const transcriptRef = useRef('')

  const [chatMode, setChatMode] = useState<ChatMode>('chat')
  const [adPrompt, setAdPrompt] = useState('')
  const [generatedVideoUrl] = useState<string | null>(null)
  const [adPricing, setAdPricing] = useState<AdVideoPricingResponse | null>(null)

  const suggestedQuestions = [
    'What services do you offer?',
    'Tell me about the artists',
    'Explain your pricing',
    'How can I book a session?',
  ]

  const fetchAdPricing = useCallback(async () => {
    try {
      const res = await fetch('/api/video/quote')
      if (res.ok) {
        const data: AdVideoPricingResponse = await res.json()
        setAdPricing(data)
      } else {
        console.error('Failed to fetch ad pricing', await res.json())
        setAdPricing(null)
      }
    } catch (error) {
      console.error('Error fetching ad pricing:', error)
      setAdPricing(null)
    }
  }, [])

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

  useEffect(() => {
    if (isOpen && chatMode === 'ads') {
      fetchAdPricing()
    }
  }, [isOpen, chatMode, fetchAdPricing])

  const speak = async (text: string) => {
    stopAssistantSpeech()
    setIsSpeaking(true)
    try {
      await speakAssistantText(text, {
        muted,
        onWarmup: (warming) => {
          if (voiceSend.current) setVoicePhase(warming ? 'warmup' : 'speaking')
        },
      })
    } finally {
      setIsSpeaking(false)
    }
  }

  const stopSpeaking = () => {
    stopAssistantSpeech()
    setIsSpeaking(false)
  }

  const startRecognition = () => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition
    if (!Ctor) {
      alert('Voice needs Chrome or Safari with mic permission.')
      return
    }
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onresult = (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => {
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
    recognitionRef.current = recognition
    recognition.start()
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
    if (!textToSend.trim() || isTyping) return

    const userMsg: Message = { sender: 'user', text: textToSend, timestamp: Date.now() }
    updateCurrentChatMessages((prev) => [...prev, userMsg])
    setMessageInput('')
    setIsTyping(true)

    try {
      const prior = (currentChat?.messages || [])
        .filter((m) => m.text !== 'Welcome to DMF Premium. How can I assist you today?')
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...prior, { role: 'user', content: textToSend }],
          model: selectedModel,
          pageContext: (() => {
            const path = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
            let snap = ''
            try {
              snap = sessionStorage.getItem('dmf-studio-snapshot') || ''
            } catch {
              /* ignore */
            }
            return snap ? `${path}\nStudio snapshot: ${snap}` : path
          })(),
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        for (const line of lines) {
          const jsonStr = line.trim()
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)
            if (data.message) botResponseText += data.message
            if (data.reasoning) botReasoning += data.reasoning
            ensureBotMsg()
            patchBotMsg()
          } catch {
            /* incomplete line */
          }
        }
      }

      if (lineBuffer.trim()) {
        try {
          const data = JSON.parse(lineBuffer.trim())
          if (data.message) botResponseText += data.message
          if (data.reasoning) botReasoning += data.reasoning
          ensureBotMsg()
          patchBotMsg()
        } catch {
          /* ignore trailing partial */
        }
      }

      setIsTyping(false)
      if (botMsgStarted) patchBotMsg()
      const parsed = parseAssistantActions(botResponseText)
      if (parsed.clean !== botResponseText) {
        botResponseText = parsed.clean
        patchBotMsg()
      }
      setVoiceAnswer(parsed.clean)
      if (voiceSend.current) {
        setVoicePhase(muted ? 'done' : 'speaking')
        await speak(parsed.clean)
        setVoicePhase('done')
        voiceSend.current = false
      }
      runAssistantActions(parsed.actions)
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

  const makeIntoAd = (text: string) => {
    window.location.href = `/ad-studio?brief=${encodeURIComponent(text.slice(0, 2000))}`
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
    recognitionRef.current?.stop()
    stopSpeaking()
    setVoicePhase(null)
    voiceSend.current = false
  }

  const onFabPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    holdTimer.current = window.setTimeout(() => {
      holding.current = true
      voiceSend.current = true
      setVoiceTranscript('')
      setVoiceAnswer('')
      setVoicePhase('listening')
      setIsOpen(false)
      startRecognition()
    }, 220)
  }

  const onFabPointerUp = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (holding.current) {
      holding.current = false
      recognitionRef.current?.stop()
      const text = transcriptRef.current.trim()
      if (text) {
        setVoicePhase('thinking')
        void handleSend(text)
      } else {
        setVoicePhase(null)
        voiceSend.current = false
      }
      return
    }
    setIsOpen((open) => {
      if (pathname.startsWith('/ad-studio')) {
        setAskBarOpen((bar) => !bar)
        return false
      }
      setAskBarOpen(false)
      return !open
    })
  }

  if (!fabVisible && !isOpen && !voicePhase && !askBarOpen) return null

  return (
    <>
      <motion.button
        id="chat-trigger"
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed bottom-[20px] left-[20px] md:bottom-[30px] md:left-[30px] w-[60px] h-[60px] md:w-[70px] md:h-[70px] rounded-full z-[1000] flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(255,215,0,0.25)] border border-gold/30 touch-none"
        style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}
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
            className="fixed z-[999] left-[88px] right-3 bottom-[22px] md:left-[110px] md:right-auto md:w-[min(420px,calc(100vw-140px))] rounded-2xl border border-gold/35 bg-black/80 backdrop-blur-xl p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
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
            <div className="flex items-end gap-2">
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
                disabled={isTyping || !messageInput.trim()}
                onClick={() => void handleSend()}
                className="shrink-0 h-10 px-3 rounded-xl bg-gold text-black text-[10px] uppercase tracking-wider font-bold disabled:opacity-40"
              >
                Send
              </button>
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
                ? 'inset-0 w-full h-full rounded-none'
                : 'bottom-[90px] md:bottom-[110px] right-4 left-4 md:right-auto md:left-[30px] md:w-[520px] md:h-[700px] w-auto h-[calc(100dvh-110px)] rounded-[24px] border border-gold/25'
            }`}
            style={{
              background: 'rgba(8, 8, 10, 0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
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
                    {adPricing?.isAuthenticated && (
                      <span className="hidden sm:inline text-[10px] font-mono text-gold/80 border border-gold/20 px-2 py-1 rounded-md">
                        {adPricing.balance} Coinz
                      </span>
                    )}
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

                { chatMode === 'chat' && (
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
                )}
              </div>

              <div className="flex border-b border-gold/15 bg-black/30 px-4">
                  <button
                    onClick={() => setChatMode('chat')}
                    className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors border-b ${
                      chatMode === 'chat'
                        ? 'text-gold border-gold'
                        : 'text-white/35 border-transparent hover:text-white/70'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setChatMode('ads')}
                    className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors border-b ${
                      chatMode === 'ads'
                        ? 'text-gold border-gold'
                        : 'text-white/35 border-transparent hover:text-white/70'
                    }`}
                  >
                    Ads
                  </button>
                </div>

              {chatMode === 'chat' && (
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
                              <MarkdownText text={msg.text} onPreview={(code) => setPreviewCode(code)} />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => makeIntoAd(msg.text)}
                                  className="opacity-40 hover:opacity-100 transition-opacity text-[9px] uppercase tracking-wider text-gold"
                                  title="Make this into an ad"
                                >
                                  Make ad
                                </button>
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
                            msg.text
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

                    <div className="p-4 md:p-6 flex gap-3 items-end">
                      <div className="grow relative bg-white/5 border border-white/10 rounded-[18px] transition-all focus-within:border-gold">
                        <textarea
                          placeholder="Ask DMF anything…"
                          rows={1}
                          className="w-full bg-transparent p-4 pr-12 text-white text-[13px] outline-none resize-none no-scrollbar"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSend()
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
                        onClick={() => handleSend()}
                        disabled={!messageInput.trim()}
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
                </>
              )}

              {chatMode === 'ads' && (
                <div className="grow p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gold/20 flex flex-col gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-gold/50 mb-1">
                      Seedance
                    </p>
                    <h2 className="text-xl font-serif text-gold">Ad Studio</h2>
                    <p className="text-xs text-white/40 mt-1">
                      Full-screen Sora-style studio for single shots and storyboards.
                    </p>
                  </div>

                  {adPricing && adPricing.isAuthenticated ? (
                    <>
                      <div className="border border-gold/20 rounded-xl p-4 flex flex-col gap-2 bg-gold/[0.03]">
                        <p className="text-xs text-white/70 uppercase tracking-wider">
                          Balance:{' '}
                          <span className="text-gold font-mono font-bold">
                            {adPricing.balance} Coinz
                          </span>
                        </p>
                        <p className="text-sm text-gold font-mono font-bold">
                          {adPricing.priceCoins} Coinz / clip
                          {adPricing.discountPercent > 0 && (
                            <span className="text-white/50 text-xs ml-2 font-sans font-normal">
                              −{adPricing.discountPercent}% · {adPricing.tierOrFanClub}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-white/70 uppercase tracking-wider">
                          Quick brief
                        </label>
                        <textarea
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-gold resize-none"
                          rows={3}
                          value={adPrompt}
                          onChange={(e) => setAdPrompt(e.target.value)}
                          placeholder="Optional — opens with this prompt in Ad Studio…"
                        />
                      </div>

                      <a
                        href={
                          adPrompt.trim()
                            ? `/ad-studio?brief=${encodeURIComponent(adPrompt.trim())}`
                            : '/ad-studio'
                        }
                        className="bg-gold text-black py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors text-center"
                      >
                        Open Ad Studio
                      </a>

                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            label: 'Artist drop',
                            prompt:
                              'Cinematic vertical promo for a DMF artist single drop — gold accents, night city energy, luxury hip-hop aesthetic.',
                          },
                          {
                            label: 'Editing service',
                            prompt:
                              'Sleek ad for DMF commercial video editing — before/after energy, crisp cuts, premium gold-black brand feel.',
                          },
                          {
                            label: 'Event promo',
                            prompt:
                              'High-energy event promo for a Da Money Fam live night — crowd energy, stage lights, luxury nightlife.',
                          },
                        ].map((preset) => (
                          <a
                            key={preset.label}
                            href={`/ad-studio?brief=${encodeURIComponent(preset.prompt)}`}
                            className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/20 text-gold/80 hover:bg-gold hover:text-black transition-colors"
                          >
                            {preset.label}
                          </a>
                        ))}
                      </div>

                      {generatedVideoUrl && (
                        <div className="mt-2 p-4 border border-gold/20 rounded-xl flex flex-col gap-3 items-center bg-black/40">
                          <h3 className="text-sm font-serif text-gold">Last result</h3>
                          <div className="w-full max-w-[200px] aspect-[9/16] bg-black rounded-lg overflow-hidden border border-white/10">
                            <video
                              key={generatedVideoUrl}
                              src={generatedVideoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <a
                            href="/ad-studio"
                            className="text-[10px] text-gold uppercase tracking-widest underline"
                          >
                            Open in studio
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-white/60 py-12 space-y-3">
                      <p className="text-sm">Sign in to generate ads with Coinz.</p>
                      <a
                        href="/account"
                        className="inline-block text-gold text-xs uppercase tracking-widest underline"
                      >
                        Go to account
                      </a>
                    </div>
                  )}
                </div>
              )}

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
