'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, ChevronRight, Edit3, X, Dna, TestTube, Microscope, Activity } from 'lucide-react'

export interface DetectedFinding {
  id: string
  category: 'biomarker' | 'mutation' | 'diagnosis' | 'stage' | 'treatment'
  label: string
  value: string
  source: string // which document it came from
  confidence: 'high' | 'medium' | 'low'
  clinicalNote?: string // e.g., "This would make you eligible for PARP inhibitors"
}

export interface FindingCorrection {
  findingId: string
  originalValue: string
  correctedValue: string
  correctionType: 'wrong' | 'incomplete' | 'misclassified'
  note?: string
}

interface CombatVerificationProps {
  findings: DetectedFinding[]
  onConfirm: (corrections: FindingCorrection[]) => void
  onSkip: () => void
  isLoading?: boolean
}

const categoryConfig = {
  biomarker: { icon: Dna, label: 'Biomarker', color: 'purple' },
  mutation: { icon: TestTube, label: 'Genetic Finding', color: 'violet' },
  diagnosis: { icon: Microscope, label: 'Diagnosis', color: 'blue' },
  stage: { icon: Activity, label: 'Stage/Grade', color: 'amber' },
  treatment: { icon: Activity, label: 'Treatment', color: 'green' },
}

// Smart quick corrections based on finding context
interface QuickCorrection {
  label: string
  value: string
  note?: string
}

function getQuickCorrections(finding: DetectedFinding): QuickCorrection[] {
  const upperLabel = finding.label.toUpperCase()
  const upperValue = finding.value.toUpperCase()

  // HRR genes (BRCA, ATM, PALB2, CHEK2, RAD51, etc.)
  if (/\b(HRR|BRCA|ATM|PALB2|CHEK2|RAD51|CDK12|FANCA)\b/.test(upperLabel) ||
      /\b(HRR|BRCA|ATM|PALB2|CHEK2|RAD51|CDK12|FANCA)\b/.test(upperValue)) {
    return [
      { label: "It's a SNP, not pathogenic", value: 'SNP (polymorphism) - not a pathogenic mutation', note: 'Common population variant, not clinically actionable' },
      { label: "It's a VUS", value: 'VUS (variant of uncertain significance)', note: 'Not clinically actionable - may be reclassified in future' },
      { label: 'Germline, not somatic', value: 'Germline (inherited) mutation', note: 'Has implications for family members' },
      { label: 'Somatic, not germline', value: 'Somatic (tumor-only) mutation', note: 'Acquired mutation, not inherited' },
      { label: 'Result is negative', value: 'Negative / No pathogenic variant detected' },
    ]
  }

  // HER2
  if (/\bHER2\b/.test(upperLabel) || /\bHER2\b/.test(upperValue)) {
    return [
      { label: 'HER2 negative', value: 'HER2 negative (0 or 1+ by IHC)' },
      { label: 'HER2-low', value: 'HER2-low (1+ or 2+/FISH negative)', note: 'May be eligible for T-DXd' },
      { label: 'HER2 equivocal', value: 'HER2 equivocal (2+) - awaiting FISH' },
      { label: 'HER2 positive', value: 'HER2 positive (3+ or FISH amplified)' },
    ]
  }

  // MSI/MMR
  if (/\b(MSI|MMR|dMMR|pMMR)\b/.test(upperLabel) || /\b(MSI|MMR)\b/.test(upperValue)) {
    return [
      { label: 'MSI-High', value: 'MSI-High / dMMR', note: 'May respond to immunotherapy' },
      { label: 'MSS (stable)', value: 'MSS / pMMR (microsatellite stable)' },
      { label: 'Not yet tested', value: 'MSI/MMR testing not completed' },
    ]
  }

  // PD-L1
  if (/\bPD-?L1\b/.test(upperLabel) || /\bPD-?L1\b/.test(upperValue)) {
    return [
      { label: 'PD-L1 negative', value: 'PD-L1 negative (<1%)' },
      { label: 'PD-L1 low', value: 'PD-L1 low (1-49%)' },
      { label: 'PD-L1 high', value: 'PD-L1 high (≥50%)', note: 'Strong candidate for immunotherapy' },
      { label: 'Not yet tested', value: 'PD-L1 testing not completed' },
    ]
  }

  // EGFR, ALK, ROS1, KRAS - lung cancer mutations
  if (/\b(EGFR|ALK|ROS1|KRAS|RET|MET|NTRK|BRAF)\b/.test(upperLabel)) {
    return [
      { label: 'Mutation detected', value: `${finding.label} mutation detected`, note: 'May be eligible for targeted therapy' },
      { label: 'No mutation', value: `${finding.label} wild-type / no mutation detected` },
      { label: "It's a VUS", value: 'VUS (variant of uncertain significance)', note: 'Not clinically actionable' },
      { label: 'Not yet tested', value: `${finding.label} testing not completed` },
    ]
  }

  // Default for other mutations/biomarkers
  return [
    { label: "It's a SNP", value: 'SNP (polymorphism), not pathogenic mutation', note: 'Common population variant' },
    { label: "It's a VUS", value: 'VUS (variant of uncertain significance)', note: 'Not clinically actionable' },
    { label: 'Result is different', value: 'Result differs from what is shown' },
    { label: 'Not yet tested', value: 'Testing not yet completed' },
  ]
}

function QuickCorrectionButtons({
  finding,
  onSelect
}: {
  finding: DetectedFinding
  onSelect: (value: string, note?: string) => void
}) {
  const corrections = getQuickCorrections(finding)

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Quick corrections:</p>
      <div className="flex flex-wrap gap-2">
        {corrections.map((correction, i) => (
          <button
            key={i}
            onClick={() => onSelect(correction.value, correction.note)}
            className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-left"
          >
            {correction.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CombatVerification({ findings, onConfirm, onSkip, isLoading }: CombatVerificationProps) {
  const [corrections, setCorrections] = useState<Map<string, FindingCorrection>>(new Map())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editNote, setEditNote] = useState('')

  const handleMarkWrong = (finding: DetectedFinding) => {
    setEditingId(finding.id)
    setEditValue('')
    setEditNote('')
  }

  const handleSaveCorrection = (finding: DetectedFinding, correctionType: 'wrong' | 'incomplete' | 'misclassified') => {
    const correction: FindingCorrection = {
      findingId: finding.id,
      originalValue: finding.value,
      correctedValue: editValue || `NOT ${finding.value}`,
      correctionType,
      note: editNote || undefined,
    }
    setCorrections(prev => new Map(prev).set(finding.id, correction))
    setEditingId(null)
    setEditValue('')
    setEditNote('')
  }

  const handleRemoveCorrection = (findingId: string) => {
    setCorrections(prev => {
      const next = new Map(prev)
      next.delete(findingId)
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(corrections.values()))
  }

  // Group findings by category
  const groupedFindings = findings.reduce((acc, finding) => {
    if (!acc[finding.category]) acc[finding.category] = []
    acc[finding.category].push(finding)
    return acc
  }, {} as Record<string, DetectedFinding[]>)

  const hasCorrections = corrections.size > 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Verify Your Information</h3>
            <p className="text-sm text-slate-500 mt-1">
              We found these details in your records. Please confirm they&apos;re correct before we analyze.
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip verification
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {Object.entries(groupedFindings).map(([category, categoryFindings]) => {
          const config = categoryConfig[category as keyof typeof categoryConfig]
          const Icon = config?.icon || Activity

          return (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-${config?.color || 'slate'}-100 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${config?.color || 'slate'}-600`} />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {config?.label || category}
                </span>
              </div>

              {/* Findings in this category */}
              <div className="space-y-2 ml-10">
                {categoryFindings.map((finding) => {
                  const isEditing = editingId === finding.id
                  const correction = corrections.get(finding.id)
                  const isConfirmed = !correction && !isEditing

                  return (
                    <div
                      key={finding.id}
                      className={`rounded-xl border transition-all ${
                        correction
                          ? 'border-amber-200 bg-amber-50'
                          : isEditing
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">{finding.label}</span>
                              {finding.confidence === 'low' && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                  Uncertain
                                </span>
                              )}
                            </div>

                            {correction ? (
                              <div className="mt-1">
                                <span className="text-sm line-through text-slate-400">{finding.value}</span>
                                <span className="text-sm text-amber-700 ml-2">→ {correction.correctedValue}</span>
                                {correction.note && (
                                  <p className="text-xs text-slate-500 mt-1">{correction.note}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-900 mt-0.5">{finding.value}</p>
                            )}

                            {finding.clinicalNote && !correction && (
                              <p className="text-xs text-slate-500 mt-2 italic">
                                {finding.clinicalNote}
                              </p>
                            )}

                            <p className="text-xs text-slate-400 mt-1">
                              Source: {finding.source}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1">
                            {correction ? (
                              <button
                                onClick={() => handleRemoveCorrection(finding.id)}
                                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                title="Remove correction"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : isEditing ? null : (
                              <>
                                <button
                                  onClick={() => handleMarkWrong(finding)}
                                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="This is wrong"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <div className="p-2 text-green-500">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Editing interface */}
                        {isEditing && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                What&apos;s the correct information?
                              </label>
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder={`e.g., "SNP, not pathogenic mutation" or "Stage IIA, not IIIA"`}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Additional context (optional)
                              </label>
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="e.g., Confirmed by genetic counselor"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                              />
                            </div>

                            {/* Quick correction buttons - context-aware based on finding */}
                            {(finding.category === 'mutation' || finding.category === 'biomarker') && (
                              <QuickCorrectionButtons
                                finding={finding}
                                onSelect={(value, note) => {
                                  setEditValue(value)
                                  if (note) setEditNote(note)
                                }}
                              />
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={() => {
                                  setEditingId(null)
                                  setEditValue('')
                                  setEditNote('')
                                }}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveCorrection(finding, 'wrong')}
                                disabled={!editValue.trim()}
                                className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors"
                              >
                                Save Correction
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {findings.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500">No specific findings detected to verify.</p>
            <p className="text-sm text-slate-400 mt-1">The analysis will proceed with the information in your records.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            {hasCorrections && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {corrections.size} correction{corrections.size !== 1 ? 's' : ''} will be applied
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>{hasCorrections ? 'Apply & Analyze' : 'Confirm & Analyze'}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
