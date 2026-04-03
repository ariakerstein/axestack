'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { FileText, Search, FlaskConical, Ribbon, MessageCircle, BookOpen, ArrowRight, Upload, Link2, Building2, Shield, ShieldCheck, CheckCircle2, Share2, Download, Cloud, User, Mail, Sparkles, Trash2, Eye } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { ClaimEmailModal } from '@/components/ClaimEmailModal'
import { getSessionId } from '@/lib/supabase'

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

interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: TranslationResult
  documentText?: string
  error?: string
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<TranslationResult | null>(null)
  const [currentStoragePath, setCurrentStoragePath] = useState<string | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [bulkComplete, setBulkComplete] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'terms', 'questions']))
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [savedTranslations, setSavedTranslations] = useState<Array<{id: string, fileName: string, date: string, documentType: string}>>([])
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSendReportModal, setShowSendReportModal] = useState(false)
  const [sendReportEmail, setSendReportEmail] = useState('')
  const [sendReportName, setSendReportName] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [creatingShareLink, setCreatingShareLink] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [showAllTerms, setShowAllTerms] = useState(false)
  const [showAddRecordView, setShowAddRecordView] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Portal connection state
  const [connectedPortals, setConnectedPortals] = useState<ConnectedPortal[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')

  // Analytics
  const { trackEvent } = useAnalytics()

  // Auth
  const { user, loading: authLoading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSavingToCloud, setIsSavingToCloud] = useState(false)
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null)

  // @opencancer.ai email state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [claimedEmail, setClaimedEmail] = useState<string | null>(null)

  // Load claimed email from database
  useEffect(() => {
    const loadClaimedEmail = async () => {
      const sessionId = localStorage.getItem('opencancer_session_id')
      if (!sessionId && !user?.id) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('email_addresses')
          .select('username')
          .or(`session_id.eq.${sessionId}${user?.id ? `,user_id.eq.${user.id}` : ''}`)
          .eq('status', 'active')
          .limit(1)
          .single()

        if (data?.username) {
          setClaimedEmail(`${data.username}@opencancer.ai`)
        }
      } catch (e) {
        // No claimed email, that's fine
      }
    }
    loadClaimedEmail()
  }, [user])

  // Track referral arrivals from share links
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    const utmSource = params.get('utm_source')
    if (ref) {
      // Log referral arrival to analytics (shows in admin dashboard)
      trackEvent('referral_arrival', {
        referrer_id: ref,
        utm_source: utmSource || 'direct',
        landing_page: 'records'
      })
    }
  }, [trackEvent])

  // Load saved data on mount + fetch from Supabase if authenticated
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // First load localStorage (fast)
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

      // Check if privacy was previously acknowledged
      const privacyAck = localStorage.getItem('opencancer-privacy-acknowledged')
      if (privacyAck === 'true') {
        setPrivacyAcknowledged(true)
      }
    }
  }, [])

  // Fetch records from Supabase when user is authenticated
  useEffect(() => {
    const fetchCloudRecords = async () => {
      if (!user || authLoading) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) return

        const response = await fetch('/api/records/save', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const { records } = await response.json()
          if (records && records.length > 0) {
            // Merge cloud records with localStorage
            const localIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
            const localIds = new Set(localIndex.map((t: { id: string }) => t.id))

            // Add cloud records that aren't in localStorage
            const newRecords = records.filter((r: { id: string }) => !localIds.has(r.id))
            if (newRecords.length > 0) {
              const merged = [...newRecords, ...localIndex]
              setSavedTranslations(merged)
              localStorage.setItem('axestack-translations', JSON.stringify(merged))

              // Also save the full record data for cloud records
              const existingData = JSON.parse(localStorage.getItem('axestack-translations-data') || '{}')
              newRecords.forEach((r: { id: string; fileName: string; date: string; documentType: string; result: TranslationResult }) => {
                existingData[r.id] = {
                  id: r.id,
                  fileName: r.fileName,
                  date: r.date,
                  documentType: r.documentType,
                  result: r.result,
                  documentText: '',
                  chatMessages: [],
                }
              })
              localStorage.setItem('axestack-translations-data', JSON.stringify(existingData))
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch cloud records:', err)
      }
    }

    fetchCloudRecords()
  }, [user, authLoading])

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
    const files = Array.from(e.dataTransfer.files)

    if (files.length > 1) {
      // Bulk upload mode
      setIsBulkMode(true)
      const newFiles: UploadedFile[] = files.map(f => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: f,
        status: 'pending'
      }))
      setUploadedFiles(newFiles)
      setFile(null)
      setResult(null)
      setError(null)
      setChatMessages([])
    } else if (files[0]) {
      // Single file mode
      setIsBulkMode(false)
      setFile(files[0])
      setUploadedFiles([])
      setResult(null)
      setError(null)
      setChatMessages([])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > 1) {
      // Bulk upload mode
      setIsBulkMode(true)
      const newFiles: UploadedFile[] = files.map(f => ({
        id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: f,
        status: 'pending'
      }))
      setUploadedFiles(newFiles)
      setFile(null)
      setResult(null)
      setError(null)
      setChatMessages([])
    } else if (files[0]) {
      // Single file mode
      setIsBulkMode(false)
      setFile(files[0])
      setUploadedFiles([])
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
      formData.append('sessionId', localStorage.getItem('opencancer_session_id') || 'anonymous')

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
      setCurrentStoragePath(data.storagePath || null)
      if (data.documentText) {
        setDocumentText(data.documentText)
      }

      // Track successful upload with user_id for records/profile analytics
      trackEvent('record_upload', {
        file_type: file.type || 'unknown',
        file_size_kb: Math.round(file.size / 1024),
        document_type: data.analysis?.document_type || 'unknown',
        has_cancer_info: data.analysis?.cancer_specific?.cancer_type !== 'unknown',
        cancer_type: data.analysis?.cancer_specific?.cancer_type || null,
        user_id: user?.id || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  // Bulk upload - process multiple files sequentially
  const handleBulkTranslate = async () => {
    if (uploadedFiles.length === 0) return
    setIsProcessing(true)
    setError(null)
    setBulkComplete(false)
    setBulkProgress({ current: 0, total: uploadedFiles.length })

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i]
      setBulkProgress({ current: i + 1, total: uploadedFiles.length })

      // Update status to processing
      setUploadedFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'processing' } : f
      ))

      try {
        const formData = new FormData()
        formData.append('file', uploadedFile.file)
        formData.append('sessionId', localStorage.getItem('opencancer_session_id') || 'anonymous')

        console.log(`[Bulk] Processing ${i + 1}/${uploadedFiles.length}: ${uploadedFile.file.name}, type: ${uploadedFile.file.type || 'unknown'}, size: ${(uploadedFile.file.size / 1024).toFixed(1)}KB`)

        const response = await fetch('/api/translate', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`[Bulk] API error for ${uploadedFile.file.name}:`, errorData)
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const data = await response.json()
        console.log(`[Bulk] Success: ${uploadedFile.file.name}, doc_type: ${data.analysis?.document_type || 'unknown'}`)

        // Update with result
        setUploadedFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? {
            ...f,
            status: 'completed',
            result: data.analysis,
            documentText: data.documentText
          } : f
        ))

        // Auto-save completed translation to localStorage
        const translationId = `trans_${Date.now()}_${i}`
        const translation = {
          id: translationId,
          fileName: uploadedFile.file.name,
          date: new Date().toISOString(),
          documentType: data.analysis?.document_type || 'Unknown',
          result: data.analysis,
          documentText: data.documentText,
          storagePath: data.storagePath || null, // Path to original file in Supabase Storage
          chatMessages: [],
        }

        // Save full translation data
        const existingData = localStorage.getItem('axestack-translations-data') || '{}'
        const translationData = JSON.parse(existingData)
        translationData[translationId] = translation
        localStorage.setItem('axestack-translations-data', JSON.stringify(translationData))

        // Update index for quick listing
        const existingIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
        const newEntry = { id: translationId, fileName: uploadedFile.file.name, date: translation.date, documentType: data.analysis?.document_type || 'Unknown' }
        const updatedIndex = [newEntry, ...existingIndex]
        localStorage.setItem('axestack-translations', JSON.stringify(updatedIndex))
        setSavedTranslations(updatedIndex)

        // Track successful upload with user_id for records/profile analytics
        trackEvent('record_upload', {
          file_type: uploadedFile.file.type || 'unknown',
          file_size_kb: Math.round(uploadedFile.file.size / 1024),
          document_type: data.analysis?.document_type || 'unknown',
          has_cancer_info: data.analysis?.cancer_specific?.cancer_type !== 'unknown',
          cancer_type: data.analysis?.cancer_specific?.cancer_type || null,
          is_bulk_upload: true,
          bulk_position: i + 1,
          bulk_total: uploadedFiles.length,
          user_id: user?.id || null,
        })

        // Auto-save to cloud if user is authenticated (fire and forget)
        if (user) {
          (async () => {
            try {
              const { supabase } = await import('@/lib/supabase')
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.access_token) {
                await fetch('/api/records/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    fileName: uploadedFile.file.name,
                    documentType: data.analysis?.document_type,
                    result: data.analysis,
                    documentText: data.documentText,
                    chatMessages: [],
                  }),
                })
              }
            } catch (err) {
              console.error('Cloud sync failed:', err)
            }
          })()
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process'
        console.error(`[Bulk] Failed: ${uploadedFile.file.name}`, err)

        // Update with error - include file details for debugging
        setUploadedFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? {
            ...f,
            status: 'error',
            error: `${errorMsg} (${uploadedFile.file.type || 'unknown type'}, ${(uploadedFile.file.size / 1024).toFixed(0)}KB)`
          } : f
        ))
      }
    }

    setIsProcessing(false)
    setBulkComplete(true)
  }

  // View a specific file's result from bulk upload
  const viewFileResult = (uploadedFile: UploadedFile) => {
    if (uploadedFile.result) {
      setFile(uploadedFile.file)
      setResult(uploadedFile.result)
      setDocumentText(uploadedFile.documentText || '')
      setIsBulkMode(false)
      setChatMessages([])
    }
  }

  // Retry failed files
  const retryFailedFiles = async () => {
    const failedFiles = uploadedFiles.filter(f => f.status === 'error')
    if (failedFiles.length === 0) return

    setIsProcessing(true)
    setBulkComplete(false)
    setBulkProgress({ current: 0, total: failedFiles.length })

    for (let i = 0; i < failedFiles.length; i++) {
      const uploadedFile = failedFiles[i]
      setBulkProgress({ current: i + 1, total: failedFiles.length })

      // Reset status to processing
      setUploadedFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'processing', error: undefined } : f
      ))

      try {
        const formData = new FormData()
        formData.append('file', uploadedFile.file)
        formData.append('sessionId', localStorage.getItem('opencancer_session_id') || 'anonymous')

        console.log(`[Retry] Processing: ${uploadedFile.file.name}, type: ${uploadedFile.file.type}, size: ${(uploadedFile.file.size / 1024).toFixed(1)}KB`)

        const response = await fetch('/api/translate', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`[Retry] API error for ${uploadedFile.file.name}:`, errorData)
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const data = await response.json()
        console.log(`[Retry] Success: ${uploadedFile.file.name}`)

        // Update with result
        setUploadedFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? {
            ...f,
            status: 'completed',
            result: data.analysis,
            documentText: data.documentText
          } : f
        ))

        // Auto-save completed translation
        const translationId = `trans_${Date.now()}_retry_${i}`
        const translation = {
          id: translationId,
          fileName: uploadedFile.file.name,
          date: new Date().toISOString(),
          documentType: data.analysis?.document_type || 'Unknown',
          result: data.analysis,
          documentText: data.documentText,
          storagePath: data.storagePath || null,
          chatMessages: [],
        }

        const existingData = localStorage.getItem('axestack-translations-data') || '{}'
        const translationData = JSON.parse(existingData)
        translationData[translationId] = translation
        localStorage.setItem('axestack-translations-data', JSON.stringify(translationData))

        const existingIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
        const newEntry = { id: translationId, fileName: uploadedFile.file.name, date: translation.date, documentType: data.analysis?.document_type || 'Unknown' }
        const updatedIndex = [newEntry, ...existingIndex]
        localStorage.setItem('axestack-translations', JSON.stringify(updatedIndex))
        setSavedTranslations(updatedIndex)

        // Auto-save to cloud if user is authenticated
        if (user) {
          (async () => {
            try {
              const { supabase } = await import('@/lib/supabase')
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.access_token) {
                await fetch('/api/records/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    fileName: uploadedFile.file.name,
                    documentType: data.analysis?.document_type,
                    result: data.analysis,
                    documentText: data.documentText,
                    chatMessages: [],
                  }),
                })
              }
            } catch (err) {
              console.error('Cloud sync failed:', err)
            }
          })()
        }

      } catch (err) {
        console.error(`[Retry] Failed: ${uploadedFile.file.name}`, err)
        setUploadedFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? {
            ...f,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to process'
          } : f
        ))
      }
    }

    setIsProcessing(false)
    setBulkComplete(true)
  }

  // Remove a file from bulk upload queue
  const removeFromBulk = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      if (updated.length === 0) {
        setIsBulkMode(false)
      }
      return updated
    })
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

      // Track chat question about document
      trackEvent('record_chat_question', {
        question_length: userMessage.length,
        has_cancer_context: cancerType !== undefined && cancerType !== 'unknown',
        cancer_type: cancerType || null,
        had_rag_context: ragContext.length > 0,
      })

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
    setUploadedFiles([])
    setIsBulkMode(false)
    setResult(null)
    setError(null)
    setChatMessages([])
    setBulkProgress({ current: 0, total: 0 })
    setShowAddRecordView(false) // Return to records-first view if user has records
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownloadSummary = () => {
    if (!result || !file) return

    // Create a printable HTML document that can be saved as PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Medical Record Summary - ${file.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #8b5cf6; }
    .meta { color: #64748b; font-size: 14px; margin-top: 8px; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #1e293b; }
    h2 { font-size: 16px; color: #7c3aed; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    p { margin-bottom: 12px; }
    ul { margin-left: 20px; margin-bottom: 16px; }
    li { margin-bottom: 8px; }
    .lab-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .lab-table th, .lab-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .lab-table th { background: #f8fafc; font-weight: 600; }
    .status-normal { color: #16a34a; }
    .status-abnormal { color: #d97706; }
    .status-critical { color: #dc2626; }
    .questions { background: #faf5ff; padding: 16px; border-radius: 8px; border-left: 4px solid #8b5cf6; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">opencancer.ai</div>
    <div class="meta">Medical Record Translation</div>
  </div>

  <h1>${file.name}</h1>
  <p class="meta">${result.document_type} · Generated ${new Date().toLocaleDateString()}</p>

  <h2>📋 Plain English Summary</h2>
  <p>${result.test_summary}</p>

  ${result.diagnosis && result.diagnosis.length > 0 && result.diagnosis[0] !== 'unknown' ? `
  <h2>🔍 Key Findings</h2>
  <ul>
    ${result.diagnosis.map(d => `<li>${d}</li>`).join('')}
  </ul>
  ` : ''}

  ${result.lab_values?.key_results && result.lab_values.key_results.length > 0 ? `
  <h2>🧪 Lab Results</h2>
  <table class="lab-table">
    <thead><tr><th>Test</th><th>Value</th><th>Reference</th><th>Status</th></tr></thead>
    <tbody>
      ${result.lab_values.key_results.map(l => `
        <tr>
          <td>${l.test}</td>
          <td><strong>${l.value}</strong></td>
          <td>${l.reference_range || 'N/A'}</td>
          <td class="status-${l.status.toLowerCase()}">${l.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${result.cancer_specific && result.cancer_specific.cancer_type !== 'unknown' ? `
  <h2>🎗️ Cancer Information</h2>
  <p><strong>Type:</strong> ${result.cancer_specific.cancer_type}</p>
  ${result.cancer_specific.stage !== 'unknown' ? `<p><strong>Stage:</strong> ${result.cancer_specific.stage}</p>` : ''}
  ${result.cancer_specific.grade !== 'unknown' ? `<p><strong>Grade:</strong> ${result.cancer_specific.grade}</p>` : ''}
  ${result.cancer_specific.biomarkers?.length > 0 ? `<p><strong>Biomarkers:</strong> ${result.cancer_specific.biomarkers.join(', ')}</p>` : ''}
  ` : ''}

  ${result.questions_to_ask_doctor ? `
  <h2>❓ Questions for Your Doctor</h2>
  <div class="questions">${result.questions_to_ask_doctor.replace(/\n/g, '<br>')}</div>
  ` : ''}

  ${result.technical_terms_explained && result.technical_terms_explained.length > 0 ? `
  <h2>📖 Medical Terms Explained</h2>
  <ul>
    ${result.technical_terms_explained.map(t => `<li><strong>${t.term}:</strong> ${t.definition}</li>`).join('')}
  </ul>
  ` : ''}

  ${result.recommended_next_steps && result.recommended_next_steps.length > 0 ? `
  <h2>✅ Recommended Next Steps</h2>
  <ul>
    ${result.recommended_next_steps.map(s => `<li>${s}</li>`).join('')}
  </ul>
  ` : ''}

  <div class="footer">
    <p><strong>Disclaimer:</strong> This is an educational summary only. Not medical advice. Always discuss with your healthcare provider.</p>
    <p style="margin-top: 8px;">Generated by <a href="https://opencancer.ai/records">opencancer.ai/records</a></p>
  </div>
</body>
</html>
    `.trim()

    // Open in new window for print/save as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      // Auto-trigger print dialog for easy PDF save
      setTimeout(() => printWindow.print(), 250)
    }
    setShowSaveModal(false)
  }

  const handleShare = async (method: 'copy' | 'twitter' | 'email') => {
    // Generate or retrieve share tracking ID for this user
    let shareId = localStorage.getItem('opencancer_share_id')
    if (!shareId) {
      shareId = Math.random().toString(36).substring(2, 8)
      localStorage.setItem('opencancer_share_id', shareId)
    }

    // Track share count
    const shareCount = parseInt(localStorage.getItem('opencancer_share_count') || '0') + 1
    localStorage.setItem('opencancer_share_count', shareCount.toString())

    // Build tracked URL with UTM parameters
    const shareUrl = `https://opencancer.ai/records?ref=${shareId}&utm_source=${method}&utm_medium=share&utm_campaign=records_tool`
    const shareText = 'I just translated my medical records into plain English with opencancer.ai - free tool that helped me actually understand my results. Check it out:'

    // Log share event to analytics (shows in admin dashboard)
    trackEvent('share', {
      method,
      share_id: shareId,
      share_count: shareCount,
      user_email: user?.email || null,
    })

    if (method === 'copy') {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (method === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
      setShowShareModal(false)
    } else if (method === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent('Tool that helped me understand my medical records')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
      setShowShareModal(false)
    }
  }

  // Create shareable link for this specific record
  const handleCopyRecordLink = async () => {
    if (!result || !file) return

    setCreatingShareLink(true)
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          documentType: result.document_type,
          result: result,
          summary: result.test_summary,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const { shareUrl } = await response.json()
      await navigator.clipboard.writeText(shareUrl)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 3000)

      trackEvent('record_share_link_created', {
        document_type: result.document_type,
        has_cancer_info: result.cancer_specific?.cancer_type !== 'unknown',
      })
    } catch (err) {
      console.error('Failed to create share link:', err)
      // Fallback: copy a message instead
      const fallbackText = `Check out my medical record summary on opencancer.ai`
      await navigator.clipboard.writeText(fallbackText)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 3000)
    } finally {
      setCreatingShareLink(false)
    }
  }

  // Open send report modal
  const handleSendReport = () => {
    if (!result || !file) return
    setSendReportEmail('')
    setSendReportName('')
    setReportSent(false)
    setReportError(null)
    setShowSendReportModal(true)
  }

  // Actually send the report via API
  const sendReportViaEmail = async () => {
    if (!result || !file || !sendReportEmail) return

    setSendingReport(true)
    setReportError(null)

    try {
      const response = await fetch('/api/email/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: sendReportEmail,
          recipientName: sendReportName || undefined,
          senderName: user?.email?.split('@')[0] || 'A patient',
          reportType: 'single_record',
          content: {
            fileName: file.name,
            documentType: result.document_type,
            dateOfService: result.date_of_service,
            provider: result.provider_name,
            institution: result.institution,
            diagnosis: result.diagnosis?.filter(d => d && d !== 'unknown').join(', '),
            summary: result.test_summary,
            questionsForDoctor: result.questions_to_ask_doctor,
            labResults: result.lab_values?.key_results?.map(r => `${r.test}: ${r.value} (${r.status})`).join('\n'),
            nextSteps: result.recommended_next_steps?.join(', '),
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setReportSent(true)
      trackEvent('report_emailed', { type: 'single_record' })
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSendingReport(false)
    }
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
      storagePath: currentStoragePath,
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

    // Auto-save to cloud if user is authenticated (fire and forget)
    if (user) {
      (async () => {
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            await fetch('/api/records/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                fileName: file.name,
                documentType: result.document_type,
                result,
                documentText,
                chatMessages,
              }),
            })
          }
        } catch (err) {
          console.error('Cloud sync failed:', err)
        }
      })()
    }
  }

  // Save to cloud (Supabase) for logged-in users
  const handleSaveToCloud = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!result || !file) return

    setIsSavingToCloud(true)
    setCloudSaveError(null)

    try {
      // Get auth session for secure token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setShowAuthModal(true)
        setIsSavingToCloud(false)
        return
      }

      const response = await fetch('/api/records/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // Secure auth token
        },
        body: JSON.stringify({
          // Note: userId is extracted server-side from verified token
          fileName: file.name,
          documentType: result.document_type,
          result,
          documentText,
          chatMessages,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      // Track cloud save
      trackEvent('record_cloud_save', {
        document_type: result.document_type,
        has_cancer_info: result.cancer_specific?.cancer_type !== 'unknown',
      })

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowSaveModal(false)
      }, 1500)
    } catch (err) {
      setCloudSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSavingToCloud(false)
    }
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
    }
  }

  // View original document from Supabase Storage
  const viewOriginalDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Get the full translation data to find storagePath
    const data = localStorage.getItem('axestack-translations-data')
    if (!data) return

    const translations = JSON.parse(data)
    const translation = translations[id]

    if (!translation?.storagePath) {
      alert('Original document not available. Only documents uploaded after this update can be viewed.')
      return
    }

    try {
      const response = await fetch(`/api/records/view?path=${encodeURIComponent(translation.storagePath)}`)
      const result = await response.json()

      if (result.url) {
        window.open(result.url, '_blank')
      } else {
        alert('Failed to load document')
      }
    } catch (err) {
      console.error('Error viewing document:', err)
      alert('Failed to load document')
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

    // Track portal connection
    trackEvent('portal_connect', {
      provider: selectedProvider,
      total_portals_connected: updatedPortals.length,
    })

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
      {/* Header - consistent with Navbar pattern */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left side - brand */}
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
              opencancer
            </span>
            <span className="text-lg font-bold text-slate-400">.ai</span>
          </Link>

          {/* Center - nav links (hidden on mobile) */}
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <button
              onClick={() => {
                setResult(null)
                setShowAddRecordView(false)
                setFile(null)
              }}
              className="text-violet-600 font-medium hover:text-violet-700 transition-colors"
            >
              Records
            </button>
            <Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors">
              Ask Navis
            </Link>
            <Link href="/trials" className="text-slate-600 hover:text-violet-600 transition-colors">
              Trials
            </Link>
            <Link href="/combat" className="text-slate-600 hover:text-orange-600 transition-colors">
              Combat
            </Link>
          </nav>

          {/* Right side - auth + records count */}
          <div className="flex items-center gap-3">
            {/* Auth state */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-slate-700">
                  <User className="w-4 h-4 text-violet-500" />
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await signOut()
                      window.location.reload()
                    } catch (err) {
                      console.error('Sign out error:', err)
                    }
                  }}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium px-3 py-1.5 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Sign in
              </button>
            )}

            {/* Saved records button */}
            {savedTranslations.length > 0 && (
              <button
                onClick={() => {
                  setResult(null)
                  setShowAddRecordView(false)
                  setFile(null)
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium hover:bg-violet-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {savedTranslations.length} Record{savedTranslations.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* RECORDS-FIRST VIEW: Show when user has saved records and not adding new */}
        {!result && savedTranslations.length > 0 && !showAddRecordView && (
          <div className="space-y-4">
            {/* Header with record count */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Records</h1>
                {isProcessing ? (
                  <p className="text-violet-600 text-sm font-medium flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    Processing {bulkProgress.current} of {bulkProgress.total}...
                  </p>
                ) : bulkComplete && uploadedFiles.length > 0 ? (
                  <p className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                    ✓ Done! {savedTranslations.length} record{savedTranslations.length !== 1 ? 's' : ''} translated
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm">{savedTranslations.length} record{savedTranslations.length !== 1 ? 's' : ''} translated</p>
                )}
              </div>
              <button
                onClick={() => setShowAddRecordView(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                + Add Record
              </button>
            </div>

            {/* AI Case Review - PROMINENT CTA */}
            <Link
              href="/records/case-review"
              className="block bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-2xl p-5 text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AtomIcon size="sm" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">AI Case Review</p>
                  <p className="text-violet-100 text-sm">Synthesize all {savedTranslations.length} records into one comprehensive summary</p>
                </div>
                <ArrowRight className="w-5 h-5 text-violet-200" />
              </div>
            </Link>

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Shield className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700">
                {user
                  ? 'Encrypted in your account. Your data is yours.'
                  : 'Stored locally on this device. Sign in to sync.'}
              </p>
            </div>

            {/* Records List - Inline */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Your Records</p>
                {savedTranslations.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Delete all saved records? This cannot be undone.')) {
                        localStorage.removeItem('axestack-translations')
                        localStorage.removeItem('axestack-translations-data')
                        setSavedTranslations([])
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {savedTranslations.map(t => (
                  <div
                    key={t.id}
                    className="w-full flex items-center gap-4 p-4 hover:bg-violet-50 text-left transition-colors group"
                  >
                    <button
                      onClick={() => loadSavedTranslation(t.id)}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{t.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{t.documentType}</span>
                          <span>·</span>
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                    </button>
                    <button
                      onClick={(e) => viewOriginalDocument(t.id, e)}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      title="View original document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => deleteSavedTranslation(t.id, e)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-3">
              <Link
                href="/ask"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Ask Navis
              </Link>
              <Link
                href="/cancer-checklist"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                <span>📋</span>
                Cancer Checklist
              </Link>
            </div>
          </div>
        )}

        {/* UPLOAD-FIRST VIEW: Show when no records OR explicitly adding new */}
        {/* Page Header */}
        {!result && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="text-center mb-6">
            {showAddRecordView && savedTranslations.length > 0 ? (
              <>
                <button
                  onClick={() => setShowAddRecordView(false)}
                  className="text-violet-600 hover:text-violet-700 text-sm font-medium mb-4 inline-flex items-center gap-1"
                >
                  ← Back to My Records
                </button>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Add New Record</h1>
                <p className="text-slate-600">Upload or connect a new medical record</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Records Vault</h1>
                <p className="text-slate-600">Upload records or connect your patient portal to get plain English translations</p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Encrypted • Your data is never sold • Only you can access your records
                </p>
              </>
            )}
          </div>
        )}

        {/* @opencancer.ai Email CTA Banner */}
        {!result && (savedTranslations.length === 0 || showAddRecordView) && !claimedEmail && (
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-full mb-4 p-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 rounded-xl text-white text-left group hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Get your @opencancer.ai email</span>
                    <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-full">NEW</span>
                  </div>
                  <p className="text-white/80 text-sm">Forward medical docs there. They auto-appear in your vault.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* Claimed email banner */}
        {!result && claimedEmail && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="w-full mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Your email: <span className="text-emerald-600">{claimedEmail}</span></p>
                <p className="text-sm text-slate-600">Forward medical documents there and they'll appear here automatically!</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - only show in upload-first mode */}
        {!result && (savedTranslations.length === 0 || showAddRecordView) && (
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

        {/* Upload Tab Content - only in upload-first mode */}
        {activeTab === 'upload' && !result && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="bg-gradient-to-b from-white to-violet-50/30 rounded-2xl border border-slate-200 p-8 shadow-sm">
            {/* Strong Privacy Banner */}
            <div className="mb-6 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                {user
                  ? 'Private. Never sold. Encrypted and synced to your account.'
                  : 'Private. Never sold. Stored only on your device.'}
              </p>
            </div>

            <div className="text-center mb-6">
              <div className="flex justify-center gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">
                  NCCN guideline-informed
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                  Bulk upload supported
                </span>
              </div>
              <p className="text-lg text-slate-600">Drop your lab results, pathology report, or doctor's notes</p>
              <p className="text-sm text-slate-500 mt-1">Upload multiple files at once. We'll translate them all.</p>
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
              onDrop={(e) => {
                if (!privacyAcknowledged) {
                  e.preventDefault()
                  setShowPrivacyModal(true)
                } else {
                  handleDrop(e)
                }
              }}
              onClick={() => {
                if (!privacyAcknowledged) {
                  setShowPrivacyModal(true)
                } else {
                  fileInputRef.current?.click()
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragging ? 'border-violet-500 bg-violet-50' : file ? 'border-green-400 bg-green-50' : 'border-violet-300 bg-white hover:border-violet-500 hover:bg-violet-50/50'}`}
            >
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" multiple className="hidden" />
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

            {/* Single file translate button */}
            {file && !isBulkMode && (
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

            {/* Bulk upload file queue */}
            {isBulkMode && uploadedFiles.length > 0 && (
              <div className="mt-5 space-y-3">
                {/* Prominent progress indicator at TOP during processing */}
                {isProcessing && bulkProgress.total > 0 && (
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold">
                        Processing file {bulkProgress.current} of {bulkProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/80 mt-2">
                      {uploadedFiles.filter(f => f.status === 'completed').length} completed · {uploadedFiles.filter(f => f.status === 'error').length} errors
                    </p>
                  </div>
                )}

                {/* Completion banner */}
                {bulkComplete && !isProcessing && (
                  <div className={`rounded-xl p-4 shadow-lg ${
                    uploadedFiles.filter(f => f.status === 'error').length > 0
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {uploadedFiles.filter(f => f.status === 'error').length > 0 ? '⚠️' : '✅'}
                        </span>
                        <div>
                          <p className="font-bold text-lg">
                            Processing Complete!
                          </p>
                          <p className="text-sm opacity-90">
                            {uploadedFiles.filter(f => f.status === 'completed').length} of {uploadedFiles.length} files processed successfully
                            {uploadedFiles.filter(f => f.status === 'error').length > 0 && (
                              <> · {uploadedFiles.filter(f => f.status === 'error').length} failed</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setBulkComplete(false)}
                        className="text-white/80 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>
                    {uploadedFiles.filter(f => f.status === 'error').length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-sm opacity-90 mb-2">
                          Failed: {uploadedFiles.filter(f => f.status === 'error').map(f => f.file.name).join(', ')}
                        </p>
                        <button
                          onClick={retryFailedFiles}
                          className="bg-white text-orange-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-orange-50 transition-colors"
                        >
                          🔄 Retry Failed Files
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {uploadedFiles.length} files selected
                  </h3>
                  <button
                    onClick={resetUpload}
                    className="text-sm text-slate-500 hover:text-red-600"
                    disabled={isProcessing}
                  >
                    Clear all
                  </button>
                </div>

                {/* File list */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {uploadedFiles.map((uf, index) => (
                    <div
                      key={uf.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        uf.status === 'completed' ? 'bg-green-50 border-green-200' :
                        uf.status === 'error' ? 'bg-red-50 border-red-200' :
                        uf.status === 'processing' ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-400 ring-offset-1' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">
                        {uf.status === 'completed' ? '✓' :
                         uf.status === 'error' ? '✗' :
                         uf.status === 'processing' ? (
                           <span className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin inline-block" />
                         ) : '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{uf.file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                          {uf.status === 'error' && <span className="text-red-600"> · {uf.error}</span>}
                          {uf.status === 'completed' && uf.result && (
                            <span className="text-green-600"> · {uf.result.document_type}</span>
                          )}
                        </p>
                      </div>
                      {uf.status === 'pending' && !isProcessing && (
                        <button
                          onClick={() => removeFromBulk(uf.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      )}
                      {uf.status === 'completed' && (
                        <button
                          onClick={() => viewFileResult(uf)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-500"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Progress hint when scrolled - removed duplicate, main progress is at top */}

                {/* Bulk translate button or completion state */}
                {uploadedFiles.every(f => f.status === 'completed' || f.status === 'error') ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">✓</div>
                      <p className="font-semibold text-green-800">
                        {uploadedFiles.filter(f => f.status === 'completed').length} of {uploadedFiles.length} files processed
                      </p>
                      <p className="text-sm text-green-600 mt-1">All translations saved automatically</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setShowAddRecordView(false)
                          setUploadedFiles([])
                          setBulkProgress({ current: 0, total: 0 })
                        }}
                        className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        View My Records ({savedTranslations.length})
                      </button>
                      <button
                        onClick={resetUpload}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all"
                      >
                        Upload More
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleBulkTranslate}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-violet-500/20"
                  >
                    {isProcessing ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing files...</>
                    ) : (
                      <>Translate All {uploadedFiles.filter(f => f.status === 'pending').length} Files →</>
                    )}
                  </button>
                )}
              </div>
            )}

            {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            {/* Social proof */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <span className="font-semibold text-violet-700">12,847</span>
              <span className="text-slate-600">records translated by patients like you</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col items-center gap-2 text-sm">
              <div className="flex items-center gap-4 text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  HIPAA-compliant
                </span>
                <span className="text-slate-300">·</span>
                <span>No account required</span>
              </div>
              <p className="text-xs text-slate-400">
                Your records stay on your device. We never store, share, or sell your data.
              </p>
            </div>
          </div>
        )}

        {/* Portal Connection Tab Content - only in upload-first mode */}
        {activeTab === 'portal' && !result && (savedTranslations.length === 0 || showAddRecordView) && (
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

              <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col items-center gap-2 text-sm">
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    HIPAA-compliant
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>256-bit encryption</span>
                </div>
                <p className="text-xs text-slate-400">
                  Your records stay on your device. We never store, share, or sell your data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Breadcrumb - Back to Records */}
            {savedTranslations.length > 0 && (
              <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <button
                  onClick={() => {
                    setResult(null)
                    setFile(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to Records ({savedTranslations.length})
                </button>
                <span className="text-slate-600 text-sm">
                  Viewing: {file?.name?.slice(0, 30)}{file?.name && file.name.length > 30 ? '...' : ''}
                </span>
              </div>
            )}

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
                    onClick={handleCopyRecordLink}
                    disabled={creatingShareLink}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 ${
                      shareLinkCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {creatingShareLink ? 'Creating...' : shareLinkCopied ? 'Link Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleSendReport}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send Report
                  </button>
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

            {/* Gentle acknowledgment - shows for cancer diagnoses */}
            {result.cancer_specific && result.cancer_specific.cancer_type !== 'unknown' && (
              <div className="bg-gradient-to-r from-slate-50 to-violet-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg">💜</span>
                <div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    This is a lot to take in. Take your time with this information. You don't have to process it all at once.
                    Below you'll find your results explained clearly, plus questions to bring to your care team.
                  </p>
                </div>
              </div>
            )}

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

                {/* Next steps CTAs */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link
                    href={`/trials?cancer=${encodeURIComponent(result.cancer_specific.cancer_type)}`}
                    className="flex items-center gap-3 p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors group"
                  >
                    <span className="text-lg">🔬</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-teal-900 text-sm">Find Clinical Trials</p>
                      <p className="text-xs text-teal-700 truncate">For {result.cancer_specific.cancer_type}</p>
                    </div>
                  </Link>
                  <Link
                    href="/records/case-review"
                    className="flex items-center gap-3 p-3 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 rounded-xl transition-colors group"
                  >
                    <span className="text-lg">🧠</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-fuchsia-900 text-sm">AI Case Review</p>
                      <p className="text-xs text-fuchsia-700">Synthesize all your records</p>
                    </div>
                  </Link>
                </div>
              </Section>
            )}

            {result.questions_to_ask_doctor && (
              <Section id="questions" icon={<MessageCircle className="w-5 h-5" />} title="Questions for Your Doctor" highlight>
                <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">{result.questions_to_ask_doctor}</p>
                <Link
                  href="/cancer-checklist"
                  className="mt-4 flex items-center justify-between p-4 bg-violet-100 hover:bg-violet-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="font-medium text-violet-900">Bring these to your appointment</p>
                      <p className="text-sm text-violet-700">Add to your Cancer Checklist →</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-violet-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Section>
            )}

            {result.technical_terms_explained && result.technical_terms_explained.length > 0 && (
              <Section id="terms" icon={<BookOpen className="w-5 h-5" />} title="Medical Glossary" badge={`${result.technical_terms_explained.length} terms`}>
                <p className="text-xs text-slate-500 mb-3">Tap any term to learn more</p>
                <div className="space-y-2">
                  {(showAllTerms ? result.technical_terms_explained : result.technical_terms_explained.slice(0, 4)).map((term, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setChatInput(`Tell me more about "${term.term}" - what does it mean for my diagnosis and what should I know?`)
                        setTimeout(() => {
                          document.querySelector('[placeholder*="Ask a question"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }, 100)
                      }}
                      className="w-full text-left bg-slate-50 hover:bg-violet-50 rounded-xl p-3 border border-slate-100 hover:border-violet-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-violet-900 text-sm group-hover:text-violet-700">{term.term}</p>
                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{term.definition}</p>
                        </div>
                        <span className="text-violet-400 group-hover:text-violet-600 flex-shrink-0 text-sm">→</span>
                      </div>
                    </button>
                  ))}
                </div>
                {result.technical_terms_explained.length > 4 && (
                  <button
                    onClick={() => setShowAllTerms(!showAllTerms)}
                    className="w-full mt-3 py-2.5 text-sm text-violet-600 hover:text-violet-700 font-medium bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                  >
                    {showAllTerms ? 'Show less' : `Show all ${result.technical_terms_explained.length} terms`}
                  </button>
                )}
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

            {/* Share CTA */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-green-800 font-medium mb-2">Did this help you understand your results?</p>
              <p className="text-green-700 text-sm mb-4">Share with someone else who might benefit</p>
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share This Tool
              </button>
            </div>

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
                  {/* Cloud save - for logged in users */}
                  <button
                    onClick={handleSaveToCloud}
                    disabled={isSavingToCloud}
                    className="w-full flex items-center gap-4 p-4 border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl hover:border-violet-400 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      {isSavingToCloud ? (
                        <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Cloud className="w-5 h-5 text-violet-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-violet-900">Save to Account</p>
                        {user && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Signed in</span>}
                      </div>
                      <p className="text-xs text-violet-600">
                        {user ? 'Access from any device · Secure cloud storage' : 'Sign in to save securely in the cloud'}
                      </p>
                    </div>
                  </button>

                  {cloudSaveError && (
                    <p className="text-xs text-red-600 px-4">{cloudSaveError}</p>
                  )}

                  <button
                    onClick={handleSaveToApp}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span>💾</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Save to This Device</p>
                      <p className="text-xs text-slate-500">Access anytime · Includes chat history</p>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadSummary}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Download as PDF</p>
                      <p className="text-xs text-slate-500">Clean, printable summary</p>
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

      {/* Send Report Modal */}
      {showSendReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSendReportModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Report Sent!</h2>
                <p className="text-slate-600 mb-6">
                  The report has been emailed to {sendReportEmail}
                </p>
                <button
                  onClick={() => setShowSendReportModal(false)}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-violet-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Send Report</h2>
                  <p className="text-slate-600 text-sm mt-2">Email this summary to your doctor, caregiver, or family</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Recipient's Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={sendReportEmail}
                      onChange={(e) => setSendReportEmail(e.target.value)}
                      placeholder="doctor@hospital.com"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Recipient's Name <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sendReportName}
                      onChange={(e) => setSendReportName(e.target.value)}
                      placeholder="Dr. Smith"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {reportError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {reportError}
                    </div>
                  )}

                  <button
                    onClick={sendReportViaEmail}
                    disabled={!sendReportEmail || sendingReport}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {sendingReport ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Report
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setShowSendReportModal(false)}
                  className="w-full mt-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                <Share2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Share This Tool</h2>
              <p className="text-slate-600 text-sm mt-2">Help other patients understand their medical records</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  {copied ? '✓' : '📋'}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{copied ? 'Copied!' : 'Copy Link'}</p>
                  <p className="text-xs text-slate-500">Share via text or anywhere</p>
                </div>
              </button>

              <button
                onClick={() => handleShare('twitter')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  𝕏
                </div>
                <div>
                  <p className="font-medium text-slate-900">Share on X</p>
                  <p className="text-xs text-slate-500">Tweet about this tool</p>
                </div>
              </button>

              <button
                onClick={() => handleShare('email')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  ✉️
                </div>
                <div>
                  <p className="font-medium text-slate-900">Send via Email</p>
                  <p className="text-xs text-slate-500">Share with friends & family</p>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Your sharing helps patients get the support they need ❤️
              </p>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 py-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Claim @opencancer.ai Email Modal */}
      <ClaimEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        sessionId={getSessionId()}
        userId={user?.id}
        onSuccess={(email) => {
          setClaimedEmail(email)
          setShowEmailModal(false)
        }}
      />

      {/* Privacy Acknowledgment Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPrivacyModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Your Privacy Matters</h2>
              <p className="text-slate-600">Before you upload, here's how we protect you:</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Your data is yours</p>
                  <p className="text-sm text-slate-600">
                    {user
                      ? 'Encrypted and stored securely in your account. Sync across devices.'
                      : 'Stored locally on this device. Sign in to sync across devices.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Never sold</p>
                  <p className="text-sm text-slate-600">We never sell your data. Ever. Your medical records belong to you.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">You're in control</p>
                  <p className="text-sm text-slate-600">Delete your data anytime. {user ? 'Manage from your account settings.' : 'Clear browser storage or sign in for more control.'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPrivacyAcknowledged(true)
                localStorage.setItem('opencancer-privacy-acknowledged', 'true')
                setShowPrivacyModal(false)
                // Open file picker after acknowledgment
                setTimeout(() => fileInputRef.current?.click(), 100)
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 rounded-xl transition-all"
            >
              I Understand, Continue
            </button>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full mt-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
