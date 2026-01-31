'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// --- Types ---
interface Message {
    sender: 'user' | 'bot';
    text: string;
    reasoning?: string;
    timestamp: number;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

// --- Markdown & Code Parser Component ---
const MarkdownText = ({ text, onPreview }: { text: string; onPreview: (code: string) => void }) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let currentCode = '';

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        alert('Code copied to clipboard!');
    };

    return (
        <div className="space-y-2">
            {lines.map((line, idx) => {
                if (line.startsWith('```')) {
                    if (inCodeBlock) {
                        const codeToPass = currentCode;
                        inCodeBlock = false;
                        currentCode = '';
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
                        );
                    }
                    inCodeBlock = true;
                    return null;
                }

                if (inCodeBlock) {
                    currentCode += line + '\n';
                    return null;
                }

                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={idx} className="m-0 min-h-[1em]">
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="text-gold font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

export default function PremiumChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [keyInput, setKeyInput] = useState('')
    const [messageInput, setMessageInput] = useState('')
    const [selectedModel, setSelectedModel] = useState('z-ai/glm-4.5-air:free')

    // Multi-chat states
    const [chats, setChats] = useState<ChatSession[]>([])
    const [currentChatId, setCurrentChatId] = useState<string | null>(null)

    const [isTyping, setIsTyping] = useState(false)
    const [previewCode, setPreviewCode] = useState<string | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    const chatAreaRef = useRef<HTMLDivElement>(null)

    const availableModels = [
        { name: 'GLM 4.5 Air', id: 'z-ai/glm-4.5-air:free' },
        { name: 'DeepSeek R1', id: 'deepseek/deepseek-r1-0528:free' }
    ]

    const suggestedQuestions = [
        "What services do you offer?",
        "Tell me about the artists",
        "Explain your pricing",
        "How can I book a session?"
    ]

    // --- Voice Logic (TTS) ---
    const speak = (text: string) => {
        // Stop any existing speech first
        window.speechSynthesis.cancel();

        const cleanedText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.');
        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Find a high-quality female voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = ['Google US English', 'Microsoft Zira', 'Samantha', 'Victoria', 'Fiona', 'Google UK English Female'];
        const femaleVoice = voices.find(v => preferredVoices.some(p => v.name.includes(p))) || voices.find(v => v.name.includes('female') || v.name.includes('Female'));

        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    // --- Voice Logic (STT) ---
    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return alert('Speech recognition not supported in this browser.');

        const recognition = new SpeechRecognition();
        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setMessageInput(transcript);
        };
        recognition.start();
    };

    // --- Persistence & Initialization ---
    useEffect(() => {
        const savedChats = localStorage.getItem('dmf_multi_chats');
        const savedAuth = localStorage.getItem('dmf_chat_unlocked');

        if (savedAuth === 'true') setIsUnlocked(true);

        if (savedChats) {
            const parsed = JSON.parse(savedChats);
            setChats(parsed);
            if (parsed.length > 0) {
                setCurrentChatId(parsed[0].id);
            } else {
                createNewChat();
            }
        } else {
            createNewChat();
        }
    }, []);

    useEffect(() => {
        if (chats.length > 0) {
            localStorage.setItem('dmf_multi_chats', JSON.stringify(chats));
        }
    }, [chats]);

    useEffect(() => {
        if (chatAreaRef.current) {
            chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
        }
    }, [currentChatId, chats, isTyping])

    const createNewChat = () => {
        const newId = Date.now().toString();
        const newChat: ChatSession = {
            id: newId,
            title: 'New Session',
            messages: [{ sender: 'bot', text: 'Welcome to DMF Premium. How can I assist you today?', timestamp: Date.now() }],
            timestamp: Date.now()
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newId);
        setShowHistory(false);
    };

    const currentChat = chats.find(c => c.id === currentChatId) || chats[0];

    const updateCurrentChatMessages = (updater: (msgs: Message[]) => Message[]) => {
        setChats(prev => prev.map(c => {
            if (c.id === currentChatId) {
                const newMsgs = updater(c.messages);
                // Update title based on first user message
                let newTitle = c.title;
                const firstUserMsg = newMsgs.find(m => m.sender === 'user');
                if (firstUserMsg && c.title === 'New Session') {
                    newTitle = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
                }
                return { ...c, messages: newMsgs, title: newTitle };
            }
            return c;
        }));
    };

    const handleUnlock = () => {
        if (keyInput.trim() === 'DMF2026' || keyInput.trim() === 'admin') {
            setIsUnlocked(true)
            localStorage.setItem('dmf_chat_unlocked', 'true');
        } else {
            alert('Invalid Key. Please try again.')
        }
    }

    const deleteChat = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setChats(prev => {
            const filtered = prev.filter(c => c.id !== id);
            if (currentChatId === id) {
                setCurrentChatId(filtered.length > 0 ? filtered[0].id : null);
                if (filtered.length === 0) setTimeout(createNewChat, 0);
            }
            return filtered;
        });
    };

    const handleSend = async (customMessage?: string) => {
        const textToSend = customMessage || messageInput;
        if (!textToSend.trim() || isTyping) return

        const userMsg: Message = { sender: 'user', text: textToSend, timestamp: Date.now() }
        updateCurrentChatMessages(prev => [...prev, userMsg]);
        setMessageInput('')
        setIsTyping(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    model: selectedModel
                })
            })

            const data = await response.json()
            setIsTyping(false)

            if (data.message) {
                const botMsg: Message = {
                    sender: 'bot',
                    text: data.message,
                    reasoning: data.reasoning,
                    timestamp: Date.now()
                };
                updateCurrentChatMessages(prev => [...prev, botMsg]);
            } else {
                updateCurrentChatMessages(prev => [...prev, {
                    sender: 'bot',
                    text: `Error: ${data.details || 'Internal Provider Issue'}`,
                    timestamp: Date.now()
                }]);
            }
        } catch (error) {
            setIsTyping(false)
            updateCurrentChatMessages(prev => [...prev, {
                sender: 'bot',
                text: 'Connection Lost: Unable to reach the DMF AI Hub.',
                timestamp: Date.now()
            }]);
        }
    }

    return (
        <>
            {/* Floating Button */}
            <motion.button
                id="chat-trigger"
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-[30px] right-[30px] w-[70px] h-[70px] rounded-full z-[1000] flex items-center justify-center cursor-pointer shadow-[0_10px_30px_rgba(255,215,0,0.3)] border-none"
                style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}
                animate={{
                    boxShadow: [
                        "0 0 0 0px rgba(255, 215, 0, 0.7)",
                        "0 0 0 20px rgba(255, 215, 0, 0)",
                        "0 0 0 0px rgba(255, 215, 0, 0)"
                    ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                whileHover={{ scale: 1.1 }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-[110px] right-[30px] w-[450px] h-[700px] z-[999] rounded-[24px] border border-[#FFD700] overflow-hidden flex flex-row shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                        style={{
                            background: 'rgba(10, 10, 10, 0.98)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)'
                        }}
                    >
                        {/* History Sidebar */}
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 200, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="h-full bg-black/50 border-r border-[#FFD700]/10 flex flex-col overflow-hidden"
                                >
                                    <div className="p-4 flex gap-2 border-b border-[#FFD700]/10">
                                        <button
                                            onClick={createNewChat}
                                            className="grow bg-[#FFD700] text-black text-[10px] font-bold py-2 rounded-lg hover:bg-white transition-all uppercase tracking-widest"
                                        >
                                            + New Chat
                                        </button>
                                    </div>
                                    <div className="grow overflow-y-auto p-2 flex flex-col gap-1">
                                        {chats.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => { setCurrentChatId(c.id); setShowHistory(false); }}
                                                className={`p-3 rounded-lg cursor-pointer text-[10px] transition-all flex justify-between items-center group ${currentChatId === c.id ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'text-white/40 hover:bg-white/5'}`}
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

                        {/* Main Chat Area */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                            {/* Header */}
                            <div className="p-5 flex flex-col gap-3 bg-black/50 border-b border-[#FFD700]/20 z-20">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className={`p-2 rounded-lg transition-all ${showHistory ? 'bg-gold text-black' : 'text-gold hover:bg-gold/10'}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </button>
                                        {isSpeaking && (
                                            <button
                                                onClick={stopSpeaking}
                                                className="bg-red-500/20 border border-red-500/50 text-red-500 text-[8px] px-2 py-1 rounded-full animate-pulse font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                                            >
                                                Mute AI
                                            </button>
                                        )}
                                        <h1 className="text-[#FFD700] text-sm font-bold tracking-[3px] m-0 uppercase flex-shrink-0">DMF PREMIUM</h1>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="bg-none border-none text-white text-2xl cursor-pointer opacity-40 hover:opacity-100 hover:text-[#FFD700] transition-all p-1"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>

                                {isUnlocked && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-[#FFD700]/50 font-bold uppercase tracking-widest">Model:</span>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="bg-black border border-[#FFD700]/20 rounded-[8px] px-2 py-1.5 text-[#FFD700] text-[9px] outline-none focus:border-[#FFD700] cursor-pointer grow transition-all font-mono"
                                        >
                                            {availableModels.map(m => (
                                                <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Auth Bar */}
                            {!isUnlocked && (
                                <div className="p-3 bg-gold/5 flex gap-2 border-b border-gold/10 z-20">
                                    <input
                                        type="password"
                                        placeholder="PREMIUM ACCESS KEY"
                                        className="grow bg-black/50 border border-gold/20 rounded-[10px] p-2 py-2 text-white text-[10px] outline-none focus:border-gold tracking-widest"
                                        value={keyInput}
                                        onChange={(e) => setKeyInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                                    />
                                    <button
                                        onClick={handleUnlock}
                                        className="bg-gold text-black border-none px-4 py-2 rounded-[10px] font-bold text-[10px] cursor-pointer hover:bg-white transition-all whitespace-nowrap uppercase tracking-widest"
                                    >
                                        Unlock
                                    </button>
                                </div>
                            )}

                            {/* Locked Overlay */}
                            {!isUnlocked && (
                                <div className="absolute inset-0 bg-black/90 backdrop-blur-[8px] z-10 flex flex-col items-center justify-center text-gold text-center p-8">
                                    <div className="w-20 h-20 rounded-full border border-gold/20 flex items-center justify-center mb-6 animate-pulse">
                                        <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    </div>
                                    <h3 className="text-sm font-bold tracking-[4px] uppercase mb-4">Secured Access</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-[2px] leading-relaxed">Please enter your verified DMF Premium Credential to initialize the Senior Engineer session.</p>
                                </div>
                            )}

                            {/* Chat Area */}
                            <div
                                ref={chatAreaRef}
                                className="grow p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin scrollbar-thumb-gold/20"
                            >
                                {currentChat?.messages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        {/* Optional Reasoning for Bot */}
                                        {msg.reasoning && (
                                            <details className="w-full max-w-[85%] group mb-1">
                                                <summary className="text-[9px] text-[#FFD700]/40 font-bold uppercase tracking-widest cursor-pointer hover:text-gold transition-colors list-none flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gold/20" />
                                                    Engineer Thought Process
                                                </summary>
                                                <div className="mt-3 p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-white/50 leading-relaxed italic">
                                                    {msg.reasoning}
                                                </div>
                                            </details>
                                        )}

                                        <div className={`max-w-[85%] p-4 rounded-[20px] text-[13px] leading-relaxed relative ${msg.sender === 'bot'
                                            ? 'bg-zinc-900/40 text-white/90 border-l-2 border-gold rounded-bl-[4px] shadow-2xl'
                                            : 'bg-gradient-to-br from-gold to-gold-dark text-black font-semibold rounded-br-[4px] shadow-lg shadow-gold/10'
                                            }`}>
                                            {msg.sender === 'bot' ? (
                                                <div className="flex flex-col gap-2">
                                                    <MarkdownText text={msg.text} onPreview={(code) => setPreviewCode(code)} />
                                                    <button
                                                        onClick={() => speak(msg.text)}
                                                        className="self-end opacity-20 hover:opacity-100 transition-opacity p-1"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>
                                        <span className="text-[8px] text-white/20 uppercase tracking-tighter">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="self-start flex flex-col gap-2 w-full">
                                        <div className="bg-zinc-900/40 border-l-2 border-gold rounded-[15px] p-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 w-fit text-gold/60">
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

                            {/* Bottom Controls */}
                            <div className="flex flex-col border-t border-[#FFD700]/10 bg-black/40">
                                {/* Suggestion Chips */}
                                {isUnlocked && currentChat?.messages.length === 1 && (
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

                                {/* Input Container */}
                                <div className="p-6 flex gap-3 items-end">
                                    <div className="grow relative bg-white/5 border border-white/10 rounded-[18px] transition-all focus-within:border-gold">
                                        <textarea
                                            placeholder="Consult DMF Premium..."
                                            rows={1}
                                            className="w-full bg-transparent p-4 pr-12 text-white text-[13px] outline-none resize-none no-scrollbar disabled:opacity-30"
                                            disabled={!isUnlocked}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={startRecording}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-white/20 hover:text-gold'}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" /></svg>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!isUnlocked || !messageInput.trim()}
                                        className="bg-gold border-none w-[52px] h-[52px] rounded-[18px] flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-white transition-all disabled:opacity-10 shadow-xl shadow-gold/10 group"
                                    >
                                        <svg className="group-hover:rotate-12 transition-transform" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Code Preview Overlay */}
                            <AnimatePresence>
                                {previewCode && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="absolute inset-0 bg-black/98 z-[1001] flex flex-col"
                                    >
                                        <div className="p-5 bg-zinc-900 border-b border-gold/10 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                                <span className="text-gold font-bold text-[10px] tracking-[4px] uppercase">Senior Preview Env</span>
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
        </>
    )
}
