'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getShuffledQuotes } from '@/lib/quotes'

const DECK_TYPES = [
  { id: 'fundraising', label: 'Fundraising Deck', available: true },
  { id: 'board', label: 'Board Update', available: false },
  { id: 'sales', label: 'Sales / GTM Deck', available: false },
  { id: 'product', label: 'Product Review', available: false },
]

const STAGES = [
  { id: 'pre-seed', label: 'Pre-seed', description: 'Team + vision, early signal' },
  { id: 'seed', label: 'Seed', description: 'PMF signal, GTM wedge' },
  { id: 'series-a', label: 'Series A', description: 'Proven PMF, unit economics' },
  { id: 'series-b', label: 'Series B+', description: 'Scale + expansion' },
]

const THEMES = [
  { id: 'dark-modern', label: 'Dark Modern', description: 'Vibrant accents, alternating rhythm', preview: 'bg-slate-900' },
  { id: 'light-clean', label: 'Light Clean', description: 'All-white, formal', preview: 'bg-white border border-slate-200' },
  { id: 'warm-editorial', label: 'Warm Editorial', description: 'Warm tones, storytelling', preview: 'bg-amber-50' },
  { id: 'bold-dark', label: 'Bold Dark', description: 'High contrast, punchy', preview: 'bg-black' },
]

const QUESTIONS = [
  {
    id: 'companyName',
    question: 'What\'s your company name?',
    placeholder: 'Acme Inc.',
    hint: 'This appears in the top-left of every slide.',
  },
  {
    id: 'oneLiner',
    question: 'What do you do in one sentence?',
    placeholder: 'We help [X] do [Y] by [Z]',
    hint: 'Be specific about who, what, and how.',
    examples: [
      'We let anyone rent out their spare room to travelers worldwide',
      'We help SMBs automate invoicing and get paid 2x faster',
      'We connect people with their college friends online',
    ],
  },
  {
    id: 'desperatePerson',
    question: 'Who is desperate for this?',
    placeholder: 'A specific person with a specific problem...',
    hint: 'Name a real person, not a category like "enterprises" or "millennials".',
    examples: [
      'Sarah, a host in SF who needs $500/month to cover rent',
      'Marcus, an ops manager drowning in spreadsheets tracking 50 vendors',
      'Dev teams shipping daily who can\'t wait for 30-min sync meetings',
    ],
  },
  {
    id: 'currentSolution',
    question: 'What are they doing today without you?',
    placeholder: 'The painful workaround they currently use...',
    hint: 'This reveals if you\'re a painkiller or vitamin.',
    examples: [
      'Posting on Craigslist and hoping they don\'t get scammed',
      'Copy-pasting between 4 different tools and praying nothing breaks',
      'Sending group emails that nobody reads or replies to',
    ],
  },
  {
    id: 'unfairAdvantage',
    question: 'What\'s your unfair advantage?',
    placeholder: 'Why you specifically will win...',
    hint: 'Credentials, traction, unique insight, or domain expertise.',
    examples: [
      'Ex-Stripe payments team, built fraud detection serving $10B/year',
      '10K users on waitlist, 40% weekly active before any marketing',
      'Former Airbnb growth lead, scaled from 1M to 100M users',
    ],
  },
  {
    id: 'businessModel',
    question: 'How do you make money?',
    placeholder: '',
    hint: 'Pick ONE. No "exploring options."',
    type: 'select',
    options: [
      { value: 'per_transaction', label: 'Per transaction (e.g., $99/use)' },
      { value: 'subscription', label: 'Subscription (e.g., $X/month)' },
      { value: 'marketplace', label: 'Marketplace (take rate)' },
      { value: 'enterprise', label: 'Enterprise sales (contracts)' },
    ],
  },
  {
    id: 'raise',
    question: 'How much are you raising, and what milestone does it unlock?',
    placeholder: '',
    hint: 'Be specific about both the amount and what it proves.',
    type: 'raise',
    examples: [
      '$500K to reach 1,000 paying customers and prove unit economics',
      '$1.5M to hit $100K MRR and expand to 3 new verticals',
      '$250K to launch MVP and get first 10 enterprise pilots',
    ],
  },
]

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0 = deck type/stage, 1+ = questions
  const [deckType, setDeckType] = useState('fundraising')
  const [stage, setStage] = useState('')
  const [theme, setTheme] = useState('dark-modern')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [raiseAmount, setRaiseAmount] = useState('')
  const [raiseMilestone, setRaiseMilestone] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // Step 0 is deck type/stage selection, steps 1+ are questions
  const questionIndex = step - 1
  const currentQuestion = step > 0 ? QUESTIONS[questionIndex] : null
  const isLastStep = step === QUESTIONS.length
  const totalSteps = QUESTIONS.length + 1 // +1 for deck type/stage step

  const currentAnswer = step === 0
    ? (deckType && stage ? 'filled' : '')
    : currentQuestion?.type === 'raise'
      ? (raiseAmount && raiseMilestone ? 'filled' : '')
      : answers[currentQuestion?.id || ''] || ''

  const handleNext = () => {
    if (currentQuestion?.type === 'raise') {
      setAnswers({ ...answers, raiseAmount, raiseMilestone })
    }

    if (isLastStep) {
      handleGenerate()
    } else {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')

    const finalAnswers = {
      ...answers,
      raiseAmount,
      raiseMilestone,
      stage, // Include stage for context-aware generation
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, stage, theme }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate deck')
      }

      const data = await response.json()
      // Save deck with stage and theme for context-aware features
      localStorage.setItem('generatedDeck', JSON.stringify({ ...data, stage, theme }))
      router.push('/editor')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate deck'
      setError(message)
      setIsGenerating(false)
    }
  }

  const updateAnswer = (value: string) => {
    if (!currentQuestion) return
    setAnswers({ ...answers, [currentQuestion.id]: value })
  }

  const [quoteIndex, setQuoteIndex] = useState(0)
  const quotes = useMemo(() => getShuffledQuotes(), [])

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isGenerating, quotes.length])

  if (isGenerating) {
    const quote = quotes[quoteIndex]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mb-8"></div>
        <h2 className="text-2xl font-semibold mb-4">Generating your deck...</h2>
        <p className="text-slate-400 mb-12">Creating 10 slides with AI. About 30 seconds.</p>

        <div className="max-w-lg text-center transition-opacity duration-500">
          <p className="text-lg text-slate-300 italic mb-2">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-sm text-slate-500">— {quote.author}</p>
        </div>
      </div>
    )
  }

  const canProceed = !!currentAnswer
  const progress = ((step + 1) / totalSteps) * 100

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-teal-400 hover:underline text-sm">
            ← Back to home
          </Link>
          <span className="text-sm text-slate-500">
            {step === 0 ? 'Getting started' : `Question ${step} of ${QUESTIONS.length}`}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-full bg-teal-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Step 0: Deck Type + Stage Selection */}
          {step === 0 && (
            <>
              <h1 className="text-3xl font-bold mb-3">What are you building?</h1>
              <p className="text-slate-400 mb-8">Select your deck type and funding stage.</p>

              {/* Deck Type */}
              <div className="mb-8">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Deck Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {DECK_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => type.available && setDeckType(type.id)}
                      disabled={!type.available}
                      className={`relative px-4 py-4 rounded-xl border text-left transition-colors ${
                        !type.available
                          ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed'
                          : deckType === type.id
                            ? 'border-teal-400 bg-teal-400/10 text-white'
                            : 'border-slate-700 bg-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <span className={!type.available ? 'text-slate-500' : ''}>{type.label}</span>
                      {!type.available && (
                        <span className="absolute top-2 right-2 text-xs bg-amber-500/20 text-amber-400 font-medium px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage */}
              <div className="mb-8">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Funding Stage</p>
                <div className="space-y-3">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStage(s.id)}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition-colors ${
                        stage === s.id
                          ? 'border-teal-400 bg-teal-400/10 text-white'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-slate-400 ml-2">— {s.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Visual Theme</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative px-4 py-4 rounded-xl border text-left transition-colors ${
                        theme === t.id
                          ? 'border-teal-400 bg-teal-400/10'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${t.preview}`} />
                        <div>
                          <span className={`font-medium ${theme === t.id ? 'text-white' : 'text-slate-300'}`}>
                            {t.label}
                          </span>
                          <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Questions (Step 1+) */}
          {step > 0 && currentQuestion && (
            <>
              <h1 className="text-3xl font-bold mb-3">{currentQuestion.question}</h1>
              <p className="text-slate-400 mb-8">{currentQuestion.hint}</p>

              {/* Text Input */}
              {!currentQuestion.type && (
                <>
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => updateAnswer(e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-teal-400 transition-colors"
                    autoFocus
                  />
                  {currentQuestion.examples && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Examples</p>
                      {currentQuestion.examples.map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => updateAnswer(ex)}
                          className="block w-full text-left text-sm text-slate-400 hover:text-teal-400 hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors"
                        >
                          &quot;{ex}&quot;
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Select Input */}
              {currentQuestion.type === 'select' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateAnswer(option.value)}
                      className={`w-full text-left px-5 py-4 rounded-xl border text-lg transition-colors ${
                        answers[currentQuestion.id] === option.value
                          ? 'border-teal-400 bg-teal-400/10 text-white'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Raise Input */}
              {currentQuestion.type === 'raise' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(e.target.value)}
                    placeholder="Amount (e.g., $500K)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-teal-400 transition-colors"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={raiseMilestone}
                    onChange={(e) => setRaiseMilestone(e.target.value)}
                    placeholder="Milestone (e.g., 1,000 paying customers)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-teal-400 transition-colors"
                  />
                  {currentQuestion.examples && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Examples</p>
                      {currentQuestion.examples.map((ex, i) => {
                        const parts = ex.match(/^(\$[\d.]+[KMB]?)\s+to\s+(.+)$/i)
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (parts) {
                                setRaiseAmount(parts[1])
                                setRaiseMilestone(parts[2])
                              }
                            }}
                            className="block w-full text-left text-sm text-slate-400 hover:text-teal-400 hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors"
                          >
                            &quot;{ex}&quot;
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-red-400 mt-4 text-sm">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex flex-col items-end mt-10">
            <div className="flex justify-between w-full">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`px-6 py-3 rounded-lg text-lg transition-colors ${
                  step === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
                  canProceed
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLastStep ? 'Generate Deck' : 'Next'}
              </button>
            </div>
            {!canProceed && step === 0 && !stage && (
              <p className="text-sm text-amber-400 mt-2">Select a funding stage to continue</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
