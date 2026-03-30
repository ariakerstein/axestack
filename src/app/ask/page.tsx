'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { CANCER_TYPES, PRIMARY_CATEGORIES, BLOOD_CANCERS } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'

interface Citation {
  title: string
  url: string
}

interface FollowUpQuestion {
  id: string
  question: string
  category?: string
  icon?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  followUpQuestions?: FollowUpQuestion[]
  confidenceScore?: number
  isLoading?: boolean
  typingComplete?: boolean
  feedback?: 'positive' | 'negative' | null
}

export default function AskPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cancerType, setCancerType] = useState<string>('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const FREE_QUESTION_LIMIT = 3

  const suggestedQuestions = [
    "What questions should I ask my oncologist at my next appointment?",
    "How can I find clinical trials that match my diagnosis?",
    "What are the latest treatment options for my cancer type?",
    "How do I interpret my biomarker test results?"
  ]

  // Show welcome message on mount
  useEffect(() => {
    if (!hasShownWelcome && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hi, I'm your **opencancer.ai assistant**. I can help you find information about cancer treatments, clinical trials, and caregiver strategies — grounded in NCCN guidelines and expert-led resources.

**Get personalized guidance:** Click the settings icon to select your cancer type for tailored information.

I can help you with:
- Understanding NCCN guidelines for your specific situation
- Exploring treatment options and clinical trials
- Preparing questions for your oncologist
- Interpreting test results and biomarkers
- Understanding side effects and what to expect

**Please remember:** This is educational information only, not medical advice. Always consult your doctor about your specific situation.

**How can I help you today?**`,
        timestamp: new Date(),
        typingComplete: true // Welcome message renders instantly
      }
      setMessages([welcomeMessage])
      setHasShownWelcome(true)
    }
  }, [hasShownWelcome, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSubmit = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || isLoading) return

    // Soft auth gate
    const newCount = questionCount + 1
    setQuestionCount(newCount)
    if (!user && newCount > FREE_QUESTION_LIMIT && newCount % 3 === 1) {
      setShowAuthModal(true)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    const loadingMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          cancerType: cancerType || undefined,
          history: messages.filter(m => !m.isLoading).slice(-6)
        })
      })

      const data = await response.json()

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: data.response || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          citations: data.citationUrls,
          followUpQuestions: data.followUpQuestions,
          confidenceScore: data.confidenceScore,
          typingComplete: false
        }]
      })
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
          typingComplete: true
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const markTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, typingComplete: true } : m
    ))
  }

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative') => {
    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type } : m
    ))

    // Log to console and localStorage
    const feedbackData = {
      messageId,
      type,
      timestamp: new Date().toISOString(),
      cancerType: cancerType || null
    }
    console.log('[Ask AI] Feedback:', feedbackData)

    try {
      const storedFeedback = JSON.parse(localStorage.getItem('ask-feedback') || '[]')
      storedFeedback.push(feedbackData)
      localStorage.setItem('ask-feedback', JSON.stringify(storedFeedback.slice(-50)))

      // Send to Supabase (non-blocking)
      fetch('https://felofmlhqwcdpiyjgstx.supabase.co/functions/v1/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ask_feedback',
          properties: feedbackData
        })
      }).catch(() => {})
    } catch (e) {
      console.error('Failed to save feedback:', e)
    }
  }

  // Only show suggested questions after welcome message, before user asks anything
  const showSuggestions = messages.length === 1 && messages[0]?.role === 'assistant'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 3D Orbiting Atom Icon */}
              <div className="relative w-12 h-12" style={{ perspective: '200px', perspectiveOrigin: 'center' }}>
                {/* Nucleus - 3D sphere */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #E879F9, #A855F7 50%, #7C3AED 100%)',
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.5)'
                    }}
                  />
                </div>

                {/* Electron 1 - Horizontal orbit (X-Y plane) */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
                  <div
                    className="absolute top-1/2 -left-0.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9 100%)',
                      boxShadow: '0 1px 4px rgba(139, 92, 246, 0.6)'
                    }}
                  />
                </div>

                {/* Electron 2 - Vertical orbit (top-bottom) */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                  <div
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #67E8F9, #06B6D4 50%, #0891B2 100%)',
                      boxShadow: '0 1px 4px rgba(6, 182, 212, 0.6)'
                    }}
                  />
                </div>

                {/* Electron 3 - Z-axis orbit (coming toward/away from viewer) */}
                <div
                  className="absolute inset-0 flex items-center justify-center electron-z-container"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="w-2 h-2 rounded-full electron-z-ball"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #FBCFE8, #EC4899 50%, #DB2777 100%)',
                      boxShadow: '0 1px 4px rgba(236, 72, 153, 0.6)',
                    }}
                  />
                </div>
                <style jsx>{`
                  @keyframes orbitZ {
                    0% { transform: translateZ(24px) scale(1.3); }
                    25% { transform: translateX(18px) translateZ(0px) scale(1); }
                    50% { transform: translateZ(-24px) scale(0.7); }
                    75% { transform: translateX(-18px) translateZ(0px) scale(1); }
                    100% { transform: translateZ(24px) scale(1.3); }
                  }
                  .electron-z-ball {
                    animation: orbitZ 3s ease-in-out infinite;
                  }
                `}</style>
              </div>
              <div>
                <Link href="/" className="flex items-center gap-2">
                  <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
                  <span className="text-slate-400 text-sm">/</span>
                  <span className="font-medium text-slate-700">Ask AI</span>
                </Link>
                <p className="text-sm text-gray-600">
                  NCCN-trained AI assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cancerType && (
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                  {CANCER_TYPES[cancerType] || cancerType}
                </span>
              )}
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
                ← Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative w-2.5 h-2.5">
                        <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full" />
                        <div className="absolute w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">opencancer AI</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}>
                    {message.isLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    ) : message.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <TypewriterMarkdown
                        text={message.content}
                        instantRender={index === 0 || message.typingComplete}
                        onComplete={() => markTypingComplete(message.id)}
                      />
                    )}

                    {/* Feedback buttons - Only show after typing complete */}
                    {message.role === 'assistant' && message.typingComplete && !message.isLoading && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Was this helpful?</span>
                            <button
                              onClick={() => handleFeedback(message.id, 'positive')}
                              disabled={message.feedback !== undefined && message.feedback !== null}
                              className={`p-1.5 rounded transition-colors ${
                                message.feedback === 'positive'
                                  ? 'bg-green-100 text-green-600'
                                  : message.feedback === 'negative'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 'negative')}
                              disabled={message.feedback !== undefined && message.feedback !== null}
                              className={`p-1.5 rounded transition-colors ${
                                message.feedback === 'negative'
                                  ? 'bg-red-100 text-red-600'
                                  : message.feedback === 'positive'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                            {message.feedback && (
                              <span className="text-xs text-gray-500 ml-2">Thanks for your feedback!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Citations - Show all sources prominently */}
                    {message.citations && message.citations.length > 0 && message.typingComplete && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Sources ({message.citations.length})
                        </p>
                        <div className="space-y-1.5">
                          {message.citations.map((citation, i) => (
                            <a
                              key={i}
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors group"
                            >
                              <span className="text-violet-500 font-medium">[{i + 1}]</span>
                              <span className="truncate flex-1">{citation.title}</span>
                              <svg className="w-3 h-3 text-gray-400 group-hover:text-violet-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Questions - Only show after typing complete */}
                    {message.followUpQuestions && message.followUpQuestions.length > 0 && message.typingComplete && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Continue exploring:</p>
                        <div className="space-y-2">
                          {message.followUpQuestions.slice(0, 2).map((q, i) => (
                            <button
                              key={q.id || i}
                              onClick={() => handleSubmit(q.question)}
                              className="flex items-center gap-2 w-full text-left text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-300 transition-colors group"
                            >
                              <span className="text-violet-500 group-hover:translate-x-1 transition-transform">→</span>
                              {q.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggested Questions - shown after welcome message */}
            {showSuggestions && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
                <div className="space-y-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(q)}
                      className="group flex items-center gap-3 w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-violet-50 hover:from-violet-50 hover:to-fuchsia-50 border border-gray-200 hover:border-violet-300 rounded-xl text-sm text-gray-700 transition-all hover:shadow-md"
                    >
                      <span className="text-violet-500 font-medium group-hover:translate-x-1 transition-transform">→</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
            {/* Green status dot */}
            <div className="flex-shrink-0 pl-2 pb-2">
              <div className="relative w-3 h-3">
                <div className="absolute w-3 h-3 bg-green-500 rounded-full" />
                <div className="absolute w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75" />
              </div>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your cancer journey..."
              className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 min-h-[40px] max-h-[120px] py-2 text-gray-900 placeholder-gray-400"
              rows={1}
            />

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 p-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl transition-all shadow-md"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Cancer type badge if selected */}
          {cancerType && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                {CANCER_TYPES[cancerType] || cancerType}
              </span>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-xs text-gray-500 hover:text-violet-600"
              >
                Change
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-2">
            AI-generated educational information only. Not medical advice. In emergencies, call 911.
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chat Settings</h2>
                <p className="text-sm text-gray-600">Personalize your experience</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select your cancer type for personalized guidance:</h3>

              <div className="space-y-4">
                {/* Primary Categories */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Common Types</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIMARY_CATEGORIES.map((cat) => (
                      <button
                        key={cat.code}
                        onClick={() => {
                          setCancerType(cat.code)
                          setShowSettingsModal(false)
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          cancerType === cat.code
                            ? 'bg-violet-500 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-violet-400 hover:bg-violet-50'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blood Cancers */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Blood Cancers</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BLOOD_CANCERS.slice(0, 6).map((code) => (
                      <button
                        key={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          cancerType === code
                            ? 'bg-violet-500 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-violet-400 hover:bg-violet-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Selection */}
                {cancerType && (
                  <button
                    onClick={() => {
                      setCancerType('')
                      setShowSettingsModal(false)
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}
