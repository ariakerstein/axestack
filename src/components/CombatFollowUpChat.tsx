'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Edit3, Loader2, Star } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAuth } from '@/lib/auth'
import { getSessionId } from '@/lib/supabase'

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
  onExpertClick?: () => void
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

// Detect what field the user is trying to correct
type CorrectionField = 'cancer_type' | 'stage' | 'biomarker' | 'treatment' | 'general'

interface IncompleteCorrection {
  field: CorrectionField
  currentValue?: string
  suggestions: string[]
}

function detectIncompleteCorrection(message: string, combatResult: CombatResult): IncompleteCorrection | null {
  const lowerMsg = message.toLowerCase()

  // Patterns that indicate something is wrong but don't provide the replacement
  const incompletePatterns = [
    { pattern: /\b(cancer\s*type|diagnosis|tumor\s*type)\b.*(wrong|incorrect|not right|mistake)/i, field: 'cancer_type' as CorrectionField },
    { pattern: /\b(wrong|incorrect|not right|mistake)\b.*(cancer\s*type|diagnosis|tumor\s*type)/i, field: 'cancer_type' as CorrectionField },
    { pattern: /\b(stage)\b.*(wrong|incorrect|not right)/i, field: 'stage' as CorrectionField },
    { pattern: /\b(wrong|incorrect)\b.*(stage)/i, field: 'stage' as CorrectionField },
    { pattern: /\b(biomarker|mutation|BRCA|HER2|EGFR)\b.*(wrong|incorrect)/i, field: 'biomarker' as CorrectionField },
    { pattern: /\b(treatment|therapy|chemo)\b.*(wrong|incorrect)/i, field: 'treatment' as CorrectionField },
  ]

  for (const { pattern, field } of incompletePatterns) {
    if (pattern.test(message)) {
      // Check if they provided a replacement value (e.g., "cancer type is wrong, it's actually breast")
      const hasReplacement = /\b(it's|it is|should be|actually|really)\s+\w+/i.test(message)
      if (!hasReplacement) {
        return {
          field,
          currentValue: extractCurrentValue(field, combatResult),
          suggestions: getSuggestionsForField(field)
        }
      }
    }
  }

  return null
}

function extractCurrentValue(field: CorrectionField, combatResult: CombatResult): string | undefined {
  // Try to extract current value from the combat result question or synthesis
  const text = combatResult.question + ' ' + combatResult.synthesis

  if (field === 'cancer_type') {
    const cancerMatch = text.match(/\b(breast|lung|prostate|colon|colorectal|pancreatic|ovarian|melanoma|leukemia|lymphoma)\s*(cancer|adenocarcinoma|carcinoma)?/i)
    return cancerMatch ? cancerMatch[0] : undefined
  }
  if (field === 'stage') {
    const stageMatch = text.match(/\b(stage\s*[I|II|III|IV|1|2|3|4][A-C]?|T\d[a-d]?N\d M\d)/i)
    return stageMatch ? stageMatch[0] : undefined
  }
  return undefined
}

function getSuggestionsForField(field: CorrectionField): string[] {
  switch (field) {
    case 'cancer_type':
      return ['Breast Cancer', 'Lung Cancer', 'Prostate Cancer', 'Colon Cancer', 'Pancreatic Cancer', 'Other']
    case 'stage':
      return ['Stage I', 'Stage II', 'Stage III', 'Stage IV']
    case 'biomarker':
      return ['HER2 Positive', 'HER2 Negative', 'BRCA1/2 Positive', 'EGFR Positive', 'Triple Negative']
    case 'treatment':
      return ['Chemotherapy', 'Immunotherapy', 'Targeted Therapy', 'Radiation', 'Surgery']
    default:
      return []
  }
}

function getFieldLabel(field: CorrectionField): string {
  switch (field) {
    case 'cancer_type': return 'cancer type'
    case 'stage': return 'stage'
    case 'biomarker': return 'biomarker status'
    case 'treatment': return 'treatment'
    default: return 'information'
  }
}

export function CombatFollowUpChat({
  combatResult,
  combatAnalysisId,
  onPerspectivesRevised,
  onExpertClick
}: CombatFollowUpChatProps) {
  const [messages, setMessages] = useState<FollowUpMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [detectedMode, setDetectedMode] = useState<'ask' | 'revise'>('ask')
  const [smartPrompt, setSmartPrompt] = useState<IncompleteCorrection | null>(null)
  const [pendingCorrection, setPendingCorrection] = useState<string>('') // Original message that triggered smart prompt
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

    // Check for incomplete correction before making API call
    const incomplete = detectIncompleteCorrection(input.trim(), combatResult)
    if (incomplete) {
      // Show smart prompt instead of making API call
      setPendingCorrection(input.trim())
      setSmartPrompt(incomplete)
      // Add user message to show what they typed
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: input.trim(),
        timestamp: new Date(),
        mode: 'revise'
      }])
      setInput('')
      return
    }

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

  // Handle smart prompt selection - complete the correction and fire API
  const handleSmartPromptSelect = async (selectedValue: string) => {
    if (!smartPrompt) return

    // Build complete correction message
    const fieldLabel = getFieldLabel(smartPrompt.field)
    const completeMessage = `The ${fieldLabel} is wrong. It should be ${selectedValue}.`

    // Clear smart prompt state
    setSmartPrompt(null)
    setPendingCorrection('')
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
          message: completeMessage,
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
          content: data.response || `Got it! I'll update the analysis to reflect that the ${fieldLabel} is ${selectedValue}.`,
          timestamp: new Date(),
          mode: data.mode,
          followUpQuestions: data.followUpQuestions,
          typingComplete: false
        }]
      })

      // Handle revision if perspectives were updated
      if (data.mode === 'revise' && data.revisedPerspectives?.length > 0 && onPerspectivesRevised) {
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
      console.error('Smart prompt follow-up error:', error)
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I'll update the analysis to reflect that the ${fieldLabel} is ${selectedValue}. Please note: for the most accurate analysis, consider re-running Combat with your updated records.`,
          timestamp: new Date()
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle custom text input from smart prompt
  const handleSmartPromptCustom = (customValue: string) => {
    if (customValue.trim()) {
      handleSmartPromptSelect(customValue.trim())
    }
  }

  // Dismiss smart prompt
  const dismissSmartPrompt = () => {
    setSmartPrompt(null)
    setPendingCorrection('')
  }

  const markTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, typingComplete: true } : m
    ))
  }

  return (
    <div className="space-y-3">
      {/* Chat with AI */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Messages - show if there are any messages OR a smart prompt */}
        {(messages.length > 0 || smartPrompt) && (
          <div className="max-h-80 overflow-y-auto p-4 space-y-4 border-b border-slate-100">
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

            {/* Smart Prompt Bubble - shows when user provides incomplete correction */}
            {smartPrompt && (
              <div className="flex justify-start">
                <div className="max-w-[90%] bg-amber-50 border border-amber-200 text-slate-900 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-600 text-lg">💡</span>
                    <span className="text-sm font-medium text-amber-800">
                      What should the {getFieldLabel(smartPrompt.field)} be?
                    </span>
                  </div>

                  {smartPrompt.currentValue && (
                    <p className="text-xs text-slate-500 mb-3">
                      Currently showing: <span className="font-medium">{smartPrompt.currentValue}</span>
                    </p>
                  )}

                  {/* Quick select chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {smartPrompt.suggestions.slice(0, 5).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSmartPromptSelect(suggestion)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-800 rounded-full hover:bg-amber-100 hover:border-amber-400 transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or type something else..."
                      className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleSmartPromptCustom(e.currentTarget.value)
                        }
                      }}
                      disabled={isLoading}
                    />
                    <button
                      onClick={dismissSmartPrompt}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input - Always visible */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question or correct something..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Mode indicator when typing */}
          {input.length > 5 && (
            <div className="flex items-center justify-center mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                detectedMode === 'revise' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Edit3 className="w-3 h-3" />
                {detectedMode === 'revise' ? 'Will update analysis' : 'Question mode'}
              </span>
            </div>
          )}
        </form>
      </div>

      {/* Expert Upsell CTA */}
      {onExpertClick && (
        <button
          onClick={onExpertClick}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Get Expert Review</p>
              <p className="text-xs text-slate-300">Tony Magliocco or Emma Shtivelman</p>
            </div>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            From Free →
          </span>
        </button>
      )}
    </div>
  )
}
