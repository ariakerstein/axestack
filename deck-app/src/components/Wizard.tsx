'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const QUESTIONS = [
  {
    id: 'oneLiner',
    question: 'What do you do in one sentence?',
    placeholder: 'We help [X] do [Y] by [Z]',
    hint: 'Be specific. "We help cancer patients get second opinions in 24 hours for $99"',
    type: 'text',
  },
  {
    id: 'desperatePerson',
    question: 'Who is desperate for this?',
    placeholder: 'e.g., Mike, a son coordinating his mom\'s cancer care from 500 miles away',
    hint: 'Name a specific person or title, not a category like "enterprises"',
    type: 'text',
  },
  {
    id: 'currentSolution',
    question: 'What are they doing today without you?',
    placeholder: 'How do they currently solve this problem? What\'s painful about it?',
    hint: 'This reveals if you\'re a painkiller or vitamin',
    type: 'textarea',
  },
  {
    id: 'unfairAdvantage',
    question: 'What\'s your unfair advantage?',
    placeholder: 'Domain expertise, traction, unique insight, credentials...',
    hint: 'Why will YOU win? Ex-Google? Built this before? 1000 users already?',
    type: 'text',
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
    hint: 'Format: "$500K to get 1,000 paying customers"',
    type: 'raise',
  },
]

// Validation rules - returns warning message or null if valid
const VALIDATIONS: Record<string, (value: string) => string | null> = {
  oneLiner: (value) => {
    const lower = value.toLowerCase()
    if (value.length < 20) return 'Too short. Be more specific about what you do.'
    if (!value.includes(' ')) return 'Use a full sentence.'
    if (lower.includes('platform') && !lower.includes('for')) return '"Platform" is vague. Platform for whom? To do what?'
    if (lower.includes('help') && !lower.includes('by')) return 'How do you help them? Add the mechanism.'
    if (lower.includes('ai') && value.length < 40) return '"AI" alone isn\'t a differentiator. What does your AI specifically do?'
    return null
  },
  desperatePerson: (value) => {
    const lower = value.toLowerCase()
    const vagueTerms = ['enterprises', 'companies', 'businesses', 'users', 'customers', 'people', 'everyone']
    for (const term of vagueTerms) {
      if (lower === term || lower.startsWith(term + ' ')) {
        return `"${term}" is a category, not a person. Name someone specific, like "Sarah, a CFO at a Series B startup."`
      }
    }
    if (value.length < 15) return 'Too vague. Describe a specific person with their context.'
    if (!value.includes(',') && value.length < 30) return 'Add context. Who are they? What\'s their situation?'
    return null
  },
  currentSolution: (value) => {
    const lower = value.toLowerCase()
    if (value.length < 30) return 'Too short. Describe the pain in detail.'
    if (lower.includes('nothing') && value.length < 50) return '"Nothing" is rarely true. What workaround do they use? Excel? Manual process?'
    if (!lower.includes('time') && !lower.includes('cost') && !lower.includes('pain') && !lower.includes('frustrat') && !lower.includes('hour') && !lower.includes('week') && !lower.includes('$') && !lower.includes('expensive')) {
      return 'Where\'s the pain? Add specifics: time wasted, money lost, frustration.'
    }
    return null
  },
  unfairAdvantage: (value) => {
    const lower = value.toLowerCase()
    if (value.length < 15) return 'Too short. What makes YOU the one to build this?'
    if (lower.includes('passionate') || lower.includes('love')) return '"Passionate" isn\'t an advantage. What have you built? What do you know?'
    if (lower.includes('first') && !lower.includes('mover')) return 'Being first doesn\'t matter. Why can\'t others copy you?'
    if (!lower.includes('ex-') && !lower.includes('built') && !lower.includes('led') && !lower.includes('founded') && !lower.includes('years') && !lower.includes('users') && !lower.includes('customers')) {
      return 'Add credentials: ex-Company, built X, or traction numbers.'
    }
    return null
  },
}

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [raiseAmount, setRaiseAmount] = useState('')
  const [raiseMilestone, setRaiseMilestone] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [dismissedWarning, setDismissedWarning] = useState(false)

  const currentQuestion = QUESTIONS[step]
  const isLastStep = step === QUESTIONS.length - 1
  const currentAnswer = currentQuestion.type === 'raise'
    ? (raiseAmount && raiseMilestone ? 'filled' : '')
    : answers[currentQuestion.id] || ''

  // Check for warnings when answer changes
  const checkWarning = (value: string) => {
    const validator = VALIDATIONS[currentQuestion.id]
    if (validator) {
      const result = validator(value)
      setWarning(result)
      setDismissedWarning(false)
    }
  }

  const handleNext = () => {
    // If there's a warning and user hasn't dismissed it, show it
    if (warning && !dismissedWarning) {
      return
    }

    if (currentQuestion.type === 'raise') {
      setAnswers({ ...answers, raiseAmount, raiseMilestone })
    }

    // Reset warning state for next question
    setWarning(null)
    setDismissedWarning(false)

    if (isLastStep) {
      handleGenerate()
    } else {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setWarning(null)
    setDismissedWarning(false)
    setStep(step - 1)
  }

  const handleProceedAnyway = () => {
    setDismissedWarning(true)
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

      // Store in localStorage for preview page
      localStorage.setItem('generatedDeck', JSON.stringify(data))

      router.push('/preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate deck'
      setError(message)
      setIsGenerating(false)
    }
  }

  const updateAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value })
    checkWarning(value)
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mb-8"></div>
        <h2 className="text-2xl font-semibold mb-4">Generating your deck...</h2>
        <p className="text-slate-400">This takes about 30 seconds</p>
      </div>
    )
  }

  const canProceed = currentAnswer && (!warning || dismissedWarning)

  return (
    <div className="min-h-screen flex flex-col p-8">
      {/* Back to home */}
      <div className="max-w-2xl mx-auto w-full mb-4">
        <Link href="/" className="text-teal-400 hover:underline text-sm">
          ← Back to home
        </Link>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full mb-8">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Question {step + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400 transition-all duration-300"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          {currentQuestion.question}
        </h2>
        <p className="text-slate-400 text-center mb-8">
          {currentQuestion.hint}
        </p>

        {/* Input */}
        {currentQuestion.type === 'text' && (
          <input
            type="text"
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder}
            className={`w-full bg-slate-800 border rounded-lg px-4 py-4 text-xl focus:outline-none ${
              warning && !dismissedWarning
                ? 'border-yellow-500 focus:border-yellow-400'
                : 'border-slate-700 focus:border-teal-400'
            }`}
            autoFocus
          />
        )}

        {currentQuestion.type === 'textarea' && (
          <textarea
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => updateAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder}
            rows={4}
            className={`w-full bg-slate-800 border rounded-lg px-4 py-4 text-xl focus:outline-none resize-none ${
              warning && !dismissedWarning
                ? 'border-yellow-500 focus:border-yellow-400'
                : 'border-slate-700 focus:border-teal-400'
            }`}
            autoFocus
          />
        )}

        {currentQuestion.type === 'select' && (
          <div className="w-full space-y-3">
            {currentQuestion.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => updateAnswer(option.value)}
                className={`w-full text-left px-4 py-4 rounded-lg border transition-colors ${
                  answers[currentQuestion.id] === option.value
                    ? 'border-teal-400 bg-teal-400/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'raise' && (
          <div className="w-full space-y-4">
            <input
              type="text"
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(e.target.value)}
              placeholder="Amount (e.g., $500K)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-4 text-xl focus:outline-none focus:border-teal-400"
              autoFocus
            />
            <input
              type="text"
              value={raiseMilestone}
              onChange={(e) => setRaiseMilestone(e.target.value)}
              placeholder="Milestone (e.g., 1,000 paying customers)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-4 text-xl focus:outline-none focus:border-teal-400"
            />
          </div>
        )}

        {/* Warning */}
        {warning && !dismissedWarning && (
          <div className="w-full mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400 mb-3">{warning}</p>
            <button
              onClick={handleProceedAnyway}
              className="text-sm text-slate-400 hover:text-white underline"
            >
              Proceed anyway
            </button>
          </div>
        )}

        {/* Dismissed warning indicator */}
        {warning && dismissedWarning && (
          <p className="text-sm text-yellow-500/70 mt-4">
            Warning noted. You can proceed.
          </p>
        )}

        {error && (
          <p className="text-red-400 mt-4">{error}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="max-w-2xl mx-auto w-full flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={`px-6 py-3 rounded-lg transition-colors ${
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
  )
}
