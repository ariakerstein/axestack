'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Phone, Mail, Clock, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, ExternalLink, FileText, Users, Building2, HelpCircle, Pill, Search, Loader2, Copy, Check, ChevronDown, ChevronUp, Compass, Database, FileEdit } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'
import { CANCER_TYPES } from '@/lib/cancer-data'

// Eligibility questions
const ELIGIBILITY_QUESTIONS = [
  {
    id: 'standard_treatments',
    question: "Have you tried standard treatments for your cancer?",
    options: [
      { value: 'exhausted', label: "Yes, I've tried available standard treatments", eligible: true },
      { value: 'some', label: "I've tried some, but not all options", eligible: true },
      { value: 'none', label: "No, I haven't started standard treatment yet", eligible: false },
    ]
  },
  {
    id: 'clinical_trial',
    question: "Why can't you participate in a clinical trial?",
    options: [
      { value: 'no_trials', label: "No matching trials for my cancer type/stage", eligible: true },
      { value: 'criteria', label: "I don't meet eligibility criteria", eligible: true },
      { value: 'location', label: "Trials are too far away", eligible: true },
      { value: 'timing', label: "Treatment timeline doesn't align", eligible: true },
      { value: 'can_do_trial', label: "I might be able to do a trial", eligible: false },
    ]
  },
  {
    id: 'disease_status',
    question: "What is your current disease status?",
    options: [
      { value: 'progressing', label: "Cancer is progressing on current treatment", eligible: true },
      { value: 'recurrent', label: "Cancer has recurred after prior treatment", eligible: true },
      { value: 'refractory', label: "Cancer hasn't responded to treatments", eligible: true },
      { value: 'stable', label: "Cancer is currently stable", eligible: false },
    ]
  }
]

// Sample pharma expanded access programs (curated list with verified URLs)
const PHARMA_PROGRAMS: Record<string, { company: string; drugs: string[]; url: string; phone?: string }> = {
  'merck': { company: 'Merck', drugs: ['Keytruda (pembrolizumab)'], url: 'https://www.merckaccess.com/', phone: '1-800-672-6372' },
  'roche': { company: 'Roche/Genentech', drugs: ['Tecentriq (atezolizumab)', 'Avastin (bevacizumab)'], url: 'https://www.gene.com/medical-professionals/clinical-trial-information/other-types-of-access', phone: '1-844-287-3783' },
  'bms': { company: 'Bristol-Myers Squibb', drugs: ['Opdivo (nivolumab)', 'Yervoy (ipilimumab)'], url: 'https://www.bmsaccesssupport.com/patient', phone: '1-800-861-0048' },
  'pfizer': { company: 'Pfizer', drugs: ['Ibrance (palbociclib)', 'Lorbrena (lorlatinib)'], url: 'https://www.pfizer.com/science/clinical-trials/expanded-access' },
  'astrazeneca': { company: 'AstraZeneca', drugs: ['Tagrisso (osimertinib)', 'Imfinzi (durvalumab)'], url: 'https://www.astrazeneca.com/our-therapy-areas/oncology.html', phone: '1-844-275-2360' },
  'lilly': { company: 'Eli Lilly', drugs: ['Verzenio (abemaciclib)', 'Retevmo (selpercatinib)'], url: 'https://www.lilly.com/science/clinical-trials/expanded-access', phone: '1-800-545-5979' },
  'novartis': { company: 'Novartis', drugs: ['Kisqali (ribociclib)', 'Kymriah (tisagenlecleucel)'], url: 'https://www.novartis.com/healthcare-professionals/managed-access-programs' },
}

interface InvestigationalDrug {
  id: string // Unique identifier for UI
  name: string
  mechanism: string
  phase: string
  company: string
  nctId: string
  condition: string
  expandedAccessLikely: boolean
}

interface PharmaModalState {
  isOpen: boolean
  company: string
  url: string
  drugs: string[]
}

export default function ExpandedAccessPage() {
  const { trackEvent } = useAnalytics()
  const { profile } = useAuth()

  // Flow state
  const [step, setStep] = useState<'info' | 'eligibility' | 'drugs' | 'summary'>('info')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [cancerType, setCancerType] = useState(profile?.cancer_type || '')
  const [stage, setStage] = useState(profile?.stage || '')

  // Drug search state
  const [drugs, setDrugs] = useState<InvestigationalDrug[]>([])
  const [searchingDrugs, setSearchingDrugs] = useState(false)
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([])

  // Summary state
  const [copied, setCopied] = useState(false)
  const [showFAQ, setShowFAQ] = useState(false)

  // Pharma modal state
  const [pharmaModal, setPharmaModal] = useState<PharmaModalState>({
    isOpen: false,
    company: '',
    url: '',
    drugs: []
  })

  // Check eligibility based on answers
  const eligibilityResult = Object.entries(answers).reduce((acc, [questionId, answerValue]) => {
    const question = ELIGIBILITY_QUESTIONS.find(q => q.id === questionId)
    const answer = question?.options.find(o => o.value === answerValue)
    if (answer && !answer.eligible) {
      acc.eligible = false
      acc.reasons.push(answer.label)
    }
    return acc
  }, { eligible: true, reasons: [] as string[] })

  // Update cancer type from profile
  useEffect(() => {
    if (profile?.cancer_type && !cancerType) {
      setCancerType(profile.cancer_type)
    }
    if (profile?.stage && !stage) {
      setStage(profile.stage)
    }
  }, [profile, cancerType, stage])

  // Search for investigational drugs and EAPs
  const searchDrugs = async () => {
    if (!cancerType) return

    setSearchingDrugs(true)
    trackEvent('expanded_access_drug_search', { cancer_type: cancerType, stage })

    try {
      // Search ClinicalTrials.gov directly for Expanded Access programs
      const eapResponse = await fetch(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(cancerType + ' cancer')}&filter.overallStatus=AVAILABLE&query.term=expanded+access&pageSize=20`,
        { headers: { 'Accept': 'application/json' } }
      ).catch(() => null)

      // Also search for Phase 2/3 trials
      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancerType,
          stage,
          status: 'recruiting'
        })
      })

      // Process EAP results first (these are actual expanded access programs)
      const drugMap = new Map<string, InvestigationalDrug>()

      if (eapResponse?.ok) {
        try {
          const eapData = await eapResponse.json()
          for (const study of (eapData.studies || []).slice(0, 10)) {
            const protocol = study.protocolSection || {}
            const id = protocol.identificationModule?.nctId || ''
            const title = protocol.identificationModule?.briefTitle || ''
            const sponsor = protocol.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown'
            const description = protocol.descriptionModule?.briefSummary || ''

            if (id && !drugMap.has(id)) {
              drugMap.set(id, {
                id: `eap-${id}`, // Unique ID for UI
                name: `⭐ EAP: ${title.slice(0, 50)}...`,
                mechanism: description.slice(0, 150) + '...',
                phase: 'Expanded Access',
                company: sponsor,
                nctId: id,
                condition: cancerType,
                expandedAccessLikely: true
              })
            }
          }
        } catch (e) {
          console.log('EAP parsing error:', e)
        }
      }

      if (response.ok) {
        const data = await response.json()

        // Only show Phase 2/3 trials (more likely to have expanded access)
        // Show trials by their proper titles, not extracted "drug names"
        for (const trial of (data.trials || []).slice(0, 20)) {
          const phase = trial.phase || ''
          const isLatePhase = phase.toLowerCase().includes('phase3') ||
                              phase.toLowerCase().includes('phase 3') ||
                              phase.toLowerCase().includes('phase2') ||
                              phase.toLowerCase().includes('phase 2') ||
                              phase === 'PHASE2' || phase === 'PHASE3' ||
                              phase === 'PHASE4'

          // Skip non-late-phase trials
          if (!isLatePhase) continue

          const trialId = trial.id || ''
          if (!trialId || drugMap.has(trialId)) continue

          // Extract a cleaner title - look for drug names in title
          let displayName = trial.title || 'Clinical Trial'

          // Try to extract actual drug name from title using common patterns
          const drugMatch = displayName.match(/\b([A-Z][a-z]+(?:mab|nib|lib|tinib|ciclib|zumab))\b/i) ||
                           displayName.match(/\b([A-Z]{2,}-?\d{3,})\b/) || // Drug codes like VS-6766
                           displayName.match(/\b(pembrolizumab|nivolumab|atezolizumab|ipilimumab|trastuzumab|pertuzumab|olaparib|palbociclib|ribociclib)\b/i)

          if (drugMatch) {
            displayName = drugMatch[1]
          } else {
            // Use shortened title
            displayName = displayName.slice(0, 60) + (displayName.length > 60 ? '...' : '')
          }

          drugMap.set(trialId, {
            id: `trial-${trialId}`, // Unique ID for UI
            name: displayName,
            mechanism: trial.description?.slice(0, 150) + '...' || 'Investigational therapy',
            phase: phase,
            company: trial.sponsor || 'Unknown sponsor',
            nctId: trialId,
            condition: trial.condition || cancerType,
            expandedAccessLikely: phase.toLowerCase().includes('3') || phase.toLowerCase().includes('phase3')
          })
        }

        setDrugs(Array.from(drugMap.values()).slice(0, 12))
      }
    } catch (error) {
      console.error('Drug search error:', error)
    } finally {
      setSearchingDrugs(false)
    }
  }

  // Generate summary for oncologist
  const generateSummary = () => {
    const selectedDrugObjects = drugs.filter(d => selectedDrugs.includes(d.id))

    const summary = `
EXPANDED ACCESS INQUIRY - FOR ONCOLOGIST DISCUSSION

Patient Cancer Type: ${CANCER_TYPES[cancerType] || cancerType}
${stage ? `Stage: ${stage}` : ''}

ELIGIBILITY SELF-ASSESSMENT:
${ELIGIBILITY_QUESTIONS.map(q => {
  const answer = q.options.find(o => o.value === answers[q.id])
  return `• ${q.question}\n  → ${answer?.label || 'Not answered'}`
}).join('\n')}

INVESTIGATIONAL DRUGS OF INTEREST:
${selectedDrugObjects.map(d => `
• ${d.name}
  Phase: ${d.phase}
  Sponsor: ${d.company}
  ClinicalTrials.gov: ${d.nctId}
`).join('')}

NEXT STEPS FOR DISCUSSION:
1. Review if expanded access is appropriate for my situation
2. Contact drug manufacturers about expanded access programs
3. If appropriate, submit expanded access request to FDA
   - FDA Project Facilitate can help: (240) 402-0004
   - Email: OncProjectFacilitate@fda.hhs.gov

Generated via OpenCancer.ai/expanded-access
`.trim()

    return summary
  }

  const copySummary = () => {
    navigator.clipboard.writeText(generateSummary())
    setCopied(true)
    trackEvent('expanded_access_summary_copied', { drug_count: selectedDrugs.length })
    setTimeout(() => setCopied(false), 2000)
  }

  // Render based on current step
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Building2 className="w-4 h-4" />
            FDA Program
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Expanded Access & Project Facilitate
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {step === 'info' && "When standard treatments aren't working and clinical trials aren't an option, you may be able to access investigational drugs through the FDA."}
            {step === 'eligibility' && "Let's check if expanded access might be right for your situation."}
            {step === 'drugs' && "Find investigational drugs that may be available via expanded access."}
            {step === 'summary' && "Generate a summary to discuss with your oncologist."}
          </p>
        </div>

        {/* Progress indicator */}
        {step !== 'info' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['eligibility', 'drugs', 'summary'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['eligibility', 'drugs', 'summary'].indexOf(step) > i ? 'bg-green-600 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {['eligibility', 'drugs', 'summary'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-12 h-1 ${['eligibility', 'drugs', 'summary'].indexOf(step) > i ? 'bg-green-600' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP: INFO */}
        {step === 'info' && (
          <>
            {/* What is Expanded Access */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">What is Expanded Access?</h2>
              <p className="text-slate-600 mb-4">
                Expanded Access (also called "compassionate use") is an FDA program that allows patients
                with serious or life-threatening conditions to access investigational drugs, biologics,
                or medical devices that haven't yet been approved — when:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">No comparable or satisfactory alternative treatments exist</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Enrollment in clinical trials isn't possible</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">The potential benefit justifies the potential risks</span>
                </li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Investigational products may or may not be effective
                    and may cause unexpected serious side effects. This is a pathway when other options
                    have been exhausted.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setStep('eligibility'); trackEvent('expanded_access_start_flow'); }}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Check My Eligibility
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Project Facilitate */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Project Facilitate</h2>
                  <p className="text-blue-700">FDA's Oncology Expanded Access Support</p>
                </div>
              </div>
              <p className="text-slate-600 mb-6">
                Project Facilitate is a dedicated FDA program specifically for <strong>cancer patients</strong>.
                It provides a single point of contact to help oncology healthcare providers navigate
                the expanded access request process.
              </p>

              {/* Contact Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-blue-100">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    For Healthcare Providers
                  </h3>
                  <div className="space-y-3">
                    <a href="tel:+12404020004" onClick={() => trackEvent('expanded_access_contact', { type: 'phone', audience: 'provider' })} className="flex items-center gap-3 text-slate-700 hover:text-blue-600 transition-colors">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">(240) 402-0004</span>
                    </a>
                    <a href="mailto:OncProjectFacilitate@fda.hhs.gov" onClick={() => trackEvent('expanded_access_contact', { type: 'email', audience: 'provider' })} className="flex items-center gap-3 text-slate-700 hover:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">OncProjectFacilitate@fda.hhs.gov</span>
                    </a>
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Mon–Fri, 8am–4:30pm ET</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-blue-100">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    For Patients & Families
                  </h3>
                  <div className="space-y-3">
                    <a href="tel:+13017963400" onClick={() => trackEvent('expanded_access_contact', { type: 'phone', audience: 'patient' })} className="flex items-center gap-3 text-slate-700 hover:text-blue-600 transition-colors">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">(301) 796-3400</span>
                    </a>
                    <a href="mailto:druginfo@fda.hhs.gov" onClick={() => trackEvent('expanded_access_contact', { type: 'email', audience: 'patient' })} className="flex items-center gap-3 text-slate-700 hover:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                      <span>druginfo@fda.hhs.gov</span>
                    </a>
                  </div>
                </div>
              </div>

              <a href="https://www.fda.gov/about-fda/oncology-center-excellence/project-facilitate" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('expanded_access_external', { destination: 'fda_project_facilitate' })} className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium">
                Visit FDA's Project Facilitate page
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Reagan-Udall Expanded Access Navigator */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Compass className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Expanded Access Navigator</h2>
                  <p className="text-emerald-700">Reagan-Udall Foundation for the FDA</p>
                </div>
              </div>
              <p className="text-slate-600 mb-6">
                The <strong>Expanded Access Navigator</strong> is a free resource that guides patients and physicians
                through the expanded access process. It includes a searchable directory of pharmaceutical company
                policies and an electronic form submission tool.
              </p>

              {/* Tool Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <a
                  href="https://navigator.reaganudall.org/company-directory"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('expanded_access_external', { destination: 'reaganudall_directory' })}
                  className="bg-white rounded-xl p-5 border border-emerald-100 hover:border-emerald-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">Company Directory</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Search pharmaceutical companies' expanded access policies and contact information.
                  </p>
                </a>

                <a
                  href="https://erequest.navigator.reaganudall.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('expanded_access_external', { destination: 'reaganudall_erequest' })}
                  className="bg-white rounded-xl p-5 border border-emerald-100 hover:border-emerald-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileEdit className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">eRequest Tool</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Physicians can complete and submit FDA Form 3926 electronically.
                  </p>
                </a>
              </div>

              <div className="flex flex-wrap gap-4">
                <a
                  href="https://navigator.reaganudall.org/patients-and-caregivers"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('expanded_access_external', { destination: 'reaganudall_patients' })}
                  className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  Guide for Patients
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://navigator.reaganudall.org/physicians-and-healthcare-providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('expanded_access_external', { destination: 'reaganudall_physicians' })}
                  className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  Guide for Physicians
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center gap-3 text-sm text-slate-600">
                <Phone className="w-4 h-4" />
                <span>(202) 849-2075</span>
                <span className="text-slate-300">|</span>
                <Mail className="w-4 h-4" />
                <a href="mailto:navigator@reaganudall.org" className="hover:text-emerald-700">navigator@reaganudall.org</a>
              </div>
            </div>

            {/* FAQ Toggle */}
            <button
              onClick={() => setShowFAQ(!showFAQ)}
              className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 text-left hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-900">Common Questions</h2>
                </div>
                {showFAQ ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </button>

            {showFAQ && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8 -mt-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Does insurance cover expanded access drugs?</h3>
                    <p className="text-slate-600">It varies. Some insurance plans cover the drug and/or administration costs, while others don't. The pharmaceutical company sometimes provides the drug at no cost, but there may be other expenses.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Can I request any drug?</h3>
                    <p className="text-slate-600">The drug must be in active development (usually in clinical trials). Very early-stage experimental drugs may not be available. The drug company must also agree to provide it.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Will this affect my ability to join a clinical trial later?</h3>
                    <p className="text-slate-600">Possibly. Prior use of an investigational drug may affect eligibility for some trials. Discuss this with your oncologist.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">How long does approval take?</h3>
                    <p className="text-slate-600">For emergency requests, FDA often responds within 24 hours. Non-emergency individual requests typically take about 30 days.</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP: ELIGIBILITY */}
        {step === 'eligibility' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
            <button onClick={() => setStep('info')} className="text-slate-500 hover:text-slate-700 text-sm mb-6 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to overview
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6">Eligibility Self-Assessment</h2>
            <p className="text-slate-600 mb-8">Answer these questions to help determine if expanded access might be appropriate for your situation.</p>

            <div className="space-y-8">
              {ELIGIBILITY_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="border-b border-slate-100 pb-6 last:border-0">
                  <p className="font-medium text-slate-900 mb-4">{idx + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          answers[q.id] === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option.value}
                          checked={answers[q.id] === option.value}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Eligibility result */}
            {Object.keys(answers).length === ELIGIBILITY_QUESTIONS.length && (
              <div className={`mt-8 p-6 rounded-xl ${eligibilityResult.eligible ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                {eligibilityResult.eligible ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">You may be eligible for expanded access</h3>
                    </div>
                    <p className="text-green-800 text-sm mb-4">Based on your answers, expanded access could be an option to discuss with your oncologist.</p>

                    {/* Cancer type selection */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Your cancer type</label>
                      <select
                        value={cancerType}
                        onChange={(e) => setCancerType(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select cancer type</option>
                        {Object.entries(CANCER_TYPES).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => { setStep('drugs'); searchDrugs(); }}
                      disabled={!cancerType}
                      className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      Find Investigational Drugs
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-900">Expanded access may not be the best fit right now</h3>
                    </div>
                    <p className="text-amber-800 text-sm mb-4">
                      Based on your answers, you might want to explore other options first:
                    </p>
                    <ul className="text-amber-800 text-sm space-y-1 mb-4">
                      {eligibilityResult.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/trials" className="px-4 py-2 bg-white text-amber-700 font-medium rounded-lg border border-amber-300 hover:bg-amber-50">
                        Search Clinical Trials
                      </Link>
                      <Link href="/combat" className="px-4 py-2 bg-white text-amber-700 font-medium rounded-lg border border-amber-300 hover:bg-amber-50">
                        Analyze Treatment Options
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP: DRUGS */}
        {step === 'drugs' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
            <button onClick={() => setStep('eligibility')} className="text-slate-500 hover:text-slate-700 text-sm mb-6 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to eligibility
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Investigational Drugs</h2>
                <p className="text-slate-600">For {CANCER_TYPES[cancerType] || cancerType}</p>
              </div>
            </div>

            {searchingDrugs ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Searching for investigational drugs...</p>
              </div>
            ) : drugs.length > 0 ? (
              <>
                <p className="text-slate-600 mb-4">Select drugs you'd like to discuss with your oncologist:</p>

                <div className="space-y-3 mb-6">
                  {drugs.map((drug) => (
                    <label
                      key={drug.id}
                      className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedDrugs.includes(drug.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDrugs.includes(drug.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDrugs([...selectedDrugs, drug.id])
                            } else {
                              setSelectedDrugs(selectedDrugs.filter(id => id !== drug.id))
                            }
                          }}
                          className="w-5 h-5 mt-0.5 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{drug.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              drug.expandedAccessLikely
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {drug.phase}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{drug.mechanism}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Sponsor: {drug.company}</span>
                            <a
                              href={`https://clinicaltrials.gov/study/${drug.nctId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {drug.nctId}
                            </a>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Pharma programs callout */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-slate-900 mb-2">Major Pharma Expanded Access Programs</h3>
                  <p className="text-sm text-slate-600 mb-3">These companies have formal expanded access programs:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(PHARMA_PROGRAMS).map((program) => (
                      <button
                        key={program.company}
                        onClick={() => {
                          setPharmaModal({
                            isOpen: true,
                            company: program.company,
                            url: program.url,
                            drugs: program.drugs
                          })
                          trackEvent('expanded_access_pharma_click', { company: program.company })
                        }}
                        className="text-xs px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        {program.company}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep('summary')}
                  disabled={selectedDrugs.length === 0}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Generate Summary for My Doctor
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No investigational drugs found for {CANCER_TYPES[cancerType] || cancerType}.</p>
                <button
                  onClick={searchDrugs}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: SUMMARY */}
        {step === 'summary' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
            <button onClick={() => setStep('drugs')} className="text-slate-500 hover:text-slate-700 text-sm mb-6 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to drugs
            </button>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Summary for Your Oncologist</h2>
              <button
                onClick={copySummary}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 mb-6 font-mono text-sm whitespace-pre-wrap text-slate-700">
              {generateSummary()}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li>1. <strong>Share this summary</strong> with your oncologist at your next appointment</li>
                <li>2. <strong>Discuss eligibility</strong> — your doctor can assess if expanded access is appropriate</li>
                <li>3. <strong>Contact manufacturers</strong> — your doctor will need to request the drug from the company</li>
                <li>4. <strong>FDA submission</strong> — Project Facilitate can help with the FDA paperwork</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:?subject=Expanded Access Discussion&body=${encodeURIComponent(generateSummary())}`}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Summary
              </a>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Print Summary
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          This information is for educational purposes only and is not medical advice.
          Discuss all treatment options with your healthcare team.
        </p>
      </main>

      {/* Pharma External Link Modal */}
      {pharmaModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{pharmaModal.company}</h3>
                <p className="text-sm text-slate-500">Expanded Access Program</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-slate-900 mb-2">Investigational drugs:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                {pharmaModal.drugs.map((drug, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Pill className="w-3 h-3 text-slate-400" />
                    {drug}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  You're about to visit {pharmaModal.company}'s website. Expanded access eligibility
                  is determined by the pharmaceutical company and requires your oncologist to submit a request.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPharmaModal({ isOpen: false, company: '', url: '', drugs: [] })}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <a
                href={pharmaModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackEvent('expanded_access_external', { destination: pharmaModal.company })
                  setPharmaModal({ isOpen: false, company: '', url: '', drugs: [] })
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Visit Site
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
