'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronRight, ExternalLink, AlertCircle, CheckCircle, Info, DollarSign, Shield, Heart, Building2, User, Edit3 } from 'lucide-react'
import {
  INSURANCE_TYPES,
  TREATMENT_COVERAGE,
  MEDICARE_2026,
  KEY_FACTS_2026,
  getRelevantPrograms,
  getCoverageSummary
} from '@/lib/coverage-data'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'

type Step = 'loading' | 'personalize' | 'insurance' | 'insurance-details' | 'results'

// Common insurance carriers
const COMMON_CARRIERS = [
  'UnitedHealthcare',
  'Blue Cross Blue Shield',
  'Aetna',
  'Cigna',
  'Humana',
  'Kaiser Permanente',
  'Anthem',
  'Medicare',
  'Medicaid',
  'Other'
]

interface ServiceProvider {
  id: number
  provider: string
  logo_url: string | null
  url: string | null
  domain: string | null
  featured: boolean
  coverage_info: {
    accepts_insurance?: boolean
    financial_assistance_available?: boolean
    financial_assistance_url?: string
  } | null
}

interface InsuranceDetails {
  carrier: string
  planType: string
  memberId?: string
}

export default function CoveragePage() {
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth()
  const [step, setStep] = useState<Step>('loading')
  const [cancerType, setCancerType] = useState('')
  const [insuranceType, setInsuranceType] = useState('')
  const [insuranceDetails, setInsuranceDetails] = useState<InsuranceDetails>({ carrier: '', planType: '' })
  const [showMedicareDetails, setShowMedicareDetails] = useState(false)
  const [financialProviders, setFinancialProviders] = useState<ServiceProvider[]>([])
  const [savingInsurance, setSavingInsurance] = useState(false)
  const [insuranceSaved, setInsuranceSaved] = useState(false)
  const [editingInsurance, setEditingInsurance] = useState(false)

  // Load profile and determine starting step
  useEffect(() => {
    if (authLoading) return

    let loadedCancerType = ''
    let loadedInsurance: InsuranceDetails = { carrier: '', planType: '' }

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      if (authProfile.cancer_type) {
        loadedCancerType = authProfile.cancer_type
        setCancerType(loadedCancerType)
      }
      // Load existing insurance if available
      const profileData = authProfile as unknown as Record<string, unknown>
      if (profileData.insurance) {
        const ins = profileData.insurance as InsuranceDetails
        loadedInsurance = {
          carrier: ins.carrier || '',
          planType: ins.planType || '',
          memberId: ins.memberId || ''
        }
        setInsuranceDetails(loadedInsurance)
        if (ins.carrier) {
          // Determine insurance type from carrier
          if (ins.carrier.toLowerCase().includes('medicare')) {
            setInsuranceType('medicare_original')
          } else if (ins.carrier.toLowerCase().includes('medicaid')) {
            setInsuranceType('medicaid')
          } else {
            setInsuranceType('private_ppo')
          }
        }
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const profile = JSON.parse(saved)
        if (profile.cancerType) {
          loadedCancerType = profile.cancerType
          setCancerType(loadedCancerType)
        }
        if (profile.insurance) {
          loadedInsurance = profile.insurance
          setInsuranceDetails(loadedInsurance)
          // Determine insurance type
          if (loadedInsurance.carrier?.toLowerCase().includes('medicare')) {
            setInsuranceType('medicare_original')
          } else if (loadedInsurance.carrier?.toLowerCase().includes('medicaid')) {
            setInsuranceType('medicaid')
          } else if (loadedInsurance.carrier) {
            setInsuranceType('private_ppo')
          }
        }
      }
    }

    // Determine starting step based on what we know
    if (loadedCancerType && loadedInsurance.carrier) {
      // Have both - go to results
      setStep('results')
    } else if (loadedCancerType) {
      // Have cancer type but no insurance - ask for insurance
      setStep('insurance')
    } else {
      // Don't have cancer type - show personalize prompt
      setStep('personalize')
    }
  }, [user, authProfile, authLoading])

  // Fetch financial assistance providers
  useEffect(() => {
    async function fetchProviders() {
      const { data, error } = await supabase
        .from('serviceProviders')
        .select('id, provider, logo_url, url, domain, featured, coverage_info')
        .eq('domain', 'financial-legal')
        .order('featured', { ascending: false })
        .limit(10)

      if (!error && data) {
        setFinancialProviders(data)
      }
    }
    fetchProviders()
  }, [])

  // Save insurance to profile
  const saveInsuranceToProfile = async () => {
    if (!insuranceDetails.carrier) return

    setSavingInsurance(true)
    try {
      if (user) {
        // Save to Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            insurance: insuranceDetails,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (!error) {
          setInsuranceSaved(true)
          refreshProfile?.()
          setTimeout(() => setInsuranceSaved(false), 2000)
        }
      } else {
        // Save to localStorage for anonymous users
        const saved = localStorage.getItem('patient-profile')
        const profile = saved ? JSON.parse(saved) : {}
        profile.insurance = insuranceDetails
        localStorage.setItem('patient-profile', JSON.stringify(profile))
        setInsuranceSaved(true)
        setTimeout(() => setInsuranceSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save insurance:', err)
    } finally {
      setSavingInsurance(false)
    }
  }

  const handleCancerSelect = (type: string) => {
    setCancerType(type)
    setStep('insurance')
  }

  const handleInsuranceSelect = (type: string) => {
    setInsuranceType(type)
    // Go to details step to capture carrier info
    setStep('insurance-details')
  }

  const handleInsuranceDetailsComplete = async () => {
    // Save insurance to profile for cross-site personalization
    await saveInsuranceToProfile()
    setStep('results')
  }

  const handleBack = () => {
    if (step === 'insurance') setStep('personalize')
    if (step === 'insurance-details') setStep('insurance')
    if (step === 'results') setStep('insurance-details')
  }

  const relevantPrograms = getRelevantPrograms(cancerType, insuranceType)
  const coverageSummary = getCoverageSummary(insuranceType)
  const isMedicare = insuranceType.startsWith('medicare')

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress indicator - only show for multi-step flow */}
        {step !== 'loading' && step !== 'personalize' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full bg-slate-900`} />
            <div className={`w-6 h-0.5 ${step === 'insurance-details' || step === 'results' ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'insurance-details' || step === 'results' ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`w-6 h-0.5 ${step === 'results' ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 'results' ? 'bg-slate-900' : 'bg-slate-200'}`} />
          </div>
        )}

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-pulse text-slate-400">Loading...</div>
          </div>
        )}

        {/* Step 1: Personalize prompt - when we don't know cancer type */}
        {step === 'personalize' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 mb-4">
                <DollarSign className="w-6 h-6 text-slate-700" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Understand Your Coverage
              </h1>
              <p className="text-slate-600">
                See what's typically covered for your cancer type and insurance
              </p>
            </div>

            {/* 2026 Key Facts */}
            <div className="bg-stone-100 border border-stone-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-slate-700" />
                <span className="text-sm font-medium text-slate-800">2026 Good News for Cancer Patients</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {KEY_FACTS_2026.slice(0, 2).map((fact, i) => (
                  <div key={i} className="bg-white rounded-lg p-3">
                    <div className="text-lg font-bold text-slate-900">{fact.value}</div>
                    <div className="text-xs text-slate-600">{fact.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust-building personalization prompt */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <Shield className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">We've got your back</h3>
              <p className="text-sm text-slate-600 mb-4">
                Tell us about your cancer to see coverage information tailored to your situation—including
                financial assistance programs you may qualify for.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Personalize my results <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Or browse general info */}
            <div className="text-center">
              <button
                onClick={() => setStep('insurance')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Or browse general coverage information →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Insurance Type */}
        {step === 'insurance' && (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1"
            >
              ← Back
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 mb-4">
                <Shield className="w-6 h-6 text-slate-700" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                What's your insurance?
              </h1>
              <p className="text-slate-600">
                Select your primary insurance type
              </p>
            </div>

            <div className="space-y-2">
              {Object.entries(INSURANCE_TYPES).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleInsuranceSelect(key)}
                  className="w-full text-left px-4 py-4 rounded-lg border border-slate-200 bg-white hover:border-slate-400 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium text-slate-900">{info.label}</div>
                    <div className="text-sm text-slate-500">{info.description}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2.5: Insurance Details */}
        {step === 'insurance-details' && (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="text-slate-500 hover:text-slate-900 text-sm flex items-center gap-1"
            >
              ← Back
            </button>

            {/* Trust Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-800 font-medium">Your information stays private</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    We use this to show you in-network providers and estimate costs across opencancer.ai.
                    We never share your insurance details with third parties.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 mb-4">
                <User className="w-6 h-6 text-slate-700" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Tell us about your insurance
              </h1>
              <p className="text-slate-600">
                This helps us personalize recommendations across the site
              </p>
            </div>

            <div className="space-y-4">
              {/* Carrier Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Insurance carrier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_CARRIERS.map((carrier) => (
                    <button
                      key={carrier}
                      onClick={() => setInsuranceDetails(prev => ({ ...prev, carrier }))}
                      className={`text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                        insuranceDetails.carrier === carrier
                          ? 'border-slate-900 bg-stone-100 text-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
                      }`}
                    >
                      {carrier}
                    </button>
                  ))}
                </div>
                {insuranceDetails.carrier === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter your insurance carrier..."
                    value={insuranceDetails.carrier === 'Other' ? '' : insuranceDetails.carrier}
                    onChange={(e) => setInsuranceDetails(prev => ({ ...prev, carrier: e.target.value }))}
                    className="mt-2 w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-slate-900"
                  />
                )}
              </div>

              {/* Plan Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plan type (optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['PPO', 'HMO', 'EPO', 'POS', 'HDHP', "Don't know"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setInsuranceDetails(prev => ({ ...prev, planType: type }))}
                      className={`text-left px-4 py-2 rounded-lg border transition-all text-sm ${
                        insuranceDetails.planType === type
                          ? 'border-slate-900 bg-stone-100 text-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-400 text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* How this helps */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">How this helps you:</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    See which labs and providers are in-network
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Get estimated costs for tests and treatments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Find financial assistance programs you qualify for
                  </li>
                </ul>
              </div>

              {/* Continue Button */}
              <div className="pt-4">
                <button
                  onClick={handleInsuranceDetailsComplete}
                  disabled={!insuranceDetails.carrier || savingInsurance}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {savingInsurance ? (
                    'Saving...'
                  ) : insuranceSaved ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Saved!
                    </>
                  ) : (
                    'Continue →'
                  )}
                </button>
                <button
                  onClick={() => setStep('results')}
                  className="w-full mt-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <div className="space-y-6">
            {/* Profile Summary Header with Edit Options */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    Your Coverage Summary
                  </h2>
                  <p className="text-slate-600 text-sm mb-3">
                    {coverageSummary || 'Personalized coverage information based on your profile'}
                  </p>

                  {/* Profile pills with edit */}
                  <div className="flex flex-wrap gap-2">
                    {cancerType && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-slate-700">
                        {CANCER_TYPES[cancerType] || cancerType}
                        <Link href="/profile" className="hover:text-slate-900">
                          <Edit3 className="w-3 h-3" />
                        </Link>
                      </span>
                    )}
                    {insuranceDetails.carrier ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {insuranceDetails.carrier}
                        {insuranceDetails.planType && insuranceDetails.planType !== "Don't know" && ` (${insuranceDetails.planType})`}
                        <button onClick={() => setStep('insurance-details')} className="hover:text-blue-900">
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </span>
                    ) : insuranceType && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-slate-700">
                        {INSURANCE_TYPES[insuranceType as keyof typeof INSURANCE_TYPES]?.label || insuranceType}
                        <button onClick={() => setStep('insurance')} className="hover:text-slate-900">
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {!cancerType && (
                      <Link
                        href="/profile"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        + Add cancer type
                      </Link>
                    )}
                    {!insuranceDetails.carrier && !insuranceType && (
                      <button
                        onClick={() => setStep('insurance')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        + Add insurance
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Medicare 2026 Numbers */}
            {isMedicare && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">2026 Medicare Numbers</h3>
                  <button
                    onClick={() => setShowMedicareDetails(!showMedicareDetails)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showMedicareDetails ? 'Hide details' : 'Show details'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">${MEDICARE_2026.partA.deductible}</div>
                    <div className="text-sm text-slate-600">Part A Deductible</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">${MEDICARE_2026.partB.deductible}</div>
                    <div className="text-sm text-slate-600">Part B Deductible</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 col-span-2 border-2 border-[#C66B4A]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#C66B4A]/10 text-[#C66B4A]">NEW!</span>
                      <span className="text-sm text-slate-600">Part D Out-of-Pocket Cap</span>
                    </div>
                    <div className="text-2xl font-bold text-[#C66B4A]">${MEDICARE_2026.partD.outOfPocketCap}</div>
                    <div className="text-xs text-slate-500">Maximum you'll pay for prescriptions in 2026</div>
                  </div>
                </div>
                {showMedicareDetails && (
                  <div className="mt-4 pt-4 border-t border-blue-200 space-y-3 text-sm text-slate-600">
                    <p><strong>Part A</strong>: {MEDICARE_2026.partA.description}</p>
                    <p><strong>Part B</strong>: {MEDICARE_2026.partB.description}</p>
                    <p><strong>Part D</strong>: {MEDICARE_2026.partD.description}</p>
                    {insuranceType === 'medicare_advantage' && (
                      <p><strong>Medicare Advantage</strong>: {MEDICARE_2026.advantage.description}. Max out-of-pocket: ${MEDICARE_2026.advantage.maxOutOfPocket}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Treatment Coverage */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Common Treatments & Coverage</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(TREATMENT_COVERAGE).map(([key, treatment]) => {
                  const coverage = isMedicare
                    ? treatment.medicare
                    : { general: 'Check your specific plan for coverage details' }

                  return (
                    <div key={key} className="px-6 py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{treatment.icon}</span>
                        <span className="font-medium text-slate-900">{treatment.label}</span>
                      </div>
                      {isMedicare ? (
                        <div className="ml-9 space-y-1 text-sm">
                          {insuranceType === 'medicare_original' && (
                            <>
                              <p className="text-slate-600"><span className="text-slate-400">Part A:</span> {treatment.medicare.partA}</p>
                              <p className="text-slate-600"><span className="text-slate-400">Part B:</span> {treatment.medicare.partB}</p>
                            </>
                          )}
                          {insuranceType === 'medicare_advantage' && (
                            <p className="text-slate-600">{treatment.medicare.advantage}</p>
                          )}
                          {insuranceType === 'medicare_partd' && key === 'oral_medications' && (
                            <p className="text-slate-600">{treatment.medicare.partD}</p>
                          )}
                          <p className="text-slate-500 text-xs">{treatment.notes}</p>
                        </div>
                      ) : (
                        <p className="ml-9 text-sm text-slate-500">{treatment.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Financial Assistance Programs */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-slate-900">Financial Assistance Programs</h3>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Programs that may help with your costs ({relevantPrograms.length} found)
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {relevantPrograms.map((program, i) => (
                  <a
                    key={i}
                    href={program.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-slate-900 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                          {program.name}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{program.description}</p>
                        <p className="text-xs text-slate-500 mt-1">Eligibility: {program.eligibility}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>


            {/* Financial Assistance Partners */}
            {financialProviders.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">Financial Navigation Partners</h3>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Organizations that help cancer patients navigate costs and find assistance
                  </p>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    {financialProviders.map((provider) => (
                      <a
                        key={provider.id}
                        href={provider.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
                      >
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
                            <Heart className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate group-hover:text-blue-600">
                            {provider.provider}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {provider.coverage_info?.financial_assistance_available && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
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
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    opencancer.ai partners with these organizations to help you navigate costs.
                  </p>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Important Note</p>
                  <p className="mt-1">
                    This is general information only. Coverage varies by specific plan, location, and medical necessity.
                    Contact your insurance provider or a patient financial counselor for your exact coverage.
                  </p>
                </div>
              </div>
            </div>

            {/* Data source attribution - subtle trust signal */}
            <div className="text-center text-xs text-slate-400">
              Coverage data from <a href="https://www.medicare.gov" className="hover:text-slate-600">Medicare.gov</a> •
              Assistance programs from <a href="https://www.cancercare.org" className="hover:text-slate-600">CancerCare</a>, <a href="https://www.ncoa.org" className="hover:text-slate-600">NCOA</a>
            </div>

            {/* Cross-linking */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
              <p className="text-slate-600 mb-3">Looking for clinical trials that might reduce costs?</p>
              <Link
                href="/trials"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                Search Clinical Trials <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Start over */}
            <div className="text-center">
              <button
                onClick={() => {
                  setStep('insurance')
                  setInsuranceType('')
                  setInsuranceDetails({ carrier: '', planType: '' })
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Change insurance type
              </button>
            </div>
          </div>
        )}
      </div>

    </main>
  )
}
