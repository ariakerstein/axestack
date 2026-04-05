'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { FileText, Search, FlaskConical, Ribbon, MessageCircle, BookOpen, ArrowRight, Upload, Link2, Building2, Shield, ShieldCheck, CheckCircle2, Share2, Download, Cloud, User, Mail, Sparkles, Trash2, Eye, Inbox, Paperclip, RefreshCw, Pencil, Check, X } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { ClaimEmailModal } from '@/components/ClaimEmailModal'
import { EntityAnnotation } from '@/components/EntityAnnotation'
import { getSessionId } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

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

// Large file threshold - files over this are uploaded to storage first
const LARGE_FILE_THRESHOLD_MB = 4

// Helper to upload large files using signed URL (bypasses RLS via server endpoint)
async function uploadLargeFileToStorage(file: File, sessionId: string): Promise<string> {
  // Step 1: Get a signed upload URL from our API (uses service key)
  const signedUrlResponse = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      sessionId,
      contentType: file.type || 'application/octet-stream',
    }),
  })

  if (!signedUrlResponse.ok) {
    const error = await signedUrlResponse.json()
    console.error('Failed to get signed URL:', error)
    throw new Error('Failed to prepare upload. Please try again.')
  }

  const { signedUrl, storagePath } = await signedUrlResponse.json()

  // Step 2: Upload directly to storage using the signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    console.error('Storage upload failed:', uploadResponse.status, await uploadResponse.text())
    throw new Error('Failed to upload large file. Please try again.')
  }

  console.log(`Large file uploaded to storage: ${storagePath}`)
  return storagePath
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

// Received email interface
interface ReceivedEmail {
  id: string
  from_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  received_at: string
  processed: boolean
  attachments: {
    id: string
    filename: string
    content_type: string | null
    size_bytes: number | null
    storage_path: string | null
    processed: boolean
  }[]
}

export default function RecordsVaultPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'portal' | 'inbox'>('upload')

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
  const [savedTranslations, setSavedTranslations] = useState<Array<{id: string, fileName: string, date: string, documentType: string, notes?: string}>>([])
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [editMode, setEditMode] = useState<'label' | 'notes'>('label')
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
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  // @opencancer.ai email state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [claimedEmail, setClaimedEmail] = useState<string | null>(null)

  // Stats for social proof
  const [totalTranslations, setTotalTranslations] = useState(12847)

  // Inbox state
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null)
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null)

  // Load claimed email from database via API (bypasses RLS)
  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return

    const loadClaimedEmail = async () => {
      const sessionId = localStorage.getItem('opencancer_session_id')
      if (!sessionId && !user?.id) return

      try {
        const params = new URLSearchParams()
        if (sessionId) params.set('sessionId', sessionId)
        if (user?.id) params.set('userId', user.id)

        console.log('[Email Status] Checking with params:', { sessionId, userId: user?.id })

        const response = await fetch(`/api/email/status?${params}`)
        const data = await response.json()

        console.log('[Email Status] Response:', data)

        if (data.claimed && data.username) {
          setClaimedEmail(data.email)
          setEmailAddressId(data.emailAddressId)
          if (data.linked) {
            console.log('Email address linked to user account')
          }
        } else {
          // Clear state if no email claimed
          setClaimedEmail(null)
          setEmailAddressId(null)
        }
      } catch (e) {
        console.error('Failed to load claimed email:', e)
      }
    }
    loadClaimedEmail()
  }, [user, authLoading])

  // Fetch received emails when inbox tab is active
  const fetchReceivedEmails = useCallback(async () => {
    if (!emailAddressId) return

    setLoadingEmails(true)
    try {
      const res = await fetch(`/api/email/received?emailAddressId=${emailAddressId}`)
      const data = await res.json()
      if (data.emails) {
        setReceivedEmails(data.emails)
      }
    } catch (e) {
      console.error('Failed to fetch emails:', e)
    } finally {
      setLoadingEmails(false)
    }
  }, [emailAddressId])

  // Load emails when switching to inbox tab or when emailAddressId changes
  useEffect(() => {
    if (activeTab === 'inbox' && emailAddressId) {
      fetchReceivedEmails()
    }
  }, [activeTab, emailAddressId, fetchReceivedEmails])

  // Warn user when navigating away during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault()
        e.returnValue = 'Upload in progress. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isProcessing])

  // Fetch total translations count for social proof
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.totalTranslations) {
          setTotalTranslations(data.totalTranslations)
        }
      })
      .catch(() => {
        // Keep default value on error
      })
  }, [])

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

  // Load saved data on mount - but ONLY for guests (not authenticated users)
  // Authenticated users get their data ONLY from Supabase to prevent cross-user data leakage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Wait for auth to be determined before loading any records
    if (authLoading) return

    // For authenticated users: DON'T load localStorage records
    // They will be loaded from Supabase in the next useEffect
    // This prevents User A's cached data from showing when User B logs in
    if (user) {
      // User is authenticated - clear any stale localStorage and wait for Supabase
      // Check if localStorage belongs to a different user
      const lastUserId = localStorage.getItem('opencancer_last_user_id')
      if (lastUserId && lastUserId !== user.id) {
        // Different user! Clear records localStorage
        console.log('[Records] Different user detected, clearing localStorage')
        localStorage.removeItem('axestack-translations')
        localStorage.removeItem('axestack-translations-data')
      }
      // Records will load from Supabase in the next useEffect
    } else {
      // Guest user - load from localStorage (no cross-user issue for guests)
      const saved = localStorage.getItem('axestack-translations')
      if (saved) {
        try {
          setSavedTranslations(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load saved translations')
        }
      }
    }

    // Portals and privacy acknowledgement are safe to load for all users
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
  }, [authLoading, user])

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
            // For authenticated users: cloud records are the source of truth
            // Don't try to merge with localStorage - it has quota limits
            const cloudRecords = records.map((r: { id: string; fileName: string; date: string; documentType: string; result: TranslationResult }) => ({
              id: r.id,
              fileName: r.fileName,
              date: r.date,
              documentType: r.documentType,
            }))

            // Get any local-only records (uploaded this session before sync)
            const localIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
            const cloudIds = new Set(cloudRecords.map((r: { id: string }) => r.id))
            const localOnlyRecords = localIndex.filter((r: { id: string }) => !cloudIds.has(r.id))

            // Cloud records first, then any local-only records
            const allRecords = [...cloudRecords, ...localOnlyRecords]
            setSavedTranslations(allRecords)

            // Store cloud record data in memory (not localStorage) for viewing
            const existingData = JSON.parse(localStorage.getItem('axestack-translations-data') || '{}')
            records.forEach((r: { id: string; fileName: string; date: string; documentType: string; result: TranslationResult }) => {
              // Only store in memory map, don't persist to localStorage
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
            // Try to save but don't fail if quota exceeded
            try {
              localStorage.setItem('axestack-translations-data', JSON.stringify(existingData))
            } catch {
              // localStorage full - that's OK, we have cloud records
              console.log('localStorage full, using cloud records directly')
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
      const sessionId = localStorage.getItem('opencancer_session_id') || 'anonymous'
      const fileSizeMB = file.size / 1024 / 1024
      const formData = new FormData()

      // For large files (>4MB), upload to storage first to bypass Vercel body limit
      if (fileSizeMB > LARGE_FILE_THRESHOLD_MB) {
        console.log(`Large file detected (${fileSizeMB.toFixed(1)}MB), uploading to storage first...`)
        const storagePath = await uploadLargeFileToStorage(file, sessionId)
        formData.append('storagePath', storagePath)
      } else {
        formData.append('file', file)
      }

      formData.append('sessionId', sessionId)
      if (user?.id) formData.append('userId', user.id)

      // Add 90-second client-side timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)

      let response: Response
      try {
        response = await fetch('/api/translate', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
      } catch (fetchErr: unknown) {
        clearTimeout(timeoutId)
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('Processing timed out. Please try again with a smaller file.')
        }
        throw fetchErr
      }
      clearTimeout(timeoutId)

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
        const sessionId = localStorage.getItem('opencancer_session_id') || 'anonymous'
        const fileSizeMB = uploadedFile.file.size / 1024 / 1024
        const formData = new FormData()

        // For large files (>4MB), upload to storage first to bypass Vercel body limit
        if (fileSizeMB > LARGE_FILE_THRESHOLD_MB) {
          console.log(`[Bulk] Large file detected (${fileSizeMB.toFixed(1)}MB), uploading to storage first...`)
          const storagePath = await uploadLargeFileToStorage(uploadedFile.file, sessionId)
          formData.append('storagePath', storagePath)
        } else {
          formData.append('file', uploadedFile.file)
        }

        formData.append('sessionId', sessionId)
        if (user?.id) formData.append('userId', user.id)

        console.log(`[Bulk] Processing ${i + 1}/${uploadedFiles.length}: ${uploadedFile.file.name}, type: ${uploadedFile.file.type || 'unknown'}, size: ${(uploadedFile.file.size / 1024).toFixed(1)}KB${fileSizeMB > LARGE_FILE_THRESHOLD_MB ? ' (via storage)' : ''}`)

        // Add 90-second client-side timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 90000)

        let response: Response
        try {
          response = await fetch('/api/translate', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          })
        } catch (fetchErr: unknown) {
          clearTimeout(timeoutId)
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            console.error(`[Bulk] Timeout for ${uploadedFile.file.name}`)
            throw new Error('Processing timed out. Please try again with a smaller file.')
          }
          throw fetchErr
        }
        clearTimeout(timeoutId)

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

        // For authenticated users: save to cloud FIRST (primary storage)
        // For anonymous users: save to localStorage (with quota handling)
        const newEntry = { id: translationId, fileName: uploadedFile.file.name, date: translation.date, documentType: data.analysis?.document_type || 'Unknown' }

        if (user) {
          // AUTHENTICATED: Cloud is primary storage
          try {
            const { supabase } = await import('@/lib/supabase')
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              const saveResponse = await fetch('/api/records/save', {
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

              if (saveResponse.ok) {
                const saveData = await saveResponse.json()
                // Use cloud ID if returned
                if (saveData.id) {
                  newEntry.id = saveData.id
                  console.log('Record saved to cloud:', saveData.id)
                }
              } else {
                // Log the actual error from the server
                const errorData = await saveResponse.json().catch(() => ({}))
                console.error('Cloud save failed:', saveResponse.status, errorData)
              }
            } else {
              console.warn('No session token available for cloud save')
            }
          } catch (err) {
            console.error('Cloud save exception:', err)
          }

          // Update state immediately (cloud is source of truth)
          setSavedTranslations(prev => [newEntry, ...prev])

          // Try to cache in localStorage but don't fail if full
          try {
            const existingData = localStorage.getItem('axestack-translations-data') || '{}'
            const translationData = JSON.parse(existingData)
            translationData[translationId] = translation
            localStorage.setItem('axestack-translations-data', JSON.stringify(translationData))
          } catch {
            // localStorage full - that's fine, we have cloud
          }
        } else {
          // ANONYMOUS: localStorage is primary (with quota handling)
          try {
            const existingData = localStorage.getItem('axestack-translations-data') || '{}'
            const translationData = JSON.parse(existingData)
            translationData[translationId] = translation
            localStorage.setItem('axestack-translations-data', JSON.stringify(translationData))

            const existingIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
            const updatedIndex = [newEntry, ...existingIndex]
            localStorage.setItem('axestack-translations', JSON.stringify(updatedIndex))
            setSavedTranslations(updatedIndex)
          } catch (err) {
            console.error('localStorage save failed (quota?):', err)
            setSavedTranslations(prev => [newEntry, ...prev])
            setStorageWarning('Local storage is full. Sign in to save unlimited records to the cloud.')
            setTimeout(() => setStorageWarning(null), 8000)
          }
        }

        // Track successful upload
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
        const sessionId = localStorage.getItem('opencancer_session_id') || 'anonymous'
        const fileSizeMB = uploadedFile.file.size / 1024 / 1024
        const formData = new FormData()

        // For large files (>4MB), upload to storage first to bypass Vercel body limit
        if (fileSizeMB > LARGE_FILE_THRESHOLD_MB) {
          console.log(`[Retry] Large file detected (${fileSizeMB.toFixed(1)}MB), uploading to storage first...`)
          const storagePath = await uploadLargeFileToStorage(uploadedFile.file, sessionId)
          formData.append('storagePath', storagePath)
        } else {
          formData.append('file', uploadedFile.file)
        }

        formData.append('sessionId', sessionId)
        if (user?.id) formData.append('userId', user.id)

        console.log(`[Retry] Processing: ${uploadedFile.file.name}, type: ${uploadedFile.file.type}, size: ${(uploadedFile.file.size / 1024).toFixed(1)}KB${fileSizeMB > LARGE_FILE_THRESHOLD_MB ? ' (via storage)' : ''}`)

        // Add 90-second client-side timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 90000)

        let response: Response
        try {
          response = await fetch('/api/translate', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          })
        } catch (fetchErr: unknown) {
          clearTimeout(timeoutId)
          if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
            console.error(`[Retry] Timeout for ${uploadedFile.file.name}`)
            throw new Error('Processing timed out. Please try again with a smaller file.')
          }
          throw fetchErr
        }
        clearTimeout(timeoutId)

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

        const newEntry = { id: translationId, fileName: uploadedFile.file.name, date: translation.date, documentType: data.analysis?.document_type || 'Unknown' }

        if (user) {
          // AUTHENTICATED: Cloud is primary storage
          try {
            const { supabase } = await import('@/lib/supabase')
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              const saveResponse = await fetch('/api/records/save', {
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
              if (saveResponse.ok) {
                const saveData = await saveResponse.json()
                if (saveData.id) newEntry.id = saveData.id
              }
            }
          } catch (err) {
            console.error('Cloud save failed:', err)
          }
          setSavedTranslations(prev => [newEntry, ...prev])
        } else {
          // ANONYMOUS: localStorage with quota handling
          try {
            const existingData = localStorage.getItem('axestack-translations-data') || '{}'
            const translationData = JSON.parse(existingData)
            translationData[translationId] = translation
            localStorage.setItem('axestack-translations-data', JSON.stringify(translationData))

            const existingIndex = JSON.parse(localStorage.getItem('axestack-translations') || '[]')
            const updatedIndex = [newEntry, ...existingIndex]
            localStorage.setItem('axestack-translations', JSON.stringify(updatedIndex))
            setSavedTranslations(updatedIndex)
          } catch (err) {
            console.error('localStorage save failed (quota?):', err)
            setSavedTranslations(prev => [newEntry, ...prev])
            setStorageWarning('Local storage is full. Sign in to save unlimited records to the cloud.')
            setTimeout(() => setStorageWarning(null), 8000)
          }
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

    // Try to save to localStorage (may fail if storage is full)
    let localSaveSucceeded = true
    try {
      const existingData = localStorage.getItem('axestack-translations-data') || '{}'
      const data = JSON.parse(existingData)
      data[id] = translation
      localStorage.setItem('axestack-translations-data', JSON.stringify(data))

      // Update index for quick listing
      const newEntry = { id, fileName: file.name, date: translation.date, documentType: result.document_type }
      const updatedList = [newEntry, ...savedTranslations]
      setSavedTranslations(updatedList)
      localStorage.setItem('axestack-translations', JSON.stringify(updatedList))
    } catch (err) {
      // localStorage is full (QuotaExceededError)
      localSaveSucceeded = false
      console.error('localStorage save failed:', err)

      if (user) {
        setStorageWarning('Local storage is full, but your record was saved to the cloud. Sign in on any device to access all your records.')
      } else {
        setStorageWarning('Local storage is full. Sign in to save unlimited records to the cloud.')
      }
      setTimeout(() => setStorageWarning(null), 8000)
    }

    // Auto-save to cloud if user is authenticated
    if (user) {
      (async () => {
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const response = await fetch('/api/records/save', {
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

            if (response.ok) {
              // Cloud save succeeded
              setSaveSuccess(true)
              setTimeout(() => {
                setSaveSuccess(false)
                setShowSaveModal(false)
              }, 1500)
            } else {
              throw new Error('Cloud save failed')
            }
          }
        } catch (err) {
          console.error('Cloud sync failed:', err)
          if (!localSaveSucceeded) {
            setStorageWarning('Failed to save record. Please try again.')
          }
        }
      })()
    } else if (localSaveSucceeded) {
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowSaveModal(false)
      }, 1500)
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

  const deleteSavedTranslation = async (id: string, e: React.MouseEvent) => {
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

    // ALSO delete from Supabase if authenticated
    if (user) {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { error } = await supabase
          .from('medical_records')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) {
          console.error('Failed to delete record from Supabase:', error)
        }
      } catch (err) {
        console.error('Error deleting from Supabase:', err)
      }
    }
  }

  // Update record label/annotation
  const updateRecordLabel = async (id: string, newLabel: string) => {
    // Update in savedTranslations state
    const updatedList = savedTranslations.map(t =>
      t.id === id ? { ...t, documentType: newLabel } : t
    )
    setSavedTranslations(updatedList)

    // Update in localStorage index
    localStorage.setItem('axestack-translations', JSON.stringify(updatedList))

    // Update in localStorage data
    const data = localStorage.getItem('axestack-translations-data')
    if (data) {
      const translations = JSON.parse(data)
      if (translations[id]) {
        translations[id].documentType = newLabel
        localStorage.setItem('axestack-translations-data', JSON.stringify(translations))
      }
    }

    // Update in Supabase if authenticated
    if (user) {
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase
          .from('medical_records')
          .update({ document_type: newLabel })
          .eq('id', id)
          .eq('user_id', user.id)
      } catch (err) {
        console.error('Failed to update record in Supabase:', err)
      }
    }

    setEditingRecordId(null)
    setEditingLabel('')
    setEditMode('label')
  }

  // Update record notes/annotation
  const updateRecordNotes = async (id: string, newNotes: string) => {
    // Update in savedTranslations state
    const updatedList = savedTranslations.map(t =>
      t.id === id ? { ...t, notes: newNotes } : t
    )
    setSavedTranslations(updatedList)

    // Update in localStorage index
    localStorage.setItem('axestack-translations', JSON.stringify(updatedList))

    // Update in localStorage data
    const data = localStorage.getItem('axestack-translations-data')
    if (data) {
      const translations = JSON.parse(data)
      if (translations[id]) {
        translations[id].notes = newNotes
        localStorage.setItem('axestack-translations-data', JSON.stringify(translations))
      }
    }

    // Update in Supabase if authenticated
    if (user) {
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase
          .from('medical_records')
          .update({ notes: newNotes })
          .eq('id', id)
          .eq('user_id', user.id)
      } catch (err) {
        console.error('Failed to update record notes in Supabase:', err)
      }
    }

    setEditingRecordId(null)
    setEditingNotes('')
    setEditMode('label')
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
      <div className={`rounded-2xl border shadow-sm ${highlight ? 'bg-white border-slate-900' : 'bg-white border-stone-200'}`}>
        <button onClick={() => toggleSection(id)} className="w-full px-5 py-4 flex items-center justify-between text-left">
          <span className="flex items-center gap-3">
            <span className="w-5 h-5 text-slate-700 flex-shrink-0">{icon}</span>
            <span className="font-semibold text-slate-900 text-base">{title}</span>
            {badge && <span className="px-2 py-0.5 bg-[#C66B4A] text-white text-xs font-medium rounded-full">{badge}</span>}
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
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* RECORDS-FIRST VIEW: Show when user has saved records and not adding new */}
        {!result && savedTranslations.length > 0 && !showAddRecordView && (
          <div className="space-y-4">
            {/* Header with record count */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Records</h1>
                {isProcessing ? (
                  <p className="text-slate-600 text-sm font-medium flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    Processing {bulkProgress.current} of {bulkProgress.total}...
                  </p>
                ) : bulkComplete && uploadedFiles.length > 0 ? (
                  <p className="text-slate-700 text-sm font-medium flex items-center gap-1">
                    ✓ Done! {savedTranslations.length} record{savedTranslations.length !== 1 ? 's' : ''} translated
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm">{savedTranslations.length} record{savedTranslations.length !== 1 ? 's' : ''} translated</p>
                )}
              </div>
              <button
                onClick={() => setShowAddRecordView(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#C66B4A]/20 hover:shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                + Add Record
              </button>
            </div>

            {/* AI Case Review - PROMINENT CTA */}
            <Link
              href="/records/case-review"
              className="block bg-slate-900 hover:bg-slate-800 rounded-2xl p-5 text-white shadow-lg transition-all hover:shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ThinkingIndicator size={32} variant="dark" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">AI Case Review</p>
                  <p className="text-slate-300 text-sm">Synthesize all {savedTranslations.length} records into one comprehensive summary</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>

            {/* Email Inbox */}
            <button
              onClick={() => {
                setShowAddRecordView(true)
                setActiveTab('inbox')
              }}
              className="w-full bg-white border border-stone-200 hover:border-slate-400 rounded-2xl p-4 text-left transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Inbox className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Email Inbox</p>
                  <p className="text-slate-500 text-sm">
                    {claimedEmail ? `Emails sent to ${claimedEmail}` : 'Forward medical records via email'}
                  </p>
                </div>
                {receivedEmails.length > 0 && (
                  <span className="bg-[#C66B4A] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {receivedEmails.length}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
              <Shield className="w-4 h-4 text-slate-600" />
              <p className="text-xs text-slate-600">
                {user
                  ? 'Encrypted in your account. Your data is yours.'
                  : 'Sign in to save your records.'}
              </p>
            </div>

            {/* Records List - Inline */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Your Records</p>
                {savedTranslations.length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm('Delete all saved records? This cannot be undone.')) {
                        // Clear localStorage
                        localStorage.removeItem('axestack-translations')
                        localStorage.removeItem('axestack-translations-data')
                        setSavedTranslations([])

                        // ALSO delete from Supabase if authenticated
                        if (user) {
                          try {
                            const { supabase } = await import('@/lib/supabase')
                            const { error } = await supabase
                              .from('medical_records')
                              .delete()
                              .eq('user_id', user.id)
                            if (error) {
                              console.error('Failed to delete records from Supabase:', error)
                            } else {
                              console.log('[Records] Deleted all records from Supabase for user:', user.id)
                            }
                          } catch (err) {
                            console.error('Error deleting from Supabase:', err)
                          }
                        }
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
                    className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 text-left transition-colors group"
                  >
                    <button
                      onClick={() => loadSavedTranslation(t.id)}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{t.fileName}</p>
                        {editingRecordId === t.id ? (
                          <div className="mt-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 w-12">Type:</span>
                              <input
                                type="text"
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') { setEditingRecordId(null); setEditingLabel(''); setEditingNotes('') }
                                }}
                                className="px-2 py-0.5 border border-slate-300 rounded text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                placeholder="e.g., PSA Results"
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 w-12">Notes:</span>
                              <input
                                type="text"
                                value={editingNotes}
                                onChange={(e) => setEditingNotes(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateRecordLabel(t.id, editingLabel)
                                    if (editingNotes !== (t.notes || '')) updateRecordNotes(t.id, editingNotes)
                                  }
                                  if (e.key === 'Escape') { setEditingRecordId(null); setEditingLabel(''); setEditingNotes('') }
                                }}
                                className="px-2 py-0.5 border border-slate-300 rounded text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                placeholder="e.g., Pre-surgery baseline"
                              />
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateRecordLabel(t.id, editingLabel)
                                  if (editingNotes !== (t.notes || '')) updateRecordNotes(t.id, editingNotes)
                                }}
                                className="px-2 py-0.5 text-xs bg-slate-900 text-white rounded hover:bg-slate-800"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingRecordId(null); setEditingLabel(''); setEditingNotes('') }}
                                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{t.documentType}</span>
                              <span>·</span>
                              <span>{new Date(t.date).toLocaleDateString()}</span>
                            </div>
                            {t.notes && (
                              <p className="text-xs text-slate-400 italic mt-0.5 truncate">{t.notes}</p>
                            )}
                          </>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </button>
                    {/* Edit label & notes button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingRecordId(t.id)
                        setEditingLabel(t.documentType)
                        setEditingNotes(t.notes || '')
                      }}
                      className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Edit label & notes"
                    >
                      <Pencil className="w-4 h-4" />
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
                  className="text-slate-600 hover:text-slate-800 text-sm font-medium mb-4 inline-flex items-center gap-1"
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
                  <ShieldCheck className="w-3.5 h-3.5" /> Encrypted • Never shared without your permission
                </p>
              </>
            )}
          </div>
        )}

        {/* @opencancer.ai Email CTA Banner */}
        {!result && (savedTranslations.length === 0 || showAddRecordView) && !claimedEmail && (
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-full mb-4 p-4 bg-slate-900 rounded-xl text-white text-left group hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">Get your @opencancer.ai email</span>
                    <span className="px-2 py-0.5 bg-[#C66B4A] text-xs font-bold rounded-full">NEW</span>
                  </div>
                  <p className="text-slate-300 text-sm">Forward medical docs there. They auto-appear in your vault.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* Claimed email banner */}
        {!result && claimedEmail && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="w-full mb-4 p-4 bg-stone-100 border border-stone-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Your email: <span className="text-slate-700">{claimedEmail}</span></p>
                <p className="text-sm text-slate-600">Forward medical documents there and they'll appear here automatically!</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - only show in upload-first mode */}
        {!result && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="flex gap-2 mb-6 bg-stone-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Records
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all relative ${
                activeTab === 'portal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Connect Portal
              <span className="absolute -top-2 -right-1 bg-stone-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-stone-300">
                Soon
              </span>
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all relative ${
                activeTab === 'inbox'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Email Inbox
              {receivedEmails.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C66B4A] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {receivedEmails.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Upload Tab Content - Simplified */}
        {activeTab === 'upload' && !result && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <div className="text-center mb-6">
              <p className="text-lg text-slate-700 font-medium">Drop your medical records</p>
              <p className="text-sm text-slate-500 mt-1">Lab results, pathology reports, doctor&apos;s notes — we&apos;ll translate them to plain English</p>
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
                ${isDragging ? 'border-slate-500 bg-stone-100' : file ? 'border-green-400 bg-green-50' : 'border-stone-300 bg-white hover:border-slate-500 hover:bg-stone-50'}`}
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
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
                className="w-full mt-5 bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-slate-300 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-[#C66B4A]/20"
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
                {/* Show when isProcessing OR when any file has 'processing' status (more robust) */}
                {(isProcessing || uploadedFiles.some(f => f.status === 'processing')) && (
                  <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold">
                        Processing file {Math.max(bulkProgress.current, uploadedFiles.filter(f => f.status === 'completed' || f.status === 'error').length + 1)} of {bulkProgress.total || uploadedFiles.length}
                      </span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div
                        className="bg-white h-3 rounded-full transition-all duration-300"
                        style={{ width: `${((uploadedFiles.filter(f => f.status === 'completed' || f.status === 'error').length) / uploadedFiles.length) * 100}%` }}
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
                      ? 'bg-[#C66B4A] text-white'
                      : 'bg-slate-900 text-white'
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
                        uf.status === 'processing' ? 'bg-stone-100 border-slate-400 ring-2 ring-slate-400 ring-offset-1' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">
                        {uf.status === 'completed' ? '✓' :
                         uf.status === 'error' ? '✗' :
                         uf.status === 'processing' ? (
                           <span className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin inline-block" />
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
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
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
                    className="w-full bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-slate-300 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-[#C66B4A]/20"
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

            {storageWarning && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-medium">Storage limit reached</p>
                  <p>{storageWarning}</p>
                </div>
              </div>
            )}

            {/* Social proof */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <span className="font-semibold text-slate-700">{totalTranslations.toLocaleString()}</span>
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
                Encrypted and private. Never shared without your permission.
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
                      className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-stone-50 transition-colors text-left"
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
                    className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-stone-50 transition-colors text-left col-span-full"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={portalPassword}
                        onChange={(e) => setPortalPassword(e.target.value)}
                        placeholder="Your portal password"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
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
                    className="w-full bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-slate-300 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
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
                  Encrypted and private. Never shared without your permission.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Inbox Tab Content */}
        {activeTab === 'inbox' && !result && (savedTranslations.length === 0 || showAddRecordView) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-slate-600" />
                    Email Inbox
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Emails sent to {claimedEmail || 'your @opencancer.ai address'}
                  </p>
                </div>
                <button
                  onClick={fetchReceivedEmails}
                  disabled={loadingEmails}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Email List or Empty State */}
            {!claimedEmail ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">No email address yet</h4>
                <p className="text-slate-500 text-sm mb-4">
                  Claim your free @opencancer.ai email to receive medical documents here.
                </p>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C66B4A] hover:bg-[#B35E40] text-white rounded-lg font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Claim Your Email
                </button>
              </div>
            ) : loadingEmails ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Loading emails...</p>
              </div>
            ) : receivedEmails.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">No emails yet</h4>
                <p className="text-slate-500 text-sm mb-4">
                  Forward medical documents to <span className="font-medium text-slate-700">{claimedEmail}</span>
                </p>
                <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">How it works:</p>
                  <ol className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                      Forward any medical email to {claimedEmail}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                      Attachments are automatically stored here
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                      Click to translate any document to plain English
                    </li>
                  </ol>
                </div>
              </div>
            ) : selectedEmail ? (
              /* Email Detail View */
              <div>
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back to inbox
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-slate-900 mb-1">
                      {selectedEmail.subject || '(No subject)'}
                    </h4>
                    <p className="text-sm text-slate-500">
                      From: {selectedEmail.from_address}
                    </p>
                    <p className="text-sm text-slate-400">
                      {new Date(selectedEmail.received_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments.length > 0 && (
                    <div className="mb-4 p-4 bg-stone-100 border border-stone-200 rounded-xl">
                      <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        {selectedEmail.attachments.length} Attachment{selectedEmail.attachments.length > 1 ? 's' : ''}
                      </p>
                      <div className="space-y-2">
                        {selectedEmail.attachments.map(att => (
                          <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-slate-600" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{att.filename}</p>
                                <p className="text-xs text-slate-500">
                                  {att.size_bytes ? `${Math.round(att.size_bytes / 1024)} KB` : 'Unknown size'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // TODO: Process attachment as medical record
                                alert('Processing attachment coming soon!')
                              }}
                              className="text-sm text-[#C66B4A] hover:text-[#B35E40] font-medium"
                            >
                              Translate →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none">
                    {selectedEmail.body_html ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                    ) : selectedEmail.body_text ? (
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                        {selectedEmail.body_text}
                      </pre>
                    ) : (
                      <p className="text-slate-500 italic">No content</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Email List */
              <div className="divide-y divide-slate-100">
                {receivedEmails.map(email => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-start gap-4"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900 truncate">
                          {email.from_address}
                        </p>
                        {email.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Paperclip className="w-3 h-3" />
                            {email.attachments.length}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 truncate">
                        {email.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(email.received_at).toLocaleDateString()} at {new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Breadcrumb - Back to Records */}
            {savedTranslations.length > 0 && (
              <div className="flex items-center justify-between bg-stone-100 border border-stone-200 rounded-xl px-4 py-3">
                <button
                  onClick={() => {
                    setResult(null)
                    setFile(null)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
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
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white text-xl">📋</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-slate-900 text-base truncate">{file?.name}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{result.document_type}</p>
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
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {creatingShareLink ? 'Creating...' : shareLinkCopied ? 'Link Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleSendReport}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send Report
                  </button>
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
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
              <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg">🤍</span>
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

            {/* Knowledge Graph - Entity Annotation */}
            <EntityAnnotation
              sessionId={typeof window !== 'undefined' ? localStorage.getItem('opencancer_session_id') : null}
              userId={user?.id || null}
            />

            {result.diagnosis && result.diagnosis.length > 0 && result.diagnosis[0] !== 'unknown' && (
              <Section id="findings" icon={<Search className="w-5 h-5" />} title="Key Findings" badge={`${result.diagnosis.length} items`}>
                <ul className="space-y-2">
                  {result.diagnosis.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">{i + 1}</span>
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
                    <div className="bg-slate-100 rounded-xl p-4">
                      <p className="text-slate-600 text-sm font-medium mb-1">Type</p>
                      <p className="font-semibold text-slate-900 text-base">{result.cancer_specific.cancer_type}</p>
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
                    className="flex items-center gap-3 p-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors group"
                  >
                    <span className="text-lg">🔬</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">Find Clinical Trials</p>
                      <p className="text-xs text-slate-600 truncate">For {result.cancer_specific.cancer_type}</p>
                    </div>
                  </Link>
                  <Link
                    href="/records/case-review"
                    className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors group"
                  >
                    <span className="text-lg">🧠</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm">AI Case Review</p>
                      <p className="text-xs text-slate-300">Synthesize all your records</p>
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
                  className="mt-4 flex items-center justify-between p-4 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="font-medium text-slate-900">Bring these to your appointment</p>
                      <p className="text-sm text-slate-600">Add to your Cancer Checklist →</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
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
                      className="w-full text-left bg-slate-50 hover:bg-stone-100 rounded-xl p-3 border border-slate-100 hover:border-slate-300 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm group-hover:text-slate-700">{term.term}</p>
                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">{term.definition}</p>
                        </div>
                        <span className="text-slate-400 group-hover:text-slate-600 flex-shrink-0 text-sm">→</span>
                      </div>
                    </button>
                  ))}
                </div>
                {result.technical_terms_explained.length > 4 && (
                  <button
                    onClick={() => setShowAllTerms(!showAllTerms)}
                    className="w-full mt-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-medium bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
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
            <div className="bg-stone-100 border border-stone-200 rounded-2xl p-5 text-center">
              <p className="text-slate-800 font-medium mb-2">Did this help you understand your results?</p>
              <p className="text-slate-600 text-sm mb-4">Share with someone else who might benefit</p>
              <button
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
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
              className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ThinkingIndicator size={32} variant="dark" />
              <span className="font-medium">Ask about your results</span>
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
                  className="p-2 hover:bg-stone-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
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
                    <div className="bg-stone-100 rounded-xl p-4 border border-stone-200">
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
                          className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-stone-100 rounded-xl text-slate-700 hover:text-slate-900 transition-colors border border-slate-100 hover:border-slate-300 group"
                        >
                          <span className="text-slate-400 group-hover:text-slate-600 text-lg">→</span>
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
                        ? 'ml-6 bg-slate-200 text-slate-900 px-4 py-3 rounded-2xl rounded-tr-sm'
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
                    placeholder="Ask about your results..."
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl transition-colors font-medium"
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
                    className="w-full flex items-center gap-4 p-4 border-2 border-slate-300 bg-stone-50 rounded-xl hover:border-slate-400 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      {isSavingToCloud ? (
                        <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Cloud className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">Save to Account</p>
                        {user && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Signed in</span>}
                      </div>
                      <p className="text-xs text-slate-600">
                        {user ? 'Access from any device · Secure cloud storage' : 'Sign in to save securely in the cloud'}
                      </p>
                    </div>
                  </button>

                  {cloudSaveError && (
                    <p className="text-xs text-red-600 px-4">{cloudSaveError}</p>
                  )}

                  <button
                    onClick={handleSaveToApp}
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-stone-50 transition-colors text-left"
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
                    className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-stone-50 transition-colors text-left"
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
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-slate-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Report Sent!</h2>
                <p className="text-slate-600 mb-6">
                  The report has been emailed to {sendReportEmail}
                </p>
                <button
                  onClick={() => setShowSendReportModal(false)}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-slate-600" />
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
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
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
              <div className="w-14 h-14 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <Share2 className="w-6 h-6 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Share This Tool</h2>
              <p className="text-slate-600 text-sm mt-2">Help other patients understand their medical records</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-stone-50 transition-colors text-left"
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
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Your Privacy Matters</h2>
              <p className="text-slate-600">Before you upload, here's how we protect you:</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-slate-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Your data is yours</p>
                  <p className="text-sm text-slate-600">
                    {user
                      ? 'Encrypted and stored securely in your account. Sync across devices.'
                      : 'Encrypted and secure. Sign in to sync across devices.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-slate-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Never sold</p>
                  <p className="text-sm text-slate-600">We never sell your data. Ever. Your medical records belong to you.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-slate-600 text-sm">✓</span>
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
              className="w-full bg-[#C66B4A] hover:bg-[#B35E40] text-white font-semibold py-4 rounded-xl transition-all"
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
