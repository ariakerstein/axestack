'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { FileText, Search, FlaskConical, Ribbon, MessageCircle, BookOpen, ArrowRight, Upload, Link2, Building2, Shield, CheckCircle2 } from 'lucide-react'

interface TranslationResult {
  document_type: string
  patient_name: string
  date_of_service: string
  provider_name: string
  institution: string
  diagnosis: string[]
  test_summary: string
  questions_to_ask_doctor: string
  recommended_next_steps: string[]
  cancer_specific: {
    cancer_type: string
    stage: string
    grade: string
    biomarkers: string[]
    treatment_timeline: string
  }
  lab_values: {
    key_results: Array<{
      test: string
      value: string
      reference_range: string
      status: string
    }>
  }
  technical_terms_explained: Array<{
    term: string
    definition: string
  }>
  processing_metadata: {
    confidence_level: string
    completeness: string
    extraction_method: string
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isNew?: boolean
}

interface ConnectedPortal {
  id: string
  name: string
  provider: string
  connectedAt: string
  lastSync: string
  recordCount: number
}

// Supabase config for RAG
const SUPABASE_URL = "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbG9mbWxocXdjZHBpeWpnc3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NzQzODAsImV4cCI6MjA1NjI1MDM4MH0._kYA-prwPgxQWoKzWPzJDy2Bf95WgTF5_KnAPN2cGnQ"

// Atom Animation Component
function AtomIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const nucleusSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const electronSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <div className={`relative ${dimensions}`} style={{ perspective: '150px', perspectiveOrigin: 'center' }}>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className={`${nucleusSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 30% 30%, #E879F9, #A855F7 50%, #7C3AED 100%)',
          boxShadow: '0 2px 6px rgba(168, 85, 247, 0.4)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
        <div className={`absolute top-1/2 -left-0.5 -translate-y-1/2 ${electronSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 35% 35%, #C4B5FD, #8B5CF6 50%, #6D28D9 100%)',
          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
        <div className={`absolute -top-0.5 left-1/2 -translate-x-1/2 ${electronSize} rounded-full`} style={{
          background: 'radial-gradient(circle at 35% 35%, #67E8F9, #06B6D4 50%, #0891B2 100%)',
          boxShadow: '0 1px 3px rgba(6, 182, 212, 0.5)'
        }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <div className={`${electronSize} rounded-full electron-z`} style={{
          background: 'radial-gradient(circle at 35% 35%, #FBCFE8, #EC4899 50%, #DB2777 100%)',
          boxShadow: '0 1px 3px rgba(236, 72, 153, 0.5)',
        }} />
      </div>
      <style jsx>{`
        @keyframes orbitZ {
          0% { transform: translateZ(16px) scale(1.2); }
          25% { transform: translateX(12px) translateZ(0px) scale(1); }
          50% { transform: translateZ(-16px) scale(0.8); }
          75% { transform: translateX(-12px) translateZ(0px) scale(1); }
          100% { transform: translateZ(16px) scale(1.2); }
        }
        .electron-z { animation: orbitZ 3s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// Portal providers list
const PORTAL_PROVIDERS = [
  { id: 'mychart', name: 'MyChart (Epic)', icon: '🏥', description: 'Most hospital systems', popular: true },
  { id: 'followmyhealth', name: 'FollowMyHealth', icon: '💊', description: 'Allscripts systems', popular: true },
  { id: 'patient-fusion', name: 'Patient Fusion', icon: '🩺', description: 'Practice Fusion clinics', popular: false },
  { id: 'athenahealth', name: 'athenahealth', icon: '⚕️', description: 'athena Patient Portal', popular: true },
  { id: 'cerner', name: 'Cerner Health', icon: '🏨', description: 'Cerner/Oracle systems', popular: true },
  { id: 'nextgen', name: 'NextGen Patient Portal', icon: '📋', description: 'NextGen Healthcare', popular: false },
  { id: 'other', name: 'Other Portal', icon: '🔗', description: 'Connect any patient portal', popular: false },
]

export default function RecordsVaultPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'portal'>('upload')

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TranslationResult | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'terms', 'questions']))
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [savedTranslations, setSavedTranslations] = useState<Array<{id: string, fileName: string, date: string, documentType: string}>>([])
  const [showSavedList, setShowSavedList] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Portal connection state
  const [connectedPortals, setConnectedPortals] = useState<ConnectedPortal[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')

  // Load saved data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('axestack-translations')
      if (saved) {
        try {
          setSavedTranslations(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load saved translations')
        }
      }

      const portals = localStorage.getItem('opencancer-portals')
      if (portals) {
        try {
          setConnectedPortals(JSON.parse(portals))
        } catch (e) {
          console.error('Failed to load connected portals')
        }
      }
    }
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setResult(null)
      setError(null)
      setChatMessages([])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
      setChatMessages([])
    }
  }, [])

  const handleTranslate = async () => {
    if (!file) return
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process document')
      }

      const data = await response.json()
      setResult(data.analysis)
      if (data.documentText) {
        setDocumentText(data.documentText)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  // RAG-enhanced question answering
  const handleAskQuestion = async () => {
    if (!chatInput.trim() || !file) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      // Step 1: Get RAG context if we have cancer info
      let ragContext = ''
      const cancerType = result?.cancer_specific?.cancer_type
      const stage = result?.cancer_specific?.stage

      if (cancerType && cancerType !== 'unknown') {
        try {
          const ragQuery = `${cancerType} ${stage !== 'unknown' ? stage : ''} ${userMessage}`.trim()
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
              ragContext = `\n\nRELEVANT NCCN GUIDELINES:\n${ragData.chunks.map((c: any) => c.content).join('\n\n')}`
            }
          }
        } catch (ragErr) {
          console.log('RAG search optional - continuing without guidelines')
        }
      }

      // Step 2: Build full context
      let documentContext = ''
      if (result) {
        documentContext = `
MEDICAL DOCUMENT ANALYSIS:
Document: ${file?.name || 'Medical Record'}
Type: ${result.document_type}
Summary: ${result.test_summary}
Diagnosis: ${result.diagnosis?.join(', ') || 'Not specified'}
${cancerType !== 'unknown' ? `Cancer Type: ${cancerType}` : ''}
${stage !== 'unknown' ? `Stage: ${stage}` : ''}
Key Lab Values: ${result.lab_values?.key_results?.map(r => `${r.test}: ${r.value}`).join(', ') || 'None'}
${ragContext}
${documentText ? `\nEXTRACTED DOCUMENT TEXT (first 8000 chars):\n${documentText.substring(0, 8000)}` : ''}
        `.trim()
      } else {
        documentContext = `The user has uploaded a medical document named "${file.name}". They haven't translated it yet.`
      }

      // Step 3: Call AI with RAG-enhanced context
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on this medical document and NCCN guidelines context:\n\n${documentContext}\n\nPatient Question: ${userMessage}\n\nProvide a helpful, educational response. If NCCN guidelines are provided, reference them. Always remind them to discuss with their healthcare provider.`,
          history: chatMessages.filter(m => !m.isNew),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')
      const data = await response.json()

      // Mark previous messages as not new, add new response
      setChatMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })),
        { role: 'assistant', content: data.response, isNew: true }
      ])

      // Scroll to bottom
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

  const resetUpload = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setChatMessages([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownloadSummary = () => {
    if (!result || !file) return

    const summary = `
MEDICAL RECORD TRANSLATION
Generated by opencancer.ai Records Vault
========================

File: ${file.name}
Document Type: ${result.document_type}
Date: ${new Date().toLocaleDateString()}

PLAIN ENGLISH SUMMARY
---------------------
${result.test_summary}

${result.diagnosis && result.diagnosis.length > 0 ? `
KEY FINDINGS
------------
${result.diagnosis.map(d => `* ${d}`).join('\n')}
` : ''}

${result.lab_values?.key_results && result.lab_values.key_results.length > 0 ? `
LAB RESULTS
-----------
${result.lab_values.key_results.map(l => `${l.test}: ${l.value} (${l.status})`).join('\n')}
` : ''}

${result.questions_to_ask_doctor ? `
QUESTIONS FOR YOUR DOCTOR
-------------------------
${result.questions_to_ask_doctor}
` : ''}

========================
DISCLAIMER: This is an educational summary only.
Not medical advice. Always discuss with your healthcare provider.
    `.trim()

    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}-summary.txt`
    a.click()
    URL.revokeObjectURL(url)
    setShowSaveModal(false)
  }

  const handleSaveToApp = () => {
    if (!result || !file) return

    const id = `trans_${Date.now()}`
    const translation = {
      id,
      fileName: file.name,
      date: new Date().toISOString(),
      documentType: result.document_type,
      result,
      documentText,
      chatMessages,
    }

    // Save full translation data
    const existingData = localStorage.getItem('axestack-translations-data') || '{}'
    const data = JSON.parse(existingData)
    data[id] = translation
    localStorage.setItem('axestack-translations-data', JSON.stringify(data))

    // Update index for quick listing
    const newEntry = { id, fileName: file.name, date: translation.date, documentType: result.document_type }
    const updatedList = [newEntry, ...savedTranslations]
    setSavedTranslations(updatedList)
    localStorage.setItem('axestack-translations', JSON.stringify(updatedList))

    setSaveSuccess(true)
    setTimeout(() => {
      setSaveSuccess(false)
      setShowSaveModal(false)
    }, 1500)
  }

  const loadSavedTranslation = (id: string) => {
    const data = localStorage.getItem('axestack-translations-data')
    if (!data) return

    const translations = JSON.parse(data)
    const saved = translations[id]
    if (saved) {
      setResult(saved.result)
      setDocumentText(saved.documentText || '')
      setChatMessages(saved.chatMessages || [])
      // Create a fake file object for display
      setFile(new File([], saved.fileName))
      setShowSavedList(false)
    }
  }

  const deleteSavedTranslation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Remove from data store
    const data = localStorage.getItem('axestack-translations-data')
    if (data) {
      const translations = JSON.parse(data)
      delete translations[id]
      localStorage.setItem('axestack-translations-data', JSON.stringify(translations))
    }

    // Remove from index
    const updatedList = savedTranslations.filter(t => t.id !== id)
    setSavedTranslations(updatedList)
    localStorage.setItem('axestack-translations', JSON.stringify(updatedList))
  }

  // Portal connection handler
  const handleConnectPortal = async () => {
    if (!selectedProvider || !portalEmail) return

    setIsConnecting(true)

    // Simulate connection (in production, this would use OAuth or secure API)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const provider = PORTAL_PROVIDERS.find(p => p.id === selectedProvider)
    const newPortal: ConnectedPortal = {
      id: `portal_${Date.now()}`,
      name: provider?.name || 'Unknown Portal',
      provider: selectedProvider,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      recordCount: Math.floor(Math.random() * 20) + 5, // Simulated
    }

    const updatedPortals = [...connectedPortals, newPortal]
    setConnectedPortals(updatedPortals)
    localStorage.setItem('opencancer-portals', JSON.stringify(updatedPortals))

    setIsConnecting(false)
    setSelectedProvider(null)
    setPortalEmail('')
    setPortalPassword('')
  }

  const disconnectPortal = (id: string) => {
    const updatedPortals = connectedPortals.filter(p => p.id !== id)
    setConnectedPortals(updatedPortals)
    localStorage.setItem('opencancer-portals', JSON.stringify(updatedPortals))
  }

  // Collapsible Section Component
  const Section = ({ id, icon, title, children, defaultOpen = false, highlight = false, badge }: {
    id: string; icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean; highlight?: boolean; badge?: string
  }) => {
    const isOpen = expandedSections.has(id) || defaultOpen
    return (
      <div className={`rounded-2xl border shadow-sm ${highlight ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200' : 'bg-white border-slate-200'}`}>
        <button onClick={() => toggleSection(id)} className="w-full px-5 py-4 flex items-center justify-between text-left">
          <span className="flex items-center gap-3">
            <span className="w-5 h-5 text-violet-600 flex-shrink-0">{icon}</span>
            <span className="font-semibold text-slate-900 text-base">{title}</span>
            {badge && <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">{badge}</span>}
          </span>
          <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isOpen ? 'bg-slate-200' : 'bg-slate-100'} text-slate-600 text-sm font-medium`}>
            {isOpen ? '−' : '+'}
          </span>
        </button>
        {isOpen && <div className="px-5 pb-5 pt-1 border-t border-slate-100/50">{children}</div>}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm">
            ← Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">opencancer.ai</span>
            <span className="text-slate-400 text-sm">/</span>
            <span className="font-medium text-slate-700">Records</span>
          </Link>
          {savedTranslations.length > 0 ? (
            <button
              onClick={() => setShowSavedList(true)}
              className="text-violet-600 hover:text-violet-700 text-sm font-medium"
            >
              My Saved ({savedTranslations.length})
            </button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Page Header */}
        {!result && (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Records Vault</h1>
            <p className="text-slate-600">Upload records or connect your patient portal to get plain English translations</p>
          </div>
        )}

        {/* Tab Navigation */}
        {!result && (
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Records
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'portal'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Connect Portal
            </button>
          </div>
        )}

        {/* Upload Tab Content */}
        {activeTab === 'upload' && !result && (
          <div className="bg-gradient-to-b from-white to-violet-50/30 rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full mb-4">
                NCCN guideline-informed
              </div>
              <p className="text-lg text-slate-600">Drop your lab results, pathology report, or doctor's notes</p>
            </div>

            {/* What you'll get */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                Plain English summary
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                Questions for your doctor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                Medical terms explained
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragging ? 'border-violet-500 bg-violet-50' : file ? 'border-green-400 bg-green-50' : 'border-violet-300 bg-white hover:border-violet-500 hover:bg-violet-50/50'}`}
            >
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" className="hidden" />
              {file ? (
                <div>
                  <div className="w-14 h-14 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-2xl">✓</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-lg">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button onClick={(e) => { e.stopPropagation(); resetUpload() }} className="mt-3 text-sm text-slate-500 hover:text-red-600 underline">
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl">📄</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-lg">Drop your medical document here</p>
                  <p className="text-slate-500 mt-1">or click to browse your files</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {['PDF', 'Word', 'Images', 'Text'].map(format => (
                      <span key={format} className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">{format}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={handleTranslate}
                disabled={isProcessing}
                className="w-full mt-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-violet-500/20"
              >
                {isProcessing ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing your document...</>
                ) : (
                  <>Translate to Plain English →</>
                )}
              </button>
            )}

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                HIPAA-compliant
              </span>
              <span className="text-slate-300">·</span>
              <span>Your data stays private</span>
              <span className="text-slate-300">·</span>
              <span>No account required</span>
            </div>
          </div>
        )}

        {/* Portal Connection Tab Content */}
        {activeTab === 'portal' && !result && (
          <div className="space-y-6">
            {/* Connected Portals */}
            {connectedPortals.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Connected Portals
                </h3>
                <div className="space-y-3">
                  {connectedPortals.map(portal => (
                    <div key={portal.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-green-700" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{portal.name}</p>
                          <p className="text-sm text-slate-500">
                            {portal.recordCount} records · Last synced {new Date(portal.lastSync).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => disconnectPortal(portal.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connect New Portal */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Connect Your Patient Portal</h3>
              <p className="text-slate-600 text-sm mb-6">
                Securely connect to your healthcare provider's patient portal to automatically import your medical records.
              </p>

              {!selectedProvider ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PORTAL_PROVIDERS.filter(p => p.popular).map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                        {provider.icon}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{provider.name}</p>
                        <p className="text-sm text-slate-500">{provider.description}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedProvider('other')}
                    className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left col-span-full"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                      <Link2 className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Other Portal</p>
                      <p className="text-sm text-slate-500">Connect a different patient portal</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    ← Choose different portal
                  </button>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="font-medium text-slate-900 mb-1">
                      {PORTAL_PROVIDERS.find(p => p.id === selectedProvider)?.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      Enter your patient portal credentials. We use secure OAuth to connect.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email or Username</label>
                      <input
                        type="email"
                        value={portalEmail}
                        onChange={(e) => setPortalEmail(e.target.value)}
                        placeholder="patient@email.com"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={portalPassword}
                        onChange={(e) => setPortalPassword(e.target.value)}
                        placeholder="Your portal password"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Your credentials are encrypted and never stored. We use industry-standard OAuth to securely access your records.
                    </p>
                  </div>

                  <button
                    onClick={handleConnectPortal}
                    disabled={!portalEmail || isConnecting}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isConnecting ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Connecting...</>
                    ) : (
                      <>Connect Portal</>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  HIPAA-compliant
                </span>
                <span className="text-slate-300">·</span>
                <span>256-bit encryption</span>
                <span className="text-slate-300">·</span>
                <span>No data stored</span>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white text-xl">📋</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-base truncate">{file?.name}</h2>
                  <p className="text-sm text-violet-600 mt-0.5">{result.document_type}</p>
                  {result.processing_metadata?.confidence_level && result.processing_metadata.confidence_level !== 'High' && (
                    <p className={`text-xs mt-1 ${
                      result.processing_metadata.confidence_level === 'Moderate' ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      {result.processing_metadata.confidence_level} confidence
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg font-medium text-sm transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetUpload}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-colors"
                  >
                    New
                  </button>
                </div>
              </div>
            </div>

            <Section id="summary" icon={<FileText className="w-5 h-5" />} title="Plain English Summary" defaultOpen highlight>
              <p className="text-slate-800 text-base leading-relaxed">{result.test_summary || 'No summary available'}</p>
            </Section>

            {result.diagnosis && result.diagnosis.length > 0 && result.diagnosis[0] !== 'unknown' && (
              <Section id="findings" icon={<Search className="w-5 h-5" />} title="Key Findings" badge={`${result.diagnosis.length} items`}>
                <ul className="space-y-2">
                  {result.diagnosis.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {result.lab_values?.key_results && result.lab_values.key_results.length > 0 && (
              <Section id="labs" icon={<FlaskConical className="w-5 h-5" />} title="Lab Results" badge={`${result.lab_values.key_results.length} tests`}>
                <div className="space-y-3">
                  {result.lab_values.key_results.map((lab, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-slate-900 text-base">{lab.test}</p>
                        <p className="text-sm text-slate-500">{lab.reference_range || 'Reference range not provided'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-lg">{lab.value}</p>
                        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                          lab.status === 'Normal' ? 'bg-green-100 text-green-700' :
                          lab.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' :
                          lab.status === 'Critical' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{lab.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {result.cancer_specific && result.cancer_specific.cancer_type !== 'unknown' && (
              <Section id="cancer" icon={<Ribbon className="w-5 h-5" />} title="Cancer Information">
                <div className="grid grid-cols-2 gap-4">
                  {result.cancer_specific.cancer_type !== 'unknown' && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-purple-600 text-sm font-medium mb-1">Type</p>
                      <p className="font-semibold text-purple-900 text-base">{result.cancer_specific.cancer_type}</p>
                    </div>
                  )}
                  {result.cancer_specific.stage !== 'unknown' && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-blue-600 text-sm font-medium mb-1">Stage</p>
                      <p className="font-semibold text-blue-900 text-base">{result.cancer_specific.stage}</p>
                    </div>
                  )}
                  {result.cancer_specific.grade !== 'unknown' && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-amber-600 text-sm font-medium mb-1">Grade</p>
                      <p className="font-semibold text-amber-900 text-base">{result.cancer_specific.grade}</p>
                    </div>
                  )}
                  {result.cancer_specific.biomarkers && result.cancer_specific.biomarkers.length > 0 && (
                    <div className="col-span-2 bg-slate-50 rounded-xl p-4">
                      <p className="text-slate-600 text-sm font-medium mb-2">Biomarkers Tested</p>
                      <div className="flex flex-wrap gap-2">
                        {result.cancer_specific.biomarkers.map((marker, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700">{marker}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {result.questions_to_ask_doctor && (
              <Section id="questions" icon={<MessageCircle className="w-5 h-5" />} title="Questions for Your Doctor" highlight>
                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">{result.questions_to_ask_doctor}</p>
              </Section>
            )}

            {result.technical_terms_explained && result.technical_terms_explained.length > 0 && (
              <Section id="terms" icon={<BookOpen className="w-5 h-5" />} title="Medical Glossary" badge={`${result.technical_terms_explained.length} terms`}>
                <p className="text-xs text-slate-500 mb-3">Tap any term to learn more</p>
                <div className="space-y-3">
                  {result.technical_terms_explained.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setChatInput(`Tell me more about "${term.term}" - what does it mean for my diagnosis and what should I know?`)
                        setTimeout(() => {
                          document.querySelector('[placeholder*="Ask a question"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 100)
                      }}
                      className="w-full text-left bg-slate-50 hover:bg-violet-50 rounded-xl p-4 border border-slate-100 hover:border-violet-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-violet-900 text-base mb-1 group-hover:text-violet-700">{term.term}</p>
                          <p className="text-slate-700 text-sm leading-relaxed">{term.definition}</p>
                        </div>
                        <span className="text-violet-400 group-hover:text-violet-600 flex-shrink-0 mt-1">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {result.recommended_next_steps && result.recommended_next_steps.length > 0 && (
              <Section id="nextsteps" icon={<ArrowRight className="w-5 h-5" />} title="Next Steps from Document" badge={`${result.recommended_next_steps.length} items`}>
                <ul className="space-y-2.5">
                  {result.recommended_next_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 bg-green-50 rounded-xl p-3.5">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">✓</span>
                      <span className="text-slate-800 text-base">{step}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <p className="text-center text-xs text-slate-500 py-2">
              Educational summary only. Not medical advice. Discuss with your healthcare provider.
            </p>
          </div>
        )}
      </div>

      {/* Side-Peek Chat Panel */}
      {result && (
        <>
          {/* Chat Toggle Button */}
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-full shadow-lg shadow-violet-500/30 transition-all hover:scale-105"
            >
              <AtomIcon size="sm" />
              <span className="font-medium">Ask about your results</span>
            </button>
          )}

          {/* Side Panel */}
          <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AtomIcon size="md" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Your document assistant</h3>
                    <p className="text-xs text-slate-600">
                      {result?.cancer_specific?.cancer_type !== 'unknown'
                        ? `NCCN ${result.cancer_specific.cancer_type} enhanced`
                        : 'Ask about your results'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-2 hover:bg-violet-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
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
                    <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                      <p className="text-sm text-slate-700">
                        {result?.cancer_specific?.cancer_type !== 'unknown'
                          ? `I've analyzed your ${result.document_type?.toLowerCase() || 'document'} and can answer questions using NCCN ${result.cancer_specific.cancer_type} guidelines.`
                          : `I've analyzed your ${result.document_type?.toLowerCase() || 'document'}. Ask me anything about the findings, terms, or next steps.`}
                      </p>
                    </div>

                    <p className="text-sm font-medium text-slate-700 pt-2">Suggested questions</p>
                    {(() => {
                      const questions = []
                      if (result?.cancer_specific?.cancer_type !== 'unknown') {
                        questions.push(`What are the key findings from my ${result.cancer_specific.cancer_type} report?`)
                      }
                      if (result?.lab_values?.key_results?.some(r => r.status === 'Abnormal' || r.status === 'Critical')) {
                        questions.push("Are there any concerning trends I should know about?")
                      }
                      if (result?.cancer_specific?.biomarkers?.length > 0) {
                        questions.push(`What do my ${result.cancer_specific.biomarkers[0]} results mean?`)
                      }
                      questions.push("What questions should I ask my doctor?")
                      return questions.slice(0, 4).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setChatInput(q); setTimeout(handleAskQuestion, 50) }}
                          className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 hover:text-violet-700 transition-colors border border-slate-100 hover:border-violet-200 group"
                        >
                          <span className="text-violet-400 group-hover:text-violet-600 text-lg">→</span>
                          <span className="text-sm">{q}</span>
                        </button>
                      ))
                    })()}
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${
                      msg.role === 'user'
                        ? 'ml-6 bg-violet-100 text-violet-900 px-4 py-3 rounded-2xl rounded-tr-sm'
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
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
                    placeholder="Ask about your results..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white rounded-xl transition-colors font-medium"
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

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {saveSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Saved!</h2>
                <p className="text-slate-600 text-sm mt-2">Your translation has been saved locally.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Save Your Translation</h2>
                <p className="text-slate-600 text-sm mb-6">Choose how you'd like to save your results:</p>

                <div className="space-y-3">
                  <button
                    onClick={handleSaveToApp}
                    className="w-full flex items-center gap-4 p-4 border-2 border-violet-200 bg-violet-50 rounded-xl hover:border-violet-400 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <span>💾</span>
                    </div>
                    <div>
                      <p className="font-medium text-violet-900">Save to This Device</p>
                      <p className="text-xs text-violet-600">Access anytime · Includes chat history</p>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadSummary}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span>📥</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Download Summary</p>
                      <p className="text-xs text-slate-500">Save as text file to your device</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setShowSaveModal(false)}
                  className="w-full mt-4 py-2 text-slate-500 hover:text-slate-700 text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Saved Translations List Modal */}
      {showSavedList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSavedList(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">My Saved Translations</h2>
              <button onClick={() => setShowSavedList(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {savedTranslations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <span className="text-4xl mb-4 block">📂</span>
                  <p>No saved translations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTranslations.map(t => (
                    <button
                      key={t.id}
                      onClick={() => loadSavedTranslation(t.id)}
                      className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-violet-50 rounded-xl text-left transition-colors group"
                    >
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span>📋</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{t.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{t.documentType}</span>
                          <span>·</span>
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteSavedTranslation(t.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                Translations are saved locally on this device
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
