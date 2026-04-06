'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'

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

interface PatientProfile {
  cancerType: string
  stage?: string
}

export default function TestsPage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const [tests, setTests] = useState<DiagnosticTest[]>([])
  const [filteredTests, setFilteredTests] = useState<DiagnosticTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [selectedCancerType, setSelectedCancerType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

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

  // Fetch tests from Supabase with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    async function fetchTests() {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.error('Tests fetch timed out')
        setLoading(false)
      }, 10000)

      try {
        const { data, error: supabaseError } = await supabase
          .from('dx_test_master')
          .select('*')
          .order('test_name')
          .limit(100)

        clearTimeout(timeoutId)

        if (supabaseError) {
          console.error('Supabase error:', supabaseError)
          setError(`Database error: ${supabaseError.message}`)
          return
        }
        setTests(data || [])
        if (!data || data.length === 0) {
          setError('No tests found in database')
        }
      } catch (err) {
        console.error('Error fetching tests:', err)
        clearTimeout(timeoutId)
        setError(err instanceof Error ? err.message : 'Failed to load tests')
      } finally {
        setLoading(false)
      }
    }

    fetchTests()

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

        {/* Profile context */}
        {profile && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-orange-800">
                Showing tests relevant for <strong>{CANCER_TYPES[profile.cancerType] || profile.cancerType}</strong>
                {profile.stage && <span> (Stage {profile.stage})</span>}
              </p>
              <button
                onClick={() => setSelectedCancerType('all')}
                className="text-xs text-orange-600 hover:text-orange-800"
              >
                Show all
              </button>
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
              <div
                key={test.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{test.test_name}</h3>
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
                </div>
                {test.guideline_source && (
                  <p className="text-xs text-slate-400 mt-2">Source: {test.guideline_source}</p>
                )}
              </div>
            ))}
            {filteredTests.length > 30 && (
              <p className="text-center text-sm text-slate-500 py-4">
                Showing first 30 of {filteredTests.length} tests
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Not sure which tests you need?</p>
          <Link
            href="/cancer-checklist"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Get Personalized Recommendations →
          </Link>
        </div>
      </div>
    </main>
  )
}
