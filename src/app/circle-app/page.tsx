'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Upload, Swords, Send, FileText, Loader2, X, CheckCircle2, AlertCircle, ChevronDown, Sparkles, ArrowRight, Shield, FlaskConical, Target, Clock, Leaf } from 'lucide-react'
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
  confidenceScore?: number
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

interface CombatPerspective {
  name: string
  argument: string
  recommendation: string
  evidence: string[]
  confidence: number
}

interface CombatResult {
  perspectives: CombatPerspective[]
  synthesis: string
  phase: string
}

type TabType = 'ask' | 'records' | 'combat'

// Utility functions
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem('circle-app-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('circle-app-session-id', sessionId)
  }
  return sessionId
}

function getStoredCancerType(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('circle-app-cancer-type')
}

function storeCancerType(type: string) {
  localStorage.setItem('circle-app-cancer-type', type)
}

// Combat perspective icons and colors
const PERSPECTIVE_STYLES = {
  'Standard of Care': { icon: Shield, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Emerging Evidence': { icon: FlaskConical, gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Molecular/Targeted': { icon: Target, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Watch & Wait': { icon: Clock, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Whole Person': { icon: Leaf, gradient: 'from-green-500 to-teal-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

// Tab Button Component
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
          ? 'text-[#C66B4A] border-b-2 border-[#C66B4A] bg-orange-50/50'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C66B4A] text-white text-xs rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  )
}

// Ask Tab Component
function AskTab({ messages, setMessages, isLoading, setIsLoading, cancerType }: {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  cancerType: string | null
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
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

    // Add loading message
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
          question: question.trim(),
          cancerType: cancerType || undefined,
          sessionId: getSessionId(),
          source: 'circle-app',
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      // Replace loading message with actual response
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              content: data.response || data.answer || 'I apologize, but I couldn\'t generate a response. Please try again.',
              isLoading: false,
              confidenceScore: data.confidence,
            }
          : msg
      ))
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessage.id
          ? {
              ...msg,
              content: 'I apologize, but something went wrong. Please try again.',
              isLoading: false,
            }
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
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-[#C66B4A] mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Navis</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get personalized answers to your cancer-related questions from our AI research assistant.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#C66B4A] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.isLoading ? (
                  <ThinkingIndicator />
                ) : msg.role === 'assistant' ? (
                  <TypewriterMarkdown
                    text={msg.content}
                    onComplete={() => {
                      setMessages(prev => prev.map(m =>
                        m.id === msg.id ? { ...m, typingComplete: true } : m
                      ))
                    }}
                    instantRender={msg.typingComplete}
                  />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(input)
          }}
          className="flex gap-2"
        >
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
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-[#C66B4A] text-white rounded-xl hover:bg-[#b55d3e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

// Records Tab Component
function RecordsTab({ records, setRecords, onRecordsReady }: {
  records: UploadedRecord[]
  setRecords: React.Dispatch<React.SetStateAction<UploadedRecord[]>>
  onRecordsReady: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    const recordId = crypto.randomUUID()
    const newRecord: UploadedRecord = {
      id: recordId,
      file,
      status: 'pending',
    }

    setRecords(prev => [...prev, newRecord])

    // Update to processing
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, status: 'processing' } : r
    ))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', getSessionId())

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to process file')

      const result = await response.json()

      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, status: 'completed', result: result.result || result }
          : r
      ))
    } catch (error) {
      setRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, status: 'error', error: 'Failed to process file' }
          : r
      ))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    files.forEach(processFile)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(processFile)
  }

  const removeRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const completedRecords = records.filter(r => r.status === 'completed')

  return (
    <div className="p-4 space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#C66B4A] bg-orange-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#C66B4A]' : 'text-gray-400'}`} />
        <p className="text-gray-700 font-medium mb-1">
          {isDragging ? 'Drop files here' : 'Upload Medical Records'}
        </p>
        <p className="text-sm text-gray-500">
          Drag & drop or click to browse. Supports PDF, images, and documents.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded records list */}
      {records.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Uploaded Records</h3>
          {records.map((record) => (
            <div
              key={record.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                record.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : record.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <FileText className={`w-5 h-5 ${
                record.status === 'completed' ? 'text-green-600' :
                record.status === 'error' ? 'text-red-600' : 'text-gray-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {record.file.name}
                </p>
                {record.status === 'completed' && record.result && (
                  <p className="text-xs text-green-600">
                    {record.result.document_type || 'Processed'} - {record.result.cancer_specific?.cancer_type || 'Analysis ready'}
                  </p>
                )}
                {record.status === 'processing' && (
                  <p className="text-xs text-blue-600">Processing...</p>
                )}
                {record.status === 'error' && (
                  <p className="text-xs text-red-600">{record.error}</p>
                )}
              </div>
              {record.status === 'processing' ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : record.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : record.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : null}
              <button
                onClick={() => removeRecord(record.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Combat CTA */}
      {completedRecords.length > 0 && (
        <button
          onClick={onRecordsReady}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#C66B4A] to-[#d47a59] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
        >
          <Swords className="w-5 h-5" />
          Analyze with AI Tumor Board ({completedRecords.length} record{completedRecords.length !== 1 ? 's' : ''})
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

// Combat Tab Component
function CombatTab({ records, combatResult, setCombatResult, isAnalyzing, setIsAnalyzing }: {
  records: UploadedRecord[]
  combatResult: CombatResult | null
  setCombatResult: React.Dispatch<React.SetStateAction<CombatResult | null>>
  isAnalyzing: boolean
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const completedRecords = records.filter(r => r.status === 'completed')

  const runAnalysis = async () => {
    if (completedRecords.length === 0) return

    setIsAnalyzing(true)
    setCombatResult(null)

    try {
      const recordsPayload = completedRecords.map(r => ({
        fileName: r.file.name,
        documentType: r.result?.document_type || 'Medical Record',
        result: r.result,
      }))

      const response = await fetch('/api/combat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'treatment',
          records: recordsPayload,
          weights: {
            guidelines: 50,
            aggressive: 50,
            precision: 50,
            conservative: 50,
            integrative: 50,
          },
          communicationStyle: 'balanced',
          sessionId: getSessionId(),
        }),
      })

      if (!response.ok) throw new Error('Failed to run analysis')

      const data = await response.json()
      setCombatResult(data)
    } catch (error) {
      console.error('Combat analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (completedRecords.length === 0) {
    return (
      <div className="p-8 text-center">
        <Swords className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Tumor Board</h3>
        <p className="text-gray-600 mb-4">
          Upload your medical records first to get multi-perspective analysis from 5 AI specialists.
        </p>
        <p className="text-sm text-gray-500">
          Go to the Records tab to upload your pathology reports, scans, and lab results.
        </p>
      </div>
    )
  }

  if (isAnalyzing) {
    return (
      <div className="p-8 text-center">
        <div className="relative inline-block mb-4">
          <Swords className="w-16 h-16 text-[#C66B4A] animate-pulse" />
          <div className="absolute inset-0 animate-ping opacity-20">
            <Swords className="w-16 h-16 text-[#C66B4A]" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Your Case</h3>
        <p className="text-gray-600 mb-4">
          5 AI specialists are reviewing your records and formulating their perspectives...
        </p>
        <div className="flex justify-center gap-2">
          {Object.entries(PERSPECTIVE_STYLES).map(([name, style]) => {
            const Icon = style.icon
            return (
              <div
                key={name}
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center animate-pulse`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!combatResult) {
    return (
      <div className="p-8 text-center">
        <Swords className="w-16 h-16 mx-auto text-[#C66B4A] mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
        <p className="text-gray-600 mb-6">
          {completedRecords.length} record{completedRecords.length !== 1 ? 's' : ''} ready for multi-perspective analysis.
        </p>
        <button
          onClick={runAnalysis}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#C66B4A] to-[#d47a59] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
        >
          <Swords className="w-5 h-5" />
          Start AI Tumor Board Analysis
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Synthesis */}
      {combatResult.synthesis && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#C66B4A]" />
            <h3 className="font-semibold">Integrated Analysis</h3>
          </div>
          <TypewriterMarkdown text={combatResult.synthesis} instantRender />
        </div>
      )}

      {/* Perspectives */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Five Perspectives</h3>
        {combatResult.perspectives?.map((perspective, i) => {
          const style = PERSPECTIVE_STYLES[perspective.name as keyof typeof PERSPECTIVE_STYLES] || PERSPECTIVE_STYLES['Standard of Care']
          const Icon = style.icon

          return (
            <details
              key={i}
              className={`group border ${style.border} rounded-xl overflow-hidden`}
            >
              <summary className={`flex items-center gap-3 p-4 cursor-pointer ${style.bg} hover:opacity-90`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${style.text}`}>{perspective.name}</h4>
                  <p className="text-sm text-gray-600 line-clamp-1">{perspective.recommendation}</p>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 bg-white space-y-3">
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Analysis</h5>
                  <TypewriterMarkdown text={perspective.argument} instantRender />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Recommendation</h5>
                  <p className="text-gray-800">{perspective.recommendation}</p>
                </div>
                {perspective.evidence && perspective.evidence.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500 mb-1">Evidence</h5>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {perspective.evidence.map((e, j) => (
                        <li key={j}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )
        })}
      </div>

      {/* Run again button */}
      <button
        onClick={runAnalysis}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <Swords className="w-5 h-5" />
        Run Analysis Again
      </button>
    </div>
  )
}

// Main Circle App Component
export default function CircleAppPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ask')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [records, setRecords] = useState<UploadedRecord[]>([])
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [cancerType, setCancerType] = useState<string | null>(null)

  // Load stored cancer type on mount
  useEffect(() => {
    setCancerType(getStoredCancerType())
  }, [])

  // Update cancer type from records
  useEffect(() => {
    const completedRecord = records.find(r => r.status === 'completed' && r.result?.cancer_specific?.cancer_type)
    if (completedRecord?.result?.cancer_specific?.cancer_type) {
      const detectedType = completedRecord.result.cancer_specific.cancer_type
      setCancerType(detectedType)
      storeCancerType(detectedType)
    }
  }, [records])

  const handleRecordsReady = () => {
    setActiveTab('combat')
  }

  const completedRecordsCount = records.filter(r => r.status === 'completed').length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#C66B4A] to-[#d47a59] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OC</span>
            </div>
            <span className="font-semibold text-gray-900">OpenCancer</span>
          </div>
          {cancerType && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {cancerType}
            </span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b flex">
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
        <TabButton
          active={activeTab === 'combat'}
          onClick={() => setActiveTab('combat')}
          icon={Swords}
          label="Combat"
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ask' && (
          <AskTab
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            cancerType={cancerType}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab
            records={records}
            setRecords={setRecords}
            onRecordsReady={handleRecordsReady}
          />
        )}
        {activeTab === 'combat' && (
          <CombatTab
            records={records}
            combatResult={combatResult}
            setCombatResult={setCombatResult}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t px-4 py-2 text-center">
        <p className="text-xs text-gray-500">
          Powered by <a href="https://opencancer.ai" target="_blank" rel="noopener noreferrer" className="text-[#C66B4A] hover:underline">OpenCancer.ai</a>
        </p>
      </footer>
    </div>
  )
}
