'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Check, Sparkles, Dna, CheckCircle, ClipboardList, Stethoscope,
  Microscope, BookOpen, FlaskConical, FolderClosed, UserRound,
  Heart, Users, Ribbon, Notebook, PenLine, Compass, DollarSign
} from 'lucide-react'

// Cancer types for profile display
const CANCER_TYPES: Record<string, string> = {
  breast: 'Breast Cancer',
  lung: 'Lung Cancer',
  prostate: 'Prostate Cancer',
  colorectal: 'Colorectal Cancer',
  melanoma: 'Melanoma',
  lymphoma: 'Lymphoma',
  leukemia: 'Leukemia',
  pancreatic: 'Pancreatic Cancer',
  ovarian: 'Ovarian Cancer',
  bladder: 'Bladder Cancer',
  kidney: 'Kidney Cancer',
  thyroid: 'Thyroid Cancer',
  liver: 'Liver Cancer',
  brain: 'Brain Cancer',
  other: 'Other Cancer Type',
}

interface PatientProfile {
  role: 'patient' | 'caregiver'
  name: string
  email: string
  cancerType: string
  stage?: string
  location?: string
}

// Atom Animation Component
function AtomIcon() {
  return (
    <div className="relative w-6 h-6" style={{ perspective: '150px', perspectiveOrigin: 'center' }}>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="w-2.5 h-2.5 rounded-full" style={{
          background: 'radial-gradient(circle at 30% 30%, #E879F9, #A855F7 50%, #7C3AED 100%)',
          boxShadow: '0 2px 6px rgba(168, 85, 247, 0.4)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
        <div className="absolute top-1/2 -left-0.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{
          background: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9 100%)',
          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{
          background: 'radial-gradient(circle at 35% 35%, #67E8F9, #06B6D4 50%, #0891B2 100%)',
          boxShadow: '0 1px 3px rgba(6, 182, 212, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
          background: 'radial-gradient(circle at 35% 35%, #FBCFE8, #EC4899 50%, #DB2777 100%)',
          boxShadow: '0 1px 3px rgba(236, 72, 153, 0.5)',
        }} />
      </div>
    </div>
  )
}

// Testimonials data
const TESTIMONIALS = [
  {
    quote: "These tools found a clinical trial my oncologist hadn't mentioned. I enrolled 2 years ago and I'm still here.",
    name: "Michael T.",
    context: "Stage IV Colorectal",
  },
  {
    quote: "After my diagnosis, I was drowning in information. Finally got clarity on what questions to actually ask.",
    name: "Brad P.",
    context: "Cancer Advocate",
  },
  {
    quote: "I'm going to point every newly diagnosed patient here.",
    name: "Russ",
    context: "Cancer Survivor",
  },
  {
    quote: "What you have built here is critical for patients.",
    name: "Cam",
    context: "Oncology Advisor",
  },
  {
    quote: "This is brilliant. Sharing my records with my sister now.",
    name: "David Y.",
    context: "Patient",
  },
]

// Upcoming events interface
interface UpcomingEvent {
  id: string
  date: string
  time: string
  title: string
  speaker?: string
  rsvpUrl: string
}

// Fallback events
const FALLBACK_EVENTS: UpcomingEvent[] = [
  {
    id: 'event-1',
    date: 'Apr 15',
    time: '12:00 PM EST',
    title: '"The Space Between the Guidelines: Advocacy, Choice, and Personalization"',
    speaker: 'Sarah Friend, MD',
    rsvpUrl: 'https://community.cancerpatientlab.org/c/events/',
  },
  {
    id: 'event-2',
    date: 'Apr 22',
    time: '1:00 PM EST',
    title: 'Patient & Caregiver Discussion',
    speaker: 'Safe space for sharing',
    rsvpUrl: 'https://community.cancerpatientlab.org/c/events/',
  },
]

function HomeContent() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<UpcomingEvent[]>(FALLBACK_EVENTS)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [mode, setMode] = useState<'wizard' | 'explore'>('wizard')
  const [wizardStep, setWizardStep] = useState<number>(1)
  const [showAllTools, setShowAllTools] = useState(false)

  // Wizard form state
  const [wizardRole, setWizardRole] = useState<'patient' | 'caregiver' | null>(null)
  const [wizardName, setWizardName] = useState('')
  const [wizardEmail, setWizardEmail] = useState('')
  const [wizardCancerType, setWizardCancerType] = useState('')
  const [wizardStage, setWizardStage] = useState('')
  const [wizardSaving, setWizardSaving] = useState(false)

  // Load profile and check for success message
  useEffect(() => {
    const saved = localStorage.getItem('patient-profile')
    if (saved) {
      setProfile(JSON.parse(saved))
    }
    if (searchParams.get('profile') === 'saved') {
      setShowSuccess(true)
      window.history.replaceState({}, '', '/')
      setTimeout(() => setShowSuccess(false), 4000)
    }
  }, [searchParams])

  // Fetch events from Circle API
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch(
          'https://felofmlhqwcdpiyjgstx.supabase.co/functions/v1/circle-events?limit=2',
          {
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ',
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.events?.length > 0) {
            setEvents(result.events.slice(0, 2))
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      }
    }
    fetchEvents()
  }, [])

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Success Toast */}
      {showSuccess && (
        <div
          className="fixed top-4 left-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
          style={{ transform: 'translateX(-50%)', animation: 'slideDown 0.3s ease-out' }}
        >
          <Check className="w-5 h-5" />
          <div>
            <p className="font-medium">Profile saved!</p>
            <p className="text-sm text-emerald-100">Your tools are now personalized</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-8 pt-24 pb-16 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-fuchsia-400/15 rounded-full blur-3xl" />

        <div className="relative text-center max-w-4xl">
          {profile ? (
            <>
              {/* Brand */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
                  opencancer
                </span>
                <span className="text-slate-400">.a</span>
                <span className="relative inline-block">
                  <span className="text-slate-400">ı</span>
                  <span className="absolute -top-[0.12em] left-1/2 -translate-x-1/2 scale-50 origin-center">
                    <AtomIcon />
                  </span>
                </span>
              </h1>

              {/* Role badge */}
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                profile.role === 'caregiver'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                <span className="flex items-center gap-1.5">
                  {profile.role === 'caregiver' ? <><Heart className="w-4 h-4" /> Caregiver</> : <><Ribbon className="w-4 h-4" /> Patient</>}
                </span>
              </span>

              <p className="text-2xl md:text-3xl font-semibold text-slate-700 mb-2">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">{profile.name.split(' ')[0]}</span>
              </p>
              <p className="text-lg text-slate-600 mb-3">
                {CANCER_TYPES[profile.cancerType] || profile.cancerType}
                {profile.stage && ` • Stage ${profile.stage}`}
              </p>
              <Link href="/profile" className="inline-flex items-center gap-2 text-sm bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 px-4 py-2 rounded-lg transition-colors">
                <span>Edit {profile.name.split(' ')[0]}'s profile</span>
                <span>→</span>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
                  opencancer
                </span>
                <span className="text-slate-400">.a</span>
                <span className="relative inline-block">
                  {/* Dotless i (ı) with atom as the dot */}
                  <span className="text-slate-400">ı</span>
                  <span className="absolute -top-[0.12em] left-1/2 -translate-x-1/2 scale-50 origin-center">
                    <AtomIcon />
                  </span>
                </span>
              </h1>

              <p className="text-2xl text-slate-600 mb-4 font-light">
                Tools for the AI-enabled patient & caregiver.
              </p>

              <p className="text-slate-500 max-w-xl mx-auto mb-8">
                In 2018, I was diagnosed with cancer as a new dad. The medical system gave me data. What I needed was clarity. These tools exist because patients deserve better. Navigate your cancer with clarity.
              </p>

              {/* Dual-path entry */}
              <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
                <button
                  onClick={() => { setMode('wizard'); setWizardStep(1); setWizardRole(null); }}
                  className={`group rounded-2xl p-5 text-left transition-all ${
                    mode === 'wizard'
                      ? 'bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-400 shadow-lg'
                      : 'bg-white border-2 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      <AtomIcon />
                    </div>
                    <span className={`font-semibold ${mode === 'wizard' ? 'text-violet-700' : 'text-slate-900'}`}>Help me get started</span>
                  </div>
                  <p className="text-slate-500 text-sm">AI-powered personalized recommendations</p>
                </button>

                <button
                  onClick={() => setMode('explore')}
                  className={`group rounded-2xl p-5 text-left transition-all ${
                    mode === 'explore'
                      ? 'bg-white border-2 border-slate-400 shadow-lg'
                      : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Compass className="w-6 h-6 text-slate-500" />
                    <span className={`font-semibold ${mode === 'explore' ? 'text-slate-900' : 'text-slate-700'}`}>I'll explore on my own</span>
                  </div>
                  <p className="text-slate-500 text-sm">Browse all tools and resources</p>
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Wizard Section - shows when mode is 'wizard' and no profile */}
      {!profile && mode === 'wizard' && (
        <section className="px-8 pb-8 max-w-xl mx-auto">
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-6">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    wizardStep >= step
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-8 h-0.5 ${wizardStep > step ? 'bg-violet-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Role */}
            {wizardStep === 1 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Are you a patient or caregiver?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setWizardRole('patient'); setWizardStep(2); }}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-400 hover:shadow-md transition-all text-left"
                  >
                    <Ribbon className="w-8 h-8 text-violet-500 mb-2" />
                    <span className="font-medium text-slate-900 block">I'm a patient</span>
                    <span className="text-sm text-slate-500">Navigating my own diagnosis</span>
                  </button>
                  <button
                    onClick={() => { setWizardRole('caregiver'); setWizardStep(2); }}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-400 hover:shadow-md transition-all text-left"
                  >
                    <Heart className="w-8 h-8 text-pink-500 mb-2" />
                    <span className="font-medium text-slate-900 block">I'm a caregiver</span>
                    <span className="text-sm text-slate-500">Supporting a loved one</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Name & Email */}
            {wizardStep === 2 && (
              <div>
                <button onClick={() => setWizardStep(1)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {wizardRole === 'caregiver' ? "Tell us about you and who you're caring for" : "Tell us about yourself"}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {wizardRole === 'caregiver' ? "Patient's name" : "Your name"}
                    </label>
                    <input
                      type="text"
                      value={wizardName}
                      onChange={(e) => setWizardName(e.target.value)}
                      placeholder="First name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Your email</label>
                    <input
                      type="email"
                      value={wizardEmail}
                      onChange={(e) => setWizardEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => wizardName.trim() && setWizardStep(3)}
                    disabled={!wizardName.trim()}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Cancer Type */}
            {wizardStep === 3 && (
              <div>
                <button onClick={() => setWizardStep(2)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">What type of cancer?</h3>
                <div className="space-y-4">
                  <select
                    value={wizardCancerType}
                    onChange={(e) => setWizardCancerType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Select cancer type...</option>
                    {Object.entries(CANCER_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => wizardCancerType && setWizardStep(4)}
                    disabled={!wizardCancerType}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Stage (optional) & Save */}
            {wizardStep === 4 && (
              <div>
                <button onClick={() => setWizardStep(3)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Almost done!</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stage (optional)</label>
                    <select
                      value={wizardStage}
                      onChange={(e) => setWizardStage(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="">Select stage...</option>
                      <option value="0">Stage 0</option>
                      <option value="I">Stage I</option>
                      <option value="II">Stage II</option>
                      <option value="III">Stage III</option>
                      <option value="IV">Stage IV</option>
                      <option value="unknown">Unknown / Not staged</option>
                    </select>
                  </div>

                  {/* Summary */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-500 mb-2">Profile summary:</p>
                    <p className="font-medium text-slate-900">{wizardName}</p>
                    <p className="text-slate-600 text-sm">
                      {CANCER_TYPES[wizardCancerType]}
                      {wizardStage && ` • Stage ${wizardStage}`}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">{wizardRole === 'caregiver' ? 'Caregiver' : 'Patient'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setWizardSaving(true)
                      const newProfile: PatientProfile = {
                        role: wizardRole!,
                        name: wizardName.trim(),
                        email: wizardEmail.trim(),
                        cancerType: wizardCancerType,
                        stage: wizardStage || undefined,
                      }
                      localStorage.setItem('patient-profile', JSON.stringify(newProfile))
                      setProfile(newProfile)
                      setShowSuccess(true)
                      setTimeout(() => setShowSuccess(false), 4000)
                      setWizardSaving(false)
                    }}
                    disabled={wizardSaving}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {wizardSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Save & Get Started
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Skip option */}
            <p className="text-sm text-slate-500 mt-4 text-center">
              <button onClick={() => setMode('explore')} className="text-violet-600 hover:text-violet-700 font-medium">
                Skip for now →
              </button>
            </p>
          </div>
        </section>
      )}

      {/* Patient Tools Grid - shows when mode is 'explore' or user has profile */}
      <section className={`py-16 px-8 bg-slate-50 ${!profile && mode === 'wizard' ? 'hidden' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">Patient Tools</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">AI-powered navigation for your cancer journey</p>

          {/* Core Tools - Always visible */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* AI Second Opinion - Featured */}
            <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="group bg-gradient-to-br from-violet-100 to-fuchsia-50 border-2 border-violet-300 rounded-xl p-5 hover:border-violet-500 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Dna className="w-6 h-6 text-violet-600" />
                <h3 className="font-bold text-slate-900 group-hover:text-violet-700">AI Case Review</h3>
              </div>
              <p className="text-slate-600 text-sm">Upload your records. Get a complete second opinion.</p>
            </a>

            <Link href="/cancer-checklist" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6 text-violet-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-violet-600">Cancer Checklist</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">NCCN</span>
              </div>
              <p className="text-slate-600 text-sm">Test recommendations + questions for your oncologist.</p>
            </Link>

            <Link href="/records" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <FolderClosed className="w-6 h-6 text-emerald-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Records Vault</h3>
              </div>
              <p className="text-slate-600 text-sm">Collect, store, and translate your medical records.</p>
            </Link>

            <Link href="/ask" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-fuchsia-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <AtomIcon />
                <h3 className="font-bold text-slate-900 group-hover:text-fuchsia-600">Ask AI</h3>
              </div>
              <p className="text-slate-600 text-sm">Quick questions about treatments, tests, or side effects.</p>
            </Link>

            <Link href="/trials" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Microscope className="w-6 h-6 text-blue-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">Clinical Trials</h3>
              </div>
              <p className="text-slate-600 text-sm">Find trials matched to your cancer and location.</p>
            </Link>

            <Link href="/coverage" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-6 h-6 text-emerald-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Financial Coverage</h3>
              </div>
              <p className="text-slate-600 text-sm">Insurance coverage + financial assistance programs.</p>
            </Link>
          </div>

          {/* More Tools - Expandable */}
          <div className="text-center">
            <button
              onClick={() => setShowAllTools(!showAllTools)}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium inline-flex items-center gap-1"
            >
              {showAllTools ? 'Show less' : 'More tools'}
              <span className={`transition-transform ${showAllTools ? 'rotate-180' : ''}`}>↓</span>
            </button>
          </div>

          {showAllTools && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200">
              <a href="https://axestack.com/oncologists" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-teal-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className="w-5 h-5 text-teal-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-600">Find Oncologist</h3>
                </div>
                <p className="text-slate-600 text-xs">Find specialists by cancer type, location, insurance.</p>
              </a>

              <a href="https://axestack.com/research" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-cyan-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5 text-cyan-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600">Research Library</h3>
                </div>
                <p className="text-slate-600 text-xs">Search 200M+ papers with AI summaries.</p>
              </a>

              <a href="https://axestack.com/tests" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-orange-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-orange-600">Precision Testing</h3>
                </div>
                <p className="text-slate-600 text-xs">MRD, genomic tests, and monitoring options.</p>
              </a>

              <a href="https://navis.health" target="_blank" rel="noopener noreferrer" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-amber-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <UserRound className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">Expert Consult</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">PREMIUM</span>
                </div>
                <p className="text-slate-600 text-xs">1:1 video with oncology specialists for complex cases.</p>
              </a>

              <Link href="/hub" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-rose-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-rose-600">CareCircle</h3>
                </div>
                <p className="text-slate-600 text-xs">Stop repeating yourself. Update everyone at once.</p>
              </Link>

              <a href="https://community.cancerpatientlab.org/" target="_blank" rel="noopener noreferrer" className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-pink-400 hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-pink-500" />
                  <h3 className="font-semibold text-slate-900 group-hover:text-pink-600">Community</h3>
                </div>
                <p className="text-slate-600 text-xs">Connect with patients and caregivers.</p>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Trust Bar - Data Sources */}
      <section className="py-6 px-8 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Data from trusted sources</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              NCCN Guidelines
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              ClinicalTrials.gov
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              Medicare.gov
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              NCI
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              Cancer Commons
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
              CancerPatient Lab
            </span>
          </div>
        </div>
      </section>

      {/* What patients are saying - Scrolling */}
      <section className="py-12 px-8 bg-slate-50 border-t border-slate-200 overflow-hidden">
        <style jsx>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .testimonial-scroll {
            animation: scroll 30s linear infinite;
          }
          .testimonial-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">What patients are saying</h2>
        </div>

        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-slate-50 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-slate-50 to-transparent" />

          {/* Scrolling content */}
          <div className="flex gap-8 testimonial-scroll">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
              <div key={index} className="flex-shrink-0 max-w-md">
                <p className="text-lg italic text-slate-700">
                  "{testimonial.quote}"
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  — {testimonial.name}, {testimonial.context}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 px-8 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">Team</h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            Oncologists, scientists, and cancer survivors building tools that matter.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "Ari Akerstein, MS", title: "Co-Founder/CEO", subtitle: "Meta · 2x Survivor", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/64694c7d-e3e3-414f-af72-288d201bb060/Screenshot+2024-10-02+at+10.59.02%E2%80%AFAM.jpg" },
              { name: "Brad Power", title: "Co-Founder/Chief Trust", subtitle: "Stanford · Survivor", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/48fdd96b-71a0-41f9-bc5f-f1ae27636b95/Screenshot+2024-09-11+at+7.36.59%E2%80%AFPM.png" },
              { name: "Chris Apfel, MD/PhD", title: "Chief Medical Officer", subtitle: "UCSF · 500+ publications", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5761840d-8d31-4c56-a09e-c6f27510bc5a/Chris-Apfel-Nature-removebg-preview.png" },
              { name: "Kaumudi Bhawe, PhD", title: "Chief Scientific Officer", subtitle: "Genentech · Cancer Commons", image: "https://navis.health/pitchAssets/kaumudi.jpg" },
              { name: "Viktor Tabori", title: "Head of Growth", subtitle: "Stanford · Deloitte", image: "https://navis.health/pitchAssets/viktor.jpg" },
            ].map((person, i) => (
              <div key={i} className="text-center">
                <img
                  src={person.image}
                  alt={person.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-violet-200 shadow-md"
                />
                <p className="text-sm font-semibold text-slate-900 leading-tight">{person.name}</p>
                <p className="text-xs text-violet-600 font-medium">{person.title}</p>
                <p className="text-[10px] text-slate-500">{person.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <a href="https://cancerhackerlab.com" target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              View all advisors →
            </a>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-12 px-8 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
            <a
              href="https://community.cancerpatientlab.org/c/events/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              View all →
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {events.map((event) => (
              <a
                key={event.id}
                href={event.rsvpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded">{event.date}</span>
                  <span className="text-xs text-slate-500">{event.time}</span>
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-violet-600 mb-1 line-clamp-2">{event.title}</h3>
                {event.speaker && (
                  <p className="text-sm text-slate-500">{event.speaker}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Resources in footer */}
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <a href="https://ariakerstein.com/chemolog" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1.5">
              <Notebook className="w-4 h-4" /> Chemolog
            </a>
            <a href="https://www.ariakerstein.com/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1.5">
              <PenLine className="w-4 h-4" /> Field Notes
            </a>
            <a href="https://cancerhackerlab.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1.5">
              <Microscope className="w-4 h-4" /> Cancer Hacker Lab
            </a>
          </div>

          {/* Nav */}
          <div className="flex justify-between items-center text-sm text-slate-500 pt-6 border-t border-slate-100">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <div className="flex gap-6">
              <Link href="/records" className="hover:text-slate-900 transition-colors">Records</Link>
              <a href="https://community.cancerpatientlab.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">Community</a>
              <a href="https://axestack.com" className="hover:text-slate-900 transition-colors">For Founders</a>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} opencancer.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}

// Loading fallback for Suspense
function HomeLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

// Export with Suspense wrapper for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  )
}
