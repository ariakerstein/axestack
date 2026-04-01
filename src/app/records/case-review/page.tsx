'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { FileText, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, ArrowLeft, Calendar, FlaskConical, Pill, Activity, HelpCircle, CheckCircle, XCircle, Info, Download, RefreshCw, Lightbulb, Brain } from 'lucide-react'
import { TypewriterMarkdown } from '@/components/TypewriterMarkdown'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ShareButton } from '@/components/ShareButton'

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
}

interface SavedTranslation {
  id: string
  fileName: string
  date: string
  documentType: string
  result: TranslationResult
  documentText?: string
}

interface CaseBrief {
  bottomLine: string
  keyFindings: string[]
  gaps: string[]
  questionsForDoctor: string[]
  timeline: Array<{ date: string; event: string; source: string }>
  cancerSummary?: {
    type: string
    stage: string
    biomarkers: string[]
    treatments: string[]
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isNew?: boolean
}

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

export default function CaseReviewPage() {
  const [records, setRecords] = useState<SavedTranslation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [caseBrief, setCaseBrief] = useState<CaseBrief | null>(null)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('brief')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { trackEvent } = useAnalytics()

  // Load all saved records on mount
  useEffect(() => {
    const loadRecords = () => {
      const data = localStorage.getItem('axestack-translations-data')
      if (!data) {
        setLoading(false)
        return
      }

      try {
        const translations = JSON.parse(data)
        const recordList: SavedTranslation[] = Object.values(translations)
        // Sort by date, newest first
        recordList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecords(recordList)

        // Load saved case brief if record count matches
        const savedBrief = localStorage.getItem('axestack-case-brief')
        if (savedBrief) {
          try {
            const { brief, recordCount } = JSON.parse(savedBrief)
            // Only use saved brief if record count matches (otherwise regenerate)
            if (recordCount === recordList.length) {
              setCaseBrief(brief)
            }
          } catch (e) {
            console.log('Could not load saved case brief')
          }
        }
      } catch (err) {
        console.error('Failed to load records:', err)
      }
      setLoading(false)
    }

    loadRecords()
  }, [])

  // Generate case brief when records load
  useEffect(() => {
    if (records.length > 0 && !caseBrief && !generating) {
      generateCaseBrief()
    }
  }, [records])

  const generateCaseBrief = async () => {
    if (records.length === 0) return
    setGenerating(true)

    try {
      // Build context from all records
      const recordsSummary = records.map(r => {
        const result = r.result
        return `
DOCUMENT: ${r.fileName} (${r.documentType})
Date: ${result.date_of_service || r.date}
Summary: ${result.test_summary}
Diagnosis: ${result.diagnosis?.join(', ') || 'Not specified'}
Cancer Type: ${result.cancer_specific?.cancer_type || 'Not specified'}
Stage: ${result.cancer_specific?.stage || 'Not specified'}
Biomarkers: ${result.cancer_specific?.biomarkers?.join(', ') || 'None listed'}
Key Labs: ${result.lab_values?.key_results?.map(l => `${l.test}: ${l.value}`).join(', ') || 'None'}
Next Steps: ${result.recommended_next_steps?.join(', ') || 'None listed'}
        `.trim()
      }).join('\n\n---\n\n')

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are helping a cancer patient understand their complete medical case. Based on these ${records.length} medical records, create a comprehensive case brief.

MEDICAL RECORDS:
${recordsSummary}

Please provide a JSON response with this exact structure:
{
  "bottomLine": "A 2-3 sentence executive summary of the patient's cancer case - the most important things to know",
  "keyFindings": ["Array of 4-6 key findings from across all records"],
  "gaps": ["Array of 2-4 potential gaps - what records might be missing, what tests haven't been done, etc."],
  "questionsForDoctor": ["Array of 3-5 questions the patient should ask their oncologist based on these records"],
  "timeline": [{"date": "YYYY-MM-DD or Month YYYY", "event": "What happened", "source": "Document name"}],
  "cancerSummary": {
    "type": "Cancer type if known",
    "stage": "Stage if known",
    "biomarkers": ["List of biomarkers found"],
    "treatments": ["List of treatments mentioned"]
  }
}

Be thorough but patient-friendly. Use plain language. If information is missing or unclear, note that in the gaps section.`,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate case brief')
      const data = await response.json()

      // Parse the JSON from the response
      try {
        // Extract JSON from the response (it might be wrapped in markdown)
        const jsonMatch = data.response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const brief = JSON.parse(jsonMatch[0])
          setCaseBrief(brief)
          // Save to localStorage for persistence
          localStorage.setItem('axestack-case-brief', JSON.stringify({
            brief,
            generatedAt: new Date().toISOString(),
            recordCount: records.length,
          }))
          trackEvent('case_review_generated', {
            record_count: records.length,
            has_cancer_info: brief.cancerSummary?.type !== undefined,
          })
        }
      } catch (parseErr) {
        console.error('Failed to parse case brief JSON:', parseErr)
        // Create a basic brief from the text response
        setCaseBrief({
          bottomLine: data.response.substring(0, 500),
          keyFindings: ['Unable to parse structured findings - see summary above'],
          gaps: ['Please review your records manually'],
          questionsForDoctor: ['Ask your doctor to review these records with you'],
          timeline: [],
        })
      }
    } catch (err) {
      console.error('Failed to generate case brief:', err)
    } finally {
      setGenerating(false)
    }
  }

  const toggleRecord = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Open chat with a pre-filled question
  const askAbout = (topic: string) => {
    setChatInput(`Tell me more about: "${topic}"`)
    setChatOpen(true)
    setTimeout(() => handleAskQuestion(), 100)
  }

  // Export case review as PDF
  const handleExportPDF = () => {
    if (!caseBrief || records.length === 0) return

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Case Review - opencancer.ai</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.6; }
    .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; background: linear-gradient(to right, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #64748b; font-size: 14px; margin-top: 8px; }
    .disclaimer { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .disclaimer p { color: #92400e; font-size: 14px; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #1e293b; }
    h2 { font-size: 16px; color: #7c3aed; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    p { margin-bottom: 12px; }
    ul { margin-left: 20px; margin-bottom: 16px; }
    li { margin-bottom: 8px; }
    .bottom-line { background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .cancer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .cancer-item { background: #f8fafc; padding: 12px; border-radius: 8px; }
    .cancer-item .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .cancer-item .value { font-weight: 600; color: #1e293b; }
    .finding { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
    .gap { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
    .question { background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 12px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
    .records { margin-top: 24px; }
    .record { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .record .name { font-weight: 600; color: #1e293b; }
    .record .details { font-size: 12px; color: #64748b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">opencancer.ai</div>
    <h1>AI Case Review</h1>
    <div class="meta">Generated on ${new Date().toLocaleDateString()} • ${records.length} records analyzed</div>
  </div>

  <div class="disclaimer">
    <p><strong>Important:</strong> This AI-generated summary is for educational purposes only and is not medical advice. AI can make mistakes. Always verify this information with your oncologist. This review is based only on ${records.length} uploaded records.</p>
  </div>

  <h2>The Bottom Line</h2>
  <div class="bottom-line">
    <p>${caseBrief.bottomLine}</p>
  </div>

  ${caseBrief.cancerSummary?.type ? `
  <h2>Cancer Overview</h2>
  <div class="cancer-grid">
    <div class="cancer-item">
      <div class="label">Type</div>
      <div class="value">${caseBrief.cancerSummary.type}</div>
    </div>
    <div class="cancer-item">
      <div class="label">Stage</div>
      <div class="value">${caseBrief.cancerSummary.stage || 'Not specified'}</div>
    </div>
  </div>
  ${Array.isArray(caseBrief.cancerSummary.biomarkers) && caseBrief.cancerSummary.biomarkers.length > 0 ? `
  <p><strong>Biomarkers:</strong> ${caseBrief.cancerSummary.biomarkers.join(', ')}</p>
  ` : ''}
  ${Array.isArray(caseBrief.cancerSummary.treatments) && caseBrief.cancerSummary.treatments.length > 0 ? `
  <p><strong>Treatments:</strong> ${caseBrief.cancerSummary.treatments.join(', ')}</p>
  ` : ''}
  ` : ''}

  <h2>Key Findings</h2>
  ${caseBrief.keyFindings.map((f, i) => `<div class="finding"><strong>${i + 1}.</strong> ${f}</div>`).join('')}

  <h2>Potential Gaps</h2>
  ${caseBrief.gaps.map(g => `<div class="gap">${g}</div>`).join('')}
  <p style="font-size: 12px; color: #92400e; margin-top: 8px;">Note: This analysis is based only on uploaded records. Your oncologist has access to your complete history.</p>

  <h2>Questions for Your Oncologist</h2>
  ${caseBrief.questionsForDoctor.map(q => `<div class="question">${q}</div>`).join('')}

  <div class="records">
    <h2>Records Analyzed (${records.length})</h2>
    ${records.map(r => `
    <div class="record">
      <div class="name">${r.fileName}</div>
      <div class="details">${r.documentType} • ${new Date(r.date).toLocaleDateString()}</div>
    </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>Generated by opencancer.ai AI Case Review</p>
    <p>This document is for educational purposes only. Not medical advice.</p>
    <p>© ${new Date().getFullYear()} opencancer.ai</p>
  </div>
</body>
</html>
`

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }

    trackEvent('case_review_export_pdf', {
      record_count: records.length,
    })
  }

  // Chat about the full case
  const handleAskQuestion = async () => {
    if (!chatInput.trim() || records.length === 0) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      // Build full case context
      const caseContext = records.map(r => {
        const result = r.result
        return `
[${r.fileName}] ${result.document_type} - ${result.date_of_service || r.date}
Summary: ${result.test_summary}
Diagnosis: ${result.diagnosis?.join(', ')}
${result.cancer_specific?.cancer_type !== 'unknown' ? `Cancer: ${result.cancer_specific.cancer_type} ${result.cancer_specific.stage}` : ''}
        `.trim()
      }).join('\n\n')

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are helping a cancer patient understand their complete medical case. Here is their case summary from ${records.length} records:

${caseContext}

${caseBrief ? `CASE BRIEF: ${caseBrief.bottomLine}` : ''}

Patient Question: ${userMessage}

Provide a helpful, educational response. Reference specific records when relevant. Always remind them to discuss with their healthcare provider.`,
          history: chatMessages.filter(m => !m.isNew),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')
      const data = await response.json()

      setChatMessages(prev => [
        ...prev.map(m => ({ ...m, isNew: false })),
        { role: 'assistant', content: data.response, isNew: true }
      ])

      trackEvent('case_review_chat', {
        question_length: userMessage.length,
        record_count: records.length,
      })

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AtomIcon size="md" />
          <p className="text-slate-500 mt-4">Loading your records...</p>
        </div>
      </div>
    )
  }

  if (records.length === 0) {
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
              <Link href="/records" className="text-violet-600 font-medium">
                Records
              </Link>
              <Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors">
                Ask AI
              </Link>
              <Link href="/trials" className="text-slate-600 hover:text-violet-600 transition-colors">
                Trials
              </Link>
            </nav>

            {/* Right side */}
            <div className="w-20" />
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">No Records to Review</h1>
          <p className="text-slate-600 mb-6">
            Upload some medical records first, then come back here to get a comprehensive case review.
          </p>
          <Link
            href="/records"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5" />
            Upload Records
          </Link>
        </div>
      </main>
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
            <Link href="/records" className="text-violet-600 font-medium">
              Records
            </Link>
            <Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors">
              Ask AI
            </Link>
            <Link href="/trials" className="text-slate-600 hover:text-violet-600 transition-colors">
              Trials
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ShareButton
              tool="case-review"
              title="Share Case Review"
              description="Help others review their medical records"
              variant="icon"
            />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Important Disclaimer</p>
              <p className="text-sm text-amber-700 mt-1">
                This AI-generated summary is for <strong>educational purposes only</strong> and is not medical advice.
                AI can make mistakes. Always verify this information with your oncologist.
                This review is based only on the {records.length} record{records.length !== 1 ? 's' : ''} you have uploaded.
                Your complete medical history may contain additional important information.
              </p>
            </div>
          </div>
        </div>

        {/* Records Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Analyzing {records.length} Record{records.length !== 1 ? 's' : ''}</p>
              <p className="text-sm text-slate-500">
                Latest: {new Date(records[0]?.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {caseBrief && (
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            )}
            <button
              onClick={generateCaseBrief}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'brief', label: 'Case Brief', icon: <Brain className="w-4 h-4" />, badge: null },
            { id: 'records', label: 'All Records', icon: <FileText className="w-4 h-4" />, badge: records.length },
            { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" />, badge: null },
            { id: 'questions', label: 'Questions', icon: <HelpCircle className="w-4 h-4" />, badge: caseBrief?.questionsForDoctor?.length || null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeSection === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-violet-100 text-violet-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Case Brief Section */}
        {activeSection === 'brief' && (
          <div className="space-y-4">
            {generating ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-600 mt-4">Generating your case brief...</p>
                <p className="text-sm text-slate-500 mt-2">Analyzing {records.length} records</p>
              </div>
            ) : caseBrief ? (
              <>
                {/* Bottom Line */}
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-violet-600" />
                    <h2 className="font-bold text-slate-900">The Bottom Line</h2>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{caseBrief.bottomLine}</p>
                </div>

                {/* Cancer Summary if available */}
                {caseBrief.cancerSummary && caseBrief.cancerSummary.type && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-violet-600" />
                      <h2 className="font-bold text-slate-900">Cancer Overview</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">Type</p>
                        <p className="font-semibold text-slate-900">{caseBrief.cancerSummary.type}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">Stage</p>
                        <p className="font-semibold text-slate-900">{caseBrief.cancerSummary.stage || 'Not specified'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                        <p className="text-xs text-slate-500 mb-1">Biomarkers</p>
                        <p className="font-semibold text-slate-900">
                          {Array.isArray(caseBrief.cancerSummary.biomarkers) && caseBrief.cancerSummary.biomarkers.length > 0
                            ? caseBrief.cancerSummary.biomarkers.join(', ')
                            : 'None listed'}
                        </p>
                      </div>
                    </div>
                    {Array.isArray(caseBrief.cancerSummary.treatments) && caseBrief.cancerSummary.treatments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 mb-2">Treatments Mentioned</p>
                        <div className="flex flex-wrap gap-2">
                          {caseBrief.cancerSummary.treatments.map((t, i) => (
                            <span key={i} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CancerCombat CTA */}
                <Link
                  href="/combat"
                  className="block bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">&#9876;</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">CancerCombat</p>
                      <p className="text-orange-100 text-sm">3 AI perspectives debate your diagnosis & treatment options</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-orange-200 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* Key Findings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h2 className="font-bold text-slate-900">Key Findings</h2>
                    </div>
                    <span className="text-xs text-slate-500">Tap to ask</span>
                  </div>
                  <ul className="space-y-3">
                    {caseBrief.keyFindings.map((finding, i) => (
                      <li
                        key={i}
                        onClick={() => askAbout(finding)}
                        className="flex items-start gap-3 bg-green-50 hover:bg-green-100 rounded-xl p-3 cursor-pointer transition-colors group"
                      >
                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-slate-800 flex-1">{finding}</span>
                        <span className="text-green-400 group-hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps / Missing Information */}
                <div className="bg-white border border-amber-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="w-5 h-5 text-amber-600" />
                    <h2 className="font-bold text-slate-900">Potential Gaps</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Review with your doctor</span>
                  </div>
                  <ul className="space-y-2">
                    {caseBrief.gaps.map((gap, i) => (
                      <li
                        key={i}
                        onClick={() => askAbout(gap)}
                        className="flex items-start gap-3 text-slate-700 bg-amber-50 hover:bg-amber-100 rounded-xl p-3 cursor-pointer transition-colors group"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{gap}</span>
                        <span className="text-amber-400 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <Info className="w-4 h-4 inline mr-1" />
                      This analysis is based only on uploaded records. Your oncologist has access to your complete history.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">Unable to generate case brief. Please try refreshing.</p>
                <button
                  onClick={generateCaseBrief}
                  className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* All Records Section */}
        {activeSection === 'records' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-4">
              Click on any record to see its full details
            </p>
            {records.map(record => (
              <div
                key={record.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleRecord(record.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{record.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{record.documentType}</span>
                      <span>·</span>
                      <span>{new Date(record.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {expandedRecords.has(record.id) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedRecords.has(record.id) && record.result && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Summary</p>
                        <p className="text-slate-800">{record.result.test_summary}</p>
                      </div>
                      {record.result.diagnosis?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Diagnosis</p>
                          <p className="text-slate-800">{record.result.diagnosis.join(', ')}</p>
                        </div>
                      )}
                      {record.result.cancer_specific?.cancer_type && record.result.cancer_specific.cancer_type !== 'unknown' && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Cancer Info</p>
                          <p className="text-slate-800">
                            {record.result.cancer_specific.cancer_type}
                            {record.result.cancer_specific.stage !== 'unknown' && ` - Stage ${record.result.cancer_specific.stage}`}
                          </p>
                        </div>
                      )}
                      {record.result.lab_values?.key_results?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Key Lab Values</p>
                          <div className="space-y-1">
                            {record.result.lab_values.key_results.slice(0, 5).map((lab, i) => (
                              <p key={i} className="text-slate-800">
                                {lab.test}: <span className="font-medium">{lab.value}</span>
                                <span className={`ml-2 text-xs ${
                                  lab.status === 'normal' ? 'text-green-600' :
                                  lab.status === 'abnormal' ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                  ({lab.status})
                                </span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <Link
                        href="/records"
                        onClick={() => {
                          // Set this record as active in records page
                          localStorage.setItem('axestack-view-record', record.id)
                        }}
                        className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 text-sm font-medium"
                      >
                        View full translation →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline Section */}
        {activeSection === 'timeline' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-violet-600" />
              <h2 className="font-bold text-slate-900">Your Care Timeline</h2>
            </div>

            {caseBrief?.timeline && caseBrief.timeline.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-violet-200" />
                <div className="space-y-4">
                  {caseBrief.timeline.map((event, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className="w-8 h-8 bg-violet-100 border-2 border-violet-300 rounded-full flex items-center justify-center z-10">
                        <div className="w-2 h-2 bg-violet-600 rounded-full" />
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1">{event.date}</p>
                        <p className="text-slate-800 font-medium">{event.event}</p>
                        <p className="text-xs text-slate-500 mt-1">Source: {event.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Timeline will appear after case analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Questions Section */}
        {activeSection === 'questions' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-violet-600" />
              <h2 className="font-bold text-slate-900">Questions for Your Oncologist</h2>
            </div>

            {caseBrief?.questionsForDoctor && caseBrief.questionsForDoctor.length > 0 ? (
              <div className="space-y-3">
                {caseBrief.questionsForDoctor.map((question, i) => (
                  <div
                    key={i}
                    onClick={() => askAbout(question)}
                    className="flex items-start gap-3 bg-violet-50 hover:bg-violet-100 rounded-xl p-4 cursor-pointer transition-colors group"
                  >
                    <span className="w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">
                      ?
                    </span>
                    <span className="text-slate-800 flex-1">{question}</span>
                    <span className="text-violet-400 group-hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Questions will appear after case analysis</p>
              </div>
            )}

            <Link
              href="/cancer-checklist"
              className="mt-6 flex items-center justify-between p-4 bg-violet-100 hover:bg-violet-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <div>
                  <p className="font-medium text-violet-900">Prepare for your appointment</p>
                  <p className="text-sm text-violet-700">Get your personalized Cancer Checklist</p>
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-violet-600 rotate-[-90deg]" />
            </Link>
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      {!chatOpen && records.length > 0 && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-full shadow-lg shadow-violet-500/30 transition-all hover:scale-105"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Ask about your case</span>
        </button>
      )}

      {/* Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-violet-600" />
              <div>
                <h3 className="font-semibold text-slate-900">Ask About Your Case</h3>
                <p className="text-xs text-slate-600">
                  {records.length} records loaded
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
                    I can help you understand your complete medical case based on all {records.length} records you've uploaded.
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-700 pt-2">Suggested questions</p>
                {[
                  "What are the most important findings across all my records?",
                  "Am I missing any important tests?",
                  "What questions should I ask my oncologist?",
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setChatInput(q); setTimeout(handleAskQuestion, 50) }}
                    className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 hover:text-violet-700 transition-colors border border-slate-100 hover:border-violet-200 group"
                  >
                    <span className="text-violet-400 group-hover:text-violet-600 text-lg">→</span>
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
                placeholder="Ask about your medical records..."
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

      {/* Backdrop for mobile */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setChatOpen(false)}
        />
      )}
    </main>
  )
}
