'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CANCER_TYPES, PRIMARY_CATEGORIES, BLOOD_CANCERS, CANCER_CATEGORIES } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { fetchSuggestedQuestions, getCategoryColor, SuggestedQuestion } from '@/lib/suggested-questions'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ShareButton } from '@/components/ShareButton'
import { Navbar } from '@/components/Navbar'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

// Get or create a session ID for anonymous users
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem('opencancer-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('opencancer-session-id', sessionId)
  }
  return sessionId
}

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
  feedbackComment?: string
}

function AskPageContent() {
  const searchParams = useSearchParams()
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const { trackEvent } = useAnalytics()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [hasTrackedRef, setHasTrackedRef] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cancerType, setCancerType] = useState<string>('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [conciseMode, setConciseMode] = useState(false)
  const [sharingMessageId, setSharingMessageId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [hasPatientContext, setHasPatientContext] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize session ID for anonymous users
  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Load concise mode preference
  useEffect(() => {
    const saved = localStorage.getItem('ask-concise-mode')
    if (saved === 'true') setConciseMode(true)
  }, [])

  const FREE_QUESTION_LIMIT = 3

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      if (authProfile.cancer_type && !cancerType) {
        setCancerType(authProfile.cancer_type)
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        try {
          const profile = JSON.parse(saved)
          if (profile.cancerType && !cancerType) {
            setCancerType(profile.cancerType)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [user, authProfile, authLoading])

  // Fetch cancer-specific suggested questions when cancer type changes
  const loadSuggestedQuestions = useCallback(async (type: string | null) => {
    setIsLoadingQuestions(true)
    try {
      const questions = await fetchSuggestedQuestions(type)
      setSuggestedQuestions(questions)
    } catch (err) {
      console.error('Error loading suggested questions:', err)
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [])

  // Load questions on mount and when cancer type changes
  useEffect(() => {
    loadSuggestedQuestions(cancerType || null)
  }, [cancerType, loadSuggestedQuestions])

  // Handle URL params: pre-fill question and track referrals
  useEffect(() => {
    const q = searchParams.get('q')
    const ref = searchParams.get('ref')

    // Pre-fill question from URL
    if (q && !input) {
      setInput(q)
    }

    // Track referral source
    if (ref && !hasTrackedRef) {
      setHasTrackedRef(true)
      trackEvent('share_referral', {
        ref_source: ref,
        page: 'ask',
        timestamp: new Date().toISOString(),
      })
      // Store in localStorage for conversion tracking
      localStorage.setItem('opencancer-referral', JSON.stringify({
        ref,
        timestamp: new Date().toISOString(),
        page: 'ask'
      }))
    }
  }, [searchParams, input, hasTrackedRef, trackEvent])

  // Show welcome message on mount
  useEffect(() => {
    if (!hasShownWelcome && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hi, I'm your **opencancer.ai assistant**. I can help you find information about cancer treatments, clinical trials, and caregiver strategies, grounded in NCCN guidelines and expert-led resources.

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

    // Track the question being asked (include full question text for admin insights)
    trackEvent('ask_question', {
      question: text.trim(),
      question_length: text.trim().length,
      cancer_type: cancerType || null,
      is_suggested_question: !!messageText,
    })

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
          history: messages.filter(m => !m.isLoading).slice(-6),
          conciseMode,
          // Pass user/session context for personalized answers from knowledge graph
          userId: user?.id,
          sessionId: sessionId,
        })
      })

      const data = await response.json()

      // Track if patient context was used for personalization
      if (data.hasPatientContext) {
        setHasPatientContext(true)
      }

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

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative', comment?: string) => {
    // For negative feedback, show comment input first (unless comment is provided)
    if (type === 'negative' && !comment && feedbackMessageId !== messageId) {
      setFeedbackMessageId(messageId)
      setFeedbackComment('')
      return
    }

    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type, feedbackComment: comment } : m
    ))

    // Close comment input
    setFeedbackMessageId(null)
    setFeedbackComment('')

    // Get the message content for context
    const message = messages.find(m => m.id === messageId)

    // Log to console and localStorage
    const feedbackData = {
      messageId,
      type,
      comment: comment || null,
      messageContent: message?.content?.substring(0, 200) || null,
      timestamp: new Date().toISOString(),
      cancerType: cancerType || null
    }
    console.log('[Ask Navis] Feedback:', feedbackData)

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

  const submitNegativeFeedback = (messageId: string) => {
    handleFeedback(messageId, 'negative', feedbackComment.trim() || undefined)
  }

  const cancelFeedback = () => {
    setFeedbackMessageId(null)
    setFeedbackComment('')
  }

  // Handle sharing a Q&A
  const handleShare = async (messageId: string) => {
    setSharingMessageId(messageId)
    setShareUrl(null)

    // Find this message and the previous user message
    const messageIndex = messages.findIndex(m => m.id === messageId)
    const assistantMessage = messages[messageIndex]
    const userMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user')

    if (!assistantMessage || !userMessage) {
      setSharingMessageId(null)
      return
    }

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'qa',
          question: userMessage.content,
          answer: assistantMessage.content,
          cancerType: cancerType || null,
          followUpQuestions: assistantMessage.followUpQuestions?.map(f => f.question) || []
        })
      })

      const data = await response.json()
      if (data.success && data.shareUrl) {
        setShareUrl(data.shareUrl)
        await navigator.clipboard.writeText(data.shareUrl)
        trackEvent('share_qa', { messageId, shareUrl: data.shareUrl })
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
    }
  }

  const closeShareModal = () => {
    setSharingMessageId(null)
    setShareUrl(null)
  }

  // Only show suggested questions after welcome message, before user asks anything
  const showSuggestions = messages.length === 1 && messages[0]?.role === 'assistant'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">Navis</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}>
                    {message.isLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <ThinkingIndicator size={20} variant="light" />
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
                              <span className="text-xs text-gray-500 ml-2">
                                Thanks for your feedback!
                                {message.feedbackComment && <span className="italic"> (with comment)</span>}
                              </span>
                            )}
                          </div>
                          {/* Share button */}
                          <button
                            onClick={() => handleShare(message.id)}
                            disabled={sharingMessageId === message.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {sharingMessageId === message.id ? 'Creating link...' : 'Share'}
                          </button>
                        </div>

                        {/* Share success message */}
                        {sharingMessageId === message.id && shareUrl && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-green-700 font-medium">Link copied!</span>
                              </div>
                              <button onClick={closeShareModal} className="text-green-600 hover:text-green-800">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-green-600 mt-1 break-all">{shareUrl}</p>
                            <p className="text-xs text-green-600 mt-2">Share this with others who might find it helpful!</p>
                          </div>
                        )}

                        {/* Feedback comment input for negative feedback */}
                        {feedbackMessageId === message.id && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-2">What could be improved? (optional)</p>
                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder="e.g., The answer was too technical, missing information about..."
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
                              rows={2}
                              maxLength={500}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">{feedbackComment.length}/500</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={cancelFeedback}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => submitNegativeFeedback(message.id)}
                                  className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium"
                                >
                                  Submit Feedback
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
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
                              className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50 transition-colors group"
                            >
                              <span className="text-slate-500 font-medium">[{i + 1}]</span>
                              <span className="truncate flex-1">{citation.title}</span>
                              <svg className="w-3 h-3 text-gray-400 group-hover:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                              className="flex items-center gap-2 w-full text-left text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-stone-50 hover:border-slate-400 transition-colors group"
                            >
                              <span className="text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {cancerType ? `Questions for ${CANCER_TYPES[cancerType] || cancerType}:` : 'Try asking:'}
                  </p>
                  {cancerType && (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="text-xs text-slate-600 hover:text-slate-800"
                    >
                      Change cancer type
                    </button>
                  )}
                </div>
                {isLoadingQuestions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading questions...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleSubmit(q.question)}
                        className="group flex items-start gap-3 w-full text-left px-4 py-3 bg-white hover:bg-stone-50 border border-gray-200 hover:border-slate-400 rounded-xl text-sm text-gray-700 transition-all hover:shadow-md"
                      >
                        <span className="text-slate-500 font-medium group-hover:translate-x-1 transition-transform mt-0.5">→</span>
                        <div className="flex-1 min-w-0">
                          <span className="block">{q.question}</span>
                          {q.category && (
                            <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${getCategoryColor(q.category)}`}>
                              {q.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!cancerType && !isLoadingQuestions && (
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="mt-4 w-full py-2.5 text-sm text-slate-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                  >
                    Select your cancer type for personalized questions →
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-2 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
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
              className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-slate-600 hover:bg-stone-100 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Send Button - no spinner here, "Thinking..." in chat provides feedback */}
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 p-2 bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-gray-300 text-white rounded-xl transition-all shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {/* Settings badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {cancerType && (
              <>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                  {CANCER_TYPES[cancerType] || cancerType}
                </span>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="text-xs text-gray-500 hover:text-slate-700"
                >
                  Change
                </button>
              </>
            )}
            {conciseMode && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-200 transition-colors"
                title="Click to change"
              >
                Concise Mode ON
              </button>
            )}
            {hasPatientContext && (
              <span
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"
                title="Your uploaded documents are being used to personalize answers"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Personalized
              </span>
            )}
          </div>

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

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select your cancer type for personalized guidance:</h3>

              {/* Search filter */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search cancer types..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  onChange={(e) => {
                    const searchEl = e.target.closest('.p-6')?.querySelector('[data-cancer-grid]')
                    if (searchEl) {
                      const buttons = searchEl.querySelectorAll('[data-cancer-type]')
                      const searchTerm = e.target.value.toLowerCase()
                      buttons.forEach((btn: Element) => {
                        const type = btn.getAttribute('data-cancer-type') || ''
                        const label = CANCER_TYPES[type]?.toLowerCase() || ''
                        const matches = label.includes(searchTerm) || type.includes(searchTerm)
                        ;(btn as HTMLElement).style.display = matches ? '' : 'none'
                      })
                      // Hide empty categories
                      const categories = searchEl.querySelectorAll('[data-category]')
                      categories.forEach((cat: Element) => {
                        const visibleButtons = cat.querySelectorAll('[data-cancer-type]:not([style*="display: none"])')
                        ;(cat as HTMLElement).style.display = visibleButtons.length > 0 ? '' : 'none'
                      })
                    }
                  }}
                />
              </div>

              <div className="space-y-4" data-cancer-grid>
                {/* Common Types - Featured */}
                <div data-category="common">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Common Types</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.common.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lymphoma - Expanded */}
                <div data-category="lymphoma">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Lymphoma</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.lymphoma.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leukemia */}
                <div data-category="leukemia">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Leukemia</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.leukemia.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Blood Disorders */}
                <div data-category="blood_other">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Other Blood Disorders</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.blood_other.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GI Cancers */}
                <div data-category="gi">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">GI & Digestive</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.gi.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gynecologic */}
                <div data-category="gynecologic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Gynecologic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.gynecologic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urologic */}
                <div data-category="urologic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Urologic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.urologic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Head & Neck */}
                <div data-category="head_neck">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Head & Neck</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.head_neck.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brain & CNS */}
                <div data-category="brain">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Brain & CNS</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.brain.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thoracic */}
                <div data-category="thoracic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Thoracic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.thoracic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin */}
                <div data-category="skin">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Skin</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.skin.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sarcoma */}
                <div data-category="sarcoma">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Sarcoma</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.sarcoma.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pediatric */}
                <div data-category="pediatric">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Pediatric</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.pediatric.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rare & Other */}
                <div data-category="rare">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Rare & Other</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.rare.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
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

                {/* Concise Mode Toggle */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Concise Mode</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Just the facts - no suggestions or questions</p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !conciseMode
                        setConciseMode(newValue)
                        localStorage.setItem('ask-concise-mode', String(newValue))
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        conciseMode ? 'bg-slate-900' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          conciseMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {conciseMode && (
                    <p className="mt-2 text-xs text-slate-600 bg-stone-100 px-3 py-2 rounded-lg">
                      Responses will be shorter and focused on facts only.
                    </p>
                  )}
                </div>
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

// Wrap with Suspense for useSearchParams
export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>}>
      <AskPageContent />
    </Suspense>
  )
}
