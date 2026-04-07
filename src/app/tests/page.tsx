'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'
import { Shield, Heart, CheckCircle, ExternalLink, Building2, X, Clock, DollarSign, MessageCircle, ChevronRight } from 'lucide-react'

interface DiagnosticTest {
  id: number
  test_name: string | null
  cancer_type: string | null
  modality: string | null
  stage: string | null
  care_phase: string | null
  reason: string | null
  insurance_coverage: string | null
  price: string | null
  turnaround_time: string | null
  test_status: string | null
  guideline_source: string | null
}

interface ServiceProvider {
  id: number
  provider: string
  logo_url: string | null
  url: string | null
  domain: string | null
  featured: boolean
  coverage_info: {
    accepts_insurance?: boolean
    in_network_carriers?: string[]
    financial_assistance_available?: boolean
  } | null
  eligibility_criteria: {
    cancer_types?: string[]
  } | null
}

interface PatientProfile {
  cancerType: string
  stage?: string
}

// Trust-building WHY explanations by cancer type
const WHY_TESTING_MATTERS: Record<string, { headline: string; reasons: string[] }> = {
  lung: {
    headline: "Molecular testing is essential for lung cancer treatment decisions",
    reasons: [
      "EGFR, ALK, and ROS1 testing can identify targetable mutations with effective therapies",
      "PD-L1 testing determines eligibility for immunotherapy",
      "Early testing helps avoid ineffective treatments and their side effects"
    ]
  },
  breast: {
    headline: "Biomarker testing shapes your entire treatment plan",
    reasons: [
      "HER2 status determines if you qualify for highly effective targeted therapies",
      "Hormone receptor testing guides whether hormonal therapy will work",
      "Genomic tests like Oncotype DX can help you avoid unnecessary chemotherapy"
    ]
  },
  colorectal: {
    headline: "Genomic profiling unlocks treatment options",
    reasons: [
      "MSI-H/dMMR testing identifies patients who respond well to immunotherapy",
      "KRAS/NRAS/BRAF testing guides targeted therapy decisions",
      "Lynch syndrome screening has important implications for your family"
    ]
  },
  melanoma: {
    headline: "Mutation testing opens doors to breakthrough therapies",
    reasons: [
      "BRAF V600 testing identifies candidates for highly effective targeted therapy",
      "Combination immunotherapy has transformed melanoma outcomes",
      "Knowing your mutation status helps sequence treatments optimally"
    ]
  },
  prostate: {
    headline: "Advanced testing helps personalize your approach",
    reasons: [
      "Germline testing can identify inherited mutations affecting treatment choices",
      "BRCA1/2 and other HRR gene testing may qualify you for PARP inhibitors",
      "Decipher and other genomic tests help guide active surveillance decisions"
    ]
  },
  pancreatic: {
    headline: "Every treatment option matters—testing finds them",
    reasons: [
      "Germline BRCA testing can qualify you for platinum chemotherapy and PARP inhibitors",
      "MSI-H testing identifies rare candidates for immunotherapy",
      "NTRK fusion testing opens doors to highly effective targeted therapies"
    ]
  },
  default: {
    headline: "Precision testing helps match you with the best treatments",
    reasons: [
      "Biomarker testing can reveal targeted therapy options",
      "Understanding your cancer's genetics helps avoid ineffective treatments",
      "NCCN guidelines recommend comprehensive testing for treatment decisions"
    ]
  }
}

export default function TestsPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [tests, setTests] = useState<DiagnosticTest[]>([])
  const [filteredTests, setFilteredTests] = useState<DiagnosticTest[]>([])
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [selectedCancerType, setSelectedCancerType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllProviders, setShowAllProviders] = useState(false)
  const [selectedTest, setSelectedTest] = useState<DiagnosticTest | null>(null)

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      setProfile({
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
      })
      if (authProfile.cancer_type) {
        setSelectedCancerType(authProfile.cancer_type)
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const p = JSON.parse(saved)
        setProfile(p)
        if (p.cancerType) {
          setSelectedCancerType(p.cancerType)
        }
      }
    }
  }, [user, authProfile, authLoading])

  // Fetch tests and providers from Supabase
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function fetchData() {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.error('Data fetch timed out')
        setLoading(false)
      }, 10000)

      try {
        // Fetch tests
        const { data: testsData, error: testsError } = await supabase
          .from('dx_test_master')
          .select('*')
          .order('test_name')
          .limit(100)

        if (testsError) {
          console.error('Tests error:', testsError)
          setError(`Database error: ${testsError.message}`)
        } else {
          setTests(testsData || [])
        }

        // Fetch diagnostic providers
        const { data: providersData, error: providersError } = await supabase
          .from('serviceProviders')
          .select('id, provider, logo_url, url, domain, featured, coverage_info, eligibility_criteria')
          .eq('domain', 'diagnostics')
          .order('featured', { ascending: false })
          .limit(20)

        if (providersError) {
          console.error('Providers error:', providersError)
        } else {
          setProviders(providersData || [])
        }

        clearTimeout(timeoutId)
      } catch (err) {
        console.error('Error fetching data:', err)
        clearTimeout(timeoutId)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => clearTimeout(timeoutId)
  }, [])

  // Filter tests
  useEffect(() => {
    let filtered = tests

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(test =>
        test.test_name?.toLowerCase().includes(term) ||
        test.reason?.toLowerCase().includes(term)
      )
    }

    // Cancer type filter
    if (selectedCancerType !== 'all') {
      filtered = filtered.filter(test =>
        test.cancer_type?.toLowerCase() === selectedCancerType.toLowerCase() ||
        test.cancer_type?.toLowerCase() === 'general' ||
        !test.cancer_type
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(test =>
        test.modality?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Status filter (Recommended/Optional)
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(test =>
        test.test_status?.toLowerCase() === selectedStatus.toLowerCase()
      )
    }

    setFilteredTests(filtered)
  }, [tests, searchTerm, selectedCancerType, selectedCategory, selectedStatus])

  // Get unique categories from tests
  const categories = [...new Set(tests.map(t => t.modality).filter((m): m is string => Boolean(m)))]

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    const isRecommended = status.toLowerCase() === 'recommended'
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        isRecommended
          ? 'bg-green-100 text-green-700'
          : 'bg-slate-100 text-slate-600'
      }`}>
        {status}
      </span>
    )
  }

  // Generate "how to ask your doctor" text
  const getHowToAsk = (test: DiagnosticTest) => {
    const isRecommended = test.test_status?.toLowerCase() === 'recommended'
    if (isRecommended) {
      return `"I've read that ${test.test_name} is recommended by NCCN guidelines for my cancer type. Can we discuss whether this test would be helpful for my treatment planning?"`
    }
    return `"I've been researching ${test.test_name} and understand it may provide useful information. Even if it's not standard for my situation, could we discuss whether it might help guide my treatment decisions?"`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-slate-400 mb-2">Loading tests...</div>
          <p className="text-xs text-slate-300">Fetching from database</p>
        </div>
      </div>
    )
  }

  if (error && tests.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Tests</h2>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1">
            ← Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Precision Testing</span>
          </Link>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧬</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Precision Testing</h1>
          <p className="text-slate-600 mb-2">
            MRD, genomic tests, and biomarker monitoring to guide your treatment decisions.
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-xs text-slate-400">Powered by</span>
            <a
              href="https://www.openonco.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <span className="text-sm">🧬</span>
              <span className="text-xs font-semibold text-slate-700">OpenOnco</span>
            </a>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400">NCCN guidelines</span>
          </div>
        </div>

        {/* Personalized WHY Banner - Trust Building */}
        {profile && profile.cancerType && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">
                    Personalized for your {CANCER_TYPES[profile.cancerType] || profile.cancerType}
                    {profile.stage && <span className="font-normal text-slate-600"> • Stage {profile.stage}</span>}
                  </h3>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  {(WHY_TESTING_MATTERS[profile.cancerType] || WHY_TESTING_MATTERS.default).headline}
                </p>
                <ul className="space-y-1.5">
                  {(WHY_TESTING_MATTERS[profile.cancerType] || WHY_TESTING_MATTERS.default).reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-emerald-200">
                  <Link
                    href="/profile"
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                  >
                    Update my profile →
                  </Link>
                  <button
                    onClick={() => setSelectedCancerType('all')}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Show all cancer types
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trust Banner for non-logged-in users */}
        {!profile && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">We've got your back</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Tell us about your cancer to see which tests are most relevant for you—based on the same NCCN guidelines your oncologist uses.
                </p>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Personalize my results →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Cancer Type */}
            <select
              value={selectedCancerType}
              onChange={(e) => setSelectedCancerType(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            >
              <option value="all">All Cancer Types</option>
              {Object.entries(CANCER_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Status (Recommended/Optional) */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            >
              <option value="all">All Tests</option>
              <option value="recommended">Recommended</option>
              <option value="optional">Optional</option>
            </select>

            {/* Category (Modality) */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-600 mb-4">
          Found <strong>{filteredTests.length}</strong> tests
        </p>

        {/* Tests list */}
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <div className="text-4xl mb-4">🔬</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Tests Found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.slice(0, 30).map((test) => (
              <button
                key={test.id}
                onClick={() => setSelectedTest(test)}
                className="w-full text-left border border-slate-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{test.test_name}</h3>
                      {getStatusBadge(test.test_status)}
                    </div>
                    {test.reason && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">{test.reason}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {test.modality && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{test.modality}</span>
                      )}
                      {test.cancer_type && (
                        <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{test.cancer_type}</span>
                      )}
                      {test.turnaround_time && (
                        <span>⏱ {test.turnaround_time}</span>
                      )}
                      {test.price && (
                        <span>💲 {test.price}</span>
                      )}
                      {test.insurance_coverage && (
                        <span>🛡 {test.insurance_coverage}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                </div>
                {test.guideline_source && (
                  <p className="text-xs text-slate-400 mt-2">Source: {test.guideline_source}</p>
                )}
              </button>
            ))}
            {filteredTests.length > 30 && (
              <p className="text-center text-sm text-slate-500 py-4">
                Showing first 30 of {filteredTests.length} tests
              </p>
            )}
          </div>
        )}

        {/* Where to Get Tested - Provider Partners */}
        {providers.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" />
                  Where to Get Tested
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Trusted diagnostic partners • Many accept insurance
                </p>
              </div>
            </div>

            {/* Trust message */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-5">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>You're not alone in this.</strong> These labs partner with opencancer.ai to help patients access precision testing.
                    Many offer financial assistance programs and work with your insurance.
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(showAllProviders ? providers : providers.filter(p => p.featured).slice(0, 6)).map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt={provider.provider}
                        className="w-10 h-10 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 text-sm truncate">{provider.provider}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {provider.coverage_info?.accepts_insurance && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                            Accepts Insurance
                          </span>
                        )}
                        {provider.coverage_info?.financial_assistance_available && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            Financial Aid
                          </span>
                        )}
                        {provider.featured && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                    {provider.url && (
                      <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show more/less */}
            {providers.length > 6 && (
              <button
                onClick={() => setShowAllProviders(!showAllProviders)}
                className="mt-4 text-sm text-slate-500 hover:text-slate-700"
              >
                {showAllProviders ? 'Show fewer' : `Show all ${providers.length} partners`}
              </button>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-slate-400 mt-4">
              opencancer.ai partners with diagnostic labs to improve access. We don't receive referral fees.
              Always verify insurance coverage directly with the provider.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 pt-8 border-t border-slate-200 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Not sure which tests you need?</h3>
            <p className="text-slate-600 text-sm mb-4">
              Get a personalized checklist based on your diagnosis, stage, and what you've already done.
            </p>
            <Link
              href="/cancer-checklist"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Get My Personalized Checklist →
            </Link>
          </div>
        </div>
      </div>

      {/* Test Detail Modal */}
      {selectedTest && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedTest(null)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{selectedTest.test_name}</h2>
                  {getStatusBadge(selectedTest.test_status)}
                </div>
                {selectedTest.modality && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selectedTest.modality}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              {selectedTest.reason && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">What this test does</h3>
                  <p className="text-slate-600">{selectedTest.reason}</p>
                </div>
              )}

              {/* Key Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedTest.turnaround_time && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Turnaround</span>
                    </div>
                    <p className="text-slate-900 font-medium">{selectedTest.turnaround_time}</p>
                  </div>
                )}
                {selectedTest.price && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">Estimated Cost</span>
                    </div>
                    <p className="text-slate-900 font-medium">{selectedTest.price}</p>
                  </div>
                )}
                {selectedTest.insurance_coverage && (
                  <div className="bg-emerald-50 rounded-lg p-3 col-span-2">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs font-medium">Insurance</span>
                    </div>
                    <p className="text-emerald-800 font-medium">{selectedTest.insurance_coverage}</p>
                  </div>
                )}
              </div>

              {/* Cancer Type & Stage */}
              {(selectedTest.cancer_type || selectedTest.stage || selectedTest.care_phase) && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Relevant for</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTest.cancer_type && (
                      <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                        {selectedTest.cancer_type}
                      </span>
                    )}
                    {selectedTest.stage && (
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                        Stage: {selectedTest.stage}
                      </span>
                    )}
                    {selectedTest.care_phase && (
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {selectedTest.care_phase}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* How to Ask Your Doctor */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-medium text-amber-900">How to ask your doctor</h3>
                </div>
                <p className="text-sm text-amber-800 italic mb-3">
                  {getHowToAsk(selectedTest)}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getHowToAsk(selectedTest))
                  }}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                >
                  📋 Copy to clipboard
                </button>
              </div>

              {/* Source */}
              {selectedTest.guideline_source && (
                <div className="text-sm text-slate-500">
                  <span className="font-medium">Source:</span> {selectedTest.guideline_source}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Link
                  href="/cancer-checklist"
                  onClick={() => setSelectedTest(null)}
                  className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
                >
                  Add to my checklist
                </Link>
                <button
                  onClick={() => setSelectedTest(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
