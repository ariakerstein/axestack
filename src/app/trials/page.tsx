'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { CANCER_TYPES, BIOMARKERS, getBiomarkersForCancer } from '@/lib/cancer-data'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { ShareButton } from '@/components/ShareButton'
import { useAuth } from '@/lib/auth'
import { X, ExternalLink, MapPin, Building2, FlaskConical, CheckCircle2, Filter, FileText, Send, Shield } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { RecordsProcessingBanner } from '@/components/RecordsProcessingBanner'
import { supabase } from '@/lib/supabase'

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
  const [rawTrials, setRawTrials] = useState<Trial[]>([])  // Unfiltered API results
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

  // LIVE FILTERING - filters trials instantly when filters change
  const trials = useMemo(() => {
    let filtered = [...rawTrials]

    // Filter by location (city, state, country, zip)
    if (filters.location) {
      const loc = filters.location.toLowerCase()
      filtered = filtered.filter((t) =>
        t.location?.toLowerCase().includes(loc)
      )
    }

    // Filter by phase
    if (filters.phase) {
      filtered = filtered.filter((t) =>
        t.phase?.toLowerCase().includes(filters.phase.toLowerCase())
      )
    }

    // Filter by status
    if (filters.status) {
      const statusMap: Record<string, string[]> = {
        'recruiting': ['recruiting'],
        'not_yet_recruiting': ['not yet recruiting', 'not_yet_recruiting'],
        'active': ['active', 'enrolling by invitation'],
      }
      const validStatuses = statusMap[filters.status] || []
      if (validStatuses.length > 0) {
        filtered = filtered.filter((t) =>
          validStatuses.some(s => t.status?.toLowerCase().includes(s))
        )
      }
    }

    // Filter by biomarker (search in title, description, eligibility)
    if (filters.biomarker) {
      const marker = filters.biomarker.toLowerCase()
      filtered = filtered.filter((t) =>
        t.title?.toLowerCase().includes(marker) ||
        t.description?.toLowerCase().includes(marker) ||
        t.eligibility?.some(e => e.toLowerCase().includes(marker))
      )
    }

    return filtered
  }, [rawTrials, filters])

  // Eligibility profile from records
  const [eligibilityProfile, setEligibilityProfile] = useState<{
    hasRecords: boolean
    biomarkers: string[]
    priorTreatments: string[]
  } | null>(null)

  // Share records modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareTrialId, setShareTrialId] = useState<string | null>(null)
  const [userRecords, setUserRecords] = useState<Array<{ id: string; fileName: string; documentType: string }>>([])
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  const [shareConsent, setShareConsent] = useState({
    hasRead: false,
    understands: false,
    canWithdraw: false,
  })
  const [shareSignature, setShareSignature] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  const { trackEvent } = useAnalytics()
  const { logTrialSearch, logTrialView } = useActivityLog()

  // Load user records for sharing
  useEffect(() => {
    const loadRecords = () => {
      const localRecords = localStorage.getItem('axestack-translations')
      if (localRecords) {
        try {
          const parsed = JSON.parse(localRecords)
          setUserRecords(parsed.map((r: { id: string; fileName: string; documentType: string }) => ({
            id: r.id,
            fileName: r.fileName,
            documentType: r.documentType || 'Medical Record',
          })))
        } catch {
          // Ignore
        }
      }
    }
    loadRecords()
  }, [])

  // Get biomarkers for current cancer type
  const availableBiomarkers = profile ? getBiomarkersForCancer(profile.cancerType) : []

  // Check for records and extract eligibility profile, then auto-populate filters
  useEffect(() => {
    const checkRecords = async () => {
      // Check localStorage first
      const localRecords = localStorage.getItem('axestack-translations-data')
      if (localRecords) {
        try {
          const records = JSON.parse(localRecords)
          const recordValues = Object.values(records) as Array<{ result?: { cancer_specific?: { biomarkers?: string[] }, treatments_mentioned?: string[] } }>

          if (recordValues.length > 0) {
            // Extract biomarkers and treatments from all records
            const allBiomarkers: string[] = []
            const allTreatments: string[] = []

            recordValues.forEach(r => {
              if (r.result?.cancer_specific?.biomarkers) {
                allBiomarkers.push(...r.result.cancer_specific.biomarkers)
              }
              if (r.result?.treatments_mentioned) {
                allTreatments.push(...r.result.treatments_mentioned)
              }
            })

            const uniqueBiomarkers = [...new Set(allBiomarkers)]
            setEligibilityProfile({
              hasRecords: true,
              biomarkers: uniqueBiomarkers,
              priorTreatments: [...new Set(allTreatments)],
            })

            // AUTO-POPULATE FILTERS from extracted profile
            if (uniqueBiomarkers.length > 0) {
              setFilters(prev => ({ ...prev, biomarker: uniqueBiomarkers[0] }))
            }
            return
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Check cloud records for authenticated users
      if (user) {
        try {
          const res = await fetch('/api/records/view')
          const data = await res.json()
          if (data.records && data.records.length > 0) {
            const allBiomarkers: string[] = []
            const allTreatments: string[] = []

            data.records.forEach((r: { result?: { cancer_specific?: { biomarkers?: string[] }, treatments_mentioned?: string[] } }) => {
              if (r.result?.cancer_specific?.biomarkers) {
                allBiomarkers.push(...r.result.cancer_specific.biomarkers)
              }
              if (r.result?.treatments_mentioned) {
                allTreatments.push(...r.result.treatments_mentioned)
              }
            })

            const uniqueBiomarkers = [...new Set(allBiomarkers)]
            setEligibilityProfile({
              hasRecords: true,
              biomarkers: uniqueBiomarkers,
              priorTreatments: [...new Set(allTreatments)],
            })

            // AUTO-POPULATE FILTERS from extracted profile
            if (uniqueBiomarkers.length > 0) {
              setFilters(prev => ({ ...prev, biomarker: uniqueBiomarkers[0] }))
            }
            return
          }
        } catch {
          // Ignore errors
        }
      }

      setEligibilityProfile({ hasRecords: false, biomarkers: [], priorTreatments: [] })
    }

    checkRecords()
  }, [user])

  // Auto-populate location filter from profile
  useEffect(() => {
    if (profile?.location && !filters.location) {
      setFilters(prev => ({ ...prev, location: profile.location || '' }))
    }
  }, [profile])

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
      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancerType: CANCER_TYPES[profile.cancerType] || profile.cancerType,
          stage: profile.stage,
          location: profile.location,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search trials')
      }

      const data = await response.json()
      const apiTrials = data.trials || []

      // Store raw results - filtering happens in useMemo
      setRawTrials(apiTrials)
      setSearched(true)

      // Track trial search
      trackEvent('trial_search', {
        cancer_type: profile.cancerType,
        stage: profile.stage || null,
        location: profile.location || null,
        results_count: apiTrials.length,
      })

      // Log to patient graph
      logTrialSearch({
        query: profile.cancerType,
        filters: {
          stage: profile.stage,
          location: profile.location,
        },
        resultsCount: apiTrials.length,
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
      <RecordsProcessingBanner />

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
            {/* Your Eligibility Profile */}
            {eligibilityProfile && (
              <div className={`rounded-xl p-4 mb-4 ${eligibilityProfile.hasRecords ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                {eligibilityProfile.hasRecords ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Your Eligibility Profile</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">Cancer:</span>{' '}
                        <span className="text-green-900">{CANCER_TYPES[profile.cancerType] || profile.cancerType}</span>
                        {profile.stage && <span className="text-green-900"> (Stage {profile.stage})</span>}
                      </div>
                      {eligibilityProfile.biomarkers.length > 0 && (
                        <div>
                          <span className="text-green-700 font-medium">Biomarkers:</span>{' '}
                          <span className="text-green-900">{eligibilityProfile.biomarkers.slice(0, 3).join(', ')}</span>
                          {eligibilityProfile.biomarkers.length > 3 && <span className="text-green-600"> +{eligibilityProfile.biomarkers.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                    {eligibilityProfile.priorTreatments.length > 0 && (
                      <div className="text-sm mt-2">
                        <span className="text-green-700 font-medium">Prior treatments:</span>{' '}
                        <span className="text-green-900">{eligibilityProfile.priorTreatments.slice(0, 3).join(', ')}</span>
                        {eligibilityProfile.priorTreatments.length > 3 && <span className="text-green-600"> +{eligibilityProfile.priorTreatments.length - 3} more</span>}
                      </div>
                    )}
                    <p className="text-xs text-green-600 mt-2">Extracted from your uploaded records • Used to match eligibility criteria</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-amber-800">Upload records to check eligibility</span>
                      <p className="text-sm text-amber-700 mt-1">We'll extract biomarkers & treatments to match you with trials</p>
                    </div>
                    <Link href="/records" className="bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
                      Upload Records
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800">
                    {eligibilityProfile?.hasRecords ? (
                      <>Finding trials that match your <strong>{CANCER_TYPES[profile.cancerType] || profile.cancerType}</strong> profile</>
                    ) : (
                      <>Searching trials for <strong>{CANCER_TYPES[profile.cancerType] || profile.cancerType}</strong></>
                    )}
                    {profile.stage && <span> (Stage {profile.stage})</span>}
                    {filters.location && <span> in {filters.location}</span>}
                  </p>
                </div>
                <Link href="/profile" className="text-xs text-blue-600 hover:text-blue-800">Edit Profile</Link>
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

            {searched && !searching && rawTrials.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-700">
                      {trials.length === rawTrials.length ? (
                        <>Found <strong>{trials.length}</strong> trials</>
                      ) : (
                        <>Showing <strong>{trials.length}</strong> of {rawTrials.length} trials</>
                      )}
                    </p>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      ClinicalTrials.gov
                    </span>
                  </div>
                  <button
                    onClick={searchTrials}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Refresh
                  </button>
                </div>

                {/* No matches after filtering */}
                {trials.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                    <div className="text-3xl mb-3">🔍</div>
                    <h3 className="font-semibold text-slate-700 mb-2">No trials match your filters</h3>
                    <p className="text-sm text-slate-500 mb-4">Try adjusting your filter criteria</p>
                    <button
                      onClick={() => setFilters({ biomarker: '', location: '', phase: '', status: 'recruiting' })}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {trials.length > 0 && trials.slice(0, 10).map((trial) => (
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

                {/* Expert Help CTA */}
                <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
                  <h3 className="font-bold text-indigo-900 mb-2">Need help finding the right trial?</h3>
                  <p className="text-sm text-indigo-700 mb-4">
                    Trial matching specialists can review your records and find trials you may qualify for.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://www.massivebio.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Massive Bio
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://www.cancercommons.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Cancer Commons
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://www.tricanhealth.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white border border-indigo-300 text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Trican Health
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-indigo-500 mt-3">
                    These services can help match your specific case to clinical trials
                  </p>
                </div>
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
              <div className="flex items-center gap-3">
                {userRecords.length > 0 && (
                  <button
                    onClick={() => {
                      setShareTrialId(selectedTrial.id)
                      setShowShareModal(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Share Records
                  </button>
                )}
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
        </div>
      )}

      {/* Share Records Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => {
            setShowShareModal(false)
            setShareTrialId(null)
            setSelectedRecords([])
            setShareConsent({ hasRead: false, understands: false, canWithdraw: false })
            setShareSignature('')
            setShareEmail('')
            setShareMessage('')
            setShareSuccess(false)
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {shareSuccess ? (
              /* Success State */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Records Shared Successfully</h3>
                <p className="text-slate-600 mb-6">
                  Your records have been prepared for sharing with the trial coordinator.
                  They will contact you at <strong>{shareEmail}</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setShareTrialId(null)
                    setSelectedRecords([])
                    setShareConsent({ hasRead: false, understands: false, canWithdraw: false })
                    setShareSignature('')
                    setShareEmail('')
                    setShareMessage('')
                    setShareSuccess(false)
                  }}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Share Records with Trial</h3>
                      <p className="text-xs text-slate-500">Trial ID: {shareTrialId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowShareModal(false)
                      setShareTrialId(null)
                      setSelectedRecords([])
                      setShareConsent({ hasRead: false, understands: false, canWithdraw: false })
                      setShareSignature('')
                      setShareEmail('')
                      setShareMessage('')
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Select Records */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Select Records to Share</h4>
                    <div className="space-y-2">
                      {userRecords.map((record) => (
                        <label
                          key={record.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedRecords.includes(record.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecords.includes(record.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecords([...selectedRecords, record.id])
                              } else {
                                setSelectedRecords(selectedRecords.filter(id => id !== record.id))
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{record.fileName}</p>
                            <p className="text-xs text-slate-500">{record.documentType}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {userRecords.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No records found. <Link href="/records" className="text-indigo-600 hover:underline">Upload records</Link> first.
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Your Email</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Trial coordinator will contact you here</p>
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Message (Optional)</label>
                    <textarea
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                      placeholder="Any additional context for the trial coordinator..."
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Consent Checkboxes */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Consent to Share</h4>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareConsent.hasRead}
                          onChange={(e) => setShareConsent({ ...shareConsent, hasRead: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">
                          I have reviewed the records I am sharing and confirm they are accurate.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareConsent.understands}
                          onChange={(e) => setShareConsent({ ...shareConsent, understands: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">
                          I understand my records will be shared with the trial coordinator to assess eligibility.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareConsent.canWithdraw}
                          onChange={(e) => setShareConsent({ ...shareConsent, canWithdraw: e.target.checked })}
                          className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">
                          I understand I can withdraw consent at any time by contacting the trial.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Electronic Signature */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Electronic Signature</label>
                    <input
                      type="text"
                      value={shareSignature}
                      onChange={(e) => setShareSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      By typing your name, you agree to share the selected records.
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                  <button
                    onClick={async () => {
                      if (selectedRecords.length === 0) {
                        alert('Please select at least one record to share.')
                        return
                      }
                      if (!shareEmail || !shareEmail.includes('@')) {
                        alert('Please enter a valid email address.')
                        return
                      }
                      if (!shareConsent.hasRead || !shareConsent.understands || !shareConsent.canWithdraw) {
                        alert('Please check all consent boxes to continue.')
                        return
                      }
                      if (!shareSignature.trim()) {
                        alert('Please provide your electronic signature.')
                        return
                      }

                      setIsSharing(true)
                      try {
                        // For now, simulate the share action
                        // In production, this would call an API to securely share records
                        await new Promise(resolve => setTimeout(resolve, 1500))

                        // Track the share event
                        trackEvent('trial_records_shared', {
                          trial_id: shareTrialId,
                          records_count: selectedRecords.length,
                        })

                        setShareSuccess(true)
                      } catch (err) {
                        console.error('Share error:', err)
                        alert('Failed to share records. Please try again.')
                      } finally {
                        setIsSharing(false)
                      }
                    }}
                    disabled={isSharing || selectedRecords.length === 0 || !shareEmail || !shareConsent.hasRead || !shareConsent.understands || !shareConsent.canWithdraw || !shareSignature.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSharing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Share {selectedRecords.length} Record{selectedRecords.length !== 1 ? 's' : ''} with Trial
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
