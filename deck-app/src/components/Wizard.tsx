'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const QUESTIONS = [
  {
    id: 'oneLiner',
    question: 'What do you do in one sentence?',
    placeholder: 'We help [X] do [Y] by [Z]',
    hint: 'Be specific. "We help cancer patients get second opinions in 24 hours for $99"',
    slideIndex: 0,
  },
  {
    id: 'desperatePerson',
    question: 'Who is desperate for this?',
    placeholder: 'e.g., Mike, a son coordinating his mom\'s cancer care from 500 miles away',
    hint: 'Name a specific person, not a category like "enterprises"',
    slideIndex: 1,
  },
  {
    id: 'currentSolution',
    question: 'What are they doing today without you?',
    placeholder: 'How do they currently solve this problem? What\'s painful about it?',
    hint: 'This reveals if you\'re a painkiller or vitamin',
    slideIndex: 1,
  },
  {
    id: 'unfairAdvantage',
    question: 'What\'s your unfair advantage?',
    placeholder: 'Domain expertise, traction, unique insight, credentials...',
    hint: 'Why will YOU win? Ex-Google? Built this before? 1000 users already?',
    slideIndex: 8,
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
    slideIndex: 5,
  },
  {
    id: 'raise',
    question: 'How much are you raising, and what milestone does it unlock?',
    placeholder: '',
    hint: 'Format: "$500K to get 1,000 paying customers"',
    type: 'raise',
    slideIndex: 9,
  },
]

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  per_transaction: 'Per transaction',
  subscription: 'Subscription',
  marketplace: 'Marketplace',
  enterprise: 'Enterprise sales',
}

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [raiseAmount, setRaiseAmount] = useState('')
  const [raiseMilestone, setRaiseMilestone] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [currentSlide, setCurrentSlide] = useState(0)

  const currentQuestion = QUESTIONS[step]
  const isLastStep = step === QUESTIONS.length - 1
  const currentAnswer = currentQuestion.type === 'raise'
    ? (raiseAmount && raiseMilestone ? 'filled' : '')
    : answers[currentQuestion.id] || ''

  // Generate live preview HTML based on current answers
  const previewHtml = useMemo(() => {
    const companyName = answers.oneLiner?.split(' ')[0] || 'Your Company'
    const oneLiner = answers.oneLiner || 'We help [customers] do [outcome] by [method]'
    const desperatePerson = answers.desperatePerson || '[Your ideal customer]'
    const currentSolution = answers.currentSolution || '[Current painful solution]'
    const unfairAdvantage = answers.unfairAdvantage || '[Your unique advantage]'
    const businessModel = answers.businessModel ? BUSINESS_MODEL_LABELS[answers.businessModel] : '[Revenue model]'
    const raise = raiseAmount || '$XXX'
    const milestone = raiseMilestone || '[Key milestone]'

    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
    section { scroll-snap-align: start; min-height: 100vh; position: relative; }
    body { margin: 0; background: #f8fafc; }
    .slide-label { position: absolute; top: 24px; left: 24px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; }
    .slide-number { position: absolute; bottom: 24px; right: 24px; font-size: 14px; color: #94a3b8; }
  </style>
</head>
<body class="text-gray-900">
  <!-- Slide 0: Title -->
  <section id="slide-0" class="flex flex-col items-center justify-center p-12 bg-white">
    <span class="slide-label">Title</span>
    <h1 class="text-5xl font-bold text-gray-900 mb-6 text-center">${companyName}</h1>
    <p class="text-2xl text-gray-600 text-center max-w-2xl">${answers.oneLiner ? oneLiner : '<span class="text-gray-400 italic">Your one-liner will appear here</span>'}</p>
    <span class="slide-number">1</span>
  </section>

  <!-- Slide 1: Problem -->
  <section id="slide-1" class="flex flex-col items-center justify-center p-12 bg-gray-50">
    <span class="slide-label">Problem</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">The Problem</h2>
    <div class="max-w-2xl space-y-6 text-center">
      ${answers.desperatePerson ? `<p class="text-2xl text-gray-700">${desperatePerson}</p>` : '<p class="text-xl text-gray-400 italic">Who is desperate for this solution?</p>'}
      ${answers.currentSolution ? `<p class="text-xl text-gray-600 mt-4">${currentSolution}</p>` : '<p class="text-lg text-gray-400 italic mt-4">What painful workaround do they use today?</p>'}
    </div>
    <span class="slide-number">2</span>
  </section>

  <!-- Slide 2: Why Now -->
  <section id="slide-2" class="flex flex-col items-center justify-center p-12 bg-white">
    <span class="slide-label">Why Now</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">Why Now</h2>
    <p class="text-xl text-gray-400 italic text-center max-w-2xl">AI will generate market timing insights based on your answers</p>
    <span class="slide-number">3</span>
  </section>

  <!-- Slide 3: Solution -->
  <section id="slide-3" class="flex flex-col items-center justify-center p-12 bg-gray-50">
    <span class="slide-label">Solution</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">The Solution</h2>
    ${answers.oneLiner ? `<p class="text-2xl text-gray-700 text-center max-w-2xl">${oneLiner}</p>` : '<p class="text-xl text-gray-400 italic text-center max-w-2xl">Your solution statement will appear here</p>'}
    <span class="slide-number">4</span>
  </section>

  <!-- Slide 4: How It Works -->
  <section id="slide-4" class="flex flex-col items-center justify-center p-12 bg-white">
    <span class="slide-label">How It Works</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">How It Works</h2>
    <p class="text-xl text-gray-400 italic text-center">AI will generate a 3-step process from your description</p>
    <span class="slide-number">5</span>
  </section>

  <!-- Slide 5: Business Model -->
  <section id="slide-5" class="flex flex-col items-center justify-center p-12 bg-gray-50">
    <span class="slide-label">Business Model</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">Business Model</h2>
    ${answers.businessModel ? `<p class="text-3xl text-teal-600 font-semibold">${businessModel}</p>` : '<p class="text-xl text-gray-400 italic">Select your revenue model</p>'}
    <span class="slide-number">6</span>
  </section>

  <!-- Slide 6: Traction -->
  <section id="slide-6" class="flex flex-col items-center justify-center p-12 bg-white">
    <span class="slide-label">Traction</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">Traction</h2>
    <p class="text-xl text-gray-400 italic text-center">AI will prompt you for metrics in the editor</p>
    <span class="slide-number">7</span>
  </section>

  <!-- Slide 7: Competition -->
  <section id="slide-7" class="flex flex-col items-center justify-center p-12 bg-gray-50">
    <span class="slide-label">Competition</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">Competition</h2>
    <p class="text-xl text-gray-400 italic text-center">AI will generate a comparison based on your space</p>
    <span class="slide-number">8</span>
  </section>

  <!-- Slide 8: Team -->
  <section id="slide-8" class="flex flex-col items-center justify-center p-12 bg-white">
    <span class="slide-label">Team</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">Why Us</h2>
    ${answers.unfairAdvantage ? `<p class="text-2xl text-gray-700 text-center max-w-2xl">${unfairAdvantage}</p>` : '<p class="text-xl text-gray-400 italic text-center max-w-2xl">Your unfair advantage will appear here</p>'}
    <span class="slide-number">9</span>
  </section>

  <!-- Slide 9: The Ask -->
  <section id="slide-9" class="flex flex-col items-center justify-center p-12 bg-gray-50">
    <span class="slide-label">The Ask</span>
    <h2 class="text-4xl font-bold text-gray-900 mb-8">The Ask</h2>
    ${raiseAmount ? `<p class="text-3xl text-teal-600 font-semibold mb-4">Raising ${raise}</p>` : '<p class="text-xl text-gray-400 italic mb-4">How much are you raising?</p>'}
    ${raiseMilestone ? `<p class="text-2xl text-gray-600">To achieve: ${milestone}</p>` : '<p class="text-lg text-gray-400 italic">What milestone does it unlock?</p>'}
    <span class="slide-number">10</span>
  </section>
</body>
</html>`
  }, [answers, raiseAmount, raiseMilestone])

  // Single slide HTML for preview - extract slide using regex (SSR-safe)
  const slideHtml = useMemo(() => {
    // Use regex to extract the specific slide section (avoids DOMParser SSR issues)
    const slideRegex = new RegExp(`<section id="slide-${currentSlide}"[^>]*>([\\s\\S]*?)</section>`)
    const match = previewHtml.match(slideRegex)

    if (!match) return previewHtml

    const slideContent = match[0]

    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; } section { min-height: 100vh; display: flex; }</style>
</head>
<body>${slideContent}</body>
</html>`
  }, [previewHtml, currentSlide])

  const handleNext = () => {
    if (currentQuestion.type === 'raise') {
      setAnswers({ ...answers, raiseAmount, raiseMilestone })
    }

    if (isLastStep) {
      handleGenerate()
    } else {
      setStep(step + 1)
      // Jump to relevant slide
      const nextQuestion = QUESTIONS[step + 1]
      if (nextQuestion) {
        setCurrentSlide(nextQuestion.slideIndex)
      }
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    const prevQuestion = QUESTIONS[step - 1]
    if (prevQuestion) {
      setCurrentSlide(prevQuestion.slideIndex)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')

    const finalAnswers = {
      ...answers,
      raiseAmount,
      raiseMilestone,
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate deck')
      }

      const data = await response.json()
      localStorage.setItem('generatedDeck', JSON.stringify(data))
      router.push('/editor')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate deck'
      setError(message)
      setIsGenerating(false)
    }
  }

  const updateAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value })
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mb-8"></div>
        <h2 className="text-2xl font-semibold mb-4">Generating your deck...</h2>
        <p className="text-slate-400">Polishing with AI. About 30 seconds.</p>
      </div>
    )
  }

  const canProceed = !!currentAnswer

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-teal-400 hover:underline text-sm">← Home</Link>
          <h1 className="text-lg font-semibold">Create Your Deck</h1>
        </div>
        <div className="text-sm text-slate-400">
          Question {step + 1} of {QUESTIONS.length}
        </div>
      </header>

      {/* Main: Split View */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left: Live Preview */}
        <div className="flex-1 md:w-3/5 flex flex-col bg-slate-100">
          <div className="flex-1 relative">
            <iframe srcDoc={slideHtml} className="w-full h-full border-0" title="Deck Preview" />
          </div>

          {/* Slide Navigation */}
          <div className="bg-slate-200 border-t border-slate-300 px-6 py-3">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="px-3 py-1 rounded text-sm disabled:text-slate-400 text-slate-600 hover:text-slate-900"
              >
                ◀ Prev
              </button>
              <span className="text-slate-600 text-sm">{currentSlide + 1} / 10</span>
              <button
                onClick={() => setCurrentSlide(Math.min(9, currentSlide + 1))}
                disabled={currentSlide === 9}
                className="px-3 py-1 rounded text-sm disabled:text-slate-400 text-slate-600 hover:text-slate-900"
              >
                Next ▶
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentSlide ? 'bg-teal-500' : 'bg-slate-400 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Questions */}
        <div className="md:w-2/5 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Progress */}
          <div className="px-6 pt-6">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400 transition-all duration-300"
                style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 p-6 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">{currentQuestion.question}</h2>
            <p className="text-slate-400 text-sm mb-6">{currentQuestion.hint}</p>

            {/* Input */}
            {!currentQuestion.type && (
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => updateAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-teal-400"
                autoFocus
              />
            )}

            {currentQuestion.type === 'select' && (
              <div className="space-y-2">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateAnswer(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      answers[currentQuestion.id] === option.value
                        ? 'border-teal-400 bg-teal-400/10'
                        : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'raise' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  placeholder="Amount (e.g., $500K)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-teal-400"
                  autoFocus
                />
                <input
                  type="text"
                  value={raiseMilestone}
                  onChange={(e) => setRaiseMilestone(e.target.value)}
                  placeholder="Milestone (e.g., 1,000 paying customers)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-teal-400"
                />
              </div>
            )}

            {error && <p className="text-red-400 mt-4">{error}</p>}

            {/* Navigation */}
            <div className="mt-auto pt-6 flex justify-between">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  step === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  canProceed
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLastStep ? 'Generate Deck' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
