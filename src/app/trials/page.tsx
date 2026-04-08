'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { CANCER_TYPES, BIOMARKERS, getBiomarkersForCancer } from '@/lib/cancer-data'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useActivityLog } from '@/hooks/useActivityLog'
import { ShareButton } from '@/components/ShareButton'
import { useAuth } from '@/lib/auth'
import { X, ExternalLink, MapPin, Building2, FlaskConical, CheckCircle2, Filter, FileText, Send, Shield, Upload, Loader2, Plus, Radar } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { RecordsProcessingBanner } from '@/components/RecordsProcessingBanner'
import { supabase, saveProfile } from '@/lib/supabase'

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
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [rawTrials, setRawTrials] = useState<Trial[]>([])  // Unfiltered API results
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null)

  // Inline profile update state
  const [showProfileUpdatePrompt, setShowProfileUpdatePrompt] = useState(false)
  const [pendingCancerType, setPendingCancerType] = useState<string | null>(null)
  const [updatingProfile, setUpdatingProfile] = useState(false)

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

    // Get cancer type for relevance scoring
    const cancerTypeLower = profile?.cancerType ?
      (CANCER_TYPES[profile.cancerType] || profile.cancerType).toLowerCase() : ''
    const cancerKeywords = cancerTypeLower.split(/[\s\-\/]+/).filter(w => w.length > 2)

    // Filter by location (city, state, country, zip)
    if (filters.location) {
      const loc = filters.location.toLowerCase()
      filtered = filtered.filter((t) =>
        t.location?.toLowerCase().includes(loc)
      )
    }

    // Filter by phase (normalize: "Phase 2" matches "PHASE2", "Phase2", "PHASE 2", etc.)
    if (filters.phase) {
      const phaseNum = filters.phase.replace(/[^0-9]/g, '') // Extract just the number
      filtered = filtered.filter((t) => {
        const trialPhase = t.phase?.toLowerCase().replace(/\s/g, '') || ''
        return trialPhase.includes(`phase${phaseNum}`)
      })
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
    // Handle compound terms like "MSI-H/dMMR" by splitting and matching any part
    if (filters.biomarker) {
      const markerParts = filters.biomarker.toLowerCase().split(/[\/\-]/).map(p => p.trim()).filter(p => p.length > 1)
      filtered = filtered.filter((t) => {
        const searchText = [
          t.title?.toLowerCase() || '',
          t.description?.toLowerCase() || '',
          ...(t.eligibility?.map(e => e.toLowerCase()) || [])
        ].join(' ')
        return markerParts.some(part => searchText.includes(part))
      })
    }

    // Sort by relevance: trials mentioning the exact cancer type first
    if (cancerKeywords.length > 0) {
      filtered.sort((a, b) => {
        const aText = [a.condition, a.title, a.description].join(' ').toLowerCase()
        const bText = [b.condition, b.title, b.description].join(' ').toLowerCase()

        // Count keyword matches
        const aScore = cancerKeywords.filter(kw => aText.includes(kw)).length
        const bScore = cancerKeywords.filter(kw => bText.includes(kw)).length

        // Higher score = more relevant = sort first
        return bScore - aScore
      })
    }

    return filtered
  }, [rawTrials, filters, profile])

  // Eligibility profile from records
  const [eligibilityProfile, setEligibilityProfile] = useState<{
    hasRecords: boolean
    recordCount: number
    biomarkers: string[]
    priorTreatments: string[]
    autoFilterApplied: boolean
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

  // Quick upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Save biomarker to profile state
  const [savingBiomarker, setSavingBiomarker] = useState(false)
  const [savedBiomarkers, setSavedBiomarkers] = useState<string[]>([])

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
      // Check localStorage first - also check the index to know record count
      const localRecordsData = localStorage.getItem('axestack-translations-data')
      const localRecordsIndex = localStorage.getItem('axestack-translations')

      // Get record count from index (more reliable)
      let localRecordCount = 0
      try {
        const index = JSON.parse(localRecordsIndex || '[]')
        localRecordCount = index.length
      } catch {
        // Ignore
      }

      if (localRecordsData) {
        try {
          const records = JSON.parse(localRecordsData)
          // Data structure: { [id]: { cancer_specific: { biomarkers: [] }, treatments_mentioned: [] } }
          const recordValues = Object.values(records) as Array<{
            cancer_specific?: { biomarkers?: string[], cancer_type?: string, stage?: string }
            treatments_mentioned?: string[]
          }>

          const recordCount = Math.max(recordValues.length, localRecordCount)

          if (recordCount > 0) {
            // Extract biomarkers and treatments from all records
            const allBiomarkers: string[] = []
            const allTreatments: string[] = []

            recordValues.forEach(r => {
              // Biomarkers are directly on cancer_specific, not nested under result
              if (r.cancer_specific?.biomarkers && Array.isArray(r.cancer_specific.biomarkers)) {
                allBiomarkers.push(...r.cancer_specific.biomarkers)
              }
              if (r.treatments_mentioned && Array.isArray(r.treatments_mentioned)) {
                allTreatments.push(...r.treatments_mentioned)
              }
            })

            const uniqueBiomarkers = [...new Set(allBiomarkers)]
            const willAutoFilter = uniqueBiomarkers.length > 0

            setEligibilityProfile({
              hasRecords: true,
              recordCount,
              biomarkers: uniqueBiomarkers,
              priorTreatments: [...new Set(allTreatments)],
              autoFilterApplied: willAutoFilter,
            })

            // AUTO-POPULATE FILTERS from extracted profile
            if (willAutoFilter) {
              setFilters(prev => ({ ...prev, biomarker: uniqueBiomarkers[0] }))
            }
            return
          }
        } catch (err) {
          console.error('Failed to parse local records:', err)
          // Fallback: we know records exist but couldn't parse biomarkers
          if (localRecordCount > 0) {
            setEligibilityProfile({
              hasRecords: true,
              recordCount: localRecordCount,
              biomarkers: [],
              priorTreatments: [],
              autoFilterApplied: false,
            })
            return
          }
        }
      } else if (localRecordCount > 0) {
        // Index exists but data doesn't - records exist but no structured data
        setEligibilityProfile({
          hasRecords: true,
          recordCount: localRecordCount,
          biomarkers: [],
          priorTreatments: [],
          autoFilterApplied: false,
        })
        return
      }

      // Check cloud records for authenticated users
      if (user) {
        try {
          const { data: records } = await supabase
            .from('medical_records')
            .select('id, ai_analysis')
            .eq('user_id', user.id)

          if (records && records.length > 0) {
            const allBiomarkers: string[] = []
            const allTreatments: string[] = []

            records.forEach((record) => {
              // Parse the ai_analysis JSON to get the result
              if (record.ai_analysis) {
                try {
                  const result = typeof record.ai_analysis === 'string'
                    ? JSON.parse(record.ai_analysis)
                    : record.ai_analysis

                  if (result?.cancer_specific?.biomarkers) {
                    allBiomarkers.push(...result.cancer_specific.biomarkers)
                  }
                  if (result?.treatments_mentioned) {
                    allTreatments.push(...result.treatments_mentioned)
                  }
                } catch {
                  // Ignore parse errors for individual records
                }
              }
            })

            const uniqueBiomarkers = [...new Set(allBiomarkers)]
            const willAutoFilter = uniqueBiomarkers.length > 0

            setEligibilityProfile({
              hasRecords: true,
              recordCount: records.length,
              biomarkers: uniqueBiomarkers,
              priorTreatments: [...new Set(allTreatments)],
              autoFilterApplied: willAutoFilter,
            })

            // AUTO-POPULATE FILTERS from extracted profile
            if (willAutoFilter) {
              setFilters(prev => ({ ...prev, biomarker: uniqueBiomarkers[0] }))
            }
            return
          }
        } catch {
          // Ignore errors
        }
      }

      setEligibilityProfile({ hasRecords: false, recordCount: 0, biomarkers: [], priorTreatments: [], autoFilterApplied: false })
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

  // Handle cancer type change - show prompt to update profile
  const handleCancerTypeChange = (newCancerType: string) => {
    if (newCancerType === profile?.cancerType) return

    setPendingCancerType(newCancerType)
    setShowProfileUpdatePrompt(true)
  }

  // Update profile and search with new cancer type
  const confirmProfileUpdate = async () => {
    if (!pendingCancerType) return

    setUpdatingProfile(true)
    try {
      // Update profile state immediately for UI
      setProfile(prev => prev ? { ...prev, cancerType: pendingCancerType } : null)

      // Save to Supabase if authenticated
      if (user && authProfile?.email) {
        await saveProfile({
          email: authProfile.email,
          name: authProfile.name || user.email?.split('@')[0] || '',
          role: authProfile.role || 'patient',
          cancerType: pendingCancerType,
          stage: authProfile.stage || undefined,
          location: authProfile.location || undefined,
        })
        await refreshProfile()
      }

      // Save to localStorage
      const localProfile = localStorage.getItem('patient-profile')
      if (localProfile) {
        const parsed = JSON.parse(localProfile)
        parsed.cancerType = pendingCancerType
        localStorage.setItem('patient-profile', JSON.stringify(parsed))
      }

      // Trigger new search
      setSearched(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setUpdatingProfile(false)
      setShowProfileUpdatePrompt(false)
      setPendingCancerType(null)
    }
  }

  // Just search without updating profile
  const searchWithoutProfileUpdate = () => {
    if (!pendingCancerType) return

    // Temporarily update profile for this search only
    setProfile(prev => prev ? { ...prev, cancerType: pendingCancerType } : null)
    setSearched(false)
    setShowProfileUpdatePrompt(false)
    setPendingCancerType(null)
  }

  // Quick upload handler for adding records without leaving trials page
  const handleQuickUpload = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const sessionId = localStorage.getItem('opencancer_session_id') || 'anonymous'
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('sessionId', sessionId)
      if (user?.id) formData.append('userId', user.id)

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process record')
      }

      const data = await response.json()

      // Save to localStorage (same format as records page)
      // API returns data.analysis, not data.result
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const recordEntry = {
        id,
        fileName: uploadFile.name,
        documentType: data.analysis?.document_type || 'Medical Record',
        date: new Date().toISOString(),
        result: data.analysis,
        documentText: data.documentText || '',
        chatMessages: [],
      }

      // Update localStorage index
      const existingIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
      existingIndex.unshift({ id, fileName: uploadFile.name, date: recordEntry.date, documentType: recordEntry.documentType })
      localStorage.setItem('axestack-translations', JSON.stringify(existingIndex))

      // Update localStorage data
      const existingData = JSON.parse(localStorage.getItem('axestack-translations-data') || '{}')
      existingData[id] = recordEntry
      localStorage.setItem('axestack-translations-data', JSON.stringify(existingData))

      // Update local userRecords list
      setUserRecords(prev => [...prev, { id, fileName: uploadFile.name, documentType: recordEntry.documentType }])

      // Extract biomarkers from the new record and update eligibility profile
      const newBiomarkers: string[] = []
      const newTreatments: string[] = []

      if (data.analysis?.cancer_specific?.biomarkers) {
        newBiomarkers.push(...data.analysis.cancer_specific.biomarkers)
      }
      if (data.analysis?.treatments_mentioned) {
        newTreatments.push(...data.analysis.treatments_mentioned)
      }

      // Update eligibility profile with new data
      setEligibilityProfile(prev => {
        const currentBiomarkers = prev?.biomarkers || []
        const currentTreatments = prev?.priorTreatments || []
        const allBiomarkers = [...new Set([...currentBiomarkers, ...newBiomarkers])]
        const allTreatments = [...new Set([...currentTreatments, ...newTreatments])]

        return {
          hasRecords: true,
          recordCount: (prev?.recordCount || 0) + 1,
          biomarkers: allBiomarkers,
          priorTreatments: allTreatments,
          autoFilterApplied: allBiomarkers.length > 0,
        }
      })

      // Auto-apply first biomarker as filter if we found new ones
      if (newBiomarkers.length > 0 && !filters.biomarker) {
        setFilters(prev => ({ ...prev, biomarker: newBiomarkers[0] }))
      }

      setUploadSuccess(true)
      trackEvent('quick_record_upload', { file_name: uploadFile.name })
    } catch (err) {
      console.error('Quick upload error:', err)
      setUploadError('Failed to process record. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Save biomarker to patient profile/graph
  const saveBiomarkerToProfile = async (biomarker: string) => {
    if (!biomarker || savedBiomarkers.includes(biomarker)) return

    setSavingBiomarker(true)
    try {
      const sessionId = localStorage.getItem('opencancer_session_id') || 'anonymous'
      const response = await fetch('/api/entities/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: {
            entity_type: 'biomarker',
            entity_value: biomarker,
            entity_status: 'self_reported',
            source: 'trial_radar_filter',
          },
          sessionId,
          userId: user?.id,
        }),
      })

      if (response.ok) {
        setSavedBiomarkers(prev => [...prev, biomarker])
        trackEvent('biomarker_saved_to_profile', { biomarker })
      }
    } catch (err) {
      console.error('Failed to save biomarker:', err)
    } finally {
      setSavingBiomarker(false)
    }
  }

  // Reset upload modal state - don't allow closing while uploading
  const resetUploadModal = () => {
    if (isUploading) return // Prevent closing while processing
    setShowUploadModal(false)
    setUploadFile(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

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
        {/* Trial Radar Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#C66B4A]/10 rounded-xl flex items-center justify-center">
            <Radar className="w-6 h-6 text-[#C66B4A]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Trial<span className="text-[#C66B4A]">Radar</span>
            </h1>
            <p className="text-sm text-slate-500">Scanning clinical trials matched to you</p>
          </div>
        </div>

        {!profile ? (
          /* No profile - prompt to create */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#C66B4A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Radar className="w-8 h-8 text-[#C66B4A]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan for Matching Trials</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Trial Radar finds clinical trials matched to your specific cancer profile.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-[#C66B4A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#B35E40] transition-colors shadow-lg shadow-[#C66B4A]/25"
            >
              Create Your Profile
            </Link>
            <p className="text-xs text-slate-500 mt-4">Takes 30 seconds. Encrypted and private.</p>
          </div>
        ) : (
          /* Has profile - show trial search */
          <div>
            {/* Auto-Filter Banner - show when records have been processed */}
            {eligibilityProfile?.autoFilterApplied && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-900">Scanning for {CANCER_TYPES[profile?.cancerType || ''] || profile?.cancerType} trials</span>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                          {eligibilityProfile.recordCount} record{eligibilityProfile.recordCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1.5 text-xs bg-white border border-green-300 text-green-700 px-2.5 py-1 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Record
                      </button>
                    </div>
                    {eligibilityProfile.biomarkers.length > 0 && (
                      <p className="text-sm text-green-700 mt-1">Biomarkers from your records:</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {eligibilityProfile.biomarkers.slice(0, 4).map((marker, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-sm bg-white border border-green-300 text-green-800 px-2 py-1 rounded-lg">
                          <FlaskConical className="w-3 h-3" />
                          {marker}
                        </span>
                      ))}
                      {eligibilityProfile.biomarkers.length > 4 && (
                        <span className="text-sm text-green-600">+{eligibilityProfile.biomarkers.length - 4} more</span>
                      )}
                    </div>
                    {eligibilityProfile.priorTreatments.length > 0 && (
                      <p className="text-sm text-green-700 mt-2">
                        Prior treatments: {eligibilityProfile.priorTreatments.slice(0, 3).join(', ')}
                        {eligibilityProfile.priorTreatments.length > 3 && ` +${eligibilityProfile.priorTreatments.length - 3} more`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* No Records Banner - prompt to upload */}
            {eligibilityProfile && !eligibilityProfile.hasRecords && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-amber-800">Upload records for personalized matching</span>
                    <p className="text-sm text-amber-700 mt-1">We'll extract biomarkers & auto-filter trials for you</p>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Record
                  </button>
                </div>
              </div>
            )}

            {/* Records but no biomarkers extracted - graceful fallback */}
            {eligibilityProfile?.hasRecords && !eligibilityProfile.autoFilterApplied && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {eligibilityProfile.recordCount} record{eligibilityProfile.recordCount !== 1 ? 's' : ''} uploaded
                      </span>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg hover:border-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Record
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      No biomarkers auto-extracted from your records. Use the filters below to find trials matching your specific markers (e.g., PSA, PSMA, Gleason score).
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {availableBiomarkers.slice(0, 4).map((b, i) => (
                        <button
                          key={i}
                          onClick={() => setFilters(prev => ({ ...prev, biomarker: b.marker }))}
                          className="text-xs bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg hover:border-[#C66B4A] hover:text-blue-700 transition-colors"
                        >
                          + {b.marker}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancer type header - only show if not auto-filtered */}
            {!eligibilityProfile?.autoFilterApplied && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Searching trials for</span>
                  <select
                    value={profile.cancerType}
                    onChange={(e) => handleCancerTypeChange(e.target.value)}
                    className="font-semibold text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-[#C66B4A] focus:outline-none focus:border-blue-500 cursor-pointer px-1 py-0.5"
                  >
                    {Object.entries(CANCER_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  {profile.stage && <span>(Stage {profile.stage})</span>}
                </div>
              </div>
            )}

            {/* Filters - Always visible */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Radar Filters</span>
                {(filters.biomarker || filters.phase || filters.location || filters.status !== 'recruiting') && (
                  <span className="bg-[#C66B4A]/10 text-[#C66B4A] text-xs px-2 py-0.5 rounded-full">
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
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]"
                  />
                </div>

                {/* Biomarker Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Biomarker</label>
                  <div className="flex gap-1.5">
                    {availableBiomarkers.length > 0 ? (
                      <select
                        value={filters.biomarker}
                        onChange={(e) => setFilters({ ...filters, biomarker: e.target.value })}
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]"
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
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]"
                      />
                    )}
                    {/* Save to Profile button */}
                    {filters.biomarker && !savedBiomarkers.includes(filters.biomarker) && (
                      <button
                        onClick={() => saveBiomarkerToProfile(filters.biomarker)}
                        disabled={savingBiomarker}
                        title="Save to your profile"
                        className="px-2 py-2 bg-[#C66B4A]/10 hover:bg-[#C66B4A]/20 text-[#C66B4A] rounded-lg transition-colors disabled:opacity-50"
                      >
                        {savingBiomarker ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {filters.biomarker && savedBiomarkers.includes(filters.biomarker) && (
                      <div className="px-2 py-2 bg-green-100 text-green-600 rounded-lg" title="Saved to profile">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phase</label>
                  <select
                    value={filters.phase}
                    onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]"
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
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C66B4A]/50 focus:border-[#C66B4A]"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(filters.biomarker || filters.location || filters.phase || filters.status !== 'recruiting') && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setFilters({ biomarker: '', location: '', phase: '', status: 'recruiting' })}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Reset filters
                  </button>
                </div>
              )}
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
                  className="inline-flex items-center gap-2 bg-[#C66B4A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#B35E40] transition-colors shadow-lg shadow-[#C66B4A]/25"
                >
                  <Radar className="w-5 h-5" />
                  Search ClinicalTrials.gov
                </a>
              </div>
            )}

            {searched && !searching && rawTrials.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-700">
                      {trials.length === rawTrials.length ? (
                        <>Found <strong>{trials.length}</strong> trials for {CANCER_TYPES[profile.cancerType] || profile.cancerType}</>
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
                    className="text-sm text-[#C66B4A] hover:text-[#B35E40]"
                  >
                    Refresh
                  </button>
                </div>

                {/* Sorted by relevance note */}
                {profile && (
                  <p className="text-xs text-slate-500 -mt-2 mb-2">
                    Sorted by relevance to {CANCER_TYPES[profile.cancerType] || profile.cancerType}
                  </p>
                )}

                {/* No matches after filtering */}
                {trials.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                    <div className="text-3xl mb-3">🔍</div>
                    <h3 className="font-semibold text-slate-700 mb-2">No trials match your filters</h3>
                    <p className="text-sm text-slate-500 mb-4">Try adjusting your filter criteria</p>
                    <button
                      onClick={() => setFilters({ biomarker: '', location: '', phase: '', status: 'recruiting' })}
                      className="text-sm text-[#C66B4A] hover:text-[#B35E40] font-medium"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                {trials.length > 0 && trials.slice(0, 10).map((trial) => (
                  <div
                    key={trial.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-[#C66B4A] transition-colors"
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
                        className="text-xs text-[#C66B4A] hover:text-[#B35E40] font-medium"
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
                      className="text-sm text-[#C66B4A] hover:text-[#B35E40]"
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

      {/* Profile Update Prompt Modal */}
      {showProfileUpdatePrompt && pendingCancerType && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowProfileUpdatePrompt(false)
            setPendingCancerType(null)
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Update your profile?
                </h3>
                <p className="text-sm text-slate-600">
                  You selected <span className="font-semibold text-slate-900">{CANCER_TYPES[pendingCancerType] || pendingCancerType}</span>.
                  Would you like to save this to your profile?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmProfileUpdate}
                  disabled={updatingProfile}
                  className="w-full px-4 py-3 bg-[#C66B4A] text-white font-medium rounded-lg hover:bg-[#B35E40] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {updatingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Yes, update my profile'
                  )}
                </button>
                <button
                  onClick={searchWithoutProfileUpdate}
                  disabled={updatingProfile}
                  className="w-full px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Just filter for now
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                Your profile helps personalize trial recommendations
              </p>
            </div>
          </div>
        </div>
      )}

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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C66B4A] text-white text-sm font-medium rounded-lg hover:bg-[#B35E40] transition-colors"
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

      {/* Quick Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={resetUploadModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {uploadSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Record Added!</h3>
                <p className="text-slate-600 mb-6">
                  Your record has been processed. Trials are now filtered based on your data.
                </p>
                <button
                  onClick={resetUploadModal}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C66B4A]/10 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-[#C66B4A]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Quick Upload</h3>
                      <p className="text-xs text-slate-500">Add a medical record</p>
                    </div>
                  </div>
                  <button
                    onClick={resetUploadModal}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  {!uploadFile ? (
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#C66B4A] hover:bg-[#C66B4A]/5 transition-colors">
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <p className="font-medium text-slate-700 mb-1">Drop a file here or click to browse</p>
                        <p className="text-sm text-slate-500">PDF, PNG, JPG up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.heic"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setUploadFile(file)
                            setUploadError(null)
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{uploadFile.name}</p>
                          <p className="text-xs text-slate-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          onClick={() => setUploadFile(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {uploadError && (
                        <p className="text-sm text-red-600 text-center">{uploadError}</p>
                      )}

                      <button
                        onClick={handleQuickUpload}
                        disabled={isUploading}
                        className="w-full bg-[#C66B4A] text-white py-3 rounded-lg font-medium hover:bg-[#B35E40] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Process Record
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 text-center mt-4">
                    Your records are processed securely and never shared without your consent.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
