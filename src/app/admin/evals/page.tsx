'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Filter, BarChart3 } from 'lucide-react'

interface EvalLog {
  id: string
  question: string
  question_type: string
  cancer_type: string | null
  disease_states_detected: string[]
  evidence_tiers_cited: string[]
  treatment_options_count: number
  treatment_options_mentioned: string[]
  has_false_dichotomy: boolean
  dichotomy_signals: string[]
  hedging_phrase_count: number
  certainty_phrase_count: number
  uncertainty_ratio: number
  has_patient_context: boolean
  confidence_score: number | null
  feedback_type: string | null
  feedback_comment: string | null
  needs_expert_review: boolean
  created_at: string
}

interface Stats {
  total: number
  needsReview: number
  avgTreatmentOptions: number
  falseDichotomyRate: number
  avgUncertaintyRatio: number
}

export default function AdminEvalsPage() {
  const [logs, setLogs] = useState<EvalLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'dichotomy' | 'negative'>('all')
  const [selectedLog, setSelectedLog] = useState<EvalLog | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'needs_review') params.set('needsReview', 'true')
      params.set('limit', '200')

      const response = await fetch(`/api/eval/log?${params}`)
      const data = await response.json()

      let filteredLogs = data.logs || []

      // Apply client-side filters
      if (filter === 'dichotomy') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => l.has_false_dichotomy)
      } else if (filter === 'negative') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => l.feedback_type === 'negative')
      }

      setLogs(filteredLogs)
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching eval logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) score = 1 - score
    if (score >= 0.7) return 'text-green-600 bg-green-100'
    if (score >= 0.4) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Navis Eval Dashboard</h1>
              <p className="text-sm text-slate-500">Quality analysis & expert review queue</p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Total Queries</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Needs Review</p>
              <p className="text-2xl font-bold text-amber-600">{stats.needsReview}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Avg Options</p>
              <p className="text-2xl font-bold text-slate-900">{stats.avgTreatmentOptions.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Dichotomy Rate</p>
              <p className={`text-2xl font-bold ${stats.falseDichotomyRate > 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                {(stats.falseDichotomyRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Avg Uncertainty</p>
              <p className="text-2xl font-bold text-slate-900">{(stats.avgUncertaintyRatio * 100).toFixed(0)}%</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'needs_review' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Needs Review
          </button>
          <button
            onClick={() => setFilter('dichotomy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'dichotomy' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            False Dichotomy
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'negative' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Negative Feedback
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Question</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Options</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Evidence</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Flags</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${
                      selectedLog?.id === log.id ? 'bg-violet-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 max-w-[300px]">
                      <p className="truncate text-slate-900">{log.question}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs capitalize">
                        {log.question_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.treatment_options_count <= 2 ? 'bg-red-100 text-red-700' :
                        log.treatment_options_count <= 4 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {log.treatment_options_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.evidence_tiers_cited.length > 0 ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.evidence_tiers_cited.includes('guideline') ? 'bg-green-100 text-green-700' :
                          log.evidence_tiers_cited.includes('phase3') ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {log.evidence_tiers_cited[0]}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {log.has_false_dichotomy && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            Dichotomy
                          </span>
                        )}
                        {log.disease_states_detected.length === 0 && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                            No State
                          </span>
                        )}
                        {log.needs_expert_review && !log.has_false_dichotomy && log.disease_states_detected.length > 0 && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.feedback_type === 'positive' && (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      )}
                      {log.feedback_type === 'negative' && (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Log Detail */}
        {selectedLog && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Query Details</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Question</h4>
                <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{selectedLog.question}</p>

                <h4 className="text-sm font-medium text-slate-700 mt-4 mb-2">Analysis</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Question Type</dt>
                    <dd className="font-medium capitalize">{selectedLog.question_type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Cancer Type</dt>
                    <dd className="font-medium">{selectedLog.cancer_type || 'Not specified'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Patient Context</dt>
                    <dd className="font-medium">{selectedLog.has_patient_context ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Confidence Score</dt>
                    <dd className="font-medium">{selectedLog.confidence_score?.toFixed(2) || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Quality Signals</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Disease States</dt>
                    <dd>
                      {selectedLog.disease_states_detected.length > 0 ? (
                        selectedLog.disease_states_detected.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs mr-1">{s}</span>
                        ))
                      ) : (
                        <span className="text-amber-600">None detected</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Evidence Tiers</dt>
                    <dd>
                      {selectedLog.evidence_tiers_cited.length > 0 ? (
                        selectedLog.evidence_tiers_cited.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs mr-1">{t}</span>
                        ))
                      ) : (
                        <span className="text-amber-600">None cited</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Treatment Options</dt>
                    <dd className="font-medium">{selectedLog.treatment_options_count} mentioned</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Hedging Ratio</dt>
                    <dd className="font-medium">{(selectedLog.uncertainty_ratio * 100).toFixed(0)}%</dd>
                  </div>
                </dl>

                {selectedLog.treatment_options_mentioned.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Options Mentioned</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedLog.treatment_options_mentioned.map(opt => (
                        <span key={opt} className="px-2 py-1 bg-slate-100 rounded text-xs">{opt}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.dichotomy_signals.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-700 mb-1">Dichotomy Signals</h4>
                    <p className="text-sm text-red-600">{selectedLog.dichotomy_signals.join(', ')}</p>
                  </div>
                )}

                {selectedLog.feedback_comment && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="text-sm font-medium text-amber-700 mb-1">User Feedback</h4>
                    <p className="text-sm text-amber-800">{selectedLog.feedback_comment}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
