'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CANCER_TYPES } from '@/lib/cancer-data'
import { useAnalytics } from '@/hooks/useAnalytics'
import { saveProfile } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { Navbar } from '@/components/Navbar'
import { User, Heart, Ribbon, ArrowRight, Check, Mail, Waves, Scale, FlaskConical } from 'lucide-react'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

type CommunicationStyle = 'gentle' | 'balanced' | 'research'

interface PatientProfile {
  role: 'patient' | 'caregiver'
  name: string
  email: string
  cancerType: string
  stage?: string
  location?: string
  createdAt?: string
  communicationStyle?: CommunicationStyle
}

const COMMUNICATION_STYLES = [
  {
    id: 'gentle' as CommunicationStyle,
    icon: Waves,
    label: 'Gentle',
    description: 'Simple, supportive language. Focus on what matters most.',
  },
  {
    id: 'balanced' as CommunicationStyle,
    icon: Scale,
    label: 'Balanced',
    description: 'Clear explanations with medical terms defined.',
  },
  {
    id: 'research' as CommunicationStyle,
    icon: FlaskConical,
    label: 'Research',
    description: 'Full details, citations, and clinical specifics.',
  },
]

// Lego Technique stats - two facts, let user connect
const STATS = {
  treatment_changes: '1 in 3',
  never_seek: '84%',
  source: 'MSK study'
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile: authProfile, refreshProfile, signOut, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<PatientProfile | null>(null)

  // Wizard state
  const [step, setStep] = useState(0)  // 0=intro, 1=role, 2=cancer, 3=email
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cancerType, setCancerType] = useState('')
  const [cancerSearch, setCancerSearch] = useState('')
  const [stage, setStage] = useState('')
  const [location, setLocation] = useState('')
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle>('balanced')
  const [saved, setSaved] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const { trackEvent } = useAnalytics()

  // Filter cancer types based on search
  const filteredCancerTypes = useMemo(() => {
    const search = cancerSearch.toLowerCase()
    return Object.entries(CANCER_TYPES).filter(([key, label]) =>
      label.toLowerCase().includes(search) || key.toLowerCase().includes(search)
    )
  }, [cancerSearch])

  // Common cancer types for quick selection
  const commonCancerTypes = ['breast', 'prostate', 'lung', 'colorectal', 'melanoma', 'lymphoma']

  useEffect(() => {
    // If user is logged in and has a Supabase profile, use that
    if (user && authProfile) {
      setProfile({
        role: authProfile.role,
        name: authProfile.name,
        email: authProfile.email,
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
        location: authProfile.location || undefined,
        createdAt: authProfile.created_at,
      })
      setRole(authProfile.role || 'patient')
      setName(authProfile.name || '')
      setEmail(authProfile.email || user.email || '')
      setCancerType(authProfile.cancer_type || '')
      setStage(authProfile.stage || '')
      setLocation(authProfile.location || '')
      // Skip intro if already has profile
      if (authProfile.cancer_type) setStep(4)
      // Load communication style from localStorage (not in Supabase schema yet)
      const savedLocal = localStorage.getItem('patient-profile')
      if (savedLocal) {
        try {
          const p = JSON.parse(savedLocal)
          setCommunicationStyle(p.communicationStyle || 'balanced')
        } catch { /* ignore */ }
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        const p = JSON.parse(saved)
        setProfile(p)
        setRole(p.role || 'patient')
        setName(p.name || '')
        setCommunicationStyle(p.communicationStyle || 'balanced')
        setEmail(p.email || (user?.email || ''))
        setCancerType(p.cancerType || '')
        setStage(p.stage || '')
        setLocation(p.location || '')
        // Skip to edit mode if already has profile
        if (p.cancerType) setStep(4)
      } else if (user?.email) {
        setEmail(user.email)
      }
    }
  }, [user, authProfile])

  const handleSave = async () => {
    const newProfile: PatientProfile = {
      role,
      name,
      email,
      cancerType,
      stage: stage || undefined,
      location: location || undefined,
      communicationStyle,
      createdAt: profile?.createdAt || new Date().toISOString(),
    }

    // Save to localStorage for offline access
    localStorage.setItem('patient-profile', JSON.stringify(newProfile))
    setProfile(newProfile)
    setSaved(true)

    // Save to Supabase
    await saveProfile({
      email,
      name,
      role,
      cancerType,
      stage: stage || undefined,
      location: location || undefined,
    })

    // Refresh auth context profile
    if (user) {
      await refreshProfile()
    }

    // Track profile creation/update
    const isNewProfile = !profile?.createdAt
    trackEvent(isNewProfile ? 'profile_created' : 'profile_updated', {
      role,
      cancer_type: cancerType,
      has_stage: !!stage,
      has_location: !!location,
    })

    // Redirect to home with success message
    setTimeout(() => {
      router.push('/?profile=saved')
    }, 500)
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const canSave = name.trim() && cancerType && email && isValidEmail(email)

  const handleClear = () => {
    localStorage.removeItem('patient-profile')
    setProfile(null)
    setRole('patient')
    setName('')
    setEmail('')
    setCancerType('')
    setStage('')
    setLocation('')
    setStep(0)
  }

  // Micro-compliance: track progress
  const progress = step === 0 ? 0 : Math.min((step / 3) * 100, 100)

  return (
    <main className="min-h-screen bg-[#f5f3ee]">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress bar - only show during wizard steps 1-3 */}
        {step > 0 && step < 4 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Step {step} of 3</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C66B4A] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ===== STEP 0: What you'll get ===== */}
        {step === 0 && (
          <div className="text-center">
            {/* Thinking animation */}
            <div className="flex justify-center mb-4">
              <ThinkingIndicator size={56} variant="light" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Your AI Cancer Toolkit
            </h1>
            <p className="text-slate-500 mb-6">
              Answer 3 quick questions to unlock personalized tools
            </p>

            {/* What you'll get - clear value */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 text-left">
              <p className="text-xs font-medium text-slate-500 uppercase mb-3">You&apos;ll unlock:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm">📋</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Records Analysis</p>
                    <p className="text-xs text-slate-500">Upload records, get plain-English translation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-600 text-sm">⚔️</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">5-Perspective Combat</p>
                    <p className="text-xs text-slate-500">AI experts debate your diagnosis & treatment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 text-sm">🔬</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Clinical Trial Matching</p>
                    <p className="text-xs text-slate-500">Find trials that match your cancer type</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-4 px-6 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#C66B4A]/25 flex items-center justify-center gap-2"
            >
              Set up my toolkit
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-slate-500 mt-4">
              Free • 30 seconds • No credit card
            </p>
          </div>
        )}

        {/* ===== STEP 1: ROLE (Easy yes) ===== */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              What&apos;s your role?
            </h1>
            <p className="text-slate-500 mb-6">Tap to select</p>

            <div className="space-y-3">
              <button
                onClick={() => { setRole('patient'); setStep(2) }}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                  role === 'patient'
                    ? 'border-[#C66B4A] bg-stone-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Ribbon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Patient</p>
                  <p className="text-sm text-slate-500">I&apos;m managing my own diagnosis</p>
                </div>
              </button>

              <button
                onClick={() => { setRole('caregiver'); setStep(2) }}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                  role === 'caregiver'
                    ? 'border-[#C66B4A] bg-stone-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Caregiver</p>
                  <p className="text-sm text-slate-500">I&apos;m supporting someone with cancer</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: CANCER TYPE (Personal but easy) ===== */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              What cancer type?
            </h1>
            <p className="text-slate-500 mb-6">
              {role === 'caregiver' ? 'For the person you\'re supporting' : 'Select or search'}
            </p>

            {/* Common types - quick taps */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {commonCancerTypes.map((key) => (
                <button
                  key={key}
                  onClick={() => { setCancerType(key); setStep(3) }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    cancerType === key
                      ? 'border-[#C66B4A] bg-stone-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">
                    {CANCER_TYPES[key as keyof typeof CANCER_TYPES]}
                  </p>
                </button>
              ))}
            </div>

            {/* Search for other types */}
            <div className="relative mb-4">
              <input
                type="text"
                value={cancerSearch}
                onChange={(e) => setCancerSearch(e.target.value)}
                placeholder="Search other types..."
                className="w-full px-4 py-3 pl-10 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C66B4A]/20 focus:border-[#C66B4A] text-sm"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Search results */}
            {cancerSearch && (
              <div className="bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                {filteredCancerTypes.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setCancerType(key); setCancerSearch(''); setStep(3) }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-100 last:border-0"
                  >
                    {label}
                  </button>
                ))}
                {filteredCancerTypes.length === 0 && (
                  <p className="px-4 py-3 text-sm text-slate-500">No matching types</p>
                )}
              </div>
            )}

            {/* Tribe: Social proof */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-600 italic">
                &ldquo;Sarah, breast cancer Stage II, found 3 missing tests her oncologist hadn&apos;t ordered.&rdquo;
              </p>
            </div>

            <button
              onClick={() => setStep(1)}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
          </div>
        )}

        {/* ===== STEP 3: EMAIL (Save your progress) ===== */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Save your toolkit
            </h1>
            <p className="text-slate-500 mb-6">
              So you can access your {CANCER_TYPES[cancerType as keyof typeof CANCER_TYPES] || cancerType} tools anytime
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {role === 'caregiver' ? "Patient's Name" : 'Your Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'caregiver' ? "Patient's name" : 'Your name'}
                  className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C66B4A]/20 focus:border-[#C66B4A]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 pl-10 bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:ring-2 focus:ring-[#C66B4A]/20 focus:border-[#C66B4A] ${
                      email && !isValidEmail(email) ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              {/* Optional fields collapsed by default */}
              <details className="group">
                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                  + Add stage & location (optional)
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stage
                    </label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C66B4A]/20 focus:border-[#C66B4A]"
                    >
                      <option value="">Select stage...</option>
                      <option value="0">Stage 0 (In Situ)</option>
                      <option value="I">Stage I</option>
                      <option value="II">Stage II</option>
                      <option value="III">Stage III</option>
                      <option value="IV">Stage IV</option>
                      <option value="unknown">Unknown / Not staged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State or ZIP"
                      className="w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C66B4A]/20 focus:border-[#C66B4A]"
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* CTA */}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`w-full mt-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                canSave
                  ? 'bg-[#C66B4A] text-white hover:bg-[#B35E40] shadow-lg shadow-[#C66B4A]/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Opening toolkit...
                </>
              ) : (
                <>
                  Open My Toolkit
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 text-center mt-3">
              We&apos;ll email you a link to access your tools anytime
            </p>

            <button
              onClick={() => setStep(2)}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
          </div>
        )}

        {/* ===== STEP 4: EDIT MODE (for existing profiles) ===== */}
        {step === 4 && profile && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">
              Your Profile
            </h1>

            {/* Current profile summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    role === 'caregiver' ? 'bg-[#C66B4A]/10' : 'bg-slate-100'
                  }`}>
                    {role === 'caregiver' ? (
                      <Heart className="w-5 h-5 text-[#C66B4A]" />
                    ) : (
                      <Ribbon className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-sm text-slate-500">{role === 'caregiver' ? 'Caregiver' : 'Patient'}</p>
                  </div>
                </div>
                {user && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Synced
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Cancer:</strong> {CANCER_TYPES[cancerType as keyof typeof CANCER_TYPES] || cancerType}</p>
                {stage && <p><strong>Stage:</strong> {stage}</p>}
                {location && <p><strong>Location:</strong> {location}</p>}
                <p><strong>Email:</strong> {email}</p>
              </div>
            </div>

            {/* Edit form */}
            <div className="space-y-4">
              {/* Role toggle */}
              <div className={`rounded-xl p-4 border-2 transition-all ${
                role === 'caregiver' ? 'bg-stone-50 border-[#C66B4A]' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {role === 'caregiver' ? (
                      <Heart className="w-5 h-5 text-[#C66B4A]" />
                    ) : (
                      <Ribbon className="w-5 h-5 text-slate-600" />
                    )}
                    <span className="font-medium text-slate-900">
                      {role === 'caregiver' ? 'Caregiver Mode' : 'Patient Mode'}
                    </span>
                  </div>
                  <button
                    onClick={() => setRole(role === 'caregiver' ? 'patient' : 'caregiver')}
                    className="text-sm text-[#C66B4A] hover:underline"
                  >
                    Switch
                  </button>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Cancer type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cancer Type</label>
                <select
                  value={cancerType}
                  onChange={(e) => setCancerType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                >
                  {Object.entries(CANCER_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Stage & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Not specified</option>
                    <option value="0">Stage 0</option>
                    <option value="I">Stage I</option>
                    <option value="II">Stage II</option>
                    <option value="III">Stage III</option>
                    <option value="IV">Stage IV</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Communication Style */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Communication Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {COMMUNICATION_STYLES.map((style) => {
                    const Icon = style.icon
                    const isSelected = communicationStyle === style.id
                    return (
                      <button
                        key={style.id}
                        onClick={() => setCommunicationStyle(style.id)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? 'border-[#C66B4A] bg-orange-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          isSelected ? 'text-[#C66B4A]' : 'text-slate-400'
                        }`} />
                        <p className={`text-sm font-medium ${
                          isSelected ? 'text-[#C66B4A]' : 'text-slate-700'
                        }`}>
                          {style.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 leading-tight">
                          {style.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  canSave
                    ? 'bg-[#C66B4A] text-white hover:bg-[#B35E40]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saved ? '✓ Saved!' : 'Save Changes'}
              </button>

              {/* Clear / Sign out */}
              <div className="flex gap-3">
                <button
                  onClick={handleClear}
                  className="flex-1 py-2 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg"
                >
                  Clear profile
                </button>
                {user && (
                  <button
                    onClick={() => signOut()}
                    className="flex-1 py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  )
}
