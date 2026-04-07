'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Upload, User, Send, FileText, Loader2, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Paperclip, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

// Types
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
      biomarkers: string[]
    }
    test_summary: string
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
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative ${
        active
          ? 'text-[#C66B4A] border-b-2 border-[#C66B4A]'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-[#C66B4A] text-white text-xs rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

// Suggested question with category
interface SuggestedQuestion {
  question: string
  category: string
  categoryColor: string
}

const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { question: "What are the standard treatment options for my cancer type and stage?", category: "Treatment", categoryColor: "bg-blue-100 text-blue-700" },
  { question: "What side effects should I expect from treatment?", category: "Side Effects", categoryColor: "bg-amber-100 text-amber-700" },
  { question: "What questions should I ask my oncologist at my next appointment?", category: "Care Planning", categoryColor: "bg-green-100 text-green-700" },
  { question: "Are there any clinical trials I might be eligible for?", category: "Clinical Trials", categoryColor: "bg-purple-100 text-purple-700" },
]

// Welcome message content
const WELCOME_MESSAGE = `Hi, I'm **Navis**, your OpenCancer AI assistant. I can help you find information about cancer treatments, clinical trials, and caregiver strategies, grounded in NCCN guidelines and expert-led resources.

📎 **Drop your medical records right here!** Click the paperclip or drag & drop a pathology report, lab result, or scan — I'll read it and answer questions about YOUR specific case.

I can help you with:
- **Analyzing your records** — attach any PDF or image and ask "what does this mean?"
- Understanding NCCN guidelines for your specific situation
- Exploring treatment options and clinical trials
- Interpreting test results and biomarkers
- Preparing questions for your oncologist

**Please remember:** This is educational information only, not medical advice. Always consult your doctor about your specific situation.

**How can I help you today?**`

// Ask Tab - Enhanced version
function AskTab({ messages, setMessages, isLoading, setIsLoading, onRecordUploaded }: {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  onRecordUploaded?: (file: File) => void
}) {
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [pendingFeedbackType, setPendingFeedbackType] = useState<'positive' | 'negative' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Build request body
    const requestBody: Record<string, unknown> = {
      message: question.trim(),
      sessionId: getSessionId(),
      source: 'circle-app',
    }

    // If file attached, process it first
    if (attachedFile) {
      try {
        const formData = new FormData()
        formData.append('file', attachedFile)
        formData.append('sessionId', getSessionId())

        const translateRes = await fetch('/api/translate', { method: 'POST', body: formData })
        const translateData = await translateRes.json()
        if (translateData.result) {
          requestBody.patientContext = JSON.stringify(translateData.result)
        }
        // Also notify Records tab
        onRecordUploaded?.(attachedFile)
      } catch (e) {
        console.error('Failed to process attachment:', e)
      }
      setAttachedFile(null)
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

      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? { ...msg, content: data.response || 'Sorry, something went wrong.', isLoading: false }
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <div className="flex gap-1 py-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
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

        {/* Suggested questions */}
        {showSuggestions && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(sq.question)}
                  className="w-full text-left p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-[#C66B4A] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 group-hover:text-gray-900">{sq.question}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${sq.categoryColor}`}>
                        {sq.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-3">
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
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent"
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
          AI-generated educational information only. Not medical advice. In emergencies, call 911.
        </p>
      </div>
    </div>
  )
}

// Records Tab
function RecordsTab({ records, setRecords }: {
  records: UploadedRecord[]
  setRecords: React.Dispatch<React.SetStateAction<UploadedRecord[]>>
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    const recordId = crypto.randomUUID()
    const newRecord: UploadedRecord = { id: recordId, file, status: 'pending' }
    setRecords(prev => [...prev, newRecord])
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'processing' } : r))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', getSessionId())

      const response = await fetch('/api/translate', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Failed to process')

      const result = await response.json()
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, status: 'completed', result: result.result || result } : r
      ))
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
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 text-sm">Uploaded Records</h3>
          {records.map((record) => (
            <div
              key={record.id}
              className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                record.status === 'completed' ? 'bg-green-50 border-green-200' :
                record.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <FileText className={`w-4 h-4 flex-shrink-0 ${
                record.status === 'completed' ? 'text-green-600' :
                record.status === 'error' ? 'text-red-600' : 'text-gray-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{record.file.name}</p>
                {record.status === 'completed' && record.result && (
                  <p className="text-xs text-green-600 truncate">
                    {record.result.document_type} {record.result.cancer_specific?.cancer_type && `• ${record.result.cancer_specific.cancer_type}`}
                  </p>
                )}
                {record.status === 'processing' && <p className="text-xs text-blue-600">Processing...</p>}
                {record.status === 'error' && <p className="text-xs text-red-600">{record.error}</p>}
              </div>
              {record.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {record.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {record.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              <button onClick={() => setRecords(prev => prev.filter(r => r.id !== record.id))} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {records.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500">
            Your records are processed locally and never stored without your permission.
          </p>
        </div>
      )}
    </div>
  )
}

// Main Component
export default function CircleAppPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [records, setRecords] = useState<UploadedRecord[]>([])

  const completedRecordsCount = records.filter(r => r.status === 'completed').length

  // Handler when a file is uploaded in Ask tab
  const handleRecordFromAsk = (file: File) => {
    const recordId = crypto.randomUUID()
    setRecords(prev => [...prev, { id: recordId, file, status: 'completed' }])
  }

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Header with logo */}
      <div className="bg-white border-b flex items-center px-3 py-2 flex-shrink-0">
        <a href="https://community.cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <img src="/cpl-logo.avif" alt="Cancer Patient Lab" className="h-8 w-auto" />
        </a>
        <div className="flex-1 flex items-center justify-center gap-1">
          <TabButton
            active={activeTab === 'ask'}
            onClick={() => setActiveTab('ask')}
            icon={MessageCircle}
            label="Ask"
          />
          <TabButton
            active={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
            icon={Upload}
            label="Records"
            badge={completedRecordsCount}
          />
        </div>
        <a
          href="https://opencancer.ai/ask?login=1"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-[#C66B4A] text-sm font-medium transition-colors flex-shrink-0"
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Sign In</span>
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ask' && (
          <AskTab
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onRecordUploaded={handleRecordFromAsk}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab records={records} setRecords={setRecords} />
        )}
      </div>

      {/* Minimal Footer */}
      <div className="border-t bg-gray-50 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <a href="https://opencancer.ai" target="_blank" rel="noopener noreferrer" className="hover:text-[#C66B4A] font-medium">
            Powered by OpenCancer.ai
          </a>
          <div className="flex items-center gap-3">
            <a href="https://opencancer.ai/records" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Records</a>
            <a href="https://opencancer.ai/ask" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Ask Navis</a>
            <a href="https://opencancer.ai/cancer-checklist" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Checklist</a>
            <span className="text-gray-300">|</span>
            <a href="https://opencancer.ai/about" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">About</a>
            <a href="https://opencancer.ai/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
