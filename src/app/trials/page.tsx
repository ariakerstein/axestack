'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CANCER_TYPES } from '@/lib/cancer-data'

interface PatientProfile {
  cancerType: string
  stage?: string
  location?: string
}

interface Trial {
  id: string
  title: string
  phase: string
  status: string
  condition: string
  location: string
  sponsor: string
  description: string
  eligibility: string[]
  matchScore: number
  matchReasons: string[]
}

export default function TrialsPage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [trials, setTrials] = useState<Trial[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('patient-profile')
    if (saved) {
      setProfile(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  const searchTrials = async () => {
    if (!profile) return

    setSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancerType: CANCER_TYPES[profile.cancerType] || profile.cancerType,
          stage: profile.stage,
          location: profile.location,
          status: 'recruiting',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search trials')
      }

      const data = await response.json()
      setTrials(data.trials || [])
      setSearched(true)
    } catch (err) {
      console.error('Trial search error:', err)
      setError('Unable to search trials. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // Auto-search when profile is loaded
  useEffect(() => {
    if (profile && !searched && !searching) {
      searchTrials()
    }
  }, [profile])

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Loading...</div>
    </div>
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1">
            ← Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Trials</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!profile ? (
          /* No profile - prompt to create */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔬</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Find Clinical Trials</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              To find trials matched to your cancer, we need to know your diagnosis.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Your Profile
            </Link>
            <p className="text-xs text-slate-500 mt-4">Takes 30 seconds. Data stays on your device.</p>
          </div>
        ) : (
          /* Has profile - show trial search */
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800">
                    Searching trials for <strong>{CANCER_TYPES[profile.cancerType] || profile.cancerType}</strong>
                    {profile.stage && <span> (Stage {profile.stage})</span>}
                    {profile.location && <span> near {profile.location}</span>}
                  </p>
                </div>
                <Link href="/profile" className="text-xs text-blue-600 hover:text-blue-800">Edit</Link>
              </div>
            </div>

            {searching && (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">🔬</div>
                <p className="text-slate-500">Searching ClinicalTrials.gov...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={searchTrials}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {searched && !searching && trials.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Trials Found</h3>
                <p className="text-slate-500 text-sm mb-6">
                  No recruiting trials match your criteria. Try broadening your search.
                </p>
                <a
                  href={`https://clinicaltrials.gov/search?cond=${encodeURIComponent(CANCER_TYPES[profile.cancerType] || profile.cancerType)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Search ClinicalTrials.gov →
                </a>
              </div>
            )}

            {searched && !searching && trials.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-600">
                    Found <strong>{trials.length}</strong> recruiting trials
                  </p>
                  <button
                    onClick={searchTrials}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Refresh
                  </button>
                </div>

                {trials.slice(0, 10).map((trial) => (
                  <div
                    key={trial.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900 text-sm leading-snug">
                          {trial.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {trial.id} • {trial.sponsor}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          trial.status === 'RECRUITING'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {trial.status}
                        </span>
                        {trial.matchScore >= 70 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {trial.matchScore}% match
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {trial.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{trial.phase}</span>
                        <span>•</span>
                        <span>{trial.location}</span>
                      </div>
                      <a
                        href={`https://clinicaltrials.gov/study/${trial.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details →
                      </a>
                    </div>

                    {trial.matchReasons && trial.matchReasons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {trial.matchReasons.map((reason, idx) => (
                            <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {trials.length > 10 && (
                  <div className="text-center pt-4">
                    <a
                      href={`https://clinicaltrials.gov/search?cond=${encodeURIComponent(CANCER_TYPES[profile.cancerType] || profile.cancerType)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {trials.length} trials on ClinicalTrials.gov →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
