'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  CANCER_TYPES,
  PRIMARY_CATEGORIES,
  BLOOD_CANCERS,
  CANCER_SUBTYPES,
  STAGES,
  getTestsForCancer,
  getQuestionsForCancer,
  getBiomarkersForCancer,
} from '@/lib/cancer-data'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'

type Step = 'type' | 'subtype' | 'results'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isNew?: boolean
}

// Supabase config for RAG
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

// Atom Animation Component
function AtomIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const nucleusSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const electronSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <div className={`relative ${dimensions}`} style={{ perspective: '150px', perspectiveOrigin: 'center' }}>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className={`${nucleusSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 30% 30%, #E879F9, #A855F7 50%, #7C3AED 100%)',
          boxShadow: '0 2px 6px rgba(168, 85, 247, 0.4)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
        <div className={`absolute top-1/2 -left-0.5 -translate-y-1/2 ${electronSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9 100%)',
          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
        <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 ${electronSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 35% 35%, #67E8F9, #06B6D4 50%, #0891B2 100%)',
          boxShadow: '0 1px 3px rgba(6, 182, 212, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${electronSize} rounded-full animate-pulse`} style={{
          background: 'radial-gradient(circle at 35% 35%, #FBCFE8, #EC4899 50%, #DB2777 100%)',
          boxShadow: '0 1px 3px rgba(236, 72, 153, 0.5)',
        }} />
      </div>
    </div>
  )
}

export default function CancerChecklistPage() {
  const [step, setStep] = useState<Step>('type')
  const [cancerType, setCancerType] = useState<string>('')
  const [subtype, setSubtype] = useState<string>('')
  const [stage, setStage] = useState<string>('')
  const [showAllTypes, setShowAllTypes] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const allCancerTypes = Object.entries(CANCER_TYPES).filter(
    ([code]) => !BLOOD_CANCERS.includes(code)
  )

  const handleTypeSelect = (type: string) => {
    if (type === 'blood') {
      setShowAllTypes(false)
      setCancerType('')
      // Show blood cancer subtypes
    } else {
      setCancerType(type)
      setStep('subtype')
    }
  }

  const handleBloodCancerSelect = (type: string) => {
    setCancerType(type)
    setStep('subtype')
  }

  const handleSubtypeComplete = () => {
    setStep('results')
  }

  const handleReset = () => {
    setCancerType('')
    setSubtype('')
    setStage('')
    setStep('type')
    setShowAllTypes(false)
    setChatMessages([])
  }

  // Open chat with a pre-filled question
  const askAbout = (topic: string, context: string) => {
    setChatInput(`Tell me more about "${topic}" for ${CANCER_TYPES[cancerType] || 'my cancer'}: ${context}`)
    setChatOpen(true)
    setTimeout(() => {
      document.querySelector('[placeholder*="Ask about"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // RAG-enhanced question answering
  const handleAskQuestion = async () => {
    if (!chatInput.trim()) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      // Step 1: Get RAG context
      let ragContext = ''
      if (cancerType) {
        try {
          const ragQuery = `${CANCER_TYPES[cancerType]} ${stage || ''} ${userMessage}`.trim()
          const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              query: ragQuery,
              cancerType: cancerType,
              limit: 3,
            }),
          })

          if (ragResponse.ok) {
            const ragData = await ragResponse.json()
            if (ragData.chunks && ragData.chunks.length > 0) {
              ragContext = `\n\nRELEVANT NCCN GUIDELINES:\n${ragData.chunks.map((c: { content: string }) => c.content).join('\n\n')}`
            }
          }
        } catch (ragErr) {
          console.log('RAG search optional - continuing without guidelines')
        }
      }

      // Step 2: Build context
      const checklistContext = `
CANCER CHECKLIST CONTEXT:
Cancer Type: ${CANCER_TYPES[cancerType] || 'Not specified'}
${subtype ? `Subtype: ${CANCER_SUBTYPES[cancerType]?.find(s => s.code === subtype)?.label || subtype}` : ''}
${stage ? `Stage: ${STAGES.find(s => s.code === stage)?.label || stage}` : ''}

Essential Tests: ${tests.filter(t => t.priority === 'essential').map(t => t.name).join(', ')}
Emerging Tests: ${tests.filter(t => t.priority === 'emerging').map(t => t.name).join(', ')}
Biomarkers: ${biomarkers.map(b => b.marker).join(', ')}
${ragContext}
      `.trim()

      // Step 3: Call AI
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on this cancer checklist context and NCCN guidelines:\n\n${checklistContext}\n\nPatient Question: ${userMessage}\n\nProvide a helpful, educational response. If NCCN guidelines are provided, reference them. Always remind them to discuss with their healthcare provider.`,
          history: chatMessages.filter(m => !m.isNew),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')
      const data = await response.json()

      setChatMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })),
        { role: 'assistant', content: data.response, isNew: true }
      ])

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isNew: false
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const tests = getTestsForCancer(cancerType)
  const questions = getQuestionsForCancer(cancerType)
  const biomarkers = getBiomarkersForCancer(cancerType)
  const essentialTests = tests.filter((t) => t.priority === 'essential')
  const emergingTests = tests.filter((t) => t.priority === 'emerging')

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <section className="relative flex flex-col items-center justify-center px-8 pt-16 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl" />

        <div className="relative text-center max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-4 transition-colors"
          >
            <span>←</span> Home
          </Link>

          <Link href="/" className="flex items-center justify-center gap-2 mb-6">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Cancer Checklist</span>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500">
              Cancer Checklist
            </span>
          </h1>

          <p className="text-lg text-slate-600 mb-3">
            Test recommendations + questions for your oncologist
          </p>

          {/* NCCN Attribution - trust signal */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-emerald-700">Based on NCCN Guidelines</span>
          </div>

          <p className="text-sm text-slate-500">
            For informational purposes only. Not medical advice.
          </p>
        </div>
      </section>

      {/* Progress Steps - Bold & Clear */}
      <div className="max-w-2xl mx-auto px-8 py-6">
        <div className="flex items-center justify-center gap-4">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'type'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                : 'bg-violet-100 text-violet-600'
            }`}>
              1
            </div>
            <span className={`font-medium ${step === 'type' ? 'text-violet-600' : 'text-slate-500'}`}>
              Cancer Type
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'subtype'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : step === 'results'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              2
            </div>
            <span className={`font-medium ${step === 'subtype' ? 'text-blue-600' : step === 'results' ? 'text-slate-500' : 'text-slate-400'}`}>
              Details
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'results'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200'
                : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <span className={`font-medium ${step === 'results' ? 'text-cyan-600' : 'text-slate-400'}`}>
              Results
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Cancer Type Selection */}
      {step === 'type' && (
        <section className="py-8 px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
              What type of cancer?
            </h2>

            {/* Primary Categories */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {PRIMARY_CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => handleTypeSelect(cat.code)}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-400 hover:shadow-md transition-all text-center"
                >
                  <span className="text-2xl block mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-violet-600">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Blood cancer submenu */}
            {cancerType === '' && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="w-full text-center text-sm text-slate-500 hover:text-violet-600 transition-colors py-2"
                >
                  {showAllTypes ? '← Back to main categories' : 'Show all cancer types →'}
                </button>

                {showAllTypes && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {allCancerTypes.map(([code, label]) => (
                      <button
                        key={code}
                        onClick={() => handleTypeSelect(code)}
                        className="text-left bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-violet-400 hover:bg-white transition-all text-sm text-slate-700 hover:text-violet-600"
                      >
                        {label}
                      </button>
                    ))}
                    {BLOOD_CANCERS.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleBloodCancerSelect(code)}
                        className="text-left bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-violet-400 hover:bg-white transition-all text-sm text-slate-700 hover:text-violet-600"
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Show blood cancer options when blood is selected */}
            {PRIMARY_CATEGORIES.find((c) => c.code === 'blood') && cancerType === '' && !showAllTypes && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-3 text-center">
                  For blood cancers, select specific type:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BLOOD_CANCERS.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleBloodCancerSelect(code)}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-2 hover:border-violet-400 transition-all text-sm text-slate-700 hover:text-violet-600"
                    >
                      {CANCER_TYPES[code]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 2: Subtype & Stage */}
      {step === 'subtype' && (
        <section className="py-8 px-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                setCancerType('')
                setStep('type')
              }}
              className="text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              ← Change cancer type
            </button>

            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-8">
              <p className="text-violet-800 font-medium">
                {CANCER_TYPES[cancerType] || 'Cancer'}
              </p>
            </div>

            {/* Subtype Selection */}
            {CANCER_SUBTYPES[cancerType] && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Subtype (optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CANCER_SUBTYPES[cancerType].map((sub) => (
                    <button
                      key={sub.code}
                      onClick={() => setSubtype(sub.code)}
                      className={`text-left border rounded-lg px-4 py-3 transition-all text-sm ${
                        subtype === sub.code
                          ? 'bg-violet-50 border-violet-400 text-violet-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stage Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Stage (optional)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.code}
                    onClick={() => setStage(s.code)}
                    className={`text-left border rounded-lg px-4 py-3 transition-all ${
                      stage === s.code
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{s.label}</span>
                    {s.description && (
                      <span className="text-xs text-slate-500 block">
                        {s.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <div className="text-center">
              <button
                onClick={handleSubtypeComplete}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105"
              >
                Get My Checklist →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <section className="py-8 px-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setStep('subtype')}
              className="text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              ← Back to details
            </button>

            {/* Summary Header */}
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Your Cancer Checklist
              </h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                  {CANCER_TYPES[cancerType]}
                </span>
                {subtype && subtype !== 'unknown' && (
                  <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                    {CANCER_SUBTYPES[cancerType]?.find((s) => s.code === subtype)?.label}
                  </span>
                )}
                {stage && stage !== 'unknown' && (
                  <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                    {STAGES.find((s) => s.code === stage)?.label}
                  </span>
                )}
              </div>
            </div>

            {/* Essential Tests */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-violet-500">✓</span>
                Essential Tests (NCCN Guidelines)
              </h3>
              <p className="text-xs text-slate-500 mb-3">Tap any test to learn more</p>
              <div className="space-y-3">
                {essentialTests.map((test, i) => (
                  <button
                    key={i}
                    onClick={() => askAbout(test.name, test.reason)}
                    className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-400 hover:bg-violet-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border-2 border-slate-300 group-hover:border-violet-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 group-hover:text-violet-700">{test.name}</p>
                        <p className="text-sm text-slate-600">{test.reason}</p>
                      </div>
                      <span className="text-violet-400 group-hover:text-violet-600 flex-shrink-0 mt-1">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Emerging Tests */}
            {emergingTests.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-amber-500">★</span>
                  Emerging Tests (Beyond Guidelines)
                </h3>
                <div className="space-y-3">
                  {emergingTests.map((test, i) => (
                    <button
                      key={i}
                      onClick={() => askAbout(test.name, test.reason)}
                      className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl p-4 hover:border-amber-400 hover:bg-amber-100 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded border-2 border-amber-300 group-hover:border-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 flex items-center gap-2 group-hover:text-amber-800">
                            {test.name}
                            {test.urgency && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                {test.urgency}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-600">{test.reason}</p>
                        </div>
                        <span className="text-amber-400 group-hover:text-amber-600 flex-shrink-0 mt-1">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Questions for Oncologist */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-blue-500">?</span>
                Questions for Your Oncologist
              </h3>
              <p className="text-xs text-slate-500 mb-3">Tap any question to get AI guidance</p>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => askAbout(q, 'Help me understand this question and what answers to look for.')}
                    className="w-full text-left bg-blue-50 border border-blue-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-100 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5 group-hover:text-blue-600">?</span>
                      <span className="text-slate-700 flex-1 group-hover:text-blue-800">{q}</span>
                      <span className="text-blue-400 group-hover:text-blue-600 flex-shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Biomarkers */}
            {biomarkers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-purple-500">🧬</span>
                  Key Biomarkers & Targeted Therapies
                </h3>
                <p className="text-xs text-slate-500 mb-3">Tap any biomarker to learn more</p>
                <div className="space-y-2">
                  {biomarkers.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => askAbout(b.marker, `This biomarker is treated with ${b.drug}. ${b.indication}`)}
                      className="w-full text-left bg-purple-50 border border-purple-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-100 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-purple-700 group-hover:text-purple-800">{b.marker}</p>
                          <p className="text-sm text-slate-600">{b.drug}</p>
                          <p className="text-xs text-slate-500">{b.indication}</p>
                        </div>
                        <span className="text-purple-400 group-hover:text-purple-600 flex-shrink-0">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-link to CareCircle */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-6 text-center mt-6">
              <div className="text-3xl mb-2">💝</div>
              <p className="text-slate-700 mb-4">
                Tired of repeating updates to family and friends?
              </p>
              <Link
                href="/hub"
                className="inline-block bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"
              >
                Create a CareCircle
              </Link>
              <p className="text-slate-500 text-sm mt-3">
                One link. Post once. Keep everyone informed.
              </p>
            </div>

            {/* Start Over */}
            <div className="text-center mt-8">
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Start over with different cancer type
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="py-8 px-8 border-t border-slate-200 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-slate-500">
            This checklist is for educational purposes only and is not medical
            advice. Always consult with your oncologist about your specific
            situation. Guidelines are based on NCCN/ASCO recommendations and may
            not apply to all patients.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-8 bg-white">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            ← Home
          </Link>
          <div className="flex gap-6">
            <Link href="/records" className="hover:text-slate-900 transition-colors">
              Records
            </Link>
            <a href="https://community.cancerpatientlab.org" className="hover:text-slate-900 transition-colors">
              Community
            </a>
          </div>
        </div>
      </footer>

      {/* Side-Peek Chat Panel */}
      {step === 'results' && (
        <>
          {/* Chat Toggle Button */}
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-full shadow-lg shadow-violet-500/30 transition-all hover:scale-105"
            >
              <AtomIcon size="sm" />
              <span className="font-medium">Ask about your checklist</span>
            </button>
          )}

          {/* Side Panel */}
          <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AtomIcon size="md" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Ask Navis</h3>
                    <p className="text-xs text-slate-600">
                      NCCN {CANCER_TYPES[cancerType]} guidelines
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-2 hover:bg-violet-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="space-y-3">
                    <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                      <p className="text-sm text-slate-700">
                        I can help explain any test, question, or biomarker from your {CANCER_TYPES[cancerType]} checklist using NCCN guidelines.
                      </p>
                    </div>

                    <p className="text-sm font-medium text-slate-700 pt-2">Suggested questions</p>
                    {[
                      `What's the most important test for ${CANCER_TYPES[cancerType]}?`,
                      "What should I ask my oncologist at my next appointment?",
                      "Are there any clinical trials I should know about?",
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(q); setTimeout(handleAskQuestion, 50) }}
                        className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 hover:text-violet-700 transition-colors border border-slate-100 hover:border-violet-200 group"
                      >
                        <span className="text-violet-400 group-hover:text-violet-600 text-lg">→</span>
                        <span className="text-sm">{q}</span>
                      </button>
                    ))}
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${
                      msg.role === 'user'
                        ? 'ml-6 bg-violet-100 text-violet-900 px-4 py-3 rounded-2xl rounded-tr-sm'
                        : 'mr-2'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-100">
                        <TypewriterMarkdown
                          text={msg.content}
                          instantRender={!msg.isNew}
                          className="text-sm leading-relaxed"
                        />
                      </div>
                    ) : (
                      <span className="text-sm">{msg.content}</span>
                    )}
                  </div>
                ))}

                {isChatLoading && (
                  <div className="mr-4 bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm inline-block">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                    placeholder="Ask about tests, biomarkers, questions..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white rounded-xl transition-colors font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backdrop */}
          {chatOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-40 sm:hidden"
              onClick={() => setChatOpen(false)}
            />
          )}
        </>
      )}
    </main>
  )
}
