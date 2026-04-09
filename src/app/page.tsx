'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'
import { saveProfile, supabase } from '@/lib/supabase'
import { useHasRecords } from '@/hooks/useRecords'
import {
  Check, Dna, CheckCircle, Stethoscope,
  Microscope, BookOpen, FlaskConical, FolderClosed, FolderOpen, UserRound,
  Heart, Users, Ribbon, DollarSign, Code, Share2, Copy, ShieldCheck, UserCheck, Radar, Building2
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { StepIndicator } from '@/design/components'

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
  const [wizardRedirectTo, setWizardRedirectTo] = useState<string | null>(null) // Where to go after wizard

  // Dynamic social proof count (null = hide, number = show)
  const [socialProofCount, setSocialProofCount] = useState<number | null>(null)

  // Track if user has uploaded records (to show Expert Review vs Ask Navis)
  const { hasRecords } = useHasRecords()

  // Handler for tool clicks - gates through wizard for guests
  const handleToolClick = (e: React.MouseEvent, destination: string) => {
    // If user has profile, allow normal navigation
    if (profile || user) return

    // Gate guest users through wizard first
    e.preventDefault()
    setWizardRedirectTo(destination)
    setShowWizardModal(true)
    setWizardStep(1)
    setWizardRole(null)
  }

  // Fetch social proof count
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setSocialProofCount(data.displayCount)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])


  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // For authenticated users: use Supabase profile if available, else create minimal profile from user
    if (user) {
      if (authProfile) {
        setProfile({
          role: authProfile.role,
          name: authProfile.name,
          email: authProfile.email,
          cancerType: authProfile.cancer_type,
          stage: authProfile.stage || undefined,
          location: authProfile.location || undefined,
        })

        // Auto-show onboarding for users with default "other" cancer type
        // Only show if they haven't dismissed it before
        const dismissedOnboarding = localStorage.getItem('opencancer-onboarding-dismissed')
        if (authProfile.cancer_type === 'other' && !dismissedOnboarding) {
          // Pre-fill wizard with existing data
          setWizardRole(authProfile.role)
          setWizardName(authProfile.name || '')
          setWizardEmail(authProfile.email || '')
          setWizardStep(3) // Jump to cancer type step since we have name/email
          setShowWizardModal(true)
        }
      } else {
        // User is logged in but hasn't completed profile - show basic logged-in state
        // Use email as display name, generic cancer type
        setProfile({
          role: 'patient',
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
          cancerType: 'other',
        })

        // Auto-show onboarding for new users without profile
        const dismissedOnboarding = localStorage.getItem('opencancer-onboarding-dismissed')
        if (!dismissedOnboarding) {
          setWizardEmail(user.email || '')
          setWizardStep(1) // Start from beginning
          setShowWizardModal(true)
        }
      }
    } else {
      // Guest users (not authenticated) - check localStorage for wizard-created profile
      const savedProfile = localStorage.getItem('patient-profile')
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile) as PatientProfile
          setProfile(parsed)
        } catch (e) {
          console.error('Failed to parse saved profile:', e)
          setProfile(null)
        }
      } else {
        // No saved profile - show marketing homepage
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
    <main className="min-h-screen bg-[#f5f3ee] text-slate-900">
      <Navbar />

      {/* Success Toast */}
      {showSuccess && (
        <div
          className="fixed top-4 left-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
          style={{ transform: 'translateX(-50%)', animation: 'slideDown 50ms ease-out' }}
        >
          <Check className="w-5 h-5" />
          <div>
            <p className="font-medium">Profile saved!</p>
            <p className="text-sm text-slate-300">Your tools are now personalized</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-8 pt-16 pb-8 overflow-hidden">
        <div className="relative text-center max-w-4xl">
          {authLoading ? (
            /* Show minimal loading state while auth loads */
            <div className="py-8">
              <div className="animate-pulse text-slate-400">Loading...</div>
            </div>
          ) : profile ? (
            <>
              {/* Patient name is the hero - most important element on page */}
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Welcome back, {profile.name?.split(' ')[0] || 'there'}
              </h1>

              {/* Personalization row - all in one clean line */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  {profile.role === 'caregiver' ? <><Heart className="w-3.5 h-3.5" /> Caregiver</> : <><Ribbon className="w-3.5 h-3.5" /> Patient</>}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700 font-medium">{CANCER_TYPES[profile.cancerType || ''] || profile.cancerType || 'Cancer'}</span>
                {profile.stage && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">Stage {profile.stage}</span>
                  </>
                )}
                <span className="text-slate-300">·</span>
                <Link href="/profile" className="text-slate-900 hover:text-orange-600 text-sm font-medium underline underline-offset-2">
                  Edit
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Don&apos;t miss anything<br />
                <span className="font-normal">in your cancer treatment</span>
              </h1>

              <p className="text-xl text-slate-600 mb-6 max-w-lg mx-auto">
                Find what your treatment plan might be missing. In minutes, not weeks. Built by a survivor.
              </p>

            </>
          )}
        </div>
      </section>

      {/* Value Demo - Clean and focused - only show for guests without profile */}
      {!authLoading && !profile && !user && (
        <section className="px-8 pb-10 -mt-2">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-sm overflow-hidden">
              {/* Cancer type indicator */}
              <div className="bg-slate-900 px-4 py-2 flex items-center justify-center gap-2">
                <span className="text-slate-400 text-xs font-medium">Now showing:</span>
                <span
                  key={currentDemo.type}
                  className="text-white font-semibold text-sm capitalize"
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
                  <p className="text-xs font-medium text-slate-900 uppercase tracking-wider mb-2">We translate to</p>
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
              <div className="border-t border-slate-200 p-5 bg-gradient-to-r from-slate-50 to-orange-50/30">
                {/* Mobile: Stack vertically, CTA first. Desktop: Side by side */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Built by survivors */}
                  <Link href="/about" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                    <img src="/ari.png" alt="Ari" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-slate-300 group-hover:ring-[#C66B4A] transition-all" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Built by survivors</p>
                      <p className="text-xs text-slate-400">About →</p>
                    </div>
                  </Link>
                  {/* CTA */}
                  <button
                    onClick={() => { setShowWizardModal(true); setWizardStep(1); setWizardRole(null); setWizardRedirectTo(null); }}
                    className="w-full sm:w-auto bg-[#C66B4A] hover:bg-[#B35E40] text-white font-bold px-6 sm:px-8 py-3 rounded-xl transition-all shadow-lg shadow-[#C66B4A]/30 hover:shadow-xl hover:scale-[1.02]"
                  >
                    Review My Case →
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  60 seconds • Personalized guidance • 200+ cancer types
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
            onClick={() => { setShowWizardModal(false); setWizardEmailSent(false); localStorage.setItem('opencancer-onboarding-dismissed', 'true'); }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-xl mx-4 mb-0 sm:mb-0 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
            {/* Close button */}
            <button
              onClick={() => { setShowWizardModal(false); setWizardEmailSent(false); localStorage.setItem('opencancer-onboarding-dismissed', 'true'); }}
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 p-1"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header with value prop - always visible */}
            <div className="bg-slate-900 px-6 py-5 text-white text-center">
              <h2 className="text-xl font-bold">Get Personalized Guidance</h2>
              <p className="text-slate-400 text-sm mt-1">In 60 seconds, know what to ask your doctor</p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Progress indicator */}
              <div className="flex justify-center mb-6">
                <StepIndicator
                  steps={['Role', 'Details', 'Cancer', 'Records']}
                  currentStep={wizardStep - 1}
                />
              </div>

              {/* Step 1: Role */}
              {wizardStep === 1 && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Tell us about you</h3>
                  <p className="text-slate-500 text-sm text-center mb-6">So we can personalize your guidance</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => { setWizardRole('patient'); setWizardStep(2); }}
                      className="group bg-white border-2 border-slate-200 rounded-xl p-4 sm:p-6 hover:border-slate-900 hover:shadow-xl hover:scale-[1.02] transition-all flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 group-hover:bg-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center sm:mx-auto sm:mb-3 transition-colors flex-shrink-0">
                        <Ribbon className="w-6 h-6 sm:w-9 sm:h-9 text-slate-700" />
                      </div>
                      <div className="text-left sm:text-center">
                        <span className="font-bold text-slate-900 text-base sm:text-lg block">I'm a Patient</span>
                        <span className="text-sm text-slate-500 block">Navigating my own diagnosis</span>
                      </div>
                    </button>
                    <button
                      onClick={() => { setWizardRole('caregiver'); setWizardStep(2); }}
                      className="group bg-white border-2 border-slate-200 rounded-xl p-4 sm:p-6 hover:border-slate-900 hover:shadow-xl hover:scale-[1.02] transition-all flex sm:flex-col items-center sm:text-center gap-4 sm:gap-0"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 group-hover:bg-slate-200 rounded-xl sm:rounded-2xl flex items-center justify-center sm:mx-auto sm:mb-3 transition-colors flex-shrink-0">
                        <Heart className="w-6 h-6 sm:w-9 sm:h-9 text-slate-700" />
                      </div>
                      <div className="text-left sm:text-center">
                        <span className="font-bold text-slate-900 text-base sm:text-lg block">I'm a Caregiver</span>
                        <span className="text-sm text-slate-500 block">Supporting someone with cancer</span>
                      </div>
                    </button>
                  </div>

                  {/* Personalized guidance preview */}
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Dna className="w-4 h-4 text-slate-600" />
                        AI Case Review
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-slate-600" />
                        Care Checklist
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <Radar className="w-4 h-4 text-[#C66B4A]" />
                        Trial Radar
                      </span>
                    </div>
                  </div>

                  {/* Social proof - only show if we have enough users */}
                  {socialProofCount && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-300 ring-2 ring-white" />
                        <div className="w-6 h-6 rounded-full bg-slate-400 ring-2 ring-white" />
                        <div className="w-6 h-6 rounded-full bg-slate-500 ring-2 ring-white" />
                      </div>
                      <span>Join <span className="font-semibold text-slate-700">{socialProofCount.toLocaleString()}+</span> patients & caregivers</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Name & Email */}
              {wizardStep === 2 && (
                <div>
                  <button onClick={() => setWizardStep(1)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                    ← Back
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {wizardRole === 'caregiver' ? "Tell us about the patient" : "Tell us about yourself"}
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
                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Your email <span className="text-slate-400 font-normal">(for your toolkit)</span></label>
                      <input
                        type="email"
                        value={wizardEmail}
                        onChange={(e) => setWizardEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:bg-white transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => wizardName.trim() && setWizardStep(3)}
                      disabled={!wizardName.trim()}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/25"
                    >
                      Continue →
                    </button>
                    {/* Privacy notice */}
                    <p className="text-xs text-slate-400 text-center">
                      🔒 Encrypted and private. Never shared without your permission.
                    </p>
                  </div>
                </div>
              )}

              {/* Email Sent Confirmation */}
              {wizardEmailSent && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-slate-900" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email!</h3>
                  <p className="text-slate-600 mb-4">
                    We sent a sign-in link to <span className="font-semibold text-slate-900">{wizardEmail}</span>
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
                      className="text-sm text-slate-500 hover:text-orange-600 underline"
                    >
                      Continue without signing in →
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                      You can sign in later to sync your data
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Cancer Type */}
              {wizardStep === 3 && !wizardEmailSent && (
                <div>
                  <button onClick={() => setWizardStep(2)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                    ← Back
                  </button>

                  {/* Step label with color */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs font-medium text-[#C66B4A]">Step 3 of 4</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">What type of cancer?</h3>
                  <p className="text-slate-500 text-sm mb-4">This unlocks personalized guidance for YOUR diagnosis:</p>
                  <ul className="text-xs text-slate-600 space-y-1 mb-4 pl-4">
                    <li>• NCCN guidelines specific to your cancer type</li>
                    <li>• Clinical trials recruiting patients like you</li>
                    <li>• Treatment options that match your profile</li>
                  </ul>
                  <div className="space-y-4">
                    <select
                      value={wizardCancerType}
                      onChange={(e) => setWizardCancerType(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C66B4A] focus:border-transparent focus:bg-white transition-colors"
                    >
                      <option value="">Select cancer type...</option>
                      {Object.entries(CANCER_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>

                    {/* Summary - with gradient accent */}
                    {wizardCancerType && (
                      <div className="bg-gradient-to-r from-[#C66B4A]/5 to-emerald-500/5 rounded-xl p-4 border border-[#C66B4A]/20">
                        <p className="text-xs font-semibold text-[#C66B4A] uppercase tracking-wide mb-2">Your Profile</p>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#C66B4A]/20">
                            {wizardRole === 'caregiver' ? <Heart className="w-6 h-6 text-[#C66B4A]" /> : <Ribbon className="w-6 h-6 text-[#C66B4A]" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{wizardName}</p>
                            <p className="text-[#C66B4A] text-sm font-medium">{CANCER_TYPES[wizardCancerType]}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => wizardCancerType && setWizardStep(4)}
                      disabled={!wizardCancerType}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-slate-900/25 flex items-center justify-center gap-2"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Upload First Record & Complete */}
              {wizardStep === 4 && !wizardEmailSent && (
                <div>
                  <button onClick={() => setWizardStep(3)} className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1">
                    ← Back
                  </button>

                  {/* Step label */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs font-medium text-[#C66B4A]">Step 4 of 4</span>
                    <span className="text-xs text-slate-400">— Final step!</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">Upload your first record</h3>
                  <p className="text-slate-500 text-sm mb-6">This is where the magic happens. We'll translate it to plain English.</p>

                  {/* Value prop for uploading */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-900 mb-3">What you'll get:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Plain English summary of your diagnosis
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Key biomarkers & what they mean
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Questions to ask your oncologist
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        if (!wizardEmail.trim()) return
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

                        // Save to Supabase via API (uses service key, bypasses RLS)
                        // IMPORTANT: await this to ensure profile is saved before continuing
                        try {
                          const profileRes = await fetch('/api/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: wizardEmail.trim(),
                              name: wizardName.trim(),
                              role: wizardRole,
                              cancerType: wizardCancerType,
                              sessionId: typeof window !== 'undefined' ? localStorage.getItem('opencancer_session_id') : null,
                            }),
                          })
                          if (!profileRes.ok) {
                            console.error('[Wizard] Profile save failed:', await profileRes.text())
                          } else {
                            console.log('[Wizard] Profile saved successfully')
                          }
                        } catch (err) {
                          console.error('[Wizard] Profile sync error:', err)
                        }

                        // Send magic link - only for valid-looking emails to reduce bounces
                        const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wizardEmail.trim())
                        const blockedDomains = ['test.com', 'example.com', 'fake.com', 'asdf.com', 'abc.com', 'xyz.com']
                        const domain = wizardEmail.trim().split('@')[1]?.toLowerCase()
                        const isDomainBlocked = blockedDomains.includes(domain)

                        if (emailLooksValid && !isDomainBlocked) {
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
                            }
                          } catch (err) {
                            console.error('Auth failed:', err)
                          }
                        } else {
                          console.log('Skipping magic link for invalid/test email:', wizardEmail.trim())
                        }

                        setWizardSaving(false)
                        localStorage.setItem('opencancer-onboarding-dismissed', 'true')

                        // Send welcome email (only for valid emails)
                        if (emailLooksValid && !isDomainBlocked) {
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
                        }

                        // Close modal and redirect to records (to upload)
                        setShowWizardModal(false)
                        router.push('/records')
                      }}
                      disabled={wizardSaving}
                      className="w-full bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-[#C66B4A]/25 flex items-center justify-center gap-2"
                    >
                      {wizardSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <FolderClosed className="w-5 h-5" />
                          Upload My First Record
                        </>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        if (!wizardEmail.trim()) return
                        setWizardSaving(true)

                        const newProfile: PatientProfile = {
                          role: wizardRole!,
                          name: wizardName.trim(),
                          email: wizardEmail.trim(),
                          cancerType: wizardCancerType,
                        }

                        // Save profile
                        localStorage.setItem('patient-profile', JSON.stringify(newProfile))
                        setProfile(newProfile)

                        // Save to Supabase via API (uses service key, bypasses RLS)
                        try {
                          const profileRes = await fetch('/api/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: wizardEmail.trim(),
                              name: wizardName.trim(),
                              role: wizardRole,
                              cancerType: wizardCancerType,
                              sessionId: typeof window !== 'undefined' ? localStorage.getItem('opencancer_session_id') : null,
                            }),
                          })
                          if (!profileRes.ok) {
                            console.error('[Wizard] Profile save failed:', await profileRes.text())
                          } else {
                            console.log('[Wizard] Profile saved successfully')
                          }
                        } catch (err) {
                          console.error('[Wizard] Profile sync error:', err)
                        }

                        localStorage.setItem('opencancer-onboarding-dismissed', 'true')
                        setWizardSaving(false)
                        setShowWizardModal(false)

                        // Redirect to intended destination or stay on homepage
                        if (wizardRedirectTo) {
                          router.push(wizardRedirectTo)
                          setWizardRedirectTo(null)
                        }
                      }}
                      disabled={wizardSaving}
                      className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium py-2"
                    >
                      Skip for now — explore tools first
                    </button>
                  </div>

                  {/* Privacy note */}
                  <p className="text-xs text-slate-400 text-center mt-4">
                    🔒 Your records are encrypted and never shared
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Patient Tools Grid */}
      <section className="py-10 px-8">
        <div className="max-w-4xl mx-auto">
          {profile ? (
            <>
              <p className="text-xs font-medium tracking-widest text-slate-400 text-center mb-2">PATIENT TOOLS</p>
              <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">
                Recommended for You
              </h2>
              <p className="text-slate-500 text-center mb-6 text-sm">
                Tools tailored for {CANCER_TYPES[profile.cancerType] || 'your journey'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-3 text-slate-900">
                Facing cancer? Start here.
              </h2>
              <p className="text-slate-500 text-center mb-8 text-sm max-w-lg mx-auto">
                The average patient waits 6+ weeks for a second opinion. Get AI-powered guidance in minutes, grounded in NCCN guidelines.
              </p>
            </>
          )}

          {/* PRIMARY TOOLS - 3 cards: Upload, Combat, Expert Review */}
          {profile && <p className="text-xs font-medium tracking-widest text-slate-400 mb-3">YOUR TOOLS</p>}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {/* Upload Records */}
            <Link
              href="/records"
              onClick={(e) => handleToolClick(e, '/records')}
              className="group bg-white border-2 border-slate-900 rounded-xl p-5 hover:shadow-lg transition-all relative"
            >
              <span className="absolute -top-2.5 left-4 bg-slate-900 text-white text-[10px] font-medium px-2.5 py-1 rounded">
                {profile ? 'Your vault' : 'Start here'}
              </span>
              <div className="mb-3 mt-1">
                <FolderClosed className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Upload Records</h3>
              <p className="text-slate-600 text-sm mb-2">Translate medical reports to plain English.</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700">🔒 Private & secure</span>
            </Link>

            {/* Cancer Combat */}
            <Link
              href="/combat"
              onClick={(e) => handleToolClick(e, '/combat')}
              className="group bg-white border-2 border-slate-900 rounded-xl p-5 hover:shadow-lg transition-all relative"
            >
              <span className="absolute -top-2.5 left-4 bg-slate-900 text-white text-[10px] font-medium px-2.5 py-1 rounded">
                AI second opinion
              </span>
              <div className="mb-3 mt-1">
                <span className="text-2xl">⚔️</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Cancer Combat</h3>
              <p className="text-slate-600 text-sm">5 AI experts debate your case.</p>
            </Link>

            {/* Third card: Expert Pathology Review (if records) or Ask Navis (if no records) */}
            {hasRecords ? (
              <Link
                href="/expert-review?expert=protean"
                onClick={(e) => handleToolClick(e, '/expert-review?expert=protean')}
                className="group bg-gradient-to-r from-white to-emerald-50/50 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-5 hover:shadow-lg transition-all relative"
              >
                <span className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[10px] font-medium px-2.5 py-1 rounded">
                  Premium
                </span>
                <div className="mb-3 mt-1 flex items-center gap-2">
                  <img
                    src="/team/tony-magliocco.png"
                    alt="Dr. Tony Magliocco"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/5a4c3e3ebff200d1651f0273/1612204851498-UYVYCYQRCXVHMA08T0TS/protean_logo.png"
                    alt="Protean BioDiagnostics"
                    className="h-5 w-auto"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Expert Pathology Review</h3>
                <p className="text-slate-600 text-sm mb-2">Dr. Magliocco · 25+ yrs · 200+ publications</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">$650</span>
                  <span className="text-[10px] text-slate-400">2-3 business days</span>
                </div>
              </Link>
            ) : (
              <Link
                href="/ask"
                onClick={(e) => handleToolClick(e, '/ask')}
                className="group bg-white border-2 border-slate-900 rounded-xl p-5 hover:shadow-lg transition-all relative"
              >
                <span className="absolute -top-2.5 left-4 bg-slate-900 text-white text-[10px] font-medium px-2.5 py-1 rounded">
                  AI research
                </span>
                <div className="mb-3 mt-1">
                  <ThinkingIndicator size={24} variant="dark" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Ask Navis</h3>
                <p className="text-slate-600 text-sm">Research with Claude, GPT-4o, and Gemini.</p>
              </Link>
            )}

          </div>

          {/* MORE TOOLS */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer mb-4 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              <p className="text-sm font-semibold tracking-wide text-slate-600">MORE TOOLS</p>
              <span className="text-sm font-medium text-[#C66B4A] group-open:hidden">Show all tools →</span>
              <span className="text-sm font-medium text-slate-500 hidden group-open:inline">Hide tools</span>
            </summary>
            <div className="grid md:grid-cols-4 gap-3">
              <Link href="/lifestyle" onClick={(e) => handleToolClick(e, '/lifestyle')} className="group bg-gradient-to-r from-rose-50 to-white border border-rose-200 rounded-lg p-4 hover:border-rose-400 transition-all relative">
                <span className="absolute -top-2 right-2 bg-rose-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">Premium</span>
                <div className="flex items-center gap-2">
                  <img src="/team/cindy-ness.jpg" alt="Dr. Cindy Ness" className="w-5 h-5 rounded-full object-cover" />
                  <Heart className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Lifestyle Management</h3>
                <p className="text-slate-500 text-xs">Dr. Ness · 8 weeks</p>
              </Link>

              <Link href="/trials" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <Radar className="w-5 h-5 text-[#C66B4A]" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Trial Radar</h3>
                <p className="text-slate-500 text-xs">Find matching trials</p>
              </Link>

              <Link href="/ask" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <ThinkingIndicator size={20} variant="light" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Ask Navis</h3>
                <p className="text-slate-500 text-xs">Claude · OpenAI · Gemini</p>
              </Link>

              <Link href="/cancer-checklist" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <CheckCircle className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Checklist</h3>
                <p className="text-slate-500 text-xs">NCCN guidelines</p>
              </Link>

              <Link href="/coverage" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <DollarSign className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Coverage</h3>
                <p className="text-slate-500 text-xs">Medicare 2026</p>
              </Link>

              <Link href="/case-file" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Case File</h3>
                <p className="text-slate-500 text-xs">Your medical facts</p>
              </Link>

              <Link href="/tests" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <FlaskConical className="w-5 h-5 text-violet-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Testing</h3>
                <p className="text-slate-500 text-xs">Partnered with OpenOnco</p>
              </Link>

              <Link href="/services" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <Building2 className="w-5 h-5 text-[#C66B4A]" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Services</h3>
                <p className="text-slate-500 text-xs">356 cancer services</p>
              </Link>

              <Link href="/research" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <BookOpen className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Research</h3>
                <p className="text-slate-500 text-xs">with BioMCP · 200M+ papers</p>
              </Link>

              <Link href="/oncologists" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <Stethoscope className="w-5 h-5 text-teal-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Find Doctor</h3>
                <p className="text-slate-500 text-xs">By cancer type</p>
              </Link>

              <Link href="/hub" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <Heart className="w-5 h-5 text-rose-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">CareCircle</h3>
                <p className="text-slate-500 text-xs">Family updates</p>
              </Link>

              <Link href="/expert-review" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <UserCheck className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Expert Review</h3>
                <p className="text-slate-500 text-xs">Cancer Commons</p>
              </Link>

              <a href="https://community.cancerpatientlab.org/" target="_blank" rel="noopener noreferrer" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <Users className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">Community</h3>
                <p className="text-slate-500 text-xs">Partnered with Cancer Patient Lab</p>
              </a>

              <Link href="/profile" className="group bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-400 transition-all">
                <UserRound className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm mt-2">My Profile</h3>
                <p className="text-slate-500 text-xs">Your diagnosis</p>
              </Link>
            </div>
          </details>

        </div>
      </section>

      {/* Caregiver Section */}
      <section className="py-12 px-8 border-t border-stone-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              <span className="text-slate-600">Caregiver Tools:</span> Supporting someone with cancer?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              93% of caregivers say understanding the diagnosis is their biggest challenge. These tools help you be the advocate they need.
            </p>
          </div>

          {/* Core Caregiver Needs - mapped to tools */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Understand the diagnosis</h3>
                  <p className="text-sm text-slate-600 mb-2">Translate medical jargon into plain English with our Records Vault.</p>
                  <Link href="/records" onClick={() => trackEvent('caregiver_need_click', { need: 'understand_diagnosis', tool: 'records' })} className="inline-flex items-center text-sm text-slate-900 hover:text-orange-600 font-medium min-h-[44px]">
                    Upload records →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Microscope className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Explore treatment options</h3>
                  <p className="text-sm text-slate-600 mb-2">Get a comprehensive case review and understand all the options.</p>
                  <Link href="/records/case-review" onClick={() => trackEvent('caregiver_need_click', { need: 'treatment_options', tool: 'case_review' })} className="inline-flex items-center text-sm text-slate-900 hover:text-orange-600 font-medium min-h-[44px]">
                    Start case review →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Prepare for appointments</h3>
                  <p className="text-sm text-slate-600 mb-2">Know exactly what to ask the oncologist with our question generator.</p>
                  <Link href="/cancer-checklist" onClick={() => trackEvent('caregiver_need_click', { need: 'appointment_prep', tool: 'checklist' })} className="inline-flex items-center text-sm text-slate-900 hover:text-orange-600 font-medium min-h-[44px]">
                    Build question list →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Coordinate the care team</h3>
                  <p className="text-sm text-slate-600 mb-2">Share updates without repeating yourself. Keep everyone informed.</p>
                  <Link href="/hub" onClick={() => trackEvent('caregiver_need_click', { need: 'coordinate_care', tool: 'carecircle' })} className="inline-flex items-center text-sm text-slate-900 hover:text-orange-600 font-medium min-h-[44px]">
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
                setWizardStep(2) // Skip step 1 - we already know they're a caregiver
                setWizardRole('caregiver')
              }}
              className="inline-flex items-center gap-2 bg-[#C66B4A] hover:bg-[#B35E40] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#C66B4A]/25 hover:shadow-xl transition-all min-h-[44px]"
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
      <section className="py-8 px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center">
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
                className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-slate-900 text-slate-700 font-medium px-5 py-2.5 rounded-lg transition-all hover:shadow-md"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <a
                href="sms:?body=I thought these free cancer tools might help: https://opencancer.ai - built by a survivor, NCCN-informed"
                className="inline-flex items-center gap-2 bg-[#C66B4A] hover:bg-[#B35E40] text-white font-medium px-5 py-2.5 rounded-lg transition-all"
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
      <section className="py-6 px-8 border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Data from trusted sources</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              NCCN Guidelines
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              ClinicalTrials.gov
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
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
      <section className="py-12 px-8 border-t border-stone-200 overflow-hidden">
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
          @media (prefers-reduced-motion: reduce) {
            .testimonial-scroll {
              animation: none;
            }
          }
        `}</style>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">What Patients & Experts Say</h2>
        </div>

        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-[#f5f3ee] to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-l from-[#f5f3ee] to-transparent" />

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
      <section className="py-12 px-8 border-t border-stone-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900">Team</h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            Oncologists, scientists, and cancer survivors building tools that matter.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "Ari Akerstein, MS", title: "Co-Founder/CEO", subtitle: "Meta · Survivor", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/64694c7d-e3e3-414f-af72-288d201bb060/Screenshot+2024-10-02+at+10.59.02%E2%80%AFAM.jpg" },
              { name: "Brad Power", title: "Co-Founder/Chief Trust", subtitle: "Stanford · Survivor", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/48fdd96b-71a0-41f9-bc5f-f1ae27636b95/Screenshot+2024-09-11+at+7.36.59%E2%80%AFPM.png" },
              { name: "Chris Apfel, MD/PhD", title: "Chief Medical Officer", subtitle: "UCSF · 500+ publications", image: "https://images.squarespace-cdn.com/content/v1/66e1cb2b475b621f3d99bfeb/5761840d-8d31-4c56-a09e-c6f27510bc5a/Chris-Apfel-Nature-removebg-preview.png" },
              { name: "Kaumudi Bhawe, PhD", title: "Chief Scientific Officer", subtitle: "Genentech · Cancer Commons", image: "/team/kaumudi.webp" },
              { name: "Viktor Tabori", title: "Head of Growth", subtitle: "Stanford · Deloitte", image: "/team/viktor.webp" },
            ].map((person, i) => (
              <div key={i} className="text-center">
                <img
                  src={person.image}
                  alt={person.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-stone-200 shadow-md"
                />
                <p className="text-sm font-semibold text-slate-900 leading-tight">{person.name}</p>
                <p className="text-xs text-slate-600 font-medium">{person.title}</p>
                <p className="text-[10px] text-slate-500">{person.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/advisors" className="text-sm text-slate-900 hover:text-orange-600 font-medium underline underline-offset-2">
              View all advisors →
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-12 px-8 border-t border-stone-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
              <a href="https://www.cancerpatientlab.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-slate-500 hover:text-orange-600 transition-colors">
                <span>Partnered with</span>
                <img src="/cpl-logo.avif" alt="Cancer Patient Lab" className="h-6 object-contain" />
              </a>
            </div>
            <a
              href="https://community.cancerpatientlab.org/c/events/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-900 hover:text-orange-600 font-medium underline underline-offset-2"
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
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-900 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{event.date}</span>
                  <span className="text-xs text-slate-500">{event.time}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{event.title}</h3>
                {event.speaker && (
                  <p className="text-sm text-slate-500">{event.speaker}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-stone-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/about" className="hover:text-slate-600">About</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
            <span>·</span>
            <a href="mailto:support@opencancer.ai" className="hover:text-slate-600">Contact</a>
          </div>
        </div>
      </footer>

    </main>
  )
}

// Loading fallback for Suspense
function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
