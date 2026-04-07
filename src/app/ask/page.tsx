'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CANCER_TYPES, PRIMARY_CATEGORIES, BLOOD_CANCERS, CANCER_CATEGORIES } from '@/lib/cancer-data'
import { useAuth } from '@/lib/auth'
import { AuthModal } from '@/components/AuthModal'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { fetchSuggestedQuestions, getCategoryColor, SuggestedQuestion } from '@/lib/suggested-questions'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ShareButton } from '@/components/ShareButton'
import { Navbar } from '@/components/Navbar'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

// Types for file attachments
interface AttachedFile {
  file: File
  preview?: string
  extractedText?: string
  extractedEntities?: Array<{ type: string; value: string }>
  fullAnalysis?: Record<string, unknown>
  status: 'pending' | 'processing' | 'ready' | 'error'
  error?: string
}

// Get or create a session ID for anonymous users
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sessionId = localStorage.getItem('opencancer-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('opencancer-session-id', sessionId)
  }
  return sessionId
}

interface Citation {
  title: string
  url: string
}

interface FollowUpQuestion {
  id: string
  question: string
  category?: string
  icon?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  followUpQuestions?: FollowUpQuestion[]
  confidenceScore?: number
  isLoading?: boolean
  typingComplete?: boolean
  feedback?: 'positive' | 'negative' | null
  feedbackComment?: string
}

function AskPageContent() {
  const searchParams = useSearchParams()
  const { user, profile: authProfile, loading: authLoading } = useAuth()
  const { trackEvent } = useAnalytics()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [hasTrackedRef, setHasTrackedRef] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cancerType, setCancerType] = useState<string>('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [conciseMode, setConciseMode] = useState(false)
  const [sharingMessageId, setSharingMessageId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [hasPatientContext, setHasPatientContext] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [hasUsedAttachment, setHasUsedAttachment] = useState(false) // Track if user has attached a file
  const [showSaveRecordsPrompt, setShowSaveRecordsPrompt] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  // Smart Profile Sync state
  const [showProfileSyncPrompt, setShowProfileSyncPrompt] = useState(false)
  const [detectedCancerType, setDetectedCancerType] = useState<string | null>(null)
  const [detectedStage, setDetectedStage] = useState<string | null>(null)
  // Selective friction state
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const [showWikiPrompt, setShowWikiPrompt] = useState(false)
  const [showCareCirclePrompt, setShowCareCirclePrompt] = useState(false)
  const [promptsDismissed, setPromptsDismissed] = useState<Set<string>>(new Set())
  // Wizard profile (for smart auth flow)
  const [wizardProfileEmail, setWizardProfileEmail] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize session ID for anonymous users
  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Load dismissed prompts from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('ask-prompts-dismissed')
    if (dismissed) {
      try {
        setPromptsDismissed(new Set(JSON.parse(dismissed)))
      } catch (e) {
        // Ignore
      }
    }
  }, [])

  // Selective friction: Show prompts based on engagement
  useEffect(() => {
    // Don't show prompts if user is authenticated and has profile
    if (user && authProfile?.cancer_type && authProfile.cancer_type !== 'other') {
      return
    }

    // After first question with attachment - prompt to save records
    if (hasUsedAttachment && questionCount >= 1 && !user && !promptsDismissed.has('save_records')) {
      const timer = setTimeout(() => setShowSaveRecordsPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // After first question - prompt for cancer type if not set
    if (questionCount === 1 && !cancerType && !promptsDismissed.has('profile') && !hasUsedAttachment) {
      // Delay slightly so response comes first
      const timer = setTimeout(() => setShowProfilePrompt(true), 2000)
      return () => clearTimeout(timer)
    }

    // After 3 questions - prompt for profile to save their "wiki"
    if (questionCount === 3 && !user && !promptsDismissed.has('wiki')) {
      const timer = setTimeout(() => setShowWikiPrompt(true), 2000)
      return () => clearTimeout(timer)
    }

    // After 5 questions - prompt for CareCircle
    if (questionCount === 5 && !promptsDismissed.has('carecircle')) {
      const timer = setTimeout(() => setShowCareCirclePrompt(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [questionCount, cancerType, user, authProfile, promptsDismissed, hasUsedAttachment])

  // Dismiss a prompt and remember it
  const dismissPrompt = (promptType: string) => {
    const newDismissed = new Set(promptsDismissed)
    newDismissed.add(promptType)
    setPromptsDismissed(newDismissed)
    localStorage.setItem('ask-prompts-dismissed', JSON.stringify([...newDismissed]))

    if (promptType === 'profile') setShowProfilePrompt(false)
    if (promptType === 'wiki') setShowWikiPrompt(false)
    if (promptType === 'carecircle') setShowCareCirclePrompt(false)
    if (promptType === 'save_records') setShowSaveRecordsPrompt(false)
    if (promptType === 'profile_sync') setShowProfileSyncPrompt(false)
  }

  // Handle profile sync - update cancer type from detected value
  const handleProfileSync = async () => {
    if (!detectedCancerType) return

    // Find the matching cancer type key from CANCER_TYPES
    const normalizedDetected = detectedCancerType.toLowerCase()
    let cancerTypeKey = 'other'

    // Try to match the detected type to our CANCER_TYPES keys
    for (const [key, value] of Object.entries(CANCER_TYPES)) {
      const normalizedValue = value.toLowerCase()
      const normalizedKey = key.toLowerCase()
      if (normalizedDetected.includes(normalizedKey) ||
          normalizedValue.includes(normalizedDetected) ||
          normalizedDetected.includes(normalizedValue.split(' ')[0])) {
        cancerTypeKey = key
        break
      }
    }

    // Update local state
    setCancerType(cancerTypeKey)

    // Update localStorage profile
    const savedProfile = localStorage.getItem('patient-profile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        profile.cancerType = cancerTypeKey
        if (detectedStage) profile.stage = detectedStage
        localStorage.setItem('patient-profile', JSON.stringify(profile))
      } catch (e) {
        console.error('Failed to update local profile:', e)
      }
    }

    // Update Supabase profile if user is logged in
    if (user && authProfile?.email) {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authProfile.email,
            name: authProfile.name,
            role: authProfile.role,
            cancerType: cancerTypeKey,
            stage: detectedStage || authProfile.stage,
            sessionId: sessionId,
          }),
        })
      } catch (err) {
        console.warn('Failed to update Supabase profile:', err)
      }
    }

    // Update knowledge graph with the new cancer type
    const currentSessionId = sessionId || getSessionId()
    fetch('/api/entities/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entities: [
          { type: 'cancer_type', value: cancerTypeKey, status: 'confirmed', confidence: 1.0 },
          ...(detectedStage ? [{ type: 'stage', value: detectedStage, status: 'confirmed', confidence: 1.0 }] : [])
        ],
        sessionId: currentSessionId,
        userId: user?.id || null,
        source: 'profile_sync',
      }),
    }).catch(err => console.warn('Failed to update knowledge graph:', err))

    // Track the sync
    trackEvent('profile_sync_accepted', {
      detected_type: detectedCancerType,
      mapped_type: cancerTypeKey,
      detected_stage: detectedStage,
      was_logged_in: !!user,
    })

    // Close prompt
    setShowProfileSyncPrompt(false)
    setDetectedCancerType(null)
    setDetectedStage(null)
  }

  // Load concise mode preference
  useEffect(() => {
    const saved = localStorage.getItem('ask-concise-mode')
    if (saved === 'true') setConciseMode(true)
  }, [])

  const FREE_QUESTION_LIMIT = 3

  // Load profile - prefer Supabase for authenticated users
  useEffect(() => {
    if (authLoading) return

    // Use Supabase profile for authenticated users
    if (user && authProfile) {
      if (authProfile.cancer_type && !cancerType) {
        setCancerType(authProfile.cancer_type)
      }
    } else {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem('patient-profile')
      if (saved) {
        try {
          const profile = JSON.parse(saved)
          if (profile.cancerType && !cancerType) {
            setCancerType(profile.cancerType)
          }
          // Track wizard email for smart auth flow
          if (profile.email) {
            setWizardProfileEmail(profile.email)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [user, authProfile, authLoading])

  // Fetch cancer-specific suggested questions when cancer type changes
  const loadSuggestedQuestions = useCallback(async (type: string | null) => {
    setIsLoadingQuestions(true)
    try {
      const questions = await fetchSuggestedQuestions(type)
      setSuggestedQuestions(questions)
    } catch (err) {
      console.error('Error loading suggested questions:', err)
    } finally {
      setIsLoadingQuestions(false)
    }
  }, [])

  // Load questions on mount and when cancer type changes
  useEffect(() => {
    loadSuggestedQuestions(cancerType || null)
  }, [cancerType, loadSuggestedQuestions])

  // Handle URL params: pre-fill question and track referrals
  useEffect(() => {
    const q = searchParams.get('q')
    const ref = searchParams.get('ref')

    // Pre-fill question from URL
    if (q && !input) {
      setInput(q)
    }

    // Track referral source
    if (ref && !hasTrackedRef) {
      setHasTrackedRef(true)
      trackEvent('share_referral', {
        ref_source: ref,
        page: 'ask',
        timestamp: new Date().toISOString(),
      })
      // Store in localStorage for conversion tracking
      localStorage.setItem('opencancer-referral', JSON.stringify({
        ref,
        timestamp: new Date().toISOString(),
        page: 'ask'
      }))
    }
  }, [searchParams, input, hasTrackedRef, trackEvent])

  // Show welcome message on mount
  useEffect(() => {
    if (!hasShownWelcome && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hi, I'm **Navis**, your OpenCancer AI assistant. I can help you find information about cancer treatments, clinical trials, and caregiver strategies, grounded in NCCN guidelines and expert-led resources.

📎 **Drop your medical records right here!** Click the paperclip or drag & drop a pathology report, lab result, or scan — I'll read it and answer questions about YOUR specific case.

I can help you with:
- **Analyzing your records** — attach any PDF or image and ask "what does this mean?"
- Understanding NCCN guidelines for your specific situation
- Exploring treatment options and clinical trials
- Interpreting test results and biomarkers
- Preparing questions for your oncologist

**Please remember:** This is educational information only, not medical advice. Always consult your doctor about your specific situation.

**How can I help you today?**`,
        timestamp: new Date(),
        typingComplete: true // Welcome message renders instantly
      }
      setMessages([welcomeMessage])
      setHasShownWelcome(true)
    }
  }, [hasShownWelcome, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  // Handle file attachment
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp|heic)$/i)) {
      alert('Please upload a PDF or image file (JPG, PNG, WebP, HEIC)')
      return
    }

    // Add file to attachments with pending status
    const newFile: AttachedFile = {
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    setAttachedFiles([newFile]) // Replace any existing attachment
    setIsProcessingFile(true)

    // Process the file via translate API
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process file')
      }

      const data = await response.json()
      console.log('Translate API response:', {
        hasAnalysis: !!data.analysis,
        hasDocumentText: !!data.documentText,
        documentType: data.analysis?.document_type,
        cancerType: data.analysis?.cancer_specific?.cancer_type
      })

      // Extract entities from the translation (matches API response structure)
      const entities: Array<{ type: string; value: string }> = []
      const analysis = data.analysis

      if (analysis?.cancer_specific?.cancer_type && analysis.cancer_specific.cancer_type !== 'unknown') {
        entities.push({ type: 'Cancer Type', value: analysis.cancer_specific.cancer_type })
      }
      if (analysis?.cancer_specific?.stage && analysis.cancer_specific.stage !== 'unknown') {
        entities.push({ type: 'Stage', value: analysis.cancer_specific.stage })
      }
      if (analysis?.cancer_specific?.biomarkers && analysis.cancer_specific.biomarkers.length > 0) {
        analysis.cancer_specific.biomarkers.forEach((b: string) => {
          if (b && b !== 'unknown') entities.push({ type: 'Biomarker', value: b })
        })
      }
      // Also extract diagnosis if available
      if (analysis?.diagnosis && analysis.diagnosis.length > 0) {
        analysis.diagnosis.forEach((d: string) => {
          if (d && d !== 'unknown') entities.push({ type: 'Diagnosis', value: d })
        })
      }

      // Build a comprehensive summary for the chat context
      const summaryParts: string[] = []
      if (analysis?.document_type) summaryParts.push(`Document Type: ${analysis.document_type}`)
      if (analysis?.test_summary) summaryParts.push(`Summary: ${analysis.test_summary}`)
      if (analysis?.questions_to_ask_doctor) summaryParts.push(`Questions to ask: ${analysis.questions_to_ask_doctor}`)

      const extractedSummary = summaryParts.length > 0
        ? summaryParts.join('\n\n')
        : data.documentText?.slice(0, 1000) || 'Document processed successfully'

      setAttachedFiles([{
        ...newFile,
        status: 'ready',
        extractedText: data.documentText || extractedSummary, // Store the full document text
        extractedEntities: entities,
        // Store the full analysis for later use
        fullAnalysis: analysis,
      }])

      // Save to patient's records in Supabase (async, non-blocking)
      // This ensures chat uploads are saved just like records page uploads
      const currentSessionId = sessionId || getSessionId()
      fetch('/api/records/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          analysis: data.analysis,
          documentText: data.documentText,
          storagePath: data.storagePath,
          sessionId: currentSessionId,
          userId: user?.id || null,
          source: 'chat_attachment', // Track that this came from chat
        }),
      }).catch(err => console.warn('Failed to save record:', err))

      // Extract entities to knowledge graph (async, non-blocking)
      if (entities.length > 0) {
        fetch('/api/entities/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText: data.documentText,
            analysis: data.analysis,
            sessionId: currentSessionId,
            userId: user?.id || null,
            source: 'chat_attachment',
          }),
        }).catch(err => console.warn('Failed to extract entities:', err))
      }

      // Smart Profile Sync: Check if detected cancer type differs from profile
      const detectedType = analysis?.cancer_specific?.cancer_type
      const detectedStageValue = analysis?.cancer_specific?.stage
      if (detectedType && detectedType !== 'unknown') {
        // Get current profile cancer type
        const savedProfile = localStorage.getItem('patient-profile')
        const profileCancerType = savedProfile ? JSON.parse(savedProfile)?.cancerType : null
        const authCancerType = authProfile?.cancer_type
        const currentCancerType = authCancerType || profileCancerType

        // Normalize for comparison (lowercase, handle variations)
        const normalizeType = (type: string | null | undefined) => {
          if (!type) return null
          return type.toLowerCase().replace(/[^a-z]/g, '')
        }

        const normalizedDetected = normalizeType(detectedType)
        const normalizedCurrent = normalizeType(currentCancerType)

        // Show prompt if:
        // 1. No cancer type set (other or empty)
        // 2. Different cancer type detected
        const shouldPrompt = !normalizedCurrent ||
          normalizedCurrent === 'other' ||
          (normalizedDetected && normalizedCurrent && normalizedDetected !== normalizedCurrent)

        if (shouldPrompt && !promptsDismissed.has('profile_sync')) {
          setDetectedCancerType(detectedType)
          setDetectedStage(detectedStageValue && detectedStageValue !== 'unknown' ? detectedStageValue : null)
          // Small delay to let file attachment UI settle
          setTimeout(() => setShowProfileSyncPrompt(true), 1000)
        }
      }

      // Track the attachment
      trackEvent('chat_file_attached', {
        file_type: file.type,
        file_size: file.size,
        entities_found: entities.length,
        saved_to_records: true,
      })
    } catch (err) {
      console.error('File processing error:', err)
      setAttachedFiles([{
        ...newFile,
        status: 'error',
        error: 'Could not process file. Try uploading to Records instead.',
      }])
    } finally {
      setIsProcessingFile(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Remove attached file
  const removeAttachment = () => {
    setAttachedFiles([])
  }

  // Process a file (used by both file input and drag-drop)
  const processFile = async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp|heic)$/i)) {
      alert('Please upload a PDF or image file (JPG, PNG, WebP, HEIC)')
      return
    }

    // Trigger the same processing as handleFileSelect
    const fakeEvent = {
      target: { files: [file] }
    } as unknown as React.ChangeEvent<HTMLInputElement>
    handleFileSelect(fakeEvent)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDraggingFile) setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if leaving the drop zone entirely (not entering a child element)
    const relatedTarget = e.relatedTarget as Node | null
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDraggingFile(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleSubmit = async (messageText?: string) => {
    const text = messageText || input
    if (!text.trim() || isLoading) return

    // Build context from attached files
    const readyAttachment = attachedFiles.find(f => f.status === 'ready')
    let fileContext = ''
    if (readyAttachment?.extractedText || readyAttachment?.fullAnalysis) {
      const analysis = readyAttachment.fullAnalysis as Record<string, unknown> | undefined
      fileContext = '\n\n[ATTACHED DOCUMENT CONTEXT]'

      // Add document type
      if (analysis?.document_type) {
        fileContext += `\nDocument Type: ${analysis.document_type}`
      }

      // Add extracted findings (summary)
      if (readyAttachment.extractedEntities && readyAttachment.extractedEntities.length > 0) {
        fileContext += '\n\nKey Findings:\n' +
          readyAttachment.extractedEntities.map(e => `- ${e.type}: ${e.value}`).join('\n')
      }

      // Add cancer-specific info
      const cancerSpecific = analysis?.cancer_specific as Record<string, unknown> | undefined
      if (cancerSpecific) {
        if (cancerSpecific.cancer_type && cancerSpecific.cancer_type !== 'unknown') {
          fileContext += `\n\nCancer Type: ${cancerSpecific.cancer_type}`
        }
        if (cancerSpecific.stage && cancerSpecific.stage !== 'unknown') {
          fileContext += `\nStage: ${cancerSpecific.stage}`
        }
        if (cancerSpecific.grade && cancerSpecific.grade !== 'unknown') {
          fileContext += `\nGrade: ${cancerSpecific.grade}`
        }
      }

      // Add analysis summary
      if (analysis?.test_summary) {
        fileContext += `\n\nAnalysis Summary: ${analysis.test_summary}`
      }

      // Add the FULL document text so the AI can answer specific questions
      if (readyAttachment.extractedText) {
        // Truncate if too long (keep under 15k chars to avoid token limits)
        const docText = readyAttachment.extractedText.slice(0, 15000)
        fileContext += `\n\n--- FULL DOCUMENT TEXT ---\n${docText}`
        if (readyAttachment.extractedText.length > 15000) {
          fileContext += '\n[Document truncated - too long]'
        }
        fileContext += '\n--- END DOCUMENT TEXT ---'
      }

      fileContext += '\n[END DOCUMENT CONTEXT]'
    }

    // Track the question being asked (include full question text for admin insights)
    trackEvent('ask_question', {
      question: text.trim(),
      question_length: text.trim().length,
      cancer_type: cancerType || null,
      is_suggested_question: !!messageText,
      has_file_attachment: !!readyAttachment,
    })

    // Soft auth gate
    const newCount = questionCount + 1
    setQuestionCount(newCount)
    if (!user && newCount > FREE_QUESTION_LIMIT && newCount % 3 === 1) {
      setShowAuthModal(true)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    const loadingMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setInput('')
    setIsLoading(true)

    // Clear attachments after sending (they're now in context)
    if (readyAttachment) {
      setAttachedFiles([])
      setHasUsedAttachment(true) // Track that they've used the attachment feature
    }

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim() + fileContext, // Include file context in the message
          cancerType: cancerType || undefined,
          history: messages.filter(m => !m.isLoading).slice(-6),
          conciseMode,
          // Pass user/session context for personalized answers from knowledge graph
          userId: user?.id,
          sessionId: sessionId,
          hasFileAttachment: !!readyAttachment,
        })
      })

      const data = await response.json()

      // Track if patient context was used for personalization
      if (data.hasPatientContext) {
        setHasPatientContext(true)
      }

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: data.response || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          citations: data.citationUrls,
          followUpQuestions: data.followUpQuestions,
          confidenceScore: data.confidenceScore,
          typingComplete: false
        }]
      })
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading)
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
          typingComplete: true
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const markTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, typingComplete: true } : m
    ))
  }

  const [pendingFeedbackType, setPendingFeedbackType] = useState<'positive' | 'negative' | null>(null)

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative', comment?: string) => {
    // Show comment input first (unless comment is provided or skipped)
    if (!comment && feedbackMessageId !== messageId) {
      setFeedbackMessageId(messageId)
      setPendingFeedbackType(type)
      setFeedbackComment('')
      return
    }

    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: type, feedbackComment: comment } : m
    ))

    // Close comment input
    setFeedbackMessageId(null)
    setFeedbackComment('')
    setPendingFeedbackType(null)

    // Get the message content for context
    const message = messages.find(m => m.id === messageId)

    // Log to console and localStorage
    const feedbackData = {
      messageId,
      type,
      comment: comment || null,
      messageContent: message?.content?.substring(0, 200) || null,
      timestamp: new Date().toISOString(),
      cancerType: cancerType || null
    }
    console.log('[Ask Navis] Feedback:', feedbackData)

    try {
      const storedFeedback = JSON.parse(localStorage.getItem('ask-feedback') || '[]')
      storedFeedback.push(feedbackData)
      localStorage.setItem('ask-feedback', JSON.stringify(storedFeedback.slice(-50)))

      // Send to Supabase (non-blocking)
      fetch('https://felofmlhqwcdpiyjgstx.supabase.co/functions/v1/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ask_feedback',
          properties: feedbackData
        })
      }).catch(() => {})
    } catch (e) {
      console.error('Failed to save feedback:', e)
    }
  }

  const submitFeedbackWithComment = (messageId: string) => {
    if (pendingFeedbackType) {
      handleFeedback(messageId, pendingFeedbackType, feedbackComment.trim() || undefined)
    }
  }

  const skipFeedbackComment = (messageId: string) => {
    if (pendingFeedbackType) {
      handleFeedback(messageId, pendingFeedbackType, '')
      setFeedbackMessageId(null)
      setPendingFeedbackType(null)
    }
  }

  const cancelFeedback = () => {
    setFeedbackMessageId(null)
    setFeedbackComment('')
    setPendingFeedbackType(null)
  }

  // Handle sharing a Q&A
  const handleShare = async (messageId: string) => {
    setSharingMessageId(messageId)
    setShareUrl(null)

    // Find this message and the previous user message
    const messageIndex = messages.findIndex(m => m.id === messageId)
    const assistantMessage = messages[messageIndex]
    const userMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user')

    if (!assistantMessage || !userMessage) {
      setSharingMessageId(null)
      return
    }

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'qa',
          question: userMessage.content,
          answer: assistantMessage.content,
          cancerType: cancerType || null,
          followUpQuestions: assistantMessage.followUpQuestions?.map(f => f.question) || []
        })
      })

      const data = await response.json()
      if (data.success && data.shareUrl) {
        setShareUrl(data.shareUrl)
        await navigator.clipboard.writeText(data.shareUrl)
        trackEvent('share_qa', { messageId, shareUrl: data.shareUrl })
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
    }
  }

  const closeShareModal = () => {
    setSharingMessageId(null)
    setShareUrl(null)
  }

  // Only show suggested questions after welcome message, before user asks anything
  const showSuggestions = messages.length === 1 && messages[0]?.role === 'assistant'

  // Check if embedded (hide navbar)
  const isEmbed = searchParams.get('embed') === '1'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {!isEmbed && <Navbar />}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <ThinkingIndicator size={18} variant="light" />
                      <span className="text-sm font-medium text-gray-700">
                        {message.isLoading ? 'Navis is thinking...' : 'Navis'}
                      </span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}>
                    {message.isLoading ? (
                      <div className="py-1">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    ) : message.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <TypewriterMarkdown
                        text={message.content}
                        instantRender={index === 0 || message.typingComplete}
                        onComplete={() => markTypingComplete(message.id)}
                      />
                    )}

                    {/* Feedback buttons - Only show after typing complete */}
                    {message.role === 'assistant' && message.typingComplete && !message.isLoading && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Was this helpful?</span>
                            <button
                              onClick={() => handleFeedback(message.id, 'positive')}
                              disabled={message.feedback !== undefined && message.feedback !== null}
                              className={`p-1.5 rounded transition-colors ${
                                message.feedback === 'positive'
                                  ? 'bg-green-100 text-green-600'
                                  : message.feedback === 'negative'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, 'negative')}
                              disabled={message.feedback !== undefined && message.feedback !== null}
                              className={`p-1.5 rounded transition-colors ${
                                message.feedback === 'negative'
                                  ? 'bg-red-100 text-red-600'
                                  : message.feedback === 'positive'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                            {message.feedback && (
                              <span className="text-xs text-gray-500 ml-2">
                                Thanks for your feedback!
                                {message.feedbackComment && <span className="italic"> (with comment)</span>}
                              </span>
                            )}
                          </div>
                          {/* Share button */}
                          <button
                            onClick={() => handleShare(message.id)}
                            disabled={sharingMessageId === message.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {sharingMessageId === message.id ? 'Creating link...' : 'Share'}
                          </button>
                        </div>

                        {/* Share success message */}
                        {sharingMessageId === message.id && shareUrl && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-sm text-green-700 font-medium">Link copied!</span>
                              </div>
                              <button onClick={closeShareModal} className="text-green-600 hover:text-green-800">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-green-600 mt-1 break-all">{shareUrl}</p>
                            <p className="text-xs text-green-600 mt-2">Share this with others who might find it helpful!</p>
                          </div>
                        )}

                        {/* Feedback comment input for both positive and negative feedback */}
                        {feedbackMessageId === message.id && (
                          <div className={`mt-3 p-3 rounded-lg border ${
                            pendingFeedbackType === 'positive'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <p className="text-xs text-gray-600 mb-2">
                              {pendingFeedbackType === 'positive'
                                ? 'What was most helpful? (optional)'
                                : 'What could be improved? (optional)'}
                            </p>
                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder={pendingFeedbackType === 'positive'
                                ? "e.g., Clear explanation, good examples, helped me understand..."
                                : "e.g., The answer was too technical, missing information about..."}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
                              rows={2}
                              maxLength={500}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">{feedbackComment.length}/500</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={cancelFeedback}
                                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => skipFeedbackComment(message.id)}
                                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() => submitFeedbackWithComment(message.id)}
                                  className={`px-3 py-1.5 text-xs text-white rounded-lg font-medium ${
                                    pendingFeedbackType === 'positive'
                                      ? 'bg-green-600 hover:bg-green-500'
                                      : 'bg-slate-900 hover:bg-slate-800'
                                  }`}
                                >
                                  Submit
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Citations - Show all sources prominently */}
                    {message.citations && message.citations.length > 0 && message.typingComplete && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Sources ({message.citations.length})
                        </p>
                        <div className="space-y-1.5">
                          {message.citations.map((citation, i) => (
                            <a
                              key={i}
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50 transition-colors group"
                            >
                              <span className="text-slate-500 font-medium">[{i + 1}]</span>
                              <span className="truncate flex-1">{citation.title}</span>
                              <svg className="w-3 h-3 text-gray-400 group-hover:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Questions - Only show after typing complete */}
                    {message.followUpQuestions && message.followUpQuestions.length > 0 && message.typingComplete && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Continue exploring:</p>
                        <div className="space-y-2">
                          {message.followUpQuestions.slice(0, 2).map((q, i) => (
                            <button
                              key={q.id || i}
                              onClick={() => handleSubmit(q.question)}
                              className="flex items-center gap-2 w-full text-left text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-stone-50 hover:border-slate-400 transition-colors group"
                            >
                              <span className="text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
                              {q.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggested Questions - shown after welcome message */}
            {showSuggestions && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {cancerType ? `Questions for ${CANCER_TYPES[cancerType] || cancerType}:` : 'Try asking:'}
                  </p>
                  {cancerType && (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="text-xs text-slate-600 hover:text-slate-800"
                    >
                      Change cancer type
                    </button>
                  )}
                </div>
                {isLoadingQuestions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading questions...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleSubmit(q.question)}
                        className="group flex items-start gap-3 w-full text-left px-4 py-3 bg-white hover:bg-stone-50 border border-gray-200 hover:border-slate-400 rounded-xl text-sm text-gray-700 transition-all hover:shadow-md"
                      >
                        <span className="text-slate-500 font-medium group-hover:translate-x-1 transition-transform mt-0.5">→</span>
                        <div className="flex-1 min-w-0">
                          <span className="block">{q.question}</span>
                          {q.category && (
                            <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${getCategoryColor(q.category)}`}>
                              {q.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!cancerType && !isLoadingQuestions && (
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="mt-4 w-full py-2.5 text-sm text-slate-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                  >
                    Select your cancer type for personalized questions →
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Selective Friction Prompts */}
      {/* Profile Prompt - after first question if no cancer type */}
      {showProfilePrompt && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">Get more personalized answers</p>
                <p className="text-sm text-slate-300 mb-3">Tell me your cancer type and I can tailor my guidance to your specific situation.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSettingsModal(true)
                      dismissPrompt('profile')
                      trackEvent('friction_prompt_accepted', { type: 'profile', question_count: questionCount })
                    }}
                    className="px-4 py-2 bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors text-sm"
                  >
                    Select Cancer Type
                  </button>
                  <button
                    onClick={() => {
                      dismissPrompt('profile')
                      trackEvent('friction_prompt_dismissed', { type: 'profile', question_count: questionCount })
                    }}
                    className="px-3 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wiki Prompt - after 3 questions */}
      {showWikiPrompt && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">Your questions are building your cancer wiki</p>
                <p className="text-sm text-emerald-100 mb-3">You've asked {questionCount} questions. Create a free profile to save them and get personalized answers based on your full history.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAuthModal(true)
                      dismissPrompt('wiki')
                      trackEvent('friction_prompt_accepted', { type: 'wiki', question_count: questionCount })
                    }}
                    className="px-4 py-2 bg-white text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors text-sm"
                  >
                    Save My Questions
                  </button>
                  <button
                    onClick={() => {
                      dismissPrompt('wiki')
                      trackEvent('friction_prompt_dismissed', { type: 'wiki', question_count: questionCount })
                    }}
                    className="px-3 py-2 text-emerald-200 hover:text-white transition-colors text-sm"
                  >
                    Continue as guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CareCircle Prompt - after 5 questions */}
      {showCareCirclePrompt && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">Caregivers have the same questions</p>
                <p className="text-sm text-rose-100 mb-3">Share your insights with family and friends who are supporting you. Create a CareCircle to keep everyone informed.</p>
                <div className="flex gap-2">
                  <a
                    href="/hub"
                    onClick={() => {
                      dismissPrompt('carecircle')
                      trackEvent('friction_prompt_accepted', { type: 'carecircle', question_count: questionCount })
                    }}
                    className="px-4 py-2 bg-white text-rose-600 font-medium rounded-lg hover:bg-rose-50 transition-colors text-sm"
                  >
                    Create CareCircle
                  </a>
                  <button
                    onClick={() => {
                      dismissPrompt('carecircle')
                      trackEvent('friction_prompt_dismissed', { type: 'carecircle', question_count: questionCount })
                    }}
                    className="px-3 py-2 text-rose-200 hover:text-white transition-colors text-sm"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Records Prompt - after first question with attachment, for guests */}
      {showSaveRecordsPrompt && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">Your records are saved!</p>
                <p className="text-sm text-blue-100 mb-3">Create a free account to access your records anytime, get personalized answers, and build your cancer knowledge base.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAuthModal(true)
                      dismissPrompt('save_records')
                      trackEvent('friction_prompt_accepted', { type: 'save_records', question_count: questionCount })
                    }}
                    className="px-4 py-2 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    Create Free Account
                  </button>
                  <button
                    onClick={() => {
                      dismissPrompt('save_records')
                      trackEvent('friction_prompt_dismissed', { type: 'save_records', question_count: questionCount })
                    }}
                    className="px-3 py-2 text-blue-200 hover:text-white transition-colors text-sm"
                  >
                    Continue as guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Profile Sync Prompt - when detected cancer type differs from profile */}
      {showProfileSyncPrompt && detectedCancerType && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium mb-1">We detected your cancer type</p>
                <p className="text-sm text-emerald-100 mb-3">
                  Your record shows <span className="font-semibold text-white">{detectedCancerType}</span>
                  {detectedStage && <> (Stage {detectedStage})</>}. Update your profile for personalized guidance?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleProfileSync()
                      trackEvent('friction_prompt_accepted', { type: 'profile_sync', detected: detectedCancerType })
                    }}
                    className="px-4 py-2 bg-white text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 transition-colors text-sm"
                  >
                    Yes, update profile
                  </button>
                  <button
                    onClick={() => {
                      dismissPrompt('profile_sync')
                      trackEvent('friction_prompt_dismissed', { type: 'profile_sync', detected: detectedCancerType })
                    }}
                    className="px-3 py-2 text-emerald-200 hover:text-white transition-colors text-sm"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-4 relative">
          {/* File Attachment Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-2">
              {attachedFiles.map((attachment, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    attachment.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : attachment.status === 'ready'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Preview thumbnail */}
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{attachment.file.name}</p>
                    {attachment.status === 'pending' || attachment.status === 'processing' ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        Analyzing document...
                      </div>
                    ) : attachment.status === 'error' ? (
                      <p className="text-xs text-red-600 mt-1">{attachment.error}</p>
                    ) : attachment.extractedEntities && attachment.extractedEntities.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attachment.extractedEntities.slice(0, 4).map((entity, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                            {entity.type}: {entity.value}
                          </span>
                        ))}
                        {attachment.extractedEntities.length > 4 && (
                          <span className="text-[10px] text-slate-500">+{attachment.extractedEntities.length - 4} more</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 mt-1">Ready to include in question</p>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={removeAttachment}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className={`flex items-end gap-2 bg-gray-50 border rounded-2xl p-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-slate-100 ${
              isDraggingFile
                ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                : 'border-gray-300 focus-within:border-slate-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drop zone overlay */}
            {isDraggingFile && (
              <div className="absolute inset-0 flex items-center justify-center bg-amber-50/90 rounded-2xl border-2 border-dashed border-amber-400 z-10 pointer-events-none">
                <div className="text-center">
                  <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-700">Drop your medical record here</p>
                  <p className="text-xs text-amber-600">PDF, JPG, PNG supported</p>
                </div>
              </div>
            )}
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attachment Button - with subtle glow for new users */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile || isLoading}
              className={`flex-shrink-0 p-2 rounded-xl transition-all duration-300 disabled:opacity-50 relative group ${
                !hasPatientContext && messages.length <= 2 && !attachedFiles.length
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                  : 'text-gray-400 hover:text-slate-600 hover:bg-stone-100'
              }`}
              title="Attach a medical record (PDF, image)"
            >
              {/* Subtle glow animation for new users - breathing effect */}
              {!hasPatientContext && messages.length <= 2 && !attachedFiles.length && (
                <span
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-200 to-orange-200 opacity-0"
                  style={{
                    animation: 'breathe 2.5s ease-in-out infinite',
                  }}
                />
              )}
              <svg
                className={`w-5 h-5 relative transition-transform duration-300 ${
                  !hasPatientContext && messages.length <= 2 && !attachedFiles.length
                    ? 'group-hover:scale-110'
                    : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <style jsx>{`
                @keyframes breathe {
                  0%, 100% { opacity: 0; transform: scale(0.95); }
                  50% { opacity: 0.4; transform: scale(1.05); }
                }
              `}</style>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isProcessingFile
                  ? "Analyzing your document..."
                  : attachedFiles.some(f => f.status === 'ready')
                    ? "Ask about this document..."
                    : "Ask anything, or drag & drop your records..."
              }
              disabled={isProcessingFile}
              className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 min-h-[40px] max-h-[120px] py-2 text-gray-900 placeholder-gray-400 disabled:cursor-wait"
              rows={1}
            />

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-slate-600 hover:bg-stone-100 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Send Button - disabled while processing file */}
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading || isProcessingFile}
              title={isProcessingFile ? "Wait for document to finish processing" : "Send message"}
              className="flex-shrink-0 p-2 bg-[#C66B4A] hover:bg-[#B35E40] disabled:bg-gray-300 disabled:cursor-wait text-white rounded-xl transition-all shadow-md"
            >
              {isProcessingFile ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Settings badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {cancerType && (
              <>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                  {CANCER_TYPES[cancerType] || cancerType}
                </span>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="text-xs text-gray-500 hover:text-slate-700"
                >
                  Change
                </button>
              </>
            )}
            {conciseMode && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-200 transition-colors"
                title="Click to change"
              >
                Concise Mode ON
              </button>
            )}
            {hasPatientContext && (
              <span
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1"
                title="Your uploaded documents are being used to personalize answers"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Personalized
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-2">
            AI-generated educational information only. Not medical advice. In emergencies, call 911.
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chat Settings</h2>
                <p className="text-sm text-gray-600">Personalize your experience</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select your cancer type for personalized guidance:</h3>

              {/* Search filter */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search cancer types..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  onChange={(e) => {
                    const searchEl = e.target.closest('.p-6')?.querySelector('[data-cancer-grid]')
                    if (searchEl) {
                      const buttons = searchEl.querySelectorAll('[data-cancer-type]')
                      const searchTerm = e.target.value.toLowerCase()
                      buttons.forEach((btn: Element) => {
                        const type = btn.getAttribute('data-cancer-type') || ''
                        const label = CANCER_TYPES[type]?.toLowerCase() || ''
                        const matches = label.includes(searchTerm) || type.includes(searchTerm)
                        ;(btn as HTMLElement).style.display = matches ? '' : 'none'
                      })
                      // Hide empty categories
                      const categories = searchEl.querySelectorAll('[data-category]')
                      categories.forEach((cat: Element) => {
                        const visibleButtons = cat.querySelectorAll('[data-cancer-type]:not([style*="display: none"])')
                        ;(cat as HTMLElement).style.display = visibleButtons.length > 0 ? '' : 'none'
                      })
                    }
                  }}
                />
              </div>

              <div className="space-y-4" data-cancer-grid>
                {/* Common Types - Featured */}
                <div data-category="common">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-semibold">Common Types</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.common.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lymphoma - Expanded */}
                <div data-category="lymphoma">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Lymphoma</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.lymphoma.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leukemia */}
                <div data-category="leukemia">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Leukemia</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.leukemia.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Blood Disorders */}
                <div data-category="blood_other">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Other Blood Disorders</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.blood_other.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GI Cancers */}
                <div data-category="gi">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">GI & Digestive</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.gi.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gynecologic */}
                <div data-category="gynecologic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Gynecologic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.gynecologic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urologic */}
                <div data-category="urologic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Urologic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.urologic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Head & Neck */}
                <div data-category="head_neck">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Head & Neck</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.head_neck.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brain & CNS */}
                <div data-category="brain">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Brain & CNS</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.brain.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thoracic */}
                <div data-category="thoracic">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Thoracic</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.thoracic.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin */}
                <div data-category="skin">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Skin</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.skin.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sarcoma */}
                <div data-category="sarcoma">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Sarcoma</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.sarcoma.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pediatric */}
                <div data-category="pediatric">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Pediatric</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.pediatric.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rare & Other */}
                <div data-category="rare">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Rare & Other</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCER_CATEGORIES.rare.types.map((code) => (
                      <button
                        key={code}
                        data-cancer-type={code}
                        onClick={() => {
                          setCancerType(code)
                          setShowSettingsModal(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                          cancerType === code
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-slate-400 hover:bg-stone-50'
                        }`}
                      >
                        {CANCER_TYPES[code]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Selection */}
                {cancerType && (
                  <button
                    onClick={() => {
                      setCancerType('')
                      setShowSettingsModal(false)
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                  >
                    Clear Selection
                  </button>
                )}

                {/* Concise Mode Toggle */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Concise Mode</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Just the facts - no suggestions or questions</p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !conciseMode
                        setConciseMode(newValue)
                        localStorage.setItem('ask-concise-mode', String(newValue))
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        conciseMode ? 'bg-slate-900' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          conciseMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {conciseMode && (
                    <p className="mt-2 text-xs text-slate-600 bg-stone-100 px-3 py-2 rounded-lg">
                      Responses will be shorter and focused on facts only.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        prefillEmail={wizardProfileEmail || undefined}
        wizardCompleted={!!wizardProfileEmail}
      />
    </div>
  )
}

// Wrap with Suspense for useSearchParams
export default function AskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>}>
      <AskPageContent />
    </Suspense>
  )
}
