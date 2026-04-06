'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Zap, Database, Brain, Star, BarChart3, Share2 } from 'lucide-react'

interface EvalLog {
  id: string
  question: string
  question_type: string
  cancer_type: string | null
  created_at: string
  needs_expert_review: boolean
  feedback_type: string | null
  feedback_comment: string | null

  // LLM Dimension
  latency_ms: number | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  cost_usd: number | null
  response_length: number
  hedging_phrase_count: number
  certainty_phrase_count: number
  uncertainty_ratio: number
  has_false_dichotomy: boolean
  dichotomy_signals: string[]
  treatment_options_count: number
  treatment_options_mentioned: string[]
  llm_score: number | null

  // RAG Dimension
  confidence_score: number | null
  citation_count: number | null
  source_types: string[] | null
  used_fallback: boolean
  disease_states_detected: string[]
  disease_state_count: number
  evidence_tiers_cited: string[]
  highest_evidence_tier: string | null
  rag_score: number | null

  // Graph Dimension
  has_patient_context: boolean
  patient_context_length: number
  personalization_score: number
  personalization_signals: string[]
  graph_score: number | null

  // Composite
  quality_score: number | null

  // Source tracking
  source?: 'eval_log' | 'activity' | 'entity' | 'patient_q' | 'combat'
  session_id?: string
  user_id?: string
}

interface DimensionStats {
  avgScore: number
}

interface Stats {
  total: number
  needsReview: number
  avgTreatmentOptions: number
  falseDichotomyRate: number
  avgUncertaintyRatio: number

  // Source breakdown
  bySource?: {
    eval_log: number
    activity: number
    patient_q: number
    combat: number
  }

  llm: {
    avgLatencyMs: number
    avgTokens: number
    totalCostUsd: number
    avgScore: number
    falseDichotomyCount: number
  }

  rag: {
    avgConfidence: number
    avgCitations: number
    fallbackRate: number
    avgScore: number
    withGuidelinesCount: number
  }

  graph: {
    withContextCount: number
    avgPersonalization: number
    highPersonalizationCount: number
    avgScore: number
    avgContextLength: number
  }

  quality: {
    avgScore: number
    highQualityCount: number
    lowQualityCount: number
  }
}

// Rollup data structure
interface Rollup {
  key: string
  count: number
  avgQuality: number
  avgLlm: number
  avgRag: number
  avgGraph: number
  avgLatency: number
  totalCost: number
  highQualityPct: number
}

export default function AdminEvalsPage() {
  const [logs, setLogs] = useState<EvalLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'dichotomy' | 'negative' | 'personalized' | 'high_quality' | 'low_quality' | 'eval_log' | 'activity' | 'patient_q' | 'combat'>('all')
  const [selectedLog, setSelectedLog] = useState<EvalLog | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'rollup'>('list')
  const [rollupBy, setRollupBy] = useState<'cancer_type' | 'question_type' | 'has_context'>('cancer_type')
  const [totalInDatabase, setTotalInDatabase] = useState<number>(0)
  const [referralStats, setReferralStats] = useState<{total: number, bySource: Record<string, number>, recent: {ref: string, timestamp: string}[]}>({total: 0, bySource: {}, recent: []})

  // Compute rollups from logs
  const computeRollups = (logs: EvalLog[], groupBy: string): Rollup[] => {
    const groups: Record<string, EvalLog[]> = {}

    for (const log of logs) {
      let key: string
      if (groupBy === 'cancer_type') {
        key = log.cancer_type || 'Not specified'
      } else if (groupBy === 'question_type') {
        key = log.question_type || 'general'
      } else if (groupBy === 'has_context') {
        key = log.has_patient_context ? 'With Context' : 'No Context'
      } else {
        key = 'All'
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(log)
    }

    const safeAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        count: items.length,
        avgQuality: safeAvg(items.map(i => i.quality_score || 0).filter(v => v > 0)),
        avgLlm: safeAvg(items.map(i => i.llm_score || 0).filter(v => v > 0)),
        avgRag: safeAvg(items.map(i => i.rag_score || 0).filter(v => v > 0)),
        avgGraph: safeAvg(items.map(i => i.graph_score || 0).filter(v => v > 0)),
        avgLatency: safeAvg(items.map(i => i.latency_ms || 0).filter(v => v > 0)),
        totalCost: items.reduce((sum, i) => sum + (i.cost_usd || 0), 0),
        highQualityPct: items.filter(i => (i.quality_score || 0) >= 0.7).length / items.length,
      }))
      .sort((a, b) => b.count - a.count)
  }

  const rollups = computeRollups(logs, rollupBy)

  useEffect(() => {
    fetchLogs()
    fetchReferralStats()
  }, [filter])

  const fetchReferralStats = async () => {
    try {
      const response = await fetch('/api/eval/log?source=activity&limit=500')
      const data = await response.json()

      // Filter for share_referral events
      const referrals = (data.logs || []).filter((l: EvalLog) =>
        l.question_type === 'share_referral' || l.question?.includes('share_')
      )

      // Count by source
      const bySource: Record<string, number> = {}
      const recent: {ref: string, timestamp: string}[] = []

      for (const r of referrals) {
        const ref = r.question || 'unknown'
        bySource[ref] = (bySource[ref] || 0) + 1
        if (recent.length < 10) {
          recent.push({ ref, timestamp: r.created_at })
        }
      }

      setReferralStats({
        total: referrals.length,
        bySource,
        recent
      })
    } catch (err) {
      console.error('Error fetching referral stats:', err)
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'needs_review') params.set('needsReview', 'true')
      // Pass source filter to API for efficiency
      if (filter === 'eval_log' || filter === 'activity' || filter === 'patient_q' || filter === 'combat') {
        params.set('source', filter)
      }
      params.set('limit', '2000') // Get all data

      const response = await fetch(`/api/eval/log?${params}`)
      const data = await response.json()

      let filteredLogs = data.logs || []

      // Apply client-side filters for non-source filters
      if (filter === 'dichotomy') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => l.has_false_dichotomy)
      } else if (filter === 'negative') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => l.feedback_type === 'negative')
      } else if (filter === 'personalized') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => (l.personalization_score || 0) >= 2)
      } else if (filter === 'high_quality') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => (l.quality_score || 0) >= 0.7)
      } else if (filter === 'low_quality') {
        filteredLogs = filteredLogs.filter((l: EvalLog) => (l.quality_score || 0) < 0.4 && (l.quality_score || 0) > 0)
      }

      setLogs(filteredLogs)
      setStats(data.stats)
      setTotalInDatabase(data.totalInDatabase || data.logs?.length || 0)
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
        {/* Overall Quality Score + Summary */}
        {stats && (
          <>
            {/* Top row: Overall score + summary stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* Big Quality Score */}
              <div className="col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <p className="text-sm font-medium text-slate-300">Quality Score</p>
                </div>
                <p className="text-4xl font-bold">{((stats.quality?.avgScore || 0) * 100).toFixed(0)}</p>
                <p className="text-xs text-slate-400 mt-1">out of 100</p>
              </div>

              {/* Summary stats */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Total Queries</p>
                <p className="text-2xl font-bold text-slate-900">{totalInDatabase}</p>
                {stats.bySource && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{stats.bySource.eval_log} eval</span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{stats.bySource.activity} act</span>
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{stats.bySource.patient_q} circle</span>
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{stats.bySource.combat} combat</span>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500">High Quality</p>
                <p className="text-2xl font-bold text-green-600">{stats.quality?.highQualityCount || 0}</p>
                <p className="text-xs text-slate-400">score ≥ 70</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Low Quality</p>
                <p className="text-2xl font-bold text-red-600">{stats.quality?.lowQualityCount || 0}</p>
                <p className="text-xs text-slate-400">score &lt; 40</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Needs Review</p>
                <p className="text-2xl font-bold text-amber-600">{stats.needsReview}</p>
              </div>
            </div>

            {/* Viral Referrals Card */}
            {referralStats.total > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Viral Referrals</h3>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                    {referralStats.total} total
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-purple-600 uppercase mb-2">By Share Link</p>
                    <div className="space-y-1">
                      {Object.entries(referralStats.bySource).slice(0, 5).map(([ref, count]) => (
                        <div key={ref} className="flex justify-between text-sm">
                          <span className="text-purple-700 truncate max-w-[150px]">{ref.replace('share_', '')}</span>
                          <span className="font-medium text-purple-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 uppercase mb-2">Recent Activity</p>
                    <div className="space-y-1">
                      {referralStats.recent.slice(0, 5).map((r, i) => (
                        <div key={i} className="text-xs text-purple-600">
                          {new Date(r.timestamp).toLocaleDateString()} - {r.ref.replace('share_', '').slice(0, 8)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Three Dimension Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* LLM Dimension */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">LLM</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                    (stats.llm?.avgScore || 0) >= 0.7 ? 'bg-green-100 text-green-700' :
                    (stats.llm?.avgScore || 0) >= 0.4 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {((stats.llm?.avgScore || 0) * 100).toFixed(0)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Avg Latency</span>
                    <span className="font-medium text-blue-900">{(stats.llm?.avgLatencyMs || 0).toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Avg Tokens</span>
                    <span className="font-medium text-blue-900">{(stats.llm?.avgTokens || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Total Cost</span>
                    <span className="font-medium text-blue-900">${(stats.llm?.totalCostUsd || 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">False Dichotomy</span>
                    <span className={`font-medium ${(stats.llm?.falseDichotomyCount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.llm?.falseDichotomyCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* RAG Dimension */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-emerald-900">RAG</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                    (stats.rag?.avgScore || 0) >= 0.7 ? 'bg-green-100 text-green-700' :
                    (stats.rag?.avgScore || 0) >= 0.4 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {((stats.rag?.avgScore || 0) * 100).toFixed(0)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Avg Confidence</span>
                    <span className="font-medium text-emerald-900">{((stats.rag?.avgConfidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Avg Citations</span>
                    <span className="font-medium text-emerald-900">{(stats.rag?.avgCitations || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">With Guidelines</span>
                    <span className="font-medium text-emerald-900">{stats.rag?.withGuidelinesCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Fallback Rate</span>
                    <span className={`font-medium ${(stats.rag?.fallbackRate || 0) > 0.2 ? 'text-amber-600' : 'text-emerald-900'}`}>
                      {((stats.rag?.fallbackRate || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Graph Dimension */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Graph</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                    (stats.graph?.avgScore || 0) >= 0.7 ? 'bg-green-100 text-green-700' :
                    (stats.graph?.avgScore || 0) >= 0.4 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {((stats.graph?.avgScore || 0) * 100).toFixed(0)}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-600">With Context</span>
                    <span className="font-medium text-purple-900">{stats.graph?.withContextCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Avg Personalization</span>
                    <span className="font-medium text-purple-900">{(stats.graph?.avgPersonalization || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">High Personalization</span>
                    <span className="font-medium text-purple-900">{stats.graph?.highPersonalizationCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Avg Context Length</span>
                    <span className="font-medium text-purple-900">{(stats.graph?.avgContextLength || 0).toFixed(0)} chars</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Query List
            </button>
            <button
              onClick={() => setViewMode('rollup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'rollup' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Rollup View
            </button>
          </div>

          {viewMode === 'rollup' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Group by:</span>
              <select
                value={rollupBy}
                onChange={(e) => setRollupBy(e.target.value as 'cancer_type' | 'question_type' | 'has_context')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="cancer_type">Cancer Type</option>
                <option value="question_type">Question Type</option>
                <option value="has_context">Has Context</option>
              </select>
            </div>
          )}
        </div>

        {/* Rollup Table */}
        {viewMode === 'rollup' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    {rollupBy === 'cancer_type' ? 'Cancer Type' : rollupBy === 'question_type' ? 'Question Type' : 'Context'}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Queries</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Quality</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">LLM</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">RAG</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Graph</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Latency</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Cost</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">High Quality %</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((rollup) => (
                  <tr key={rollup.key} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{rollup.key}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{rollup.count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        rollup.avgQuality >= 0.7 ? 'bg-green-100 text-green-700' :
                        rollup.avgQuality >= 0.4 ? 'bg-amber-100 text-amber-700' :
                        rollup.avgQuality > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {rollup.avgQuality > 0 ? (rollup.avgQuality * 100).toFixed(0) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {rollup.avgLlm > 0 ? (rollup.avgLlm * 100).toFixed(0) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">
                        {rollup.avgRag > 0 ? (rollup.avgRag * 100).toFixed(0) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                        {rollup.avgGraph > 0 ? (rollup.avgGraph * 100).toFixed(0) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {rollup.avgLatency > 0 ? `${rollup.avgLatency.toFixed(0)}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      ${rollup.totalCost.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${rollup.highQualityPct >= 0.7 ? 'bg-green-500' : rollup.highQualityPct >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rollup.highQualityPct * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{(rollup.highQualityPct * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Filters - only show in list view */}
        {viewMode === 'list' && (
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
          <button
            onClick={() => setFilter('personalized')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'personalized' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✨ Personalized
          </button>
          <button
            onClick={() => setFilter('high_quality')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === 'high_quality' ? 'bg-green-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            High Quality
          </button>
          <button
            onClick={() => setFilter('low_quality')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'low_quality' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Low Quality
          </button>
          <span className="text-slate-300 mx-1">|</span>
          <button
            onClick={() => setFilter('eval_log')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'eval_log' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Eval Logs
          </button>
          <button
            onClick={() => setFilter('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'activity' ? 'bg-green-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setFilter('patient_q')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'patient_q' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Circle App
          </button>
          <button
            onClick={() => setFilter('combat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'combat' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Combat
          </button>
        </div>
        )}

        {/* Logs Table - only in list view */}
        {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Question</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Source</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Score</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">LLM</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">RAG</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Graph</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Flags</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${
                      selectedLog?.id === log.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 max-w-[350px]">
                      <p className="truncate text-slate-900">{log.question}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs capitalize text-slate-500">
                          {log.question_type}
                        </span>
                      </div>
                    </td>
                    {/* Source */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.source === 'eval_log' ? 'bg-blue-100 text-blue-700' :
                        log.source === 'activity' ? 'bg-green-100 text-green-700' :
                        log.source === 'patient_q' ? 'bg-amber-100 text-amber-700' :
                        log.source === 'combat' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {log.source === 'eval_log' ? 'Eval' :
                         log.source === 'activity' ? 'Activity' :
                         log.source === 'patient_q' ? 'Circle' :
                         log.source === 'combat' ? 'Combat' : '-'}
                      </span>
                    </td>
                    {/* Quality Score */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${
                        (log.quality_score || 0) >= 0.7 ? 'bg-green-100 text-green-700' :
                        (log.quality_score || 0) >= 0.4 ? 'bg-amber-100 text-amber-700' :
                        (log.quality_score || 0) > 0 ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {(log.quality_score || 0) > 0 ? ((log.quality_score || 0) * 100).toFixed(0) : '-'}
                      </span>
                    </td>
                    {/* LLM Score */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (log.llm_score || 0) >= 0.7 ? 'bg-blue-100 text-blue-700' :
                          (log.llm_score || 0) >= 0.4 ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {(log.llm_score || 0) > 0 ? ((log.llm_score || 0) * 100).toFixed(0) : '-'}
                        </span>
                        {log.latency_ms && (
                          <span className="text-xs text-slate-400 mt-0.5">{log.latency_ms}ms</span>
                        )}
                      </div>
                    </td>
                    {/* RAG Score */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (log.rag_score || 0) >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                          (log.rag_score || 0) >= 0.4 ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {(log.rag_score || 0) > 0 ? ((log.rag_score || 0) * 100).toFixed(0) : '-'}
                        </span>
                        {(log.citation_count || 0) > 0 && (
                          <span className="text-xs text-slate-400 mt-0.5">{log.citation_count} cites</span>
                        )}
                      </div>
                    </td>
                    {/* Graph Score */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (log.graph_score || 0) >= 0.7 ? 'bg-purple-100 text-purple-700' :
                          (log.graph_score || 0) >= 0.4 ? 'bg-purple-50 text-purple-600' :
                          log.has_patient_context ? 'bg-slate-100 text-slate-500' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {log.has_patient_context ? ((log.graph_score || 0) * 100).toFixed(0) : '-'}
                        </span>
                        {log.has_patient_context && (
                          <span className="text-xs text-slate-400 mt-0.5">{log.personalization_score || 0} ✨</span>
                        )}
                      </div>
                    </td>
                    {/* Flags */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {log.has_false_dichotomy && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">⚠</span>
                        )}
                        {log.used_fallback && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">FB</span>
                        )}
                        {log.needs_expert_review && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        {log.feedback_type === 'positive' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {log.feedback_type === 'negative' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Selected Log Detail - only in list view */}
        {viewMode === 'list' && selectedLog && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
            {/* Header with scores */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-900">Query Details</h3>
                <p className="text-sm text-slate-500 mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              {/* Dimension Score Pills */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-2 rounded-lg text-center ${
                  (selectedLog.quality_score || 0) >= 0.7 ? 'bg-green-100' :
                  (selectedLog.quality_score || 0) >= 0.4 ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <p className="text-xs text-slate-500">Quality</p>
                  <p className="text-xl font-bold">{((selectedLog.quality_score || 0) * 100).toFixed(0)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg text-center bg-blue-50">
                  <p className="text-xs text-blue-600">LLM</p>
                  <p className="text-lg font-bold text-blue-700">{((selectedLog.llm_score || 0) * 100).toFixed(0)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg text-center bg-emerald-50">
                  <p className="text-xs text-emerald-600">RAG</p>
                  <p className="text-lg font-bold text-emerald-700">{((selectedLog.rag_score || 0) * 100).toFixed(0)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg text-center bg-purple-50">
                  <p className="text-xs text-purple-600">Graph</p>
                  <p className="text-lg font-bold text-purple-700">{((selectedLog.graph_score || 0) * 100).toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-6">
              <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{selectedLog.question}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-slate-100 rounded text-xs capitalize">{selectedLog.question_type}</span>
                {selectedLog.cancer_type && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">{selectedLog.cancer_type}</span>
                )}
              </div>
            </div>

            {/* Three Dimension Details */}
            <div className="grid grid-cols-3 gap-4">
              {/* LLM Details */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> LLM Metrics
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-blue-600">Latency</dt>
                    <dd className="font-medium text-blue-900">{selectedLog.latency_ms || '-'}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">Tokens</dt>
                    <dd className="font-medium text-blue-900">{selectedLog.total_tokens || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">Cost</dt>
                    <dd className="font-medium text-blue-900">${(selectedLog.cost_usd || 0).toFixed(5)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">Options</dt>
                    <dd className="font-medium text-blue-900">{selectedLog.treatment_options_count}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-600">Hedging</dt>
                    <dd className="font-medium text-blue-900">{((selectedLog.uncertainty_ratio || 0) * 100).toFixed(0)}%</dd>
                  </div>
                  {selectedLog.has_false_dichotomy && (
                    <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      ⚠ False Dichotomy
                    </div>
                  )}
                </dl>
              </div>

              {/* RAG Details */}
              <div className="p-4 bg-emerald-50 rounded-lg">
                <h4 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" /> RAG Metrics
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-emerald-600">Confidence</dt>
                    <dd className="font-medium text-emerald-900">{((selectedLog.confidence_score || 0) * 100).toFixed(0)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-emerald-600">Citations</dt>
                    <dd className="font-medium text-emerald-900">{selectedLog.citation_count || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-emerald-600">Fallback</dt>
                    <dd className={`font-medium ${selectedLog.used_fallback ? 'text-amber-600' : 'text-emerald-900'}`}>
                      {selectedLog.used_fallback ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  {selectedLog.evidence_tiers_cited && selectedLog.evidence_tiers_cited.length > 0 && (
                    <div className="mt-2">
                      <dt className="text-emerald-600 text-xs mb-1">Evidence</dt>
                      <div className="flex flex-wrap gap-1">
                        {selectedLog.evidence_tiers_cited.map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedLog.disease_states_detected && selectedLog.disease_states_detected.length > 0 && (
                    <div className="mt-2">
                      <dt className="text-emerald-600 text-xs mb-1">Disease States</dt>
                      <div className="flex flex-wrap gap-1">
                        {selectedLog.disease_states_detected.map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {/* Graph Details */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> Graph Metrics
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-purple-600">Has Context</dt>
                    <dd className="font-medium text-purple-900">{selectedLog.has_patient_context ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-600">Context Length</dt>
                    <dd className="font-medium text-purple-900">{selectedLog.patient_context_length || 0} chars</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-600">Personalization</dt>
                    <dd className="font-medium text-purple-900">{selectedLog.personalization_score || 0} entities</dd>
                  </div>
                  {selectedLog.personalization_signals && selectedLog.personalization_signals.length > 0 && (
                    <div className="mt-2">
                      <dt className="text-purple-600 text-xs mb-1">✨ Signals Used</dt>
                      <div className="flex flex-wrap gap-1">
                        {selectedLog.personalization_signals.map((signal, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{signal}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Treatment Options */}
            {selectedLog.treatment_options_mentioned && selectedLog.treatment_options_mentioned.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Treatment Options Mentioned</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedLog.treatment_options_mentioned.map(opt => (
                    <span key={opt} className="px-2 py-1 bg-slate-100 rounded text-xs">{opt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {selectedLog.dichotomy_signals && selectedLog.dichotomy_signals.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-700 mb-1">⚠ Dichotomy Signals</h4>
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
        )}
      </div>
    </div>
  )
}
