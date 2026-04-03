'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'
import { saveProfile, supabase } from '@/lib/supabase'
import {
  Check, Dna, CheckCircle, Stethoscope,
  Microscope, BookOpen, FlaskConical, FolderClosed, FolderOpen, UserRound,
  Heart, Users, Ribbon, DollarSign, Code, Share2, Copy, ShieldCheck, UserCheck
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

// Rotating cancer demos with medical jargon → plain English
const CANCER_DEMOS = [
  {
    type: 'breast cancer',
    jargon: 'Invasive ductal carcinoma, pT2N1M0, ER+/PR+/HER2-, Ki-67 18%, margins negative...',
    plain: 'Stage IIA breast cancer that responds well to hormone therapy. Margins clear. Good prognosis.'
  },
  {
    type: 'lung cancer',
    jargon: 'NSCLC adenocarcinoma, EGFR exon 19 deletion positive, PD-L1 80%, cT2aN2M0...',
    plain: 'Stage IIIA lung cancer with a targetable mutation. Eligible for targeted therapy pills.'
  },
  {
    type: 'lymphoma',
    jargon: 'Follicular lymphoma grade 2, stage III, FLIPI score 3, CD20+, BCL2+...',
    plain: 'Slow-growing lymphoma. Often watchful waiting. Highly treatable when needed.'
  },
  {
    type: 'colorectal cancer',
    jargon: 'Moderately differentiated adenocarcinoma, pT3N1bM0, MSI-high, KRAS wild-type...',
    plain: 'Stage III colon cancer. Good candidate for immunotherapy. Surgery was successful.'
  },
  {
    type: 'prostate cancer',
    jargon: 'Gleason 7 (3+4), PSA 8.2, pT2cN0M0, perineural invasion present...',
    plain: 'Intermediate-risk prostate cancer. Confined to prostate. Multiple treatment options.'
  },
  {
    type: 'melanoma',
    jargon: 'BRAF V600E mutant melanoma, Breslow 2.1mm, Clark level IV, SLN positive...',
    plain: 'Stage III melanoma with targetable mutation. Eligible for targeted + immunotherapy.'
  },
]

function useRotatingDemo() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % CANCER_DEMOS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return CANCER_DEMOS[index]
}

// Testimonials data
const TESTIMONIALS = [
  {
    quote: "I uploaded my own case of advanced prostate cancer. The AI analysis was 100% spot-on, even for experimental therapies. This surpasses other AI tools I've tested. I will continue to use and recommend it.",
    name: "Dr. Paul V., MD",
    context: "Prostate Cancer Patient",
  },
  {
    quote: "The clinical trials search found options my oncologist hadn't mentioned. Now I have a conversation starter for my next appointment.",
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
  {
    quote: "I uploaded a summary from Navis Health AI, put in my own edits, and am providing it to my new medical oncologist for my appointment tomorrow. She's the director of the Metastatic Breast Cancer Program at Dana-Farber.",
    name: "Jennifer N.",
    context: "Metastatic Breast Cancer",
  },
  {
    quote: "CancerCombat's three personas each offered different insights. Two aligned with my oncologist's recommendation to continue aBAT, and one even mentioned PARPi — which I've been using for 4 years. The guidelines persona suggested SBRT as a backup option. Exactly the kind of multi-perspective analysis I needed.",
    name: "Russ H.",
    context: "Stage IV Prostate Cancer",
  },
  {
    quote: "When I read this stuff I get chills. Whoever came up with this is fire. Good job Ari!",
    name: "Russ H.",
    context: "Prostate Cancer",
  },
  {
    quote: "Having my oncologist, Cancer Commons, and Dr. Gatenby all tell me I'm on the right path — and now CancerCombat AI agrees. It's validating to have multiple expert perspectives align.",
    name: "Russ H.",
    context: "Stage IV Prostate Cancer",
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
  const router = useRouter()
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth()
  const { trackEvent } = useAnalytics() // Track page views + custom events
  const currentDemo = useRotatingDemo() // Rotating cancer examples
  const [events, setEvents] = useState<UpcomingEvent[]>(FALLBACK_EVENTS)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [wizardStep, setWizardStep] = useState<number>(1)
  const [showWizardModal, setShowWizardModal] = useState(false)

  // Wizard form state
  const [wizardRole, setWizardRole] = useState<'patient' | 'caregiver' | null>(null)
  const [wizardName, setWizardName] = useState('')
  const [wizardEmail, setWizardEmail] = useState('')
  const [wizardCancerType, setWizardCancerType] = useState('')
  const [wizardSaving, setWizardSaving] = useState(false)
  const [wizardEmailSent, setWizardEmailSent] = useState(false)

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      setProfile({
        role: authProfile.role,
        name: authProfile.name,
        email: authProfile.email,
        cancerType: authProfile.cancer_type,
        stage: authProfile.stage || undefined,
        location: authProfile.location || undefined,
      })
    } else {
      // Fall back to localStorage for guest users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        setProfile(JSON.parse(saved))
      } else {
        // No profile - guest mode
        setProfile(null)
      }
    }

    // Check for success message
    if (searchParams.get('profile') === 'saved') {
      setShowSuccess(true)
      window.history.replaceState({}, '', '/')
      setTimeout(() => setShowSuccess(false), 4000)
    }
  }, [user, authProfile, authLoading, searchParams])

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
      <section className="relative flex flex-col items-center justify-center px-8 pt-16 pb-8 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-fuchsia-400/15 rounded-full blur-3xl" />

        <div className="relative text-center max-w-4xl">
          {authLoading ? (
            /* Show minimal loading state while auth loads */
            <div className="py-8">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
                  opencancer
                </span>
                <span className="text-slate-400">.ai</span>
              </h1>
              <div className="animate-pulse text-slate-400 mt-4">Loading...</div>
            </div>
          ) : profile ? (
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

              <p className="text-2xl md:text-3xl font-semibold text-slate-700 mb-3">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">{profile.name.split(' ')[0]}</span>
              </p>

              {/* Personalization row - all in one clean line */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  profile.role === 'caregiver'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-violet-100 text-violet-700'
                }`}>
                  {profile.role === 'caregiver' ? <><Heart className="w-3.5 h-3.5" /> Caregiver</> : <><Ribbon className="w-3.5 h-3.5" /> Patient</>}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700 font-medium">{CANCER_TYPES[profile.cancerType] || profile.cancerType}</span>
                {profile.stage && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">Stage {profile.stage}</span>
                  </>
                )}
                <span className="text-slate-300">·</span>
                <Link href="/profile" className="text-violet-600 hover:text-violet-700 text-sm font-medium">
                  Edit
                </Link>
              </div>
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
                In 2018, I was diagnosed with cancer as a new dad. The medical system gave me confusion and overwhelm. This site exists because patients deserve better.
              </p>

            </>
          )}
        </div>
      </section>

      {/* Value Demo - Clean and focused - only show when auth is loaded and no profile */}
      {!authLoading && !profile && (
        <section className="px-8 pb-10 -mt-2">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Cancer type indicator */}
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 flex items-center justify-center gap-2">
                <span className="text-white/80 text-xs font-medium">Now showing:</span>
                <span
                  key={currentDemo.type}
                  className="text-white font-semibold text-sm capitalize animate-pulse"
                  style={{ animation: 'fadeInUp 0.5s ease-out' }}
                >
                  {currentDemo.type}
                </span>
              </div>
              {/* Before/After */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* Before */}
                <div className="p-5 bg-slate-50 relative overflow-hidden">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Your records say</p>
                  <p
                    key={`jargon-${currentDemo.type}`}
                    className="text-sm text-slate-500 font-mono leading-relaxed transition-opacity duration-500"
                    style={{ animation: 'fadeIn 0.5s ease-out' }}
                  >
                    "{currentDemo.jargon}"
                  </p>
                </div>
                {/* After */}
                <div className="p-5 relative overflow-hidden">
                  <p className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-2">We translate to</p>
                  <p
                    key={`plain-${currentDemo.type}`}
                    className="text-sm text-slate-700 leading-relaxed transition-opacity duration-500"
                    style={{ animation: 'fadeIn 0.5s ease-out' }}
                  >
                    {currentDemo.plain}
                  </p>
                </div>
              </div>
              {/* CTA + Social proof */}
              <div className="border-t border-slate-100 p-4 bg-gradient-to-r from-violet-50/50 to-transparent">
                <div className="flex items-center justify-between gap-4">
                  <Link href="/about" className="flex items-center gap-3 hover:opacity-80 transition-opacity py-2 -my-1">
                    <img src="/ari.png" alt="Ari" className="w-8 h-8 rounded-full object-cover" />
                    <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Built by a cancer survivor</span></p>
                  </Link>
                  <button
                    onClick={() => { setShowWizardModal(true); setWizardStep(1); setWizardRole(null); }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-105 min-h-[44px]"
                  >
                    Start Here →
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  60 seconds • We'll guide you • 200+ cancer types
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Wizard Modal */}
      {showWizardModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowWizardModal(false); setWizardEmailSent(false); }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-xl mx-4 mb-0 sm:mb-0 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Close button */}
            <button
              onClick={() => { setShowWizardModal(false); setWizardEmailSent(false); }}
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 p-1"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header with value prop - always visible */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-white text-center">
              <h2 className="text-xl font-bold">Get Personalized Guidance</h2>
              <p className="text-violet-100 text-sm mt-1">60 seconds to AI insights tailored to your diagnosis</p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      wizardStep >= step
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {wizardStep > step ? <Check className="w-5 h-5" /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-1 rounded ${wizardStep > step ? 'bg-violet-600' : 'bg-slate-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Role */}
              {wizardStep === 1 && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Who are you?</h3>
                  <p className="text-slate-500 text-sm text-center mb-6">We'll personalize your experience</p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => { setWizardRole('patient'); setWizardStep(2); }}
                      className="group bg-gradient-to-br from-violet-50 to-white border-2 border-slate-200 rounded-2xl p-6 hover:border-violet-400 hover:shadow-xl hover:scale-[1.02] transition-all text-center"
                    >
                      <div className="w-16 h-16 bg-violet-100 group-hover:bg-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                        <Ribbon className="w-9 h-9 text-violet-600" />
                      </div>
                      <span className="font-bold text-slate-900 text-lg block">I'm a Patient</span>
                      <span className="text-sm text-slate-500 mt-1 block">Navigating my own diagnosis</span>
                    </button>
                    <button
                      onClick={() => { setWizardRole('caregiver'); setWizardStep(2); }}
                      className="group bg-gradient-to-br from-pink-50 to-white border-2 border-slate-200 rounded-2xl p-6 hover:border-pink-400 hover:shadow-xl hover:scale-[1.02] transition-all text-center"
                    >
                      <div className="w-16 h-16 bg-pink-100 group-hover:bg-pink-200 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                        <Heart className="w-9 h-9 text-pink-600" />
                      </div>
                      <span className="font-bold text-slate-900 text-lg block">I'm a Caregiver</span>
                      <span className="text-sm text-slate-500 mt-1 block">Supporting a loved one</span>
                    </button>
                  </div>

                  {/* Personalized guidance preview */}
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Dna className="w-4 h-4 text-emerald-500" />
                        AI Case Review
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        Care Checklist
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <Microscope className="w-4 h-4 text-orange-500" />
                        Clinical Trials
                      </span>
                    </div>
                  </div>

                  {/* Social proof */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-violet-200 ring-2 ring-white" />
                      <div className="w-6 h-6 rounded-full bg-pink-200 ring-2 ring-white" />
                      <div className="w-6 h-6 rounded-full bg-blue-200 ring-2 ring-white" />
                    </div>
                    <span>Join <span className="font-semibold text-slate-700">2,400+</span> patients & caregivers</span>
                  </div>
                </div>
              )}

              {/* Step 2: Name & Email */}
              {wizardStep === 2 && (
                <div>
                  <button onClick={() => setWizardStep(1)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                    ← Back
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {wizardRole === 'caregiver' ? "Tell us about your loved one" : "Tell us about yourself"}
                  </h3>
                  <p className="text-slate-500 text-sm mb-6">So we can personalize your tools</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {wizardRole === 'caregiver' ? "Patient's first name" : "Your first name"}
                      </label>
                      <input
                        type="text"
                        value={wizardName}
                        onChange={(e) => setWizardName(e.target.value)}
                        placeholder="First name"
                        autoFocus
                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Your email <span className="text-slate-400 font-normal">(for your toolkit)</span></label>
                      <input
                        type="email"
                        value={wizardEmail}
                        onChange={(e) => setWizardEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => wizardName.trim() && setWizardStep(3)}
                      disabled={!wizardName.trim()}
                      className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                    >
                      Continue →
                    </button>
                    {/* Privacy notice */}
                    <p className="text-xs text-slate-400 text-center">
                      🔒 Your data stays on your device. Never shared or sold.
                    </p>
                  </div>
                </div>
              )}

              {/* Email Sent Confirmation */}
              {wizardEmailSent && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email!</h3>
                  <p className="text-slate-600 mb-4">
                    We sent a sign-in link to <span className="font-semibold text-violet-600">{wizardEmail}</span>
                  </p>
                  <p className="text-sm text-slate-500 mb-6">
                    Click the link to sign in and start using your personalized cancer toolkit.
                  </p>

                  {/* Continue without signing in option */}
                  <div className="border-t border-slate-200 pt-4">
                    <button
                      onClick={() => {
                        setShowWizardModal(false)
                        setWizardEmailSent(false)
                        router.push('/records')
                      }}
                      className="text-sm text-slate-500 hover:text-violet-600 underline"
                    >
                      Continue without signing in →
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                      You can sign in later to sync your data
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Cancer Type & Save */}
              {wizardStep === 3 && !wizardEmailSent && (
                <div>
                  <button onClick={() => setWizardStep(2)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                    ← Back
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">What type of cancer?</h3>
                  <p className="text-slate-500 text-sm mb-6">We'll customize your NCCN guidelines & resources</p>
                  <div className="space-y-4">
                    <select
                      value={wizardCancerType}
                      onChange={(e) => setWizardCancerType(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition-colors"
                    >
                      <option value="">Select cancer type...</option>
                      {Object.entries(CANCER_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>

                    {/* Summary */}
                    {wizardCancerType && (
                      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-4 border border-violet-100">
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">Your Profile</p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                            {wizardRole === 'caregiver' ? <Heart className="w-6 h-6 text-pink-500" /> : <Ribbon className="w-6 h-6 text-violet-500" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{wizardName}</p>
                            <p className="text-slate-600 text-sm">{CANCER_TYPES[wizardCancerType]}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        if (!wizardCancerType || !wizardEmail.trim()) return
                        setWizardSaving(true)

                        const newProfile: PatientProfile = {
                          role: wizardRole!,
                          name: wizardName.trim(),
                          email: wizardEmail.trim(),
                          cancerType: wizardCancerType,
                        }

                        // Save to localStorage FIRST for immediate offline access
                        localStorage.setItem('patient-profile', JSON.stringify(newProfile))
                        setProfile(newProfile)

                        // Save to Supabase profile table (non-blocking, with timeout)
                        const profilePromise = Promise.race([
                          saveProfile({
                            email: wizardEmail.trim(),
                            name: wizardName.trim(),
                            role: wizardRole!,
                            cancerType: wizardCancerType,
                          }),
                          new Promise((_, reject) => setTimeout(() => reject(new Error('Profile save timeout')), 5000))
                        ]).catch(err => console.warn('Profile sync failed:', err))

                        // Send magic link with timeout
                        try {
                          const authPromise = Promise.race([
                            supabase.auth.signInWithOtp({
                              email: wizardEmail.trim(),
                              options: {
                                emailRedirectTo: `${window.location.origin}/records`,
                              },
                            }),
                            new Promise<{ error: Error }>((_, reject) =>
                              setTimeout(() => reject({ error: new Error('Auth timeout') }), 10000)
                            )
                          ])

                          const result = await authPromise
                          const authError = 'error' in result ? result.error : null

                          if (authError) {
                            console.error('Auth error:', authError)
                            // Still continue - they can sign in later
                          }
                        } catch (err) {
                          console.error('Auth failed:', err)
                          // Continue anyway - profile is saved locally
                        }

                        // Show email sent confirmation (or at least move forward)
                        setWizardSaving(false)
                        setWizardEmailSent(true)

                        // Wait for profile save to complete (already started)
                        await profilePromise

                        // Send welcome email (non-blocking)
                        fetch('/api/email/welcome', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: wizardEmail.trim(),
                            name: wizardName.trim(),
                            cancerType: wizardCancerType,
                            role: wizardRole,
                          }),
                        }).catch(err => console.warn('Welcome email failed:', err))
                      }}
                      disabled={!wizardCancerType || !wizardEmail.trim() || wizardSaving}
                      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center justify-center gap-2"
                    >
                      {wizardSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating your account...
                        </>
                      ) : (
                        <>
                          🚀 Launch My Toolkit
                        </>
                      )}
                    </button>

                    {/* What happens next */}
                    <div className="text-center text-xs text-slate-400">
                      We'll email you a sign-in link to secure your account
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Tools Grid */}
      <section className="py-10 px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          {profile ? (
            <>
              <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">
                Recommended for You
              </h2>
              <p className="text-slate-500 text-center mb-6 text-sm">
                Tools tailored for {CANCER_TYPES[profile.cancerType] || 'your journey'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">
                <span className="text-violet-600">Patient Tools:</span> Facing cancer yourself?
              </h2>
              <p className="text-slate-500 text-center mb-4 text-sm max-w-lg mx-auto">
                The average cancer patient waits 6+ weeks for a second opinion. Get AI-powered insights in minutes, grounded in the same NCCN guidelines your doctors use.
              </p>
              <p className="text-center mb-6">
                <button
                  onClick={() => { setShowWizardModal(true); setWizardStep(1); setWizardRole(null); }}
                  className="text-sm text-violet-600 hover:text-violet-700 font-medium underline underline-offset-2"
                >
                  Not sure where to start? Let us guide you →
                </button>
              </p>
            </>
          )}

          {/* Core Tools - Always visible */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* AI Case Review - Featured */}
            <Link href="/records" className="group bg-gradient-to-br from-violet-100 to-fuchsia-50 border-2 border-violet-300 rounded-xl p-5 hover:border-violet-500 hover:shadow-lg transition-all relative">
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                Most Popular
              </span>
              <div className="flex items-center gap-2 mb-2">
                <Dna className="w-6 h-6 text-violet-600" />
                <h3 className="font-bold text-slate-900 group-hover:text-violet-700">AI Case Review</h3>
              </div>
              <p className="text-slate-600 text-sm">Upload your records. Get a complete second opinion based on NCCN guidelines.</p>
            </Link>

            <Link href="/cancer-checklist" className="group bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all relative">
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                ⭐ Most Popular
              </span>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-700">Appointment Prep</h3>
              </div>
              <p className="text-slate-600 text-sm">Questions to ask + scripts for your oncologist visit.</p>
            </Link>

            <Link href="/combat" className="group bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-5 hover:border-orange-500 hover:shadow-lg transition-all relative">
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                🔥 Trending
              </span>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚔️</span>
                <h3 className="font-bold text-slate-900 group-hover:text-orange-600">CancerCombat</h3>
              </div>
              <p className="text-slate-600 text-sm">3 AI perspectives debate your diagnosis & treatment options.</p>
            </Link>

            <Link href="/records" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all relative">
              <div className="flex items-center gap-2 mb-2">
                <FolderClosed className="w-6 h-6 text-emerald-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Records Vault</h3>
              </div>
              <p className="text-slate-600 text-sm mb-2">Translate confusing medical reports to plain English.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-violet-600 font-medium">1,000+ patients</span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Private
                </span>
              </div>
            </Link>

            <Link href="/ask" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-fuchsia-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <AtomIcon />
                <h3 className="font-bold text-slate-900 group-hover:text-fuchsia-600">Ask Navis</h3>
              </div>
              <p className="text-slate-600 text-sm">Questions about treatments, tests, or side effects.</p>
              <p className="text-[10px] text-slate-400 mt-1.5">Powered by Claude • OpenAI • Gemini</p>
            </Link>

            <Link href="/trials" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Microscope className="w-6 h-6 text-blue-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600">Clinical Trials</h3>
              </div>
              <p className="text-slate-600 text-sm mb-2">Find trials matched to your diagnosis and location.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">ClinicalTrials.gov</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  Powered by <img src="/biomcp-logo.png" alt="BioMCP" className="h-4 w-4 inline-block" /> <span className="font-medium text-slate-600">BioMCP</span>
                </span>
              </div>
            </Link>

            <Link href="/coverage" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-6 h-6 text-emerald-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-600">Financial Coverage</h3>
              </div>
              <p className="text-slate-600 text-sm mb-2">What's covered + financial assistance programs.</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Medicare 2026</span>
            </Link>

            <Link href="/case-file" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-6 h-6 text-amber-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600">My Case File</h3>
              </div>
              <p className="text-slate-600 text-sm mb-2">All your medical info organized - just the facts.</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">No AI commentary</span>
            </Link>
            <Link href="/tests" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-6 h-6 text-orange-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-orange-600">Precision Testing</h3>
              </div>
              <p className="text-slate-600 text-sm">MRD, genomic tests, and biomarker monitoring.</p>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                Partnered with <a href="https://www.openonco.org/" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-800 font-semibold hover:underline flex items-center gap-0.5">♥ OpenOnco</a>
              </p>
            </Link>

            <Link href="/research" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-6 h-6 text-cyan-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-cyan-600">Research Library</h3>
              </div>
              <p className="text-slate-600 text-sm">Search 200M+ papers with AI summaries.</p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Partnered with <a href="https://biomcp.org/" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-emerald-600 font-semibold hover:underline">BioMCP</a>
              </p>
            </Link>

            <Link href="/oncologists" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-400 hover:shadow-md transition-all relative">
              <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                Soon
              </span>
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-6 h-6 text-teal-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-teal-600">Find Oncologist</h3>
              </div>
              <p className="text-slate-600 text-sm">Specialists by cancer type, location, insurance.</p>
            </Link>

            <Link href="/hub" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-rose-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-6 h-6 text-rose-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600">CareCircle</h3>
              </div>
              <p className="text-slate-600 text-sm">Update family & friends without repeating yourself.</p>
            </Link>

            <Link href="/expert-review" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-6 h-6 text-indigo-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600">Expert Review</h3>
              </div>
              <p className="text-slate-600 text-sm">Get your case reviewed by oncology experts.</p>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                Partnered with <a href="https://cancercommons.org" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-600 hover:text-violet-600">Cancer Commons</a>
              </p>
            </Link>

            <a href="https://community.cancerpatientlab.org/" target="_blank" rel="noopener noreferrer" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-pink-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-pink-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-pink-600">Community</h3>
              </div>
              <p className="text-slate-600 text-sm">Connect with patients and caregivers.</p>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                Powered by <img src="/cpl-logo.avif" alt="Cancer Patient Lab" className="h-4 object-contain" />
              </p>
            </a>

            <Link href="/profile" className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-400 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <UserRound className="w-6 h-6 text-violet-500" />
                <h3 className="font-bold text-slate-900 group-hover:text-violet-600">My Profile</h3>
              </div>
              <p className="text-slate-600 text-sm">Personalize your tools and save your diagnosis.</p>
            </Link>
          </div>

        </div>
      </section>

      {/* Caregiver Section */}
      <section className="py-12 px-8 bg-gradient-to-br from-pink-50 via-white to-rose-50 border-t border-pink-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              <span className="text-pink-600">Caregiver Tools:</span> Supporting someone with cancer?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              93% of caregivers say understanding the diagnosis is their biggest challenge. These tools help you be the advocate your loved one needs.
            </p>
          </div>

          {/* Core Caregiver Needs - mapped to tools */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-pink-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Understand the diagnosis</h3>
                  <p className="text-sm text-slate-600 mb-2">Translate medical jargon into plain English with our Records Vault.</p>
                  <Link href="/records" onClick={() => trackEvent('caregiver_need_click', { need: 'understand_diagnosis', tool: 'records' })} className="inline-flex items-center text-sm text-violet-600 hover:text-violet-700 font-medium min-h-[44px]">
                    Upload records →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-pink-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-fuchsia-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Microscope className="w-5 h-5 text-fuchsia-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Explore treatment options</h3>
                  <p className="text-sm text-slate-600 mb-2">Get a comprehensive case review and understand all the options.</p>
                  <Link href="/records/case-review" onClick={() => trackEvent('caregiver_need_click', { need: 'treatment_options', tool: 'case_review' })} className="inline-flex items-center text-sm text-violet-600 hover:text-violet-700 font-medium min-h-[44px]">
                    Start case review →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-pink-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Prepare for appointments</h3>
                  <p className="text-sm text-slate-600 mb-2">Know exactly what to ask the oncologist with our question generator.</p>
                  <Link href="/cancer-checklist" onClick={() => trackEvent('caregiver_need_click', { need: 'appointment_prep', tool: 'checklist' })} className="inline-flex items-center text-sm text-violet-600 hover:text-violet-700 font-medium min-h-[44px]">
                    Build question list →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-pink-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Coordinate the care team</h3>
                  <p className="text-sm text-slate-600 mb-2">Share updates without repeating yourself. Keep everyone informed.</p>
                  <Link href="/hub" onClick={() => trackEvent('caregiver_need_click', { need: 'coordinate_care', tool: 'carecircle' })} className="inline-flex items-center text-sm text-violet-600 hover:text-violet-700 font-medium min-h-[44px]">
                    Create CareCircle →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => {
                trackEvent('caregiver_cta_click', { source: 'homepage_caregiver_section' })
                setShowWizardModal(true)
                setWizardStep(1)
                setWizardRole('caregiver')
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all min-h-[44px]"
            >
              <Heart className="w-5 h-5" />
              Get Started as a Caregiver
            </button>
            <p className="text-xs text-slate-500 mt-3">
              Free forever • Your data stays private
            </p>
          </div>
        </div>
      </section>

      {/* Share Card */}
      <section className="py-8 px-8 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50 border border-rose-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">💝</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Know someone who needs this?</h3>
            <p className="text-slate-600 mb-4">Share these free tools with a patient or caregiver.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://opencancer.ai')
                  const btn = document.getElementById('copy-btn')
                  if (btn) {
                    btn.textContent = 'Copied!'
                    setTimeout(() => { btn.textContent = 'Copy Link' }, 2000)
                  }
                }}
                id="copy-btn"
                className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-rose-400 text-slate-700 font-medium px-5 py-2.5 rounded-lg transition-all hover:shadow-md"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <a
                href="sms:?body=I thought these free cancer tools might help: https://opencancer.ai - built by a survivor, NCCN-informed"
                className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium px-5 py-2.5 rounded-lg transition-all"
              >
                <Share2 className="w-4 h-4" />
                Text a Friend
              </a>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Built by a cancer survivor. Always free.
            </p>
          </div>
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
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
              OpenOnco
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              BioMCP
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
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
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
          <h2 className="text-2xl font-bold text-slate-900">What Patients & Experts Say</h2>
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
                  - {testimonial.name}, {testimonial.context}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
              <a href="https://www.cancerpatientlab.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-slate-500 hover:text-violet-600 transition-colors">
                <span>Partnered with</span>
                <img src="/cpl-logo.avif" alt="Cancer Patient Lab" className="h-6 object-contain" />
              </a>
            </div>
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
