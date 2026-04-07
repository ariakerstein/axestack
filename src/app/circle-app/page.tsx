'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Upload, User, Send, FileText, Loader2, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react'
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

// Ask Tab
function AskTab({ messages, setMessages, isLoading, setIsLoading }: {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

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
        body: JSON.stringify({
          message: question.trim(),
          sessionId: getSessionId(),
          source: 'circle-app',
        }),
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

  const suggestedQuestions = [
    "What questions should I ask my oncologist?",
    "How do I interpret my pathology report?",
    "What are the latest treatment options?",
    "How can I find relevant clinical trials?",
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-[#C66B4A] mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Navis</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
              Get personalized answers to your cancer-related questions from our AI research assistant.
            </p>
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors border border-gray-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
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
                  {msg.isLoading ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
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
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input) }} className="flex gap-2">
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
            placeholder="Ask a question about your cancer care..."
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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Tab bar */}
      <div className="bg-white border-b flex items-center flex-shrink-0">
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
        <div className="flex-1" />
        <a
          href="https://opencancer.ai/ask?login=1"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-3 text-gray-500 hover:text-[#C66B4A] text-sm font-medium transition-colors"
        >
          <User className="w-4 h-4" />
          <span>Sign In</span>
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ask' && (
          <AskTab messages={messages} setMessages={setMessages} isLoading={isLoading} setIsLoading={setIsLoading} />
        )}
        {activeTab === 'records' && (
          <RecordsTab records={records} setRecords={setRecords} />
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <a
          href="https://opencancer.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#C66B4A] transition-colors"
        >
          <span>Powered by</span>
          <span className="font-semibold">OpenCancer.ai</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href="https://opencancer.ai/ask"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Full experience →
        </a>
      </div>
    </div>
  )
}
