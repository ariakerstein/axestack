'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, HelpCircle, Edit3, Loader2, AlertCircle, Plus, HelpCircle as Why } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAuth } from '@/lib/auth'
import { getSessionId } from '@/lib/supabase'

// Structured action types
type ActionType = 'correct' | 'add_context' | 'explain' | 'custom'

interface Perspective {
  name: string
  icon: 'shield' | 'flask' | 'target' | 'clock' | 'leaf' | 'swords'
  color: string
  argument: string
  evidence: string[]
  confidence: number
  recommendation: string
}

interface CombatResult {
  phase: 'diagnosis' | 'treatment'
  question: string
  perspectives: Perspective[]
  synthesis: string
  consensus: string[]
  divergence: string[]
}

interface FollowUpMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  mode?: 'ask' | 'revise'
  followUpQuestions?: string[]
  isLoading?: boolean
  typingComplete?: boolean
}

interface CombatFollowUpChatProps {
  combatResult: CombatResult
  combatAnalysisId?: string
  onPerspectivesRevised?: (updatedResult: CombatResult) => void
}

// Detect mode from user input
function detectMode(message: string): 'ask' | 'revise' {
  const revisionPatterns = [
    /\b(actually|correction|wrong|incorrect|not right|mistake)\b/i,
    /\b(those|the|my)\s+\w+\s+(are|is)\s+(actually|really|SNPs?|germline|somatic)\b/i,
    /\b(update|change|revise|correct)\b.*\brecommendation\b/i,
    /\bHRR\b.*\b(SNP|VUS)\b/i,
    /\bBRCA\b.*\b(positive|negative|germline|somatic)\b/i,
    /\b(I have|I had|diagnosed with|my diagnosis)\b/i,
    /\b(stage|grade)\s+(is|was)\s+(actually|really)\b/i,
  ]
  return revisionPatterns.some(p => p.test(message)) ? 'revise' : 'ask'
}

export function CombatFollowUpChat({
  combatResult,
  combatAnalysisId,
  onPerspectivesRevised
}: CombatFollowUpChatProps) {
  const [messages, setMessages] = useState<FollowUpMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [detectedMode, setDetectedMode] = useState<'ask' | 'revise'>('ask')
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Detect mode as user types
  useEffect(() => {
    if (input.length > 5) {
      setDetectedMode(detectMode(input))
    } else {
      setDetectedMode('ask')
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: FollowUpMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      mode: detectedMode
    }

    // Add user message and loading state
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Add loading message
    const loadingId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }])

    try {
      const response = await fetch('/api/combat/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          combatAnalysisId,
          combatResult,
          history: messages.filter(m => !m.isLoading).map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: user?.id,
          sessionId: getSessionId()
        })
      })

      const data = await response.json()

      // Remove loading message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response || 'Sorry, I could not process that request.',
          timestamp: new Date(),
          mode: data.mode,
          followUpQuestions: data.followUpQuestions,
          typingComplete: false
        }]
      })

      // Handle revision if perspectives were updated
      if (data.mode === 'revise' && data.revisedPerspectives?.length > 0 && onPerspectivesRevised) {
        // Build updated combat result
        const updatedPerspectives = combatResult.perspectives.map(p => {
          const revised = data.revisedPerspectives.find((r: Perspective) => r.name === p.name)
          return revised || p
        })

        const updatedResult: CombatResult = {
          ...combatResult,
          perspectives: updatedPerspectives,
          synthesis: data.revisedSynthesis?.synthesis || combatResult.synthesis,
          consensus: data.revisedSynthesis?.consensus || combatResult.consensus,
          divergence: data.revisedSynthesis?.divergence || combatResult.divergence
        }

        onPerspectivesRevised(updatedResult)
      }

    } catch (error) {
      console.error('Follow-up error:', error)
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date()
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const markTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, typingComplete: true } : m
    ))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Follow-up Questions</h3>
        </div>
        <ModeIndicator mode={detectedMode} isTyping={input.length > 5} />
      </div>

      {/* Messages */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !activeAction && (
          <div className="space-y-3">
            <p className="text-slate-500 text-sm text-center">What would you like to do?</p>

            {/* Structured Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setActiveAction('correct')
                  setInput('')
                  setTimeout(() => inputRef.current?.focus(), 100)
                }}
                className="flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">Something&apos;s Wrong</span>
              </button>

              <button
                onClick={() => {
                  setActiveAction('add_context')
                  setInput('')
                  setTimeout(() => inputRef.current?.focus(), 100)
                }}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-800">Add Context</span>
              </button>

              <button
                onClick={() => {
                  setActiveAction('explain')
                  setInput('')
                  setTimeout(() => inputRef.current?.focus(), 100)
                }}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Explain This</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-slate-900 text-white rounded-2xl rounded-br-md px-4 py-3'
                : 'bg-slate-50 text-slate-900 rounded-2xl rounded-bl-md px-4 py-3'
            }`}>
              {msg.isLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-slate-500 text-sm">Analyzing...</span>
                </div>
              ) : msg.role === 'assistant' && !msg.typingComplete ? (
                <TypewriterMarkdown
                  text={msg.content}
                  speed={15}
                  onComplete={() => markTypingComplete(msg.id)}
                />
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}

              {/* Mode badge for assistant */}
              {msg.role === 'assistant' && msg.mode && msg.typingComplete && (
                <div className={`mt-2 pt-2 border-t ${
                  msg.mode === 'revise' ? 'border-amber-200' : 'border-slate-200'
                }`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    msg.mode === 'revise'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {msg.mode === 'revise' ? 'Analysis updated' : 'Explanation'}
                  </span>
                </div>
              )}

              {/* Follow-up suggestions */}
              {msg.role === 'assistant' && msg.followUpQuestions && msg.typingComplete && (
                <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
                  {msg.followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="block text-xs text-slate-500 hover:text-slate-700 hover:underline text-left"
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Only show when action is selected or has messages */}
      {(activeAction || messages.length > 0) && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4">
          {/* Action context header */}
          {activeAction && messages.length === 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                activeAction === 'correct' ? 'bg-amber-100 text-amber-700' :
                activeAction === 'add_context' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {activeAction === 'correct' ? 'Correction Mode' :
                 activeAction === 'add_context' ? 'Adding Context' :
                 'Question Mode'}
              </span>
              <button
                type="button"
                onClick={() => { setActiveAction(null); setInput('') }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeAction === 'correct' ? "e.g., 'My HRR mutations are SNPs, not pathogenic'" :
                activeAction === 'add_context' ? "e.g., 'I also have a BRCA2 mutation'" :
                activeAction === 'explain' ? "e.g., 'Why does Watch & Wait disagree?'" :
                "Type your question or correction..."
              }
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-2 text-center">
            {activeAction === 'correct' ? "This will update affected perspectives" :
             activeAction === 'add_context' ? "This may refine the recommendations" :
             "I'll explain without changing the analysis"}
          </p>
        </form>
      )}
    </div>
  )
}

// Mode indicator component
function ModeIndicator({ mode, isTyping }: { mode: 'ask' | 'revise', isTyping: boolean }) {
  if (!isTyping) return null

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
      mode === 'ask'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      {mode === 'ask' ? (
        <>
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Ask mode</span>
        </>
      ) : (
        <>
          <Edit3 className="w-3.5 h-3.5" />
          <span>Revise mode</span>
        </>
      )}
    </div>
  )
}

// Suggested question chip
function SuggestedChip({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
    >
      {text}
    </button>
  )
}
