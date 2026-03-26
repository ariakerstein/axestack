'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface InvestorFeedback {
  id: string
  investorName: string
  feedback: string
  believabilityScore: number
  investorType: 'angel' | 'seed_vc' | 'series_a' | 'strategic'
  domainExpertise: 'none' | 'adjacent' | 'deep'
  checkSizeFit: 'too_small' | 'sweet_spot' | 'too_large'
  meetingStage: 'cold' | 'warm_intro' | 'partner' | 'ic'
  timestamp: number
}

interface DeckVersion {
  id: string
  html: string
  timestamp: number
  name: string
  feedback: InvestorFeedback[]
}

type Tab = 'assist' | 'edit' | 'versions' | 'feedback'
type AssistSection = 'fixes' | 'sources' | 'design'

const LAYOUTS = [
  {
    id: 'centered',
    label: 'Centered',
    preview: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1">
        <div className="w-6 h-1 bg-current rounded-sm opacity-80" />
        <div className="w-4 h-0.5 bg-current rounded-sm opacity-50" />
        <div className="w-5 h-0.5 bg-current rounded-sm opacity-50" />
      </div>
    ),
  },
  {
    id: 'two-column',
    label: '2 Column',
    preview: (
      <div className="w-full h-full flex gap-1 p-1">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="w-full h-1 bg-current rounded-sm opacity-80" />
          <div className="w-3/4 h-0.5 bg-current rounded-sm opacity-50" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="w-full h-0.5 bg-current rounded-sm opacity-50" />
          <div className="w-full h-0.5 bg-current rounded-sm opacity-50" />
          <div className="w-3/4 h-0.5 bg-current rounded-sm opacity-50" />
        </div>
      </div>
    ),
  },
  {
    id: 'stats',
    label: 'Stats',
    preview: (
      <div className="w-full h-full p-1">
        <div className="w-4 h-0.5 bg-current rounded-sm opacity-80 mx-auto mb-1" />
        <div className="grid grid-cols-3 gap-0.5">
          <div className="flex flex-col items-center gap-px">
            <div className="w-2 h-1.5 bg-current rounded-sm opacity-70" />
            <div className="w-3 h-px bg-current opacity-40" />
          </div>
          <div className="flex flex-col items-center gap-px">
            <div className="w-2 h-1.5 bg-current rounded-sm opacity-70" />
            <div className="w-3 h-px bg-current opacity-40" />
          </div>
          <div className="flex flex-col items-center gap-px">
            <div className="w-2 h-1.5 bg-current rounded-sm opacity-70" />
            <div className="w-3 h-px bg-current opacity-40" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'quote',
    label: 'Quote',
    preview: (
      <div className="w-full h-full flex flex-col items-center justify-center p-1">
        <div className="text-[6px] opacity-60 leading-none">&ldquo;</div>
        <div className="w-5 h-0.5 bg-current rounded-sm opacity-60" />
        <div className="w-4 h-0.5 bg-current rounded-sm opacity-60 mt-0.5" />
        <div className="w-3 h-px bg-current rounded-sm opacity-40 mt-1" />
      </div>
    ),
  },
  {
    id: 'comparison',
    label: 'Compare',
    preview: (
      <div className="w-full h-full flex gap-1 p-1 items-center">
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-3 h-2 border border-current rounded-sm opacity-50" />
          <div className="w-2 h-px bg-current opacity-40" />
        </div>
        <div className="text-[6px] opacity-40">vs</div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-3 h-2 bg-current rounded-sm opacity-70" />
          <div className="w-2 h-px bg-current opacity-40" />
        </div>
      </div>
    ),
  },
]

interface SourceIssue {
  slide: number
  claim: string
  suggestion: string
}

interface DeckScore {
  total: number
  breakdown: Record<string, number>
  gaps: string[]
}

interface ScoreHistory {
  score: number
  timestamp: number
}

export default function EditorPage() {
  const [html, setHtml] = useState<string>('')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [slides, setSlides] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('assist')
  const [assistSection, setAssistSection] = useState<AssistSection>('fixes')
  const [versions, setVersions] = useState<DeckVersion[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const [newVersionName, setNewVersionName] = useState('')
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')
  const [score, setScore] = useState<DeckScore | null>(null)
  const [showScore, setShowScore] = useState(true)
  const [isRescoring, setIsRescoring] = useState(false)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])
  const [scoreDelta, setScoreDelta] = useState<number | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [sourceIssues, setSourceIssues] = useState<SourceIssue[]>([])
  const [isCheckingSources, setIsCheckingSources] = useState(false)
  const [isChangingLayout, setIsChangingLayout] = useState(false)
  const [stage, setStage] = useState<string>('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    investorName: '',
    feedback: '',
    believabilityScore: 3,
    investorType: 'seed_vc' as const,
    domainExpertise: 'adjacent' as const,
    checkSizeFit: 'sweet_spot' as const,
    meetingStage: 'warm_intro' as const,
  })

  // Load initial deck, score, stage, and versions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('generatedDeck')
    if (stored) {
      const data = JSON.parse(stored)
      setHtml(data.html)
      // Load stage for stage-aware re-scoring
      if (data.stage) {
        setStage(data.stage)
      }
      if (data.score !== undefined) {
        const initialScore = {
          total: data.score,
          breakdown: data.scoreBreakdown || {},
          gaps: data.gaps || []
        }
        setScore(initialScore)
        // Initialize score history with first score
        const storedHistory = localStorage.getItem('scoreHistory')
        if (storedHistory) {
          setScoreHistory(JSON.parse(storedHistory))
        } else {
          const initial: ScoreHistory[] = [{ score: data.score, timestamp: Date.now() }]
          setScoreHistory(initial)
          localStorage.setItem('scoreHistory', JSON.stringify(initial))
        }
      }
    }
    const storedVersions = localStorage.getItem('deckVersions')
    if (storedVersions) {
      setVersions(JSON.parse(storedVersions))
    }
  }, [])

  // Re-score the current deck with stage-aware scoring
  const handleRescore = async () => {
    setIsRescoring(true)
    setScoreDelta(null)
    const previousScore = score?.total || 0

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html, stage }),
      })
      if (response.ok) {
        const data = await response.json()
        const newScore = data.score
        const delta = newScore - previousScore

        setScore({
          total: newScore,
          breakdown: data.breakdown || {},
          gaps: data.gaps || []
        })

        // Track delta
        setScoreDelta(delta)

        // Add to history
        const newHistory = [...scoreHistory, { score: newScore, timestamp: Date.now() }]
        setScoreHistory(newHistory)
        localStorage.setItem('scoreHistory', JSON.stringify(newHistory))

        // Celebrate improvements!
        if (delta > 0) {
          setShowCelebration(true)
          setTimeout(() => setShowCelebration(false), 2000)
        }
      }
    } catch (e) {
      console.error('Failed to rescore:', e)
    } finally {
      setIsRescoring(false)
    }
  }

  // Change slide layout
  const handleChangeLayout = async (layoutId: string) => {
    setIsChangingLayout(true)
    const layoutPrompts: Record<string, string> = {
      'centered': 'Reformat this slide with centered layout - headline centered, content centered below',
      'two-column': 'Reformat this slide as a 2-column layout - key point on left, supporting details on right',
      'stats': 'Reformat this slide as a stats grid - show 3-4 key metrics in a grid with large numbers',
      'quote': 'Reformat this slide as a quote layout - large quote in the center with attribution',
      'comparison': 'Reformat this slide as a comparison table - us vs competitors or before vs after',
    }

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          prompt: `For slide ${currentSlide + 1} only: ${layoutPrompts[layoutId]}. Keep all other slides unchanged.`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setHtml(data.html)
        // Preserve score when saving
        const stored = localStorage.getItem('generatedDeck')
        const existingData = stored ? JSON.parse(stored) : {}
        localStorage.setItem('generatedDeck', JSON.stringify({ ...existingData, html: data.html }))
        setChatHistory(prev => [...prev, { role: 'assistant', content: `✓ Changed to ${layoutId} layout` }])
      }
    } catch (e) {
      console.error('Failed to change layout:', e)
    } finally {
      setIsChangingLayout(false)
    }
  }

  // Check sources in deck
  const handleCheckSources = async () => {
    setIsCheckingSources(true)
    setSourceIssues([])

    try {
      const response = await fetch('/api/check-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })

      if (response.ok) {
        const data = await response.json()
        setSourceIssues(data.issues || [])
      }
    } catch (e) {
      console.error('Failed to check sources:', e)
    } finally {
      setIsCheckingSources(false)
    }
  }

  // Save versions to localStorage
  useEffect(() => {
    if (versions.length > 0) {
      localStorage.setItem('deckVersions', JSON.stringify(versions))
    }
  }, [versions])

  // Parse slides from HTML
  useEffect(() => {
    if (!html) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const sections = doc.querySelectorAll('section')
    if (sections.length > 0) {
      setSlides(Array.from(sections).map(s => s.outerHTML))
    } else {
      setSlides([html])
    }
  }, [html])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    const userMessage = prompt.trim()
    setPrompt('')
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, prompt: userMessage }),
      })

      if (!response.ok) throw new Error('Failed to edit deck')

      const data = await response.json()
      setHtml(data.html)
      setChatHistory(prev => [...prev, { role: 'assistant', content: '✓ Updated deck' }])
      // Preserve score when saving
      const stored = localStorage.getItem('generatedDeck')
      const existingData = stored ? JSON.parse(stored) : {}
      localStorage.setItem('generatedDeck', JSON.stringify({ ...existingData, html: data.html }))
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '✗ Error updating deck. Try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-deck-${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintPDF = () => {
    // Open full deck in new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  const saveVersion = () => {
    const name = newVersionName.trim() || `Version ${versions.length + 1}`
    const newVersion: DeckVersion = {
      id: Date.now().toString(),
      html,
      timestamp: Date.now(),
      name,
      feedback: [],
    }
    setVersions(prev => [newVersion, ...prev])
    setCurrentVersionId(newVersion.id)
    setNewVersionName('')
  }

  const restoreVersion = (version: DeckVersion) => {
    setHtml(version.html)
    setCurrentVersionId(version.id)
    // Preserve score when restoring
    const stored = localStorage.getItem('generatedDeck')
    const existingData = stored ? JSON.parse(stored) : {}
    localStorage.setItem('generatedDeck', JSON.stringify({ ...existingData, html: version.html }))
    setActiveTab('edit')
  }

  const addFeedback = () => {
    if (!currentVersionId || !feedbackForm.investorName || !feedbackForm.feedback) return

    const newFeedback: InvestorFeedback = {
      id: Date.now().toString(),
      ...feedbackForm,
      timestamp: Date.now(),
    }

    setVersions(prev => prev.map(v =>
      v.id === currentVersionId
        ? { ...v, feedback: [...v.feedback, newFeedback] }
        : v
    ))

    setFeedbackForm({
      investorName: '',
      feedback: '',
      believabilityScore: 3,
      investorType: 'seed_vc',
      domainExpertise: 'adjacent',
      checkSizeFit: 'sweet_spot',
      meetingStage: 'warm_intro',
    })
  }

  const currentVersion = versions.find(v => v.id === currentVersionId)
  const totalSlides = slides.length || 10

  // Calculate weighted feedback score
  const getWeightedScore = (feedback: InvestorFeedback[]) => {
    if (feedback.length === 0) return null
    const weights = feedback.map(f => {
      let weight = f.believabilityScore
      if (f.domainExpertise === 'deep') weight *= 1.5
      if (f.domainExpertise === 'adjacent') weight *= 1.2
      if (f.meetingStage === 'ic') weight *= 1.5
      if (f.meetingStage === 'partner') weight *= 1.3
      return weight
    })
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    return (totalWeight / feedback.length).toFixed(1)
  }

  if (!html) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-semibold mb-4">No deck found</h2>
        <p className="text-slate-400 mb-8">Create a deck first to edit it.</p>
        <Link href="/create" className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg">
          Create Deck
        </Link>
      </div>
    )
  }

  const themeStyles = previewTheme === 'light' ? `
    body { margin: 0; background: #f8fafc !important; }
    section { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc !important; }
    /* Force light theme colors for ADA compliance */
    h1, h2, h3, h4, h5, h6 { color: #0f172a !important; }
    p, li, span, div { color: #334155 !important; }
    .text-white, .text-slate-100, .text-slate-200, .text-slate-300 { color: #334155 !important; }
    .text-teal-400, .text-teal-300 { color: #0d9488 !important; }
    .bg-slate-900, .bg-slate-800, .bg-gray-900, .bg-gray-800 { background: #f8fafc !important; }
    table { border-color: #e2e8f0 !important; }
    th, td { border-color: #e2e8f0 !important; color: #334155 !important; }
  ` : `
    body { margin: 0; background: #0f172a !important; }
    section { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a !important; }
    /* Force dark theme colors for ADA compliance */
    h1, h2, h3, h4, h5, h6 { color: #f8fafc !important; }
    p, li, span, div { color: #e2e8f0 !important; }
    .text-gray-700, .text-gray-600, .text-slate-700, .text-slate-600 { color: #e2e8f0 !important; }
    .text-gray-900, .text-slate-900 { color: #f8fafc !important; }
    .bg-white, .bg-gray-50, .bg-slate-50 { background: #0f172a !important; }
  `

  const slideHtml = slides[currentSlide] ? `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>${themeStyles}</style>
    </head>
    <body>${slides[currentSlide]}</body>
    </html>
  ` : html

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-teal-400 hover:underline text-sm">← Home</Link>
          <h1 className="text-lg font-semibold">Prompt Deck</h1>
          {currentVersion && (
            <span className="text-sm text-slate-400">· {currentVersion.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintPDF}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Export PDF
          </button>
          <button
            onClick={handleDownload}
            className="border border-slate-600 hover:border-slate-500 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium"
          >
            HTML
          </button>
          <Link href="/create" className="text-slate-400 hover:text-white text-sm">
            Start Over
          </Link>
        </div>
      </header>

      {/* Compact Score Banner */}
      {score && (
        <div className="bg-slate-800 border-b border-slate-700 py-2 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <button
              onClick={() => { setActiveTab('assist'); setAssistSection('fixes'); }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <span className={`text-2xl font-bold ${score.total >= 20 ? 'text-green-400' : score.total >= 15 ? 'text-yellow-400' : 'text-orange-400'} ${showCelebration ? 'animate-bounce' : ''}`}>
                {score.total}<span className="text-sm text-slate-500">/30</span>
              </span>
              {scoreDelta !== null && scoreDelta !== 0 && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${scoreDelta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {scoreDelta > 0 ? '↑' : '↓'}{Math.abs(scoreDelta)}
                </span>
              )}
              {showCelebration && <span className="text-lg">🎉</span>}
              {(score.gaps?.length ?? 0) > 0 && (
                <span className="text-xs text-orange-400">{score.gaps.length} fixes</span>
              )}
            </button>
            <button
              onClick={handleRescore}
              disabled={isRescoring}
              className="text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 px-3 py-1.5 rounded transition-colors"
            >
              {isRescoring ? '...' : 'Re-score'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left: Slide Preview */}
        <div className={`flex-1 md:w-3/5 flex flex-col ${previewTheme === 'light' ? 'bg-slate-100' : 'bg-slate-900'}`}>
          <div className="flex-1 relative">
            <iframe srcDoc={slideHtml} className="w-full h-full border-0" title="Slide Preview" />
          </div>

          {/* Slide Navigation */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="px-3 py-1 rounded text-sm disabled:text-slate-600 text-slate-300 hover:text-white"
              >
                ◀ Prev
              </button>
              <span className="text-slate-400 text-sm">{currentSlide + 1} / {totalSlides}</span>
              <button
                onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
                disabled={currentSlide === totalSlides - 1}
                className="px-3 py-1 rounded text-sm disabled:text-slate-600 text-slate-300 hover:text-white"
              >
                Next ▶
              </button>
            </div>
            {/* Slide Picker */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                    i === currentSlide
                      ? 'bg-teal-500 text-white ring-2 ring-teal-400 ring-offset-1 ring-offset-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Right: Sidebar with Tabs */}
        <div className="md:w-2/5 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {(['assist', 'edit', 'versions', 'feedback'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'text-teal-400 border-b-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'assist' ? 'AI Assist' : tab}
                {tab === 'assist' && (sourceIssues.length > 0 || (score?.gaps?.length ?? 0) > 0) && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">
                    {sourceIssues.length + (score?.gaps?.length ?? 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Edit Tab */}
            {activeTab === 'edit' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {chatHistory.length === 0 && (
                    <div className="text-slate-500 text-sm">
                      <p className="mb-2">Try prompts like:</p>
                      <ul className="space-y-1 text-slate-400">
                        <li>• "Make the problem slide more urgent"</li>
                        <li>• "Add competitor pricing comparison"</li>
                        <li>• "Strengthen the team credentials"</li>
                      </ul>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`text-sm ${
                        msg.role === 'user' ? 'text-slate-300' : msg.content.startsWith('✓') ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {msg.role === 'user' && <span className="text-slate-500">You: </span>}
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Updating deck...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="What would you like to change?"
                      disabled={isLoading}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="submit"
                      disabled={!prompt.trim() || isLoading}
                      className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 text-white px-4 py-3 rounded-lg text-sm font-medium"
                    >
                      →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* AI Assist Tab */}
            {activeTab === 'assist' && (
              <div className="flex flex-col h-full">
                {/* Section Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                  {(['fixes', 'sources', 'design'] as AssistSection[]).map(section => (
                    <button
                      key={section}
                      onClick={() => setAssistSection(section)}
                      className={`flex-1 px-3 py-2 text-xs font-medium capitalize ${
                        assistSection === section
                          ? 'text-teal-400 bg-slate-700/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {section}
                      {section === 'fixes' && (score?.gaps?.length ?? 0) > 0 && (
                        <span className="ml-1 bg-orange-500/80 text-white text-[10px] px-1 rounded-full">
                          {score?.gaps?.length}
                        </span>
                      )}
                      {section === 'sources' && sourceIssues.length > 0 && (
                        <span className="ml-1 bg-orange-500/80 text-white text-[10px] px-1 rounded-full">
                          {sourceIssues.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Section Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Fixes Section */}
                  {assistSection === 'fixes' && (
                    <div>
                      {/* Score Summary */}
                      {score && (
                        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Score</span>
                            <span className={`text-2xl font-bold ${score.total >= 20 ? 'text-green-400' : score.total >= 15 ? 'text-yellow-400' : 'text-orange-400'}`}>
                              {score.total}/30
                            </span>
                          </div>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${score.total >= 20 ? 'bg-green-400' : score.total >= 15 ? 'bg-yellow-400' : 'bg-orange-400'}`}
                              style={{ width: `${(score.total / 30) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Fixes</h3>
                      {(!score?.gaps || score.gaps.length === 0) ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <p className="mb-2">No fixes identified yet.</p>
                          <button
                            onClick={handleRescore}
                            disabled={isRescoring}
                            className="text-teal-400 hover:underline"
                          >
                            {isRescoring ? 'Scoring...' : 'Run audit →'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {score.gaps.map((gap, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setPrompt(gap)
                                setActiveTab('edit')
                              }}
                              className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors group"
                            >
                              <span className="text-orange-400 mr-2">•</span>
                              {gap}
                              <span className="text-teal-400 opacity-0 group-hover:opacity-100 ml-2 text-xs">
                                Fix →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sources Section */}
                  {assistSection === 'sources' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-slate-300">Source Checker</h3>
                        <button
                          onClick={handleCheckSources}
                          disabled={isCheckingSources}
                          className="text-xs bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 px-3 py-1.5 rounded-lg"
                        >
                          {isCheckingSources ? 'Checking...' : 'Check'}
                        </button>
                      </div>

                      {sourceIssues.length === 0 && !isCheckingSources && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <p>Scan your deck for claims that need citations.</p>
                        </div>
                      )}

                      {sourceIssues.length > 0 && (
                        <div className="space-y-3">
                          {sourceIssues.map((issue, i) => (
                            <div key={i} className="bg-slate-700/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                                  Slide {issue.slide}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300 mb-2">&quot;{issue.claim}&quot;</p>
                              <p className="text-xs text-teal-400 mb-2">💡 {issue.suggestion}</p>
                              <button
                                onClick={() => {
                                  setPrompt(`Add a citation for: "${issue.claim}" - use source: ${issue.suggestion}`)
                                  setActiveTab('edit')
                                }}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Fix this →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Design Section */}
                  {assistSection === 'design' && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3">
                        Slide {currentSlide + 1} Layout
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {LAYOUTS.map(layout => (
                          <button
                            key={layout.id}
                            onClick={() => handleChangeLayout(layout.id)}
                            disabled={isChangingLayout}
                            className="group flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50"
                          >
                            <div className="w-full h-12 bg-slate-800 rounded border border-slate-600 group-hover:border-teal-400 transition-all text-slate-400 group-hover:text-teal-400 overflow-hidden">
                              {layout.preview}
                            </div>
                            <span className="text-xs text-slate-400 group-hover:text-slate-300">
                              {layout.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      {isChangingLayout && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-teal-400">Applying layout...</span>
                        </div>
                      )}

                      <div className="mt-6 pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">Theme</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewTheme('light')}
                            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                              previewTheme === 'light'
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            ☀️ Light
                          </button>
                          <button
                            onClick={() => setPreviewTheme('dark')}
                            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                              previewTheme === 'dark'
                                ? 'bg-slate-900 text-white border border-slate-600'
                                : 'bg-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            🌙 Dark
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div className="p-4">
                {/* Save New Version */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Save Current Version</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      placeholder="Version name (optional)"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                    />
                    <button
                      onClick={saveVersion}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Version History */}
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Version History</h3>
                {versions.length === 0 ? (
                  <p className="text-slate-500 text-sm">No versions saved yet</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map(v => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border ${
                          v.id === currentVersionId
                            ? 'border-teal-400 bg-teal-400/10'
                            : 'border-slate-600 bg-slate-700/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{v.name}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(v.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{v.feedback.length} feedback</span>
                          {v.feedback.length > 0 && (
                            <span>· Weighted: {getWeightedScore(v.feedback)}</span>
                          )}
                        </div>
                        {v.id !== currentVersionId && (
                          <button
                            onClick={() => restoreVersion(v)}
                            className="mt-2 text-xs text-teal-400 hover:underline"
                          >
                            Restore this version
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Deck Strength Trend */}
                {versions.length > 1 && (
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Deck Strength Trend</h3>
                    <div className="flex items-end gap-1 h-16">
                      {versions.slice().reverse().map((v, i) => {
                        const score = getWeightedScore(v.feedback)
                        const height = score ? (parseFloat(score) / 5) * 100 : 10
                        return (
                          <div
                            key={v.id}
                            className="flex-1 bg-teal-500/50 rounded-t"
                            style={{ height: `${height}%` }}
                            title={`${v.name}: ${score || 'No feedback'}`}
                          />
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Weighted feedback score over time</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="p-4">
                {!currentVersionId ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-4">Save a version first to add feedback</p>
                    <button
                      onClick={() => setActiveTab('versions')}
                      className="text-teal-400 text-sm hover:underline"
                    >
                      Go to Versions →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Add Feedback Form */}
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Investor Feedback</h3>
                    <div className="space-y-3 mb-6">
                      <input
                        type="text"
                        value={feedbackForm.investorName}
                        onChange={(e) => setFeedbackForm(f => ({ ...f, investorName: e.target.value }))}
                        placeholder="Investor name"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                      />
                      <textarea
                        value={feedbackForm.feedback}
                        onChange={(e) => setFeedbackForm(f => ({ ...f, feedback: e.target.value }))}
                        placeholder="What did they say?"
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none"
                      />

                      {/* Believability Score */}
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Believability Score: {feedbackForm.believabilityScore}/5
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={feedbackForm.believabilityScore}
                          onChange={(e) => setFeedbackForm(f => ({ ...f, believabilityScore: parseInt(e.target.value) }))}
                          className="w-full"
                        />
                      </div>

                      {/* Structured Tags */}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={feedbackForm.investorType}
                          onChange={(e) => setFeedbackForm(f => ({ ...f, investorType: e.target.value as typeof feedbackForm.investorType }))}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="angel">Angel</option>
                          <option value="seed_vc">Seed VC</option>
                          <option value="series_a">Series A+</option>
                          <option value="strategic">Strategic</option>
                        </select>
                        <select
                          value={feedbackForm.domainExpertise}
                          onChange={(e) => setFeedbackForm(f => ({ ...f, domainExpertise: e.target.value as typeof feedbackForm.domainExpertise }))}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="none">No domain exp</option>
                          <option value="adjacent">Adjacent</option>
                          <option value="deep">Deep expertise</option>
                        </select>
                        <select
                          value={feedbackForm.checkSizeFit}
                          onChange={(e) => setFeedbackForm(f => ({ ...f, checkSizeFit: e.target.value as typeof feedbackForm.checkSizeFit }))}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="too_small">Check too small</option>
                          <option value="sweet_spot">Sweet spot</option>
                          <option value="too_large">Check too large</option>
                        </select>
                        <select
                          value={feedbackForm.meetingStage}
                          onChange={(e) => setFeedbackForm(f => ({ ...f, meetingStage: e.target.value as typeof feedbackForm.meetingStage }))}
                          className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-teal-400"
                        >
                          <option value="cold">Cold outreach</option>
                          <option value="warm_intro">Warm intro</option>
                          <option value="partner">Partner meeting</option>
                          <option value="ic">IC / Decision</option>
                        </select>
                      </div>

                      <button
                        onClick={addFeedback}
                        disabled={!feedbackForm.investorName || !feedbackForm.feedback}
                        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium"
                      >
                        Add Feedback
                      </button>
                    </div>

                    {/* Existing Feedback */}
                    {currentVersion && currentVersion.feedback.length > 0 && (
                      <>
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">
                          Feedback for {currentVersion.name}
                        </h3>
                        <div className="space-y-3">
                          {currentVersion.feedback.map(f => (
                            <div key={f.id} className="p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm">{f.investorName}</span>
                                <span className="text-xs text-teal-400">{f.believabilityScore}/5</span>
                              </div>
                              <p className="text-sm text-slate-300 mb-2">{f.feedback}</p>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.investorType.replace('_', ' ')}
                                </span>
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.domainExpertise} exp
                                </span>
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.meetingStage.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
