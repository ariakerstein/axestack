'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FileText, User, Calendar, Pill, FlaskConical, Activity, Download, ChevronDown, ChevronUp, PenLine, Clock } from 'lucide-react'

interface TranslationResult {
  document_type: string
  patient_name: string
  date_of_service: string
  provider_name: string
  institution: string
  diagnosis: string[]
  test_summary: string
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
}

interface SavedRecord {
  id: string
  fileName: string
  date: string
  documentType: string
  result: TranslationResult
  corrections?: Record<string, { corrected: string; note?: string }>
}

interface ProfileData {
  name?: string
  cancerType?: string
  stage?: string
  diagnosisDate?: string
  role?: 'patient' | 'caregiver'
}

export default function CaseFilePage() {
  const [records, setRecords] = useState<SavedRecord[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [patientNotes, setPatientNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'records']))

  useEffect(() => {
    // Load records
    const recordsData = localStorage.getItem('axestack-translations-data')
    if (recordsData) {
      try {
        const translations = JSON.parse(recordsData)
        const recordList: SavedRecord[] = Object.values(translations)
        recordList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecords(recordList)
      } catch (e) {
        console.error('Failed to load records:', e)
      }
    }

    // Load profile
    const profileData = localStorage.getItem('patient-profile')
    if (profileData) {
      try {
        setProfile(JSON.parse(profileData))
      } catch (e) {
        console.error('Failed to load profile:', e)
      }
    }

    // Load patient notes
    const notes = localStorage.getItem('axestack-patient-notes')
    if (notes) {
      setPatientNotes(notes)
    }

    setLoading(false)
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // Extract aggregated data from all records
  const aggregateData = () => {
    const diagnoses = new Set<string>()
    const biomarkers = new Set<string>()
    const treatments = new Set<string>()
    const providers = new Set<string>()
    const institutions = new Set<string>()
    const labResults: Array<{ test: string; value: string; date: string; status: string }> = []
    let cancerType = ''
    let stage = ''

    records.forEach(record => {
      const r = record.result
      const corrections = record.corrections || {}

      // Get corrected values if available
      const getDiagnosis = () => {
        if (corrections['diagnosis']) return corrections['diagnosis'].corrected
        return r.diagnosis?.join(', ') || ''
      }
      const getCancerType = () => corrections['cancer_type']?.corrected || r.cancer_specific?.cancer_type
      const getStage = () => corrections['stage']?.corrected || r.cancer_specific?.stage

      // Collect diagnoses
      if (r.diagnosis) {
        r.diagnosis.forEach(d => {
          if (d && d !== 'unknown' && d !== 'Not specified') diagnoses.add(d)
        })
      }

      // Collect biomarkers
      if (r.cancer_specific?.biomarkers) {
        r.cancer_specific.biomarkers.forEach(b => {
          if (b && b !== 'unknown') biomarkers.add(b)
        })
      }

      // Get cancer type and stage (use most recent)
      const ct = getCancerType()
      if (ct && ct !== 'unknown' && ct !== 'Not specified') {
        cancerType = ct
      }
      const st = getStage()
      if (st && st !== 'unknown' && st !== 'Not specified') {
        stage = st
      }

      // Collect providers and institutions
      if (r.provider_name && r.provider_name !== 'unknown') providers.add(r.provider_name)
      if (r.institution && r.institution !== 'unknown') institutions.add(r.institution)

      // Collect lab results
      if (r.lab_values?.key_results) {
        r.lab_values.key_results.forEach(lab => {
          labResults.push({
            test: lab.test,
            value: lab.value,
            date: r.date_of_service || record.date,
            status: lab.status,
          })
        })
      }
    })

    return {
      diagnoses: Array.from(diagnoses),
      biomarkers: Array.from(biomarkers),
      treatments: Array.from(treatments),
      providers: Array.from(providers),
      institutions: Array.from(institutions),
      labResults,
      cancerType: cancerType || profile?.cancerType || '',
      stage: stage || profile?.stage || '',
    }
  }

  const data = aggregateData()

  // Export as plain text
  const handleExport = () => {
    const lines: string[] = []
    lines.push('MY CASE FILE')
    lines.push('Generated from opencancer.ai')
    lines.push(`Date: ${new Date().toLocaleDateString()}`)
    lines.push('')
    lines.push('=' .repeat(50))
    lines.push('')

    // Overview
    lines.push('OVERVIEW')
    lines.push('-'.repeat(30))
    if (profile?.name) lines.push(`Name: ${profile.name}`)
    if (data.cancerType) lines.push(`Cancer Type: ${data.cancerType}`)
    if (data.stage) lines.push(`Stage: ${data.stage}`)
    if (data.diagnoses.length > 0) lines.push(`Diagnoses: ${data.diagnoses.join(', ')}`)
    if (data.biomarkers.length > 0) lines.push(`Biomarkers: ${data.biomarkers.join(', ')}`)
    lines.push('')

    // Records summary
    lines.push('MEDICAL RECORDS')
    lines.push('-'.repeat(30))
    records.forEach((record, i) => {
      lines.push(`${i + 1}. ${record.fileName}`)
      lines.push(`   Type: ${record.documentType}`)
      lines.push(`   Date: ${record.result.date_of_service || record.date}`)
      if (record.result.provider_name !== 'unknown') {
        lines.push(`   Provider: ${record.result.provider_name}`)
      }
      lines.push(`   Summary: ${record.result.test_summary}`)
      lines.push('')
    })

    // Lab results
    if (data.labResults.length > 0) {
      lines.push('LAB RESULTS')
      lines.push('-'.repeat(30))
      data.labResults.forEach(lab => {
        lines.push(`${lab.test}: ${lab.value} (${lab.status}) - ${lab.date}`)
      })
      lines.push('')
    }

    // Patient notes
    if (patientNotes) {
      lines.push('MY NOTES')
      lines.push('-'.repeat(30))
      lines.push(patientNotes)
      lines.push('')
    }

    // Care team
    if (data.providers.length > 0 || data.institutions.length > 0) {
      lines.push('CARE TEAM')
      lines.push('-'.repeat(30))
      if (data.providers.length > 0) lines.push(`Providers: ${data.providers.join(', ')}`)
      if (data.institutions.length > 0) lines.push(`Institutions: ${data.institutions.join(', ')}`)
    }

    const text = lines.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-case-file-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">
              opencancer
            </span>
            <span className="text-lg font-bold text-slate-400">.ai</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/records" className="text-slate-600 hover:text-violet-600 transition-colors">
              Records
            </Link>
            <span className="text-violet-600 font-medium">My Case File</span>
            <Link href="/ask" className="text-slate-600 hover:text-violet-600 transition-colors">
              Ask Navis
            </Link>
          </nav>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Case File</h1>
          <p className="text-slate-600 mt-1">All your medical information in one place - just the facts.</p>
        </div>

        {records.length === 0 && !patientNotes ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No Data Yet</h2>
            <p className="text-slate-600 mb-4">Upload medical records or add notes to build your case file.</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/records"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
              >
                Upload Records
              </Link>
              <Link
                href="/records/case-review"
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium"
              >
                Add Notes
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview Section */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('overview')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-slate-900">Overview</h2>
                    <p className="text-sm text-slate-500">Cancer type, stage, biomarkers</p>
                  </div>
                </div>
                {expandedSections.has('overview') ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections.has('overview') && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {data.cancerType && (
                      <div className="bg-violet-50 rounded-lg p-3">
                        <p className="text-xs text-violet-600 font-medium uppercase">Cancer Type</p>
                        <p className="text-slate-900 font-semibold mt-1">{data.cancerType}</p>
                      </div>
                    )}
                    {data.stage && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium uppercase">Stage</p>
                        <p className="text-slate-900 font-semibold mt-1">{data.stage}</p>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 font-medium uppercase">Records</p>
                      <p className="text-slate-900 font-semibold mt-1">{records.length}</p>
                    </div>
                  </div>

                  {data.diagnoses.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 font-medium uppercase mb-2">Diagnoses</p>
                      <div className="flex flex-wrap gap-2">
                        {data.diagnoses.map((d, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.biomarkers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 font-medium uppercase mb-2">Biomarkers</p>
                      <div className="flex flex-wrap gap-2">
                        {data.biomarkers.map((b, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Records Section */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection('records')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-slate-900">Medical Records ({records.length})</h2>
                    <p className="text-sm text-slate-500">Uploaded documents and extractions</p>
                  </div>
                </div>
                {expandedSections.has('records') ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections.has('records') && (
                <div className="border-t border-slate-100">
                  {records.map((record, i) => (
                    <div
                      key={record.id}
                      className={`px-4 py-3 ${i !== records.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm font-medium text-slate-500">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{record.fileName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>{record.documentType}</span>
                            <span>·</span>
                            <span>{record.result.date_of_service || new Date(record.date).toLocaleDateString()}</span>
                            {record.result.provider_name !== 'unknown' && (
                              <>
                                <span>·</span>
                                <span>{record.result.provider_name}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {record.result.test_summary}
                          </p>
                          {record.corrections && Object.keys(record.corrections).length > 0 && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <PenLine className="w-3 h-3" />
                              Has corrections
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-slate-50">
                    <Link
                      href="/records"
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      + Add more records
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* Lab Results Section */}
            {data.labResults.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('labs')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-semibold text-slate-900">Lab Results ({data.labResults.length})</h2>
                      <p className="text-sm text-slate-500">Extracted from your records</p>
                    </div>
                  </div>
                  {expandedSections.has('labs') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedSections.has('labs') && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="mt-4 space-y-2">
                      {data.labResults.slice(0, 20).map((lab, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{lab.test}</p>
                            <p className="text-xs text-slate-500">{lab.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{lab.value}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              lab.status === 'Normal' ? 'bg-green-100 text-green-700' :
                              lab.status === 'Abnormal' ? 'bg-amber-100 text-amber-700' :
                              lab.status === 'Critical' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {lab.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Patient Notes Section */}
            {patientNotes && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('notes')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <PenLine className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-semibold text-slate-900">My Notes</h2>
                      <p className="text-sm text-slate-500">Your added context and corrections</p>
                    </div>
                  </div>
                  {expandedSections.has('notes') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedSections.has('notes') && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{patientNotes}</p>
                    <Link
                      href="/records/case-review"
                      className="inline-block mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Edit notes
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* Care Team Section */}
            {(data.providers.length > 0 || data.institutions.length > 0) && (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('team')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-fuchsia-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-fuchsia-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-semibold text-slate-900">Care Team</h2>
                      <p className="text-sm text-slate-500">Providers and institutions from records</p>
                    </div>
                  </div>
                  {expandedSections.has('team') ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {expandedSections.has('team') && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    {data.providers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-2">Providers</p>
                        <div className="flex flex-wrap gap-2">
                          {data.providers.map((p, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.institutions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-2">Institutions</p>
                        <div className="flex flex-wrap gap-2">
                          {data.institutions.map((inst, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Quick Links */}
            <div className="bg-slate-100 rounded-xl p-4 mt-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/records"
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:border-violet-300 transition-colors"
                >
                  + Add Records
                </Link>
                <Link
                  href="/records/case-review"
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:border-violet-300 transition-colors"
                >
                  Get AI Case Brief
                </Link>
                <Link
                  href="/ask"
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:border-violet-300 transition-colors"
                >
                  Ask Navis
                </Link>
                <a
                  href="https://navis.health/home?tab=decisions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:border-violet-300 transition-colors"
                >
                  Research & Literature
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
