'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import {
  CANCER_TYPES,
  PRIMARY_CATEGORIES,
  BLOOD_CANCERS,
  CANCER_SUBTYPES,
  STAGES,
  getTestsForCancer,
  getQuestionsForCancer,
  getBiomarkersForCancer,
} from '@/lib/cancer-data'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ShareButton } from '@/components/ShareButton'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'
import { Download, Edit3, Save, Check, X, Mail, Plus, Trash2, User } from 'lucide-react'

type Step = 'type' | 'subtype' | 'results'

interface PatientProfile {
  role?: string
  name?: string
  email?: string
  cancerType?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isNew?: boolean
}

interface ChecklistItem {
  id: string
  checked: boolean
  note: string
}

interface SavedChecklist {
  cancerType: string
  subtype: string
  stage: string
  items: Record<string, ChecklistItem>
  appointmentNotes: string
  customQuestions: string[]
  updatedAt: string
}

// Script templates for talking to your doctor
const SCRIPT_TEMPLATES = {
  opening: [
    "I've been doing some research and wanted to discuss a few things with you today.",
    "I have some questions about my testing and treatment options.",
    "I want to make sure we're considering all available options for my case.",
  ],
  askingAboutTest: [
    "I read about [TEST]. Is this something that would be appropriate for my case?",
    "Can you help me understand if [TEST] would provide useful information for my treatment?",
    "I'd like to know more about [TEST] - what would it tell us that we don't already know?",
  ],
  pushingBack: [
    "I understand that might not be standard, but given my situation, could we explore it?",
    "Is there a reason this test wouldn't be helpful for me specifically?",
    "What would need to be true for this to be worth doing?",
  ],
  understanding: [
    "Can you explain what that means in terms I can understand?",
    "How would this affect my treatment options?",
    "What are the pros and cons of this approach?",
  ],
  nextSteps: [
    "What should I expect next, and when should I follow up?",
    "Are there any clinical trials I should know about?",
    "What symptoms should prompt me to call sooner?",
  ],
}

// Generate "how to ask" for a test
const getHowToAsk = (testName: string, isEmerging: boolean): string => {
  if (isEmerging) {
    return `"I've read that ${testName} is now available and may be relevant for my case. Even if it's not standard yet, could we discuss whether it might provide useful information for my treatment decisions?"`
  }
  return `"Can we confirm that ${testName} has been done, and help me understand what the results mean for my treatment plan?"`
}

// Supabase config for RAG
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"


export default function CancerChecklistPage() {
  const { trackEvent } = useAnalytics()
  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [step, setStep] = useState<Step>('type')
  const [cancerType, setCancerType] = useState<string>('')
  const [subtype, setSubtype] = useState<string>('')
  const [stage, setStage] = useState<string>('')
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [hasTrackedResults, setHasTrackedResults] = useState(false)

  // Checklist state - checked items and notes
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistItem>>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [showHowToAsk, setShowHowToAsk] = useState<string | null>(null)
  const [customQuestions, setCustomQuestions] = useState<string[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      const loadedProfile: PatientProfile = {
        role: authProfile.role,
        name: authProfile.name,
        email: authProfile.email,
        cancerType: authProfile.cancer_type,
      }
      setProfile(loadedProfile)
      if (loadedProfile.cancerType && !cancerType) {
        setCancerType(loadedProfile.cancerType)
        setStep('results')
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        try {
          const loadedProfile = JSON.parse(saved) as PatientProfile
          setProfile(loadedProfile)
          if (loadedProfile.cancerType && !cancerType) {
            setCancerType(loadedProfile.cancerType)
            // Skip to results if we have profile data
            if (loadedProfile.cancerType) setStep('results')
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [user, authProfile, authLoading])

  // Load saved checklist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cancer-checklist-data')
    if (saved) {
      try {
        const data = JSON.parse(saved) as SavedChecklist
        if (data.cancerType === cancerType) {
          setChecklistItems(data.items || {})
          setAppointmentNotes(data.appointmentNotes || '')
          setCustomQuestions(data.customQuestions || [])
          setLastSaved(data.updatedAt)
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [cancerType])

  // Auto-save checklist to localStorage when items or notes change
  useEffect(() => {
    if ((Object.keys(checklistItems).length > 0 || appointmentNotes || customQuestions.length > 0) && cancerType) {
      const data: SavedChecklist = {
        cancerType,
        subtype,
        stage,
        items: checklistItems,
        appointmentNotes,
        customQuestions,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('cancer-checklist-data', JSON.stringify(data))
      setLastSaved(data.updatedAt)

      // Also save to Supabase if logged in
      if (user) {
        saveToCloud(data)
      }
    }
  }, [checklistItems, appointmentNotes, customQuestions, cancerType, subtype, stage, user])

  // Save to Supabase via API (fire and forget)
  const saveToCloud = async (data: SavedChecklist) => {
    try {
      setIsSaving(true)
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch('/api/checklists/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          cancerType: data.cancerType,
          subtype: data.subtype,
          stage: data.stage,
          items: data.items,
          appointmentNotes: data.appointmentNotes,
          customQuestions: data.customQuestions,
          updatedAt: data.updatedAt,
        }),
      })
    } catch (err) {
      console.error('Cloud sync failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Email checklist to self
  const emailToSelf = async (emailOverride?: string) => {
    const targetEmail = emailOverride || user?.email || emailInput

    if (!targetEmail) {
      setEmailError('Please enter your email')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setEmailError('Please enter a valid email')
      return
    }

    setEmailError('')
    setSendingEmail(true)
    try {
      const response = await fetch('/api/checklists/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          cancerType: CANCER_TYPES[cancerType],
          subtype: CANCER_SUBTYPES[cancerType]?.find(s => s.code === subtype)?.label,
          stage: STAGES.find(s => s.code === stage)?.label,
          tests: tests,
          checklistItems,
          questions: [...questions, ...customQuestions],
          appointmentNotes,
          biomarkers,
          saveEmail: !user, // Save to leads if not logged in
        }),
      })

      if (response.ok) {
        setEmailSent(true)
        setEmailInput('') // Clear the input
        setTimeout(() => setEmailSent(false), 3000)
      }
    } catch (err) {
      console.error('Email failed:', err)
      setEmailError('Failed to send. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  // Load checklist from cloud on mount (if logged in)
  useEffect(() => {
    const loadFromCloud = async () => {
      if (!user || authLoading || !cancerType) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const response = await fetch(`/api/checklists/save?cancerType=${cancerType}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const { checklists } = await response.json()
          if (checklists && checklists.length > 0) {
            const cloudData = checklists[0]
            // Merge cloud data with local (cloud wins for conflicts)
            setChecklistItems(prev => ({
              ...prev,
              ...cloudData.items,
            }))
            if (cloudData.appointment_notes) {
              setAppointmentNotes(cloudData.appointment_notes)
            }
            if (cloudData.custom_questions) {
              setCustomQuestions(cloudData.custom_questions)
            }
            setLastSaved(cloudData.updated_at)
          }
        }
      } catch (err) {
        console.error('Failed to load from cloud:', err)
      }
    }

    loadFromCloud()
  }, [user, authLoading, cancerType])

  // Toggle checkbox for a test
  const toggleCheck = (testId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        id: testId,
        checked: !prev[testId]?.checked,
        note: prev[testId]?.note || '',
      }
    }))
  }

  // Start editing a note
  const startEditNote = (testId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNote(testId)
    setNoteInput(checklistItems[testId]?.note || '')
  }

  // Save note
  const saveNote = (testId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        id: testId,
        checked: prev[testId]?.checked || false,
        note: noteInput,
      }
    }))
    setEditingNote(null)
    setNoteInput('')
  }

  // Cancel editing note
  const cancelEditNote = () => {
    setEditingNote(null)
    setNoteInput('')
  }

  // Export checklist as PDF
  const exportPDF = () => {
    const checkedTests = tests.filter(t => checklistItems[t.name]?.checked)
    const uncheckedTests = tests.filter(t => !checklistItems[t.name]?.checked)

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cancer Checklist - ${CANCER_TYPES[cancerType]}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; background: linear-gradient(to right, #8b5cf6, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #64748b; font-size: 14px; margin-top: 8px; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #1e293b; }
    h2 { font-size: 16px; color: #7c3aed; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .test { padding: 12px; margin-bottom: 8px; border-radius: 8px; }
    .test.checked { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .test.unchecked { background: #f8fafc; border-left: 4px solid #e2e8f0; }
    .test-name { font-weight: 600; color: #1e293b; }
    .test-reason { font-size: 14px; color: #64748b; margin-top: 4px; }
    .note { background: #fef3c7; padding: 8px 12px; margin-top: 8px; border-radius: 6px; font-size: 14px; color: #92400e; }
    .note-label { font-weight: 600; }
    .question { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .disclaimer { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .disclaimer p { color: #92400e; font-size: 14px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">opencancer.ai</div>
    <h1>Cancer Checklist</h1>
    <div class="meta">
      <strong>${CANCER_TYPES[cancerType]}</strong>
      ${stage ? ` • ${STAGES.find(s => s.code === stage)?.label || stage}` : ''}
      <br>Generated on ${new Date().toLocaleDateString()}
    </div>
  </div>

  ${checkedTests.length > 0 ? `
  <h2>✓ Completed Tests (${checkedTests.length})</h2>
  ${checkedTests.map(test => `
    <div class="test checked">
      <div class="test-name">✓ ${test.name}</div>
      <div class="test-reason">${test.reason}</div>
      ${checklistItems[test.name]?.note ? `<div class="note"><span class="note-label">Note:</span> ${checklistItems[test.name].note}</div>` : ''}
    </div>
  `).join('')}
  ` : ''}

  ${uncheckedTests.length > 0 ? `
  <h2>⬜ Pending Tests (${uncheckedTests.length})</h2>
  ${uncheckedTests.map(test => `
    <div class="test unchecked">
      <div class="test-name">${test.name}</div>
      <div class="test-reason">${test.reason}</div>
      ${checklistItems[test.name]?.note ? `<div class="note"><span class="note-label">Note:</span> ${checklistItems[test.name].note}</div>` : ''}
    </div>
  `).join('')}
  ` : ''}

  <h2>? Questions for Your Oncologist</h2>
  ${questions.map(q => `<div class="question">${q}</div>`).join('')}

  ${appointmentNotes ? `
  <h2>📝 My Appointment Notes</h2>
  <div class="test unchecked" style="white-space: pre-wrap;">${appointmentNotes}</div>
  ` : ''}

  <div class="disclaimer">
    <p><strong>Important:</strong> This checklist is for educational purposes only and is not medical advice. Always consult with your oncologist about your specific situation.</p>
  </div>

  <div class="footer">
    <p>Generated by opencancer.ai Cancer Checklist</p>
    <p>© ${new Date().getFullYear()} opencancer.ai</p>
  </div>
</body>
</html>
`
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
    trackEvent('checklist_export_pdf', { cancer_type: cancerType })
  }

  // Track when user views results
  useEffect(() => {
    if (step === 'results' && cancerType && !hasTrackedResults) {
      trackEvent('checklist_completed', {
        cancer_type: cancerType,
        subtype: subtype || null,
        stage: stage || null,
      })
      setHasTrackedResults(true)
    }
  }, [step, cancerType, subtype, stage, hasTrackedResults, trackEvent])

  const allCancerTypes = Object.entries(CANCER_TYPES).filter(
    ([code]) => !BLOOD_CANCERS.includes(code)
  )

  const handleTypeSelect = (type: string) => {
    if (type === 'blood') {
      setShowAllTypes(false)
      setCancerType('')
      // Show blood cancer subtypes
    } else {
      setCancerType(type)
      setStep('subtype')
    }
  }

  const handleBloodCancerSelect = (type: string) => {
    setCancerType(type)
    setStep('subtype')
  }

  const handleSubtypeComplete = () => {
    setStep('results')
  }

  const handleReset = () => {
    setCancerType('')
    setSubtype('')
    setStage('')
    setStep('type')
    setShowAllTypes(false)
    setChatMessages([])
  }

  // Open chat with a pre-filled question
  const askAbout = (topic: string, context: string) => {
    setChatInput(`Tell me more about "${topic}" for ${CANCER_TYPES[cancerType] || 'my cancer'}: ${context}`)
    setChatOpen(true)
    setTimeout(() => {
      document.querySelector('[placeholder*="Ask about"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // RAG-enhanced question answering
  const handleAskQuestion = async () => {
    if (!chatInput.trim()) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      // Step 1: Get RAG context
      let ragContext = ''
      if (cancerType) {
        try {
          const ragQuery = `${CANCER_TYPES[cancerType]} ${stage || ''} ${userMessage}`.trim()
          const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              query: ragQuery,
              cancerType: cancerType,
              limit: 3,
            }),
          })

          if (ragResponse.ok) {
            const ragData = await ragResponse.json()
            if (ragData.chunks && ragData.chunks.length > 0) {
              ragContext = `\n\nRELEVANT NCCN GUIDELINES:\n${ragData.chunks.map((c: { content: string }) => c.content).join('\n\n')}`
            }
          }
        } catch (ragErr) {
          console.log('RAG search optional - continuing without guidelines')
        }
      }

      // Step 2: Build context
      const checklistContext = `
CANCER CHECKLIST CONTEXT:
Cancer Type: ${CANCER_TYPES[cancerType] || 'Not specified'}
${subtype ? `Subtype: ${CANCER_SUBTYPES[cancerType]?.find(s => s.code === subtype)?.label || subtype}` : ''}
${stage ? `Stage: ${STAGES.find(s => s.code === stage)?.label || stage}` : ''}

Essential Tests: ${tests.filter(t => t.priority === 'essential').map(t => t.name).join(', ')}
Emerging Tests: ${tests.filter(t => t.priority === 'emerging').map(t => t.name).join(', ')}
Biomarkers: ${biomarkers.map(b => b.marker).join(', ')}
${ragContext}
      `.trim()

      // Step 3: Call AI
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on this cancer checklist context and NCCN guidelines:\n\n${checklistContext}\n\nPatient Question: ${userMessage}\n\nProvide a helpful, educational response. If NCCN guidelines are provided, reference them. Always remind them to discuss with their healthcare provider.`,
          history: chatMessages.filter(m => !m.isNew),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')
      const data = await response.json()

      setChatMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })),
        { role: 'assistant', content: data.response, isNew: true }
      ])

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isNew: false
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const tests = getTestsForCancer(cancerType)
  const questions = getQuestionsForCancer(cancerType)
  const biomarkers = getBiomarkersForCancer(cancerType)
  const essentialTests = tests.filter((t) => t.priority === 'essential')
  const emergingTests = tests.filter((t) => t.priority === 'emerging')

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      {/* Hero - Simplified */}
      <section className="px-4 pt-4 pb-4 text-center">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-blue-600">
            Cancer Checklist
          </span>
        </h1>
        <p className="text-slate-600 mb-3">
          Test recommendations + questions for your oncologist
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            NCCN Guidelines
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-amber-600">⚠️ Being audited. Verify with your oncologist.</span>
        </div>
      </section>

      {/* Progress Steps - Bold & Clear */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'type'
                ? 'bg-orange-600 text-white shadow-lg shadow-slate-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              1
            </div>
            <span className={`font-medium ${step === 'type' ? 'text-slate-600' : 'text-slate-500'}`}>
              Cancer Type
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'subtype'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : step === 'results'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              2
            </div>
            <span className={`font-medium ${step === 'subtype' ? 'text-blue-600' : step === 'results' ? 'text-slate-500' : 'text-slate-400'}`}>
              Details
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-200" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              step === 'results'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200'
                : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <span className={`font-medium ${step === 'results' ? 'text-cyan-600' : 'text-slate-400'}`}>
              Results
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Cancer Type Selection */}
      {step === 'type' && (
        <section className="py-8 px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
              What type of cancer?
            </h2>

            {/* Primary Categories */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {PRIMARY_CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => handleTypeSelect(cat.code)}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-md transition-all text-center"
                >
                  <span className="text-2xl block mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-600">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Blood cancer submenu */}
            {cancerType === '' && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAllTypes(!showAllTypes)}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-600 transition-colors py-2"
                >
                  {showAllTypes ? '← Back to main categories' : 'Show all cancer types →'}
                </button>

                {showAllTypes && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {allCancerTypes.map(([code, label]) => (
                      <button
                        key={code}
                        onClick={() => handleTypeSelect(code)}
                        className="text-left bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 hover:bg-white transition-all text-sm text-slate-700 hover:text-slate-600"
                      >
                        {label}
                      </button>
                    ))}
                    {BLOOD_CANCERS.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleBloodCancerSelect(code)}
                        className="text-left bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 hover:bg-white transition-all text-sm text-slate-700 hover:text-slate-600"
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Show blood cancer options when blood is selected */}
            {PRIMARY_CATEGORIES.find((c) => c.code === 'blood') && cancerType === '' && !showAllTypes && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-3 text-center">
                  For blood cancers, select specific type:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BLOOD_CANCERS.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleBloodCancerSelect(code)}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-2 hover:border-slate-400 transition-all text-sm text-slate-700 hover:text-slate-600"
                    >
                      {CANCER_TYPES[code]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 2: Subtype & Stage */}
      {step === 'subtype' && (
        <section className="py-8 px-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                setCancerType('')
                setStep('type')
              }}
              className="text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              ← Change cancer type
            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
              <p className="text-slate-800 font-medium">
                {CANCER_TYPES[cancerType] || 'Cancer'}
              </p>
            </div>

            {/* Subtype Selection */}
            {CANCER_SUBTYPES[cancerType] && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Subtype (optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CANCER_SUBTYPES[cancerType].map((sub) => (
                    <button
                      key={sub.code}
                      onClick={() => setSubtype(sub.code)}
                      className={`text-left border rounded-lg px-4 py-3 transition-all text-sm ${
                        subtype === sub.code
                          ? 'bg-slate-50 border-slate-400 text-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stage Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Stage (optional)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s.code}
                    onClick={() => setStage(s.code)}
                    className={`text-left border rounded-lg px-4 py-3 transition-all ${
                      stage === s.code
                        ? 'bg-slate-50 border-slate-400 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{s.label}</span>
                    {s.description && (
                      <span className="text-xs text-slate-500 block">
                        {s.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <div className="text-center">
              <button
                onClick={handleSubtypeComplete}
                className="bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-500 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105"
              >
                Get My Checklist →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <section className="py-8 px-8">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setStep('subtype')}
              className="text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              ← Back to details
            </button>

            {/* Summary Header */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    Your Cancer Checklist
                  </h2>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                      {CANCER_TYPES[cancerType]}
                    </span>
                    {subtype && subtype !== 'unknown' && (
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                        {CANCER_SUBTYPES[cancerType]?.find((s) => s.code === subtype)?.label}
                      </span>
                    )}
                    {stage && stage !== 'unknown' && (
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                        {STAGES.find((s) => s.code === stage)?.label}
                      </span>
                    )}
                  </div>
                </div>
                {/* Export/Share */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => emailToSelf()}
                    disabled={sendingEmail}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      emailSent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email to Me'}
                  </button>
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>
              {/* Progress summary */}
              {Object.keys(checklistItems).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-medium">
                      ✓ {Object.values(checklistItems).filter(i => i.checked).length} completed
                    </span>
                    <span className="text-slate-500">
                      {tests.length - Object.values(checklistItems).filter(i => i.checked).length} remaining
                    </span>
                    {Object.values(checklistItems).some(i => i.note) && (
                      <span className="text-amber-600">
                        📝 {Object.values(checklistItems).filter(i => i.note).length} notes
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Appointment Prep Section - HERO FEATURE */}
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">🗣️</span>
                  Prepare for Your Appointment
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Most Used
                </span>
              </div>

              {/* Email to self - Prominent CTA */}
              <div className="mb-6 p-4 bg-white border-2 border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-900">Email this checklist to yourself</p>
                </div>
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 flex-1">
                      Send to: <strong>{user.email}</strong>
                    </span>
                    <button
                      onClick={() => emailToSelf()}
                      disabled={sendingEmail}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        emailSent
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {sendingEmail ? 'Sending...' : emailSent ? '✓ Sent!' : 'Send Now'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value)
                          setEmailError('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') emailToSelf()
                        }}
                        placeholder="Enter your email..."
                        className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => emailToSelf()}
                        disabled={sendingEmail}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          emailSent
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        {sendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email Me'}
                      </button>
                    </div>
                    {emailError && (
                      <p className="text-red-500 text-xs mt-2">{emailError}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      We'll also send you updates about new cancer research tools.
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Questions - Add your own */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-3">Your questions for the doctor:</p>
                <div className="space-y-2 mb-3">
                  {customQuestions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg p-3">
                      <span className="text-blue-500">?</span>
                      <span className="flex-1 text-sm text-slate-700">{q}</span>
                      <button
                        onClick={() => setCustomQuestions(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newQuestion.trim()) {
                        setCustomQuestions(prev => [...prev, newQuestion.trim()])
                        setNewQuestion('')
                      }
                    }}
                    placeholder="Add a question you want to ask..."
                    className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      if (newQuestion.trim()) {
                        setCustomQuestions(prev => [...prev, newQuestion.trim()])
                        setNewQuestion('')
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Free-form notes */}
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Appointment notes & concerns:
                </label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Things you want to remember to mention...

Example:
- Side effects I've been experiencing
- Questions about timeline
- Clinical trial interest"
                  className="w-full h-24 px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Script Templates - Collapsible */}
              <details className="mb-4">
                <summary className="text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                  💬 Helpful phrases to start the conversation
                </summary>
                <div className="mt-3 grid gap-2">
                  {SCRIPT_TEMPLATES.opening.map((phrase, i) => (
                    <button
                      key={i}
                      onClick={() => navigator.clipboard.writeText(phrase)}
                      className="text-left bg-white border border-blue-200 rounded-lg p-3 text-sm text-slate-700 hover:bg-blue-100 hover:border-blue-300 transition-colors group"
                    >
                      <span className="text-blue-500 mr-2">→</span>
                      "{phrase}"
                      <span className="text-xs text-blue-400 ml-2 opacity-0 group-hover:opacity-100">Click to copy</span>
                    </button>
                  ))}
                </div>
              </details>

              {/* Pushback phrases */}
              <details>
                <summary className="text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                  🛡️ If your doctor says no...
                </summary>
                <div className="mt-3 grid gap-2">
                  {SCRIPT_TEMPLATES.pushingBack.map((phrase, i) => (
                    <button
                      key={i}
                      onClick={() => navigator.clipboard.writeText(phrase)}
                      className="text-left bg-white border border-amber-200 rounded-lg p-3 text-sm text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition-colors group"
                    >
                      <span className="text-amber-500 mr-2">→</span>
                      "{phrase}"
                      <span className="text-xs text-amber-400 ml-2 opacity-0 group-hover:opacity-100">Click to copy</span>
                    </button>
                  ))}
                </div>
              </details>

              <p className="text-xs text-slate-500 mt-4">
                {user ? '✓ Auto-saved to your account' : 'Sign in to save across devices'}
              </p>
            </div>

            {/* Essential Tests */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-slate-500">✓</span>
                  Essential Tests (NCCN Guidelines)
                </h3>
                {step === 'results' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {isSaving && <span className="text-amber-600">Saving...</span>}
                    {lastSaved && !isSaving && (
                      <span className="text-green-600">
                        Saved {new Date(lastSaved).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">Check off completed tests • Click to add notes</p>
              <div className="space-y-3">
                {essentialTests.map((test, i) => {
                  const item = checklistItems[test.name]
                  const isEditing = editingNote === test.name
                  return (
                    <div
                      key={i}
                      className={`bg-white border rounded-xl p-4 transition-all ${
                        item?.checked
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleCheck(test.name)}
                          className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            item?.checked
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {item?.checked && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${item?.checked ? 'text-green-700 line-through' : 'text-slate-900'}`}>
                            {test.name}
                          </p>
                          <p className="text-sm text-slate-600">{test.reason}</p>

                          {/* Note display/edit */}
                          {isEditing ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Add a note (e.g., date scheduled, results)..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveNote(test.name)
                                  if (e.key === 'Escape') cancelEditNote()
                                }}
                              />
                              <button
                                onClick={() => saveNote(test.name)}
                                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditNote}
                                className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : item?.note ? (
                            <button
                              onClick={(e) => startEditNote(test.name, e)}
                              className="mt-2 w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                            >
                              📝 {item.note}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => startEditNote(test.name, e)}
                              className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Add note
                            </button>
                          )}

                          {/* How to Ask toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowHowToAsk(showHowToAsk === test.name ? null : test.name)
                            }}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                          >
                            💬 {showHowToAsk === test.name ? 'Hide' : 'How to ask your doctor'}
                          </button>
                          {showHowToAsk === test.name && (
                            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm text-blue-800 italic">
                                {getHowToAsk(test.name, false)}
                              </p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(getHowToAsk(test.name, false))
                                }}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                              >
                                📋 Copy to clipboard
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Ask about */}
                        <button
                          onClick={() => askAbout(test.name, test.reason)}
                          className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-1"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Emerging Tests */}
            {emergingTests.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-amber-500">★</span>
                  Emerging Tests (Beyond Guidelines)
                </h3>
                <div className="space-y-3">
                  {emergingTests.map((test, i) => {
                    const item = checklistItems[test.name]
                    const isEditing = editingNote === test.name
                    return (
                      <div
                        key={i}
                        className={`border rounded-xl p-4 transition-all ${
                          item?.checked
                            ? 'border-green-300 bg-green-50'
                            : 'bg-amber-50 border-amber-200 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleCheck(test.name)}
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                              item?.checked
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-amber-300 hover:border-amber-500'
                            }`}
                          >
                            {item?.checked && <Check className="w-3 h-3" />}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium flex items-center gap-2 ${item?.checked ? 'text-green-700 line-through' : 'text-slate-900'}`}>
                              {test.name}
                              {test.urgency && (
                                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                  {test.urgency}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600">{test.reason}</p>

                            {/* Note display/edit */}
                            {isEditing ? (
                              <div className="mt-2 flex gap-2">
                                <input
                                  type="text"
                                  value={noteInput}
                                  onChange={(e) => setNoteInput(e.target.value)}
                                  placeholder="Add a note..."
                                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveNote(test.name)
                                    if (e.key === 'Escape') cancelEditNote()
                                  }}
                                />
                                <button onClick={() => saveNote(test.name)} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm">
                                  <Save className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditNote} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : item?.note ? (
                              <button
                                onClick={(e) => startEditNote(test.name, e)}
                                className="mt-2 w-full text-left bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-800 hover:bg-amber-200"
                              >
                                📝 {item.note}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => startEditNote(test.name, e)}
                                className="mt-2 text-xs text-slate-400 hover:text-amber-600 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Add note
                              </button>
                            )}

                            {/* How to Ask - especially important for emerging tests */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowHowToAsk(showHowToAsk === test.name ? null : test.name)
                              }}
                              className="mt-2 text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
                            >
                              💬 {showHowToAsk === test.name ? 'Hide' : 'How to ask your doctor'}
                            </button>
                            {showHowToAsk === test.name && (
                              <div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg p-3">
                                <p className="text-sm text-amber-900 italic">
                                  {getHowToAsk(test.name, true)}
                                </p>
                                <p className="text-xs text-amber-700 mt-2">
                                  💡 Tip: Emerging tests may not be standard yet, so you may need to advocate for yourself.
                                </p>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(getHowToAsk(test.name, true))
                                  }}
                                  className="mt-2 text-xs text-amber-700 hover:text-amber-900"
                                >
                                  📋 Copy to clipboard
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => askAbout(test.name, test.reason)}
                            className="text-amber-400 hover:text-amber-600 flex-shrink-0 mt-1"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Questions for Oncologist */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-blue-500">?</span>
                Questions for Your Oncologist
              </h3>
              <p className="text-xs text-slate-500 mb-3">Tap any question to get AI guidance</p>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => askAbout(q, 'Help me understand this question and what answers to look for.')}
                    className="w-full text-left bg-blue-50 border border-blue-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-100 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5 group-hover:text-blue-600">?</span>
                      <span className="text-slate-700 flex-1 group-hover:text-blue-800">{q}</span>
                      <span className="text-blue-400 group-hover:text-blue-600 flex-shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Biomarkers */}
            {biomarkers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-slate-500">🧬</span>
                  Key Biomarkers & Targeted Therapies
                </h3>
                <p className="text-xs text-slate-500 mb-3">Tap any biomarker to learn more</p>
                <div className="space-y-2">
                  {biomarkers.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => askAbout(b.marker, `This biomarker is treated with ${b.drug}. ${b.indication}`)}
                      className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:bg-slate-100 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-700 group-hover:text-slate-800">{b.marker}</p>
                          <p className="text-sm text-slate-600">{b.drug}</p>
                          <p className="text-xs text-slate-500">{b.indication}</p>
                        </div>
                        <span className="text-slate-400 group-hover:text-slate-600 flex-shrink-0">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-link to Community */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-50 border border-slate-200 rounded-xl p-6 text-center mt-6">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-slate-700 mb-4">
                Connect with others on the same journey
              </p>
              <a
                href="https://community.cancerpatientlab.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-slate-500 to-slate-500 hover:from-slate-400 hover:to-slate-400 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"
              >
                Join CancerPatient Lab
              </a>
              <p className="text-slate-500 text-sm mt-3">
                Community forums, support groups, and shared experiences
              </p>
            </div>

            {/* Start Over */}
            <div className="text-center mt-8">
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Start over with different cancer type
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="py-8 px-8 border-t border-slate-200 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-slate-500">
            This checklist is for educational purposes only and is not medical
            advice. Always consult with your oncologist about your specific
            situation. Guidelines are based on NCCN/ASCO recommendations and may
            not apply to all patients.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ These recommendations are being audited for accuracy. Please verify all information with your healthcare provider.
          </p>
        </div>
      </section>


      {/* Side-Peek Chat Panel */}
      {step === 'results' && (
        <>
          {/* Chat Toggle Button */}
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ThinkingIndicator size={32} variant="dark" />
              <span className="font-medium">Ask about your checklist</span>
            </button>
          )}

          {/* Side Panel */}
          <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ThinkingIndicator size={40} variant="light" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Ask Navis</h3>
                    <p className="text-xs text-slate-600">
                      NCCN {CANCER_TYPES[cancerType]} guidelines
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-sm text-slate-700">
                        I can help explain any test, question, or biomarker from your {CANCER_TYPES[cancerType]} checklist using NCCN guidelines.
                      </p>
                    </div>

                    <p className="text-sm font-medium text-slate-700 pt-2">Suggested questions</p>
                    {[
                      `What's the most important test for ${CANCER_TYPES[cancerType]}?`,
                      "What should I ask my oncologist at my next appointment?",
                      "Are there any clinical trials I should know about?",
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(q); setTimeout(handleAskQuestion, 50) }}
                        className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-slate-50 rounded-xl text-slate-700 hover:text-slate-700 transition-colors border border-slate-100 hover:border-slate-200 group"
                      >
                        <span className="text-slate-400 group-hover:text-slate-600 text-lg">→</span>
                        <span className="text-sm">{q}</span>
                      </button>
                    ))}
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${
                      msg.role === 'user'
                        ? 'ml-6 bg-slate-100 text-slate-900 px-4 py-3 rounded-2xl rounded-tr-sm'
                        : 'mr-2'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-100">
                        <TypewriterMarkdown
                          text={msg.content}
                          instantRender={!msg.isNew}
                          className="text-sm leading-relaxed"
                        />
                      </div>
                    ) : (
                      <span className="text-sm">{msg.content}</span>
                    )}
                  </div>
                ))}

                {isChatLoading && (
                  <div className="mr-4 bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm inline-block">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                    placeholder="Ask about tests, biomarkers, questions..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-5 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white rounded-xl transition-colors font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backdrop */}
          {chatOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-40 sm:hidden"
              onClick={() => setChatOpen(false)}
            />
          )}
        </>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  )
}
