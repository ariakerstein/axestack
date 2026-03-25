'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DeckData {
  html: string
  score: number
  scoreBreakdown: Record<string, number>
  gaps: string[]
}

export default function PreviewPage() {
  const [deckData, setDeckData] = useState<DeckData | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('generatedDeck')
    if (stored) {
      setDeckData(JSON.parse(stored))
    }
  }, [])

  const handleDownload = () => {
    if (!deckData) return

    const blob = new Blob([deckData.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pitch-deck-${new Date().toISOString().split('T')[0]}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getScoreVerdict = (score: number) => {
    if (score >= 27) return { text: 'Investor Ready', color: 'text-green-400' }
    if (score >= 22) return { text: 'Almost Ready', color: 'text-yellow-400' }
    if (score >= 17) return { text: 'Needs Work', color: 'text-orange-400' }
    return { text: 'Rethink', color: 'text-red-400' }
  }

  if (!deckData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-semibold mb-4">No deck found</h2>
        <p className="text-slate-400 mb-8">Create a deck first to preview it.</p>
        <Link
          href="/create"
          className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg"
        >
          Create Deck
        </Link>
      </div>
    )
  }

  const verdict = getScoreVerdict(deckData.score)

  return (
    <div className="min-h-screen flex">
      {/* Deck Preview */}
      <div className={`flex-1 ${showSidebar ? '' : 'w-full'}`}>
        <iframe
          srcDoc={deckData.html}
          className="w-full h-screen border-0"
          title="Deck Preview"
        />
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed top-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
      >
        {showSidebar ? '→' : '←'}
      </button>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-slate-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-6">Your Deck</h2>

          {/* Score */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-4xl font-bold">{deckData.score}</span>
              <span className="text-slate-400">/30</span>
            </div>
            <p className={`font-semibold ${verdict.color}`}>{verdict.text}</p>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(deckData.scoreBreakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-slate-400">{value}/{key === 'businessModel' || key === 'theAsk' || key === 'visual' ? 2 : 3}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps */}
          {deckData.gaps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Top Improvements</h3>
              <ul className="space-y-2">
                {deckData.gaps.map((gap, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-yellow-400">•</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Download HTML
            </button>
            <Link
              href="/create"
              className="block w-full text-center border border-slate-600 hover:border-slate-500 py-3 rounded-lg transition-colors"
            >
              Create New Deck
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-500 mt-8 text-center">
            Built with{' '}
            <a href="https://github.com/ariakerstein/axestack" className="text-teal-400 hover:underline">
              axestack
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
