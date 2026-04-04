'use client'

import { useState, useEffect } from 'react'

interface UsageData {
  summary: {
    totalCalls: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    estimatedCostUsd: string
    successRate: number
  }
  byOperation: Array<{ operation: string; count: number; tokens: number; cost: number }>
  byModel: Array<{ model: string; count: number; tokens: number; cost: number }>
  byFileType: Array<{ fileType: string; count: number; tokens: number; cost: number }>
  dailyUsage: Array<{ date: string; calls: number; tokens: number; cost: number }>
  recentCalls: Array<{
    id: string
    operation: string
    model: string
    inputTokens: number
    outputTokens: number
    cost: number
    fileType: string
    success: boolean
    createdAt: string
  }>
  message?: string
}

interface AnalyticsData {
  period: string
  summary: {
    totalPageViews: number
    uniqueSessions: number
    askQuestions: number
    recordsUploaded: number
    checklistViews: number
    trialsSearches: number
    profileCreations: number
    totalProfiles: number
    avgRecordsPerUser: number
    avgRecordsPerSession: number
    usersWithRecords: number
    sessionsWithRecords: number
    combatAnalyses: number
  }
  combatStats?: {
    total: number
    diagnosis: number
    treatment: number
    avgEvidenceStrength: number
    byCancerType: Record<string, number>
    recentCombats: Array<{
      phase: string
      cancerType: string
      recordsCount: number
      evidenceStrength: number
      createdAt: string
    }>
  }
  sharingStats?: {
    totalShares: number
    byTool: Array<{ tool: string; count: number }>
    byMethod: Array<{ method: string; count: number }>
  }
  referralStats?: {
    totalReferralArrivals: number
    uniqueReferralSessions: number
    bySource: Array<{ source: string; count: number }>
  }
  roleBreakdown?: {
    caregivers: number
    patients: number
    ratio: string
  }
  pageViewsByPath: Array<{ path: string; count: number }>
  eventsByType: Array<{ type: string; count: number }>
  trafficSources: Array<{ source: string; count: number }>
  deviceTypes: Array<{ device: string; count: number }>
  dailyBreakdown: Array<{
    date: string
    views: number
    sessions: number
    events: Record<string, number>
  }>
  recentEvents: Array<{
    type: string
    path: string
    timestamp: string
    sessionId: string
    metadata?: Record<string, unknown>
  }>
  drillDown?: {
    questions: Array<{
      timestamp: string
      sessionId: string
      question: string
      cancerType: string
    }>
  }
}

interface ProfileData {
  id: string
  email: string
  name: string
  role: 'patient' | 'caregiver'
  cancerType: string
  stage: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

interface ProfilesData {
  total: number
  aggregates: {
    cancerTypes: Array<{ name: string; count: number }>
    stages: Array<{ name: string; count: number }>
    roles: Array<{ name: string; count: number }>
    locations: Array<{ name: string; count: number }>
  }
  profiles: ProfileData[]
}

interface UserStats {
  userId: string
  email: string
  stats: {
    totalEvents: number
    recordsUploaded: number
    questionsAsked: number
    pageViews: number
    combatRuns: number
    trialSearches: number
    uniqueSessions: number
    firstActivity: string | null
    lastActivity: string | null
  }
  deviceInfo?: {
    primary: string
    all: Array<{ device: string; count: number }>
  }
  trafficInfo?: {
    primary: string
    all: Array<{ source: string; count: number }>
  }
  pagesVisited: Array<{ path: string; count: number }>
  recentActivity: Array<{
    type: string
    path: string
    timestamp: string
    metadata?: Record<string, unknown>
  }>
  combatAnalyses: Array<{
    phase: string
    createdAt: string
    evidenceStrength: number
    cancerType: string
    recordsCount: number
  }>
}

interface ActivityGraphData {
  period: string
  summary: {
    totalActivities: number
    uniqueUsers: number
    activityTypes: number
  }
  activityCounts: Array<{ type: string; count: number }>
  funnel: {
    recordUploaders: number
    askers: number
    combatUsers: number
    feedbackGivers: number
    recordThenAsk: number
    recordThenCombat: number
  }
  funnelSteps: Array<{
    name: string
    count: number
    dropoffRate: number
    conversionRate: number
    percentOfTotal: number
  }>
  timeToAction: {
    uploadToQuestion: { avgHours: number | null; sampleSize: number }
    questionToCombat: { avgHours: number | null; sampleSize: number }
    uploadToCombat: { avgHours: number | null; sampleSize: number }
  }
  idleUsersCount: number
  pathsToCombat: Array<{ path: string; count: number }>
  behavioralPatterns: Array<{
    from: string
    to: string
    connection_count: number
    avg_time_hours: number
    unique_patients: number
  }>
  highIntentPatients: Array<{
    user_id: string
    total_activities: number
    distinct_activity_types: number
    first_activity: string
    last_activity: string
  }>
  dailyBreakdown: Array<{
    date: string
    total: number
    [key: string]: string | number
  }>
  recentActivities: Array<{
    type: string
    user: string
    timestamp: string
    metadata?: Record<string, unknown>
  }>
}

interface WinbackData {
  total: number
  totalReal: number
  users: Array<{
    id: string
    email: string
    created_at: string
    last_sign_in: string | null
    record_uploads: number
  }>
  summary: {
    totalUploaders: number
    totalCombatUsers: number
    dropoffRate: number
  }
}

interface EntityGraphData {
  stats: {
    patient_count: number
    diagnosis_count: number
    biomarker_count: number
    treatment_count: number
    record_count: number
    question_count: number
    total_edges: number
    similar_patient_pairs: number
  }
  topEntities: {
    diagnoses: Array<{ name: string; count: number }>
    biomarkers: Array<{ name: string; count: number }>
    treatments: Array<{ name: string; count: number }>
  }
  crossTab: Array<{
    diagnosis: string
    patientCount: number
    topBiomarkers: Array<{ name: string; count: number }>
    topTreatments: Array<{ name: string; count: number }>
  }>
  cooccurrence: Array<{
    entity_a: string
    entity_b: string
    patient_count: number
  }>
  similarPatients: Array<{
    patientA: string
    patientB: string
    sharedEntities: number
    sharedValues: string[]
    similarity: number
  }>
  recentEdges: Array<{
    from: string
    relationship: string
    to: string
    when: string
  }>
}

interface PatientTimelineData {
  patientId: string
  patientEmail: string
  timeline: Array<{
    timestamp: string
    type: 'entity' | 'activity' | 'record'
    category: string
    value: string
    source?: string
    metadata?: Record<string, unknown>
  }>
  entitySummary: Record<string, string[]>
  stats: {
    totalEntities: number
    totalActivities: number
    totalRecords: number
    entityTypes: string[]
    firstEvent: string
    lastEvent: string
  }
}

interface PatientListData {
  patients: Array<{
    id: string
    email: string
    entityCount: number
    entityTypes: string[]
    firstSeen: string | null
    lastSeen: string | null
  }>
  totalPatients: number
  totalEntities: number
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [profilesData, setProfilesData] = useState<ProfilesData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [activityGraphData, setActivityGraphData] = useState<ActivityGraphData | null>(null)
  const [entityGraphData, setEntityGraphData] = useState<EntityGraphData | null>(null)
  const [winbackData, setWinbackData] = useState<WinbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminKey, setAdminKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState<'analytics' | 'profiles' | 'usage' | 'activity' | 'entity'>('analytics')
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loadingUserStats, setLoadingUserStats] = useState(false)
  const [showQuestionsDrillDown, setShowQuestionsDrillDown] = useState(false)
  const [showUploaderEmails, setShowUploaderEmails] = useState(false)

  // Entity Graph enhanced state
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null)
  const [journeyStage, setJourneyStage] = useState<'all' | 'newly-diagnosed' | 'treatment-experienced' | 'recurrence'>('all')

  // Patient Timeline state
  const [patientListData, setPatientListData] = useState<PatientListData | null>(null)
  const [patientTimelineData, setPatientTimelineData] = useState<PatientTimelineData | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [timelineFilters, setTimelineFilters] = useState<{
    entities: boolean
    activities: boolean
    records: boolean
    diagnosis: boolean
    biomarker: boolean
    treatment: boolean
  }>({
    entities: true,
    activities: true,
    records: true,
    diagnosis: true,
    biomarker: true,
    treatment: true
  })

  // Standard of Care treatments by cancer type - non-SOC treatments are everything else
  // This is the pharma signal: non-SOC = treatment-experienced looking for what's next
  const SOC_TREATMENTS: Record<string, string[]> = {
    'prostate': [
      'adt', 'androgen deprivation therapy', 'lhrh', 'gnrh',
      'enzalutamide', 'abiraterone', 'darolutamide', 'apalutamide',
      'docetaxel', 'cabazitaxel', 'radiation', 'ebrt', 'external beam',
      'radical prostatectomy', 'prostatectomy', 'surgery',
      'sipuleucel-t', 'provenge', 'radium-223', 'xofigo',
      'lutetium', 'pluvicto', 'psma',
      'sbrt', 'stereotactic', // SBRT is SOC for localized/oligometastatic prostate
      'olaparib', 'rucaparib', 'niraparib', 'talazoparib' // PARP inhibitors for BRCA+ mCRPC
    ],
    'breast': [
      'tamoxifen', 'letrozole', 'anastrozole', 'exemestane',
      'trastuzumab', 'herceptin', 'pertuzumab', 'perjeta',
      'paclitaxel', 'doxorubicin', 'cyclophosphamide',
      'mastectomy', 'lumpectomy', 'radiation', 'sbrt',
      'palbociclib', 'ribociclib', 'abemaciclib',
      'olaparib', 'talazoparib'
    ],
    'lung': [
      'pembrolizumab', 'keytruda', 'nivolumab', 'opdivo',
      'carboplatin', 'cisplatin', 'pemetrexed',
      'osimertinib', 'tagrisso', 'alectinib',
      'lobectomy', 'pneumonectomy', 'radiation', 'sbrt'
    ],
    'default': [
      'chemotherapy', 'radiation', 'surgery', 'immunotherapy',
      'hormone therapy', 'sbrt'
    ]
  }

  // Clinical pattern detection - identify coherent clinical stories
  const DNA_REPAIR_GENES = ['brca1', 'brca2', 'atm', 'chek2', 'palb2', 'rad51', 'fanca', 'nbn']

  const detectClinicalPatterns = (biomarkers: Array<{name: string; count: number}>, treatments: Array<{name: string; count: number}>) => {
    const patterns: Array<{type: string; description: string; recommendation: string; centers: string[]}> = []
    const biomarkerNames = biomarkers.map(b => b.name.toLowerCase())

    // DNA repair deficiency pattern
    const dnaRepairMutations = biomarkerNames.filter(b =>
      DNA_REPAIR_GENES.some(gene => b.includes(gene))
    )
    if (dnaRepairMutations.length >= 2) {
      patterns.push({
        type: 'DNA Repair Deficiency',
        description: `${dnaRepairMutations.length} DNA repair pathway mutations detected (${dnaRepairMutations.slice(0, 3).join(', ')}). This profile suggests HRD (homologous recombination deficiency).`,
        recommendation: 'Consider PARP inhibitor sensitivity panel if not already done. PARP inhibitors (olaparib, rucaparib) may be relevant.',
        centers: ['MD Anderson Cancer Center', 'Memorial Sloan Kettering', 'Johns Hopkins Sidney Kimmel']
      })
    }

    // AR-driven pattern for prostate
    if (biomarkerNames.some(b => b.includes('ar ') || b.includes('androgen receptor'))) {
      patterns.push({
        type: 'AR-Driven Disease',
        description: 'Androgen receptor involvement detected. May indicate sensitivity to next-gen AR pathway inhibitors.',
        recommendation: 'Consider AR-V7 testing if on enzalutamide/abiraterone resistance.',
        centers: ['Johns Hopkins', 'UCSF', 'Dana-Farber']
      })
    }

    return patterns
  }

  // Recommended tests based on biomarker profile
  const getRecommendedTests = (biomarkers: Array<{name: string; count: number}>) => {
    const tests: Array<{test: string; reason: string}> = []
    const biomarkerNames = biomarkers.map(b => b.name.toLowerCase())

    // BRCA mutations → PARP sensitivity
    if (biomarkerNames.some(b => b.includes('brca'))) {
      tests.push({ test: 'PARP Inhibitor Sensitivity Panel', reason: 'BRCA mutation detected' })
    }

    // ATM mutations → ATR inhibitor eligibility
    if (biomarkerNames.some(b => b.includes('atm'))) {
      tests.push({ test: 'ATR Inhibitor Trial Eligibility', reason: 'ATM kinase mutation detected' })
    }

    // MSI/MMR status
    if (biomarkerNames.some(b => b.includes('msi') || b.includes('mmr') || b.includes('mlh') || b.includes('msh'))) {
      tests.push({ test: 'Pembrolizumab Eligibility (MSI-H)', reason: 'MMR/MSI marker detected' })
    }

    // If no specific biomarkers, suggest comprehensive testing
    if (tests.length === 0 && biomarkers.length > 0) {
      tests.push({ test: 'Comprehensive Genomic Profiling (Foundation/Tempus)', reason: 'Further characterization recommended' })
    }

    return tests
  }

  const isStandardOfCare = (treatment: string, diagnoses: string[]): boolean => {
    const treatmentLower = treatment.toLowerCase()

    // Detect cancer type from diagnoses
    let cancerType = 'default'
    for (const diag of diagnoses) {
      const diagLower = diag.toLowerCase()
      if (diagLower.includes('prostate')) cancerType = 'prostate'
      else if (diagLower.includes('breast')) cancerType = 'breast'
      else if (diagLower.includes('lung') || diagLower.includes('nsclc') || diagLower.includes('sclc')) cancerType = 'lung'
    }

    const socList = SOC_TREATMENTS[cancerType] || SOC_TREATMENTS['default']
    return socList.some(soc => treatmentLower.includes(soc))
  }

  // Get co-occurring entities for selected diagnosis
  const getCoOccurringEntities = () => {
    if (!selectedDiagnosis || !entityGraphData?.crossTab) return null
    return entityGraphData.crossTab.find(row => row.diagnosis === selectedDiagnosis)
  }

  // Generate pharma-valuable insights from graph data
  const generateInsights = (): string[] => {
    const insights: string[] = []
    if (!entityGraphData) return insights

    const { topEntities, crossTab } = entityGraphData
    const diagnoses = topEntities?.diagnoses?.map(d => d.name) || []

    // Calculate non-SOC percentage
    const treatments = topEntities?.treatments || []
    if (treatments.length > 0) {
      const nonSocCount = treatments.filter(t => !isStandardOfCare(t.name, diagnoses)).length
      const nonSocPercent = Math.round((nonSocCount / treatments.length) * 100)
      if (nonSocPercent > 50) {
        insights.push(`${nonSocPercent}% of tracked treatments are non-standard-of-care — these are treatment-experienced patients actively seeking alternatives.`)
      }
    }

    // Top diagnosis insight
    const topDiagnosis = topEntities?.diagnoses?.[0]
    if (topDiagnosis) {
      const crossTabRow = crossTab?.find(row => row.diagnosis.includes(topDiagnosis.name) || topDiagnosis.name.includes(row.diagnosis))
      if (crossTabRow && crossTabRow.topBiomarkers.length > 0) {
        const topBiomarker = crossTabRow.topBiomarkers[0]
        insights.push(`${topDiagnosis.name} patients are most commonly tracked for ${topBiomarker.name} status.`)
      }
    }

    // Biomarker-treatment correlation
    const psa = topEntities?.biomarkers?.find(b => b.name.toLowerCase() === 'psa')
    if (psa && psa.count > 2) {
      insights.push(`PSA tracking is present in ${psa.count} patient profiles — strong engagement with disease monitoring.`)
    }

    return insights
  }

  const fetchAnalytics = async (key: string, numDays: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?days=${numDays}`, {
        headers: { 'x-admin-key': key }
      })
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized. Check admin key.')
          setIsAuthenticated(false)
          return
        }
        throw new Error('Failed to fetch analytics')
      }
      const json = await res.json()
      setData(json)
      setIsAuthenticated(true)
      // Save key to localStorage for convenience
      localStorage.setItem('opencancer_admin_key', key)
      // Also fetch profiles, usage, and activity graph
      fetchProfiles(key)
      fetchUsage(key, numDays)
      fetchActivityGraph(key, numDays)
      fetchEntityGraph(key)
      fetchWinback(key)
      fetchPatientList(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async (key: string) => {
    try {
      const res = await fetch('/api/admin/profiles', {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setProfilesData(json)
      }
    } catch (err) {
      console.error('Error fetching profiles:', err)
    }
  }

  const fetchUsage = async (key: string, numDays: number) => {
    try {
      const res = await fetch(`/api/admin/usage?days=${numDays}`, {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setUsageData(json)
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
    }
  }

  const fetchActivityGraph = async (key: string, numDays: number) => {
    try {
      const res = await fetch(`/api/admin/activity-graph?days=${numDays}`, {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setActivityGraphData(json)
      }
    } catch (err) {
      console.error('Error fetching activity graph:', err)
    }
  }

  const fetchWinback = async (key: string) => {
    try {
      const res = await fetch('/api/admin/winback', {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setWinbackData(json)
      }
    } catch (err) {
      console.error('Error fetching winback:', err)
    }
  }

  const fetchEntityGraph = async (key: string) => {
    try {
      const res = await fetch('/api/admin/entity-graph', {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setEntityGraphData(json)
      }
    } catch (err) {
      console.error('Error fetching entity graph:', err)
    }
  }

  const fetchUserStats = async (profile: ProfileData) => {
    setSelectedProfile(profile)
    setLoadingUserStats(true)
    setUserStats(null)
    try {
      const res = await fetch(`/api/admin/user-stats?userId=${profile.id}&email=${encodeURIComponent(profile.email)}`, {
        headers: { 'x-admin-key': adminKey }
      })
      if (res.ok) {
        const json = await res.json()
        setUserStats(json)
      }
    } catch (err) {
      console.error('Error fetching user stats:', err)
    } finally {
      setLoadingUserStats(false)
    }
  }

  const fetchPatientList = async (key: string) => {
    try {
      const res = await fetch('/api/admin/patient-timeline', {
        headers: { 'x-admin-key': key }
      })
      if (res.ok) {
        const json = await res.json()
        setPatientListData(json)
      }
    } catch (err) {
      console.error('Error fetching patient list:', err)
    }
  }

  const fetchPatientTimeline = async (patientId: string) => {
    setLoadingTimeline(true)
    setSelectedPatientId(patientId)
    try {
      const res = await fetch(`/api/admin/patient-timeline?patientId=${patientId}`, {
        headers: { 'x-admin-key': adminKey }
      })
      if (res.ok) {
        const json = await res.json()
        setPatientTimelineData(json)
      }
    } catch (err) {
      console.error('Error fetching patient timeline:', err)
    } finally {
      setLoadingTimeline(false)
    }
  }

  // Filter timeline events based on current filters
  const getFilteredTimeline = () => {
    if (!patientTimelineData?.timeline) return []
    return patientTimelineData.timeline.filter(event => {
      // Filter by event type
      if (event.type === 'entity' && !timelineFilters.entities) return false
      if (event.type === 'activity' && !timelineFilters.activities) return false
      if (event.type === 'record' && !timelineFilters.records) return false
      // Filter by entity category
      if (event.type === 'entity') {
        if (event.category === 'diagnosis' && !timelineFilters.diagnosis) return false
        if (event.category === 'biomarker' && !timelineFilters.biomarker) return false
        if (event.category === 'treatment' && !timelineFilters.treatment) return false
      }
      return true
    })
  }

  // Generate pattern insights from timeline
  const getTimelinePatterns = () => {
    if (!patientTimelineData?.timeline) return []
    const patterns: Array<{ type: string; description: string; recommendation?: string }> = []
    const biomarkers = patientTimelineData.entitySummary?.biomarker || []
    const treatments = patientTimelineData.entitySummary?.treatment || []

    // DNA repair deficiency
    const dnaRepairMutations = biomarkers.filter(b =>
      DNA_REPAIR_GENES.some(gene => b.toLowerCase().includes(gene))
    )
    if (dnaRepairMutations.length >= 2) {
      patterns.push({
        type: 'DNA Repair Deficiency',
        description: `${dnaRepairMutations.length} DNA repair pathway mutations: ${dnaRepairMutations.slice(0, 3).join(', ')}`,
        recommendation: 'PARP inhibitor sensitivity panel recommended. May qualify for olaparib/rucaparib.'
      })
    }

    // Non-SOC treatments
    const diagnoses = patientTimelineData.entitySummary?.diagnosis || []
    const nonSocTreatments = treatments.filter(t => !isStandardOfCare(t, diagnoses))
    if (nonSocTreatments.length > 0) {
      patterns.push({
        type: 'Treatment-Experienced',
        description: `${nonSocTreatments.length} non-standard treatments: ${nonSocTreatments.slice(0, 3).join(', ')}`,
        recommendation: 'Patient may be seeking alternatives. Clinical trial eligibility worth reviewing.'
      })
    }

    return patterns
  }

  useEffect(() => {
    // Try to load saved admin key
    const savedKey = localStorage.getItem('opencancer_admin_key')
    if (savedKey) {
      setAdminKey(savedKey)
      fetchAnalytics(savedKey, days)
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAnalytics(adminKey, days)
  }

  const handleDaysChange = (newDays: number) => {
    setDays(newDays)
    if (adminKey) {
      fetchAnalytics(adminKey, newDays)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('opencancer_admin_key')
    setIsAuthenticated(false)
    setAdminKey('')
    setData(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
              className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4"
            />
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">{
              activeTab === 'analytics' ? (data?.period || `Last ${days} days`) :
              activeTab === 'usage' ? `API cost: $${usageData?.summary?.estimatedCostUsd || '0.00'} (${days} days)` :
              activeTab === 'activity' ? `${activityGraphData?.summary?.totalActivities || 0} activities from ${activityGraphData?.summary?.uniqueUsers || 0} users` :
              `${profilesData?.total || 0} profiles`
            }</p>
          </div>
          <div className="flex items-center gap-4">
            {(activeTab === 'analytics' || activeTab === 'activity') && (
              <select
                value={days}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            )}
            <button
              onClick={() => { fetchAnalytics(adminKey, days); fetchProfiles(adminKey); fetchUsage(adminKey, days); fetchActivityGraph(adminKey, days); fetchEntityGraph(adminKey); fetchWinback(adminKey); }}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'profiles'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Profiles {profilesData?.total ? `(${profilesData.total})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'usage'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            API Usage {usageData?.summary?.totalCalls ? `($${usageData.summary.estimatedCostUsd})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'activity'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            🔥 Activity Graph {activityGraphData?.summary?.totalActivities ? `(${activityGraphData.summary.totalActivities})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('entity')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === 'entity'
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            🕸️ Entity Graph {entityGraphData?.stats?.total_edges ? `(${entityGraphData.stats.total_edges} edges)` : ''}
          </button>
          <a
            href="/admin/graph"
            className="px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap text-slate-500 border-transparent hover:text-slate-700 flex items-center gap-1"
          >
            🕸️ Knowledge Graph
          </a>
          <a
            href="/admin/evals"
            className="px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap text-slate-500 border-transparent hover:text-slate-700 flex items-center gap-1"
          >
            📊 Navis Evals
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        ) : activeTab === 'usage' ? (
          /* Usage Tab */
          <div className="space-y-6">
            {usageData?.message && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                {usageData.message}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-900">{usageData?.summary?.totalCalls || 0}</p>
                <p className="text-xs text-slate-500">API Calls</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-blue-600">{((usageData?.summary?.totalInputTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Input Tokens</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-purple-600">{((usageData?.summary?.totalOutputTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Output Tokens</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-emerald-600">{((usageData?.summary?.totalTokens || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Total Tokens</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl shadow p-4 border border-violet-200">
                <p className="text-2xl font-bold text-violet-700">${usageData?.summary?.estimatedCostUsd || '0.00'}</p>
                <p className="text-xs text-violet-600 font-medium">Est. Cost</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-900">{usageData?.summary?.successRate || 100}%</p>
                <p className="text-xs text-slate-500">Success Rate</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* By Operation */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By Operation</h3>
                {!usageData?.byOperation?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byOperation.map((item) => (
                      <div key={item.operation} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="text-sm text-slate-700 capitalize">{item.operation}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Model */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By Model</h3>
                {!usageData?.byModel?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byModel.map((item) => (
                      <div key={item.model} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 truncate max-w-[120px]" title={item.model}>
                          {item.model.replace('claude-', '').replace(/-20\d{6}/, '')}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By File Type */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">By File Type</h3>
                {!usageData?.byFileType?.length ? (
                  <p className="text-slate-500 text-sm">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {usageData.byFileType.map((item) => (
                      <div key={item.fileType} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 capitalize">{item.fileType || 'unknown'}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                          <span className="text-xs text-slate-400 ml-2">${item.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Usage Chart */}
            {usageData?.dailyUsage && usageData.dailyUsage.length > 0 && (() => {
              const chartData = usageData.dailyUsage.slice(0, 14).reverse()
              const maxCost = Math.max(...chartData.map(d => d.cost), 0.01)

              return (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Cost (14 days)</h3>
                  <div className="flex items-end gap-1 h-32">
                    {chartData.map((day) => (
                      <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-gradient-to-t from-violet-500 to-fuchsia-400 rounded-t hover:from-violet-600 hover:to-fuchsia-500 transition-colors cursor-pointer"
                          style={{ height: `${(day.cost / maxCost) * 100}%`, minHeight: day.cost > 0 ? '4px' : '0' }}
                        />
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {day.date.slice(5)}: ${day.cost.toFixed(4)} ({day.calls} calls)
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Total: ${chartData.reduce((sum, d) => sum + d.cost, 0).toFixed(4)} | {chartData.reduce((sum, d) => sum + d.calls, 0)} calls
                  </p>
                </div>
              )
            })()}

            {/* Recent Calls Table */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent API Calls</h3>
              {!usageData?.recentCalls?.length ? (
                <p className="text-slate-500 text-sm">No API calls yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Operation</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Model</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Input</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Output</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Cost</th>
                        <th className="text-center py-2 px-2 font-medium text-slate-600">Status</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageData.recentCalls.map((call) => (
                        <tr key={call.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium capitalize">
                              {call.operation}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-600 text-xs font-mono">
                            {call.model?.replace('claude-', '').replace(/-20\d{6}/, '') || 'unknown'}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{(call.inputTokens || 0).toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-slate-700 tabular-nums">{(call.outputTokens || 0).toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-slate-900 font-medium tabular-nums">${call.cost?.toFixed(4) || '0.0000'}</td>
                          <td className="py-2 px-2 text-center">
                            {call.success ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Success" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Failed" />
                            )}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimestamp(call.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'activity' ? (
          /* Activity Graph Tab */
          <div className="space-y-6">
            {/* FUNNEL VIEW - The Main Event */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-xl p-6 text-white">
              <h2 className="text-lg font-semibold mb-1">📊 Conversion Funnel</h2>
              <p className="text-xs text-slate-400 mb-6">Your daily health metric — where users drop off</p>

              {/* Funnel Steps */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-6">
                {activityGraphData?.funnelSteps?.map((step, i) => (
                  <div key={step.name} className="flex-1 flex flex-col items-center">
                    {/* Step */}
                    <div className={`w-full rounded-lg p-4 text-center ${
                      i === 0 ? 'bg-violet-600' :
                      i === 1 ? 'bg-blue-600' :
                      i === 2 ? 'bg-emerald-600' :
                      i === 3 ? 'bg-orange-600' :
                      'bg-pink-600'
                    }`} style={{
                      width: `${Math.max(40, step.percentOfTotal)}%`,
                      minWidth: '100%'
                    }}>
                      <p className="text-2xl font-bold">{step.count}</p>
                      <p className="text-xs opacity-90">{step.name}</p>
                      <p className="text-xs opacity-70">{step.percentOfTotal}% of total</p>
                    </div>
                    {/* Arrow and drop-off */}
                    {i < (activityGraphData?.funnelSteps?.length || 0) - 1 && (
                      <div className="flex items-center gap-1 my-2 sm:hidden">
                        <span className="text-slate-500">↓</span>
                        <span className={`text-xs font-medium ${step.dropoffRate > 50 ? 'text-red-400' : 'text-slate-400'}`}>
                          -{activityGraphData?.funnelSteps?.[i + 1]?.dropoffRate || 0}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Drop-off indicators (desktop) */}
              <div className="hidden sm:flex justify-between px-8 -mt-2 mb-4">
                {activityGraphData?.funnelSteps?.slice(1).map((step, i) => (
                  <div key={i} className="text-center flex-1">
                    <span className={`text-sm font-semibold ${step.dropoffRate > 50 ? 'text-red-400' : step.dropoffRate > 25 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      ↓ {step.dropoffRate}% drop
                    </span>
                  </div>
                ))}
              </div>

              {/* The Problem Callout */}
              {activityGraphData?.funnelSteps && activityGraphData.funnelSteps.length >= 4 && (
                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 mt-4">
                  <p className="text-sm">
                    <span className="font-bold text-red-400">🚨 96% drop-off</span>
                    <span className="text-slate-300 ml-2">
                      from Upload ({activityGraphData.funnelSteps[1]?.count}) → Combat ({activityGraphData.funnelSteps[3]?.count})
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {activityGraphData.idleUsersCount || 0} users idle &gt;24h after upload — intervention targets
                  </p>
                </div>
              )}
            </div>

            {/* Time to Action + Paths to Combat */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Time to Action */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">⏱️ Time to Action</h2>
                <p className="text-xs text-slate-500 mb-4">Average hours between key steps — your intervention windows</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Upload → Question</p>
                      <p className="text-xs text-slate-500">n={activityGraphData?.timeToAction?.uploadToQuestion?.sampleSize || 0}</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {activityGraphData?.timeToAction?.uploadToQuestion?.avgHours != null
                        ? `${activityGraphData.timeToAction.uploadToQuestion.avgHours}h`
                        : '—'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Question → Combat</p>
                      <p className="text-xs text-slate-500">n={activityGraphData?.timeToAction?.questionToCombat?.sampleSize || 0}</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {activityGraphData?.timeToAction?.questionToCombat?.avgHours != null
                        ? `${activityGraphData.timeToAction.questionToCombat.avgHours}h`
                        : '—'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Upload → Combat (direct)</p>
                      <p className="text-xs text-slate-500">n={activityGraphData?.timeToAction?.uploadToCombat?.sampleSize || 0}</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-700">
                      {activityGraphData?.timeToAction?.uploadToCombat?.avgHours != null
                        ? `${activityGraphData.timeToAction.uploadToCombat.avgHours}h`
                        : '—'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 italic">⚠️ Nudge window: If no action in 24h, they probably won&apos;t act without intervention</p>
                </div>
              </div>

              {/* Paths to Combat */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">🎯 Paths to Combat</h2>
                <p className="text-xs text-slate-500 mb-4">What activity precedes Combat? This is the behavior to engineer.</p>
                {!activityGraphData?.pathsToCombat?.length ? (
                  <p className="text-slate-500 text-sm">No Combat runs yet — this is the problem</p>
                ) : (
                  <div className="space-y-2">
                    {activityGraphData.pathsToCombat.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-700">{p.path.replace('_', ' ')}</span>
                        <span className="text-sm font-semibold text-orange-600">{p.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Original Summary Cards (condensed) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-slate-900">{activityGraphData?.summary?.totalActivities || 0}</p>
                <p className="text-xs text-slate-500">Activities</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-violet-600">{activityGraphData?.summary?.uniqueUsers || 0}</p>
                <p className="text-xs text-slate-500">Users</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-blue-600">{activityGraphData?.funnel?.recordUploaders || 0}</p>
                <p className="text-xs text-slate-500">Uploaders</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-emerald-600">{activityGraphData?.funnel?.askers || 0}</p>
                <p className="text-xs text-slate-500">Askers</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-orange-600">{activityGraphData?.funnel?.combatUsers || 0}</p>
                <p className="text-xs text-slate-500">Combat</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3">
                <p className="text-lg font-bold text-pink-600">{activityGraphData?.funnel?.feedbackGivers || 0}</p>
                <p className="text-xs text-slate-500">Feedback</p>
              </div>
            </div>

            {/* Winback List - Users who uploaded but never ran Combat */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">🎯 Winback List</h2>
                  <p className="text-xs text-slate-500">Users who uploaded records but never ran Combat</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{winbackData?.totalReal || 0}</p>
                  <p className="text-xs text-slate-500">{winbackData?.summary?.dropoffRate || 0}% drop-off rate</p>
                </div>
              </div>

              {!winbackData?.users?.length ? (
                <p className="text-slate-500 text-sm">No winback users found</p>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-orange-50">
                        <tr className="border-b border-orange-200">
                          <th className="text-left py-2 px-2 font-medium text-slate-600">Email</th>
                          <th className="text-right py-2 px-2 font-medium text-slate-600">Uploads</th>
                          <th className="text-right py-2 px-2 font-medium text-slate-600">Signed Up</th>
                          <th className="text-right py-2 px-2 font-medium text-slate-600">Last Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {winbackData.users.map((user) => (
                          <tr key={user.id} className="border-b border-orange-100 hover:bg-white/50">
                            <td className="py-2 px-2 text-slate-900">{user.email}</td>
                            <td className="py-2 px-2 text-right font-semibold text-orange-600 tabular-nums">{user.record_uploads}</td>
                            <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimestamp(user.created_at)}</td>
                            <td className="py-2 px-2 text-right text-slate-500 text-xs">{user.last_sign_in ? formatTimestamp(user.last_sign_in) : 'Never'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-white/80 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">📧 Outreach Template:</p>
                    <p className="text-xs text-slate-600 italic">&quot;You uploaded your records to OpenCancer but haven&apos;t tried Combat yet - it runs an AI tumor board analysis on your case in one click. Want to give it a shot?&quot;</p>
                  </div>
                </>
              )}
            </div>

            {/* Activity Counts by Type */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity by Type</h2>
                {!activityGraphData?.activityCounts?.length ? (
                  <p className="text-slate-500 text-sm">No activity data yet</p>
                ) : (
                  <div className="space-y-3">
                    {activityGraphData.activityCounts.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            item.type === 'record_upload' ? 'bg-emerald-500' :
                            item.type === 'ask_question' ? 'bg-blue-500' :
                            item.type === 'combat_run' ? 'bg-orange-500' :
                            item.type === 'thumbs_up' ? 'bg-green-500' :
                            item.type === 'thumbs_down' ? 'bg-red-500' :
                            'bg-slate-400'
                          }`} />
                          <span className="text-sm text-slate-700">{formatEventType(item.type)}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Behavioral Patterns */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">🔗 Behavioral Patterns</h2>
                <p className="text-xs text-slate-500 mb-3">Activity sequences within 48 hours</p>
                {!activityGraphData?.behavioralPatterns?.length ? (
                  <p className="text-slate-500 text-sm">No patterns detected yet</p>
                ) : (
                  <div className="space-y-2">
                    {activityGraphData.behavioralPatterns.slice(0, 8).map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{formatEventType(p.from)}</span>
                          <span className="text-slate-400">→</span>
                          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">{formatEventType(p.to)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900">{p.connection_count}x</span>
                          <span className="text-xs text-slate-400 ml-1">({p.unique_patients} users, {p.avg_time_hours}h)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* High Intent Patients */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">🔥 High Intent Patients</h2>
              <p className="text-xs text-slate-500 mb-3">Users with multiple activity types (most engaged)</p>
              {!activityGraphData?.highIntentPatients?.length ? (
                <p className="text-slate-500 text-sm">No high-intent patients detected yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-medium text-slate-600">User</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Activities</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Types</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">First Seen</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityGraphData.highIntentPatients.slice(0, 20).map((p, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 font-mono text-xs text-slate-600">{p.user_id}</td>
                          <td className="py-2 px-2 text-right font-semibold text-slate-900 tabular-nums">{p.total_activities}</td>
                          <td className="py-2 px-2 text-right">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                              p.distinct_activity_types >= 4 ? 'bg-orange-100 text-orange-700' :
                              p.distinct_activity_types >= 3 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {p.distinct_activity_types} types
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimestamp(p.first_activity)}</td>
                          <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimestamp(p.last_activity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity Stream</h2>
              {!activityGraphData?.recentActivities?.length ? (
                <p className="text-slate-500 text-sm">No recent activities</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityGraphData.recentActivities.map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        activity.type === 'record_upload' ? 'bg-emerald-100 text-emerald-700' :
                        activity.type === 'ask_question' ? 'bg-blue-100 text-blue-700' :
                        activity.type === 'combat_run' ? 'bg-orange-100 text-orange-700' :
                        activity.type === 'thumbs_up' ? 'bg-green-100 text-green-700' :
                        activity.type === 'thumbs_down' ? 'bg-red-100 text-red-700' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {formatEventType(activity.type)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{activity.user}</span>
                      <span className="text-xs text-slate-400 ml-auto">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'entity' ? (
          /* Entity Graph Tab - Palantir-style ontology with pharma insights */
          <div className="space-y-6">
            {/* Journey Stage Filter - Top Filter Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Clinical Knowledge Graph</h2>
                <p className="text-slate-400 text-xs">Click any diagnosis to see co-occurring biomarkers and treatments</p>
              </div>
              <div className="flex gap-2">
                {(['all', 'newly-diagnosed', 'treatment-experienced', 'recurrence'] as const).map(stage => (
                  <button
                    key={stage}
                    onClick={() => setJourneyStage(stage)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      journeyStage === stage
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {stage === 'all' ? 'All Stages' : stage.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-900">{entityGraphData?.stats?.patient_count || entityGraphData?.topEntities?.diagnoses?.reduce((sum, d) => sum + d.count, 0) || 0}</p>
                <p className="text-xs text-slate-500">Patients</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-blue-600">{entityGraphData?.stats?.diagnosis_count || entityGraphData?.topEntities?.diagnoses?.length || 0}</p>
                <p className="text-xs text-slate-500">Diagnoses</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-emerald-600">{entityGraphData?.stats?.biomarker_count || entityGraphData?.topEntities?.biomarkers?.length || 0}</p>
                <p className="text-xs text-slate-500">Biomarkers</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-orange-600">{entityGraphData?.stats?.treatment_count || entityGraphData?.topEntities?.treatments?.length || 0}</p>
                <p className="text-xs text-slate-500">Treatments</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-violet-600">{entityGraphData?.stats?.record_count || 0}</p>
                <p className="text-xs text-slate-500">Records</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-pink-600">{entityGraphData?.stats?.question_count || 0}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-2xl font-bold text-slate-700">{entityGraphData?.stats?.total_edges || 0}</p>
                <p className="text-xs text-slate-500">Relationships</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-red-600">
                    {entityGraphData?.topEntities?.treatments?.filter(t =>
                      !isStandardOfCare(t.name, entityGraphData?.topEntities?.diagnoses?.map(d => d.name) || [])
                    ).length || 0}
                  </p>
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Non-SOC</span>
                </div>
                <p className="text-xs text-slate-500">Non-Standard Tx</p>
              </div>
            </div>

            {/* Cross-Tab: Diagnosis → Biomarkers → Treatments */}
            <div className="bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-200 rounded-xl shadow p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">🧬 Cross-Tab Analysis</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    <strong>How it works:</strong> Click a diagnosis to see what biomarkers and treatments patients with that diagnosis have.
                    This answers: &quot;For patients with X cancer, what biomarkers are they tracking and what treatments have they tried?&quot;
                  </p>
                </div>
                {selectedDiagnosis && (
                  <button
                    onClick={() => setSelectedDiagnosis(null)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Diagnosis pills - clickable */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-medium">Click a diagnosis:</p>
                <div className="flex flex-wrap gap-2">
                  {entityGraphData?.crossTab?.map((row, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDiagnosis(selectedDiagnosis === row.diagnosis ? null : row.diagnosis)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDiagnosis === row.diagnosis
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : selectedDiagnosis
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-white text-slate-700 hover:bg-blue-100 border border-slate-200'
                      }`}
                    >
                      {row.diagnosis}
                      <span className="ml-1.5 text-xs opacity-75">({row.patientCount})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected diagnosis detail view */}
              {selectedDiagnosis && getCoOccurringEntities() && (
                <div className="bg-white rounded-xl p-4 border border-blue-200 mb-6">
                  <h3 className="text-slate-900 font-semibold mb-4 capitalize flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {selectedDiagnosis}
                    <span className="text-xs font-normal text-slate-500">
                      ({getCoOccurringEntities()?.patientCount} patients with this diagnosis)
                    </span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Biomarkers */}
                    <div>
                      <p className="text-xs text-emerald-700 mb-3 uppercase tracking-wide font-medium">Biomarkers They Track</p>
                      {getCoOccurringEntities()?.topBiomarkers.length === 0 ? (
                        <p className="text-slate-400 text-sm">None extracted from their records</p>
                      ) : (
                        <div className="space-y-2">
                          {getCoOccurringEntities()?.topBiomarkers.map((b, j) => (
                            <div key={j} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                              <span className="text-emerald-800 text-sm">{b.name}</span>
                              <span className="text-emerald-600 text-xs font-mono">{b.count}x</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Treatments with SOC badges */}
                    <div>
                      <p className="text-xs text-orange-700 mb-3 uppercase tracking-wide font-medium">Treatments Used</p>
                      {getCoOccurringEntities()?.topTreatments.length === 0 ? (
                        <p className="text-slate-400 text-sm">None extracted from their records</p>
                      ) : (
                        <div className="space-y-2">
                          {getCoOccurringEntities()?.topTreatments.map((t, j) => {
                            const isSoc = isStandardOfCare(t.name, [selectedDiagnosis])
                            return (
                              <div key={j} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                                isSoc ? 'bg-slate-50' : 'bg-red-50 border border-red-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${isSoc ? 'text-slate-700' : 'text-red-700 font-medium'}`}>{t.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    isSoc
                                      ? 'bg-slate-200 text-slate-600'
                                      : 'bg-red-600 text-white'
                                  }`}>
                                    {isSoc ? 'Standard' : 'Non-Standard'}
                                  </span>
                                </div>
                                <span className="text-orange-600 text-xs font-mono">{t.count}x</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommended Tests Section */}
                  {getCoOccurringEntities()?.topBiomarkers && getRecommendedTests(getCoOccurringEntities()!.topBiomarkers).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-violet-700 mb-3 uppercase tracking-wide font-medium">🧪 Recommended Tests</p>
                      <div className="space-y-2">
                        {getRecommendedTests(getCoOccurringEntities()!.topBiomarkers).map((t, j) => (
                          <div key={j} className="flex items-center justify-between bg-violet-50 rounded-lg px-3 py-2">
                            <span className="text-violet-800 text-sm font-medium">{t.test}</span>
                            <span className="text-violet-600 text-xs">{t.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical Pattern Detection */}
                  {getCoOccurringEntities()?.topBiomarkers && detectClinicalPatterns(
                    getCoOccurringEntities()!.topBiomarkers,
                    getCoOccurringEntities()!.topTreatments
                  ).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-xs text-amber-700 mb-3 uppercase tracking-wide font-medium">🔬 Clinical Pattern Detected</p>
                      {detectClinicalPatterns(
                        getCoOccurringEntities()!.topBiomarkers,
                        getCoOccurringEntities()!.topTreatments
                      ).map((pattern, j) => (
                        <div key={j} className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-medium">{pattern.type}</span>
                          </div>
                          <p className="text-amber-900 text-sm mb-2">{pattern.description}</p>
                          <p className="text-amber-800 text-sm font-medium mb-2">💡 {pattern.recommendation}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-amber-600 font-medium">Academic Centers:</span>
                            {pattern.centers.map((center, k) => (
                              <span key={k} className="text-xs bg-white text-amber-700 px-2 py-0.5 rounded border border-amber-300">
                                {center}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Grid of all cross-tab when nothing selected */}
              {!selectedDiagnosis && entityGraphData?.crossTab?.length ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  {entityGraphData.crossTab.slice(0, 6).map((row, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedDiagnosis(row.diagnosis)}
                      className="bg-white rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-400"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 capitalize text-sm">{row.diagnosis}</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{row.patientCount} {row.patientCount === 1 ? 'patient' : 'patients'}</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {row.topTreatments.slice(0, 3).map((t, j) => {
                          const isSoc = isStandardOfCare(t.name, [row.diagnosis])
                          return (
                            <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isSoc ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {t.name}
                            </span>
                          )
                        })}
                        {row.topTreatments.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{row.topTreatments.length - 3}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !selectedDiagnosis && (
                <p className="text-slate-500 text-sm">No cross-tab data yet. Entities are extracted from patient records.</p>
              )}
            </div>

            {/* Top Entities */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Top Diagnoses */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Top Diagnoses
                </h3>
                {!entityGraphData?.topEntities?.diagnoses?.length ? (
                  <p className="text-slate-500 text-sm">No diagnoses yet</p>
                ) : (
                  <div className="space-y-2">
                    {entityGraphData.topEntities.diagnoses.map((d, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-slate-700 truncate">{d.name}</span>
                        <span className="text-sm font-semibold text-blue-600 tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Biomarkers */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  Top Biomarkers
                </h3>
                {!entityGraphData?.topEntities?.biomarkers?.length ? (
                  <p className="text-slate-500 text-sm">No biomarkers yet</p>
                ) : (
                  <div className="space-y-2">
                    {entityGraphData.topEntities.biomarkers.map((b, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm text-slate-700 truncate">{b.name}</span>
                        <span className="text-sm font-semibold text-emerald-600 tabular-nums">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Treatments with SOC badges */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                    Top Treatments
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    <span className="text-red-500 font-medium">Red</span> = Non-SOC
                  </span>
                </h3>
                {!entityGraphData?.topEntities?.treatments?.length ? (
                  <p className="text-slate-500 text-sm">No treatments yet</p>
                ) : (
                  <div className="space-y-2">
                    {entityGraphData.topEntities.treatments.map((t, i) => {
                      const isSoc = isStandardOfCare(t.name, entityGraphData?.topEntities?.diagnoses?.map(d => d.name) || [])
                      return (
                        <div key={i} className={`flex justify-between items-center px-2 py-1 rounded ${
                          isSoc ? '' : 'bg-red-50'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-sm truncate ${isSoc ? 'text-slate-700' : 'text-red-700 font-medium'}`}>{t.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                              isSoc ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-600 font-medium'
                            }`}>
                              {isSoc ? 'SOC' : 'Non-SOC'}
                            </span>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${isSoc ? 'text-orange-600' : 'text-red-600'}`}>{t.count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Patient Timeline - Chronological Clinical Story */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">📅 Patient Timeline</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Select a patient to see their chronological clinical story — diagnoses, treatments, biomarkers, and activities over time.
                  </p>
                </div>
                {selectedPatientId && (
                  <button
                    onClick={() => {
                      setSelectedPatientId(null)
                      setPatientTimelineData(null)
                    }}
                    className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-full"
                  >
                    ← Back to List
                  </button>
                )}
              </div>

              {/* Patient Selector */}
              {!selectedPatientId && (
                <div>
                  <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-medium">
                    Select a patient ({patientListData?.totalPatients || 0} patients with entities):
                  </p>
                  {!patientListData?.patients?.length ? (
                    <p className="text-slate-500 text-sm">No patients with extracted entities yet.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {patientListData.patients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => fetchPatientTimeline(patient.id)}
                          className="bg-white rounded-lg p-3 text-left hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-slate-900 truncate">{patient.email}</span>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-1">{patient.entityCount}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {patient.entityTypes.slice(0, 3).map((type, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{type}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loading State */}
              {loadingTimeline && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}

              {/* Timeline View */}
              {selectedPatientId && patientTimelineData && !loadingTimeline && (
                <div>
                  {/* Patient Header */}
                  <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{patientTimelineData.patientEmail}</h3>
                        <p className="text-xs text-slate-500">
                          {patientTimelineData.stats.totalEntities} entities • {patientTimelineData.stats.totalRecords} records • {patientTimelineData.stats.totalActivities} activities
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>First: {patientTimelineData.stats.firstEvent ? new Date(patientTimelineData.stats.firstEvent).toLocaleDateString() : 'N/A'}</p>
                        <p>Last: {patientTimelineData.stats.lastEvent ? new Date(patientTimelineData.stats.lastEvent).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    {/* Filter Toggles */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500 font-medium mr-2">Filters:</span>
                      <button
                        onClick={() => setTimelineFilters(prev => ({ ...prev, diagnosis: !prev.diagnosis }))}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          timelineFilters.diagnosis
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        Diagnoses
                      </button>
                      <button
                        onClick={() => setTimelineFilters(prev => ({ ...prev, biomarker: !prev.biomarker }))}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          timelineFilters.biomarker
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        Biomarkers
                      </button>
                      <button
                        onClick={() => setTimelineFilters(prev => ({ ...prev, treatment: !prev.treatment }))}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          timelineFilters.treatment
                            ? 'bg-orange-100 text-orange-700 border border-orange-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        Treatments
                      </button>
                      <button
                        onClick={() => setTimelineFilters(prev => ({ ...prev, records: !prev.records }))}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          timelineFilters.records
                            ? 'bg-violet-100 text-violet-700 border border-violet-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        Records
                      </button>
                      <button
                        onClick={() => setTimelineFilters(prev => ({ ...prev, activities: !prev.activities }))}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          timelineFilters.activities
                            ? 'bg-pink-100 text-pink-700 border border-pink-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        Activities
                      </button>
                    </div>
                  </div>

                  {/* Entity Summary Pills */}
                  {patientTimelineData.entitySummary && Object.keys(patientTimelineData.entitySummary).length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-200">
                      <p className="text-xs text-slate-500 font-medium mb-3">Entity Summary:</p>
                      <div className="space-y-2">
                        {Object.entries(patientTimelineData.entitySummary).map(([type, values]) => (
                          <div key={type} className="flex items-start gap-2">
                            <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
                              type === 'diagnosis' ? 'bg-blue-100 text-blue-700' :
                              type === 'biomarker' ? 'bg-emerald-100 text-emerald-700' :
                              type === 'treatment' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {type}
                            </span>
                            <div className="flex flex-wrap gap-1 flex-1">
                              {values.slice(0, 8).map((val, i) => {
                                const isSoc = type === 'treatment' ? isStandardOfCare(val, patientTimelineData.entitySummary?.diagnosis || []) : true
                                return (
                                  <span
                                    key={i}
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      type === 'treatment' && !isSoc
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    {val}
                                    {type === 'treatment' && !isSoc && <span className="ml-1 text-[10px] text-red-500">Non-SOC</span>}
                                  </span>
                                )
                              })}
                              {values.length > 8 && (
                                <span className="text-xs text-slate-400">+{values.length - 8}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline Events */}
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <p className="text-xs text-slate-500 font-medium mb-3">Chronological Timeline ({getFilteredTimeline().length} events):</p>
                    <div className="relative pl-4 border-l-2 border-indigo-200 space-y-4 max-h-96 overflow-y-auto">
                      {getFilteredTimeline().map((event, i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${
                            event.type === 'entity' ? (
                              event.category === 'diagnosis' ? 'bg-blue-500' :
                              event.category === 'biomarker' ? 'bg-emerald-500' :
                              event.category === 'treatment' ? 'bg-orange-500' :
                              'bg-slate-400'
                            ) :
                            event.type === 'record' ? 'bg-violet-500' :
                            'bg-pink-500'
                          }`}></div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-400">
                                {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                                event.type === 'entity' ? (
                                  event.category === 'diagnosis' ? 'bg-blue-100 text-blue-700' :
                                  event.category === 'biomarker' ? 'bg-emerald-100 text-emerald-700' :
                                  event.category === 'treatment' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-600'
                                ) :
                                event.type === 'record' ? 'bg-violet-100 text-violet-700' :
                                'bg-pink-100 text-pink-700'
                              }`}>
                                {event.type === 'entity' ? event.category : event.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-900">{event.value}</p>
                            {event.source && (
                              <p className="text-xs text-slate-400 mt-0.5">{event.source}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {getFilteredTimeline().length === 0 && (
                        <p className="text-slate-500 text-sm py-4">No events match the current filters.</p>
                      )}
                    </div>
                  </div>

                  {/* Pattern Detection Strip */}
                  {getTimelinePatterns().length > 0 && (
                    <div className="mt-4 bg-gradient-to-r from-amber-900 via-orange-900 to-red-900 rounded-lg p-4 border border-amber-700">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <span className="text-lg">🔬</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-amber-200 font-semibold text-sm mb-2">Pattern Detection</h4>
                          <div className="space-y-3">
                            {getTimelinePatterns().map((pattern, i) => (
                              <div key={i}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-medium">{pattern.type}</span>
                                </div>
                                <p className="text-white text-sm">{pattern.description}</p>
                                {pattern.recommendation && (
                                  <p className="text-amber-300 text-xs mt-1">💡 {pattern.recommendation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Entity Co-occurrence & Similar Patients */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Co-occurrence */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-2">🔗 Entity Co-occurrence</h3>
                <p className="text-xs text-slate-500 mb-4">Entities that appear together in patient profiles</p>
                {!entityGraphData?.cooccurrence?.length ? (
                  <p className="text-slate-500 text-sm">No co-occurrences detected yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {entityGraphData.cooccurrence.slice(0, 12).map((co, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1 text-xs flex-1 min-w-0">
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded truncate max-w-[120px]">{co.entity_a}</span>
                          <span className="text-slate-400 flex-shrink-0">↔</span>
                          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded truncate max-w-[120px]">{co.entity_b}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 ml-2">{co.patient_count} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Similar Patients */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-2">👥 Similar Patients</h3>
                <p className="text-xs text-slate-500 mb-4">Patients with shared diagnoses, biomarkers, or treatments</p>
                {!entityGraphData?.similarPatients?.length ? (
                  <p className="text-slate-500 text-sm">No similar patients detected yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {entityGraphData.similarPatients.map((sp, i) => (
                      <div key={i} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-600">{sp.patientA}</span>
                            <span className="text-amber-500">↔</span>
                            <span className="font-mono text-xs text-slate-600">{sp.patientB}</span>
                          </div>
                          <span className="text-sm font-bold text-amber-700">{Math.round(sp.similarity * 100)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {sp.sharedValues?.slice(0, 4).map((v, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 bg-white border border-amber-300 rounded text-amber-800">{v}</span>
                          ))}
                          {sp.sharedEntities > 4 && (
                            <span className="text-xs text-amber-600">+{sp.sharedEntities - 4} more</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Relationships */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Relationships</h3>
              {!entityGraphData?.recentEdges?.length ? (
                <p className="text-slate-500 text-sm">No relationships yet</p>
              ) : (
                <div className="space-y-2">
                  {entityGraphData.recentEdges.map((edge, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs font-mono text-slate-500">{edge.from}</span>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">{edge.relationship}</span>
                      <span className="text-xs font-mono text-slate-500 truncate">{edge.to}</span>
                      <span className="text-xs text-slate-400 ml-auto">{formatTimestamp(edge.when)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pharma Insight Bar - The sentence they'd pay to read */}
            {entityGraphData && generateInsights().length > 0 && (
              <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-red-900 rounded-xl p-6 border border-amber-700">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">💡</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-amber-200 font-semibold mb-2 text-sm uppercase tracking-wide">Clinical Insights</h3>
                    <div className="space-y-2">
                      {generateInsights().map((insight, i) => (
                        <p key={i} className="text-white text-sm leading-relaxed">{insight}</p>
                      ))}
                    </div>
                    <p className="text-amber-400/70 text-xs mt-3 italic">
                      These insights are auto-generated from patient graph data — the seed of your B2B product.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ontology Explanation */}
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">🧠 What is this?</h3>
              <p className="text-sm text-slate-600 mb-4">
                This is a <strong>Palantir-style ontology graph</strong> connecting patients to their medical entities.
                Unlike the Activity Graph (what users DO), this shows what we KNOW about patients.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700 mb-1">Nodes (Things)</p>
                  <ul className="text-slate-600 space-y-1">
                    <li>• Patients, Diagnoses, Biomarkers</li>
                    <li>• Treatments, Records, Questions</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">Edges (Relationships)</p>
                  <ul className="text-slate-600 space-y-1">
                    <li>• has_diagnosis, has_biomarker</li>
                    <li>• received_treatment, uploaded, asked</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-violet-200">
                <p className="text-xs text-violet-600 font-medium">B2B Signal:</p>
                <p className="text-xs text-slate-600">
                  <span className="text-red-600 font-medium">Non-SOC treatments</span> = treatment-experienced patients actively seeking alternatives.
                  This is pharma gold: patients who have exhausted standard options.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'profiles' ? (
          /* Profiles Tab */
          <div>
            {/* Aggregates */}
            {profilesData && (
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Cancer Types */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Cancer Types</h2>
                  {profilesData.aggregates.cancerTypes.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.cancerTypes.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">{item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stages */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Stages</h2>
                  {profilesData.aggregates.stages.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.stages.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">Stage {item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Roles */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Roles</h2>
                  <div className="space-y-2">
                    {profilesData.aggregates.roles.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">{item.name}</span>
                        <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Locations</h2>
                  {profilesData.aggregates.locations.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profilesData.aggregates.locations.slice(0, 10).map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="text-slate-700 text-sm">{item.name}</span>
                          <span className="text-slate-900 font-semibold tabular-nums">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profiles List */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">All Profiles</h2>
              {!profilesData?.profiles.length ? (
                <p className="text-slate-500 text-sm">No profiles yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Name</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Email</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Role</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Cancer Type</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Stage</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Location</th>
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profilesData.profiles.map((profile) => (
                        <tr
                          key={profile.id}
                          onClick={() => fetchUserStats(profile)}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="py-3 px-2 text-slate-900 font-medium">{profile.name}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.email}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              profile.role === 'caregiver'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-violet-100 text-violet-700'
                            }`}>
                              {profile.role}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-700">{profile.cancerType}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.stage || '-'}</td>
                          <td className="py-3 px-2 text-slate-700">{profile.location || '-'}</td>
                          <td className="py-3 px-2 text-slate-500 text-xs">{formatDate(profile.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Profile Detail Modal */}
            {selectedProfile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => { setSelectedProfile(null); setUserStats(null); }} />
                <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => { setSelectedProfile(null); setUserStats(null); }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedProfile.name}</h3>
                  <p className="text-slate-500 text-sm mb-4">{selectedProfile.email}</p>

                  {/* Profile Info Row */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedProfile.role === 'caregiver'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}>
                      {selectedProfile.role}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {selectedProfile.cancerType}
                    </span>
                    {selectedProfile.stage && (
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
                        Stage {selectedProfile.stage}
                      </span>
                    )}
                    {selectedProfile.location && (
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                        📍 {selectedProfile.location}
                      </span>
                    )}
                  </div>

                  {/* Stats Section */}
                  {loadingUserStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent"></div>
                    </div>
                  ) : userStats ? (
                    <>
                      {/* Activity Stats Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                        <div className="bg-violet-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-violet-700">{userStats.stats.recordsUploaded}</p>
                          <p className="text-xs text-slate-600">Records</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-700">{userStats.stats.questionsAsked}</p>
                          <p className="text-xs text-slate-600">Questions</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-700">{userStats.stats.combatRuns}</p>
                          <p className="text-xs text-slate-600">Combats</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-700">{userStats.stats.trialSearches}</p>
                          <p className="text-xs text-slate-600">Trial Searches</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-700">{userStats.stats.pageViews}</p>
                          <p className="text-xs text-slate-600">Page Views</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-slate-700">{userStats.stats.uniqueSessions}</p>
                          <p className="text-xs text-slate-600">Sessions</p>
                        </div>
                      </div>

                      {/* Activity Dates */}
                      <div className="flex flex-wrap gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-slate-500">First seen: </span>
                          <span className="text-slate-900">{userStats.stats.firstActivity ? formatTimestamp(userStats.stats.firstActivity) : 'Never'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Last active: </span>
                          <span className="text-slate-900">{userStats.stats.lastActivity ? formatTimestamp(userStats.stats.lastActivity) : 'Never'}</span>
                        </div>
                      </div>

                      {/* Device & Traffic Info */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {userStats.deviceInfo && userStats.deviceInfo.primary !== 'unknown' && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            userStats.deviceInfo.primary === 'mobile' ? 'bg-emerald-100 text-emerald-700' :
                            userStats.deviceInfo.primary === 'tablet' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {userStats.deviceInfo.primary === 'mobile' ? '📱' :
                             userStats.deviceInfo.primary === 'tablet' ? '📲' : '🖥️'} {userStats.deviceInfo.primary}
                          </span>
                        )}
                        {userStats.trafficInfo && userStats.trafficInfo.primary !== 'unknown' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700">
                            {userStats.trafficInfo.primary === 'direct' ? '🔗' :
                             userStats.trafficInfo.primary === 'google' ? '🔍' :
                             userStats.trafficInfo.primary === 'facebook' ? '📘' :
                             userStats.trafficInfo.primary === 'circle' ? '⭕' :
                             userStats.trafficInfo.primary === 'twitter' ? '🐦' : '🌐'} via {userStats.trafficInfo.primary}
                          </span>
                        )}
                      </div>

                      {/* Two Column Layout */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Pages Visited */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Pages Visited</h4>
                          {userStats.pagesVisited.length === 0 ? (
                            <p className="text-slate-500 text-sm">No page views tracked</p>
                          ) : (
                            <div className="space-y-1">
                              {userStats.pagesVisited.map((page, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-slate-600 truncate font-mono">{page.path}</span>
                                  <span className="text-slate-900 font-semibold ml-2">{page.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Activity */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Recent Activity</h4>
                          {userStats.recentActivity.length === 0 ? (
                            <p className="text-slate-500 text-sm">No activity tracked</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {userStats.recentActivity.slice(0, 10).map((activity, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                                    {formatEventType(activity.type)}
                                  </span>
                                  <span className="text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Combat Analyses */}
                      {userStats.combatAnalyses.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Combat Analyses</h4>
                          <div className="space-y-2">
                            {userStats.combatAnalyses.map((combat, i) => (
                              <div key={i} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 text-xs rounded ${
                                    combat.phase === 'diagnosis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {combat.phase}
                                  </span>
                                  <span className="text-slate-700 capitalize">{combat.cancerType}</span>
                                  <span className="text-slate-500">({combat.recordsCount} records)</span>
                                </div>
                                <span className="text-slate-500 text-xs">{formatTimestamp(combat.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      No activity data available for this user
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    Joined {formatTimestamp(selectedProfile.createdAt)} · Updated {formatTimestamp(selectedProfile.updatedAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                label="Page Views"
                value={data.summary.totalPageViews}
                icon="👁️"
              />
              <SummaryCard
                label="Unique Sessions"
                value={data.summary.uniqueSessions}
                icon="👤"
              />
              <SummaryCard
                label="Questions Asked"
                value={data.summary.askQuestions}
                icon="💬"
                onClick={() => setShowQuestionsDrillDown(true)}
                clickable
              />
              <SummaryCard
                label="Records Uploaded"
                value={data.summary.recordsUploaded}
                icon="📄"
              />
              <SummaryCard
                label="Checklist Views"
                value={data.summary.checklistViews}
                icon="✅"
              />
              <SummaryCard
                label="Trial Searches"
                value={data.summary.trialsSearches}
                icon="🔬"
              />
              <SummaryCard
                label="Total Profiles"
                value={data.summary.totalProfiles || data.summary.profileCreations}
                subtext={data.summary.profileCreations > 0 ? `+${data.summary.profileCreations} this period` : undefined}
                icon="🆕"
              />
              <SummaryCard
                label="Avg Records/Uploader"
                value={data.summary.avgRecordsPerUser || 0}
                subtext={`${data.summary.usersWithRecords || 0} uploaders`}
                icon="📊"
                clickable
                onClick={() => setShowUploaderEmails(!showUploaderEmails)}
              />
              <SummaryCard
                label="Combat Analyses"
                value={data.summary.combatAnalyses || 0}
                icon="⚔️"
              />
            </div>

            {/* Uploader Emails Drilldown */}
            {showUploaderEmails && winbackData && (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl shadow p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">📧 Uploader Emails ({winbackData.users.length} users who uploaded but haven&apos;t run Combat)</h2>
                  <button
                    onClick={() => setShowUploaderEmails(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {winbackData.users.map((user, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-700">{user.email}</span>
                        <span className="text-xs text-slate-400">{user.record_uploads} records</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  These users uploaded records but never ran Combat. Great winback targets!
                </p>
                <button
                  onClick={() => {
                    const emails = winbackData.users.map(u => u.email).join(', ')
                    navigator.clipboard.writeText(emails)
                    alert('Emails copied to clipboard!')
                  }}
                  className="mt-3 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700"
                >
                  📋 Copy All Emails
                </button>
              </div>
            )}

            {/* Combat Stats Section */}
            {data.combatStats && data.combatStats.total > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl shadow p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  ⚔️ CancerCombat Analytics
                </h2>
                <div className="grid sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">{data.combatStats.total}</p>
                    <p className="text-xs text-slate-600">Total Analyses</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.combatStats.diagnosis}</p>
                    <p className="text-xs text-slate-600">Diagnosis Phase</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{data.combatStats.treatment}</p>
                    <p className="text-xs text-slate-600">Treatment Phase</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{data.combatStats.avgEvidenceStrength}%</p>
                    <p className="text-xs text-slate-600">Avg Evidence</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* By Cancer Type */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">By Cancer Type</h3>
                    <div className="space-y-2">
                      {Object.entries(data.combatStats.byCancerType)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                            <span className="text-sm text-slate-700 capitalize">{type}</span>
                            <span className="text-sm font-semibold text-slate-900">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recent Combats */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Recent Analyses</h3>
                    <div className="space-y-2">
                      {data.combatStats.recentCombats.slice(0, 5).map((combat, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              combat.phase === 'diagnosis' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {combat.phase}
                            </span>
                            <span className="text-sm text-slate-700 capitalize">{combat.cancerType}</span>
                          </div>
                          <span className="text-xs text-slate-500">{formatTimestamp(combat.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sharing & Viral Growth Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                🚀 Sharing & Viral Growth
              </h2>
              <div className="grid sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{data.sharingStats?.totalShares || 0}</p>
                  <p className="text-xs text-slate-600">Total Shares</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{data.referralStats?.uniqueReferralSessions || 0}</p>
                  <p className="text-xs text-slate-600">Referral Arrivals</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{data.roleBreakdown?.caregivers || 0}</p>
                  <p className="text-xs text-slate-600">Caregivers</p>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-violet-600">{data.roleBreakdown?.patients || 0}</p>
                  <p className="text-xs text-slate-600">Patients</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Shares by Tool */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Shares by Tool</h3>
                  {!data.sharingStats?.byTool?.length ? (
                    <p className="text-slate-500 text-xs">No shares yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.sharingStats.byTool.slice(0, 5).map((item) => (
                        <div key={item.tool} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 capitalize">{item.tool}</span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shares by Method */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Share Methods</h3>
                  {!data.sharingStats?.byMethod?.length ? (
                    <p className="text-slate-500 text-xs">No shares yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.sharingStats.byMethod.map((item) => (
                        <div key={item.method} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 capitalize">
                            {item.method === 'copy' ? '📋 Copy' :
                             item.method === 'email' ? '✉️ Email' :
                             item.method === 'twitter' ? '🐦 Twitter' : item.method}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referral Sources */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Referral Sources</h3>
                  {!data.referralStats?.bySource?.length ? (
                    <p className="text-slate-500 text-xs">No referrals tracked yet</p>
                  ) : (
                    <div className="space-y-2">
                      {data.referralStats.bySource.slice(0, 5).map((item) => (
                        <div key={item.source} className="flex items-center justify-between bg-white/60 rounded px-3 py-1.5">
                          <span className="text-sm text-slate-700 font-mono">{item.source}</span>
                          <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Caregiver/Patient Insight */}
              {(data.roleBreakdown?.caregivers || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Caregiver Ratio:</span>{' '}
                    {data.roleBreakdown?.ratio || '0'} caregivers per patient •{' '}
                    <span className="text-green-700">
                      {Math.round((data.roleBreakdown?.caregivers || 0) / ((data.roleBreakdown?.caregivers || 0) + (data.roleBreakdown?.patients || 1)) * 100)}% of signups are caregivers
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Page Views by Path */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Pages Visited</h2>
                {data.pageViewsByPath.length === 0 ? (
                  <p className="text-slate-500 text-sm">No page views yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.pageViewsByPath.slice(0, 10).map((item) => (
                      <div key={item.path} className="flex items-center justify-between">
                        <span className="text-slate-700 font-mono text-sm truncate flex-1 mr-4">
                          {item.path}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Events by Type */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Events by Type</h2>
                {data.eventsByType.length === 0 ? (
                  <p className="text-slate-500 text-sm">No events yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.eventsByType.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm">
                          {formatEventType(item.type)}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Traffic & Device Grid - Drilldowns */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Traffic Sources */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Traffic Sources</h2>
                {!data.trafficSources || data.trafficSources.length === 0 ? (
                  <p className="text-slate-500 text-sm">No traffic data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.trafficSources.slice(0, 10).map((item) => (
                      <div key={item.source} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">
                          {item.source === 'direct' ? '🔗 Direct' :
                           item.source === 'google' ? '🔍 Google' :
                           item.source === 'facebook' ? '📘 Facebook' :
                           item.source === 'twitter' ? '🐦 Twitter' :
                           item.source === 'circle' ? '⭕ Circle' :
                           item.source === 'linkedin' ? '💼 LinkedIn' :
                           item.source}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device Types */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Device Types</h2>
                {!data.deviceTypes || data.deviceTypes.length === 0 ? (
                  <p className="text-slate-500 text-sm">No device data yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.deviceTypes.map((item) => (
                      <div key={item.device} className="flex items-center justify-between">
                        <span className="text-slate-700 text-sm capitalize">
                          {item.device === 'desktop' ? '🖥️ Desktop' :
                           item.device === 'mobile' ? '📱 Mobile' :
                           item.device === 'tablet' ? '📲 Tablet' :
                           item.device}
                        </span>
                        <span className="text-slate-900 font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Charts */}
            {data.dailyBreakdown.length > 0 && (() => {
              const chartData = data.dailyBreakdown.slice(0, 14).reverse()
              const maxSessions = Math.max(...chartData.map(d => d.sessions), 1)
              const maxUploads = Math.max(...chartData.map(d => d.events.record_upload || 0), 1)
              const maxViews = Math.max(...chartData.map(d => d.views), 1)

              return (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {/* Sessions Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📊 Sessions (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-violet-500 rounded-t hover:bg-violet-600 transition-colors cursor-pointer"
                            style={{ height: `${(day.sessions / maxSessions) * 100}%`, minHeight: day.sessions > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.sessions}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + d.sessions, 0)}
                    </p>
                  </div>

                  {/* Records Uploaded Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">📁 Records Uploaded (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
                            style={{ height: `${((day.events.record_upload || 0) / maxUploads) * 100}%`, minHeight: (day.events.record_upload || 0) > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.events.record_upload || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + (d.events.record_upload || 0), 0)}
                    </p>
                  </div>

                  {/* Page Views Chart */}
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">👁️ Page Views (14 days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {chartData.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                            style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? '4px' : '0' }}
                          />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {day.date.slice(5)}: {day.views}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Total: {chartData.reduce((sum, d) => sum + d.views, 0)}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Daily Breakdown Table */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Daily Activity</h2>
              {data.dailyBreakdown.length === 0 ? (
                <p className="text-slate-500 text-sm">No data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-2 font-medium text-slate-600">Date</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Views</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Sessions</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Questions</th>
                        <th className="text-right py-3 px-2 font-medium text-slate-600">Uploads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyBreakdown.slice(0, 14).map((day) => (
                        <tr key={day.date} className="border-b border-slate-100">
                          <td className="py-3 px-2 text-slate-700">{formatDate(day.date)}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.views}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.sessions}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.events.ask_question || 0}</td>
                          <td className="py-3 px-2 text-right tabular-nums">{day.events.record_upload || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
              {data.recentEvents.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent events</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {data.recentEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-4 py-2 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                            {formatEventType(event.type)}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {event.sessionId}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm mt-1 truncate">{event.path}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Questions Drill-Down Modal */}
            {showQuestionsDrillDown && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowQuestionsDrillDown(false)} />
                <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setShowQuestionsDrillDown(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <span>💬</span> Questions Asked
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">
                    {data.drillDown?.questions?.length || 0} questions in the last {days} days
                  </p>

                  {!data.drillDown?.questions?.length ? (
                    <p className="text-slate-500 text-center py-8">No questions asked in this period</p>
                  ) : (
                    <div className="space-y-4">
                      {data.drillDown.questions.map((q, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                              {q.cancerType}
                            </span>
                            <span className="text-xs text-slate-500">
                              Session: {q.sessionId}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto">
                              {formatTimestamp(q.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-800 text-sm leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, subtext, onClick, clickable }: { label: string; value: number; icon: string; subtext?: string; onClick?: () => void; clickable?: boolean }) {
  const Component = clickable ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-xl shadow p-4 sm:p-6 text-left w-full ${clickable ? 'hover:bg-violet-50 hover:ring-2 hover:ring-violet-200 cursor-pointer transition-all' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
          {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
          {clickable && <p className="text-xs text-violet-500 mt-1">Click for details →</p>}
        </div>
      </div>
    </Component>
  )
}

function formatEventType(type: string | undefined | null): string {
  if (!type) return 'Unknown'
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
