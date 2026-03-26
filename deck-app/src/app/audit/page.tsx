'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const AUDIT_QUOTES = [
  { text: "Your deck is being judged like you judge Tinder profiles. Harsh but fair.", author: "The Algorithm" },
  { text: "Every investor says they want honesty. They do not want honesty.", author: "Bitter Experience" },
  { text: "The slides are fine. The question is: can you survive the Q&A?", author: "Partner Meeting PTSD" },
  { text: "A 30-point font forces you to shut up and get to the point.", author: "Guy Kawasaki" },
  { text: "Your financial projections are fiction. Make them compelling fiction.", author: "Honest CFO" },
  { text: "If your mom can't explain your deck, neither can a VC associate.", author: "Mom Test Extended" },
  { text: "TAM SAM SOM: Three ways to say 'this market is huge trust me bro'.", author: "Cynical VC" },
  { text: "VCs have 100 reasons to say no and only need one.", author: "The Math" },
]

interface CategoryDetails {
  key: string
  label: string
  score: number
  max: number
  note: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SavedDeck {
  id: string
  name: string
  html: string
  timestamp: number
}

export default function AuditPage() {
  const router = useRouter()
  const [deckUrl, setDeckUrl] = useState('')
  const [deckContent, setDeckContent] = useState('')
  const [auditedContent, setAuditedContent] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [result, setResult] = useState<{
    score: number
    scoreBreakdown: Record<string, { score: number; max: number; note: string }>
    verdict: string
    topFixes: string[]
    detailedNotes: string
  } | null>(null)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'url' | 'paste' | 'upload' | 'saved'>('url')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)

  // Rotate quotes while auditing
  useEffect(() => {
    if (!isAuditing) return
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % AUDIT_QUOTES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isAuditing])

  // Load saved decks from localStorage
  useEffect(() => {
    const loadSavedDecks = () => {
      const decks: SavedDeck[] = []

      // Load current deck
      const currentDeck = localStorage.getItem('generatedDeck')
      if (currentDeck) {
        try {
          const data = JSON.parse(currentDeck)
          if (data.html) {
            decks.push({
              id: 'current',
              name: 'Current Deck',
              html: data.html,
              timestamp: Date.now()
            })
          }
        } catch { /* ignore */ }
      }

      // Load saved versions
      const versions = localStorage.getItem('deckVersions')
      if (versions) {
        try {
          const parsed = JSON.parse(versions)
          parsed.forEach((v: { id: string; name: string; html: string; timestamp: number }) => {
            decks.push({
              id: v.id,
              name: v.name,
              html: v.html,
              timestamp: v.timestamp
            })
          })
        } catch { /* ignore */ }
      }

      setSavedDecks(decks)
    }

    loadSavedDecks()
  }, [])

  const auditSavedDeck = (deck: SavedDeck) => {
    setDeckContent(deck.html)
    handleAuditWithContent(deck.html)
  }

  const handleAuditWithContent = async (content: string) => {
    setIsAuditing(true)
    setError('')
    setResult(null)
    setAuditedContent(content)

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to audit deck')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to audit deck'
      setError(message)
    } finally {
      setIsAuditing(false)
    }
  }

  const openInEditor = () => {
    if (!auditedContent) return
    // Save to localStorage and navigate to editor
    const existingData = localStorage.getItem('generatedDeck')
    const parsed = existingData ? JSON.parse(existingData) : {}
    localStorage.setItem('generatedDeck', JSON.stringify({
      ...parsed,
      html: auditedContent,
      score: result?.score,
      scoreBreakdown: result?.scoreBreakdown,
      gaps: result?.topFixes,
    }))
    router.push('/editor')
  }

  const processFile = async (file: File) => {
    // Check max size (20MB via blob storage)
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 20MB.')
      return
    }

    // Check if it's a PDF
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      let parseResponse: Response

      // For large files (> 4MB), upload to blob storage first
      if (file.size > 4 * 1024 * 1024) {
        // Step 1: Upload to Vercel Blob
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)

        const uploadResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json()
          throw new Error(data.error || 'Failed to upload PDF')
        }

        const { url } = await uploadResponse.json()

        // Step 2: Parse from blob URL
        parseResponse = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
      } else {
        // For small files, direct upload (faster)
        const formData = new FormData()
        formData.append('file', file)

        parseResponse = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })
      }

      if (!parseResponse.ok) {
        const contentType = parseResponse.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const data = await parseResponse.json()
          throw new Error(data.error || 'Failed to parse PDF')
        } else {
          throw new Error(`Server error: ${parseResponse.status}`)
        }
      }

      const data = await parseResponse.json()
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('Could not extract text from PDF. Try pasting the content instead.')
      }
      setDeckContent(data.text)
      setAuditedContent(data.text)
      // Auto-trigger audit
      handleAuditWithContent(data.text)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload PDF'
      setError(message)
      setIsUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  // Side panel state
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetails | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)

  const handleAudit = async () => {
    if (!deckUrl && !deckContent) {
      setError('Please provide a deck URL or paste your deck content')
      return
    }

    setIsAuditing(true)
    setError('')
    setResult(null)
    // Save content for potential editing later
    if (deckContent) {
      setAuditedContent(deckContent)
    }

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: deckUrl || undefined,
          content: deckContent || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to audit deck')
      }

      const data = await response.json()
      setResult(data)
      // Save the content for editing (works for URL mode too now)
      if (data.deckContent) {
        setAuditedContent(data.deckContent)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to audit deck'
      setError(message)
    } finally {
      setIsAuditing(false)
    }
  }

  const getVerdictColor = (verdict: string) => {
    if (verdict.includes('Ready')) return 'text-green-400'
    if (verdict.includes('Almost')) return 'text-yellow-400'
    if (verdict.includes('Needs')) return 'text-orange-400'
    return 'text-red-400'
  }

  const openCategoryPanel = (key: string, value: { score: number; max: number; note: string }) => {
    const label = key.replace(/([A-Z])/g, ' $1').trim()
    setSelectedCategory({ key, label, ...value })
    setChatMessages([{
      role: 'assistant',
      content: `**${label}**: ${value.score}/${value.max}\n\n${value.note}\n\nAsk me how to improve this score.`
    }])
    setChatInput('')
  }

  const handleCategoryChat = async () => {
    if (!chatInput.trim() || !selectedCategory) return

    const userMessage = chatInput.trim()
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatInput('')
    setIsChatting(true)

    try {
      const response = await fetch('/api/audit-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory.label,
          currentScore: selectedCategory.score,
          maxScore: selectedCategory.max,
          currentNote: selectedCategory.note,
          deckContent: deckContent || deckUrl,
          question: userMessage,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setIsChatting(false)
    }
  }

  if (isAuditing) {
    const quote = AUDIT_QUOTES[quoteIndex]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mb-8"></div>
        <h2 className="text-2xl font-semibold mb-4">Auditing your deck...</h2>
        <p className="text-slate-400 mb-12">Analyzing against investor framework</p>

        <div className="max-w-lg text-center transition-opacity duration-500">
          <p className="text-lg text-slate-300 italic mb-2">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-sm text-slate-500">— {quote.author}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen px-8 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/" className="text-teal-400 hover:underline text-sm mb-8 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold mb-4">Audit Your Deck</h1>
        <p className="text-slate-400 mb-8">
          Get a detailed scorecard based on Kawasaki 10/20/30, YC, and a16z best practices.
          We'll tell you exactly what to fix.
        </p>

        {!result ? (
          <>
            {/* Input mode toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setInputMode('url')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'url'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                URL
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'paste'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Paste
              </button>
              <button
                onClick={() => setInputMode('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'upload'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Upload PDF
              </button>
              <button
                onClick={() => setInputMode('saved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'saved'
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Saved Decks {savedDecks.length > 0 && <span className="ml-1 bg-teal-600 text-white text-xs px-1.5 rounded-full">{savedDecks.length}</span>}
              </button>
            </div>

            {/* URL input */}
            {inputMode === 'url' && (
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">
                  Deck URL (HTML, PDF, or public link)
                </label>
                <input
                  type="url"
                  value={deckUrl}
                  onChange={(e) => setDeckUrl(e.target.value)}
                  placeholder="https://example.com/my-deck.html"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-teal-400"
                />
              </div>
            )}

            {/* Paste content */}
            {inputMode === 'paste' && (
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">
                  Paste your deck content (text, markdown, or HTML)
                </label>
                <textarea
                  value={deckContent}
                  onChange={(e) => setDeckContent(e.target.value)}
                  placeholder="Paste your deck content here..."
                  rows={10}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-teal-400 resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Upload PDF */}
            {inputMode === 'upload' && (
              <div className="mb-6">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-teal-400 bg-teal-500/10'
                      : 'border-slate-600 hover:border-teal-500'
                  }`}
                  onClick={() => document.getElementById('pdf-input')?.click()}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
                      <p className="text-slate-300">Extracting text from PDF...</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-4">{isDragging ? '📥' : '📄'}</div>
                      <p className="text-lg text-slate-300 mb-2">
                        {isDragging ? 'Drop it here!' : 'Drop your PDF here or click to upload'}
                      </p>
                      <p className="text-sm text-slate-500">We&apos;ll extract the text and audit it</p>
                    </>
                  )}
                </div>
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            )}

            {/* Saved decks */}
            {inputMode === 'saved' && (
              <div className="mb-6">
                {savedDecks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800 rounded-xl">
                    <p className="text-slate-400 mb-4">No saved decks found</p>
                    <Link href="/create" className="text-teal-400 hover:underline">
                      Create a deck first →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400 mb-4">
                      Click any deck to audit it
                    </p>
                    {savedDecks.map((deck) => (
                      <button
                        key={deck.id}
                        onClick={() => auditSavedDeck(deck)}
                        className="w-full text-left p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 rounded-xl transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-white group-hover:text-teal-400 transition-colors">
                              {deck.name}
                            </p>
                            <p className="text-sm text-slate-400">
                              {deck.id === 'current' ? 'Your working deck' : `Saved ${new Date(deck.timestamp).toLocaleDateString()}`}
                            </p>
                          </div>
                          <span className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Audit →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-400 mb-4">{error}</p>}

            {inputMode !== 'saved' && (
              <button
                onClick={handleAudit}
                disabled={!deckUrl && !deckContent}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                  deckUrl || deckContent
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Audit My Deck
              </button>
            )}

            {/* What we check */}
            <div className="mt-12 pt-8 border-t border-slate-800">
              <h2 className="text-xl font-semibold mb-6">What we evaluate</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="font-semibold text-teal-400">Premise (15 pts)</p>
                  <p className="text-sm text-slate-400">Clarity, urgency, believability, upside, contrarian insight</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="font-semibold text-teal-400">Content (10 pts)</p>
                  <p className="text-sm text-slate-400">GTM clarity, traction, business model, the ask</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="font-semibold text-teal-400">Structure (5 pts)</p>
                  <p className="text-sm text-slate-400">Kawasaki 10/20/30, visual hierarchy</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <p className="font-semibold text-teal-400">Red Flags</p>
                  <p className="text-sm text-slate-400">"No competitors", vague GTM, metrics without timeframes</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Results */
          <div className="space-y-8">
            {/* Score header */}
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <p className="text-6xl font-bold mb-2">{result.score}<span className="text-slate-500 text-3xl">/30</span></p>
              <p className={`text-xl font-semibold ${getVerdictColor(result.verdict)}`}>
                {result.verdict}
              </p>
            </div>

            {/* Score breakdown */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Scorecard</h2>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-medium">Score</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.scoreBreakdown).map(([key, value]) => (
                      <tr
                        key={key}
                        className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                        onClick={() => openCategoryPanel(key, value)}
                      >
                        <td className="py-3 px-4 capitalize">{key.replace(/([A-Z])/g, ' $1')}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={value.score >= value.max * 0.8 ? 'text-green-400' : value.score >= value.max * 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                            {value.score}/{value.max}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm">{value.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top fixes */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Top 3 Fixes</h2>
              <div className="space-y-3">
                {result.topFixes.map((fix, i) => (
                  <div key={i} className="flex gap-4 bg-slate-800 p-4 rounded-lg">
                    <span className="text-teal-400 font-bold">{i + 1}</span>
                    <p>{fix}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed notes */}
            {result.detailedNotes && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Detailed Notes</h2>
                <div className="bg-slate-800 p-6 rounded-xl text-slate-300 whitespace-pre-wrap">
                  {result.detailedNotes}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {auditedContent && (
                <button
                  onClick={openInEditor}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 rounded-lg font-semibold text-lg transition-colors"
                >
                  Edit This Deck →
                </button>
              )}
              <div className="flex gap-4">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 border border-slate-600 hover:border-slate-500 py-3 rounded-lg transition-colors"
                >
                  Audit Another Deck
                </button>
                <Link
                  href="/create"
                  className="flex-1 border border-slate-600 hover:border-slate-500 text-center py-3 rounded-lg transition-colors"
                >
                  Create New Deck
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedCategory && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedCategory(null)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="font-semibold capitalize">{selectedCategory.label}</h3>
                <p className={`text-sm ${selectedCategory.score >= selectedCategory.max * 0.8 ? 'text-green-400' : selectedCategory.score >= selectedCategory.max * 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {selectedCategory.score}/{selectedCategory.max}
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${
                    msg.role === 'user'
                      ? 'bg-teal-500/20 ml-8'
                      : 'bg-slate-800 mr-8'
                  } p-3 rounded-lg text-sm whitespace-pre-wrap`}
                >
                  {msg.content}
                </div>
              ))}
              {isChatting && (
                <div className="bg-slate-800 mr-8 p-3 rounded-lg text-sm text-slate-400">
                  Thinking...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCategoryChat()}
                  placeholder="Ask how to improve..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={handleCategoryChat}
                  disabled={!chatInput.trim() || isChatting}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
