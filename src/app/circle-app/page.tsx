'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Upload, User, Send, FileText, Loader2, X, CheckCircle2, AlertCircle, Paperclip, ThumbsUp, ThumbsDown, ArrowRight, Search, Settings } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { CANCER_TYPES, CANCER_CATEGORIES } from '@/lib/cancer-data'
import { fetchSuggestedQuestions, getCategoryColor, SuggestedQuestion } from '@/lib/suggested-questions'
import { useActivityLog } from '@/hooks/useActivityLog'
import { AuthModal } from '@/components/AuthModal'
import { useAuth } from '@/lib/auth'

// Types
interface Citation {
  title: string
  url: string
}

interface FollowUpQuestion {
  id: string
  question: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  typingComplete?: boolean
  feedback?: 'positive' | 'negative' | null
  feedbackComment?: string
  attachedFile?: { name: string; type: string }
  citations?: Citation[]
  followUpQuestions?: FollowUpQuestion[]
}

interface UploadedRecord {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: {
    document_type: string
    diagnosis: string[]
    cancer_specific: {
      cancer_type: string
      stage: string
      grade?: string
      biomarkers: string[]
    }
    test_summary: string
    questions_to_ask_doctor?: string
    recommended_next_steps?: string[]
  }
  error?: string
}

type TabType = 'ask' | 'records'

// Session utilities
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem('circle-app-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('circle-app-session-id', sessionId)
  }
  return sessionId
}

// Tab Button
function TabButton({ active, onClick, icon: Icon, label, badge }: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all relative rounded-lg ${
        active
          ? 'text-[#C66B4A] bg-orange-50'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-[#C66B4A] text-white text-[10px] rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

// Welcome message content
const WELCOME_MESSAGE = `Hi, I'm **Navis**, your OpenCancer AI assistant. I can help you find information about cancer treatments, clinical trials, and caregiver strategies, grounded in NCCN guidelines and expert-led resources.

📎 **Drop your medical records right here!** Click the paperclip or drag & drop a pathology report, lab result, or scan — I'll read it and answer questions about YOUR specific case.

🔒 **Your privacy matters:** We never sell your data. Your records are yours alone. Create a free account to save them securely.

I can help you with:
- **Analyzing your records** — attach any PDF or image and ask "what does this mean?"
- Understanding NCCN guidelines for your specific situation
- Exploring treatment options and clinical trials
- Interpreting test results and biomarkers
- Preparing questions for your oncologist

**Please remember:** This is educational information only, not medical advice. Always consult your doctor about your specific situation.

**How can I help you today?**`

// Ask Tab - Enhanced version
function AskTab({ messages, setMessages, isLoading, setIsLoading, onRecordUploaded, cancerType, onOpenCancerTypeModal, uploadedRecords, onOpenAuthModal, userId }: {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  onRecordUploaded?: (file: File, parsedResult?: UploadedRecord['result']) => void
  cancerType?: string
  onOpenCancerTypeModal?: () => void
  uploadedRecords?: UploadedRecord[]
  onOpenAuthModal?: () => void
  userId?: string
}) {
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessingDocument, setIsProcessingDocument] = useState(false) // Track document analysis state
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [pendingFeedbackType, setPendingFeedbackType] = useState<'positive' | 'negative' | null>(null)
  const [hasUploadedRecord, setHasUploadedRecord] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const { logQuestion, logRecordUpload } = useActivityLog()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load suggested questions based on cancer type
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

  // Show welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
        typingComplete: true,
      }])
    }
  }, [])

  // Only scroll to bottom after user sends a message (not on initial welcome)
  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Show save records prompt after upload + getting a response
  useEffect(() => {
    // Count user messages (excluding welcome)
    const userMessageCount = messages.filter(m => m.role === 'user').length
    const hasResponse = messages.some(m => m.role === 'assistant' && m.id !== 'welcome' && m.typingComplete)

    if (hasUploadedRecord && userMessageCount >= 1 && hasResponse && !promptDismissed) {
      const timer = setTimeout(() => setShowSavePrompt(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [messages, hasUploadedRecord, promptDismissed])

  // Helper to build document context string from parsed analysis (matches main /ask page)
  const buildDocumentContext = (analysis: UploadedRecord['result']): string => {
    if (!analysis) return ''

    let context = '\n\n[ATTACHED DOCUMENT CONTEXT]'

    if (analysis.document_type) {
      context += `\nDocument Type: ${analysis.document_type}`
    }

    // Add cancer-specific info
    if (analysis.cancer_specific) {
      const cs = analysis.cancer_specific
      if (cs.cancer_type && cs.cancer_type !== 'unknown') {
        context += `\n\nCancer Type: ${cs.cancer_type}`
      }
      if (cs.stage && cs.stage !== 'unknown') {
        context += `\nStage: ${cs.stage}`
      }
      if (cs.grade && cs.grade !== 'unknown') {
        context += `\nGrade: ${cs.grade}`
      }
      if (cs.biomarkers && cs.biomarkers.length > 0) {
        context += `\nBiomarkers: ${cs.biomarkers.join(', ')}`
      }
    }

    // Add diagnosis findings
    if (analysis.diagnosis && analysis.diagnosis.length > 0 && analysis.diagnosis[0] !== 'unknown') {
      context += '\n\nKey Findings:\n' + analysis.diagnosis.map(d => `- ${d}`).join('\n')
    }

    // Add analysis summary
    if (analysis.test_summary) {
      context += `\n\nAnalysis Summary: ${analysis.test_summary}`
    }

    context += '\n[END DOCUMENT CONTEXT]'
    return context
  }

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
      attachedFile: attachedFile ? { name: attachedFile.name, type: attachedFile.type } : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Track if we have any document context
    const completedRecords = uploadedRecords?.filter(r => r.status === 'completed' && r.result) || []
    const hasDocumentContext = !!attachedFile || completedRecords.length > 0

    // Log to patient_activity for admin dashboard metrics
    logQuestion({
      question: question.trim(),
      hasPatientContext: hasDocumentContext,
    })

    // Build the message with document context appended (matches main /ask behavior)
    let messageWithContext = question.trim()
    let currentParsedResult: UploadedRecord['result'] = undefined

    // If file attached, process it first
    if (attachedFile) {
      setIsProcessingDocument(true) // Show "Analyzing document" state
      try {
        const formData = new FormData()
        formData.append('file', attachedFile)
        formData.append('sessionId', getSessionId())

        const translateRes = await fetch('/api/translate', { method: 'POST', body: formData })
        const translateData = await translateRes.json()
        // API returns 'analysis' not 'result' - extract the parsed document data
        currentParsedResult = translateData.analysis || translateData.result
        if (currentParsedResult) {
          messageWithContext += buildDocumentContext(currentParsedResult)
        }
        // Also notify Records tab with the parsed result for follow-up context
        onRecordUploaded?.(attachedFile, currentParsedResult)
        setHasUploadedRecord(true)
        // Log to patient_activity for admin dashboard metrics
        logRecordUpload({
          fileType: attachedFile.type,
          fileSize: attachedFile.size,
        })
      } catch (e) {
        console.error('Failed to process attachment:', e)
      } finally {
        setIsProcessingDocument(false) // Clear document processing state
      }
      setAttachedFile(null)
    } else if (completedRecords.length > 0) {
      // Include context from previously uploaded records for follow-up questions
      for (const record of completedRecords) {
        if (record.result) {
          messageWithContext += buildDocumentContext(record.result)
        }
      }
    }

    // Build request body
    const requestBody: Record<string, unknown> = {
      message: messageWithContext, // Include document context in the message
      sessionId: getSessionId(),
      userId: userId || null,
      source: 'circle-app',
      cancer_type: cancerType || null,
      hasFileAttachment: hasDocumentContext,
    }

    const loadingMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      // Parse citations and follow-up questions from API response
      const citations: Citation[] = data.citations || []
      const followUpQuestions: FollowUpQuestion[] = (data.followUpQuestions || []).map((q: string | { question: string }, i: number) => ({
        id: `followup-${i}`,
        question: typeof q === 'string' ? q : q.question
      }))

      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              content: data.response || 'Sorry, something went wrong.',
              isLoading: false,
              citations,
              followUpQuestions
            }
          : msg
      ))
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? { ...msg, content: 'Sorry, something went wrong. Please try again.', isLoading: false }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative', comment?: string) => {
    if (!comment && feedbackMessageId !== messageId) {
      setFeedbackMessageId(messageId)
      setPendingFeedbackType(type)
      setFeedbackComment('')
      return
    }

    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type, feedbackComment: comment } : m
    ))
    setFeedbackMessageId(null)
    setFeedbackComment('')
    setPendingFeedbackType(null)

    // Get the message and find the corresponding user question
    const messageIndex = messages.findIndex(m => m.id === messageId)
    const message = messages[messageIndex]
    const userQuestion = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user')

    console.log('[Circle App] Feedback:', { messageId, type, comment, question: userQuestion?.content?.slice(0, 50) })

    // Save to Supabase via feedback API (links to eval log)
    try {
      await fetch('/api/ask/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          question: userQuestion?.content || '',
          feedbackType: type,
          feedbackComment: comment || null,
          source: 'circle-app',
          messageContent: message?.content?.substring(0, 500) || null,
        })
      })
    } catch (e) {
      console.error('Failed to save feedback:', e)
    }
  }

  const submitFeedback = (messageId: string) => {
    if (pendingFeedbackType) {
      handleFeedback(messageId, pendingFeedbackType, feedbackComment.trim() || undefined)
    }
  }

  const skipFeedback = (messageId: string) => {
    if (pendingFeedbackType) {
      handleFeedback(messageId, pendingFeedbackType, '')
    }
  }

  const cancelFeedback = () => {
    setFeedbackMessageId(null)
    setFeedbackComment('')
    setPendingFeedbackType(null)
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setAttachedFile(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAttachedFile(file)
  }

  // Only show suggestions on initial welcome
  const showSuggestions = messages.length === 1 && messages[0]?.id === 'welcome'

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleFileDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#C66B4A]/10 border-2 border-dashed border-[#C66B4A] z-50 flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="w-12 h-12 text-[#C66B4A] mx-auto mb-2" />
            <p className="text-[#C66B4A] font-medium">Drop your medical record here</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-2">
                <ThinkingIndicator size={18} variant="light" />
                <span className="text-sm font-medium text-gray-700">
                  {msg.isLoading ? 'Navis is thinking...' : 'Navis'}
                </span>
              </div>
            )}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-50 border border-gray-200 text-gray-900'
              }`}>
                {msg.attachedFile && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/50">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">{msg.attachedFile.name}</span>
                  </div>
                )}
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    {isProcessingDocument ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#C66B4A] animate-spin" />
                        <span className="text-sm text-gray-600">Analyzing your document...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </>
                    )}
                  </div>
                ) : msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <TypewriterMarkdown
                    text={msg.content}
                    instantRender={msg.typingComplete}
                    onComplete={() => {
                      setMessages(prev => prev.map(m =>
                        m.id === msg.id ? { ...m, typingComplete: true } : m
                      ))
                    }}
                  />
                )}
              </div>
            </div>

            {/* Citations */}
            {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && msg.typingComplete && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Sources ({msg.citations.length})
                </p>
                <div className="space-y-1.5">
                  {msg.citations.map((citation, i) => (
                    <a
                      key={i}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50 transition-colors group"
                    >
                      <span className="text-slate-500 font-medium">[{i + 1}]</span>
                      <span className="truncate flex-1">{citation.title || citation.url || 'Source'}</span>
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {msg.role === 'assistant' && msg.followUpQuestions && msg.followUpQuestions.length > 0 && msg.typingComplete && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Continue exploring:</p>
                <div className="space-y-2">
                  {msg.followUpQuestions.slice(0, 2).map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleSubmit(q.question)}
                      className="flex items-center gap-2 w-full text-left text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-stone-50 hover:border-slate-400 transition-colors group"
                    >
                      <span className="text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
                      <span className="flex-1">{q.question}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback for assistant messages */}
            {msg.role === 'assistant' && msg.typingComplete && !msg.isLoading && msg.id !== 'welcome' && (
              <div className="mt-2 ml-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Was this helpful?</span>
                  <button
                    onClick={() => handleFeedback(msg.id, 'positive')}
                    disabled={msg.feedback !== undefined && msg.feedback !== null}
                    className={`p-1.5 rounded transition-colors ${
                      msg.feedback === 'positive' ? 'bg-green-100 text-green-600' :
                      msg.feedback === 'negative' ? 'text-gray-300 cursor-not-allowed' :
                      'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, 'negative')}
                    disabled={msg.feedback !== undefined && msg.feedback !== null}
                    className={`p-1.5 rounded transition-colors ${
                      msg.feedback === 'negative' ? 'bg-red-100 text-red-600' :
                      msg.feedback === 'positive' ? 'text-gray-300 cursor-not-allowed' :
                      'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  {msg.feedback && (
                    <span className="text-xs text-gray-400 ml-1">
                      Thanks!{msg.feedbackComment && ' (with comment)'}
                    </span>
                  )}
                </div>

                {/* Feedback comment input */}
                {feedbackMessageId === msg.id && (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    pendingFeedbackType === 'positive' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className="text-xs text-gray-600 mb-2">
                      {pendingFeedbackType === 'positive' ? 'What was most helpful? (optional)' : 'What could be improved? (optional)'}
                    </p>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder={pendingFeedbackType === 'positive' ? 'e.g., Clear explanation...' : 'e.g., Too technical...'}
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                      rows={2}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{feedbackComment.length}/500</span>
                      <div className="flex gap-2">
                        <button onClick={cancelFeedback} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        <button onClick={() => skipFeedback(msg.id)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg">Skip</button>
                        <button onClick={() => submitFeedback(msg.id)} className={`px-3 py-1.5 text-xs text-white rounded-lg ${
                          pendingFeedbackType === 'positive' ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-900 hover:bg-slate-800'
                        }`}>Submit</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Suggested questions - matches /ask pattern */}
        {showSuggestions && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {cancerType ? `Questions for ${CANCER_TYPES[cancerType] || cancerType}:` : 'Try asking:'}
              </p>
              {cancerType && (
                <button
                  onClick={onOpenCancerTypeModal}
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
                onClick={onOpenCancerTypeModal}
                className="mt-4 w-full py-3 text-sm font-medium text-white bg-[#C66B4A] hover:bg-[#b55d3e] rounded-xl transition-colors flex items-center justify-center gap-2 animate-pulse"
              >
                <Settings className="w-4 h-4" />
                Select your cancer type for personalized questions
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* Attached file preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
            <FileText className="w-4 h-4 text-[#C66B4A]" />
            <span className="text-sm text-gray-700 flex-1 truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input) }} className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-[#C66B4A] hover:bg-gray-50 rounded-xl transition-colors"
            title="Attach medical record"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(input)
              }
            }}
            placeholder="Ask anything, or drag & drop your records..."
            className="flex-1 resize-none rounded-xl border-2 border-[#C66B4A]/30 px-4 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-[#C66B4A] shadow-sm"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-[#C66B4A] text-white rounded-xl hover:bg-[#b55d3e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          AI-generated educational info only. Not medical advice.
        </p>
      </div>

      {/* Save Records Prompt - after upload + response */}
      {showSavePrompt && (
        <div className="absolute bottom-20 left-4 right-4 z-50">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Your records are ready!</p>
                <p className="text-xs text-blue-100 mb-3">Create a free account to save your records, get personalized answers anytime, and build your cancer knowledge base.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSavePrompt(false)
                      setPromptDismissed(true)
                      onOpenAuthModal?.()
                    }}
                    className="px-3 py-1.5 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors text-xs"
                  >
                    Create Free Account
                  </button>
                  <button
                    onClick={() => {
                      setShowSavePrompt(false)
                      setPromptDismissed(true)
                    }}
                    className="px-3 py-1.5 text-blue-200 hover:text-white transition-colors text-xs"
                  >
                    Continue as guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Records Tab
function RecordsTab({ records, setRecords, onOpenAuthModal, isAuthenticated, authLoading, userId }: {
  records: UploadedRecord[]
  setRecords: React.Dispatch<React.SetStateAction<UploadedRecord[]>>
  onOpenAuthModal?: () => void
  isAuthenticated?: boolean
  authLoading?: boolean
  userId?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { logRecordUpload } = useActivityLog()

  // Show save prompt when a record completes
  const hasCompletedRecords = records.some(r => r.status === 'completed')
  useEffect(() => {
    if (hasCompletedRecords && !promptDismissed) {
      const timer = setTimeout(() => setShowSavePrompt(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedRecords, promptDismissed])

  const processFile = async (file: File) => {
    const recordId = crypto.randomUUID()
    const newRecord: UploadedRecord = { id: recordId, file, status: 'pending' }
    setRecords(prev => [...prev, newRecord])
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'processing' } : r))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', getSessionId())
      if (userId) formData.append('userId', userId)

      const response = await fetch('/api/translate', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Failed to process')

      const result = await response.json()
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, status: 'completed', result: result.result || result } : r
      ))
      // Log to patient_activity for admin dashboard metrics
      logRecordUpload({
        fileType: file.type,
        fileSize: file.size,
      })
    } catch {
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, status: 'error', error: 'Failed to process file' } : r
      ))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(processFile)
  }, [])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Records Vault</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-xs">
          Sign in to securely upload, store, and access your medical records. Your data is encrypted and private.
        </p>
        <button
          onClick={() => onOpenAuthModal?.()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          Sign In to Access Records
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Free account • No credit card required
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging ? 'border-[#C66B4A] bg-orange-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-[#C66B4A]' : 'text-gray-400'}`} />
        <p className="text-gray-700 font-medium text-sm mb-1">Upload Medical Records</p>
        <p className="text-xs text-gray-500">Drag & drop or click. PDF, images, documents.</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(e) => Array.from(e.target.files || []).forEach(processFile)}
          className="hidden"
        />
      </div>

      {records.length > 0 && (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className={`flex items-center gap-3 p-3 border-b ${
                record.status === 'completed' ? 'bg-green-50' :
                record.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <FileText className={`w-4 h-4 flex-shrink-0 ${
                  record.status === 'completed' ? 'text-green-600' :
                  record.status === 'error' ? 'text-red-600' : 'text-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{record.file.name}</p>
                  {record.status === 'completed' && record.result && (
                    <p className="text-xs text-green-600">{record.result.document_type}</p>
                  )}
                  {record.status === 'processing' && <p className="text-xs text-blue-600">Analyzing...</p>}
                  {record.status === 'error' && <p className="text-xs text-red-600">{record.error}</p>}
                </div>
                {record.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {record.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {record.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                <button onClick={() => setRecords(prev => prev.filter(r => r.id !== record.id))} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </div>

              {/* Rich Summary for completed records */}
              {record.status === 'completed' && record.result && (
                <div className="p-4 space-y-4">
                  {/* Plain English Summary */}
                  {record.result.test_summary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{record.result.test_summary}</p>
                    </div>
                  )}

                  {/* Cancer Information Grid */}
                  {record.result.cancer_specific && record.result.cancer_specific.cancer_type && record.result.cancer_specific.cancer_type !== 'unknown' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">Type</p>
                        <p className="text-sm font-semibold text-gray-900">{record.result.cancer_specific.cancer_type}</p>
                      </div>
                      {record.result.cancer_specific.stage && record.result.cancer_specific.stage !== 'unknown' && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-600 mb-0.5">Stage</p>
                          <p className="text-sm font-semibold text-blue-900">{record.result.cancer_specific.stage}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Biomarkers */}
                  {record.result.cancer_specific?.biomarkers && record.result.cancer_specific.biomarkers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Biomarkers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {record.result.cancer_specific.biomarkers.map((marker, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{marker}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Findings */}
                  {record.result.diagnosis && record.result.diagnosis.length > 0 && record.result.diagnosis[0] !== 'unknown' && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Key Findings</p>
                      <ul className="space-y-1">
                        {record.result.diagnosis.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Questions for Doctor */}
                  {record.result.questions_to_ask_doctor && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-700 mb-1">Questions for Your Doctor</p>
                      <p className="text-sm text-amber-900">{record.result.questions_to_ask_doctor}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save Records Prompt */}
      {showSavePrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Your records are analyzed!</p>
                <p className="text-xs text-blue-100 mb-3">Create a free account to save your records permanently, access them from any device, and get personalized guidance.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSavePrompt(false)
                      setPromptDismissed(true)
                      onOpenAuthModal?.()
                    }}
                    className="px-3 py-1.5 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors text-xs"
                  >
                    Create Free Account
                  </button>
                  <button
                    onClick={() => {
                      setShowSavePrompt(false)
                      setPromptDismissed(true)
                    }}
                    className="px-3 py-1.5 text-blue-200 hover:text-white transition-colors text-xs"
                  >
                    Continue without saving
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Component
export default function CircleAppPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [records, setRecords] = useState<UploadedRecord[]>([])
  const [cancerType, setCancerType] = useState<string>('')
  const [showCancerTypeModal, setShowCancerTypeModal] = useState(false)
  const [cancerTypeSearch, setCancerTypeSearch] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const isAuthenticated = !authLoading && !!user

  const completedRecordsCount = records.filter(r => r.status === 'completed').length

  // Handler when a file is uploaded in Ask tab - store both file and parsed result
  const handleRecordFromAsk = (file: File, parsedResult?: UploadedRecord['result']) => {
    const recordId = crypto.randomUUID()
    setRecords(prev => [...prev, { id: recordId, file, status: 'completed', result: parsedResult }])
  }

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: CPL logo */}
          <a href="https://community.cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img src="/cpl-logo.avif" alt="Cancer Patient Lab" className="h-8 w-auto" />
          </a>

          {/* Center: Tabs */}
          <div className="flex items-center gap-1">
            <TabButton
              active={activeTab === 'ask'}
              onClick={() => setActiveTab('ask')}
              icon={MessageCircle}
              label="Ask Navis"
            />
            <TabButton
              active={activeTab === 'records'}
              onClick={() => setActiveTab('records')}
              icon={Upload}
              label="Records"
              badge={completedRecordsCount}
            />
          </div>

          {/* Right: Auth status */}
          {authLoading ? (
            <div className="w-20" />
          ) : isAuthenticated ? (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 hover:text-red-600 text-sm font-medium transition-colors flex-shrink-0"
              title="Click to sign out"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-[#C66B4A] hover:bg-[#b55d3e] text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Up</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-stone-50 flex flex-col">
        {activeTab === 'ask' && (
          <AskTab
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onRecordUploaded={handleRecordFromAsk}
            cancerType={cancerType}
            onOpenCancerTypeModal={() => setShowCancerTypeModal(true)}
            uploadedRecords={records}
            onOpenAuthModal={() => setShowAuthModal(true)}
            userId={user?.id}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab records={records} setRecords={setRecords} onOpenAuthModal={() => setShowAuthModal(true)} isAuthenticated={isAuthenticated} authLoading={authLoading} userId={user?.id} />
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-4 py-3 flex-shrink-0">
        <div className="flex flex-col items-center gap-2">
          <a href="https://opencancer.ai" target="_blank" rel="noopener noreferrer">
            <img src="/nav-lockup-black.svg" alt="opencancer.ai" className="h-6 w-auto" />
          </a>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>© 2026</span>
            <span>·</span>
            <a href="https://opencancer.ai/about" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
              Built by cancer survivors
            </a>
          </div>
        </div>
      </div>

      {/* Cancer Type Selection Modal */}
      {showCancerTypeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCancerTypeModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Your Cancer Type</h2>
                <p className="text-sm text-gray-500">Get personalized questions and guidance</p>
              </div>
              <button onClick={() => setShowCancerTypeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={cancerTypeSearch}
                  onChange={(e) => setCancerTypeSearch(e.target.value)}
                  placeholder="Search cancer types..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent"
                />
              </div>
            </div>

            {/* Cancer Types Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh] space-y-4">
              {Object.entries(CANCER_CATEGORIES).map(([key, category]) => {
                const filteredTypes = category.types.filter(code => {
                  const label = CANCER_TYPES[code]?.toLowerCase() || ''
                  return label.includes(cancerTypeSearch.toLowerCase()) || code.includes(cancerTypeSearch.toLowerCase())
                })
                if (filteredTypes.length === 0) return null

                return (
                  <div key={key}>
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">{category.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredTypes.map((code) => (
                        <button
                          key={code}
                          onClick={() => {
                            setCancerType(code)
                            setShowCancerTypeModal(false)
                            setCancerTypeSearch('')
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                            cancerType === code
                              ? 'bg-[#C66B4A] text-white shadow-md'
                              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-[#C66B4A] hover:bg-orange-50'
                          }`}
                        >
                          {CANCER_TYPES[code]}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            {cancerType && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Selected: <strong className="text-gray-900">{CANCER_TYPES[cancerType]}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setCancerType('')
                      setCancerTypeSearch('')
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal - keeps users in circle-app experience */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/circle-app`}
      />
    </div>
  )
}
