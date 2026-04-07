'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CANCER_TYPES, BIOMARKERS, getBiomarkersForCancer } from '@/lib/cancer-data'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { ShareButton } from '@/components/ShareButton'
import { useAuth } from '@/lib/auth'
import { X, ExternalLink, MapPin, Building2, FlaskConical, CheckCircle2, Filter } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

interface PatientProfile {
  cancerType: string
  stage?: string
  location?: string
}

// Filter options
const PHASE_OPTIONS = [
  { value: '', label: 'All Phases' },
  { value: 'Phase 1', label: 'Phase 1 (Safety)' },
  { value: 'Phase 2', label: 'Phase 2 (Efficacy)' },
  { value: 'Phase 3', label: 'Phase 3 (Comparison)' },
  { value: 'Phase 4', label: 'Phase 4 (Post-market)' },
]

const STATUS_OPTIONS = [
  { value: 'recruiting', label: 'Recruiting Now' },
  { value: 'not_yet_recruiting', label: 'Opening Soon' },
  { value: 'active', label: 'Active (Closed)' },
  { value: '', label: 'Any Status' },
]


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
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [trials, setTrials] = useState<Trial[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null)

  // Filter state - filters always visible
  const [filters, setFilters] = useState({
    biomarker: '',
    location: '',  // Simple text input for city/state/zip
    phase: '',
    status: 'recruiting',
  })

  const { trackEvent } = useAnalytics()
  const { logTrialSearch, logTrialView } = useActivityLog()

  // Get biomarkers for current cancer type
  const availableBiomarkers = profile ? getBiomarkersForCancer(profile.cancerType) : []

  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      setProfile({
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
        location: authProfile.location || undefined,
      })
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        setProfile(JSON.parse(saved))
      }
    }
    setLoading(false)
  }, [user, authProfile, authLoading])

  const searchTrials = async () => {
    if (!profile) return

    setSearching(true)
    setError(null)

    try {
      // Use filter location if set, otherwise fall back to profile location
      const searchLocation = filters.location || profile.location

      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancerType: CANCER_TYPES[profile.cancerType] || profile.cancerType,
          stage: profile.stage,
          location: searchLocation,
          status: filters.status || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search trials')
      }

      const data = await response.json()
      let filteredTrials = data.trials || []

      // CLIENT-SIDE FILTERING (API may not support all filters)

      // Filter by location (city, state, country, zip)
      if (filters.location && filteredTrials.length > 0) {
        const loc = filters.location.toLowerCase()
        filteredTrials = filteredTrials.filter((t: Trial) =>
          t.location?.toLowerCase().includes(loc)
        )
      }

      // Filter by phase
      if (filters.phase && filteredTrials.length > 0) {
        filteredTrials = filteredTrials.filter((t: Trial) =>
          t.phase?.toLowerCase().includes(filters.phase.toLowerCase())
        )
      }

      // Filter by status
      if (filters.status && filteredTrials.length > 0) {
        const statusMap: Record<string, string[]> = {
          'recruiting': ['recruiting'],
          'not_yet_recruiting': ['not yet recruiting', 'not_yet_recruiting'],
          'active': ['active', 'enrolling by invitation'],
        }
        const validStatuses = statusMap[filters.status] || []
        if (validStatuses.length > 0) {
          filteredTrials = filteredTrials.filter((t: Trial) =>
            validStatuses.some(s => t.status?.toLowerCase().includes(s))
          )
        }
      }

      // Filter by biomarker (search in title, description, eligibility)
      if (filters.biomarker && filteredTrials.length > 0) {
        const marker = filters.biomarker.toLowerCase()
        filteredTrials = filteredTrials.filter((t: Trial) =>
          t.title?.toLowerCase().includes(marker) ||
          t.description?.toLowerCase().includes(marker) ||
          t.eligibility?.some(e => e.toLowerCase().includes(marker))
        )
      }

      setTrials(filteredTrials)
      setSearched(true)

      // Track trial search
      trackEvent('trial_search', {
        cancer_type: profile.cancerType,
        stage: profile.stage || null,
        location: searchLocation || null,
        biomarker: filters.biomarker || null,
        phase: filters.phase || null,
        results_count: filteredTrials.length,
      })

      // Log to patient graph
      logTrialSearch({
        query: profile.cancerType,
        filters: {
          stage: profile.stage,
          location: searchLocation,
          biomarker: filters.biomarker,
          phase: filters.phase,
        },
        resultsCount: filteredTrials.length,
      })
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
      <Navbar />

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
            <p className="text-xs text-slate-500 mt-4">Takes 30 seconds. Encrypted and private.</p>
          </div>
        ) : (
          /* Has profile - show trial search */
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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

            {/* Filters - Always visible */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Filter Trials</span>
                {(filters.biomarker || filters.phase || filters.location || filters.status !== 'recruiting') && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {[filters.biomarker, filters.phase, filters.location, filters.status !== 'recruiting' ? filters.status : ''].filter(Boolean).length} active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Location - Simple text input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    placeholder="City, state, or country"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Biomarker Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Biomarker</label>
                  {availableBiomarkers.length > 0 ? (
                    <select
                      value={filters.biomarker}
                      onChange={(e) => setFilters({ ...filters, biomarker: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Any</option>
                      {availableBiomarkers.map((b) => (
                        <option key={b.marker} value={b.marker}>{b.marker}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filters.biomarker}
                      onChange={(e) => setFilters({ ...filters, biomarker: e.target.value })}
                      placeholder="e.g., EGFR, HER2"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Phase Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phase</label>
                  <select
                    value={filters.phase}
                    onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PHASE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setFilters({ biomarker: '', location: '', phase: '', status: 'recruiting' })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset
                </button>
                <button
                  onClick={searchTrials}
                  disabled={searching}
                  className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
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
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-600">
                      Found <strong>{trials.length}</strong> recruiting trials
                    </p>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Data from ClinicalTrials.gov
                    </span>
                  </div>
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
                      <button
                        onClick={() => {
                          setSelectedTrial(trial)
                          logTrialView({
                            trialId: trial.id,
                            trialTitle: trial.title,
                          })
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details →
                      </button>
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

      {/* Trial Details Modal */}
      {selectedTrial && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTrial(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedTrial.title}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedTrial.id} • {selectedTrial.sponsor}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrial(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Phase */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  selectedTrial.status === 'RECRUITING'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedTrial.status}
                </span>
                {selectedTrial.phase && (
                  <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                    <FlaskConical className="w-3.5 h-3.5 inline mr-1" />
                    {selectedTrial.phase}
                  </span>
                )}
                {selectedTrial.matchScore >= 70 && (
                  <span className="text-sm px-3 py-1 rounded-full bg-[#C66B4A]/10 text-[#C66B4A]">
                    {selectedTrial.matchScore}% match
                  </span>
                )}
              </div>

              {/* Location */}
              {selectedTrial.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Location</p>
                    <p className="text-sm text-slate-600">{selectedTrial.location}</p>
                  </div>
                </div>
              )}

              {/* Sponsor */}
              {selectedTrial.sponsor && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Sponsor</p>
                    <p className="text-sm text-slate-600">{selectedTrial.sponsor}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">About This Trial</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedTrial.description}
                </p>
              </div>

              {/* Match Reasons */}
              {selectedTrial.matchReasons && selectedTrial.matchReasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Why This Matches You</p>
                  <div className="space-y-2">
                    {selectedTrial.matchReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligibility */}
              {selectedTrial.eligibility && selectedTrial.eligibility.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Eligibility Criteria</p>
                  <ul className="space-y-1">
                    {selectedTrial.eligibility.map((criteria, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400">•</span>
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Data from ClinicalTrials.gov
              </p>
              <a
                href={`https://clinicaltrials.gov/study/${selectedTrial.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Official Listing
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
