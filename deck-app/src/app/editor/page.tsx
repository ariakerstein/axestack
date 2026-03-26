'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  saveNewDeck,
  updateDeck,
  getDecks,
  addFeedback as addFeedbackToDb,
  getFeedbackForDeck,
  type PitchDeck,
  type PitchFeedback,
  getSessionId
} from '@/lib/supabase'
import { COLOR_SCHEMES, schemeToStyles, type ColorScheme } from '@/lib/themes'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}


type Tab = 'design' | 'edit' | 'versions' | 'feedback'

interface UploadedMedia {
  name: string
  url: string
  createdAt: string
}

const LAYOUTS = [
  { id: 'centered', label: 'Center', icon: '▣' },
  { id: 'two-column', label: '2-Col', icon: '▥' },
  { id: 'stats', label: 'Stats', icon: '▦' },
  { id: 'quote', label: 'Quote', icon: '❝' },
  { id: 'comparison', label: 'vs', icon: '⚖' },
]

interface SourceIssue {
  slide: number
  claim: string
  suggestion: string
}

interface SlideScore {
  slide: number
  score: number
  status: 'green' | 'yellow' | 'red'
  issue: string | null
}

interface DeckScore {
  total: number
  breakdown: Record<string, number>
  gaps: string[]
  slideScores?: SlideScore[]
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
  const [activeTab, setActiveTab] = useState<Tab>('design')
  const [newVersionName, setNewVersionName] = useState('')
  const [colorScheme, setColorScheme] = useState<ColorScheme>(COLOR_SCHEMES[0])
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [isUploading, setIsUploading] = useState(false)
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
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null)
  const [savedDecks, setSavedDecks] = useState<PitchDeck[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [dbFeedback, setDbFeedback] = useState<PitchFeedback[]>([])
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
    // Load saved decks from Supabase
    const loadSavedDecks = async () => {
      const decks = await getDecks()
      setSavedDecks(decks)
    }
    loadSavedDecks()
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
          gaps: data.topFixes || data.gaps || [],
          slideScores: data.slideScores || []
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

  const saveVersion = async () => {
    setIsSaving(true)
    const name = newVersionName.trim() || `Version ${savedDecks.length + 1}`

    try {
      if (currentDeckId) {
        // Update existing deck
        const updated = await updateDeck(currentDeckId, {
          name,
          html,
          score: score?.total,
          scoreBreakdown: score?.breakdown,
          slideScores: score?.slideScores,
        })
        if (updated) {
          setSavedDecks(prev => prev.map(d => d.id === updated.id ? updated : d))
        }
      } else {
        // Save new deck
        const stored = localStorage.getItem('generatedDeck')
        const wizardAnswers = stored ? JSON.parse(stored).answers : null

        const saved = await saveNewDeck({
          name,
          html,
          stage: stage || undefined,
          score: score?.total,
          scoreBreakdown: score?.breakdown,
          slideScores: score?.slideScores,
          wizardAnswers,
        })
        if (saved) {
          setCurrentDeckId(saved.id)
          setSavedDecks(prev => [saved, ...prev])
        }
      }
      setNewVersionName('')
    } catch (e) {
      console.error('Failed to save:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const restoreVersion = (deck: PitchDeck) => {
    setHtml(deck.html)
    setCurrentDeckId(deck.id)
    setStage(deck.stage || '')
    if (deck.score) {
      setScore({
        total: deck.score,
        breakdown: deck.score_breakdown || {},
        gaps: [],
        slideScores: (deck.slide_scores || []) as SlideScore[],
      })
    }
    // Also update localStorage for consistency
    localStorage.setItem('generatedDeck', JSON.stringify({
      html: deck.html,
      stage: deck.stage,
      score: deck.score,
    }))
    // Load feedback for this deck
    loadFeedback(deck.id)
    setActiveTab('edit')
  }

  const loadFeedback = async (deckId: string) => {
    const feedback = await getFeedbackForDeck(deckId)
    setDbFeedback(feedback)
  }

  const addFeedback = async () => {
    if (!currentDeckId || !feedbackForm.investorName || !feedbackForm.feedback) return

    const saved = await addFeedbackToDb(currentDeckId, {
      investorName: feedbackForm.investorName,
      feedback: feedbackForm.feedback,
      believabilityScore: feedbackForm.believabilityScore,
      investorType: feedbackForm.investorType,
      domainExpertise: feedbackForm.domainExpertise,
      checkSizeFit: feedbackForm.checkSizeFit,
      meetingStage: feedbackForm.meetingStage,
    })

    if (saved) {
      setDbFeedback(prev => [saved, ...prev])
    }

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

  const currentDeck = savedDecks.find(d => d.id === currentDeckId)
  const totalSlides = slides.length || 10

  // Upload media file
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', getSessionId())

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setUploadedMedia(prev => [{ name: file.name, url: data.url, createdAt: new Date().toISOString() }, ...prev])
      }
    } catch (e) {
      console.error('Upload failed:', e)
    } finally {
      setIsUploading(false)
    }
  }

  // Insert image into current slide
  const insertImage = (imageUrl: string) => {
    setPrompt(`Add this background image to slide ${currentSlide + 1}: ${imageUrl}`)
    setActiveTab('edit')
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

  const themeStyles = schemeToStyles(colorScheme)

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
          {currentDeck && (
            <span className="text-sm text-slate-400">· {currentDeck.name}</span>
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
              onClick={() => setActiveTab('edit')}
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
        <div className="flex-1 md:w-3/5 flex flex-col" style={{ backgroundColor: colorScheme.colors.bg }}>
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
            {/* Slide Picker with Per-Slide Scoring */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {Array.from({ length: totalSlides }).map((_, i) => {
                const slideScore = score?.slideScores?.find(s => s.slide === i + 1)
                const scoreColor = slideScore?.status === 'green'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : slideScore?.status === 'yellow'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                    : slideScore?.status === 'red'
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-700 border-slate-600 text-slate-300'

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    title={slideScore?.issue || `Slide ${i + 1}`}
                    className={`w-7 h-7 rounded text-xs font-medium transition-all border ${
                      i === currentSlide
                        ? `${scoreColor} ring-2 ring-offset-1 ring-offset-slate-900 ${
                            slideScore?.status === 'green' ? 'ring-green-400'
                            : slideScore?.status === 'yellow' ? 'ring-yellow-400'
                            : slideScore?.status === 'red' ? 'ring-red-400'
                            : 'ring-teal-400'
                          }`
                        : `${scoreColor} hover:opacity-80`
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            {/* Current Slide Issue */}
            {(() => {
              const currentSlideScore = score?.slideScores?.find(s => s.slide === currentSlide + 1)
              if (currentSlideScore?.issue) {
                return (
                  <div className={`mt-2 px-3 py-1.5 rounded text-xs text-center ${
                    currentSlideScore.status === 'red' ? 'bg-red-500/10 text-red-400' :
                    currentSlideScore.status === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-green-500/10 text-green-400'
                  }`}>
                    {currentSlideScore.issue}
                  </div>
                )
              }
              return null
            })()}
            {/* Legend */}
            {score?.slideScores && score.slideScores.length > 0 && (
              <div className="flex justify-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Strong</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Improve</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Fix</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar with Tabs */}
        <div className="md:w-2/5 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {(['design', 'edit', 'versions', 'feedback'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'text-teal-400 border-b-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'edit' && (score?.gaps?.length ?? 0) > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">
                    {score?.gaps?.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Edit Tab - now includes layout picker and score breakdown */}
            {activeTab === 'edit' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {/* Slide Layout */}
                  <div className="pb-3 border-b border-slate-700">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Slide {currentSlide + 1} Layout
                    </h3>
                    <div className="flex gap-1.5">
                      {LAYOUTS.map(layout => (
                        <button
                          key={layout.id}
                          onClick={() => handleChangeLayout(layout.id)}
                          disabled={isChangingLayout}
                          title={layout.label}
                          className="group px-3 py-2 bg-slate-700/50 hover:bg-teal-500/20 hover:border-teal-400 border border-slate-600 rounded-lg transition-all disabled:opacity-50 text-center"
                        >
                          <span className="text-lg">{layout.icon}</span>
                          <span className="block text-[10px] text-slate-400 group-hover:text-teal-400 mt-0.5">
                            {layout.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {isChangingLayout && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-teal-400">Applying...</span>
                      </div>
                    )}
                  </div>

                  {/* Score + Fixes */}
                  {score && (score.gaps?.length ?? 0) > 0 && (
                    <div className="pb-3 border-b border-slate-700">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Fixes ({score.gaps.length})
                      </h3>
                      <div className="space-y-1.5">
                        {score.gaps.slice(0, 3).map((gap, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(gap)}
                            className="w-full text-left px-2 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors"
                          >
                            <span className="text-orange-400 mr-1.5">•</span>
                            {gap.length > 60 ? gap.slice(0, 60) + '...' : gap}
                          </button>
                        ))}
                        {(score.gaps?.length ?? 0) > 3 && (
                          <button
                            onClick={() => setActiveTab('edit')}
                            className="text-xs text-teal-400 hover:underline"
                          >
                            +{(score.gaps?.length ?? 0) - 3} more →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chat History */}
                  {chatHistory.length === 0 ? (
                    <div className="text-slate-500 text-sm">
                      <p className="mb-2">Try prompts like:</p>
                      <ul className="space-y-1 text-slate-400">
                        <li>• "Make the problem slide more urgent"</li>
                        <li>• "Add competitor pricing comparison"</li>
                        <li>• "Strengthen the team credentials"</li>
                      </ul>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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

            {/* Design Tab - Colors, Images, Media */}
            {activeTab === 'design' && (
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Color Schemes */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Color Scheme
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_SCHEMES.map(scheme => (
                        <button
                          key={scheme.id}
                          onClick={() => setColorScheme(scheme)}
                          className={`relative rounded-lg overflow-hidden h-12 transition-all ${
                            colorScheme.id === scheme.id
                              ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-800'
                              : 'hover:scale-105'
                          }`}
                          title={scheme.name}
                        >
                          <div className={`w-full h-full bg-gradient-to-br ${scheme.preview}`} />
                          <span className="absolute bottom-0.5 left-0 right-0 text-[9px] text-center text-white drop-shadow-lg">
                            {scheme.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload Media */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Your Images
                    </h3>
                    <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-slate-700/30 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMediaUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <span className="text-sm text-slate-400">Uploading...</span>
                      ) : (
                        <>
                          <span className="text-2xl">📷</span>
                          <span className="text-sm text-slate-300">Upload logo, screenshot, or photo</span>
                          <span className="text-xs text-slate-500">PNG, JPG up to 5MB</span>
                        </>
                      )}
                    </label>

                    {uploadedMedia.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {uploadedMedia.map((media, i) => (
                          <button
                            key={i}
                            onClick={() => insertImage(media.url)}
                            className="relative group rounded-lg overflow-hidden aspect-square border border-slate-600"
                          >
                            <img
                              src={media.url}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs text-white font-medium">Add to slide</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      Style Actions
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setPrompt('Add subtle gradient backgrounds to all slides for visual depth')
                          setActiveTab('edit')
                        }}
                        className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                      >
                        ✨ Add gradient backgrounds
                      </button>
                      <button
                        onClick={() => {
                          setPrompt('Wrap key content in cards with subtle shadows and borders')
                          setActiveTab('edit')
                        }}
                        className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                      >
                        🎴 Add card styling
                      </button>
                      <button
                        onClick={() => {
                          setPrompt('Convert metrics to large stat cards with big numbers')
                          setActiveTab('edit')
                        }}
                        className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                      >
                        📊 Create stat cards
                      </button>
                      <button
                        onClick={() => {
                          setPrompt('Add relevant emoji icons to slide headlines (1-2 per slide max)')
                          setActiveTab('edit')
                        }}
                        className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                      >
                        🎯 Add icons to headlines
                      </button>
                    </div>
                  </div>
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
                      disabled={isSaving}
                      className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {isSaving ? 'Saving...' : currentDeckId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Saved Decks */}
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Saved Decks</h3>
                {savedDecks.length === 0 ? (
                  <p className="text-slate-500 text-sm">No decks saved yet</p>
                ) : (
                  <div className="space-y-2">
                    {savedDecks.map(deck => (
                      <div
                        key={deck.id}
                        className={`p-3 rounded-lg border ${
                          deck.id === currentDeckId
                            ? 'border-teal-400 bg-teal-400/10'
                            : 'border-slate-600 bg-slate-700/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{deck.name}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(deck.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {deck.score && <span>Score: {deck.score}/30</span>}
                          {deck.stage && <span>· {deck.stage}</span>}
                        </div>
                        {deck.id !== currentDeckId && (
                          <button
                            onClick={() => restoreVersion(deck)}
                            className="mt-2 text-xs text-teal-400 hover:underline"
                          >
                            Load this deck
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Score Trend */}
                {savedDecks.length > 1 && (
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Score Trend</h3>
                    <div className="flex items-end gap-1 h-16">
                      {savedDecks.slice().reverse().map((deck) => {
                        const deckScore = deck.score || 0
                        const height = (deckScore / 30) * 100
                        return (
                          <div
                            key={deck.id}
                            className={`flex-1 rounded-t ${deckScore >= 20 ? 'bg-green-500/50' : deckScore >= 15 ? 'bg-yellow-500/50' : 'bg-orange-500/50'}`}
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${deck.name}: ${deckScore}/30`}
                          />
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Deck scores over time</p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="p-4">
                {!currentDeckId ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-4">Save a deck first to add feedback</p>
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
                    {dbFeedback.length > 0 && (
                      <>
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">
                          Investor Feedback ({dbFeedback.length})
                        </h3>
                        <div className="space-y-3">
                          {dbFeedback.map(f => (
                            <div key={f.id} className="p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm">{f.investor_name}</span>
                                <span className="text-xs text-teal-400">{f.believability_score}/5</span>
                              </div>
                              <p className="text-sm text-slate-300 mb-2">{f.feedback}</p>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.investor_type?.replace('_', ' ')}
                                </span>
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.domain_expertise} exp
                                </span>
                                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                                  {f.meeting_stage?.replace('_', ' ')}
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
