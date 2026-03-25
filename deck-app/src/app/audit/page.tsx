'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AuditPage() {
  const [deckUrl, setDeckUrl] = useState('')
  const [deckContent, setDeckContent] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [result, setResult] = useState<{
    score: number
    scoreBreakdown: Record<string, { score: number; max: number; note: string }>
    verdict: string
    topFixes: string[]
    detailedNotes: string
  } | null>(null)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url')

  const handleAudit = async () => {
    if (!deckUrl && !deckContent) {
      setError('Please provide a deck URL or paste your deck content')
      return
    }

    setIsAuditing(true)
    setError('')
    setResult(null)

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

  if (isAuditing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-400 mb-8"></div>
        <h2 className="text-2xl font-semibold mb-4">Auditing your deck...</h2>
        <p className="text-slate-400">Analyzing against investor framework</p>
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
                Paste Content
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

            {error && <p className="text-red-400 mb-4">{error}</p>}

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
                      <tr key={key} className="border-b border-slate-700/50">
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
            <div className="flex gap-4">
              <button
                onClick={() => setResult(null)}
                className="flex-1 border border-slate-600 hover:border-slate-500 py-3 rounded-lg transition-colors"
              >
                Audit Another Deck
              </button>
              <Link
                href="/create"
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-center py-3 rounded-lg transition-colors"
              >
                Create a New Deck
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
