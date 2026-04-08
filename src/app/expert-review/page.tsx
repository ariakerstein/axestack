'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Shield, CheckCircle, Clock, FileText, AlertTriangle, ChevronDown, ChevronUp, Send, ExternalLink, Swords, Zap, Star } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'

interface Expert {
  id: string
  name: string
  title: string
  organization: string
  organizationUrl: string
  image: string
  expertise: string
  bio: string
  price: string
  isFree: boolean
  responseTime: string
  specialties: string[]
}

const experts: Expert[] = [
  {
    id: 'async-expert',
    name: 'Oncology Expert Panel',
    title: 'Board-Certified Oncologists',
    organization: 'opencancer.ai',
    organizationUrl: 'https://opencancer.ai',
    image: '/experts/panel.jpg',
    expertise: 'Combat Review',
    bio: 'Get written expert feedback on your Combat analysis within 48 hours. Our oncologists review the AI findings, validate recommendations, and highlight what to discuss with your care team.',
    price: '$199',
    isFree: false,
    responseTime: '48 hours',
    specialties: ['Combat analysis review', 'Treatment validation', 'Priority questions', 'Care team discussion points']
  },
  {
    id: 'cancer-commons',
    name: 'Dr. Emma Shtivelman',
    title: 'Chief Scientific Officer',
    organization: 'Cancer Commons',
    organizationUrl: 'https://cancercommons.org',
    image: 'https://cdn.prod.website-files.com/68e0582d152c96961cd60580/6911c701f74c0c25d0ff3bc0_Emma-photo-cropped-600x600.jpeg',
    expertise: 'Treatment Decisions',
    bio: 'Leading expert in precision medicine and cancer treatment strategies. Dr. Shtivelman helps patients understand their options and navigate complex treatment decisions.',
    price: 'Free',
    isFree: true,
    responseTime: '3-5 business days',
    specialties: ['Precision medicine', 'Clinical trial matching', 'Treatment optimization', 'Cancer genomics']
  },
  {
    id: 'cclm',
    name: 'Cancer Lifestyle Management',
    title: 'Certified Cancer Coaches',
    organization: 'CCLM',
    organizationUrl: 'https://www.cancerlifestylemgmt.com',
    image: '/cclm-logo.avif',
    expertise: 'Lifestyle & Coaching',
    bio: 'Certified cancer coaches helping patients with nutrition, exercise, stress management, and holistic wellness during and after treatment. Evidence-based lifestyle interventions.',
    price: 'Contact for pricing',
    isFree: false,
    responseTime: '2-3 business days',
    specialties: ['Nutrition counseling', 'Exercise planning', 'Stress management', 'Integrative wellness', 'Survivorship support']
  },
  {
    id: 'protean',
    name: 'Dr. Tony Magliocco',
    title: 'Chief Medical Officer',
    organization: 'Protean Biodiagnostics',
    organizationUrl: 'https://www.proteanbiodx.com',
    image: 'https://images.squarespace-cdn.com/content/v1/5a4c3e3ebff200d1651f0273/1634675812299-RI7TI4MCKGMOUFE167LX/IMG_1551.jpg',
    expertise: 'Pathology Review',
    bio: 'Board-certified pathologist with 25+ years of experience in cancer diagnostics and molecular pathology. Reviews pathology slides and reports for accuracy and additional insights.',
    price: '$650',
    isFree: false,
    responseTime: '5-7 business days',
    specialties: ['Pathology review', 'Molecular diagnostics', 'Biomarker analysis', 'Second opinion on diagnosis']
  }
]

function ExpertReviewContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const combatResultId = searchParams.get('combat')
  const expertParam = searchParams.get('expert')
  const fromCombat = !!combatResultId

  const [step, setStep] = useState<'intro' | 'select' | 'insurance' | 'consent' | 'submit'>('intro')
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [expandedExpert, setExpandedExpert] = useState<string | null>(null)
  const [userRecords, setUserRecords] = useState<any[]>([])
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  const [combatResult, setCombatResult] = useState<any>(null)

  // Insurance question state
  const [hasInsurance, setHasInsurance] = useState<boolean | null>(null)
  const [insuranceProvider, setInsuranceProvider] = useState('')

  // Consent form state
  const [signature, setSignature] = useState('')
  const [hasReadConsent, setHasReadConsent] = useState(false)
  const [hasUnderstoodAI, setHasUnderstoodAI] = useState(false)
  const [hasUnderstoodDisclaimer, setHasUnderstoodDisclaimer] = useState(false)
  const [canWithdraw, setCanWithdraw] = useState(false)

  // Submit form state
  const [question, setQuestion] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Auto-select expert from URL param (e.g., ?expert=protean)
  useEffect(() => {
    if (expertParam) {
      const expert = experts.find(e => e.id === expertParam)
      if (expert) {
        setSelectedExpert(expert)
        setStep('insurance')
      }
    }
  }, [expertParam])

  // Load Combat result if coming from Combat page
  useEffect(() => {
    if (combatResultId) {
      const loadCombatResult = async () => {
        const { data } = await supabase
          .from('combat_results')
          .select('*')
          .eq('id', combatResultId)
          .single()
        if (data) {
          setCombatResult(data)
          // Auto-select the async expert for Combat reviews
          const asyncExpert = experts.find(e => e.id === 'async-expert')
          if (asyncExpert) {
            setSelectedExpert(asyncExpert)
            setStep('insurance')
          }
        }
      }
      loadCombatResult()
    }
  }, [combatResultId])

  useEffect(() => {
    if (user) {
      fetchUserRecords()
      setEmail(user.email || '')
    }
  }, [user])

  const fetchUserRecords = async () => {
    if (!user) return
    const { data } = await supabase
      .from('medical_records')
      .select('id, original_filename, translated_text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setUserRecords(data)
  }

  const handleSelectExpert = (expert: Expert) => {
    setSelectedExpert(expert)
    if (userRecords.length === 0) {
      // No records - prompt to upload first
      setStep('intro')
    } else {
      // Go to insurance question first (for paid services)
      setStep(expert.isFree ? 'consent' : 'insurance')
    }
  }

  const handleInsuranceContinue = () => {
    setStep('consent')
  }

  const isConsentValid = signature.trim().length > 0 && hasReadConsent && hasUnderstoodAI && hasUnderstoodDisclaimer && canWithdraw

  const handleConsentContinue = () => {
    if (isConsentValid) {
      localStorage.setItem('opencancer_expert_consent', JSON.stringify({
        signature,
        timestamp: new Date().toISOString()
      }))
      setStep('submit')
    }
  }

  const handleSubmit = async () => {
    if (!selectedExpert || !question.trim() || !email.trim()) return

    // For async-expert, we need Combat results OR records
    const isCombatReview = selectedExpert.id === 'async-expert' && combatResult
    if (!isCombatReview && selectedRecords.length === 0) return

    setIsSubmitting(true)
    try {
      // For paid async-expert, redirect to Stripe checkout
      if (selectedExpert.id === 'async-expert') {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: 'expert-review',
            userId: user?.id || null,
            email: email,
            combatResultId: combatResult?.id || null,
            metadata: {
              question: question.trim(),
              selectedRecords: selectedRecords.join(','),
              consentSignature: signature,
            },
          }),
        })
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
          return
        } else {
          throw new Error(data.error || 'Failed to create checkout session')
        }
      }

      // For free/other experts, save consultation request directly
      const { error } = await supabase
        .from('expert_consultations')
        .insert({
          user_id: user?.id || null,
          user_email: email,
          expert_id: selectedExpert.id,
          expert_name: selectedExpert.name,
          organization: selectedExpert.organization,
          question: question.trim(),
          selected_records: selectedRecords.length > 0 ? selectedRecords : null,
          combat_result_id: combatResult?.id || null,
          combat_summary: combatResult ? JSON.stringify({
            divergence: combatResult.divergence,
            consensus: combatResult.consensus,
            cancer_type: combatResult.cancer_type,
          }) : null,
          consent_signature: signature,
          consent_timestamp: new Date().toISOString(),
          status: 'pending',
          is_free: selectedExpert.isFree,
        })

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting consultation:', err)
      alert('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-white px-4 py-16">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Request Submitted!</h1>
          <p className="text-slate-600 mb-2">
            Your case has been sent to <strong>{selectedExpert?.name}</strong> at {selectedExpert?.organization}.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Expected response time: {selectedExpert?.responseTime}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/records" className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500">
              Back to Records
            </Link>
            <Link href="/" className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
              Home
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        {step === 'intro' && (
          <>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">👨‍⚕️</div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Expert Case Review</h1>
              <p className="text-slate-600 mb-4">
                Get a second opinion from leading oncology specialists
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-xs text-slate-400">Partnered with</span>
                <a
                  href="https://cancercommons.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <img src="/cancer-commons-logo.png" alt="Cancer Commons" className="h-5 w-auto" />
                  <span className="text-xs font-semibold text-slate-700">Cancer Commons</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Requirements Check */}
            {userRecords.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">Upload Records First</h3>
                    <p className="text-amber-800 mb-4">
                      To request an expert review, you need medical records in your vault. Upload pathology reports, imaging summaries, or lab results first.
                    </p>
                    <Link href="/records" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500">
                      <FileText className="w-4 h-4" /> Go to Records Vault
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">{userRecords.length} record{userRecords.length !== 1 ? 's' : ''} in your vault</p>
                    <p className="text-green-700 text-sm">Ready to share with an expert</p>
                  </div>
                </div>
              </div>
            )}

            {/* How it Works */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8">
              <h2 className="font-bold text-slate-900 mb-4">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-bold">1</div>
                  <div>
                    <p className="font-medium text-slate-900">Select an Expert</p>
                    <p className="text-sm text-slate-600">Choose from PhD-level scientists or MD pathologists</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-bold">2</div>
                  <div>
                    <p className="font-medium text-slate-900">Share Your Records</p>
                    <p className="text-sm text-slate-600">Consent to share specific records from your vault</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-bold">3</div>
                  <div>
                    <p className="font-medium text-slate-900">Get Expert Guidance</p>
                    <p className="text-sm text-slate-600">Receive written recommendations within days</p>
                  </div>
                </div>
              </div>
            </div>

            {userRecords.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setStep('select')}
                  className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                >
                  Select an Expert
                </button>
              </div>
            )}
          </>
        )}

        {/* Expert Selection */}
        {step === 'select' && (
          <>
            <button onClick={() => setStep('intro')} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Select an Expert</h2>

            <div className="space-y-4">
              {experts.map((expert) => {
                const isAsyncExpert = expert.id === 'async-expert'
                return (
                <div
                  key={expert.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectExpert(expert)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                      {isAsyncExpert ? (
                        <Swords className="w-8 h-8 text-slate-600" />
                      ) : expert.image ? (
                        <img
                          src={expert.image}
                          alt={expert.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to initials on image load error
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.parentElement!.innerHTML = `<span class="text-xl font-semibold text-slate-600">${expert.name.split(' ').map(n => n[0]).join('')}</span>`
                          }}
                        />
                      ) : (
                        <span className="text-xl font-semibold text-slate-600">
                          {expert.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{expert.name}</h3>
                          <p className="text-sm text-slate-500">{expert.title}</p>
                          {!isAsyncExpert && (
                            <a href={expert.organizationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {expert.organization} →
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          {expert.isFree ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">Free</span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">{expert.price}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {expert.responseTime}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{expert.expertise}</span>
                      </div>

                      <p className="text-slate-600 text-sm mt-3">{expert.bio}</p>

                      {expandedExpert === expert.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-sm font-medium text-slate-900 mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-2">
                            {expert.specialties.map((s, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedExpert(expandedExpert === expert.id ? null : expert.id)
                        }}
                        className="mt-3 text-sm text-slate-600 hover:text-slate-700 flex items-center gap-1"
                      >
                        {expandedExpert === expert.id ? (
                          <>Less <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>More <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </>
        )}

        {/* Insurance Question */}
        {step === 'insurance' && selectedExpert && (
          <>
            <button onClick={() => setStep('select')} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Insurance & Coverage</h2>
                <p className="text-slate-500 text-sm">Many insurers cover second opinions</p>
              </div>
            </div>

            {/* Selected Expert Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <img src={selectedExpert.image} alt={selectedExpert.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-slate-900">{selectedExpert.name}</p>
                  <p className="text-sm text-slate-500">{selectedExpert.organization} · {selectedExpert.price}</p>
                </div>
              </div>
            </div>

            {/* Insurance Question */}
            <div className="space-y-4 mb-6">
              <p className="font-medium text-slate-900">Do you have health insurance?</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHasInsurance(true)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    hasInsurance === true
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">Yes, I have insurance</p>
                  <p className="text-sm text-slate-500 mt-1">May be covered</p>
                </button>

                <button
                  onClick={() => setHasInsurance(false)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    hasInsurance === false
                      ? 'border-slate-500 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">No / Self-pay</p>
                  <p className="text-sm text-slate-500 mt-1">{selectedExpert.price}</p>
                </button>
              </div>
            </div>

            {/* Insurance Provider (if yes) */}
            {hasInsurance === true && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Insurance Provider (optional)
                </label>
                <input
                  type="text"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="e.g., Blue Cross, Aetna, United Healthcare"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Good news!</strong> Many insurance plans cover second opinions. After checkout, you'll receive documentation to submit for potential reimbursement.
                  </p>
                </div>
              </div>
            )}

            {/* Self-pay info */}
            {hasInsurance === false && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Self-pay pricing:</strong> {selectedExpert.price} covers a comprehensive review with written recommendations delivered within {selectedExpert.responseTime}.
                </p>
              </div>
            )}

            <button
              onClick={handleInsuranceContinue}
              disabled={hasInsurance === null}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                hasInsurance !== null
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continue to Authorization
            </button>
          </>
        )}

        {/* Consent Form */}
        {step === 'consent' && selectedExpert && (
          <>
            <button onClick={() => setStep(selectedExpert.isFree ? 'select' : 'insurance')} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-slate-900">Consent & Authorization</h2>
            </div>

            {/* Plain Language Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">What You're Agreeing To</h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  You're sharing selected medical records with <strong>{selectedExpert.organization}</strong>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {selectedExpert.name} will review your case and provide written recommendations
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  This is for informational purposes - always discuss with your oncologist
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  You can withdraw consent and request data deletion at any time
                </li>
              </ul>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-slate-700">Please confirm:</p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={hasReadConsent} onChange={(e) => setHasReadConsent(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-600">I consent to sharing my medical records with {selectedExpert.organization}</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={hasUnderstoodAI} onChange={(e) => setHasUnderstoodAI(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-600">I understand AI tools may be used to assist in the review process</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={hasUnderstoodDisclaimer} onChange={(e) => setHasUnderstoodDisclaimer(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-600">I understand this is informational only and does not replace my doctor's advice</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={canWithdraw} onChange={(e) => setCanWithdraw(e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-600">I understand I can withdraw consent at any time by contacting info@opencancer.ai</span>
              </label>
            </div>

            {/* Electronic Signature */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Electronic Signature *
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name to sign"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                By typing your name, you electronically sign this authorization
              </p>
            </div>

            <button
              onClick={handleConsentContinue}
              disabled={!isConsentValid}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                isConsentValid
                  ? 'bg-gradient-to-r from-slate-600 to-slate-600 text-white hover:opacity-90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </>
        )}

        {/* Submit Form */}
        {step === 'submit' && selectedExpert && (
          <>
            <button onClick={() => setStep('consent')} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Submit Your Case</h2>

            {/* Selected Expert Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-xl">🔬</div>
              <div>
                <p className="font-semibold text-slate-900">{selectedExpert.name}</p>
                <p className="text-sm text-slate-500">{selectedExpert.expertise} • {selectedExpert.organization}</p>
              </div>
            </div>

            {/* Select Records */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Records to Share ({selectedRecords.length} selected)
              </label>
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                {userRecords.map((record) => (
                  <label key={record.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
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
                    />
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{record.original_filename || 'Medical Record'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>

            {/* Question */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Question or Context *
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Describe your case or what you'd like the expert to review. Include any specific questions..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
              />
            </div>

            {/* Price Notice */}
            {!selectedExpert.isFree && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> {selectedExpert.organization} charges {selectedExpert.price} for this review. You'll receive payment instructions after submission.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Expected response: {selectedExpert.responseTime}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || !email.trim() || selectedRecords.length === 0 || isSubmitting}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  question.trim() && email.trim() && selectedRecords.length > 0 && !isSubmitting
                    ? 'bg-gradient-to-r from-slate-600 to-slate-600 text-white hover:opacity-90'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Submitting...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit to {selectedExpert.name}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function ExpertReviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </main>
    }>
      <ExpertReviewContent />
    </Suspense>
  )
}
